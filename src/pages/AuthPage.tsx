import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Mail, Lock, ArrowRight, UserPlus, LogIn, Eye, EyeOff, Sparkles, Globe, Info, BookOpen, Maximize } from 'lucide-react';
import ApasLogo from '@/components/apas/ApasLogo';
import PageTransition from '@/components/apas/PageTransition';
import AboutModal from '@/components/apas/AboutModal';
import BugReportButton from '@/components/apas/BugReportButton';
import { playClick, playNav, playPageTransition, playLangSwitch } from '@/utils/sound';

type AuthLang = 'en' | 'ar' | 'fr';

const AUTH_TRANSLATIONS: Record<AuthLang, {
  logIn: string;
  signUp: string;
  magicLink: string;
  magicLinkExplanation: string;
  email: string;
  password: string;
  passwordPlaceholder: string;
  passwordMinChars: string;
  emailPlaceholder: string;
  sendMagicLink: string;
  createAccount: string;
  magicLinkSent: string;
  accountCreated: string;
  passwordMinError: string;
  unexpectedError: string;
  or: string;
  continueAsGuest: string;
  guestNote: string;
  subtitle: string;
  footer: string;
}> = {
  en: {
    logIn: 'Log In',
    signUp: 'Sign Up',
    magicLink: 'Magic Link',
    magicLinkExplanation: 'A Magic Link is a secure, passwordless login method. We send a unique link to your email — just click it to sign in instantly, no password needed.',
    email: 'Email',
    password: 'Password',
    passwordPlaceholder: 'Your password',
    passwordMinChars: 'Min 6 characters',
    emailPlaceholder: 'you@example.com',
    sendMagicLink: 'Send Magic Link',
    createAccount: 'Create Account',
    magicLinkSent: 'A magic link has been sent to your email. Check your inbox to sign in.',
    accountCreated: 'Account created! Please check your email to verify your account.',
    passwordMinError: 'Password must be at least 6 characters',
    unexpectedError: 'An unexpected error occurred. Please try again.',
    or: 'or',
    continueAsGuest: 'Continue as Guest',
    guestNote: 'Guest mode has limited access. Register for full features.',
    subtitle: 'AI Projectile Analysis System',
    footer: 'APAS — AI Projectile Analysis System',
  },
  ar: {
    logIn: 'تسجيل الدخول',
    signUp: 'إنشاء حساب',
    magicLink: 'رابط سحري',
    magicLinkExplanation: 'الرابط السحري هو طريقة تسجيل دخول آمنة بدون كلمة مرور. نرسل رابطاً فريداً إلى بريدك الإلكتروني — فقط انقر عليه لتسجيل الدخول فوراً، دون الحاجة لكلمة مرور.',
    email: 'البريد الإلكتروني',
    password: 'كلمة المرور',
    passwordPlaceholder: 'كلمة المرور',
    passwordMinChars: '6 أحرف على الأقل',
    emailPlaceholder: 'you@example.com',
    sendMagicLink: 'إرسال الرابط السحري',
    createAccount: 'إنشاء حساب',
    magicLinkSent: 'تم إرسال رابط سحري إلى بريدك الإلكتروني. تحقق من صندوق الوارد لتسجيل الدخول.',
    accountCreated: 'تم إنشاء الحساب! يرجى التحقق من بريدك الإلكتروني لتأكيد حسابك.',
    passwordMinError: 'يجب أن تكون كلمة المرور 6 أحرف على الأقل',
    unexpectedError: 'حدث خطأ غير متوقع. حاول مرة أخرى.',
    or: 'أو',
    continueAsGuest: 'الدخول كزائر',
    guestNote: 'وضع الزائر محدود الصلاحيات. سجل للحصول على جميع الميزات.',
    subtitle: 'نظام تحليل المقذوفات بالذكاء الاصطناعي',
    footer: 'APAS — نظام تحليل المقذوفات بالذكاء الاصطناعي',
  },
  fr: {
    logIn: 'Connexion',
    signUp: 'Inscription',
    magicLink: 'Lien Magique',
    magicLinkExplanation: 'Un Lien Magique est une méthode de connexion sécurisée sans mot de passe. Nous envoyons un lien unique à votre email — cliquez dessus pour vous connecter instantanément, sans mot de passe.',
    email: 'Email',
    password: 'Mot de passe',
    passwordPlaceholder: 'Votre mot de passe',
    passwordMinChars: '6 caractères minimum',
    emailPlaceholder: 'vous@exemple.com',
    sendMagicLink: 'Envoyer le Lien Magique',
    createAccount: 'Créer un Compte',
    magicLinkSent: 'Un lien magique a été envoyé à votre email. Vérifiez votre boîte de réception pour vous connecter.',
    accountCreated: 'Compte créé ! Veuillez vérifier votre email pour confirmer votre compte.',
    passwordMinError: 'Le mot de passe doit comporter au moins 6 caractères',
    unexpectedError: 'Une erreur inattendue s\'est produite. Veuillez réessayer.',
    or: 'ou',
    continueAsGuest: 'Continuer en tant qu\'invité',
    guestNote: 'Le mode invité a un accès limité. Inscrivez-vous pour toutes les fonctionnalités.',
    subtitle: 'Système d\'Analyse de Projectiles par IA',
    footer: 'APAS — Système d\'Analyse de Projectiles par IA',
  },
};

