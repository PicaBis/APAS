import React, { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Video, Loader2, X, Upload, Sparkles, Play, Pause, RotateCcw, Scissors, SwitchCamera, FlipHorizontal, Circle, Square, Aperture } from 'lucide-react';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';
import { checkFileSize, getIssueMessage } from '@/utils/mediaQuality';
import { useAuth } from '@/contexts/AuthContext';
import ReportRenderer from './ReportRenderer';

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */
interface Props {
  lang: string;
  onUpdateParams: (params: { velocity?: number; angle?: number; height?: number; mass?: number; objectType?: string }) => void;
  onMediaAnalyzed?: (thumbnailDataUrl: string) => void;
  onAutoRun?: () => void;
  onDetectedMedia?: (data: { source: 'video' | 'image'; detectedAngle?: number; detectedVelocity?: number; detectedHeight?: number; confidence?: number; objectType?: string }) => void;
  onAnalysisComplete?: (entry: { type: 'vision' | 'video' | 'subject' | 'voice'; report: string; mediaSrc?: string; mediaType?: 'video' | 'image'; params?: { velocity?: number; angle?: number; height?: number; mass?: number } }) => void;
  autoOpen?: boolean;
  onDismiss?: () => void;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const MAX_FRAMES = 8;

function extractFrames(video: HTMLVideoElement, count: number): Promise<Array<{ data: string; timestamp: number }>> {
  return new Promise((resolve) => {
    const duration = video.duration;
    if (!duration || duration <= 0) { resolve([]); return; }

    const frames: Array<{ data: string; timestamp: number }> = [];
    const interval = duration / (count + 1);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) { resolve([]); return; }

    let idx = 0;
    const captureNext = () => {
      if (idx >= count) { resolve(frames); return; }
      const t = interval * (idx + 1);
      video.currentTime = t;
    };

    video.onseeked = () => {
      canvas.width = Math.min(video.videoWidth, 640);
      canvas.height = Math.round(canvas.width * (video.videoHeight / video.videoWidth));
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
      frames.push({ data: dataUrl, timestamp: video.currentTime });
      idx++;
      captureNext();
    };

    captureNext();
  });
}

