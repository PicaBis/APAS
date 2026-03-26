import React, { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ScanLine, Loader2, X, Upload, Sparkles, Aperture, SwitchCamera, FlipHorizontal, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
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
  onAnalysisComplete?: (entry: { type: 'vision' | 'video' | 'subject' | 'voice'; report: string; mediaSrc?: string; mediaType?: 'video' | 'image'; params?: { velocity?: number; angle?: number; height?: number; mass?: number } }) => void;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

interface CorrectionItem {
  original: string;
  corrected: string;
  status: 'correct' | 'error' | 'warning';
  explanation: string;
}

export default function ApasWhiteboardScanner({ lang, onUpdateParams, onAnalysisComplete }: Props) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMsg, setStatusMsg] = useState('');
  const [report, setReport] = useState<string | null>(null);
  const [corrections, setCorrections] = useState<CorrectionItem[]>([]);
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
    setCorrections([]);
    setPreview(null);
    setProgress(0);
    setStatusMsg('');
    setCameraOpen(false);
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach(t => t.stop());
      cameraStreamRef.current = null;
    }
    setCameraReady(false);
  }, []);

  // Start/stop camera
  const startCamera = useCallback(async () => {
    try {
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach(t => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } },
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
      const file = new File([blob], `whiteboard-capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
      setCameraOpen(false);
      stopCamera();
      analyzeWhiteboard(file);
    }, 'image/jpeg', 0.95);
  }, [mirrorPreview, stopCamera]);

  const parseCorrections = useCallback((text: string): CorrectionItem[] => {
    const items: CorrectionItem[] = [];
    // Try to extract JSON corrections array from the response
    const jsonMatch = text.match(/```json\s*([\s\S]*?)```/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1].trim());
        const correctionsList = parsed.corrections || parsed.steps || [];
        for (const c of correctionsList) {
          items.push({
            original: c.original || c.step || '',
            corrected: c.corrected || c.correction || c.correct || '',
            status: c.status === 'correct' ? 'correct' : c.status === 'warning' ? 'warning' : 'error',
            explanation: c.explanation || c.reason || '',
          });
        }
      } catch { /* ignore parse error */ }
    }
    return items;
  }, []);

  const analyzeWhiteboard = useCallback(async (file: File) => {
    setLoading(true);
    setProgress(5);
    setReport(null);
    setCorrections([]);

    try {
      const sizeIssue = checkFileSize(file);
      if (sizeIssue) toast.warning(getIssueMessage(sizeIssue, lang));

      if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        toast.error(isAr ? '\u062e\u062f\u0645\u0629 Supabase \u063a\u064a\u0631 \u0645\u0647\u064a\u0623\u0629. \u062a\u062d\u0642\u0642 \u0645\u0646 \u0625\u0639\u062f\u0627\u062f\u0627\u062a \u0627\u0644\u0628\u064a\u0626\u0629.' : 'Supabase is not configured. Check environment settings.');
        setLoading(false);
        return;
      }

      // Step 1: Convert to base64
      setStatusMsg(isAr ? '\u062c\u0627\u0631\u064a \u062a\u062d\u0648\u064a\u0644 \u0627\u0644\u0635\u0648\u0631\u0629...' : 'Encoding image...');
      setProgress(15);

      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      setPreview(base64);

      let imageBase64 = base64;
      let mimeType = 'image/jpeg';
      const dataUrlMatch = base64.match(/^data:([^;]+);base64,(.+)$/);
      if (dataUrlMatch) {
        mimeType = dataUrlMatch[1];
        imageBase64 = dataUrlMatch[2];
      }

      // Step 2: Call vision-analyze with whiteboard prompt
      setStatusMsg(isAr ? 'APAS \u064a\u0642\u0631\u0623 \u0627\u0644\u0633\u0628\u0648\u0631\u0629...' : 'APAS reading whiteboard...');
      setProgress(40);

      const whiteboardPrompt = isAr
        ? 'أنت أستاذ فيزياء خبير. حلل هذه الصورة من سبورة أو ورقة عمل. اقرأ كل الحلول والمعادلات المكتوبة. صحح أي أخطاء في الحلول وقدم الحل الصحيح. رد بتنسيق JSON يحتوي على مصفوفة corrections حيث كل عنصر يحتوي original (النص الأصلي)، corrected (النص المصحح)، status (correct أو error أو warning)، و explanation (شرح التصحيح). أيضاً قدم ملخصاً عاماً.'
        : 'You are an expert physics professor. Analyze this image of a whiteboard or worksheet. Read all written solutions and equations. Correct any errors in the solutions and provide the correct solution. Respond with JSON containing a corrections array where each item has original (original text), corrected (corrected text), status (correct, error, or warning), and explanation (correction explanation). Also provide a general summary.';

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
          customPrompt: whiteboardPrompt,
        }),
      });

      setProgress(75);
      setStatusMsg(isAr ? 'APAS \u064a\u0635\u062d\u062d \u0627\u0644\u062d\u0644\u0648\u0644...' : 'APAS correcting solutions...');

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error((errData as { error?: string }).error || `Server error ${response.status}`);
      }

      const result = await response.json();
      setProgress(90);

      if (result.error) throw new Error(result.error);

      const reportText = result.text || '';
      setReport(reportText);

      // Parse corrections
      const parsed = parseCorrections(reportText);
      setCorrections(parsed);

      // Extract physics params if present
      const jsonMatch = reportText.match(/```json\s*([\s\S]*?)```/);
      if (jsonMatch) {
        try {
          const parsedJson = JSON.parse(jsonMatch[1].trim());
          const params: { velocity?: number; angle?: number; height?: number; mass?: number } = {};
          if (parsedJson.velocity) params.velocity = Number(parsedJson.velocity);
          if (parsedJson.angle) params.angle = Number(parsedJson.angle);
          if (parsedJson.height) params.height = Number(parsedJson.height);
          if (parsedJson.mass) params.mass = Number(parsedJson.mass);
          if (Object.keys(params).length > 0) onUpdateParams(params);
        } catch { /* ignore */ }
      }

      if (onAnalysisComplete) {
        onAnalysisComplete({
          type: 'vision',
          report: reportText,
          mediaSrc: base64,
          mediaType: 'image',
        });
      }

      setProgress(100);
      setStatusMsg(isAr ? '\u0627\u0643\u062a\u0645\u0644 \u0627\u0644\u062a\u062d\u0644\u064a\u0644' : 'Analysis complete');
      toast.success(isAr ? '\u062a\u0645 \u0642\u0631\u0627\u0621\u0629 \u0648\u062a\u0635\u062d\u064a\u062d \u0627\u0644\u0633\u0628\u0648\u0631\u0629 \u0628\u0646\u062c\u0627\u062d' : 'Whiteboard scanned and corrected successfully');
    } catch (err) {
      console.error('Whiteboard analysis error:', err);
      const msg = err instanceof Error ? err.message : 'Unknown error';
      toast.error(isAr ? `\u062e\u0637\u0623 \u0641\u064a \u0627\u0644\u062a\u062d\u0644\u064a\u0644: ${msg}` : `Analysis error: ${msg}`);
      setStatusMsg(isAr ? '\u0641\u0634\u0644 \u0627\u0644\u062a\u062d\u0644\u064a\u0644' : 'Analysis failed');
    } finally {
      setLoading(false);
    }
  }, [lang, isAr, onUpdateParams, onAnalysisComplete, parseCorrections, user?.id]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error(isAr ? '\u0627\u0644\u0631\u062c\u0627\u0621 \u0627\u062e\u062a\u064a\u0627\u0631 \u0635\u0648\u0631\u0629' : 'Please select an image');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error(isAr ? '\u0627\u0644\u0635\u0648\u0631\u0629 \u0643\u0628\u064a\u0631\u0629 \u062c\u062f\u0627\u064b (\u0627\u0644\u062d\u062f 20 \u0645\u064a\u062c\u0627)' : 'Image too large (max 20MB)');
      return;
    }
    analyzeWhiteboard(file);
    e.target.value = '';
  }, [isAr, analyzeWhiteboard]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) analyzeWhiteboard(file);
  }, [analyzeWhiteboard]);

  const statusIcon = (status: CorrectionItem['status']) => {
    if (status === 'correct') return <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />;
    if (status === 'warning') return <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />;
    return <XCircle className="w-4 h-4 text-red-500 shrink-0" />;
  };

  const modal = open ? createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/50">
          <div className="flex items-center gap-2">
            <ScanLine className="w-5 h-5 text-cyan-500" />
            <h2 className="font-bold text-foreground">{isAr ? 'APAS \u0645\u0627\u0633\u062d \u0627\u0644\u0633\u0628\u0648\u0631\u0629' : 'APAS Whiteboard Scanner'}</h2>
          </div>
          <button onClick={close} className="p-1.5 rounded-lg hover:bg-muted transition-colors"><X className="w-4 h-4" /></button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Upload zone + Camera */}
          {!loading && !report && !cameraOpen && (
            <>
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-cyan-500/30 rounded-xl p-8 text-center cursor-pointer hover:border-cyan-500/60 hover:bg-cyan-500/5 transition-all"
              >
                <Upload className="w-10 h-10 text-cyan-500/50 mx-auto mb-3" />
                <p className="text-sm font-medium text-foreground">{isAr ? '\u0627\u0633\u062d\u0628 \u0635\u0648\u0631\u0629 \u0627\u0644\u0633\u0628\u0648\u0631\u0629 \u0647\u0646\u0627 \u0623\u0648 \u0627\u0646\u0642\u0631 \u0644\u0644\u0627\u062e\u062a\u064a\u0627\u0631' : 'Drop whiteboard image here or click to select'}</p>
                <p className="text-xs text-muted-foreground mt-1">{isAr ? 'PNG, JPG, WebP (\u062d\u062a\u0649 20 \u0645\u064a\u062c\u0627)' : 'PNG, JPG, WebP (up to 20MB)'}</p>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-border/50" />
                <span className="text-xs text-muted-foreground font-medium">{isAr ? '\u0623\u0648' : 'OR'}</span>
                <div className="flex-1 h-px bg-border/50" />
              </div>

              <button
                onClick={() => setCameraOpen(true)}
                className="w-full flex items-center justify-center gap-3 py-4 px-4 rounded-xl bg-gradient-to-r from-cyan-500/10 to-teal-500/10 hover:from-cyan-500/20 hover:to-teal-500/20 border border-cyan-500/20 hover:border-cyan-500/40 text-foreground font-medium text-sm transition-all duration-300 group"
              >
                <div className="w-10 h-10 rounded-full bg-cyan-500/15 flex items-center justify-center group-hover:bg-cyan-500/25 transition-colors">
                  <Aperture className="w-5 h-5 text-cyan-500" />
                </div>
                <div className="text-start">
                  <p className="font-semibold">{isAr ? '\u062a\u0635\u0648\u064a\u0631 \u0627\u0644\u0633\u0628\u0648\u0631\u0629 \u0645\u0628\u0627\u0634\u0631\u0629' : 'Capture Whiteboard Directly'}</p>
                  <p className="text-xs text-muted-foreground">{isAr ? '\u0627\u0644\u062a\u0642\u0637 \u0635\u0648\u0631\u0629 \u0644\u0644\u0633\u0628\u0648\u0631\u0629 \u0623\u0648 \u0627\u0644\u0648\u0631\u0642\u0629' : 'Take a photo of the board or paper'}</p>
                </div>
              </button>
            </>
          )}

          {/* Camera view */}
          {cameraOpen && (
            <div className="space-y-3">
              <div className="relative rounded-xl overflow-hidden bg-black aspect-[4/3]">
                <video
                  ref={cameraVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${mirrorPreview ? 'scale-x-[-1]' : ''}`}
                />
                <canvas ref={cameraCanvasRef} className="hidden" />
                {!cameraReady && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                    <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
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
                <button onClick={capturePhoto} disabled={!cameraReady} className="flex-[2] py-2.5 rounded-lg bg-gradient-to-r from-cyan-500 to-teal-500 text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-40 hover:opacity-90 transition-opacity shadow-lg">
                  <Aperture className="w-4 h-4" /> {isAr ? '\u0627\u0644\u062a\u0642\u0627\u0637' : 'Capture'}
                </button>
              </div>
              <button onClick={() => setCameraOpen(false)} className="w-full py-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
                {isAr ? '\u0625\u0644\u063a\u0627\u0621' : 'Cancel'}
              </button>
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
                      <ScanLine className="w-8 h-8 text-cyan-400 animate-pulse" />
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
              {preview && (
                <div className="rounded-xl overflow-hidden max-h-32 flex items-center justify-center bg-muted/30">
                  <img src={preview} alt="Whiteboard" className="max-h-32 object-contain rounded-lg" />
                </div>
              )}

              {/* Corrections list */}
              {corrections.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <ScanLine className="w-4 h-4 text-cyan-500" />
                    {isAr ? '\u0627\u0644\u062a\u0635\u062d\u064a\u062d\u0627\u062a' : 'Corrections'}
                  </h3>
                  {corrections.map((c, i) => (
                    <div key={i} className={`rounded-lg border p-3 space-y-1.5 ${
                      c.status === 'correct' ? 'border-green-500/30 bg-green-500/5' :
                      c.status === 'warning' ? 'border-amber-500/30 bg-amber-500/5' :
                      'border-red-500/30 bg-red-500/5'
                    }`}>
                      <div className="flex items-start gap-2">
                        {statusIcon(c.status)}
                        <div className="flex-1 min-w-0">
                          {c.original && (
                            <p className="text-xs text-muted-foreground font-mono" dir="ltr">{c.original}</p>
                          )}
                          {c.status !== 'correct' && c.corrected && (
                            <p className="text-xs text-foreground font-mono font-semibold mt-1" dir="ltr">{c.corrected}</p>
                          )}
                          {c.explanation && (
                            <p className="text-xs text-muted-foreground mt-1">{c.explanation}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Full report */}
              <div className="bg-muted/30 rounded-xl p-4 border border-border/50">
                <ReportRenderer text={report} />
              </div>

              <button
                onClick={() => { setReport(null); setCorrections([]); setPreview(null); setProgress(0); }}
                className="w-full py-2 rounded-lg bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors"
              >
                {isAr ? '\u0645\u0633\u062d \u0633\u0628\u0648\u0631\u0629 \u0623\u062e\u0631\u0649' : 'Scan another whiteboard'}
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
        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500/10 to-blue-500/10 hover:from-cyan-500/20 hover:to-blue-500/20 border border-cyan-500/20 hover:border-cyan-500/40 text-foreground font-medium text-sm transition-all duration-300 disabled:opacity-50"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ScanLine className="w-4 h-4" />}
        <span>{isAr ? 'APAS \u0645\u0627\u0633\u062d \u0627\u0644\u0633\u0628\u0648\u0631\u0629' : 'APAS Whiteboard'}</span>
        <Sparkles className="w-3 h-3 text-cyan-400" />
      </button>
      {modal}
    </>
  );
}
