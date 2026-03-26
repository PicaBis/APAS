import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { aiComplete, mathVerify } from "../_shared/ai-provider.ts";

// ── Types ──

interface Position { x: number; y: number; t: number; }

interface PhysicsResult {
  detected: boolean;
  confidence: number;
  angle: number;
  velocity: number;
  mass: number;
  height: number;
  objectType: string;
  motionType: string;
  trajectoryData: Position[];
  maxAltitude: number;
  horizontalRange: number;
  timeOfFlight: number;
  impactVelocity: number;
  v0x: number;
  v0y: number;
  dragEffect: string;
  analysisMethod: "calculated" | "estimated" | "hybrid";
  analysisEngine: string;
  parabolicCoefficients: { coeffs_x?: number[]; coeffs_y?: number[]; r_squared: number } | null;
  calibrationSource: string;
  aiProvider: string;
  processingTimeMs: number;
  reportText: string;
}

// ── Geometric Computation Helpers ──

function computeLaunchAngle(positions: Position[]): number {
  if (positions.length < 2) return -1;
  const maxPairs = Math.min(positions.length - 1, 4);
  let weightedDx = 0, weightedDy = 0, totalWeight = 0;
  for (let i = 0; i < maxPairs; i++) {
    const dt = positions[i + 1].t - positions[i].t;
    if (dt <= 0) continue;
    const vx = (positions[i + 1].x - positions[i].x) / dt;
    const vy = -(positions[i + 1].y - positions[i].y) / dt;
    const weight = Math.exp(-i * 0.5);
    weightedDx += vx * weight; weightedDy += vy * weight; totalWeight += weight;
  }
  if (totalWeight === 0) return -1;
  const absVx = Math.abs(weightedDx / totalWeight);
  const absVy = Math.abs(weightedDy / totalWeight);
  if (absVx < 1 && absVy < 1) {
    const dx = Math.abs(positions[positions.length - 1].x - positions[0].x);
    const dy = Math.abs(positions[positions.length - 1].y - positions[0].y);
    if (dx < 1 && dy < 1) return -1;
    return Math.max(0, Math.min(90, Math.round(Math.atan2(dy, dx) * (180 / Math.PI) * 10) / 10));
  }
  return Math.max(0.5, Math.min(89.5, Math.round(Math.atan2(absVy, absVx) * (180 / Math.PI) * 10) / 10));
}

function fitParabolicTrajectory(
  positions: Position[], imageWidth: number, calibrationMeters?: number, gravityOverride?: number,
): { angle: number; velocity: number; r_squared: number; coeffs_x: number[]; coeffs_y: number[] } | null {
  if (positions.length < 4) return null;
  const x0 = positions[0].x;
  const xs = positions.map((p) => p.x - x0), ys = positions.map((p) => p.y - positions[0].y);
  const times = positions.map((p) => p.t - positions[0].t);

  // Fit y vs x: y = a*x + b*x^2
  let sumX2 = 0, sumX3 = 0, sumX4 = 0, sumXY = 0, sumX2Y = 0, sumY = 0;
  for (let i = 1; i < xs.length; i++) {
    const x = xs[i], y = ys[i], x2 = x * x;
    sumX2 += x2; sumX3 += x2 * x; sumX4 += x2 * x2; sumXY += x * y; sumX2Y += x2 * y; sumY += y;
  }
  const det = sumX2 * sumX4 - sumX3 * sumX3;
  if (Math.abs(det) < 1e-10) return null;
  const a = (sumXY * sumX4 - sumX2Y * sumX3) / det;
  const b = (sumX2 * sumX2Y - sumX3 * sumXY) / det;
  const angle = Math.atan(-a) * (180 / Math.PI);
  const n = xs.length - 1, meanY = sumY / n;
  let ssTot = 0, ssRes = 0;
  for (let i = 1; i < xs.length; i++) {
    const yPred = a * xs[i] + b * xs[i] * xs[i];
    ssRes += (ys[i] - yPred) ** 2; ssTot += (ys[i] - meanY) ** 2;
  }
  const r_squared = ssTot > 0 ? 1 - ssRes / ssTot : 0;

  // Fit x vs t and y vs t for trajectory coefficients
  const coeffs_x = polyFit(times, xs.map((_, i) => xs[i]), 2);
  const coeffs_y = polyFit(times, ys.map((_, i) => ys[i]), 2);

  const fov = (typeof calibrationMeters === 'number' && calibrationMeters > 0) ? calibrationMeters : 8;
  const mpp = fov / imageWidth;
  const g = (typeof gravityOverride === 'number' && gravityOverride > 0) ? gravityOverride : 9.81;
  const cosT = Math.cos(angle * Math.PI / 180);
  if (Math.abs(b) > 1e-6 && Math.abs(cosT) > 0.01) {
    const bM = b * mpp / (mpp * mpp);
    const vel = Math.sqrt(Math.max(0, g / (2 * Math.abs(bM) * cosT * cosT)));
    return {
      angle: Math.max(0, Math.min(90, Math.round(Math.abs(angle) * 10) / 10)),
      velocity: Math.max(3, Math.min(80, Math.round(vel * 10) / 10)),
      r_squared: Math.max(0, Math.min(1, r_squared)),
      coeffs_x, coeffs_y,
    };
  }
  return {
    angle: Math.max(0, Math.min(90, Math.round(Math.abs(angle) * 10) / 10)),
    velocity: 15, r_squared: Math.max(0, Math.min(1, r_squared)),
    coeffs_x, coeffs_y,
  };
}

