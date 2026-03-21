import React, { useState } from 'react';
import { X, Globe2, Settings2 } from 'lucide-react';
import { Slider } from '@/components/ui/slider';

export interface Environment {
  id: string;
  name: { ar: string; en: string; fr: string };
  emoji: string;
  gravity: number;
  fluidDensity: number; // kg/m³
  pressure: number; // Pa
  temperature: number; // K
  description: { ar: string; en: string; fr: string };
  isCustom?: boolean;
}

export const ENVIRONMENTS: Environment[] = [
  {
    id: 'earth',
    name: { ar: 'الأرض', en: 'Earth', fr: 'Terre' },
    emoji: '🌍',
    gravity: 9.81,
    fluidDensity: 1.225,
    pressure: 101325,
    temperature: 293.15,
    description: {
      ar: 'ظروف جوية قياسية على سطح الأرض',
      en: 'Standard atmospheric conditions on Earth\'s surface',
      fr: 'Conditions atmosphériques standard sur Terre',
    },
  },
  {
    id: 'mars',
    name: { ar: 'المريخ', en: 'Mars', fr: 'Mars' },
    emoji: '🔴',
    gravity: 3.71,
    fluidDensity: 0.020,
    pressure: 636,
    temperature: 210,
    description: {
      ar: 'غلاف جوي رقيق من ثاني أكسيد الكربون، جاذبية منخفضة',
      en: 'Thin CO₂ atmosphere, low gravity',
      fr: 'Atmosphère fine de CO₂, faible gravité',
    },
  },
  {
    id: 'moon',
    name: { ar: 'القمر', en: 'Moon', fr: 'Lune' },
    emoji: '🌙',
    gravity: 1.62,
    fluidDensity: 0,
    pressure: 0,
    temperature: 250,
    description: {
      ar: 'بدون غلاف جوي، جاذبية ضعيفة جداً',
      en: 'No atmosphere, very low gravity',
      fr: 'Pas d\'atmosphère, gravité très faible',
    },
  },
  {
    id: 'vacuum',
    name: { ar: 'غرفة الفراغ', en: 'Vacuum Chamber', fr: 'Chambre à Vide' },
    emoji: '🔬',
    gravity: 9.81,
    fluidDensity: 0,
    pressure: 0,
    temperature: 293.15,
    description: {
      ar: 'فراغ تام مع جاذبية أرضية — مثالي لدراسة الحركة بدون مقاومة',
      en: 'Perfect vacuum with Earth gravity — ideal for drag-free motion study',
      fr: 'Vide parfait avec gravité terrestre — idéal pour l\'étude sans traînée',
    },
  },
  {
    id: 'sun',
    name: { ar: 'الشمس', en: 'Sun', fr: 'Soleil' },
    emoji: '☀️',
    gravity: 274,
    fluidDensity: 0,
    pressure: 0,
    temperature: 5778,
    description: {
      ar: 'جاذبية عالية جداً — مرجع لدراسة تأثير الجاذبية القصوى',
      en: 'Extreme gravity — reference for studying maximum gravitational effects',
      fr: 'Gravité extrême — référence pour les effets gravitationnels maximaux',
    },
  },
  {
    id: 'underwater',
    name: { ar: 'تحت الماء', en: 'Underwater', fr: 'Sous l\'Eau' },
    emoji: '🌊',
    gravity: 9.81,
    fluidDensity: 998,
    pressure: 201325,
    temperature: 288.15,
    description: {
      ar: 'بيئة مائية — كثافة سائل عالية ومقاومة قوية للحركة',
      en: 'Aquatic environment — high fluid density and strong drag forces',
      fr: 'Environnement aquatique — haute densité et forte traînée',
    },
  },
  {
    id: 'jupiter',
    name: { ar: 'المشتري', en: 'Jupiter', fr: 'Jupiter' },
    emoji: '🟤',
    gravity: 24.79,
    fluidDensity: 0.16,
    pressure: 100000,
    temperature: 165,
    description: {
      ar: 'أكبر كواكب المجموعة الشمسية — جاذبية قوية وغلاف جوي من الهيدروجين',
      en: 'Largest planet — strong gravity, hydrogen atmosphere',
      fr: 'Plus grande planète — forte gravité, atmosphère d\'hydrogène',
    },
  },
  {
    id: 'saturn',
    name: { ar: 'زحل', en: 'Saturn', fr: 'Saturne' },
    emoji: '🪐',
    gravity: 10.44,
    fluidDensity: 0.19,
    pressure: 140000,
    temperature: 134,
    description: {
      ar: 'الكوكب ذو الحلقات — جاذبية مشابهة للأرض وغلاف غازي كثيف',
      en: 'Ringed planet — Earth-like gravity, dense gaseous atmosphere',
      fr: 'Planète aux anneaux — gravité similaire à la Terre, atmosphère gazeuse dense',
    },
  },
  {
    id: 'custom',
    name: { ar: 'مخصصة', en: 'Custom', fr: 'Personnalisé' },
    emoji: '⚙️',
    gravity: 9.81,
    fluidDensity: 1.225,
    pressure: 101325,
    temperature: 293.15,
    description: {
      ar: 'بيئة مخصصة — حدد جميع المعاملات بنفسك',
      en: 'Custom environment — define all parameters yourself',
      fr: 'Environnement personnalisé — définissez tous les paramètres',
    },
    isCustom: true,
  },
];

interface Props {
  open: boolean;
  onClose: () => void;
  lang: string;
  currentEnvId: string;
  onSelect: (env: Environment) => void;
}

