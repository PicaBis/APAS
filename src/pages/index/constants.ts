// Presets for different projectile types
export const PRESETS = [
  { name: '● افتراضي', nameEn: '● Default', p: { velocity: 50, angle: 45, height: 0, gravity: 9.81, airResistance: 0, mass: 1 } },
  { name: '⚽ كرة قدم', nameEn: '⚽ Football', p: { velocity: 28, angle: 35, height: 0, gravity: 9.81, airResistance: 0.02, mass: 0.45 } },
  { name: '🏀 كرة سلة', nameEn: '🏀 Basketball', p: { velocity: 8.5, angle: 52, height: 2, gravity: 9.81, airResistance: 0.015, mass: 0.62 } },
  { name: '💣 قذيفة', nameEn: '💣 Cannon', p: { velocity: 120, angle: 45, height: 0, gravity: 9.81, airResistance: 0.001, mass: 15 } },
  { name: '🏹 سهم', nameEn: '🏹 Arrow', p: { velocity: 75, angle: 20, height: 1.5, gravity: 9.81, airResistance: 0.008, mass: 0.02 } },
  { name: '🚀 صاروخ', nameEn: '🚀 Rocket', p: { velocity: 200, angle: 85, height: 0, gravity: 9.81, airResistance: 0.003, mass: 500 } },
];

export const axisVars = [
  { key: 'time', symbol: 't', unit: 's' },
  { key: 'x', symbol: 'X', unit: 'm' },
  { key: 'y', symbol: 'Y', unit: 'm' },
  { key: 'speed', symbol: 'V', unit: 'm/s' },
  { key: 'vx', symbol: 'Vx', unit: 'm/s' },
  { key: 'vy', symbol: 'Vy', unit: 'm/s' },
  { key: 'acceleration', symbol: 'a', unit: 'm/s²' },
  { key: 'kineticEnergy', symbol: 'KE', unit: 'J' },
  { key: 'potentialEnergy', symbol: 'PE', unit: 'J' },
];

// Unit conversion definitions
export const UNIT_OPTIONS: Record<string, { label: string; labelAr: string; units: { key: string; label: string; labelAr: string; factor: number }[] }> = {
  velocity: {
    label: 'Velocity', labelAr: 'السرعة',
    units: [
      { key: 'm/s', label: 'm/s', labelAr: 'م/ث', factor: 1 },
      { key: 'km/h', label: 'km/h', labelAr: 'كم/س', factor: 3.6 },
      { key: 'ft/s', label: 'ft/s', labelAr: 'قدم/ث', factor: 3.28084 },
      { key: 'mph', label: 'mph', labelAr: 'ميل/س', factor: 2.23694 },
      { key: 'knot', label: 'knot', labelAr: 'عقدة', factor: 1.94384 },
    ]
  },
  angle: {
    label: 'Angle', labelAr: 'الزاوية',
    units: [
      { key: '°', label: '°', labelAr: '°', factor: 1 },
      { key: 'rad', label: 'rad', labelAr: 'راديان', factor: Math.PI / 180 },
      { key: 'grad', label: 'grad', labelAr: 'غراد', factor: 10 / 9 },
    ]
  },
  gravity: {
    label: 'Gravity', labelAr: 'الجاذبية',
    units: [
      { key: 'm/s²', label: 'm/s²', labelAr: 'م/ث²', factor: 1 },
      { key: 'ft/s²', label: 'ft/s²', labelAr: 'قدم/ث²', factor: 3.28084 },
      { key: 'g', label: 'g', labelAr: 'g', factor: 1 / 9.80665 },
    ]
  },
  mass: {
    label: 'Mass', labelAr: 'الكتلة',
    units: [
      { key: 'kg', label: 'kg', labelAr: 'كجم', factor: 1 },
      { key: 'g', label: 'g', labelAr: 'غرام', factor: 1000 },
      { key: 'lb', label: 'lb', labelAr: 'رطل', factor: 2.20462 },
      { key: 'oz', label: 'oz', labelAr: 'أونصة', factor: 35.274 },
    ]
  },
  height: {
    label: 'Height', labelAr: 'الارتفاع',
    units: [
      { key: 'm', label: 'm', labelAr: 'م', factor: 1 },
      { key: 'cm', label: 'cm', labelAr: 'سم', factor: 100 },
      { key: 'ft', label: 'ft', labelAr: 'قدم', factor: 3.28084 },
      { key: 'in', label: 'in', labelAr: 'بوصة', factor: 39.3701 },
    ]
  },
  windSpeed: {
    label: 'Wind Speed', labelAr: 'سرعة الرياح',
    units: [
      { key: 'm/s', label: 'm/s', labelAr: 'م/ث', factor: 1 },
      { key: 'km/h', label: 'km/h', labelAr: 'كم/س', factor: 3.6 },
      { key: 'mph', label: 'mph', labelAr: 'ميل/س', factor: 2.23694 },
    ]
  },
};

export const getRating = (r2: number, T: Record<string, string>) => {
  if (r2 >= 0.99) return { label: T.metricsExcellent, color: 'hsl(var(--foreground))' };
  if (r2 >= 0.95) return { label: T.metricsGood, color: 'hsl(var(--muted-foreground))' };
  if (r2 >= 0.85) return { label: T.metricsAcceptable, color: 'hsl(var(--muted-foreground))' };
  return { label: T.metricsPoor, color: 'hsl(var(--muted-foreground))' };
};

// Map objectType from APAS Vision/Video to emoji
export const objectTypeToEmoji = (objectType?: string): string | undefined => {
  if (!objectType) return undefined;
  const lower = objectType.toLowerCase();
  if (lower.includes('football') || lower.includes('soccer') || lower.includes('كرة قدم')) return '⚽';
  if (lower.includes('basketball') || lower.includes('كرة سلة')) return '🏀';
  if (lower.includes('cannon') || lower.includes('قذيفة') || lower.includes('bomb') || lower.includes('قنبلة')) return '💣';
  if (lower.includes('arrow') || lower.includes('سهم') || lower.includes('bow')) return '🏹';
  if (lower.includes('rocket') || lower.includes('صاروخ') || lower.includes('missile')) return '🚀';
  if (lower.includes('tennis') || lower.includes('تنس')) return '🎾';
  if (lower.includes('baseball') || lower.includes('بيسبول')) return '⚾';
  if (lower.includes('golf') || lower.includes('غولف')) return '⛳';
  if (lower.includes('ball') || lower.includes('كرة')) return '⚽';
  return undefined;
};

// Shared types
export interface ParamSnapshot {
  velocity: number;
  angle: number;
  height: number;
  gravity: number;
  airResistance: number;
  mass: number;
  windSpeed: number;
}

export interface SavedSnapshotData {
  velocity: number;
  angle: number;
  height: number;
  gravity: number;
  airResistance: number;
  mass: number;
  range: number;
  maxHeight: number;
  flightTime: number;
  finalVelocity: number;
  impactAngle: number;
  integrationMethod: string;
}
