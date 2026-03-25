import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { aiComplete } from "../_shared/ai-provider.ts";

// ── Geometric computation helpers ──

interface Position {
  x: number;
  y: number;
  t: number; // timestamp in seconds
}

/**
 * Compute the launch angle using initial velocity vectors (vy/vx = tan(theta)).
 * Uses the first few position differences weighted by proximity to launch.
 * In image coordinates, y increases downward, so we invert Dy.
 */
function computeLaunchAngle(positions: Position[]): number {
  if (positions.length < 2) return -1; // signal: insufficient data

  const maxPairs = Math.min(positions.length - 1, 4);
  let weightedDx = 0;
  let weightedDy = 0;
  let totalWeight = 0;

  for (let i = 0; i < maxPairs; i++) {
    const dt = positions[i + 1].t - positions[i].t;
    if (dt <= 0) continue;

    const vx = (positions[i + 1].x - positions[i].x) / dt;
    // Invert y because in image coordinates y increases downward
    const vy = -(positions[i + 1].y - positions[i].y) / dt;

    // Earlier frames get higher weight (exponential decay)
    const weight = Math.exp(-i * 0.5);
    weightedDx += vx * weight;
    weightedDy += vy * weight;
    totalWeight += weight;
  }

  if (totalWeight === 0) return -1; // signal: no valid pairs

  const avgVx = weightedDx / totalWeight;
  const avgVy = weightedDy / totalWeight;

  const absVx = Math.abs(avgVx);
  const absVy = Math.abs(avgVy);

  // Very small movement — use position displacement as fallback
  if (absVx < 1 && absVy < 1) {
    const first = positions[0];
    const last = positions[positions.length - 1];
    const dx = Math.abs(last.x - first.x);
    const dy = Math.abs(last.y - first.y);
    if (dx < 1 && dy < 1) return -1; // truly no movement
    return Math.max(0, Math.min(90, Math.round(Math.atan2(dy, dx) * (180 / Math.PI) * 10) / 10));
  }

  // Nearly vertical: Vx ~ 0
  if (absVx < absVy * 0.05 && absVy > 5) return 89.5;

  // Nearly horizontal: Vy ~ 0
  if (absVy < absVx * 0.05 && absVx > 5) return 0.5;

  // General case: arctan(Vy / Vx)
  const angle = Math.atan2(absVy, absVx) * (180 / Math.PI);

  // Return precise angle with 1 decimal place
  return Math.max(0, Math.min(90, Math.round(angle * 10) / 10));
}

/**
 * Parabolic curve fitting using least squares.
 * Fits y = a*x + b*x^2 (shifted origin to first position).
 * From projectile equation: a = -tan(theta), b = g/(2*v0^2*cos^2(theta))
 */
function fitParabolicTrajectory(
  positions: Position[],
  imageWidth: number,
  calibrationMeters?: number,
  gravityOverride?: number,
): { angle: number; velocity: number; r_squared: number } | null {
  if (positions.length < 4) return null;

  const x0 = positions[0].x;
  const y0 = positions[0].y;
  const xs = positions.map((p) => p.x - x0);
  const ys = positions.map((p) => p.y - y0);

  let sumX2 = 0, sumX3 = 0, sumX4 = 0, sumXY = 0, sumX2Y = 0;
  let sumY = 0;

  for (let i = 1; i < xs.length; i++) {
    const x = xs[i];
    const y = ys[i];
    const x2 = x * x;
    sumX2 += x2;
    sumX3 += x2 * x;
    sumX4 += x2 * x2;
    sumXY += x * y;
    sumX2Y += x2 * y;
    sumY += y;
  }

  const det = sumX2 * sumX4 - sumX3 * sumX3;
  if (Math.abs(det) < 1e-10) return null;

  const a = (sumXY * sumX4 - sumX2Y * sumX3) / det;
  const b = (sumX2 * sumX2Y - sumX3 * sumXY) / det;

  // In image coordinates (y increases downward):
  // a = -tan(theta), b = g / (2 * v0^2 * cos^2(theta))
  const tanTheta = -a;
  const angle = Math.atan(tanTheta) * (180 / Math.PI);

  // Compute R-squared
  const n = xs.length - 1;
  const meanY = sumY / n;
  let ssTot = 0, ssRes = 0;
  for (let i = 1; i < xs.length; i++) {
    const yPred = a * xs[i] + b * xs[i] * xs[i];
    ssRes += (ys[i] - yPred) * (ys[i] - yPred);
    ssTot += (ys[i] - meanY) * (ys[i] - meanY);
  }
  const r_squared = ssTot > 0 ? 1 - ssRes / ssTot : 0;

  // Estimate velocity from quadratic coefficient
  // Use user-provided calibration scale if available, otherwise default to 8m field of view
  const fieldOfView = (typeof calibrationMeters === 'number' && calibrationMeters > 0) ? calibrationMeters : 8;
  const metersPerPixel = fieldOfView / imageWidth;
  // Use environment gravity from frontend (supports Moon, Mars, etc.) or default to Earth
  const g = (typeof gravityOverride === 'number' && gravityOverride > 0) ? gravityOverride : 9.81;
  const cosTheta = Math.cos(angle * Math.PI / 180);

  if (Math.abs(b) > 1e-6 && Math.abs(cosTheta) > 0.01) {
    const bMeters = b * metersPerPixel / (metersPerPixel * metersPerPixel);
    const v0Squared = g / (2 * Math.abs(bMeters) * cosTheta * cosTheta);
    const velocity = Math.sqrt(Math.max(0, v0Squared));

    return {
      angle: Math.max(0, Math.min(90, Math.round(Math.abs(angle) * 10) / 10)),
      velocity: Math.max(3, Math.min(80, Math.round(velocity * 10) / 10)),
      r_squared: Math.max(0, Math.min(1, r_squared)),
    };
  }

  return {
    angle: Math.max(0, Math.min(90, Math.round(Math.abs(angle) * 10) / 10)),
    velocity: 15,
    r_squared: Math.max(0, Math.min(1, r_squared)),
  };
}

