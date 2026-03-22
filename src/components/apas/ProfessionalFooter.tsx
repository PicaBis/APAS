import React from 'react';
import { useNavigate } from 'react-router-dom';
import ApasLogo from './ApasLogo';

interface FooterProps {
  lang: 'ar' | 'en' | 'fr';
}

interface FooterLink {
  label: string;
  action: 'navigate' | 'scroll' | 'external';
  target: string;
}

interface FooterColumn {
  title: string;
  links: FooterLink[];
}

const FOOTER_DATA: Record<string, { tagline: string; columns: FooterColumn[]; copyright: string }> = {
  ar: {
    tagline: 'نظام تحليل المقذوفات بالذكاء الاصطناعي',
    columns: [
      {
        title: 'المنتج',
        links: [
          { label: 'المحاكاة', action: 'navigate', target: '/simulator' },
          { label: 'المحاكاة ثلاثية الأبعاد', action: 'navigate', target: '/simulator' },
          { label: 'محرك المعادلات', action: 'navigate', target: '/simulator' },
        ],
      },
      {
        title: 'الميزات',
        links: [
          { label: 'الذكاء الاصطناعي', action: 'scroll', target: '#features' },
          { label: 'الرؤية الحاسوبية', action: 'scroll', target: '#features' },
          { label: 'التصوير الستروبوسكوبي', action: 'scroll', target: '#features' },
          { label: 'البيئات الكوكبية', action: 'scroll', target: '#features' },
        ],
      },
      {
        title: 'التعليم',
        links: [
          { label: 'الفصل الدراسي', action: 'navigate', target: '/classroom' },
          { label: 'إدارة الفصول', action: 'navigate', target: '/classroom' },
          { label: 'تقييم الطلاب', action: 'navigate', target: '/classroom' },
        ],
      },
      {
        title: 'الحساب',
        links: [
          { label: 'تسجيل الدخول', action: 'navigate', target: '/' },
          { label: 'إنشاء حساب', action: 'navigate', target: '/?mode=signup' },
        ],
      },
    ],
    copyright: 'APAS — تطوير مجاهد عبدالهادي و موفق ابراهيم — المدرسة العليا للأساتذة بالأغواط',
  },
  en: {
    tagline: 'AI-Powered Projectile Analysis System',
    columns: [
      {
        title: 'PRODUCT',
        links: [
          { label: 'Simulation', action: 'navigate', target: '/simulator' },
          { label: '3D Simulation', action: 'navigate', target: '/simulator' },
          { label: 'Equation Engine', action: 'navigate', target: '/simulator' },
        ],
      },
      {
        title: 'FEATURES',
        links: [
          { label: 'AI Prediction', action: 'scroll', target: '#features' },
          { label: 'Computer Vision', action: 'scroll', target: '#features' },
          { label: 'Stroboscopic Photo', action: 'scroll', target: '#features' },
          { label: 'Planetary Environments', action: 'scroll', target: '#features' },
        ],
      },
      {
        title: 'EDUCATION',
        links: [
          { label: 'Classroom', action: 'navigate', target: '/classroom' },
          { label: 'Class Management', action: 'navigate', target: '/classroom' },
          { label: 'Student Assessment', action: 'navigate', target: '/classroom' },
        ],
      },
      {
        title: 'ACCOUNT',
        links: [
          { label: 'Log In', action: 'navigate', target: '/' },
          { label: 'Sign Up', action: 'navigate', target: '/?mode=signup' },
        ],
      },
    ],
    copyright: 'APAS — Developed by Medjahed Abdelhadi & Mouffok Ibrahim — ENS Laghouat',
  },
  fr: {
    tagline: "Systeme d'Analyse de Projectiles par IA",
    columns: [
      {
        title: 'PRODUIT',
        links: [
          { label: 'Simulation', action: 'navigate', target: '/simulator' },
          { label: 'Simulation 3D', action: 'navigate', target: '/simulator' },
          { label: "Moteur d'Equations", action: 'navigate', target: '/simulator' },
        ],
      },
      {
        title: 'FONCTIONNALITES',
        links: [
          { label: 'Prediction IA', action: 'scroll', target: '#features' },
          { label: 'Vision par Ordinateur', action: 'scroll', target: '#features' },
          { label: 'Photo Stroboscopique', action: 'scroll', target: '#features' },
          { label: 'Environnements Planetaires', action: 'scroll', target: '#features' },
        ],
      },
      {
        title: 'EDUCATION',
        links: [
          { label: 'Salle de Classe', action: 'navigate', target: '/classroom' },
          { label: 'Gestion de Classe', action: 'navigate', target: '/classroom' },
          { label: 'Evaluation', action: 'navigate', target: '/classroom' },
        ],
      },
      {
        title: 'COMPTE',
        links: [
          { label: 'Connexion', action: 'navigate', target: '/' },
          { label: "S'inscrire", action: 'navigate', target: '/?mode=signup' },
        ],
      },
    ],
    copyright: 'APAS — Developpe par Medjahed Abdelhadi & Mouffok Ibrahim — ENS Laghouat',
  },
};

const ProfessionalFooter: React.FC<FooterProps> = ({ lang }) => {
  const navigate = useNavigate();
  const data = FOOTER_DATA[lang] || FOOTER_DATA.en;
  const isRTL = lang === 'ar';

  const handleLinkClick = (link: FooterLink) => {
    if (link.action === 'navigate') {
      navigate(link.target);
    } else if (link.action === 'scroll') {
      const el = document.querySelector(link.target);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <footer className="relative z-10 border-t border-border/40 bg-gradient-to-b from-background to-secondary/20" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Decorative top glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-12 pb-8">
        {/* Main footer content */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-8 mb-10">
          {/* Brand column */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-2">
              <ApasLogo size={36} />
              <span className="text-xl font-bold tracking-wider bg-gradient-to-r from-primary via-primary/80 to-primary/50 bg-clip-text text-transparent">
                APAS
              </span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
              {data.tagline}
            </p>
            {/* Social-style icons using team photos */}
            <div className="flex items-center gap-3 pt-2">
              <a
                href="https://github.com/PicaBis/APAS"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-lg bg-secondary/60 border border-border/50 flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/30 hover:bg-primary/10 transition-all duration-300"
                title="GitHub"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
              </a>
              <div
                className="w-9 h-9 rounded-lg bg-secondary/60 border border-border/50 flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/30 hover:bg-primary/10 transition-all duration-300 cursor-pointer"
                title="ENS Laghouat"
              >
                <img src="/ensl-logo.jpg" alt="ENS" className="w-5 h-5 rounded-sm object-cover" />
              </div>
            </div>
          </div>

          {/* Link columns */}
          {data.columns.map((col, i) => (
            <div key={i} className="space-y-3">
              <h4 className="text-xs font-semibold text-primary tracking-wider uppercase">{col.title}</h4>
              <ul className="space-y-2">
                {col.links.map((link, j) => (
                  <li key={j}>
                    <button
                      onClick={() => handleLinkClick(link)}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200 text-start"
                    >
                      {link.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="border-t border-border/30 pt-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground text-center sm:text-start">
              {data.copyright}
            </p>
            <p className="text-xs text-muted-foreground/60" dir="ltr">
              {new Date().getFullYear()} APAS
            </p>
          </div>
        </div>
      </div>

      {/* Bottom decorative gradient */}
      <div className="h-1 bg-gradient-to-r from-primary/0 via-primary/40 to-primary/0" />
    </footer>
  );
};

export default ProfessionalFooter;
