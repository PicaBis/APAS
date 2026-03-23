import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import ReactMarkdown from 'react-markdown';
import { Video, Loader2, X, CheckCircle, AlertTriangle, XCircle, History, Upload, VideoIcon, Square, Scissors, Play, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';
import { checkFileSize, getIssueMessage, computeFileHash } from '@/utils/mediaQuality';
import { cleanLatex } from '@/utils/cleanLatex';
import { supabase } from '@/integrations/supabase/client';

const EDGE_VIDEO_ANALYZE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-video-gemini`;

const CONFIDENCE_THRESHOLD = 60;
const FRAME_QUALITY = 0.8; // JPEG quality 80% for thumbnail
const SUPABASE_VIDEO_BUCKET = 'video-uploads';
const MAX_VIDEO_DURATION_WARNING = 60; // Warn if video > 60 seconds

/** Processing step definition for the live progress bar */
interface ProcessingStep {
  id: string;
  labelAr: string;
  labelEn: string;
  color: string;
  icon: string;
}

const PROCESSING_STEPS: ProcessingStep[] = [
  { id: 'upload', labelAr: 'جاري رفع الفيديو لـ APAS AI...', labelEn: 'Uploading Video to APAS AI...', color: '#22c55e', icon: '🟢' },
  { id: 'analyze', labelAr: 'جاري التحليل الذكي...', labelEn: 'Smart AI Analysis...', color: '#3b82f6', icon: '🔵' },
  { id: 'results', labelAr: 'عرض النتائج...', labelEn: 'Displaying Results...', color: '#a855f7', icon: '🟣' },
];

interface Props {
  lang: string;
  onUpdateParams: (params: { velocity?: number; angle?: number; height?: number; mass?: number; objectType?: string }) => void;
  onMediaAnalyzed?: (thumbnailDataUrl: string) => void;
  calibrationMeters?: number;
  gravity?: number;
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
  startTime?: number,
  endTime?: number,
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
        const fullDuration = await resolveVideoDuration(video);

        // Use trimmed range if provided, otherwise full video
        const rangeStart = startTime != null && startTime >= 0 ? startTime : 0;
        const rangeEnd = endTime != null && endTime > 0 ? Math.min(endTime, fullDuration) : fullDuration;
        const duration = rangeEnd - rangeStart;

        // Set canvas size to a smaller resolution (max 384px wide) for reliable API payload size
        const scale = Math.min(1, 384 / video.videoWidth);
        canvas.width = Math.round(video.videoWidth * scale);
        canvas.height = Math.round(video.videoHeight * scale);

        // Calculate frame timestamps to extract (evenly distributed within trimmed range)
        const fps = 30; // Assume 30fps
        const totalFrames = Math.round(duration * fps);
        const numFrames = Math.min(maxFrames, totalFrames);
        const timestamps: number[] = [];

        for (let i = 0; i < numFrames; i++) {
          timestamps.push(rangeStart + (i / (numFrames - 1 || 1)) * duration);
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
          onProgress(Math.round((currentIdx / timestamps.length) * 100));

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

export default function ApasVideoButton({ lang, onUpdateParams, onMediaAnalyzed, calibrationMeters, gravity }: Props) {
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
  const videoUrlRef = useRef<string | null>(null);
  const [currentFileHash, setCurrentFileHash] = useState<string | null>(null);
  // Trimming state
  const [showTrimmer, setShowTrimmer] = useState(false);
  const [trimFile, setTrimFile] = useState<File | null>(null);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [trimDuration, setTrimDuration] = useState(0);
  const [trimPreviewUrl, setTrimPreviewUrl] = useState<string | null>(null);
  const trimVideoRef = useRef<HTMLVideoElement>(null);
  // Processing steps state
  const [currentStep, setCurrentStep] = useState(-1);
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

  // Keep videoUrl ref in sync
  useEffect(() => {
    videoUrlRef.current = videoUrl;
  }, [videoUrl]);

  // Cleanup on unmount — only revoke blob URLs, not Supabase URLs
  useEffect(() => {
    return () => {
      stopCameraStream();
      if (videoUrlRef.current && videoUrlRef.current.startsWith('blob:')) URL.revokeObjectURL(videoUrlRef.current);
    };
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

  // Cleanup trimmer preview URL
  useEffect(() => {
    return () => {
      if (trimPreviewUrl && trimPreviewUrl.startsWith('blob:')) URL.revokeObjectURL(trimPreviewUrl);
    };
  }, [trimPreviewUrl]);

  // Open trimmer UI when a file is selected
  const openTrimmer = (file: File) => {
    // Revoke previous preview URL
    if (trimPreviewUrl && trimPreviewUrl.startsWith('blob:')) URL.revokeObjectURL(trimPreviewUrl);
    const url = URL.createObjectURL(file);
    setTrimFile(file);
    setTrimPreviewUrl(url);
    setTrimStart(0);
    setTrimEnd(0);
    setTrimDuration(0);
    setShowTrimmer(true);
  };

  // Handle trim video metadata loaded
  const handleTrimVideoLoaded = async () => {
    if (!trimVideoRef.current) return;
    const video = trimVideoRef.current;
    const dur = await resolveVideoDuration(video);
    setTrimDuration(dur);
    setTrimEnd(dur);
    // Warn if video is too long
    if (dur > MAX_VIDEO_DURATION_WARNING) {
      toast.warning(
        isAr
          ? `⚠️ الفيديو طويل (${Math.round(dur)} ثانية). يُنصح بقص الجزء الذي يحتوي على حركة المقذوف فقط لتقليل استهلاك API.`
          : `⚠️ Video is long (${Math.round(dur)}s). Please trim to the projectile motion section to reduce API usage.`
      );
    }
  };

  // Confirm trim and start analysis
  const confirmTrimAndAnalyze = () => {
    if (!trimFile) return;
    setShowTrimmer(false);
    analyzeVideoFile(trimFile, false, trimStart, trimEnd);
  };

  // Shared analysis function for a video File
  const analyzeVideoFile = async (file: File, skipDuplicateCheck?: boolean, startTime?: number, endTime?: number) => {
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
    setCurrentStep(0);
    setThumbnailUrl(null);
    // Revoke previous blob URL to prevent memory leak, then create new one
    if (videoUrlRef.current && videoUrlRef.current.startsWith('blob:')) URL.revokeObjectURL(videoUrlRef.current);
    const blobUrl = URL.createObjectURL(file);
    setVideoUrl(blobUrl);
    setStatusText(isAr ? PROCESSING_STEPS[0].labelAr : PROCESSING_STEPS[0].labelEn);

    // Upload video to Supabase Storage in parallel for persistent playback in history
    let persistentVideoUrl: string | undefined;
    const uploadPromise = (async () => {
      try {
        const ext = file.name.split('.').pop() || 'webm';
        const storagePath = `videos/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from(SUPABASE_VIDEO_BUCKET)
          .upload(storagePath, file, { contentType: file.type, upsert: false });
        if (uploadError) {
          console.warn('Video upload to storage failed:', uploadError.message);
          return undefined;
        }
        const { data: urlData } = supabase.storage
          .from(SUPABASE_VIDEO_BUCKET)
          .getPublicUrl(storagePath);
        return urlData?.publicUrl || undefined;
      } catch (err) {
        console.warn('Video upload error:', err);
        return undefined;
      }
    })();

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
        const historyThumb = thumbnailUrl || undefined;

        // Notify parent that media was analyzed (for calibration tool awareness)
        if (historyThumb && onMediaAnalyzed) onMediaAnalyzed(historyThumb);

        // Use persistent Supabase URL for history (falls back to blob URL)
        const currentVideoUrl = persistentVideoUrl || blobUrl;

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

        // Update the displayed video URL to persistent one if available
        if (persistentVideoUrl) {
          setVideoUrl(persistentVideoUrl);
        }

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
        const historyThumbFallback = thumbnailUrl || undefined;
        setAnalysisText(cleanText || (isAr ? '\u0644\u0645 \u064a\u062a\u0645 \u0627\u0643\u062a\u0634\u0627\u0641 \u0645\u0642\u0630\u0648\u0641' : 'No projectile detected'));
        setHistory(prev => [{
          id: Date.now(),
          timestamp: new Date(),
          data: null,
          text: cleanText,
          thumbnailName: sourceName,
          fileHash: fileHash,
          thumbnailData: historyThumbFallback,
          videoUrl: persistentVideoUrl || blobUrl || undefined,
        }, ...prev].slice(0, 20));
      }
    };

    let progressInterval: ReturnType<typeof setInterval> | undefined;
    try {
      // Step 1: Upload video to Supabase Storage (must complete before calling AI edge function)
      setProgress(10);
      persistentVideoUrl = await uploadPromise;
      if (persistentVideoUrl) {
        setVideoUrl(persistentVideoUrl);
      }

      if (!persistentVideoUrl) {
        throw new Error(isAr ? 'فشل رفع الفيديو. تأكد من إعدادات التخزين.' : 'Video upload failed. Check storage settings.');
      }

      setProgress(30);

      // Extract a single frame for thumbnail display only
      try {
        const thumbExtract = await extractFramesFromVideo(
          file,
          1,
          () => {},
          startTime,
          endTime,
        );
        if (thumbExtract.frames.length > 0) {
          setThumbnailUrl(thumbExtract.frames[0].data);
        }
      } catch {
        // Thumbnail extraction is best-effort
      }

      // Step 2: APAS AI Analysis — send video URL directly (native video, no base64)
      setCurrentStep(1);
      setStatusText(isAr ? PROCESSING_STEPS[1].labelAr : PROCESSING_STEPS[1].labelEn);
      setProgress(40);

      progressInterval = setInterval(() => {
        setProgress(prev => prev >= 90 ? 90 : prev + Math.random() * 3);
      }, 800);

      const payloadBody = JSON.stringify({
        videoUrl: persistentVideoUrl,
        trimStart: startTime ?? 0,
        trimEnd: endTime ?? 0,
        lang,
        videoName: sourceName,
        calibrationMeters: calibrationMeters && calibrationMeters > 0 ? calibrationMeters : undefined,
        gravity: gravity && gravity > 0 ? gravity : undefined,
      });

      const edgeResp = await fetch(EDGE_VIDEO_ANALYZE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: payloadBody,
      });

      clearInterval(progressInterval);

      if (edgeResp.ok) {
        const data = await edgeResp.json();
        if (data.text) {
          // Step 3: Display results
          setCurrentStep(2);
          setStatusText(isAr ? PROCESSING_STEPS[2].labelAr : PROCESSING_STEPS[2].labelEn);
          setProgress(100);
          setStatusText(isAr ? 'اكتمل التحليل!' : 'Analysis complete!');
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
      toast.info(isAr ? 'تم حذف بيانات الفيديو تلقائياً للخصوصية' : 'Video data auto-deleted for privacy');
    }

    setIsAnalyzing(false);
    setStatusText('');
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (fileRef.current) fileRef.current.value = '';
    // Open trimmer UI instead of directly analyzing
    openTrimmer(file);
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

      {/* Video Trimmer Modal */}
      {showTrimmer && trimPreviewUrl && createPortal(
        <div className="fixed inset-0 z-[75] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowTrimmer(false)}>
          <div
            className="bg-background border border-border rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-slideDown"
            dir={isAr ? 'rtl' : 'ltr'}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border bg-secondary/30">
              <div className="flex items-center gap-2">
                <Scissors className="w-4 h-4 text-foreground" />
                <h3 className="text-sm font-semibold text-foreground">
                  {isAr ? 'قص الفيديو — حدد منطقة المقذوف' : 'Trim Video — Select Projectile Region'}
                </h3>
              </div>
              <button onClick={() => setShowTrimmer(false)} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-all duration-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Video Preview */}
              <div className="w-full rounded-lg overflow-hidden border border-border/30 bg-black">
                <video
                  ref={trimVideoRef}
                  src={trimPreviewUrl}
                  controls
                  playsInline
                  muted
                  className="w-full max-h-[250px] object-contain"
                  onLoadedMetadata={handleTrimVideoLoaded}
                />
              </div>

              {/* Trim Controls */}
              {trimDuration > 0 && (
                <div className="space-y-3">
                  {/* Duration info */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{isAr ? `المدة الكاملة: ${trimDuration.toFixed(1)} ثانية` : `Full duration: ${trimDuration.toFixed(1)}s`}</span>
                    <span className="font-mono text-foreground">
                      {isAr ? `الجزء المختار: ${(trimEnd - trimStart).toFixed(1)} ث` : `Selected: ${(trimEnd - trimStart).toFixed(1)}s`}
                    </span>
                  </div>

                  {/* Timeline bar with markers */}
                  <div className="relative h-10 bg-secondary/50 rounded-lg border border-border overflow-hidden">
                    {/* Selected range highlight */}
                    <div
                      className="absolute top-0 bottom-0 bg-primary/20 border-x-2 border-primary"
                      style={{
                        left: `${(trimStart / trimDuration) * 100}%`,
                        width: `${((trimEnd - trimStart) / trimDuration) * 100}%`,
                      }}
                    />
                    {/* Start marker */}
                    <div
                      className="absolute top-0 bottom-0 w-1 bg-green-500 cursor-ew-resize z-10"
                      style={{ left: `${(trimStart / trimDuration) * 100}%` }}
                    />
                    {/* End marker */}
                    <div
                      className="absolute top-0 bottom-0 w-1 bg-red-500 cursor-ew-resize z-10"
                      style={{ left: `${(trimEnd / trimDuration) * 100}%` }}
                    />
                  </div>

                  {/* Start / End inputs */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                        <Play className="w-3 h-3 text-green-500" />
                        {isAr ? 'نقطة البداية (ث)' : 'Start Point (s)'}
                      </label>
                      <input
                        type="range"
                        min={0}
                        max={trimDuration}
                        step={0.1}
                        value={trimStart}
                        onChange={e => {
                          const v = parseFloat(e.target.value);
                          setTrimStart(Math.min(v, trimEnd - 0.5));
                          if (trimVideoRef.current) trimVideoRef.current.currentTime = v;
                        }}
                        className="w-full h-2 accent-green-500"
                      />
                      <span className="text-xs font-mono text-foreground">{trimStart.toFixed(1)}s</span>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                        <Square className="w-3 h-3 text-red-500" />
                        {isAr ? 'نقطة النهاية (ث)' : 'End Point (s)'}
                      </label>
                      <input
                        type="range"
                        min={0}
                        max={trimDuration}
                        step={0.1}
                        value={trimEnd}
                        onChange={e => {
                          const v = parseFloat(e.target.value);
                          setTrimEnd(Math.max(v, trimStart + 0.5));
                          if (trimVideoRef.current) trimVideoRef.current.currentTime = v;
                        }}
                        className="w-full h-2 accent-red-500"
                      />
                      <span className="text-xs font-mono text-foreground">{trimEnd.toFixed(1)}s</span>
                    </div>
                  </div>

                  {/* Tip */}
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-2.5 text-[10px] text-muted-foreground">
                    <span className="font-medium text-foreground">💡 {isAr ? 'نصيحة:' : 'Tip:'}</span>{' '}
                    {isAr
                      ? 'حدد فقط الجزء الذي يحتوي على حركة المقذوف (لحظة الانطلاق والمسار). هذا يوفر استهلاك API ويحسن دقة التحليل.'
                      : 'Select only the segment containing projectile motion (launch moment and trajectory). This saves API tokens and improves analysis accuracy.'}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-border flex gap-2">
              <button
                onClick={() => setShowTrimmer(false)}
                className="flex-1 text-xs py-2.5 rounded-md border border-border hover:border-foreground/30 hover:bg-secondary transition-all duration-200 text-foreground"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={confirmTrimAndAnalyze}
                disabled={trimDuration <= 0}
                className="flex-1 flex items-center justify-center gap-2 text-xs py-2.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-md transition-all duration-200 disabled:opacity-50 font-medium"
              >
                <Check className="w-4 h-4" />
                {isAr ? 'تأكيد وحلّل' : 'Confirm & Analyze'}
              </button>
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
              {/* Video player - always visible for playback (during and after analysis) */}
              {(videoUrl || thumbnailUrl) && (
                <div className="w-full">
                  {videoUrl ? (
                    <video
                      src={videoUrl}
                      controls
                      playsInline
                      autoPlay
                      muted
                      className="w-full rounded-lg border border-border/30"
                    />
                  ) : thumbnailUrl ? (
                    <img src={thumbnailUrl} alt="" className="w-full object-contain rounded-lg border border-border/30" />
                  ) : null}
                </div>
              )}

              {isAnalyzing && (
                <div className="space-y-4">
                  {/* Step-by-step progress */}
                  <div className="space-y-2">
                    {PROCESSING_STEPS.map((step, idx) => {
                      const isActive = idx === currentStep;
                      const isDone = idx < currentStep;
                      const isPending = idx > currentStep;
                      return (
                        <div
                          key={step.id}
                          className={`flex items-center gap-3 p-2.5 rounded-lg border transition-all duration-300 ${
                            isActive ? 'border-primary/50 bg-primary/5 shadow-sm' :
                            isDone ? 'border-green-500/30 bg-green-500/5' :
                            'border-border/30 bg-secondary/20 opacity-50'
                          }`}
                        >
                          <div className="shrink-0 w-6 h-6 flex items-center justify-center">
                            {isDone ? (
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            ) : isActive ? (
                              <Loader2 className="w-4 h-4 animate-spin" style={{ color: step.color }} />
                            ) : (
                              <span className="text-sm">{step.icon}</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs font-medium ${isActive ? 'text-foreground' : isDone ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
                              {isAr ? step.labelAr : step.labelEn}
                            </p>
                          </div>
                          {isDone && (
                            <span className="text-[9px] text-green-500 font-medium shrink-0">{isAr ? 'تم' : 'Done'}</span>
                          )}
                          {isActive && (
                            <span className="text-[9px] font-mono shrink-0" style={{ color: step.color }}>
                              {isPending ? '' : `${Math.round(progress)}%`}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Overall progress bar */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>{statusText}</span>
                      <span className="font-mono">{Math.round(progress)}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>
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
