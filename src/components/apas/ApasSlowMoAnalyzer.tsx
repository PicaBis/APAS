import React, { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Timer, Loader2, X, Upload, Sparkles, Play, Pause, RotateCcw, SwitchCamera, FlipHorizontal, Circle, Square, Aperture } from 'lucide-react';
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
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Extract more frames for slow-motion analysis
const MAX_SLOWMO_FRAMES = 16;

interface FrameData {
  data: string;
  timestamp: number;
}

interface TrackingPoint {
  frameIndex: number;
  timestamp: number;
  x: number;
  y: number;
  velocity?: number;
  acceleration?: number;
}

function extractFrames(video: HTMLVideoElement, count: number): Promise<FrameData[]> {
  return new Promise((resolve) => {
    const duration = video.duration;
    if (!duration || duration <= 0) { resolve([]); return; }

    const frames: FrameData[] = [];
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
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      frames.push({ data: dataUrl, timestamp: video.currentTime });
      idx++;
      captureNext();
    };

    captureNext();
  });
}

export default function ApasSlowMoAnalyzer({ lang, onUpdateParams, onMediaAnalyzed, onAutoRun, onDetectedMedia, onAnalysisComplete }: Props) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMsg, setStatusMsg] = useState('');
  const [report, setReport] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [trackingPoints, setTrackingPoints] = useState<TrackingPoint[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const isAr = lang === 'ar';

  // Video preview state
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
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

  // Frame visualization
  const [extractedFrames, setExtractedFrames] = useState<FrameData[]>([]);
  const [activeFrame, setActiveFrame] = useState(0);

  const close = useCallback(() => {
    setOpen(false);
    setReport(null);
    setPreview(null);
    setProgress(0);
    setStatusMsg('');
    setTrackingPoints([]);
    setExtractedFrames([]);
    setActiveFrame(0);
    setVideoFile(null);
    if (videoSrc) { URL.revokeObjectURL(videoSrc); setVideoSrc(null); }
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setCameraOpen(false);
    setIsRecording(false);
    setRecordingTime(0);
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach(t => t.stop());
      cameraStreamRef.current = null;
    }
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    setCameraReady(false);
  }, [videoSrc]);

  // Camera controls
  const startCamera = useCallback(async () => {
    try {
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach(t => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
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
    if (cameraOpen) { startCamera(); } else { stopCamera(); }
    return () => stopCamera();
  }, [cameraOpen, startCamera, stopCamera]);

  const switchCamera = useCallback(() => {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  }, []);

  useEffect(() => {
    if (cameraOpen && cameraReady) { startCamera(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode]);

  // Recording controls
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
      const file = new File([blob], `slowmo-recording-${Date.now()}.webm`, { type: 'video/webm' });
      setCameraOpen(false);
      stopCamera();
      setIsRecording(false);
      setRecordingTime(0);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
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
    vid.currentTime = 0;
    vid.pause();
    setIsPlaying(false);
  }, []);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  // Submit video for slow-mo analysis
  const submitForAnalysis = useCallback(() => {
    if (!videoFile) return;
    setVideoSrc(null);
    analyzeSlowMo(videoFile);
  }, [videoFile]);

  const analyzeSlowMo = useCallback(async (file: File) => {
    setLoading(true);
    setProgress(5);
    setReport(null);
    setTrackingPoints([]);
    setExtractedFrames([]);

    try {
      const sizeIssue = checkFileSize(file);
      if (sizeIssue) toast.warning(getIssueMessage(sizeIssue, lang));

      if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        toast.error(isAr ? '\u062e\u062f\u0645\u0629 Supabase \u063a\u064a\u0631 \u0645\u0647\u064a\u0623\u0629.' : 'Supabase is not configured.');
        setLoading(false);
        return;
      }

      // Step 1: Load video and extract high-density frames
      setStatusMsg(isAr ? '\u062c\u0627\u0631\u064a \u0627\u0633\u062a\u062e\u0631\u0627\u062c \u0627\u0644\u0625\u0637\u0627\u0631\u0627\u062a \u0628\u0643\u062b\u0627\u0641\u0629 \u0639\u0627\u0644\u064a\u0629...' : 'Extracting high-density frames...');
      setProgress(15);

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

      // Generate thumbnail
      const thumbCanvas = document.createElement('canvas');
      const thumbCtx = thumbCanvas.getContext('2d');
      videoEl.currentTime = 0.1;
      await new Promise<void>((resolve) => { videoEl.onseeked = () => resolve(); });
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

      setProgress(30);
      setStatusMsg(isAr ? '\u062c\u0627\u0631\u064a \u062a\u062d\u0644\u064a\u0644 \u0627\u0644\u0625\u0637\u0627\u0631\u0627\u062a...' : 'Analyzing frames...');

      // Extract higher density of frames for slow-mo tracking
      const frameCount = Math.min(MAX_SLOWMO_FRAMES, Math.max(8, Math.floor(videoEl.duration * 4)));
      const frames = await extractFrames(videoEl, frameCount);
      URL.revokeObjectURL(videoUrl);

      if (frames.length === 0) {
        throw new Error(isAr ? '\u0644\u0645 \u064a\u062a\u0645 \u0627\u0633\u062a\u062e\u0631\u0627\u062c \u0625\u0637\u0627\u0631\u0627\u062a \u0645\u0646 \u0627\u0644\u0641\u064a\u062f\u064a\u0648' : 'No frames extracted from video');
      }

      setExtractedFrames(frames);
      setProgress(45);
      setStatusMsg(isAr ? 'APAS \u064a\u062a\u062a\u0628\u0639 \u0627\u0644\u062c\u0633\u0645 \u0625\u0637\u0627\u0631 \u0628\u0625\u0637\u0627\u0631...' : 'APAS tracking object frame-by-frame...');

      // Build slow-mo specific prompt
      const slowMoPrompt = isAr
        ? 'حلل هذا الفيديو البطيء frame-by-frame. تتبع الجسم المتحرك في كل إطار. احسب الموضع (x,y) في كل إطار، والسرعة اللحظية، والتسارع. قدم تحليل حركة مفصل مع بيانات التتبع.'
        : 'Analyze this slow-motion video frame-by-frame. Track the moving object in each frame. Calculate position (x,y) at each frame, instantaneous velocity, and acceleration. Provide detailed motion analysis with tracking data.';

      // Step 2: Call video-analyze with slow-mo mode
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
          mode: 'slowmo',
          customPrompt: slowMoPrompt,
        }),
      });

      setProgress(75);
      setStatusMsg(isAr ? 'APAS \u064a\u062d\u0633\u0628 \u0627\u0644\u0633\u0631\u0639\u0629 \u0648\u0627\u0644\u062a\u0633\u0627\u0631\u0639...' : 'APAS computing velocity & acceleration...');

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error((errData as { error?: string }).error || `Server error ${response.status}`);
      }

      const result = await response.json();
      setProgress(90);

      if (result.error) throw new Error(result.error);

      const reportText = result.text || '';
      setReport(reportText);

      // Parse tracking data from JSON in report
      const jsonMatch = reportText.match(/```json\s*([\s\S]*?)```/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[1].trim());

          // Extract tracking points if available
          const points = parsed.tracking || parsed.trackingPoints || parsed.positions || [];
          if (Array.isArray(points) && points.length > 0) {
            const mapped: TrackingPoint[] = points.map((p: Record<string, unknown>, i: number) => ({
              frameIndex: i,
              timestamp: (p.timestamp as number) || (p.t as number) || i * 0.033,
              x: (p.x as number) || 0,
              y: (p.y as number) || 0,
              velocity: (p.velocity as number) || (p.v as number) || undefined,
              acceleration: (p.acceleration as number) || (p.a as number) || undefined,
            }));
            setTrackingPoints(mapped);
          }

          // Extract physics params
          const params: { velocity?: number; angle?: number; height?: number; mass?: number; objectType?: string } = {};
          if (parsed.velocity || parsed.initial_velocity) params.velocity = Number(parsed.velocity || parsed.initial_velocity);
          if (parsed.angle || parsed.launch_angle) params.angle = Number(parsed.angle || parsed.launch_angle);
          if (parsed.height || parsed.launch_height) params.height = Number(parsed.height || parsed.launch_height);
          if (parsed.mass || parsed.estimated_mass) params.mass = Number(parsed.mass || parsed.estimated_mass);
          if (parsed.objectType || parsed.object_type) params.objectType = String(parsed.objectType || parsed.object_type);

          if (Object.keys(params).length > 0) {
            onUpdateParams(params);
            if (onDetectedMedia) {
              onDetectedMedia({
                source: 'video',
                detectedAngle: params.angle,
                detectedVelocity: params.velocity,
                detectedHeight: params.height,
                confidence: parsed.confidence_score || parsed.confidence,
                objectType: params.objectType,
              });
            }
            if (onAutoRun) setTimeout(() => onAutoRun(), 150);
          }
        } catch {
          console.warn('Could not parse JSON from slow-mo report');
        }
      }

      // Notify analysis complete
      if (onAnalysisComplete) {
        let extractedParams: { velocity?: number; angle?: number; height?: number; mass?: number } | undefined;
        if (jsonMatch) {
          try {
            const p = JSON.parse(jsonMatch[1].trim());
            extractedParams = {};
            if (p.velocity || p.initial_velocity) extractedParams.velocity = Number(p.velocity || p.initial_velocity);
            if (p.angle || p.launch_angle) extractedParams.angle = Number(p.angle || p.launch_angle);
            if (p.height || p.launch_height) extractedParams.height = Number(p.height || p.launch_height);
            if (p.mass || p.estimated_mass) extractedParams.mass = Number(p.mass || p.estimated_mass);
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
      setStatusMsg(isAr ? '\u0627\u0643\u062a\u0645\u0644 \u0627\u0644\u062a\u062d\u0644\u064a\u0644' : 'Analysis complete');
      toast.success(isAr ? '\u062a\u0645 \u062a\u062d\u0644\u064a\u0644 \u0627\u0644\u0641\u064a\u062f\u064a\u0648 \u0627\u0644\u0628\u0637\u064a\u0621 \u0628\u0646\u062c\u0627\u062d' : 'Slow-motion video analyzed successfully');
    } catch (err) {
      console.error('Slow-mo analysis error:', err);
      const msg = err instanceof Error ? err.message : 'Unknown error';
      toast.error(isAr ? `\u062e\u0637\u0623 \u0641\u064a \u0627\u0644\u062a\u062d\u0644\u064a\u0644: ${msg}` : `Analysis error: ${msg}`);
      setStatusMsg(isAr ? '\u0641\u0634\u0644 \u0627\u0644\u062a\u062d\u0644\u064a\u0644' : 'Analysis failed');
    } finally {
      setLoading(false);
    }
  }, [lang, isAr, onUpdateParams, onMediaAnalyzed, onAutoRun, onDetectedMedia, onAnalysisComplete, user?.id]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('video/')) {
      toast.error(isAr ? '\u0627\u0644\u0631\u062c\u0627\u0621 \u0627\u062e\u062a\u064a\u0627\u0631 \u0641\u064a\u062f\u064a\u0648' : 'Please select a video');
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      toast.error(isAr ? '\u0627\u0644\u0641\u064a\u062f\u064a\u0648 \u0643\u0628\u064a\u0631 \u062c\u062f\u0627\u064b (\u0627\u0644\u062d\u062f 100 \u0645\u064a\u062c\u0627)' : 'Video too large (max 100MB)');
      return;
    }
    // Go to preview mode
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
            <Timer className="w-5 h-5 text-indigo-500" />
            <h2 className="font-bold text-foreground">{isAr ? 'APAS \u062a\u062d\u0644\u064a\u0644 \u0627\u0644\u062d\u0631\u0643\u0629 \u0627\u0644\u0628\u0637\u064a\u0626\u0629' : 'APAS Slow-Mo Analyzer'}</h2>
          </div>
          <button onClick={close} className="p-1.5 rounded-lg hover:bg-muted transition-colors"><X className="w-4 h-4" /></button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Upload zone + Camera */}
          {!loading && !report && !cameraOpen && !videoSrc && (
            <>
              <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-xl p-3 text-center">
                <p className="text-xs text-muted-foreground">
                  {isAr ? '\u0635\u0648\u0651\u0631 \u0641\u064a\u062f\u064a\u0648 \u0628\u0637\u064a\u0621 \u0644\u062c\u0633\u0645 \u0645\u062a\u062d\u0631\u0643 \u0648APAS \u0633\u064a\u062a\u062a\u0628\u0639\u0647 \u0625\u0637\u0627\u0631 \u0628\u0625\u0637\u0627\u0631' : 'Record a slow-motion video of a moving object and APAS will track it frame-by-frame'}
                </p>
              </div>

              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-indigo-500/30 rounded-xl p-8 text-center cursor-pointer hover:border-indigo-500/60 hover:bg-indigo-500/5 transition-all"
              >
                <Upload className="w-10 h-10 text-indigo-500/50 mx-auto mb-3" />
                <p className="text-sm font-medium text-foreground">{isAr ? '\u0627\u0633\u062d\u0628 \u0641\u064a\u062f\u064a\u0648 \u0628\u0637\u064a\u0621 \u0647\u0646\u0627' : 'Drop slow-mo video here or click to select'}</p>
                <p className="text-xs text-muted-foreground mt-1">{isAr ? 'MP4, WebM, MOV (\u062d\u062a\u0649 100 \u0645\u064a\u062c\u0627)' : 'MP4, WebM, MOV (up to 100MB)'}</p>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-border/50" />
                <span className="text-xs text-muted-foreground font-medium">{isAr ? '\u0623\u0648' : 'OR'}</span>
                <div className="flex-1 h-px bg-border/50" />
              </div>

              <button
                onClick={() => setCameraOpen(true)}
                className="w-full flex items-center justify-center gap-3 py-4 px-4 rounded-xl bg-gradient-to-r from-indigo-500/10 to-purple-500/10 hover:from-indigo-500/20 hover:to-purple-500/20 border border-indigo-500/20 hover:border-indigo-500/40 text-foreground font-medium text-sm transition-all duration-300 group"
              >
                <div className="w-10 h-10 rounded-full bg-indigo-500/15 flex items-center justify-center group-hover:bg-indigo-500/25 transition-colors">
                  <Aperture className="w-5 h-5 text-indigo-500" />
                </div>
                <div className="text-start">
                  <p className="font-semibold">{isAr ? '\u062a\u0633\u062c\u064a\u0644 \u0641\u064a\u062f\u064a\u0648 \u0628\u0637\u064a\u0621' : 'Record Slow-Mo Video'}</p>
                  <p className="text-xs text-muted-foreground">{isAr ? '\u0633\u062c\u0644 \u062d\u0631\u0643\u0629 \u0627\u0644\u062c\u0633\u0645 \u0628\u0628\u0637\u0621' : 'Record the object movement slowly'}</p>
                </div>
              </button>
            </>
          )}

          {/* Camera view */}
          {cameraOpen && (
            <div className="space-y-3">
              <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
                <video
                  ref={cameraVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${mirrorPreview ? 'scale-x-[-1]' : ''}`}
                />
                {!cameraReady && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
                  </div>
                )}
                {isRecording && (
                  <div className="absolute top-3 left-3 flex items-center gap-2 bg-red-600/90 text-white text-xs font-bold px-3 py-1.5 rounded-full animate-pulse">
                    <Circle className="w-2.5 h-2.5 fill-current" />
                    {formatTime(recordingTime)}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <button onClick={switchCamera} className="flex-1 py-2 rounded-lg bg-muted/50 hover:bg-muted text-xs font-medium flex items-center justify-center gap-1.5 transition-colors">
                  <SwitchCamera className="w-3.5 h-3.5" /> {isAr ? '\u062a\u0628\u062f\u064a\u0644' : 'Switch'}
                </button>
                <button onClick={() => setMirrorPreview(p => !p)} className="flex-1 py-2 rounded-lg bg-muted/50 hover:bg-muted text-xs font-medium flex items-center justify-center gap-1.5 transition-colors">
                  <FlipHorizontal className="w-3.5 h-3.5" /> {isAr ? '\u0639\u0643\u0633' : 'Mirror'}
                </button>
                {!isRecording ? (
                  <button onClick={startRecording} disabled={!cameraReady} className="flex-[2] py-2.5 rounded-lg bg-gradient-to-r from-red-500 to-red-600 text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-40 hover:opacity-90 transition-opacity shadow-lg">
                    <Circle className="w-4 h-4 fill-current" /> {isAr ? '\u062a\u0633\u062c\u064a\u0644' : 'Record'}
                  </button>
                ) : (
                  <button onClick={stopRecording} className="flex-[2] py-2.5 rounded-lg bg-gradient-to-r from-gray-600 to-gray-700 text-white text-sm font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity shadow-lg">
                    <Square className="w-3.5 h-3.5 fill-current" /> {isAr ? '\u0625\u064a\u0642\u0627\u0641' : 'Stop'}
                  </button>
                )}
              </div>
              <button onClick={() => { setCameraOpen(false); setIsRecording(false); if (recordingTimerRef.current) clearInterval(recordingTimerRef.current); stopRecording(); }} className="w-full py-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
                {isAr ? '\u0625\u0644\u063a\u0627\u0621' : 'Cancel'}
              </button>
            </div>
          )}

          {/* Video preview */}
          {videoSrc && !loading && !report && (
            <div className="space-y-3">
              <div className="relative rounded-xl overflow-hidden bg-black">
                <video
                  ref={previewVideoRef}
                  src={videoSrc}
                  className="w-full rounded-xl"
                  onTimeUpdate={() => setCurrentTime(previewVideoRef.current?.currentTime || 0)}
                  onLoadedMetadata={() => setDuration(previewVideoRef.current?.duration || 0)}
                  onEnded={() => setIsPlaying(false)}
                />
              </div>
              <div className="flex items-center gap-2">
                <button onClick={togglePlay} className="p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
                <button onClick={resetVideo} className="p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                  <RotateCcw className="w-4 h-4" />
                </button>
                <span className="text-xs text-muted-foreground ml-auto">{formatTime(currentTime)} / {formatTime(duration)}</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={submitForAnalysis}
                  className="flex-1 py-2.5 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-sm font-bold hover:opacity-90 transition-opacity shadow-lg flex items-center justify-center gap-2"
                >
                  <Timer className="w-4 h-4" />
                  {isAr ? '\u062a\u062d\u0644\u064a\u0644 frame-by-frame' : 'Analyze Frame-by-Frame'}
                </button>
                <button
                  onClick={() => { if (videoSrc) URL.revokeObjectURL(videoSrc); setVideoSrc(null); setVideoFile(null); }}
                  className="px-4 py-2.5 rounded-lg bg-muted/50 hover:bg-muted text-sm transition-colors"
                >
                  {isAr ? '\u0625\u0644\u063a\u0627\u0621' : 'Cancel'}
                </button>
              </div>
            </div>
          )}

          {/* Loading state */}
          {loading && (
            <div className="space-y-4 py-8">
              {preview && (
                <div className="relative rounded-xl overflow-hidden max-h-40 flex items-center justify-center bg-muted/30">
                  <img src={preview} alt="Preview" className="max-h-40 object-contain rounded-lg" />
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                    <div className="bg-black/60 backdrop-blur-sm rounded-full p-3">
                      <Timer className="w-8 h-8 text-indigo-400 animate-pulse" />
                    </div>
                  </div>
                </div>
              )}
              <Progress value={progress} className="h-2" />
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{statusMsg}</span>
              </div>
            </div>
          )}

          {/* Results */}
          {report && !loading && (
            <div className="space-y-4">
              {/* Frame-by-frame viewer */}
              {extractedFrames.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Timer className="w-4 h-4 text-indigo-500" />
                    {isAr ? `\u0627\u0644\u0625\u0637\u0627\u0631\u0627\u062a (${extractedFrames.length})` : `Frames (${extractedFrames.length})`}
                  </h3>
                  <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
                    <img
                      src={extractedFrames[activeFrame]?.data}
                      alt={`Frame ${activeFrame + 1}`}
                      className="w-full h-full object-contain"
                    />
                    <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded-md font-mono">
                      {isAr ? '\u0625\u0637\u0627\u0631' : 'Frame'} {activeFrame + 1}/{extractedFrames.length} — {extractedFrames[activeFrame]?.timestamp.toFixed(3)}s
                    </div>
                    {/* Tracking overlay */}
                    {trackingPoints.length > 0 && trackingPoints[activeFrame] && (
                      <div className="absolute top-2 right-2 bg-indigo-500/80 text-white text-xs px-2 py-1 rounded-md font-mono">
                        x:{trackingPoints[activeFrame].x.toFixed(1)} y:{trackingPoints[activeFrame].y.toFixed(1)}
                        {trackingPoints[activeFrame].velocity !== undefined && ` v:${trackingPoints[activeFrame].velocity?.toFixed(1)}m/s`}
                      </div>
                    )}
                  </div>
                  {/* Frame scrubber */}
                  <input
                    type="range"
                    min={0}
                    max={extractedFrames.length - 1}
                    value={activeFrame}
                    onChange={(e) => setActiveFrame(Number(e.target.value))}
                    className="w-full accent-indigo-500"
                  />
                  {/* Frame thumbnails strip */}
                  <div className="flex gap-1 overflow-x-auto pb-1">
                    {extractedFrames.map((f, i) => (
                      <button
                        key={i}
                        onClick={() => setActiveFrame(i)}
                        className={`shrink-0 w-12 h-9 rounded overflow-hidden border-2 transition-all ${
                          i === activeFrame ? 'border-indigo-500 shadow-lg' : 'border-transparent opacity-60 hover:opacity-100'
                        }`}
                      >
                        <img src={f.data} alt={`Frame ${i + 1}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Tracking data summary */}
              {trackingPoints.length > 0 && (
                <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-xl p-3 space-y-2">
                  <h4 className="text-xs font-bold text-foreground">{isAr ? '\u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u062a\u062a\u0628\u0639' : 'Tracking Data'}</h4>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-card rounded-lg p-2 border border-border/50">
                      <p className="text-[10px] text-muted-foreground">{isAr ? '\u0639\u062f\u062f \u0627\u0644\u0646\u0642\u0627\u0637' : 'Points'}</p>
                      <p className="text-sm font-bold text-indigo-500">{trackingPoints.length}</p>
                    </div>
                    <div className="bg-card rounded-lg p-2 border border-border/50">
                      <p className="text-[10px] text-muted-foreground">{isAr ? '\u0623\u0642\u0635\u0649 \u0633\u0631\u0639\u0629' : 'Max Vel.'}</p>
                      <p className="text-sm font-bold text-indigo-500">
                        {Math.max(...trackingPoints.map(p => p.velocity || 0)).toFixed(1)} m/s
                      </p>
                    </div>
                    <div className="bg-card rounded-lg p-2 border border-border/50">
                      <p className="text-[10px] text-muted-foreground">{isAr ? '\u0645\u062f\u0629' : 'Duration'}</p>
                      <p className="text-sm font-bold text-indigo-500">
                        {(trackingPoints[trackingPoints.length - 1]?.timestamp - trackingPoints[0]?.timestamp).toFixed(2)}s
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Full report */}
              <div className="bg-muted/30 rounded-xl p-4 border border-border/50">
                <ReportRenderer text={report} />
              </div>

              <button
                onClick={() => { setReport(null); setPreview(null); setProgress(0); setTrackingPoints([]); setExtractedFrames([]); setActiveFrame(0); setVideoFile(null); if (videoSrc) { URL.revokeObjectURL(videoSrc); setVideoSrc(null); } }}
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
        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-500/10 to-purple-500/10 hover:from-indigo-500/20 hover:to-purple-500/20 border border-indigo-500/20 hover:border-indigo-500/40 text-foreground font-medium text-sm transition-all duration-300 disabled:opacity-50"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Timer className="w-4 h-4" />}
        <span>{isAr ? 'APAS \u062d\u0631\u0643\u0629 \u0628\u0637\u064a\u0626\u0629' : 'APAS Slow-Mo'}</span>
        <Sparkles className="w-3 h-3 text-indigo-400" />
      </button>
      {modal}
    </>
  );
}
