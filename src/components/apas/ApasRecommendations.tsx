import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import ReactMarkdown from 'react-markdown';
import { Lightbulb, X, Loader2, Lock, RefreshCw } from 'lucide-react';
import { playClick } from '@/utils/sound';
import { cleanLatex } from '@/utils/cleanLatex';

// AI calls go through edge functions which handle Groq→Mistral fallback internally
const EDGE_TUTOR_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/physics-tutor`;

// cleanLatex is now imported from @/utils/cleanLatex

async function consumeStream(
  body: ReadableStream<Uint8Array>,
  onChunk: (text: string) => void,
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const raw = line.slice(6).trim();
      if (raw === '[DONE]') return;
      try {
        const json = JSON.parse(raw);
        const content = json?.choices?.[0]?.delta?.content || '';
        if (content) onChunk(content);
      } catch { /* skip */ }
    }
  }
}

interface SimContext {
  velocity: number;
  angle: number;
  height: number;
  gravity: number;
  airResistance: number;
  mass: number;
  range?: string;
  maxHeight?: string;
  flightTime?: string;
  environmentId?: string;
  integrationMethod?: string;
}

interface Props {
  lang: string;
  muted: boolean;
  isUnlocked: boolean;
  simulationContext: SimContext;
}

export default function ApasRecommendations({ lang, muted, isUnlocked, simulationContext }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState('');
  const [error, setError] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const isAr = lang === 'ar';

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [recommendations]);

  const fetchRecommendations = async () => {
    setLoading(true);
    setRecommendations('');
    setError('');

    const systemPrompt = `You are APAS Recommendations Engine - an expert AI advisor for the APAS projectile motion simulator.
Your job is to analyze the current simulation parameters and provide smart, actionable recommendations.

${isAr ? 'Respond in Arabic.' : 'Respond in English.'}

Current simulation context:
- Velocity: ${simulationContext.velocity} m/s
- Angle: ${simulationContext.angle} degrees
- Height: ${simulationContext.height} m
- Gravity: ${simulationContext.gravity} m/s^2
- Air resistance: ${simulationContext.airResistance}
- Mass: ${simulationContext.mass} kg
- Environment: ${simulationContext.environmentId || 'earth'}
- Integration method: ${simulationContext.integrationMethod || 'euler'}
${simulationContext.range ? `- Range: ${simulationContext.range} m` : ''}
${simulationContext.maxHeight ? `- Max height: ${simulationContext.maxHeight} m` : ''}
${simulationContext.flightTime ? `- Flight time: ${simulationContext.flightTime} s` : ''}

Provide recommendations in these categories:
1. **${isAr ? 'تحسين المسار' : 'Trajectory Optimization'}**: Suggest angle/velocity adjustments for better range or height
2. **${isAr ? 'تحليل الأداء' : 'Performance Analysis'}**: Analyze current parameters and what they mean physically
3. **${isAr ? 'تجارب مقترحة' : 'Suggested Experiments'}**: Recommend experiments to try (e.g., enable air resistance, change environment, compare integration methods)
4. **${isAr ? 'نصائح تعليمية' : 'Educational Tips'}**: Share physics insights related to the current setup
5. **${isAr ? 'تحذيرات وملاحظات' : 'Warnings & Notes'}**: Any issues with current parameters (unrealistic values, etc.)

Format the output beautifully and clearly:
- Use ## for main section headings with an emoji icon before each heading
- Use bullet points (- ) for each recommendation, one idea per bullet
- Add a blank line between each section for visual breathing room
- Keep each bullet point concise (1-2 sentences max)
- Use **bold** for key terms and values
- Use simple equation format like: R = v0^2 * sin(2*theta) / g
- NEVER use LaTeX notation
- Include specific numerical suggestions (e.g., "try angle **45 degrees** for maximum range of approximately **X meters**")
- Make the text scannable — avoid long dense paragraphs
- Each section should have 2-4 bullet points maximum`;

    const userMessage = isAr
      ? 'قدم لي توصيات ذكية حول المحاكاة الحالية والمسار والنموذج.'
      : 'Give me smart recommendations about the current simulation, trajectory, and model.';

    let handled = false;
    let accumulated = '';

    const onChunk = (text: string) => {
      accumulated += text;
      setRecommendations(cleanLatex(accumulated));
    };

    try {
      // 1) Try edge function first
      try {
        const edgeResp = await fetch(EDGE_TUTOR_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            messages: [{ role: 'user', content: userMessage }],
            simulationContext,
            systemPrompt,
          }),
        });
        if (edgeResp.ok && edgeResp.body) {
          await consumeStream(edgeResp.body, onChunk);
          handled = true;
        }
      } catch {
        // fall through to Groq
      }

      // Edge function handles Groq→Mistral fallback internally
      // No direct API calls needed from the client

      if (!handled && !accumulated) {
        // Local fallback
        const fallback = isAr
          ? `## ${String.fromCodePoint(0x1F9E0)} توصيات APAS