export default function EnvironmentSelector({ open, onClose, lang, currentEnvId, onSelect }: Props) {
  const [showCustomEditor, setShowCustomEditor] = useState(false);
  const [customGravity, setCustomGravity] = useState(9.81);
  const [customDensity, setCustomDensity] = useState(1.225);
  const [customPressure, setCustomPressure] = useState(101325);
  const [customTemperature, setCustomTemperature] = useState(293.15);

  if (!open) return null;

  const t = (ar: string, en: string, fr?: string) => lang === 'ar' ? ar : lang === 'fr' ? (fr || en) : en;

  const handleEnvClick = (env: Environment) => {
    if (env.isCustom) {
      setShowCustomEditor(true);
      return;
    }
    onSelect(env);
    onClose();
  };

  const applyCustom = () => {
    const customEnv: Environment = {
      id: 'custom',
      name: { ar: 'مخصصة', en: 'Custom', fr: 'Personnalisé' },
      emoji: '⚙️',
      gravity: customGravity,
      fluidDensity: customDensity,
      pressure: customPressure,
      temperature: customTemperature,
      description: {
        ar: 'بيئة مخصصة بمعاملات المستخدم',
        en: 'User-defined custom environment',
        fr: 'Environnement personnalisé par l\'utilisateur',
      },
      isCustom: true,
    };
    onSelect(customEnv);
    setShowCustomEditor(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in-0 duration-200">
      <div className="relative w-[90vw] max-w-2xl bg-background border border-border rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-secondary/30">
          <div className="flex items-center gap-2">
            <Globe2 className="w-5 h-5 text-foreground" />
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wide">
              {showCustomEditor
                ? t('بيئة مخصصة', 'Custom Environment', 'Environnement Personnalisé')
                : t('اختيار البيئة الفيزيائية', 'Environment Selection', 'Sélection de l\'Environnement')}
            </h2>
          </div>
          <button onClick={() => { if (showCustomEditor) setShowCustomEditor(false); else onClose(); }} className="p-1.5 rounded-lg hover:bg-secondary transition-all duration-200 text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        {showCustomEditor ? (
          <div className="p-5 space-y-4 max-h-[65vh] overflow-y-auto">
            <p className="text-xs text-muted-foreground">
              {t('حدد معاملات البيئة المخصصة أدناه', 'Define your custom environment parameters below', 'Définissez les paramètres ci-dessous')}
            </p>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>g ({t('الجاذبية', 'Gravity', 'Gravité')}) m/s²</span>
                  <span className="font-mono">{customGravity.toFixed(2)}</span>
                </div>
                <Slider value={[customGravity]} min={0.1} max={300} step={0.01}
                  onValueChange={([v]) => setCustomGravity(v)} />
              </div>
              <div>
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>ρ ({t('كثافة الوسط', 'Fluid Density', 'Densité du fluide')}) kg/m³</span>
                  <span className="font-mono">{customDensity.toFixed(3)}</span>
                </div>
                <Slider value={[customDensity]} min={0} max={1500} step={0.001}
                  onValueChange={([v]) => setCustomDensity(v)} />
              </div>
              <div>
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>P ({t('الضغط', 'Pressure', 'Pression')}) kPa</span>
                  <span className="font-mono">{(customPressure / 1000).toFixed(1)}</span>
                </div>
                <Slider value={[customPressure / 1000]} min={0} max={500} step={0.1}
                  onValueChange={([v]) => setCustomPressure(v * 1000)} />
              </div>
              <div>
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>T ({t('الحرارة', 'Temperature', 'Température')}) °C</span>
                  <span className="font-mono">{(customTemperature - 273.15).toFixed(0)}</span>
                </div>
                <Slider value={[customTemperature - 273.15]} min={-200} max={6000} step={1}
                  onValueChange={([v]) => setCustomTemperature(v + 273.15)} />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setShowCustomEditor(false)}
                className="flex-1 py-2.5 text-sm font-medium rounded-lg border border-border hover:bg-secondary/50 transition-colors">
                {t('رجوع', 'Back', 'Retour')}
              </button>
              <button onClick={applyCustom}
                className="flex-1 py-2.5 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                {t('تطبيق', 'Apply', 'Appliquer')}
              </button>
            </div>
          </div>
        ) : (
          <div className="p-5 grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[65vh] overflow-y-auto">
            {ENVIRONMENTS.map((env) => {
              const isActive = env.id === currentEnvId;
              return (
                <button
                  key={env.id}
                  onClick={() => handleEnvClick(env)}
                  className={`group text-start p-3 rounded-xl border transition-all duration-200 ${
                    isActive
                      ? 'border-foreground bg-foreground/5 shadow-sm'
                      : 'border-border hover:border-foreground/30 hover:bg-secondary/50'
                  }`}
                >
                  <div className="text-2xl mb-2">{env.emoji}</div>
                  <p className="text-xs font-bold text-foreground mb-1">
                    {env.name[lang as 'ar' | 'en' | 'fr'] || env.name.en}
                  </p>
                  <p className="text-[9px] text-muted-foreground leading-relaxed mb-2">
                    {env.description[lang as 'ar' | 'en' | 'fr'] || env.description.en}
                  </p>
                  <div className="space-y-0.5 text-[9px] font-mono text-muted-foreground">
                    <div>g = {env.gravity} m/s²</div>
                    <div>ρ = {env.fluidDensity} kg/m³</div>
                    <div>P = {env.pressure > 0 ? (env.pressure / 1000).toFixed(1) + ' kPa' : '0'}</div>
                    <div>T = {(env.temperature - 273.15).toFixed(0)}°C</div>
                  </div>
                  {isActive && (
                    <div className="mt-2 text-[9px] font-semibold text-foreground">
                      ✓ {t('البيئة الحالية', 'Current', 'Actuel')}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
