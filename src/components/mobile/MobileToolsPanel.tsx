import React from 'react';
import { Camera, Video, Mic, Aperture, Eye, Ruler, Calculator, Globe2, Layers, Shield, BookOpen, Crosshair } from 'lucide-react';
import ApasVisionButton from '@/components/apas/ApasVisionButton';
import ApasVideoButton from '@/components/apas/ApasVideoButton';
import ApasVoiceButton from '@/components/apas/ApasVoiceButton';

interface MobileToolsPanelProps {
  lang: string;
  velocity: number;
  angle: number;
  height: number;
  gravity: number;
  airResistance: number;
  mass: number;
  windSpeed: number;
  onUpdateParams: (params: { velocity?: number; angle?: number; height?: number; mass?: number; objectType?: string; gravity?: number }) => void;
  onMediaAnalyzed?: (thumbnailDataUrl: string) => void;
  calibrationScale: number | null;
  onOpenCalculator: () => void;
  onOpenRuler: () => void;
  onOpenProtractor: () => void;
  onOpenEnvironment: () => void;
  onOpenDocumentation: () => void;
  onOpenLiveCalibration: () => void;
  onOpenSecurityPrivacy: () => void;
  onOpenComprehensiveGuide: () => void;
}

const MobileToolsPanel: React.FC<MobileToolsPanelProps> = ({
  lang,
  velocity,
  angle,
  height,
  gravity,
  airResistance,
  mass,
  windSpeed,
  onUpdateParams,
  onMediaAnalyzed,
  calibrationScale,
  onOpenCalculator,
  onOpenRuler,
  onOpenProtractor,
  onOpenEnvironment,
  onOpenDocumentation,
  onOpenLiveCalibration,
  onOpenSecurityPrivacy,
  onOpenComprehensiveGuide,
}) => {
  const isAr = lang === 'ar';

  return (
    <div className="px-3 py-3 space-y-4">
      {/* AI Vision Tools */}
      <div>
        <h3 className="text-xs font-bold text-foreground mb-2 flex items-center gap-1.5">
          <Eye className="w-3.5 h-3.5 text-purple-500" />
          {isAr ? 'أدوات الرؤية الذكية' : lang === 'fr' ? 'Outils de Vision IA' : 'AI Vision Tools'}
        </h3>
        <div className="space-y-2">
          <ApasVisionButton
            lang={lang}
            onUpdateParams={onUpdateParams}
            onMediaAnalyzed={onMediaAnalyzed}
          />
          <ApasVideoButton
            lang={lang}
            onUpdateParams={onUpdateParams}
            onMediaAnalyzed={onMediaAnalyzed}
            calibrationMeters={calibrationScale ?? undefined}
            gravity={gravity}
          />
          <ApasVoiceButton
            lang={lang}
            onUpdateParams={onUpdateParams}
            simulationContext={{ velocity, angle, height, gravity, airResistance, mass }}
          />
        </div>
      </div>

      {/* Measurement & Analysis Tools */}
      <div>
        <h3 className="text-xs font-bold text-foreground mb-2 flex items-center gap-1.5">
          <Ruler className="w-3.5 h-3.5 text-blue-500" />
          {isAr ? 'أدوات القياس والتحليل' : lang === 'fr' ? 'Outils de Mesure' : 'Measurement Tools'}
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onOpenCalculator}
            className="flex items-center gap-2 p-3 rounded-xl bg-card/60 border border-border/30 active:scale-95 transition-all touch-manipulation"
          >
            <Calculator className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-medium text-foreground">
              {isAr ? 'الآلة الحاسبة' : 'Calculator'}
            </span>
          </button>
          <button
            onClick={onOpenRuler}
            className="flex items-center gap-2 p-3 rounded-xl bg-card/60 border border-border/30 active:scale-95 transition-all touch-manipulation"
          >
            <Ruler className="w-4 h-4 text-blue-500" />
            <span className="text-xs font-medium text-foreground">
              {isAr ? 'المسطرة' : 'Ruler'}
            </span>
          </button>
          <button
            onClick={onOpenProtractor}
            className="flex items-center gap-2 p-3 rounded-xl bg-card/60 border border-border/30 active:scale-95 transition-all touch-manipulation"
          >
            <Crosshair className="w-4 h-4 text-orange-500" />
            <span className="text-xs font-medium text-foreground">
              {isAr ? 'المنقلة' : 'Protractor'}
            </span>
          </button>
          <button
            onClick={onOpenLiveCalibration}
            className="flex items-center gap-2 p-3 rounded-xl bg-card/60 border border-border/30 active:scale-95 transition-all touch-manipulation"
          >
            <Aperture className="w-4 h-4 text-violet-500" />
            <span className="text-xs font-medium text-foreground">
              {isAr ? 'المعايرة' : 'Calibration'}
            </span>
          </button>
        </div>
      </div>

      {/* Environment & Resources */}
      <div>
        <h3 className="text-xs font-bold text-foreground mb-2 flex items-center gap-1.5">
          <Globe2 className="w-3.5 h-3.5 text-cyan-500" />
          {isAr ? 'البيئة والموارد' : lang === 'fr' ? 'Environnement' : 'Environment & Resources'}
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onOpenEnvironment}
            className="flex items-center gap-2 p-3 rounded-xl bg-card/60 border border-border/30 active:scale-95 transition-all touch-manipulation"
          >
            <Globe2 className="w-4 h-4 text-cyan-500" />
            <span className="text-xs font-medium text-foreground">
              {isAr ? 'البيئة' : 'Environment'}
            </span>
          </button>
          <button
            onClick={onOpenDocumentation}
            className="flex items-center gap-2 p-3 rounded-xl bg-card/60 border border-border/30 active:scale-95 transition-all touch-manipulation"
          >
            <BookOpen className="w-4 h-4 text-indigo-500" />
            <span className="text-xs font-medium text-foreground">
              {isAr ? 'الوثائق' : 'Docs'}
            </span>
          </button>
          <button
            onClick={onOpenComprehensiveGuide}
            className="flex items-center gap-2 p-3 rounded-xl bg-card/60 border border-border/30 active:scale-95 transition-all touch-manipulation"
          >
            <Layers className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-medium text-foreground">
              {isAr ? 'الدليل الشامل' : 'Full Guide'}
            </span>
          </button>
          <button
            onClick={onOpenSecurityPrivacy}
            className="flex items-center gap-2 p-3 rounded-xl bg-card/60 border border-border/30 active:scale-95 transition-all touch-manipulation"
          >
            <Shield className="w-4 h-4 text-green-500" />
            <span className="text-xs font-medium text-foreground">
              {isAr ? 'الخصوصية' : 'Privacy'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default MobileToolsPanel;
