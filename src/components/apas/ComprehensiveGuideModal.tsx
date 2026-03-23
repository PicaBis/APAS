import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BookOpen, Layout, Sliders, Play, BarChart3, Brain, Wrench, Settings, Monitor, ChevronRight, Globe, Camera, Layers, Upload, Box, Gauge, Zap, Eye, GraduationCap, Shield } from 'lucide-react';

type SectionKey = 'overview' | 'interface' | 'simulation' | 'parameters' | 'analysis' | 'ai' | 'tools' | 'settings' | 'classroom' | 'auth';

interface ComprehensiveGuideModalProps {
  open: boolean;
  onClose: () => void;
  lang: string;
}

const SECTIONS: { key: SectionKey; iconEl: React.ReactNode; labelAr: string; labelEn: string; labelFr: string }[] = [
  { key: 'overview', iconEl: <BookOpen className="w-4 h-4" />, labelAr: 'نظرة عامة', labelEn: 'Overview', labelFr: 'Vue d\'ensemble' },
  { key: 'interface', iconEl: <Layout className="w-4 h-4" />, labelAr: 'الواجهة الرئيسية', labelEn: 'Main Interface', labelFr: 'Interface Principale' },
  { key: 'simulation', iconEl: <Play className="w-4 h-4" />, labelAr: 'المحاكاة والتشغيل', labelEn: 'Simulation & Controls', labelFr: 'Simulation & Commandes' },
  { key: 'parameters', iconEl: <Sliders className="w-4 h-4" />, labelAr: 'المعاملات والإعدادات', labelEn: 'Parameters & Settings', labelFr: 'Paramètres & Réglages' },
  { key: 'analysis', iconEl: <BarChart3 className="w-4 h-4" />, labelAr: 'التحليل والرسوم البيانية', labelEn: 'Analysis & Charts', labelFr: 'Analyse & Graphiques' },
  { key: 'ai', iconEl: <Brain className="w-4 h-4" />, labelAr: 'الذكاء الاصطناعي', labelEn: 'AI Features', labelFr: 'Fonctionnalités IA' },
  { key: 'tools', iconEl: <Wrench className="w-4 h-4" />, labelAr: 'الأدوات المساعدة', labelEn: 'Tools & Utilities', labelFr: 'Outils & Utilitaires' },
  { key: 'settings', iconEl: <Settings className="w-4 h-4" />, labelAr: 'الإعدادات', labelEn: 'Settings', labelFr: 'Paramètres' },
  { key: 'classroom', iconEl: <GraduationCap className="w-4 h-4" />, labelAr: 'الفصل الدراسي', labelEn: 'Classroom', labelFr: 'Salle de Classe' },
  { key: 'auth', iconEl: <Shield className="w-4 h-4" />, labelAr: 'الحسابات والتسجيل', labelEn: 'Accounts & Auth', labelFr: 'Comptes & Auth' },
];

