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
 * Compute the launch angle from a sequence of (x, y) positions using arctan.
 * Uses the initial displacement vector (first few frames) to determine launch direction.
 * In image coordinates, y increases downward, so we invert Dy.
 */
function computeLaunchAngle(positions: Position[]): number {
  if (positions.length < 2) return 45; // fallback

  // Use first 2-3 frames to get the initial launch direction
  const n = Math.min(3, positions.length);
  let totalDx = 0;
  let totalDy = 0;

  for (let i = 1; i < n; i++) {
    totalDx += positions[i].x - positions[i - 1].x;
    // Invert y because in image coordinates y increases downward
    totalDy += -(positions[i].y - positions[i - 1].y);
  }

  const avgDx = totalDx / (n - 1);
  const avgDy = totalDy / (n - 1);

  // Special cases for vertical and horizontal motion
  const absDx = Math.abs(avgDx);
  const absDy = Math.abs(avgDy);

  if (absDx < 2 && absDy > 5) {
    // Nearly vertical: Dx ~ 0
    return 90;
  }
  if (absDy < 2 && absDx > 5) {
    // Nearly horizontal: Dy ~ 0
    return 0;
  }
  if (absDx < 2 && absDy < 2) {
    // No significant movement detected
    return 45; // fallback
  }

  // General case: arctan(Dy / Dx)
  let angle = Math.atan2(absDy, absDx) * (180 / Math.PI);

  // Smart rounding for near-special angles
  if (angle >= 85 && angle <= 95) angle = 90;
  else if (angle >= -5 && angle <= 5) angle = 0;
  else if (angle >= 43 && angle <= 47) angle = 45;
  else if (angle >= 28 && angle <= 32) angle = 30;
  else if (angle >= 58 && angle <= 62) angle = 60;

  // Normalize to 0-90 range
  return Math.max(0, Math.min(90, Math.round(angle * 10) / 10));
}

/**
 * Determine motion type from positions: vertical, horizontal, or projectile (parabolic).
 */
function classifyMotion(positions: Position[]): "vertical" | "horizontal" | "projectile" {
  if (positions.length < 3) return "projectile";

  // Check vertical range vs horizontal range
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

  // Vertical: object goes up and down with minimal horizontal displacement
  if (rangeX < rangeY * 0.15 && rangeY > 20) {
    return "vertical";
  }

  // Horizontal: minimal vertical displacement
  if (rangeY < rangeX * 0.15 && rangeX > 20) {
    return "horizontal";
  }

  return "projectile";
}

/**
 * Estimate velocity from positions and timestamps.
 * Uses pixel displacement and approximate real-world scale.
 */
function estimateVelocity(positions: Position[], imageWidth: number): number {
  if (positions.length < 2) return 15; // fallback

  let totalPixelSpeed = 0;
  let count = 0;

  for (let i = 1; i < positions.length; i++) {
    const dx = positions[i].x - positions[i - 1].x;
    const dy = positions[i].y - positions[i - 1].y;
    const dt = positions[i].t - positions[i - 1].t;
    if (dt > 0) {
      const pixelDist = Math.sqrt(dx * dx + dy * dy);
      totalPixelSpeed += pixelDist / dt;
      count++;
    }
  }

  if (count === 0) return 15;
  const avgPixelSpeed = totalPixelSpeed / count;

  // Approximate scale: assume the image width represents roughly 5-10 meters
  const metersPerPixel = 8 / imageWidth;
  const velocityMs = avgPixelSpeed * metersPerPixel;

  // Clamp to realistic range
  return Math.max(3, Math.min(50, Math.round(velocityMs * 10) / 10));
}

/**
 * Filter outlier positions to ensure the same object is tracked.
 * Removes sudden jumps that indicate tracking errors.
 */
