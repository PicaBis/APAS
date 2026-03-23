import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Mic, Camera, Lightbulb, Moon, Sun, Globe, LogOut, LogIn, UserPlus, Shield, Crosshair, Video, UserCheck, Wrench, MessageSquare, BookOpen, Sparkles, ChevronRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSimulation } from '@/hooks/useSimulation';
import ApasLogo from '@/components/apas/ApasLogo';
import MobileNavBar, { type MobileTab } from '@/components/mobile/MobileNavBar';
import MobileFeatureCard from '@/components/mobile/MobileFeatureCard';
import MobileSimulator from '@/components/mobile/MobileSimulator';
import { playClick, playNav, playPageTransition } from '@/utils/sound';

const ApasVisionButton = lazy(() => import('@/components/apas/ApasVisionButton'));
const ApasVoiceButton = lazy(() => import('@/components/apas/ApasVoiceButton'));
const ApasRecommendations = lazy(() => import('@/components/apas/ApasRecommendations'));
const SimulationRecorder = lazy(() => import('@/components/apas/SimulationRecorder'));

type Lang = 'ar' | 'en' | 'fr';

const MOBILE_TRANSLATIONS: Record<Lang, {
  welcome: string;
  welcomeDesc: string;
  features: string;
  smartVision: string;
  smartVisionDesc: string;
  recordingMode: string;
  recordingModeDesc: string;
  guestMode: string;
  guestModeDesc: string;
  smartTools: string;
  smartToolsDesc: string;
  voiceAssistant: string;
  voiceAssistantDesc: string;
  recommendations: string;
  recommendationsDesc: string;
  simulator: string;
  startSim: string;
  quickActions: string;
  visionTab: string;
  assistantTab: string;
  tipsTab: string;
  openCamera: string;
  uploadImage: string;
  speakCommand: string;
  getTips: string;
  noAccount: string;
  signIn: string;
  guestAccess: string;
  restricted: string;
}> = {
  ar: {
    welcome: 'مرحباً بك في APAS',
    welcomeDesc: 'نظام تحليل المقذوفات بالذكاء الاصطناعي',
    features: 'الميزات',
    smartVision: 'الرؤية الذكية',
    smartVisionDesc: 'ارفع صورة أو التقط بالكاميرا — APAS يستخرج المعاملات تلقائياً بالذكاء الاصطناعي',
    recordingMode: 'وضع التسجيل',
    recordingModeDesc: 'سجل المحاكاة كفيديو وشاركه أو حمله مباشرة',
    guestMode: 'وضع الزائر',
    guestModeDesc: 'استكشف التطبيق بصلاحيات محدودة — سجل للوصول الكامل',
    smartTools: 'أدوات الرؤية الذكية',
    smartToolsDesc: 'واقع معزز، ميزان جيروسكوبي، بيانات طقس حية — كل ما تحتاجه لتحليل دقيق',
    voiceAssistant: 'المساعد الصوتي',
    voiceAssistantDesc: 'تحدث بأوامرك الفيزيائية — APAS يفهم ويطبق المعاملات فوراً',
    recommendations: 'توصيات APAS',
    recommendationsDesc: 'نصائح ذكية لتحسين المسار والتجارب بناءً على إعداداتك الحالية',
    simulator: 'المحاكاة',
    startSim: 'ابدأ المحاكاة',
    quickActions: 'إجراءات سريعة',
    visionTab: 'الرؤية الذكية',
    assistantTab: 'المساعد الصوتي',
    tipsTab: 'التوصيات',
    openCamera: 'فتح الكاميرا',
    uploadImage: 'رفع صورة',
    speakCommand: 'تحدث الآن',
    getTips: 'احصل على توصيات',
    noAccount: 'ليس لديك حساب؟',
    signIn: 'تسجيل الدخول',
    guestAccess: 'دخول كزائر',
    restricted: 'ميزة محدودة — سجل للوصول الكامل',
  },
  en: {
    welcome: 'Welcome to APAS',
    welcomeDesc: 'AI Projectile Analysis System',
    features: 'Features',
    smartVision: 'Smart Vision',
    smartVisionDesc: 'Upload an image or capture with camera — APAS extracts parameters automatically using AI',
    recordingMode: 'Recording Mode',
    recordingModeDesc: 'Record your simulation as a video and share or download it directly',
    guestMode: 'Guest Mode',
    guestModeDesc: 'Explore the app with limited access — register for full features',
    smartTools: 'Smart Vision Tools',
    smartToolsDesc: 'AR overlay, gyro level, live weather data — everything for precise analysis',
    voiceAssistant: 'Voice Assistant',
    voiceAssistantDesc: 'Speak your physics commands — APAS understands and applies parameters instantly',
    recommendations: 'APAS Recommendations',
    recommendationsDesc: 'Smart tips to optimize trajectory and experiments based on your current settings',
    simulator: 'Simulator',
    startSim: 'Start Simulation',
    quickActions: 'Quick Actions',
    visionTab: 'Smart Vision',
    assistantTab: 'Voice Assistant',
    tipsTab: 'Recommendations',
    openCamera: 'Open Camera',
    uploadImage: 'Upload Image',
    speakCommand: 'Speak Now',
    getTips: 'Get Recommendations',
    noAccount: "Don't have an account?",
    signIn: 'Sign In',
    guestAccess: 'Guest Access',
    restricted: 'Restricted feature — register for full access',
  },
  fr: {
    welcome: 'Bienvenue sur APAS',
    welcomeDesc: "Système d'Analyse de Projectiles par IA",
    features: 'Fonctionnalités',
    smartVision: 'Vision Intelligente',
    smartVisionDesc: "Téléchargez une image ou capturez — APAS extrait les paramètres automatiquement",
    recordingMode: "Mode d'Enregistrement",
    recordingModeDesc: "Enregistrez votre simulation en vidéo et partagez-la directement",
    guestMode: 'Mode Invité',
    guestModeDesc: "Explorez l'application avec un accès limité — inscrivez-vous pour un accès complet",
    smartTools: 'Outils Vision',
    smartToolsDesc: 'RA, niveau gyroscopique, données météo en direct — tout pour une analyse précise',
    voiceAssistant: 'Assistant Vocal',
    voiceAssistantDesc: "Parlez vos commandes physiques — APAS comprend et applique les paramètres",
    recommendations: 'Recommandations APAS',
    recommendationsDesc: "Conseils intelligents pour optimiser la trajectoire selon vos paramètres actuels",
    simulator: 'Simulateur',
    startSim: 'Démarrer la Simulation',
    quickActions: 'Actions Rapides',
    visionTab: 'Vision Intelligente',
    assistantTab: 'Assistant Vocal',
    tipsTab: 'Recommandations',
    openCamera: 'Ouvrir Caméra',
    uploadImage: 'Télécharger Image',
    speakCommand: 'Parler Maintenant',
    getTips: 'Obtenir des Conseils',
    noAccount: "Pas de compte ?",
    signIn: 'Connexion',
    guestAccess: 'Accès Invité',
    restricted: "Fonctionnalité restreinte — inscrivez-vous pour un accès complet",
  },
};

