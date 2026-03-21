import React, { useState } from 'react';
import { X, ChevronDown, Globe, Volume2, VolumeX, Moon, Sun, Palette, Info, FileText, Wrench, Calculator, Ruler, Settings, Compass, Filter, Crosshair, Shield } from 'lucide-react';
import { playNav, playUIClick, playToggle } from '@/utils/sound';

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
  lang: string;
  // Language
  onSwitchLanguage: (lang: 'ar' | 'en' | 'fr') => void;
  // Sound
  isMuted: boolean;
  onToggleMute: () => void;
  // Night mode
  nightMode: boolean;
  onToggleNightMode: () => void;
  // Themes
  accentColor: string;
  accentColors: { id: string; label: string; hsl: string; ring: string }[];
  onAccentChange: (id: string) => void;
  // Info / Guide
  onOpenGuide: () => void;
  // Documentation
  onOpenDocumentation: () => void;
  // Tools
  onOpenCalculator: () => void;
  onToggleRuler: () => void;
  rulerActive: boolean;
  is3DMode: boolean;
  // New features
  onToggleProtractor: () => void;
  protractorActive: boolean;
  onOpenNoiseFilter: () => void;
  onOpenLiveCalibration: () => void;
  onOpenSecurityPrivacy: () => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({
  open,
  onClose,
  lang,
  onSwitchLanguage,
  isMuted,
  onToggleMute,
  nightMode,
  onToggleNightMode,
  accentColor,
  accentColors,
  onAccentChange,
  onOpenGuide,
  onOpenDocumentation,
  onOpenCalculator,
  onToggleRuler,
  rulerActive,
  is3DMode,
  onToggleProtractor,
  protractorActive,
  onOpenNoiseFilter,
  onOpenLiveCalibration,
  onOpenSecurityPrivacy,
}) => {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    language: false,
    sound: false,
    display: false,
    themes: false,
    tools: false,
    analysis: false,
    security: false,
    help: false,
  });

  const t = (ar: string, en: string, fr: string) =>
    lang === 'ar' ? ar : lang === 'fr' ? fr : en;

  const toggleSection = (key: string) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
    playNav(isMuted);
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={`fixed ${lang === 'ar' ? 'right-0' : 'left-0'} top-0 h-full w-[320px] sm:w-[360px] bg-card backdrop-blur-xl border-${lang === 'ar' ? 'l' : 'r'} border-border/50 shadow-2xl shadow-black/20 z-[61] overflow-hidden flex flex-col animate-slideDown`}
        dir={lang === 'ar' ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 bg-gradient-to-r from-primary/5 to-transparent shrink-0">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" />
            <h2 className="text-sm font-bold text-foreground tracking-wide">
              {t('الإعدادات', 'Settings', 'Paramètres')}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all duration-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="p-3 space-y-2">

            {/* ── Language Section ── */}
            <SettingsSection
              title={t('اللغة', 'Language', 'Langue')}
              icon={<Globe className="w-4 h-4" />}
              expanded={expandedSections.language}
              onToggle={() => toggleSection('language')}
              preview={lang === 'ar' ? 'العربية' : lang === 'fr' ? 'Français' : 'English'}
            >
              <div className="space-y-1">
                {[
                  { code: 'ar' as const, label: 'العربية', flag: '🇩🇿' },
                  { code: 'en' as const, label: 'English', flag: '🇬🇧' },
                  { code: 'fr' as const, label: 'Français', flag: '🇫🇷' },
                ].map(({ code, label, flag }) => (
                  <button
                    key={code}
                    onClick={() => { onSwitchLanguage(code); playUIClick(isMuted); }}
                    className={`w-full text-left px-3 py-2.5 text-xs rounded-lg flex items-center gap-2.5 transition-all duration-200 ${
                      lang === code
                        ? 'bg-primary/10 text-primary border border-primary/20'
                        : 'text-foreground hover:bg-primary/5 border border-transparent hover:border-border/30'
                    }`}
                  >
                    <span className="text-sm">{flag}</span>
                    <span className="font-medium">{label}</span>
                    {lang === code && <span className="text-primary mr-auto rtl:ml-auto rtl:mr-0">✓</span>}
                  </button>
                ))}
              </div>
            </SettingsSection>

            {/* ── Sound Section ── */}
            <SettingsSection
              title={t('الصوت', 'Sound', 'Son')}
              icon={isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              expanded={expandedSections.sound}
              onToggle={() => toggleSection('sound')}
              preview={isMuted ? t('صامت', 'Muted', 'Muet') : t('مفعل', 'On', 'Activé')}
            >
              <button
                onClick={() => { onToggleMute(); playToggle(isMuted, !isMuted); }}
                className={`w-full text-xs font-medium py-2.5 px-3 rounded-lg flex items-center gap-2 transition-all duration-300 ${
                  !isMuted
                    ? 'bg-gradient-to-r from-primary to-primary/80 text-primary-foreground border border-primary/50 shadow-md shadow-primary/20'
                    : 'text-foreground hover:bg-primary/10 border border-border/50 hover:border-primary/20'
                }`}
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                {isMuted ? t('تفعيل الصوت', 'Enable Sound', 'Activer le Son') : t('كتم الصوت', 'Mute Sound', 'Couper le Son')}
              </button>
            </SettingsSection>

            {/* ── Display Section (Night Mode) ── */}
            <SettingsSection
              title={t('العرض', 'Display', 'Affichage')}
              icon={nightMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              expanded={expandedSections.display}
              onToggle={() => toggleSection('display')}
              preview={nightMode ? t('ليلي', 'Dark', 'Sombre') : t('نهاري', 'Light', 'Clair')}
            >
              <button
                onClick={() => { onToggleNightMode(); playToggle(isMuted, !nightMode); }}
                className={`w-full text-xs font-medium py-2.5 px-3 rounded-lg flex items-center gap-2 transition-all duration-300 ${
                  nightMode
                    ? 'bg-gradient-to-r from-primary to-primary/80 text-primary-foreground border border-primary/50 shadow-md shadow-primary/20'
                    : 'text-foreground hover:bg-primary/10 border border-border/50 hover:border-primary/20'
                }`}
              >
                {nightMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                {nightMode
                  ? t('التبديل إلى الوضع النهاري', 'Switch to Light Mode', 'Passer en Mode Clair')
                  : t('التبديل إلى الوضع الليلي', 'Switch to Dark Mode', 'Passer en Mode Sombre')
                }
              </button>
            </SettingsSection>

            {/* ── Themes Section ── */}
            <SettingsSection
              title={t('الثيمات', 'Themes', 'Thèmes')}
              icon={<Palette className="w-4 h-4" />}
              expanded={expandedSections.themes}
              onToggle={() => toggleSection('themes')}
              preview={
                <span
                  className="w-3.5 h-3.5 rounded-full inline-block border border-border/30"
                  style={{ backgroundColor: `hsl(${accentColors.find(c => c.id === accentColor)?.hsl || '172 66% 50%'})` }}
                />
              }
            >
              <div className="grid grid-cols-2 gap-1.5">
                {accentColors.map(c => (
                  <button
                    key={c.id}
                    onClick={() => { onAccentChange(c.id); playUIClick(isMuted); }}
                    className={`text-left px-2.5 py-2 text-xs rounded-lg flex items-center gap-2 transition-all duration-200 ${
                      accentColor === c.id
                        ? 'bg-primary/10 text-primary border border-primary/20 shadow-sm'
                        : 'text-foreground hover:bg-primary/5 border border-transparent hover:border-border/30'
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded-full shrink-0 ${accentColor === c.id ? 'ring-2 ring-offset-1 ring-primary/50 ring-offset-background' : ''}`}
                      style={{ backgroundColor: `hsl(${c.hsl})` }}
                    />
                    <span className="font-medium truncate">{c.label}</span>
                  </button>
                ))}
              </div>
            </SettingsSection>

            {/* ── Tools Section ── */}
            <SettingsSection
              title={t('الأدوات', 'Tools', 'Outils')}
              icon={<Wrench className="w-4 h-4" />}
              expanded={expandedSections.tools}
              onToggle={() => toggleSection('tools')}
            >
              <div className="space-y-1.5">
                {/* Calculator */}
                <button
                  onClick={() => { onOpenCalculator(); onClose(); playUIClick(isMuted); }}
                  className="w-full text-xs font-medium py-2.5 px-3 rounded-lg flex items-center gap-2 text-foreground hover:bg-primary/10 border border-border/50 hover:border-primary/20 transition-all duration-300"
                >
                  <Calculator className="w-4 h-4 text-primary" />
                  <div className="text-left rtl:text-right">
                    <div>{t('آلة حاسبة علمية', 'Scientific Calculator', 'Calculatrice Scientifique')}</div>
                    <div className="text-[9px] text-muted-foreground mt-0.5">
                      {t('قابلة للسحب والتحريك', 'Draggable & resizable', 'Déplaçable et redimensionnable')}
                    </div>
                  </div>
                </button>

                {/* Ruler */}
                <button
                  onClick={() => { onToggleRuler(); playUIClick(isMuted); }}
                  className={`w-full text-xs font-medium py-2.5 px-3 rounded-lg flex items-center gap-2 transition-all duration-300 ${
                    rulerActive
                      ? 'bg-gradient-to-r from-primary to-primary/80 text-primary-foreground border border-primary/50 shadow-md shadow-primary/20'
                      : is3DMode
                        ? 'text-muted-foreground border border-border/30 cursor-not-allowed opacity-50'
                        : 'text-foreground hover:bg-primary/10 border border-border/50 hover:border-primary/20'
                  }`}
                  disabled={is3DMode}
                >
                  <Ruler className="w-4 h-4" />
                  <div className="text-left rtl:text-right">
                    <div>{t('مسطرة القياس', 'Measurement Ruler', 'Règle de Mesure')}</div>
                    <div className="text-[9px] mt-0.5" style={{ opacity: 0.7 }}>
                      {is3DMode
                        ? t('متاحة في الوضع ثنائي الأبعاد فقط', 'Available in 2D mode only', 'Disponible en mode 2D uniquement')
                        : rulerActive
                          ? t('المسطرة مفعلة - اضغط لإزالتها', 'Ruler active - click to remove', 'Règle active - cliquer pour retirer')
                          : t('قابلة للسحب داخل الكانفاس', 'Draggable inside the canvas', 'Déplaçable dans le canevas')
                      }
                    </div>
                  </div>
                </button>
                {/* Protractor */}
                <button
                  onClick={() => { onToggleProtractor(); playUIClick(isMuted); }}
                  className={`w-full text-xs font-medium py-2.5 px-3 rounded-lg flex items-center gap-2 transition-all duration-300 ${
                    protractorActive
                      ? 'bg-gradient-to-r from-primary to-primary/80 text-primary-foreground border border-primary/50 shadow-md shadow-primary/20'
                      : is3DMode
                        ? 'text-muted-foreground border border-border/30 cursor-not-allowed opacity-50'
                        : 'text-foreground hover:bg-primary/10 border border-border/50 hover:border-primary/20'
                  }`}
                  disabled={is3DMode}
                >
                  <Compass className="w-4 h-4" />
                  <div className="text-left rtl:text-right">
                    <div>{t('منقلة', 'Protractor', 'Rapporteur')}</div>
                    <div className="text-[9px] mt-0.5" style={{ opacity: 0.7 }}>
                      {is3DMode
                        ? t('متاحة في الوضع ثنائي الأبعاد فقط', 'Available in 2D mode only', 'Disponible en mode 2D uniquement')
                        : protractorActive
                          ? t('المنقلة مفعلة - اضغط لإزالتها', 'Protractor active - click to remove', 'Rapporteur actif - cliquer pour retirer')
                          : t('قابلة للسحب داخل الكانفاس', 'Draggable inside the canvas', 'Déplaçable dans le canevas')
                      }
                    </div>
                  </div>
                </button>

                {/* Live Calibration */}
                <button
                  onClick={() => { onOpenLiveCalibration(); onClose(); playUIClick(isMuted); }}
                  className="w-full text-xs font-medium py-2.5 px-3 rounded-lg flex items-center gap-2 text-foreground hover:bg-primary/10 border border-border/50 hover:border-primary/20 transition-all duration-300"
                >
                  <Crosshair className="w-4 h-4 text-primary" />
                  <div className="text-left rtl:text-right">
                    <div>{t('المعايرة الحية', 'Live Calibration', 'Calibration en Direct')}</div>
                    <div className="text-[9px] text-muted-foreground mt-0.5">
                      {t('ارسم خطاً مرجعياً لضبط القياسات', 'Draw a reference line to set scale', 'Tracez une ligne de référence')}
                    </div>
                  </div>
                </button>
              </div>
            </SettingsSection>

            {/* ── Security & Privacy Section ── */}
            <SettingsSection
              title={t('الأمان والخصوصية', 'Security & Privacy', 'Sécurité et Confidentialité')}
              icon={<Shield className="w-4 h-4" />}
              expanded={expandedSections.security}
              onToggle={() => toggleSection('security')}
            >
              <div className="space-y-1.5">
                <button
                  onClick={() => { onOpenSecurityPrivacy(); onClose(); playUIClick(isMuted); }}
                  className="w-full text-xs font-medium py-2.5 px-3 rounded-lg flex items-center gap-2 text-foreground hover:bg-primary/10 border border-border/50 hover:border-primary/20 transition-all duration-300"
                >
                  <Shield className="w-4 h-4 text-primary" />
                  <div className="text-left rtl:text-right">
                    <div>{t('إعدادات الأمان', 'Security Settings', 'Paramètres de Sécurité')}</div>
                    <div className="text-[9px] text-muted-foreground mt-0.5">
                      {t('تشفير البيانات وحذف الفيديو التلقائي', 'Data encryption & auto-delete videos', 'Chiffrement et suppression auto des vidéos')}
                    </div>
                  </div>
                </button>
              </div>
            </SettingsSection>

            {/* ── Help & Info Section ── */}
            <SettingsSection
              title={t('المساعدة', 'Help', 'Aide')}
              icon={<Info className="w-4 h-4" />}
              expanded={expandedSections.help}
              onToggle={() => toggleSection('help')}
            >
              <div className="space-y-1.5">
                <button
                  onClick={() => { onOpenGuide(); onClose(); playNav(isMuted); }}
                  className="w-full text-xs font-medium py-2.5 px-3 rounded-lg flex items-center gap-2 text-foreground hover:bg-primary/10 border border-border/50 hover:border-primary/20 transition-all duration-300"
                >
                  <Info className="w-4 h-4 text-primary" />
                  {t('دليل التطبيق', 'App Guide', 'Guide de l\'Application')}
                </button>
                <button
                  onClick={() => { onOpenDocumentation(); onClose(); playNav(isMuted); }}
                  className="w-full text-xs font-medium py-2.5 px-3 rounded-lg flex items-center gap-2 text-foreground hover:bg-primary/10 border border-border/50 hover:border-primary/20 transition-all duration-300"
                >
                  <FileText className="w-4 h-4 text-primary" />
                  {t('التوثيق', 'Documentation', 'Documentation')}
                </button>
              </div>
            </SettingsSection>

          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 px-4 py-3 border-t border-border/30 bg-secondary/20">
          <p className="text-[10px] text-muted-foreground text-center">
            APAS — {t('محاكي حركة المقذوفات المتقدم', 'Advanced Projectile Simulator', 'Simulateur de Projectile Avancé')}
          </p>
        </div>
      </div>
    </>
  );
};

// ── Reusable collapsible settings section ──
function SettingsSection({
  title,
  icon,
  expanded,
  onToggle,
  preview,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  expanded: boolean;
  onToggle: () => void;
  preview?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-border/40 rounded-xl overflow-hidden bg-card/70 backdrop-blur-sm transition-all duration-300 hover:border-border/60">
      <button
        onClick={onToggle}
        className="w-full px-3 py-2.5 flex items-center justify-between hover:bg-primary/5 transition-all duration-200"
      >
        <div className="flex items-center gap-2">
          <span className="text-primary">{icon}</span>
          <span className="text-xs font-semibold text-foreground">{title}</span>
        </div>
        <div className="flex items-center gap-2">
          {!expanded && preview && (
            <span className="text-[10px] text-muted-foreground font-mono flex items-center gap-1">
              {preview}
            </span>
          )}
          <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </button>
      {expanded && (
        <div className="px-3 pb-3 border-t border-border/20 animate-slideDown">
          <div className="pt-2.5">{children}</div>
        </div>
      )}
    </div>
  );
}

export default SettingsPanel;
