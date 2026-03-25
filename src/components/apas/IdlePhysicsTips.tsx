import React, { useState, useEffect, useRef } from 'react';

const TIPS_EN = [
  "At 45°, a projectile achieves maximum range on flat ground.",
  "Air resistance converts kinetic energy into thermal energy.",
  "In vacuum, all objects fall at the same rate regardless of mass.",
  "The trajectory of a projectile is a parabola in ideal conditions.",
  "Galileo was the first to study projectile motion systematically.",
  "Terminal velocity occurs when drag force equals gravitational force.",
  "The Coriolis effect deflects projectiles on a rotating Earth.",
  "Kinetic energy is proportional to the square of velocity.",
  "Newton's 2nd law: F = ma governs all projectile motion.",
  "Energy is always conserved — it only changes form.",
  "The Magnus effect causes spinning balls to curve in flight.",
  "Bernoulli's principle explains lift on spinning projectiles.",
  "At the peak of trajectory, vertical velocity is exactly zero.",
  "Range doubles when launch height equals maximum height.",
  "Reynolds number determines if airflow is laminar or turbulent.",
  "A bullet fired horizontally and one dropped from the same height hit the ground at the same time.",
  "The optimal angle for maximum range changes with launch height — it's less than 45° from elevated positions.",
  "On the Moon, a projectile travels 6x farther because gravity is 1/6 of Earth's.",
  "A basketball thrown at 45° from a 3m height actually needs ~42° for maximum range.",
  "The speed of a cannonball at launch equals its speed at the same height on the way down (no air resistance).",
  "Projectile motion is actually two independent motions: constant horizontal and accelerated vertical.",
  "A football punted at 60° stays in the air longer but covers less distance than one kicked at 40°.",
  "The range equation R = v²sin(2θ)/g shows that 30° and 60° give the same range.",
  "In real life, a golf ball's dimples reduce drag and increase range by up to 50%.",
  "Astronauts on the ISS are in perpetual free fall — they experience projectile motion around Earth.",
  "A water fountain's arc is a perfect example of projectile motion you see every day.",
  "The drag force on a projectile increases with the square of its speed.",
  "Ancient catapults could launch projectiles over 300 meters using stored elastic energy.",
  "The vertical component of velocity determines how high a projectile goes.",
  "Complementary angles (like 25° and 65°) produce the same range but different flight times.",
  "A projectile's mechanical energy is the sum of its kinetic and potential energy.",
  "Wind resistance makes real trajectories asymmetric — the descent is steeper than the ascent.",
  "The time to reach maximum height equals exactly half the total flight time (no air resistance).",
  "Earth's rotation affects long-range artillery — shells can deviate by hundreds of meters.",
  "A thrown javelin uses both projectile motion and aerodynamic lift to maximize distance.",
  "The horizontal distance at max height is exactly half the total range in ideal conditions.",
  "Momentum is conserved in collisions — this is why pool balls transfer energy on impact.",
  "A bouncing ball loses energy with each bounce due to deformation and heat.",
  "The acceleration due to gravity varies slightly across Earth's surface (9.78 to 9.83 m/s²).",
  "Satellites orbit Earth by continuously falling toward it but moving fast enough to miss.",
];

const TIPS_AR = [
  "عند زاوية 45° يحقق المقذوف أقصى مدى على سطح مستوٍ.",
  "مقاومة الهواء تحوّل الطاقة الحركية إلى طاقة حرارية.",
  "في الفراغ، تسقط جميع الأجسام بنفس المعدل بغض النظر عن الكتلة.",
  "مسار المقذوف يكون قطعاً مكافئاً في الظروف المثالية.",
  "غاليليو كان أول من درس حركة المقذوفات بشكل منهجي.",
  "السرعة الحدية تحدث عندما تساوي قوة السحب قوة الجاذبية.",
  "تأثير كوريوليس يُحرف المقذوفات على الأرض الدوّارة.",
  "الطاقة الحركية تتناسب مع مربع السرعة.",
  "قانون نيوتن الثاني: F = ma يحكم كل حركة المقذوفات.",
  "الطاقة محفوظة دائماً — إنها تتغير شكلاً فقط.",
  "تأثير ماغنوس يجعل الكرات الدوّارة تنحني في الهواء.",
  "مبدأ بيرنولي يفسر الرفع على المقذوفات الدوّارة.",
  "عند قمة المسار، السرعة الرأسية تساوي صفراً تماماً.",
  "يتضاعف المدى عندما يساوي ارتفاع الإطلاق أقصى ارتفاع.",
  "عدد رينولدز يحدد ما إذا كان التدفق صفائحياً أو مضطرباً.",
  "رصاصة أُطلقت أفقياً وأخرى سقطت من نفس الارتفاع تصلان الأرض في نفس اللحظة.",
  "الزاوية المثلى لأقصى مدى تتغير مع ارتفاع الإطلاق — تكون أقل من 45° من المواقع المرتفعة.",
  "على القمر، يسافر المقذوف 6 أضعاف المسافة لأن الجاذبية سُدس جاذبية الأرض.",
  "كرة سلة رُميت بزاوية 45° من ارتفاع 3 أمتار تحتاج فعلياً ~42° لأقصى مدى.",
  "سرعة قذيفة المدفع عند الإطلاق تساوي سرعتها عند نفس الارتفاع أثناء النزول (بدون مقاومة هواء).",
  "حركة المقذوف هي فعلياً حركتان مستقلتان: أفقية منتظمة ورأسية متسارعة.",
  "كرة قدم رُكلت بزاوية 60° تبقى في الهواء أطول لكن تقطع مسافة أقل من واحدة بزاوية 40°.",
  "معادلة المدى R = v²sin(2θ)/g تُظهر أن زاويتي 30° و60° تعطيان نفس المدى.",
  "في الواقع، حفر كرة الغولف تقلل مقاومة الهواء وتزيد المدى بنسبة تصل إلى 50%.",
  "رواد الفضاء في محطة الفضاء الدولية في سقوط حر دائم — يعيشون حركة مقذوف حول الأرض.",
  "قوس نافورة الماء هو مثال مثالي لحركة المقذوفات تراه كل يوم.",
  "قوة السحب على المقذوف تزداد مع مربع سرعته.",
  "المنجنيقات القديمة كانت تقذف مقذوفات لأكثر من 300 متر باستخدام طاقة مرنة مخزّنة.",
  "المركّبة الرأسية للسرعة تحدد ارتفاع المقذوف.",
  "الزوايا المتكاملة (مثل 25° و65°) تعطي نفس المدى لكن بأزمنة طيران مختلفة.",
  "الطاقة الميكانيكية للمقذوف هي مجموع طاقته الحركية وطاقة الوضع.",
  "مقاومة الرياح تجعل المسارات الحقيقية غير متماثلة — النزول أشد انحداراً من الصعود.",
  "زمن الوصول لأقصى ارتفاع يساوي تماماً نصف زمن الطيران الكلي (بدون مقاومة هواء).",
  "دوران الأرض يؤثر على المدفعية بعيدة المدى — القذائف قد تنحرف مئات الأمتار.",
  "الرمح المقذوف يستخدم حركة المقذوفات والرفع الديناميكي الهوائي معاً لزيادة المسافة.",
  "المسافة الأفقية عند أقصى ارتفاع تساوي تماماً نصف المدى الكلي في الظروف المثالية.",
  "كمية الحركة محفوظة في التصادمات — لهذا تنقل كرات البلياردو الطاقة عند الاصطدام.",
  "الكرة المرتدة تفقد طاقة مع كل ارتداد بسبب التشوه والحرارة.",
  "تسارع الجاذبية يختلف قليلاً عبر سطح الأرض (من 9.78 إلى 9.83 م/ث²).",
  "الأقمار الصناعية تدور حول الأرض بالسقوط المستمر نحوها لكنها تتحرك بسرعة كافية لتفاديها.",
];

