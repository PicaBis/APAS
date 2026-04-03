import React, { useState, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Lightbulb, X, Loader2, Lock, RefreshCw,
  Target, Rocket, Brain, Crosshair, BarChart3,
  AlertTriangle, FlaskConical, ChevronDown, ChevronUp,
  HelpCircle, ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { playClick } from '@/utils/sound';
import { cleanLatex } from '@/utils/cleanLatex';

// AI calls go through edge functions which handle provider fallback internally
const EDGE_TUTOR_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/physics-tutor`;

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

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

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

interface RecommendationCard {
  id: string;
  icon: React.ReactNode;
  title: string;
  summary: string;
  explanation: string;
  equations: string[];
  values: Record<string, string>;
  actionLabel?: string;
  whyText?: string;
}

interface Props {
  lang: string;
  muted: boolean;
  isUnlocked: boolean;
  simulationContext: SimContext;
}

/* ------------------------------------------------------------------ */
/*  Icon & color maps                                                  */
/* ------------------------------------------------------------------ */

const CARD_ICON_MAP: Record<string, React.ReactNode> = {
  best_angle: <Target className="w-5 h-5" />,
  improve_range: <Rocket className="w-5 h-5" />,
  how_calculated: <Brain className="w-5 h-5" />,
  hit_target: <Crosshair className="w-5 h-5" />,
  performance: <BarChart3 className="w-5 h-5" />,
  affects_results: <AlertTriangle className="w-5 h-5" />,
  experiment: <FlaskConical className="w-5 h-5" />,
};

const CARD_COLORS: Record<string, string> = {
  best_angle: 'from-blue-500/20 to-blue-600/5 border-blue-500/30 hover:border-blue-400/50',
  improve_range: 'from-emerald-500/20 to-emerald-600/5 border-emerald-500/30 hover:border-emerald-400/50',
  how_calculated: 'from-purple-500/20 to-purple-600/5 border-purple-500/30 hover:border-purple-400/50',
  hit_target: 'from-orange-500/20 to-orange-600/5 border-orange-500/30 hover:border-orange-400/50',
  performance: 'from-cyan-500/20 to-cyan-600/5 border-cyan-500/30 hover:border-cyan-400/50',
  affects_results: 'from-amber-500/20 to-amber-600/5 border-amber-500/30 hover:border-amber-400/50',
  experiment: 'from-pink-500/20 to-pink-600/5 border-pink-500/30 hover:border-pink-400/50',
};

const CARD_ICON_COLORS: Record<string, string> = {
  best_angle: 'text-blue-400',
  improve_range: 'text-emerald-400',
  how_calculated: 'text-purple-400',
  hit_target: 'text-orange-400',
  performance: 'text-cyan-400',
  affects_results: 'text-amber-400',
  experiment: 'text-pink-400',
};

/* ------------------------------------------------------------------ */
/*  Build fallback cards from simulation context                       */
/* ------------------------------------------------------------------ */

function buildFallbackCards(ctx: SimContext, isAr: boolean): RecommendationCard[] {
  const v = ctx.velocity;
  const a = ctx.angle;
  const g = ctx.gravity;
  const h = ctx.height;
  const k = ctx.airResistance;
  const rad = a * Math.PI / 180;
  const idealRange = (v ** 2 * Math.sin(2 * rad) / g);
  const idealMaxH = h + (v * Math.sin(rad)) ** 2 / (2 * g);
  const idealTime = (v * Math.sin(rad) + Math.sqrt((v * Math.sin(rad)) ** 2 + 2 * g * h)) / g;
  const optimalRange = v ** 2 / g;

  return [
    {
      id: 'best_angle',
      icon: CARD_ICON_MAP.best_angle,
      title: isAr ? '\u0623\u0641\u0636\u0644 \u0632\u0627\u0648\u064a\u0629' : 'Best Angle',
      summary: a !== 45
        ? (isAr ? '\u062d\u0633\u0651\u0646 \u0625\u0644\u0649 45\u00b0 \u0644\u0623\u0642\u0635\u0649 \u0645\u062f\u0649' : 'Optimize to 45\u00b0 for max range')
        : (isAr ? '\u0623\u0646\u062a \u0628\u0627\u0644\u0632\u0627\u0648\u064a\u0629 \u0627\u0644\u0645\u062b\u0627\u0644\u064a\u0629!' : "You're at the optimal angle!"),
      explanation: isAr
        ? `\u0627\u0644\u0632\u0627\u0648\u064a\u0629 \u0627\u0644\u062d\u0627\u0644\u064a\u0629 ${a}\u00b0 \u062a\u0639\u0637\u064a \u0645\u062f\u0649 ${idealRange.toFixed(1)} \u0645. \u0627\u0644\u0632\u0627\u0648\u064a\u0629 \u0627\u0644\u0645\u062b\u0627\u0644\u064a\u0629 \u0628\u062f\u0648\u0646 \u0645\u0642\u0627\u0648\u0645\u0629 \u0627\u0644\u0647\u0648\u0627\u0621 \u0647\u064a 45\u00b0 \u0648\u062a\u0639\u0637\u064a \u0623\u0642\u0635\u0649 \u0645\u062f\u0649 ${optimalRange.toFixed(1)} \u0645.`
        : `Current angle ${a}\u00b0 gives range ${idealRange.toFixed(1)} m. The optimal angle without air resistance is 45\u00b0, yielding max range ${optimalRange.toFixed(1)} m.`,
      equations: [
        'R = v\u2080\u00b2 \u00b7 sin(2\u03b8) / g',
        `R(${a}\u00b0) = ${idealRange.toFixed(2)} m`,
        `R(45\u00b0) = ${optimalRange.toFixed(2)} m`,
      ],
      values: {
        [isAr ? '\u0627\u0644\u0632\u0627\u0648\u064a\u0629 \u0627\u0644\u062d\u0627\u0644\u064a\u0629' : 'Current angle']: `${a}\u00b0`,
        [isAr ? '\u0627\u0644\u0645\u062f\u0649 \u0627\u0644\u062d\u0627\u0644\u064a' : 'Current range']: `${idealRange.toFixed(1)} m`,
        [isAr ? '\u0627\u0644\u0645\u062f\u0649 \u0627\u0644\u0645\u062b\u0627\u0644\u064a' : 'Optimal range']: `${optimalRange.toFixed(1)} m`,
        [isAr ? '\u0627\u0644\u0641\u0631\u0642' : 'Difference']: `${(optimalRange - idealRange).toFixed(1)} m`,
      },
      actionLabel: isAr ? '\u062c\u0631\u0651\u0628\u0647\u0627' : 'Try it',
      whyText: isAr
        ? '\u0639\u0646\u062f 45\u00b0 \u064a\u0643\u0648\u0646 sin(2\u03b8) = 1 \u0648\u0647\u0648 \u0623\u0639\u0644\u0649 \u0642\u064a\u0645\u0629 \u0645\u0645\u0643\u0646\u0629\u060c \u0645\u0645\u0627 \u064a\u0639\u0637\u064a \u0623\u0642\u0635\u0649 \u0645\u062f\u0649 \u0623\u0641\u0642\u064a.'
        : 'At 45\u00b0, sin(2\u03b8) = 1 which is the maximum possible value, giving the greatest horizontal range.',
    },
    {
      id: 'improve_range',
      icon: CARD_ICON_MAP.improve_range,
      title: isAr ? '\u0632\u062f \u0627\u0644\u0645\u062f\u0649' : 'Improve Range',
      summary: isAr
        ? `\u0627\u0644\u0633\u0631\u0639\u0629 \u0627\u0644\u062d\u0627\u0644\u064a\u0629 ${v} \u0645/\u062b \u2014 \u0632\u062f\u0647\u0627 \u0644\u0645\u062f\u0649 \u0623\u0643\u0628\u0631`
        : `Current speed ${v} m/s \u2014 increase for more range`,
      explanation: isAr
        ? '\u0627\u0644\u0645\u062f\u0649 \u064a\u062a\u0646\u0627\u0633\u0628 \u0637\u0631\u062f\u064a\u0627\u064b \u0645\u0639 \u0645\u0631\u0628\u0639 \u0627\u0644\u0633\u0631\u0639\u0629. \u0632\u064a\u0627\u062f\u0629 \u0627\u0644\u0633\u0631\u0639\u0629 \u0628\u0645\u0642\u062f\u0627\u0631 1 \u0645/\u062b \u0633\u062a\u0632\u064a\u062f \u0627\u0644\u0645\u062f\u0649 \u0628\u0634\u0643\u0644 \u0645\u0644\u062d\u0648\u0638.'
        : 'Range is proportional to v\u00b2. Increasing speed by just 1 m/s will noticeably increase range.',
      equations: [
        'R \u221d v\u00b2',
        `R(${v} m/s) = ${idealRange.toFixed(2)} m`,
        `R(${v + 1} m/s) \u2248 ${((v + 1) ** 2 * Math.sin(2 * rad) / g).toFixed(2)} m`,
      ],
      values: {
        [isAr ? '\u0627\u0644\u0633\u0631\u0639\u0629' : 'Speed']: `${v} m/s`,
        [isAr ? '\u0627\u0644\u0645\u062f\u0649 \u0627\u0644\u062d\u0627\u0644\u064a' : 'Current range']: `${idealRange.toFixed(1)} m`,
        [isAr ? '\u0645\u062f\u0649 +1 \u0645/\u062b' : 'Range at +1 m/s']: `${((v + 1) ** 2 * Math.sin(2 * rad) / g).toFixed(1)} m`,
        [isAr ? '\u0627\u0644\u0632\u064a\u0627\u062f\u0629' : 'Gain']: `+${(((v + 1) ** 2 * Math.sin(2 * rad) / g) - idealRange).toFixed(1)} m`,
      },
      actionLabel: isAr ? '\u0637\u0628\u0651\u0642 \u0627\u0644\u062a\u0639\u062f\u064a\u0644' : 'Apply',
      whyText: isAr
        ? '\u0644\u0623\u0646 \u0627\u0644\u0645\u062f\u0649 R = v\u00b2sin(2\u03b8)/g\u060c \u0641\u0625\u0646 \u0645\u0636\u0627\u0639\u0641\u0629 \u0627\u0644\u0633\u0631\u0639\u0629 \u062a\u0636\u0627\u0639\u0641 \u0627\u0644\u0645\u062f\u0649 4 \u0645\u0631\u0627\u062a.'
        : 'Since R = v\u00b2sin(2\u03b8)/g, doubling speed quadruples the range.',
    },
    {
      id: 'how_calculated',
      icon: CARD_ICON_MAP.how_calculated,
      title: isAr ? '\u0643\u064a\u0641 \u062d\u0633\u0628\u0646\u0627\u061f' : 'How was this calculated?',
      summary: isAr ? '\u062a\u062d\u0644\u064a\u0644 \u0627\u0644\u0633\u0631\u0639\u0629 + \u0645\u0639\u0627\u062f\u0644\u0627\u062a \u0627\u0644\u062d\u0631\u0643\u0629' : 'Velocity analysis + motion equations',
      explanation: isAr
        ? `\u0646\u0633\u062a\u062e\u062f\u0645 \u0645\u0639\u0627\u062f\u0644\u0627\u062a \u0627\u0644\u062d\u0631\u0643\u0629 \u0627\u0644\u0645\u0642\u0630\u0648\u0641\u064a\u0629 \u0644\u062d\u0633\u0627\u0628 \u0627\u0644\u0645\u0633\u0627\u0631. \u0627\u0644\u0633\u0631\u0639\u0629 \u0627\u0644\u0623\u0641\u0642\u064a\u0629 v\u00b7cos(\u03b8) \u0648\u0627\u0644\u0639\u0645\u0648\u062f\u064a\u0629 v\u00b7sin(\u03b8) \u062a\u062d\u062f\u062f \u0634\u0643\u0644 \u0627\u0644\u0645\u0633\u0627\u0631. \u0637\u0631\u064a\u0642\u0629 \u0627\u0644\u062a\u0643\u0627\u0645\u0644: ${ctx.integrationMethod || 'euler'}.`
        : `We use projectile motion equations to compute the trajectory. Horizontal velocity v\u00b7cos(\u03b8) and vertical velocity v\u00b7sin(\u03b8) determine the path shape. Integration method: ${ctx.integrationMethod || 'euler'}.`,
      equations: [
        'x(t) = v\u2080 \u00b7 cos(\u03b8) \u00b7 t',
        'y(t) = h + v\u2080 \u00b7 sin(\u03b8) \u00b7 t - \u00bd \u00b7 g \u00b7 t\u00b2',
        `T = ${idealTime.toFixed(2)} s`,
        `R = ${idealRange.toFixed(2)} m`,
        `H_max = ${idealMaxH.toFixed(2)} m`,
      ],
      values: {
        'v\u2080': `${v} m/s`,
        '\u03b8': `${a}\u00b0`,
        'g': `${g} m/s\u00b2`,
        'h\u2080': `${h} m`,
        [isAr ? '\u0637\u0631\u064a\u0642\u0629 \u0627\u0644\u062a\u0643\u0627\u0645\u0644' : 'Integration']: ctx.integrationMethod || 'euler',
      },
      whyText: isAr
        ? '\u0647\u0630\u0647 \u0627\u0644\u0645\u0639\u0627\u062f\u0644\u0627\u062a \u0645\u0634\u062a\u0642\u0629 \u0645\u0646 \u0642\u0648\u0627\u0646\u064a\u0646 \u0646\u064a\u0648\u062a\u0646 \u0627\u0644\u062b\u0627\u0646\u064a\u0629 \u0645\u0639 \u062b\u0628\u0627\u062a \u0627\u0644\u062a\u0633\u0627\u0631\u0639 (\u0627\u0644\u062c\u0627\u0630\u0628\u064a\u0629).'
        : "These equations are derived from Newton's second law with constant acceleration (gravity).",
    },
    {
      id: 'hit_target',
      icon: CARD_ICON_MAP.hit_target,
      title: isAr ? '\u0625\u0635\u0627\u0628\u0629 \u0627\u0644\u0647\u062f\u0641' : 'Hit the target',
      summary: isAr
        ? `\u0644\u0644\u0648\u0635\u0648\u0644 \u0644\u0640 10 \u0645 \u062a\u062d\u062a\u0627\u062c \u0632\u0627\u0648\u064a\u0629 \u2248 ${(Math.asin(Math.min(1, 10 * g / (v ** 2))) * 90 / Math.PI).toFixed(0)}\u00b0`
        : `To reach 10 m, use angle \u2248 ${(Math.asin(Math.min(1, 10 * g / (v ** 2))) * 90 / Math.PI).toFixed(0)}\u00b0`,
      explanation: isAr
        ? '\u0644\u0625\u0635\u0627\u0628\u0629 \u0647\u062f\u0641 \u0639\u0644\u0649 \u0628\u0639\u062f \u0645\u0639\u064a\u0646\u060c \u0646\u062d\u0644 \u0627\u0644\u0645\u0639\u0627\u062f\u0644\u0629 R = v\u00b2sin(2\u03b8)/g \u0628\u0627\u0644\u0646\u0633\u0628\u0629 \u0644\u0640 \u03b8. \u0642\u062f \u064a\u0648\u062c\u062f \u062d\u0644\u0627\u0646 (\u0632\u0627\u0648\u064a\u0629 \u0645\u0646\u062e\u0641\u0636\u0629 \u0648\u0632\u0627\u0648\u064a\u0629 \u0639\u0627\u0644\u064a\u0629).'
        : 'To hit a target at a specific distance, we solve R = v\u00b2sin(2\u03b8)/g for \u03b8. There may be two solutions (low angle and high angle).',
      equations: [
        '\u03b8 = \u00bd \u00b7 arcsin(R \u00b7 g / v\u00b2)',
        `\u03b8_low \u2248 ${(Math.asin(Math.min(1, 10 * g / (v ** 2))) * 90 / Math.PI).toFixed(1)}\u00b0`,
        `\u03b8_high \u2248 ${(90 - Math.asin(Math.min(1, 10 * g / (v ** 2))) * 90 / Math.PI).toFixed(1)}\u00b0`,
      ],
      values: {
        [isAr ? '\u0627\u0644\u0647\u062f\u0641' : 'Target']: '10 m',
        [isAr ? '\u0627\u0644\u0632\u0627\u0648\u064a\u0629 \u0627\u0644\u0645\u0646\u062e\u0641\u0636\u0629' : 'Low angle']: `${(Math.asin(Math.min(1, 10 * g / (v ** 2))) * 90 / Math.PI).toFixed(1)}\u00b0`,
        [isAr ? '\u0627\u0644\u0632\u0627\u0648\u064a\u0629 \u0627\u0644\u0639\u0627\u0644\u064a\u0629' : 'High angle']: `${(90 - Math.asin(Math.min(1, 10 * g / (v ** 2))) * 90 / Math.PI).toFixed(1)}\u00b0`,
        [isAr ? '\u0623\u0642\u0635\u0649 \u0645\u062f\u0649 \u0645\u0645\u0643\u0646' : 'Max reachable']: `${optimalRange.toFixed(1)} m`,
      },
      actionLabel: isAr ? '\u0627\u0636\u0628\u0637 \u062a\u0644\u0642\u0627\u0626\u064a' : 'Auto-adjust',
      whyText: isAr
        ? '\u064a\u0648\u062c\u062f \u062f\u0627\u0626\u0645\u0627\u064b \u0632\u0627\u0648\u064a\u062a\u0627\u0646 \u062a\u0639\u0637\u064a\u0627\u0646 \u0646\u0641\u0633 \u0627\u0644\u0645\u062f\u0649 (\u0645\u062a\u0643\u0627\u0645\u0644\u062a\u0627\u0646 \u0644\u0640 90\u00b0) \u0645\u0627 \u0644\u0645 \u062a\u0643\u0646 \u0627\u0644\u0647\u062f\u0641 \u0639\u0646\u062f \u0623\u0642\u0635\u0649 \u0645\u062f\u0649.'
        : 'There are always two angles giving the same range (complementary to 90\u00b0) unless the target is at max range.',
    },
    {
      id: 'performance',
      icon: CARD_ICON_MAP.performance,
      title: isAr ? '\u062a\u062d\u0644\u064a\u0644 \u0627\u0644\u0623\u062f\u0627\u0621' : 'Performance Analysis',
      summary: isAr
        ? `\u0627\u0644\u0645\u062f\u0649: ${idealRange.toFixed(1)} \u0645 | \u0627\u0644\u0627\u0631\u062a\u0641\u0627\u0639: ${idealMaxH.toFixed(1)} \u0645`
        : `Range: ${idealRange.toFixed(1)} m | Height: ${idealMaxH.toFixed(1)} m`,
      explanation: isAr
        ? `\u0627\u0644\u0645\u062d\u0627\u0643\u0627\u0629 \u0627\u0644\u062d\u0627\u0644\u064a\u0629 \u062a\u0633\u062a\u062e\u062f\u0645 v=${v} \u0645/\u062b \u0628\u0632\u0627\u0648\u064a\u0629 ${a}\u00b0. \u0627\u0644\u0645\u062f\u0649 \u0627\u0644\u0645\u062d\u0633\u0648\u0628 ${idealRange.toFixed(1)} \u0645 \u0648\u0623\u0642\u0635\u0649 \u0627\u0631\u062a\u0641\u0627\u0639 ${idealMaxH.toFixed(1)} \u0645 \u0648\u0632\u0645\u0646 \u0627\u0644\u0637\u064a\u0631\u0627\u0646 ${idealTime.toFixed(2)} \u062b.`
        : `Current simulation uses v=${v} m/s at ${a}\u00b0. Computed range ${idealRange.toFixed(1)} m, max height ${idealMaxH.toFixed(1)} m, flight time ${idealTime.toFixed(2)} s.`,
      equations: [
        `R = ${idealRange.toFixed(2)} m`,
        `H_max = ${idealMaxH.toFixed(2)} m`,
        `T = ${idealTime.toFixed(2)} s`,
        `KE = \u00bd \u00b7 m \u00b7 v\u00b2 = ${(0.5 * ctx.mass * v ** 2).toFixed(1)} J`,
      ],
      values: {
        [isAr ? '\u0627\u0644\u0645\u062f\u0649' : 'Range']: `${idealRange.toFixed(1)} m`,
        [isAr ? '\u0623\u0642\u0635\u0649 \u0627\u0631\u062a\u0641\u0627\u0639' : 'Max height']: `${idealMaxH.toFixed(1)} m`,
        [isAr ? '\u0632\u0645\u0646 \u0627\u0644\u0637\u064a\u0631\u0627\u0646' : 'Flight time']: `${idealTime.toFixed(2)} s`,
        [isAr ? '\u0627\u0644\u0637\u0627\u0642\u0629 \u0627\u0644\u062d\u0631\u0643\u064a\u0629' : 'Kinetic energy']: `${(0.5 * ctx.mass * v ** 2).toFixed(1)} J`,
        [isAr ? '\u0627\u0644\u0643\u062a\u0644\u0629' : 'Mass']: `${ctx.mass} kg`,
      },
      whyText: isAr
        ? '\u0647\u0630\u0647 \u0627\u0644\u0642\u064a\u0645 \u0645\u062d\u0633\u0648\u0628\u0629 \u0644\u0644\u062d\u0627\u0644\u0629 \u0627\u0644\u0645\u062b\u0627\u0644\u064a\u0629 (\u0628\u062f\u0648\u0646 \u0645\u0642\u0627\u0648\u0645\u0629 \u0647\u0648\u0627\u0621). \u0627\u0644\u0642\u064a\u0645 \u0627\u0644\u0641\u0639\u0644\u064a\u0629 \u0642\u062f \u062a\u062e\u062a\u0644\u0641 \u0645\u0639 \u062a\u0641\u0639\u064a\u0644 \u0645\u0642\u0627\u0648\u0645\u0629 \u0627\u0644\u0647\u0648\u0627\u0621.'
        : 'These values are computed for the ideal case (no air drag). Actual values may differ with air resistance enabled.',
    },
    {
      id: 'affects_results',
      icon: CARD_ICON_MAP.affects_results,
      title: isAr ? '\u0645\u0627\u0630\u0627 \u064a\u0624\u062b\u0631 \u0639\u0644\u0649 \u0627\u0644\u0646\u062a\u0627\u0626\u062c\u061f' : 'What affects results?',
      summary: k > 0
        ? (isAr ? '\u0645\u0642\u0627\u0648\u0645\u0629 \u0627\u0644\u0647\u0648\u0627\u0621 \u0645\u0641\u0639\u0644\u0629 \u2014 \u062a\u0642\u0644\u0644 \u0627\u0644\u0645\u062f\u0649' : 'Air resistance ON \u2014 reduces range')
        : (isAr ? '\u0628\u062f\u0648\u0646 \u0645\u0642\u0627\u0648\u0645\u0629 \u0647\u0648\u0627\u0621 \u2014 \u0627\u0644\u0646\u062a\u0627\u0626\u062c \u0645\u062b\u0627\u0644\u064a\u0629' : 'No air drag \u2014 results are ideal'),
      explanation: isAr
        ? `\u0639\u0648\u0627\u0645\u0644 \u062a\u0624\u062b\u0631 \u0639\u0644\u0649 \u0627\u0644\u0645\u0633\u0627\u0631: \u0645\u0642\u0627\u0648\u0645\u0629 \u0627\u0644\u0647\u0648\u0627\u0621 (${k > 0 ? '\u0645\u0641\u0639\u0644\u0629' : '\u0645\u0639\u0637\u0644\u0629'})\u060c \u0627\u0644\u062c\u0627\u0630\u0628\u064a\u0629 (${g} \u0645/\u062b\u00b2)\u060c \u0627\u0644\u0627\u0631\u062a\u0641\u0627\u0639 \u0627\u0644\u0627\u0628\u062a\u062f\u0627\u0626\u064a (${h} \u0645)\u060c \u0648\u0627\u0644\u0643\u062a\u0644\u0629 (${ctx.mass} \u0643\u063a \u0639\u0646\u062f \u0648\u062c\u0648\u062f \u0645\u0642\u0627\u0648\u0645\u0629 \u0647\u0648\u0627\u0621).`
        : `Factors affecting trajectory: air resistance (${k > 0 ? 'enabled' : 'disabled'}), gravity (${g} m/s\u00b2), initial height (${h} m), and mass (${ctx.mass} kg when drag is present).`,
      equations: k > 0
        ? ['F_drag = -k \u00b7 v', `k = ${k}`, 'a = F/m (mass matters with drag)']
        : ['F = m \u00b7 g (mass cancels out)', `g = ${g} m/s\u00b2`, 'No drag force'],
      values: {
        [isAr ? '\u0645\u0642\u0627\u0648\u0645\u0629 \u0627\u0644\u0647\u0648\u0627\u0621' : 'Air resistance']: k > 0 ? `k = ${k}` : (isAr ? '\u0645\u0639\u0637\u0644\u0629' : 'OFF'),
        [isAr ? '\u0627\u0644\u062c\u0627\u0630\u0628\u064a\u0629' : 'Gravity']: `${g} m/s\u00b2`,
        [isAr ? '\u0627\u0644\u0628\u064a\u0626\u0629' : 'Environment']: ctx.environmentId || 'earth',
        [isAr ? '\u0627\u0644\u0627\u0631\u062a\u0641\u0627\u0639 \u0627\u0644\u0627\u0628\u062a\u062f\u0627\u0626\u064a' : 'Initial height']: `${h} m`,
      },
      whyText: isAr
        ? '\u0628\u062f\u0648\u0646 \u0645\u0642\u0627\u0648\u0645\u0629 \u0627\u0644\u0647\u0648\u0627\u0621\u060c \u0627\u0644\u0643\u062a\u0644\u0629 \u0644\u0627 \u062a\u0624\u062b\u0631 \u0639\u0644\u0649 \u0627\u0644\u0645\u0633\u0627\u0631. \u0645\u0639 \u0627\u0644\u0645\u0642\u0627\u0648\u0645\u0629\u060c \u0627\u0644\u0623\u062c\u0633\u0627\u0645 \u0627\u0644\u0623\u062b\u0642\u0644 \u062a\u0642\u0627\u0648\u0645 \u0627\u0644\u062a\u0628\u0627\u0637\u0624 \u0628\u0634\u0643\u0644 \u0623\u0641\u0636\u0644.'
        : "Without air drag, mass doesn't affect trajectory. With drag, heavier objects resist slowdown better.",
    },
    {
      id: 'experiment',
      icon: CARD_ICON_MAP.experiment,
      title: isAr ? '\u062c\u0631\u0651\u0628 \u0628\u0646\u0641\u0633\u0643' : 'Try an experiment',
      summary: isAr ? '\u0642\u0627\u0631\u0646 \u0628\u064a\u0646 Euler \u0648 RK4 \u0623\u0648 \u062c\u0631\u0628 \u0627\u0644\u0642\u0645\u0631!' : 'Compare Euler vs RK4 or try the Moon!',
      explanation: isAr
        ? `\u062a\u062c\u0627\u0631\u0628 \u0645\u0642\u062a\u0631\u062d\u0629: 1) \u0641\u0639\u0651\u0644 \u0645\u0642\u0627\u0648\u0645\u0629 \u0627\u0644\u0647\u0648\u0627\u0621 \u0648\u0642\u0627\u0631\u0646 \u0627\u0644\u0645\u0633\u0627\u0631. 2) \u063a\u064a\u0651\u0631 \u0627\u0644\u0628\u064a\u0626\u0629 \u0625\u0644\u0649 \u0627\u0644\u0642\u0645\u0631 (g=1.62). 3) \u0642\u0627\u0631\u0646 \u0628\u064a\u0646 \u0637\u0631\u0642 \u0627\u0644\u062a\u0643\u0627\u0645\u0644 \u0627\u0644\u0645\u062e\u062a\u0644\u0641\u0629. 4) \u0636\u0627\u0639\u0641 \u0627\u0644\u0633\u0631\u0639\u0629 \u0648\u0644\u0627\u062d\u0638 \u062a\u0623\u062b\u064a\u0631\u0647\u0627 \u0639\u0644\u0649 \u0627\u0644\u0645\u062f\u0649 (4x).`
        : 'Suggested experiments: 1) Enable air resistance and compare trajectories. 2) Switch environment to Moon (g=1.62). 3) Compare different integration methods. 4) Double the velocity and observe the 4x range increase.',
      equations: [
        `R_earth = ${idealRange.toFixed(1)} m`,
        `R_moon \u2248 ${(v ** 2 * Math.sin(2 * rad) / 1.62).toFixed(1)} m`,
        `R_2v = ${(4 * idealRange).toFixed(1)} m`,
      ],
      values: {
        [isAr ? '\u0627\u0644\u0645\u062f\u0649 \u0639\u0644\u0649 \u0627\u0644\u0623\u0631\u0636' : 'Range on Earth']: `${idealRange.toFixed(1)} m`,
        [isAr ? '\u0627\u0644\u0645\u062f\u0649 \u0639\u0644\u0649 \u0627\u0644\u0642\u0645\u0631' : 'Range on Moon']: `${(v ** 2 * Math.sin(2 * rad) / 1.62).toFixed(1)} m`,
        [isAr ? '\u0627\u0644\u0645\u062f\u0649 \u0628\u0636\u0639\u0641 \u0627\u0644\u0633\u0631\u0639\u0629' : 'Range at 2x speed']: `${(4 * idealRange).toFixed(1)} m`,
        [isAr ? '\u0637\u0631\u064a\u0642\u0629 \u0627\u0644\u062a\u0643\u0627\u0645\u0644' : 'Integration']: ctx.integrationMethod || 'euler',
      },
      actionLabel: isAr ? '\u062c\u0631\u0651\u0628 \u0627\u0644\u0622\u0646' : 'Try now',
      whyText: isAr
        ? '\u0627\u0644\u062a\u062c\u0631\u064a\u0628 \u064a\u0633\u0627\u0639\u062f \u0639\u0644\u0649 \u0641\u0647\u0645 \u0643\u064a\u0641 \u064a\u0624\u062b\u0631 \u0643\u0644 \u0645\u062a\u063a\u064a\u0631 \u0639\u0644\u0649 \u0627\u0644\u062d\u0631\u0643\u0629. \u0627\u0644\u0642\u0645\u0631 \u0644\u0647 \u062c\u0627\u0630\u0628\u064a\u0629 \u0623\u0642\u0644 6 \u0645\u0631\u0627\u062a \u0645\u0646 \u0627\u0644\u0623\u0631\u0636.'
        : "Experimentation helps understand how each variable affects motion. The Moon has 1/6th of Earth's gravity.",
    },
  ];
}

/* ------------------------------------------------------------------ */
/*  Attempt to parse AI JSON response into cards                       */
/* ------------------------------------------------------------------ */

function tryParseAICards(raw: string): RecommendationCard[] | null {
  try {
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return null;
    const parsed = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    return parsed.map((item: Record<string, unknown>) => {
      const cardType = (item.type as string) || 'performance';
      return {
        id: cardType,
        icon: CARD_ICON_MAP[cardType] || CARD_ICON_MAP.performance,
        title: (item.title as string) || '',
        summary: (item.summary as string) || '',
        explanation: ((item.details as Record<string, unknown>)?.explanation as string) || (item.explanation as string) || '',
        equations: ((item.details as Record<string, unknown>)?.equations as string[]) || (item.equations as string[]) || [],
        values: ((item.details as Record<string, unknown>)?.values as Record<string, string>) || (item.values as Record<string, string>) || {},
        actionLabel: (item.actionLabel as string) || undefined,
        whyText: (item.whyText as string) || undefined,
      };
    });
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  Single Recommendation Card                                         */
/* ------------------------------------------------------------------ */

function RecCard({
  card,
  expanded,
  onToggle,
  isAr,
  showWhy,
  onToggleWhy,
}: {
  card: RecommendationCard;
  expanded: boolean;
  onToggle: () => void;
  isAr: boolean;
  showWhy: boolean;
  onToggleWhy: () => void;
}) {
  const colorClass = CARD_COLORS[card.id] || CARD_COLORS.performance;
  const iconColor = CARD_ICON_COLORS[card.id] || CARD_ICON_COLORS.performance;

  return (
    <div
      className={`group relative rounded-xl border bg-gradient-to-br ${colorClass} backdrop-blur-sm transition-all duration-300 cursor-pointer
        ${expanded ? 'col-span-1 sm:col-span-2 lg:col-span-3 shadow-lg' : 'hover:shadow-md hover:-translate-y-0.5 hover:scale-[1.02]'}`}
      onClick={!expanded ? onToggle : undefined}
    >
      {/* Card header - always visible */}
      <div className="p-3 sm:p-4">
        <div className="flex items-start gap-3">
          <div className={`shrink-0 p-2 rounded-lg bg-background/50 ${iconColor} transition-transform duration-300 group-hover:scale-110`}>
            {card.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-sm font-semibold text-foreground truncate">{card.title}</h4>
              {expanded && (
                <button
                  onClick={(e) => { e.stopPropagation(); onToggle(); }}
                  className="shrink-0 p-1 rounded-md hover:bg-background/50 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{card.summary}</p>
          </div>
        </div>

        {!expanded && (
          <div className="flex items-center justify-end mt-2 text-[10px] text-muted-foreground/70">
            <ChevronDown className="w-3 h-3 mr-0.5" />
            <span>{isAr ? '\u0627\u0636\u063a\u0637 \u0644\u0644\u062a\u0641\u0627\u0635\u064a\u0644' : 'Click for details'}</span>
          </div>
        )}
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-border/30 p-3 sm:p-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300" onClick={(e) => e.stopPropagation()}>
          {/* Explanation */}
          <div>
            <p className="text-xs leading-relaxed text-foreground/90">{card.explanation}</p>
          </div>

          {/* Equations */}
          {card.equations.length > 0 && (
            <div className="bg-background/60 rounded-lg p-3 border border-border/20">
              <h5 className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
                {isAr ? '\u0627\u0644\u0645\u0639\u0627\u062f\u0644\u0627\u062a' : 'Equations'}
              </h5>
              <div className="space-y-1.5">
                {card.equations.map((eq, i) => (
                  <div key={i} className="font-mono text-xs text-foreground/80 bg-secondary/30 px-2 py-1 rounded">
                    {eq}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Values */}
          {Object.keys(card.values).length > 0 && (
            <div className="bg-background/60 rounded-lg p-3 border border-border/20">
              <h5 className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
                {isAr ? '\u0627\u0644\u0642\u064a\u0645 \u0627\u0644\u062d\u0627\u0644\u064a\u0629' : 'Current Values'}
              </h5>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                {Object.entries(card.values).map(([key, val]) => (
                  <div key={key} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{key}</span>
                    <span className="font-semibold text-foreground font-mono">{val}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {card.actionLabel && (
              <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/20 hover:bg-primary/30 text-primary text-xs font-medium transition-colors border border-primary/20">
                <ArrowRight className="w-3 h-3" />
                {card.actionLabel}
              </button>
            )}
            {card.whyText && (
              <button
                onClick={onToggleWhy}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-secondary/50 hover:bg-secondary/80 text-muted-foreground hover:text-foreground text-xs transition-colors border border-border/30"
              >
                <HelpCircle className="w-3 h-3" />
                {isAr ? '\u0644\u0645\u0627\u0630\u0627\u061f' : 'Why?'}
              </button>
            )}
          </div>

          {/* Why explanation */}
          {showWhy && card.whyText && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 animate-in fade-in slide-in-from-top-1 duration-200">
              <div className="flex items-start gap-2">
                <HelpCircle className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                <p className="text-xs text-foreground/80 leading-relaxed">{card.whyText}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export default function ApasRecommendations({ lang, muted, isUnlocked, simulationContext }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cards, setCards] = useState<RecommendationCard[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [whyId, setWhyId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [aiMode, setAiMode] = useState(false);
  const isAr = lang === 'ar';

  const fallbackCards = useMemo(
    () => buildFallbackCards(simulationContext, isAr),
    [simulationContext, isAr],
  );

  const displayCards = cards.length > 0 ? cards : (loading ? [] : fallbackCards);

  const fetchRecommendations = useCallback(async () => {
    setLoading(true);
    setCards([]);
    setError('');
    setExpandedId(null);
    setWhyId(null);

    const systemPrompt = `You are APAS Recommendations Engine. Analyze the simulation and return a JSON array of recommendation objects.

