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

// ── Gemini File API helpers ──

/**
 * Upload a video file to Gemini File API using resumable upload protocol.
 */
async function uploadToGeminiFileAPI(
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
    throw new Error(`Gemini File API start upload failed (${startRes.status}): ${errText}`);
  }

  const uploadUrl = startRes.headers.get("X-Goog-Upload-URL");
  if (!uploadUrl) {
    throw new Error("Gemini File API did not return an upload URL");
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
    throw new Error(`Gemini File API upload failed (${uploadRes.status}): ${errText}`);
  }

  const result = await uploadRes.json();
  return result.file;
}

/**
 * Poll Gemini File API until the file is ACTIVE (processed).
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
      throw new Error(`Gemini file status check failed (${statusRes.status}): ${errText}`);
    }

    const file = await statusRes.json();

    if (file.state === "ACTIVE") {
      return file;
    }

    if (file.state === "FAILED") {
      throw new Error("Gemini file processing failed");
    }

    // Wait 2 seconds before polling again
    await new Promise((r) => setTimeout(r, 2000));
  }

  throw new Error("Gemini file processing timed out");
}

/**
 * Delete a file from Gemini File API (cleanup).
 */
async function deleteGeminiFile(fileName: string, apiKey: string): Promise<void> {
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

    console.log(`[APAS-Gemini] Analyzing video: ${videoName || "unknown"}, trim: ${trimStart}s-${trimEnd}s`);

    const isAr = lang === "ar";

    // Step 1: Download video from Supabase Storage URL
    console.log(`[APAS-Gemini] Downloading video from storage...`);
    const videoResponse = await fetch(videoUrl);
    if (!videoResponse.ok) {
      throw new Error(`Failed to download video: HTTP ${videoResponse.status}`);
    }
    const videoBytes = new Uint8Array(await videoResponse.arrayBuffer());
    const contentType = videoResponse.headers.get("content-type") || "video/mp4";
    console.log(`[APAS-Gemini] Downloaded ${(videoBytes.length / 1024 / 1024).toFixed(2)} MB (${contentType})`);

    // Step 2: Upload video to Gemini File API
    console.log(`[APAS-Gemini] Uploading video to Gemini File API...`);
    const uploadedFile = await uploadToGeminiFileAPI(
      videoBytes,
      contentType,
      videoName || `physics-video-${Date.now()}`,
      geminiKey,
    );
    console.log(`[APAS-Gemini] File uploaded: ${uploadedFile.name}, state: ${uploadedFile.state}`);

    // Step 3: Wait for Gemini to process the video
    let activeFile = uploadedFile;
    if (uploadedFile.state !== "ACTIVE") {
      console.log(`[APAS-Gemini] Waiting for file processing...`);
      activeFile = await waitForFileProcessing(uploadedFile.name, geminiKey);
    }
    console.log(`[APAS-Gemini] File is ACTIVE: ${activeFile.uri}`);

    // Step 4: Build physics analysis prompt
    const trimInfo =
      trimStart != null && trimEnd != null && (trimStart > 0 || trimEnd > 0)
        ? `\n\nIMPORTANT: Analyze ONLY the portion of the video from ${Number(trimStart).toFixed(1)}s to ${Number(trimEnd).toFixed(1)}s. Ignore everything outside this time range.`
        : "";

    const physicsPrompt = `\u0623\u0646\u062a \u062e\u0628\u064a\u0631 \u0641\u064a\u0632\u064a\u0627\u0626\u064a \u0623\u0643\u0627\u062f\u064a\u0645\u064a. \u0642\u0645 \u0628\u062a\u062d\u0644\u064a\u0644 \u0647\u0630\u0627 \u0627\u0644\u0641\u064a\u062f\u064a\u0648 \u0644\u062d\u0631\u0643\u0629 \u0645\u0642\u0630\u0648\u0641. \u0627\u0633\u062a\u062e\u0631\u062c \u0627\u0644\u0625\u062d\u062f\u0627\u062b\u064a\u0627\u062a (x, y) \u0644\u0643\u0644 \u0625\u0637\u0627\u0631\u060c \u0648\u0627\u062d\u0633\u0628 \u0627\u0644\u0633\u0631\u0639\u0629 \u0627\u0644\u0627\u0628\u062a\u062f\u0627\u0626\u064a\u0629 \u0648\u0627\u0644\u0632\u0627\u0648\u064a\u0629 \u0648\u0623\u0642\u0635\u0649 \u0627\u0631\u062a\u0641\u0627\u0639. \u0642\u062f\u0645 \u062a\u0642\u0631\u064a\u0631\u0627\u064b \u0641\u064a\u0632\u064a\u0627\u0626\u064a\u0627\u064b \u0645\u0641\u0635\u0644\u0627\u064b \u0628\u0627\u0644\u0644\u063a\u062a\u064a\u0646 \u0627\u0644\u0639\u0631\u0628\u064a\u0629 \u0648\u0627\u0644\u0625\u0646\u062c\u0644\u064a\u0632\u064a\u0629\u060c \u0648\u0627\u0631\u0633\u0645 \u0627\u0644\u0645\u0633\u0627\u0631 \u0639\u0644\u0649 \u0627\u0644\u0643\u0627\u0646\u0641\u0627\u0633.

You are APAS (Advanced Physics Analysis System) \u2014 a precise physics video analysis system powered by Gemini 2.5 Flash with native video understanding.
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

PHYSICAL CONSTRAINTS (use these to validate your tracking):
- Gravity causes downward acceleration: vertical speed should increase over time when falling.
- Horizontal velocity should remain approximately constant (no air resistance).
- The trajectory should form a smooth parabola (or straight line for vertical/horizontal throws).

RESPOND WITH ONLY THIS JSON (no other text, no markdown fences):
{
  "detected": true,
  "objectType": "<type of object>",
  "estimatedMass": <mass_in_kg>,
  "launchHeight": <height_in_meters>,
  "imageWidth": <estimated_frame_width_pixels>,
  "peakFrame": <frame_number_at_max_height_or_null>,
  "impactFrame": <frame_number_at_ground_hit_or_null>,
  "dragEffect": "<none|slight|significant>",
  "positions": [
    {"frame": 1, "x": <pixel_x>, "y": <pixel_y>, "t": <time_seconds>},
    {"frame": 2, "x": <pixel_x>, "y": <pixel_y>, "t": <time_seconds>}
  ]
}

If NO moving object is found at all:
{"detected": false, "positions": []}`;

    // Step 5: Call Gemini 2.5 Flash with the video and prompt
    console.log(`[APAS-Gemini] Calling Gemini 2.5 Flash for physics analysis...`);

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

    // Cleanup: delete the file from Gemini (best-effort)
    deleteGeminiFile(activeFile.name, geminiKey);

    if (!genRes.ok) {
      const errorText = await genRes.text();
      console.error(`[APAS-Gemini] Gemini API error ${genRes.status}: ${errorText}`);
      throw new Error(`Gemini API error: ${genRes.status} - ${errorText}`);
    }

    const genData = await genRes.json();
    // Gemini response format: { candidates: [{ content: { parts: [{ text: "..." }] } }] }
    const responseText =
      genData?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    if (!responseText) {
      throw new Error("Gemini returned empty response");
    }

    console.log(`[APAS-Gemini] Gemini response length: ${responseText.length}`);

    // Step 6: Parse Gemini response
    // Try to extract JSON from the response (handle markdown fences or raw JSON)
    let aiResult: {
      detected?: boolean;
      objectType?: string;
      estimatedMass?: number;
      launchHeight?: number;
      imageWidth?: number;
      peakFrame?: number | null;
      impactFrame?: number | null;
      dragEffect?: string;
      positions?: Array<{ frame: number; x: number; y: number; t?: number }>;
    } = {};

    const jsonMatch = responseText.match(/```json\s*([\s\S]*?)```/);
    if (jsonMatch) {
      try {
        aiResult = JSON.parse(jsonMatch[1].trim());
      } catch {
        try {
          aiResult = JSON.parse(responseText.trim());
        } catch {
          /* ignore */
        }
      }
    } else {
      try {
        aiResult = JSON.parse(responseText.trim());
      } catch {
        // Try to find JSON object in the text
        const objMatch = responseText.match(/\{[\s\S]*\}/);
        if (objMatch) {
          try {
            aiResult = JSON.parse(objMatch[0]);
          } catch {
            /* ignore */
          }
        }
      }
    }

    // Step 7: Multi-method geometric computation (same as original)
    let finalAngle = 45;
    let finalVelocity = 15;
    let motionType: "vertical" | "horizontal" | "projectile" = "projectile";
    let confidence = 50;
    let curveFitInfo = "";

    const detected = aiResult.detected !== false;
    const aiPositions = aiResult.positions || [];
    const imageWidth = aiResult.imageWidth || 1280;

    if (detected && aiPositions.length >= 2) {
      const positions: Position[] = aiPositions.map((p, i) => ({
        x: p.x,
        y: p.y,
        t: typeof p.t === "number" ? p.t : i * 0.1,
      }));

      const cleanPositions = filterOutlierPositions(positions);
      console.log(`[APAS-Gemini] Positions: ${positions.length} raw, ${cleanPositions.length} after filtering`);

      motionType = classifyMotion(cleanPositions);
      console.log(`[APAS-Gemini] Motion type: ${motionType}`);

      // Method 1: Velocity-vector angle
      const velocityAngle = computeLaunchAngle(cleanPositions);
      console.log(`[APAS-Gemini] Velocity-vector angle: ${velocityAngle}deg`);

      // Method 2: Parabolic curve fitting
      const curveFit = fitParabolicTrajectory(cleanPositions, imageWidth, calibrationMeters, userGravity);
      let curveAngle: number | null = null;
      let curveVelocity: number | null = null;

      if (curveFit) {
        curveAngle = curveFit.angle;
        curveVelocity = curveFit.velocity;
        curveFitInfo = `R^2 = ${curveFit.r_squared.toFixed(3)}`;
        console.log(`[APAS-Gemini] Curve fit: angle=${curveAngle}deg, velocity=${curveVelocity}m/s, R^2=${curveFit.r_squared.toFixed(3)}`);
      }

      // Method 3: Linear velocity estimation
      const linearVelocity = estimateVelocity(cleanPositions, imageWidth, calibrationMeters);
      console.log(`[APAS-Gemini] Linear velocity estimate: ${linearVelocity} m/s`);

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

      // Calculate confidence (Gemini native video is more accurate, higher base)
      let baseConfidence = 60;
      baseConfidence += Math.min(20, cleanPositions.length * 3);
      if (cleanPositions.length === positions.length) baseConfidence += 8;
      if (curveFit && curveFit.r_squared > 0.8) baseConfidence += 12;
      else if (curveFit && curveFit.r_squared > 0.5) baseConfidence += 6;
      if (curveAngle !== null && Math.abs(curveAngle - velocityAngle) < 10) baseConfidence += 5;
      if (Math.abs(finalAngle - 45) > 5 && Math.abs(finalAngle - 60) > 5 && Math.abs(finalAngle - 90) > 5) baseConfidence += 3;

      confidence = Math.min(98, Math.max(40, baseConfidence));
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

    // Build beautiful structured analysis text
    const lines: string[] = [];

    // Hidden JSON block for programmatic parsing (frontend extracts this)
    lines.push("```json\n" + JSON.stringify(finalResult, null, 2) + "\n```");
    lines.push("");

    const vx = Math.round(finalVelocity * Math.cos(finalAngle * Math.PI / 180) * 10) / 10;
    const vy = Math.round(finalVelocity * Math.sin(finalAngle * Math.PI / 180) * 10) / 10;
    const dragLabel = finalResult.dragEffect === 'none'
      ? (isAr ? 'لا يوجد' : 'None')
      : finalResult.dragEffect === 'slight'
        ? (isAr ? 'طفيف' : 'Slight')
        : (isAr ? 'كبير' : 'Significant');

    if (isAr) {
      // ── Arabic beautiful output ──
      lines.push(`## تحليل حركة المقذوف`);
      lines.push("");
      lines.push(`**نوع الجسم:** ${finalResult.objectType}`);
      lines.push(`**نوع الحركة:** ${motionTypeLabel}`);
      lines.push(`**الإطارات المحللة:** ${aiPositions.length} إطار`);
      lines.push(`**تأثير مقاومة الهواء:** ${dragLabel}`);
      lines.push("");

      lines.push(`---`);
      lines.push("");
      lines.push(`## النتائج الفيزيائية`);
      lines.push("");
      lines.push(`- **زاوية الإطلاق:** ${finalAngle}°`);
      lines.push(`- **السرعة الابتدائية:** ${finalVelocity} m/s`);
      lines.push(`- **ارتفاع الإطلاق:** ${finalResult.height} m`);
      lines.push(`- **الكتلة:** ${finalResult.mass} kg`);
      lines.push(`- **نسبة الثقة:** ${confidence}%`);
      lines.push("");

      lines.push(`---`);
      lines.push("");
      lines.push(`## المعادلات`);
      lines.push("");
      lines.push(`> **معادلة المسار**`);
      lines.push(`> y = x * tan(theta) - g * x^2 / (2 * v0^2 * cos^2(theta))`);
      lines.push("");
      lines.push(`> **مركبات السرعة**`);
      lines.push(`> vx = ${finalVelocity} * cos(${finalAngle}) = ${vx} m/s`);
      lines.push(`> vy = ${finalVelocity} * sin(${finalAngle}) = ${vy} m/s`);
      lines.push("");
      if (curveFitInfo) {
        lines.push(`> **جودة المطابقة:** ${curveFitInfo}`);
        lines.push("");
      }

      if (aiPositions.length > 0 && aiPositions.length <= 20) {
        lines.push(`---`);
        lines.push("");
        lines.push(`## مسار الحركة`);
        lines.push("");
        for (let i = 0; i < aiPositions.length; i++) {
          const p = aiPositions[i];
          const t = typeof p.t === "number" ? p.t.toFixed(2) : (i * 0.1).toFixed(2);
          lines.push(`- **${i + 1}.** x=${Math.round(p.x)} , y=${Math.round(p.y)} , t=${t}s`);
        }
        lines.push("");
      }

      lines.push(`---`);
      lines.push("");
      lines.push(`## المنهجية`);
      lines.push("");
      lines.push(`تحليل الفيديو مباشرة عبر Gemini 2.5 Flash مع تتبع ${aiPositions.length} موقع ومطابقة منحنى قطعي ثم تصفية القيم الشاذة.`);
      lines.push("");
      lines.push(`*APAS + Gemini 2.5 Flash*`);
    } else {
      // ── English beautiful output ──
      lines.push(`## Projectile Motion Analysis`);
      lines.push("");
      lines.push(`**Object:** ${finalResult.objectType}`);
      lines.push(`**Motion type:** ${motionTypeLabel}`);
      lines.push(`**Frames analyzed:** ${aiPositions.length}`);
      lines.push(`**Air resistance:** ${dragLabel}`);
      lines.push("");

      lines.push(`---`);
      lines.push("");
      lines.push(`## Physics Results`);
      lines.push("");
      lines.push(`- **Launch angle:** ${finalAngle}°`);
      lines.push(`- **Initial velocity:** ${finalVelocity} m/s`);
      lines.push(`- **Launch height:** ${finalResult.height} m`);
      lines.push(`- **Mass:** ${finalResult.mass} kg`);
      lines.push(`- **Confidence:** ${confidence}%`);
      lines.push("");

      lines.push(`---`);
      lines.push("");
      lines.push(`## Equations`);
      lines.push("");
      lines.push(`> **Trajectory equation**`);
      lines.push(`> y = x * tan(theta) - g * x^2 / (2 * v0^2 * cos^2(theta))`);
      lines.push("");
      lines.push(`> **Velocity components**`);
      lines.push(`> vx = ${finalVelocity} * cos(${finalAngle}) = ${vx} m/s`);
      lines.push(`> vy = ${finalVelocity} * sin(${finalAngle}) = ${vy} m/s`);
      lines.push("");
      if (curveFitInfo) {
        lines.push(`> **Curve fit quality:** ${curveFitInfo}`);
        lines.push("");
      }

      if (aiPositions.length > 0 && aiPositions.length <= 20) {
        lines.push(`---`);
        lines.push("");
        lines.push(`## Trajectory Points`);
        lines.push("");
        for (let i = 0; i < aiPositions.length; i++) {
          const p = aiPositions[i];
          const t = typeof p.t === "number" ? p.t.toFixed(2) : (i * 0.1).toFixed(2);
          lines.push(`- **${i + 1}.** x=${Math.round(p.x)} , y=${Math.round(p.y)} , t=${t}s`);
        }
        lines.push("");
      }

      lines.push(`---`);
      lines.push("");
      lines.push(`## Methodology`);
      lines.push("");
      lines.push(`Native video analysis via Gemini 2.5 Flash with ${aiPositions.length} tracked positions, parabolic curve fitting, and outlier filtering.`);
      lines.push("");
      lines.push(`*APAS + Gemini 2.5 Flash*`);
    }

    const finalText = lines.join("\n");

    console.log(`[APAS-Gemini] Analysis completed: angle=${finalAngle}, velocity=${finalVelocity}, type=${motionType}, confidence=${confidence}`);

    return new Response(JSON.stringify({ text: finalText }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("[APAS-Gemini] Error analyzing video:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
});