interface Props {
  lang: string;
}

export default function IdlePhysicsTips({ lang }: Props) {
  const [visible, setVisible] = useState(false);
  const [tipIndex, setTipIndex] = useState(0);
  const [fadeState, setFadeState] = useState<'in' | 'out' | 'hidden'>('hidden');
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const visibleRef = useRef(false);
  const isAr = lang === 'ar';
  const tips = isAr ? TIPS_AR : TIPS_EN;

  const clearAllTimers = () => {
    if (idleTimerRef.current) { clearTimeout(idleTimerRef.current); idleTimerRef.current = null; }
    if (hideTimerRef.current) { clearTimeout(hideTimerRef.current); hideTimerRef.current = null; }
    if (fadeTimerRef.current) { clearTimeout(fadeTimerRef.current); fadeTimerRef.current = null; }
  };

  const hideImmediately = () => {
    setFadeState('out');
    setVisible(false);
    setFadeState('hidden');
    visibleRef.current = false;
  };

  const showNextTip = () => {
    setTipIndex(prev => {
      let next = Math.floor(Math.random() * tips.length);
      while (next === prev && tips.length > 1) next = Math.floor(Math.random() * tips.length);
      return next;
    });
    setVisible(true);
    visibleRef.current = true;
    setFadeState('in');

    hideTimerRef.current = setTimeout(() => {
      setFadeState('out');
      fadeTimerRef.current = setTimeout(() => {
        setVisible(false);
        visibleRef.current = false;
        setFadeState('hidden');
        // Show another tip after a longer pause
        idleTimerRef.current = setTimeout(showNextTip, 8000);
      }, 400);
    }, 5000);
  };

  const resetIdleTimer = () => {
    clearAllTimers();

    // Immediately hide any visible tip
    if (visibleRef.current) {
      hideImmediately();
    }

    idleTimerRef.current = setTimeout(showNextTip, 10000);
  };

  useEffect(() => {
    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach(e => window.addEventListener(e, resetIdleTimer, { passive: true }));
    resetIdleTimer();

    return () => {
      events.forEach(e => window.removeEventListener(e, resetIdleTimer));
      clearAllTimers();
      visibleRef.current = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  if (!visible) return null;

  return (
    <div
      className={`fixed z-50 transition-all duration-500 pointer-events-none ${
        fadeState === 'in' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
      }`}
      style={{
        bottom: '100px',
        right: isAr ? 'auto' : '24px',
        left: isAr ? '24px' : 'auto',
        maxWidth: '340px',
      }}
    >
      {/* Speech bubble */}
      <div className="relative bg-background border-2 border-foreground/20 rounded-2xl px-4 py-3 shadow-2xl shadow-black/20 pointer-events-auto">
        {/* Bubble tail - pointing down to the button */}
        <div
          className="absolute top-full bg-background border-b-2 border-foreground/20 w-4 h-4 rotate-45 -translate-y-2"
          style={{
            right: isAr ? 'auto' : '32px',
            left: isAr ? '32px' : 'auto',
          }}
        />
        
        {/* Header */}
        <div className="flex items-center gap-2 mb-1.5">
          <div className="w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
            <span className="text-xs">💡</span>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-primary whitespace-nowrap">
            {isAr ? 'هل تعلم؟' : 'Did you know?'}
          </span>
        </div>
        
        {/* Tip text */}
        <p className="text-xs text-foreground/80 leading-relaxed" dir={isAr ? 'rtl' : 'ltr'}>
          {tips[tipIndex]}
        </p>
      </div>
    </div>
  );
}
