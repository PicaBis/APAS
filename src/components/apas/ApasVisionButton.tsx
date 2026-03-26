import React, { useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Camera, Loader2, X, Upload, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';
import { checkFileSize, getIssueMessage } from '@/utils/mediaQuality';

/* ------------------------------------------------------------------ */
/*  ReportRenderer – renders markdown-like report with equation blocks */
/* ------------------------------------------------------------------ */
function isEquationLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  const hasEquals = trimmed.includes('=');
  const hasMathSymbols = /[+\-*/\u221A\u00B2\u00B3\u03B1\u03B2\u03B3\u03B8\u03C0\u0394\u03A9\u2248\u2264\u2265\u00B1\u00D7\u00F7]/.test(trimmed);
  const startsWithMathVar = /^[a-zA-Z][\s_\u2080-\u2089]*[\s(=]/.test(trimmed);
  if (hasEquals && hasMathSymbols) return true;
  if (hasEquals && startsWithMathVar) return true;
  if (/^[xyRHTvVaghmFKE][\s_\u2080-\u2082]*([\s(=])/.test(trimmed)) return true;
  if (trimmed.startsWith('$$') || (trimmed.startsWith('$') && trimmed.endsWith('$') && trimmed.length > 2)) return true;
  return false;
}

function ReportRenderer({ text }: { text: string }) {
  const lines = text.split('\n');
  const blocks: { type: 'text' | 'equation' | 'heading' | 'json'; content: string }[] = [];
  let currentText: string[] = [];
  let inJson = false;
  let jsonLines: string[] = [];

  const flushText = () => {
    if (currentText.length > 0) {
      blocks.push({ type: 'text', content: currentText.join('\n') });
      currentText = [];
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === '```json' || trimmed === '```') {
      if (inJson) {
        flushText();
        blocks.push({ type: 'json', content: jsonLines.join('\n') });
        jsonLines = [];
        inJson = false;
      } else if (trimmed === '```json') {
        flushText();
        inJson = true;
      }
      continue;
    }
    if (inJson) { jsonLines.push(line); continue; }
    if (/^[|\s\-:]+$/.test(trimmed) && trimmed.includes('-')) continue;
    if (trimmed.startsWith('#')) {
      flushText();
      blocks.push({ type: 'heading', content: trimmed });
    } else if (trimmed.startsWith('|')) {
      const cells = trimmed.split('|').map(c => c.trim()).filter(c => c.length > 0);
      if (cells.length > 0) currentText.push(cells.join(' : '));
    } else if (isEquationLine(line)) {
      flushText();
      blocks.push({ type: 'equation', content: trimmed });
    } else {
      currentText.push(line);
    }
  }
  flushText();

  return (
    <div className="space-y-2 text-sm leading-relaxed">
      {blocks.map((block, i) => {
        if (block.type === 'heading') {
          const level = block.content.match(/^#+/)?.[0].length || 1;
          const text = block.content.replace(/^#+\s*/, '');
          if (level === 1) return <h2 key={i} className="text-lg font-bold text-primary mt-4 mb-2">{text}</h2>;
          if (level === 2) return <h3 key={i} className="text-base font-semibold text-foreground mt-3 mb-1.5">{text}</h3>;
          return <h4 key={i} className="text-sm font-semibold text-foreground mt-2 mb-1">{text}</h4>;
        }
        if (block.type === 'equation') {
          return (
            <div key={i} className="bg-primary/5 border border-primary/20 rounded-lg px-3 py-2 font-mono text-xs text-primary">
              {block.content}
            </div>
          );
        }
        if (block.type === 'json') {
          return (
            <details key={i} className="group">
              <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                JSON Data
              </summary>
              <pre className="mt-1 bg-muted/50 rounded-lg p-2 text-xs overflow-x-auto max-h-40">{block.content}</pre>
            </details>
          );
        }
        return (
          <div key={i} className="text-muted-foreground whitespace-pre-wrap">
            {block.content.split('\n').map((line, j) => {
              const t = line.trim();
              if (t.startsWith('**') && t.endsWith('**')) return <p key={j} className="font-semibold text-foreground">{t.slice(2, -2)}</p>;
              if (t.startsWith('- ') || t.startsWith('* ')) return <p key={j} className="pl-3">• {t.slice(2)}</p>;
              if (!t) return <br key={j} />;
              return <p key={j}>{line}</p>;
            })}
          </div>
        );
      })}
    </div>
  );
}

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

const SUPABASE_URL = 'https://zjdtvderwryjnwdimbbm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqZHR2ZGVyd3J5am53ZGltYmJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxMzU3NzgsImV4cCI6MjA4OTcxMTc3OH0.BmeA5eqF85lpOr7P57NJJOaNxNsG4f-UaQ2S-SwKjXg';

export default function ApasVisionButton({ lang, onUpdateParams, onMediaAnalyzed, onAutoRun, onDetectedMedia, autoOpen, onDismiss }: Props) {
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


  const analyzeImage = useCallback(async (file: File) => {
    setLoading(true);
    setProgress(5);
    setReport(null);

    try {
      // File validation
      const sizeIssue = checkFileSize(file);
      if (sizeIssue) toast.warning(getIssueMessage(sizeIssue, lang));

      // Step 1: Convert to base64
      setStatusMsg(isAr ? 'جاري تحليل الصورة بالذكاء الاصطناعي...' : 'Analyzing image with AI...');
      setProgress(30);

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

      // Step 3: Call vision-analyze edge function
      setStatusMsg(isAr ? 'APAS يستخرج المعطيات...' : 'APAS extracting data...');
      setProgress(55);

      const response = await fetch(`${SUPABASE_URL}/functions/v1/vision-analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          imageBase64,
          mimeType,
          lang,
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
                source: 'image',
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
      toast.success(isAr ? 'تم تحليل الصورة بنجاح' : 'Image analyzed successfully');
    } catch (err) {
      console.error('Vision analysis error:', err);
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
          {/* Drop zone */}
          {!loading && !report && (
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
