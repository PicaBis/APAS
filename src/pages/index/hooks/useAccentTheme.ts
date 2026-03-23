import { useState, useEffect, useMemo } from 'react';

export interface AccentColor {
  id: string;
  label: string;
  hsl: string;
  ring: string;
}

export function useAccentTheme(lang: string, nightMode: boolean) {
  const tLabel = (ar: string, en: string, fr: string) => lang === 'ar' ? ar : lang === 'fr' ? fr : en;

  const ALL_ACCENT_COLORS: AccentColor[] = useMemo(() => [
    { id: 'teal', label: tLabel('أزرق مخضر', 'Teal', 'Sarcelle'), hsl: '172 66% 50%', ring: '172 66% 50%' },
    { id: 'blue', label: tLabel('أزرق', 'Blue', 'Bleu'), hsl: '217 91% 60%', ring: '217 91% 60%' },
    { id: 'purple', label: tLabel('بنفسجي', 'Purple', 'Violet'), hsl: '270 70% 60%', ring: '270 70% 60%' },
    { id: 'orange', label: tLabel('برتقالي', 'Orange', 'Orange'), hsl: '25 95% 53%', ring: '25 95% 53%' },
    { id: 'green', label: tLabel('أخضر', 'Green', 'Vert'), hsl: '142 71% 45%', ring: '142 71% 45%' },
    { id: 'rose', label: tLabel('وردي', 'Rose', 'Rose'), hsl: '346 77% 55%', ring: '346 77% 55%' },
    { id: 'white', label: tLabel('أبيض', 'White', 'Blanc'), hsl: '0 0% 100%', ring: '0 0% 100%' },
    { id: 'black', label: tLabel('أسود', 'Black', 'Noir'), hsl: '0 0% 10%', ring: '0 0% 10%' },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [lang]);

  const [accentColor, setAccentColor] = useState<string>(() => {
    try { return localStorage.getItem('apas_accentColor') || 'teal'; } catch { return 'teal'; }
  });

  // Filter: hide black in night mode, hide white in day mode
  const ACCENT_COLORS = useMemo(() => ALL_ACCENT_COLORS.filter(c => {
    if (c.id === 'black' && nightMode) return false;
    if (c.id === 'white' && !nightMode) return false;
    return true;
  }), [ALL_ACCENT_COLORS, nightMode]);

  // Auto-reset accent if it becomes unavailable after mode switch
  useEffect(() => {
    if (accentColor === 'black' && nightMode) setAccentColor('teal');
    if (accentColor === 'white' && !nightMode) setAccentColor('teal');
  }, [nightMode, accentColor]);

  // Detect contrast conflict
  const isAccentConflict = (accentColor === 'white' && !nightMode) || (accentColor === 'black' && nightMode);

  // Apply accent color to CSS custom properties
  useEffect(() => {
    const color = ACCENT_COLORS.find(c => c.id === accentColor);
    if (color) {
      document.documentElement.style.setProperty('--primary', color.hsl);
      document.documentElement.style.setProperty('--ring', color.ring);
    }

    if (isAccentConflict) {
      document.documentElement.setAttribute('data-accent-conflict', accentColor);
      if (accentColor === 'white') {
        document.documentElement.style.setProperty('--primary-foreground', '0 0% 0%');
      } else {
        document.documentElement.style.setProperty('--primary-foreground', '0 0% 100%');
      }
    } else {
      document.documentElement.removeAttribute('data-accent-conflict');
      document.documentElement.style.removeProperty('--primary-foreground');
    }

    return () => {
      document.documentElement.style.removeProperty('--primary');
      document.documentElement.style.removeProperty('--ring');
      document.documentElement.style.removeProperty('--primary-foreground');
      document.documentElement.removeAttribute('data-accent-conflict');
    };
  }, [accentColor, nightMode, isAccentConflict, ACCENT_COLORS]);

  // Persist accent color
  useEffect(() => {
    try { localStorage.setItem('apas_accentColor', accentColor); } catch { /* ignore */ }
  }, [accentColor]);

  return { accentColor, setAccentColor, ACCENT_COLORS };
}
