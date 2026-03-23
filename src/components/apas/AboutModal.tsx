import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BookOpen, Users, AlertTriangle, Map, Shield, ChevronRight } from 'lucide-react';

type TabKey = 'docs' | 'team' | 'report' | 'roadmap' | 'terms';

interface AboutModalProps {
  open: boolean;
  onClose: () => void;
  lang: string;
  limitTabs?: boolean;
  defaultTab?: TabKey;
  onOpenComprehensiveGuide?: () => void;
}

const TABS: { key: TabKey; labelAr: string; labelEn: string; labelFr: string; icon: React.ReactNode }[] = [
  { key: 'docs', labelAr: 'التوثيق', labelEn: 'Documentation', labelFr: 'Documentation', icon: <BookOpen className="w-4 h-4" /> },
  { key: 'team', labelAr: 'فريق العمل', labelEn: 'Team', labelFr: "L'Équipe", icon: <Users className="w-4 h-4" /> },
  { key: 'report', labelAr: 'إبلاغ عن مشكل', labelEn: 'Report Issue', labelFr: 'Signaler un Problème', icon: <AlertTriangle className="w-4 h-4" /> },
  { key: 'roadmap', labelAr: 'خريطة الطريق', labelEn: 'Roadmap', labelFr: 'Feuille de Route', icon: <Map className="w-4 h-4" /> },
  { key: 'terms', labelAr: 'شروط الاستخدام', labelEn: 'Terms & Privacy', labelFr: 'Conditions & Confidentialité', icon: <Shield className="w-4 h-4" /> },
];

const LIMITED_TAB_KEYS: TabKey[] = ['team', 'report', 'terms'];

