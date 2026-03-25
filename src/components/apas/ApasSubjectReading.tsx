import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import ReactMarkdown from 'react-markdown';
import { BookOpen, Loader2, X, Upload, Eye, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';
import { checkFileSize, analyzeImageQuality, getIssueMessage } from '@/utils/mediaQuality';
import { cleanLatex } from '@/utils/cleanLatex';

const EDGE_SUBJECT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/subject-reading`;

interface Props {
  lang: string;
  onUpdateParams: (params: { velocity?: number; angle?: number; height?: number; mass?: number; objectType?: string }) => void;
}

interface SubjectData {
  recognized: boolean;
  type?: string;
  extractedData?: {
    velocity?: number;
    angle?: number;
    height?: number;
    mass?: number;
    range?: number;
    gravity?: number;
  };
  explanation?: string;
  solution?: string;
  isProjectileMotion?: boolean;
}

/* ------------------------------------------------------------------ */
/*  SolutionRenderer – renders text with equations in styled blocks    */
/* ------------------------------------------------------------------ */

function isEquationLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  // Lines that look like equations: contain = and math-like characters
  const hasEquals = trimmed.includes('=');
  const hasMathSymbols = /[+\-*/√²³⁴⁰¹⁵⁶⁷⁸⁹₀₁₂₃₄₅₆₇₈₉αβγθδωπσρμλεφψτηνΔΩΣ≈≤≥∞±·×÷∂∇∑∫⇒→]/.test(trimmed);
  const startsWithMathVar = /^[a-zA-Z][\s_₀₁₂₃₄₅₆₇₈₉ₓ]*[\s(=]/.test(trimmed);
  const hasParenMath = /\([^)]*[+\-*/^√]\s*[^)]*\)/.test(trimmed);
  // Equation-like patterns
  if (hasEquals && hasMathSymbols) return true;
  if (hasEquals && startsWithMathVar) return true;
  if (hasEquals && hasParenMath) return true;
  // Lines starting with known equation patterns
  if (/^[xyRHTvVaghmFKE][\s_₀₁₂]*([\s(=])/.test(trimmed)) return true;
  if (/^[θαβ][\s_]*=/.test(trimmed)) return true;
  return false;
}

function SolutionRenderer({ text }: { text: string }) {
  const lines = text.split('\n');
  const blocks: { type: 'text' | 'equation'; content: string }[] = [];
  let currentText: string[] = [];

  const flushText = () => {
    if (currentText.length > 0) {
      blocks.push({ type: 'text', content: currentText.join('\n') });
      currentText = [];
    }
  };

  for (const line of lines) {
    if (isEquationLine(line)) {
      flushText();
      blocks.push({ type: 'equation', content: line.trim() });
    } else {
      currentText.push(line);
    }
  }
  flushText();

  return (
    <div className="space-y-2">
      {blocks.map((block, i) =>
        block.type === 'equation' ? (
          <div
            key={i}
            className="bg-white dark:bg-slate-800 border border-border/40 rounded-lg px-3 py-2 font-mono text-xs leading-relaxed text-foreground shadow-sm overflow-x-auto"
            dir="ltr"
          >
            {block.content}
          </div>
        ) : (
          <div key={i} className="text-xs leading-relaxed text-foreground [&_p]:my-1 [&_li]:my-0.5">
            <ReactMarkdown>{block.content}</ReactMarkdown>
          </div>
        )
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export default function ApasSubjectReading({ lang, onUpdateParams }: Props) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [analysisStep, setAnalysisStep] = useState<'upload' | 'analyze' | 'results'>('upload');
  const [subjectData, setSubjectData] = useState<SubjectData | null>(null);
  const [explanationText, setExplanationText] = useState('');
  const [solutionText, setSolutionText] = useState('');
  const [showSolution, setShowSolution] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const isAr = lang === 'ar';

  useEffect(() => {
    if (!isAnalyzing) return;
    setProgress(0);
    const interval = setInterval(() => {
      setProgress(prev => prev >= 90 ? 90 : prev + Math.random() * 10);
    }, 350);
    return () => clearInterval(interval);
  }, [isAnalyzing]);

  const parseSubjectResponse = useCallback((text: string): SubjectData => {
    const jsonMatch = text.match(/```json\s*([\s\S]*?)```/);
    let jsonData: Record<string, unknown> | null = null;
    if (jsonMatch) {
      try { jsonData = JSON.parse(jsonMatch[1].trim()); } catch { /* ignore */ }
    }

    const cleanText = text.replace(/```json[\s\S]*?```\s*/, '').trim();

    if (!jsonData || jsonData.recognized === false) {
      return {
        recognized: false,
        explanation: cleanText || (isAr ? 'لم اتعرف على التمرين' : 'I did not recognize the exercise'),
      };
    }

    const extracted = jsonData.extractedData as SubjectData['extractedData'] | undefined;
    const isProjectile = Boolean(jsonData.isProjectileMotion);

    // Split clean text into explanation and solution parts
    const solutionSeparators = [
      '## الحل', '## Solution', '**الحل:**', '**Solution:**',
      '### الحل', '### Solution', '--- الحل', '--- Solution',
      'الحل:', 'Solution:',
    ];

    let explanation = cleanText;
    let solution = '';

    for (const sep of solutionSeparators) {
      const idx = cleanText.indexOf(sep);
      if (idx !== -1) {
        explanation = cleanText.slice(0, idx).trim();
        solution = cleanText.slice(idx).trim();
        break;
      }
    }

    // If no separator found, use the full text as explanation and jsonData solution
    if (!solution && typeof jsonData.solution === 'string') {
      solution = jsonData.solution;
    }

    return {
      recognized: true,
      type: typeof jsonData.type === 'string' ? jsonData.type : undefined,
      extractedData: extracted,
      explanation,
      solution: solution || (isAr ? 'لا يتوفر حل تفصيلي لهذا التمرين.' : 'No detailed solution available for this exercise.'),
      isProjectileMotion: isProjectile,
    };
  }, [isAr]);

  const analyzeSubjectImage = async (base64: string, mimeType: string) => {
    setIsAnalyzing(true);
    setShowModal(true);
    setSubjectData(null);
    setExplanationText('');
    setSolutionText('');
    setShowSolution(false);
    setAnalysisStep('analyze');
    try {
      const resp = await fetch(EDGE_SUBJECT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          imageBase64: base64,
          mimeType,
          lang,
        }),
      });

      if (resp.ok) {
        const data = await resp.json();
        if (data.text) {
          setProgress(100);
          setAnalysisStep('results');
          await new Promise(r => setTimeout(r, 400));

          const parsed = parseSubjectResponse(data.text);
          setSubjectData(parsed);
          setExplanationText(parsed.explanation || '');
          setSolutionText(parsed.solution || '');

          if (parsed.recognized && parsed.extractedData) {
            const ed = parsed.extractedData;
            if (parsed.isProjectileMotion) {
              onUpdateParams({
                velocity: ed.velocity,
                angle: ed.angle,
                height: ed.height,
                mass: ed.mass,
              });
              toast.success(isAr ? 'تم استخراج بيانات التمرين وتطبيقها على المحاكاة' : 'Exercise data extracted and applied to simulation');
            }
          } else {
            toast.info(isAr ? 'لم اتعرف على التمرين' : 'I did not recognize the exercise');
          }
        } else {
          setExplanationText(isAr ? 'لم اتعرف على التمرين' : 'I did not recognize the exercise');
          setSubjectData({ recognized: false });
        }
      } else {
        setExplanationText(isAr ? 'تعذر تحليل الصورة. حاول مرة أخرى.' : 'Could not analyze the image. Please try again.');
        setSubjectData({ recognized: false });
        toast.error(isAr ? 'تعذر التحليل' : 'Analysis failed');
      }
    } catch {
      toast.error(isAr ? 'خطأ في الاتصال' : 'Connection error');
      setExplanationText(isAr ? 'خطأ في الاتصال — تحقق من اتصالك بالإنترنت' : 'Connection error — check your internet');
      setSubjectData({ recognized: false });
    }
    setIsAnalyzing(false);
    setAnalysisStep('results');
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (fileRef.current) fileRef.current.value = '';

    const fileSizeIssue = checkFileSize(file);
    if (fileSizeIssue) {
      toast.warning(getIssueMessage(fileSizeIssue, lang));
    }

    // Analyze image quality
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
    };
    img.src = imgUrl;

    // Revoke old preview URL
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(imgUrl);

    const base64 = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.readAsDataURL(file);
    });

    analyzeSubjectImage(base64, file.type);
  };

  const handleShowSolution = () => {
    setShowSolution(true);
    if (subjectData?.isProjectileMotion && subjectData.extractedData) {
      const ed = subjectData.extractedData;
      onUpdateParams({
        velocity: ed.velocity,
        angle: ed.angle,
        height: ed.height,
        mass: ed.mass,
      });
      toast.success(isAr ? 'تم عرض الحل وتطبيق البيانات على الرسم' : 'Solution displayed and data applied to canvas');
    }
  };

  const closeModal = () => {
    setShowModal(false);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  };

  return (
    <>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />

      <button
        onClick={() => fileRef.current?.click()}
        disabled={isAnalyzing}
        className="group flex items-center gap-2 px-3 py-2 rounded-lg border border-border hover:border-foreground/30 bg-secondary/50 hover:bg-secondary transition-all duration-200 hover:shadow-md disabled:opacity-60 w-full"
        title={isAr ? 'قراءة تمرين' : 'Read Exercise'}
      >
        <div className="relative">
          <BookOpen className="w-4 h-4 text-foreground transition-transform duration-200 group-hover:scale-110" />
          {isAnalyzing && (
            <div className="absolute -inset-1 rounded-full border-2 border-foreground/30 border-t-foreground animate-spin" />
          )}
        </div>
        <span className="text-[10px] sm:text-xs font-semibold text-foreground">APAS Subject</span>
        <span className="text-[9px] text-muted-foreground ms-auto">{isAr ? 'قراءة تمرين' : 'Read Exercise'}</span>
      </button>

      {/* Analysis Modal */}
      {showModal && createPortal(
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => { if (!isAnalyzing) closeModal(); }}>
          <div
            className="bg-background border border-border rounded-xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden animate-slideDown"
            dir={isAr ? 'rtl' : 'ltr'}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border bg-secondary/30">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-foreground" />
                <h3 className="text-sm font-semibold text-foreground">
                  {isAr ? 'قراءة تمرين APAS Subject' : 'APAS Subject Reading'}
                </h3>
              </div>
              {!isAnalyzing && (
                <button onClick={closeModal} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-all duration-200">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {/* Image preview - full display when results shown, compact during analysis */}
              {previewUrl && !isAnalyzing && (
                <div className="w-full">
                  <img src={previewUrl} alt="" className="w-full object-contain rounded-lg border border-border/30" />
                </div>
              )}
              {previewUrl && isAnalyzing && (
                <div className="w-full">
                  <img src={previewUrl} alt="" className="w-full max-h-40 object-contain rounded-lg border border-border/30 opacity-80" />
                </div>
              )}

              {/* Loading state */}
              {isAnalyzing && (
                <div className="space-y-3 w-full">
                  <div className="flex items-center gap-1 w-full">
                    {(['upload', 'analyze', 'results'] as const).map((s, i) => {
                      const stepLabels = {
                        upload: isAr ? 'تحميل' : 'Upload',
                        analyze: isAr ? 'قراءة التمرين' : 'Reading Exercise',
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
                          ? (isAr ? 'جاري قراءة وتحليل التمرين...' : 'Reading and analyzing the exercise...')
                          : (isAr ? 'جاري معالجة النتائج...' : 'Processing results...')}
                    </span>
                    <span className="text-xs font-mono text-muted-foreground">{Math.round(progress)}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              )}

              {/* Results */}
              {!isAnalyzing && subjectData && (
                <>
                  {/* Recognition status */}
                  <div className={`flex items-center gap-2 p-3 rounded-lg border ${
                    subjectData.recognized
                      ? 'bg-green-500/10 border-green-500/30'
                      : 'bg-red-500/10 border-red-500/30'
                  }`}>
                    {subjectData.recognized
                      ? <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                      : <XCircle className="w-4 h-4 text-red-500 shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground">
                        {subjectData.recognized
                          ? (isAr ? 'تم التعرف على التمرين' : 'Exercise recognized')
                          : (isAr ? 'لم اتعرف على التمرين' : 'I did not recognize the exercise')}
                      </p>
                      {subjectData.type && (
                        <p className="text-[10px] text-muted-foreground">
                          {isAr ? `النوع: ${subjectData.type}` : `Type: ${subjectData.type}`}
                        </p>
                      )}
                      {subjectData.isProjectileMotion && (
                        <p className="text-[10px] text-green-600 dark:text-green-400 font-medium mt-0.5">
                          {isAr ? 'تمرين حركة مقذوفات — سيتم تطبيقه على الرسم' : 'Projectile motion exercise — will be applied to canvas'}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Extracted data */}
                  {subjectData.recognized && subjectData.extractedData && (
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: isAr ? 'السرعة' : 'Velocity', value: subjectData.extractedData.velocity, unit: ' m/s' },
                        { label: isAr ? 'الزاوية' : 'Angle', value: subjectData.extractedData.angle, unit: '°' },
                        { label: isAr ? 'الارتفاع' : 'Height', value: subjectData.extractedData.height, unit: ' m' },
                        { label: isAr ? 'الكتلة' : 'Mass', value: subjectData.extractedData.mass, unit: ' kg' },
                        { label: isAr ? 'المدى' : 'Range', value: subjectData.extractedData.range, unit: ' m' },
                        { label: isAr ? 'الجاذبية' : 'Gravity', value: subjectData.extractedData.gravity, unit: ' m/s²' },
                      ].filter(item => item.value != null).map(item => (
                        <div key={item.label} className="border border-border rounded-lg p-2 text-center bg-secondary/30">
                          <p className="text-[9px] text-muted-foreground mb-0.5">{item.label}</p>
                          <p className="text-xs font-semibold font-mono text-foreground">
                            {item.value}{item.unit}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Explanation */}
                  {explanationText && (
                    <div className="border border-border rounded-lg p-3 bg-secondary/20">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        {isAr ? 'شرح التمرين' : 'Exercise Explanation'}
                      </p>
                      <SolutionRenderer text={cleanLatex(explanationText)} />
                    </div>
                  )}

                  {/* Show Solution button */}
                  {subjectData.recognized && !showSolution && (
                    <button
                      onClick={handleShowSolution}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-gradient-to-r from-primary to-primary/80 text-white text-sm font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <Eye className="w-4 h-4" />
                      {isAr ? 'اظهار الحل' : 'Show Solution'}
                    </button>
                  )}

                  {/* Solution */}
                  {showSolution && solutionText && (
                    <div className="border border-primary/30 rounded-lg p-3 bg-primary/5 animate-slideDown">
                      <p className="text-[10px] font-semibold text-primary uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Eye className="w-3 h-3" />
                        {isAr ? 'الحل' : 'Solution'}
                      </p>
                      <SolutionRenderer text={cleanLatex(solutionText)} />
                      {subjectData.isProjectileMotion && (
                        <div className="mt-3 p-2 rounded-md bg-green-500/10 border border-green-500/20">
                          <p className="text-[10px] text-green-600 dark:text-green-400 font-medium flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            {isAr ? 'تم تطبيق البيانات على رسم المحاكاة' : 'Data applied to simulation canvas'}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            {!isAnalyzing && (
              <div className="p-3 border-t border-border flex gap-2">
                <button
                  onClick={() => fileRef.current?.click()}
                  className="flex-1 text-xs py-2 rounded-md border border-border hover:border-foreground/30 hover:bg-secondary hover:shadow-md transition-all duration-200 text-foreground"
                >
                  {isAr ? 'تمرين آخر' : 'Another Exercise'}
                </button>
                <button
                  onClick={closeModal}
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
