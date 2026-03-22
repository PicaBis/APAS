/**
 * Advanced Physics Panel Component
 * Provides UI controls for all advanced physics features
 */

import React, { useState, Suspense, lazy } from 'react';
import { ChevronDown, Cloud, Zap, Droplets, RotateCw, Thermometer } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { useAdvancedPhysics, type UseAdvancedPhysicsReturn } from '@/hooks/useAdvancedPhysics';
import type { UseRelativityReturn } from '@/hooks/useRelativity';
import { toast } from 'sonner';
import { playSectionToggle, playToggle, playSliderChange } from '@/utils/sound';

const RelativityPanel = lazy(() => import('@/components/apas/RelativityPanel'));

interface AdvancedPhysicsPanelProps {
  lang: string;
  onPhysicsChange?: () => void;
  advancedPhysicsInstance?: UseAdvancedPhysicsReturn;
  environmentId?: string;
  relativity?: UseRelativityReturn;
}

const translations = {
  ar: {
    advancedPhysics: 'الفيزياء المتقدمة',
    coriolis: 'تأثير كوريوليس',
    centrifugal: 'القوة الطاردة المركزية',
    relativeMotion: 'تأثيرات الحركة النسبية',
    magnus: 'تأثير ماغنوس (الدوران)',
    gyroscopic: 'التأثيرات الجيروسكوبية',
    ballisticStability: 'الاستقرار البالستي',
    altitudeDensity: 'كثافة الهواء المتغيرة',
    weatherIntegration: 'دمج بيانات الطقس',
    buoyancy: 'قوة الطفو (أرخميدس)',
    hydrodynamicDrag: 'السحب الهيدروديناميكي',
    fluidPressure: 'تأثيرات ضغط المائع',
    underwater: 'بيئة تحت الماء',
    environmentCoupling: 'اقتران الفيزياء البيئية',
    latitude: 'خط العرض',
    longitude: 'خط الطول',
    diameter: 'قطر المقذوف',
    dragCoefficient: 'معامل السحب',
    spinRate: 'معدل الدوران',
    fetchWeather: 'جلب بيانات الطقس',
    currentLocation: 'الموقع الحالي',
    temperature: 'درجة الحرارة',
    windSpeed: 'سرعة الرياح',
    pressure: 'الضغط',
    humidity: 'الرطوبة',
    airDensity: 'كثافة الهواء',
    loading: 'جاري التحميل...',
    error: 'خطأ',
    success: 'تم بنجاح',
    meters: 'متر',
    mPerSec: 'م/ث',
    hPa: 'hPa',
    percent: '%',
    kgPerM3: 'كغ/م³',
    rps: 'دورة/ثانية',
    frameVx: 'سرعة المنصة (أفقي)',
    frameVy: 'سرعة المنصة (عمودي)',
    frameAx: 'تسارع المنصة (أفقي)',
    frameAy: 'تسارع المنصة (عمودي)',
    frameOmega: 'سرعة دوران المنصة',
    fluidDensity: 'كثافة المائع',
    envTemperature: 'درجة حرارة البيئة',
    envPressure: 'الضغط الجوي',
    envHumidity: 'الرطوبة النسبية',
    sectionRotational: 'التأثيرات الدورانية وغير القصورية',
    sectionHydrodynamic: 'التأثيرات الهيدروديناميكية',
    sectionRotDynamics: 'ديناميكا الدوران',
    sectionEnvironmental: 'اقتران البيئة',
    radPerSec: 'راد/ث',
    ms2: 'م/ث²',
    celsius: '°C',
    pa: 'Pa',
  },
  en: {
    advancedPhysics: 'Advanced Physics',
    coriolis: 'Coriolis Effect',
    centrifugal: 'Centrifugal Force',
    relativeMotion: 'Relative Motion Effects',
    magnus: 'Magnus Effect (Spin)',
    gyroscopic: 'Gyroscopic Effects',
    ballisticStability: 'Ballistic Stability',
    altitudeDensity: 'Altitude-Dependent Density',
    weatherIntegration: 'Weather Integration',
    buoyancy: 'Buoyancy Force (Archimedes)',
    hydrodynamicDrag: 'Hydrodynamic Drag',
    fluidPressure: 'Fluid Pressure Effects',
    underwater: 'Underwater Environment',
    environmentCoupling: 'Environmental Physics Coupling',
    latitude: 'Latitude',
    longitude: 'Longitude',
    diameter: 'Projectile Diameter',
    dragCoefficient: 'Drag Coefficient',
    spinRate: 'Spin Rate',
    fetchWeather: 'Fetch Weather',
    currentLocation: 'Current Location',
    temperature: 'Temperature',
    windSpeed: 'Wind Speed',
    pressure: 'Pressure',
    humidity: 'Humidity',
    airDensity: 'Air Density',
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    meters: 'm',
    mPerSec: 'm/s',
    hPa: 'hPa',
    percent: '%',
    kgPerM3: 'kg/m³',
    rps: 'rev/s',
    frameVx: 'Platform Velocity (X)',
    frameVy: 'Platform Velocity (Y)',
    frameAx: 'Platform Acceleration (X)',
    frameAy: 'Platform Acceleration (Y)',
    frameOmega: 'Platform Angular Velocity',
    fluidDensity: 'Fluid Density',
    envTemperature: 'Environment Temperature',
    envPressure: 'Atmospheric Pressure',
    envHumidity: 'Relative Humidity',
    sectionRotational: 'Rotational & Non-Inertial Effects',
    sectionHydrodynamic: 'Hydrodynamic Effects',
    sectionRotDynamics: 'Rotational Dynamics',
    sectionEnvironmental: 'Environmental Coupling',
    radPerSec: 'rad/s',
    ms2: 'm/s²',
    celsius: '°C',
    pa: 'Pa',
  },
  fr: {
    advancedPhysics: 'Physique Avancée',
    coriolis: 'Effet Coriolis',
    centrifugal: 'Force Centrifuge',
    relativeMotion: 'Effets de Mouvement Relatif',
    magnus: 'Effet Magnus (Rotation)',
    gyroscopic: 'Effets Gyroscopiques',
    ballisticStability: 'Stabilité Balistique',
    altitudeDensity: 'Densité Dépendante de l\'Altitude',
    weatherIntegration: 'Intégration Météo',
    buoyancy: 'Force de Flottabilité (Archimède)',
    hydrodynamicDrag: 'Traînée Hydrodynamique',
    fluidPressure: 'Effets de Pression du Fluide',
    underwater: 'Environnement Sous-marin',
    environmentCoupling: 'Couplage Physique Environnemental',
    latitude: 'Latitude',
    longitude: 'Longitude',
    diameter: 'Diamètre du Projectile',
    dragCoefficient: 'Coefficient de Traînée',
    spinRate: 'Vitesse de Rotation',
    fetchWeather: 'Récupérer Météo',
    currentLocation: 'Position Actuelle',
    temperature: 'Température',
    windSpeed: 'Vitesse du Vent',
    pressure: 'Pression',
    humidity: 'Humidité',
    airDensity: 'Densité de l\'Air',
    loading: 'Chargement...',
    error: 'Erreur',
    success: 'Succès',
    meters: 'm',
    mPerSec: 'm/s',
    hPa: 'hPa',
    percent: '%',
    kgPerM3: 'kg/m³',
    rps: 'tr/s',
    frameVx: 'Vitesse Plateforme (X)',
    frameVy: 'Vitesse Plateforme (Y)',
    frameAx: 'Accélération Plateforme (X)',
    frameAy: 'Accélération Plateforme (Y)',
    frameOmega: 'Vitesse Angulaire Plateforme',
    fluidDensity: 'Densité du Fluide',
    envTemperature: 'Température Environnement',
    envPressure: 'Pression Atmosphérique',
    envHumidity: 'Humidité Relative',
    sectionRotational: 'Effets Rotationnels et Non-Inertiels',
    sectionHydrodynamic: 'Effets Hydrodynamiques',
    sectionRotDynamics: 'Dynamique de Rotation',
    sectionEnvironmental: 'Couplage Environnemental',
    radPerSec: 'rad/s',
    ms2: 'm/s²',
    celsius: '°C',
    pa: 'Pa',
  }
};