### ${String.fromCodePoint(0x1F3AF)} تحسين المسار
- ${simulationContext.angle !== 45 ? `جرب زاوية 45 درجة للحصول على أقصى مدى (المدى الحالي بزاوية ${simulationContext.angle} درجة)` : 'أنت تستخدم الزاوية المثالية (45 درجة) لأقصى مدى!'}
- ${simulationContext.airResistance === 0 ? 'فعل مقاومة الهواء لرؤية الفرق في المسار الحقيقي' : 'مقاومة الهواء مفعلة - لاحظ كيف يتغير المسار مقارنة بالحالة المثالية'}

### ${String.fromCodePoint(0x1F4CA)} تحليل الأداء
- السرعة الابتدائية: ${simulationContext.velocity} م/ث
- المدى المتوقع (بدون مقاومة): ${(simulationContext.velocity ** 2 * Math.sin(2 * simulationContext.angle * Math.PI / 180) / simulationContext.gravity).toFixed(1)} م
- أقصى ارتفاع متوقع: ${(simulationContext.height + (simulationContext.velocity * Math.sin(simulationContext.angle * Math.PI / 180)) ** 2 / (2 * simulationContext.gravity)).toFixed(1)} م

### ${String.fromCodePoint(0x1F52C)} تجارب مقترحة
- قارن بين طرق التكامل (Euler و RK4 و AI APAS)
- جرب نفس الإعدادات على القمر (جاذبية 1.62 م/ث${String.fromCodePoint(0x00B2)})
- غير الكتلة مع تفعيل مقاومة الهواء لرؤية التأثير

### ${String.fromCodePoint(0x1F4A1)} نصائح تعليمية
- المدى الأقصى يتحقق عند زاوية 45 درجة (بدون مقاومة هواء)
- الزمن الكلي = 2 * v0 * sin(theta) / g
- مقاومة الهواء تقلل المدى وتجعل زاوية المدى الأقصى أقل من 45 درجة`
          : `## ${String.fromCodePoint(0x1F9E0)} APAS Recommendations

### ${String.fromCodePoint(0x1F3AF)} Trajectory Optimization
- ${simulationContext.angle !== 45 ? `Try angle 45 degrees for maximum range (current angle: ${simulationContext.angle} degrees)` : 'You are using the optimal angle (45 degrees) for maximum range!'}
- ${simulationContext.airResistance === 0 ? 'Enable air resistance to see the difference in real trajectory' : 'Air resistance is enabled - notice how the path changes compared to ideal case'}

### ${String.fromCodePoint(0x1F4CA)} Performance Analysis
- Initial velocity: ${simulationContext.velocity} m/s
- Expected range (no drag): ${(simulationContext.velocity ** 2 * Math.sin(2 * simulationContext.angle * Math.PI / 180) / simulationContext.gravity).toFixed(1)} m
- Expected max height: ${(simulationContext.height + (simulationContext.velocity * Math.sin(simulationContext.angle * Math.PI / 180)) ** 2 / (2 * simulationContext.gravity)).toFixed(1)} m

### ${String.fromCodePoint(0x1F52C)} Suggested Experiments
- Compare integration methods (Euler vs RK4 vs AI APAS)
- Try the same settings on the Moon (gravity 1.62 m/s${String.fromCodePoint(0x00B2)})
- Change mass with air resistance enabled to see the effect

