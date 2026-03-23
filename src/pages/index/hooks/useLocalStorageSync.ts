import { useState, useEffect } from 'react';

interface LocalStorageSyncConfig {
  setLanguageDirect: (lang: string) => void;
  setNightMode: (v: boolean) => void;
  setIsMuted: (v: boolean) => void;
  nightMode: boolean;
  isMuted: boolean;
  lang: string;
}

export function useLocalStorageSync(sim: LocalStorageSyncConfig) {
  // ── Load saved settings from localStorage on mount ──
  useEffect(() => {
    try {
      const savedLang = localStorage.getItem('apas_lang');
      if (savedLang && (savedLang === 'ar' || savedLang === 'en' || savedLang === 'fr')) {
        sim.setLanguageDirect(savedLang);
      }
      const savedNight = localStorage.getItem('apas_nightMode');
      if (savedNight !== null) {
        sim.setNightMode(savedNight === 'true');
      }
      const savedMuted = localStorage.getItem('apas_isMuted');
      if (savedMuted !== null) {
        sim.setIsMuted(savedMuted === 'true');
      }
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Persist settings to localStorage ──
  useEffect(() => {
    try { localStorage.setItem('apas_lang', sim.lang); } catch { /* ignore */ }
  }, [sim.lang]);
  useEffect(() => {
    try { localStorage.setItem('apas_nightMode', String(sim.nightMode)); } catch { /* ignore */ }
  }, [sim.nightMode]);
  useEffect(() => {
    try { localStorage.setItem('apas_isMuted', String(sim.isMuted)); } catch { /* ignore */ }
  }, [sim.isMuted]);

  // 3D theme persistence
  const [theme3d, setTheme3d] = useState<'refined-lab' | 'academic-white' | 'technical-dark'>(() => {
    try { return (localStorage.getItem('apas_theme3d') as 'refined-lab' | 'academic-white' | 'technical-dark') || 'refined-lab'; } catch { return 'refined-lab'; }
  });
  useEffect(() => {
    try { localStorage.setItem('apas_theme3d', theme3d); } catch { /* ignore */ }
  }, [theme3d]);

  // Auto-delete videos persistence
  const [autoDeleteVideos, setAutoDeleteVideos] = useState(() => {
    try { return localStorage.getItem('apas_autoDeleteVideos') === 'true'; } catch { return false; }
  });

  return { theme3d, setTheme3d, autoDeleteVideos, setAutoDeleteVideos };
}
