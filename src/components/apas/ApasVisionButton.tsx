import React, { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Camera, Loader2, X, Upload, Sparkles, Aperture, SwitchCamera, FlipHorizontal } from 'lucide-react';
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
const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'dicpl6wjs';
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'apas_unsigned';

export default function ApasVisionButton({ lang, onUpdateParams, onMediaAnalyzed, onAutoRun, onDetectedMedia, onAnalysisComplete, autoOpen, onDismiss }: Props) {
  const { user } = useAuth();
  const [open, setOpen] = useState(autoOpen || false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMsg, setStatusMsg] = useState('');
  const [report, setReport] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const isAr = lang === 'ar';

  // Camera state
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [mirrorPreview, setMirrorPreview] = useState(false);
  const cameraVideoRef = useRef<HTMLVideoElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const cameraCanvasRef = useRef<HTMLCanvasElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    setReport(null);
    setPreview(null);
    setProgress(0);
    setStatusMsg('');
    setCameraOpen(false);
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach(t => t.stop());
      cameraStreamRef.current = null;
    }
    setCameraReady(false);
    if (onDismiss) onDismiss();
  }, [onDismiss]);

  // Start/stop camera
  const startCamera = useCallback(async () => {
    try {
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach(t => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 960 } },
      });
      cameraStreamRef.current = stream;
      if (cameraVideoRef.current) {
        cameraVideoRef.current.srcObject = stream;
        cameraVideoRef.current.play();
        setCameraReady(true);
      }
    } catch {
      toast.error(isAr ? 'تعذر الوصول إلى الكاميرا' : 'Camera access denied');
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

  // Switch camera facing
  const switchCamera = useCallback(() => {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  }, []);

  // Restart camera when facing mode changes
  useEffect(() => {
    if (cameraOpen && cameraReady) {
      startCamera();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode]);

  // Capture photo from camera
  const capturePhoto = useCallback(() => {
    const video = cameraVideoRef.current;
    const canvas = cameraCanvasRef.current;
    if (!video || !canvas || !video.videoWidth) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (mirrorPreview) {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `camera-capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
      setCameraOpen(false);
      stopCamera();
      analyzeImage(file);
    }, 'image/jpeg', 0.92);
  }, [mirrorPreview, stopCamera]);


  const analyzeImage = useCallback(async (file: File) => {
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

      // Step 1: Convert to base64
      setStatusMsg(isAr ? 'جاري تحويل الصورة...' : 'Encoding image...');
      setProgress(15);

      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Generate thumbnail
      if (onMediaAnalyzed) {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const scale = Math.min(1, 200 / Math.max(img.width, img.height));
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            onMediaAnalyzed(canvas.toDataURL('image/jpeg', 0.7));
          }
        };
        img.src = base64;
      }

      setPreview(base64);

      // Step 2: Extract base64 data and mime type from data URL
      let imageBase64 = base64;
      let mimeType = 'image/jpeg';
      const dataUrlMatch = base64.match(/^data:([^;]+);base64,(.+)$/);
      if (dataUrlMatch) {
        mimeType = dataUrlMatch[1];
        imageBase64 = dataUrlMatch[2];
      }

      // Step 3: Upload to Cloudinary for permanent URL (non-blocking)
      setStatusMsg(isAr ? 'جاري رفع الصورة إلى السحابة...' : 'Uploading to cloud...');
      setProgress(30);

      let cloudinaryUrl: string | null = null;
      try {
        const cloudFormData = new FormData();
        // Add a timestamp to the file name to bypass potential Cloudinary/Supabase caching
        const timestamp = Date.now();
        const cacheBusterFile = new File([file], `vision-${timestamp}-${file.name}`, { type: file.type });
        cloudFormData.append('file', base64);
        cloudFormData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
        cloudFormData.append('folder', 'apas-vision');
        cloudFormData.append('public_id', `vision_${timestamp}_${Math.random().toString(36).substring(7)}`);

        const cloudRes = await fetch(
          `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
          { method: 'POST', body: cloudFormData }
        );
        if (cloudRes.ok) {
          const cloudData = await cloudRes.json();
          cloudinaryUrl = cloudData.secure_url || cloudData.url || null;
          console.log('[APAS Vision] Cloudinary URL:', cloudinaryUrl);
        } else {
          console.warn('[APAS Vision] Cloudinary upload failed:', cloudRes.status);
        }
      } catch (cloudErr) {
        console.warn('[APAS Vision] Cloudinary upload error:', cloudErr);
      }

      // Step 4: Call vision-analyze edge function with base64 + cloudinary URL
      setStatusMsg(isAr ? 'APAS يحلل الصورة بالذكاء الاصطناعي...' : 'APAS analyzing image with AI...');
      setProgress(55);

      const response = await fetch(`${SUPABASE_URL}/functions/v1/vision-analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          imageBase64,
          mimeType,
          lang,
          userId: user?.id || null,
          cloudinaryUrl,
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
          if (parsed.velocity) params.velocity = Number(parseFloat(String(parsed.velocity)).toFixed(2));
          if (parsed.angle) params.angle = Number(parseFloat(String(parsed.angle)).toFixed(2));
          if (parsed.height) params.height = Number(parseFloat(String(parsed.height)).toFixed(2));
          if (parsed.mass) params.mass = Number(parseFloat(String(parsed.mass)).toFixed(2));
          if (parsed.objectType) params.objectType = String(parsed.objectType);

            if (Object.keys(params).length > 0) {
            onUpdateParams(params);
            if (onDetectedMedia) {
              onDetectedMedia({
                source: 'image',
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
          type: 'vision',
          report: reportText,
          mediaSrc: base64,
          mediaType: 'image',
          params: extractedParams,
        });
      }

      setProgress(100);
      setStatusMsg(isAr ? 'اكتمل التحليل' : 'Analysis complete');
      toast.success(isAr ? 'تم تحليل الصورة بنجاح' : 'Image analyzed successfully');
    } catch (err) {
      console.error('Vision analysis error:', err);
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
    if (!file.type.startsWith('image/')) {
      toast.error(isAr ? 'الرجاء اختيار صورة' : 'Please select an image');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error(isAr ? 'الصورة كبيرة جداً (الحد 20 ميجا)' : 'Image too large (max 20MB)');
      return;
    }
    analyzeImage(file);
    e.target.value = '';
  }, [isAr, analyzeImage]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) analyzeImage(file);
  }, [analyzeImage]);

  const modal = open ? createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/50">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-primary" />
            <h2 className="font-bold text-foreground">{isAr ? 'APAS تحليل الصورة' : 'APAS Image Analysis'}</h2>
          </div>
          <button onClick={close} className="p-1.5 rounded-lg hover:bg-muted transition-colors"><X className="w-4 h-4" /></button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Upload zone + Camera - shown when not loading and no report */}
          {!loading && !report && !cameraOpen && (
            <>
              {/* Drop zone */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-primary/30 rounded-xl p-8 text-center cursor-pointer hover:border-primary/60 hover:bg-primary/5 transition-all"
              >
                <Upload className="w-10 h-10 text-primary/50 mx-auto mb-3" />
                <p className="text-sm font-medium text-foreground">{isAr ? 'اسحب صورة هنا أو انقر للاختيار' : 'Drop an image here or click to select'}</p>
                <p className="text-xs text-muted-foreground mt-1">{isAr ? 'PNG, JPG, WebP (حتى 20 ميجا)' : 'PNG, JPG, WebP (up to 20MB)'}</p>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-border/50" />
                <span className="text-xs text-muted-foreground font-medium">{isAr ? 'أو' : 'OR'}</span>
                <div className="flex-1 h-px bg-border/50" />
              </div>

              {/* Camera capture button */}
              <button
                onClick={() => setCameraOpen(true)}
                className="w-full flex items-center justify-center gap-3 py-4 px-4 rounded-xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 hover:from-emerald-500/20 hover:to-teal-500/20 border border-emerald-500/20 hover:border-emerald-500/40 text-foreground font-medium text-sm transition-all duration-300 group"
              >
                <div className="w-10 h-10 rounded-full bg-emerald-500/15 flex items-center justify-center group-hover:bg-emerald-500/25 transition-colors">
                  <Aperture className="w-5 h-5 text-emerald-500" />
                </div>
                <div className="text-start">
                  <p className="font-semibold">{isAr ? 'تصوير مباشر بالكاميرا' : 'Direct Camera Capture'}</p>
                  <p className="text-xs text-muted-foreground">{isAr ? 'التقط صورة مباشرة للتحليل' : 'Take a photo directly for analysis'}</p>
                </div>
              </button>
            </>
          )}

          {/* Camera view */}
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
                <canvas ref={cameraCanvasRef} className="hidden" />
                {!cameraReady && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <div className="text-center text-white">
                      <Camera className="w-8 h-8 mx-auto mb-2 animate-pulse" />
                      <p className="text-sm">{isAr ? 'جاري تشغيل الكاميرا...' : 'Starting camera...'}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Camera controls */}
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={switchCamera}
                  className="p-2.5 rounded-xl border border-border hover:bg-muted transition-colors"
                  title={isAr ? 'تبديل الكاميرا' : 'Switch camera'}
                >
                  <SwitchCamera className="w-4 h-4 text-foreground" />
                </button>

                <button
                  onClick={capturePhoto}
                  disabled={!cameraReady}
                  className="w-16 h-16 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Aperture className="w-7 h-7" />
                </button>

                <button
                  onClick={() => setMirrorPreview(!mirrorPreview)}
                  className={`p-2.5 rounded-xl border transition-colors ${mirrorPreview ? 'bg-primary/10 border-primary/30 text-primary' : 'border-border hover:bg-muted text-foreground'}`}
                  title={isAr ? 'عكس المعاينة' : 'Mirror preview'}
                >
                  <FlipHorizontal className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={() => { setCameraOpen(false); stopCamera(); }}
                className="w-full py-2 rounded-lg bg-muted/50 text-muted-foreground text-sm font-medium hover:bg-muted transition-colors"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
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
                {isAr ? 'تحليل صورة أخرى' : 'Analyze another image'}
              </button>
            </div>
          )}
        </div>
      </div>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
    </div>,
    document.body,
  ) : null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-violet-500/10 to-purple-500/10 hover:from-violet-500/20 hover:to-purple-500/20 border border-violet-500/20 hover:border-violet-500/40 text-foreground font-medium text-sm transition-all duration-300 disabled:opacity-50"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
        <span>{isAr ? 'APAS تحليل صورة' : 'APAS Vision'}</span>
        <Sparkles className="w-3 h-3 text-violet-400" />
      </button>
      {modal}
    </>
  );
}
