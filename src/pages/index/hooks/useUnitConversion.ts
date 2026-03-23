import { useState, useCallback, useEffect } from 'react';
import { UNIT_OPTIONS } from '../constants';

export function useUnitConversion(lang: string) {
  const [selectedUnits, setSelectedUnits] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('apas_units');
      if (saved) return JSON.parse(saved);
    } catch { /* ignore */ }
    return { velocity: 'm/s', angle: '°', gravity: 'm/s²', mass: 'kg', height: 'm', windSpeed: 'm/s' };
  });

  // Persist unit selections
  useEffect(() => {
    try { localStorage.setItem('apas_units', JSON.stringify(selectedUnits)); } catch { /* ignore */ }
  }, [selectedUnits]);

  const getDisplayValue = useCallback((paramKey: string, baseValue: number) => {
    const unitKey = selectedUnits[paramKey];
    const unitDef = UNIT_OPTIONS[paramKey]?.units.find(u => u.key === unitKey);
    if (!unitDef) return baseValue;
    return baseValue * unitDef.factor;
  }, [selectedUnits]);

  const getUnitLabel = useCallback((paramKey: string) => {
    const unitKey = selectedUnits[paramKey];
    const unitDef = UNIT_OPTIONS[paramKey]?.units.find(u => u.key === unitKey);
    if (!unitDef) return '';
    if (lang === 'ar') return unitDef.labelAr;
    return unitDef.label;
  }, [selectedUnits, lang]);

  const fromDisplayValue = useCallback((paramKey: string, displayValue: number) => {
    const unitKey = selectedUnits[paramKey];
    const unitDef = UNIT_OPTIONS[paramKey]?.units.find(u => u.key === unitKey);
    if (!unitDef) return displayValue;
    return displayValue / unitDef.factor;
  }, [selectedUnits]);

  return { selectedUnits, setSelectedUnits, getDisplayValue, getUnitLabel, fromDisplayValue };
}
