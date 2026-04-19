import React, { useState } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  HeartHandshake,
  Crown,
  Gift,
  ShieldCheck,
  Lock,
  Copy,
  ExternalLink,
  Mail,
  Check,
  Sparkles,
  Zap,
  BookOpen,
  Brain,
  Activity,
  Infinity as InfinityIcon,
  BadgeCheck,
  ChevronRight,
} from 'lucide-react';

interface SupportModalProps {
  open: boolean;
  onClose: () => void;
  lang: string;
}

type TabKey = 'subscription' | 'donation';

const RIP = '00799999002885975343';
const BARIDIMOB_URL = 'https://baridimob.dz/';
const ECCP_URL = 'https://eccp.poste.dz/';
const DEV_EMAIL = 'medjahed9abdelhadi@gmail.com';

const t = (lang: string, ar: string, en: string, fr: string) =>
  lang === 'ar' ? ar : lang === 'fr' ? fr : en;

type PlanKey = '1m' | '3m';

interface Plan {
  key: PlanKey;
  price: number;
  periodAr: string;
  periodEn: string;
  periodFr: string;
  titleAr: string;
  titleEn: string;
  titleFr: string;
  highlight?: boolean;
  badgeAr?: string;
  badgeEn?: string;
  badgeFr?: string;
}

const PLANS: Plan[] = [
  {
    key: '1m',
    price: 500,
    periodAr: 'لشهر واحد',
    periodEn: 'for 1 month',
    periodFr: 'pour 1 mois',
    titleAr: 'اشتراك شهري',
    titleEn: 'Monthly',
    titleFr: 'Mensuel',
  },
  {
    key: '3m',
    price: 1000,
    periodAr: 'لثلاثة أشهر',
    periodEn: 'for 3 months',
    periodFr: 'pour 3 mois',
    titleAr: 'اشتراك ثلاثي — كل الميزات',
    titleEn: 'Quarterly — all features',
    titleFr: 'Trimestriel — toutes les fonctions',
    highlight: true,
    badgeAr: 'الأكثر توفيراً',
    badgeEn: 'Best value',
    badgeFr: 'Meilleure offre',
  },
];

const copyText = async (value: string, ok: string) => {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(value);
    } else {
      const ta = document.createElement('textarea');
      ta.value = value;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    toast.success(ok);
  } catch {
    toast.error(value);
  }
};