type TranslationKey = keyof typeof translations.en;
const T = (key: TranslationKey, lang: string) => translations[lang as 'ar' | 'en' | 'fr']?.[key] ?? translations.en[key];

// Section header subcomponent
const SectionHeader: React.FC<{
  icon: React.ReactNode;
  label: string;
  open: boolean;
  onToggle: () => void;
}> = ({ icon, label, open, onToggle }) => (
  <button
    onClick={onToggle}
    className="w-full flex items-center gap-1.5 py-2.5 px-3 text-[11px] font-semibold text-foreground uppercase tracking-wide rounded-lg border border-border/50 hover:bg-primary/10 hover:border-primary/20 hover:shadow-md transition-all duration-300"
  >
    {icon}
    <span className="flex-1 text-left">{label}</span>
    <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
  </button>
);

export const AdvancedPhysicsPanel: React.FC<AdvancedPhysicsPanelProps> = ({ lang, onPhysicsChange, advancedPhysicsInstance, environmentId = 'earth', relativity }) => {
  const isWaterEnvironment = environmentId === 'underwater';
  const [isExpanded, setIsExpanded] = useState(false);
  const [sectionRotational, setSectionRotational] = useState(false);
  const [sectionHydro, setSectionHydro] = useState(false);
  const [sectionRotDyn, setSectionRotDyn] = useState(false);
  const [sectionEnv, setSectionEnv] = useState(false);
  const internalAdvanced = useAdvancedPhysics();
  const advanced = advancedPhysicsInstance ?? internalAdvanced;

  const handleWeatherFetch = async () => {
    try {
      await advanced.fetchWeatherForCurrentLocation();
      toast.success(T('success', lang));
      onPhysicsChange?.();
    } catch {
      toast.error(T('error', lang));
    }
  };

  const handleToggle = (setter: (value: boolean) => void, current: boolean) => {
    setter(!current);
    playToggle(false, !current);
    onPhysicsChange?.();
  };

  const handleParamChange = () => {
    playSliderChange(false);
    onPhysicsChange?.();
  };

  return (
    <div className="border border-border/50 rounded-xl overflow-hidden bg-card/60 backdrop-blur-sm shadow-lg shadow-black/5 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5">
      <button
            onClick={() => { setIsExpanded(!isExpanded); playSectionToggle(false); }}
            className="w-full px-3 sm:px-4 py-3 flex items-center justify-between hover:bg-primary/5 transition-all duration-300"
      >
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-tight flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary" />
          {T('advancedPhysics', lang)}
        </h3>
        <ChevronDown
          className={`w-4 h-4 text-muted-foreground transition-transform duration-300 ${
            isExpanded ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isExpanded && (
        <div className="px-3 sm:px-4 pb-3 sm:pb-4 border-t border-border pt-3 space-y-3 animate-slideDown">

          {/* ═══ SECTION 1: Rotational & Non-Inertial Effects ═══ */}
          <SectionHeader
            icon={<RotateCw className="w-3.5 h-3.5 text-blue-500" />}
            label={T('sectionRotational', lang)}
            open={sectionRotational}
            onToggle={() => { setSectionRotational(!sectionRotational); playSectionToggle(false); }}
          />
          {sectionRotational && (
            <div className="space-y-3 pl-1 animate-slideDown">
              {/* Coriolis Effect */}
              <div className="flex items-center justify-between py-2 px-3 rounded-lg border border-border/50 hover:bg-primary/5 hover:border-primary/20 transition-all duration-200">
                <span className="text-xs font-medium text-foreground">{T('coriolis', lang)}</span>
                <Switch
                  checked={advanced.enableCoriolis}
                  onCheckedChange={() => handleToggle(advanced.setEnableCoriolis, advanced.enableCoriolis)}
                />
              </div>
              {advanced.enableCoriolis && (
                <div className="pl-2 border-l-2 border-blue-500 space-y-2">
                  <div>
                    <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                      <span>{T('latitude', lang)}</span>
                      <span className="font-mono">{advanced.latitude.toFixed(2)}°</span>
                    </div>
                    <Slider value={[advanced.latitude]} min={-90} max={90} step={0.1}
                      onValueChange={([v]) => { advanced.setLatitude(v); handleParamChange(); }} />
                  </div>
                </div>
              )}

              {/* Centrifugal Force */}
              <div className="flex items-center justify-between py-2 px-3 rounded-lg border border-border/50 hover:bg-primary/5 hover:border-primary/20 transition-all duration-200">
                <span className="text-xs font-medium text-foreground">{T('centrifugal', lang)}</span>
                <Switch
                  checked={advanced.enableCentrifugal}
                  onCheckedChange={() => handleToggle(advanced.setEnableCentrifugal, advanced.enableCentrifugal)}
                />
              </div>
              {advanced.enableCentrifugal && (
                <div className="pl-2 border-l-2 border-blue-400 text-[10px] text-muted-foreground">
                  <p>{lang === 'ar' ? 'يُحسب تلقائيًا بناءً على خط العرض' : lang === 'fr' ? 'Calculé automatiquement selon la latitude' : 'Automatically calculated based on latitude'}</p>
                </div>
              )}

              {/* Relative Motion Effects */}
              <div className="flex items-center justify-between py-2 px-3 rounded-lg border border-border/50 hover:bg-primary/5 hover:border-primary/20 transition-all duration-200">
                <span className="text-xs font-medium text-foreground">{T('relativeMotion', lang)}</span>
                <Switch
                  checked={advanced.enableRelativeMotion}
                  onCheckedChange={() => handleToggle(advanced.setEnableRelativeMotion, advanced.enableRelativeMotion)}
                />
              </div>
              {advanced.enableRelativeMotion && (
                <div className="pl-2 border-l-2 border-indigo-500 space-y-2">
                  <div>
                    <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                      <span>{T('frameVx', lang)} ({T('mPerSec', lang)})</span>
                      <span className="font-mono">{advanced.frameVx.toFixed(1)}</span>
                    </div>
                    <Slider value={[advanced.frameVx]} min={-100} max={100} step={0.5}
                      onValueChange={([v]) => { advanced.setFrameVx(v); handleParamChange(); }} />
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                      <span>{T('frameVy', lang)} ({T('mPerSec', lang)})</span>
                      <span className="font-mono">{advanced.frameVy.toFixed(1)}</span>
                    </div>
                    <Slider value={[advanced.frameVy]} min={-100} max={100} step={0.5}
                      onValueChange={([v]) => { advanced.setFrameVy(v); handleParamChange(); }} />
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                      <span>{T('frameAx', lang)} ({T('ms2', lang)})</span>
                      <span className="font-mono">{advanced.frameAx.toFixed(1)}</span>
                    </div>
                    <Slider value={[advanced.frameAx]} min={-20} max={20} step={0.1}
                      onValueChange={([v]) => { advanced.setFrameAx(v); handleParamChange(); }} />
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                      <span>{T('frameAy', lang)} ({T('ms2', lang)})</span>
                      <span className="font-mono">{advanced.frameAy.toFixed(1)}</span>
                    </div>
                    <Slider value={[advanced.frameAy]} min={-20} max={20} step={0.1}
                      onValueChange={([v]) => { advanced.setFrameAy(v); handleParamChange(); }} />
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                      <span>{T('frameOmega', lang)} ({T('radPerSec', lang)})</span>
                      <span className="font-mono">{advanced.frameOmega.toFixed(2)}</span>
                    </div>
                    <Slider value={[advanced.frameOmega]} min={-5} max={5} step={0.01}
                      onValueChange={([v]) => { advanced.setFrameOmega(v); handleParamChange(); }} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══ SECTION 2: Hydrodynamic Effects (water environment only) ═══ */}
          {isWaterEnvironment && (
          <>
          <SectionHeader
            icon={<Droplets className="w-3.5 h-3.5 text-cyan-500" />}
            label={T('sectionHydrodynamic', lang)}
            open={sectionHydro}
            onToggle={() => { setSectionHydro(!sectionHydro); playSectionToggle(false); }}
          />
          {sectionHydro && (
            <div className="space-y-3 pl-1 animate-slideDown">
              {/* Underwater toggle */}
              <div className="flex items-center justify-between py-2 px-3 rounded-lg border border-border/50 hover:bg-primary/5 hover:border-primary/20 transition-all duration-200">
                <span className="text-xs font-medium text-foreground">{T('underwater', lang)}</span>
                <Switch
                  checked={advanced.isUnderwater}
                  onCheckedChange={() => handleToggle(advanced.setIsUnderwater, advanced.isUnderwater)}
                />
              </div>
              {advanced.isUnderwater && (
                <div className="pl-2 border-l-2 border-cyan-500 space-y-2">
                  <div>
                    <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                      <span>{T('fluidDensity', lang)} ({T('kgPerM3', lang)})</span>
                      <span className="font-mono">{advanced.fluidDensity.toFixed(0)}</span>
                    </div>
                    <Slider value={[advanced.fluidDensity]} min={500} max={2000} step={10}
                      onValueChange={([v]) => { advanced.setFluidDensity(v); handleParamChange(); }} />
                  </div>
                </div>
              )}

              {/* Buoyancy */}
              <div className="flex items-center justify-between py-2 px-3 rounded-lg border border-border/50 hover:bg-primary/5 hover:border-primary/20 transition-all duration-200">
                <span className="text-xs font-medium text-foreground">{T('buoyancy', lang)}</span>
                <Switch
                  checked={advanced.enableBuoyancy}
                  onCheckedChange={() => handleToggle(advanced.setEnableBuoyancy, advanced.enableBuoyancy)}
                />
              </div>

              {/* Fluid Pressure */}
              <div className="flex items-center justify-between py-2 px-3 rounded-lg border border-border/50 hover:bg-primary/5 hover:border-primary/20 transition-all duration-200">
                <span className="text-xs font-medium text-foreground">{T('fluidPressure', lang)}</span>
                <Switch
                  checked={advanced.enableFluidPressure}
                  onCheckedChange={() => handleToggle(advanced.setEnableFluidPressure, advanced.enableFluidPressure)}
                />
              </div>

              {/* Hydrodynamic Drag */}
              <div className="flex items-center justify-between py-2 px-3 rounded-lg border border-border/50 hover:bg-primary/5 hover:border-primary/20 transition-all duration-200">
                <span className="text-xs font-medium text-foreground">{T('hydrodynamicDrag', lang)}</span>
                <Switch
                  checked={advanced.enableHydrodynamicDrag}
                  onCheckedChange={() => handleToggle(advanced.setEnableHydrodynamicDrag, advanced.enableHydrodynamicDrag)}
                />
              </div>
            </div>
          )}
          </>
          )}

          {/* ═══ SECTION 3: Rotational Dynamics ═══ */}
          <SectionHeader
            icon={<RotateCw className="w-3.5 h-3.5 text-purple-500" />}
            label={T('sectionRotDynamics', lang)}
            open={sectionRotDyn}
            onToggle={() => { setSectionRotDyn(!sectionRotDyn); playSectionToggle(false); }}
          />
          {sectionRotDyn && (
            <div className="space-y-3 pl-1 animate-slideDown">
              {/* Magnus Effect */}
              <div className="flex items-center justify-between py-2 px-3 rounded-lg border border-border/50 hover:bg-primary/5 hover:border-primary/20 transition-all duration-200">
                <span className="text-xs font-medium text-foreground">{T('magnus', lang)}</span>
                <Switch
                  checked={advanced.enableMagnus}
                  onCheckedChange={() => handleToggle(advanced.setEnableMagnus, advanced.enableMagnus)}
                />
              </div>
              {advanced.enableMagnus && (
                <div className="pl-2 border-l-2 border-purple-500 space-y-2">
                  <div>
                    <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                      <span>{T('spinRate', lang)} ({T('rps', lang)})</span>
                      <span className="font-mono">{advanced.spinRate.toFixed(1)}</span>
                    </div>
                    <Slider value={[advanced.spinRate]} min={0} max={100} step={0.5}
                      onValueChange={([v]) => { advanced.setSpinRate(v); handleParamChange(); }} />
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                      <span>{T('diameter', lang)} ({T('meters', lang)})</span>
                      <span className="font-mono">{(advanced.diameter * 1000).toFixed(1)} mm</span>
                    </div>
                    <Slider value={[advanced.diameter * 1000]} min={10} max={200} step={1}
                      onValueChange={([v]) => { advanced.setDiameter(v / 1000); handleParamChange(); }} />
                  </div>
                </div>
              )}

              {/* Gyroscopic Effects */}
              <div className="flex items-center justify-between py-2 px-3 rounded-lg border border-border/50 hover:bg-primary/5 hover:border-primary/20 transition-all duration-200">
                <span className="text-xs font-medium text-foreground">{T('gyroscopic', lang)}</span>
                <Switch
                  checked={advanced.enableGyroscopic}
                  onCheckedChange={() => handleToggle(advanced.setEnableGyroscopic, advanced.enableGyroscopic)}
                />
              </div>
              {advanced.enableGyroscopic && (
                <div className="pl-2 border-l-2 border-violet-500 text-[10px] text-muted-foreground">
                  <p>{lang === 'ar' ? 'يحسب تأثير البدارية والاستقرار الجيروسكوبي' : lang === 'fr' ? 'Calcule la précession et la stabilité gyroscopique' : 'Computes precession and gyroscopic stabilization'}</p>
                </div>
              )}

              {/* Ballistic Stability */}
              <div className="flex items-center justify-between py-2 px-3 rounded-lg border border-border/50 hover:bg-primary/5 hover:border-primary/20 transition-all duration-200">
                <span className="text-xs font-medium text-foreground">{T('ballisticStability', lang)}</span>
                <Switch
                  checked={advanced.enableBallisticStability}
                  onCheckedChange={() => handleToggle(advanced.setEnableBallisticStability, advanced.enableBallisticStability)}
                />
              </div>
              {advanced.enableBallisticStability && (
                <div className="pl-2 border-l-2 border-fuchsia-500 text-[10px] text-muted-foreground">
                  <p>{lang === 'ar' ? 'يعدل السحب بناءً على استقرار الدوران' : lang === 'fr' ? 'Modifie la traînée selon la stabilité de rotation' : 'Modifies drag based on spin stability'}</p>
                </div>
              )}
            </div>
          )}

          {/* ═══ SECTION 4: Environmental Coupling ═══ */}
          <SectionHeader
            icon={<Thermometer className="w-3.5 h-3.5 text-green-500" />}
            label={T('sectionEnvironmental', lang)}
            open={sectionEnv}
            onToggle={() => { setSectionEnv(!sectionEnv); playSectionToggle(false); }}
          />
          {sectionEnv && (
            <div className="space-y-3 pl-1 animate-slideDown">
              {/* Altitude-Dependent Density */}
              <div className="flex items-center justify-between py-2 px-3 rounded-lg border border-border/50 hover:bg-primary/5 hover:border-primary/20 transition-all duration-200">
                <span className="text-xs font-medium text-foreground">{T('altitudeDensity', lang)}</span>
                <Switch
                  checked={advanced.enableAltitudeDensity}
                  onCheckedChange={() => handleToggle(advanced.setEnableAltitudeDensity, advanced.enableAltitudeDensity)}
                />
              </div>

              {/* Environmental Physics Coupling */}
              <div className="flex items-center justify-between py-2 px-3 rounded-lg border border-border/50 hover:bg-primary/5 hover:border-primary/20 transition-all duration-200">
                <span className="text-xs font-medium text-foreground">{T('environmentCoupling', lang)}</span>
                <Switch
                  checked={advanced.enableEnvironmentalCoupling}
                  onCheckedChange={() => handleToggle(advanced.setEnableEnvironmentalCoupling, advanced.enableEnvironmentalCoupling)}
                />
              </div>
              {advanced.enableEnvironmentalCoupling && (
                <div className="pl-2 border-l-2 border-green-500 space-y-2">
                  <div>
                    <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                      <span>{T('envTemperature', lang)} ({T('celsius', lang)})</span>
                      <span className="font-mono">{advanced.environmentTemperature.toFixed(1)}</span>
                    </div>
                    <Slider value={[advanced.environmentTemperature]} min={-40} max={60} step={0.5}
                      onValueChange={([v]) => { advanced.setEnvironmentTemperature(v); handleParamChange(); }} />
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                      <span>{T('envPressure', lang)} ({T('pa', lang)})</span>
                      <span className="font-mono">{advanced.environmentPressure.toFixed(0)}</span>
                    </div>
                    <Slider value={[advanced.environmentPressure]} min={80000} max={120000} step={100}
                      onValueChange={([v]) => { advanced.setEnvironmentPressure(v); handleParamChange(); }} />
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                      <span>{T('envHumidity', lang)} ({T('percent', lang)})</span>
                      <span className="font-mono">{(advanced.environmentHumidity * 100).toFixed(0)}</span>
                    </div>
                    <Slider value={[advanced.environmentHumidity * 100]} min={0} max={100} step={1}
                      onValueChange={([v]) => { advanced.setEnvironmentHumidity(v / 100); handleParamChange(); }} />
                  </div>
                </div>
              )}

              {/* Weather Integration */}
              <div className="flex items-center justify-between py-2 px-3 rounded-lg border border-border/50 hover:bg-primary/5 hover:border-primary/20 transition-all duration-200">
                <span className="text-xs font-medium text-foreground">{T('weatherIntegration', lang)}</span>
                <Switch
                  checked={advanced.enableWeatherIntegration}
                  onCheckedChange={() => handleToggle(advanced.setEnableWeatherIntegration, advanced.enableWeatherIntegration)}
                />
              </div>
              {advanced.enableWeatherIntegration && (
                <div className="pl-2 border-l-2 border-orange-500 space-y-3">
                  <Button onClick={handleWeatherFetch} disabled={advanced.weatherLoading} size="sm" className="w-full text-xs">
                    <Cloud className="w-3 h-3 mr-1" />
                    {advanced.weatherLoading ? T('loading', lang) : T('currentLocation', lang)}
                  </Button>
                  {advanced.weatherError && (
                    <p className="text-[10px] text-red-500">{advanced.weatherError}</p>
                  )}
                  {advanced.weatherData && (
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div>
                        <span className="text-muted-foreground">{T('temperature', lang)}</span>
                        <p className="font-mono">{advanced.weatherData.temperature.toFixed(1)}°C</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{T('windSpeed', lang)}</span>
                        <p className="font-mono">{advanced.weatherData.windSpeed.toFixed(1)} {T('mPerSec', lang)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{T('pressure', lang)}</span>
                        <p className="font-mono">{advanced.weatherData.pressure.toFixed(0)} {T('hPa', lang)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{T('humidity', lang)}</span>
                        <p className="font-mono">{advanced.weatherData.humidity.toFixed(0)}%</p>
                      </div>
                      <div className="col-span-2">
                        <span className="text-muted-foreground">{T('airDensity', lang)}</span>
                        <p className="font-mono">{advanced.weatherData.airDensity.toFixed(4)} {T('kgPerM3', lang)}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Drag Coefficient (global) */}
          <div className="pt-2 border-t border-border">
            <div>
              <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                <span>{T('dragCoefficient', lang)}</span>
                <span className="font-mono">{advanced.dragCoefficient.toFixed(2)}</span>
              </div>
              <Slider value={[advanced.dragCoefficient]} min={0.1} max={2.0} step={0.01}
                onValueChange={([v]) => { advanced.setDragCoefficient(v); handleParamChange(); }} />
            </div>
          </div>

          {/* Relativity & Reference Frames (embedded) */}
          {relativity && (
            <Suspense fallback={null}>
              <RelativityPanel lang={lang} relativity={relativity} onPhysicsChange={onPhysicsChange} />
            </Suspense>
          )}

          {/* Info */}
          <div className="text-[9px] text-muted-foreground text-center border-t border-border pt-2">
            <p>
              {lang === 'ar'
                ? 'تُحسّن هذه الميزات دقة المحاكاة بشكل كبير'
                : lang === 'fr'
                ? 'Ces fonctionnalités améliorent considérablement la précision de la simulation'
                : 'These features significantly improve simulation accuracy'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