${isAr ? 'All text fields must be in Arabic.' : 'All text fields must be in English.'}

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

Return ONLY a valid JSON array with 7 objects. Each object must have:
{
  "type": "best_angle" | "improve_range" | "how_calculated" | "hit_target" | "performance" | "affects_results" | "experiment",
  "title": "short title",
  "summary": "1-line preview max 60 chars",
  "explanation": "2-3 sentence explanation with specific values",
  "equations": ["equation1", "equation2"],
  "values": { "label": "value with units" },
  "actionLabel": "short action button text",
  "whyText": "deeper explanation of the physics principle"
}

CRITICAL: Return ONLY the JSON array. No markdown, no code blocks, no extra text.`;

    const userMessage = isAr
      ? '\u062d\u0644\u0644 \u0627\u0644\u0645\u062d\u0627\u0643\u0627\u0629 \u0648\u0623\u0639\u0637\u0646\u064a 7 \u062a\u0648\u0635\u064a\u0627\u062a \u0630\u0643\u064a\u0629 \u0643\u0640 JSON.'
      : 'Analyze the simulation and give me 7 smart recommendations as JSON.';

    let accumulated = '';
    let didSetAi = false;

    try {
      try {
        const edgeResp = await fetch(EDGE_TUTOR_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            messages: [{ role: 'user', content: userMessage }],
            simulationContext,
            systemPrompt,
          }),
        });
        if (edgeResp.ok && edgeResp.body) {
          await consumeStream(edgeResp.body, (text) => {
            accumulated += text;
          });
          const parsed = tryParseAICards(cleanLatex(accumulated));
          if (parsed && parsed.length > 0) {
            setCards(parsed);
            setAiMode(true);
            didSetAi = true;
          }
        }
      } catch {
        // fall through to fallback
      }

      if (!didSetAi && accumulated) {
        const parsed = tryParseAICards(cleanLatex(accumulated));
        if (parsed && parsed.length > 0) {
          setCards(parsed);
          setAiMode(true);
        } else {
          setAiMode(false);
        }
      }
    } catch {
      setError(isAr ? '\u062a\u0639\u0630\u0631 \u0627\u0644\u062d\u0635\u0648\u0644 \u0639\u0644\u0649 \u0627\u0644\u062a\u0648\u0635\u064a\u0627\u062a.' : 'Failed to get recommendations.');
    }
    setLoading(false);
  }, [simulationContext, isAr]);

  const handleOpen = () => {
    if (!isUnlocked) {
      toast.info(isAr ? 'يجب عليك تحميل صورة أو فيديو أولاً أو تشغيل المحاكاة' : 'You must upload an image or video first, or run the simulation');
      return;
    }
    playClick(muted);
    setOpen(true);
    if (cards.length === 0 && !loading) {
      fetchRecommendations();
    }
  };

  return (
    <>
      {/* Header button */}
      <button
        onClick={handleOpen}
        aria-disabled={!isUnlocked}
        className={`relative flex items-center gap-1.5 group transition-all duration-300 ${
          isUnlocked
            ? 'apas-assistant-btn rounded-lg px-2.5 py-1.5 text-white shadow-lg cursor-pointer'
            : 'rounded-lg px-2.5 py-1.5 bg-secondary/50 text-muted-foreground cursor-not-allowed opacity-60 border border-border/50'
        }`}
        title={!isUnlocked ? (isAr ? '\u0623\u062f\u0631\u062c \u0646\u0645\u0648\u0630\u062c \u0641\u064a \u0627\u0644\u0631\u0624\u064a\u0629 \u0627\u0644\u0630\u0643\u064a\u0629 \u0623\u0648 \u0634\u063a\u0644 \u0627\u0644\u0645\u062d\u0627\u0643\u0627\u0629 \u0623\u0648\u0644\u0627' : 'Upload a model in Smart Vision or run the simulation first') : ''}
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
          <span className="font-extrabold">{isAr ? 'مهمة' : 'APAS'}</span>
        </span>
      </button>

      {/* Modal */}
      {open && createPortal(
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-sm" onClick={() => !loading && setOpen(false)}>
          <div
            className="bg-background border border-border rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-slideDown"
            dir={isAr ? 'rtl' : 'ltr'}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border bg-gradient-to-r from-primary/10 via-background to-primary/5">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-primary/10">
                  <Lightbulb className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">
                    {isAr ? '\u062a\u0648\u0635\u064a\u0627\u062a APAS \u0627\u0644\u0630\u0643\u064a\u0629' : 'APAS Smart Recommendations'}
                  </h3>
                  <p className="text-[10px] text-muted-foreground">
                    {isAr ? '\u0627\u0636\u063a\u0637 \u0639\u0644\u0649 \u0623\u064a \u0628\u0637\u0627\u0642\u0629 \u0644\u0627\u0633\u062a\u0643\u0634\u0627\u0641 \u0627\u0644\u062a\u0641\u0627\u0635\u064a\u0644' : 'Click any card to explore details'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => { e.stopPropagation(); fetchRecommendations(); }}
                  disabled={loading}
                  className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-all duration-200 disabled:opacity-50"
                  title={isAr ? '\u062a\u062d\u062f\u064a\u062b \u0627\u0644\u062a\u0648\u0635\u064a\u0627\u062a' : 'Refresh recommendations'}
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
                {!loading && (
                  <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-all duration-200">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Params summary bar */}
            <div className="px-4 py-2 border-b border-border/50 bg-secondary/10">
              <div className="flex flex-wrap gap-2 text-[10px] font-mono text-muted-foreground">
                <span className="bg-secondary/50 px-1.5 py-0.5 rounded">V={simulationContext.velocity} m/s</span>
                <span className="bg-secondary/50 px-1.5 py-0.5 rounded">{'\u03b8'}={simulationContext.angle}{'\u00b0'}</span>
                <span className="bg-secondary/50 px-1.5 py-0.5 rounded">h={simulationContext.height} m</span>
                <span className="bg-secondary/50 px-1.5 py-0.5 rounded">g={simulationContext.gravity} m/s{'\u00b2'}</span>
                {simulationContext.airResistance > 0 && (
                  <span className="bg-secondary/50 px-1.5 py-0.5 rounded">k={simulationContext.airResistance}</span>
                )}
                {simulationContext.range && (
                  <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded">R={simulationContext.range} m</span>
                )}
              </div>
            </div>

            {/* Cards grid content */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4">
              {loading && displayCards.length === 0 && (
                <div className="flex flex-col items-center justify-center gap-3 py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">
                    {isAr ? '\u062c\u0627\u0631\u064a \u062a\u062d\u0644\u064a\u0644 \u0627\u0644\u0645\u062d\u0627\u0643\u0627\u0629...' : 'Analyzing simulation...'}
                  </span>
                </div>
              )}

              {error && (
                <div className="text-center py-8">
                  <p className="text-sm text-destructive">{error}</p>
                  <button onClick={fetchRecommendations} className="mt-3 text-xs text-primary hover:underline">
                    {isAr ? '\u0625\u0639\u0627\u062f\u0629 \u0627\u0644\u0645\u062d\u0627\u0648\u0644\u0629' : 'Try again'}
                  </button>
                </div>
              )}

              {displayCards.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {displayCards.map((card) => (
                    <RecCard
                      key={card.id}
                      card={card}
                      expanded={expandedId === card.id}
                      onToggle={() => {
                        setExpandedId(expandedId === card.id ? null : card.id);
                        setWhyId(null);
                      }}
                      isAr={isAr}
                      showWhy={whyId === card.id}
                      onToggleWhy={() => setWhyId(whyId === card.id ? null : card.id)}
                    />
                  ))}
                </div>
              )}

              {/* AI vs Fallback indicator */}
              {displayCards.length > 0 && !loading && (
                <div className="mt-4 flex items-center justify-center gap-2 text-[10px] text-muted-foreground/60">
                  <div className={`w-1.5 h-1.5 rounded-full ${aiMode ? 'bg-green-400' : 'bg-amber-400'}`} />
                  <span>{aiMode ? (isAr ? '\u062a\u062d\u0644\u064a\u0644 \u0630\u0643\u0627\u0621 \u0627\u0635\u0637\u0646\u0627\u0639\u064a' : 'AI-powered analysis') : (isAr ? '\u062a\u062d\u0644\u064a\u0644 \u0645\u062d\u0644\u064a' : 'Local analysis')}</span>
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
