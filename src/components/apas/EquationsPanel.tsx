import React, { useState } from 'react';
import { ChevronDown, BookOpen, X } from 'lucide-react';
import { playSectionToggle, playClick } from '@/utils/sound';

interface Props {
  lang: string;
  velocity: number;
  angle: number;
  height: number;
  gravity: number;
  airResistance: number;
  mass: number;
  currentTime: number;
  muted: boolean;
  prediction: {
    range: number;
    maxHeight: number;
    timeOfFlight: number;
    finalVelocity: number;
  } | null;
}

export default function EquationsPanel({ lang, velocity, angle, height, gravity, airResistance, mass, currentTime, muted, prediction }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [showDetailed, setShowDetailed] = useState(false);
  // Note: expanded starts false = collapsed by default

  const θ = angle * Math.PI / 180;
  const vx0 = velocity * Math.cos(θ);
  const vy0 = velocity * Math.sin(θ);
  const t = currentTime;
  const vx_t = airResistance > 0 ? vx0 * Math.exp(-airResistance * t / mass) : vx0;
  const vy_t = airResistance > 0 && airResistance > 1e-12 ? (vy0 + mass * gravity / airResistance) * Math.exp(-airResistance * t / mass) - mass * gravity / airResistance : vy0 - gravity * t;
  const v_t = Math.sqrt(vx_t * vx_t + vy_t * vy_t);
  const a_t = gravity;
  const KE = 0.5 * mass * v_t * v_t;
  const y_t = airResistance > 0 ? height + (mass / airResistance) * ((vy0 + mass * gravity / airResistance) * (1 - Math.exp(-airResistance * t / mass))) - (mass * gravity / airResistance) * t : height + vy0 * t - 0.5 * gravity * t * t;
  const PE = mass * Math.max(0, gravity) * Math.max(0, y_t);
  const TE = KE + PE;

  return (
    <>
      <div className="border border-border/50 rounded-xl overflow-hidden bg-card/60 backdrop-blur-sm shadow-lg shadow-black/5 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5">
        {/* Collapsible header */}
        <button
          onClick={() => { setExpanded(!expanded); playSectionToggle(muted); }}
          className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-primary/5 transition-all duration-300"
        >
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            📐 {lang === 'ar' ? 'المعادلات والقيم اللحظية' : 'Equations & Live Values'}
          </h3>
          <div className="flex items-center gap-2">
            {!expanded && (
              <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-mono animate-slideDown">
                <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  V={v_t.toFixed(1)} m/s
                </span>
              </span>
            )}
            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`} />
          </div>
        </button>

        {expanded && (
          <div className="px-4 pb-4 border-t border-border/30 animate-slideDown">
            <div className="pt-3 space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5 sm:gap-2">
                {[
                  { label: 'V', val: v_t.toFixed(2), unit: 'm/s', desc: lang === 'ar' ? 'السرعة' : 'Speed' },
                  { label: 'Vx', val: vx_t.toFixed(2), unit: 'm/s', desc: lang === 'ar' ? 'السرعة الأفقية' : 'Horizontal V' },
                  { label: 'Vy', val: vy_t.toFixed(2), unit: 'm/s', desc: lang === 'ar' ? 'السرعة الرأسية' : 'Vertical V' },
                  { label: 'a', val: a_t.toFixed(2), unit: 'm/s²', desc: lang === 'ar' ? 'التسارع' : 'Acceleration' },
                  { label: 't', val: t.toFixed(3), unit: 's', desc: lang === 'ar' ? 'الزمن' : 'Time' },
                  { label: 'KE', val: KE.toFixed(2), unit: 'J', desc: lang === 'ar' ? 'طاقة حركية' : 'Kinetic E' },
                  { label: 'PE', val: PE.toFixed(2), unit: 'J', desc: lang === 'ar' ? 'طاقة كامنة' : 'Potential E' },
                  { label: 'E', val: TE.toFixed(2), unit: 'J', desc: lang === 'ar' ? 'الطاقة الكلية' : 'Total E' },
                ].map(({ label, val, unit, desc }) => (
                  <div key={label} className="bg-secondary/50 rounded-md p-2.5 text-center">
                    <div className="text-[10px] text-muted-foreground mb-0.5">{desc}</div>
                    <div className="text-sm font-semibold font-mono text-foreground">{label} = {val}</div>
                    <div className="text-[9px] text-muted-foreground">{unit}</div>
                  </div>
                ))}
              </div>

              {airResistance > 0 && (
                <div className="eq-box">
                  F_drag = k·v²/m = {airResistance}·v²/{mass} = {(airResistance * v_t * v_t / mass).toFixed(4)} N/kg
                </div>
              )}

              <button
                onClick={() => { setShowDetailed(true); playClick(muted); }}
                className="group w-full text-xs font-medium py-2.5 px-3 rounded-md border border-border/50 hover:border-primary/30 hover:bg-primary/5 hover:shadow-md transition-all duration-300 flex items-center justify-center gap-2 text-foreground"
              >
                <BookOpen className="w-3.5 h-3.5" />
                {lang === 'ar' ? 'المعادلات التفصيلية' : 'Advanced Equations'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detailed Equations Modal */}
      {showDetailed && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowDetailed(false)}>
          <div className="bg-background border border-border rounded-xl max-w-2xl w-full max-h-[90vh] sm:max-h-[85vh] overflow-y-auto shadow-2xl mx-2 sm:mx-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between z-10">
              <h2 className="text-sm font-bold text-foreground">
                📚 {lang === 'ar' ? 'المعادلات التفصيلية المتقدمة' : 'Advanced Detailed Equations'}
              </h2>
              <button onClick={() => setShowDetailed(false)} className="p-1.5 hover:bg-secondary rounded-md text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4" dir="ltr">
              <EqSection title={lang === 'ar' ? '⚡ معادلات الحركة الأساسية' : '⚡ Basic Kinematics'} muted={muted}>
                <div className="eq-box">x(t) = V₀·cos(θ)·t</div>
                <div className="eq-box">y(t) = h₀ + V₀·sin(θ)·t − ½g·t²</div>
                <div className="eq-box">Vx(t) = V₀·cos(θ)</div>
                <div className="eq-box">Vy(t) = V₀·sin(θ) − g·t</div>
                <div className="eq-box">V(t) = √(Vx² + Vy²)</div>
                <div className="eq-box">θ_impact = arctan(−Vy/Vx)</div>
              </EqSection>

              <EqSection title={lang === 'ar' ? '🌬️ معادلات مقاومة الهواء' : '🌬️ Air Resistance (Drag)'} muted={muted}>
                <div className="eq-box">F_drag = k·|v|² (quadratic drag model)</div>
                <div className="eq-box">a_x = −(k/m)·|v|·Vx</div>
                <div className="eq-box">a_y = −g − (k/m)·|v|·Vy</div>
                <div className="eq-box">Vx(t+dt) = Vx(t) + a_x·dt  (Euler integration)</div>
                <div className="eq-box">Vy(t+dt) = Vy(t) + a_y·dt</div>
                <div className="eq-box">x(t+dt) = x(t) + Vx·dt</div>
                <div className="eq-box">y(t+dt) = y(t) + Vy·dt</div>
              </EqSection>

              <EqSection title={lang === 'ar' ? '⚙️ صيغة لاغرانج' : '⚙️ Lagrangian Formulation'} muted={muted}>
                <div className="eq-box">L = T − U = ½m(ẋ² + ẏ²) − mgy</div>
                <div className="eq-box">∂L/∂ẋ = mẋ → d/dt(mẋ) = 0 → ẍ = 0</div>
                <div className="eq-box">∂L/∂ẏ = mẏ → d/dt(mẏ) = −mg → ÿ = −g</div>
                <div className="eq-box">{lang === 'ar' ? 'معادلة أويلر-لاغرانج:' : 'Euler-Lagrange equation:'}</div>
                <div className="eq-box">d/dt(∂L/∂q̇ᵢ) − ∂L/∂qᵢ = Qᵢ</div>
                <div className="eq-box">{lang === 'ar' ? 'مع مقاومة الهواء (قوة معممة):' : 'With drag (generalized force):'}</div>
                <div className="eq-box">Qₓ = −k|v|·Vx/m ,  Q_y = −k|v|·Vy/m</div>
              </EqSection>

              <EqSection title={lang === 'ar' ? '🔄 صيغة هاملتون' : '🔄 Hamiltonian Formulation'} muted={muted}>
                <div className="eq-box">H = T + U = p²/(2m) + mgy</div>
                <div className="eq-box">pₓ = mẋ ,  p_y = mẏ</div>
                <div className="eq-box">ẋ = ∂H/∂pₓ = pₓ/m</div>
                <div className="eq-box">ẏ = ∂H/∂p_y = p_y/m</div>
                <div className="eq-box">ṗₓ = −∂H/∂x = 0</div>
                <div className="eq-box">ṗ_y = −∂H/∂y = −mg</div>
              </EqSection>

              <EqSection title={lang === 'ar' ? '🔢 التكاملات والحلول التحليلية' : '🔢 Analytical Integrals'} muted={muted}>
                <div className="eq-box">x(t) = ∫₀ᵗ Vx(τ)dτ = V₀cos(θ)·t</div>
                <div className="eq-box">y(t) = h₀ + ∫₀ᵗ Vy(τ)dτ = h₀ + V₀sin(θ)·t − ½gt²</div>
                <div className="eq-box">T_flight = (V₀sin(θ) + √(V₀²sin²(θ) + 2gh₀)) / g</div>
                <div className="eq-box">R = V₀cos(θ) · T_flight</div>
                <div className="eq-box">H_max = h₀ + V₀²sin²(θ) / (2g)</div>
                <div className="eq-box">y(x) = h₀ + x·tan(θ) − g·x² / (2V₀²cos²(θ))</div>
              </EqSection>

              <EqSection title={lang === 'ar' ? '⚡ الطاقة والشغل' : '⚡ Energy & Work'} muted={muted}>
                <div className="eq-box">KE = ½mv² = ½m(Vx² + Vy²)</div>
                <div className="eq-box">PE = mgy</div>
                <div className="eq-box">E_total = KE + PE  (conserved when k=0)</div>
                <div className="eq-box">W_drag = ∫ F_drag · ds = ΔE_total</div>
                <div className="eq-box">W_gravity = −mg·Δy</div>
                <div className="eq-box">ΔKE = W_net = W_gravity + W_drag</div>
              </EqSection>

              <EqSection title={lang === 'ar' ? '📊 طرق أويلر والتكامل العددي' : '📊 Euler & Numerical Integration'} muted={muted}>
                <div className="eq-box">{lang === 'ar' ? 'طريقة أويلر الصريحة:' : 'Explicit Euler Method:'}</div>
                <div className="eq-box">yₙ₊₁ = yₙ + h·f(tₙ, yₙ)</div>
                <div className="eq-box">{lang === 'ar' ? 'رونج-كوتا من الرتبة الرابعة (RK4):' : 'Runge-Kutta 4th Order (RK4):'}</div>
                <div className="eq-box">k₁ = h·f(tₙ, yₙ)</div>
                <div className="eq-box">k₂ = h·f(tₙ + h/2, yₙ + k₁/2)</div>
                <div className="eq-box">k₃ = h·f(tₙ + h/2, yₙ + k₂/2)</div>
                <div className="eq-box">k₄ = h·f(tₙ + h, yₙ + k₃)</div>
                <div className="eq-box">yₙ₊₁ = yₙ + (k₁ + 2k₂ + 2k₃ + k₄)/6</div>
              </EqSection>

              <EqSection title={lang === 'ar' ? '📐 معادلات إضافية' : '📐 Additional Equations'} muted={muted}>
                <div className="eq-box">{lang === 'ar' ? 'زاوية المدى الأقصى (بدون ارتفاع):' : 'Optimal angle (no height):'} θ_opt = 45°</div>
                <div className="eq-box">{lang === 'ar' ? 'زاوية المدى الأقصى (مع ارتفاع):' : 'With height:'} θ_opt = arctan(V₀/√(V₀² + 2gh₀))</div>
                <div className="eq-box">{lang === 'ar' ? 'عدد رينولدز:' : 'Reynolds number:'} Re = ρvL/μ</div>
                <div className="eq-box">F_drag_full = ½·Cd·ρ·A·v²</div>
                <div className="eq-box">{lang === 'ar' ? 'معادلة بيرنولي:' : "Bernoulli's equation:"} P + ½ρv² + ρgy = const</div>
              </EqSection>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function EqSection({ title, children, muted = false }: { title: string; children: React.ReactNode; muted?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button onClick={() => { setOpen(!open); playClick(muted); }} className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-secondary/50 hover:shadow-sm transition-all duration-200">
        <span className="text-xs font-semibold text-foreground">{title}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="px-4 pb-3 space-y-1">{children}</div>}
    </div>
  );
}
