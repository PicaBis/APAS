/**
 * Relativity & Reference Frames Panel Component
 * Provides UI controls for Galilean and Special Relativity simulations
 */

import React, { useState } from 'react';
import { ChevronDown, Eye, Zap, Train, Rocket, Crosshair, Landmark, Car } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import type { UseRelativityReturn } from '@/hooks/useRelativity';
import type { RelativityMeta } from '@/utils/relativityPhysics';
import { SPEED_OF_LIGHT } from '@/utils/relativityPhysics';
import { playSectionToggle, playToggle, playSliderChange } from '@/utils/sound';

interface RelativityPanelProps {
  lang: string;
  relativity: UseRelativityReturn;
  onPhysicsChange?: () => void;
}

const translations = {
  ar: {
    title: 'النسبية والإطارات المرجعية',
    enableRelativity: 'تفعيل وضع النسبية',
    transformationType: 'نوع التحويل',
    galilean: 'غاليلي (كلاسيكي)',
    lorentz: 'لورنتز (نسبية خاصة)',
    frameVelocity: 'سرعة الإطار المتحرك S\'',
    activeObserver: 'المراقب النشط',
    frameS: 'الإطار S (ثابت)',
    frameSPrime: 'الإطار S\' (متحرك)',
    showDual: 'عرض المسارين معاً',
    presets: 'إعدادات مسبقة',
    trainScenario: 'قطار وكرة',
    missileScenario: 'صاروخ ضد طائرة',
    spaceshipScenario: 'سفينة فضاء',
    speedOfLight: 'سرعة الضوء',
    gamma: 'عامل لورنتز γ',
    timeDilation: 'تمدد الزمن',
    lengthContraction: 'تقلص الطول',
    mPerSec: 'م/ث',
    relativistic: 'نسبي',
    classical: 'كلاسيكي',
    observerS: 'مراقب أرضي',
    observerSPrime: 'مراقب متحرك',
    speedDesc: 'وصف السرعة',
    educationalInfo: 'معلومات تعليمية',
    percentC: '% من c',
  },
  en: {
    title: 'Relativity & Reference Frames',
    enableRelativity: 'Enable Relativity Mode',
    transformationType: 'Transformation Type',
    galilean: 'Galilean (Classical)',
    lorentz: 'Lorentz (Special Relativity)',
    frameVelocity: 'Moving Frame S\' Velocity',
    activeObserver: 'Active Observer',
    frameS: 'Frame S (Stationary)',
    frameSPrime: 'Frame S\' (Moving)',
    showDual: 'Show Both Trajectories',
    presets: 'Presets',
    trainScenario: 'Train & Ball (Galilean)',
    missileScenario: 'Missile vs Airplane',
    spaceshipScenario: 'Spaceship (Lorentz)',
    speedOfLight: 'Speed of Light',
    gamma: 'Lorentz Factor γ',
    timeDilation: 'Time Dilation',
    lengthContraction: 'Length Contraction',
    mPerSec: 'm/s',
    relativistic: 'Relativistic',
    classical: 'Classical',
    observerS: 'Ground Observer',
    observerSPrime: 'Moving Observer',
    speedDesc: 'Speed Description',
    educationalInfo: 'Educational Info',
    percentC: '% of c',
  },
  fr: {
    title: 'Relativité et Référentiels',
    enableRelativity: 'Activer le Mode Relativité',
    transformationType: 'Type de Transformation',
    galilean: 'Galiléen (Classique)',
    lorentz: 'Lorentz (Relativité Restreinte)',
    frameVelocity: 'Vitesse du Référentiel S\'',
    activeObserver: 'Observateur Actif',
    frameS: 'Référentiel S (Fixe)',
    frameSPrime: 'Référentiel S\' (Mobile)',
    showDual: 'Afficher les Deux Trajectoires',
    presets: 'Préréglages',
    trainScenario: 'Train et Balle (Galiléen)',
    missileScenario: 'Missile vs Avion',
    spaceshipScenario: 'Vaisseau Spatial (Lorentz)',
    speedOfLight: 'Vitesse de la Lumière',
    gamma: 'Facteur de Lorentz γ',
    timeDilation: 'Dilatation du Temps',
    lengthContraction: 'Contraction des Longueurs',
    mPerSec: 'm/s',
    relativistic: 'Relativiste',
    classical: 'Classique',
    observerS: 'Observateur au Sol',
    observerSPrime: 'Observateur Mobile',
    speedDesc: 'Description de la Vitesse',
    educationalInfo: 'Info Éducative',
    percentC: '% de c',
  },
};

type TranslationKey = keyof typeof translations.en;
const T = (key: TranslationKey, lang: string) =>
  translations[lang as 'ar' | 'en' | 'fr']?.[key] ?? translations.en[key];

