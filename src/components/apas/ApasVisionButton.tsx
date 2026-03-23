import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import ReactMarkdown from 'react-markdown';
import { Camera, Loader2, X, CheckCircle, AlertTriangle, XCircle, History, Upload, Aperture, Sparkles, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';
import { checkFileSize, analyzeImageQuality, getIssueMessage, computeFileHash } from '@/utils/mediaQuality';
import LiveWeatherOverlay from '@/components/apas/LiveWeatherOverlay';
import GyroLevel from '@/components/apas/GyroLevel';
import AROverlay from '@/components/apas/AROverlay';
import { type WeatherData } from '@/services/weatherService';

const EDGE_VISION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/vision-analyze`;

const CONFIDENCE_THRESHOLD = 60;

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
}

export default function ApasVisionButton({ lang, onUpdateParams, onMediaAnalyzed }: Props) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [analysisStep, setAnalysisStep] = useState<'upload' | 'analyze' | 'results'>('upload');
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [analysisText, setAnalysisText] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [currentFileHash, setCurrentFileHash] = useState<string | null>(null);

  // Smart features state
  const [showSmartFeatures, setShowSmartFeatures] = useState(false);
  const [arMode, setArMode] = useState(false);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [isGyroLevel, setIsGyroLevel] = useState(true);
  const [permissionsGranted, setPermissionsGranted] = useState(false);

  const isAr = lang === 'ar';

  // Request all smart feature permissions
  const requestSmartPermissions = useCallback(async () => {
    try {
      // Request camera permission (already handled in openCamera)
      // Request geolocation permission
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          () => { /* permission granted */ },
          () => { toast.warning(isAr ? 'تم رفض إذن الموقع' : 'Location permission denied'); },
          { enableHighAccuracy: true, timeout: 5000 }
        );
      }
      // Request device orientation permission (iOS)
      if (typeof (DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> }).requestPermission === 'function') {
        try {
          await (DeviceOrientationEvent as unknown as { requestPermission: () => Promise<string> }).requestPermission();
        } catch { /* silently fail */ }
      }
      // Request device motion permission (iOS)
      if (typeof (DeviceMotionEvent as unknown as { requestPermission?: () => Promise<string> }).requestPermission === 'function') {
        try {
          await (DeviceMotionEvent as unknown as { requestPermission: () => Promise<string> }).requestPermission();
        } catch { /* silently fail */ }
      }
      setPermissionsGranted(true);
      setShowSmartFeatures(true);
      toast.success(isAr ? 'تم تفعيل الأدوات الذكية' : 'Smart tools activated');
    } catch {
      toast.error(isAr ? 'تعذر تفعيل بعض الأدوات' : 'Some tools could not be activated');
    }
  }, [isAr]);

  // Stop camera stream
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => { stopCamera(); };
  }, [stopCamera]);

  useEffect(() => {
    if (!isAnalyzing) return;
    setProgress(0);
    const interval = setInterval(() => {
      setProgress(prev => prev >= 90 ? 90 : prev + Math.random() * 12);
    }, 300);
    return () => clearInterval(interval);
  }, [isAnalyzing]);

  // Open camera using getUserMedia
  const openCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      setShowCamera(true);
      // Attach stream to video element after render
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => { /* ignore autoplay errors */ });
        }
      });
    } catch {
      toast.error(isAr ? 'تعذر الوصول للكاميرا' : 'Camera access denied');
    }
  };

  // Capture photo from live camera feed
  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    const base64 = dataUrl.split(',')[1];

    // Stop camera and close camera modal
    stopCamera();
    setShowCamera(false);

    // Set preview and auto-analyze the captured photo
    setPreviewUrl(dataUrl);
    analyzeBase64(base64, 'image/jpeg', isAr ? 'التقاط مباشر' : 'Live Capture');
  };

  // Shared analysis function for both file upload and camera capture
  const analyzeBase64 = async (base64: string, mimeType: string, sourceName: string, fileHash?: string, thumbnailDataUrl?: string) => {
    setIsAnalyzing(true);
    setShowModal(true);
    setAnalysisData(null);
    setAnalysisText('');
    setAnalysisStep('upload');

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

        setHistory(prev => [{
          id: Date.now(),
          timestamp: new Date(),
          data: result,
          text: cleanText,
          thumbnailName: sourceName,
          fileHash: fileHash,
          thumbnailData: thumbnailDataUrl,
        }, ...prev].slice(0, 20));

        if (result.detected && confidence >= CONFIDENCE_THRESHOLD) {
          onUpdateParams({
            velocity: result.velocity,
            angle: result.angle,
            mass: result.mass,
            height: result.height,
            objectType: result.objectType,
          });
          toast.success(isAr ? '🤖 تم تحديث المحاكاة بواسطة APAS AI' : '🤖 Simulation updated by APAS AI');
        } else if (result.detected && confidence < CONFIDENCE_THRESHOLD) {
          toast.warning(isAr ? `نسبة الثقة منخفضة (${confidence}%) — لم يتم تحميل القيم` : `Low confidence (${confidence}%) — values not loaded`);
        } else {
          toast.info(isAr ? 'لم يتم اكتشاف مقذوف' : 'No projectile detected');
        }
      } else {
        setAnalysisText(cleanText || (isAr ? 'لم يتم اكتشاف مقذوف' : 'No projectile detected'));
        setHistory(prev => [{
          id: Date.now(),
          timestamp: new Date(),
          data: null,
          text: cleanText,
          thumbnailName: sourceName,
          fileHash: fileHash,
          thumbnailData: thumbnailDataUrl,
        }, ...prev].slice(0, 20));
      }
    };

    setAnalysisStep('analyze');
    try {
      const edgeResp = await fetch(EDGE_VISION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ imageBase64: base64, mimeType, lang }),
      });

      if (edgeResp.ok) {
        const data = await edgeResp.json();
        if (data.text) {
          setProgress(100);
          setAnalysisStep('results');
          await new Promise(r => setTimeout(r, 400));
          handleParsedResult(data.text);
        } else {
          setAnalysisText(isAr ? '❌ تعذر التحليل حالياً. حاول مرة أخرى.' : '❌ Analysis unavailable. Please try again.');
          toast.error(isAr ? 'تعذر التحليل' : 'Analysis failed');
        }
      } else {
        setAnalysisText(isAr ? '❌ تعذر التحليل حالياً. حاول مرة أخرى.' : '❌ Analysis unavailable. Please try again.');
        toast.error(isAr ? 'تعذر التحليل' : 'Analysis failed');
      }
    } catch {
      toast.error(isAr ? 'خطأ في الاتصال. تحقق من اتصالك بالإنترنت وحاول مرة أخرى.' : 'Connection error. Check your internet connection and try again.');
      setAnalysisText(isAr ? '❌ خطأ في الاتصال — تحقق من اتصالك بالإنترنت وحاول مرة أخرى' : '❌ Connection error — check your internet and try again');
    }
    setIsAnalyzing(false);
    setAnalysisStep('results');
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (fileRef.current) fileRef.current.value = '';

    // Compute file hash for duplicate detection
    const fileHash = await computeFileHash(file);
    setCurrentFileHash(fileHash);

    // Check for duplicate — same file already in history
    const existingEntry = history.find(h => h.fileHash === fileHash);
    if (existingEntry) {
      toast.info(isAr ? 'هذه الصورة تم تحليلها سابقاً — يتم تحميل النتائج من السجل' : 'This image was already analyzed — loading results from history');
      loadFromHistory(existingEntry);
      return;
    }

    // Smart quality check on file size
    const fileSizeIssue = checkFileSize(file);
    if (fileSizeIssue) {
      toast.warning(getIssueMessage(fileSizeIssue, lang));
    }

    // Analyze image quality before sending to AI
    const img = new Image();
    const imgUrl = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const scale = Math.min(1, 512 / img.width);
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const report = analyzeImageQuality(imageData);
        for (const issue of report.issues) {
          if (issue.severity === 'error') {
            toast.error(getIssueMessage(issue, lang));
          } else {
            toast.warning(getIssueMessage(issue, lang));
          }
        }
      }
      // Don't revoke here — used for preview, cleaned up on modal close
    };
    img.src = imgUrl;

    // Revoke old preview URL to prevent memory leak
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    // Set preview image
    setPreviewUrl(imgUrl);

    // Generate a thumbnail data URL for history storage
    const thumbnailDataUrl = await new Promise<string>((resolve) => {
      const thumbImg = new Image();
      thumbImg.onload = () => {
        const c = document.createElement('canvas');
        const s = Math.min(1, 256 / thumbImg.width);
        c.width = Math.round(thumbImg.width * s);
        c.height = Math.round(thumbImg.height * s);
        const cx = c.getContext('2d');
        if (cx) {
          cx.drawImage(thumbImg, 0, 0, c.width, c.height);
          resolve(c.toDataURL('image/jpeg', 0.6));
        } else {
          resolve('');
        }
      };
      thumbImg.onerror = () => resolve('');
      thumbImg.src = imgUrl;
    });

    const base64 = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.readAsDataURL(file);
    });

    // Notify parent that media was analyzed (for calibration tool awareness)
    if (thumbnailDataUrl && onMediaAnalyzed) onMediaAnalyzed(thumbnailDataUrl);

    analyzeBase64(base64, file.type, file.name, fileHash, thumbnailDataUrl);
  };

  const loadFromHistory = (entry: HistoryEntry) => {
    setAnalysisData(entry.data);
    setAnalysisText(entry.text);
    // Restore the preview image from stored thumbnail data
    if (entry.thumbnailData) {
      setPreviewUrl(entry.thumbnailData);
    }
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
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />

      <div className="flex items-center gap-1">
        <button
          onClick={() => fileRef.current?.click()}
          disabled={isAnalyzing}
          className="group flex items-center gap-2 px-3 py-2 rounded-lg border border-border hover:border-foreground/30 bg-secondary/50 hover:bg-secondary transition-all duration-200 hover:shadow-md disabled:opacity-60"
          title={isAr ? 'رفع صورة' : 'Upload Image'}
        >
          <div className="relative">
            <Upload className="w-4 h-4 text-foreground transition-transform duration-200 group-hover:scale-110" />
            {isAnalyzing && (
              <div className="absolute -inset-1 rounded-full border-2 border-foreground/30 border-t-foreground animate-spin" />
            )}
          </div>
          <span className="text-[10px] sm:text-xs font-semibold text-foreground hidden xs:inline">{isAr ? 'رفع صورة' : 'Upload Image'}</span>
        </button>
        <button
          onClick={openCamera}
          disabled={isAnalyzing}
          className="group flex items-center gap-2 px-3 py-2 rounded-lg border border-border hover:border-foreground/30 bg-secondary/50 hover:bg-secondary transition-all duration-200 hover:shadow-md disabled:opacity-60"
          title={isAr ? 'التقاط صورة بالكاميرا' : 'Capture with Camera'}
        >
          <Aperture className="w-4 h-4 text-foreground transition-transform duration-200 group-hover:scale-110" />
          <span className="text-[10px] sm:text-xs font-semibold text-foreground hidden xs:inline">{isAr ? 'التقاط' : 'Capture'}</span>
        </button>

        {history.length > 0 && (
          <button
            onClick={() => setShowHistory(true)}
            className="p-2 rounded-lg border border-border hover:border-foreground/30 bg-secondary/50 hover:bg-secondary transition-all duration-200 relative"
            title={isAr ? 'سجل التحليلات' : 'Analysis History'}
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
                <History className="w-4 h-4 text-foreground" />
                <h3 className="text-sm font-semibold text-foreground">{isAr ? 'سجل التحليلات' : 'Analysis History'}</h3>
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
                      e.stopPropagation(); e.preventDefault();
                      setHistory(prev => {
                        const updated = prev.filter(h => h.id !== entry.id);
                        // When all records are deleted, notify calibration tool
                        if (updated.length === 0 && onMediaAnalyzed) onMediaAnalyzed('');
                        return updated;
                      });
                    }}
                    className="absolute top-2 end-2 z-10 p-2 -m-1 rounded-md hover:bg-red-500/20 text-muted-foreground hover:text-red-500 transition-all duration-200 opacity-0 group-hover:opacity-100"
                    title={isAr ? 'حذف' : 'Delete'}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => loadFromHistory(entry)}
                    className="w-full text-start pe-6"
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

      {/* Camera Capture Modal */}
      {showCamera && createPortal(
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />

          {/* AR Overlay on camera */}
          {arMode && videoRef.current && (
            <AROverlay
              lang={lang}
              videoRef={videoRef as React.RefObject<HTMLVideoElement>}
              active={arMode}
              onToggle={setArMode}
              velocity={analysisData?.velocity ?? 20}
              angle={analysisData?.angle ?? 45}
            />
          )}

          {/* Top bar: Gyro level + Weather compact */}
          <div className="absolute top-4 left-4 right-4 z-30 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {showSmartFeatures && (
                <GyroLevel lang={lang} compact onLevelStatusChange={setIsGyroLevel} />
              )}
              {showSmartFeatures && weatherData && (
                <LiveWeatherOverlay lang={lang} compact />
              )}
            </div>
            <div className="flex items-center gap-1">
              {!arMode && (
                <button
                  onClick={() => setArMode(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-cyan-500/20 backdrop-blur-sm border border-cyan-500/30 hover:bg-cyan-500/30 transition-all"
                  title={isAr ? 'الواقع المعزز' : 'AR Mode'}
                >
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-[10px] text-white font-medium">{isAr ? 'AR' : 'AR'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Camera instruction - enhanced zero-instruction UX */}
          {!arMode && (
            <div className="absolute top-16 left-0 right-0 text-center z-20 space-y-2">
              <span className="text-white text-sm font-medium bg-black/40 px-4 py-2 rounded-full backdrop-blur-sm">
                {isAr ? 'وجّه الكاميرا نحو المقذوف ثم اضغط الزر' : 'Point camera at projectile, then tap capture'}
              </span>
              <div className="flex justify-center gap-2 px-4">
                <span className="text-white/70 text-[10px] bg-black/30 px-2.5 py-1 rounded-full backdrop-blur-sm">
                  {isAr ? '💡 استخدم إضاءة جيدة' : '💡 Good lighting helps'}
                </span>
                <span className="text-white/70 text-[10px] bg-black/30 px-2.5 py-1 rounded-full backdrop-blur-sm">
                  {isAr ? '📐 ثبّت الكاميرا' : '📐 Keep camera steady'}
                </span>
              </div>
            </div>
          )}

          {/* Gyro warning overlay */}
          {showSmartFeatures && !isGyroLevel && !arMode && (
            <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
              <div className="bg-red-500/20 backdrop-blur-sm border-2 border-red-500/40 rounded-2xl p-6 text-center max-w-xs pointer-events-auto animate-pulse">
                <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-3" />
                <p className="text-white text-sm font-semibold mb-1">
                  {isAr ? 'عدل زاوية الهاتف' : 'Adjust Phone Angle'}
                </p>
                <p className="text-white/70 text-xs">
                  {isAr ? 'للحصول على نتائج دقيقة، يجب أن يكون الهاتف مستوياً' : 'For accurate results, keep the phone level'}
                </p>
              </div>
            </div>
          )}

          {/* Bottom controls */}
          <div className="absolute bottom-8 left-0 right-0 flex items-center justify-center gap-6 z-30">
            <button
              onClick={() => { stopCamera(); setShowCamera(false); setArMode(false); }}
              className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-all"
              title={isAr ? 'إلغاء' : 'Cancel'}
            >
              <X className="w-6 h-6 text-white" />
            </button>
            <button
              onClick={capturePhoto}
              className="w-16 h-16 rounded-full bg-white border-4 border-white/50 flex items-center justify-center hover:scale-105 transition-transform shadow-lg"
              title={isAr ? 'التقاط صورة' : 'Take Photo'}
            >
              <div className="w-12 h-12 rounded-full bg-white hover:bg-gray-100 transition-colors" />
            </button>
            {!showSmartFeatures && (
              <button
                onClick={requestSmartPermissions}
                className="w-12 h-12 rounded-full bg-primary/30 backdrop-blur-sm flex items-center justify-center hover:bg-primary/40 transition-all border border-primary/40"
                title={isAr ? 'تفعيل الأدوات الذكية' : 'Enable Smart Tools'}
              >
                <Shield className="w-5 h-5 text-white" />
              </button>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* Analysis Modal */}
      {showModal && createPortal(
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => { if (!isAnalyzing) { setShowModal(false); if (previewUrl) URL.revokeObjectURL(previewUrl); setPreviewUrl(null); } }}>
          <div
            className="bg-background border border-border rounded-xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden animate-slideDown"
            dir={isAr ? 'rtl' : 'ltr'}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-border bg-secondary/30">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-foreground" />
                <h3 className="text-sm font-semibold text-foreground">APAS Vision</h3>
              </div>
              {!isAnalyzing && (
                <button onClick={() => { setShowModal(false); if (previewUrl) URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-all duration-200">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {/* Image preview - full display */}
              {previewUrl && !isAnalyzing && (
                <div className="w-full">
                  <img src={previewUrl} alt="" className="w-full object-contain rounded-lg border border-border/30" />
                </div>
              )}
              {/* Image preview - small during analysis */}
              {previewUrl && isAnalyzing && (
                <div className="w-full max-w-xs mx-auto">
                  <img src={previewUrl} alt="" className="w-full h-28 object-cover rounded-lg border border-border/30 opacity-80" />
                </div>
              )}

              {isAnalyzing && (
                <div className="space-y-3 w-full max-w-xs">
                  {/* Step indicator */}
                  <div className="flex items-center gap-1 w-full">
                    {(['upload', 'analyze', 'results'] as const).map((s, i) => {
                      const stepLabels = {
                        upload: isAr ? 'تحميل' : 'Upload',
                        analyze: isAr ? 'تحليل AI' : 'AI Analysis',
                        results: isAr ? 'النتائج' : 'Results',
                      };
                      const stepIndex = ['upload', 'analyze', 'results'].indexOf(analysisStep);
                      const isActive = i === stepIndex;
                      const isDone = i < stepIndex;
                      return (
                        <div key={s} className="flex-1 flex flex-col items-center gap-1">
                          <div className={`w-full h-1.5 rounded-full transition-all duration-500 ${
                            isDone ? 'bg-primary' : isActive ? 'bg-primary/60 animate-pulse' : 'bg-border/40'
                          }`} />
                          <span className={`text-[9px] font-medium transition-colors duration-300 ${
                            isDone ? 'text-primary' : isActive ? 'text-foreground' : 'text-muted-foreground/50'
                          }`}>{stepLabels[s]}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    <span className="text-sm text-foreground font-medium">
                      {analysisStep === 'upload'
                        ? (isAr ? 'جاري تحميل الصورة...' : 'Uploading image...')
                        : analysisStep === 'analyze'
                          ? (isAr ? 'الذكاء الاصطناعي يحلل الصورة...' : 'AI is analyzing the image...')
                          : (isAr ? 'جاري معالجة النتائج...' : 'Processing results...')}
                    </span>
                    <span className="text-xs font-mono text-muted-foreground">{Math.round(progress)}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              )}

              {!isAnalyzing && analysisData && (
                <>
                  <div className={`flex items-center gap-2 p-3 rounded-lg border animate-smooth-fade-up ${
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
                    <ReactMarkdown>{analysisText}</ReactMarkdown>
                  </div>
                </div>
              )}

              {/* Weather data section in analysis results */}
              {!isAnalyzing && analysisData && (
                <div className="w-full">
                  <LiveWeatherOverlay lang={lang} onWeatherData={setWeatherData} />
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
                  onClick={() => { setShowModal(false); if (previewUrl) URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }}
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
