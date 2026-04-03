import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import ReactMarkdown from 'react-markdown';
import { BookOpen, Loader2, X, Upload, Eye, CheckCircle, AlertTriangle, XCircle, History, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';
import { checkFileSize, analyzeImageQuality, getIssueMessage } from '@/utils/mediaQuality';
import { cleanLatex } from '@/utils/cleanLatex';

const SUPABASE_EDGE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_EDGE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const EDGE_SUBJECT_URL = `${SUPABASE_EDGE_URL}/functions/v1/subject-reading`;

interface Props {
  lang: string;
  onUpdateParams: (params: { velocity?: number; angle?: number; height?: number; mass?: number; objectType?: string }) => void;
  autoOpen?: boolean;
  onDismiss?: () => void;
  onAnalysisComplete?: (entry: { type: 'vision' | 'video' | 'subject' | 'voice'; report: string; params?: { velocity?: number; angle?: number; height?: number; mass?: number }; mediaSrc?: string; mediaType?: 'video' | 'image' }) => void;
}

interface SubjectData {
  recognized: boolean;
  type?: string;
  extractedData?: {
    velocity?: number | null;
    angle?: number | null;
    height?: number | null;
    mass?: number | null;
    range?: number | null;
    gravity?: number | null;
  };
  toFind?: string[];
  graphData?: {
    hasGraph?: boolean;
    graphType?: string | null;
    readValues?: string | null;
  };
  diagrams?: string | null;
  explanation?: string;
  solution?: string;
  isProjectileMotion?: boolean;
}

interface ExerciseHistoryEntry {
  id: number;
  timestamp: Date;
  data: SubjectData | null;
  explanationText: string;
  solutionText: string;
  thumbnailData?: string;
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

export default function ApasSubjectReading({ lang, onUpdateParams, autoOpen, onDismiss, onAnalysisComplete }: Props) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [analysisStep, setAnalysisStep] = useState<'upload' | 'analyze' | 'results'>('upload');
  const [subjectData, setSubjectData] = useState<SubjectData | null>(null);
  const [explanationText, setExplanationText] = useState('');
  const [solutionText, setSolutionText] = useState('');
  const [showSolution, setShowSolution] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [history, setHistory] = useState<ExerciseHistoryEntry[]>([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const isAr = lang === 'ar';

  // Auto-open file picker when autoOpen prop is set (for mobile header direct access)
  const autoOpenTriggered = useRef(false);
  useEffect(() => {
    if (autoOpen && !autoOpenTriggered.current) {
      autoOpenTriggered.current = true;
      fileRef.current?.click();
    }
  }, [autoOpen]);

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
    const toFind = Array.isArray(jsonData.toFind) ? jsonData.toFind as string[] : undefined;
    const graphData = jsonData.graphData as SubjectData['graphData'] | undefined;
    const diagrams = typeof jsonData.diagrams === 'string' ? jsonData.diagrams : undefined;

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
      toFind,
      graphData,
      diagrams,
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

    // Guard: block uploads when Supabase is not configured
    if (!SUPABASE_EDGE_URL || !SUPABASE_EDGE_ANON_KEY) {
      toast.error(isAr ? 'خدمة Supabase غير مهيأة. تحقق من إعدادات البيئة.' : 'Supabase is not configured. Check environment settings.');
      setIsAnalyzing(false);
      setShowModal(false);
      return;
    }

      const systemPrompt = `You are a Senior Physics Professor and Ballistics Expert from ENS Paris. 
Analyze the image of a physics problem or exercise with extreme precision.
Your goal is to solve the problem step-by-step and provide a comprehensive report.

CRITICAL INSTRUCTIONS:
1. EXTRACT ALL DATA: Read every word and number. Identify given values: initial velocity (V₀), launch angle (θ), initial height (h₀), mass (m), gravity (g), horizontal range (R), or time of flight (T).
2. SOLVE BEFORE RESPONDING: You MUST solve for any required unknowns (like V₀ or θ) using kinematic equations BEFORE providing the final parameters in the JSON block. 
3. NO ZEROS: NEVER return 0 for velocity or angle if they can be calculated from the problem (e.g., if range and angle are given, solve for V₀).
4. JSON MUST MATCH SOLUTION: The "extractedData" in the JSON block MUST contain the FINAL SOLVED VALUES from your mathematical solution, not just the starting data.

Format your report exactly as follows:

بناءً على تحليلي لهذا التمرين كأستاذ فيزياء، إليك التقرير العلمي المفصل للمعطيات المستخرجة والحل الرياضي:

1. تحليل البيئة والمعطيات المستخرجة:
- الجسم (Projectile): [Identify object and mass]
- المرجع (Origin): [Identify starting point precisely]
- الارتفاع الابتدائي (h₀): [Extract or solve for initial height]
- الزاوية المتوقعة (θ): [Extract or solve for launch angle]
- السرعة الابتدائية (V₀): [Extract or solve for initial velocity - MUST NOT BE 0]

2. الحل الرياضي المفصل:
[Solve the exercise questions step-by-step here. Show the formulas used, the substitution of values, and the final results. Be extremely thorough.]

3. المعادلات الرياضية المعتمدة (CLEAN TEXT ONLY - NO LATEX):
x(t) = V₀·cos(θ)·t
y(t) = h₀ + V₀·sin(θ)·t − ½g·t²
Vx(t) = V₀·cos(θ)
Vy(t) = V₀·sin(θ) − g·t
V(t) = √(Vx² + Vy²)
θ_impact = arctan(−Vy/Vx)

4. لماذا هذا التحليل منطقي؟
- [Reason 1: Direct extraction/calculation from the problem text]
- [Reason 2: Physical consistency and application of kinematic laws]

رأيي الفني: [Provide expert summary].

You MUST also provide a JSON block at the end with the FINAL CALCULATED VALUES to be applied to the simulation:
{
  "recognized": true,
  "isProjectileMotion": true,
  "type": "projectile motion",
  "extractedData": {
    "velocity": float, (The final solved V₀)
    "angle": float, (The final solved θ)
    "height": float, (The final solved h₀)
    "mass": float,
    "gravity": 9.81,
    "range": float, (The given or solved range R)
    "objectType": "string (e.g. ball, cannon, rocket)"
  },
  "explanation": "The full text report above",
  "solution": "Step-by-step mathematical solution"
}`;

    try {
      const resp = await fetch(EDGE_SUBJECT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_EDGE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_EDGE_ANON_KEY}`,
        },
        body: JSON.stringify({
          imageBase64: base64,
          mimeType,
          lang,
          systemPrompt, // Passing the enhanced expert prompt
        }),
      });

      if (resp.ok) {
        const data = await resp.json();
        setProgress(100);
        setAnalysisStep('results');
        await new Promise(r => setTimeout(r, 400));

        if (data.text) {
          const parsed = parseSubjectResponse(data.text);
          setSubjectData(parsed);
          setExplanationText(parsed.explanation || '');
          setSolutionText(parsed.solution || '');

          // Add to history
          setHistory(prev => [{
            id: Date.now(),
            timestamp: new Date(),
            data: parsed,
            explanationText: parsed.explanation || '',
            solutionText: parsed.solution || '',
            thumbnailData: previewUrl || undefined,
          }, ...prev].slice(0, 20));

          if (parsed.recognized && parsed.extractedData) {
            const ed = parsed.extractedData;
            if (parsed.isProjectileMotion) {
              const appliedParams = {
                velocity: ed.velocity || undefined,
                angle: ed.angle || undefined,
                height: ed.height || undefined,
                mass: ed.mass || undefined,
                range: ed.range || undefined,
                gravity: ed.gravity || undefined,
              };
              onUpdateParams(appliedParams);
              onAnalysisComplete?.({
                type: 'subject',
                report: parsed.explanation || '',
                params: {
                  velocity: ed.velocity || 0,
                  angle: ed.angle || 0,
                  height: ed.height || 0,
                  mass: ed.mass || 1,
                },
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
        setProgress(100);
        setAnalysisStep('results');
        setExplanationText(isAr ? 'تعذر تحليل الصورة. حاول مرة أخرى.' : 'Could not analyze the image. Please try again.');
        setSubjectData({ recognized: false });
        toast.error(isAr ? 'تعذر التحليل' : 'Analysis failed');
      }
    } catch (err) {
      console.error('Subject analysis error:', err);
      setProgress(100);
      setAnalysisStep('results');
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

  const loadFromHistory = (entry: ExerciseHistoryEntry) => {
    setSubjectData(entry.data);
    setExplanationText(entry.explanationText);
    setSolutionText(entry.solutionText);
    setShowSolution(false);
    if (entry.thumbnailData) {
      setPreviewUrl(entry.thumbnailData);
    }
    setShowHistoryModal(false);
    setShowModal(true);
    setAnalysisStep('results');
    if (entry.data?.recognized && entry.data.extractedData && entry.data.isProjectileMotion) {
      const ed = entry.data.extractedData;
      onUpdateParams({
        velocity: ed.velocity,
        angle: ed.angle,
        height: ed.height,
        mass: ed.mass,
      });
    }
  };

  const closeModal = () => {
    setShowModal(false);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    onDismiss?.();
  };

  return (
    <>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />

      <div className="flex items-center gap-1">
        <button
          onClick={() => fileRef.current?.click()}
          disabled={isAnalyzing}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 hover:from-amber-500/20 hover:to-orange-500/20 border border-amber-500/20 hover:border-amber-500/40 text-foreground font-medium text-sm transition-all duration-300 disabled:opacity-50"
          title={isAr ? 'قراءة تمرين' : 'Read Exercise'}
        >
          {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookOpen className="w-4 h-4" />}
          <span>{isAr ? 'APAS قراءة تمرين' : 'APAS Subject'}</span>
          <Sparkles className="w-3 h-3 text-amber-400" />
        </button>
      </div>

      {/* Exercise History Modal */}
      {showHistoryModal && createPortal(
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowHistoryModal(false)}>
          <div
            className="bg-background border border-border rounded-xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden animate-slideDown"
            dir={isAr ? 'rtl' : 'ltr'}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-border bg-secondary/30">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-foreground" />
                <h3 className="text-sm font-semibold text-foreground">{isAr ? 'سجل التمارين' : 'Exercise History'}</h3>
              </div>
              <button onClick={() => setShowHistoryModal(false)} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-all duration-200">
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
                      setHistory(prev => prev.filter(h => h.id !== entry.id));
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
                      {entry.thumbnailData && (
                        <img src={entry.thumbnailData} alt="" className="w-14 h-10 object-cover rounded border border-border/30 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1 pe-5">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                            entry.data?.recognized
                              ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                              : 'bg-red-500/10 text-red-600 dark:text-red-400'
                          }`}>
                            {entry.data?.recognized
                              ? (isAr ? 'تم التعرف' : 'Recognized')
                              : (isAr ? 'لم يُتعرف' : 'Not recognized')}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {entry.timestamp.toLocaleTimeString()}
                          </span>
                        </div>
                        {entry.data?.type && (
                          <p className="text-xs text-foreground truncate mb-1">{entry.data.type}</p>
                        )}
                        {entry.data?.recognized && entry.data.extractedData && (
                          <div className="grid grid-cols-2 gap-1.5 text-[9px]">
                            {[
                              { label: isAr ? 'السرعة' : 'V', value: entry.data.extractedData.velocity, unit: 'm/s' },
                              { label: isAr ? 'الزاوية' : 'θ', value: entry.data.extractedData.angle, unit: '°' },
                              { label: isAr ? 'الارتفاع' : 'H', value: entry.data.extractedData.height, unit: 'm' },
                              { label: isAr ? 'الكتلة' : 'M', value: entry.data.extractedData.mass, unit: 'kg' },
                            ].filter(item => item.value != null).map(item => (
                              <div key={item.label} className="bg-secondary/50 rounded p-1 text-center">
                                <span className="text-muted-foreground">{item.label}: </span>
                                <span className="font-mono font-medium text-foreground">{item.value} {item.unit}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {entry.data?.isProjectileMotion && (
                          <p className="text-[9px] text-green-600 dark:text-green-400 mt-1">
                            {isAr ? 'حركة مقذوفات' : 'Projectile motion'}
                          </p>
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
                  <div className="flex flex-col items-center gap-3 py-4">
                    <div className="relative">
                      <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
                      <div className="absolute inset-0 blur-lg bg-blue-400/30 animate-pulse rounded-full" />
                    </div>
                    <span className="text-sm font-bold text-blue-700 dark:text-blue-400 text-center animate-pulse">
                      {analysisStep === 'upload'
                        ? (isAr ? 'جاري تحميل الصورة...' : 'Uploading image...')
                        : analysisStep === 'analyze'
                          ? (isAr ? 'جاري قراءة وتحليل التمرين...' : 'Reading and analyzing the exercise...')
                          : (isAr ? 'جاري معالجة النتائج...' : 'Processing results...')}
                    </span>
                    <span className="text-xs font-mono font-bold text-blue-600/70">{Math.round(progress)}%</span>
                  </div>
                  <Progress value={progress} className="h-2.5 bg-blue-100 dark:bg-blue-900/30" indicatorClassName="bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.4)]" />
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

                  {/* Extracted data - only explicitly given values */}
                  {subjectData.recognized && subjectData.extractedData && (
                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                        {isAr ? 'المعطيات المستخرجة' : 'Extracted Given Data'}
                      </p>
                      {[
                        { label: isAr ? 'السرعة' : 'Velocity', value: subjectData.extractedData.velocity, unit: ' m/s' },
                        { label: isAr ? 'الزاوية' : 'Angle', value: subjectData.extractedData.angle, unit: '°' },
                        { label: isAr ? 'الارتفاع' : 'Height', value: subjectData.extractedData.height, unit: ' m' },
                        { label: isAr ? 'الكتلة' : 'Mass', value: subjectData.extractedData.mass, unit: ' kg' },
                        { label: isAr ? 'المدى' : 'Range', value: subjectData.extractedData.range, unit: ' m' },
                        { label: isAr ? 'الجاذبية' : 'Gravity', value: subjectData.extractedData.gravity, unit: ' m/s²' },
                      ].filter(item => item.value != null).length > 0 ? (
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
                      ) : (
                        <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <p className="text-[10px] text-amber-600 dark:text-amber-400">
                            {isAr ? 'لم يتم العثور على معطيات رقمية صريحة في التمرين' : 'No explicit numerical data found in the exercise'}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Values to find */}
                  {subjectData.recognized && subjectData.toFind && subjectData.toFind.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider w-full mb-0.5">
                        {isAr ? 'المطلوب حسابه' : 'To Calculate'}
                      </p>
                      {subjectData.toFind.map((item, i) => (
                        <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400">
                          {item}
                        </span>
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