const SupportModal: React.FC<SupportModalProps> = ({ open, onClose, lang }) => {
  const isRTL = lang === 'ar';
  const [tab, setTab] = useState<TabKey>('subscription');
  const [copied, setCopied] = useState(false);

  const label = (ar: string, en: string, fr: string) => t(lang, ar, en, fr);

  const handleCopyRip = async () => {
    await copyText(
      RIP,
      label('تم نسخ رقم RIP إلى الحافظة', 'RIP copied to clipboard', 'RIP copié dans le presse-papiers')
    );
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2200);
  };

  const openBaridiMob = async () => {
    await copyText(
      RIP,
      label(
        'تم نسخ RIP — الصقه في Baridi Mob',
        'RIP copied — paste it in Baridi Mob',
        'RIP copié — collez-le dans Baridi Mob'
      )
    );
    window.open(BARIDIMOB_URL, '_blank', 'noopener,noreferrer');
  };

  const openEccp = async () => {
    await copyText(
      RIP,
      label(
        'تم نسخ RIP — الصقه في موقع ECCP',
        'RIP copied — paste it in ECCP',
        'RIP copié — collez-le dans ECCP'
      )
    );
    window.open(ECCP_URL, '_blank', 'noopener,noreferrer');
  };

  const mailtoFor = (planKey?: PlanKey) => {
    const subject =
      planKey === '1m'
        ? 'APAS — Monthly subscription (500 DZD) — payment proof'
        : planKey === '3m'
          ? 'APAS — Quarterly subscription (1000 DZD) — payment proof'
          : 'APAS — Donation notice';
    const body = label(
      `السلام عليكم،\n\nلقد قمت ${
        planKey ? 'بدفع اشتراك' : 'بإرسال تبرع'
      } عبر RIP: ${RIP}.\nالمبلغ: ${planKey === '1m' ? '500 DZD' : planKey === '3m' ? '1000 DZD' : '...'}\nتاريخ الدفع: \nرقم العملية / المرجع: \n\nمرفق فاتورة/لقطة الدفع.\n\nالاسم الكامل: \nالبريد المستخدم في التطبيق: \n\nشكراً لك.`,
      `Hello,\n\nI have ${
        planKey ? 'paid a subscription' : 'sent a donation'
      } via RIP: ${RIP}.\nAmount: ${planKey === '1m' ? '500 DZD' : planKey === '3m' ? '1000 DZD' : '...'}\nDate: \nTransaction / reference: \n\nPayment proof attached.\n\nFull name: \nAccount email in APAS: \n\nThank you.`,
      `Bonjour,\n\nJ'ai ${
        planKey ? 'payé un abonnement' : 'envoyé un don'
      } via RIP : ${RIP}.\nMontant : ${planKey === '1m' ? '500 DZD' : planKey === '3m' ? '1000 DZD' : '...'}\nDate : \nRéférence de la transaction : \n\nReçu joint.\n\nNom complet : \nEmail du compte APAS : \n\nMerci.`
    );
    return `mailto:${DEV_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const premiumFeatures: { icon: React.ReactNode; ar: string; en: string; fr: string }[] = [
    {
      icon: <Brain className="w-4 h-4" />,
      ar: 'الوصول الكامل لميزات الذكاء الاصطناعي (AI APAS / Vision) بدون قيود',
      en: 'Unlimited access to AI features (AI APAS / Vision)',
      fr: 'Accès illimité aux fonctions IA (AI APAS / Vision)',
    },
    {
      icon: <Activity className="w-4 h-4" />,
      ar: 'تحليلات متقدّمة وتقارير تصديرية (PDF) بدون علامة مائية',
      en: 'Advanced analytics and PDF reports without watermark',
      fr: 'Analyses avancées et rapports PDF sans filigrane',
    },
    {
      icon: <Zap className="w-4 h-4" />,
      ar: 'محاكاة بدقة عالية، Monte-Carlo، ومقارنة متعدّدة السيناريوهات',
      en: 'High-precision simulations, Monte-Carlo and multi-scenario comparison',
      fr: 'Simulations haute précision, Monte-Carlo et comparaison multi-scénarios',
    },
    {
      icon: <BookOpen className="w-4 h-4" />,
      ar: 'المادة الأكاديمية الموسّعة والدروس الخفية داخل التطبيق',
      en: 'Extended academic content and hidden lessons inside the app',
      fr: 'Contenu académique étendu et leçons cachées dans l’app',
    },
    {
      icon: <InfinityIcon className="w-4 h-4" />,
      ar: 'حفظ غير محدود للسيناريوهات ومشاركتها مع الفصل الدراسي',
      en: 'Unlimited scenario saving and classroom sharing',
      fr: 'Sauvegarde illimitée de scénarios et partage en classe',
    },
    {
      icon: <BadgeCheck className="w-4 h-4" />,
      ar: 'أولوية في الدعم الفنّي والميزات الجديدة قبل الجميع',
      en: 'Priority support and early access to new features',
      fr: 'Support prioritaire et accès anticipé aux nouveautés',
    },
  ];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="max-w-3xl max-h-[90vh] p-0 gap-0 overflow-hidden border-border bg-background"
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        {/* Hero header */}
        <div className="relative overflow-hidden border-b border-border">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-rose-500/5 to-amber-500/10" />
          <div className="absolute inset-0 opacity-[0.08] bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary))_0%,transparent_50%)]" />
          <div className="relative px-6 pt-6 pb-5">
            <DialogHeader>
              <DialogTitle className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
                <HeartHandshake className="w-6 h-6 text-rose-500" />
                {label('دعم APAS', 'Support APAS', 'Soutenir APAS')}
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground mt-1 leading-relaxed">
                {label(
                  'دعمك هو ما يُبقي هذا المشروع الأكاديمي حياً ويُطوّر ميزات جديدة لك وللطلبة في الجزائر.',
                  'Your support keeps this academic project alive and unlocks new features for students in Algeria and beyond.',
                  'Votre soutien maintient ce projet académique en vie et débloque de nouvelles fonctionnalités.'
                )}
              </DialogDescription>
            </DialogHeader>

            {/* Trust row */}
            <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px]">
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                <ShieldCheck className="w-3.5 h-3.5" />
                {label('دفع آمن عبر بريد الجزائر', 'Secure via Algérie Poste', 'Sécurisé via Algérie Poste')}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                <Lock className="w-3.5 h-3.5" />
                {label('لا نخزّن بياناتك البنكية', 'We never store your banking data', 'Aucune donnée bancaire stockée')}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                <BadgeCheck className="w-3.5 h-3.5" />
                {label('تفعيل يدوي موثّق بالإيميل', 'Manual activation via email', 'Activation manuelle par email')}
              </span>
            </div>

            {/* Tabs */}
            <div className="mt-5 flex gap-1 p-1 rounded-lg bg-muted/50 border border-border w-fit">
              <button
                onClick={() => setTab('subscription')}
                className={`flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-md transition-all ${
                  tab === 'subscription'
                    ? 'bg-background shadow-sm text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Crown className="w-4 h-4 text-amber-500" />
                {label('اشتراك', 'Subscription', 'Abonnement')}
              </button>
              <button
                onClick={() => setTab('donation')}
                className={`flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-md transition-all ${
                  tab === 'donation'
                    ? 'bg-background shadow-sm text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Gift className="w-4 h-4 text-rose-500" />
                {label('تبرّع للمطوّر', 'Donate to developer', 'Faire un don')}
              </button>
            </div>
          </div>
        </div>

        <ScrollArea className="max-h-[calc(90vh-220px)]">
          <div className="px-6 py-5">
            {tab === 'subscription' ? (
              <SubscriptionView
                lang={lang}
                onCopyRip={handleCopyRip}
                onBaridiMob={openBaridiMob}
                onEccp={openEccp}
                mailtoFor={mailtoFor}
                copied={copied}
                plans={PLANS}
                features={premiumFeatures}
                label={label}
              />
            ) : (
              <DonationView
                lang={lang}
                onCopyRip={handleCopyRip}
                onBaridiMob={openBaridiMob}
                onEccp={openEccp}
                mailtoFor={mailtoFor}
                copied={copied}
                label={label}
              />
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

interface ViewCommonProps {
  lang: string;
  onCopyRip: () => void;
  onBaridiMob: () => void;
  onEccp: () => void;
  mailtoFor: (planKey?: PlanKey) => string;
  copied: boolean;
  label: (ar: string, en: string, fr: string) => string;
}

const RipBlock: React.FC<ViewCommonProps> = ({ onCopyRip, onBaridiMob, onEccp, copied, label }) => {
  return (
    <div className="rounded-xl border border-border bg-card/60 p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {label('رقم RIP الخاص بالمطوّر', 'Developer RIP number', 'RIP du développeur')}
          </span>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
          {label('بريد الجزائر — CCP', 'Algérie Poste — CCP', 'Algérie Poste — CCP')}
        </span>
      </div>

      <div className="flex items-stretch gap-2">
        <div
          className="flex-1 font-mono text-base sm:text-lg font-bold tracking-wider px-4 py-3 rounded-lg border border-border bg-background/80 select-all"
          dir="ltr"
        >
          {RIP}
        </div>
        <button
          onClick={onCopyRip}
          className="inline-flex items-center gap-1.5 px-3 rounded-lg border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 transition-all text-sm font-semibold"
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copied ? label('تم النسخ', 'Copied', 'Copié') : label('نسخ', 'Copy', 'Copier')}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
        <button
          onClick={onBaridiMob}
          className="inline-flex items-center justify-between gap-2 px-4 py-2.5 rounded-lg border border-border bg-background hover:bg-secondary transition-all group"
        >
          <span className="flex items-center gap-2 text-sm font-semibold">
            <ExternalLink className="w-4 h-4 text-primary" />
            {label('ادفع عبر Baridi Mob', 'Pay via Baridi Mob', 'Payer via Baridi Mob')}
          </span>
          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
        </button>
        <button
          onClick={onEccp}
          className="inline-flex items-center justify-between gap-2 px-4 py-2.5 rounded-lg border border-border bg-background hover:bg-secondary transition-all group"
        >
          <span className="flex items-center gap-2 text-sm font-semibold">
            <ExternalLink className="w-4 h-4 text-primary" />
            {label('ادفع عبر ECCP', 'Pay via ECCP', 'Payer via ECCP')}
          </span>
          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

      <p className="text-[11px] text-muted-foreground mt-3 leading-relaxed">
        {label(
          'عند الضغط على أي من زرَي الدفع أعلاه يتم نسخ رقم RIP تلقائياً ثم يُفتح موقع الدفع في نافذة جديدة. الصقه في خانة المستفيد.',
          'Clicking any payment button copies the RIP automatically and opens the payment site in a new tab. Paste it in the beneficiary field.',
          'Cliquer sur un bouton copie automatiquement le RIP et ouvre le site dans un nouvel onglet. Collez-le dans le champ bénéficiaire.'
        )}
      </p>
    </div>
  );
};

interface SubscriptionViewProps extends ViewCommonProps {
  plans: Plan[];
  features: { icon: React.ReactNode; ar: string; en: string; fr: string }[];
}

const SubscriptionView: React.FC<SubscriptionViewProps> = (props) => {
  const { lang, plans, features, mailtoFor, label } = props;

  const planTitle = (p: Plan) => (lang === 'ar' ? p.titleAr : lang === 'fr' ? p.titleFr : p.titleEn);
  const planPeriod = (p: Plan) => (lang === 'ar' ? p.periodAr : lang === 'fr' ? p.periodFr : p.periodEn);
  const planBadge = (p: Plan) => (lang === 'ar' ? p.badgeAr : lang === 'fr' ? p.badgeFr : p.badgeEn);

  return (
    <div className="space-y-5">
      {/* Why subscribe */}
      <div className="rounded-xl border border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-5 h-5 text-amber-500" />
          <h3 className="text-base font-bold">
            {label('ماذا تحصل عند الاشتراك؟', 'What you unlock with a subscription', 'Ce que vous débloquez')}
          </h3>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed mb-3">
          {label(
            'APAS مشروع تعليمي جزائري يُموَّل ذاتياً. اشتراكك يساعد على استمرار التطوير، دفع تكاليف الخوادم والذكاء الاصطناعي، وفتح ميزات مخصّصة للمشتركين.',
            'APAS is an Algerian educational project funded by its users. Your subscription covers servers and AI costs and unlocks premium features.',
            'APAS est un projet éducatif algérien autofinancé. Votre abonnement couvre les serveurs et l’IA et débloque les fonctions premium.'
          )}
        </p>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {features.map((f, i) => (
            <li
              key={i}
              className="flex items-start gap-2 text-sm leading-snug rounded-lg border border-border bg-background/60 p-3"
            >
              <span className="text-primary mt-0.5">{f.icon}</span>
              <span>{label(f.ar, f.en, f.fr)}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Plans */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {plans.map((p) => (
          <PlanCard
            key={p.key}
            plan={p}
            highlight={!!p.highlight}
            title={planTitle(p)}
            period={planPeriod(p)}
            badge={planBadge(p)}
            featuresLine={
              p.key === '3m'
                ? label('كل الميزات الخفية — أفضل قيمة', 'All hidden features — best value', 'Toutes les fonctions cachées')
                : label('فتح الميزات الأساسية', 'Core premium features', 'Fonctions premium de base')
            }
            onSelect={props.onCopyRip}
            onBaridiMob={props.onBaridiMob}
            onEccp={props.onEccp}
            mailtoHref={mailtoFor(p.key)}
            label={label}
          />
        ))}
      </div>

      {/* RIP block */}
      <RipBlock {...props} />

      {/* Activation steps */}
      <div className="rounded-xl border border-border bg-card/40 p-4 sm:p-5">
        <h4 className="text-sm font-bold mb-3 flex items-center gap-2">
          <BadgeCheck className="w-4 h-4 text-emerald-500" />
          {label('خطوات تفعيل الاشتراك', 'How your subscription is activated', 'Comment activer votre abonnement')}
        </h4>
        <ol className="space-y-2 text-sm text-muted-foreground leading-relaxed list-decimal ps-5">
          <li>
            {label(
              'اختر الباقة (500 دج أو 1000 دج) واضغط عليها. سيُنسخ رقم RIP تلقائياً.',
              'Choose a plan (500 or 1000 DZD) and click it. The RIP gets copied automatically.',
              'Choisissez un plan (500 ou 1000 DZD) et cliquez. Le RIP est copié automatiquement.'
            )}
          </li>
          <li>
            {label(
              'ادفع عبر Baridi Mob أو ECCP (الصق رقم RIP في خانة المستفيد).',
              'Pay via Baridi Mob or ECCP (paste the RIP in the beneficiary field).',
              'Payez via Baridi Mob ou ECCP (collez le RIP en bénéficiaire).'
            )}
          </li>
          <li>
            {label(
              'بعد الدفع، أرسل إشعار الاستلام / الفاتورة إلى البريد: ',
              'After payment, email the receipt to: ',
              'Après paiement, envoyez le reçu à : '
            )}
            <a
              href={`mailto:${DEV_EMAIL}`}
              className="font-semibold text-primary underline underline-offset-2 break-all"
            >
              {DEV_EMAIL}
            </a>
          </li>
          <li>
            {label(
              'يتم تفعيل حسابك يدوياً خلال 24 ساعة بعد التحقّق من الدفع.',
              'Your account is activated manually within 24h after payment verification.',
              'Votre compte est activé manuellement sous 24h après vérification.'
            )}
          </li>
        </ol>

        <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-[12px] leading-relaxed text-amber-800 dark:text-amber-200">
          <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" />
          <p>
            {label(
              'لا تُرسل كلمة المرور أو أي بيانات بنكية حسّاسة عبر الإيميل. يكفي إرفاق لقطة/فاتورة الدفع مع اسمك وبريدك في التطبيق.',
              'Never send passwords or sensitive banking data by email. Just attach the payment receipt with your name and APAS email.',
              'N’envoyez jamais de mot de passe ou données bancaires. Joignez seulement le reçu avec votre nom et email APAS.'
            )}
          </p>
        </div>
      </div>
    </div>
  );
};

interface PlanCardProps {
  plan: Plan;
  highlight: boolean;
  title: string;
  period: string;
  badge?: string;
  featuresLine: string;
  onSelect: () => void;
  onBaridiMob: () => void;
  onEccp: () => void;
  mailtoHref: string;
  label: (ar: string, en: string, fr: string) => string;
}

const PlanCard: React.FC<PlanCardProps> = ({
  plan,
  highlight,
  title,
  period,
  badge,
  featuresLine,
  onSelect,
  onBaridiMob,
  onEccp,
  mailtoHref,
  label,
}) => {
  const handleClick = () => {
    onSelect();
  };
  return (
    <div
      className={`relative rounded-xl border p-4 sm:p-5 transition-all ${
        highlight
          ? 'border-amber-500/50 bg-gradient-to-br from-amber-500/10 via-background to-primary/10 shadow-lg shadow-amber-500/5'
          : 'border-border bg-card/60'
      }`}
    >
      {badge && (
        <span className="absolute -top-2 end-4 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500 text-white shadow-sm">
          <Crown className="w-3 h-3" />
          {badge}
        </span>
      )}

      <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
        {plan.key === '3m' ? (
          <Sparkles className="w-4 h-4 text-amber-500" />
        ) : (
          <Zap className="w-4 h-4 text-primary" />
        )}
        {title}
      </div>

      <div className="mt-2 flex items-baseline gap-1">
        <span className="text-3xl sm:text-4xl font-extrabold tracking-tight">{plan.price}</span>
        <span className="text-sm font-semibold text-muted-foreground">DZD</span>
        <span className="text-xs text-muted-foreground ms-1">{period}</span>
      </div>

      <p className="mt-1 text-xs text-muted-foreground">{featuresLine}</p>

      <button
        onClick={handleClick}
        className={`mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm transition-all ${
          highlight
            ? 'bg-gradient-to-r from-amber-500 to-rose-500 text-white hover:opacity-95 shadow-md'
            : 'bg-primary text-primary-foreground hover:bg-primary/90'
        }`}
      >
        <Copy className="w-4 h-4" />
        {label('اختر هذه الباقة ونسخ RIP', 'Choose this plan & copy RIP', 'Choisir & copier le RIP')}
      </button>

      <div className="grid grid-cols-2 gap-2 mt-2">
        <button
          onClick={onBaridiMob}
          className="inline-flex items-center justify-center gap-1 px-2 py-2 rounded-lg border border-border bg-background hover:bg-secondary text-xs font-semibold transition-all"
        >
          <ExternalLink className="w-3.5 h-3.5 text-primary" />
          Baridi Mob
        </button>
        <button
          onClick={onEccp}
          className="inline-flex items-center justify-center gap-1 px-2 py-2 rounded-lg border border-border bg-background hover:bg-secondary text-xs font-semibold transition-all"
        >
          <ExternalLink className="w-3.5 h-3.5 text-primary" />
          ECCP
        </button>
      </div>

      <a
        href={mailtoHref}
        className="mt-2 inline-flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-lg border border-dashed border-border bg-background/50 hover:bg-secondary text-xs text-muted-foreground hover:text-foreground transition-all"
      >
        <Mail className="w-3.5 h-3.5" />
        {label('إرسال إثبات الدفع بعد التحويل', 'Send payment proof after transfer', 'Envoyer le reçu après paiement')}
      </a>
    </div>
  );
};

const DonationView: React.FC<ViewCommonProps> = (props) => {
  const { label, mailtoFor } = props;
  return (
    <div className="space-y-5">
      {/* Why donate */}
      <div className="rounded-xl border border-rose-500/20 bg-gradient-to-br from-rose-500/5 via-background to-primary/5 p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-2">
          <Gift className="w-5 h-5 text-rose-500" />
          <h3 className="text-base font-bold">
            {label('لماذا تتبرّع؟', 'Why donate?', 'Pourquoi faire un don ?')}
          </h3>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {label(
            'أنا طالب جزائري طوّرت APAS لخدمة التعليم والبحث. لا يوجد دعم مؤسّسي — كل قرش يذهب مباشرةً لتغطية تكاليف الخوادم، واجهات الذكاء الاصطناعي، والتحسينات الجديدة. أي مبلغ يُحدث فرقاً.',
            'I am an Algerian student who built APAS to serve education and research. There is no institutional funding — every dinar goes directly to servers, AI APIs, and new features. Any amount helps.',
            'Je suis un étudiant algérien qui a créé APAS pour l’éducation et la recherche. Pas de financement institutionnel — chaque dinar couvre serveurs, IA et nouveautés. Tout montant aide.'
          )}
        </p>
      </div>

      {/* RIP block */}
      <RipBlock {...props} />

      {/* Contact card */}
      <div className="rounded-xl border border-border bg-card/40 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="shrink-0 w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Mail className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-bold">
              {label('أخبرني بتبرّعك', 'Let me know about your donation', 'Informez-moi de votre don')}
            </h4>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              {label(
                'بعد التحويل، راسلني على بريدي لأشكرك شخصياً وأضيفك (اختيارياً) لقائمة الداعمين:',
                'After your transfer, email me so I can thank you personally and optionally add you to the supporters list:',
                'Après votre virement, écrivez-moi pour un remerciement personnel (et, si vous voulez, figurer dans la liste des donateurs) :'
              )}
            </p>
            <a
              href={mailtoFor()}
              className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-primary underline underline-offset-2 break-all"
            >
              {DEV_EMAIL}
            </a>
          </div>
        </div>
      </div>

      {/* Thank you note */}
      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-center">
        <HeartHandshake className="w-6 h-6 text-emerald-500 mx-auto mb-1" />
        <p className="text-sm font-semibold text-foreground">
          {label('شكراً على دعمك — مجاهد عبدالهادي', 'Thank you for your support — Medjahed Abdelhadi', 'Merci pour votre soutien — Medjahed Abdelhadi')}
        </p>
        <p className="text-[11px] text-muted-foreground mt-1">
          {label(
            'كل تبرّع يُساعد على إبقاء APAS مجانياً للطلبة.',
            'Every donation helps keep APAS free for students.',
            'Chaque don aide à garder APAS gratuit pour les étudiants.'
          )}
        </p>
      </div>
    </div>
  );
};

export default SupportModal;