const LANG_OPTIONS: { code: AuthLang; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'ar', label: 'العربية' },
  { code: 'fr', label: 'Français' },
];

type AuthMode = 'login' | 'signup' | 'otp';

export default function AuthPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signInWithEmail, signUpWithEmail, signInWithOtp, enterGuestMode, user } = useAuth();

  const [mode, setMode] = useState<AuthMode>(() => {
    const modeParam = searchParams.get('mode');
    if (modeParam === 'signup') return 'signup';
    return 'login';
  });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [lang, setLang] = useState<AuthLang>('en');
  const [showAbout, setShowAbout] = useState(false);
  const [navigating, setNavigating] = useState(false);

  const T = AUTH_TRANSLATIONS[lang];
  const isRTL = lang === 'ar';
  const isFr = lang === 'fr';
  const [fullscreenNotice, setFullscreenNotice] = useState(false);

  // Fullscreen is only triggered by explicit user gesture (e.g. clicking the fullscreen button)
  // Removed auto-fullscreen on mount to avoid "API can only be initiated by a user gesture" errors

  const navigateWithSound = useCallback((path: string) => {
    playPageTransition(false);
    setNavigating(true);
    setTimeout(() => navigate(path, { replace: true }), 400);
  }, [navigate]);

  // If already authenticated, redirect
  React.useEffect(() => {
    if (user) navigate('/home', { replace: true });
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (mode === 'otp') {
        const { error: err } = await signInWithOtp(email);
        if (err) {
          setError(err);
        } else {
          setSuccess(T.magicLinkSent);
        }
      } else if (mode === 'signup') {
          if (password.length < 6) {
            setError(T.passwordMinError);
            setLoading(false);
            return;
          }
          const { error: err } = await signUpWithEmail(email, password);
          if (err) {
            setError(err);
          } else {
            setSuccess(T.accountCreated);
          }
      } else {
        const { error: err } = await signInWithEmail(email, password);
        if (err) {
          setError(err);
        } else {
          navigateWithSound('/home');
        }
      }
    } catch {
      setError(T.unexpectedError);
    }
    setLoading(false);
  };

  const handleGuestAccess = () => {
    playNav(false);
    enterGuestMode();
    navigateWithSound('/home');
  };

  return (
    <PageTransition>
      <div className={`min-h-screen bg-background flex flex-col items-center justify-center p-3 sm:p-4 relative overflow-hidden transition-all duration-500 ${navigating ? 'opacity-0 scale-95 blur-sm' : 'opacity-100 scale-100'}`} dir={isRTL ? 'rtl' : 'ltr'}>
        {/* Top bar: About + Language - responsive */}
        <div className="fixed top-2 sm:top-4 left-2 sm:left-4 right-2 sm:right-4 z-20 flex items-center justify-between">
          <button
            onClick={() => { playClick(false); setShowAbout(true); }}
            className="flex items-center gap-1 bg-card/80 backdrop-blur-md border border-border rounded-lg px-2 sm:px-3 py-1 sm:py-1.5 shadow-sm text-[10px] sm:text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-all duration-200"
          >
            <BookOpen className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span className="hidden xs:inline">{lang === 'ar' ? 'حول' : isFr ? 'À Propos' : 'About'}</span>
          </button>

          {/* Language Selector - compact on mobile */}
          <div className="flex items-center gap-0.5 bg-card/80 backdrop-blur-md border border-border rounded-lg p-0.5 sm:p-1 shadow-sm">
            <Globe className="w-3 h-3 text-muted-foreground ml-1" />
            {LANG_OPTIONS.map((opt) => (
              <button
                key={opt.code}
                onClick={() => { playLangSwitch(false); setLang(opt.code); }}
                className={`flex items-center gap-0.5 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md text-[10px] sm:text-xs font-medium transition-all duration-200 ${
                  lang === opt.code
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                }`}
                title={opt.label}
              >
                <span>{opt.code === 'ar' ? 'عر' : opt.code.toUpperCase()}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Background decorations */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
          <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-primary/5 blur-3xl animate-pulse" />
          <div className="absolute top-1/2 -left-40 w-80 h-80 rounded-full bg-primary/3 blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
          <div className="absolute -bottom-20 right-1/4 w-72 h-72 rounded-full bg-accent/5 blur-3xl animate-pulse" style={{ animationDelay: '4s' }} />
          {/* Floating physics formulas */}
          {useMemo(() => {
            const formulas = [
              'F = ma', 'E = mc²', 'v = v₀ + at', 'x = ½at²',
              'p = mv', 'KE = ½mv²', 'ΔE = W', 'τ = r × F',
              'ω = Δθ/Δt', 'a = v²/r', 'F = -kx', 'T = 2π√(l/g)',
            ];
            return formulas.map((f, i) => (
              <span
                key={i}
                className="floating-formula absolute text-xs sm:text-sm font-mono text-foreground/[0.06] select-none"
                style={{
                  left: `${8 + (i % 4) * 24}%`,
                  top: `${5 + Math.floor(i / 4) * 30 + (i % 3) * 8}%`,
                  '--float-duration': `${7 + (i % 5) * 2}s`,
                  '--float-delay': `${i * 0.6}s`,
                } as React.CSSProperties}
              >
                {f}
              </span>
            ));
          }, [])}
          {/* Orbit decoration rings */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px]">
            <div className="absolute inset-0 rounded-full border border-primary/[0.04] orbit-ring" />
            <div className="absolute inset-8 rounded-full border border-primary/[0.03] orbit-ring-reverse" />
          </div>
        </div>

        <div className="w-full max-w-md z-10 px-1 sm:px-0">
          {/* Logo & Title - compact on mobile */}
          <div className="text-center mb-5 sm:mb-8" style={{ animation: 'heroFadeUp 0.8s cubic-bezier(0.22, 1, 0.36, 1) 0.1s both' }}>
            <div className="flex items-center justify-center gap-2 sm:gap-3 mb-3 sm:mb-4">
              <div className="relative">
                <div className="absolute -inset-2 sm:-inset-3 rounded-full bg-primary/10 blur-xl animate-pulse" />
                <ApasLogo size={36} animated />
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-wider bg-gradient-to-r from-primary via-primary/80 to-primary/50 bg-clip-text text-transparent animate-gradient-text">
                APAS
              </h1>
            </div>
            <p className="text-muted-foreground text-xs sm:text-sm">
              {T.subtitle}
            </p>
          </div>

          {/* Auth Card - responsive padding */}
          <div className="animate-auth-card bg-card/80 border border-border/60 rounded-2xl shadow-2xl p-4 sm:p-6 backdrop-blur-xl relative overflow-hidden">
            {/* Card top gradient accent */}
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
            {/* Mode Tabs - compact on mobile */}
            <div className="flex gap-0.5 sm:gap-1 mb-4 sm:mb-6 bg-secondary/50 rounded-lg p-0.5 sm:p-1">
              <button
                onClick={() => { playClick(false); setMode('login'); setError(''); setSuccess(''); }}
                className={`flex-1 flex items-center justify-center gap-1 py-1.5 sm:py-2 px-1.5 sm:px-3 rounded-md text-[11px] sm:text-sm font-medium transition-all duration-300 ${
                  mode === 'login' ? 'bg-background text-foreground shadow-sm auth-tab-active' : 'text-muted-foreground hover:text-foreground hover:bg-background/40'
                }`}
              >
                <LogIn className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                {T.logIn}
              </button>
              <button
                onClick={() => { playClick(false); setMode('signup'); setError(''); setSuccess(''); }}
                className={`flex-1 flex items-center justify-center gap-1 py-1.5 sm:py-2 px-1.5 sm:px-3 rounded-md text-[11px] sm:text-sm font-medium transition-all duration-300 ${
                  mode === 'signup' ? 'bg-background text-foreground shadow-sm auth-tab-active' : 'text-muted-foreground hover:text-foreground hover:bg-background/40'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                {T.signUp}
              </button>
              <button
                onClick={() => { playClick(false); setMode('otp'); setError(''); setSuccess(''); }}
                className={`flex-1 flex items-center justify-center gap-1 py-1.5 sm:py-2 px-1.5 sm:px-3 rounded-md text-[11px] sm:text-sm font-medium transition-all duration-300 ${
                  mode === 'otp' ? 'bg-background text-foreground shadow-sm auth-tab-active' : 'text-muted-foreground hover:text-foreground hover:bg-background/40'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden xs:inline">{T.magicLink}</span>
                <span className="xs:hidden">{lang === 'ar' ? 'رابط' : 'OTP'}</span>
              </button>
            </div>

            {/* Magic Link Explanation */}
            {mode === 'otp' && (
              <div className="mb-4 flex items-start gap-2 bg-primary/5 border border-primary/20 rounded-lg p-3">
                <Info className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {T.magicLinkExplanation}
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4" key={mode}>
              {/* Email */}
              <div style={{ animation: 'heroFadeUp 0.5s cubic-bezier(0.22, 1, 0.36, 1) 0.05s both' }}>
                <label htmlFor="auth-email" className="block text-xs font-medium text-muted-foreground mb-1.5">{T.email}</label>
                <div className="relative group">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <input
                    id="auth-email"
                    name="email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder={T.emailPlaceholder}
                    required
                    autoComplete="email"
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-300"
                  />
                </div>
              </div>

              {/* Password (only for login/signup) */}
              {mode !== 'otp' && (
                <div style={{ animation: 'heroFadeUp 0.5s cubic-bezier(0.22, 1, 0.36, 1) 0.15s both' }}>
                  <label htmlFor="auth-password" className="block text-xs font-medium text-muted-foreground mb-1.5">{T.password}</label>
                  <div className="relative group">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <input
                      id="auth-password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder={mode === 'signup' ? T.passwordMinChars : T.passwordPlaceholder}
                      required
                      minLength={mode === 'signup' ? 6 : undefined}
                      autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                      className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Error / Success */}
              {error && (
                <div className="bg-destructive/10 border border-destructive/30 text-destructive text-xs p-3 rounded-lg">
                  {error}
                </div>
              )}
              {success && (
                <div className="bg-green-500/10 border border-green-500/30 text-green-600 dark:text-green-400 text-xs p-3 rounded-lg">
                  {success}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/25 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ animation: 'heroFadeUp 0.5s cubic-bezier(0.22, 1, 0.36, 1) 0.25s both' }}
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                ) : (
                  <>
                    {mode === 'login' && T.logIn}
                    {mode === 'signup' && T.createAccount}
                    {mode === 'otp' && T.sendMagicLink}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-3 my-5">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">{T.or}</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* Guest Access */}
            <button
              onClick={handleGuestAccess}
              className="w-full py-2.5 rounded-lg border border-border bg-secondary/50 text-foreground font-medium text-sm hover:bg-secondary hover:border-primary/20 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 flex items-center justify-center gap-2"
            >
              {T.continueAsGuest}
              <ArrowRight className="w-4 h-4" />
            </button>

            <p className="text-[10px] text-muted-foreground text-center mt-3">
              {T.guestNote}
            </p>
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-muted-foreground mt-6" style={{ animation: 'heroFadeUp 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.5s both' }}>
            {T.footer}
          </p>
        </div>

        {/* Fullscreen notification */}
        {fullscreenNotice && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 animate-slideDown">
            <div className="bg-primary/95 text-primary-foreground px-6 py-3 rounded-xl shadow-2xl backdrop-blur-md flex items-center gap-3 text-sm font-medium border border-primary-foreground/20">
              <Maximize className="w-5 h-5" />
              <span>
                {lang === 'ar' ? 'تم تفعيل وضع ملء الشاشة لأفضل تجربة' : isFr ? 'Mode plein écran activé pour une meilleure expérience' : 'Fullscreen mode activated for the best experience'}
              </span>
            </div>
          </div>
        )}

        {/* About Modal */}
        <AboutModal open={showAbout} onClose={() => setShowAbout(false)} lang={lang} limitTabs />

        {/* Bug Report Button */}
        <BugReportButton lang={lang} />
      </div>
    </PageTransition>
  );
}
