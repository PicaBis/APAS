import React, { useState, useEffect, useCallback } from 'react';
import { Download, X, Smartphone, Monitor, Apple } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PWAInstallPromptProps {
  lang: string;
}

const PWAInstallPrompt: React.FC<PWAInstallPromptProps> = ({ lang }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show banner after delay
      const dismissed = localStorage.getItem('apas_pwa_dismissed');
      if (!dismissed || Date.now() - Number(dismissed) > 7 * 24 * 60 * 60 * 1000) {
        setTimeout(() => setShowBanner(true), 3000);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);
    
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setShowBanner(false);
      setDeferredPrompt(null);
    });

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
    setShowBanner(false);
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    setShowBanner(false);
    localStorage.setItem('apas_pwa_dismissed', String(Date.now()));
  }, []);

  if (isInstalled || !showBanner) return null;

  const t = {
    title: lang === 'ar' ? 'حمّل تطبيق APAS' : lang === 'fr' ? 'Installer APAS' : 'Install APAS App',
    desc: lang === 'ar'
      ? 'ثبّت التطبيق على جهازك للوصول السريع والعمل بدون إنترنت'
      : lang === 'fr'
        ? 'Installez l\'app pour un accès rapide et le mode hors ligne'
        : 'Install the app for quick access and offline mode',
    install: lang === 'ar' ? 'تثبيت' : lang === 'fr' ? 'Installer' : 'Install',
    later: lang === 'ar' ? 'لاحقاً' : lang === 'fr' ? 'Plus tard' : 'Later',
  };

  return (
    <div className="fixed bottom-20 left-3 right-3 z-[75] md:bottom-6 md:left-auto md:right-6 md:w-80 animate-slideUp">
      <div className="bg-background/95 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl shadow-black/20 p-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20 shrink-0">
            <Smartphone className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h4 className="text-sm font-bold text-foreground">{t.title}</h4>
              <button onClick={handleDismiss} className="p-1 rounded-lg hover:bg-secondary active:scale-90 transition-all touch-manipulation shrink-0">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{t.desc}</p>
            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={handleInstall}
                className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-semibold shadow-lg shadow-primary/25 hover:shadow-xl active:scale-95 transition-all touch-manipulation"
              >
                <Download className="w-3.5 h-3.5" />
                {t.install}
              </button>
              <button
                onClick={handleDismiss}
                className="px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground rounded-xl hover:bg-secondary transition-all touch-manipulation"
              >
                {t.later}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PWAInstallPrompt;

// Standalone Download Section component for LandingPage
export const DownloadSection: React.FC<{
  lang: string;
  downloadTitle: string;
  downloadSubtitle: string;
  downloadBtn: string;
  downloadBtnLinux: string;
  downloadNote: string;
}> = ({ lang, downloadTitle, downloadSubtitle, downloadBtn, downloadBtnLinux, downloadNote }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    setIsStandalone(window.matchMedia('(display-mode: standalone)').matches);
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handlePWAInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  };

  const androidLabel = lang === 'ar' ? 'تطبيق Android (PWA)' : lang === 'fr' ? 'App Android (PWA)' : 'Android App (PWA)';
  const pwaInstallLabel = lang === 'ar' ? 'تثبيت كتطبيق' : lang === 'fr' ? 'Installer l\'app' : 'Install as App';

  return (
    <section id="download-section" className="relative z-10 w-full">
      <div className="bg-gradient-to-b from-[#0a1628] to-[#0d1f3c] py-20 sm:py-28">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <span className="inline-block text-xs font-mono tracking-[0.3em] uppercase text-primary/80 mb-6">
            [ {lang === 'ar' ? 'تحميل التطبيق' : lang === 'fr' ? 'TÉLÉCHARGER' : 'DOWNLOAD APP'} ]
          </span>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight">
            {downloadTitle}
          </h2>

          <p className="text-base sm:text-lg text-gray-400 mb-10 max-w-xl mx-auto leading-relaxed">
            {downloadSubtitle}
          </p>

          {/* Download Buttons Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto mb-6">
            {/* Windows */}
            <a
              href="https://github.com/PicaBis/APAS/releases/latest"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-primary to-primary/80 text-white rounded-xl font-semibold text-sm shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/40 hover:-translate-y-1 transition-all duration-300"
            >
              <Monitor className="w-5 h-5" />
              {downloadBtn}
              <Download className="w-4 h-4 transition-transform duration-300 group-hover:translate-y-0.5" />
            </a>

            {/* Linux */}
            <a
              href="https://github.com/PicaBis/APAS/releases/tag/v1.0.1"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-[#E95420] to-[#77216F] text-white rounded-xl font-semibold text-sm shadow-lg shadow-[#E95420]/25 hover:shadow-xl hover:shadow-[#E95420]/40 hover:-translate-y-1 transition-all duration-300"
            >
              <Monitor className="w-5 h-5" />
              {downloadBtnLinux}
              <Download className="w-4 h-4 transition-transform duration-300 group-hover:translate-y-0.5" />
            </a>

            {/* Android / PWA Install */}
            {deferredPrompt ? (
              <button
                onClick={handlePWAInstall}
                className="group inline-flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-xl font-semibold text-sm shadow-lg shadow-green-500/25 hover:shadow-xl hover:shadow-green-500/40 hover:-translate-y-1 transition-all duration-300"
              >
                <Smartphone className="w-5 h-5" />
                {androidLabel}
                <Download className="w-4 h-4 transition-transform duration-300 group-hover:translate-y-0.5" />
              </button>
            ) : (
              <button
                onClick={() => {
                  // For iOS or browsers that don't support beforeinstallprompt
                  alert(lang === 'ar'
                    ? 'لتثبيت التطبيق:\n1. افتح القائمة في المتصفح\n2. اختر "إضافة إلى الشاشة الرئيسية"\n3. اضغط "إضافة"'
                    : 'To install the app:\n1. Open browser menu\n2. Select "Add to Home Screen"\n3. Tap "Add"'
                  );
                }}
                className="group inline-flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-xl font-semibold text-sm shadow-lg shadow-green-500/25 hover:shadow-xl hover:shadow-green-500/40 hover:-translate-y-1 transition-all duration-300"
              >
                <Smartphone className="w-5 h-5" />
                {androidLabel}
                <Download className="w-4 h-4 transition-transform duration-300 group-hover:translate-y-0.5" />
              </button>
            )}

            {/* iOS */}
            <button
              onClick={() => {
                alert(lang === 'ar'
                  ? 'لتثبيت على iOS:\n1. افتح في Safari\n2. اضغط على زر المشاركة\n3. اختر "إضافة إلى الشاشة الرئيسية"'
                  : 'To install on iOS:\n1. Open in Safari\n2. Tap Share button\n3. Select "Add to Home Screen"'
                );
              }}
              className="group inline-flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-gray-700 to-gray-600 text-white rounded-xl font-semibold text-sm shadow-lg shadow-gray-700/25 hover:shadow-xl hover:shadow-gray-700/40 hover:-translate-y-1 transition-all duration-300"
            >
              <Apple className="w-5 h-5" />
              {lang === 'ar' ? 'iOS (Safari)' : 'iOS (Safari)'}
              <Download className="w-4 h-4 transition-transform duration-300 group-hover:translate-y-0.5" />
            </button>
          </div>

          {/* PWA Install button if available */}
          {deferredPrompt && !isStandalone && (
            <button
              onClick={handlePWAInstall}
              className="mt-4 inline-flex items-center gap-2 px-6 py-3 bg-white/10 text-white rounded-xl font-medium text-sm border border-white/20 hover:bg-white/20 transition-all duration-300"
            >
              <Download className="w-4 h-4" />
              {pwaInstallLabel}
            </button>
          )}

          <p className="text-sm text-gray-500 mt-6">
            {downloadNote}
          </p>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      </div>
    </section>
  );
};
