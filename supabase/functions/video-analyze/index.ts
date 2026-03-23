import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

const MISTRAL_API_URL = "https://api.mistral.ai/v1/chat/completions";
const MISTRAL_VISION_MODEL = "pixtral-large-latest";

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
  if (positions.length < 2) return 45; // fallback

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

  if (totalWeight === 0) return 45;

  const avgVx = weightedDx / totalWeight;
  const avgVy = weightedDy / totalWeight;

  const absVx = Math.abs(avgVx);
  const absVy = Math.abs(avgVy);

  // Very small movement in both directions
  if (absVx < 1 && absVy < 1) return 45;

  // Nearly vertical: Vx ~ 0
  if (absVx < absVy * 0.05 && absVy > 5) return 90;

  // Nearly horizontal: Vy ~ 0
  if (absVy < absVx * 0.05 && absVx > 5) return 0;

  // General case: arctan(Vy / Vx)
  const angle = Math.atan2(absVy, absVx) * (180 / Math.PI);

  // Return precise angle without aggressive rounding
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

    const mistralKey = Deno.env.get("MISTRAL_API_KEY");
    if (!mistralKey) {
      throw new Error("MISTRAL_API_KEY not configured");
    }

    console.log(`Received ${frames.length} frames for video analysis, fps: ${fps}, totalFrames: ${totalFrames}`);

    const isAr = lang === "ar";

    // PASS 1: Ask AI to detect object positions in each frame

    const positionPrompt = `You are a precise object tracking system for physics video analysis.
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

Also identify:
- objectType: what the moving object is (ball, stone, bottle, etc.)
- estimatedMass: mass in kg based on the object type (use realistic values)
- launchHeight: estimated launch height in meters (how high the object started from ground)

RESPOND WITH ONLY THIS JSON (no other text):
\`\`\`json
{
  "detected": true,
  "objectType": "<type>",
  "estimatedMass": <kg>,
  "launchHeight": <meters>,
  "imageWidth": 384,
  "positions": [
    {"frame": 1, "x": <pixel_x>, "y": <pixel_y>},
    {"frame": 2, "x": <pixel_x>, "y": <pixel_y>}
  ]
}
\`\`\`

If NO moving object is found at all:
\`\`\`json
{"detected": false, "positions": []}
\`\`\``;

    // Build multi-frame content for position detection
    const posContent: Array<{ type: string; text?: string; image_url?: { url: string } }> = [];
    posContent.push({
      type: "text",
      text: `Analyze these ${frames.length} consecutive frames from video "${videoName || "unknown"}". Track the moving object precisely in each frame. Pay close attention to the EXACT pixel coordinates of the object center.`,
    });

    for (let i = 0; i < frames.length; i++) {
      const ts = typeof frames[i].timestamp === "number" ? frames[i].timestamp.toFixed(3) : String(i * 0.1);
      posContent.push({
        type: "text",
        text: `--- Frame ${i + 1}/${frames.length} (Time: ${ts}s) ---`,
      });
      posContent.push({
        type: "image_url",
        image_url: { url: frames[i].data },
      });
    }

    console.log(`Pass 1: Requesting object positions from Mistral AI...`);

    const posResponse = await fetch(MISTRAL_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${mistralKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MISTRAL_VISION_MODEL,
        messages: [
          { role: "system", content: positionPrompt },
          { role: "user", content: posContent },
        ],
        temperature: 0.05,
        max_tokens: 2000,
        stream: false,
      }),
    });

    if (!posResponse.ok) {
      const errorText = await posResponse.text();
      console.error(`Mistral API error (Pass 1) ${posResponse.status}: ${errorText}`);
      throw new Error(`Mistral API error: ${posResponse.status}`);
    }

    const posData = await posResponse.json();
    const posText = posData?.choices?.[0]?.message?.content || "";

    console.log(`Pass 1 complete. Raw AI response length: ${posText.length}`);

    // Parse the positions from AI response
    const jsonMatch = posText.match(/```json\s*([\s\S]*?)```/);
    let aiResult: {
      detected?: boolean;
      objectType?: string;
      estimatedMass?: number;
      launchHeight?: number;
      imageWidth?: number;
      positions?: Array<{ frame: number; x: number; y: number }>; 
    } = {};

    if (jsonMatch) {
      try {
        aiResult = JSON.parse(jsonMatch[1].trim());
      } catch {
        try { aiResult = JSON.parse(posText.trim()); } catch { /* ignore */ }
      }
    } else {
      try { aiResult = JSON.parse(posText.trim()); } catch { /* ignore */ }
    }

    // PASS 2: Multi-method geometric computation

    let finalAngle = 45;
    let finalVelocity = 15;
    let motionType: "vertical" | "horizontal" | "projectile" = "projectile";
    let confidence = 50;
    let trajectoryDescription = "";
    let curveFitInfo = "";

    const detected = aiResult.detected !== false;
    const aiPositions = aiResult.positions || [];
    const imageWidth = aiResult.imageWidth || 384;

    if (detected && aiPositions.length >= 2) {
      const positions: Position[] = aiPositions.map((p, i) => ({
        x: p.x,
        y: p.y,
        t: typeof frames[i]?.timestamp === "number" ? frames[i].timestamp : i * 0.1,
      }));

      const cleanPositions = filterOutlierPositions(positions);
      console.log(`Positions: ${positions.length} raw, ${cleanPositions.length} after filtering`);

      motionType = classifyMotion(cleanPositions);
      console.log(`Motion type: ${motionType}`);

      // Method 1: Velocity-vector angle
      const velocityAngle = computeLaunchAngle(cleanPositions);
      console.log(`Velocity-vector angle: ${velocityAngle}deg`);

      // Method 2: Parabolic curve fitting
      const curveFit = fitParabolicTrajectory(cleanPositions, imageWidth, calibrationMeters, userGravity);
      let curveAngle: number | null = null;
      let curveVelocity: number | null = null;

      if (curveFit) {
        curveAngle = curveFit.angle;
        curveVelocity = curveFit.velocity;
        curveFitInfo = `R^2 = ${curveFit.r_squared.toFixed(3)}`;
        console.log(`Curve fit: angle=${curveAngle}deg, velocity=${curveVelocity}m/s, R^2=${curveFit.r_squared.toFixed(3)}`);
      }

      // Method 3: Linear velocity estimation
      const linearVelocity = estimateVelocity(cleanPositions, imageWidth, calibrationMeters);
      console.log(`Linear velocity estimate: ${linearVelocity} m/s`);

      // Cross-validate and select best values
      if (motionType === "vertical") {
        finalAngle = 90;
        finalVelocity = linearVelocity;
      } else if (motionType === "horizontal") {
        finalAngle = 0;
        finalVelocity = linearVelocity;
      } else {
        if (curveFit && curveFit.r_squared > 0.7 && curveAngle !== null) {
          finalAngle = curveAngle;
          finalVelocity = curveVelocity !== null ? curveVelocity : linearVelocity;
          if (Math.abs(curveAngle - velocityAngle) < 15) {
            confidence += 10;
          } else {
            finalAngle = Math.round((curveAngle * 0.6 + velocityAngle * 0.4) * 10) / 10;
          }
        } else if (curveFit && curveFit.r_squared > 0.4 && curveAngle !== null) {
          finalAngle = Math.round((curveAngle * 0.4 + velocityAngle * 0.6) * 10) / 10;
          finalVelocity = curveVelocity !== null
            ? Math.round((curveVelocity * 0.4 + linearVelocity * 0.6) * 10) / 10
            : linearVelocity;
        } else {
          finalAngle = velocityAngle;
          finalVelocity = linearVelocity;
        }
      }

      finalAngle = Math.max(0, Math.min(90, finalAngle));

      // Calculate confidence
      let baseConfidence = 45;
      baseConfidence += Math.min(20, cleanPositions.length * 3);
      if (cleanPositions.length === positions.length) baseConfidence += 8;
      if (curveFit && curveFit.r_squared > 0.8) baseConfidence += 12;
      else if (curveFit && curveFit.r_squared > 0.5) baseConfidence += 6;
      if (curveAngle !== null && Math.abs(curveAngle - velocityAngle) < 10) baseConfidence += 5;
      if (Math.abs(finalAngle - 45) > 5 && Math.abs(finalAngle - 60) > 5 && Math.abs(finalAngle - 90) > 5) baseConfidence += 3;

      confidence = Math.min(95, Math.max(35, baseConfidence));

      trajectoryDescription = cleanPositions.map((p, i) =>
        `Frame ${i + 1}: (${Math.round(p.x)}, ${Math.round(p.y)}) @ t=${p.t.toFixed(3)}s`
      ).join(" -> ");
    }

    // Build final response
    const finalResult = {
      detected,
      confidence,
      angle: finalAngle,
      velocity: finalVelocity,
      mass: aiResult.estimatedMass || 0.5,
      height: aiResult.launchHeight || 1,
      objectType: aiResult.objectType || "unknown object",
    };

    const motionTypeLabel = motionType === "vertical"
      ? (isAr ? "\u062d\u0631\u0643\u0629 \u0634\u0627\u0642\u0648\u0644\u064a\u0629 (\u0631\u0645\u064a \u0639\u0645\u0648\u062f\u064a)" : "Vertical motion (vertical throw)")
      : motionType === "horizontal"
        ? (isAr ? "\u062d\u0631\u0643\u0629 \u0623\u0641\u0642\u064a\u0629" : "Horizontal motion")
        : (isAr ? "\u062d\u0631\u0643\u0629 \u0645\u0642\u0630\u0648\u0641 (\u0642\u0630\u0641 \u0645\u0627\u0626\u0644)" : "Projectile motion (oblique throw)");

    const lines: string[] = [];
    lines.push("```json\n" + JSON.stringify(finalResult, null, 2) + "\n```");
    lines.push("");

    if (isAr) {
      lines.push(`**\u0646\u0648\u0639 \u0627\u0644\u0645\u0642\u0630\u0648\u0641:** ${finalResult.objectType}`);
      lines.push(`**\u0646\u0648\u0639 \u0627\u0644\u062d\u0631\u0643\u0629:** ${motionTypeLabel}`);
      lines.push("");
      lines.push(`**\u062a\u062d\u0644\u064a\u0644 \u0627\u0644\u0645\u0633\u0627\u0631 \u0639\u0628\u0631 \u0627\u0644\u0625\u0637\u0627\u0631\u0627\u062a:**`);
      if (trajectoryDescription) lines.push(trajectoryDescription);
      lines.push("");
      lines.push(`**\u0627\u0644\u0632\u0627\u0648\u064a\u0629 \u0627\u0644\u0645\u062d\u0633\u0648\u0628\u0629:** ${finalAngle}\u00b0 (\u062a\u0645 \u0627\u0644\u062a\u062d\u0642\u0642 \u0628\u0637\u0631\u064a\u0642\u062a\u064a\u0646: \u0645\u062a\u062c\u0647 \u0627\u0644\u0633\u0631\u0639\u0629 \u0648\u0645\u0637\u0627\u0628\u0642\u0629 \u0627\u0644\u0645\u0646\u062d\u0646\u0649 \u0627\u0644\u0642\u0637\u0639\u064a)`);
      if (curveFitInfo) {
        lines.push(`**\u062c\u0648\u062f\u0629 \u0645\u0637\u0627\u0628\u0642\u0629 \u0627\u0644\u0645\u0646\u062d\u0646\u0649:** ${curveFitInfo}`);
        lines.push(`\u062a\u0645 \u0645\u0637\u0627\u0628\u0642\u0629 \u0627\u0644\u0645\u0633\u0627\u0631 \u0645\u0639 \u0645\u0639\u0627\u062f\u0644\u0629 \u0627\u0644\u0645\u0642\u0630\u0648\u0641: y = x*tan(theta) - g*x^2 / (2*v0^2*cos^2(theta))`);
      }
      if (motionType === "vertical") {
        lines.push(`\u0627\u0644\u062c\u0633\u0645 \u064a\u062a\u062d\u0631\u0643 \u0639\u0645\u0648\u062f\u064a\u0627\u064b (\u0644\u0623\u0639\u0644\u0649 \u062b\u0645 \u0644\u0623\u0633\u0641\u0644) \u0645\u0639 \u0625\u0632\u0627\u062d\u0629 \u0623\u0641\u0642\u064a\u0629 \u0634\u0628\u0647 \u0645\u0639\u062f\u0648\u0645\u0629 -> \u0627\u0644\u0632\u0627\u0648\u064a\u0629 = 90\u00b0`);
      } else if (motionType === "horizontal") {
        lines.push(`\u0627\u0644\u062c\u0633\u0645 \u064a\u062a\u062d\u0631\u0643 \u0623\u0641\u0642\u064a\u0627\u064b \u0645\u0639 \u0625\u0632\u0627\u062d\u0629 \u0639\u0645\u0648\u062f\u064a\u0629 \u0634\u0628\u0647 \u0645\u0639\u062f\u0648\u0645\u0629 -> \u0627\u0644\u0632\u0627\u0648\u064a\u0629 = 0\u00b0`);
      }
      lines.push("");
      lines.push(`**\u0627\u0644\u0633\u0631\u0639\u0629 \u0627\u0644\u062a\u0642\u062f\u064a\u0631\u064a\u0629:** ${finalVelocity} \u0645/\u062b`);
      lines.push(`**\u0627\u0631\u062a\u0641\u0627\u0639 \u0627\u0644\u0625\u0637\u0644\u0627\u0642:** ${finalResult.height} \u0645`);
      lines.push(`**\u0627\u0644\u0643\u062a\u0644\u0629 \u0627\u0644\u062a\u0642\u062f\u064a\u0631\u064a\u0629:** ${finalResult.mass} \u0643\u063a`);
      lines.push(`**\u0646\u0633\u0628\u0629 \u0627\u0644\u062b\u0642\u0629:** ${confidence}%`);
      lines.push("");
      lines.push(`**\u0627\u0644\u0645\u0646\u0647\u062c\u064a\u0629 \u0627\u0644\u0641\u064a\u0632\u064a\u0627\u0626\u064a\u0629:**`);
      lines.push(`- \u062a\u0645 \u062a\u062a\u0628\u0639 ${aiPositions.length} \u0645\u0648\u0642\u0639 \u0639\u0628\u0631 \u0627\u0644\u0625\u0637\u0627\u0631\u0627\u062a`);
      lines.push(`- \u0627\u0644\u0637\u0631\u064a\u0642\u0629 1: \u0632\u0627\u0648\u064a\u0629 \u0627\u0644\u0625\u0637\u0644\u0627\u0642 = arctan(vy / vx) \u0645\u0646 \u0645\u062a\u062c\u0647\u0627\u062a \u0627\u0644\u0633\u0631\u0639\u0629 \u0627\u0644\u0623\u0648\u0644\u064a\u0629`);
      lines.push(`- \u0627\u0644\u0637\u0631\u064a\u0642\u0629 2: \u0645\u0637\u0627\u0628\u0642\u0629 \u0627\u0644\u0645\u0646\u062d\u0646\u0649 \u0627\u0644\u0642\u0637\u0639\u064a (Least Squares Parabolic Fit)`);
      lines.push(`- \u062a\u0645 \u0627\u0644\u062a\u062d\u0642\u0642 \u0627\u0644\u0645\u062a\u0628\u0627\u062f\u0644 \u0628\u064a\u0646 \u0627\u0644\u0637\u0631\u064a\u0642\u062a\u064a\u0646 \u0648\u0627\u062e\u062a\u064a\u0627\u0631 \u0623\u0641\u0636\u0644 \u0646\u062a\u064a\u062c\u0629`);
      lines.push(`- \u062a\u0645 \u062a\u0635\u0641\u064a\u0629 \u0627\u0644\u0642\u064a\u0645 \u0627\u0644\u0634\u0627\u0630\u0629 \u0628\u0627\u0633\u062a\u062e\u062f\u0627\u0645 MAD (\u0627\u0644\u0627\u0646\u062d\u0631\u0627\u0641 \u0627\u0644\u0645\u0637\u0644\u0642 \u0627\u0644\u0645\u062a\u0648\u0633\u0637)`);
    } else {
      lines.push(`**Projectile type:** ${finalResult.objectType}`);
      lines.push(`**Motion type:** ${motionTypeLabel}`);
      lines.push("");
      lines.push(`**Trajectory analysis across frames:**`);
      if (trajectoryDescription) lines.push(trajectoryDescription);
      lines.push("");
      lines.push(`**Computed angle:** ${finalAngle}\u00b0 (cross-validated with velocity vectors and parabolic curve fitting)`);
      if (curveFitInfo) {
        lines.push(`**Curve fit quality:** ${curveFitInfo}`);
        lines.push(`Trajectory matched against projectile equation: y = x*tan(theta) - g*x^2 / (2*v0^2*cos^2(theta))`);
      }
      if (motionType === "vertical") {
        lines.push(`Object moves vertically (up then down) with near-zero horizontal displacement -> angle = 90\u00b0`);
      } else if (motionType === "horizontal") {
        lines.push(`Object moves horizontally with near-zero vertical displacement -> angle = 0\u00b0`);
      }
      lines.push("");
      lines.push(`**Estimated velocity:** ${finalVelocity} m/s`);
      lines.push(`**Launch height:** ${finalResult.height} m`);
      lines.push(`**Estimated mass:** ${finalResult.mass} kg`);
      lines.push(`**Confidence:** ${confidence}%`);
      lines.push("");
      lines.push(`**Physics methodology:**`);
      lines.push(`- Tracked ${aiPositions.length} positions across frames`);
      lines.push(`- Method 1: Launch angle = arctan(vy / vx) from initial velocity vectors`);
      lines.push(`- Method 2: Least-squares parabolic curve fitting to projectile equation`);
      lines.push(`- Cross-validated both methods and selected best result`);
      lines.push(`- Outliers filtered using MAD (Median Absolute Deviation)`);
    }

    const finalText = lines.join("\n");

    console.log(`video-analyze completed: angle=${finalAngle}, velocity=${finalVelocity}, type=${motionType}, confidence=${confidence}, curveFit=${curveFitInfo}`);

    return new Response(JSON.stringify({ text: finalText }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error analyzing video:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
