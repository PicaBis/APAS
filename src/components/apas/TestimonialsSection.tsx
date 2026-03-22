import React from 'react';

type Platform = 'x' | 'facebook';

interface Testimonial {
  name: string;
  handle: string;
  avatar: string;
  text: string;
  lang: 'ar' | 'en';
  platform: Platform;
}

const XIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const FacebookIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

const TESTIMONIALS_ROW1: Testimonial[] = [
  {
    name: 'Ahmed Khelifi',
    handle: '@ahmed_khelifi',
    avatar: '/avatars/ahmed_k.jpg',
    text: 'APAS غيّر طريقة تدريسي للفيزياء بالكامل. الطلاب أصبحوا أكثر تفاعلاً مع المحاكاة التفاعلية، والنتائج الأكاديمية تحسنت بشكل ملحوظ.',
    lang: 'ar',
    platform: 'x',
  },
  {
    name: 'Emily Carter',
    handle: '@emilycarter_phys',
    avatar: '/avatars/emily_c.jpg',
    text: "I've tried PhET and GeoGebra, but APAS is on another level. The AI predictions and 3D simulations make it feel like a real lab experience. Highly recommended for physics educators.",
    lang: 'en',
    platform: 'facebook',
  },
  {
    name: 'فاطمة الزهراء',
    handle: '@fatima_zahra',
    avatar: '/avatars/fatima_z.jpg',
    text: 'أداة رائعة! الواجهة بالعربية ممتازة والرؤية الحاسوبية تستخرج المعاملات من الصور تلقائياً. أتمنى لو كانت متوفرة عندما كنت طالبة.',
    lang: 'ar',
    platform: 'x',
  },
  {
    name: 'David Laurent',
    handle: 'David Laurent',
    avatar: '/avatars/david_l.jpg',
    text: "The stroboscopic photography feature is genius. My students can now compare their real lab photos with the simulation results side by side. Minor UI lag on mobile, but overall excellent.",
    lang: 'en',
    platform: 'facebook',
  },
  {
    name: 'عمر بن علي',
    handle: '@omar_benali',
    avatar: '/avatars/omar_b.jpg',
    text: 'استخدمت APAS في مشروع التخرج وكانت النتائج مبهرة. تحليل الأخطاء R² و RMSE ساعدني كثيراً في المقارنة بين النماذج. تطبيق أكاديمي بامتياز.',
    lang: 'ar',
    platform: 'x',
  },
  {
    name: 'James Wilson',
    handle: 'James Wilson',
    avatar: '/avatars/james_w.jpg',
    text: "APAS brings something unique to physics education. The equation engine lets students input custom equations and see trajectories rendered live. Could use more documentation though.",
    lang: 'en',
    platform: 'facebook',
  },
];

const TESTIMONIALS_ROW2: Testimonial[] = [
  {
    name: 'سارة محمدي',
    handle: 'سارة محمدي',
    avatar: '/avatars/sarah_m.jpg',
    text: 'نظام إدارة الفصول ممتاز! أنشأت فصلاً لطلابي وهم يرفعون تجاربهم والنتائج تظهر مباشرة. يوفر وقت كبير في التقييم.',
    lang: 'ar',
    platform: 'facebook',
  },
  {
    name: 'Maria Garcia',
    handle: '@mariagarcia_edu',
    avatar: '/avatars/maria_g.jpg',
    text: "What impressed me most is the planetary environments feature. Launching a projectile on Mars with real gravity values makes physics tangible for students. The Arabic support is a nice touch too.",
    lang: 'en',
    platform: 'x',
  },
  {
    name: 'يوسف حداد',
    handle: 'يوسف حداد',
    avatar: '/avatars/youssef_h.jpg',
    text: 'المقارنة بين Euler و RK4 و AI APAS فتحت عيني على الفرق الحقيقي بين طرق التكامل العددي. أداة تعليمية من الطراز الأول، لكن أتمنى إضافة المزيد من الأمثلة.',
    lang: 'ar',
    platform: 'facebook',
  },
  {
    name: 'خالد سعيدي',
    handle: '@khalid_saidi',
    avatar: '/avatars/khalid_s.jpg',
    text: 'تطبيق APAS يستحق الاهتمام. المحاكاة ثلاثية الأبعاد واقعية جداً والذكاء الاصطناعي يتنبأ بالمسارات بدقة عالية. فخور أنه منتج جزائري.',
    lang: 'ar',
    platform: 'x',
  },
  {
    name: 'Nadia Rehmani',
    handle: 'Nadia Rehmani',
    avatar: '/avatars/nadia_r.jpg',
    text: "APAS solved a real problem in our department. We needed a tool that supports Arabic and handles projectile analysis beyond simple calculators. The computer vision feature is a game changer.",
    lang: 'en',
    platform: 'facebook',
  },
  {
    name: 'أمينة دحماني',
    handle: '@amina_dahmani',
    avatar: '/avatars/amina_d.jpg',
    text: 'كأستاذة فيزياء، أقدّر كثيراً الجهد المبذول في APAS. التصميم أنيق والميزات متقدمة. بعض الخيارات كثيرة للمبتدئين لكن التطبيق ممتاز بشكل عام.',
    lang: 'ar',
    platform: 'x',
  },
];

