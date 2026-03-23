import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, BookOpen, Library, TrendingUp, Share2, Copy, Check, ExternalLink } from 'lucide-react';

type TabKey = 'docs' | 'sources' | 'evaluation' | 'share';

interface DocumentationModalProps {
  open: boolean;
  onClose: () => void;
  lang: string;
}

const TABS: { key: TabKey; labelAr: string; labelEn: string; labelFr: string; icon: React.ReactNode }[] = [
  { key: 'docs', labelAr: 'التوثيق', labelEn: 'Documentation', labelFr: 'Documentation', icon: <BookOpen className="w-4 h-4" /> },
  { key: 'sources', labelAr: 'المصادر', labelEn: 'Sources', labelFr: 'Sources', icon: <Library className="w-4 h-4" /> },
  { key: 'evaluation', labelAr: 'التقييم والتوصيات', labelEn: 'Evaluation & Recommendations', labelFr: 'Évaluation', icon: <TrendingUp className="w-4 h-4" /> },
  { key: 'share', labelAr: 'المشاركة', labelEn: 'Share', labelFr: 'Partager', icon: <Share2 className="w-4 h-4" /> },
];

const DocumentationModal: React.FC<DocumentationModalProps> = ({ open, onClose, lang }) => {
  const [activeTab, setActiveTab] = useState<TabKey>('docs');
  const [copied, setCopied] = useState(false);
  const isRTL = lang === 'ar';

  const appUrl = 'https://aipas.vercel.app';

  const handleCopy = () => {
    navigator.clipboard.writeText(appUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getLabel = (tab: typeof TABS[0]) => {
    if (lang === 'ar') return tab.labelAr;
    if (lang === 'fr') return tab.labelFr;
    return tab.labelEn;
  };

  const socialLinks = [
    { name: 'X (Twitter)', url: `https://twitter.com/intent/tweet?url=${encodeURIComponent(appUrl)}&text=${encodeURIComponent('APAS - AI-Powered Projectile Analysis System')}`, color: 'bg-foreground/10 hover:bg-foreground/20' },
    { name: 'LinkedIn', url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(appUrl)}`, color: 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400' },
    { name: 'Facebook', url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(appUrl)}`, color: 'bg-blue-600/10 hover:bg-blue-600/20 text-blue-700 dark:text-blue-300' },
    { name: 'WhatsApp', url: `https://wa.me/?text=${encodeURIComponent('APAS - AI-Powered Projectile Analysis System\n' + appUrl)}`, color: 'bg-green-500/10 hover:bg-green-500/20 text-green-600 dark:text-green-400' },
    { name: 'Telegram', url: `https://t.me/share/url?url=${encodeURIComponent(appUrl)}&text=${encodeURIComponent('APAS - AI-Powered Projectile Analysis System')}`, color: 'bg-sky-500/10 hover:bg-sky-500/20 text-sky-600 dark:text-sky-400' },
    { name: 'Reddit', url: `https://reddit.com/submit?url=${encodeURIComponent(appUrl)}&title=${encodeURIComponent('APAS - AI-Powered Projectile Analysis System')}`, color: 'bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 dark:text-orange-400' },
    { name: 'Email', url: `mailto:?subject=${encodeURIComponent('APAS - AI-Powered Projectile Analysis System')}&body=${encodeURIComponent('Check out APAS:\n' + appUrl)}`, color: 'bg-muted hover:bg-muted/80' },
  ];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] p-0 gap-0 overflow-hidden border-border bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
        {/* Header */}
        <div className="border-b border-border px-6 py-4">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-foreground flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              {lang === 'ar' ? 'توثيق المشروع — APAS' : lang === 'fr' ? 'Documentation du Projet — APAS' : 'Project Documentation — APAS'}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {lang === 'ar' ? 'توثيق مشروع APAS والمصادر والتقييم' : 'APAS project documentation, sources, and evaluation'}
            </DialogDescription>
          </DialogHeader>

          {/* Tab navigation */}
          <div className="flex gap-1 mt-4 overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md transition-all whitespace-nowrap ${
                  activeTab === tab.key
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                }`}
              >
                {tab.icon}
                {getLabel(tab)}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1 max-h-[60vh]">
          <div className="p-6">
            {activeTab === 'docs' && <DocsTab lang={lang} />}
            {activeTab === 'sources' && <SourcesTab lang={lang} />}
            {activeTab === 'evaluation' && <EvaluationTab lang={lang} />}
            {activeTab === 'share' && (
              <ShareTab
                lang={lang}
                appUrl={appUrl}
                copied={copied}
                onCopy={handleCopy}
                socialLinks={socialLinks}
              />
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

/* ═══════════════════════════════════════════════════════ */
/*  TAB 1: Documentation                                  */
/* ═══════════════════════════════════════════════════════ */
const DocsTab: React.FC<{ lang: string }> = ({ lang }) => {
  const isAr = lang === 'ar';

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="mb-6">
      <h3 className="text-sm font-bold text-foreground border-b border-border pb-2 mb-3 flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" />
        {title}
      </h3>
      <div className="text-xs text-muted-foreground leading-relaxed space-y-2">{children}</div>
    </div>
  );

  return (
    <div>
      {/* School Logo */}
      <div className="flex flex-col items-center mb-6">
        <img
          src="/ensl-logo.jpg"
          alt="ENSL - Ecole Normale Supérieure Laghouat"
          className="w-24 h-24 object-contain rounded-lg shadow-md border border-border"
        />
        <p className="text-[11px] text-muted-foreground mt-2 font-medium">
          {isAr ? 'المدرسة العليا للأساتذة - الأغواط' : 'Ecole Normale Supérieure - Laghouat'}
        </p>
      </div>

      <Section title={isAr ? '🏗️ كيف تم بناء التطبيق' : '🏗️ How the App Was Built'}>
        <p>{isAr
          ? 'تم تطوير APAS (نظام تحليل المقذوفات بالذكاء الاصطناعي) كمشروع أكاديمي تطبيقي يجمع بين الفيزياء الكلاسيكية والذكاء الاصطناعي. تمت البرمجة باستخدام عدة بيئات تطوير متكاملة:'
          : 'APAS (AI-Powered Projectile Analysis System) was developed as an applied academic project combining classical physics with artificial intelligence. Development utilized multiple integrated environments:'}</p>
      </Section>

      <Section title={isAr ? '💻 بيئات التطوير المستخدمة' : '💻 Development Environments'}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { name: 'Lovable', desc: isAr ? 'منصة التطوير بالذكاء الاصطناعي — تصميم واجهات ذكي وبناء سريع' : 'AI development platform — smart UI design and rapid building' },
            { name: 'Windsurf', desc: isAr ? 'بيئة تطوير بذكاء اصطناعي متقدم — كتابة أكواد ومراجعة ذكية' : 'Advanced AI IDE — intelligent code writing and review' },
            { name: 'Visual Studio Code', desc: isAr ? 'محرر أكواد متقدم — تحرير دقيق وتكاملات Git' : 'Advanced code editor — precise editing and Git integration' },
          ].map((env) => (
            <div key={env.name} className="border border-border rounded-lg p-3 bg-secondary/30">
              <p className="font-bold text-foreground text-xs mb-1">{env.name}</p>
              <p className="text-[11px] text-muted-foreground">{env.desc}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title={isAr ? '🔧 التقنيات والأطر المستخدمة' : '🔧 Technologies & Frameworks'}>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {[
            { name: 'React 18', desc: isAr ? 'مكتبة بناء واجهات المستخدم التفاعلية' : 'Interactive UI library' },
            { name: 'TypeScript (TSX)', desc: isAr ? 'لغة برمجة مع أنماط ثابتة لموثوقية أعلى' : 'Typed language for reliability' },
            { name: 'Vite 5', desc: isAr ? 'أداة بناء سريعة جداً للتطوير والإنتاج' : 'Ultra-fast build tool' },
            { name: 'Tailwind CSS', desc: isAr ? 'إطار تنسيق CSS بنظام الفئات الجاهزة' : 'Utility-first CSS framework' },
            { name: 'Three.js', desc: isAr ? 'محرك رسومات ثلاثية الأبعاد في المتصفح' : '3D graphics engine' },
            { name: 'Recharts', desc: isAr ? 'مكتبة رسوم بيانية تفاعلية' : 'Interactive charting library' },
            { name: 'Supabase', desc: isAr ? 'قاعدة بيانات سحابية ومصادقة' : 'Cloud database & auth' },
            { name: 'Claude 4.6 Opus', desc: isAr ? 'واجهة ذكاء اصطناعي لتحليل الفيديو والصور' : 'AI API for video & image analysis' },
            { name: 'OpenWeather API', desc: isAr ? 'واجهة برمجة لبيانات الطقس الحية' : 'Live weather data API' },
          ].map((tech) => (
            <div key={tech.name} className="border border-border rounded p-2 bg-card/50">
              <p className="font-semibold text-foreground text-[11px]">{tech.name}</p>
              <p className="text-[10px] text-muted-foreground">{tech.desc}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title={isAr ? '🤝 المساعدة والدعم' : '🤝 Assistance & Support'}>
        <p>{isAr
          ? 'تم تطوير هذا المشروع بمساعدة أدوات الذكاء الاصطناعي في كتابة بعض الأكواد ومراجعتها، إضافة إلى مراجع أكاديمية في الفيزياء والرياضيات التطبيقية. كما تمت الاستعانة بمصادر تعليمية مفتوحة ومجتمعات مطورين.'
          : 'This project was developed with AI coding assistants for writing and reviewing code, alongside academic references in physics and applied mathematics. Open educational resources and developer communities also contributed.'}</p>
      </Section>

    </div>
  );
};

/* ═══════════════════════════════════════════════════════ */
/*  TAB 2: Sources                                         */
/* ═══════════════════════════════════════════════════════ */
const SourcesTab: React.FC<{ lang: string }> = ({ lang }) => {
  const isAr = lang === 'ar';

  const SourceGroup = ({ title, items }: { title: string; items: { name: string; detail: string }[] }) => (
    <div className="mb-5">
      <h3 className="text-sm font-bold text-foreground border-b border-border pb-2 mb-3">{title}</h3>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex gap-3 items-start border-b border-border/30 pb-2 last:border-0">
            <span className="text-xs font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded mt-0.5 shrink-0">[{i + 1}]</span>
            <div>
              <p className="text-xs font-semibold text-foreground">{item.name}</p>
              <p className="text-[11px] text-muted-foreground">{item.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div>
      <SourceGroup
        title={isAr ? '📚 الكتب والمراجع الأكاديمية' : '📚 Academic Books & References'}
        items={[
          { name: 'Classical Mechanics — Herbert Goldstein', detail: isAr ? 'المرجع الأساسي لميكانيكا لاغرانج وهاملتون وحركة المقذوفات' : 'Core reference for Lagrangian/Hamiltonian mechanics and projectile motion' },
          { name: 'University Physics — Young & Freedman', detail: isAr ? 'فيزياء جامعية شاملة: الحركة، القوى، الطاقة' : 'Comprehensive university physics: motion, forces, energy' },
          { name: 'An Introduction to Mechanics — Kleppner & Kolenkow', detail: isAr ? 'ميكانيكا متقدمة مع تطبيقات حركة المقذوفات' : 'Advanced mechanics with projectile motion applications' },
          { name: 'Numerical Methods for Engineers — Chapra & Canale', detail: isAr ? 'طرق التكامل العددي: Euler، Runge-Kutta' : 'Numerical integration methods: Euler, Runge-Kutta' },
          { name: 'Fundamentals of Aerodynamics — John D. Anderson', detail: isAr ? 'أساسيات الديناميكا الهوائية وقوى السحب والرفع' : 'Aerodynamics fundamentals: drag and lift forces' },
        ]}
      />

      <SourceGroup
        title={isAr ? '🌐 المواقع والمصادر الرقمية' : '🌐 Online Resources'}
        items={[
          { name: 'NASA Glenn Research Center', detail: isAr ? 'معادلات الديناميكا الهوائية ومعاملات السحب' : 'Aerodynamic equations and drag coefficients' },
          { name: 'HyperPhysics — Georgia State University', detail: isAr ? 'مرجع تفاعلي شامل لمفاهيم الفيزياء' : 'Comprehensive interactive physics concepts reference' },
          { name: 'MIT OpenCourseWare — Classical Mechanics (8.01)', detail: isAr ? 'محاضرات ومواد تعليمية في الميكانيكا الكلاسيكية' : 'Lectures and materials in classical mechanics' },
          { name: 'Khan Academy — Physics', detail: isAr ? 'شروحات مبسطة لحركة المقذوفات والقوى' : 'Simplified explanations of projectile motion and forces' },
          { name: 'Physics Stack Exchange', detail: isAr ? 'مناقشات متخصصة في تأثيرات كوريوليس وماغنوس' : 'Specialized discussions on Coriolis and Magnus effects' },
        ]}
      />

      <SourceGroup
        title={isAr ? '📐 المعادلات والنماذج الرياضية' : '📐 Mathematical Models & Equations'}
        items={[
          { name: isAr ? 'معادلات الحركة القياسية' : 'Standard Kinematic Equations', detail: 'x(t) = v₀cos(θ)t, y(t) = v₀sin(θ)t − ½gt²' },
          { name: isAr ? 'نموذج مقاومة الهواء التربيعية' : 'Quadratic Air Resistance Model', detail: 'F_drag = ½ρv²C_dA' },
          { name: isAr ? 'تأثير كوريوليس' : 'Coriolis Effect', detail: 'a_cor = −2(Ω × v), Ω = 7.2921×10⁻⁵ rad/s' },
          { name: isAr ? 'تأثير ماغنوس' : 'Magnus Effect', detail: 'F_mag = C_L × ½ρv²A' },
          { name: isAr ? 'الصيغة البارومترية لكثافة الهواء' : 'Barometric Air Density Formula', detail: 'ρ(h) = ρ₀ × exp(−h/H), H ≈ 8500m' },
        ]}
      />
    </div>
  );
};

/* ═══════════════════════════════════════════════════════ */
/*  TAB 3: Evaluation & Recommendations                    */
/* ═══════════════════════════════════════════════════════ */
const EvaluationTab: React.FC<{ lang: string }> = ({ lang }) => {
  const isAr = lang === 'ar';

  const ListSection = ({ title, items, type }: { title: string; items: string[]; type: 'pro' | 'con' | 'rec' }) => {
    const icon = type === 'pro' ? '✅' : type === 'con' ? '⚠️' : '🚀';
    const borderColor = type === 'pro' ? 'border-green-500/30' : type === 'con' ? 'border-amber-500/30' : 'border-primary/30';
    const bgColor = type === 'pro' ? 'bg-green-500/5' : type === 'con' ? 'bg-amber-500/5' : 'bg-primary/5';

    return (
      <div className={`mb-5 border ${borderColor} rounded-lg p-4 ${bgColor}`}>
        <h3 className="text-sm font-bold text-foreground mb-3">{title}</h3>
        <ul className="space-y-1.5">
          {items.map((item, i) => (
            <li key={i} className="text-xs text-muted-foreground flex gap-2 items-start">
              <span className="shrink-0">{icon}</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <div>
      <ListSection
        type="pro"
        title={isAr ? '✅ نقاط القوة (الإيجابيات)' : '✅ Strengths (Pros)'}
        items={isAr ? [
          'محرك فيزيائي دقيق يدعم عدة طرق تكامل (Euler, RK4, AI-APAS)',
          'دعم تأثيرات فيزيائية متقدمة: كوريوليس، ماغنوس، كثافة هواء متغيرة',
          'تكامل مع الذكاء الاصطناعي لتحليل الصور والفيديو',
          'واجهة ثنائية اللغة (عربي/إنجليزي/فرنسي) مع دعم RTL',
          'تصور ثلاثي الأبعاد تفاعلي باستخدام Three.js',
          'تكامل حي مع بيانات الطقس الفعلية',
          'تحليل شامل للأخطاء ومقارنة النماذج',
          'واجهة أكاديمية احترافية مع رسوم متحركة سلسة',
        ] : [
          'Precise physics engine with multiple integration methods (Euler, RK4, AI-APAS)',
          'Advanced physical effects: Coriolis, Magnus, altitude-dependent density',
          'AI integration for image and video analysis',
          'Trilingual interface (Arabic/English/French) with RTL support',
          'Interactive 3D visualization using Three.js',
          'Live weather data integration',
          'Comprehensive error analysis and model comparison',
          'Professional academic interface with smooth animations',
        ]}
      />

      <ListSection
        type="con"
        title={isAr ? '⚠️ القيود والتحديات' : '⚠️ Limitations & Challenges'}
        items={isAr ? [
          'يعتمد على خدمات سحابية خارجية (APIs) قد تتأخر أحياناً',
          'تحليل الفيديو محدود بحجم الملف وقدرة المعالجة',
          'نموذج الذكاء الاصطناعي يعتمد على جودة الصورة المدخلة',
          'لا يدعم حالياً المحاكاة بوقت حقيقي متعدد المستخدمين',
          'أداء الرسومات ثلاثية الأبعاد يعتمد على عتاد المستخدم',
        ] : [
          'Depends on external cloud services (APIs) that may have latency',
          'Video analysis limited by file size and processing capacity',
          'AI model quality depends on input image quality',
          'Does not currently support real-time multi-user simulation',
          '3D rendering performance depends on user hardware',
        ]}
      />

      <ListSection
        type="rec"
        title={isAr ? '🚀 التوصيات المستقبلية' : '🚀 Future Recommendations'}
        items={isAr ? [
          'تطوير تطبيق موبايل أصلي بـ React Native',
          'إضافة وضع تعاون حقيقي متعدد المستخدمين',
          'تطوير نماذج تعلم آلي مخصصة للتنبؤ بالمسارات',
          'دعم الواقع المعزز (AR) لعرض المسارات في البيئة الحقيقية',
          'إنشاء منصة تعليمية تفاعلية مع اختبارات وتقييمات',
          'إضافة محاكاة حركة في سوائل وغازات مختلفة',
          'تطوير واجهة برمجية مفتوحة (Open API) للباحثين',
          'دعم التصدير لتنسيقات أكاديمية (LaTeX, MATLAB)',
        ] : [
          'Develop native mobile app with React Native',
          'Add real-time multi-user collaboration mode',
          'Build custom ML models for trajectory prediction',
          'AR support for overlaying trajectories in real environment',
          'Create interactive educational platform with quizzes',
          'Add simulation in various fluids and gases',
          'Develop an open API for researchers',
          'Support academic export formats (LaTeX, MATLAB)',
        ]}
      />
    </div>
  );
};

/* ═══════════════════════════════════════════════════════ */
/*  TAB 4: Share                                           */
/* ═══════════════════════════════════════════════════════ */
const ShareTab: React.FC<{
  lang: string;
  appUrl: string;
  copied: boolean;
  onCopy: () => void;
  socialLinks: { name: string; url: string; color: string }[];
}> = ({ lang, appUrl, copied, onCopy, socialLinks }) => {
  const isAr = lang === 'ar';

  return (
    <div>
      <div className="text-center mb-6">
        <h3 className="text-sm font-bold text-foreground mb-2">
          {isAr ? '🔗 شارك APAS مع الآخرين' : '🔗 Share APAS with Others'}
        </h3>
        <p className="text-xs text-muted-foreground">
          {isAr ? 'انشر التطبيق عبر منصات التواصل الاجتماعي أو انسخ الرابط' : 'Share the app via social media or copy the link'}
        </p>
      </div>

      {/* Copy link */}
      <div className="flex items-center gap-2 mb-6 border border-border rounded-lg p-3 bg-secondary/30">
        <input
          type="text"
          readOnly
          value={appUrl}
          className="flex-1 bg-transparent text-xs text-foreground font-mono outline-none"
          dir="ltr"
        />
        <button
          onClick={onCopy}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 hover:shadow-md transition-all duration-200"
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? (isAr ? 'تم النسخ!' : 'Copied!') : (isAr ? 'نسخ' : 'Copy')}
        </button>
      </div>

      {/* Social links */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {socialLinks.map((social) => (
          <a
            key={social.name}
            href={social.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${social.color}`}
          >
            <ExternalLink className="w-3.5 h-3.5" />
            {social.name}
          </a>
        ))}
      </div>
    </div>
  );
};

export default DocumentationModal;