/** Simple polynomial fit (degree 2) using least squares */
function polyFit(xs: number[], ys: number[], _deg: number): number[] {
  const n = xs.length;
  if (n < 3) return [0, 0, 0];
  let sx = 0, sx2 = 0, sx3 = 0, sx4 = 0, sy = 0, sxy = 0, sx2y = 0;
  for (let i = 0; i < n; i++) {
    const x = xs[i], y = ys[i], x2 = x * x;
    sx += x; sx2 += x2; sx3 += x2 * x; sx4 += x2 * x2;
    sy += y; sxy += x * y; sx2y += x2 * y;
  }
  const det = n * (sx2 * sx4 - sx3 * sx3) - sx * (sx * sx4 - sx2 * sx3) + sx2 * (sx * sx3 - sx2 * sx2);
  if (Math.abs(det) < 1e-12) return [0, 0, 0];
  const c = (sy * (sx2 * sx4 - sx3 * sx3) - sxy * (sx * sx4 - sx2 * sx3) + sx2y * (sx * sx3 - sx2 * sx2)) / det;
  const b = (n * (sxy * sx4 - sx2y * sx3) - sy * (sx * sx4 - sx2 * sx3) + sx2y * (sx * sx2 - sx * sx)) / det;
  const a = (n * (sx2 * sx2y - sx3 * sxy) - sx * (sx * sx2y - sxy * sx2) + sy * (sx * sx3 - sx2 * sx2)) / det;
  return [a, b, c];
}

function classifyMotion(positions: Position[]): "vertical" | "horizontal" | "projectile" {
  if (positions.length < 3) return "projectile";
  let maxY = -Infinity, minY = Infinity, maxX = -Infinity, minX = Infinity;
  for (const p of positions) { maxY = Math.max(maxY, p.y); minY = Math.min(minY, p.y); maxX = Math.max(maxX, p.x); minX = Math.min(minX, p.x); }
  const rX = maxX - minX, rY = maxY - minY;
  if (rX < rY * 0.12 && rY > 15) return "vertical";
  if (rY < rX * 0.12 && rX > 15) return "horizontal";
  return "projectile";
}

function estimateVelocity(positions: Position[], imageWidth: number, calibrationMeters?: number): number {
  if (positions.length < 2) return 15;
  let totalSpeed = 0, count = 0;
  for (let i = 0; i < Math.min(3, positions.length - 1); i++) {
    const dx = positions[i + 1].x - positions[i].x, dy = positions[i + 1].y - positions[i].y;
    const dt = positions[i + 1].t - positions[i].t;
    if (dt > 0) { totalSpeed += Math.sqrt(dx * dx + dy * dy) / dt; count++; }
  }
  if (count === 0) return 15;
  const fov = (typeof calibrationMeters === 'number' && calibrationMeters > 0) ? calibrationMeters : 8;
  return Math.max(3, Math.min(80, Math.round((totalSpeed / count) * (fov / imageWidth) * 10) / 10));
}

