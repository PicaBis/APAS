import React, { useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { Calculator, Sigma, Atom, Wind, Waves, Gauge, Zap, Brain, Camera, BarChart3, Dices, FlaskConical } from 'lucide-react';

interface CalculationsSectionProps {
  lang: string;
}

/* ── KaTeX inline renderer ── */
function Latex({ math, display = false }: { math: string; display?: boolean }) {
  const html = useMemo(() => {
    try {
      return katex.renderToString(math, {
        displayMode: display,
        throwOnError: false,
        trust: true,
        strict: false,
      });
    } catch {
      return math;
    }
  }, [math, display]);

  return display ? (
    <div className="my-3 overflow-x-auto text-center" dir="ltr" dangerouslySetInnerHTML={{ __html: html }} />
  ) : (
    <span dir="ltr" dangerouslySetInnerHTML={{ __html: html }} />
  );
}

/* ── Reusable sub-components ── */
function StepCard({ step, title, principle, children }: { step: number; title: string; principle: string; children: React.ReactNode }) {
  return (
    <div className="mb-5 bg-background/60 rounded-lg border border-border/30 overflow-hidden">
      <div className="px-4 py-2.5 bg-primary/5 border-b border-border/20 flex items-center gap-2">
        <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">{step}</span>
        <h4 className="text-xs font-bold text-foreground">{title}</h4>
      </div>
      <div className="px-4 py-3 space-y-2">
        <div className="text-[10px] text-primary/80 font-medium bg-primary/5 rounded px-2 py-1 inline-block">
          {principle}
        </div>
        <div className="text-xs text-muted-foreground leading-relaxed space-y-2">
          {children}
        </div>
      </div>
    </div>
  );
}

function SectionBlock({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3 pb-2 border-b border-border">
        <span className="text-primary">{icon}</span>
        {title}
      </h3>
      {children}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════ */
/*  Main Calculations Section                              */
/* ═══════════════════════════════════════════════════════ */
export default function CalculationsSection({ lang }: CalculationsSectionProps) {
  const isAr = lang === 'ar';
  const isFr = lang === 'fr';
  const t = (ar: string, en: string, fr: string) => isAr ? ar : isFr ? fr : en;

  return (
    <div>
      {/* ── Section Header ── */}
      <h3 className="text-base font-bold text-foreground flex items-center gap-2 mb-4 pb-2 border-b border-border">
        <span className="text-primary"><Calculator className="w-5 h-5" /></span>
        {t('كيف تم الحساب — الاشتقاقات والمعادلات', 'How Calculations Were Made — Derivations & Equations', 'Comment les Calculs Ont Été Faits — Dérivations & Équations')}
      </h3>
      <p className="text-xs text-muted-foreground mb-6 leading-relaxed">
        {t(
          'يشرح هذا القسم بالتفصيل جميع الاشتقاقات والحسابات المستخدمة في APAS خطوة بخطوة، مع ذكر القوانين والمبادئ الفيزيائية المعتمدة وتحويل جميع المعادلات إلى صيغة LaTeX.',
          'This section explains in detail all derivations and calculations used in APAS step by step, stating the physical laws and principles applied, with all equations in LaTeX format.',
          'Cette section explique en détail toutes les dérivations et calculs utilisés dans APAS étape par étape, avec les lois physiques et les équations en format LaTeX.'
        )}
      </p>

      {/* ═══ 1. VELOCITY DECOMPOSITION ═══ */}
      <SectionBlock
        icon={<Sigma className="w-4 h-4" />}
        title={t('١. تحليل السرعة الابتدائية', '1. Initial Velocity Decomposition', '1. Décomposition de la Vitesse Initiale')}
      >
        <StepCard
          step={1}
          title={t('إسقاط متجه السرعة على المحاور', 'Projecting the Velocity Vector onto Axes', 'Projection du Vecteur Vitesse sur les Axes')}
          principle={t('🔬 المبدأ: حساب المثلثات — إسقاط المتجهات', '🔬 Principle: Trigonometry — Vector Projection', '🔬 Principe: Trigonométrie — Projection Vectorielle')}
        >
          <p>{t(
            'يتم تحليل سرعة الإطلاق الابتدائية v₀ إلى مركبتين متعامدتين باستخدام زاوية الإطلاق θ:',
            'The initial launch velocity v₀ is decomposed into two perpendicular components using the launch angle θ:',
            'La vitesse initiale v₀ est décomposée en deux composantes perpendiculaires avec l\'angle θ:'
          )}</p>
          <Latex display math="v_{0x} = v_0 \cos(\theta)" />
          <Latex display math="v_{0y} = v_0 \sin(\theta)" />
          <p>{t(
            'حيث θ هي زاوية الإطلاق بالراديان. نحوّل من الدرجات إلى الراديان:',
            'Where θ is the launch angle in radians. We convert from degrees to radians:',
            'Où θ est l\'angle en radians. Conversion des degrés en radians:'
          )}</p>
          <Latex display math="\theta_{\text{rad}} = \theta_{\text{deg}} \times \frac{\pi}{180}" />
          <p>{t(
            'التعويض: إذا كانت v₀ = 50 م/ث و θ = 45° فإن:',
            'Substitution: If v₀ = 50 m/s and θ = 45°, then:',
            'Substitution: Si v₀ = 50 m/s et θ = 45°, alors:'
          )}</p>
          <Latex display math="v_{0x} = 50 \cos(45°) = 50 \times \frac{\sqrt{2}}{2} \approx 35.36 \text{ m/s}" />
          <Latex display math="v_{0y} = 50 \sin(45°) = 50 \times \frac{\sqrt{2}}{2} \approx 35.36 \text{ m/s}" />
        </StepCard>
      </SectionBlock>

      {/* ═══ 2. EQUATIONS OF MOTION ═══ */}
      <SectionBlock
        icon={<Atom className="w-4 h-4" />}
        title={t('٢. معادلات الحركة', '2. Equations of Motion', '2. Équations du Mouvement')}
      >
        <StepCard
          step={2}
          title={t('معادلات الحركة الكلاسيكية (بدون مقاومة هواء)', 'Classical Equations of Motion (No Air Resistance)', 'Équations Classiques du Mouvement (Sans Résistance)')}
          principle={t('🔬 المبدأ: قوانين نيوتن للحركة — القانون الثاني', '🔬 Principle: Newton\'s Laws of Motion — Second Law', '🔬 Principe: Lois de Newton — Deuxième Loi')}
        >
          <p>{t(
            'استخدمنا قوانين نيوتن: القوة الوحيدة المؤثرة هي الجاذبية في الاتجاه الرأسي. الحركة الأفقية منتظمة:',
            'We used Newton\'s laws: the only force acting is gravity in the vertical direction. Horizontal motion is uniform:',
            'Nous utilisons les lois de Newton: seule la gravité agit verticalement. Le mouvement horizontal est uniforme:'
          )}</p>
          <Latex display math="F = ma \quad \Rightarrow \quad a_x = 0, \quad a_y = -g" />
          <p>{t('بالتكامل نحصل على معادلات الموضع:', 'Integrating, we get the position equations:', 'En intégrant, nous obtenons les équations de position:')}</p>
          <Latex display math="x(t) = x_0 + v_{0x} \cdot t" />
          <Latex display math="y(t) = h + v_{0y} \cdot t - \frac{1}{2} g \cdot t^2" />
          <p>{t(
            'حيث h هو ارتفاع نقطة الإطلاق و g هو تسارع الجاذبية.',
            'Where h is the launch height and g is gravitational acceleration.',
            'Où h est la hauteur de lancement et g est l\'accélération gravitationnelle.'
          )}</p>
          <p>{t('ومعادلات السرعة:', 'And the velocity equations:', 'Et les équations de vitesse:')}</p>
          <Latex display math="v_x(t) = v_{0x}" />
          <Latex display math="v_y(t) = v_{0y} - g \cdot t" />
        </StepCard>

        <StepCard
          step={3}
          title={t('زمن الطيران', 'Time of Flight', 'Temps de Vol')}
          principle={t('🔬 المبدأ: حل المعادلة التربيعية — صيغة الجذور', '🔬 Principle: Quadratic Equation — Quadratic Formula', '🔬 Principe: Équation Quadratique — Formule des Racines')}
        >
          <p>{t(
            'لإيجاد زمن الطيران، نضع y(t) = 0 ونحل المعادلة التربيعية:',
            'To find flight time, we set y(t) = 0 and solve the quadratic equation:',
            'Pour trouver le temps de vol, on pose y(t) = 0 et on résout l\'équation quadratique:'
          )}</p>
          <Latex display math="h + v_{0y} \cdot t - \frac{1}{2} g \cdot t^2 = 0" />
          <p>{t('نعيد الترتيب:', 'Rearranging:', 'Réarrangement:')}</p>
          <Latex display math="\frac{1}{2} g \cdot t^2 - v_{0y} \cdot t - h = 0" />
          <p>{t('باستخدام صيغة الجذور التربيعية:', 'Using the quadratic formula:', 'En utilisant la formule quadratique:')}</p>
          <Latex display math="t = \frac{v_{0y} + \sqrt{v_{0y}^2 + 2gh}}{g}" />
          <p>{t(
            'نأخذ الجذر الموجب فقط لأن الزمن لا يمكن أن يكون سالباً.',
            'We take the positive root only since time cannot be negative.',
            'On prend la racine positive car le temps ne peut pas être négatif.'
          )}</p>
        </StepCard>

        <StepCard
          step={4}
          title={t('أقصى ارتفاع', 'Maximum Height', 'Hauteur Maximale')}
          principle={t('🔬 المبدأ: التفاضل — إيجاد القيمة القصوى', '🔬 Principle: Differentiation — Finding Maximum', '🔬 Principe: Différentiation — Trouver le Maximum')}
        >
          <p>{t(
            'لإيجاد أقصى ارتفاع، نشتق y(t) بالنسبة للزمن ونساوي بصفر:',
            'To find maximum height, we differentiate y(t) with respect to time and set to zero:',
            'Pour trouver la hauteur maximale, on dérive y(t) et on égale à zéro:'
          )}</p>
          <Latex display math="\frac{dy}{dt} = v_{0y} - g \cdot t = 0" />
          <Latex display math="t_{\text{peak}} = \frac{v_{0y}}{g}" />
          <p>{t('بالتعويض في معادلة الموضع:', 'Substituting into position equation:', 'En substituant dans l\'équation de position:')}</p>
          <Latex display math="y_{\max} = h + v_{0y} \cdot \frac{v_{0y}}{g} - \frac{1}{2} g \left(\frac{v_{0y}}{g}\right)^2" />
          <p>{t('بالتبسيط:', 'Simplifying:', 'En simplifiant:')}</p>
          <Latex display math="y_{\max} = h + \frac{v_{0y}^2}{2g}" />
        </StepCard>

        <StepCard
          step={5}
          title={t('المدى الأفقي', 'Horizontal Range', 'Portée Horizontale')}
          principle={t('🔬 المبدأ: الحركة المنتظمة في الاتجاه الأفقي', '🔬 Principle: Uniform Motion in the Horizontal Direction', '🔬 Principe: Mouvement Uniforme Horizontal')}
        >
          <p>{t(
            'المدى هو المسافة الأفقية المقطوعة خلال زمن الطيران الكامل:',
            'Range is the horizontal distance traveled during the full flight time:',
            'La portée est la distance horizontale parcourue pendant le temps de vol total:'
          )}</p>
          <Latex display math="R = v_{0x} \cdot t_{\text{flight}}" />
          <p>{t('في الحالة المثالية (h = 0):', 'In the ideal case (h = 0):', 'Dans le cas idéal (h = 0):')}</p>
          <Latex display math="R = \frac{v_0^2 \sin(2\theta)}{g}" />
          <p>{t(
            'أقصى مدى يكون عند θ = 45° لأن sin(2 × 45°) = sin(90°) = 1.',
            'Maximum range occurs at θ = 45° because sin(2 × 45°) = sin(90°) = 1.',
            'La portée maximale est à θ = 45° car sin(2 × 45°) = sin(90°) = 1.'
          )}</p>
        </StepCard>

        <StepCard
          step={6}
          title={t('سرعة الاصطدام', 'Impact Velocity', 'Vitesse d\'Impact')}
          principle={t('🔬 المبدأ: حفظ الطاقة / تركيب المتجهات', '🔬 Principle: Energy Conservation / Vector Composition', '🔬 Principe: Conservation d\'Énergie / Composition Vectorielle')}
        >
          <p>{t(
            'سرعة الاصطدام تُحسب من مركبتي السرعة عند لحظة الوصول:',
            'Impact velocity is computed from velocity components at landing:',
            'La vitesse d\'impact est calculée à partir des composantes à l\'atterrissage:'
          )}</p>
          <Latex display math="v_{x,f} = v_{0x}" />
          <Latex display math="v_{y,f} = v_{0y} - g \cdot t_{\text{flight}}" />
          <Latex display math="v_{\text{impact}} = \sqrt{v_{x,f}^2 + v_{y,f}^2}" />
          <p>{t('وزاوية الاصطدام:', 'And the impact angle:', 'Et l\'angle d\'impact:')}</p>
          <Latex display math="\alpha_{\text{impact}} = \arctan\left(\frac{-v_{y,f}}{v_{x,f}}\right)" />
        </StepCard>
      </SectionBlock>

      {/* ═══ 3. AIR RESISTANCE & DRAG ═══ */}
      <SectionBlock
        icon={<Wind className="w-4 h-4" />}
        title={t('٣. مقاومة الهواء وقوة السحب', '3. Air Resistance & Drag Force', '3. Résistance de l\'Air & Force de Traînée')}
      >
        <StepCard
          step={7}
          title={t('نموذج قوة السحب', 'Drag Force Model', 'Modèle de Force de Traînée')}
          principle={t('🔬 المبدأ: ديناميكا الموائع — قانون السحب التربيعي', '🔬 Principle: Fluid Dynamics — Quadratic Drag Law', '🔬 Principe: Dynamique des Fluides — Loi de Traînée Quadratique')}
        >
          <p>{t(
            'عند تفعيل مقاومة الهواء، تُضاف قوة سحب تتناسب مع مربع السرعة وتعاكس اتجاه الحركة:',
            'When air resistance is enabled, a drag force proportional to velocity squared is added, opposing motion:',
            'Quand la résistance est activée, une force de traînée proportionnelle au carré de la vitesse est ajoutée:'
          )}</p>
          <Latex display math="F_{\text{drag}} = \frac{1}{2} C_d \rho A v_{\text{rel}}^2" />
          <p>{t('حيث:', 'Where:', 'Où:')}</p>
          <ul className="list-disc ps-6 space-y-1 text-[11px]">
            <li><Latex math="C_d" /> — {t('معامل السحب', 'drag coefficient', 'coefficient de traînée')}</li>
            <li><Latex math="\rho" /> — {t('كثافة الهواء (1.225 كغ/م³ عند سطح البحر)', 'air density (1.225 kg/m³ at sea level)', 'densité de l\'air (1.225 kg/m³)')}</li>
            <li><Latex math="A = \pi r^2" /> — {t('المساحة المقطعية للمقذوف', 'cross-sectional area of projectile', 'section transversale du projectile')}</li>
            <li><Latex math="v_{\text{rel}}" /> — {t('السرعة النسبية (بالنسبة للرياح)', 'relative velocity (relative to wind)', 'vitesse relative (par rapport au vent)')}</li>
          </ul>
          <p>{t('السرعة النسبية مع الرياح:', 'Relative velocity with wind:', 'Vitesse relative avec le vent:')}</p>
          <Latex display math="v_{r,x} = v_x - v_{\text{wind}}, \quad v_{r,y} = v_y" />
          <Latex display math="v_{\text{rel}} = \sqrt{v_{r,x}^2 + v_{r,y}^2}" />
          <p>{t('مركبتا تسارع السحب:', 'Drag acceleration components:', 'Composantes d\'accélération de traînée:')}</p>
          <Latex display math="a_{d,x} = -\frac{F_{\text{drag}}}{m} \cdot \frac{v_{r,x}}{v_{\text{rel}}}, \quad a_{d,y} = -\frac{F_{\text{drag}}}{m} \cdot \frac{v_{r,y}}{v_{\text{rel}}}" />
        </StepCard>

        <StepCard
          step={8}
          title={t('تصحيح رينولدز للسحب (AI-APAS)', 'Reynolds-Dependent Drag Correction (AI-APAS)', 'Correction de Traînée par Reynolds (AI-APAS)')}
          principle={t('🔬 المبدأ: ارتباط شيلر-ناومان لمعامل السحب', '🔬 Principle: Schiller-Naumann Drag Coefficient Correlation', '🔬 Principe: Corrélation de Schiller-Naumann')}
        >
          <p>{t(
            'في طريقة AI-APAS، يتم تصحيح معامل السحب بناءً على عدد رينولدز:',
            'In the AI-APAS method, the drag coefficient is corrected based on Reynolds number:',
            'Dans la méthode AI-APAS, le coefficient de traînée est corrigé selon le nombre de Reynolds:'
          )}</p>
          <Latex display math="Re = \frac{v_{\text{rel}} \cdot 2r}{\nu}" />
          <p>{t('حيث ν هي اللزوجة الحركية للهواء. تصحيح شيلر-ناومان:', 'Where ν is the kinematic viscosity of air. Schiller-Naumann correction:', 'Où ν est la viscosité cinématique. Correction de Schiller-Naumann:')}</p>
          <Latex display math="C_d^* = \begin{cases} \frac{24}{Re}\left(1 + 0.15 \, Re^{0.687}\right) / 0.47 & Re < 1000 \\ 1.0 & 1000 \leq Re < 200000 \\ 0.2 / 0.47 & Re \geq 200000 \text{ (drag crisis)} \end{cases}" />
        </StepCard>

        <StepCard
          step={9}
          title={t('كثافة الهواء مع الارتفاع', 'Altitude-Dependent Air Density', 'Densité de l\'Air en Altitude')}
          principle={t('🔬 المبدأ: التوزيع الجوي الأسي (الغلاف الجوي البارومتري)', '🔬 Principle: Exponential Atmospheric Distribution (Barometric Formula)', '🔬 Principe: Distribution Atmosphérique Exponentielle')}
        >
          <p>{t(
            'تتغير كثافة الهواء مع الارتفاع وفقاً للصيغة الأسية:',
            'Air density changes with altitude according to the exponential formula:',
            'La densité de l\'air change avec l\'altitude selon la formule exponentielle:'
          )}</p>
          <Latex display math="\rho(h) = \rho_0 \cdot e^{-h / H}" />
          <p>{t(
            'حيث H ≈ 8500 م هو ارتفاع المقياس الجوي و ρ₀ = 1.225 كغ/م³.',
            'Where H ≈ 8500 m is the atmospheric scale height and ρ₀ = 1.225 kg/m³.',
            'Où H ≈ 8500 m est la hauteur d\'échelle atmosphérique et ρ₀ = 1.225 kg/m³.'
          )}</p>
        </StepCard>
      </SectionBlock>

      {/* ═══ 4. NUMERICAL INTEGRATION METHODS ═══ */}
      <SectionBlock
        icon={<FlaskConical className="w-4 h-4" />}
        title={t('٤. طرق التكامل العددي', '4. Numerical Integration Methods', '4. Méthodes d\'Intégration Numérique')}
      >
        <StepCard
          step={10}
          title={t('طريقة أويلر شبه الضمنية', 'Semi-Implicit (Symplectic) Euler Method', 'Méthode d\'Euler Semi-Implicite (Symplectique)')}
          principle={t('🔬 المبدأ: التكامل الشبه الضمني — حفظ الطاقة التقريبي', '🔬 Principle: Semi-Implicit Integration — Approximate Energy Conservation', '🔬 Principe: Intégration Semi-Implicite — Conservation Approx. d\'Énergie')}
        >
          <p>{t(
            'في طريقة أويلر الشبه الضمنية، نحدّث السرعة أولاً ثم نستخدم السرعة الجديدة لتحديث الموضع:',
            'In semi-implicit Euler, we update velocity first, then use the new velocity to update position:',
            'En Euler semi-implicite, on met à jour la vitesse d\'abord, puis on utilise la nouvelle vitesse pour la position:'
          )}</p>
          <Latex display math="\vec{a}(t) = \frac{\vec{F}(t)}{m}" />
          <Latex display math="\vec{v}(t + \Delta t) = \vec{v}(t) + \vec{a}(t) \cdot \Delta t" />
          <Latex display math="\vec{r}(t + \Delta t) = \vec{r}(t) + \vec{v}(t + \Delta t) \cdot \Delta t" />
          <p>{t(
            'هذا يحافظ على الطاقة بشكل أفضل من أويلر المباشر لأنه يستخدم السرعة المحدّثة.',
            'This preserves energy better than Forward Euler because it uses the updated velocity.',
            'Cela préserve mieux l\'énergie que l\'Euler direct car on utilise la vitesse mise à jour.'
          )}</p>
        </StepCard>

        <StepCard
          step={11}
          title={t('طريقة رونج-كوتا من الرتبة الرابعة (RK4)', 'Runge-Kutta 4th Order Method (RK4)', 'Méthode de Runge-Kutta d\'Ordre 4 (RK4)')}
          principle={t('🔬 المبدأ: التكامل العددي متعدد المراحل — دقة من الرتبة الرابعة', '🔬 Principle: Multi-Stage Numerical Integration — 4th Order Accuracy', '🔬 Principe: Intégration Numérique Multi-étapes — Précision d\'Ordre 4')}
        >
          <p>{t(
            'RK4 يستخدم أربعة تقييمات للمشتقة في كل خطوة زمنية للحصول على دقة أعلى:',
            'RK4 uses four derivative evaluations per time step for higher accuracy:',
            'RK4 utilise quatre évaluations de dérivées par pas de temps pour une meilleure précision:'
          )}</p>
          <Latex display math="k_1 = f(t_n, y_n)" />
          <Latex display math="k_2 = f\!\left(t_n + \tfrac{\Delta t}{2},\; y_n + \tfrac{\Delta t}{2} k_1\right)" />
          <Latex display math="k_3 = f\!\left(t_n + \tfrac{\Delta t}{2},\; y_n + \tfrac{\Delta t}{2} k_2\right)" />
          <Latex display math="k_4 = f(t_n + \Delta t,\; y_n + \Delta t \cdot k_3)" />
          <p>{t('التحديث النهائي:', 'Final update:', 'Mise à jour finale:')}</p>
          <Latex display math="y_{n+1} = y_n + \frac{\Delta t}{6} \left(k_1 + 2k_2 + 2k_3 + k_4\right)" />
          <p>{t(
            'الخطأ المحلي من رتبة O(Δt⁵) مما يجعلها دقيقة جداً للمسارات الفيزيائية.',
            'Local error is O(Δt⁵), making it very accurate for physical trajectories.',
            'L\'erreur locale est O(Δt⁵), très précise pour les trajectoires physiques.'
          )}</p>
        </StepCard>

        <StepCard
          step={12}
          title={t('طريقة AI-APAS (Velocity Verlet المحسّنة)', 'AI-APAS Method (Enhanced Velocity Verlet)', 'Méthode AI-APAS (Velocity Verlet Améliorée)')}
          principle={t('🔬 المبدأ: تكامل Velocity Verlet مع تصحيح السحب التكيفي', '🔬 Principle: Velocity Verlet Integration with Adaptive Drag Correction', '🔬 Principe: Intégration Velocity Verlet avec Correction de Traînée Adaptative')}
        >
          <p>{t(
            'طريقة AI-APAS تجمع بين دقة Velocity Verlet وتصحيح فيزيائي للسحب حسب عدد رينولدز:',
            'The AI-APAS method combines Velocity Verlet accuracy with physics-based Reynolds drag correction:',
            'La méthode AI-APAS combine la précision de Velocity Verlet avec la correction de traînée par Reynolds:'
          )}</p>
          <p>{t('الخطوة 1 — تحديث الموضع:', 'Step 1 — Position update:', 'Étape 1 — Mise à jour de la position:')}</p>
          <Latex display math="\vec{r}(t + \Delta t) = \vec{r}(t) + \vec{v}(t) \cdot \Delta t + \frac{1}{2} \vec{a}(t) \cdot \Delta t^2" />
          <p>{t('الخطوة 2 — حساب التسارع الجديد a(t+Δt) عند الموضع الجديد:', 'Step 2 — Compute new acceleration a(t+Δt) at new position:', 'Étape 2 — Calculer la nouvelle accélération a(t+Δt):')}</p>
          <Latex display math="\vec{a}(t + \Delta t) = \frac{\vec{F}\big(\vec{r}(t+\Delta t), \vec{v}(t) + \vec{a}(t)\Delta t\big)}{m}" />
          <p>{t('الخطوة 3 — تحديث السرعة بمتوسط التسارعات:', 'Step 3 — Update velocity with average of accelerations:', 'Étape 3 — Mise à jour de la vitesse avec la moyenne des accélérations:')}</p>
          <Latex display math="\vec{v}(t + \Delta t) = \vec{v}(t) + \frac{1}{2}\big[\vec{a}(t) + \vec{a}(t + \Delta t)\big] \cdot \Delta t" />
          <p>{t(
            'هذه الطريقة من الرتبة الثانية وتحافظ على طاقة النظام بشكل ممتاز.',
            'This method is 2nd order and excellently preserves system energy.',
            'Cette méthode est d\'ordre 2 et préserve excellemment l\'énergie du système.'
          )}</p>
        </StepCard>
      </SectionBlock>

      {/* ═══ 5. ADVANCED PHYSICS EFFECTS ═══ */}
      <SectionBlock
        icon={<Gauge className="w-4 h-4" />}
        title={t('٥. التأثيرات الفيزيائية المتقدمة', '5. Advanced Physics Effects', '5. Effets Physiques Avancés')}
      >
        <StepCard
          step={13}
          title={t('تأثير ماغنوس (دوران المقذوف)', 'Magnus Effect (Projectile Spin)', 'Effet Magnus (Rotation du Projectile)')}
          principle={t('🔬 المبدأ: تأثير ماغنوس — قوة عمودية على اتجاه الحركة بفعل الدوران', '🔬 Principle: Magnus Effect — Force perpendicular to motion due to spin', '🔬 Principe: Effet Magnus — Force perpendiculaire au mouvement par la rotation')}
        >
          <p>{t(
            'عندما يدور المقذوف، يتولد فرق ضغط يخلق قوة عمودية على اتجاه الحركة:',
            'When the projectile spins, a pressure difference creates a force perpendicular to motion:',
            'Quand le projectile tourne, une différence de pression crée une force perpendiculaire au mouvement:'
          )}</p>
          <Latex display math="F_{\text{Magnus}} = C_L \cdot \frac{1}{2} \rho v^2 A" />
          <p>{t('حيث معامل الرفع يعتمد على نسبة الدوران:', 'Where the lift coefficient depends on the spin parameter:', 'Où le coefficient de portance dépend du paramètre de rotation:')}</p>
          <Latex display math="C_L = C_M \cdot \min\!\left(1, \frac{\omega \cdot d}{v}\right)" />
          <p>{t('مركبتا القوة العمودية على السرعة:', 'Force components perpendicular to velocity:', 'Composantes de la force perpendiculaire à la vitesse:')}</p>
          <Latex display math="a_{\perp,x} = \frac{F_{\text{Magnus}}}{m} \cdot \frac{-v_{r,y}}{v_{\text{rel}}}, \quad a_{\perp,y} = \frac{F_{\text{Magnus}}}{m} \cdot \frac{v_{r,x}}{v_{\text{rel}}}" />
        </StepCard>

        <StepCard
          step={14}
          title={t('تأثير كوريوليس', 'Coriolis Effect', 'Effet de Coriolis')}
          principle={t('🔬 المبدأ: القوى الوهمية في الأطر المرجعية الدوارة', '🔬 Principle: Fictitious Forces in Rotating Reference Frames', '🔬 Principe: Forces Fictives dans les Référentiels Tournants')}
        >
          <p>{t(
            'يظهر تأثير كوريوليس بسبب دوران الأرض. القوة تعتمد على خط العرض:',
            'The Coriolis effect appears due to Earth\'s rotation. The force depends on latitude:',
            'L\'effet de Coriolis apparaît à cause de la rotation de la Terre. La force dépend de la latitude:'
          )}</p>
          <Latex display math="f = 2 \Omega \sin(\phi)" />
          <Latex display math="\vec{a}_{\text{Cor}} = -2\vec{\Omega} \times \vec{v}" />
          <p>{t('في المستوى ثنائي الأبعاد:', 'In the 2D plane:', 'Dans le plan 2D:')}</p>
          <Latex display math="a_{\text{Cor},x} = f \cdot v_y, \quad a_{\text{Cor},y} = -f \cdot v_x" />
          <p>{t(
            'حيث Ω = 7.292 × 10⁻⁵ rad/s هي سرعة دوران الأرض الزاوية.',
            'Where Ω = 7.292 × 10⁻⁵ rad/s is Earth\'s angular rotation rate.',
            'Où Ω = 7.292 × 10⁻⁵ rad/s est la vitesse de rotation angulaire de la Terre.'
          )}</p>
        </StepCard>

        <StepCard
          step={15}
          title={t('قوة الطفو (مبدأ أرخميدس)', 'Buoyancy Force (Archimedes Principle)', 'Force de Flottabilité (Principe d\'Archimède)')}
          principle={t('🔬 المبدأ: مبدأ أرخميدس — قوة الطفو تساوي وزن السائل المزاح', '🔬 Principle: Archimedes\' Principle — Buoyant force equals weight of displaced fluid', '🔬 Principe: Principe d\'Archimède — La poussée égale le poids du fluide déplacé')}
        >
          <p>{t(
            'في البيئة تحت الماء، تؤثر قوة طفو صاعدة على المقذوف:',
            'In underwater environments, an upward buoyant force acts on the projectile:',
            'En milieu sous-marin, une force de flottabilité ascendante agit sur le projectile:'
          )}</p>
          <Latex display math="F_{\text{buoyancy}} = \rho_f \cdot g \cdot V_{\text{proj}}" />
          <Latex display math="V_{\text{proj}} = \frac{4}{3}\pi r^3" />
          <Latex display math="a_{\text{buoyancy}} = \frac{\rho_f \cdot g \cdot V}{m}" />
        </StepCard>

        <StepCard
          step={16}
          title={t('التصحيحات النسبية', 'Relativistic Corrections', 'Corrections Relativistes')}
          principle={t('🔬 المبدأ: النسبية الخاصة — عامل لورنتز', '🔬 Principle: Special Relativity — Lorentz Factor', '🔬 Principe: Relativité Restreinte — Facteur de Lorentz')}
        >
          <p>{t(
            'عند السرعات العالية جداً، تُطبق تصحيحات نسبية باستخدام عامل لورنتز:',
            'At very high velocities, relativistic corrections are applied using the Lorentz factor:',
            'À très haute vitesse, des corrections relativistes sont appliquées avec le facteur de Lorentz:'
          )}</p>
          <Latex display math="\gamma = \frac{1}{\sqrt{1 - \frac{v^2}{c^2}}}" />
          <p>{t('الكتلة النسبية:', 'Relativistic mass:', 'Masse relativiste:')}</p>
          <Latex display math="m_{\text{rel}} = \gamma \cdot m_0" />
          <p>{t('تصحيح التسارع — الموازي والعمودي لاتجاه الحركة:', 'Acceleration correction — parallel and transverse to motion:', 'Correction d\'accélération — parallèle et transversale:')}</p>
          <Latex display math="a_{\parallel}^* = \frac{a_{\parallel}}{\gamma^3}, \quad a_{\perp}^* = \frac{a_{\perp}}{\gamma}" />
          <p>{t('جمع السرعات النسبي:', 'Relativistic velocity addition:', 'Addition relativiste des vitesses:')}</p>
          <Latex display math="v_{\text{total}} = \frac{v_1 + v_2}{1 + \frac{v_1 v_2}{c^2}}" />
        </StepCard>

        <StepCard
          step={17}
          title={t('التأثير الجيروسكوبي والاستقرار الباليستي', 'Gyroscopic Effect & Ballistic Stability', 'Effet Gyroscopique & Stabilité Balistique')}
          principle={t('🔬 المبدأ: الزخم الزاوي وعزم القصور الذاتي', '🔬 Principle: Angular Momentum & Moment of Inertia', '🔬 Principe: Moment Angulaire & Moment d\'Inertie')}
        >
          <p>{t(
            'الدوران يعطي المقذوف استقراراً جيروسكوبياً. عزم القصور الذاتي للكرة:',
            'Spin gives the projectile gyroscopic stability. Moment of inertia for a sphere:',
            'La rotation donne au projectile une stabilité gyroscopique. Moment d\'inertie d\'une sphère:'
          )}</p>
          <Latex display math="I = \frac{2}{5} m r^2" />
          <Latex display math="L = I \cdot \omega" />
          <p>{t('معامل الاستقرار الباليستي:', 'Ballistic stability coefficient:', 'Coefficient de stabilité balistique:')}</p>
          <Latex display math="S_g = \frac{I \omega^2}{M_{\text{overturn}}}" />
          <Latex display math="M_{\text{overturn}} = \frac{1}{2} \rho v^2 A \cdot d \cdot C_{M_\alpha}" />
          <p>{t(
            'إذا Sₘ ≥ 1 فالمقذوف مستقر بالستياً. إذا Sₘ < 1 يزداد السحب بعامل تصحيحي.',
            'If Sₘ ≥ 1, the projectile is ballistically stable. If Sₘ < 1, drag increases with a correction factor.',
            'Si Sₘ ≥ 1, le projectile est balistiquement stable. Si Sₘ < 1, la traînée augmente.'
          )}</p>
        </StepCard>

        <StepCard
          step={18}
          title={t('السحب الهيدروديناميكي (تحت الماء)', 'Hydrodynamic Drag (Underwater)', 'Traînée Hydrodynamique (Sous l\'Eau)')}
          principle={t('🔬 المبدأ: سحب الشكل + الاحتكاك السطحي + الكتلة المضافة', '🔬 Principle: Form Drag + Skin Friction + Added Mass', '🔬 Principe: Traînée de Forme + Friction de Surface + Masse Ajoutée')}
        >
          <p>{t(
            'تحت الماء، يتكون السحب من ثلاثة مكونات:',
            'Underwater, drag consists of three components:',
            'Sous l\'eau, la traînée se compose de trois composantes:'
          )}</p>
          <Latex display math="F_{\text{form}} = \frac{1}{2} \rho_f v^2 C_d A" />
          <Latex display math="C_f = \begin{cases} \frac{1.328}{\sqrt{Re}} & Re < 5 \times 10^5 \\ \frac{0.074}{Re^{0.2}} & Re \geq 5 \times 10^5 \end{cases}" />
          <Latex display math="F_{\text{skin}} = \frac{1}{2} \rho_f v^2 C_f \cdot 4\pi r^2" />
          <p>{t('الكتلة المضافة — مقاومة القصور الذاتي للسائل:', 'Added mass — fluid inertia resistance:', 'Masse ajoutée — résistance d\'inertie du fluide:')}</p>
          <Latex display math="m_{\text{added}} = \frac{1}{2} \rho_f V_{\text{sphere}}" />
          <Latex display math="a_{\text{corrected}} = a \cdot \frac{m_{\text{added}}}{m + m_{\text{added}}}" />
        </StepCard>
      </SectionBlock>

      {/* ═══ 6. ENERGY CALCULATIONS ═══ */}
      <SectionBlock
        icon={<Zap className="w-4 h-4" />}
        title={t('٦. حسابات الطاقة', '6. Energy Calculations', '6. Calculs d\'Énergie')}
      >
        <StepCard
          step={19}
          title={t('الطاقة الحركية والكامنة والكلية', 'Kinetic, Potential, and Total Energy', 'Énergie Cinétique, Potentielle et Totale')}
          principle={t('🔬 المبدأ: مبدأ حفظ الطاقة الميكانيكية', '🔬 Principle: Conservation of Mechanical Energy', '🔬 Principe: Conservation de l\'Énergie Mécanique')}
        >
          <p>{t('الطاقة الحركية:', 'Kinetic energy:', 'Énergie cinétique:')}</p>
          <Latex display math="KE = \frac{1}{2} m v^2 = \frac{1}{2} m (v_x^2 + v_y^2)" />
          <p>{t('الطاقة الكامنة (الجاذبية):', 'Potential energy (gravitational):', 'Énergie potentielle (gravitationnelle):')}</p>
          <Latex display math="PE = m g h" />
          <p>{t('الطاقة الميكانيكية الكلية:', 'Total mechanical energy:', 'Énergie mécanique totale:')}</p>
          <Latex display math="E_{\text{total}} = KE + PE = \frac{1}{2} m v^2 + m g h" />
          <p>{t(
            'بدون مقاومة هواء: E ثابتة (حفظ الطاقة). مع مقاومة هواء: E تتناقص بسبب العمل المبذول ضد السحب.',
            'Without air resistance: E is constant (energy conservation). With air resistance: E decreases due to work done against drag.',
            'Sans résistance: E est constante (conservation). Avec résistance: E diminue à cause du travail contre la traînée.'
          )}</p>
        </StepCard>
      </SectionBlock>

      {/* ═══ 7. AI VISION & VIDEO ANALYSIS ═══ */}
      <SectionBlock
        icon={<Camera className="w-4 h-4" />}
        title={t('٧. تحليل الفيديو والصور بالذكاء الاصطناعي', '7. AI Video & Image Analysis', '7. Analyse Vidéo & Image par IA')}
      >
        <StepCard
          step={20}
          title={t('تحليل الإطارات باستخدام OpenCV', 'Frame Analysis Using OpenCV', 'Analyse de Trames avec OpenCV')}
          principle={t('🔬 المبدأ: الرؤية الحاسوبية — استخراج الإطارات وتحليل المسار', '🔬 Principle: Computer Vision — Frame Extraction & Trajectory Analysis', '🔬 Principe: Vision par Ordinateur — Extraction de Trames & Analyse de Trajectoire')}
        >
          <p>{t(
            'يتم تقسيم الفيديو إلى إطارات متساوية (10 إطارات) عبر التقطيع الزمني:',
            'The video is split into equal frames (10 frames) via temporal sampling:',
            'La vidéo est divisée en trames égales (10 trames) par échantillonnage temporel:'
          )}</p>
          <Latex display math="t_{\text{frame},i} = \frac{i \cdot T_{\text{total}}}{N_{\text{frames}} - 1}, \quad i = 0, 1, \dots, N-1" />
          <p>{t(
            'كل إطار يتم ضغطه بجودة 80% بتنسيق JPEG للحصول على توازن بين الجودة والحجم.',
            'Each frame is compressed at 80% JPEG quality for a balance between quality and size.',
            'Chaque trame est compressée à 80% JPEG pour un équilibre qualité/taille.'
          )}</p>
        </StepCard>

        <StepCard
          step={21}
          title={t('ترميز Base64 وإرسال للنموذج', 'Base64 Encoding & Model Submission', 'Encodage Base64 & Soumission au Modèle')}
          principle={t('🔬 المبدأ: ترميز Base64 لتحويل البيانات الثنائية إلى نص', '🔬 Principle: Base64 Encoding — Binary to Text Conversion', '🔬 Principe: Encodage Base64 — Conversion Binaire vers Texte')}
        >
          <p>{t(
            'يتم تحويل كل إطار إلى سلسلة Base64 لإرسالها عبر واجهة API:',
            'Each frame is converted to a Base64 string for API transmission:',
            'Chaque trame est convertie en chaîne Base64 pour la transmission API:'
          )}</p>
          <Latex display math="\text{data:image/jpeg;base64,} \underbrace{/9j/4AAQ...}_{\text{Base64 encoded pixel data}}" />
          <p>{t(
            'يتم إرسال الإطارات المرمّزة إلى نموذج Gemini 2.5 Flash لتحليل المسار واستخراج المعاملات (السرعة، الزاوية، الارتفاع).',
            'Encoded frames are sent to the Gemini 2.5 Flash model to analyze the trajectory and extract parameters (velocity, angle, height).',
            'Les trames encodées sont envoyées au modèle Gemini 2.5 Flash pour analyser la trajectoire et extraire les paramètres.'
          )}</p>
        </StepCard>
      </SectionBlock>

      {/* ═══ 8. AI MODELS (REGRESSION & FITTING) ═══ */}
      <SectionBlock
        icon={<Brain className="w-4 h-4" />}
        title={t('٨. نماذج الذكاء الاصطناعي (الانحدار والتنبؤ)', '8. AI Models (Regression & Prediction)', '8. Modèles IA (Régression & Prédiction)')}
      >
        <StepCard
          step={22}
          title={t('الانحدار متعدد الحدود (الدرجة الثانية)', 'Polynomial Regression (Degree 2)', 'Régression Polynomiale (Degré 2)')}
          principle={t('🔬 المبدأ: المربعات الصغرى — تقريب البيانات بمنحنى أفضل مطابقة', '🔬 Principle: Least Squares — Best-Fit Curve Approximation', '🔬 Principe: Moindres Carrés — Approximation par Courbe Optimale')}
        >
          <p>{t(
            'يتم تقريب مسار المقذوف بكثير حدود من الدرجة الثانية:',
            'The trajectory is approximated with a degree-2 polynomial:',
            'La trajectoire est approximée par un polynôme de degré 2:'
          )}</p>
          <Latex display math="y(x) = ax^2 + bx + c" />
          <p>{t('يتم حل نظام المعادلات الخطية 3×3 باستخدام الحذف الغوسي:', 'The 3×3 linear system is solved using Gaussian elimination:', 'Le système linéaire 3×3 est résolu par élimination de Gauss:')}</p>
          <Latex display math="\begin{bmatrix} S_4 & S_3 & S_2 \\ S_3 & S_2 & S_1 \\ S_2 & S_1 & n \end{bmatrix} \begin{bmatrix} a \\ b \\ c \end{bmatrix} = \begin{bmatrix} T_2 \\ T_1 \\ T_0 \end{bmatrix}" />
          <p>{t('حيث:', 'Where:', 'Où:')}</p>
          <Latex display math="S_k = \sum x_i^k, \quad T_k = \sum x_i^k \cdot y_i" />
        </StepCard>

        <StepCard
          step={23}
          title={t('استيفاء RBF (دوال الأساس الشعاعية)', 'RBF Interpolation (Radial Basis Functions)', 'Interpolation RBF (Fonctions de Base Radiales)')}
          principle={t('🔬 المبدأ: الترجيح بنواة الأساس الشعاعي — استيفاء كيرنل', '🔬 Principle: Radial Basis Function Kernel Weighting', '🔬 Principe: Pondération par Noyau de Fonctions Radiales')}
        >
          <p>{t(
            'يتم اختيار نقاط دعم من البيانات وحساب التنبؤ بالمتوسط المرجح:',
            'Support points are selected from data and prediction is computed as a weighted average:',
            'Des points de support sont sélectionnés et la prédiction est calculée comme moyenne pondérée:'
          )}</p>
          <Latex display math="K(x, x_i) = e^{-\gamma \|x - x_i\|^2}" />
          <Latex display math="\hat{y}(x) = \frac{\sum_{i} K(x, x_i) \cdot y_i}{\sum_{i} K(x, x_i)}" />
          <p>{t(
            'حيث γ = 5.0 هو معامل عرض النواة.',
            'Where γ = 5.0 is the kernel width parameter.',
            'Où γ = 5.0 est le paramètre de largeur du noyau.'
          )}</p>
        </StepCard>

        <StepCard
          step={24}
          title={t('الغابة العشوائية', 'Random Forest', 'Forêt Aléatoire')}
          principle={t('🔬 المبدأ: تعلم التجميع — متوسط عدة أشجار قرار', '🔬 Principle: Ensemble Learning — Averaging Multiple Decision Trees', '🔬 Principe: Apprentissage d\'Ensemble — Moyenne de Plusieurs Arbres')}
        >
          <p>{t(
            'يتم بناء 5 أشجار قرار من عينات عشوائية (Bootstrap) والتنبؤ بالمتوسط:',
            '5 decision trees are built from random samples (Bootstrap) and prediction is averaged:',
            '5 arbres de décision sont construits à partir d\'échantillons aléatoires (Bootstrap) et la prédiction est moyennée:'
          )}</p>
          <Latex display math="\hat{y}(x) = \frac{1}{N_{\text{trees}}} \sum_{k=1}^{N_{\text{trees}}} T_k(x)" />
          <p>{t(
            'كل شجرة تستخدم استيفاء خطي بين أقرب نقطتين في بياناتها المرتبة.',
            'Each tree uses linear interpolation between the two nearest points in its sorted data.',
            'Chaque arbre utilise l\'interpolation linéaire entre les deux points les plus proches.'
          )}</p>
        </StepCard>

        <StepCard
          step={25}
          title={t('انحدار دوال الأساس غير الخطية (الشبكة العصبية)', 'Nonlinear Basis Function Regression (Neural Network)', 'Régression par Fonctions de Base Non-Linéaires (Réseau Neuronal)')}
          principle={t('🔬 المبدأ: توسيع دوال الأساس غير الخطية مع أوزان ثابتة', '🔬 Principle: Nonlinear Basis Function Expansion with Fixed Weights', '🔬 Principe: Expansion de Fonctions de Base Non-Linéaires avec Poids Fixes')}
        >
          <p>{t(
            'يتم تحويل البيانات عبر طبقتين من الدوال غير الخطية بأوزان محددة مسبقاً:',
            'Data is transformed through two layers of nonlinear functions with predetermined weights:',
            'Les données sont transformées à travers deux couches de fonctions non-linéaires avec des poids prédéterminés:'
          )}</p>
          <p>{t('استخراج السمات:', 'Feature extraction:', 'Extraction de caractéristiques:')}</p>
          <Latex display math="\phi(x) = [x, x^2, \sin(\pi x), \cos(\pi x / 2), \sqrt{x}, 1-x]" />
          <p>{t('الطبقة الأولى (tanh):', 'Layer 1 (tanh):', 'Couche 1 (tanh):')}</p>
          <Latex display math="h_1 = \tanh(W_1 \cdot \phi(x) + b_1)" />
          <p>{t('الطبقة الثانية (sigmoid):', 'Layer 2 (sigmoid):', 'Couche 2 (sigmoid):')}</p>
          <Latex display math="h_2 = \sigma(W_2 \cdot h_1 + b_2), \quad \sigma(z) = \frac{1}{1 + e^{-z}}" />
          <p>{t('المخرج النهائي:', 'Final output:', 'Sortie finale:')}</p>
          <Latex display math="\hat{y} = W_3 \cdot h_2 + b_3" />
        </StepCard>

        <StepCard
          step={26}
          title={t('مقاييس تقييم النماذج', 'Model Evaluation Metrics', 'Métriques d\'Évaluation des Modèles')}
          principle={t('🔬 المبدأ: الإحصاء — مقاييس الخطأ والدقة', '🔬 Principle: Statistics — Error & Accuracy Metrics', '🔬 Principe: Statistiques — Métriques d\'Erreur & Précision')}
        >
          <p>{t(
            'يتم تقييم كل نموذج باستخدام المقاييس التالية:',
            'Each model is evaluated using the following metrics:',
            'Chaque modèle est évalué avec les métriques suivantes:'
          )}</p>
          <p><strong>R² — {t('معامل التحديد', 'Coefficient of Determination', 'Coefficient de Détermination')}:</strong></p>
          <Latex display math="R^2 = 1 - \frac{SS_{\text{res}}}{SS_{\text{tot}}} = 1 - \frac{\sum(y_i - \hat{y}_i)^2}{\sum(y_i - \bar{y})^2}" />
          <p><strong>MAE — {t('متوسط الخطأ المطلق', 'Mean Absolute Error', 'Erreur Absolue Moyenne')}:</strong></p>
          <Latex display math="MAE = \frac{1}{n} \sum_{i=1}^{n} |y_i - \hat{y}_i|" />
          <p><strong>RMSE — {t('جذر متوسط مربع الخطأ', 'Root Mean Square Error', 'Racine de l\'Erreur Quadratique Moyenne')}:</strong></p>
          <Latex display math="RMSE = \sqrt{\frac{1}{n} \sum_{i=1}^{n} (y_i - \hat{y}_i)^2}" />
        </StepCard>
      </SectionBlock>

      {/* ═══ 9. MONTE CARLO SIMULATION ═══ */}
      <SectionBlock
        icon={<Dices className="w-4 h-4" />}
        title={t('٩. محاكاة مونت كارلو', '9. Monte Carlo Simulation', '9. Simulation de Monte Carlo')}
      >
        <StepCard
          step={27}
          title={t('التحليل الإحصائي بالمحاكاة العشوائية', 'Statistical Analysis via Random Simulation', 'Analyse Statistique par Simulation Aléatoire')}
          principle={t('🔬 المبدأ: طريقة مونت كارلو — عينات عشوائية لتقدير التوزيعات الإحصائية', '🔬 Principle: Monte Carlo Method — Random Sampling for Statistical Distribution Estimation', '🔬 Principe: Méthode Monte Carlo — Échantillonnage Aléatoire pour l\'Estimation Statistique')}
        >
          <p>{t(
            'يتم تشغيل مئات المحاكاات مع تغييرات عشوائية في المعاملات:',
            'Hundreds of simulations are run with random parameter variations:',
            'Des centaines de simulations sont exécutées avec des variations aléatoires des paramètres:'
          )}</p>
          <Latex display math="v_0^{(k)} = v_0 + \mathcal{N}(0, \sigma_v^2)" />
          <Latex display math="\theta^{(k)} = \theta + \mathcal{N}(0, \sigma_\theta^2)" />
          <p>{t('ثم نحسب الإحصاءات:', 'Then we compute statistics:', 'Puis on calcule les statistiques:')}</p>
          <Latex display math="\bar{R} = \frac{1}{N}\sum_{k=1}^{N} R_k, \quad \sigma_R = \sqrt{\frac{1}{N}\sum_{k=1}^{N}(R_k - \bar{R})^2}" />
          <p>{t(
            'النتائج: متوسط المدى، الانحراف المعياري، التوزيع الإحصائي للمدى وأقصى ارتفاع وزمن الطيران.',
            'Results: mean range, standard deviation, statistical distribution of range, max height, and flight time.',
            'Résultats: portée moyenne, écart-type, distribution statistique de la portée, hauteur max et temps de vol.'
          )}</p>
        </StepCard>
      </SectionBlock>

      {/* ═══ 10. COMPARISON ERRORS ═══ */}
      <SectionBlock
        icon={<BarChart3 className="w-4 h-4" />}
        title={t('١٠. مقارنة الأخطاء النظرية والعددية', '10. Theoretical vs. Numerical Error Comparison', '10. Comparaison Erreurs Théoriques vs. Numériques')}
      >
        <StepCard
          step={28}
          title={t('الخطأ النسبي بين الحل التحليلي والعددي', 'Relative Error Between Analytical and Numerical Solutions', 'Erreur Relative entre Solutions Analytique et Numérique')}
          principle={t('🔬 المبدأ: تحليل الأخطاء العددية', '🔬 Principle: Numerical Error Analysis', '🔬 Principe: Analyse des Erreurs Numériques')}
        >
          <p>{t(
            'يتم حساب الخطأ النسبي لكل من المدى، أقصى ارتفاع، وزمن الطيران:',
            'Relative error is computed for range, max height, and flight time:',
            'L\'erreur relative est calculée pour la portée, la hauteur max et le temps de vol:'
          )}</p>
          <Latex display math="\epsilon_R = \frac{|R_{\text{numerical}} - R_{\text{theoretical}}|}{|R_{\text{theoretical}}|} \times 100\%" />
          <Latex display math="\epsilon_{H} = \frac{|H_{\text{numerical}} - H_{\text{theoretical}}|}{|H_{\text{theoretical}}|} \times 100\%" />
          <Latex display math="\epsilon_{T} = \frac{|T_{\text{numerical}} - T_{\text{theoretical}}|}{|T_{\text{theoretical}}|} \times 100\%" />
          <p>{t(
            'هذا يسمح بقياس دقة طريقة التكامل العددي المختارة مقارنة بالحل الدقيق.',
            'This allows measuring the accuracy of the selected numerical integration method against the exact solution.',
            'Cela permet de mesurer la précision de la méthode d\'intégration numérique choisie par rapport à la solution exacte.'
          )}</p>
        </StepCard>
      </SectionBlock>
    </div>
  );
}
