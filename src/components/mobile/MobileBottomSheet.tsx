import React, { useState, useRef, useCallback, useEffect } from 'react';
import { ChevronDown, ChevronUp, Gauge } from 'lucide-react';
import { Slider } from '@/components/ui/slider';

interface Variable {
  key: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (v: number) => void;
}

interface MobileBottomSheetProps {
  variables: Variable[];
  lang: string;
  isOpen: boolean;
  onToggle: () => void;
}

const MobileBottomSheet: React.FC<MobileBottomSheetProps> = ({
  variables,
  lang,
  isOpen,
  onToggle,
}) => {
  const [dragStartY, setDragStartY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setDragStartY(e.touches[0].clientY);
    setIsDragging(true);
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!isDragging) return;
    const deltaY = e.changedTouches[0].clientY - dragStartY;
    if (Math.abs(deltaY) > 50) {
      if (deltaY > 0 && isOpen) onToggle();
      if (deltaY < 0 && !isOpen) onToggle();
    }
    setIsDragging(false);
  }, [isDragging, dragStartY, isOpen, onToggle]);

  // Close on escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onToggle();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onToggle]);

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[65] md:hidden transition-opacity duration-300"
          onClick={onToggle}
        />
      )}

      {/* Sheet */}
      <div
        ref={sheetRef}
        className={`fixed left-0 right-0 z-[70] md:hidden transition-transform duration-300 ease-out ${
          isOpen ? 'translate-y-0' : 'translate-y-[calc(100%-3.5rem)]'
        }`}
        style={{ bottom: 'calc(4rem + env(safe-area-inset-bottom, 0px))' }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="bg-background/95 backdrop-blur-xl border-t border-x border-border/50 rounded-t-2xl shadow-2xl shadow-black/30 max-h-[60vh] overflow-hidden">
          {/* Handle */}
          <button
            onClick={onToggle}
            className="w-full flex flex-col items-center justify-center py-2.5 px-4 touch-manipulation"
          >
            <div className="w-10 h-1 rounded-full bg-muted-foreground/30 mb-2" />
            <div className="flex items-center gap-2 w-full justify-between">
              <span className="text-xs font-bold text-foreground flex items-center gap-2">
                <Gauge className="w-4 h-4 text-primary" />
                {lang === 'ar' ? 'متغيرات المحاكاة' : lang === 'fr' ? 'Variables de Simulation' : 'Simulation Variables'}
              </span>
              {isOpen ? (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
          </button>

          {/* Variables */}
          {isOpen && (
            <div className="px-4 pb-4 overflow-y-auto max-h-[calc(60vh-3.5rem)] overscroll-contain">
              <div className="grid grid-cols-2 gap-3">
                {variables.map((v) => (
                  <div key={v.key} className="p-2.5 rounded-xl bg-card/60 border border-border/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-semibold text-foreground">{v.label}</label>
                    </div>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={Number(v.value.toFixed(2))}
                        onChange={(e) => v.onChange(Number(e.target.value))}
                        min={v.min}
                        max={v.max}
                        step={v.step}
                        className="flex-1 text-xs font-mono text-center bg-secondary/60 border border-border/40 rounded-lg px-1.5 py-1.5 text-foreground focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all min-w-0"
                        dir="ltr"
                      />
                      <span className="text-[9px] font-mono text-muted-foreground shrink-0">{v.unit}</span>
                    </div>
                    <Slider
                      value={[v.value]}
                      min={v.min}
                      max={v.max}
                      step={v.step}
                      onValueChange={([val]) => v.onChange(val)}
                      className="h-4 touch-manipulation"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default MobileBottomSheet;