const ComprehensiveGuideModal: React.FC<ComprehensiveGuideModalProps> = ({ open, onClose, lang }) => {
  const [activeSection, setActiveSection] = useState<SectionKey>('overview');
  const isRTL = lang === 'ar';

  const getLabel = (s: typeof SECTIONS[0]) => lang === 'ar' ? s.labelAr : lang === 'fr' ? s.labelFr : s.labelEn;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-5xl max-h-[90vh] p-0 gap-0 overflow-hidden border-border bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
        {/* Header */}
        <div className="border-b border-border px-6 py-4 bg-gradient-to-r from-primary/5 to-transparent">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-foreground flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              {lang === 'ar' ? 'الدليل الشامل للتطبيق — APAS' : lang === 'fr' ? 'Guide Complet de l\'Application — APAS' : 'Comprehensive Application Guide — APAS'}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              {lang === 'ar' ? 'دليل تفصيلي يشرح كل عنصر وقسم في التطبيق' : lang === 'fr' ? 'Guide détaillé expliquant chaque élément de l\'application' : 'Detailed guide explaining every element and section in the application'}
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Two-column layout: sidebar + content */}
        <div className="flex flex-col sm:flex-row flex-1 overflow-hidden" style={{ maxHeight: 'calc(90vh - 100px)' }}>
          {/* Sidebar navigation */}
          <div className="sm:w-56 shrink-0 border-b sm:border-b-0 sm:border-e border-border bg-secondary/20 overflow-x-auto sm:overflow-x-visible sm:overflow-y-auto">
            <div className="flex sm:flex-col p-2 gap-1">
              {SECTIONS.map((s) => (
                <button
                  key={s.key}
                  onClick={() => setActiveSection(s.key)}
                  className={`flex items-center gap-2 px-3 py-2.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap ${
                    activeSection === s.key
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                  }`}
                >
                  {s.iconEl}
                  <span className="truncate">{getLabel(s)}</span>
                  {activeSection === s.key && <ChevronRight className={`w-3 h-3 ms-auto hidden sm:block ${isRTL ? 'rotate-180' : ''}`} />}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <ScrollArea className="flex-1">
            <div className="p-6">
              {activeSection === 'overview' && <OverviewSection lang={lang} />}
              {activeSection === 'interface' && <InterfaceSection lang={lang} />}
              {activeSection === 'simulation' && <SimulationSection lang={lang} />}
              {activeSection === 'parameters' && <ParametersSection lang={lang} />}
              {activeSection === 'analysis' && <AnalysisSection lang={lang} />}
              {activeSection === 'ai' && <AISection lang={lang} />}
              {activeSection === 'tools' && <ToolsSection lang={lang} />}
              {activeSection === 'settings' && <SettingsSection lang={lang} />}
              {activeSection === 'classroom' && <ClassroomSection lang={lang} />}
              {activeSection === 'auth' && <AuthSection lang={lang} />}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};

/* ── Reusable sub-components ── */

function SectionTitle({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <h3 className="text-base font-bold text-foreground flex items-center gap-2 mb-4 pb-2 border-b border-border">
      <span className="text-primary">{icon}</span>
      {children}
    </h3>
  );
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" />
        {title}
      </h4>
      <div className="text-xs text-muted-foreground leading-relaxed space-y-2 ps-4">{children}</div>
    </div>
  );
}

function GuideItem({ label, desc }: { label: string; desc: string }) {
  return (
    <div className="flex gap-3 items-start py-2 border-b border-border/20 last:border-0">
      <span className="text-primary font-bold text-[10px] bg-primary/10 px-1.5 py-0.5 rounded shrink-0 mt-0.5">{label}</span>
      <p className="text-[11px] text-muted-foreground leading-relaxed">{desc}</p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════ */
/*  Section: Overview                                      */
/* ═══════════════════════════════════════════════════════ */
function OverviewSection({ lang }: { lang: string }) {
  const isAr = lang === 'ar';
  const isFr = lang === 'fr';
  const t = (ar: string, en: string, fr: string) => isAr ? ar : isFr ? fr : en;

  return (
    <div>
      <SectionTitle icon={<BookOpen className="w-5 h-5" />}>
        {t('نظرة عامة على APAS', 'APAS Overview', 'Vue d\'ensemble d\'APAS')}
      </SectionTitle>

      <SubSection title={t('ما هو APAS؟', 'What is APAS?', 'Qu\'est-ce qu\'APAS?')}>
        <p>{t(
          'APAS (نظام تحليل المقذوفات بالذكاء الاصطناعي) هو تطبيق أكاديمي متكامل يجمع بين الفيزياء الكلاسيكية والذكاء الاصطناعي لتحليل وفهم حركة المقذوفات. يوفر محاكاة تفاعلية ثنائية وثلاثية الأبعاد مع أدوات تحليل متقدمة.',
          'APAS (AI-Powered Projectile Analysis System) is a comprehensive academic application combining classical physics with AI for analyzing and understanding projectile motion. It provides interactive 2D and 3D simulations with advanced analysis tools.',
          'APAS (Système d\'Analyse de Projectiles par IA) est une application académique combinant la physique classique avec l\'IA pour analyser le mouvement des projectiles.'
        )}</p>
      </SubSection>

      <SubSection title={t('المميزات الرئيسية', 'Key Features', 'Fonctionnalités Clés')}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {[
            { icon: '🎯', label: t('محاكاة فيزيائية دقيقة', 'Accurate Physics Simulation', 'Simulation physique précise'), desc: t('Euler, RK4, AI-APAS', 'Euler, RK4, AI-APAS', 'Euler, RK4, AI-APAS') },
            { icon: '🧠', label: t('ذكاء اصطناعي للتحليل', 'AI-Powered Analysis', 'Analyse par IA'), desc: t('تحليل فيديو وصور', 'Video & image analysis', 'Analyse vidéo et image') },
            { icon: '📊', label: t('رسوم بيانية تفاعلية', 'Interactive Charts', 'Graphiques interactifs'), desc: t('تمثيل بياني متقدم', 'Advanced graphical representation', 'Représentation graphique avancée') },
            { icon: '🌍', label: t('بيئات كوكبية متعددة', 'Multiple Planetary Environments', 'Environnements planétaires'), desc: t('الأرض، القمر، المريخ...', 'Earth, Moon, Mars...', 'Terre, Lune, Mars...') },
            { icon: '📷', label: t('تصوير ستروبوسكوبي', 'Stroboscopic Photography', 'Photographie stroboscopique'), desc: t('التقاط صور متتابعة', 'Sequential image capture', 'Capture d\'images séquentielles') },
            { icon: '🔬', label: t('محاكاة ثلاثية الأبعاد', '3D Simulation', 'Simulation 3D'), desc: t('بيئة تفاعلية كاملة', 'Full interactive environment', 'Environnement interactif complet') },
          ].map((f, i) => (
            <div key={i} className="border border-border/30 rounded-lg p-2.5 bg-card/50">
              <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">{f.icon} {f.label}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{f.desc}</p>
            </div>
          ))}
        </div>
      </SubSection>

      <SubSection title={t('اللغات المدعومة', 'Supported Languages', 'Langues Supportées')}>
        <div className="flex gap-2">
          {[
            { flag: '🇩🇿', name: t('العربية', 'Arabic', 'Arabe') },
            { flag: '🇬🇧', name: t('الإنجليزية', 'English', 'Anglais') },
            { flag: '🇫🇷', name: t('الفرنسية', 'French', 'Français') },
          ].map((l, i) => (
            <span key={i} className="text-xs border border-border/40 rounded-md px-2.5 py-1.5 bg-secondary/30 flex items-center gap-1.5">
              {l.flag} {l.name}
            </span>
          ))}
        </div>
      </SubSection>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════ */
/*  Section: Interface                                     */
/* ═══════════════════════════════════════════════════════ */
function InterfaceSection({ lang }: { lang: string }) {
  const isAr = lang === 'ar';
  const isFr = lang === 'fr';
  const t = (ar: string, en: string, fr: string) => isAr ? ar : isFr ? fr : en;

  return (
    <div>
      <SectionTitle icon={<Layout className="w-5 h-5" />}>
        {t('الواجهة الرئيسية', 'Main Interface', 'Interface Principale')}
      </SectionTitle>

      <SubSection title={t('شريط التنقل العلوي', 'Top Navigation Bar', 'Barre de Navigation')}>
        <GuideItem label={t('الشعار', 'Logo', 'Logo')} desc={t('شعار APAS — النقر عليه يعود إلى الصفحة الرئيسية', 'APAS Logo — clicking returns to home page', 'Logo APAS — cliquer retourne à la page d\'accueil')} />
        <GuideItem label={t('زر الإعدادات', 'Settings', 'Paramètres')} desc={t('يفتح لوحة الإعدادات الجانبية (اللغة، الصوت، العرض، الثيمات، الأدوات)', 'Opens the settings side panel (language, sound, display, themes, tools)', 'Ouvre le panneau latéral des paramètres')} />
        <GuideItem label={t('زر البيئة', 'Environment', 'Environnement')} desc={t('اختيار بيئة المحاكاة (الأرض، القمر، المريخ، المشتري، الفراغ، تحت الماء)', 'Select simulation environment (Earth, Moon, Mars, Jupiter, Vacuum, Underwater)', 'Sélectionner l\'environnement de simulation')} />
        <GuideItem label={t('الوضع ثنائي/ثلاثي الأبعاد', '2D/3D Toggle', '2D/3D Basculer')} desc={t('التبديل بين المحاكاة ثنائية وثلاثية الأبعاد', 'Switch between 2D and 3D simulation modes', 'Basculer entre les modes 2D et 3D')} />
        <GuideItem label={t('عداد الوقت', 'Time Display', 'Affichage du Temps')} desc={t('يعرض الزمن الحالي للمحاكاة بالثانية', 'Shows current simulation time in seconds', 'Affiche le temps actuel de simulation en secondes')} />
      </SubSection>

      <SubSection title={t('لوحة الكانفاس (منطقة الرسم)', 'Canvas Panel (Drawing Area)', 'Panneau Canvas (Zone de Dessin)')}>
        <GuideItem label={t('الكانفاس', 'Canvas', 'Canvas')} desc={t('منطقة الرسم الرئيسية حيث يُعرض المسار والمقذوف. تدعم التكبير/التصغير والسحب والتقاط الصور.', 'Main drawing area where trajectory and projectile are displayed. Supports zoom, pan, and screenshot capture.', 'Zone de dessin principale avec zoom, déplacement et capture d\'écran.')} />
        <GuideItem label={t('شريط أدوات الكانفاس', 'Canvas Toolbar', 'Barre d\'Outils Canvas')} desc={t('يحتوي أزرار: تكبير (+)، تصغير (-)، ملء الشاشة، التقاط صورة، إظهار الشبكة، وضع التركيز', 'Contains buttons: zoom in (+), zoom out (-), fullscreen, screenshot, grid toggle, focus mode', 'Contient les boutons: zoom, plein écran, capture, grille, mode focus')} />
        <GuideItem label={t('شريط التقدم الزمني', 'Timeline Scrubber', 'Barre de Progression')} desc={t('شريط تمرير يسمح بالتنقل عبر الزمن في المحاكاة', 'Slider that allows scrubbing through simulation time', 'Curseur permettant de naviguer dans le temps de simulation')} />
      </SubSection>

      <SubSection title={t('اللوحة اليمنى', 'Right Panel', 'Panneau Droit')}>
        <GuideItem label={t('رؤية APAS', 'APAS Vision', 'Vision APAS')} desc={t('قسم رفع الصور والفيديو لتحليلها بالذكاء الاصطناعي واستخراج معاملات المقذوف', 'Image/video upload section for AI analysis to extract projectile parameters', 'Section d\'upload d\'images/vidéos pour analyse IA')} />
        <GuideItem label={t('الإعدادات المسبقة', 'Presets', 'Préréglages')} desc={t('قائمة بسيناريوهات جاهزة (كرة قدم، كرة سلة، قذيفة مدفع...) تضبط المعاملات تلقائياً', 'Preset scenarios (football, basketball, cannonball...) that auto-set parameters', 'Scénarios prédéfinis qui configurent automatiquement les paramètres')} />
        <GuideItem label={t('إدارة الجلسات', 'Session Manager', 'Gestionnaire de Sessions')} desc={t('حفظ وتحميل جلسات المحاكاة مع جميع المعاملات', 'Save and load simulation sessions with all parameters', 'Sauvegarder et charger des sessions de simulation')} />
      </SubSection>

      <SubSection title={t('اللوحة اليسرى', 'Left Panel', 'Panneau Gauche')}>
        <GuideItem label={t('معاملات الإطلاق', 'Launch Parameters', 'Paramètres de Lancement')} desc={t('السرعة، الزاوية، الارتفاع — مع منزلقات وحقول إدخال رقمية', 'Velocity, angle, height — with sliders and numeric input fields', 'Vitesse, angle, hauteur — avec curseurs et champs numériques')} />
        <GuideItem label={t('زر المحاكاة', 'Simulate Button', 'Bouton Simuler')} desc={t('يبدأ المحاكاة. يتحول إلى "إيقاف" أثناء التشغيل و"أكمل" عند الإيقاف المؤقت', 'Starts simulation. Changes to "Pause" during playback and "Continue" when paused', 'Lance la simulation. Devient "Pause" pendant la lecture')} />
        <GuideItem label={t('زر إعادة التعيين', 'Reset Button', 'Bouton Réinitialiser')} desc={t('يعيد المحاكاة إلى الحالة الأولى مع الحفاظ على المعاملات الحالية', 'Resets simulation to initial state while keeping current parameters', 'Réinitialise la simulation en conservant les paramètres actuels')} />
      </SubSection>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════ */
/*  Section: Simulation & Controls                         */
/* ═══════════════════════════════════════════════════════ */
function SimulationSection({ lang }: { lang: string }) {
  const isAr = lang === 'ar';
  const isFr = lang === 'fr';
  const t = (ar: string, en: string, fr: string) => isAr ? ar : isFr ? fr : en;

  return (
    <div>
      <SectionTitle icon={<Play className="w-5 h-5" />}>
        {t('المحاكاة والتشغيل', 'Simulation & Controls', 'Simulation & Commandes')}
      </SectionTitle>

      <SubSection title={t('أزرار التحكم', 'Control Buttons', 'Boutons de Contrôle')}>
        <GuideItem label={t('محاكاة/إيقاف', 'Simulate/Pause', 'Simuler/Pause')} desc={t('بدء أو إيقاف مؤقت للمحاكاة الحالية', 'Start or pause the current simulation', 'Démarrer ou mettre en pause la simulation')} />
        <GuideItem label={t('إعادة', 'Reset', 'Réinitialiser')} desc={t('إرجاع الزمن إلى الصفر وإعادة المقذوف إلى نقطة البداية', 'Reset time to zero and return projectile to starting point', 'Remettre le temps à zéro')} />
        <GuideItem label={t('سرعة التشغيل', 'Playback Speed', 'Vitesse de Lecture')} desc={t('التحكم في سرعة المحاكاة: 0.25x، 0.5x، 1x، 2x، 4x', 'Control simulation speed: 0.25x, 0.5x, 1x, 2x, 4x', 'Contrôler la vitesse: 0.25x, 0.5x, 1x, 2x, 4x')} />
      </SubSection>

      <SubSection title={t('المحاكاة ثنائية الأبعاد', '2D Simulation', 'Simulation 2D')}>
        <p>{t(
          'المحاكاة الافتراضية. يعرض الكانفاس المسار على مستوى x-y مع إمكانية إظهار الشبكة، المتجهات، والعلامات الستروبوسكوبية.',
          'Default simulation mode. The canvas displays the trajectory on the x-y plane with options for grid, vectors, and stroboscopic marks.',
          'Mode par défaut. Le canvas affiche la trajectoire sur le plan x-y avec grille, vecteurs et marques stroboscopiques.'
        )}</p>
      </SubSection>

      <SubSection title={t('المحاكاة ثلاثية الأبعاد', '3D Simulation', 'Simulation 3D')}>
        <p>{t(
          'يعرض المسار في بيئة ثلاثية الأبعاد تفاعلية باستخدام Three.js. يمكنك تدوير المشهد بالسحب، والتكبير بعجلة الماوس. تتوفر ثلاثة ثيمات: مختبر محسّن، أكاديمي أبيض، وتقني داكن.',
          'Displays trajectory in an interactive 3D environment using Three.js. You can rotate by dragging, zoom with mouse wheel. Three themes available: Refined Lab, Academic White, Technical Dark.',
          'Affiche la trajectoire dans un environnement 3D interactif avec Three.js. Rotation par glissement, zoom avec la molette. Trois thèmes disponibles.'
        )}</p>
      </SubSection>

      <SubSection title={t('طرق التكامل العددي', 'Integration Methods', 'Méthodes d\'Intégration')}>
        <GuideItem label="Euler" desc={t('طريقة أويلر — بسيطة وسريعة لكن أقل دقة. مناسبة للتعليم ومقارنة الأخطاء.', 'Euler method — simple and fast but less accurate. Good for teaching and error comparison.', 'Méthode d\'Euler — simple et rapide mais moins précise.')} />
        <GuideItem label="RK4" desc={t('رونج-كوتا من الرتبة الرابعة — أكثر دقة بكثير من أويلر. الخيار الافتراضي والموصى به.', 'Runge-Kutta 4th order — much more accurate than Euler. Default and recommended choice.', 'Runge-Kutta d\'ordre 4 — beaucoup plus précis qu\'Euler. Choix par défaut.')} />
        <GuideItem label="AI-APAS" desc={t('محرك الذكاء الاصطناعي الخاص بـ APAS — يستخدم نماذج تعلم آلي مدربة على بيانات فيزيائية.', 'APAS proprietary AI engine — uses ML models trained on physics data.', 'Moteur IA propriétaire d\'APAS — utilise des modèles ML entraînés.')} />
      </SubSection>

      <SubSection title={t('اختصارات لوحة المفاتيح', 'Keyboard Shortcuts', 'Raccourcis Clavier')}>
        <div className="grid grid-cols-2 gap-1.5">
          {[
            { key: 'Space', desc: t('تشغيل/إيقاف', 'Play/Pause', 'Lecture/Pause') },
            { key: 'R', desc: t('إعادة تعيين', 'Reset', 'Réinitialiser') },
            { key: '+/-', desc: t('تكبير/تصغير', 'Zoom in/out', 'Zoom +/-') },
            { key: 'G', desc: t('الشبكة', 'Toggle grid', 'Grille') },
            { key: 'F', desc: t('ملء الشاشة', 'Fullscreen', 'Plein écran') },
            { key: 'Ctrl+Z/Y', desc: t('تراجع/إعادة', 'Undo/Redo', 'Annuler/Rétablir') },
          ].map((s, i) => (
            <div key={i} className="flex items-center gap-2 text-[11px]">
              <kbd className="px-1.5 py-0.5 rounded bg-secondary border border-border text-[10px] font-mono text-foreground">{s.key}</kbd>
              <span className="text-muted-foreground">{s.desc}</span>
            </div>
          ))}
        </div>
      </SubSection>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════ */
/*  Section: Parameters                                    */
/* ═══════════════════════════════════════════════════════ */
function ParametersSection({ lang }: { lang: string }) {
  const isAr = lang === 'ar';
  const isFr = lang === 'fr';
  const t = (ar: string, en: string, fr: string) => isAr ? ar : isFr ? fr : en;

  return (
    <div>
      <SectionTitle icon={<Sliders className="w-5 h-5" />}>
        {t('المعاملات والإعدادات', 'Parameters & Settings', 'Paramètres & Réglages')}
      </SectionTitle>

      <SubSection title={t('معاملات الإطلاق الأساسية', 'Basic Launch Parameters', 'Paramètres de Lancement de Base')}>
        <GuideItem label={t('السرعة (v₀)', 'Velocity (v₀)', 'Vitesse (v₀)')} desc={t('سرعة الإطلاق الابتدائية بوحدة م/ث. النطاق: 0.1 - 1000 م/ث', 'Initial launch velocity in m/s. Range: 0.1 - 1000 m/s', 'Vitesse initiale de lancement en m/s. Plage: 0.1 - 1000 m/s')} />
        <GuideItem label={t('الزاوية (θ)', 'Angle (θ)', 'Angle (θ)')} desc={t('زاوية الإطلاق بالدرجات. النطاق: 0° - 90°. الزاوية 45° تعطي أقصى مدى (بدون مقاومة هواء)', 'Launch angle in degrees. Range: 0° - 90°. 45° gives maximum range (no air resistance)', 'Angle de lancement en degrés. 45° donne la portée maximale')} />
        <GuideItem label={t('الارتفاع (h)', 'Height (h)', 'Hauteur (h)')} desc={t('ارتفاع نقطة الإطلاق عن الأرض بالمتر. النطاق: 0 - 500 م', 'Launch point height above ground in meters. Range: 0 - 500 m', 'Hauteur du point de lancement en mètres. Plage: 0 - 500 m')} />
      </SubSection>

      <SubSection title={t('معاملات الفيزياء', 'Physics Parameters', 'Paramètres Physiques')}>
        <GuideItem label={t('الجاذبية (g)', 'Gravity (g)', 'Gravité (g)')} desc={t('تسارع الجاذبية. يتغير تلقائياً عند اختيار بيئة كوكبية. الأرض = 9.81 م/ث²', 'Gravitational acceleration. Auto-changes with planetary environment. Earth = 9.81 m/s²', 'Accélération gravitationnelle. Terre = 9.81 m/s²')} />
        <GuideItem label={t('مقاومة الهواء (k)', 'Air Resistance (k)', 'Résistance de l\'Air (k)')} desc={t('معامل مقاومة الهواء. القيمة 0 تعني بدون مقاومة (الحركة المثالية)', 'Air resistance coefficient. Value 0 means no resistance (ideal motion)', 'Coefficient de résistance. 0 = pas de résistance')} />
        <GuideItem label={t('الكتلة (m)', 'Mass (m)', 'Masse (m)')} desc={t('كتلة المقذوف بالكيلوغرام. تؤثر على حسابات مقاومة الهواء والطاقة', 'Projectile mass in kg. Affects air resistance and energy calculations', 'Masse du projectile en kg. Affecte la résistance et l\'énergie')} />
        <GuideItem label={t('سرعة الرياح', 'Wind Speed', 'Vitesse du Vent')} desc={t('سرعة الرياح الأفقية بالمتر/ثانية. القيم الموجبة تعني رياح مع اتجاه الحركة', 'Horizontal wind speed in m/s. Positive = wind with motion direction', 'Vitesse horizontale du vent en m/s')} />
      </SubSection>

      <SubSection title={t('الفيزياء المتقدمة', 'Advanced Physics', 'Physique Avancée')}>
        <p>{t(
          'يمكنك تفعيل تأثيرات فيزيائية إضافية من لوحة الفيزياء المتقدمة:',
          'You can enable additional physical effects from the Advanced Physics panel:',
          'Vous pouvez activer des effets physiques supplémentaires:'
        )}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mt-2">
          {[
            t('تأثير كوريوليس', 'Coriolis Effect', 'Effet de Coriolis'),
            t('تأثير ماغنوس', 'Magnus Effect', 'Effet Magnus'),
            t('كثافة الهواء مع الارتفاع', 'Altitude Density', 'Densité en Altitude'),
            t('الطفو', 'Buoyancy', 'Flottabilité'),
            t('السحب الهيدروديناميكي', 'Hydrodynamic Drag', 'Traînée Hydrodynamique'),
            t('التأثير الجيروسكوبي', 'Gyroscopic Effect', 'Effet Gyroscopique'),
            t('الاستقرار الباليستي', 'Ballistic Stability', 'Stabilité Balistique'),
            t('التأثيرات النسبية', 'Relativistic Effects', 'Effets Relativistes'),
          ].map((effect, i) => (
            <span key={i} className="text-[10px] border border-border/30 rounded px-2 py-1 bg-card/50">{effect}</span>
          ))}
        </div>
      </SubSection>

      <SubSection title={t('البيئات الكوكبية', 'Planetary Environments', 'Environnements Planétaires')}>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
          {[
            { name: t('الأرض', 'Earth', 'Terre'), g: '9.81' },
            { name: t('القمر', 'Moon', 'Lune'), g: '1.62' },
            { name: t('المريخ', 'Mars', 'Mars'), g: '3.72' },
            { name: t('المشتري', 'Jupiter', 'Jupiter'), g: '24.79' },
            { name: t('الفراغ', 'Vacuum', 'Vide'), g: '9.81*' },
            { name: t('تحت الماء', 'Underwater', 'Sous l\'Eau'), g: '9.81' },
          ].map((env, i) => (
            <div key={i} className="border border-border/30 rounded px-2.5 py-1.5 bg-secondary/20 text-center">
              <p className="text-[11px] font-semibold text-foreground">{env.name}</p>
              <p className="text-[10px] text-muted-foreground">g = {env.g} m/s²</p>
            </div>
          ))}
        </div>
      </SubSection>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════ */
/*  Section: Analysis                                      */
/* ═══════════════════════════════════════════════════════ */
function AnalysisSection({ lang }: { lang: string }) {
  const isAr = lang === 'ar';
  const isFr = lang === 'fr';
  const t = (ar: string, en: string, fr: string) => isAr ? ar : isFr ? fr : en;

  return (
    <div>
      <SectionTitle icon={<BarChart3 className="w-5 h-5" />}>
        {t('التحليل والرسوم البيانية', 'Analysis & Charts', 'Analyse & Graphiques')}
      </SectionTitle>

      <SubSection title={t('قسم النتائج', 'Results Section', 'Section Résultats')}>
        <p>{t(
          'بعد تشغيل المحاكاة، يعرض القسم النتائج الفيزيائية المحسوبة:',
          'After running the simulation, results section displays computed physical values:',
          'Après la simulation, la section résultats affiche les valeurs physiques calculées:'
        )}</p>
        <GuideItem label={t('المدى', 'Range', 'Portée')} desc={t('المسافة الأفقية الكلية المقطوعة', 'Total horizontal distance traveled', 'Distance horizontale totale parcourue')} />
        <GuideItem label={t('أقصى ارتفاع', 'Max Height', 'Hauteur Max')} desc={t('أعلى نقطة يصل إليها المقذوف', 'Highest point reached by projectile', 'Point le plus haut atteint par le projectile')} />
        <GuideItem label={t('زمن الطيران', 'Flight Time', 'Temps de Vol')} desc={t('الزمن الكلي من الإطلاق حتى الوصول إلى الأرض', 'Total time from launch to ground contact', 'Temps total du lancement à l\'atterrissage')} />
        <GuideItem label={t('سرعة الاصطدام', 'Impact Velocity', 'Vitesse d\'Impact')} desc={t('سرعة المقذوف لحظة ملامسته الأرض', 'Projectile speed at moment of ground contact', 'Vitesse du projectile au moment du contact')} />
      </SubSection>

      <SubSection title={t('التمثيل البياني التفاعلي', 'Interactive Graphing', 'Graphiques Interactifs')}>
        <p>{t(
          'يمكنك اختيار أي متغيرين لعرضهما على الرسم البياني (المحور x و y). المتغيرات المتاحة: الزمن، الموضع x، الموضع y، السرعة vx، السرعة vy، السرعة الكلية v، الطاقة الحركية KE، الطاقة الكامنة PE.',
          'You can select any two variables for the chart (x and y axes). Available variables: time, position x, position y, velocity vx, vy, total velocity v, kinetic energy KE, potential energy PE.',
          'Vous pouvez sélectionner deux variables pour le graphique. Variables disponibles: temps, position, vitesse, énergie.'
        )}</p>
      </SubSection>

      <SubSection title={t('تحليل الطاقة', 'Energy Analysis', 'Analyse d\'Énergie')}>
        <p>{t(
          'يعرض قسم تحليل الطاقة رسماً بيانياً للطاقة الحركية والكامنة والكلية عبر الزمن. يساعد في فهم مبدأ حفظ الطاقة وتأثير مقاومة الهواء على فقد الطاقة.',
          'Energy analysis section shows a chart of kinetic, potential, and total energy over time. Helps understand energy conservation and air resistance energy loss.',
          'La section analyse d\'énergie montre un graphique de l\'énergie cinétique, potentielle et totale au fil du temps.'
        )}</p>
      </SubSection>

      <SubSection title={t('اشتقاق المعادلات', 'Equation Derivation', 'Dérivation des Équations')}>
        <p>{t(
          'قسم "اشتقاق المعادلات خطوة بخطوة" يعرض كيف تم حساب كل قيمة فيزيائية: تحليل السرعة، معادلات الحركة، زمن الطيران، أقصى ارتفاع، المدى الأفقي، سرعة الاصطدام. كل خطوة تعرض المعادلة والتعويض والقيمة النهائية.',
          'The "Step-by-Step Derivation" section shows how each physical value was calculated: velocity decomposition, equations of motion, flight time, max height, range, impact velocity. Each step shows the equation, substitution, and final value.',
          'La section "Dérivation étape par étape" montre le calcul de chaque valeur physique.'
        )}</p>
      </SubSection>

      <SubSection title={t('محاكاة مونت كارلو', 'Monte Carlo Simulation', 'Simulation Monte Carlo')}>
        <p>{t(
          'تشغيل مئات المحاكاات العشوائية بتغيير طفيف في المعاملات لدراسة حساسية النتائج وتوزيعها الإحصائي.',
          'Run hundreds of random simulations with slight parameter variations to study result sensitivity and statistical distribution.',
          'Exécuter des centaines de simulations aléatoires pour étudier la sensibilité des résultats.'
        )}</p>
      </SubSection>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════ */
/*  Section: AI                                            */
/* ═══════════════════════════════════════════════════════ */
function AISection({ lang }: { lang: string }) {
  const isAr = lang === 'ar';
  const isFr = lang === 'fr';
  const t = (ar: string, en: string, fr: string) => isAr ? ar : isFr ? fr : en;

  return (
    <div>
      <SectionTitle icon={<Brain className="w-5 h-5" />}>
        {t('الذكاء الاصطناعي', 'AI Features', 'Fonctionnalités IA')}
      </SectionTitle>

      <SubSection title={t('رؤية APAS (تحليل الصور والفيديو)', 'APAS Vision (Image & Video Analysis)', 'Vision APAS (Analyse Image & Vidéo)')}>
        <p>{t(
          'ارفع صورة أو فيديو لمقذوف حقيقي وسيقوم APAS باستخراج المعاملات تلقائياً (السرعة، الزاوية، الارتفاع) باستخدام نماذج الذكاء الاصطناعي.',
          'Upload an image or video of a real projectile and APAS will automatically extract parameters (velocity, angle, height) using AI models.',
          'Téléchargez une image ou vidéo d\'un projectile réel et APAS extraira automatiquement les paramètres.'
        )}</p>
        <GuideItem label={t('الفيديو', 'Video', 'Vidéo')} desc={t('يتم تقسيمه إلى إطارات، ترميزها بـ Base64، وإرسالها لنموذج الذكاء الاصطناعي لتحليل المسار', 'Split into frames, encoded in Base64, and sent to AI model for trajectory analysis', 'Divisé en images, encodé en Base64, et envoyé au modèle IA')} />
        <GuideItem label={t('الصور', 'Images', 'Images')} desc={t('يتم تحليل الصورة مباشرة لاستخراج معاملات المقذوف والمسار', 'Image is directly analyzed to extract projectile parameters and trajectory', 'L\'image est analysée directement pour extraire les paramètres')} />
      </SubSection>

      <SubSection title={t('نماذج التنبؤ', 'Prediction Models', 'Modèles de Prédiction')}>
        <p>{t(
          'يعرض قسم الذكاء الاصطناعي مقاييس دقة كل نموذج تنبؤي: R² (معامل التحديد)، MAE (متوسط الخطأ المطلق)، RMSE (جذر متوسط مربعات الخطأ).',
          'The AI section displays accuracy metrics for each prediction model: R² (coefficient of determination), MAE (mean absolute error), RMSE (root mean square error).',
          'La section IA affiche les métriques de précision: R², MAE, RMSE.'
        )}</p>
      </SubSection>

      <SubSection title={t('الذكاء الاصطناعي القابل للتفسير', 'Explainable AI', 'IA Explicable')}>
        <p>{t(
          'يوضح كيف توصل نموذج الذكاء الاصطناعي إلى تنبؤاته — أي المعاملات التي أثرت أكثر على النتيجة ولماذا.',
          'Explains how the AI model reached its predictions — which parameters had the most influence and why.',
          'Explique comment le modèle IA a atteint ses prédictions — quels paramètres ont eu le plus d\'influence.'
        )}</p>
      </SubSection>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════ */
/*  Section: Tools                                         */
/* ═══════════════════════════════════════════════════════ */
function ToolsSection({ lang }: { lang: string }) {
  const isAr = lang === 'ar';
  const isFr = lang === 'fr';
  const t = (ar: string, en: string, fr: string) => isAr ? ar : isFr ? fr : en;

  return (
    <div>
      <SectionTitle icon={<Wrench className="w-5 h-5" />}>
        {t('الأدوات المساعدة', 'Tools & Utilities', 'Outils & Utilitaires')}
      </SectionTitle>

      <SubSection title={t('الأدوات التفاعلية', 'Interactive Tools', 'Outils Interactifs')}>
        <GuideItem label={t('آلة حاسبة علمية', 'Scientific Calculator', 'Calculatrice Scientifique')} desc={t('آلة حاسبة كاملة قابلة للسحب والتحريك على الشاشة. تدعم الدوال المثلثية واللوغاريتمية.', 'Full calculator, draggable on screen. Supports trigonometric and logarithmic functions.', 'Calculatrice complète, déplaçable. Supporte les fonctions trigonométriques.')} />
        <GuideItem label={t('مسطرة القياس', 'Measurement Ruler', 'Règle de Mesure')} desc={t('مسطرة قابلة للسحب داخل الكانفاس لقياس المسافات. متاحة في الوضع ثنائي الأبعاد فقط.', 'Draggable ruler inside the canvas for measuring distances. Available in 2D mode only.', 'Règle déplaçable pour mesurer les distances. Disponible en mode 2D uniquement.')} />
        <GuideItem label={t('منقلة', 'Protractor', 'Rapporteur')} desc={t('أداة لقياس الزوايا داخل الكانفاس. متاحة في الوضع ثنائي الأبعاد فقط.', 'Angle measurement tool inside the canvas. Available in 2D mode only.', 'Outil de mesure d\'angles. Disponible en mode 2D uniquement.')} />
      </SubSection>

      <SubSection title={t('أدوات البيانات', 'Data Tools', 'Outils de Données')}>
        <GuideItem label={t('تصفية الضوضاء', 'Noise Filtering', 'Filtrage du Bruit')} desc={t('تطبيق مرشحات Kalman أو المتوسط المتحرك لتنعيم البيانات التجريبية', 'Apply Kalman or Moving Average filters to smooth experimental data', 'Appliquer des filtres Kalman ou Moyenne Mobile pour lisser les données')} />
        <GuideItem label={t('معايرة الكانفاس', 'Canvas Calibration', 'Calibration du Canvas')} desc={t('معايرة الكانفاس لتطابق الأبعاد الحقيقية باستخدام مرجع معروف الطول', 'Calibrate canvas to match real dimensions using a known-length reference', 'Calibrer le canvas pour correspondre aux dimensions réelles')} />
        <GuideItem label={t('تصدير البيانات', 'Data Export', 'Exportation de Données')} desc={t('تصدير بيانات المسار كملف CSV أو JSON، أو تصدير صورة PNG للكانفاس', 'Export trajectory data as CSV or JSON, or export canvas as PNG image', 'Exporter les données de trajectoire en CSV/JSON ou l\'image en PNG')} />
      </SubSection>

      <SubSection title={t('التصوير الستروبوسكوبي', 'Stroboscopic Photography', 'Photographie Stroboscopique')}>
        <p>{t(
          'يلتقط صوراً متتابعة للمقذوف عند فترات زمنية منتظمة (ΔT قابل للتعديل). يمكن إظهار الإسقاطات الأفقية والرأسية وتفاصيل كل علامة (الموضع، السرعة، الطاقة).',
          'Captures sequential images of the projectile at regular time intervals (adjustable ΔT). Can show horizontal and vertical projections and details for each mark (position, velocity, energy).',
          'Capture des images séquentielles du projectile à intervalles réguliers (ΔT ajustable).'
        )}</p>
      </SubSection>

      <SubSection title={t('تسجيل المحاكاة', 'Simulation Recording', 'Enregistrement de Simulation')}>
        <p>{t(
          'تسجيل فيديو للمحاكاة وتصديره كملف MP4 أو WebM. يمكن ضبط جودة التسجيل ومدته.',
          'Record simulation video and export as MP4 or WebM. Recording quality and duration are adjustable.',
          'Enregistrer la simulation en vidéo et exporter en MP4 ou WebM.'
        )}</p>
      </SubSection>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════ */
/*  Section: Settings                                      */
/* ═══════════════════════════════════════════════════════ */
function SettingsSection({ lang }: { lang: string }) {
  const isAr = lang === 'ar';
  const isFr = lang === 'fr';
  const t = (ar: string, en: string, fr: string) => isAr ? ar : isFr ? fr : en;

  return (
    <div>
      <SectionTitle icon={<Settings className="w-5 h-5" />}>
        {t('الإعدادات', 'Settings', 'Paramètres')}
      </SectionTitle>

      <SubSection title={t('اللغة', 'Language', 'Langue')}>
        <p>{t(
          'اختيار لغة الواجهة: العربية (RTL)، الإنجليزية، أو الفرنسية. يتم حفظ الاختيار تلقائياً.',
          'Select interface language: Arabic (RTL), English, or French. Selection is saved automatically.',
          'Sélectionner la langue de l\'interface: Arabe (RTL), Anglais, ou Français.'
        )}</p>
      </SubSection>

      <SubSection title={t('الصوت', 'Sound', 'Son')}>
        <p>{t(
          'تفعيل أو كتم أصوات التفاعل (نقرات الأزرار، تبديل الأقسام، تأثيرات صوتية). يتم حفظ الإعداد محلياً.',
          'Enable or mute interaction sounds (button clicks, section toggles, sound effects). Setting is saved locally.',
          'Activer ou couper les sons d\'interaction. Le paramètre est sauvegardé localement.'
        )}</p>
      </SubSection>

      <SubSection title={t('العرض (الوضع الليلي/النهاري)', 'Display (Dark/Light Mode)', 'Affichage (Mode Sombre/Clair)')}>
        <p>{t(
          'التبديل بين الوضع النهاري والليلي. يؤثر على جميع ألوان الواجهة والكانفاس.',
          'Toggle between light and dark mode. Affects all interface and canvas colors.',
          'Basculer entre le mode clair et sombre. Affecte toutes les couleurs.'
        )}</p>
      </SubSection>

      <SubSection title={t('الثيمات (ألوان التمييز)', 'Themes (Accent Colors)', 'Thèmes (Couleurs d\'Accent)')}>
        <p>{t(
          'اختيار لون التمييز الرئيسي للواجهة من بين عدة خيارات (أخضر، أزرق، بنفسجي، وردي، برتقالي...). يغير لون الأزرار والحدود والعناصر التفاعلية.',
          'Choose the main accent color from multiple options (green, blue, purple, pink, orange...). Changes button, border, and interactive element colors.',
          'Choisir la couleur d\'accent parmi plusieurs options. Change les couleurs des boutons et éléments interactifs.'
        )}</p>
      </SubSection>

      <SubSection title={t('ثيم 3D', '3D Theme', 'Thème 3D')}>
        <GuideItem label={t('مختبر محسّن', 'Refined Lab', 'Labo Raffiné')} desc={t('المظهر الافتراضي مع إضاءة متوازنة وخلفية رمادية', 'Default appearance with balanced lighting and gray background', 'Apparence par défaut avec éclairage équilibré')} />
        <GuideItem label={t('أكاديمي أبيض', 'Academic White', 'Blanc Académique')} desc={t('خلفية بيضاء نظيفة مناسبة للنشر والطباعة الأكاديمية', 'Clean white background suitable for academic publishing and printing', 'Fond blanc propre pour la publication académique')} />
        <GuideItem label={t('تقني داكن', 'Technical Dark', 'Technique Sombre')} desc={t('وضع مظلم عالي التقنية مع إضاءة دراماتيكية', 'High-tech dark mode with dramatic lighting', 'Mode sombre haute technologie avec éclairage dramatique')} />
      </SubSection>

      <SubSection title={t('الأمان والخصوصية', 'Security & Privacy', 'Sécurité & Confidentialité')}>
        <p>{t(
          'إعدادات تشفير البيانات المحلية والحذف التلقائي لملفات الفيديو بعد التحليل.',
          'Local data encryption settings and automatic video file deletion after analysis.',
          'Paramètres de chiffrement des données locales et suppression automatique des vidéos.'
        )}</p>
      </SubSection>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════ */
/*  Section: Classroom                                     */
/* ═══════════════════════════════════════════════════════ */
function ClassroomSection({ lang }: { lang: string }) {
  const isAr = lang === 'ar';
  const isFr = lang === 'fr';
  const t = (ar: string, en: string, fr: string) => isAr ? ar : isFr ? fr : en;

  return (
    <div>
      <SectionTitle icon={<GraduationCap className="w-5 h-5" />}>
        {t('الفصل الدراسي', 'Classroom', 'Salle de Classe')}
      </SectionTitle>

      <SubSection title={t('نظام إدارة الفصول', 'Classroom Management System', 'Système de Gestion de Classe')}>
        <p>{t(
          'نظام متكامل يسمح للأساتذة بإنشاء فصول دراسية افتراضية وإضافة طلاب ومتابعة تقدمهم.',
          'Integrated system allowing teachers to create virtual classrooms, add students, and track their progress.',
          'Système intégré permettant aux enseignants de créer des classes virtuelles et suivre les progrès des élèves.'
        )}</p>
      </SubSection>

      <SubSection title={t('ميزات الأستاذ', 'Teacher Features', 'Fonctionnalités Enseignant')}>
        <GuideItem label={t('إنشاء فصل', 'Create Class', 'Créer une Classe')} desc={t('إنشاء فصل دراسي جديد بكود فريد يشاركه مع الطلاب', 'Create a new classroom with a unique code to share with students', 'Créer une classe avec un code unique à partager')} />
        <GuideItem label={t('التمارين', 'Exercises', 'Exercices')} desc={t('إنشاء تمارين ومسائل فيزيائية مع حلول تلقائية', 'Create physics exercises and problems with automatic solutions', 'Créer des exercices de physique avec solutions automatiques')} />
        <GuideItem label={t('المتابعة', 'Monitoring', 'Suivi')} desc={t('متابعة تقدم الطلاب وعرض إحصائيات الأداء', 'Monitor student progress and view performance statistics', 'Suivre les progrès des élèves et voir les statistiques')} />
      </SubSection>

      <SubSection title={t('ميزات الطالب', 'Student Features', 'Fonctionnalités Élève')}>
        <GuideItem label={t('الانضمام', 'Join', 'Rejoindre')} desc={t('الانضمام إلى فصل دراسي باستخدام كود الفصل المقدم من الأستاذ', 'Join a classroom using the class code provided by the teacher', 'Rejoindre une classe avec le code fourni par l\'enseignant')} />
        <GuideItem label={t('حل التمارين', 'Solve Exercises', 'Résoudre les Exercices')} desc={t('حل التمارين المعينة واستلام التقييم الفوري', 'Solve assigned exercises and receive instant feedback', 'Résoudre les exercices assignés et recevoir un retour instantané')} />
      </SubSection>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════ */
/*  Section: Auth                                          */
/* ═══════════════════════════════════════════════════════ */
function AuthSection({ lang }: { lang: string }) {
  const isAr = lang === 'ar';
  const isFr = lang === 'fr';
  const t = (ar: string, en: string, fr: string) => isAr ? ar : isFr ? fr : en;

  return (
    <div>
      <SectionTitle icon={<Shield className="w-5 h-5" />}>
        {t('الحسابات والتسجيل', 'Accounts & Authentication', 'Comptes & Authentification')}
      </SectionTitle>

      <SubSection title={t('أنواع الحسابات', 'Account Types', 'Types de Comptes')}>
        <GuideItem label={t('مستخدم مسجل', 'Registered User', 'Utilisateur Inscrit')} desc={t('حساب كامل مع إمكانية حفظ الجلسات، الوصول إلى الذكاء الاصطناعي، إنشاء/الانضمام للفصول الدراسية', 'Full account with session saving, AI access, classroom creation/joining', 'Compte complet avec sauvegarde de sessions, accès IA, classes')} />
        <GuideItem label={t('زائر', 'Guest', 'Visiteur')} desc={t('وصول محدود بدون تسجيل. لا يمكن حفظ الجلسات أو استخدام ميزات الذكاء الاصطناعي المتقدمة', 'Limited access without registration. Cannot save sessions or use advanced AI features', 'Accès limité sans inscription. Pas de sauvegarde ni IA avancée')} />
        <GuideItem label={t('أستاذ', 'Teacher', 'Enseignant')} desc={t('صلاحيات إضافية لإدارة الفصول والتمارين ومتابعة الطلاب', 'Additional permissions for classroom management, exercises, and student monitoring', 'Permissions supplémentaires pour la gestion de classe')} />
      </SubSection>

      <SubSection title={t('التسجيل وتسجيل الدخول', 'Sign Up & Login', 'Inscription & Connexion')}>
        <GuideItem label={t('إنشاء حساب', 'Sign Up', 'S\'inscrire')} desc={t('إنشاء حساب جديد بالبريد الإلكتروني وكلمة المرور. يتطلب تأكيد البريد الإلكتروني.', 'Create a new account with email and password. Email confirmation required.', 'Créer un compte avec email et mot de passe. Confirmation email requise.')} />
        <GuideItem label={t('تسجيل الدخول', 'Login', 'Connexion')} desc={t('الدخول بالبريد الإلكتروني وكلمة المرور. يمكن أيضاً الدخول كزائر.', 'Sign in with email and password. Can also enter as guest.', 'Se connecter avec email et mot de passe. Possible en tant que visiteur.')} />
        <GuideItem label={t('الدخول كزائر', 'Guest Access', 'Accès Visiteur')} desc={t('الدخول بدون تسجيل مع وصول محدود لبعض الميزات', 'Enter without registration with limited access to some features', 'Entrer sans inscription avec accès limité à certaines fonctionnalités')} />
      </SubSection>
    </div>
  );
}

export default ComprehensiveGuideModal;
