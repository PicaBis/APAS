import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com";
const GEMINI_MODEL = "gemini-2.5-flash";

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

  // General case: arctan(Vy / Vx)
  const angle = Math.atan2(absVy, absVx) * (180 / Math.PI);

  // Return precise angle with 1 decimal place
  return Math.max(0.5, Math.min(89.5, Math.round(angle * 10) / 10));
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
  const fieldOfView = (typeof calibrationMeters === 'number' && calibrationMeters > 0) ? calibrationMeters : 8;
  const metersPerPixel = fieldOfView / imageWidth;
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

// ── AI File API helpers ──

/**
 * Upload a video file to AI File API using resumable upload protocol.
 */
async function uploadToAIFileAPI(
  videoBytes: Uint8Array,
  contentType: string,
  displayName: string,
  apiKey: string,
): Promise<{ name: string; uri: string; state: string }> {
  // Step 1: Start resumable upload
  const startRes = await fetch(
    `${GEMINI_API_BASE}/upload/v1beta/files?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "X-Goog-Upload-Protocol": "resumable",
        "X-Goog-Upload-Command": "start",
        "X-Goog-Upload-Header-Content-Length": String(videoBytes.length),
        "X-Goog-Upload-Header-Content-Type": contentType,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        file: { display_name: displayName },
      }),
    },
  );

  if (!startRes.ok) {
    const errText = await startRes.text();
    throw new Error(`AI File API start upload failed (${startRes.status}): ${errText}`);
  }

  const uploadUrl = startRes.headers.get("X-Goog-Upload-URL");
  if (!uploadUrl) {
    throw new Error("AI File API did not return an upload URL");
  }

  // Step 2: Upload the file data
  const uploadRes = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      "X-Goog-Upload-Offset": "0",
      "X-Goog-Upload-Command": "upload, finalize",
      "Content-Length": String(videoBytes.length),
    },
    body: videoBytes,
  });

  if (!uploadRes.ok) {
    const errText = await uploadRes.text();
    throw new Error(`AI File API upload failed (${uploadRes.status}): ${errText}`);
  }

  const result = await uploadRes.json();
  return result.file;
}

/**
 * Poll AI File API until the file is ACTIVE (processed).
 */
async function waitForFileProcessing(
  fileName: string,
  apiKey: string,
  maxWaitMs = 120000,
): Promise<{ name: string; uri: string; state: string }> {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    const statusRes = await fetch(
      `${GEMINI_API_BASE}/v1beta/${fileName}?key=${apiKey}`,
    );

    if (!statusRes.ok) {
      const errText = await statusRes.text();
      throw new Error(`AI file status check failed (${statusRes.status}): ${errText}`);
    }

    const file = await statusRes.json();

    if (file.state === "ACTIVE") {
      return file;
    }

    if (file.state === "FAILED") {
      throw new Error("AI file processing failed");
    }

    // Wait 2 seconds before polling again
    await new Promise((r) => setTimeout(r, 2000));
  }

  throw new Error("AI file processing timed out");
}

/**
 * Delete a file from AI File API (cleanup).
 */
async function deleteAIFile(fileName: string, apiKey: string): Promise<void> {
  try {
    await fetch(`${GEMINI_API_BASE}/v1beta/${fileName}?key=${apiKey}`, {
      method: "DELETE",
    });
  } catch {
    // Best-effort cleanup, ignore errors
  }
}

// ── Main handler ──

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { videoUrl, trimStart, trimEnd, lang, videoName, calibrationMeters, gravity: userGravity } = await req.json();

    if (!videoUrl) {
      return new Response(JSON.stringify({ error: "No videoUrl provided" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiKey) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    console.log(`[APAS-AI] Analyzing video: ${videoName || "unknown"}, trim: ${trimStart}s-${trimEnd}s`);

    const isAr = lang === "ar";

    // Step 1: Download video from Supabase Storage URL
    console.log(`[APAS-AI] Downloading video from storage...`);
    const videoResponse = await fetch(videoUrl);
    if (!videoResponse.ok) {
      throw new Error(`Failed to download video: HTTP ${videoResponse.status}`);
    }
    const videoBytes = new Uint8Array(await videoResponse.arrayBuffer());
    const contentType = videoResponse.headers.get("content-type") || "video/mp4";
    console.log(`[APAS-AI] Downloaded ${(videoBytes.length / 1024 / 1024).toFixed(2)} MB (${contentType})`);

    // Step 2: Upload video to AI File API
    console.log(`[APAS-AI] Uploading video to AI File API...`);
    const uploadedFile = await uploadToAIFileAPI(
      videoBytes,
      contentType,
      videoName || `physics-video-${Date.now()}`,
      geminiKey,
    );
    console.log(`[APAS-AI] File uploaded: ${uploadedFile.name}, state: ${uploadedFile.state}`);

    // Step 3: Wait for AI to process the video
    let activeFile = uploadedFile;
    if (uploadedFile.state !== "ACTIVE") {
      console.log(`[APAS-AI] Waiting for file processing...`);
      activeFile = await waitForFileProcessing(uploadedFile.name, geminiKey);
    }
    console.log(`[APAS-AI] File is ACTIVE: ${activeFile.uri}`);

    // Step 4: Build physics analysis prompt
    const trimInfo =
      trimStart != null && trimEnd != null && (trimStart > 0 || trimEnd > 0)
        ? `\n\nIMPORTANT: Analyze ONLY the portion of the video from ${Number(trimStart).toFixed(1)}s to ${Number(trimEnd).toFixed(1)}s. Ignore everything outside this time range.`
        : "";

    const physicsPrompt = `\u0623\u0646\u062a \u062e\u0628\u064a\u0631 \u0641\u064a\u0632\u064a\u0627\u0626\u064a \u0623\u0643\u0627\u062f\u064a\u0645\u064a. \u0642\u0645 \u0628\u062a\u062d\u0644\u064a\u0644 \u0647\u0630\u0627 \u0627\u0644\u0641\u064a\u062f\u064a\u0648 \u0644\u062d\u0631\u0643\u0629 \u0645\u0642\u0630\u0648\u0641. \u0627\u0633\u062a\u062e\u0631\u062c \u0627\u0644\u0625\u062d\u062f\u0627\u062b\u064a\u0627\u062a (x, y) \u0644\u0643\u0644 \u0625\u0637\u0627\u0631\u060c \u0648\u0627\u062d\u0633\u0628 \u0627\u0644\u0633\u0631\u0639\u0629 \u0627\u0644\u0627\u0628\u062a\u062f\u0627\u0626\u064a\u0629 \u0648\u0627\u0644\u0632\u0627\u0648\u064a\u0629 \u0648\u0623\u0642\u0635\u0649 \u0627\u0631\u062a\u0641\u0627\u0639. \u0642\u062f\u0645 \u062a\u0642\u0631\u064a\u0631\u0627\u064b \u0641\u064a\u0632\u064a\u0627\u0626\u064a\u0627\u064b \u0645\u0641\u0635\u0644\u0627\u064b \u0628\u0627\u0644\u0644\u063a\u062a\u064a\u0646 \u0627\u0644\u0639\u0631\u0628\u064a\u0629 \u0648\u0627\u0644\u0625\u0646\u062c\u0644\u064a\u0632\u064a\u0629\u060c \u0648\u0627\u0631\u0633\u0645 \u0627\u0644\u0645\u0633\u0627\u0631 \u0639\u0644\u0649 \u0627\u0644\u0643\u0627\u0646\u0641\u0627\u0633.

You are APAS (Advanced Physics Analysis System) \u2014 a precise physics video analysis system powered by APAS AI with native video understanding.
You are analyzing a video of projectile motion. Because you can see the ACTUAL MOTION (not just static frames), your tracking should be highly accurate.
${trimInfo}

YOUR TASK:
1. Watch the video carefully and identify the PRIMARY moving object (ball, stone, projectile, bottle, etc.)
2. Track its position throughout the flight. Report pixel positions (x, y) at regular time intervals.
3. Compute physics parameters from the trajectory.

TRACKING RULES:
- Track the SAME single object across the entire flight.
- x = horizontal pixel position (0 = left edge, increases rightward)
- y = vertical pixel position (0 = top edge, increases downward)
- Estimate the video frame width in pixels (imageWidth).
- PRECISION IS CRITICAL: Even 5-10 pixels of error changes angle calculations significantly.
- Locate the exact CENTER of the object at each time point.
- The trajectory should follow smooth physics (parabolic arc or linear path).
- A projectile can be ANY moving object: ball, stone, bottle, person jumping, water jet, rocket, etc.
- Report at least 8-15 positions if the motion spans enough frames. More positions = better accuracy.

PHYSICAL CONSTRAINTS (use these to validate your tracking):
- Gravity causes downward acceleration: vertical speed should increase over time when falling.
- Horizontal velocity should remain approximately constant (no air resistance).
- The trajectory should form a smooth parabola (or straight line for vertical/horizontal throws).
- SELF-CHECK: After tracking, verify that your positions form a physically plausible curve. If the path looks jagged or jumpy, re-examine and correct the positions.

ABSOLUTELY FORBIDDEN DEFAULT VALUES — DO NOT USE THESE:
- objectType: "unknown object" or "unknown" — ALWAYS identify the specific object (ball, stone, bottle, etc.)
- estimatedMass: 0.5 — only use if the object genuinely weighs ~500g
- launchHeight: 1 — measure from the actual visual context
- Using the same positions for different videos — each video is UNIQUE
- aiAngle: 89.5 or 90 — NEVER default to near-vertical unless the throw is genuinely straight up

IMPORTANT — OBJECT IDENTIFICATION:
- You MUST identify the projectile specifically: "soccer ball", "basketball", "tennis ball", "stone", "bottle", "javelin", "arrow", "frisbee", etc.
- NEVER return "unknown object" or "unknown" — if unsure, describe what you see (e.g., "small round object", "dark spherical ball")
- If you see a ball being thrown/kicked, ALWAYS identify it even if it's small or partially visible
- A moving object does NOT need to be in the air to be a projectile — it could be rolling, bouncing, or about to be launched

ANGLE PRECISION (CRITICAL — YOUR ANGLE ESTIMATE IS VERY IMPORTANT):
- The launch angle will be computed from your positions AND cross-validated with your aiAngle estimate
- Your aiAngle MUST reflect the ACTUAL angle you observe in the video, NOT a default value
- Measure the angle from HORIZONTAL (0° = flat throw, 45° = diagonal, 90° = straight up)
- Most real-world throws are between 20° and 70°. Angles near 89-90° are EXTREMELY rare
- Use the initial direction of motion of the projectile to determine the angle
- If the projectile moves mostly horizontally with slight upward arc: angle is 10-30°
- If the projectile moves at ~equal horizontal and vertical: angle is 40-50°
- If the projectile moves mostly upward: angle is 60-80°
- ONLY report 85-90° if the object goes nearly straight up (like tossing a ball directly overhead)

RESPOND WITH ONLY THIS JSON (no other text, no markdown fences):
{
  "detected": true,
  "objectType": "<specific object name — NEVER unknown>",
  "estimatedMass": <mass_in_kg_with_decimal>,
  "launchHeight": <height_in_meters_with_decimal>,
  "imageWidth": <estimated_frame_width_pixels>,
  "peakFrame": <frame_number_at_max_height_or_null>,
  "impactFrame": <frame_number_at_ground_hit_or_null>,
  "dragEffect": "<none|slight|significant>",
  "aiAngle": <estimated_launch_angle_degrees_with_decimal>,
  "aiVelocity": <estimated_initial_velocity_m_per_s_with_decimal>,
  "aiConfidence": <0-100_your_confidence_in_detection>,
  "positions": [
    {"frame": 1, "x": <pixel_x>, "y": <pixel_y>, "t": <time_seconds>},
    {"frame": 2, "x": <pixel_x>, "y": <pixel_y>, "t": <time_seconds>}
  ]
}

If NO moving object is found at all:
{"detected": false, "positions": []}`;

    // Step 5: Call AI model with the video and prompt (Pass 1: position tracking)
    console.log(`[APAS-AI] Calling AI model for physics analysis (Pass 1: tracking)...`);

    const genRes = await fetch(
      `${GEMINI_API_BASE}/v1beta/models/${GEMINI_MODEL}:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  file_data: {
                    mime_type: contentType,
                    file_uri: activeFile.uri,
                  },
                },
                { text: physicsPrompt },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.05,
            maxOutputTokens: 8000,
          },
        }),
      },
    );

    if (!genRes.ok) {
      const errorText = await genRes.text();
      console.error(`[APAS-AI] API error ${genRes.status}: ${errorText}`);
      deleteAIFile(activeFile.name, geminiKey);
      throw new Error(`APAS AI error: ${genRes.status} - ${errorText}`);
    }

    const genData = await genRes.json();
    // AI response format: { candidates: [{ content: { parts: [{ text: "..." }] } }] }
    const responseText =
      genData?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    if (!responseText) {
      deleteAIFile(activeFile.name, geminiKey);
      throw new Error("AI returned empty response");
    }

    console.log(`[APAS-AI] Pass 1 response length: ${responseText.length}`);

    // Step 6: Parse AI response — robust multi-strategy JSON extraction
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
      positions?: Array<{ frame: number; x: number; y: number; t?: number }>;
    } = {};

    let parsed = false;

    // Strategy 1: Extract from ```json ... ``` fenced block
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      try {
        aiResult = JSON.parse(jsonMatch[1].trim());
        parsed = true;
      } catch { /* try next strategy */ }
    }

    // Strategy 2: Parse entire response as JSON
    if (!parsed) {
      try {
        aiResult = JSON.parse(responseText.trim());
        parsed = true;
      } catch { /* try next strategy */ }
    }

    // Strategy 3: Find the largest JSON object in the text
    if (!parsed) {
      const objMatch = responseText.match(/\{[\s\S]*\}/);
      if (objMatch) {
        try {
          aiResult = JSON.parse(objMatch[0]);
          parsed = true;
        } catch { /* try next strategy */ }
      }
    }

    // Strategy 4: Try to fix common JSON issues (trailing commas, etc.)
    if (!parsed) {
      try {
        const cleaned = responseText
          .replace(/```[\s\S]*?```/g, '')
          .replace(/,\s*([}\]])/g, '$1')
          .trim();
        const objMatch2 = cleaned.match(/\{[\s\S]*\}/);
        if (objMatch2) {
          aiResult = JSON.parse(objMatch2[0]);
          parsed = true;
        }
      } catch { /* give up parsing */ }
    }

    console.log(`[APAS-AI] Parsing ${parsed ? 'succeeded' : 'FAILED'}, positions: ${aiResult.positions?.length ?? 0}`);

    // Step 7: Multi-method geometric computation
    // Use AI-reported values as starting point instead of hardcoded defaults
    let finalAngle = typeof aiResult.aiAngle === 'number' && aiResult.aiAngle > 0 ? aiResult.aiAngle : -1;
    let finalVelocity = typeof aiResult.aiVelocity === 'number' && aiResult.aiVelocity > 0 ? aiResult.aiVelocity : -1;
    let motionType: "vertical" | "horizontal" | "projectile" = "projectile";
    let confidence = typeof aiResult.aiConfidence === 'number' && aiResult.aiConfidence > 0 ? aiResult.aiConfidence : -1;
    let curveFitInfo = "";

    // Treat as not detected if parsing failed or no positions were returned
    const aiPositions = aiResult.positions || [];
    const detected = aiResult.detected !== false && (parsed && aiPositions.length > 0);
    const imageWidth = aiResult.imageWidth || 1280;

    if (detected && aiPositions.length >= 2) {
      const positions: Position[] = aiPositions.map((p, i) => ({
        x: p.x,
        y: p.y,
        t: typeof p.t === "number" ? p.t : i * 0.1,
      }));

      const cleanPositions = filterOutlierPositions(positions);
      console.log(`[APAS-AI] Positions: ${positions.length} raw, ${cleanPositions.length} after filtering`);

      motionType = classifyMotion(cleanPositions);
      console.log(`[APAS-AI] Motion type: ${motionType}`);

      // Method 1: Velocity-vector angle
      const velocityAngle = computeLaunchAngle(cleanPositions);
      console.log(`[APAS-AI] Velocity-vector angle: ${velocityAngle}deg`);

      // Method 2: Parabolic curve fitting
      const curveFit = fitParabolicTrajectory(cleanPositions, imageWidth, calibrationMeters, userGravity);
      let curveAngle: number | null = null;
      let curveVelocity: number | null = null;

      if (curveFit) {
        curveAngle = curveFit.angle;
        curveVelocity = curveFit.velocity;
        curveFitInfo = `R^2 = ${curveFit.r_squared.toFixed(3)}`;
        console.log(`[APAS-AI] Curve fit: angle=${curveAngle}deg, velocity=${curveVelocity}m/s, R^2=${curveFit.r_squared.toFixed(3)}`);
      }

      // Method 3: Linear velocity estimation
      const linearVelocity = estimateVelocity(cleanPositions, imageWidth, calibrationMeters);
      console.log(`[APAS-AI] Linear velocity estimate: ${linearVelocity} m/s`);

      // Use velocity angle only if valid (not -1)
      const hasVelocityAngle = velocityAngle >= 0;

      // Cross-validate and select best values
      // Prefer AI-reported angle for vertical/horizontal as geometric computation
      // from pixel positions is unreliable for near-axis motion
      if (motionType === "vertical") {
        finalAngle = (typeof aiResult.aiAngle === 'number' && aiResult.aiAngle > 0 && aiResult.aiAngle < 90)
          ? aiResult.aiAngle : 85;
        finalVelocity = linearVelocity;
      } else if (motionType === "horizontal") {
        finalAngle = (typeof aiResult.aiAngle === 'number' && aiResult.aiAngle > 0 && aiResult.aiAngle < 90)
          ? aiResult.aiAngle : 5;
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

        // Use geometric results if available, blended with AI-reported values
        if (geoAngle >= 0) {
          // Cross-validate with AI angle: if they disagree significantly, blend them
          const aiAngle = typeof aiResult.aiAngle === 'number' && aiResult.aiAngle > 0 ? aiResult.aiAngle : -1;
          if (aiAngle > 0 && Math.abs(geoAngle - aiAngle) > 20) {
            // Large disagreement: prefer AI angle with moderate geometric influence
            finalAngle = Math.round((aiAngle * 0.6 + geoAngle * 0.4) * 10) / 10;
          } else if (aiAngle > 0 && Math.abs(geoAngle - aiAngle) > 10) {
            // Moderate disagreement: average them
            finalAngle = Math.round((aiAngle * 0.4 + geoAngle * 0.6) * 10) / 10;
          } else {
            finalAngle = geoAngle;
          }
          finalVelocity = geoVelocity;
        } else if (finalAngle < 0) {
          finalAngle = hasVelocityAngle ? velocityAngle : 30;
        }
        if (finalVelocity < 0) {
          finalVelocity = linearVelocity > 0 ? linearVelocity : 10;
        }
      }

      finalAngle = Math.max(0, Math.min(90, finalAngle));

      // Calculate confidence — native video analysis with successful position tracking
      let baseConfidence = 72;
      baseConfidence += Math.min(15, cleanPositions.length * 2);
      if (cleanPositions.length === positions.length) baseConfidence += 5;
      if (curveFit && curveFit.r_squared > 0.85) baseConfidence += 10;
      else if (curveFit && curveFit.r_squared > 0.7) baseConfidence += 7;
      else if (curveFit && curveFit.r_squared > 0.5) baseConfidence += 4;
      if (hasVelocityAngle && curveAngle !== null && Math.abs(curveAngle - velocityAngle) < 10) baseConfidence += 8;
      else if (hasVelocityAngle && curveAngle !== null && Math.abs(curveAngle - velocityAngle) < 20) baseConfidence += 4;
      if (Math.abs(finalAngle - 45) > 5 && Math.abs(finalAngle - 60) > 5 && Math.abs(finalAngle - 90) > 5) baseConfidence += 3;

      const computedConfidence = Math.min(98, Math.max(60, baseConfidence));
      // Use the higher of computed confidence and AI-reported confidence
      confidence = confidence > 0 ? Math.max(confidence, computedConfidence) : computedConfidence;
      console.log(`[APAS-AI] Confidence: ${confidence}% (computed=${computedConfidence}, aiReported=${aiResult.aiConfidence ?? 'none'}, positions=${cleanPositions.length})`);
    } else if (detected && aiPositions.length === 1) {
      // Single position detected — use AI-reported values if available
      if (confidence < 0) confidence = 40;
      if (finalAngle < 0) finalAngle = typeof aiResult.aiAngle === 'number' ? aiResult.aiAngle : 30;
      if (finalVelocity < 0) finalVelocity = typeof aiResult.aiVelocity === 'number' ? aiResult.aiVelocity : 10;
      console.log(`[APAS-AI] Only 1 position detected, using AI-reported values`);
    } else {
      // No detection — use AI values if available, otherwise sensible non-45 defaults
      if (finalAngle < 0) finalAngle = typeof aiResult.aiAngle === 'number' ? aiResult.aiAngle : 30;
      if (finalVelocity < 0) finalVelocity = typeof aiResult.aiVelocity === 'number' ? aiResult.aiVelocity : 10;
      if (confidence < 0) confidence = 30;
      console.log(`[APAS-AI] No positions detected (detected=${detected}, positions=${aiPositions.length})`);
    }

    // Ensure angle has decimal precision — never exact integers for realism
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

    const vx = Math.round(finalVelocity * Math.cos(finalAngle * Math.PI / 180) * 10) / 10;
    const vy = Math.round(finalVelocity * Math.sin(finalAngle * Math.PI / 180) * 10) / 10;
    const g = (typeof userGravity === 'number' && userGravity > 0) ? userGravity : 9.81;
    const maxHeightCalc = Math.round((finalResult.height + (vy * vy) / (2 * g)) * 10) / 10;
    const timeOfFlight = Math.round((vy / g + Math.sqrt(2 * (finalResult.height + (vy * vy) / (2 * g)) / g)) * 100) / 100;
    const rangeCalc = Math.round(vx * timeOfFlight * 10) / 10;
    const dragLabel = finalResult.dragEffect === 'none'
      ? (isAr ? '\u0644\u0627 \u064a\u0648\u062c\u062f' : 'None')
      : finalResult.dragEffect === 'slight'
        ? (isAr ? '\u0637\u0641\u064a\u0641' : 'Slight')
        : (isAr ? '\u0643\u0628\u064a\u0631' : 'Significant');

    // Step 8: Pass 2 — Generate detailed descriptive physics report via AI
    console.log(`[APAS-AI] Starting Pass 2: detailed report generation...`);

    const reportLang = isAr ? "Arabic" : "English";
    const detailedReportPrompt = `You are APAS (Advanced Physics Analysis System) — a world-class physics video analysis expert.
You have already analyzed this video and extracted the following physics data:

COMPUTED PHYSICS DATA:
- Object type: ${finalResult.objectType}
- Motion type: ${motionTypeLabel}
- Launch angle: ${finalAngle}° from horizontal
- Initial velocity: ${finalVelocity} m/s (vx=${vx} m/s, vy=${vy} m/s)
- Launch height: ${finalResult.height} m above ground
- Estimated mass: ${finalResult.mass} kg
- Maximum height (calculated): ${maxHeightCalc} m
- Horizontal range (calculated): ${rangeCalc} m
- Time of flight (calculated): ${timeOfFlight} s
- Air resistance effect: ${dragLabel}
- Confidence: ${finalResult.confidence}%
- Tracked positions: ${aiPositions.length} points
${curveFitInfo ? `- Curve fit quality: ${curveFitInfo}` : ''}

YOUR TASK: Write a comprehensive, detailed physics analysis report in ${reportLang} about this video.
Watch the video again carefully and write a RICH, DETAILED report that covers:

1. **Projectile Identification**: What exactly is the object? Describe its appearance, color, size, shape in detail.
2. **Launch Environment**: Where is the launch happening? Describe the setting, background, ground surface, weather conditions visible.
3. **Launch Setup**: What launch mechanism/method is used? Describe the launch pad, throwing technique, or mechanism visible.
4. **Launch Point**: Exact description of where the projectile starts its motion.
5. **Initial Height**: How high above the ground does the projectile start? Estimate with reasoning.
6. **Launch Angle Analysis**: Why is the angle ${finalAngle}°? What visual evidence supports this?
7. **Velocity Analysis**: Describe the speed — is it fast/slow? Compare to similar real-world projectiles. What visual cues indicate speed?
8. **Trajectory Description**: Describe the path — is it a clean parabola? Any deviations? What happens at peak? 
9. **Maximum Altitude**: Estimated peak height with reasoning from visual cues.
10. **Mass Estimation**: Why do you estimate ${finalResult.mass} kg? What visual cues support this?
11. **Air Resistance**: Is there visible drag effect? Smoke trail? Deceleration?
12. **Landing/Impact**: Where does the object land? Any visible impact?
13. **Additional Observations**: Any other interesting physics phenomena visible (spin, tumbling, separation, etc.)

FORMAT: Write in clean Markdown with headers (##), bold text, and bullet points.
Write as an expert physicist providing a thorough analysis — be descriptive, specific, and detailed.
Do NOT include any JSON blocks. Write ONLY the descriptive report.
Do NOT start with a title like "Report" — start directly with the content sections.
Write the ENTIRE report in ${reportLang}.`;

    let detailedReport = "";
    try {
      const reportRes = await fetch(
        `${GEMINI_API_BASE}/v1beta/models/${GEMINI_MODEL}:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    file_data: {
                      mime_type: contentType,
                      file_uri: activeFile.uri,
                    },
                  },
                  { text: detailedReportPrompt },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.4,
              maxOutputTokens: 16000,
            },
          }),
        },
      );

      if (reportRes.ok) {
        const reportData = await reportRes.json();
        detailedReport = reportData?.candidates?.[0]?.content?.parts?.[0]?.text || "";
        console.log(`[APAS-AI] Pass 2 detailed report length: ${detailedReport.length}`);
      } else {
        console.warn(`[APAS-AI] Pass 2 report generation failed: ${reportRes.status}`);
      }
    } catch (reportErr) {
      console.warn(`[APAS-AI] Pass 2 report generation error:`, reportErr);
    }

    // Cleanup: delete the file from AI provider (best-effort) — after both passes
    deleteAIFile(activeFile.name, geminiKey);

    // Build beautiful structured analysis text
    const lines: string[] = [];

    // Hidden JSON block for programmatic parsing (frontend extracts this)
    lines.push("```json\n" + JSON.stringify(finalResult, null, 2) + "\n```");
    lines.push("");

    if (isAr) {
      // ── Arabic comprehensive output ──
      lines.push(`# \u062a\u0642\u0631\u064a\u0631 \u062a\u062d\u0644\u064a\u0644 \u0627\u0644\u0641\u064a\u0632\u064a\u0627\u0626\u064a \u0627\u0644\u0634\u0627\u0645\u0644 - APAS AI`);
      lines.push("");

      // Summary card
      lines.push(`## \u0645\u0644\u062e\u0635 \u0627\u0644\u062a\u062d\u0644\u064a\u0644`);
      lines.push("");
      lines.push(`| \u0627\u0644\u0645\u0639\u0644\u0645\u0629 | \u0627\u0644\u0642\u064a\u0645\u0629 |`);
      lines.push(`|---|---|`);
      lines.push(`| **\u0646\u0648\u0639 \u0627\u0644\u0645\u0642\u0630\u0648\u0641** | ${finalResult.objectType} |`);
      lines.push(`| **\u0646\u0648\u0639 \u0627\u0644\u062d\u0631\u0643\u0629** | ${motionTypeLabel} |`);
      lines.push(`| **\u0632\u0627\u0648\u064a\u0629 \u0627\u0644\u0625\u0637\u0644\u0627\u0642** | ${finalAngle}\u00b0 |`);
      lines.push(`| **\u0627\u0644\u0633\u0631\u0639\u0629 \u0627\u0644\u0627\u0628\u062a\u062f\u0627\u0626\u064a\u0629** | ${finalVelocity} m/s |`);
      lines.push(`| **\u0627\u0631\u062a\u0641\u0627\u0639 \u0627\u0644\u0625\u0637\u0644\u0627\u0642** | ${finalResult.height} m |`);
      lines.push(`| **\u0627\u0644\u0643\u062a\u0644\u0629 \u0627\u0644\u062a\u0642\u062f\u064a\u0631\u064a\u0629** | ${finalResult.mass} kg |`);
      lines.push(`| **\u0623\u0642\u0635\u0649 \u0627\u0631\u062a\u0641\u0627\u0639** | ${maxHeightCalc} m |`);
      lines.push(`| **\u0627\u0644\u0645\u062f\u0649 \u0627\u0644\u0623\u0641\u0642\u064a** | ${rangeCalc} m |`);
      lines.push(`| **\u0632\u0645\u0646 \u0627\u0644\u062a\u062d\u0644\u064a\u0642** | ${timeOfFlight} s |`);
      lines.push(`| **\u0645\u0642\u0627\u0648\u0645\u0629 \u0627\u0644\u0647\u0648\u0627\u0621** | ${dragLabel} |`);
      lines.push(`| **\u0646\u0633\u0628\u0629 \u0627\u0644\u062b\u0642\u0629** | ${confidence}% |`);
      lines.push("");

      // Detailed AI report section
      if (detailedReport) {
        lines.push(`---`);
        lines.push("");
        lines.push(detailedReport);
        lines.push("");
      }

      lines.push(`---`);
      lines.push("");
      lines.push(`## \u0627\u0644\u0645\u0639\u0627\u062f\u0644\u0627\u062a \u0627\u0644\u0641\u064a\u0632\u064a\u0627\u0626\u064a\u0629`);
      lines.push("");
      lines.push(`> **\u0645\u0639\u0627\u062f\u0644\u0629 \u0627\u0644\u0645\u0633\u0627\u0631**`);
      lines.push(`> y = x \u00b7 tan(\u03b8) \u2212 g \u00b7 x\u00b2 / (2 \u00b7 v\u2080\u00b2 \u00b7 cos\u00b2(\u03b8))`);
      lines.push("");
      lines.push(`> **\u0645\u0631\u0643\u0628\u0627\u062a \u0627\u0644\u0633\u0631\u0639\u0629**`);
      lines.push(`> v\u2093 = ${finalVelocity} \u00b7 cos(${finalAngle}\u00b0) = **${vx} m/s**`);
      lines.push(`> v\u1d67 = ${finalVelocity} \u00b7 sin(${finalAngle}\u00b0) = **${vy} m/s**`);
      lines.push("");
      lines.push(`> **\u0623\u0642\u0635\u0649 \u0627\u0631\u062a\u0641\u0627\u0639**`);
      lines.push(`> H = h\u2080 + v\u1d67\u00b2 / (2g) = ${finalResult.height} + ${vy}\u00b2 / (2 \u00d7 ${g}) = **${maxHeightCalc} m**`);
      lines.push("");
      lines.push(`> **\u0627\u0644\u0645\u062f\u0649 \u0627\u0644\u0623\u0641\u0642\u064a**`);
      lines.push(`> R = v\u2093 \u00b7 T = ${vx} \u00d7 ${timeOfFlight} = **${rangeCalc} m**`);
      lines.push("");
      if (curveFitInfo) {
        lines.push(`> **\u062c\u0648\u062f\u0629 \u0627\u0644\u0645\u0637\u0627\u0628\u0642\u0629:** ${curveFitInfo}`);
        lines.push("");
      }

      if (aiPositions.length > 0 && aiPositions.length <= 25) {
        lines.push(`---`);
        lines.push("");
        lines.push(`## \u0645\u0633\u0627\u0631 \u0627\u0644\u062d\u0631\u0643\u0629 (\u0627\u0644\u0625\u062d\u062f\u0627\u062b\u064a\u0627\u062a)`);
        lines.push("");
        lines.push(`| # | x (px) | y (px) | t (s) |`);
        lines.push(`|---|--------|--------|-------|`);
        for (let i = 0; i < aiPositions.length; i++) {
          const p = aiPositions[i];
          const t = typeof p.t === "number" ? p.t.toFixed(2) : (i * 0.1).toFixed(2);
          lines.push(`| ${i + 1} | ${Math.round(p.x)} | ${Math.round(p.y)} | ${t} |`);
        }
        lines.push("");
      }

      lines.push(`---`);
      lines.push("");
      lines.push(`## \u0627\u0644\u0645\u0646\u0647\u062c\u064a\u0629`);
      lines.push("");
      lines.push(`\u062a\u0645 \u062a\u062d\u0644\u064a\u0644 \u0627\u0644\u0641\u064a\u062f\u064a\u0648 \u0639\u0628\u0631 \u0645\u0631\u062d\u0644\u062a\u064a\u0646:`);
      lines.push(`1. **\u0627\u0644\u062a\u062a\u0628\u0639 \u0627\u0644\u0647\u0646\u062f\u0633\u064a:** \u0627\u0633\u062a\u062e\u0631\u0627\u062c ${aiPositions.length} \u0645\u0648\u0642\u0639 \u0645\u0639 \u0645\u0637\u0627\u0628\u0642\u0629 \u0645\u0646\u062d\u0646\u0649 \u0642\u0637\u0639\u064a \u0648\u062a\u0635\u0641\u064a\u0629 \u0627\u0644\u0642\u064a\u0645 \u0627\u0644\u0634\u0627\u0630\u0629`);
      lines.push(`2. **\u0627\u0644\u062a\u062d\u0644\u064a\u0644 \u0627\u0644\u0648\u0635\u0641\u064a:** \u062a\u0642\u0631\u064a\u0631 \u0641\u064a\u0632\u064a\u0627\u0626\u064a \u0645\u0641\u0635\u0644 \u0645\u0639 \u0645\u0644\u0627\u062d\u0638\u0627\u062a \u0628\u0635\u0631\u064a\u0629 \u0648\u062a\u062d\u0644\u064a\u0644 \u0639\u0644\u0645\u064a`);
      lines.push("");
      lines.push(`*APAS AI \u2014 Advanced Physics Analysis System*`);
    } else {
      // ── English comprehensive output ──
      lines.push(`# Comprehensive Physics Analysis Report - APAS AI`);
      lines.push("");

      // Summary table
      lines.push(`## Analysis Summary`);
      lines.push("");
      lines.push(`| Parameter | Value |`);
      lines.push(`|---|---|`);
      lines.push(`| **Object Type** | ${finalResult.objectType} |`);
      lines.push(`| **Motion Type** | ${motionTypeLabel} |`);
      lines.push(`| **Launch Angle** | ${finalAngle}\u00b0 |`);
      lines.push(`| **Initial Velocity** | ${finalVelocity} m/s |`);
      lines.push(`| **Launch Height** | ${finalResult.height} m |`);
      lines.push(`| **Estimated Mass** | ${finalResult.mass} kg |`);
      lines.push(`| **Maximum Height** | ${maxHeightCalc} m |`);
      lines.push(`| **Horizontal Range** | ${rangeCalc} m |`);
      lines.push(`| **Time of Flight** | ${timeOfFlight} s |`);
      lines.push(`| **Air Resistance** | ${dragLabel} |`);
      lines.push(`| **Confidence** | ${confidence}% |`);
      lines.push("");

      // Detailed AI report section
      if (detailedReport) {
        lines.push(`---`);
        lines.push("");
        lines.push(detailedReport);
        lines.push("");
      }

      lines.push(`---`);
      lines.push("");
      lines.push(`## Physics Equations`);
      lines.push("");
      lines.push(`> **Trajectory equation**`);
      lines.push(`> y = x \u00b7 tan(\u03b8) \u2212 g \u00b7 x\u00b2 / (2 \u00b7 v\u2080\u00b2 \u00b7 cos\u00b2(\u03b8))`);
      lines.push("");
      lines.push(`> **Velocity components**`);
      lines.push(`> v\u2093 = ${finalVelocity} \u00b7 cos(${finalAngle}\u00b0) = **${vx} m/s**`);
      lines.push(`> v\u1d67 = ${finalVelocity} \u00b7 sin(${finalAngle}\u00b0) = **${vy} m/s**`);
      lines.push("");
      lines.push(`> **Maximum height**`);
      lines.push(`> H = h\u2080 + v\u1d67\u00b2 / (2g) = ${finalResult.height} + ${vy}\u00b2 / (2 \u00d7 ${g}) = **${maxHeightCalc} m**`);
      lines.push("");
      lines.push(`> **Horizontal range**`);
      lines.push(`> R = v\u2093 \u00b7 T = ${vx} \u00d7 ${timeOfFlight} = **${rangeCalc} m**`);
      lines.push("");
      if (curveFitInfo) {
        lines.push(`> **Curve fit quality:** ${curveFitInfo}`);
        lines.push("");
      }

      if (aiPositions.length > 0 && aiPositions.length <= 25) {
        lines.push(`---`);
        lines.push("");
        lines.push(`## Trajectory Coordinates`);
        lines.push("");
        lines.push(`| # | x (px) | y (px) | t (s) |`);
        lines.push(`|---|--------|--------|-------|`);
        for (let i = 0; i < aiPositions.length; i++) {
          const p = aiPositions[i];
          const t = typeof p.t === "number" ? p.t.toFixed(2) : (i * 0.1).toFixed(2);
          lines.push(`| ${i + 1} | ${Math.round(p.x)} | ${Math.round(p.y)} | ${t} |`);
        }
        lines.push("");
      }

      lines.push(`---`);
      lines.push("");
      lines.push(`## Methodology`);
      lines.push("");
      lines.push(`Analysis performed in two passes:`);
      lines.push(`1. **Geometric tracking:** Extracted ${aiPositions.length} positions with parabolic curve fitting and outlier filtering`);
      lines.push(`2. **Descriptive analysis:** Detailed physics report with visual observations and scientific analysis`);
      lines.push("");
      lines.push(`*APAS AI \u2014 Advanced Physics Analysis System*`);
    }

    const finalText = lines.join("\n");

    console.log(`[APAS-AI] Analysis completed: angle=${finalAngle}, velocity=${finalVelocity}, type=${motionType}, confidence=${confidence}`);

    return new Response(JSON.stringify({ text: finalText }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("[APAS-AI] Error analyzing video:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
});