const MetaDisplay: React.FC<{ meta: RelativityMeta; lang: string }> = ({ meta, lang }) => {
  if (!meta.isRelativistic && meta.mode === 'galilean') return null;

  const beta = Math.abs(meta.frameVelocity) / SPEED_OF_LIGHT;

  return (
    <div className="space-y-1.5 p-2.5 rounded-lg bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/20">
      <div className="flex justify-between text-[10px]">
        <span className="text-muted-foreground">{T('gamma', lang)}</span>
        <span className="font-mono font-semibold text-purple-400">{meta.gamma.toFixed(6)}</span>
      </div>
      <div className="flex justify-between text-[10px]">
        <span className="text-muted-foreground">{T('timeDilation', lang)}</span>
        <span className="font-mono font-semibold text-blue-400">{(meta.timeDilation * 100).toFixed(4)}%</span>
      </div>
      <div className="flex justify-between text-[10px]">
        <span className="text-muted-foreground">{T('lengthContraction', lang)}</span>
        <span className="font-mono font-semibold text-cyan-400">{(meta.lengthContraction * 100).toFixed(4)}%</span>
      </div>
      <div className="flex justify-between text-[10px]">
        <span className="text-muted-foreground">β (v/c)</span>
        <span className="font-mono font-semibold text-orange-400">{beta.toFixed(8)}</span>
      </div>
    </div>
  );
};