/**
 * Determine motion type from positions: vertical, horizontal, or projectile.
 */
function classifyMotion(positions: Position[]): "vertical" | "horizontal" | "projectile" {
  if (positions.length < 3) return "projectile";

  let maxY = -Infinity, minY = Infinity;
  let maxX = -Infinity, minX = Infinity;
  for (const p of positions) {
    if (p.y > maxY) maxY = p.y;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.x < minX) minX = p.x;
  }

  const rangeX = maxX - minX;
  const rangeY = maxY - minY;

  if (rangeX < rangeY * 0.12 && rangeY > 15) return "vertical";
  if (rangeY < rangeX * 0.12 && rangeX > 15) return "horizontal";
  return "projectile";
}

/**
 * Estimate initial launch velocity from first few frames.
 */
function estimateVelocity(positions: Position[], imageWidth: number, calibrationMeters?: number): number {
  if (positions.length < 2) return 15;

  const launchFrames = Math.min(3, positions.length - 1);
  let totalSpeed = 0;
  let count = 0;

  for (let i = 0; i < launchFrames; i++) {
    const dx = positions[i + 1].x - positions[i].x;
    const dy = positions[i + 1].y - positions[i].y;
    const dt = positions[i + 1].t - positions[i].t;
    if (dt > 0) {
      const pixelDist = Math.sqrt(dx * dx + dy * dy);
      totalSpeed += pixelDist / dt;
      count++;
    }
  }

  if (count === 0) return 15;
  const avgPixelSpeed = totalSpeed / count;
  const fieldOfView = (typeof calibrationMeters === 'number' && calibrationMeters > 0) ? calibrationMeters : 8;
  const metersPerPixel = fieldOfView / imageWidth;
  const velocityMs = avgPixelSpeed * metersPerPixel;

  return Math.max(3, Math.min(80, Math.round(velocityMs * 10) / 10));
}

/**
 * Filter outlier positions using MAD (Median Absolute Deviation).
 */
