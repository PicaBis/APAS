import React from 'react';
import { ArrowRight } from 'lucide-react';
import type { VectorVisibility } from '@/simulation/types';

interface Props {
  lang: string;
  showExternalForces: boolean;
  onToggle: () => void;
  vectorVisibility: VectorVisibility;
  onVectorToggle: (key: keyof VectorVisibility) => void;
  isWaterEnvironment?: boolean;
  hydrodynamicEnabled?: boolean;
}

const BASE_VECTORS: { key: keyof VectorVisibility; color: string; labelAr: string; labelEn: string }[] = [
  { key: 'V', color: '#1a1a1a', labelAr: 'متجه السرعة V', labelEn: 'Velocity V' },
  { key: 'Vx', color: '#3b82f6', labelAr: 'السرعة الأفقية Vx', labelEn: 'Horizontal Vx' },
  { key: 'Vy', color: '#22c55e', labelAr: 'السرعة الرأسية Vy', labelEn: 'Vertical Vy' },
  { key: 'Fg', color: '#ef4444', labelAr: 'قوة الجاذبية Fg', labelEn: 'Gravity Fg' },
  { key: 'Fd', color: '#f59e0b', labelAr: 'قوة السحب Fd', labelEn: 'Drag Fd' },
  { key: 'Fw', color: '#0ea5e9', labelAr: 'قوة الرياح Fw', labelEn: 'Wind Force Fw' },
  { key: 'Fnet', color: '#8b5cf6', labelAr: 'القوة المحصلة Fnet', labelEn: 'Net Force Fnet' },
  { key: 'acc', color: '#06b6d4', labelAr: 'متجه التسارع a', labelEn: 'Acceleration a' },
];

const FLUID_VECTOR: { key: keyof VectorVisibility; color: string; labelAr: string; labelEn: string } = {
  key: 'Ffluid', color: '#14b8a6', labelAr: 'قوة مقاومة المائع Ffluid', labelEn: 'Fluid Resistance Ffluid',
};

export default function ForceVectorsSection({ lang, showExternalForces, onToggle, vectorVisibility, onVectorToggle, isWaterEnvironment = false, hydrodynamicEnabled = false }: Props) {
  const isAr = lang === 'ar';
  const showFluidVector = isWaterEnvironment && hydrodynamicEnabled;
  const vectors = showFluidVector
    ? [...BASE_VECTORS.slice(0, 6), FLUID_VECTOR, ...BASE_VECTORS.slice(6)]
    : BASE_VECTORS;

  return (
    <div className="rounded overflow-hidden">
      <button
        onClick={onToggle}
        className={`w-full text-xs font-medium py-2.5 px-3 rounded-lg flex items-center gap-2 transition-all duration-300 ${
          showExternalForces ? 'bg-gradient-to-r from-primary to-primary/80 text-primary-foreground border border-primary/50 shadow-md shadow-primary/20' : 'text-foreground hover:bg-primary/10 border border-border/50 hover:border-primary/20 hover:shadow-md'
        }`}
      >
        <ArrowRight className="w-3.5 h-3.5" />
        {isAr ? 'متجهات القوى' : 'Force Vectors'}
      </button>

      {showExternalForces && (
        <div className="border border-t-0 border-border/50 rounded-b-lg px-3 py-2 space-y-1">
          {vectors.map((v) => (
            <label key={v.key} className="flex items-center gap-2 py-1 cursor-pointer hover:bg-secondary/50 rounded px-1 transition-colors">
              <input
                type="checkbox"
                checked={vectorVisibility[v.key]}
                onChange={() => onVectorToggle(v.key)}
                className="w-3 h-3 rounded accent-foreground cursor-pointer"
              />
              <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: v.color }} />
              <span className="text-[10px] text-foreground select-none">{isAr ? v.labelAr : v.labelEn}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

export type { VectorVisibility };