export const RelativityPanel: React.FC<RelativityPanelProps> = ({
  lang,
  relativity,
  onPhysicsChange,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showEducational, setShowEducational] = useState(false);

  const handleToggle = (setter: (value: boolean) => void, current: boolean) => {
    setter(!current);
    playToggle(false, !current);
    onPhysicsChange?.();
  };

  const handleParamChange = () => {
    playSliderChange(false);
    onPhysicsChange?.();
  };

  // Determine velocity slider range based on mode
  const isLorentz = relativity.mode === 'lorentz';
  const maxVelocity = isLorentz ? SPEED_OF_LIGHT * 0.99 : 500;
  const minVelocity = isLorentz ? 0 : -500;
  const step = isLorentz ? SPEED_OF_LIGHT * 0.001 : 0.5;

  // Format velocity display
  const formatVelocity = (v: number): string => {
    if (isLorentz) {
      const beta = Math.abs(v) / SPEED_OF_LIGHT;
      if (beta > 0.01) return `${(beta * 100).toFixed(1)}% c`;
      return `${v.toExponential(2)} m/s`;
    }
    return `${v.toFixed(1)} m/s`;
  };

  const explanations = relativity.getExplanations();

  return (
    <div className="border border-border/50 rounded-xl overflow-hidden bg-card/60 backdrop-blur-sm shadow-lg shadow-black/5 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5">
      <button
        onClick={() => {
          setIsExpanded(!isExpanded);
          playSectionToggle(false);
        }}
        className="w-full px-3 sm:px-4 py-3 flex items-center justify-between hover:bg-primary/5 transition-all duration-300"
      >
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-tight flex items-center gap-2">
          <Zap className="w-4 h-4 text-purple-500" />
          {T('title', lang)}
        </h3>
        <ChevronDown
          className={`w-4 h-4 text-muted-foreground transition-transform duration-300 ${
            isExpanded ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isExpanded && (
        <div className="px-3 sm:px-4 pb-3 sm:pb-4 border-t border-border pt-3 space-y-3 animate-slideDown">
          {/* Enable Relativity Toggle */}
          <div className="flex items-center justify-between py-2 px-3 rounded-lg border border-border/50 hover:bg-primary/5 hover:border-primary/20 transition-all duration-200">
            <span className="text-xs font-medium text-foreground">{T('enableRelativity', lang)}</span>
            <Switch
              checked={relativity.enabled}
              onCheckedChange={() => handleToggle(relativity.setEnabled, relativity.enabled)}
            />
          </div>

          {relativity.enabled && (
            <>
              {/* Transformation Type Selector */}
              <div className="space-y-2">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                  {T('transformationType', lang)}
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => {
                      relativity.setMode('galilean');
                      if (relativity.frameVelocity > 500) relativity.setFrameVelocity(20);
                      handleParamChange();
                    }}
                    className={`px-2.5 py-2 rounded-lg text-[10px] font-medium border transition-all duration-200 flex items-center gap-1.5 ${
                      relativity.mode === 'galilean'
                        ? 'bg-green-500/15 border-green-500/40 text-green-400'
                        : 'border-border/50 text-muted-foreground hover:bg-primary/5'
                    }`}
                  >
                    <Train className="w-3 h-3" />
                    {T('galilean', lang)}
                  </button>
                  <button
                    onClick={() => {
                      relativity.setMode('lorentz');
                      if (relativity.frameVelocity < SPEED_OF_LIGHT * 0.01) {
                        relativity.setFrameVelocity(SPEED_OF_LIGHT * 0.1);
                      }
                      handleParamChange();
                    }}
                    className={`px-2.5 py-2 rounded-lg text-[10px] font-medium border transition-all duration-200 flex items-center gap-1.5 ${
                      relativity.mode === 'lorentz'
                        ? 'bg-purple-500/15 border-purple-500/40 text-purple-400'
                        : 'border-border/50 text-muted-foreground hover:bg-primary/5'
                    }`}
                  >
                    <Rocket className="w-3 h-3" />
                    {T('lorentz', lang)}
                  </button>
                </div>
              </div>

              {/* Frame Velocity Slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>{T('frameVelocity', lang)}</span>
                  <span className="font-mono font-semibold text-foreground">
                    {formatVelocity(relativity.frameVelocity)}
                  </span>
                </div>
                <Slider
                  value={[relativity.frameVelocity]}
                  min={minVelocity}
                  max={maxVelocity}
                  step={step}
                  onValueChange={([v]) => {
                    relativity.setFrameVelocity(v);
                    handleParamChange();
                  }}
                />
                <div className="text-[9px] text-muted-foreground/70 italic">
                  {relativity.speedDescription}
                </div>
              </div>

              {/* Observer Selection */}
              <div className="space-y-2">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                  {T('activeObserver', lang)}
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => {
                      relativity.setActiveObserver('S');
                      handleParamChange();
                    }}
                    className={`px-2 py-2 rounded-lg text-[10px] font-medium border transition-all duration-200 flex items-center gap-1 min-h-[32px] ${
                      relativity.activeObserver === 'S'
                        ? 'bg-blue-500/15 border-blue-500/40 text-blue-400'
                        : 'border-border/50 text-muted-foreground hover:bg-primary/5'
                    }`}
                  >
                    <Landmark className="w-3 h-3 shrink-0" />
                    <span className="leading-tight">{T('observerS', lang)}</span>
                  </button>
                  <button
                    onClick={() => {
                      relativity.setActiveObserver('S_prime');
                      handleParamChange();
                    }}
                    className={`px-2 py-2 rounded-lg text-[10px] font-medium border transition-all duration-200 flex items-center gap-1 min-h-[32px] ${
                      relativity.activeObserver === 'S_prime'
                        ? 'bg-orange-500/15 border-orange-500/40 text-orange-400'
                        : 'border-border/50 text-muted-foreground hover:bg-primary/5'
                    }`}
                  >
                    <Car className="w-3 h-3 shrink-0" />
                    <span className="leading-tight">{T('observerSPrime', lang)}</span>
                  </button>
                </div>
              </div>

              {/* Show Dual Trajectories Toggle */}
              <div className="flex items-center justify-between py-2 px-3 rounded-lg border border-border/50 hover:bg-primary/5 hover:border-primary/20 transition-all duration-200">
                <span className="text-xs font-medium text-foreground flex items-center gap-1.5">
                  <Eye className="w-3 h-3" />
                  {T('showDual', lang)}
                </span>
                <Switch
                  checked={relativity.showDualTrajectories}
                  onCheckedChange={() =>
                    handleToggle(relativity.setShowDualTrajectories, relativity.showDualTrajectories)
                  }
                />
              </div>

              {/* Relativistic Metadata Display */}
              {isLorentz && <MetaDisplay meta={relativity.meta} lang={lang} />}

              {/* Presets */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                  {T('presets', lang)}
                </span>
                <div className="flex flex-col gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-[10px] h-auto min-h-[28px] py-1.5 px-2 gap-1.5 justify-start w-full"
                    onClick={() => {
                      relativity.applyGalileanPreset();
                      onPhysicsChange?.();
                    }}
                  >
                    <Train className="w-3 h-3 shrink-0" />
                    <span className="text-left leading-tight">{T('trainScenario', lang)}</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-[10px] h-auto min-h-[28px] py-1.5 px-2 gap-1.5 justify-start w-full"
                    onClick={() => {
                      relativity.applyMissilePreset();
                      onPhysicsChange?.();
                    }}
                  >
                    <Crosshair className="w-3 h-3 shrink-0" />
                    <span className="text-left leading-tight">{T('missileScenario', lang)}</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-[10px] h-auto min-h-[28px] py-1.5 px-2 gap-1.5 justify-start w-full"
                    onClick={() => {
                      relativity.applyLorentzPreset();
                      onPhysicsChange?.();
                    }}
                  >
                    <Rocket className="w-3 h-3 shrink-0" />
                    <span className="text-left leading-tight">{T('spaceshipScenario', lang)}</span>
                  </Button>
                </div>
              </div>

              {/* Educational Info Section */}
              <button
                onClick={() => {
                  setShowEducational(!showEducational);
                  playSectionToggle(false);
                }}
                className="w-full flex items-center gap-1.5 py-2 px-3 text-[10px] font-semibold text-foreground uppercase tracking-wide rounded-lg border border-border/50 hover:bg-primary/10 hover:border-primary/20 transition-all duration-200"
              >
                <Zap className="w-3 h-3 text-yellow-500" />
                <span className="flex-1 text-left">{T('educationalInfo', lang)}</span>
                <ChevronDown
                  className={`w-3 h-3 transition-transform ${showEducational ? 'rotate-180' : ''}`}
                />
              </button>
              {showEducational && explanations.length > 0 && (
                <div className="space-y-1.5 pl-2 border-l-2 border-purple-500/40 animate-slideDown">
                  {explanations.map((exp, i) => (
                    <p key={i} className="text-[10px] text-muted-foreground leading-relaxed">
                      {exp}
                    </p>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default RelativityPanel;