const AboutModal: React.FC<AboutModalProps> = ({ open, onClose, lang, limitTabs, defaultTab, onOpenComprehensiveGuide }) => {
  const visibleTabs = limitTabs ? TABS.filter(t => LIMITED_TAB_KEYS.includes(t.key)) : TABS;
  const [activeTab, setActiveTab] = useState<TabKey>(defaultTab || (limitTabs ? 'team' : 'docs'));

  // Update active tab when defaultTab changes (e.g. opened from bug button)
  React.useEffect(() => {
    if (open && defaultTab) setActiveTab(defaultTab);
  }, [open, defaultTab]);
  const isRTL = lang === 'ar';

  const getLabel = (tab: typeof TABS[0]) => {
    if (lang === 'ar') return tab.labelAr;
    if (lang === 'fr') return tab.labelFr;
    return tab.labelEn;
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-4xl max-h-[85vh] p-0 gap-0 overflow-hidden border-border bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="border-b border-border px-6 py-4">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-foreground flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              {lang === 'ar' ? 'حول التطبيق — APAS' : lang === 'fr' ? 'À Propos — APAS' : 'About — APAS'}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {lang === 'ar' ? 'معلومات حول تطبيق APAS' : 'Information about the APAS application'}
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-1 mt-4 overflow-x-auto">
            {visibleTabs.map((tab) => (
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
            {onOpenComprehensiveGuide && (
              <button
                onClick={() => { onClose(); onOpenComprehensiveGuide(); }}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md transition-all whitespace-nowrap bg-gradient-to-r from-primary/10 to-primary/5 text-primary hover:from-primary/20 hover:to-primary/10 border border-primary/20 hover:border-primary/30"
              >
                <BookOpen className="w-4 h-4" />
                {lang === 'ar' ? 'الدليل الشامل للتطبيق' : lang === 'fr' ? 'Guide Complet' : 'Comprehensive Guide'}
                <ChevronRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        <ScrollArea className="flex-1 max-h-[60vh]">
          <div className="p-6">
            {activeTab === 'docs' && <DocsTab lang={lang} />}
            {activeTab === 'team' && <TeamTab lang={lang} />}
            {activeTab === 'report' && <ReportTab lang={lang} />}
            {activeTab === 'roadmap' && <RoadmapTab lang={lang} />}
            {activeTab === 'terms' && <TermsTab lang={lang} />}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

/* ═══════════════════════════════════════════════════════ */
/*  TAB 1: Documentation (same as simulator)              */
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
            { name: 'APAS AI', desc: isAr ? 'محرك ذكاء اصطناعي لتحليل الفيديو والصور' : 'AI engine for video & image analysis' },
            { name: 'OpenWeather API', desc: isAr ? 'واجهة برمجة لبيانات الطقس الحية' : 'Live weather data API' },
          ].map((tech) => (
            <div key={tech.name} className="border border-border rounded p-2 bg-card/50">
              <p className="font-semibold text-foreground text-[11px]">{tech.name}</p>
              <p className="text-[10px] text-muted-foreground">{tech.desc}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title={isAr ? '📚 المصادر الأكاديمية' : '📚 Academic Sources'}>
        <div className="space-y-2">
          {[
            { name: 'Classical Mechanics — Herbert Goldstein', detail: isAr ? 'المرجع الأساسي لميكانيكا لاغرانج وهاملتون وحركة المقذوفات' : 'Core reference for Lagrangian/Hamiltonian mechanics and projectile motion' },
            { name: 'University Physics — Young & Freedman', detail: isAr ? 'فيزياء جامعية شاملة: الحركة، القوى، الطاقة' : 'Comprehensive university physics: motion, forces, energy' },
            { name: 'Numerical Methods for Engineers — Chapra & Canale', detail: isAr ? 'طرق التكامل العددي: Euler، Runge-Kutta' : 'Numerical integration methods: Euler, Runge-Kutta' },
            { name: 'Fundamentals of Aerodynamics — John D. Anderson', detail: isAr ? 'أساسيات الديناميكا الهوائية وقوى السحب والرفع' : 'Aerodynamics fundamentals: drag and lift forces' },
          ].map((item, i) => (
            <div key={i} className="flex gap-3 items-start border-b border-border/30 pb-2 last:border-0">
              <span className="text-xs font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded mt-0.5 shrink-0">[{i + 1}]</span>
              <div>
                <p className="text-xs font-semibold text-foreground">{item.name}</p>
                <p className="text-[11px] text-muted-foreground">{item.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════ */
/*  TAB 2: Team                                            */
/* ═══════════════════════════════════════════════════════ */
const TeamTab: React.FC<{ lang: string }> = ({ lang }) => {
  const isAr = lang === 'ar';

  const teamMembers = [
    {
      name: isAr ? 'مجاهد عبدالهادي' : 'Medjahed Abdelhadi',
      role: isAr ? 'مطور رئيسي' : lang === 'fr' ? 'Développeur Principal' : 'Lead Developer',
      desc: isAr ? 'مسؤول عن تطوير البنية البرمجية وتكامل الذكاء الاصطناعي والتصميم' : 'Responsible for software architecture, AI integration, and design',
      photo: '/team-medjahed.jpg',
    },
    {
      name: isAr ? 'موفق ابراهيم' : 'Mouffok Ibrahim',
      role: isAr ? 'خبير فيزيائي' : lang === 'fr' ? 'Expert en Physique' : 'Physics Expert',
      desc: isAr ? 'مسؤول عن التكامل الفيزيائي في التطبيق والصيانة' : lang === 'fr' ? 'Responsable de l\'intégration physique et de la maintenance' : 'Responsible for physics integration and maintenance',
      photo: '/team-moufook.jpg',
    },
  ];

  return (
    <div>
      <div className="text-center mb-8">
        <h3 className="text-lg font-bold text-foreground mb-2">
          {isAr ? '👥 فريق العمل' : '👥 Our Team'}
        </h3>
        <p className="text-xs text-muted-foreground">
          {isAr ? 'المدرسة العليا للأساتذة — الأغواط' : 'Ecole Normale Supérieure — Laghouat'}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
        {teamMembers.map((member, i) => (
          <div key={i} className="border border-border/50 rounded-xl p-6 bg-card/60 backdrop-blur-sm text-center hover:border-primary/30 hover:shadow-lg transition-all duration-300 group">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border-3 border-primary/30 mx-auto mb-4 overflow-hidden shadow-lg group-hover:border-primary/50 group-hover:shadow-primary/20 transition-all duration-300">
              <img
                src={member.photo}
                alt={member.name}
                className="w-full h-full object-cover"
              />
            </div>
            <h4 className="text-sm font-bold text-foreground mb-1">{member.name}</h4>
            <p className="text-xs font-medium text-primary mb-2">{member.role}</p>
            <p className="text-[11px] text-muted-foreground leading-relaxed">{member.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════ */
/*  TAB 3: Report Issue                                    */
/* ═══════════════════════════════════════════════════════ */
const ReportTab: React.FC<{ lang: string }> = ({ lang }) => {
  const isAr = lang === 'ar';
  const [reportForm, setReportForm] = useState({ name: '', email: '', type: 'bug', message: '' });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
  };

  return (
    <div>
      <div className="text-center mb-6">
        <h3 className="text-lg font-bold text-foreground mb-2">
          {isAr ? '🐛 الإبلاغ عن مشكل' : '🐛 Report an Issue'}
        </h3>
        <p className="text-xs text-muted-foreground">
          {isAr ? 'ساعدنا في تحسين APAS بالإبلاغ عن أي مشكلة تواجهها' : 'Help us improve APAS by reporting any issues you encounter'}
        </p>
      </div>

      {submitted ? (
        <div className="text-center py-12 border border-green-500/30 rounded-xl bg-green-500/5">
          <p className="text-sm font-semibold text-green-600 dark:text-green-400 mb-2">
            {isAr ? 'تم إرسال البلاغ بنجاح!' : 'Report submitted successfully!'}
          </p>
          <p className="text-xs text-muted-foreground">
            {isAr ? 'شكراً لمساعدتنا في تحسين التطبيق' : 'Thank you for helping us improve the app'}
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">
                {isAr ? 'الاسم' : 'Name'}
              </label>
              <input
                type="text"
                value={reportForm.name}
                onChange={(e) => setReportForm(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 text-xs border border-border rounded-lg bg-background focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all"
                placeholder={isAr ? 'اسمك' : 'Your name'}
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground mb-1 block">
                {isAr ? 'البريد الإلكتروني' : 'Email'}
              </label>
              <input
                type="email"
                value={reportForm.email}
                onChange={(e) => setReportForm(prev => ({ ...prev, email: e.target.value }))}
                className="w-full px-3 py-2 text-xs border border-border rounded-lg bg-background focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all"
                placeholder={isAr ? 'بريدك الإلكتروني' : 'your@email.com'}
                required
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-foreground mb-1 block">
              {isAr ? 'نوع المشكل' : 'Issue Type'}
            </label>
            <select
              value={reportForm.type}
              onChange={(e) => setReportForm(prev => ({ ...prev, type: e.target.value }))}
              className="w-full px-3 py-2 text-xs border border-border rounded-lg bg-background focus:border-primary outline-none transition-all"
            >
              <option value="bug">{isAr ? 'خلل تقني (Bug)' : 'Bug'}</option>
              <option value="feature">{isAr ? 'اقتراح ميزة' : 'Feature Request'}</option>
              <option value="accuracy">{isAr ? 'مشكل في دقة التتبع' : 'Tracking Accuracy Issue'}</option>
              <option value="ui">{isAr ? 'مشكل في الواجهة' : 'UI Issue'}</option>
              <option value="other">{isAr ? 'أخرى' : 'Other'}</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-foreground mb-1 block">
              {isAr ? 'وصف المشكل' : 'Description'}
            </label>
            <textarea
              value={reportForm.message}
              onChange={(e) => setReportForm(prev => ({ ...prev, message: e.target.value }))}
              rows={5}
              className="w-full px-3 py-2 text-xs border border-border rounded-lg bg-background focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all resize-none"
              placeholder={isAr ? 'اشرح المشكل بالتفصيل...' : 'Describe the issue in detail...'}
              required
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 text-xs font-semibold bg-gradient-to-r from-primary to-primary/80 text-white rounded-lg shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all duration-300"
          >
            {isAr ? 'إرسال البلاغ' : 'Submit Report'}
          </button>
        </form>
      )}

      <div className="mt-8 border-t border-border pt-6">
        <h4 className="text-sm font-bold text-foreground mb-3">
          {isAr ? '📧 تواصل معنا مباشرة' : '📧 Contact Us Directly'}
        </h4>
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            {isAr ? 'سيتم إضافة عناوين البريد الإلكتروني قريباً' : 'Email addresses will be added soon'}
          </p>
        </div>

        <h4 className="text-sm font-bold text-foreground mb-3 mt-6">
          {isAr ? '🔗 وسائل التواصل' : '🔗 Social Media'}
        </h4>
        <div className="flex flex-wrap gap-2">
          {[
            { name: 'GitHub', url: 'https://github.com/picaplix/APAS' },
            { name: 'LinkedIn', url: '#' },
            { name: 'YouTube', url: '#' },
          ].map((link) => (
            <a
              key={link.name}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 text-xs font-medium border border-border rounded-lg hover:border-primary/30 hover:bg-primary/5 transition-all duration-200"
            >
              {link.name}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════ */
/*  TAB 4: Roadmap                                         */
/* ═══════════════════════════════════════════════════════ */
const RoadmapTab: React.FC<{ lang: string }> = ({ lang }) => {
  const isAr = lang === 'ar';

  const phases = [
    {
      phase: isAr ? 'الماضي' : lang === 'fr' ? 'Passé' : 'Past',
      status: 'completed' as const,
      title: isAr ? 'إطلاق النسخة التجريبية (MVP)' : 'MVP Launch',
      items: isAr ? [
        'محاكي حركة المقذوفات الأساسي',
        'دعم عدة طرق تكامل (Euler, RK4)',
        'واجهة ثنائية اللغة (عربي/إنجليزي)',
        'بيئات كوكبية متعددة',
        'نظام إدارة الفصول',
      ] : [
        'Basic projectile motion simulator',
        'Multiple integration methods (Euler, RK4)',
        'Bilingual interface (Arabic/English)',
        'Planetary environments',
        'Classroom management system',
      ],
    },
    {
      phase: isAr ? 'الحاضر' : lang === 'fr' ? 'Présent' : 'Present',
      status: 'active' as const,
      title: isAr ? 'دمج تحليل الفيديو بالذكاء الاصطناعي' : 'AI Video Analysis Integration',
      items: isAr ? [
        'تحليل الصور بالذكاء الاصطناعي (APAS Vision)',
        'تحليل الفيديو لاستخراج المعاملات تلقائياً',
        'تصوير ستروبوسكوبي متقدم',
        'محرك معادلات تفاعلي',
        'تأثيرات فيزيائية متقدمة (كوريوليس، ماغنوس)',
        'نظام تصفية الضوضاء والمعايرة الحية',
      ] : [
        'AI image analysis (APAS Vision)',
        'Video analysis for automatic parameter extraction',
        'Advanced stroboscopic photography',
        'Interactive equation engine',
        'Advanced physics effects (Coriolis, Magnus)',
        'Noise filtering and live calibration system',
      ],
    },
    {
      phase: isAr ? 'المستقبل' : lang === 'fr' ? 'Futur' : 'Future',
      status: 'planned' as const,
      title: isAr ? 'وضع 3D والواقع المعزز' : '3D Mode & Augmented Reality',
      items: isAr ? [
        'إضافة وضع المحاكاة ثلاثية الأبعاد الكامل',
        'دعم الواقع المعزز (AR) لعرض المسارات',
        'إطلاق تطبيق الهاتف (React Native)',
        'تطوير نماذج تعلم آلي مخصصة',
        'وضع تعاون حقيقي متعدد المستخدمين',
        'دعم التصدير لتنسيقات أكاديمية (LaTeX, MATLAB)',
        'واجهة برمجية مفتوحة (Open API) للباحثين',
      ] : [
        'Full 3D simulation mode',
        'Augmented Reality (AR) trajectory overlay',
        'Mobile app launch (React Native)',
        'Custom ML models for trajectory prediction',
        'Real-time multi-user collaboration',
        'Academic export formats (LaTeX, MATLAB)',
        'Open API for researchers',
      ],
    },
  ];

  return (
    <div>
      <div className="text-center mb-8">
        <h3 className="text-lg font-bold text-foreground mb-2">
          {isAr ? '🗺️ خريطة الطريق' : '🗺️ Project Roadmap'}
        </h3>
        <p className="text-xs text-muted-foreground">
          {isAr ? 'رحلة تطور APAS من الفكرة إلى المستقبل' : "APAS's evolution journey from idea to the future"}
        </p>
      </div>

      <div className="space-y-6">
        {phases.map((phase, i) => (
          <div key={i} className={`border rounded-xl p-5 transition-all duration-300 ${
            phase.status === 'completed' ? 'border-green-500/30 bg-green-500/5' :
            phase.status === 'active' ? 'border-primary/40 bg-primary/5 shadow-lg shadow-primary/10' :
            'border-border/50 bg-card/60'
          }`}>
            <div className="flex items-center gap-3 mb-3">
              <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider ${
                phase.status === 'completed' ? 'bg-green-500/20 text-green-600 dark:text-green-400' :
                phase.status === 'active' ? 'bg-primary/20 text-primary' :
                'bg-muted text-muted-foreground'
              }`}>
                {phase.phase}
              </span>
              <h4 className="text-sm font-bold text-foreground">{phase.title}</h4>
            </div>
            <ul className="space-y-1.5">
              {phase.items.map((item, j) => (
                <li key={j} className="text-xs text-muted-foreground flex items-start gap-2">
                  <ChevronRight className={`w-3 h-3 mt-0.5 shrink-0 ${
                    phase.status === 'completed' ? 'text-green-500' :
                    phase.status === 'active' ? 'text-primary' :
                    'text-muted-foreground/50'
                  }`} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════ */
/*  TAB 5: Terms & Privacy                                 */
/* ═══════════════════════════════════════════════════════ */
const TermsTab: React.FC<{ lang: string }> = ({ lang }) => {
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
      <Section title={isAr ? '🔒 سياسة الخصوصية' : '🔒 Privacy Policy'}>
        <div className="border border-green-500/30 rounded-lg p-4 bg-green-500/5 mb-4">
          <p className="text-xs font-semibold text-green-600 dark:text-green-400 mb-2">
            {isAr ? 'الخصوصية أولاً (Privacy First)' : 'Privacy First'}
          </p>
          <ul className="space-y-1.5">
            <li className="flex items-start gap-2">
              <span className="text-green-500 shrink-0">•</span>
              <span>{isAr
                ? 'الفيديوهات تُعالج محلياً في متصفحك ولا تُرسل إلى أي خادم خارجي'
                : 'Videos are processed locally in your browser and are never sent to external servers'}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 shrink-0">•</span>
              <span>{isAr
                ? 'الصور المرفوعة لتحليل APAS Vision تُحذف فوراً بعد المعالجة'
                : 'Images uploaded for APAS Vision analysis are deleted immediately after processing'}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 shrink-0">•</span>
              <span>{isAr
                ? 'لا نجمع أي بيانات شخصية أو بيانات استخدام بدون إذنك'
                : 'We do not collect any personal or usage data without your consent'}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 shrink-0">•</span>
              <span>{isAr
                ? 'يمكنك تفعيل الحذف التلقائي للفيديوهات من الإعدادات'
                : 'You can enable automatic video deletion from the settings'}</span>
            </li>
          </ul>
        </div>
      </Section>

      <Section title={isAr ? '📋 شروط الاستخدام' : '📋 Terms of Use'}>
        <ul className="space-y-2">
          <li className="flex items-start gap-2">
            <span className="text-primary shrink-0">1.</span>
            <span>{isAr
              ? 'APAS هو أداة أكاديمية تعليمية مخصصة للاستخدام التعليمي والبحثي'
              : 'APAS is an academic educational tool designed for educational and research use'}</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary shrink-0">2.</span>
            <span>{isAr
              ? 'لا يُسمح باستخدام التطبيق لأغراض تجارية بدون إذن كتابي'
              : 'Commercial use is not permitted without written permission'}</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary shrink-0">3.</span>
            <span>{isAr
              ? 'النتائج المقدمة تقريبية ولا يجب الاعتماد عليها في التطبيقات الحرجة'
              : 'Results are approximate and should not be relied upon for critical applications'}</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary shrink-0">4.</span>
            <span>{isAr
              ? 'المستخدم مسؤول عن المحتوى الذي يرفعه (صور/فيديوهات)'
              : 'Users are responsible for the content they upload (images/videos)'}</span>
          </li>
        </ul>
      </Section>

      <Section title={isAr ? '📜 الترخيص' : '📜 License'}>
        <div className="border border-border rounded-lg p-4 bg-secondary/30">
          <p className="text-xs font-bold text-foreground mb-2">MIT License</p>
          <p>{isAr
            ? 'هذا المشروع مرخص بموجب رخصة MIT — مما يعني أنه مفتوح المصدر ويمكنك استخدامه وتعديله بحرية مع الحفاظ على حقوق المؤلفين.'
            : 'This project is licensed under the MIT License — meaning it is open source and you are free to use and modify it while maintaining author attribution.'}</p>
          <p className="mt-2 text-[10px] font-mono text-muted-foreground/70">
            Copyright (c) 2025/2026 Medjahed Abdelhadi & Mouffok Ibrahim — ENS Laghouat
          </p>
        </div>
      </Section>
    </div>
  );
};

export default AboutModal;