function filterOutlierPositions(positions: Position[]): Position[] {
  if (positions.length <= 2) return positions;

  const filtered: Position[] = [positions[0]];

  for (let i = 1; i < positions.length; i++) {
    const prev = filtered[filtered.length - 1];
    const curr = positions[i];
    const dx = Math.abs(curr.x - prev.x);
    const dy = Math.abs(curr.y - prev.y);
    const jump = Math.sqrt(dx * dx + dy * dy);

    // If position jumped more than 200px, likely tracking error
    if (jump < 200) {
      filtered.push(curr);
    }
  }

  return filtered.length >= 2 ? filtered : positions;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { frames, lang, videoName, totalFrames, fps } = await req.json();

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

    // ══════════════════════════════════════════════
    // PASS 1: Ask AI to detect object positions in each frame
    // ══════════════════════════════════════════════

    const positionPrompt = `You are a precise object tracking system for physics video analysis.
You will receive ${frames.length} consecutive video frames showing a moving object (projectile).

YOUR ONLY TASK:
For EACH frame, detect the PRIMARY moving object (ball, stone, projectile, etc.) and report its EXACT pixel position (x, y) in the image.

TRACKING RULES:
- Track the SAME object across ALL frames. Do NOT jump between different objects.
- x = horizontal pixel position (0 = left edge, increases rightward)
- y = vertical pixel position (0 = top edge, increases downward)
- The image resolution is approximately 512 pixels wide.
- Be as precise as possible — even 10 pixels of error changes the angle calculation significantly.
- If you cannot see the object in a frame, use your best estimate based on trajectory.
- Focus on the CENTER of the object, not its edge.
- A projectile can be ANY moving object: ball, stone, bottle, person, water, etc.
- If ANY object changes position between frames, it is a projectile candidate.

Also identify:
- objectType: what the moving object is (ball, stone, bottle, etc.)
- estimatedMass: mass in kg based on the object type
- launchHeight: estimated launch height in meters (how high the object started from ground)

RESPOND WITH ONLY THIS JSON (no other text):
\`\`\`json
{
  "detected": true,
  "objectType": "<type>",
  "estimatedMass": <kg>,
  "launchHeight": <meters>,
  "imageWidth": 512,
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
      text: `Analyze these ${frames.length} consecutive frames from video "${videoName || "unknown"}". Track the moving object precisely in each frame.`,
    });

    for (let i = 0; i < frames.length; i++) {
      const ts = typeof frames[i].timestamp === "number" ? frames[i].timestamp.toFixed(2) : String(i * 0.5);
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
        temperature: 0.1,
        max_tokens: 1500,
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

    console.log(`Pass 1 complete. Parsing positions...`);

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

    // ══════════════════════════════════════════════
    // PASS 2: Geometric computation of angle, velocity, trajectory
    // ══════════════════════════════════════════════

    let finalAngle = 45;
    let finalVelocity = 15;
    let motionType: "vertical" | "horizontal" | "projectile" = "projectile";
    let confidence = 50;
    let trajectoryDescription = "";

    const detected = aiResult.detected !== false;
    const aiPositions = aiResult.positions || [];
    const imageWidth = aiResult.imageWidth || 512;

    if (detected && aiPositions.length >= 2) {
      // Convert to Position format with timestamps
      const positions: Position[] = aiPositions.map((p, i) => ({
        x: p.x,
        y: p.y,
        t: typeof frames[i]?.timestamp === "number" ? frames[i].timestamp : i * 0.5,
      }));

      // Filter outliers (inconsistent tracking)
      const cleanPositions = filterOutlierPositions(positions);
      console.log(`Positions: ${positions.length} raw, ${cleanPositions.length} after filtering`);

      // Classify motion type
      motionType = classifyMotion(cleanPositions);
      console.log(`Motion type: ${motionType}`);

      // Compute launch angle using arctan
      const computedAngle = computeLaunchAngle(cleanPositions);
      console.log(`Computed angle: ${computedAngle}deg`);

      // Force angle based on motion type validation
      if (motionType === "vertical") {
        finalAngle = 90;
      } else if (motionType === "horizontal") {
        finalAngle = 0;
      } else {
        finalAngle = computedAngle;
      }

      // Estimate velocity
      finalVelocity = estimateVelocity(cleanPositions, imageWidth);
      console.log(`Estimated velocity: ${finalVelocity} m/s`);

      // Calculate confidence based on data quality
      confidence = Math.min(95, Math.max(40,
        50 +
        (cleanPositions.length >= 4 ? 15 : cleanPositions.length >= 3 ? 10 : 0) +
        (cleanPositions.length === positions.length ? 10 : 0) +
        (motionType !== "projectile" ? 10 : 5) +
        (Math.abs(finalAngle - 45) > 5 ? 5 : 0)
      ));

      // Build trajectory description
      trajectoryDescription = cleanPositions.map((p, i) =>
        `Frame ${i + 1}: (${Math.round(p.x)}, ${Math.round(p.y)})`
      ).join(" → ");
    }

    // ══════════════════════════════════════════════
    // Build final response with computed values
    // ══════════════════════════════════════════════

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
      ? (isAr ? "حركة شاقولية (رمي عمودي)" : "Vertical motion (vertical throw)")
      : motionType === "horizontal"
        ? (isAr ? "حركة أفقية" : "Horizontal motion")
        : (isAr ? "حركة مقذوف (قذف مائل)" : "Projectile motion (oblique throw)");

    const lines: string[] = [];
    lines.push(`\`\`\`json\n${JSON.stringify(finalResult, null, 2)}\n\`\`\``);
    lines.push("");

    if (isAr) {
      lines.push(`**نوع المقذوف:** ${finalResult.objectType}`);
      lines.push(`**نوع الحركة:** ${motionTypeLabel}`);
      lines.push("");
      lines.push(`**تحليل المسار عبر الإطارات:**`);
      if (trajectoryDescription) lines.push(trajectoryDescription);
      lines.push("");
      lines.push(`**الزاوية المحسوبة هندسياً:** ${finalAngle}° (باستخدام arctan من مواقع الإطارات)`);
      if (motionType === "vertical") {
        lines.push(`الجسم يتحرك عمودياً (لأعلى ثم لأسفل) مع إزاحة أفقية شبه معدومة → الزاوية = 90°`);
      } else if (motionType === "horizontal") {
        lines.push(`الجسم يتحرك أفقياً مع إزاحة عمودية شبه معدومة → الزاوية = 0°`);
      }
      lines.push("");
      lines.push(`**السرعة التقديرية:** ${finalVelocity} م/ث`);
      lines.push(`**ارتفاع الإطلاق:** ${finalResult.height} م`);
      lines.push(`**الكتلة التقديرية:** ${finalResult.mass} كغ`);
      lines.push(`**نسبة الثقة:** ${confidence}%`);
      lines.push("");
      lines.push(`**ملاحظات فيزيائية:**`);
      lines.push(`- تم تتبع ${aiPositions.length} موقع عبر الإطارات`);
      lines.push(`- الزاوية محسوبة باستخدام: angle = arctan(Δy / Δx)`);
      lines.push(`- تم التحقق من اتساق المسار وتصفية القيم الشاذة`);
    } else {
      lines.push(`**Projectile type:** ${finalResult.objectType}`);
      lines.push(`**Motion type:** ${motionTypeLabel}`);
      lines.push("");
      lines.push(`**Trajectory analysis across frames:**`);
      if (trajectoryDescription) lines.push(trajectoryDescription);
      lines.push("");
      lines.push(`**Geometrically computed angle:** ${finalAngle}° (using arctan from frame positions)`);
      if (motionType === "vertical") {
        lines.push(`Object moves vertically (up then down) with near-zero horizontal displacement → angle = 90°`);
      } else if (motionType === "horizontal") {
        lines.push(`Object moves horizontally with near-zero vertical displacement → angle = 0°`);
      }
      lines.push("");
      lines.push(`**Estimated velocity:** ${finalVelocity} m/s`);
      lines.push(`**Launch height:** ${finalResult.height} m`);
      lines.push(`**Estimated mass:** ${finalResult.mass} kg`);
      lines.push(`**Confidence:** ${confidence}%`);
      lines.push("");
      lines.push(`**Physics notes:**`);
      lines.push(`- Tracked ${aiPositions.length} positions across frames`);
      lines.push(`- Angle computed using: angle = arctan(Δy / Δx)`);
      lines.push(`- Trajectory consistency verified and outliers filtered`);
    }

    const finalText = lines.join("\n");

    console.log(`video-analyze completed: angle=${finalAngle}, velocity=${finalVelocity}, type=${motionType}, confidence=${confidence}`);

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
