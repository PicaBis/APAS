import React, { useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Video, Loader2, X, Upload, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';
import { checkFileSize, getIssueMessage } from '@/utils/mediaQuality';
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

export default function ApasVideoButton({ lang, onUpdateParams, onMediaAnalyzed, onAutoRun, onDetectedMedia, autoOpen, onDismiss }: Props) {
  const [open, setOpen] = useState(autoOpen || false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMsg, setStatusMsg] = useState('');
  const [report, setReport] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const isAr = lang === 'ar';

  const close = useCallback(() => {
    setOpen(false);
    setReport(null);
    setPreview(null);
    setProgress(0);
    setStatusMsg('');
    if (onDismiss) onDismiss();
  }, [onDismiss]);


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
      if (thumbCtx) {
        const scale = Math.min(1, 200 / Math.max(videoEl.videoWidth, videoEl.videoHeight));
        thumbCanvas.width = Math.round(videoEl.videoWidth * scale);
        thumbCanvas.height = Math.round(videoEl.videoHeight * scale);
        thumbCtx.drawImage(videoEl, 0, 0, thumbCanvas.width, thumbCanvas.height);
        const thumbUrl = thumbCanvas.toDataURL('image/jpeg', 0.7);
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
            if (onAutoRun) setTimeout(() => onAutoRun(), 150);
          }
        } catch {
          console.warn('Could not parse JSON from report');
        }
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
  }, [lang, isAr, onUpdateParams, onMediaAnalyzed, onAutoRun, onDetectedMedia]);

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
    analyzeVideo(file);
    e.target.value = '';
  }, [isAr, analyzeVideo]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('video/')) analyzeVideo(file);
  }, [analyzeVideo]);

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
          {/* Drop zone */}
          {!loading && !report && (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-primary/30 rounded-xl p-8 text-center cursor-pointer hover:border-primary/60 hover:bg-primary/5 transition-all"
            >
              <Upload className="w-10 h-10 text-primary/50 mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground">{isAr ? 'اسحب فيديو هنا أو انقر للاختيار' : 'Drop a video here or click to select'}</p>
              <p className="text-xs text-muted-foreground mt-1">{isAr ? 'MP4, WebM, MOV (حتى 100 ميجا)' : 'MP4, WebM, MOV (up to 100MB)'}</p>
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
                onClick={() => { setReport(null); setPreview(null); setProgress(0); }}
                className="w-full py-2 rounded-lg bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors"
              >
                {isAr ? 'تحليل فيديو آخر' : 'Analyze another video'}
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
