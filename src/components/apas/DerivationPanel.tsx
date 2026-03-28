import React, { useState, useMemo } from 'react';
import { ChevronDown } from 'lucide-react';
import { playSectionToggle } from '@/utils/sound';

interface Props {
  lang: string;
  velocity: number;
  angle: number;
  height: number;
  gravity: number;
  airResistance: number;
  mass: number;
}

interface DerivationStep {
  title: string;
  equation: string;
  explanation: string;
  value?: string;
}

export default function DerivationPanel({ lang, velocity, angle, height, gravity, airResistance, mass }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const isAr = lang === 'ar';
  const isFr = lang === 'fr';

  const steps = useMemo((): DerivationStep[] => {
    const t = (ar: string, fr: string, en: string) =>
      lang === 'ar' ? ar : lang === 'fr' ? fr : en;
    const rad = angle * Math.PI / 180;
    const v0x = velocity * Math.cos(rad);
    const v0y = velocity * Math.sin(rad);
    const tFlight = (v0y + Math.sqrt(v0y * v0y + 2 * gravity * height)) / gravity;
    const maxH = height + (v0y * v0y) / (2 * gravity);
    const range = v0x * tFlight;

    return [
      {
        title: t('1. تحليل السرعة الابتدائية', '1. Decomposition de la vitesse', '1. Velocity Decomposition'),
        equation: `V₀x = V₀·cos(θ) = ${velocity} * cos(${angle}) = ${v0x.toFixed(3)} m/s\nV₀y = V₀·sin(θ) = ${velocity} * sin(${angle}) = ${v0y.toFixed(3)} m/s`,
        explanation: t(
          'نحلل سرعة الإطلاق إلى مركبتين: أفقية (V₀x) ورأسية (V₀y) باستخدام حساب المثلثات.',
          'On decompose la vitesse de lancement en deux composantes: horizontale (V₀x) et verticale (V₀y).',
          'Decompose launch velocity into horizontal (V₀x) and vertical (V₀y) components using trigonometry.'
        ),
      },
      {
        title: t('2. معادلات الحركة', '2. Equations du mouvement', '2. Equations of Motion'),
        equation: `x(t) = V₀·cos(θ)·t = ${v0x.toFixed(3)} * t\ny(t) = h₀ + V₀·sin(θ)·t - ½g·t² = ${height} + ${v0y.toFixed(3)}*t - 0.5*${gravity}*t²`,
        explanation: t(
          'الحركة الأفقية منتظمة (بدون تسارع). الحركة الرأسية متسارعة بفعل الجاذبية.',
          'Le mouvement horizontal est uniforme. Le mouvement vertical est accelere par la gravite.',
          'Horizontal motion is uniform (no acceleration). Vertical motion is accelerated by gravity.'
        ),
      },
      {
        title: t('3. زمن الطيران', '3. Temps de vol', '3. Time of Flight'),
        equation: `y(t) = 0 => h₀ + V₀y·t - ½g·t² = 0\nt = (V₀y + sqrt(V₀y² + 2·g·h₀)) / g\nt = (${v0y.toFixed(3)} + sqrt(${(v0y * v0y).toFixed(3)} + ${(2 * gravity * height).toFixed(3)})) / ${gravity}\nt = ${tFlight.toFixed(4)} s`,
        explanation: t(
          'نحل المعادلة التربيعية لإيجاد الزمن الذي يصل فيه المقذوف إلى الأرض (y=0).',
          'On resout l\'equation quadratique pour trouver le temps ou le projectile atteint le sol (y=0).',
          'Solve the quadratic equation to find when the projectile hits the ground (y=0).'
        ),
        value: `${tFlight.toFixed(4)} s`,
      },
      {
        title: t('4. أقصى ارتفاع', '4. Hauteur maximale', '4. Maximum Height'),
        equation: `Vy = 0 => V₀y - g·t_peak = 0 => t_peak = V₀y/g = ${(v0y / gravity).toFixed(4)} s\ny_max = h₀ + V₀y² / (2·g) = ${height} + ${(v0y * v0y).toFixed(3)} / ${(2 * gravity).toFixed(3)}\ny_max = ${maxH.toFixed(4)} m`,
        explanation: t(
          'عند أقصى ارتفاع، تكون السرعة الرأسية صفراً. نحل لإيجاد الزمن ثم الارتفاع.',
          'A la hauteur maximale, la vitesse verticale est nulle. On resout pour le temps puis la hauteur.',
          'At maximum height, vertical velocity is zero. Solve for time, then height.'
        ),
        value: `${maxH.toFixed(4)} m`,
      },
      {
        title: t('5. المدى الأفقي', '5. Portee horizontale', '5. Horizontal Range'),
        equation: `R = V₀x * t_flight = ${v0x.toFixed(3)} * ${tFlight.toFixed(4)}\nR = ${range.toFixed(4)} m`,
        explanation: t(
          'المدى هو المسافة الأفقية المقطوعة خلال زمن الطيران الكامل.',
          'La portee est la distance horizontale parcourue pendant le temps de vol total.',
          'Range is the horizontal distance traveled during the total flight time.'
        ),
        value: `${range.toFixed(4)} m`,
      },
      {
        title: t('6. سرعة الاصطدام', '6. Vitesse d\'impact', '6. Impact Velocity'),
        equation: `Vx_f = V₀x = ${v0x.toFixed(3)} m/s\nVy_f = V₀y - g·t = ${v0y.toFixed(3)} - ${gravity}*${tFlight.toFixed(4)} = ${(v0y - gravity * tFlight).toFixed(3)} m/s\nV_impact = sqrt(Vx_f² + Vy_f²) = ${Math.sqrt(v0x * v0x + (v0y - gravity * tFlight) ** 2).toFixed(3)} m/s`,
        explanation: t(
          'السرعة عند الاصطدام تُحسب من مركبتي السرعة الأفقية والرأسية عند لحظة الوصول.',
          'La vitesse d\'impact est calculee a partir des composantes horizontale et verticale a l\'arrivee.',
          'Impact velocity is computed from horizontal and vertical velocity components at landing.'
        ),
        value: `${Math.sqrt(v0x * v0x + (v0y - gravity * tFlight) ** 2).toFixed(3)} m/s`,
      },
      ...(airResistance > 0 ? [{
        title: t('7. تأثير مقاومة الهواء', '7. Effet de la resistance de l\'air', '7. Air Resistance Effect'),
        equation: `F_drag = -k * v^2 * (v_hat)\na_drag = F_drag / m = -(${airResistance} * v^2) / ${mass}`,
        explanation: t(
          'مقاومة الهواء تُضاف كقوة تتناسب مع مربع السرعة وتعاكس اتجاه الحركة. هذا يجعل الحل التحليلي مستحيلاً ويتطلب حلاً عددياً.',
          'La resistance de l\'air est ajoutee comme force proportionnelle au carre de la vitesse. Cela rend la solution analytique impossible.',
          'Air drag is added as a force proportional to v^2 opposing motion. This makes analytical solution impossible, requiring numerical integration.'
        ),
      }] : []),
    ];
  }, [velocity, angle, height, gravity, airResistance, mass, lang]);

  return (
    <div className="border border-border/50 rounded-xl overflow-hidden bg-card/60 backdrop-blur-sm shadow-lg shadow-black/5 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5" dir={isAr ? 'rtl' : 'ltr'}>
      <button
        onClick={() => { setIsOpen(!isOpen); playSectionToggle(false); }}
        className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-primary/5 transition-all duration-300"
      >
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          {isAr ? '📐 اشتقاق المعادلات خطوة بخطوة' : isFr ? '📐 Derivation pas a pas' : '📐 Step-by-Step Derivation'}
        </h3>
        <div className="flex items-center gap-2">
          {!isOpen && (
            <span className="text-[10px] text-muted-foreground font-mono">
              {steps.length} {isAr ? 'خطوات' : isFr ? 'etapes' : 'steps'}
            </span>
          )}
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {isOpen && (
        <div className="px-4 pb-4 space-y-3 border-t border-border/30 animate-slideDown pt-3">
          {steps.map((step, i) => (
            <div key={i} className="bg-background/60 rounded-lg p-3 border border-border/30 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-foreground">{step.title}</h4>
                {step.value && (
                  <span className="text-xs font-mono font-bold text-primary px-2 py-0.5 rounded bg-primary/10">
                    = {step.value}
                  </span>
                )}
              </div>
              <pre className="text-[11px] font-mono text-foreground/90 bg-secondary/40 rounded p-2 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                {step.equation}
              </pre>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                {step.explanation}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