export default function ApasVideoButton({ lang, onUpdateParams, onMediaAnalyzed, onAutoRun, onDetectedMedia, onAnalysisComplete, autoOpen, onDismiss }: Props) {
  const { user } = useAuth();
  const [open, setOpen] = useState(autoOpen || false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMsg, setStatusMsg] = useState('');
  const [report, setReport] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const isAr = lang === 'ar';

  // Video preview state
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [showTrimmer, setShowTrimmer] = useState(false);
  const previewVideoRef = useRef<HTMLVideoElement>(null);

  // Camera recording state
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [mirrorPreview, setMirrorPreview] = useState(false);
  const cameraVideoRef = useRef<HTMLVideoElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const close = useCallback(() => {
    setOpen(false);
    setReport(null);
    setPreview(null);
    setProgress(0);
    setStatusMsg('');
    setVideoFile(null);
    if (videoSrc) { URL.revokeObjectURL(videoSrc); setVideoSrc(null); }
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setTrimStart(0);
    setTrimEnd(0);
    setShowTrimmer(false);
    setCameraOpen(false);
    setIsRecording(false);
    setRecordingTime(0);
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach(t => t.stop());
      cameraStreamRef.current = null;
    }
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    setCameraReady(false);
    if (onDismiss) onDismiss();
  }, [onDismiss, videoSrc]);

  // Start/stop camera
  const startCamera = useCallback(async () => {
    try {
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach(t => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      });
      cameraStreamRef.current = stream;
      if (cameraVideoRef.current) {
        cameraVideoRef.current.srcObject = stream;
        cameraVideoRef.current.play();
        setCameraReady(true);
      }
    } catch {
      toast.error(isAr ? '\u062a\u0639\u0630\u0631 \u0627\u0644\u0648\u0635\u0648\u0644 \u0625\u0644\u0649 \u0627\u0644\u0643\u0627\u0645\u064a\u0631\u0627' : 'Camera access denied');
      setCameraOpen(false);
    }
  }, [facingMode, isAr]);

  const stopCamera = useCallback(() => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach(t => t.stop());
      cameraStreamRef.current = null;
    }
    setCameraReady(false);
  }, []);

  useEffect(() => {
    if (cameraOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [cameraOpen, startCamera, stopCamera]);

  const switchCamera = useCallback(() => {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  }, []);

  useEffect(() => {
    if (cameraOpen && cameraReady) {
      startCamera();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode]);

  // Start recording
  const startRecording = useCallback(() => {
    if (!cameraStreamRef.current) return;
    recordedChunksRef.current = [];
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm';
    const recorder = new MediaRecorder(cameraStreamRef.current, { mimeType });
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) recordedChunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
      const file = new File([blob], `camera-recording-${Date.now()}.webm`, { type: 'video/webm' });
      setCameraOpen(false);
      stopCamera();
      setIsRecording(false);
      setRecordingTime(0);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      // Go to preview mode
      setVideoFile(file);
      setVideoSrc(URL.createObjectURL(file));
    };
    mediaRecorderRef.current = recorder;
    recorder.start(100);
    setIsRecording(true);
    setRecordingTime(0);
    recordingTimerRef.current = setInterval(() => {
      setRecordingTime(prev => prev + 1);
    }, 1000);
  }, [stopCamera]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
  }, []);

  // Video preview controls
  const togglePlay = useCallback(() => {
    const vid = previewVideoRef.current;
    if (!vid) return;
    if (isPlaying) { vid.pause(); } else { vid.play(); }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const resetVideo = useCallback(() => {
    const vid = previewVideoRef.current;
    if (!vid) return;
    vid.currentTime = trimStart;
    vid.pause();
    setIsPlaying(false);
  }, [trimStart]);

  // Enforce trim boundaries during playback
  useEffect(() => {
    const vid = previewVideoRef.current;
    if (!vid || !showTrimmer) return;
    const handleTimeUpdate = () => {
      if (vid.currentTime >= trimEnd) {
        vid.pause();
        vid.currentTime = trimStart;
        setIsPlaying(false);
      }
    };
    vid.addEventListener('timeupdate', handleTimeUpdate);
    return () => vid.removeEventListener('timeupdate', handleTimeUpdate);
  }, [trimStart, trimEnd, showTrimmer]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };


  // Submit video for analysis (from file or preview)
  const submitForAnalysis = useCallback(() => {
    if (!videoFile) return;
    setVideoSrc(null);
    setShowTrimmer(false);
    analyzeVideo(videoFile);
  }, [videoFile]);

  const analyzeVideo = useCallback(async (file: File) => {
    setLoading(true);
    setProgress(5);
    setReport(null);

    try {
      // File validation
      const sizeIssue = checkFileSize(file);
      if (sizeIssue) toast.warning(getIssueMessage(sizeIssue, lang));

      // Guard: block uploads when Supabase is not configured
      if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        toast.error(isAr ? 'خدمة Supabase غير مهيأة. تحقق من إعدادات البيئة.' : 'Supabase is not configured. Check environment settings.');
        setLoading(false);
        return;
      }

      // Step 1: Load video and extract frames
      setStatusMsg(isAr ? 'جاري استخراج الإطارات...' : 'Extracting frames...');
      setProgress(30);

      const videoEl = document.createElement('video');
      videoEl.muted = true;
      videoEl.playsInline = true;
      videoEl.preload = 'auto';

      const videoUrl = URL.createObjectURL(file);
      videoEl.src = videoUrl;

      await new Promise<void>((resolve, reject) => {
        videoEl.onloadedmetadata = () => resolve();
        videoEl.onerror = () => reject(new Error('Failed to load video'));
        setTimeout(() => reject(new Error('Video load timeout')), 15000);
      });

      // Generate thumbnail from first frame
      const thumbCanvas = document.createElement('canvas');
      const thumbCtx = thumbCanvas.getContext('2d');
      videoEl.currentTime = 0.1;
      await new Promise<void>((resolve) => {
        videoEl.onseeked = () => resolve();
      });
      let thumbnailUrl: string | undefined;
      if (thumbCtx) {
        const scale = Math.min(1, 200 / Math.max(videoEl.videoWidth, videoEl.videoHeight));
        thumbCanvas.width = Math.round(videoEl.videoWidth * scale);
        thumbCanvas.height = Math.round(videoEl.videoHeight * scale);
        thumbCtx.drawImage(videoEl, 0, 0, thumbCanvas.width, thumbCanvas.height);
        const thumbUrl = thumbCanvas.toDataURL('image/jpeg', 0.7);
        thumbnailUrl = thumbUrl;
        setPreview(thumbUrl);
        if (onMediaAnalyzed) onMediaAnalyzed(thumbUrl);
      }

      setProgress(40);
      setStatusMsg(isAr ? 'جاري تحليل الإطارات...' : 'Analyzing frames...');

      // Extract frames
      const frameCount = Math.min(MAX_FRAMES, Math.max(4, Math.floor(videoEl.duration * 2)));
      const frames = await extractFrames(videoEl, frameCount);
      URL.revokeObjectURL(videoUrl);

      if (frames.length === 0) {
        throw new Error(isAr ? 'لم يتم استخراج إطارات من الفيديو' : 'No frames extracted from video');
      }

      setProgress(55);
      setStatusMsg(isAr ? 'APAS يشاهد الفيديو...' : 'APAS watching video...');

      // Step 3: Call video-analyze edge function
      const response = await fetch(`${SUPABASE_URL}/functions/v1/video-analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          frames,
          lang,
          videoName: file.name,
          userId: user?.id || null,
        }),
      });

      setProgress(80);
      setStatusMsg(isAr ? 'APAS يحل المسألة...' : 'APAS solving physics...');

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error((errData as { error?: string }).error || `Server error ${response.status}`);
      }

      const result = await response.json();
      setProgress(95);

      if (result.error) throw new Error(result.error);

      const reportText = result.text || '';
      setReport(reportText);

      // Extract values from JSON in the report
      const jsonMatch = reportText.match(/```json\s*([\s\S]*?)```/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[1].trim());
          const params: { velocity?: number; angle?: number; height?: number; mass?: number; objectType?: string } = {};
          if (parsed.velocity) params.velocity = Number(parsed.velocity);
          if (parsed.angle) params.angle = Number(parsed.angle);
          if (parsed.height) params.height = Number(parsed.height);
          if (parsed.mass) params.mass = Number(parsed.mass);
          if (parsed.objectType) params.objectType = String(parsed.objectType);

          if (Object.keys(params).length > 0) {
            onUpdateParams(params);
            if (onDetectedMedia) {
              onDetectedMedia({
                source: 'video',
                detectedAngle: params.angle,
                detectedVelocity: params.velocity,
                detectedHeight: params.height,
                confidence: parsed.confidence,
                objectType: params.objectType,
              });
            }
            // Auto-start disabled per user request
            // if (onAutoRun) setTimeout(() => onAutoRun(), 150);
          }
        } catch {
          console.warn('Could not parse JSON from report');
        }
      }

      // Notify analysis complete for record/log and unlocking predictions
      if (onAnalysisComplete) {
        const jsonMatch2 = reportText.match(/```json\s*([\s\S]*?)```/);
        let extractedParams: { velocity?: number; angle?: number; height?: number; mass?: number } | undefined;
        if (jsonMatch2) {
          try {
            const p = JSON.parse(jsonMatch2[1].trim());
            extractedParams = {};
            if (p.velocity) extractedParams.velocity = Number(p.velocity);
            if (p.angle) extractedParams.angle = Number(p.angle);
            if (p.height) extractedParams.height = Number(p.height);
            if (p.mass) extractedParams.mass = Number(p.mass);
          } catch { /* ignore */ }
        }
        onAnalysisComplete({
          type: 'video',
          report: reportText,
          mediaSrc: thumbnailUrl,
          mediaType: 'video',
          params: extractedParams,
        });
      }

      setProgress(100);
      setStatusMsg(isAr ? 'اكتمل التحليل' : 'Analysis complete');
      toast.success(isAr ? 'تم تحليل الفيديو بنجاح' : 'Video analyzed successfully');
    } catch (err) {
      console.error('Video analysis error:', err);
      const msg = err instanceof Error ? err.message : 'Unknown error';
      toast.error(isAr ? `خطأ في التحليل: ${msg}` : `Analysis error: ${msg}`);
      setStatusMsg(isAr ? 'فشل التحليل' : 'Analysis failed');
    } finally {
      setLoading(false);
    }
  }, [lang, isAr, onUpdateParams, onMediaAnalyzed, onAutoRun, onDetectedMedia, onAnalysisComplete, user?.id]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('video/')) {
      toast.error(isAr ? 'الرجاء اختيار فيديو' : 'Please select a video');
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      toast.error(isAr ? 'الفيديو كبير جداً (الحد 100 ميجا)' : 'Video too large (max 100MB)');
      return;
    }
    // Go to preview mode instead of directly analyzing
    setVideoFile(file);
    setVideoSrc(URL.createObjectURL(file));
    e.target.value = '';
  }, [isAr]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('video/')) {
      setVideoFile(file);
      setVideoSrc(URL.createObjectURL(file));
    }
  }, []);

  const modal = open ? createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/50">
          <div className="flex items-center gap-2">
            <Video className="w-5 h-5 text-primary" />
            <h2 className="font-bold text-foreground">{isAr ? 'APAS تحليل الفيديو' : 'APAS Video Analysis'}</h2>
          </div>
          <button onClick={close} className="p-1.5 rounded-lg hover:bg-muted transition-colors"><X className="w-4 h-4" /></button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Upload zone + Camera - shown when not loading, no report, no video preview, no camera */}
          {!loading && !report && !videoSrc && !cameraOpen && (
            <>
              {/* Drop zone */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-primary/30 rounded-xl p-8 text-center cursor-pointer hover:border-primary/60 hover:bg-primary/5 transition-all"
              >
                <Upload className="w-10 h-10 text-primary/50 mx-auto mb-3" />
                <p className="text-sm font-medium text-foreground">{isAr ? '\u0627\u0633\u062d\u0628 \u0641\u064a\u062f\u064a\u0648 \u0647\u0646\u0627 \u0623\u0648 \u0627\u0646\u0642\u0631 \u0644\u0644\u0627\u062e\u062a\u064a\u0627\u0631' : 'Drop a video here or click to select'}</p>
                <p className="text-xs text-muted-foreground mt-1">{isAr ? 'MP4, WebM, MOV (\u062d\u062a\u0649 100 \u0645\u064a\u062c\u0627)' : 'MP4, WebM, MOV (up to 100MB)'}</p>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-border/50" />
                <span className="text-xs text-muted-foreground font-medium">{isAr ? '\u0623\u0648' : 'OR'}</span>
                <div className="flex-1 h-px bg-border/50" />
              </div>

              {/* Camera recording button */}
              <button
                onClick={() => setCameraOpen(true)}
                className="w-full flex items-center justify-center gap-3 py-4 px-4 rounded-xl bg-gradient-to-r from-red-500/10 to-orange-500/10 hover:from-red-500/20 hover:to-orange-500/20 border border-red-500/20 hover:border-red-500/40 text-foreground font-medium text-sm transition-all duration-300 group"
              >
                <div className="w-10 h-10 rounded-full bg-red-500/15 flex items-center justify-center group-hover:bg-red-500/25 transition-colors">
                  <Aperture className="w-5 h-5 text-red-500" />
                </div>
                <div className="text-start">
                  <p className="font-semibold">{isAr ? '\u062a\u0635\u0648\u064a\u0631 \u0645\u0628\u0627\u0634\u0631 \u0628\u0627\u0644\u0643\u0627\u0645\u064a\u0631\u0627' : 'Direct Camera Recording'}</p>
                  <p className="text-xs text-muted-foreground">{isAr ? '\u0633\u062c\u0644 \u0641\u064a\u062f\u064a\u0648 \u0645\u0628\u0627\u0634\u0631\u0629 \u0644\u0644\u062a\u062d\u0644\u064a\u0644' : 'Record video directly for analysis'}</p>
                </div>
              </button>
            </>
          )}

          {/* Camera recording view */}
          {cameraOpen && !loading && !report && (
            <div className="space-y-3">
              <div className="relative rounded-xl overflow-hidden border border-border bg-black">
                <video
                  ref={cameraVideoRef}
                  className="w-full max-h-[350px] object-contain"
                  playsInline
                  autoPlay
                  muted
                  style={{ transform: mirrorPreview ? 'scaleX(-1)' : 'none' }}
                />
                {!cameraReady && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <div className="text-center text-white">
                      <Video className="w-8 h-8 mx-auto mb-2 animate-pulse" />
                      <p className="text-sm">{isAr ? '\u062c\u0627\u0631\u064a \u062a\u0634\u063a\u064a\u0644 \u0627\u0644\u0643\u0627\u0645\u064a\u0631\u0627...' : 'Starting camera...'}</p>
                    </div>
                  </div>
                )}
                {isRecording && (
                  <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/60 backdrop-blur-sm rounded-full px-3 py-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-white text-xs font-mono">{formatTime(recordingTime)}</span>
                  </div>
                )}
              </div>

              {/* Camera controls */}
              <div className="flex items-center justify-center gap-3">
                {!isRecording && (
                  <button
                    onClick={switchCamera}
                    className="p-2.5 rounded-xl border border-border hover:bg-muted transition-colors"
                    title={isAr ? '\u062a\u0628\u062f\u064a\u0644 \u0627\u0644\u0643\u0627\u0645\u064a\u0631\u0627' : 'Switch camera'}
                  >
                    <SwitchCamera className="w-4 h-4 text-foreground" />
                  </button>
                )}

                {!isRecording ? (
                  <button
                    onClick={startRecording}
                    disabled={!cameraReady}
                    className="w-16 h-16 rounded-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white flex items-center justify-center shadow-lg shadow-red-500/30 hover:shadow-xl hover:shadow-red-500/40 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Circle className="w-7 h-7 fill-current" />
                  </button>
                ) : (
                  <button
                    onClick={stopRecording}
                    className="w-16 h-16 rounded-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white flex items-center justify-center shadow-lg shadow-red-500/30 animate-pulse transition-all duration-300"
                  >
                    <Square className="w-6 h-6 fill-current" />
                  </button>
                )}

                {!isRecording && (
                  <button
                    onClick={() => setMirrorPreview(!mirrorPreview)}
                    className={`p-2.5 rounded-xl border transition-colors ${mirrorPreview ? 'bg-primary/10 border-primary/30 text-primary' : 'border-border hover:bg-muted text-foreground'}`}
                    title={isAr ? '\u0639\u0643\u0633 \u0627\u0644\u0645\u0639\u0627\u064a\u0646\u0629' : 'Mirror preview'}
                  >
                    <FlipHorizontal className="w-4 h-4" />
                  </button>
                )}
              </div>

              {!isRecording && (
                <button
                  onClick={() => { setCameraOpen(false); stopCamera(); }}
                  className="w-full py-2 rounded-lg bg-muted/50 text-muted-foreground text-sm font-medium hover:bg-muted transition-colors"
                >
                  {isAr ? '\u0625\u0644\u063a\u0627\u0621' : 'Cancel'}
                </button>
              )}
            </div>
          )}

          {/* Video preview with playback controls */}
          {videoSrc && !loading && !report && (
            <div className="space-y-3">
              <div className="relative rounded-xl overflow-hidden border border-border bg-black">
                <video
                  ref={previewVideoRef}
                  src={videoSrc}
                  className="w-full max-h-[300px] object-contain"
                  playsInline
                  onLoadedMetadata={(e) => {
                    const v = e.currentTarget;
                    setDuration(v.duration);
                    setTrimEnd(v.duration);
                  }}
                  onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onEnded={() => setIsPlaying(false)}
                />
              </div>

              {/* Playback controls */}
              <div className="flex items-center gap-2 px-1">
                <button
                  onClick={togglePlay}
                  className="p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
                <button
                  onClick={resetVideo}
                  className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                {/* Seek bar */}
                <div className="flex-1 relative">
                  <input
                    type="range"
                    min={0}
                    max={duration || 1}
                    step={0.01}
                    value={currentTime}
                    onChange={(e) => {
                      const t = Number(e.target.value);
                      setCurrentTime(t);
                      if (previewVideoRef.current) previewVideoRef.current.currentTime = t;
                    }}
                    className="w-full h-1.5 accent-primary cursor-pointer"
                  />
                </div>

                <span className="text-[10px] font-mono text-muted-foreground min-w-[60px] text-end">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>

                <button
                  onClick={() => setShowTrimmer(!showTrimmer)}
                  className={`p-2 rounded-lg border transition-colors ${showTrimmer ? 'bg-primary/10 border-primary/30 text-primary' : 'border-border hover:bg-muted text-muted-foreground hover:text-foreground'}`}
                  title={isAr ? '\u0642\u0635 \u0627\u0644\u0641\u064a\u062f\u064a\u0648' : 'Trim video'}
                >
                  <Scissors className="w-4 h-4" />
                </button>
              </div>

              {/* Trim controls */}
              {showTrimmer && (
                <div className="p-3 rounded-xl border border-border bg-muted/20 space-y-2">
                  <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Scissors className="w-3.5 h-3.5 text-primary" />
                    {isAr ? '\u0642\u0635 \u0627\u0644\u0641\u064a\u062f\u064a\u0648' : 'Trim Video'}
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <label className="text-[10px] text-muted-foreground">{isAr ? '\u0628\u062f\u0627\u064a\u0629' : 'Start'}</label>
                      <input
                        type="range"
                        min={0}
                        max={duration}
                        step={0.1}
                        value={trimStart}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          setTrimStart(Math.min(v, trimEnd - 0.5));
                          if (previewVideoRef.current) previewVideoRef.current.currentTime = v;
                        }}
                        className="w-full h-1 accent-green-500"
                      />
                      <span className="text-[9px] font-mono text-muted-foreground">{formatTime(trimStart)}</span>
                    </div>
                    <div className="flex-1">
                      <label className="text-[10px] text-muted-foreground">{isAr ? '\u0646\u0647\u0627\u064a\u0629' : 'End'}</label>
                      <input
                        type="range"
                        min={0}
                        max={duration}
                        step={0.1}
                        value={trimEnd}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          setTrimEnd(Math.max(v, trimStart + 0.5));
                          if (previewVideoRef.current) previewVideoRef.current.currentTime = v;
                        }}
                        className="w-full h-1 accent-red-500"
                      />
                      <span className="text-[9px] font-mono text-muted-foreground">{formatTime(trimEnd)}</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground text-center">
                    {isAr ? `\u0627\u0644\u0645\u062f\u0629: ${formatTime(trimEnd - trimStart)}` : `Duration: ${formatTime(trimEnd - trimStart)}`}
                  </p>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    if (videoSrc) URL.revokeObjectURL(videoSrc);
                    setVideoFile(null);
                    setVideoSrc(null);
                    setShowTrimmer(false);
                    setTrimStart(0);
                    setTrimEnd(0);
                  }}
                  className="flex-1 py-2.5 rounded-lg bg-muted/50 text-muted-foreground text-sm font-medium hover:bg-muted transition-colors"
                >
                  {isAr ? '\u0625\u0644\u063a\u0627\u0621' : 'Cancel'}
                </button>
                <button
                  onClick={submitForAnalysis}
                  className="flex-1 py-2.5 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-sm font-semibold hover:from-blue-600 hover:to-cyan-600 shadow-lg shadow-blue-500/20 transition-all duration-300 flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  {isAr ? '\u062a\u062d\u0644\u064a\u0644 \u0627\u0644\u0641\u064a\u062f\u064a\u0648' : 'Analyze Video'}
                </button>
              </div>
            </div>
          )}

          {/* Loading state */}
          {loading && (
            <div className="space-y-3">
              {preview && <img src={preview} alt="Preview" className="w-full rounded-xl max-h-48 object-contain bg-muted/30" />}
              <Progress value={progress} className="h-2" />
              <div className="flex items-center gap-2 justify-center">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">{statusMsg}</span>
              </div>
            </div>
          )}

          {/* Results */}
          {report && (
            <div className="space-y-3">
              {preview && <img src={preview} alt="Analyzed" className="w-full rounded-xl max-h-40 object-contain bg-muted/30" />}
              <div className="bg-muted/30 rounded-xl p-4 border border-border/50">
                <ReportRenderer text={report} />
              </div>
              <button
                onClick={() => { setReport(null); setPreview(null); setProgress(0); setVideoFile(null); if (videoSrc) { URL.revokeObjectURL(videoSrc); setVideoSrc(null); } }}
                className="w-full py-2 rounded-lg bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors"
              >
                {isAr ? '\u062a\u062d\u0644\u064a\u0644 \u0641\u064a\u062f\u064a\u0648 \u0622\u062e\u0631' : 'Analyze another video'}
              </button>
            </div>
          )}
        </div>
      </div>
      <input ref={fileRef} type="file" accept="video/*" className="hidden" onChange={handleFileSelect} />
    </div>,
    document.body,
  ) : null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-500/10 to-cyan-500/10 hover:from-blue-500/20 hover:to-cyan-500/20 border border-blue-500/20 hover:border-blue-500/40 text-foreground font-medium text-sm transition-all duration-300 disabled:opacity-50"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Video className="w-4 h-4" />}
        <span>{isAr ? 'APAS تحليل فيديو' : 'APAS Video'}</span>
        <Sparkles className="w-3 h-3 text-blue-400" />
      </button>
      {modal}
    </>
  );
}
