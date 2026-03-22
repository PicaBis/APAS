import React, { useEffect, useRef, useState } from 'react';

interface Testimonial {
  name: string;
  handle: string;
  avatar: string;
  text: string;
  lang: 'ar' | 'en';
}

const TESTIMONIALS_ROW1: Testimonial[] = [
  {
    name: 'Ahmed Khelifi',
    handle: '@ahmed_khelifi',
    avatar: '/avatars/ahmed_k.jpg',
    text: 'APAS غيّر طريقة تدريسي للفيزياء بالكامل. الطلاب أصبحوا أكثر تفاعلاً مع المحاكاة التفاعلية، والنتائج الأكاديمية تحسنت بشكل ملحوظ.',
    lang: 'ar',
  },
  {
    name: 'Emily Carter',
    handle: '@emilycarter_phys',
    avatar: '/avatars/emily_c.jpg',
    text: "I've tried PhET and GeoGebra, but APAS is on another level. The AI predictions and 3D simulations make it feel like a real lab experience. Highly recommended for physics educators.",
    lang: 'en',
  },
  {
    name: 'فاطمة الزهراء',
    handle: '@fatima_zahra',
    avatar: '/avatars/fatima_z.jpg',
    text: 'أداة رائعة! الواجهة بالعربية ممتازة والرؤية الحاسوبية تستخرج المعاملات من الصور تلقائياً. أتمنى لو كانت متوفرة عندما كنت طالبة.',
    lang: 'ar',
  },
  {
    name: 'David Laurent',
    handle: '@davidlaurent',
    avatar: '/avatars/david_l.jpg',
    text: "The stroboscopic photography feature is genius. My students can now compare their real lab photos with the simulation results side by side. Minor UI lag on mobile, but overall excellent.",
    lang: 'en',
  },
  {
    name: 'عمر بن علي',
    handle: '@omar_benali',
    avatar: '/avatars/omar_b.jpg',
    text: 'استخدمت APAS في مشروع التخرج وكانت النتائج مبهرة. تحليل الأخطاء R² و RMSE ساعدني كثيراً في المقارنة بين النماذج. تطبيق أكاديمي بامتياز.',
    lang: 'ar',
  },
  {
    name: 'James Wilson',
    handle: '@jameswilson_sci',
    avatar: '/avatars/james_w.jpg',
    text: "APAS brings something unique to physics education. The equation engine lets students input custom equations and see trajectories rendered live. Could use more documentation though.",
    lang: 'en',
  },
];

const TESTIMONIALS_ROW2: Testimonial[] = [
  {
    name: 'سارة محمدي',
    handle: '@sarah_mohamedi',
    avatar: '/avatars/sarah_m.jpg',
    text: 'نظام إدارة الفصول ممتاز! أنشأت فصلاً لطلابي وهم يرفعون تجاربهم والنتائج تظهر مباشرة. يوفر وقت كبير في التقييم.',
    lang: 'ar',
  },
  {
    name: 'Maria Garcia',
    handle: '@mariagarcia_edu',
    avatar: '/avatars/maria_g.jpg',
    text: "What impressed me most is the planetary environments feature. Launching a projectile on Mars with real gravity values makes physics tangible for students. The Arabic support is a nice touch too.",
    lang: 'en',
  },
  {
    name: 'يوسف حداد',
    handle: '@youssef_haddad',
    avatar: '/avatars/youssef_h.jpg',
    text: 'المقارنة بين Euler و RK4 و AI APAS فتحت عيني على الفرق الحقيقي بين طرق التكامل العددي. أداة تعليمية من الطراز الأول، لكن أتمنى إضافة المزيد من الأمثلة.',
    lang: 'ar',
  },
  {
    name: 'خالد سعيدي',
    handle: '@khalid_saidi',
    avatar: '/avatars/khalid_s.jpg',
    text: 'تطبيق APAS يستحق الاهتمام. المحاكاة ثلاثية الأبعاد واقعية جداً والذكاء الاصطناعي يتنبأ بالمسارات بدقة عالية. فخور أنه منتج جزائري.',
    lang: 'ar',
  },
  {
    name: 'Nadia Rehmani',
    handle: '@nadia_rehmani',
    avatar: '/avatars/nadia_r.jpg',
    text: "APAS solved a real problem in our department. We needed a tool that supports Arabic and handles projectile analysis beyond simple calculators. The computer vision feature is a game changer.",
    lang: 'en',
  },
  {
    name: 'أمينة دحماني',
    handle: '@amina_dahmani',
    avatar: '/avatars/amina_d.jpg',
    text: 'كأستاذة فيزياء، أقدّر كثيراً الجهد المبذول في APAS. التصميم أنيق والميزات متقدمة. بعض الخيارات كثيرة للمبتدئين لكن التطبيق ممتاز بشكل عام.',
    lang: 'ar',
  },
];

interface TestimonialsSectionProps {
  lang: 'ar' | 'en' | 'fr';
}

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
      <svg className="w-5 h-5 text-muted-foreground/50 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    </div>
    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{testimonial.text}</p>
  </div>
);

const ScrollingRow: React.FC<{ testimonials: Testimonial[]; direction: 'left' | 'right'; speed?: number }> = ({
  testimonials,
  direction,
  speed = 30,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    let animationId: number;
    let lastTime = 0;
    const pxPerSecond = speed;

    const animate = (timestamp: number) => {
      if (!lastTime) lastTime = timestamp;
      const delta = (timestamp - lastTime) / 1000;
      lastTime = timestamp;

      if (!isPaused) {
        if (direction === 'left') {
          el.scrollLeft += pxPerSecond * delta;
          if (el.scrollLeft >= el.scrollWidth / 2) {
            el.scrollLeft = 0;
          }
        } else {
          el.scrollLeft -= pxPerSecond * delta;
          if (el.scrollLeft <= 0) {
            el.scrollLeft = el.scrollWidth / 2;
          }
        }
      }

      animationId = requestAnimationFrame(animate);
    };

    // Initialize scroll position for right-to-left direction
    if (direction === 'right') {
      el.scrollLeft = el.scrollWidth / 2;
    }

    animationId = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationId);
  }, [direction, speed, isPaused]);

  // Duplicate testimonials for seamless loop
  const doubled = [...testimonials, ...testimonials];

  return (
    <div
      ref={scrollRef}
      className="flex gap-4 overflow-hidden py-2 scrollbar-hide"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
    >
      {doubled.map((t, i) => (
        <TestimonialCard key={`${t.handle}-${i}`} testimonial={t} />
      ))}
    </div>
  );
};

const TestimonialsSection: React.FC<TestimonialsSectionProps> = ({ lang }) => {
  const title = lang === 'ar' ? 'ماذا يقول المستخدمون؟' : lang === 'fr' ? "Qu'en disent les utilisateurs ?" : 'What Users Say';
  const subtitle = lang === 'ar' ? 'آراء الأساتذة والطلاب والباحثين' : lang === 'fr' ? 'Avis des enseignants, \u00e9tudiants et chercheurs' : 'Reviews from educators, students, and researchers';

  return (
    <section className="relative z-10 py-16 overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 mb-10 text-center">
        <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">{title}</h2>
        <p className="text-muted-foreground">{subtitle}</p>
      </div>

      <div className="space-y-4">
        <ScrollingRow testimonials={TESTIMONIALS_ROW1} direction="left" speed={25} />
        <ScrollingRow testimonials={TESTIMONIALS_ROW2} direction="right" speed={25} />
      </div>
    </section>
  );
};

export default TestimonialsSection;
