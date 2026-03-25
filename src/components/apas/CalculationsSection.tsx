import React, { useMemo, useState, useEffect, useCallback } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { Calculator, Sigma, Atom, Wind, Zap, Camera, BarChart3, FlaskConical, Sparkles, Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import ReactMarkdown from 'react-markdown';
import { cleanLatex } from '@/utils/cleanLatex';

/* ── Types ── */

export interface CalculationPipelineInputs {
  velocity: number;
  angle: number;
  height: number;
  gravity: number;
  airResistance: number;
  mass: number;
  windSpeed?: number;
}

export interface CalculationPipelineResults {
  range: number;
  maxHeight: number;
  timeOfFlight: number;
  finalVelocity: number;
}

export interface DetectedMediaData {
  source: 'video' | 'image';
  detectedAngle?: number;
  detectedVelocity?: number;
  detectedHeight?: number;
  confidence?: number;
  objectType?: string;
}

export type ScenarioType = 'projectile' | 'free_fall' | 'horizontal_launch' | 'angled_throw';

export interface CalculationStep {
  title: string;
  formula: string;
  substitution: string;
  result: string;
  principle: string;
}

export interface CalculationPipeline {
  inputs: CalculationPipelineInputs;
  detected_from_media?: DetectedMediaData;
  computed_values: CalculationPipelineResults;
  scenario: ScenarioType;
  steps: CalculationStep[];
}

interface CalculationsSectionProps {
  lang: string;
  velocity?: number;
  angle?: number;
  height?: number;
  gravity?: number;
  airResistance?: number;
  mass?: number;
  windSpeed?: number;
  prediction?: {
    range: number;
    maxHeight: number;
    timeOfFlight: number;
    finalVelocity: number;
  } | null;
  detectedMedia?: DetectedMediaData;
}

/* ── Scenario detection ── */
function detectScenario(angle: number, velocity: number, height: number): ScenarioType {
  if (velocity === 0 || (angle === 90 && height > 0)) return 'free_fall';
  if (angle === 0) return 'horizontal_launch';
  if (angle === 90) return 'free_fall';
  return angle > 0 && angle < 90 ? 'projectile' : 'angled_throw';
}

function getScenarioLabel(scenario: ScenarioType, lang: string): string {
  const labels: Record<ScenarioType, { ar: string; en: string; fr: string }> = {
    projectile: { ar: '\u0642\u0630\u0641 \u0645\u0627\u0626\u0644', en: 'Oblique Projectile', fr: 'Projectile Oblique' },
    free_fall: { ar: '\u0633\u0642\u0648\u0637 \u062d\u0631', en: 'Free Fall', fr: 'Chute Libre' },
    horizontal_launch: { ar: '\u0642\u0630\u0641 \u0623\u0641\u0642\u064a', en: 'Horizontal Launch', fr: 'Lancer Horizontal' },
    angled_throw: { ar: '\u0631\u0645\u064a \u0628\u0632\u0627\u0648\u064a\u0629', en: 'Angled Throw', fr: 'Lancer Angulaire' },
  };
  const l = labels[scenario];
  return lang === 'ar' ? l.ar : lang === 'fr' ? l.fr : l.en;
}

/* ── KaTeX inline renderer ── */
function Latex({ math, display = false }: { math: string; display?: boolean }) {
  const html = useMemo(() => {
    try {
      return katex.renderToString(math, {
        displayMode: display,
        throwOnError: false,
        trust: true,
        strict: false,
      });
    } catch {
      return math;
    }
  }, [math, display]);

  return display ? (
    <div className="my-3 overflow-x-auto text-center" dir="ltr" dangerouslySetInnerHTML={{ __html: html }} />
  ) : (
    <span dir="ltr" dangerouslySetInnerHTML={{ __html: html }} />
  );
}

/* ── Reusable sub-components ── */
function StepCard({ step, title, principle, children }: { step: number; title: string; principle: string; children: React.ReactNode }) {
  return (
    <div className="mb-5 bg-background/60 rounded-lg border border-border/30 overflow-hidden">
      <div className="px-4 py-2.5 bg-primary/5 border-b border-border/20 flex items-center gap-2">
        <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">{step}</span>
        <h4 className="text-xs font-bold text-foreground">{title}</h4>
      </div>
      <div className="px-4 py-3 space-y-2">
        <div className="text-[10px] text-primary/80 font-medium bg-primary/5 rounded px-2 py-1 inline-block">
          {principle}
        </div>
        <div className="text-xs text-muted-foreground leading-relaxed space-y-2">
          {children}
        </div>
      </div>
    </div>
  );
}

function SectionBlock({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3 pb-2 border-b border-border">
        <span className="text-primary">{icon}</span>
        {title}
      </h3>
      {children}
    </div>
  );
}

/* ── Dynamic value box ── */
function ValueSubstitution({ label, formula, substitution, result }: {
  label: string;
  formula: string;
  substitution: string;
  result: string;
}) {
  return (
    <div className="bg-gradient-to-r from-primary/5 to-transparent rounded-lg border border-primary/20 p-3 my-2">
      <div className="text-[10px] text-primary/70 font-medium mb-1">{label}</div>
      <Latex display math={formula} />
      <div className="text-[10px] text-muted-foreground mt-1 mb-1">
        <span className="text-primary/60">&rarr;</span> <Latex math={substitution} />
      </div>
      <div className="text-xs font-mono font-bold text-primary bg-primary/10 rounded px-2 py-1 inline-block">
        = {result}
      </div>
    </div>
  );
}

/* ── Safe number formatting ── */
function fmt(v: number | undefined | null, digits = 3): string {
  if (v == null || !isFinite(v)) return '0';
  return v.toFixed(digits);
}

/* ── Build calculation pipeline ── */
function buildPipeline(
  inputs: CalculationPipelineInputs,
  prediction: CalculationPipelineResults | null,
  detectedMedia?: DetectedMediaData,
): CalculationPipeline {
  const { velocity, angle, height, gravity } = inputs;
  const rad = angle * Math.PI / 180;
  const v0x = velocity * Math.cos(rad);
  const v0y = velocity * Math.sin(rad);
  const tFlight = prediction?.timeOfFlight ?? (gravity > 0 ? (v0y + Math.sqrt(v0y * v0y + 2 * gravity * height)) / gravity : 0);
  const maxH = prediction?.maxHeight ?? (height + (v0y * v0y) / (2 * gravity));
  const range = prediction?.range ?? (v0x * tFlight);
  const vyf = v0y - gravity * tFlight;
  const vImpact = prediction?.finalVelocity ?? Math.sqrt(v0x * v0x + vyf * vyf);

  const scenario = detectScenario(angle, velocity, height);

  return {
    inputs,
    detected_from_media: detectedMedia,
    computed_values: {
      range,
      maxHeight: maxH,
      timeOfFlight: tFlight,
      finalVelocity: vImpact,
    },
    scenario,
    steps: [
      {
        title: 'Velocity decomposition',
        formula: 'v_{0x} = v_0 \\cos(\\theta), \\quad v_{0y} = v_0 \\sin(\\theta)',
        substitution: 'v_{0x} = ' + fmt(velocity) + ' \\cos(' + fmt(angle, 1) + ') = ' + fmt(v0x) + ', \\quad v_{0y} = ' + fmt(velocity) + ' \\sin(' + fmt(angle, 1) + ') = ' + fmt(v0y),
        result: 'v0x = ' + fmt(v0x) + ' m/s, v0y = ' + fmt(v0y) + ' m/s',
        principle: 'Trigonometry',
      },
      {
        title: 'Time of flight',
        formula: 't = \\frac{v_{0y} + \\sqrt{v_{0y}^2 + 2gh}}{g}',
        substitution: 't = \\frac{' + fmt(v0y) + ' + \\sqrt{' + fmt(v0y * v0y) + ' + ' + fmt(2 * gravity * height) + '}}{' + fmt(gravity) + '}',
        result: fmt(tFlight, 4) + ' s',
        principle: 'Quadratic Formula',
      },
      {
        title: 'Maximum height',
        formula: 'y_{\\max} = h + \\frac{v_{0y}^2}{2g}',
        substitution: 'y_{\\max} = ' + fmt(height) + ' + \\frac{' + fmt(v0y * v0y) + '}{' + fmt(2 * gravity) + '}',
        result: fmt(maxH, 4) + ' m',
        principle: 'Differentiation',
      },
      {
        title: 'Horizontal range',
        formula: 'R = v_{0x} \\cdot t_{\\text{flight}}',
        substitution: 'R = ' + fmt(v0x) + ' \\times ' + fmt(tFlight, 4),
        result: fmt(range, 4) + ' m',
        principle: 'Uniform Motion',
      },
      {
        title: 'Impact velocity',
        formula: 'v_{\\text{impact}} = \\sqrt{v_{x,f}^2 + v_{y,f}^2}',
        substitution: 'v_{\\text{impact}} = \\sqrt{' + fmt(v0x) + '^2 + ' + fmt(vyf) + '^2}',
        result: fmt(vImpact) + ' m/s',
        principle: 'Vector Composition',
      },
    ],
  };
}

/* ── AI Explanation Edge Function URL ── */
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const EDGE_TUTOR_URL = SUPABASE_URL + '/functions/v1/physics-tutor';

/* ═══════════════════════════════════════════════════════ */
/*  Main Calculations Section                              */
/* ═══════════════════════════════════════════════════════ */
export default function CalculationsSection({
  lang,
  velocity = 50,
  angle = 45,
  height = 10,
  gravity = 9.81,
  airResistance = 0,
  mass = 1,
  windSpeed = 0,
  prediction = null,
  detectedMedia,
}: CalculationsSectionProps) {
  const isAr = lang === 'ar';
  const isFr = lang === 'fr';
  const t = (ar: string, en: string, fr: string) => isAr ? ar : isFr ? fr : en;

  /* ── Computed values ── */
  const rad = angle * Math.PI / 180;
  const v0x = velocity * Math.cos(rad);
  const v0y = velocity * Math.sin(rad);
  const tFlight = prediction?.timeOfFlight ?? (gravity > 0 ? (v0y + Math.sqrt(v0y * v0y + 2 * gravity * height)) / gravity : 0);
  const maxH = prediction?.maxHeight ?? (height + (v0y * v0y) / (2 * gravity));
  const range = prediction?.range ?? (v0x * tFlight);
  const vyf = v0y - gravity * tFlight;
  const vImpact = prediction?.finalVelocity ?? Math.sqrt(v0x * v0x + vyf * vyf);
  const impactAngle = Math.atan2(Math.abs(vyf), v0x) * 180 / Math.PI;
  const tPeak = gravity > 0 ? v0y / gravity : 0;
  const KE0 = 0.5 * mass * velocity * velocity;
  const PE0 = mass * gravity * height;
  const E0 = KE0 + PE0;
  const KEf = 0.5 * mass * vImpact * vImpact;

  const scenario = detectScenario(angle, velocity, height);
  const scenarioLabel = getScenarioLabel(scenario, lang);

  /* ── Build pipeline for AI ── */
  const pipeline = useMemo(() => buildPipeline(
    { velocity, angle, height, gravity, airResistance, mass, windSpeed },
    prediction ? { range: prediction.range, maxHeight: prediction.maxHeight, timeOfFlight: prediction.timeOfFlight, finalVelocity: prediction.finalVelocity } : null,
    detectedMedia,
  ), [velocity, angle, height, gravity, airResistance, mass, windSpeed, prediction, detectedMedia]);

  /* ── AI Explanation state ── */
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [showAiExplanation, setShowAiExplanation] = useState(false);

  const generateAIExplanation = useCallback(async () => {
    setAiLoading(true);
    setAiError(null);
    setAiExplanation(null);

    const langName = lang === 'ar' ? 'Arabic' : lang === 'fr' ? 'French' : 'English';

    const systemPrompt = 'You are a physics professor explaining projectile motion calculations. ' +
      'Given the following calculation pipeline, provide a clear step-by-step explanation. ' +
      'Use the ACTUAL values provided \u2014 do NOT use placeholders or generic examples. ' +
      'Adapt your explanation to the specific scenario type. ' +
      'Use LaTeX notation for equations where helpful (wrap in $...$ for inline or $$...$$ for display). ' +
      'Respond in ' + langName + '. ' +
      'Keep the explanation concise but thorough. Explain WHY each step matters physically.';

    const mediaSrc = pipeline.detected_from_media
      ? 'Source: Detected from ' + pipeline.detected_from_media.source + ' (confidence: ' + (pipeline.detected_from_media.confidence ?? '?') + '%)'
      : 'Source: Manual parameters';

    const windLine = pipeline.inputs.windSpeed ? '\n- Wind speed: ' + pipeline.inputs.windSpeed + ' m/s' : '';
    const mediaFocus = pipeline.detected_from_media ? '\n4. Note that values were detected from media analysis' : '';

    const stepsText = pipeline.steps.map((s, i) => (i + 1) + '. ' + s.title + ': ' + s.formula + ' => ' + s.result).join('\n');

    const userMessage = 'Explain this physics calculation step by step:\n\n' +
      'Scenario: ' + pipeline.scenario + '\n' +
      mediaSrc + '\n\n' +
      'Inputs:\n' +
      '- Initial velocity (v0): ' + pipeline.inputs.velocity + ' m/s\n' +
      '- Launch angle (theta): ' + pipeline.inputs.angle + ' degrees\n' +
      '- Initial height (h): ' + pipeline.inputs.height + ' m\n' +
      '- Gravity (g): ' + pipeline.inputs.gravity + ' m/s^2\n' +
      '- Air resistance (k): ' + pipeline.inputs.airResistance + '\n' +
      '- Mass (m): ' + pipeline.inputs.mass + ' kg' + windLine + '\n\n' +
      'Computed Results:\n' +
      '- Range: ' + fmt(pipeline.computed_values.range, 4) + ' m\n' +
      '- Max Height: ' + fmt(pipeline.computed_values.maxHeight, 4) + ' m\n' +
      '- Time of Flight: ' + fmt(pipeline.computed_values.timeOfFlight, 4) + ' s\n' +
      '- Impact Velocity: ' + fmt(pipeline.computed_values.finalVelocity, 3) + ' m/s\n\n' +
      'Steps to explain:\n' + stepsText + '\n\n' +
      'Focus on:\n' +
      '1. Explain the physics behind each step\n' +
      '2. Show the actual substitutions with the given values\n' +
      '3. Highlight what makes this ' + pipeline.scenario + ' scenario special' + mediaFocus;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
      };
      if (token) headers['Authorization'] = 'Bearer ' + token;

      const resp = await fetch(EDGE_TUTOR_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage },
          ],
          systemPrompt,
          lang,
          temperature: 0.3,
          max_tokens: 2000,
        }),
      });

      if (!resp.ok) {
        throw new Error('AI request failed: ' + resp.status);
      }

      if (resp.body) {
        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        let buf = '';

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });

          let idx: number;
          while ((idx = buf.indexOf('\n')) !== -1) {
            let line = buf.slice(0, idx);
            buf = buf.slice(idx + 1);
            if (line.endsWith('\r')) line = line.slice(0, -1);
            if (!line.startsWith('data: ')) continue;

            const json = line.slice(6).trim();
            if (!json || json === '[DONE]') continue;

            try {
              const parsed = JSON.parse(json);
              const content = parsed?.choices?.[0]?.delta?.content;
              if (content) {
                fullText += content;
                setAiExplanation(cleanLatex(fullText));
              }
            } catch {
              buf = line + '\n' + buf;
              break;
            }
          }
        }

        if (!fullText) {
          setAiExplanation(getLocalExplanation(pipeline, lang));
        }
      } else {
        const data = await resp.json();
        const content = data?.choices?.[0]?.message?.content || data?.content || '';
        setAiExplanation(cleanLatex(content));
      }
    } catch (err) {
      console.error('AI explanation error:', err);
      setAiExplanation(getLocalExplanation(pipeline, lang));
      setAiError(lang === 'ar' ? '\u062a\u0639\u0630\u0631 \u0627\u0644\u0627\u062a\u0635\u0627\u0644 \u0628\u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064a \u2014 \u062a\u0645 \u0627\u0633\u062a\u062e\u062f\u0627\u0645 \u0627\u0644\u0634\u0631\u062d \u0627\u0644\u0645\u062d\u0644\u064a' : 'AI unavailable \u2014 using local explanation');
    } finally {
      setAiLoading(false);
    }
  }, [pipeline, lang]);

  // Auto-clear AI explanation when params change
  useEffect(() => {
    setAiExplanation(null);
    setAiError(null);
    setShowAiExplanation(false);
  }, [velocity, angle, height, gravity, airResistance, mass, windSpeed]);

  return (
    <div>
      {/* ── Scenario & Context Banner ── */}
      <div className="mb-4 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-xl border border-primary/20 p-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
            <Calculator className="w-4 h-4 text-primary" />
          </div>
          <div>
            <div className="text-xs font-bold text-foreground">
              {t('\u0646\u0648\u0639 \u0627\u0644\u0633\u064a\u0646\u0627\u0631\u064a\u0648:', 'Scenario Type:', 'Type de Sc\u00e9nario:')} <span className="text-primary">{scenarioLabel}</span>
            </div>
            {detectedMedia && (
              <div className="text-[10px] text-muted-foreground mt-0.5">
                {t(
                  '\u0627\u0644\u0642\u064a\u0645 \u0645\u0643\u062a\u0634\u0641\u0629 \u0645\u0646 ' + (detectedMedia.source === 'video' ? '\u0641\u064a\u062f\u064a\u0648' : '\u0635\u0648\u0631\u0629') + ' (\u062b\u0642\u0629: ' + (detectedMedia.confidence ?? '\u2014') + '%)',
                  'Values detected from ' + detectedMedia.source + ' (confidence: ' + (detectedMedia.confidence ?? '\u2014') + '%)',
                  'Valeurs d\u00e9tect\u00e9es depuis ' + (detectedMedia.source === 'video' ? 'vid\u00e9o' : 'image') + ' (confiance: ' + (detectedMedia.confidence ?? '\u2014') + '%)'
                )}
              </div>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
          {[
            { label: 'v\u2080', value: fmt(velocity, 1) + ' m/s', desc: t('\u0627\u0644\u0633\u0631\u0639\u0629', 'Velocity', 'Vitesse') },
            { label: '\u03b8', value: fmt(angle, 1) + '\u00b0', desc: t('\u0627\u0644\u0632\u0627\u0648\u064a\u0629', 'Angle', 'Angle') },
            { label: 'h', value: fmt(height, 1) + ' m', desc: t('\u0627\u0644\u0627\u0631\u062a\u0641\u0627\u0639', 'Height', 'Hauteur') },
            { label: 'g', value: fmt(gravity, 2) + ' m/s\u00b2', desc: t('\u0627\u0644\u062c\u0627\u0630\u0628\u064a\u0629', 'Gravity', 'Gravit\u00e9') },
          ].map(({ label, value, desc }) => (
            <div key={label} className="bg-background/80 rounded-lg p-2 text-center border border-border/30">
              <div className="text-[9px] text-muted-foreground">{desc}</div>
              <div className="text-xs font-mono font-bold text-foreground">{label} = {value}</div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
          {[
            { label: 'R', value: fmt(range, 2) + ' m', desc: t('\u0627\u0644\u0645\u062f\u0649', 'Range', 'Port\u00e9e'), color: 'text-blue-500' },
            { label: 'H_max', value: fmt(maxH, 2) + ' m', desc: t('\u0623\u0642\u0635\u0649 \u0627\u0631\u062a\u0641\u0627\u0639', 'Max Height', 'Haut. Max'), color: 'text-green-500' },
            { label: 't', value: fmt(tFlight, 3) + ' s', desc: t('\u0632\u0645\u0646 \u0627\u0644\u0637\u064a\u0631\u0627\u0646', 'Flight Time', 'Temps Vol'), color: 'text-amber-500' },
            { label: 'v_f', value: fmt(vImpact, 2) + ' m/s', desc: t('\u0633\u0631\u0639\u0629 \u0627\u0644\u0627\u0635\u0637\u062f\u0627\u0645', 'Impact V', 'V Impact'), color: 'text-red-500' },
          ].map(({ label, value, desc, color }) => (
            <div key={label} className="bg-background/80 rounded-lg p-2 text-center border border-border/30">
              <div className="text-[9px] text-muted-foreground">{desc}</div>
              <div className={'text-xs font-mono font-bold ' + color}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Section Header ── */}
      <h3 className="text-base font-bold text-foreground flex items-center gap-2 mb-4 pb-2 border-b border-border">
        <span className="text-primary"><Calculator className="w-5 h-5" /></span>
        {t('\u0643\u064a\u0641 \u062a\u0645 \u0627\u0644\u062d\u0633\u0627\u0628 \u2014 \u0627\u0644\u0627\u0634\u062a\u0642\u0627\u0642\u0627\u062a \u0648\u0627\u0644\u0645\u0639\u0627\u062f\u0644\u0627\u062a', 'How Calculations Were Made \u2014 Derivations & Equations', 'Comment les Calculs Ont \u00c9t\u00e9 Faits \u2014 D\u00e9rivations & \u00c9quations')}
      </h3>
      <p className="text-xs text-muted-foreground mb-6 leading-relaxed">
        {t(
          '\u064a\u0634\u0631\u062d \u0647\u0630\u0627 \u0627\u0644\u0642\u0633\u0645 \u0628\u0627\u0644\u062a\u0641\u0635\u064a\u0644 \u062c\u0645\u064a\u0639 \u0627\u0644\u0627\u0634\u062a\u0642\u0627\u0642\u0627\u062a \u0648\u0627\u0644\u062d\u0633\u0627\u0628\u0627\u062a \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645\u0629 \u0641\u064a APAS \u0644\u0644\u0633\u064a\u0646\u0627\u0631\u064a\u0648 \u0627\u0644\u062d\u0627\u0644\u064a (' + scenarioLabel + ') \u0645\u0639 \u0627\u0644\u0642\u064a\u0645 \u0627\u0644\u0641\u0639\u0644\u064a\u0629 \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645\u0629.',
          'This section explains in detail all derivations and calculations used in APAS for the current scenario (' + scenarioLabel + ') with the actual values used.',
          'Cette section explique en d\u00e9tail toutes les d\u00e9rivations et calculs utilis\u00e9s dans APAS pour le sc\u00e9nario actuel (' + scenarioLabel + ') avec les valeurs r\u00e9elles utilis\u00e9es.'
        )}
      </p>

      {/* 1. VELOCITY DECOMPOSITION */}
      <SectionBlock
        icon={<Sigma className="w-4 h-4" />}
        title={t('\u0661. \u062a\u062d\u0644\u064a\u0644 \u0627\u0644\u0633\u0631\u0639\u0629 \u0627\u0644\u0627\u0628\u062a\u062f\u0627\u0626\u064a\u0629', '1. Initial Velocity Decomposition', '1. D\u00e9composition de la Vitesse Initiale')}
      >
        <StepCard
          step={1}
          title={t('\u0625\u0633\u0642\u0627\u0637 \u0645\u062a\u062c\u0647 \u0627\u0644\u0633\u0631\u0639\u0629 \u0639\u0644\u0649 \u0627\u0644\u0645\u062d\u0627\u0648\u0631', 'Projecting the Velocity Vector onto Axes', 'Projection du Vecteur Vitesse sur les Axes')}
          principle={t('\ud83d\udd2c \u0627\u0644\u0645\u0628\u062f\u0623: \u062d\u0633\u0627\u0628 \u0627\u0644\u0645\u062b\u0644\u062b\u0627\u062a \u2014 \u0625\u0633\u0642\u0627\u0637 \u0627\u0644\u0645\u062a\u062c\u0647\u0627\u062a', '\ud83d\udd2c Principle: Trigonometry \u2014 Vector Projection', '\ud83d\udd2c Principe: Trigonom\u00e9trie \u2014 Projection Vectorielle')}
        >
          <p>{t(
            '\u064a\u062a\u0645 \u062a\u062d\u0644\u064a\u0644 \u0633\u0631\u0639\u0629 \u0627\u0644\u0625\u0637\u0644\u0627\u0642 \u0627\u0644\u0627\u0628\u062a\u062f\u0627\u0626\u064a\u0629 v\u2080 = ' + fmt(velocity, 1) + ' \u0645/\u062b \u0625\u0644\u0649 \u0645\u0631\u0643\u0628\u062a\u064a\u0646 \u0645\u062a\u0639\u0627\u0645\u062f\u062a\u064a\u0646 \u0628\u0627\u0633\u062a\u062e\u062f\u0627\u0645 \u0632\u0627\u0648\u064a\u0629 \u0627\u0644\u0625\u0637\u0644\u0627\u0642 \u03b8 = ' + fmt(angle, 1) + '\u00b0:',
            'The initial launch velocity v\u2080 = ' + fmt(velocity, 1) + ' m/s is decomposed into two perpendicular components using the launch angle \u03b8 = ' + fmt(angle, 1) + '\u00b0:',
            'La vitesse initiale v\u2080 = ' + fmt(velocity, 1) + ' m/s est d\u00e9compos\u00e9e en deux composantes perpendiculaires avec l\'angle \u03b8 = ' + fmt(angle, 1) + '\u00b0:'
          )}</p>
          <ValueSubstitution
            label={t('\u0627\u0644\u0645\u0631\u0643\u0628\u0629 \u0627\u0644\u0623\u0641\u0642\u064a\u0629', 'Horizontal Component', 'Composante Horizontale')}
            formula="v_{0x} = v_0 \cos(\theta)"
            substitution={'v_{0x} = ' + fmt(velocity, 1) + ' \\times \\cos(' + fmt(angle, 1) + '\u00b0) = ' + fmt(v0x)}
            result={fmt(v0x) + ' m/s'}
          />
          <ValueSubstitution
            label={t('\u0627\u0644\u0645\u0631\u0643\u0628\u0629 \u0627\u0644\u0631\u0623\u0633\u064a\u0629', 'Vertical Component', 'Composante Verticale')}
            formula="v_{0y} = v_0 \sin(\theta)"
            substitution={'v_{0y} = ' + fmt(velocity, 1) + ' \\times \\sin(' + fmt(angle, 1) + '\u00b0) = ' + fmt(v0y)}
            result={fmt(v0y) + ' m/s'}
          />
          {scenario === 'horizontal_launch' && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-2 mt-2 text-[11px] text-amber-700 dark:text-amber-400">
              {t(
                '\u26a1 \u0641\u064a \u0627\u0644\u0642\u0630\u0641 \u0627\u0644\u0623\u0641\u0642\u064a: v\u2080y = 0 \u2014 \u0644\u0627 \u064a\u0648\u062c\u062f \u0645\u0631\u0643\u0628\u0629 \u0631\u0623\u0633\u064a\u0629 \u0627\u0628\u062a\u062f\u0627\u0626\u064a\u0629.',
                '\u26a1 In horizontal launch: v\u2080y = 0 \u2014 no initial vertical component.',
                '\u26a1 En lancer horizontal: v\u2080y = 0 \u2014 pas de composante verticale initiale.'
              )}
            </div>
          )}
          {scenario === 'free_fall' && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-2 mt-2 text-[11px] text-amber-700 dark:text-amber-400">
              {t(
                '\u26a1 \u0641\u064a \u0627\u0644\u0633\u0642\u0648\u0637 \u0627\u0644\u062d\u0631: v\u2080x = 0 \u2014 \u0627\u0644\u062d\u0631\u0643\u0629 \u0631\u0623\u0633\u064a\u0629 \u0641\u0642\u0637.',
                '\u26a1 In free fall: v\u2080x = 0 \u2014 motion is purely vertical.',
                '\u26a1 En chute libre: v\u2080x = 0 \u2014 mouvement purement vertical.'
              )}
            </div>
          )}
          <p>{t(
            '\u062d\u064a\u062b \u03b8 \u0647\u064a \u0632\u0627\u0648\u064a\u0629 \u0627\u0644\u0625\u0637\u0644\u0627\u0642 \u0628\u0627\u0644\u0631\u0627\u062f\u064a\u0627\u0646. \u0646\u062d\u0648\u0651\u0644 \u0645\u0646 \u0627\u0644\u062f\u0631\u062c\u0627\u062a \u0625\u0644\u0649 \u0627\u0644\u0631\u0627\u062f\u064a\u0627\u0646:',
            'Where \u03b8 is the launch angle in radians. We convert from degrees to radians:',
            'O\u00f9 \u03b8 est l\'angle en radians. Conversion des degr\u00e9s en radians:'
          )}</p>
          <Latex display math={'\\theta_{\\text{rad}} = ' + fmt(angle, 1) + '\u00b0 \\times \\frac{\\pi}{180} = ' + fmt(rad, 4) + ' \\text{ rad}'} />
        </StepCard>
      </SectionBlock>

      {/* 2. EQUATIONS OF MOTION */}
      <SectionBlock
        icon={<Atom className="w-4 h-4" />}
        title={t('\u0662. \u0645\u0639\u0627\u062f\u0644\u0627\u062a \u0627\u0644\u062d\u0631\u0643\u0629', '2. Equations of Motion', '2. \u00c9quations du Mouvement')}
      >
        <StepCard
          step={2}
          title={t('\u0645\u0639\u0627\u062f\u0644\u0627\u062a \u0627\u0644\u062d\u0631\u0643\u0629 \u0627\u0644\u0643\u0644\u0627\u0633\u064a\u0643\u064a\u0629 (\u0628\u062f\u0648\u0646 \u0645\u0642\u0627\u0648\u0645\u0629 \u0647\u0648\u0627\u0621)', 'Classical Equations of Motion (No Air Resistance)', '\u00c9quations Classiques du Mouvement (Sans R\u00e9sistance)')}
          principle={t('\ud83d\udd2c \u0627\u0644\u0645\u0628\u062f\u0623: \u0642\u0648\u0627\u0646\u064a\u0646 \u0646\u064a\u0648\u062a\u0646 \u0644\u0644\u062d\u0631\u0643\u0629 \u2014 \u0627\u0644\u0642\u0627\u0646\u0648\u0646 \u0627\u0644\u062b\u0627\u0646\u064a', '\ud83d\udd2c Principle: Newton\'s Laws of Motion \u2014 Second Law', '\ud83d\udd2c Principe: Lois de Newton \u2014 Deuxi\u00e8me Loi')}
        >
          <p>{t(
            '\u0627\u0633\u062a\u062e\u062f\u0645\u0646\u0627 \u0642\u0648\u0627\u0646\u064a\u0646 \u0646\u064a\u0648\u062a\u0646: \u0627\u0644\u0642\u0648\u0629 \u0627\u0644\u0648\u062d\u064a\u062f\u0629 \u0627\u0644\u0645\u0624\u062b\u0631\u0629 \u0647\u064a \u0627\u0644\u062c\u0627\u0630\u0628\u064a\u0629 \u0641\u064a \u0627\u0644\u0627\u062a\u062c\u0627\u0647 \u0627\u0644\u0631\u0623\u0633\u064a. \u0627\u0644\u062d\u0631\u0643\u0629 \u0627\u0644\u0623\u0641\u0642\u064a\u0629 \u0645\u0646\u062a\u0638\u0645\u0629:',
            'We used Newton\'s laws: the only force acting is gravity in the vertical direction. Horizontal motion is uniform:',
            'Nous utilisons les lois de Newton: seule la gravit\u00e9 agit verticalement. Le mouvement horizontal est uniforme:'
          )}</p>
          <Latex display math={'F = ma \\quad \\Rightarrow \\quad a_x = 0, \\quad a_y = -g = -' + fmt(gravity, 2) + ' \\text{ m/s}^2'} />
          <p>{t('\u0628\u0627\u0644\u062a\u0643\u0627\u0645\u0644 \u0646\u062d\u0635\u0644 \u0639\u0644\u0649 \u0645\u0639\u0627\u062f\u0644\u0627\u062a \u0627\u0644\u0645\u0648\u0636\u0639:', 'Integrating, we get the position equations:', 'En int\u00e9grant, nous obtenons les \u00e9quations de position:')}</p>
          <Latex display math={'x(t) = x_0 + ' + fmt(v0x) + ' \\cdot t'} />
          <Latex display math={'y(t) = ' + fmt(height, 1) + ' + ' + fmt(v0y) + ' \\cdot t - \\frac{1}{2} \\times ' + fmt(gravity, 2) + ' \\cdot t^2'} />
          <p>{t(
            '\u062d\u064a\u062b h = ' + fmt(height, 1) + ' \u0645 \u0647\u0648 \u0627\u0631\u062a\u0641\u0627\u0639 \u0646\u0642\u0637\u0629 \u0627\u0644\u0625\u0637\u0644\u0627\u0642 \u0648 g = ' + fmt(gravity, 2) + ' \u0645/\u062b\u00b2 \u0647\u0648 \u062a\u0633\u0627\u0631\u0639 \u0627\u0644\u062c\u0627\u0630\u0628\u064a\u0629.',
            'Where h = ' + fmt(height, 1) + ' m is the launch height and g = ' + fmt(gravity, 2) + ' m/s\u00b2 is gravitational acceleration.',
            'O\u00f9 h = ' + fmt(height, 1) + ' m est la hauteur de lancement et g = ' + fmt(gravity, 2) + ' m/s\u00b2 est l\'acc\u00e9l\u00e9ration gravitationnelle.'
          )}</p>
          <p>{t('\u0648\u0645\u0639\u0627\u062f\u0644\u0627\u062a \u0627\u0644\u0633\u0631\u0639\u0629:', 'And the velocity equations:', 'Et les \u00e9quations de vitesse:')}</p>
          <Latex display math={'v_x(t) = ' + fmt(v0x) + ' \\text{ m/s}'} />
          <Latex display math={'v_y(t) = ' + fmt(v0y) + ' - ' + fmt(gravity, 2) + ' \\cdot t'} />
        </StepCard>

        <StepCard
          step={3}
          title={t('\u0632\u0645\u0646 \u0627\u0644\u0637\u064a\u0631\u0627\u0646', 'Time of Flight', 'Temps de Vol')}
          principle={t('\ud83d\udd2c \u0627\u0644\u0645\u0628\u062f\u0623: \u062d\u0644 \u0627\u0644\u0645\u0639\u0627\u062f\u0644\u0629 \u0627\u0644\u062a\u0631\u0628\u064a\u0639\u064a\u0629 \u2014 \u0635\u064a\u063a\u0629 \u0627\u0644\u062c\u0630\u0648\u0631', '\ud83d\udd2c Principle: Quadratic Equation \u2014 Quadratic Formula', '\ud83d\udd2c Principe: \u00c9quation Quadratique \u2014 Formule des Racines')}
        >
          <p>{t(
            '\u0644\u0625\u064a\u062c\u0627\u062f \u0632\u0645\u0646 \u0627\u0644\u0637\u064a\u0631\u0627\u0646\u060c \u0646\u0636\u0639 y(t) = 0 \u0648\u0646\u062d\u0644 \u0627\u0644\u0645\u0639\u0627\u062f\u0644\u0629 \u0627\u0644\u062a\u0631\u0628\u064a\u0639\u064a\u0629:',
            'To find flight time, we set y(t) = 0 and solve the quadratic equation:',
            'Pour trouver le temps de vol, on pose y(t) = 0 et on r\u00e9sout l\'\u00e9quation quadratique:'
          )}</p>
          <Latex display math={fmt(height, 1) + ' + ' + fmt(v0y) + ' \\cdot t - \\frac{1}{2} \\times ' + fmt(gravity, 2) + ' \\cdot t^2 = 0'} />
          <ValueSubstitution
            label={t('\u0632\u0645\u0646 \u0627\u0644\u0637\u064a\u0631\u0627\u0646', 'Time of Flight', 'Temps de Vol')}
            formula="t = \frac{v_{0y} + \sqrt{v_{0y}^2 + 2gh}}{g}"
            substitution={'t = \\frac{' + fmt(v0y) + ' + \\sqrt{' + fmt(v0y * v0y, 2) + ' + ' + fmt(2 * gravity * height, 2) + '}}{' + fmt(gravity, 2) + '}'}
            result={fmt(tFlight, 4) + ' s'}
          />
          <p>{t(
            '\u0646\u0623\u062e\u0630 \u0627\u0644\u062c\u0630\u0631 \u0627\u0644\u0645\u0648\u062c\u0628 \u0641\u0642\u0637 \u0644\u0623\u0646 \u0627\u0644\u0632\u0645\u0646 \u0644\u0627 \u064a\u0645\u0643\u0646 \u0623\u0646 \u064a\u0643\u0648\u0646 \u0633\u0627\u0644\u0628\u0627\u064b.',
            'We take the positive root only since time cannot be negative.',
            'On prend la racine positive car le temps ne peut pas \u00eatre n\u00e9gatif.'
          )}</p>
        </StepCard>

        <StepCard
          step={4}
          title={t('\u0623\u0642\u0635\u0649 \u0627\u0631\u062a\u0641\u0627\u0639', 'Maximum Height', 'Hauteur Maximale')}
          principle={t('\ud83d\udd2c \u0627\u0644\u0645\u0628\u062f\u0623: \u0627\u0644\u062a\u0641\u0627\u0636\u0644 \u2014 \u0625\u064a\u062c\u0627\u062f \u0627\u0644\u0642\u064a\u0645\u0629 \u0627\u0644\u0642\u0635\u0648\u0649', '\ud83d\udd2c Principle: Differentiation \u2014 Finding Maximum', '\ud83d\udd2c Principe: Diff\u00e9rentiation \u2014 Trouver le Maximum')}
        >
          <p>{t(
            '\u0644\u0625\u064a\u062c\u0627\u062f \u0623\u0642\u0635\u0649 \u0627\u0631\u062a\u0641\u0627\u0639\u060c \u0646\u0634\u062a\u0642 y(t) \u0628\u0627\u0644\u0646\u0633\u0628\u0629 \u0644\u0644\u0632\u0645\u0646 \u0648\u0646\u0633\u0627\u0648\u064a \u0628\u0635\u0641\u0631:',
            'To find maximum height, we differentiate y(t) with respect to time and set to zero:',
            'Pour trouver la hauteur maximale, on d\u00e9rive y(t) et on \u00e9gale \u00e0 z\u00e9ro:'
          )}</p>
          <Latex display math={'\\frac{dy}{dt} = ' + fmt(v0y) + ' - ' + fmt(gravity, 2) + ' \\cdot t = 0'} />
          <ValueSubstitution
            label={t('\u0632\u0645\u0646 \u0627\u0644\u0648\u0635\u0648\u0644 \u0644\u0644\u0642\u0645\u0629', 'Time to Peak', 'Temps au Sommet')}
            formula="t_{\text{peak}} = \frac{v_{0y}}{g}"
            substitution={'t_{\\text{peak}} = \\frac{' + fmt(v0y) + '}{' + fmt(gravity, 2) + '}'}
            result={fmt(tPeak, 4) + ' s'}
          />
          <p>{t('\u0628\u0627\u0644\u062a\u0639\u0648\u064a\u0636 \u0641\u064a \u0645\u0639\u0627\u062f\u0644\u0629 \u0627\u0644\u0645\u0648\u0636\u0639:', 'Substituting into position equation:', 'En substituant dans l\'\u00e9quation de position:')}</p>
          <ValueSubstitution
            label={t('\u0623\u0642\u0635\u0649 \u0627\u0631\u062a\u0641\u0627\u0639', 'Maximum Height', 'Hauteur Maximale')}
            formula="y_{\max} = h + \frac{v_{0y}^2}{2g}"
            substitution={'y_{\\max} = ' + fmt(height, 1) + ' + \\frac{' + fmt(v0y) + '^2}{2 \\times ' + fmt(gravity, 2) + '}'}
            result={fmt(maxH, 4) + ' m'}
          />
        </StepCard>

        <StepCard
          step={5}
          title={t('\u0627\u0644\u0645\u062f\u0649 \u0627\u0644\u0623\u0641\u0642\u064a', 'Horizontal Range', 'Port\u00e9e Horizontale')}
          principle={t('\ud83d\udd2c \u0627\u0644\u0645\u0628\u062f\u0623: \u0627\u0644\u062d\u0631\u0643\u0629 \u0627\u0644\u0645\u0646\u062a\u0638\u0645\u0629 \u0641\u064a \u0627\u0644\u0627\u062a\u062c\u0627\u0647 \u0627\u0644\u0623\u0641\u0642\u064a', '\ud83d\udd2c Principle: Uniform Motion in the Horizontal Direction', '\ud83d\udd2c Principe: Mouvement Uniforme Horizontal')}
        >
          <p>{t(
            '\u0627\u0644\u0645\u062f\u0649 \u0647\u0648 \u0627\u0644\u0645\u0633\u0627\u0641\u0629 \u0627\u0644\u0623\u0641\u0642\u064a\u0629 \u0627\u0644\u0645\u0642\u0637\u0648\u0639\u0629 \u062e\u0644\u0627\u0644 \u0632\u0645\u0646 \u0627\u0644\u0637\u064a\u0631\u0627\u0646 \u0627\u0644\u0643\u0627\u0645\u0644:',
            'Range is the horizontal distance traveled during the full flight time:',
            'La port\u00e9e est la distance horizontale parcourue pendant le temps de vol total:'
          )}</p>
          <ValueSubstitution
            label={t('\u0627\u0644\u0645\u062f\u0649 \u0627\u0644\u0623\u0641\u0642\u064a', 'Horizontal Range', 'Port\u00e9e Horizontale')}
            formula="R = v_{0x} \cdot t_{\text{flight}}"
            substitution={'R = ' + fmt(v0x) + ' \\times ' + fmt(tFlight, 4)}
            result={fmt(range, 4) + ' m'}
          />
          {height === 0 && airResistance === 0 && (
            <>
              <p>{t('\u0641\u064a \u0627\u0644\u062d\u0627\u0644\u0629 \u0627\u0644\u0645\u062b\u0627\u0644\u064a\u0629 (h = 0):', 'In the ideal case (h = 0):', 'Dans le cas id\u00e9al (h = 0):')}</p>
              <Latex display math={'R = \\frac{v_0^2 \\sin(2\\theta)}{g} = \\frac{' + fmt(velocity, 1) + '^2 \\times \\sin(' + fmt(2 * angle, 1) + '\u00b0)}{' + fmt(gravity, 2) + '} = ' + fmt(velocity * velocity * Math.sin(2 * rad) / gravity, 4) + ' \\text{ m}'} />
              {angle === 45 && (
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-2 mt-2 text-[11px] text-green-700 dark:text-green-400">
                  {t(
                    '\u2713 \u0623\u0642\u0635\u0649 \u0645\u062f\u0649 \u064a\u062a\u062d\u0642\u0642 \u0639\u0646\u062f \u03b8 = 45\u00b0 \u0644\u0623\u0646 sin(90\u00b0) = 1.',
                    '\u2713 Maximum range achieved at \u03b8 = 45\u00b0 because sin(90\u00b0) = 1.',
                    '\u2713 Port\u00e9e maximale atteinte \u00e0 \u03b8 = 45\u00b0 car sin(90\u00b0) = 1.'
                  )}
                </div>
              )}
            </>
          )}
        </StepCard>

        <StepCard
          step={6}
          title={t('\u0633\u0631\u0639\u0629 \u0627\u0644\u0627\u0635\u0637\u062f\u0627\u0645', 'Impact Velocity', 'Vitesse d\'Impact')}
          principle={t('\ud83d\udd2c \u0627\u0644\u0645\u0628\u062f\u0623: \u062d\u0641\u0638 \u0627\u0644\u0637\u0627\u0642\u0629 / \u062a\u0631\u0643\u064a\u0628 \u0627\u0644\u0645\u062a\u062c\u0647\u0627\u062a', '\ud83d\udd2c Principle: Energy Conservation / Vector Composition', '\ud83d\udd2c Principe: Conservation d\'\u00c9nergie / Composition Vectorielle')}
        >
          <p>{t(
            '\u0633\u0631\u0639\u0629 \u0627\u0644\u0627\u0635\u0637\u062f\u0627\u0645 \u062a\u064f\u062d\u0633\u0628 \u0645\u0646 \u0645\u0631\u0643\u0628\u062a\u064a \u0627\u0644\u0633\u0631\u0639\u0629 \u0639\u0646\u062f \u0644\u062d\u0638\u0629 \u0627\u0644\u0648\u0635\u0648\u0644:',
            'Impact velocity is computed from velocity components at landing:',
            'La vitesse d\'impact est calcul\u00e9e \u00e0 partir des composantes \u00e0 l\'atterrissage:'
          )}</p>
          <Latex display math={'v_{x,f} = v_{0x} = ' + fmt(v0x) + ' \\text{ m/s}'} />
          <Latex display math={'v_{y,f} = v_{0y} - g \\cdot t_{\\text{flight}} = ' + fmt(v0y) + ' - ' + fmt(gravity, 2) + ' \\times ' + fmt(tFlight, 4) + ' = ' + fmt(vyf) + ' \\text{ m/s}'} />
          <ValueSubstitution
            label={t('\u0633\u0631\u0639\u0629 \u0627\u0644\u0627\u0635\u0637\u062f\u0627\u0645', 'Impact Velocity', 'Vitesse d\'Impact')}
            formula="v_{\text{impact}} = \sqrt{v_{x,f}^2 + v_{y,f}^2}"
            substitution={'v_{\\text{impact}} = \\sqrt{' + fmt(v0x) + '^2 + (' + fmt(vyf) + ')^2}'}
            result={fmt(vImpact) + ' m/s'}
          />
          <p>{t('\u0648\u0632\u0627\u0648\u064a\u0629 \u0627\u0644\u0627\u0635\u0637\u062f\u0627\u0645:', 'And the impact angle:', 'Et l\'angle d\'impact:')}</p>
          <Latex display math={'\\alpha_{\\text{impact}} = \\arctan\\left(\\frac{|v_{y,f}|}{v_{x,f}}\\right) = \\arctan\\left(\\frac{' + fmt(Math.abs(vyf)) + '}{' + fmt(v0x) + '}\\right) = ' + fmt(impactAngle, 1) + '\u00b0'} />
        </StepCard>
      </SectionBlock>

      {/* 3. AIR RESISTANCE & DRAG */}
      <SectionBlock
        icon={<Wind className="w-4 h-4" />}
        title={t('\u0663. \u0645\u0642\u0627\u0648\u0645\u0629 \u0627\u0644\u0647\u0648\u0627\u0621 \u0648\u0642\u0648\u0629 \u0627\u0644\u0633\u062d\u0628', '3. Air Resistance & Drag Force', '3. R\u00e9sistance de l\'Air & Force de Tra\u00een\u00e9e')}
      >
        {airResistance > 0 ? (
          <>
            <StepCard
              step={7}
              title={t('\u0646\u0645\u0648\u0630\u062c \u0642\u0648\u0629 \u0627\u0644\u0633\u062d\u0628', 'Drag Force Model', 'Mod\u00e8le de Force de Tra\u00een\u00e9e')}
              principle={t('\ud83d\udd2c \u0627\u0644\u0645\u0628\u062f\u0623: \u062f\u064a\u0646\u0627\u0645\u064a\u0643\u0627 \u0627\u0644\u0645\u0648\u0627\u0626\u0639 \u2014 \u0642\u0627\u0646\u0648\u0646 \u0627\u0644\u0633\u062d\u0628 \u0627\u0644\u062a\u0631\u0628\u064a\u0639\u064a', '\ud83d\udd2c Principle: Fluid Dynamics \u2014 Quadratic Drag Law', '\ud83d\udd2c Principe: Dynamique des Fluides \u2014 Loi de Tra\u00een\u00e9e Quadratique')}
            >
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-2 mb-2 text-[11px] text-blue-700 dark:text-blue-400">
                {t(
                  '\u26a1 \u0645\u0642\u0627\u0648\u0645\u0629 \u0627\u0644\u0647\u0648\u0627\u0621 \u0645\u0641\u0639\u0644\u0629 \u0628\u0645\u0639\u0627\u0645\u0644 k = ' + fmt(airResistance, 4) + ' \u2014 \u0627\u0644\u062d\u0644\u0648\u0644 \u0627\u0644\u062a\u062d\u0644\u064a\u0644\u064a\u0629 \u0644\u0627 \u062a\u0646\u0637\u0628\u0642\u060c \u064a\u064f\u0633\u062a\u062e\u062f\u0645 \u0627\u0644\u062a\u0643\u0627\u0645\u0644 \u0627\u0644\u0639\u062f\u062f\u064a.',
                  '\u26a1 Air resistance enabled with k = ' + fmt(airResistance, 4) + ' \u2014 analytical solutions don\'t apply, numerical integration is used.',
                  '\u26a1 R\u00e9sistance activ\u00e9e avec k = ' + fmt(airResistance, 4) + ' \u2014 les solutions analytiques ne s\'appliquent pas, int\u00e9gration num\u00e9rique utilis\u00e9e.'
                )}
              </div>
              <p>{t(
                '\u0639\u0646\u062f \u062a\u0641\u0639\u064a\u0644 \u0645\u0642\u0627\u0648\u0645\u0629 \u0627\u0644\u0647\u0648\u0627\u0621\u060c \u062a\u064f\u0636\u0627\u0641 \u0642\u0648\u0629 \u0633\u062d\u0628 \u062a\u062a\u0646\u0627\u0633\u0628 \u0645\u0639 \u0645\u0631\u0628\u0639 \u0627\u0644\u0633\u0631\u0639\u0629 \u0648\u062a\u0639\u0627\u0643\u0633 \u0627\u062a\u062c\u0627\u0647 \u0627\u0644\u062d\u0631\u0643\u0629:',
                'When air resistance is enabled, a drag force proportional to velocity squared is added, opposing motion:',
                'Quand la r\u00e9sistance est activ\u00e9e, une force de tra\u00een\u00e9e proportionnelle au carr\u00e9 de la vitesse est ajout\u00e9e:'
              )}</p>
              <Latex display math="F_{\text{drag}} = \frac{1}{2} C_d \rho A v_{\text{rel}}^2" />
              {(windSpeed ?? 0) > 0 && (
                <>
                  <p>{t('\u0627\u0644\u0633\u0631\u0639\u0629 \u0627\u0644\u0646\u0633\u0628\u064a\u0629 \u0645\u0639 \u0627\u0644\u0631\u064a\u0627\u062d:', 'Relative velocity with wind:', 'Vitesse relative avec le vent:')}</p>
                  <Latex display math={'v_{r,x} = v_x - v_{\\text{wind}} = v_x - ' + fmt(windSpeed ?? 0, 1) + ', \\quad v_{r,y} = v_y'} />
                </>
              )}
              <Latex display math="a_{d,x} = -\frac{F_{\text{drag}}}{m} \cdot \frac{v_{r,x}}{v_{\text{rel}}}, \quad a_{d,y} = -\frac{F_{\text{drag}}}{m} \cdot \frac{v_{r,y}}{v_{\text{rel}}}" />
            </StepCard>
          </>
        ) : (
          <div className="bg-secondary/50 rounded-lg p-4 text-center text-xs text-muted-foreground">
            {t(
              '\ud83d\udeab \u0645\u0642\u0627\u0648\u0645\u0629 \u0627\u0644\u0647\u0648\u0627\u0621 \u063a\u064a\u0631 \u0645\u0641\u0639\u0644\u0629 (k = 0) \u2014 \u064a\u062a\u0645 \u0627\u0633\u062a\u062e\u062f\u0627\u0645 \u0627\u0644\u062d\u0644 \u0627\u0644\u062a\u062d\u0644\u064a\u0644\u064a \u0627\u0644\u062f\u0642\u064a\u0642.',
              '\ud83d\udeab Air resistance is disabled (k = 0) \u2014 exact analytical solution is used.',
              '\ud83d\udeab R\u00e9sistance d\u00e9sactiv\u00e9e (k = 0) \u2014 solution analytique exacte utilis\u00e9e.'
            )}
          </div>
        )}
      </SectionBlock>

      {/* 4. NUMERICAL INTEGRATION */}
      <SectionBlock
        icon={<FlaskConical className="w-4 h-4" />}
        title={t('\u0664. \u0637\u0631\u0642 \u0627\u0644\u062a\u0643\u0627\u0645\u0644 \u0627\u0644\u0639\u062f\u062f\u064a', '4. Numerical Integration Methods', '4. M\u00e9thodes d\'Int\u00e9gration Num\u00e9rique')}
      >
        <StepCard
          step={airResistance > 0 ? 8 : 7}
          title={t('\u0637\u0631\u064a\u0642\u0629 \u0623\u0648\u064a\u0644\u0631 \u0634\u0628\u0647 \u0627\u0644\u0636\u0645\u0646\u064a\u0629', 'Semi-Implicit Euler Method', 'M\u00e9thode d\'Euler Semi-Implicite')}
          principle={t('\ud83d\udd2c \u0627\u0644\u0645\u0628\u062f\u0623: \u0627\u0644\u062a\u0643\u0627\u0645\u0644 \u0627\u0644\u0634\u0628\u0647 \u0627\u0644\u0636\u0645\u0646\u064a', '\ud83d\udd2c Principle: Semi-Implicit Integration', '\ud83d\udd2c Principe: Int\u00e9gration Semi-Implicite')}
        >
          <Latex display math="\vec{a}(t) = \frac{\vec{F}(t)}{m}" />
          <Latex display math="\vec{v}(t + \Delta t) = \vec{v}(t) + \vec{a}(t) \cdot \Delta t" />
          <Latex display math="\vec{r}(t + \Delta t) = \vec{r}(t) + \vec{v}(t + \Delta t) \cdot \Delta t" />
        </StepCard>

        <StepCard
          step={airResistance > 0 ? 9 : 8}
          title={t('\u0637\u0631\u064a\u0642\u0629 \u0631\u0648\u0646\u062c-\u0643\u0648\u062a\u0627 (RK4)', 'Runge-Kutta 4th Order (RK4)', 'Runge-Kutta Ordre 4 (RK4)')}
          principle={t('\ud83d\udd2c \u0627\u0644\u0645\u0628\u062f\u0623: \u062f\u0642\u0629 \u0645\u0646 \u0627\u0644\u0631\u062a\u0628\u0629 \u0627\u0644\u0631\u0627\u0628\u0639\u0629', '\ud83d\udd2c Principle: 4th Order Accuracy', '\ud83d\udd2c Principe: Pr\u00e9cision d\'Ordre 4')}
        >
          <Latex display math="k_1 = f(t_n, y_n)" />
          <Latex display math="k_2 = f\!\left(t_n + \tfrac{\Delta t}{2},\; y_n + \tfrac{\Delta t}{2} k_1\right)" />
          <Latex display math="k_3 = f\!\left(t_n + \tfrac{\Delta t}{2},\; y_n + \tfrac{\Delta t}{2} k_2\right)" />
          <Latex display math="k_4 = f(t_n + \Delta t,\; y_n + \Delta t \cdot k_3)" />
          <Latex display math="y_{n+1} = y_n + \frac{\Delta t}{6} \left(k_1 + 2k_2 + 2k_3 + k_4\right)" />
        </StepCard>

        <StepCard
          step={airResistance > 0 ? 10 : 9}
          title={t('\u0637\u0631\u064a\u0642\u0629 AI-APAS (Velocity Verlet)', 'AI-APAS Method (Velocity Verlet)', 'M\u00e9thode AI-APAS (Velocity Verlet)')}
          principle={t('\ud83d\udd2c \u0627\u0644\u0645\u0628\u062f\u0623: \u062a\u0643\u0627\u0645\u0644 Velocity Verlet', '\ud83d\udd2c Principle: Velocity Verlet Integration', '\ud83d\udd2c Principe: Int\u00e9gration Velocity Verlet')}
        >
          <Latex display math="\vec{r}(t + \Delta t) = \vec{r}(t) + \vec{v}(t) \cdot \Delta t + \frac{1}{2} \vec{a}(t) \cdot \Delta t^2" />
          <Latex display math="\vec{a}(t + \Delta t) = \frac{\vec{F}\big(\vec{r}(t+\Delta t), \vec{v}(t) + \vec{a}(t)\Delta t\big)}{m}" />
          <Latex display math="\vec{v}(t + \Delta t) = \vec{v}(t) + \frac{1}{2}\big[\vec{a}(t) + \vec{a}(t + \Delta t)\big] \cdot \Delta t" />
        </StepCard>
      </SectionBlock>

      {/* 5. ENERGY */}
      <SectionBlock
        icon={<Zap className="w-4 h-4" />}
        title={t('\u0665. \u062d\u0633\u0627\u0628\u0627\u062a \u0627\u0644\u0637\u0627\u0642\u0629', '5. Energy Calculations', '5. Calculs d\'\u00c9nergie')}
      >
        <StepCard
          step={airResistance > 0 ? 11 : 10}
          title={t('\u0627\u0644\u0637\u0627\u0642\u0629 \u0627\u0644\u062d\u0631\u0643\u064a\u0629 \u0648\u0627\u0644\u0643\u0627\u0645\u0646\u0629 \u0648\u0627\u0644\u0643\u0644\u064a\u0629', 'Kinetic, Potential, and Total Energy', '\u00c9nergie Cin\u00e9tique, Potentielle et Totale')}
          principle={t('\ud83d\udd2c \u0627\u0644\u0645\u0628\u062f\u0623: \u062d\u0641\u0638 \u0627\u0644\u0637\u0627\u0642\u0629 \u0627\u0644\u0645\u064a\u0643\u0627\u0646\u064a\u0643\u064a\u0629', '\ud83d\udd2c Principle: Conservation of Mechanical Energy', '\ud83d\udd2c Principe: Conservation de l\'\u00c9nergie M\u00e9canique')}
        >
          <ValueSubstitution
            label={t('\u0627\u0644\u0637\u0627\u0642\u0629 \u0627\u0644\u062d\u0631\u0643\u064a\u0629', 'Kinetic Energy', '\u00c9nergie Cin\u00e9tique')}
            formula="KE_0 = \frac{1}{2} m v_0^2"
            substitution={'KE_0 = \\frac{1}{2} \\times ' + fmt(mass, 2) + ' \\times ' + fmt(velocity, 1) + '^2'}
            result={fmt(KE0, 2) + ' J'}
          />
          <ValueSubstitution
            label={t('\u0627\u0644\u0637\u0627\u0642\u0629 \u0627\u0644\u0643\u0627\u0645\u0646\u0629', 'Potential Energy', '\u00c9nergie Potentielle')}
            formula="PE_0 = m g h"
            substitution={'PE_0 = ' + fmt(mass, 2) + ' \\times ' + fmt(gravity, 2) + ' \\times ' + fmt(height, 1)}
            result={fmt(PE0, 2) + ' J'}
          />
          <Latex display math={'E_0 = KE_0 + PE_0 = ' + fmt(KE0, 2) + ' + ' + fmt(PE0, 2) + ' = ' + fmt(E0, 2) + ' \\text{ J}'} />

          {airResistance === 0 ? (
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-2 mt-2 text-[11px] text-green-700 dark:text-green-400">
              {t(
                '\u2713 \u0628\u062f\u0648\u0646 \u0645\u0642\u0627\u0648\u0645\u0629 \u0647\u0648\u0627\u0621: \u0627\u0644\u0637\u0627\u0642\u0629 \u0627\u0644\u0645\u064a\u0643\u0627\u0646\u064a\u0643\u064a\u0629 \u0645\u062d\u0641\u0648\u0638\u0629.',
                '\u2713 Without air resistance: mechanical energy is conserved.',
                '\u2713 Sans r\u00e9sistance: l\'\u00e9nergie m\u00e9canique est conserv\u00e9e.'
              )}
            </div>
          ) : (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-2 mt-2 text-[11px] text-amber-700 dark:text-amber-400">
              {t(
                '\u26a0\ufe0f \u0645\u0639 \u0645\u0642\u0627\u0648\u0645\u0629 \u0627\u0644\u0647\u0648\u0627\u0621: \u0627\u0644\u0637\u0627\u0642\u0629 \u062a\u062a\u0646\u0627\u0642\u0635. KE \u0639\u0646\u062f \u0627\u0644\u0627\u0635\u0637\u062f\u0627\u0645 \u2248 ' + fmt(KEf, 2) + ' J',
                '\u26a0\ufe0f With air resistance: energy decreases. KE at impact \u2248 ' + fmt(KEf, 2) + ' J',
                '\u26a0\ufe0f Avec r\u00e9sistance: l\'\u00e9nergie diminue. KE \u00e0 l\'impact \u2248 ' + fmt(KEf, 2) + ' J'
              )}
            </div>
          )}
        </StepCard>
      </SectionBlock>

      {/* 6. AI VISION */}
      <SectionBlock
        icon={<Camera className="w-4 h-4" />}
        title={t('\u0666. \u062a\u062d\u0644\u064a\u0644 \u0627\u0644\u0641\u064a\u062f\u064a\u0648 \u0648\u0627\u0644\u0635\u0648\u0631', '6. AI Video & Image Analysis', '6. Analyse Vid\u00e9o & Image par IA')}
      >
        {detectedMedia ? (
          <StepCard
            step={airResistance > 0 ? 12 : 11}
            title={t('\u0627\u0644\u0642\u064a\u0645 \u0627\u0644\u0645\u0643\u062a\u0634\u0641\u0629 \u0645\u0646 \u0627\u0644\u0648\u0633\u0627\u0626\u0637', 'Values Detected from Media', 'Valeurs D\u00e9tect\u00e9es depuis les M\u00e9dias')}
            principle={t('\ud83d\udd2c \u0627\u0644\u0645\u0628\u062f\u0623: \u0627\u0644\u0631\u0624\u064a\u0629 \u0627\u0644\u062d\u0627\u0633\u0648\u0628\u064a\u0629', '\ud83d\udd2c Principle: Computer Vision \u2014 Trajectory Analysis', '\ud83d\udd2c Principe: Vision par Ordinateur')}
          >
            <div className="bg-violet-500/10 border border-violet-500/20 rounded-lg p-3 mb-2">
              <div className="text-[11px] font-bold text-violet-700 dark:text-violet-400 mb-2">
                {t(
                  '\u062a\u0645 \u0627\u0643\u062a\u0634\u0627\u0641 \u0627\u0644\u0642\u064a\u0645 \u0645\u0646 ' + (detectedMedia.source === 'video' ? '\u0641\u064a\u062f\u064a\u0648' : '\u0635\u0648\u0631\u0629') + ' \u0628\u062b\u0642\u0629 ' + (detectedMedia.confidence ?? '\u2014') + '%',
                  'Values detected from ' + detectedMedia.source + ' with ' + (detectedMedia.confidence ?? '\u2014') + '% confidence',
                  'Valeurs d\u00e9tect\u00e9es depuis ' + (detectedMedia.source === 'video' ? 'vid\u00e9o' : 'image') + ' avec ' + (detectedMedia.confidence ?? '\u2014') + '% de confiance'
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                {detectedMedia.detectedAngle != null && (
                  <div className="bg-background/80 rounded p-1.5">
                    <span className="text-muted-foreground">{t('\u0632\u0627\u0648\u064a\u0629:', 'Angle:', 'Angle:')}</span>{' '}
                    <span className="font-mono font-bold">{fmt(detectedMedia.detectedAngle, 1)}{'\u00b0'}</span>
                  </div>
                )}
                {detectedMedia.detectedVelocity != null && (
                  <div className="bg-background/80 rounded p-1.5">
                    <span className="text-muted-foreground">{t('\u0633\u0631\u0639\u0629:', 'Velocity:', 'Vitesse:')}</span>{' '}
                    <span className="font-mono font-bold">{fmt(detectedMedia.detectedVelocity, 1)} m/s</span>
                  </div>
                )}
                {detectedMedia.detectedHeight != null && (
                  <div className="bg-background/80 rounded p-1.5">
                    <span className="text-muted-foreground">{t('\u0627\u0631\u062a\u0641\u0627\u0639:', 'Height:', 'Hauteur:')}</span>{' '}
                    <span className="font-mono font-bold">{fmt(detectedMedia.detectedHeight, 1)} m</span>
                  </div>
                )}
                {detectedMedia.objectType && (
                  <div className="bg-background/80 rounded p-1.5">
                    <span className="text-muted-foreground">{t('\u0627\u0644\u062c\u0633\u0645:', 'Object:', 'Objet:')}</span>{' '}
                    <span className="font-mono font-bold">{detectedMedia.objectType}</span>
                  </div>
                )}
              </div>
            </div>
          </StepCard>
        ) : (
          <StepCard
            step={airResistance > 0 ? 12 : 11}
            title={t('\u062a\u062d\u0644\u064a\u0644 \u0627\u0644\u0625\u0637\u0627\u0631\u0627\u062a', 'Frame Analysis Using AI', 'Analyse de Trames avec l\'IA')}
            principle={t('\ud83d\udd2c \u0627\u0644\u0645\u0628\u062f\u0623: \u0627\u0644\u0631\u0624\u064a\u0629 \u0627\u0644\u062d\u0627\u0633\u0648\u0628\u064a\u0629', '\ud83d\udd2c Principle: Computer Vision \u2014 Frame Extraction', '\ud83d\udd2c Principe: Vision par Ordinateur')}
          >
            <p>{t(
              '\u064a\u062a\u0645 \u062a\u0642\u0633\u064a\u0645 \u0627\u0644\u0641\u064a\u062f\u064a\u0648 \u0625\u0644\u0649 \u0625\u0637\u0627\u0631\u0627\u062a \u0645\u062a\u0633\u0627\u0648\u064a\u0629 (10 \u0625\u0637\u0627\u0631\u0627\u062a) \u0639\u0628\u0631 \u0627\u0644\u062a\u0642\u0637\u064a\u0639 \u0627\u0644\u0632\u0645\u0646\u064a:',
              'The video is split into equal frames (10 frames) via temporal sampling:',
              'La vid\u00e9o est divis\u00e9e en trames \u00e9gales (10 trames) par \u00e9chantillonnage temporel:'
            )}</p>
            <Latex display math="t_{\text{frame},i} = \frac{i \cdot T_{\text{total}}}{N_{\text{frames}} - 1}, \quad i = 0, 1, \dots, N-1" />
          </StepCard>
        )}
      </SectionBlock>

      {/* 7. MODEL METRICS */}
      <SectionBlock
        icon={<BarChart3 className="w-4 h-4" />}
        title={t('\u0667. \u0645\u0642\u0627\u064a\u064a\u0633 \u062a\u0642\u064a\u064a\u0645 \u0627\u0644\u0646\u0645\u0627\u0630\u062c', '7. Model Evaluation Metrics', '7. M\u00e9triques d\'\u00c9valuation')}
      >
        <StepCard
          step={airResistance > 0 ? 13 : 12}
          title={t('\u0645\u0642\u0627\u064a\u064a\u0633 \u0627\u0644\u062f\u0642\u0629 \u0648\u0627\u0644\u062e\u0637\u0623', 'Accuracy & Error Metrics', 'M\u00e9triques de Pr\u00e9cision & Erreur')}
          principle={t('\ud83d\udd2c \u0627\u0644\u0645\u0628\u062f\u0623: \u0627\u0644\u0625\u062d\u0635\u0627\u0621', '\ud83d\udd2c Principle: Statistics \u2014 Error Metrics', '\ud83d\udd2c Principe: Statistiques')}
        >
          <p><strong>R\u00b2:</strong></p>
          <Latex display math="R^2 = 1 - \frac{\sum(y_i - \hat{y}_i)^2}{\sum(y_i - \bar{y})^2}" />
          <p><strong>MAE:</strong></p>
          <Latex display math="MAE = \frac{1}{n} \sum_{i=1}^{n} |y_i - \hat{y}_i|" />
          <p><strong>RMSE:</strong></p>
          <Latex display math="RMSE = \sqrt{\frac{1}{n} \sum_{i=1}^{n} (y_i - \hat{y}_i)^2}" />
        </StepCard>
      </SectionBlock>

      {/* AI-POWERED DYNAMIC EXPLANATION */}
      <SectionBlock
        icon={<Sparkles className="w-4 h-4" />}
        title={t('\ud83e\udd16 \u0634\u0631\u062d \u0630\u0643\u064a \u0645\u062e\u0635\u0635 \u0644\u0644\u0633\u064a\u0646\u0627\u0631\u064a\u0648 \u0627\u0644\u062d\u0627\u0644\u064a', '\ud83e\udd16 AI-Powered Explanation for Current Scenario', '\ud83e\udd16 Explication IA pour le Sc\u00e9nario Actuel')}
      >
        <div className="bg-gradient-to-br from-violet-500/5 via-primary/5 to-blue-500/5 rounded-xl border border-primary/20 p-4">
          <p className="text-xs text-muted-foreground mb-3">
            {t(
              '\u0627\u0637\u0644\u0628 \u0645\u0646 \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064a \u0634\u0631\u062d \u0627\u0644\u062d\u0633\u0627\u0628\u0627\u062a \u0627\u0644\u062d\u0627\u0644\u064a\u0629 \u0628\u0627\u0644\u0642\u064a\u0645 \u0627\u0644\u0641\u0639\u0644\u064a\u0629.',
              'Ask AI to explain the current calculations with actual values.',
              'Demandez \u00e0 l\'IA d\'expliquer les calculs avec les valeurs r\u00e9elles.'
            )}
          </p>

          {!showAiExplanation ? (
            <button
              onClick={() => { setShowAiExplanation(true); generateAIExplanation(); }}
              className="w-full px-4 py-3 text-xs font-semibold rounded-lg bg-gradient-to-r from-primary to-primary/80 text-white shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              {t('\u062a\u0648\u0644\u064a\u062f \u0634\u0631\u062d \u0630\u0643\u064a', 'Generate AI Explanation', 'G\u00e9n\u00e9rer une Explication IA')}
            </button>
          ) : (
            <div className="space-y-3">
              {aiLoading && (
                <div className="flex items-center justify-center gap-2 py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  <span className="text-xs text-muted-foreground">{t('\u062c\u0627\u0631\u064a \u0627\u0644\u062a\u0648\u0644\u064a\u062f...', 'Generating...', 'G\u00e9n\u00e9ration en cours...')}</span>
                </div>
              )}

              {aiError && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-2 text-[11px] text-amber-700 dark:text-amber-400">
                  {aiError}
                </div>
              )}

              {aiExplanation && (
                <div className="bg-background/80 rounded-lg border border-border/30 p-4 text-xs text-foreground leading-relaxed prose prose-xs max-w-none dark:prose-invert" dir={isAr ? 'rtl' : 'ltr'}>
                  <ReactMarkdown>{aiExplanation}</ReactMarkdown>
                </div>
              )}

              {!aiLoading && (
                <button
                  onClick={generateAIExplanation}
                  className="w-full px-3 py-2 text-[11px] font-medium rounded-lg border border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-all flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  {t('\u0625\u0639\u0627\u062f\u0629 \u0627\u0644\u062a\u0648\u0644\u064a\u062f', 'Regenerate', 'R\u00e9g\u00e9n\u00e9rer')}
                </button>
              )}
            </div>
          )}
        </div>
      </SectionBlock>
    </div>
  );
}

/* ── Local fallback explanation when AI is unavailable ── */
function getLocalExplanation(pipeline: CalculationPipeline, lang: string): string {
  const { inputs, computed_values, scenario } = pipeline;
  const rad = inputs.angle * Math.PI / 180;
  const v0x = inputs.velocity * Math.cos(rad);
  const v0y = inputs.velocity * Math.sin(rad);

  const scenarioName = lang === 'ar'
    ? (scenario === 'free_fall' ? '\u0633\u0642\u0648\u0637 \u062d\u0631' : scenario === 'horizontal_launch' ? '\u0642\u0630\u0641 \u0623\u0641\u0642\u064a' : '\u0642\u0630\u0641 \u0645\u0627\u0626\u0644')
    : lang === 'fr'
    ? (scenario === 'free_fall' ? 'Chute Libre' : scenario === 'horizontal_launch' ? 'Lancer Horizontal' : 'Projectile Oblique')
    : (scenario === 'free_fall' ? 'Free Fall' : scenario === 'horizontal_launch' ? 'Horizontal Launch' : 'Oblique Projectile');

  const airLine = inputs.airResistance > 0
    ? (lang === 'ar' ? '\n- \u0645\u0642\u0627\u0648\u0645\u0629 \u0627\u0644\u0647\u0648\u0627\u0621: **' + fmt(inputs.airResistance, 4) + '**'
       : lang === 'fr' ? "\n- R\u00e9sistance de l'air: **" + fmt(inputs.airResistance, 4) + '**'
       : '\n- Air resistance: **' + fmt(inputs.airResistance, 4) + '**')
    : '';

  if (lang === 'ar') {
    return '## \u0634\u0631\u062d \u0627\u0644\u062d\u0633\u0627\u0628\u0627\u062a \u2014 ' + scenarioName + '\n\n' +
      '### \u0627\u0644\u0645\u0639\u0637\u064a\u0627\u062a\n' +
      '- \u0627\u0644\u0633\u0631\u0639\u0629 \u0627\u0644\u0627\u0628\u062a\u062f\u0627\u0626\u064a\u0629: **' + fmt(inputs.velocity, 1) + ' \u0645/\u062b**\n' +
      '- \u0632\u0627\u0648\u064a\u0629 \u0627\u0644\u0625\u0637\u0644\u0627\u0642: **' + fmt(inputs.angle, 1) + '\u00b0**\n' +
      '- \u0627\u0644\u0627\u0631\u062a\u0641\u0627\u0639 \u0627\u0644\u0627\u0628\u062a\u062f\u0627\u0626\u064a: **' + fmt(inputs.height, 1) + ' \u0645**\n' +
      '- \u062a\u0633\u0627\u0631\u0639 \u0627\u0644\u062c\u0627\u0630\u0628\u064a\u0629: **' + fmt(inputs.gravity, 2) + ' \u0645/\u062b\u00b2**\n' +
      '- \u0627\u0644\u0643\u062a\u0644\u0629: **' + fmt(inputs.mass, 2) + ' \u0643\u063a**' + airLine + '\n\n' +
      '### \u0627\u0644\u062e\u0637\u0648\u0629 1: \u062a\u062d\u0644\u064a\u0644 \u0627\u0644\u0633\u0631\u0639\u0629\n' +
      '- v\u2080x = ' + fmt(inputs.velocity, 1) + ' \u00d7 cos(' + fmt(inputs.angle, 1) + '\u00b0) = **' + fmt(v0x) + ' \u0645/\u062b**\n' +
      '- v\u2080y = ' + fmt(inputs.velocity, 1) + ' \u00d7 sin(' + fmt(inputs.angle, 1) + '\u00b0) = **' + fmt(v0y) + ' \u0645/\u062b**\n\n' +
      '### \u0627\u0644\u0646\u062a\u0627\u0626\u062c \u0627\u0644\u0645\u062d\u0633\u0648\u0628\u0629\n' +
      '- \u0627\u0644\u0645\u062f\u0649: **' + fmt(computed_values.range, 2) + ' \u0645**\n' +
      '- \u0623\u0642\u0635\u0649 \u0627\u0631\u062a\u0641\u0627\u0639: **' + fmt(computed_values.maxHeight, 2) + ' \u0645**\n' +
      '- \u0632\u0645\u0646 \u0627\u0644\u0637\u064a\u0631\u0627\u0646: **' + fmt(computed_values.timeOfFlight, 3) + ' \u062b**\n' +
      '- \u0633\u0631\u0639\u0629 \u0627\u0644\u0627\u0635\u0637\u062f\u0627\u0645: **' + fmt(computed_values.finalVelocity, 2) + ' \u0645/\u062b**';
  }

  if (lang === 'fr') {
    return '## Explication des Calculs \u2014 ' + scenarioName + '\n\n' +
      '### Valeurs Donn\u00e9es\n' +
      '- Vitesse initiale: **' + fmt(inputs.velocity, 1) + ' m/s**\n' +
      '- Angle de lancement: **' + fmt(inputs.angle, 1) + '\u00b0**\n' +
      '- Hauteur initiale: **' + fmt(inputs.height, 1) + ' m**\n' +
      '- Gravit\u00e9: **' + fmt(inputs.gravity, 2) + ' m/s\u00b2**\n' +
      '- Masse: **' + fmt(inputs.mass, 2) + ' kg**' + airLine + '\n\n' +
      '### \u00c9tape 1: D\u00e9composition de la Vitesse\n' +
      '- v\u2080x = ' + fmt(inputs.velocity, 1) + ' \u00d7 cos(' + fmt(inputs.angle, 1) + '\u00b0) = **' + fmt(v0x) + ' m/s**\n' +
      '- v\u2080y = ' + fmt(inputs.velocity, 1) + ' \u00d7 sin(' + fmt(inputs.angle, 1) + '\u00b0) = **' + fmt(v0y) + ' m/s**\n\n' +
      '### R\u00e9sultats Calcul\u00e9s\n' +
      '- Port\u00e9e: **' + fmt(computed_values.range, 2) + ' m**\n' +
      '- Hauteur Max: **' + fmt(computed_values.maxHeight, 2) + ' m**\n' +
      '- Temps de Vol: **' + fmt(computed_values.timeOfFlight, 3) + ' s**\n' +
      '- Vitesse d\'Impact: **' + fmt(computed_values.finalVelocity, 2) + ' m/s**';
  }

  return '## Calculation Explanation \u2014 ' + scenarioName + '\n\n' +
    '### Given Values\n' +
    '- Initial velocity: **' + fmt(inputs.velocity, 1) + ' m/s**\n' +
    '- Launch angle: **' + fmt(inputs.angle, 1) + '\u00b0**\n' +
    '- Initial height: **' + fmt(inputs.height, 1) + ' m**\n' +
    '- Gravity: **' + fmt(inputs.gravity, 2) + ' m/s\u00b2**\n' +
    '- Mass: **' + fmt(inputs.mass, 2) + ' kg**' + airLine + '\n\n' +
    '### Step 1: Velocity Decomposition\n' +
    '- v\u2080x = ' + fmt(inputs.velocity, 1) + ' \u00d7 cos(' + fmt(inputs.angle, 1) + '\u00b0) = **' + fmt(v0x) + ' m/s**\n' +
    '- v\u2080y = ' + fmt(inputs.velocity, 1) + ' \u00d7 sin(' + fmt(inputs.angle, 1) + '\u00b0) = **' + fmt(v0y) + ' m/s**\n\n' +
    '### Computed Results\n' +
    '- Range: **' + fmt(computed_values.range, 2) + ' m**\n' +
    '- Max Height: **' + fmt(computed_values.maxHeight, 2) + ' m**\n' +
    '- Flight Time: **' + fmt(computed_values.timeOfFlight, 3) + ' s**\n' +
    '- Impact Velocity: **' + fmt(computed_values.finalVelocity, 2) + ' m/s**';
}