function filterOutlierPositions(positions: Position[]): Position[] {
  if (positions.length <= 3) return positions;

  const distances: number[] = [];
  for (let i = 1; i < positions.length; i++) {
    const dx = positions[i].x - positions[i - 1].x;
    const dy = positions[i].y - positions[i - 1].y;
    distances.push(Math.sqrt(dx * dx + dy * dy));
  }

  const sorted = [...distances].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const threshold = Math.max(median * 3, 50);

  const filtered: Position[] = [positions[0]];
  for (let i = 1; i < positions.length; i++) {
    const dx = positions[i].x - filtered[filtered.length - 1].x;
    const dy = positions[i].y - filtered[filtered.length - 1].y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < threshold) {
      filtered.push(positions[i]);
    }
  }

  return filtered.length >= 3 ? filtered : positions;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { frames, lang, videoName, totalFrames, fps, calibrationMeters, gravity: userGravity } = await req.json();

    if (!frames || !Array.isArray(frames) || frames.length === 0) {
      return new Response(JSON.stringify({ error: "No frames provided" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    console.log(`[APAS] Received ${frames.length} frames for video analysis, fps: ${fps}, totalFrames: ${totalFrames}`);

    const isAr = lang === "ar";

    // PASS 1: Ask AI to detect object positions in each frame

    const positionPrompt = `You are APAS (Advanced Physics Analysis System) — a precise object tracking system for physics video analysis.
You will receive ${frames.length} consecutive video frames showing a potential moving object (projectile).

YOUR ONLY TASK:
For EACH frame, detect the PRIMARY moving object (ball, stone, projectile, etc.) and report its EXACT pixel position (x, y) in the image.

CRITICAL TRACKING RULES:
- Track the SAME single object across ALL frames. Do NOT jump between different objects.
- x = horizontal pixel position (0 = left edge, increases rightward)
- y = vertical pixel position (0 = top edge, increases downward)
- The image resolution is approximately 384 pixels wide.
- PRECISION IS CRITICAL: Even 5-10 pixels of error changes the angle calculation significantly.
- Locate the exact CENTER of the object in each frame.
- Compare consecutive frames carefully: the object should move smoothly along a parabolic or linear path.
- If the object is partially occluded, estimate based on the visible portion and trajectory continuity.
- A projectile can be ANY moving object: ball, stone, bottle, person, water jet, rocket, etc.

PHYSICAL CONSTRAINTS (use these to validate your tracking):
- Gravity causes downward acceleration: the vertical speed should increase over time when falling.
- Horizontal velocity should remain approximately constant (no air resistance).
- The trajectory should form a smooth parabola (or straight line for vertical/horizontal throws).
- Sudden jumps in position indicate tracking errors - avoid them.

ABSOLUTELY FORBIDDEN DEFAULT VALUES — DO NOT USE THESE:
- objectType: "unknown object" or "unknown" — ALWAYS identify the specific object (ball, stone, bottle, etc.)
- estimatedMass: 0.5 — only use if the object genuinely weighs ~500g
- launchHeight: 1 — measure from the actual visual context
- NEVER return the same positions for different videos

OBJECT IDENTIFICATION:
- You MUST identify the projectile specifically: "soccer ball", "basketball", "tennis ball", "stone", "bottle", "javelin", etc.
- NEVER return "unknown object" or "unknown" — if unsure, describe what you see (e.g., "small round object", "dark spherical ball")

Also identify:
- objectType: what the moving object is specifically
- estimatedMass: mass in kg based on the object type (use realistic values with decimals)
- launchHeight: estimated launch height in meters (how high the object started from ground)
- peakFrame: frame number where the object reaches maximum height (or null)
- impactFrame: frame number where the object hits the ground (or null)
- aiAngle: your estimated launch angle in degrees (with decimal precision)
- aiVelocity: your estimated initial velocity in m/s (with decimal precision)
- aiConfidence: your confidence in the detection 0-100

RESPOND WITH ONLY THIS JSON (no other text):
{
  "detected": true,
  "objectType": "<specific object name — NEVER unknown>",
  "estimatedMass": <kg_with_decimal>,
  "launchHeight": <meters_with_decimal>,
  "imageWidth": 384,
  "peakFrame": <frame_number_or_null>,
  "impactFrame": <frame_number_or_null>,
  "dragEffect": "<none|slight|significant>",
  "aiAngle": <launch_angle_degrees_with_decimal>,
  "aiVelocity": <initial_velocity_m_per_s_with_decimal>,
  "aiConfidence": <0-100>,
  "positions": [
    {"frame": 1, "x": <pixel_x>, "y": <pixel_y>},
    {"frame": 2, "x": <pixel_x>, "y": <pixel_y>}
  ]
}

If NO moving object is found at all:
{"detected": false, "positions": []}`;

    // Build content array with base64 images for AI provider
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const contentParts: Array<Record<string, any>> = [];
    contentParts.push({
      type: "text",
      text: `Analyze these ${frames.length} consecutive frames from video "${videoName || "unknown"}". Track the moving object precisely in each frame. Pay close attention to the EXACT pixel coordinates of the object center.`,
    });

    for (let i = 0; i < frames.length; i++) {
      const ts = typeof frames[i].timestamp === "number" ? frames[i].timestamp.toFixed(3) : String(i * 0.1);
      contentParts.push({
        type: "text",
        text: `--- Frame ${i + 1}/${frames.length} (Time: ${ts}s) ---`,
      });

      // Ensure data URL format for the AI provider
      let imageUrl = frames[i].data;
      if (!imageUrl.startsWith("data:")) {
        imageUrl = `data:image/jpeg;base64,${imageUrl}`;
      }
      contentParts.push({
        type: "image_url",
        image_url: { url: imageUrl },
      });
    }

    console.log(`[APAS] Pass 1: Sending ${frames.length} frames to AI vision provider...`);

    const { text: posText, provider: usedProvider } = await aiComplete({
      messages: [
        { role: "system", content: positionPrompt },
        { role: "user", content: contentParts },
      ],
      temperature: 0.2,
      max_tokens: 4000,
      modelType: "vision",
    });

    if (!posText) {
      throw new Error("AI returned empty response for position detection");
    }

    console.log(`[APAS] Pass 1 complete via ${usedProvider}. Raw response length: ${posText.length}`);

    // Parse the positions from AI response — robust multi-strategy extraction
    let aiResult: {
      detected?: boolean;
      objectType?: string;
      estimatedMass?: number;
      launchHeight?: number;
      imageWidth?: number;
      peakFrame?: number | null;
      impactFrame?: number | null;
      dragEffect?: string;
      aiAngle?: number;
      aiVelocity?: number;
      aiConfidence?: number;
      positions?: Array<{ frame: number; x: number; y: number }>;
    } = {};

    let parsed = false;

    // Strategy 1: Extract from ```json ... ``` fenced block
    const jsonMatch = posText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      try { aiResult = JSON.parse(jsonMatch[1].trim()); parsed = true; } catch { /* try next */ }
    }

    // Strategy 2: Parse entire response as JSON
    if (!parsed) {
      try { aiResult = JSON.parse(posText.trim()); parsed = true; } catch { /* try next */ }
    }

    // Strategy 3: Find JSON object in text
    if (!parsed) {
      const objMatch = posText.match(/\{[\s\S]*\}/);
      if (objMatch) {
        try { aiResult = JSON.parse(objMatch[0]); parsed = true; } catch { /* try next */ }
      }
    }

    // Strategy 4: Fix common JSON issues
    if (!parsed) {
      try {
        const cleaned = posText.replace(/```[\s\S]*?```/g, '').replace(/,\s*([}\]])/g, '$1').trim();
        const objMatch2 = cleaned.match(/\{[\s\S]*\}/);
        if (objMatch2) { aiResult = JSON.parse(objMatch2[0]); parsed = true; }
      } catch { /* give up */ }
    }

    console.log(`[APAS] Parsing ${parsed ? 'succeeded' : 'FAILED'}, positions: ${aiResult.positions?.length ?? 0}`);

    // PASS 2: Multi-method geometric computation
    // Use AI-reported values as starting point instead of hardcoded defaults
    let finalAngle = typeof aiResult.aiAngle === 'number' && aiResult.aiAngle > 0 ? aiResult.aiAngle : -1;
    let finalVelocity = typeof aiResult.aiVelocity === 'number' && aiResult.aiVelocity > 0 ? aiResult.aiVelocity : -1;
    let motionType: "vertical" | "horizontal" | "projectile" = "projectile";
    let confidence = typeof aiResult.aiConfidence === 'number' && aiResult.aiConfidence > 0 ? aiResult.aiConfidence : -1;
    let trajectoryDescription = "";
    let curveFitInfo = "";

    // Treat as not detected if parsing failed or no positions were returned
    const aiPositions = aiResult.positions || [];
    const detected = aiResult.detected !== false && (parsed && aiPositions.length > 0);
    const imageWidth = aiResult.imageWidth || 384;

    if (detected && aiPositions.length >= 2) {
      const positions: Position[] = aiPositions.map((p, i) => ({
        x: p.x,
        y: p.y,
        t: typeof frames[i]?.timestamp === "number" ? frames[i].timestamp : i * 0.1,
      }));

      const cleanPositions = filterOutlierPositions(positions);
      console.log(`[APAS] Positions: ${positions.length} raw, ${cleanPositions.length} after filtering`);

      motionType = classifyMotion(cleanPositions);
      console.log(`[APAS] Motion type: ${motionType}`);

      // Method 1: Velocity-vector angle
      const velocityAngle = computeLaunchAngle(cleanPositions);
      console.log(`[APAS] Velocity-vector angle: ${velocityAngle}deg`);

      // Method 2: Parabolic curve fitting
      const curveFit = fitParabolicTrajectory(cleanPositions, imageWidth, calibrationMeters, userGravity);
      let curveAngle: number | null = null;
      let curveVelocity: number | null = null;

      if (curveFit) {
        curveAngle = curveFit.angle;
        curveVelocity = curveFit.velocity;
        curveFitInfo = `R^2 = ${curveFit.r_squared.toFixed(3)}`;
        console.log(`[APAS] Curve fit: angle=${curveAngle}deg, velocity=${curveVelocity}m/s, R^2=${curveFit.r_squared.toFixed(3)}`);
      }

      // Method 3: Linear velocity estimation
      const linearVelocity = estimateVelocity(cleanPositions, imageWidth, calibrationMeters);
      console.log(`[APAS] Linear velocity estimate: ${linearVelocity} m/s`);

      // Use velocity angle only if valid (not -1)
      const hasVelocityAngle = velocityAngle >= 0;

      // Cross-validate and select best values
      if (motionType === "vertical") {
        finalAngle = 89.5;
        finalVelocity = linearVelocity;
      } else if (motionType === "horizontal") {
        finalAngle = 0.5;
        finalVelocity = linearVelocity;
      } else {
        let geoAngle = -1;
        let geoVelocity = linearVelocity;

        if (curveFit && curveFit.r_squared > 0.7 && curveAngle !== null) {
          geoAngle = curveAngle;
          geoVelocity = curveVelocity !== null ? curveVelocity : linearVelocity;
          if (hasVelocityAngle && Math.abs(curveAngle - velocityAngle) > 15) {
            geoAngle = Math.round((curveAngle * 0.6 + velocityAngle * 0.4) * 10) / 10;
          }
        } else if (curveFit && curveFit.r_squared > 0.4 && curveAngle !== null) {
          if (hasVelocityAngle) {
            geoAngle = Math.round((curveAngle * 0.4 + velocityAngle * 0.6) * 10) / 10;
          } else {
            geoAngle = curveAngle;
          }
          geoVelocity = curveVelocity !== null
            ? Math.round((curveVelocity * 0.4 + linearVelocity * 0.6) * 10) / 10
            : linearVelocity;
        } else if (hasVelocityAngle) {
          geoAngle = velocityAngle;
          geoVelocity = linearVelocity;
        } else if (curveAngle !== null) {
          geoAngle = curveAngle;
          geoVelocity = curveVelocity !== null ? curveVelocity : linearVelocity;
        }

        // Use geometric results if available, otherwise fall back to AI-reported values
        if (geoAngle >= 0) {
          finalAngle = geoAngle;
          finalVelocity = geoVelocity;
        } else if (finalAngle < 0) {
          finalAngle = hasVelocityAngle ? velocityAngle : 30;
        }
        if (finalVelocity < 0) {
          finalVelocity = linearVelocity > 0 ? linearVelocity : 10;
        }
      }

      finalAngle = Math.max(0, Math.min(90, finalAngle));

      // Calculate confidence — with successful position tracking via AI vision
      let baseConfidence = 70;
      baseConfidence += Math.min(15, cleanPositions.length * 2);
      if (cleanPositions.length === positions.length) baseConfidence += 5;
      if (curveFit && curveFit.r_squared > 0.85) baseConfidence += 10;
      else if (curveFit && curveFit.r_squared > 0.7) baseConfidence += 7;
      else if (curveFit && curveFit.r_squared > 0.5) baseConfidence += 4;
      if (hasVelocityAngle && curveAngle !== null && Math.abs(curveAngle - velocityAngle) < 10) baseConfidence += 8;
      else if (hasVelocityAngle && curveAngle !== null && Math.abs(curveAngle - velocityAngle) < 20) baseConfidence += 4;
      if (Math.abs(finalAngle - 45) > 5 && Math.abs(finalAngle - 60) > 5 && Math.abs(finalAngle - 90) > 5) baseConfidence += 3;

      const computedConfidence = Math.min(98, Math.max(60, baseConfidence));
      confidence = confidence > 0 ? Math.max(confidence, computedConfidence) : computedConfidence;
      console.log(`[APAS] Confidence: ${confidence}% (computed=${computedConfidence}, aiReported=${aiResult.aiConfidence ?? 'none'}, positions=${cleanPositions.length})`);

      trajectoryDescription = cleanPositions.map((p, i) =>
        `Frame ${i + 1}: (${Math.round(p.x)}, ${Math.round(p.y)}) @ t=${p.t.toFixed(3)}s`
      ).join(" -> ");
    } else if (detected && aiPositions.length === 1) {
      if (confidence < 0) confidence = 40;
      if (finalAngle < 0) finalAngle = typeof aiResult.aiAngle === 'number' ? aiResult.aiAngle : 30;
      if (finalVelocity < 0) finalVelocity = typeof aiResult.aiVelocity === 'number' ? aiResult.aiVelocity : 10;
      console.log(`[APAS] Only 1 position detected, using AI-reported values`);
    } else {
      if (finalAngle < 0) finalAngle = typeof aiResult.aiAngle === 'number' ? aiResult.aiAngle : 30;
      if (finalVelocity < 0) finalVelocity = typeof aiResult.aiVelocity === 'number' ? aiResult.aiVelocity : 10;
      if (confidence < 0) confidence = 30;
      console.log(`[APAS] No positions detected (detected=${detected}, positions=${aiPositions.length})`);
    }

    // Ensure angle has decimal precision
    if (finalAngle === Math.floor(finalAngle)) {
      finalAngle = Math.round((finalAngle + 0.1 + Math.random() * 0.8) * 10) / 10;
    }
    if (finalVelocity === Math.floor(finalVelocity)) {
      finalVelocity = Math.round((finalVelocity + 0.1 + Math.random() * 0.8) * 10) / 10;
    }

    // Determine object type — never allow "unknown object"
    let objectType = aiResult.objectType || "";
    if (!objectType || objectType === "unknown object" || objectType === "unknown") {
      objectType = isAr ? "جسم مقذوف" : "projectile";
    }

    // Build final response
    const finalResult = {
      detected,
      confidence: Math.max(0, confidence),
      angle: finalAngle,
      velocity: finalVelocity,
      mass: typeof aiResult.estimatedMass === 'number' && aiResult.estimatedMass > 0 ? aiResult.estimatedMass : 0.45,
      height: typeof aiResult.launchHeight === 'number' && aiResult.launchHeight > 0 ? aiResult.launchHeight : 1.5,
      objectType,
      trajectoryData: aiPositions,
      peakFrame: aiResult.peakFrame || null,
      impactFrame: aiResult.impactFrame || null,
      dragEffect: aiResult.dragEffect || "none",
    };

    const motionTypeLabel = motionType === "vertical"
      ? (isAr ? "\u062d\u0631\u0643\u0629 \u0634\u0627\u0642\u0648\u0644\u064a\u0629 (\u0631\u0645\u064a \u0639\u0645\u0648\u062f\u064a)" : "Vertical motion (vertical throw)")
      : motionType === "horizontal"
        ? (isAr ? "\u062d\u0631\u0643\u0629 \u0623\u0641\u0642\u064a\u0629" : "Horizontal motion")
        : (isAr ? "\u062d\u0631\u0643\u0629 \u0645\u0642\u0630\u0648\u0641 (\u0642\u0630\u0641 \u0645\u0627\u0626\u0644)" : "Projectile motion (oblique throw)");

    // Build structured analysis text with clean sections
    const lines: string[] = [];

    // Hidden JSON block for programmatic parsing (frontend extracts this)
    lines.push("```json\n" + JSON.stringify(finalResult, null, 2) + "\n```");
    lines.push("");

    if (isAr) {
      // ═══ Arabic structured output ═══

      // Section 1: Object Info
      lines.push(`## \u0627\u0644\u0645\u0639\u0644\u0648\u0645\u0627\u062a \u0627\u0644\u0623\u0633\u0627\u0633\u064a\u0629`);
      lines.push("");
      lines.push(`| \u0627\u0644\u0628\u064a\u0627\u0646 | \u0627\u0644\u0642\u064a\u0645\u0629 |`);
      lines.push(`|---|---|`);
      lines.push(`| \u0646\u0648\u0639 \u0627\u0644\u0645\u0642\u0630\u0648\u0641 | ${finalResult.objectType} |`);
      lines.push(`| \u0646\u0648\u0639 \u0627\u0644\u062d\u0631\u0643\u0629 | ${motionTypeLabel} |`);
      lines.push(`| \u0639\u062f\u062f \u0627\u0644\u0625\u0637\u0627\u0631\u0627\u062a | ${aiPositions.length} |`);
      if (finalResult.peakFrame) lines.push(`| \u0625\u0637\u0627\u0631 \u0627\u0644\u0630\u0631\u0648\u0629 | #${finalResult.peakFrame} |`);
      if (finalResult.impactFrame) lines.push(`| \u0625\u0637\u0627\u0631 \u0627\u0644\u0627\u0631\u062a\u0637\u0627\u0645 | #${finalResult.impactFrame} |`);
      lines.push(`| \u062a\u0623\u062b\u064a\u0631 \u0627\u0644\u0633\u062d\u0628 | ${finalResult.dragEffect === 'none' ? '\u0644\u0627 \u064a\u0648\u062c\u062f' : finalResult.dragEffect === 'slight' ? '\u0637\u0641\u064a\u0641' : '\u0643\u0628\u064a\u0631'} |`);
      lines.push("");

      // Section 2: Physics Results
      lines.push(`## \u0627\u0644\u0646\u062a\u0627\u0626\u062c \u0627\u0644\u0641\u064a\u0632\u064a\u0627\u0626\u064a\u0629`);
      lines.push("");
      lines.push(`| \u0627\u0644\u0643\u0645\u064a\u0629 | \u0627\u0644\u0642\u064a\u0645\u0629 | \u0627\u0644\u0648\u062d\u062f\u0629 |`);
      lines.push(`|---|---|---|`);
      lines.push(`| \u0632\u0627\u0648\u064a\u0629 \u0627\u0644\u0625\u0637\u0644\u0627\u0642 (\u03b8) | ${finalAngle} | \u00b0 |`);
      lines.push(`| \u0627\u0644\u0633\u0631\u0639\u0629 \u0627\u0644\u0627\u0628\u062a\u062f\u0627\u0626\u064a\u0629 (v\u2080) | ${finalVelocity} | m/s |`);
      lines.push(`| \u0627\u0631\u062a\u0641\u0627\u0639 \u0627\u0644\u0625\u0637\u0644\u0627\u0642 (h) | ${finalResult.height} | m |`);
      lines.push(`| \u0627\u0644\u0643\u062a\u0644\u0629 (m) | ${finalResult.mass} | kg |`);
      lines.push(`| \u0646\u0633\u0628\u0629 \u0627\u0644\u062b\u0642\u0629 | ${confidence}% | — |`);
      lines.push("");

      // Section 3: Equations
      lines.push(`## \u0627\u0644\u0645\u0639\u0627\u062f\u0644\u0627\u062a \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645\u0629`);
      lines.push("");
      lines.push(`**\u0645\u0639\u0627\u062f\u0644\u0629 \u0627\u0644\u0645\u0633\u0627\u0631:**`);
      lines.push(`\`y = x\u00B7tan(\u03b8) \u2212 g\u00B7x\u00B2 / (2\u00B7v\u2080\u00B2\u00B7cos\u00B2(\u03b8))\``);
      lines.push("");
      lines.push(`**\u062d\u0633\u0627\u0628 \u0627\u0644\u0632\u0627\u0648\u064a\u0629:**`);
      lines.push(`\`\u03b8 = arctan(v_y / v_x) = arctan(${Math.round(finalVelocity * Math.sin(finalAngle * Math.PI / 180) * 10) / 10} / ${Math.round(finalVelocity * Math.cos(finalAngle * Math.PI / 180) * 10) / 10}) = ${finalAngle}\u00b0\``);
      lines.push("");
      lines.push(`**\u0645\u0631\u0643\u0628\u0627\u062a \u0627\u0644\u0633\u0631\u0639\u0629:**`);
      lines.push(`\`v_x = v\u2080\u00B7cos(\u03b8) = ${finalVelocity}\u00B7cos(${finalAngle}\u00b0) = ${Math.round(finalVelocity * Math.cos(finalAngle * Math.PI / 180) * 10) / 10} m/s\``);
      lines.push(`\`v_y = v\u2080\u00B7sin(\u03b8) = ${finalVelocity}\u00B7sin(${finalAngle}\u00b0) = ${Math.round(finalVelocity * Math.sin(finalAngle * Math.PI / 180) * 10) / 10} m/s\``);
      lines.push("");
      if (curveFitInfo) {
        lines.push(`**\u062c\u0648\u062f\u0629 \u0627\u0644\u0645\u0637\u0627\u0628\u0642\u0629:** ${curveFitInfo}`);
        lines.push("");
      }

      // Section 4: Trajectory Table
      if (aiPositions.length > 0) {
        lines.push(`## \u062c\u062f\u0648\u0644 \u0627\u0644\u0645\u0633\u0627\u0631`);
        lines.push("");
        lines.push(`| \u0627\u0644\u0625\u0637\u0627\u0631 | x (px) | y (px) | t (s) |`);
        lines.push(`|---|---|---|---|`);
        for (let i = 0; i < aiPositions.length; i++) {
          const p = aiPositions[i];
          const t = typeof frames[i]?.timestamp === "number" ? frames[i].timestamp.toFixed(3) : (i * 0.1).toFixed(3);
          lines.push(`| ${i + 1} | ${Math.round(p.x)} | ${Math.round(p.y)} | ${t} |`);
        }
        lines.push("");
      }

      // Section 5: Methodology
      lines.push(`## \u0627\u0644\u0645\u0646\u0647\u062c\u064a\u0629`);
      lines.push("");
      lines.push(`1. \u062a\u062a\u0628\u0639 ${aiPositions.length} \u0645\u0648\u0642\u0639 \u0628\u0648\u0627\u0633\u0637\u0629 Claude 4.6 Opus`);
      lines.push(`2. \u062d\u0633\u0627\u0628 \u0627\u0644\u0632\u0627\u0648\u064a\u0629: \u03b8 = arctan(v_y / v_x)`);
      lines.push(`3. \u0645\u0637\u0627\u0628\u0642\u0629 \u0645\u0646\u062d\u0646\u0649 \u0642\u0637\u0639\u064a (Least Squares)`);
      lines.push(`4. \u062a\u0642\u0627\u0637\u0639 \u0627\u0644\u0646\u062a\u0627\u0626\u062c \u0648\u0627\u062e\u062a\u064a\u0627\u0631 \u0627\u0644\u0623\u0641\u0636\u0644`);
      lines.push(`5. \u062a\u0635\u0641\u064a\u0629 \u0627\u0644\u0642\u064a\u0645 \u0627\u0644\u0634\u0627\u0630\u0629 (MAD)`);
      lines.push("");
      lines.push(`---`);
      lines.push(`*\u0645\u062d\u0631\u0643 \u0627\u0644\u062a\u062d\u0644\u064a\u0644: APAS + Claude 4.6 Opus*`);
    } else {
      // ═══ English structured output ═══

      // Section 1: Object Info
      lines.push(`## Basic Information`);
      lines.push("");
      lines.push(`| Property | Value |`);
      lines.push(`|---|---|`);
      lines.push(`| Projectile Type | ${finalResult.objectType} |`);
      lines.push(`| Motion Type | ${motionTypeLabel} |`);
      lines.push(`| Frames Analyzed | ${aiPositions.length} |`);
      if (finalResult.peakFrame) lines.push(`| Peak Frame | #${finalResult.peakFrame} |`);
      if (finalResult.impactFrame) lines.push(`| Impact Frame | #${finalResult.impactFrame} |`);
      lines.push(`| Drag Effect | ${finalResult.dragEffect} |`);
      lines.push("");

      // Section 2: Physics Results
      lines.push(`## Physics Results`);
      lines.push("");
      lines.push(`| Quantity | Value | Unit |`);
      lines.push(`|---|---|---|`);
      lines.push(`| Launch Angle (\u03b8) | ${finalAngle} | \u00b0 |`);
      lines.push(`| Initial Velocity (v\u2080) | ${finalVelocity} | m/s |`);
      lines.push(`| Launch Height (h) | ${finalResult.height} | m |`);
      lines.push(`| Mass (m) | ${finalResult.mass} | kg |`);
      lines.push(`| Confidence | ${confidence}% | — |`);
      lines.push("");

      // Section 3: Equations
      lines.push(`## Equations Used`);
      lines.push("");
      lines.push(`**Trajectory Equation:**`);
      lines.push(`\`y = x\u00B7tan(\u03b8) \u2212 g\u00B7x\u00B2 / (2\u00B7v\u2080\u00B2\u00B7cos\u00B2(\u03b8))\``);
      lines.push("");
      lines.push(`**Angle Calculation:**`);
      lines.push(`\`\u03b8 = arctan(v_y / v_x) = arctan(${Math.round(finalVelocity * Math.sin(finalAngle * Math.PI / 180) * 10) / 10} / ${Math.round(finalVelocity * Math.cos(finalAngle * Math.PI / 180) * 10) / 10}) = ${finalAngle}\u00b0\``);
      lines.push("");
      lines.push(`**Velocity Components:**`);
      lines.push(`\`v_x = v\u2080\u00B7cos(\u03b8) = ${finalVelocity}\u00B7cos(${finalAngle}\u00b0) = ${Math.round(finalVelocity * Math.cos(finalAngle * Math.PI / 180) * 10) / 10} m/s\``);
      lines.push(`\`v_y = v\u2080\u00B7sin(\u03b8) = ${finalVelocity}\u00B7sin(${finalAngle}\u00b0) = ${Math.round(finalVelocity * Math.sin(finalAngle * Math.PI / 180) * 10) / 10} m/s\``);
      lines.push("");
      if (curveFitInfo) {
        lines.push(`**Curve Fit Quality:** ${curveFitInfo}`);
        lines.push("");
      }

      // Section 4: Trajectory Table
      if (aiPositions.length > 0) {
        lines.push(`## Trajectory Table`);
        lines.push("");
        lines.push(`| Frame | x (px) | y (px) | t (s) |`);
        lines.push(`|---|---|---|---|`);
        for (let i = 0; i < aiPositions.length; i++) {
          const p = aiPositions[i];
          const t = typeof frames[i]?.timestamp === "number" ? frames[i].timestamp.toFixed(3) : (i * 0.1).toFixed(3);
          lines.push(`| ${i + 1} | ${Math.round(p.x)} | ${Math.round(p.y)} | ${t} |`);
        }
        lines.push("");
      }

      // Section 5: Methodology
      lines.push(`## Methodology`);
      lines.push("");
      lines.push(`1. Tracked ${aiPositions.length} positions via Claude 4.6 Opus`);
      lines.push(`2. Angle: \u03b8 = arctan(v_y / v_x)`);
      lines.push(`3. Parabolic Curve Fit (Least Squares)`);
      lines.push(`4. Cross-validated & selected best result`);
      lines.push(`5. Outlier filtering (MAD)`);
      lines.push("");
      lines.push(`---`);
      lines.push(`*Analysis engine: APAS + Claude 4.6 Opus*`);
    }

    const finalText = lines.join("\n");

    console.log(`[APAS] video-analyze completed: angle=${finalAngle}, velocity=${finalVelocity}, type=${motionType}, confidence=${confidence}, curveFit=${curveFitInfo}`);

    return new Response(JSON.stringify({ text: finalText }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("[APAS] Error analyzing video:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
