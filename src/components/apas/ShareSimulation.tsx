import React, { useState } from 'react';
import { Share2, Copy, Check, Link } from 'lucide-react';
import { playUIClick } from '@/utils/sound';

interface Props {
  lang: string;
  muted: boolean;
  velocity: number;
  angle: number;
  height: number;
  gravity: number;
  airResistance: number;
  mass: number;
  windSpeed: number;
  environmentId: string;
  nightMode: boolean;
  integrationMethod: string;
}

/** Encode simulation parameters into URL search params */
export function encodeSimParams(params: {
  velocity: number; angle: number; height: number; gravity: number;
  airResistance: number; mass: number; windSpeed: number;
  environmentId: string; nightMode: boolean; integrationMethod: string;
}): string {
  const p = new URLSearchParams();
  p.set('v', String(params.velocity));
  p.set('a', String(params.angle));
  p.set('h', String(params.height));
  p.set('g', String(params.gravity));
  p.set('k', String(params.airResistance));
  p.set('m', String(params.mass));
  if (params.windSpeed !== 0) p.set('w', String(params.windSpeed));
  if (params.environmentId !== 'earth') p.set('env', params.environmentId);
  if (params.nightMode) p.set('night', '1');
  if (params.integrationMethod !== 'ai-apas') p.set('int', params.integrationMethod);
  return p.toString();
}

/** Decode simulation parameters from URL search params */
export function decodeSimParams(search: string): Partial<{
  velocity: number; angle: number; height: number; gravity: number;
  airResistance: number; mass: number; windSpeed: number;
  environmentId: string; nightMode: boolean; integrationMethod: string;
}> | null {
  const p = new URLSearchParams(search);
  if (!p.has('v')) return null;
  const result: Record<string, unknown> = {};
  const num = (key: string) => { const v = p.get(key); return v !== null ? Number(v) : undefined; };
  const velocity = num('v'); if (velocity !== undefined) result.velocity = velocity;
  const angle = num('a'); if (angle !== undefined) result.angle = angle;
  const height = num('h'); if (height !== undefined) result.height = height;
  const gravity = num('g'); if (gravity !== undefined) result.gravity = gravity;
  const airResistance = num('k'); if (airResistance !== undefined) result.airResistance = airResistance;
  const mass = num('m'); if (mass !== undefined) result.mass = mass;
  const windSpeed = num('w'); if (windSpeed !== undefined) result.windSpeed = windSpeed;
  const env = p.get('env'); if (env) result.environmentId = env;
  if (p.get('night') === '1') result.nightMode = true;
  const int = p.get('int'); if (int) result.integrationMethod = int;
  return result as ReturnType<typeof decodeSimParams>;
}

export default function ShareSimulation({
  lang, muted, velocity, angle, height, gravity, airResistance, mass,
  windSpeed, environmentId, nightMode, integrationMethod,
}: Props) {
  const [copied, setCopied] = useState(false);
  const isAr = lang === 'ar';

  const generateURL = () => {
    const params = encodeSimParams({ velocity, angle, height, gravity, airResistance, mass, windSpeed, environmentId, nightMode, integrationMethod });
    return `${window.location.origin}${window.location.pathname}?${params}`;
  };

  const handleCopy = () => {
    const url = generateURL();
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
    playUIClick(muted);
  };

  const handleNativeShare = () => {
    const url = generateURL();
    if (navigator.share) {
      navigator.share({
        title: 'APAS Simulation',
        text: isAr ? `محاكاة مقذوف: v=${velocity}m/s θ=${angle}° h=${height}m` : `Projectile sim: v=${velocity}m/s θ=${angle}° h=${height}m`,
        url,
      }).catch(() => {});
    } else {
      handleCopy();
    }
    playUIClick(muted);
  };

  return (
    <div className="flex items-center justify-center gap-2">
      <button
        onClick={handleCopy}
        className="group p-2 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary border border-border/40 hover:border-primary/30 hover:shadow-md transition-all duration-300"
        title={copied ? (isAr ? 'تم النسخ!' : 'Copied!') : (isAr ? 'نسخ الرابط' : 'Copy Link')}
      >
        {copied ? <Check className="w-4 h-4 text-green-500" /> : <Link className="w-4 h-4 transition-transform duration-200 group-hover:scale-110" />}
      </button>
      <button
        onClick={handleNativeShare}
        className="group p-2 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary border border-border/40 hover:border-primary/30 hover:shadow-md transition-all duration-300"
        title={isAr ? 'مشاركة' : 'Share'}
      >
        <Share2 className="w-4 h-4 transition-transform duration-200 group-hover:scale-110" />
      </button>
    </div>
  );
}
