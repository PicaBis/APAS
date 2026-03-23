import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import ReactMarkdown from 'react-markdown';
import { Video, Loader2, X, CheckCircle, AlertTriangle, XCircle, History, Upload, VideoIcon, Square } from 'lucide-react';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';
import { checkFileSize, analyzeVideoFrame, getIssueMessage, computeFileHash } from '@/utils/mediaQuality';
import { cleanLatex } from '@/utils/cleanLatex';
import { analyzeBatchInWorker, getVideoQualityMessage, terminateVideoWorker } from '@/utils/videoWorkerManager';

const EDGE_VIDEO_ANALYZE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/video-analyze`;

const CONFIDENCE_THRESHOLD = 60;
const MAX_FRAMES_TO_SEND = 6; // Max frames to send to API (6 is reliable for Mistral API payload limits)
const FRAME_QUALITY = 0.35; // JPEG quality for extracted frames (lower = smaller payload, still sufficient for AI analysis)

interface Props {
  lang: string;
  onUpdateParams: (params: { velocity?: number; angle?: number; height?: number; mass?: number; objectType?: string }) => void;
  onMediaAnalyzed?: (thumbnailDataUrl: string) => void;
}

interface AnalysisData {
  detected: boolean;
  confidence?: number;
  angle?: number;
  velocity?: number;
  mass?: number;
  height?: number;
  objectType?: string;
}

interface HistoryEntry {
  id: number;
  timestamp: Date;
  data: AnalysisData | null;
  text: string;
  thumbnailName: string;
  fileHash?: string;
  thumbnailData?: string;
  videoUrl?: string;
}

interface ExtractedFrame {
  data: string; // base64 data URL
  timestamp: number; // seconds
}

/**
 * Extract key frames from a video file using HTML5 Canvas
 */
/**
 * Resolve the actual duration of a video element.
 * MediaRecorder-produced blobs often report Infinity for duration until
 * the browser has buffered the entire file. Work around this by seeking
 * to a very large time and waiting for the browser to clamp it.
 */
const resolveVideoDuration = (video: HTMLVideoElement): Promise<number> => {
  return new Promise((resolve) => {
    const dur = video.duration;
    if (dur && Number.isFinite(dur) && dur > 0) {
      resolve(dur);
      return;
    }
    // Seek to a very large time — the browser will clamp to actual duration
    video.currentTime = 1e10;
    const onSeeked = () => {
      video.removeEventListener('seeked', onSeeked);
      const resolved = video.duration;
      // Capture the clamped time BEFORE resetting — it represents the actual end of the video
      const clampedTime = video.currentTime;
      // Reset to beginning
      video.currentTime = 0;
      video.addEventListener('seeked', () => {
        resolve(Number.isFinite(resolved) && resolved > 0 ? resolved : clampedTime > 0 ? clampedTime : 5);
      }, { once: true });
    };
    video.addEventListener('seeked', onSeeked, { once: true });
  });
};

const extractFramesFromVideo = (
  videoFile: File,
  maxFrames: number,
  onProgress: (pct: number) => void,
): Promise<{ frames: ExtractedFrame[]; fps: number; totalFrames: number }> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Could not get canvas context'));
      return;
    }

    const url = URL.createObjectURL(videoFile);
    video.preload = 'auto';
    video.muted = true;
    video.playsInline = true;

    video.addEventListener('loadedmetadata', async () => {
      try {
        const duration = await resolveVideoDuration(video);

        // Set canvas size to a smaller resolution (max 384px wide) for reliable API payload size
        const scale = Math.min(1, 384 / video.videoWidth);
        canvas.width = Math.round(video.videoWidth * scale);
        canvas.height = Math.round(video.videoHeight * scale);

        // Calculate frame timestamps to extract (evenly distributed)
        const fps = 30; // Assume 30fps
        const totalFrames = Math.round(duration * fps);
        const numFrames = Math.min(maxFrames, totalFrames);
        const timestamps: number[] = [];

        for (let i = 0; i < numFrames; i++) {
          timestamps.push((i / (numFrames - 1 || 1)) * duration);
        }

        const frames: ExtractedFrame[] = [];
        let currentIdx = 0;

        const extractNext = () => {
          if (currentIdx >= timestamps.length) {
            URL.revokeObjectURL(url);
            resolve({ frames, fps, totalFrames });
            return;
          }

          const ts = timestamps[currentIdx];
          // If video is already at the target time, capture directly
          // instead of seeking (which won't fire 'seeked' if time doesn't change)
          if (Math.abs(video.currentTime - ts) < 0.01) {
            onSeeked();
            return;
          }
          video.currentTime = ts;
        };

        // Use { once: true } per seek to avoid duplicate fires
        const onSeeked = () => {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', FRAME_QUALITY);

          frames.push({
            data: dataUrl,
            timestamp: timestamps[currentIdx],
          });

          currentIdx++;
          onProgress(Math.round((currentIdx / timestamps.length) * 40)); // 0-40% for extraction

          if (currentIdx >= timestamps.length) {
            URL.revokeObjectURL(url);
            resolve({ frames, fps, totalFrames });
          } else {
            video.addEventListener('seeked', onSeeked, { once: true });
            video.currentTime = timestamps[currentIdx];
          }
        };

        video.addEventListener('seeked', onSeeked, { once: true });
        extractNext();
      } catch (err) {
        URL.revokeObjectURL(url);
        reject(err);
      }
    });

    video.addEventListener('error', () => {
      URL.revokeObjectURL(url);
      reject(new Error('Error loading video'));
    });

    video.src = url;
    video.load();
  });
};

export default function ApasVideoButton({ lang, onUpdateParams, onMediaAnalyzed }: Props) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [analysisText, setAnalysisText] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [currentFileHash, setCurrentFileHash] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraVideoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isAr = lang === 'ar';

  // Stop camera stream
  const stopCameraStream = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => { stopCameraStream(); };
  }, [stopCameraStream]);

  // Open camera for video recording
  const openCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      setShowCamera(true);
      setIsRecording(false);
      setRecordingTime(0);
      chunksRef.current = [];
      requestAnimationFrame(() => {
        if (cameraVideoRef.current) {
          cameraVideoRef.current.srcObject = stream;
          cameraVideoRef.current.play().catch(() => { /* ignore autoplay errors */ });
        }
      });
    } catch {
      toast.error(isAr ? '\u062a\u0639\u0630\u0631 \u0627\u0644\u0648\u0635\u0648\u0644 \u0644\u0644\u0643\u0627\u0645\u064a\u0631\u0627' : 'Camera access denied');
    }
  };

  // Start recording video
  const startRecording = () => {
    if (!streamRef.current) return;
    chunksRef.current = [];
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : MediaRecorder.isTypeSupported('video/webm')
        ? 'video/webm'
        : 'video/mp4';
    const recorder = new MediaRecorder(streamRef.current, { mimeType });
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      const file = new File([blob], `recording-${Date.now()}.webm`, { type: mimeType });
      // Stop camera and close modal
      stopCameraStream();
      setShowCamera(false);
      setIsRecording(false);
      setRecordingTime(0);
      // Auto-analyze the recorded video (skip duplicate check for recordings)
      analyzeVideoFile(file, true);
    };
    mediaRecorderRef.current = recorder;
    recorder.start(100); // collect data every 100ms
    setIsRecording(true);
    setRecordingTime(0);
    timerRef.current = setInterval(() => {
      setRecordingTime(prev => prev + 1);
    }, 1000);
  };

  // Stop recording
  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop(); // triggers onstop which calls analyzeVideoFile
    }
  };

  // Format recording time as MM:SS
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Shared analysis function for a video File
  const analyzeVideoFile = async (file: File, skipDuplicateCheck?: boolean) => {
    // Compute file hash for duplicate detection (skip for recordings)
    let fileHash: string | undefined;
    if (!skipDuplicateCheck) {
      fileHash = await computeFileHash(file);
      setCurrentFileHash(fileHash);

      // Check for duplicate — same file already in history
      const existingEntry = history.find(h => h.fileHash === fileHash);
      if (existingEntry) {
        toast.info(isAr ? '\u0647\u0630\u0627 \u0627\u0644\u0641\u064a\u062f\u064a\u0648 \u062a\u0645 \u062a\u062d\u0644\u064a\u0644\u0647 \u0633\u0627\u0628\u0642\u0627\u064b \u2014 \u064a\u062a\u0645 \u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u0646\u062a\u0627\u0626\u062c \u0645\u0646 \u0627\u0644\u0633\u062c\u0644' : 'This video was already analyzed \u2014 loading results from history');
        loadFromHistory(existingEntry);
        return;
      }
    }

    setIsAnalyzing(true);
    setShowModal(true);
    setAnalysisData(null);
    setAnalysisText('');
    setProgress(0);
    setThumbnailUrl(null);
    // Create a blob URL for video playback
    const blobUrl = URL.createObjectURL(file);
    setVideoUrl(blobUrl);
    setStatusText(isAr ? '\u062c\u0627\u0631\u064a \u0627\u0633\u062a\u062e\u0631\u0627\u062c \u0627\u0644\u0625\u0637\u0627\u0631\u0627\u062a \u0645\u0646 \u0627\u0644\u0641\u064a\u062f\u064a\u0648...' : 'Extracting frames from video...');

    // Smart quality check on file size
    const fileSizeIssue = checkFileSize(file);
    if (fileSizeIssue) {
      toast.warning(getIssueMessage(fileSizeIssue, lang));
    }

    const sourceName = file.name;

    const parseAIResponse = (text: string) => {
      const jsonMatch = text.match(/```json\s*([\s\S]*?)```/);
      let result: AnalysisData | null = null;
      if (jsonMatch) try { result = JSON.parse(jsonMatch[1].trim()); } catch { /* ignore parse errors */ }
      const cleanText = text.replace(/```json[\s\S]*?```\s*/, '').trim();
      return { result, cleanText };
    };

    const handleParsedResult = (text: string) => {
      const { result, cleanText } = parseAIResponse(text);
      setAnalysisText(cleanText);

      if (result) {
        setAnalysisData(result);
        const confidence = result.confidence ?? 0;

        // Get thumbnail for history storage
        const historyThumb = thumbnailUrl || (frames.length > 0 ? frames[0].data : undefined);

        // Notify parent that media was analyzed (for calibration tool awareness)
        if (historyThumb && onMediaAnalyzed) onMediaAnalyzed(historyThumb);

        // Store video blob URL for playback in history
        const currentVideoUrl = videoUrl;

        setHistory(prev => [{
          id: Date.now(),
          timestamp: new Date(),
          data: result,
          text: cleanText,
          thumbnailName: sourceName,
          fileHash: fileHash,
          thumbnailData: historyThumb,
          videoUrl: currentVideoUrl || undefined,
        }, ...prev].slice(0, 20));

        if (result.detected && confidence >= CONFIDENCE_THRESHOLD) {
          onUpdateParams({
            velocity: result.velocity,
            angle: result.angle,
            mass: result.mass,
            height: result.height,
            objectType: result.objectType,
          });
          toast.success(isAr ? '\ud83e\udd16 \u062a\u0645 \u062a\u062d\u062f\u064a\u062b \u0627\u0644\u0645\u062d\u0627\u0643\u0627\u0629 \u0628\u0648\u0627\u0633\u0637\u0629 APAS AI' : '\ud83e\udd16 Simulation updated by APAS AI');
        } else if (result.detected && confidence < CONFIDENCE_THRESHOLD) {
          toast.warning(isAr ? `\u0646\u0633\u0628\u0629 \u0627\u0644\u062b\u0642\u0629 \u0645\u0646\u062e\u0641\u0636\u0629 (${confidence}%) \u2014 \u0644\u0645 \u064a\u062a\u0645 \u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u0642\u064a\u0645` : `Low confidence (${confidence}%) \u2014 values not loaded`);
        } else {
          toast.info(isAr ? '\u0644\u0645 \u064a\u062a\u0645 \u0627\u0643\u062a\u0634\u0627\u0641 \u0645\u0642\u0630\u0648\u0641' : 'No projectile detected');
        }
      } else {
        const historyThumb = thumbnailUrl || (frames.length > 0 ? frames[0].data : undefined);
        setAnalysisText(cleanText || (isAr ? '\u0644\u0645 \u064a\u062a\u0645 \u0627\u0643\u062a\u0634\u0627\u0641 \u0645\u0642\u0630\u0648\u0641' : 'No projectile detected'));
        setHistory(prev => [{
          id: Date.now(),
          timestamp: new Date(),
          data: null,
          text: cleanText,
          thumbnailName: sourceName,
          fileHash: fileHash,
          thumbnailData: historyThumb,
          videoUrl: videoUrl || undefined,
        }, ...prev].slice(0, 20));
      }
    };

    let progressInterval: ReturnType<typeof setInterval> | undefined;
    let frames: { data: string; timestamp: number }[] = [];
    try {
      const extracted = await extractFramesFromVideo(
        file,
        MAX_FRAMES_TO_SEND,
        (pct) => setProgress(pct),
      );
      frames = extracted.frames;
      const { fps, totalFrames } = extracted;

      // Store first frame as thumbnail for display in results
      if (frames.length > 0) {
        setThumbnailUrl(frames[0].data);
      }

      if (frames.length === 0) {
        throw new Error('No frames extracted');
      }

      // Use Web Worker to analyze frame quality in background (prevents main thread blocking for 4K)
      try {
        const sampleFrames = frames.filter((_, i) => i % Math.max(1, Math.floor(frames.length / 4)) === 0);
        const workerFrames = await Promise.all(
          sampleFrames.map(async (frame, idx) => {
            const img = new Image();
            img.src = frame.data;
            await new Promise<void>((res) => { img.onload = () => res(); img.onerror = () => res(); });
            const c = document.createElement('canvas');
            const scale = Math.min(1, 256 / Math.max(img.width, 1));
            c.width = Math.round(img.width * scale) || 1;
            c.height = Math.round(img.height * scale) || 1;
            const cx = c.getContext('2d');
            if (cx) {
              cx.drawImage(img, 0, 0, c.width, c.height);
              const imgData = cx.getImageData(0, 0, c.width, c.height);
              return { data: imgData.data, width: c.width, height: c.height, index: idx };
            }
            return null;
          }),
        );
        const validFrames = workerFrames.filter((f): f is NonNullable<typeof f> => f !== null);
        if (validFrames.length > 0) {
          const batchResult = await analyzeBatchInWorker(validFrames);
          const allIssues = new Set<string>();
          for (const r of batchResult.results) {
            for (const issue of r.issues) allIssues.add(issue);
          }
          const qualityMessages = getVideoQualityMessage(Array.from(allIssues), lang);
          for (const msg of qualityMessages) {
            toast.warning(msg);
          }
        }
      } catch {
        // Worker analysis is best-effort; continue with API analysis
      }

      setStatusText(isAr ? `\u062a\u0645 \u0627\u0633\u062a\u062e\u0631\u0627\u062c ${frames.length} \u0625\u0637\u0627\u0631\u0627\u062a. \u062c\u0627\u0631\u064a \u0627\u0644\u062a\u062d\u0644\u064a\u0644 \u0628\u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064a...` : `Extracted ${frames.length} frames. Analyzing with AI...`);
      setProgress(45);

      progressInterval = setInterval(() => {
        setProgress(prev => prev >= 90 ? 90 : prev + Math.random() * 5);
      }, 500);

      // Check payload size before sending (Supabase Edge Functions have ~6MB body limit)
      const buildPayload = () => JSON.stringify({
        frames,
        lang,
        videoName: sourceName,
        totalFrames,
        fps,
        hint: 'Look carefully for any moving object (ball, projectile, stone, etc.) across frames. Even small or partially visible objects count as projectiles. Analyze position changes between frames to estimate velocity and angle.',
      });
      let payloadBody = buildPayload();
      const payloadSizeMB = new Blob([payloadBody]).size / (1024 * 1024);
      if (payloadSizeMB > 5) {
        // Payload too large — reduce frames to fit within limits
        const keepCount = Math.max(3, Math.floor(frames.length * (4 / payloadSizeMB)));
        const step = Math.max(1, Math.floor(frames.length / keepCount));
        frames = frames.filter((_, i) => i % step === 0).slice(0, keepCount);
        payloadBody = buildPayload(); // Rebuild with reduced frames
        toast.warning(isAr ? `\u062a\u0645 \u062a\u0642\u0644\u064a\u0644 \u0627\u0644\u0625\u0637\u0627\u0631\u0627\u062a \u0625\u0644\u0649 ${frames.length} \u0628\u0633\u0628\u0628 \u062d\u062c\u0645 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a` : `Reduced to ${frames.length} frames due to payload size`);
      }

      const edgeResp = await fetch(EDGE_VIDEO_ANALYZE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: payloadBody,
      });

      clearInterval(progressInterval);

      if (edgeResp.ok) {
        const data = await edgeResp.json();
        if (data.text) {
          setProgress(100);
          setStatusText(isAr ? '\u0627\u0643\u062a\u0645\u0644 \u0627\u0644\u062a\u062d\u0644\u064a\u0644!' : 'Analysis complete!');
          await new Promise(r => setTimeout(r, 400));
          handleParsedResult(data.text);
        } else {
          setAnalysisText(isAr ? '\u274c \u062a\u0639\u0630\u0631 \u0627\u0644\u062a\u062d\u0644\u064a\u0644 \u062d\u0627\u0644\u064a\u0627\u064b. \u062d\u0627\u0648\u0644 \u0645\u0631\u0629 \u0623\u062e\u0631\u0649.' : '\u274c Analysis unavailable. Please try again.');
          toast.error(isAr ? '\u062a\u0639\u0630\u0631 \u0627\u0644\u062a\u062d\u0644\u064a\u0644' : 'Analysis failed');
        }
      } else {
        const errData = await edgeResp.json().catch(() => null);
        const errMsg = errData?.error || `HTTP ${edgeResp.status}`;
        setAnalysisText(isAr ? `\u274c \u062a\u0639\u0630\u0631 \u0627\u0644\u062a\u062d\u0644\u064a\u0644: ${errMsg}` : `\u274c Analysis failed: ${errMsg}`);
        toast.error(isAr ? '\u062a\u0639\u0630\u0631 \u0627\u0644\u062a\u062d\u0644\u064a\u0644' : 'Analysis failed');
      }
    } catch (err) {
      clearInterval(progressInterval);
      const msg = err instanceof Error ? err.message : 'Unknown error';
      toast.error(isAr ? '\u062e\u0637\u0623 \u0641\u064a \u0627\u0644\u062a\u062d\u0644\u064a\u0644' : 'Analysis error');
      setAnalysisText(isAr ? `\u274c \u062e\u0637\u0623: ${msg}` : `\u274c Error: ${msg}`);
    }
    // Auto-delete: clear video data from memory after processing
    const autoDelete = (() => { try { return localStorage.getItem('apas_autoDeleteVideos') === 'true'; } catch { return false; } })();
    if (autoDelete) {
      // Clear extracted frames from memory
      frames.length = 0;
      toast.info(isAr ? 'تم حذف بيانات الفيديو تلقائياً للخصوصية' : 'Video data auto-deleted for privacy');
    }

    setIsAnalyzing(false);
    setStatusText('');
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (fileRef.current) fileRef.current.value = '';
    analyzeVideoFile(file, false);
  };

  const loadFromHistory = (entry: HistoryEntry) => {
    setAnalysisData(entry.data);
    setAnalysisText(entry.text);
    // Restore the thumbnail from stored data so history records show the image
    if (entry.thumbnailData) {
      setThumbnailUrl(entry.thumbnailData);
    }
    // Restore video URL for playback
    setVideoUrl(entry.videoUrl || null);
    setShowHistory(false);
    setShowModal(true);
    if (entry.data?.detected && (entry.data.confidence ?? 0) >= CONFIDENCE_THRESHOLD) {
      onUpdateParams({
        velocity: entry.data.velocity,
        angle: entry.data.angle,
        mass: entry.data.mass,
        height: entry.data.height,
      });
    }
  };

  const confidence = analysisData?.confidence ?? 0;
  const isHighConfidence = analysisData?.detected && confidence >= CONFIDENCE_THRESHOLD;
  const isLowConfidence = analysisData?.detected && confidence < CONFIDENCE_THRESHOLD;

  return (
    <>
      <input ref={fileRef} type="file" accept="video/*" className="hidden" onChange={handleUpload} />

      <div className="flex items-center gap-1">
        <button
          onClick={() => fileRef.current?.click()}
          disabled={isAnalyzing}
          className="group flex items-center gap-2 px-3 py-2 rounded-lg border border-border hover:border-foreground/30 bg-secondary/50 hover:bg-secondary transition-all duration-200 hover:shadow-md disabled:opacity-60"
          title={isAr ? '\u0631\u0641\u0639 \u0641\u064a\u062f\u064a\u0648' : 'Upload Video'}
        >
          <div className="relative">
            <Upload className="w-4 h-4 text-foreground transition-transform duration-200 group-hover:scale-110" />
            {isAnalyzing && (
              <div className="absolute -inset-1 rounded-full border-2 border-foreground/30 border-t-foreground animate-spin" />
            )}
          </div>
          <span className="text-[10px] sm:text-xs font-semibold text-foreground hidden xs:inline">{isAr ? '\u0631\u0641\u0639 \u0641\u064a\u062f\u064a\u0648' : 'Upload Video'}</span>
        </button>
        <button
          onClick={openCamera}
          disabled={isAnalyzing}
          className="group flex items-center gap-2 px-3 py-2 rounded-lg border border-border hover:border-foreground/30 bg-secondary/50 hover:bg-secondary transition-all duration-200 hover:shadow-md disabled:opacity-60"
          title={isAr ? '\u062a\u0635\u0648\u064a\u0631 \u0641\u064a\u062f\u064a\u0648 \u0628\u0627\u0644\u0643\u0627\u0645\u064a\u0631\u0627' : 'Record with Camera'}
        >
          <VideoIcon className="w-4 h-4 text-red-500 transition-transform duration-200 group-hover:scale-110" />
          <span className="text-[10px] sm:text-xs font-semibold text-foreground hidden xs:inline">{isAr ? '\u062a\u0635\u0648\u064a\u0631' : 'Record'}</span>
        </button>

        {history.length > 0 && (
          <button
            onClick={() => setShowHistory(true)}
            className="p-2 rounded-lg border border-border hover:border-foreground/30 bg-secondary/50 hover:bg-secondary transition-all duration-200 relative"
            title={isAr ? 'سجل تحليلات الفيديو' : 'Video Analysis History'}
          >
            <History className="w-3.5 h-3.5 text-foreground" />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-foreground text-background text-[8px] font-bold rounded-full flex items-center justify-center">
              {history.length}
            </span>
          </button>
        )}
      </div>

      {/* History Modal */}
      {showHistory && createPortal(
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowHistory(false)}>
          <div
            className="bg-background border border-border rounded-xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden animate-slideDown"
            dir={isAr ? 'rtl' : 'ltr'}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-border bg-secondary/30">
              <div className="flex items-center gap-2">
                <Video className="w-4 h-4 text-foreground" />
                <h3 className="text-sm font-semibold text-foreground">{isAr ? 'سجل تحليلات الفيديو' : 'Video Analysis History'}</h3>
              </div>
              <button onClick={() => setShowHistory(false)} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-all duration-200">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {history.map(entry => (
                <div
                  key={entry.id}
                  className="w-full text-start p-3 rounded-lg border border-border hover:bg-secondary/50 hover:shadow-sm transition-all duration-200 relative group"
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setHistory(prev => {
                        const updated = prev.filter(h => h.id !== entry.id);
                        // When all records are deleted, notify calibration tool
                        if (updated.length === 0 && onMediaAnalyzed) onMediaAnalyzed('');
                        return updated;
                      });
                    }}
                    className="absolute top-2 end-2 p-1 rounded hover:bg-red-500/20 text-muted-foreground hover:text-red-500 transition-all duration-200 opacity-0 group-hover:opacity-100"
                    title={isAr ? 'حذف' : 'Delete'}
                  >
                    <X className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => loadFromHistory(entry)}
                    className="w-full text-start"
                  >
                    <div className="flex items-start gap-2">
                      {/* Thumbnail preview */}
                      {entry.thumbnailData && (
                        <img src={entry.thumbnailData} alt="" className="w-14 h-10 object-cover rounded border border-border/30 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1 pe-5">
                          <span className="text-xs font-medium text-foreground truncate max-w-[60%]">
                            {entry.data?.objectType || entry.thumbnailName}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {entry.timestamp.toLocaleTimeString()}
                          </span>
                        </div>
                        {entry.data?.detected && (
                          <div className="space-y-1.5">
                            <div className="flex gap-3 text-[10px] text-muted-foreground">
                              <span>V={entry.data.velocity} m/s</span>
                              <span>θ={entry.data.angle}°</span>
                              <span>m={entry.data.mass} kg</span>
                            </div>
                            <div className="grid grid-cols-2 gap-1.5 text-[9px]">
                              <div className="bg-secondary/50 rounded p-1 text-center">
                                <span className="text-muted-foreground">{isAr ? 'السرعة' : 'Velocity'}: </span>
                                <span className="font-mono font-medium text-foreground">{entry.data.velocity} m/s</span>
                              </div>
                              <div className="bg-secondary/50 rounded p-1 text-center">
                                <span className="text-muted-foreground">{isAr ? 'الزاوية' : 'Angle'}: </span>
                                <span className="font-mono font-medium text-foreground">{entry.data.angle}°</span>
                              </div>
                              <div className="bg-secondary/50 rounded p-1 text-center">
                                <span className="text-muted-foreground">{isAr ? 'الارتفاع' : 'Height'}: </span>
                                <span className="font-mono font-medium text-foreground">{entry.data.height ?? '—'} m</span>
                              </div>
                              <div className="bg-secondary/50 rounded p-1 text-center">
                                <span className="text-muted-foreground">{isAr ? 'الكتلة' : 'Mass'}: </span>
                                <span className="font-mono font-medium text-foreground">{entry.data.mass ?? '—'} kg</span>
                              </div>
                              {entry.data.confidence != null && (
                                <div className="bg-secondary/50 rounded p-1 text-center col-span-2">
                                  <span className="text-muted-foreground">{isAr ? 'نسبة الثقة' : 'Confidence'}: </span>
                                  <span className="font-mono font-medium text-foreground">{entry.data.confidence}%</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        {!entry.data?.detected && (
                          <span className="text-[10px] text-muted-foreground">{isAr ? 'لم يُكتشف مقذوف' : 'No projectile'}</span>
                        )}
                      </div>
                    </div>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Camera Recording Modal */}
      {showCamera && createPortal(
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black">
          <video
            ref={cameraVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          {/* Recording timer */}
          {isRecording && (
            <div className="absolute top-6 left-0 right-0 flex justify-center">
              <div className="flex items-center gap-2 bg-black/60 px-4 py-2 rounded-full backdrop-blur-sm">
                <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                <span className="text-white font-mono text-sm">{formatTime(recordingTime)}</span>
              </div>
            </div>
          )}
          {/* Instructions when not recording */}
          {!isRecording && (
            <div className="absolute top-6 left-0 right-0 text-center">
              <span className="text-white text-sm font-medium bg-black/40 px-4 py-2 rounded-full backdrop-blur-sm">
                {isAr ? '\u0627\u0636\u063a\u0637 \u0632\u0631 \u0627\u0644\u062a\u0633\u062c\u064a\u0644 \u0644\u0628\u062f\u0621 \u0627\u0644\u062a\u0635\u0648\u064a\u0631' : 'Press record to start filming'}
              </span>
            </div>
          )}
          <div className="absolute bottom-8 left-0 right-0 flex items-center justify-center gap-6">
            <button
              onClick={() => { stopCameraStream(); setShowCamera(false); setIsRecording(false); setRecordingTime(0); }}
              className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-all"
              title={isAr ? '\u0625\u0644\u063a\u0627\u0621' : 'Cancel'}
            >
              <X className="w-6 h-6 text-white" />
            </button>
            {!isRecording ? (
              <button
                onClick={startRecording}
                className="w-16 h-16 rounded-full bg-red-500 border-4 border-white/50 flex items-center justify-center hover:scale-105 transition-transform shadow-lg"
                title={isAr ? '\u0628\u062f\u0621 \u0627\u0644\u062a\u0633\u062c\u064a\u0644' : 'Start Recording'}
              >
                <div className="w-6 h-6 rounded-full bg-white" />
              </button>
            ) : (
              <button
                onClick={stopRecording}
                className="w-16 h-16 rounded-full bg-red-600 border-4 border-white/50 flex items-center justify-center hover:scale-105 transition-transform shadow-lg animate-pulse"
                title={isAr ? '\u0625\u064a\u0642\u0627\u0641 \u0648\u062a\u062d\u0644\u064a\u0644' : 'Stop & Analyze'}
              >
                <Square className="w-6 h-6 text-white fill-white" />
              </button>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* Analysis Modal */}
      {showModal && createPortal(
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => !isAnalyzing && setShowModal(false)}>
          <div
            className="bg-background border border-border rounded-xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden animate-slideDown"
            dir={isAr ? 'rtl' : 'ltr'}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-border bg-secondary/30">
              <div className="flex items-center gap-2">
                <Video className="w-4 h-4 text-foreground" />
                <h3 className="text-sm font-semibold text-foreground">APAS Video</h3>
              </div>
              {!isAnalyzing && (
                <button onClick={() => setShowModal(false)} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-all duration-200">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {/* Video player - full display when results shown */}
              {!isAnalyzing && (videoUrl || thumbnailUrl) && (
                <div className="w-full">
                  {videoUrl ? (
                    <video
                      src={videoUrl}
                      controls
                      playsInline
                      className="w-full rounded-lg border border-border/30"
                    />
                  ) : thumbnailUrl ? (
                    <img src={thumbnailUrl} alt="" className="w-full object-contain rounded-lg border border-border/30" />
                  ) : null}
                </div>
              )}

              {isAnalyzing && (
                <div className="space-y-3">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    <span className="text-sm text-foreground font-medium">
                      {statusText || (isAr ? 'جاري تحليل الفيديو...' : 'Analyzing video...')}
                    </span>
                    <span className="text-xs font-mono text-muted-foreground">{Math.round(progress)}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              )}

              {!isAnalyzing && analysisData && (
                <>
                  <div className={`flex items-center gap-2 p-3 rounded-lg border ${
                    isHighConfidence ? 'bg-green-500/10 border-green-500/30' :
                    isLowConfidence ? 'bg-yellow-500/10 border-yellow-500/30' :
                    'bg-red-500/10 border-red-500/30'
                  }`}>
                    {isHighConfidence ? <CheckCircle className="w-4 h-4 text-green-500 shrink-0" /> :
                     isLowConfidence ? <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0" /> :
                     <XCircle className="w-4 h-4 text-red-500 shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground">
                        {isHighConfidence ? (isAr ? 'تم اكتشاف مقذوف ✅' : 'Projectile detected ✅') :
                         isLowConfidence ? (isAr ? 'مقذوف محتمل ⚠️' : 'Possible projectile ⚠️') :
                         (isAr ? 'لم يتم اكتشاف مقذوف ❌' : 'No projectile detected ❌')}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {isAr ? `نسبة الثقة: ${confidence}%` : `Confidence: ${confidence}%`}
                        {analysisData.objectType && ` — ${analysisData.objectType}`}
                        {isLowConfidence && (isAr ? ' — لم يتم تحميل القيم' : ' — values not loaded')}
                      </p>
                    </div>
                  </div>

                  {analysisData.detected && (
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: isAr ? 'الزاوية' : 'Angle', value: analysisData.angle, unit: '°' },
                        { label: isAr ? 'السرعة' : 'Velocity', value: analysisData.velocity, unit: ' m/s' },
                        { label: isAr ? 'الكتلة' : 'Mass', value: analysisData.mass, unit: ' kg' },
                        { label: isAr ? 'الارتفاع' : 'Height', value: analysisData.height, unit: ' m' },
                      ].map(item => (
                        <div key={item.label} className="border border-border rounded-lg p-2.5 text-center bg-secondary/30">
                          <p className="text-[10px] text-muted-foreground mb-0.5">{item.label}</p>
                          <p className="text-sm font-semibold font-mono text-foreground">
                            {item.value != null ? `${item.value}${item.unit}` : '—'}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {!isAnalyzing && analysisText && (
                <div className="border border-border rounded-lg p-3 bg-secondary/20">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    {isAr ? 'التحليل' : 'Analysis'}
                  </p>
                  <div className="prose prose-sm max-w-none text-xs text-foreground [&_p]:my-1 [&_li]:my-0.5 [&_ul]:my-1 [&_ol]:my-1">
                    <ReactMarkdown>{cleanLatex(analysisText)}</ReactMarkdown>
                  </div>
                </div>
              )}
            </div>

            {!isAnalyzing && (
              <div className="p-3 border-t border-border flex gap-2">
                {isLowConfidence && (
                  <button
                    onClick={() => {
                      if (analysisData) {
                        onUpdateParams({
                          velocity: analysisData.velocity,
                          angle: analysisData.angle,
                          mass: analysisData.mass,
                          height: analysisData.height,
                        });
                        toast.success(isAr ? '🤖 تم تحميل القيم بواسطة APAS AI' : '🤖 Values loaded by APAS AI');
                      }
                    }}
                    className="flex-1 text-xs py-2 rounded-md border border-border hover:border-foreground/30 hover:bg-secondary hover:shadow-md transition-all duration-200 text-foreground"
                  >
                    {isAr ? 'تحميل القيم رغم ذلك' : 'Load values anyway'}
                  </button>
                )}
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 text-xs py-2 rounded-md bg-foreground text-background hover:bg-foreground/90 hover:shadow-md transition-all duration-200"
                >
                  {isAr ? 'إغلاق' : 'Close'}
                </button>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