export default function MobileApp() {
  const navigate = useNavigate();
  const { user, isGuest, isAdmin, isApproved, isRestricted, signOut, enterGuestMode } = useAuth();
  const sim = useSimulation();
  const [activeTab, setActiveTab] = useState<MobileTab>('home');
  const [lang, setLang] = useState<Lang>(() => {
    try { return (localStorage.getItem('apas_lang') as Lang) || 'ar'; } catch { return 'ar'; }
  });
  const [nightMode, setNightMode] = useState(() => {
    try { return localStorage.getItem('apas_nightMode') === 'true'; } catch { return false; }
  });
  const canvasRef = React.useRef<HTMLDivElement>(null);

  const T = MOBILE_TRANSLATIONS[lang];
  const isRTL = lang === 'ar';
  const canAccessFeature = isAdmin || (user && isApproved && !isRestricted);

  useEffect(() => {
    try { localStorage.setItem('apas_lang', lang); } catch { /* silent */ }
  }, [lang]);

  useEffect(() => {
    if (nightMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    try { localStorage.setItem('apas_nightMode', String(nightMode)); } catch { /* silent */ }
  }, [nightMode]);

  const cycleLang = useCallback(() => {
    setLang(prev => prev === 'ar' ? 'en' : prev === 'en' ? 'fr' : 'ar');
    playClick(false);
  }, []);

  const handleUpdateParams = useCallback((params: { velocity?: number; angle?: number; height?: number; mass?: number; objectType?: string }) => {
    if (params.velocity !== undefined) sim.setVelocity(params.velocity);
    if (params.angle !== undefined) sim.setAngle(params.angle);
    if (params.height !== undefined) sim.setHeight(params.height);
    if (params.mass !== undefined) sim.setMass(params.mass);
    setActiveTab('simulator');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleVoiceUpdate = useCallback((params: { velocity?: number; angle?: number; height?: number; mass?: number; gravity?: number }) => {
    if (params.velocity !== undefined) sim.setVelocity(params.velocity);
    if (params.angle !== undefined) sim.setAngle(params.angle);
    if (params.height !== undefined) sim.setHeight(params.height);
    if (params.mass !== undefined) sim.setMass(params.mass);
    if (params.gravity !== undefined) sim.setGravity(params.gravity);
    setActiveTab('simulator');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Render tab content
  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return renderHome();
      case 'simulator':
        return <MobileSimulator lang={lang} sim={sim} />;
      case 'vision':
        return renderVision();
      case 'assistant':
        return renderAssistant();
      case 'recommendations':
        return renderRecommendations();
      default:
        return renderHome();
    }
  };

  const renderHome = () => (
    <div className="px-4 py-4 space-y-6 pb-24" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Welcome Header */}
      <div className="text-center pt-2">
        <div className="flex justify-center mb-3">
          <div className="relative">
            <ApasLogo size={72} animated />
            <div className="absolute -inset-4 bg-primary/10 rounded-full blur-2xl -z-10 animate-pulse" />
          </div>
        </div>
        <h1 className="text-2xl font-bold bg-gradient-to-r from-primary via-primary/80 to-primary/50 bg-clip-text text-transparent mb-1">
          APAS
        </h1>
        <p className="text-sm text-muted-foreground">{T.welcomeDesc}</p>
      </div>

      {/* Quick Action: Start Simulation */}
      <button
        onClick={() => { setActiveTab('simulator'); playNav(false); }}
        className="w-full flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-primary to-primary/80 text-white shadow-lg shadow-primary/20 active:scale-[0.98] transition-all"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <Crosshair className="w-5 h-5" />
          </div>
          <div className="text-start">
            <p className="text-sm font-semibold">{T.startSim}</p>
            <p className="text-[10px] text-white/70">{T.simulator}</p>
          </div>
        </div>
        <ChevronRight className={`w-5 h-5 text-white/60 ${isRTL ? 'rotate-180' : ''}`} />
      </button>

      {/* Features Grid */}
      <div>
        <h2 className="text-base font-semibold text-foreground mb-3">{T.features}</h2>
        <div className="grid grid-cols-2 gap-3">
          <MobileFeatureCard
            icon={<Eye className="w-5 h-5 text-primary" />}
            title={T.smartVision}
            description={T.smartVisionDesc}
            onClick={() => { setActiveTab('vision'); playNav(false); }}
            badge="AI"
          />
          <MobileFeatureCard
            icon={<Video className="w-5 h-5 text-red-500" />}
            title={T.recordingMode}
            description={T.recordingModeDesc}
            onClick={() => { setActiveTab('simulator'); playNav(false); }}
          />
          <MobileFeatureCard
            icon={<UserCheck className="w-5 h-5 text-blue-500" />}
            title={T.guestMode}
            description={T.guestModeDesc}
            onClick={() => {
              if (!user && !isGuest) {
                enterGuestMode();
              }
              playNav(false);
            }}
          />
          <MobileFeatureCard
            icon={<Wrench className="w-5 h-5 text-orange-500" />}
            title={T.smartTools}
            description={T.smartToolsDesc}
            onClick={() => { setActiveTab('vision'); playNav(false); }}
          />
          <MobileFeatureCard
            icon={<Mic className="w-5 h-5 text-purple-500" />}
            title={T.voiceAssistant}
            description={T.voiceAssistantDesc}
            onClick={() => { setActiveTab('assistant'); playNav(false); }}
            badge="Voice"
          />
          <MobileFeatureCard
            icon={<Lightbulb className="w-5 h-5 text-amber-500" />}
            title={T.recommendations}
            description={T.recommendationsDesc}
            onClick={() => { setActiveTab('recommendations'); playNav(false); }}
            badge="AI"
          />
        </div>
      </div>

      {/* Auth Section */}
      {!user && !isGuest && (
        <div className="bg-card/80 border border-border/50 rounded-2xl p-4 space-y-3">
          <p className="text-xs text-muted-foreground text-center">{T.noAccount}</p>
          <div className="flex gap-2">
            <button
              onClick={() => navigate('/')}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-white text-xs font-medium active:scale-95 transition-all"
            >
              <LogIn className="w-4 h-4" />
              {T.signIn}
            </button>
            <button
              onClick={() => { enterGuestMode(); playNav(false); }}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-secondary text-foreground text-xs font-medium border border-border/50 active:scale-95 transition-all"
            >
              <UserCheck className="w-4 h-4" />
              {T.guestAccess}
            </button>
          </div>
        </div>
      )}
    </div>
  );

  const renderVision = () => (
    <div className="px-4 py-4 space-y-4 pb-24" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="text-center mb-2">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
          <Eye className="w-7 h-7 text-primary" />
        </div>
        <h2 className="text-lg font-bold text-foreground">{T.smartVision}</h2>
        <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">{T.smartVisionDesc}</p>
      </div>

      {canAccessFeature ? (
        <Suspense fallback={<div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /></div>}>
          <div className="space-y-3">
            <ApasVisionButton lang={lang} onUpdateParams={handleUpdateParams} />
          </div>
        </Suspense>
      ) : (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-center">
          <Shield className="w-8 h-8 text-amber-500 mx-auto mb-2" />
          <p className="text-xs text-foreground font-medium">{T.restricted}</p>
          <button
            onClick={() => navigate('/?mode=signup')}
            className="mt-3 px-4 py-2 bg-primary text-white rounded-lg text-xs font-medium active:scale-95 transition-all"
          >
            <UserPlus className="w-3.5 h-3.5 inline mr-1" />
            {lang === 'ar' ? 'إنشاء حساب' : 'Sign Up'}
          </button>
        </div>
      )}

      {/* Smart Tools Section */}
      <div className="mt-6">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Wrench className="w-4 h-4 text-orange-500" />
          {T.smartTools}
        </h3>
        <div className="grid grid-cols-1 gap-2">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-card/60 border border-border/40">
            <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Camera className="w-4 h-4 text-blue-500" />
            </div>
            <div>
              <p className="text-xs font-medium text-foreground">{lang === 'ar' ? 'واقع معزز' : 'AR Overlay'}</p>
              <p className="text-[10px] text-muted-foreground">{lang === 'ar' ? 'تحليل المقذوف عبر الكاميرا مباشرة' : 'Analyze projectile through live camera'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-card/60 border border-border/40">
            <div className="w-9 h-9 rounded-lg bg-green-500/10 flex items-center justify-center">
              <Globe className="w-4 h-4 text-green-500" />
            </div>
            <div>
              <p className="text-xs font-medium text-foreground">{lang === 'ar' ? 'بيانات الطقس' : 'Live Weather'}</p>
              <p className="text-[10px] text-muted-foreground">{lang === 'ar' ? 'بيانات طقس حية لتحليل أدق' : 'Live weather data for precise analysis'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-card/60 border border-border/40">
            <div className="w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-purple-500" />
            </div>
            <div>
              <p className="text-xs font-medium text-foreground">{lang === 'ar' ? 'ميزان جيروسكوبي' : 'Gyro Level'}</p>
              <p className="text-[10px] text-muted-foreground">{lang === 'ar' ? 'قياس دقيق للميل باستخدام حساسات الجهاز' : 'Precise tilt measurement using device sensors'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAssistant = () => (
    <div className="px-4 py-4 space-y-4 pb-24" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="text-center mb-2">
        <div className="w-14 h-14 rounded-2xl bg-purple-500/10 flex items-center justify-center mx-auto mb-3">
          <Mic className="w-7 h-7 text-purple-500" />
        </div>
        <h2 className="text-lg font-bold text-foreground">{T.voiceAssistant}</h2>
        <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">{T.voiceAssistantDesc}</p>
      </div>

      {canAccessFeature ? (
        <Suspense fallback={<div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /></div>}>
          <ApasVoiceButton
            lang={lang}
            onUpdateParams={handleVoiceUpdate}
            simulationContext={{
              velocity: sim.velocity,
              angle: sim.angle,
              height: sim.height,
              gravity: sim.gravity,
              airResistance: sim.airResistance,
              mass: sim.mass,
            }}
          />
        </Suspense>
      ) : (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-center">
          <Shield className="w-8 h-8 text-amber-500 mx-auto mb-2" />
          <p className="text-xs text-foreground font-medium">{T.restricted}</p>
          <button
            onClick={() => navigate('/?mode=signup')}
            className="mt-3 px-4 py-2 bg-primary text-white rounded-lg text-xs font-medium active:scale-95 transition-all"
          >
            <UserPlus className="w-3.5 h-3.5 inline mr-1" />
            {lang === 'ar' ? 'إنشاء حساب' : 'Sign Up'}
          </button>
        </div>
      )}

      {/* Usage Examples */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground">{lang === 'ar' ? 'أمثلة على الأوامر' : 'Example Commands'}</h3>
        {[
          lang === 'ar' ? '"السرعة 50 متر في الثانية"' : '"Velocity 50 meters per second"',
          lang === 'ar' ? '"الزاوية 45 درجة والارتفاع 10 أمتار"' : '"Angle 45 degrees and height 10 meters"',
          lang === 'ar' ? '"أطلق كرة قدم"' : '"Launch a football"',
        ].map((example, i) => (
          <div key={i} className="flex items-center gap-2 p-2.5 rounded-xl bg-card/60 border border-border/40">
            <MessageSquare className="w-3.5 h-3.5 text-purple-500 shrink-0" />
            <p className="text-xs text-muted-foreground">{example}</p>
          </div>
        ))}
      </div>
    </div>
  );

  const renderRecommendations = () => (
    <div className="px-4 py-4 space-y-4 pb-24" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="text-center mb-2">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto mb-3">
          <Lightbulb className="w-7 h-7 text-amber-500" />
        </div>
        <h2 className="text-lg font-bold text-foreground">{T.recommendations}</h2>
        <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">{T.recommendationsDesc}</p>
      </div>

      {canAccessFeature ? (
        <Suspense fallback={<div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /></div>}>
          <div className="bg-card border border-border/50 rounded-xl overflow-hidden">
            <ApasRecommendations
              lang={lang}
              muted={false}
              isUnlocked={true}
              simulationContext={{
                velocity: sim.velocity,
                angle: sim.angle,
                height: sim.height,
                gravity: sim.gravity,
                airResistance: sim.airResistance,
                mass: sim.mass,
                range: (sim.prediction?.range ?? 0).toFixed(2),
                maxHeight: (sim.prediction?.maxHeight ?? 0).toFixed(2),
                flightTime: (sim.prediction?.timeOfFlight ?? 0).toFixed(2),
              }}
            />
          </div>
        </Suspense>
      ) : (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-center">
          <Shield className="w-8 h-8 text-amber-500 mx-auto mb-2" />
          <p className="text-xs text-foreground font-medium">{T.restricted}</p>
          <button
            onClick={() => navigate('/?mode=signup')}
            className="mt-3 px-4 py-2 bg-primary text-white rounded-lg text-xs font-medium active:scale-95 transition-all"
          >
            <UserPlus className="w-3.5 h-3.5 inline mr-1" />
            {lang === 'ar' ? 'إنشاء حساب' : 'Sign Up'}
          </button>
        </div>
      )}

      {/* Current Parameters */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-2">{lang === 'ar' ? 'الإعدادات الحالية' : 'Current Settings'}</h3>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: lang === 'ar' ? 'السرعة' : 'V', value: `${sim.velocity}`, unit: 'm/s' },
            { label: lang === 'ar' ? 'الزاوية' : '\u03B8', value: `${sim.angle}`, unit: '\u00B0' },
            { label: lang === 'ar' ? 'الارتفاع' : 'h', value: `${sim.height}`, unit: 'm' },
            { label: lang === 'ar' ? 'الجاذبية' : 'g', value: `${sim.gravity}`, unit: 'm/s\u00B2' },
            { label: lang === 'ar' ? 'الكتلة' : 'm', value: `${sim.mass}`, unit: 'kg' },
            { label: lang === 'ar' ? 'المقاومة' : 'k', value: `${sim.airResistance}`, unit: '' },
          ].map((item, i) => (
            <div key={i} className="bg-card/60 border border-border/40 rounded-lg p-2 text-center">
              <p className="text-[9px] text-muted-foreground">{item.label}</p>
              <p className="text-xs font-bold font-mono text-foreground">{item.value}<span className="text-[8px] text-muted-foreground ml-0.5">{item.unit}</span></p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top Bar */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-xl border-b border-border/60 shadow-sm" dir="ltr">
        <div className="flex items-center justify-between px-4 h-14">
          {/* Left: Logo */}
          <div className="flex items-center gap-2">
            <ApasLogo size={28} />
            <span className="text-lg font-bold tracking-wider bg-gradient-to-r from-primary via-primary/80 to-primary/50 bg-clip-text text-transparent">APAS</span>
            <span className="text-[9px] font-mono text-muted-foreground/70 border border-border/50 rounded px-1 py-0.5">v2.0</span>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            <button onClick={cycleLang} className="p-2 rounded-lg hover:bg-secondary/60 transition-colors">
              <Globe className="w-4 h-4 text-muted-foreground" />
            </button>
            <button onClick={() => { setNightMode(!nightMode); playClick(false); }} className="p-2 rounded-lg hover:bg-secondary/60 transition-colors">
              {nightMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-muted-foreground" />}
            </button>
            {isAdmin && (
              <button onClick={() => navigate('/admin')} className="p-2 rounded-lg hover:bg-secondary/60 transition-colors">
                <Shield className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
            {user && (
              <button onClick={async () => { await signOut(); navigate('/'); }} className="p-2 rounded-lg hover:bg-destructive/10 transition-colors">
                <LogOut className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {renderContent()}
      </main>

      {/* Bottom Navigation */}
      <MobileNavBar activeTab={activeTab} onTabChange={(tab) => { setActiveTab(tab); playNav(false); }} lang={lang} />
    </div>
  );
}