interface TestimonialsSectionProps {
  lang: 'ar' | 'en' | 'fr';
}

const PlatformIcon: React.FC<{ platform: Platform }> = ({ platform }) => {
  if (platform === 'facebook') {
    return <FacebookIcon className="w-5 h-5 text-[#1877F2] flex-shrink-0" />;
  }
  return <XIcon className="w-5 h-5 text-muted-foreground/50 flex-shrink-0" />;
};

const TestimonialCard: React.FC<{ testimonial: Testimonial }> = ({ testimonial }) => (
  <div
    className="flex-shrink-0 w-[340px] sm:w-[380px] p-5 rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 group"
    dir={testimonial.lang === 'ar' ? 'rtl' : 'ltr'}
  >
    <div className="flex items-center gap-3 mb-3">
      <img
        src={testimonial.avatar}
        alt={testimonial.name}
        className="w-10 h-10 rounded-full object-cover border-2 border-border/50 group-hover:border-primary/30 transition-colors"
      />
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-semibold text-foreground truncate">{testimonial.name}</h4>
        <p className="text-xs text-muted-foreground truncate">{testimonial.handle}</p>
      </div>
      <PlatformIcon platform={testimonial.platform} />
    </div>
    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{testimonial.text}</p>
  </div>
);

const marqueeStyles = `
@keyframes testimonials-scroll-left {
  0% { transform: translateX(0); }
  100% { transform: translateX(calc(-50% - 0.5rem)); }
}
@keyframes testimonials-scroll-right {
  0% { transform: translateX(calc(-50% - 0.5rem)); }
  100% { transform: translateX(0); }
}
.testimonials-marquee-row {
  overflow: hidden;
  width: 100%;
}
.testimonials-track-left {
  display: flex;
  gap: 1rem;
  width: max-content;
  animation: testimonials-scroll-left 35s linear infinite;
  will-change: transform;
}
.testimonials-track-right {
  display: flex;
  gap: 1rem;
  width: max-content;
  animation: testimonials-scroll-right 35s linear infinite;
  will-change: transform;
}
.testimonials-marquee-row:hover .testimonials-track-left,
.testimonials-marquee-row:hover .testimonials-track-right {
  animation-play-state: paused;
}
`;

const ScrollingRow: React.FC<{ testimonials: Testimonial[]; direction: 'left' | 'right' }> = ({
  testimonials,
  direction,
}) => {
  // Duplicate the list multiple times to ensure no gaps at any screen size
  const items = [...testimonials, ...testimonials, ...testimonials, ...testimonials];

  return (
    <div className="testimonials-marquee-row py-2">
      <div className={direction === 'left' ? 'testimonials-track-left' : 'testimonials-track-right'}>
        {items.map((t, i) => (
          <TestimonialCard key={`${direction}-${t.handle}-${i}`} testimonial={t} />
        ))}
      </div>
    </div>
  );
};

const TestimonialsSection: React.FC<TestimonialsSectionProps> = ({ lang }) => {
  const title = lang === 'ar' ? 'ماذا يقول المستخدمون؟' : lang === 'fr' ? "Qu'en disent les utilisateurs ?" : 'What Users Say';
  const subtitle = lang === 'ar' ? 'آراء الأساتذة والطلاب والباحثين' : lang === 'fr' ? 'Avis des enseignants, \u00e9tudiants et chercheurs' : 'Reviews from educators, students, and researchers';

  return (
    <section className="relative z-10 py-16 overflow-hidden">
      <style>{marqueeStyles}</style>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 mb-10 text-center">
        <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">{title}</h2>
        <p className="text-muted-foreground">{subtitle}</p>
      </div>

      <div className="space-y-6">
        <ScrollingRow testimonials={TESTIMONIALS_ROW1} direction="left" />
        <ScrollingRow testimonials={TESTIMONIALS_ROW2} direction="right" />
      </div>
    </section>
  );
};

export default TestimonialsSection;
