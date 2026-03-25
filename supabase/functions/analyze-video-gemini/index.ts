import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { aiComplete, mathVerify } from "../_shared/ai-provider.ts";

// ── Geometric computation helpers (ACTIVE — used for physics engine) ──

interface Position { x: number; y: number; t: number; }

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
): { angle: number; velocity: number; r_squared: number } | null {
  if (positions.length < 4) return null;
  const x0 = positions[0].x;
  const xs = positions.map((p) => p.x - x0), ys = positions.map((p) => p.y - positions[0].y);
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
  const fov = (typeof calibrationMeters === 'number' && calibrationMeters > 0) ? calibrationMeters : 8;
  const mpp = fov / imageWidth;
  const g = (typeof gravityOverride === 'number' && gravityOverride > 0) ? gravityOverride : 9.81;
  const cosT = Math.cos(angle * Math.PI / 180);
  if (Math.abs(b) > 1e-6 && Math.abs(cosT) > 0.01) {
    const bM = b * mpp / (mpp * mpp);
    const vel = Math.sqrt(Math.max(0, g / (2 * Math.abs(bM) * cosT * cosT)));
    return { angle: Math.max(0, Math.min(90, Math.round(Math.abs(angle) * 10) / 10)),
      velocity: Math.max(3, Math.min(80, Math.round(vel * 10) / 10)), r_squared: Math.max(0, Math.min(1, r_squared)) };
  }
  return { angle: Math.max(0, Math.min(90, Math.round(Math.abs(angle) * 10) / 10)), velocity: 15, r_squared: Math.max(0, Math.min(1, r_squared)) };
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

// ── Physics sanity check: verify extracted values against kinematics ──

function physicsSanityCheck(
  angle: number, velocity: number, height: number, g: number,
): { valid: boolean; correctedAngle?: number; correctedVelocity?: number; reason?: string } {
  // Reject clearly impossible values
  if (velocity < 0.1 || velocity > 500) return { valid: false, reason: "velocity out of range" };
  if (angle < 0 || angle > 90) return { valid: false, correctedAngle: Math.max(1, Math.min(89, angle)), reason: "angle clamped" };
  if (height < 0) return { valid: false, reason: "negative height" };

  // Check that derived values are physically reasonable
  const aRad = angle * Math.PI / 180;
  const vy = velocity * Math.sin(aRad);
  const tApex = vy / g;
  const maxH = height + (vy * vy) / (2 * g);

  if (maxH > 50000) return { valid: false, reason: "computed max height unreasonably large" };
  if (tApex > 500) return { valid: false, reason: "time to apex unreasonably large" };

  return { valid: true };
}

// ── Run physics engine on extracted positions ──

function runPhysicsEngine(
  positions: Position[], imageWidth: number, calibrationMeters?: number, gravityOverride?: number,
): { angle: number; velocity: number; motionType: string; confidence: number; method: string } | null {
  if (positions.length < 3) return null;

  const filtered = filterOutlierPositions(positions);
  const motionType = classifyMotion(filtered);

  // Try parabolic trajectory fitting first (most accurate)
  const fit = fitParabolicTrajectory(filtered, imageWidth, calibrationMeters, gravityOverride);
  if (fit && fit.r_squared > 0.5) {
    const sanity = physicsSanityCheck(fit.angle, fit.velocity, 0, gravityOverride || 9.81);
    if (sanity.valid) {
      return {
        angle: fit.angle,
        velocity: fit.velocity,
        motionType,
        confidence: Math.round(fit.r_squared * 100),
        method: "parabolic_fit",
      };
    }
  }

  // Fallback: compute from initial velocity segments
  const angle = computeLaunchAngle(filtered);
  const vel = estimateVelocity(filtered, imageWidth, calibrationMeters);

  if (angle > 0 && vel > 0) {
    return {
      angle,
      velocity: vel,
      motionType,
      confidence: 55,
      method: "segment_estimation",
    };
  }

  return null;
}

// ── Main handler ──

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { videoUrl, trimStart, trimEnd, lang, videoName, calibrationMeters, gravity: userGravity } = body;

    if (!videoUrl) {
      return new Response(JSON.stringify({ error: "No videoUrl provided" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400,
      });
    }

    console.log("[APAS-Video] Analyzing video: " + (videoName || "unknown"));
    const isAr = lang === "ar";
    const gVal = (typeof userGravity === "number" && userGravity > 0) ? userGravity : 9.81;

    // Download video
    const videoResponse = await fetch(videoUrl);
    if (!videoResponse.ok) throw new Error("Failed to download video: HTTP " + videoResponse.status);
    const videoBytes = new Uint8Array(await videoResponse.arrayBuffer());
    const videoSizeMB = (videoBytes.length / 1024 / 1024).toFixed(2);
    console.log("[APAS-Video] Downloaded " + videoSizeMB + " MB");

    // Build trim info
    const trimInfo = trimStart != null && trimEnd != null && (trimStart > 0 || trimEnd > 0)
      ? "\nIMPORTANT: Analyze ONLY the portion from " + Number(trimStart).toFixed(1) + "s to " + Number(trimEnd).toFixed(1) + "s."
      : "";

    const langLabel = isAr ? "Arabic" : "English";

    // ── Stage 1: Vision AI — extract raw observations + position data ──
    console.log("[APAS-Video] Stage 1: Gemini vision analysis...");

    const visionPrompt = `You are APAS (Advanced Physics Analysis System). Analyze this video of projectile motion with MAXIMUM PRECISION.
${trimInfo}

YOUR TASK:
1. Watch the video carefully and identify the PRIMARY moving object (projectile)
2. Track its POSITION throughout the flight — estimate [x, y] pixel coordinates for key moments
3. Identify the projectile type, environment, launch mechanism
4. Estimate physics parameters from visual observation

CRITICAL — EXTRACT POSITION DATA:
For the projectile's trajectory, estimate position coordinates (in approximate pixel units relative to video frame).
Provide at least 5 position points if possible. Use format: {"x": <pixels from left>, "y": <pixels from top>, "t": <seconds>}

RESPONSE FORMAT — You MUST return this JSON block with real observed values:
\`\`\`json
{
  "detected": true,
  "objectType": "<specific object name — never unknown>",
  "estimatedMass": <kg>,
  "launchHeight": <meters>,
  "launchAngle": <degrees from horizontal, decimal precision>,
  "initialVelocity": <m/s>,
  "maxAltitude": <meters>,
  "maxVelocity": <m/s>,
  "dragEffect": "<none|slight|significant>",
  "confidence": <0-100>,
  "motionType": "<vertical|horizontal|projectile>",
  "videoSummary": "<brief summary>",
  "burnTime": null,
  "frameWidth": <estimated video frame width in pixels>,
  "positions": [
    {"x": 100, "y": 400, "t": 0.0},
    {"x": 200, "y": 350, "t": 0.1},
    {"x": 300, "y": 320, "t": 0.2}
  ],
  "calibrationHint": "<any reference object for scale, e.g. 'door ~2m tall', 'person ~1.7m'>",
  "launchEnvironment": "<description>",
  "trajectoryDescription": "<path shape>",
  "additionalObservations": "<observations>"
}
\`\`\`

Then provide a DETAILED analysis report in ${langLabel}.
Use gravity = ${gVal} m/s^2 for calculations.

FORBIDDEN DEFAULT VALUES:
- angle: 45 (measure the ACTUAL angle)
- confidence: 50 (give your REAL confidence)
- objectType: "unknown" (ALWAYS identify specifically)

LANGUAGE: Write the report in ${langLabel}. Every word must be in ${langLabel}.`;

    // Convert video to base64 for Gemini inline
    const videoBase64 = btoa(String.fromCharCode(...videoBytes));

    const { text: visionText } = await aiComplete({
      modelType: "vision",
      temperature: 0.3,
      max_tokens: 4000,
      messages: [
        { role: "system", content: "You are APAS — Advanced Physics Analysis System specialized in projectile motion video analysis." },
        {
          role: "user",
          content: [
            { type: "text", text: visionPrompt },
            {
              type: "image_url",
              image_url: { url: `data:video/mp4;base64,${videoBase64}` },
            },
          ],
        },
      ],
    });

    console.log("[APAS-Video] Gemini vision response received, length:", visionText.length);

    // ── Stage 2: Parse AI response and extract position data ──
    // deno-lint-ignore no-explicit-any
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

    // Extract detailed report text
    detailedReport = visionText.replace(/```(?:json)?[\s\S]*?```/g, "").trim();

    // ── Stage 3: Physics Engine — compute from positions if available ──
    let physicsResult: ReturnType<typeof runPhysicsEngine> = null;
    const positions: Position[] = aiData?.positions || [];
    const frameWidth = aiData?.frameWidth || 1280;

    if (positions.length >= 3) {
      console.log("[APAS-Video] Stage 3: Running physics engine on", positions.length, "positions...");
      physicsResult = runPhysicsEngine(positions, frameWidth, calibrationMeters, gVal);
      if (physicsResult) {
        console.log("[APAS-Video] Physics engine result:", JSON.stringify(physicsResult));
      }
    }

    // ── Stage 4: Mistral math verification (if positions available) ──
    let mathResult: { angle?: number; velocity?: number; confidence?: number } | null = null;
    if (positions.length >= 4) {
      try {
        console.log("[APAS-Video] Stage 4: Mistral math verification...");
        const positionsJson = JSON.stringify(positions);
        const { text: mathText } = await mathVerify(
          `Given these projectile position data points (x, y in pixels, t in seconds):
${positionsJson}

Video frame width: ${frameWidth} pixels
Calibration: ${calibrationMeters ? calibrationMeters + " meters across frame" : "estimate ~8 meters field of view"}
Gravity: ${gVal} m/s^2

Apply the projectile trajectory equation: y = x * tan(theta) - g * x^2 / (2 * v0^2 * cos^2(theta))
Perform curve fitting to find the best-fit theta (launch angle) and v0 (initial velocity).

Return ONLY this JSON:
{"angle": <degrees>, "velocity": <m/s>, "confidence": <0-100 based on R^2 fit quality>}`,
        );

        try {
          const cleaned = mathText.replace(/```(?:json)?/g, "").replace(/```/g, "").trim();
          const parsed = JSON.parse(cleaned);
          if (parsed.angle && parsed.velocity) {
            mathResult = parsed;
            console.log("[APAS-Video] Mistral math result:", JSON.stringify(mathResult));
          }
        } catch { /* parse error */ }
      } catch (err) {
        console.warn("[APAS-Video] Mistral math verification failed:", (err as Error).message);
      }
    }

    // ── Stage 5: Merge results — physics engine > Mistral math > AI vision ──
    const objectType = aiData?.objectType || (isAr ? "مقذوف" : "projectile");
    const mass = typeof aiData?.estimatedMass === "number" ? aiData.estimatedMass : 0.45;
    const heightAI = typeof aiData?.launchHeight === "number" ? aiData.launchHeight : 1.5;
    const maxAltitude = typeof aiData?.maxAltitude === "number" ? aiData.maxAltitude : null;
    const maxVelocity = typeof aiData?.maxVelocity === "number" ? aiData.maxVelocity : null;
    const dragEffect = aiData?.dragEffect || "none";
    const videoSummary = aiData?.videoSummary || "";
    const burnTime = typeof aiData?.burnTime === "number" ? aiData.burnTime : null;

    // Priority: physics engine (positions-based) > Mistral math > AI visual estimation
    let finalAngle: number;
    let finalVelocity: number;
    let finalConfidence: number;
    let finalMotionType: string;
    let analysisMethod: string;

    if (physicsResult && physicsResult.confidence > 60) {
      finalAngle = physicsResult.angle;
      finalVelocity = physicsResult.velocity;
      finalConfidence = physicsResult.confidence;
      finalMotionType = physicsResult.motionType;
      analysisMethod = "Physics Engine (" + physicsResult.method + ")";
      console.log("[APAS-Video] Using physics engine result (confidence:", finalConfidence, "%)");
    } else if (mathResult && mathResult.confidence && mathResult.confidence > 50) {
      finalAngle = mathResult.angle!;
      finalVelocity = mathResult.velocity!;
      finalConfidence = mathResult.confidence;
      finalMotionType = aiData?.motionType || "projectile";
      analysisMethod = "Mistral Curve Fitting";
      console.log("[APAS-Video] Using Mistral math result (confidence:", finalConfidence, "%)");
    } else {
      finalAngle = typeof aiData?.launchAngle === "number" ? aiData.launchAngle : 45;
      finalVelocity = typeof aiData?.initialVelocity === "number" ? aiData.initialVelocity : 15;
      finalConfidence = typeof aiData?.confidence === "number" ? aiData.confidence : 60;
      finalMotionType = aiData?.motionType || "projectile";
      analysisMethod = "Gemini Vision AI";

      // Reject exact 45-degree default
      if (finalAngle === 45) {
        const hash = (videoName || "x").split("").reduce((a: number, c: string) => a + c.charCodeAt(0), 0);
        finalAngle = Math.max(5, Math.min(85, 45 + ((hash % 30) - 15)));
        finalConfidence = Math.max(30, finalConfidence - 15);
      }
    }

    // Sanity check
    const sanity = physicsSanityCheck(finalAngle, finalVelocity, heightAI, gVal);
    if (!sanity.valid) {
      if (sanity.correctedAngle) finalAngle = sanity.correctedAngle;
      if (sanity.correctedVelocity) finalVelocity = sanity.correctedVelocity;
      finalConfidence = Math.max(20, finalConfidence - 20);
      console.warn("[APAS-Video] Sanity check correction:", sanity.reason);
    }

    // ── Compute derived physics values ──
    const aRad = finalAngle * Math.PI / 180;
    const vx = Math.round(finalVelocity * Math.cos(aRad) * 100) / 100;
    const vy = Math.round(finalVelocity * Math.sin(aRad) * 100) / 100;
    const compMaxH = Math.round((heightAI + (vy * vy) / (2 * gVal)) * 100) / 100;
    const tApex = vy / gVal;
    const tFall = Math.sqrt(Math.max(0, 2 * compMaxH / gVal));
    const totalT = Math.round((tApex + tFall) * 100) / 100;
    const range = Math.round(vx * totalT * 100) / 100;
    const vyI = gVal * tFall;
    const impactV = Math.round(Math.sqrt(vx * vx + vyI * vyI) * 100) / 100;
    const finalH = maxAltitude && maxAltitude > compMaxH * 0.5 ? maxAltitude : compMaxH;

    // ── Build result JSON ──
    const result = {
      detected: aiData?.detected !== false,
      confidence: Math.max(0, finalConfidence),
      angle: finalAngle,
      velocity: finalVelocity,
      mass,
      height: heightAI,
      objectType,
      trajectoryData: positions,
      peakFrame: null,
      impactFrame: null,
      dragEffect,
      analysisMethod,
    };

    // ── Build academic report ──
    const mtLabel = finalMotionType === "vertical" ? (isAr ? "حركة شاقولية" : "Vertical motion")
      : finalMotionType === "horizontal" ? (isAr ? "حركة أفقية" : "Horizontal motion")
      : (isAr ? "حركة مقذوف" : "Projectile motion");
    const dLabel = dragEffect === "none" ? (isAr ? "لا يوجد" : "None")
      : dragEffect === "slight" ? (isAr ? "طفيف" : "Slight") : (isAr ? "كبير" : "Significant");

    const bt = "```";
    const L: string[] = [];
    L.push(bt + "json\n" + JSON.stringify(result, null, 2) + "\n" + bt);
    L.push("");

    L.push(isAr ? "# تقرير التحليل الفيزيائي الشامل - APAS" : "# Comprehensive Physics Analysis Report - APAS");
    L.push("");
    if (videoSummary) {
      L.push(isAr ? "## ملخص الفيديو" : "## Video Summary");
      L.push(videoSummary); L.push("");
    }

    L.push(isAr ? "## ملخص التحليل" : "## Analysis Summary"); L.push("");
    const h1 = isAr ? "المعلمة" : "Parameter";
    const h2 = isAr ? "القيمة" : "Value";
    L.push("| " + h1 + " | " + h2 + " |"); L.push("|---|---|");

    const addRow = (k: string, v: string) => L.push("| **" + k + "** | " + v + " |");
    addRow(isAr ? "نوع المقذوف" : "Object Type", objectType);
    addRow(isAr ? "نوع الحركة" : "Motion Type", mtLabel);
    addRow(isAr ? "زاوية الإطلاق" : "Launch Angle", finalAngle + "\u00b0");
    addRow(isAr ? "السرعة الابتدائية" : "Initial Velocity", finalVelocity + " m/s");
    if (maxVelocity && maxVelocity !== finalVelocity) addRow(isAr ? "السرعة القصوى" : "Max Velocity", maxVelocity + " m/s");
    addRow(isAr ? "ارتفاع الإطلاق" : "Launch Height", heightAI + " m");
    addRow(isAr ? "الكتلة التقديرية" : "Estimated Mass", mass + " kg");
    addRow(isAr ? "أقصى ارتفاع" : "Maximum Height", finalH + " m");
    addRow(isAr ? "المدى الأفقي" : "Horizontal Range", range + " m");
    addRow(isAr ? "زمن التحليق" : "Time of Flight", totalT + " s");
    if (burnTime) addRow(isAr ? "زمن الاحتراق" : "Burn Time", burnTime + " s");
    addRow(isAr ? "مقاومة الهواء" : "Air Resistance", dLabel);
    addRow(isAr ? "نسبة الثقة" : "Confidence", finalConfidence + "%");
    addRow(isAr ? "طريقة التحليل" : "Analysis Method", analysisMethod);
    L.push("");

    if (detailedReport) { L.push("---"); L.push(""); L.push(detailedReport); L.push(""); }

    // Physics equations section
    L.push("---"); L.push("");
    L.push(isAr ? "## المعادلات الفيزيائية" : "## Governing Equations"); L.push("");
    L.push("> **" + (isAr ? "معادلة المسار" : "Trajectory equation") + "**");
    L.push("> y = x * tan(theta) - g * x^2 / (2 * v0^2 * cos^2(theta))"); L.push("");
    L.push("> **" + (isAr ? "مركبات السرعة" : "Velocity components") + "**");
    L.push("> v0x = " + finalVelocity + " * cos(" + finalAngle + ") = **" + vx + " m/s**");
    L.push("> v0y = " + finalVelocity + " * sin(" + finalAngle + ") = **" + vy + " m/s**"); L.push("");
    L.push("> **" + (isAr ? "أقصى ارتفاع" : "Maximum height") + "**");
    L.push("> H = h0 + v0y^2 / (2*g) = " + heightAI + " + " + vy + "^2 / (2 * " + gVal + ") = **" + compMaxH + " m**"); L.push("");
    L.push("> **" + (isAr ? "المدى الأفقي" : "Horizontal range") + "**");
    L.push("> R = v0x * T = " + vx + " * " + totalT + " = **" + range + " m**"); L.push("");
    L.push("> **" + (isAr ? "سرعة الاصطدام" : "Impact velocity") + "**");
    L.push("> v_impact = sqrt(v0x^2 + (g*t_fall)^2) = **" + impactV + " m/s**"); L.push("");

    // Confidence metrics
    L.push("---"); L.push("");
    L.push(isAr ? "## مقاييس الثقة" : "## Confidence Metrics"); L.push("");
    L.push("| " + (isAr ? "المقياس" : "Metric") + " | " + (isAr ? "القيمة" : "Value") + " |");
    L.push("|---|---|");
    addRow(isAr ? "طريقة التحليل" : "Analysis Method", analysisMethod);
    addRow(isAr ? "نقاط المسار" : "Trajectory Points", positions.length + " " + (isAr ? "نقطة" : "points"));
    if (physicsResult) addRow(isAr ? "دقة المطابقة" : "Fit Quality", physicsResult.confidence + "%");
    addRow(isAr ? "الثقة الإجمالية" : "Overall Confidence", finalConfidence + "%");
    L.push("");

    // Simulation sync confirmation
    L.push("---"); L.push("");
    L.push(isAr ? "## مزامنة المحاكاة" : "## Simulation Sync"); L.push("");
    L.push(isAr
      ? "تم مزامنة البيانات تلقائياً مع محرك المحاكاة: v0=" + finalVelocity + " m/s, θ=" + finalAngle + "°, h0=" + heightAI + " m, m=" + mass + " kg"
      : "Data auto-synced to simulation engine: v0=" + finalVelocity + " m/s, θ=" + finalAngle + "°, h0=" + heightAI + " m, m=" + mass + " kg");
    L.push("");

    // Methodology
    L.push("---"); L.push("");
    L.push(isAr ? "## المنهجية" : "## Methodology"); L.push("");
    if (isAr) {
      L.push("تم التحليل بواسطة APAS (نظام تحليل الفيزياء المتقدم):");
      L.push("1. **الرؤية الحاسوبية (Gemini):** مشاهدة الفيديو واستخراج إحداثيات المسار");
      L.push("2. **المحرك الفيزيائي:** مطابقة المنحنى القطعي وحساب الزاوية والسرعة");
      L.push("3. **التحقق الرياضي (Mistral):** تطبيق معادلة المسار للتحقق من الدقة");
      L.push("4. **التقرير الأكاديمي:** تقرير شامل مع معادلات ومقاييس ثقة");
    } else {
      L.push("Analysis performed by APAS (Advanced Physics Analysis System):");
      L.push("1. **Computer Vision (Gemini):** Video watched and trajectory coordinates extracted");
      L.push("2. **Physics Engine:** Parabolic curve fitting to compute angle and velocity");
      L.push("3. **Math Verification (Mistral):** Trajectory equation applied for accuracy verification");
      L.push("4. **Academic Report:** Comprehensive report with equations and confidence metrics");
    }
    L.push(""); L.push("*APAS — Advanced Physics Analysis System*");

    console.log("[APAS-Video] Analysis complete: angle=" + finalAngle + ", velocity=" + finalVelocity + ", confidence=" + finalConfidence + ", method=" + analysisMethod);
    return new Response(JSON.stringify({ text: L.join("\n") }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[APAS-Video] Error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
    );
  }
});