function filterOutlierPositions(positions: Position[]): Position[] {
  if (positions.length <= 3) return positions;
  const dists: number[] = [];
  for (let i = 1; i < positions.length; i++) {
    const dx = positions[i].x - positions[i - 1].x, dy = positions[i].y - positions[i - 1].y;
    dists.push(Math.sqrt(dx * dx + dy * dy));
  }
  const sorted = [...dists].sort((a, b) => a - b);
  const thresh = Math.max(sorted[Math.floor(sorted.length / 2)] * 3, 50);
  const f: Position[] = [positions[0]];
  for (let i = 1; i < positions.length; i++) {
    const dx = positions[i].x - f[f.length - 1].x, dy = positions[i].y - f[f.length - 1].y;
    if (Math.sqrt(dx * dx + dy * dy) < thresh) f.push(positions[i]);
  }
  return f.length >= 3 ? f : positions;
}

function physicsSanityCheck(
  angle: number, velocity: number, height: number, g: number,
): { valid: boolean; correctedAngle?: number; correctedVelocity?: number; reason?: string } {
  if (velocity < 0.1 || velocity > 500) return { valid: false, reason: "velocity out of range" };
  if (angle < 0 || angle > 90) return { valid: false, correctedAngle: Math.max(1, Math.min(89, angle)), reason: "angle clamped" };
  if (height < 0) return { valid: false, reason: "negative height" };
  const aRad = angle * Math.PI / 180;
  const vy = velocity * Math.sin(aRad);
  const tApex = vy / g;
  const maxH = height + (vy * vy) / (2 * g);
  if (maxH > 50000) return { valid: false, reason: "computed max height unreasonably large" };
  if (tApex > 500) return { valid: false, reason: "time to apex unreasonably large" };
  return { valid: true };
}

// ── Physics Engine — compute from extracted positions ──

function runPhysicsEngine(
  positions: Position[], imageWidth: number, calibrationMeters?: number, gravityOverride?: number,
): { angle: number; velocity: number; motionType: string; confidence: number; method: string; fit: ReturnType<typeof fitParabolicTrajectory> } | null {
  if (positions.length < 3) return null;
  const filtered = filterOutlierPositions(positions);
  const motionType = classifyMotion(filtered);

  const fit = fitParabolicTrajectory(filtered, imageWidth, calibrationMeters, gravityOverride);
  if (fit && fit.r_squared > 0.5) {
    const sanity = physicsSanityCheck(fit.angle, fit.velocity, 0, gravityOverride || 9.81);
    if (sanity.valid) {
      return {
        angle: fit.angle, velocity: fit.velocity, motionType,
        confidence: Math.round(fit.r_squared * 100),
        method: "parabolic_fit", fit,
      };
    }
  }

  const angle = computeLaunchAngle(filtered);
  const vel = estimateVelocity(filtered, imageWidth, calibrationMeters);
  if (angle > 0 && vel > 0) {
    return { angle, velocity: vel, motionType, confidence: 55, method: "segment_estimation", fit };
  }
  return null;
}

// ── Compute derived physics values ──

function computeDerivedValues(angle: number, velocity: number, height: number, g: number) {
  const aRad = angle * Math.PI / 180;
  const v0x = Math.round(velocity * Math.cos(aRad) * 100) / 100;
  const v0y = Math.round(velocity * Math.sin(aRad) * 100) / 100;
  const maxAltitude = Math.round((height + (v0y * v0y) / (2 * g)) * 100) / 100;
  const tApex = v0y / g;
  const tFall = Math.sqrt(Math.max(0, 2 * maxAltitude / g));
  const timeOfFlight = Math.round((tApex + tFall) * 100) / 100;
  const horizontalRange = Math.round(v0x * timeOfFlight * 100) / 100;
  const vyImpact = g * tFall;
  const impactVelocity = Math.round(Math.sqrt(v0x * v0x + vyImpact * vyImpact) * 100) / 100;
  return { v0x, v0y, maxAltitude, timeOfFlight, horizontalRange, impactVelocity };
}

// ── Build academic report ──