### ${String.fromCodePoint(0x1F4A1)} Educational Tips
- Maximum range is achieved at 45 degrees (without air resistance)
- Total flight time = 2 * v0 * sin(theta) / g
- Air resistance reduces range and makes the optimal angle less than 45 degrees`;

        setRecommendations(fallback);
      }
    } catch {
      setError(isAr ? 'تعذر الحصول على التوصيات. حاول مرة أخرى.' : 'Failed to get recommendations. Please try again.');
    }
    setLoading(false);
  };

  const handleOpen = () => {
    if (!isUnlocked) return;
    playClick(muted);
    setOpen(true);
    if (!recommendations && !loading) {
      fetchRecommendations();
    }
  };

  return (
    <>
      {/* Header button - matches Ask APAS style */}
      <button
        onClick={handleOpen}
        disabled={!isUnlocked}
        className={`relative flex items-center gap-1.5 group transition-all duration-300 ${
          isUnlocked
            ? 'apas-assistant-btn rounded-lg px-2.5 py-1.5 text-white shadow-lg cursor-pointer'
            : 'rounded-lg px-2.5 py-1.5 bg-secondary/50 text-muted-foreground cursor-not-allowed opacity-60 border border-border/50'
        }`}
        title={!isUnlocked ? (isAr ? 'أدرج نموذج في الرؤية الذكية أو شغل المحاكاة أولا' : 'Upload a model in Smart Vision or run the simulation first') : ''}
      >
        <span className="relative flex items-center justify-center w-4 h-4">
          {isUnlocked ? (
            <>
              <Lightbulb className="w-4 h-4 sparkle-icon-flash" />
              <span className="absolute -top-1 -right-1 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white/60 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-white shadow-sm"></span>
              </span>
            </>
          ) : (
            <Lock className="w-3.5 h-3.5" />
          )}
        </span>
        <span className="relative z-10 text-[11px] font-bold whitespace-nowrap flex items-center gap-1 tracking-wide" dir={isAr ? 'rtl' : 'ltr'}>
          <span>{isAr ? 'توصيات' : 'Tips'}</span>
          <span className="font-extrabold">APAS</span>
        </span>
      </button>

      {/* Modal */}
      {open && createPortal(
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => !loading && setOpen(false)}>
          <div
            className="bg-background border border-border rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-slideDown"
            dir={isAr ? 'rtl' : 'ltr'}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border bg-secondary/30">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">
                  {isAr ? 'توصيات APAS الذكية' : 'APAS Smart Recommendations'}
                </h3>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => { e.stopPropagation(); fetchRecommendations(); }}
                  disabled={loading}
                  className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-all duration-200 disabled:opacity-50"
                  title={isAr ? 'تحديث التوصيات' : 'Refresh recommendations'}
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
                {!loading && (
                  <button onClick={() => setOpen(false)} className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-all duration-200">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Current params summary */}
            <div className="px-4 py-2 border-b border-border/50 bg-secondary/10">
              <div className="flex flex-wrap gap-2 text-[10px] font-mono text-muted-foreground">
                <span className="bg-secondary/50 px-1.5 py-0.5 rounded">V={simulationContext.velocity} m/s</span>
                <span className="bg-secondary/50 px-1.5 py-0.5 rounded">{'\u03B8'}={simulationContext.angle}{'\u00B0'}</span>
                <span className="bg-secondary/50 px-1.5 py-0.5 rounded">h={simulationContext.height} m</span>
                <span className="bg-secondary/50 px-1.5 py-0.5 rounded">g={simulationContext.gravity} m/s{'\u00B2'}</span>
                {simulationContext.airResistance > 0 && (
                  <span className="bg-secondary/50 px-1.5 py-0.5 rounded">k={simulationContext.airResistance}</span>
                )}
                {simulationContext.range && (
                  <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded">R={simulationContext.range} m</span>
                )}
              </div>
            </div>

            {/* Content */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
              {loading && !recommendations && (
                <div className="flex flex-col items-center justify-center gap-3 py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">
                    {isAr ? 'جاري تحليل المحاكاة وإعداد التوصيات...' : 'Analyzing simulation and preparing recommendations...'}
                  </span>
                </div>
              )}

              {error && (
                <div className="text-center py-8">
                  <p className="text-sm text-destructive">{error}</p>
                  <button
                    onClick={fetchRecommendations}
                    className="mt-3 text-xs text-primary hover:underline"
                  >
                    {isAr ? 'إعادة المحاولة' : 'Try again'}
                  </button>
                </div>
              )}

              {recommendations && (
                <div className="prose prose-sm dark:prose-invert max-w-none text-foreground [&_h2]:text-base [&_h2]:font-bold [&_h2]:mt-6 [&_h2]:mb-3 [&_h2]:pb-2 [&_h2]:border-b [&_h2]:border-border/30 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mt-5 [&_h3]:mb-2.5 [&_ul]:text-xs [&_ul]:space-y-2 [&_ul]:my-3 [&_ol]:text-xs [&_ol]:space-y-2 [&_ol]:my-3 [&_p]:text-xs [&_p]:leading-relaxed [&_p]:text-muted-foreground [&_p]:my-2 [&_li]:text-muted-foreground [&_li]:leading-relaxed [&_strong]:text-foreground [&_code]:text-[10px] [&_code]:bg-secondary/50 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_hr]:my-4 [&_hr]:border-border/20">
                  <ReactMarkdown>{recommendations}</ReactMarkdown>
                  {loading && <span className="inline-block w-2 h-4 bg-primary/50 animate-pulse ml-0.5" />}
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