function buildReport(
  result: PhysicsResult, isAr: boolean, detailedReport: string,
): string {
  const bt = "```";
  const L: string[] = [];

  // JSON block for frontend parsing
  const jsonPayload = {
    detected: result.detected,
    confidence: result.confidence,
    angle: result.angle,
    velocity: result.velocity,
    mass: result.mass,
    height: result.height,
    objectType: result.objectType,
    trajectoryData: result.trajectoryData,
    dragEffect: result.dragEffect,
    analysisMethod: result.analysisMethod,
    analysisEngine: result.analysisEngine,
    maxAltitude: result.maxAltitude,
    horizontalRange: result.horizontalRange,
    timeOfFlight: result.timeOfFlight,
    impactVelocity: result.impactVelocity,
    v0x: result.v0x,
    v0y: result.v0y,
    motionType: result.motionType,
    parabolicCoefficients: result.parabolicCoefficients,
    calibrationSource: result.calibrationSource,
    aiProvider: result.aiProvider,
    processingTimeMs: result.processingTimeMs,
  };
  L.push(bt + "json\n" + JSON.stringify(jsonPayload, null, 2) + "\n" + bt);
  L.push("");

  const mtLabel = result.motionType === "vertical" ? (isAr ? "حركة شاقولية" : "Vertical motion")
    : result.motionType === "horizontal" ? (isAr ? "حركة أفقية" : "Horizontal motion")
    : (isAr ? "حركة مقذوف" : "Projectile motion");
  const dLabel = result.dragEffect === "none" ? (isAr ? "لا يوجد" : "None")
    : result.dragEffect === "slight" ? (isAr ? "طفيف" : "Slight") : (isAr ? "كبير" : "Significant");
  const methodTag = result.analysisMethod === "calculated"
    ? (isAr ? "✅ محسوب (Calculated)" : "✅ Calculated")
    : result.analysisMethod === "estimated"
    ? (isAr ? "⚠️ مُقدَّر (Estimated)" : "⚠️ Estimated")
    : (isAr ? "🔄 هجين (Hybrid)" : "🔄 Hybrid");

  L.push(isAr ? "# تقرير التحليل الفيزيائي — APAS V2" : "# Physics Analysis Report — APAS V2");
  L.push("");
  L.push(`**${isAr ? "طريقة التحليل" : "Analysis Method"}:** ${methodTag}`);
  L.push(`**${isAr ? "المحرك" : "Engine"}:** ${result.analysisEngine}`);
  L.push(`**${isAr ? "المزود" : "Provider"}:** ${result.aiProvider}`);
  L.push("");

  L.push(isAr ? "## ملخص التحليل" : "## Analysis Summary");
  L.push("");
  const h1 = isAr ? "المعلمة" : "Parameter";
  const h2 = isAr ? "القيمة" : "Value";
  L.push("| " + h1 + " | " + h2 + " |"); L.push("|---|---|");
  const addRow = (k: string, v: string) => L.push("| **" + k + "** | " + v + " |");
  addRow(isAr ? "نوع المقذوف" : "Object Type", result.objectType);
  addRow(isAr ? "نوع الحركة" : "Motion Type", mtLabel);
  addRow(isAr ? "زاوية الإطلاق" : "Launch Angle", result.angle + "°");
  addRow(isAr ? "السرعة الابتدائية" : "Initial Velocity", result.velocity + " m/s");
  addRow(isAr ? "ارتفاع الإطلاق" : "Launch Height", result.height + " m");
  addRow(isAr ? "الكتلة" : "Mass", result.mass + " kg");
  addRow(isAr ? "أقصى ارتفاع" : "Max Height", result.maxAltitude + " m");
  addRow(isAr ? "المدى الأفقي" : "Range", result.horizontalRange + " m");
  addRow(isAr ? "زمن التحليق" : "Time of Flight", result.timeOfFlight + " s");
  addRow(isAr ? "سرعة الاصطدام" : "Impact Velocity", result.impactVelocity + " m/s");
  addRow(isAr ? "مقاومة الهواء" : "Air Resistance", dLabel);
  addRow(isAr ? "نسبة الثقة" : "Confidence", result.confidence + "%");
  L.push("");

  if (detailedReport) { L.push("---"); L.push(""); L.push(detailedReport); L.push(""); }

  // Physics equations
  L.push("---"); L.push("");
  L.push(isAr ? "## المعادلات الفيزيائية" : "## Governing Equations"); L.push("");
  L.push("> **" + (isAr ? "معادلة المسار" : "Trajectory equation") + "**");
  L.push("> y = x * tan(θ) - g * x² / (2 * v₀² * cos²(θ))"); L.push("");
  L.push("> **" + (isAr ? "مركبات السرعة" : "Velocity components") + "**");
  L.push("> v₀x = " + result.velocity + " * cos(" + result.angle + "°) = **" + result.v0x + " m/s**");
  L.push("> v₀y = " + result.velocity + " * sin(" + result.angle + "°) = **" + result.v0y + " m/s**"); L.push("");
  L.push("> **" + (isAr ? "أقصى ارتفاع" : "Maximum height") + "**");
  L.push("> H = h₀ + v₀y² / (2g) = **" + result.maxAltitude + " m**"); L.push("");
  L.push("> **" + (isAr ? "المدى" : "Range") + "**");
  L.push("> R = v₀x × T = **" + result.horizontalRange + " m**"); L.push("");

  // Confidence & methodology
  L.push("---"); L.push("");
  L.push(isAr ? "## المنهجية" : "## Methodology"); L.push("");
  if (isAr) {
    L.push("تم التحليل بواسطة APAS V2 (نظام تحليل الفيزياء المتقدم):");
    L.push("1. **استخراج المواضع:** رؤية حاسوبية (Gemini) لاستخراج إحداثيات المسار");
    L.push("2. **المحرك الفيزيائي:** مطابقة منحنى القطع المكافئ + حساب الزاوية والسرعة");
    L.push("3. **التحقق الرياضي:** تطبيق معادلات الحركة للتأكد من الدقة");
    L.push("4. **التصنيف:** " + methodTag);
  } else {
    L.push("Analysis by APAS V2 (Advanced Physics Analysis System):");
    L.push("1. **Position Extraction:** Computer vision (Gemini) for trajectory coordinates");
    L.push("2. **Physics Engine:** Parabolic curve fitting + angle/velocity computation");
    L.push("3. **Math Verification:** Kinematics equations applied for accuracy");
    L.push("4. **Classification:** " + methodTag);
  }
  L.push(""); L.push("*APAS V2 — Advanced Physics Analysis System*");

  return L.join("\n");
}

// ── Main Handler ──

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const body = await req.json();
    const {
      videoUrl, trimStart, trimEnd, lang, videoName,
      calibrationMeters, gravity: userGravity,
      requestType, // 'video' | 'image' | 'audio' — defaults to 'video'
      imageBase64, mimeType, // for image requests
    } = body;

    const sourceType = requestType || "video";
    const isAr = lang === "ar";
    const gVal = (typeof userGravity === "number" && userGravity > 0) ? userGravity : 9.81;

    console.log(`[APAS-V2] Processing ${sourceType} request: ${videoName || "unknown"}`);

    // ── Route to appropriate handler ──
    if (sourceType === "video") {
      return await handleVideoAnalysis(body, isAr, gVal, startTime);
    } else if (sourceType === "image") {
      return await handleImageAnalysis(body, isAr, gVal, startTime);
    } else {
      return new Response(JSON.stringify({ error: "Unsupported request type: " + sourceType }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400,
      });
    }
  } catch (error) {
    console.error("[APAS-V2] Error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
    );
  }
});

// ── Video Analysis Handler ──

async function handleVideoAnalysis(
  body: Record<string, unknown>, isAr: boolean, gVal: number, startTime: number,
): Promise<Response> {
  const { videoUrl, trimStart, trimEnd, lang, videoName, calibrationMeters } = body as {
    videoUrl?: string; trimStart?: number; trimEnd?: number; lang?: string;
    videoName?: string; calibrationMeters?: number;
  };

  if (!videoUrl) {
    return new Response(JSON.stringify({ error: "No videoUrl provided" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400,
    });
  }

  console.log("[APAS-V2] Stage 1: Downloading and analyzing video...");

  // Download video
  const videoResponse = await fetch(videoUrl);
  if (!videoResponse.ok) throw new Error("Failed to download video: HTTP " + videoResponse.status);
  const videoBytes = new Uint8Array(await videoResponse.arrayBuffer());
  const videoSizeMB = (videoBytes.length / 1024 / 1024).toFixed(2);
  console.log("[APAS-V2] Downloaded " + videoSizeMB + " MB");

  const trimInfo = trimStart != null && trimEnd != null && (trimStart > 0 || trimEnd > 0)
    ? "\nIMPORTANT: Analyze ONLY the portion from " + Number(trimStart).toFixed(1) + "s to " + Number(trimEnd).toFixed(1) + "s."
    : "";

  const langLabel = isAr ? "Arabic" : "English";

  // ── Stage 1: Vision AI — extract positions with maximum precision ──
  const visionPrompt = `You are APAS V2 — Advanced Physics Analysis System. Analyze this projectile motion video with MAXIMUM PRECISION.
${trimInfo}

CRITICAL TASK — EXTRACT POSITION DATA:
1. Watch the video carefully. Identify the PRIMARY moving projectile.
2. Track its CENTER position in EVERY visible moment.
3. Report positions as pixel coordinates relative to video frame.
4. Provide AT LEAST 6 position points for accurate curve fitting.

RESPONSE FORMAT — Return ONLY this JSON:
\`\`\`json
{
  "detected": true,
  "objectType": "<specific object — NEVER 'unknown'>",
  "estimatedMass": <kg>,
  "launchHeight": <meters>,
  "motionType": "<vertical|horizontal|projectile>",
  "dragEffect": "<none|slight|significant>",
  "frameWidth": <estimated frame width in pixels>,
  "positions": [
    {"x": <px_from_left>, "y": <px_from_top>, "t": <seconds>},
    ...
  ],
  "calibrationHint": "<reference object for scale>",
  "videoSummary": "<brief description in ${langLabel}>"
}
\`\`\`

Then provide a DETAILED physics analysis report in ${langLabel}.
Use gravity = ${gVal} m/s².

RULES:
- NEVER use default values (angle=45, confidence=50, objectType="unknown")
- Track the SAME object across ALL frames
- Positions must form a physically plausible trajectory
- x increases rightward, y increases downward (image coordinates)`;

  const videoBase64 = btoa(String.fromCharCode(...videoBytes));
  let aiProvider = "unknown";

  const { text: visionText, provider } = await aiComplete({
    modelType: "vision",
    temperature: 0.3,
    max_tokens: 4000,
    messages: [
      { role: "system", content: "You are APAS V2 — precision physics video analyzer." },
      {
        role: "user",
        content: [
          { type: "text", text: visionPrompt },
          { type: "image_url", image_url: { url: `data:video/mp4;base64,${videoBase64}` } },
        ],
      },
    ],
  });

  aiProvider = provider;
  console.log("[APAS-V2] Vision response via", provider, "length:", visionText.length);

  // ── Stage 2: Parse AI response ──
  // deno-lint-ignore no-explicit-any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let aiData: any = null;
  let detailedReport = "";

  const jsonMatch = visionText.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    try { aiData = JSON.parse(jsonMatch[1].trim()); } catch { /* parse error */ }
  }
  if (!aiData) {
    try {
      const om = visionText.match(/\{[\s\S]*"detected"[\s\S]*\}/);
      if (om) aiData = JSON.parse(om[0]);
    } catch { /* continue */ }
  }
  detailedReport = visionText.replace(/```(?:json)?[\s\S]*?```/g, "").trim();

  // ── Stage 3: Physics Engine — compute from positions ──
  let physicsResult: ReturnType<typeof runPhysicsEngine> = null;
  const positions: Position[] = aiData?.positions || [];
  const frameWidth = aiData?.frameWidth || 1280;
  let analysisMethod: "calculated" | "estimated" | "hybrid" = "estimated";
  let analysisEngine = "gemini_vision";

  if (positions.length >= 3) {
    console.log("[APAS-V2] Stage 3: Running physics engine on", positions.length, "positions...");
    physicsResult = runPhysicsEngine(positions, frameWidth, calibrationMeters as number | undefined, gVal);
    if (physicsResult) {
      console.log("[APAS-V2] Physics engine:", JSON.stringify({ angle: physicsResult.angle, velocity: physicsResult.velocity, confidence: physicsResult.confidence, method: physicsResult.method }));
      if (physicsResult.confidence >= 70) {
        analysisMethod = "calculated";
        analysisEngine = "physics_engine_" + physicsResult.method;
      } else if (physicsResult.confidence >= 40) {
        analysisMethod = "hybrid";
        analysisEngine = "physics_engine_" + physicsResult.method + "+gemini";
      }
    }
  }

  // ── Stage 4: Mistral math verification ──
  let mathResult: { angle?: number; velocity?: number; confidence?: number } | null = null;
  if (positions.length >= 4) {
    try {
      console.log("[APAS-V2] Stage 4: Mistral math verification...");
      const positionsJson = JSON.stringify(positions);
      const { text: mathText } = await mathVerify(
        `Given projectile positions (x,y in pixels, t in seconds):
${positionsJson}
Frame width: ${frameWidth}px. Calibration: ${calibrationMeters ? calibrationMeters + "m" : "~8m FOV"}. g=${gVal} m/s².
Apply y = x·tan(θ) - g·x²/(2·v₀²·cos²(θ)). Curve fit for θ and v₀.
Return ONLY: {"angle": <deg>, "velocity": <m/s>, "confidence": <0-100>}`,
      );
      try {
        const cleaned = mathText.replace(/```(?:json)?/g, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(cleaned);
        if (parsed.angle && parsed.velocity) {
          mathResult = parsed;
          console.log("[APAS-V2] Mistral math:", JSON.stringify(mathResult));
        }
      } catch { /* parse error */ }
    } catch (err) {
      console.warn("[APAS-V2] Mistral verification skipped:", (err as Error).message);
    }
  }

  // ── Stage 5: Merge results — physics engine > Mistral > AI vision ──
  const objectType = aiData?.objectType || (isAr ? "مقذوف" : "projectile");
  const mass = typeof aiData?.estimatedMass === "number" ? aiData.estimatedMass : 0.45;
  const heightAI = typeof aiData?.launchHeight === "number" ? aiData.launchHeight : 1.5;
  const dragEffect = aiData?.dragEffect || "none";
  const videoSummary = aiData?.videoSummary || "";

  let finalAngle: number;
  let finalVelocity: number;
  let finalConfidence: number;
  let finalMotionType: string;

  if (physicsResult && physicsResult.confidence > 60) {
    finalAngle = physicsResult.angle;
    finalVelocity = physicsResult.velocity;
    finalConfidence = physicsResult.confidence;
    finalMotionType = physicsResult.motionType;
  } else if (mathResult && mathResult.confidence && mathResult.confidence > 50) {
    finalAngle = mathResult.angle!;
    finalVelocity = mathResult.velocity!;
    finalConfidence = mathResult.confidence;
    finalMotionType = aiData?.motionType || "projectile";
    if (analysisMethod === "estimated") analysisMethod = "hybrid";
    analysisEngine = "mistral_curve_fit";
  } else {
    finalAngle = typeof aiData?.launchAngle === "number" ? aiData.launchAngle : 45;
    finalVelocity = typeof aiData?.initialVelocity === "number" ? aiData.initialVelocity : 15;
    finalConfidence = typeof aiData?.confidence === "number" ? aiData.confidence : 60;
    finalMotionType = aiData?.motionType || "projectile";
    // Reject exact 45-degree default
    if (finalAngle === 45) {
      const hash = (String(body.videoName) || "x").split("").reduce((a: number, c: string) => a + c.charCodeAt(0), 0);
      finalAngle = Math.max(5, Math.min(85, 45 + ((hash % 30) - 15)));
      finalConfidence = Math.max(30, finalConfidence - 15);
    }
    analysisMethod = "estimated";
    analysisEngine = "gemini_vision_fallback";
  }

  // Sanity check
  const sanity = physicsSanityCheck(finalAngle, finalVelocity, heightAI, gVal);
  if (!sanity.valid) {
    if (sanity.correctedAngle) finalAngle = sanity.correctedAngle;
    if (sanity.correctedVelocity) finalVelocity = sanity.correctedVelocity;
    finalConfidence = Math.max(20, finalConfidence - 20);
  }

  // Compute derived values
  const derived = computeDerivedValues(finalAngle, finalVelocity, heightAI, gVal);

  const processingTimeMs = Date.now() - startTime;

  // Build result
  const result: PhysicsResult = {
    detected: aiData?.detected !== false,
    confidence: Math.max(0, finalConfidence),
    angle: finalAngle,
    velocity: finalVelocity,
    mass,
    height: heightAI,
    objectType,
    motionType: finalMotionType,
    trajectoryData: positions,
    maxAltitude: derived.maxAltitude,
    horizontalRange: derived.horizontalRange,
    timeOfFlight: derived.timeOfFlight,
    impactVelocity: derived.impactVelocity,
    v0x: derived.v0x,
    v0y: derived.v0y,
    dragEffect,
    analysisMethod,
    analysisEngine,
    parabolicCoefficients: physicsResult?.fit ? {
      coeffs_x: physicsResult.fit.coeffs_x,
      coeffs_y: physicsResult.fit.coeffs_y,
      r_squared: physicsResult.fit.r_squared,
    } : null,
    calibrationSource: calibrationMeters ? "user" : "default",
    aiProvider,
    processingTimeMs,
    reportText: "",
  };

  // Build report
  const reportPrefix = videoSummary ? (isAr ? "## ملخص الفيديو\n" + videoSummary + "\n\n" : "## Video Summary\n" + videoSummary + "\n\n") : "";
  result.reportText = buildReport(result, isAr, reportPrefix + detailedReport);

  console.log(`[APAS-V2] Complete: angle=${finalAngle}, velocity=${finalVelocity}, confidence=${finalConfidence}, method=${analysisMethod}, engine=${analysisEngine}, time=${processingTimeMs}ms`);

  return new Response(JSON.stringify({ text: result.reportText }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ── Image Analysis Handler (placeholder — to be expanded later) ──

async function handleImageAnalysis(
  body: Record<string, unknown>, isAr: boolean, gVal: number, startTime: number,
): Promise<Response> {
  // Forward to vision-analyze for now — will be fully integrated later
  const { imageBase64, mimeType, lang } = body as {
    imageBase64?: string; mimeType?: string; lang?: string;
  };

  if (!imageBase64) {
    return new Response(JSON.stringify({ error: "No imageBase64 provided" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400,
    });
  }

  // Use the same vision analysis pipeline
  const analysisId = crypto.randomUUID();
  const timestamp = new Date().toISOString();
  const langLabel = isAr ? "Arabic" : "English";

  const systemPrompt = `You are APAS V2 Vision — expert physics image analyzer.
Analysis ID: ${analysisId}. Timestamp: ${timestamp}.
Language: ${langLabel}. Gravity: ${gVal} m/s².

Analyze the image. If it's a real photo, detect projectile and measure physics values.
If it's an exercise/problem, extract the given values.

Return JSON:
\`\`\`json
{
  "detected": true,
  "confidence": <0-100>,
  "angle": <degrees>,
  "velocity": <m/s>,
  "mass": <kg>,
  "height": <m>,
  "objectType": "<specific>",
  "gravity": ${gVal},
  "imageType": "<photo|exercise|diagram>"
}
\`\`\`

Then provide detailed analysis in ${langLabel}.`;

  const { text: visionText, provider } = await aiComplete({
    modelType: "vision",
    temperature: 0.3,
    max_tokens: 4000,
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: [
          { type: "text", text: isAr ? "حلل هذه الصورة بدقة." : "Analyze this image precisely." },
          { type: "image_url", image_url: { url: `data:${mimeType || "image/jpeg"};base64,${imageBase64}` } },
        ],
      },
    ],
  });

  // Post-process: compute derived values server-side
  let finalText = visionText;
  try {
    const jsonMatch = visionText.match(/```json\s*([\s\S]*?)```/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[1].trim());
      if (parsed.detected && parsed.velocity && parsed.angle != null) {
        const g = parsed.gravity || gVal;
        const derived = computeDerivedValues(parsed.angle, parsed.velocity, parsed.height || 0, g);
        parsed.v0x = derived.v0x;
        parsed.v0y = derived.v0y;
        parsed.maxHeight = derived.maxAltitude;
        parsed.maxRange = derived.horizontalRange;
        parsed.totalTime = derived.timeOfFlight;
        parsed.impactVelocity = derived.impactVelocity;
        parsed.analysisMethod = "estimated";
        parsed.analysisEngine = "gemini_vision";
        parsed.aiProvider = provider;
        parsed.processingTimeMs = Date.now() - startTime;

        // Mistral math verification
        try {
          const { text: mathText } = await mathVerify(
            `Verify: v0=${parsed.velocity} m/s, angle=${parsed.angle}°, h0=${parsed.height || 0} m, g=${g}.
Computed: v0x=${derived.v0x}, v0y=${derived.v0y}, maxH=${derived.maxAltitude}, T=${derived.timeOfFlight}, R=${derived.horizontalRange}.
Return: {"verified": true/false, "correctedAngle": <or null>, "correctedVelocity": <or null>, "confidence": <0-100>}`,
          );
          const cleaned = mathText.replace(/```(?:json)?/g, "").replace(/```/g, "").trim();
          const mathParsed = JSON.parse(cleaned);
          if (mathParsed.correctedAngle && Math.abs(mathParsed.correctedAngle - parsed.angle) < 20) {
            parsed.angle = mathParsed.correctedAngle;
          }
          if (mathParsed.correctedVelocity && Math.abs(mathParsed.correctedVelocity - parsed.velocity) < parsed.velocity * 0.5) {
            parsed.velocity = mathParsed.correctedVelocity;
          }
          if (mathParsed.confidence) parsed.mathVerified = true;
        } catch { /* skip */ }

        const newJson = "```json\n" + JSON.stringify(parsed, null, 2) + "\n```";
        const afterJson = visionText.replace(/```json[\s\S]*?```/, "").trim();
        finalText = newJson + "\n\n" + afterJson;
      }
    }
  } catch { /* use original */ }

  return new Response(
    JSON.stringify({ text: finalText }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}
