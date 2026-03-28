import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// \u2500\u2500 Retry Utilities \u2500\u2500

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  label: string,
  maxRetries = 3,
  initialDelay = 2000,
): Promise<T> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err as Error;
      const is429 = lastError.message.includes("429");
      if (!is429 || attempt === maxRetries) throw lastError;
      const delay = initialDelay * Math.pow(2, attempt);
      console.log(
        "[Retry] " + label + " rate limited (429), waiting " + delay + "ms before retry " + (attempt + 1) + "/" + maxRetries + "...",
      );
      await sleep(delay);
    }
  }
  throw lastError!;
}


// \u2500\u2500 Smart Defaults Based on Object Type \u2500\u2500

interface PhysicsDefaults {
  velocity: number;
  angle: number;
  height: number;
  mass: number;
}

function getSmartDefaults(objectType: string): PhysicsDefaults {
  const t = (objectType || "").toLowerCase();
  if (t.includes("cannon") || t.includes("cannonball")) return { velocity: 120, angle: 40, height: 1.5, mass: 4.5 };
  if (t.includes("rocket") || t.includes("missile")) return { velocity: 200, angle: 55, height: 2.0, mass: 15 };
  if (t.includes("basketball")) return { velocity: 8, angle: 55, height: 2.2, mass: 0.62 };
  if (t.includes("football") || t.includes("soccer")) return { velocity: 25, angle: 38, height: 0.3, mass: 0.43 };
  if (t.includes("tennis")) return { velocity: 30, angle: 15, height: 1.0, mass: 0.058 };
  if (t.includes("baseball")) return { velocity: 35, angle: 35, height: 1.8, mass: 0.145 };
  if (t.includes("javelin")) return { velocity: 28, angle: 38, height: 2.0, mass: 0.8 };
  if (t.includes("arrow")) return { velocity: 60, angle: 25, height: 1.5, mass: 0.025 };
  if (t.includes("stone") || t.includes("rock")) return { velocity: 15, angle: 45, height: 1.7, mass: 0.3 };
  if (t.includes("grenade")) return { velocity: 18, angle: 42, height: 1.8, mass: 0.4 };
  if (t.includes("bullet")) return { velocity: 400, angle: 5, height: 1.5, mass: 0.01 };
  if (t.includes("ball")) return { velocity: 15, angle: 45, height: 1.5, mass: 0.5 };
  return { velocity: 20, angle: 45, height: 1.5, mass: 0.5 };
}

// \u2500\u2500 Frame Limiting \u2500\u2500
const MAX_FRAMES = 8;

function limitFrames(
  frames: Array<{ data: string; timestamp: number }>,
): Array<{ data: string; timestamp: number }> {
  if (frames.length <= MAX_FRAMES) return frames;
  console.log("[video-analyze] Limiting frames from " + frames.length + " to " + MAX_FRAMES + " (evenly sampled)");
  const limited: Array<{ data: string; timestamp: number }> = [];
  const step = (frames.length - 1) / (MAX_FRAMES - 1);
  for (let i = 0; i < MAX_FRAMES; i++) {
    const idx = Math.round(i * step);
    limited.push(frames[idx]);
  }
  return limited;
}

// \u2500\u2500 Mistral Vision for Video (EXCLUSIVE) \u2500\u2500

function buildVideoVisionPrompt(_lang?: string): string {
  return [
    "You are Professor APAS - a world-renowned expert in Mechanical Physics from ENS (Ecole Normale Superieure, Paris).",
    "You specialize in projectile motion analysis from video footage.",
    "Your tone is authoritative, analytical, and professional.",
    "",
    "TASK: Analyze these video frames for projectile motion.",
    "",
    "STEP 1 - DETECT PROJECTILE:",
    "Watch ALL frames sequentially. Look for ANY object being launched, thrown, shot, or in mid-flight.",
    "Valid projectiles: ball (basketball, football, tennis, etc.), rocket, stone, bullet, grenade, arrow, javelin, cannonball, any thrown/launched object.",
    "Also detect diagrams, illustrations, animations, or educational videos showing projectile motion - these are VALID.",
    "If NO clear projectile motion is visible, respond with ONLY:",
    '{"detected": false, "error": "No projectile motion detected in this video."}',
    "",
    "STEP 2 - TRACK AND ANALYZE:",
    "- Identify the projectile object SPECIFICALLY from its visual appearance (color, shape, size, texture) - DO NOT default to cannonball",
    "- Track the object position across frames",
    "- Use reference objects for scale: person ~1.7m, door ~2m, car ~1.5m tall, basketball hoop 3.05m",
    "- Estimate launch angle from trajectory arc",
    "- Estimate initial velocity from frame-to-frame displacement",
    "- Estimate launch height from ground reference",
    "- Estimate mass from object type (basketball ~0.62kg, cannonball ~4.5kg, stone ~0.3kg, etc.)",
    "",
    "CRITICAL RULES FOR ESTIMATION:",
    "- You MUST provide NON-ZERO values for velocity, angle, and height.",
    "- NEVER return 0 for velocity. A projectile MUST have a non-zero initial velocity.",
    "- NEVER return 0 for angle. Even a horizontal throw has a small angle (~5 degrees).",
    "- For a cannonball: velocity is typically 80-200 m/s, angle 30-50 degrees",
    "- For a ball throw: velocity is typically 8-30 m/s, angle 30-60 degrees",
    "- For a rocket/missile: velocity is typically 100-500 m/s, angle 30-70 degrees",
    "- Professors estimate, they NEVER return zeros!",
    "",
    "STEP 3 - COMPUTE PHYSICS using the projectile motion equation:",
    "The fundamental equation is: y(t) = h₀ + V₀·sin(θ)·t − ½g·t²",
    "Ensure your angle and velocity estimates are CONSISTENT with the visual trajectory.",
    "- V₀x = V₀·cos(θ), V₀y = V₀·sin(θ)",
    "- Max height: H = h₀ + V₀y² / (2·g)",
    "- Time of flight: solve y(t) = 0",
    "- Range: R = V₀x * T",
    "- Impact velocity: V_impact = √(V₀x² + (V₀y - g·T)²)",
    "",
    "RESPOND WITH ONLY valid JSON (no markdown fences):",
    "{",
    '  "detected": true,',
    '  "objectType": "specific object name in English",',
    '  "confidence": 75,',
    '  "angle": 42,',
    '  "velocity": 120,',
    '  "height": 1.5,',
    '  "mass": 4.5,',
    '  "gravity": 9.81,',
    '  "V₀x": 89.17,',
    '  "V₀y": 80.26,',
    '  "maxHeight": 329.96,',
    '  "maxRange": 1461.74,',
    '  "totalTime": 16.39,',
    '  "impactVelocity": 120.12,',
    '  "calibrationRef": "reference object used for scale",',
    '  "motionDescription": "description of the motion observed",',
    '  "analysis_summary_ar": "Arabic summary of the analysis"',
    "}",
    "",
    "REMEMBER: ALL numeric values MUST be non-zero and physically realistic!",
  ].join("\n");
}

// Mistral vision models ordered by priority for fallback
const MISTRAL_VIDEO_VISION_MODELS = [
  "pixtral-large-latest",    // Primary: most powerful Mistral vision model (124B)
  "pixtral-12b-2409",        // Fallback 1: lighter Mistral vision model (12B)
  "mistral-small-latest",    // Fallback 2: Mistral Small with vision capabilities
];

async function callMistralVideoAnalysis(
  frames: Array<{ data: string; timestamp: number }>,
  lang: string,
): Promise<string> {
  const apiKey = Deno.env.get("MISTRAL_API_KEY");
  if (!apiKey) throw new Error("MISTRAL_API_KEY not configured");

  const visionPrompt = buildVideoVisionPrompt(lang);

  // Build vision content with frames
  const visionContent: Array<{ type: string; text?: string; image_url?: { url: string } }> = [];
  visionContent.push({ type: "text", text: visionPrompt + "\n\nNote: Showing key frames from the video." });

  const mistralMaxFrames = Math.min(6, frames.length);
  const step = frames.length > 1 ? (frames.length - 1) / (mistralMaxFrames - 1) : 0;
  for (let i = 0; i < mistralMaxFrames; i++) {
    const idx = Math.round(i * step);
    const frame = frames[idx];
    const ts = typeof frame.timestamp === "number" ? frame.timestamp.toFixed(3) : String(idx * 0.1);
    visionContent.push({ type: "text", text: "--- Frame " + (i + 1) + "/" + mistralMaxFrames + " (Time: " + ts + "s) ---" });

    let base64Data = frame.data;
    let frameMime = "image/jpeg";
    if (base64Data.startsWith("data:")) {
      const match = base64Data.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        frameMime = match[1];
        base64Data = match[2];
      }
    }
    const dataUrl = "data:" + frameMime + ";base64," + base64Data;
    visionContent.push({ type: "image_url", image_url: { url: dataUrl } });
  }

  const systemMessage = "You are Professor APAS, the Elite Analyzer from ENS. ZERO BIAS: Provide strictly scientific estimates based on pixels and physics. " +
    "CRITICAL: Identify the ACTUAL object in the video frames - DO NOT default to cannonball. Look at colors, shapes, textures, and context. " +
    "Use the equation y = x*tan(theta) - (g*x^2)/(2*v0^2*cos^2(theta)) for consistency. Respond with ONLY valid JSON. NEVER return zeros.";

  let lastError: Error | null = null;

  for (const model of MISTRAL_VIDEO_VISION_MODELS) {
    try {
      console.log("[video-analyze] Trying Mistral model: " + model);

      const result = await retryWithBackoff(async () => {
        const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + apiKey,
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: systemMessage },
              { role: "user", content: visionContent },
            ],
            temperature: 0.2,
            max_tokens: 4000,
          }),
        });

        if (!res.ok) {
          const err = await res.text();
          throw new Error("Mistral API error (" + res.status + "): " + err);
        }

        const data = await res.json();
        return data.choices?.[0]?.message?.content || "";
      }, "Mistral-Video-" + model);

      console.log("[video-analyze] Mistral model " + model + " succeeded");
      return result;
    } catch (err) {
      lastError = err as Error;
      const errMsg = lastError.message || "";
      // If model is decommissioned (400) or not found (404), try next model
      const isModelError = errMsg.includes("400") || errMsg.includes("404") || errMsg.includes("decommissioned") || errMsg.includes("not found") || errMsg.includes("does not exist");
      if (isModelError) {
        console.warn("[video-analyze] Mistral model " + model + " unavailable: " + errMsg + ", trying next...");
        continue;
      }
      // For other errors (rate limit exhausted after retries, server error), throw
      throw lastError;
    }
  }

  throw lastError || new Error("All Mistral video vision models failed");
}

// \u2500\u2500 JSON Parser \u2500\u2500

function parseJsonFromText(text: string): Record<string, unknown> {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) {
    try { return JSON.parse(fenced[1].trim()); } catch { /* fallback */ }
  }
  const raw = text.match(/\{[\s\S]*\}/);
  if (raw) {
    try { return JSON.parse(raw[0]); } catch { /* fallback */ }
  }
  return {};
}

// \u2500\u2500 Energy Conservation Verification \u2500\u2500

function verifyWithEnergy(r: {
  velocity?: number; angle?: number; height?: number;
  gravity?: number; maxHeight?: number; impactVelocity?: number;
}): { verified: boolean; energyError: number; note: string } {
  const v0 = r.velocity || 0;
  const h0 = r.height || 0;
  const g = r.gravity || 9.81;
  const vImpact = r.impactVelocity || 0;

  if (v0 === 0) return { verified: true, energyError: 0, note: "No velocity to verify" };

  const energyLaunch = 0.5 * v0 * v0 + g * h0;
  const energyImpact = 0.5 * vImpact * vImpact;
  const errorImpact = energyLaunch > 0 ? Math.abs(energyLaunch - energyImpact) / energyLaunch : 0;

  if (errorImpact < 0.05) return { verified: true, energyError: errorImpact, note: "Energy conservation verified (<5% error)" };
  if (errorImpact < 0.15) return { verified: true, energyError: errorImpact, note: "Energy conservation approximate (5-15% error)" };
  return { verified: false, energyError: errorImpact, note: "Energy conservation failed (>15% error)" };
}

// \u2500\u2500 Upsert Analysis to Database \u2500\u2500

async function upsertAnalysis(
  supabase: ReturnType<typeof createClient>,
  analysisData: Record<string, unknown>,
): Promise<string | null> {
  try {
    // Check if analysis already exists for this video file
    const sourceFilename = analysisData.source_filename;
    if (sourceFilename) {
      const { data: existing } = await supabase
        .from("analyses")
        .select("id")
        .eq("source_filename", sourceFilename)
        .limit(1)
        .maybeSingle();

      if (existing) {
        console.log("[video-analyze] Found existing analysis, updating instead of inserting...");
        const { data, error } = await supabase
          .from("analyses")
          .update(analysisData)
          .eq("id", existing.id)
          .select("id")
          .single();

        if (error) {
          console.warn("[video-analyze] DB update failed:", error.message);
          return null;
        }
        return data?.id || null;
      }
    }

    const { data, error } = await supabase
      .from("analyses")
      .insert(analysisData)
      .select("id")
      .single();

    if (error) {
      console.warn("[video-analyze] DB insert failed:", error.message);
      return null;
    }

    return data?.id || null;
  } catch (err) {
    console.warn("[video-analyze] DB upsert error:", (err as Error).message);
    return null;
  }
}

// \u2500\u2500 Main Handler \u2500\u2500

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const { frames, lang, videoName, userId } = await req.json();

    if (!frames || !Array.isArray(frames) || frames.length === 0) {
      return new Response(JSON.stringify({ error: "No frames provided" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    console.log("[video-analyze] Received " + frames.length + " frames for analysis");
    const isAr = lang === "ar";

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Limit frames to reduce token consumption
    const limitedFrames = limitFrames(frames);
    console.log("[video-analyze] Using " + limitedFrames.length + " frames (limited from " + frames.length + ")");

    // Call Mistral Vision (EXCLUSIVE - no Groq/LLaMA fallback)
    console.log("[video-analyze] Calling Mistral Vision (exclusive provider)...");
    const rawResponse = await callMistralVideoAnalysis(limitedFrames, lang || "ar");
    console.log("[video-analyze] Mistral response length:", rawResponse.length);

    const visionData = parseJsonFromText(rawResponse);

    if (!(visionData as { detected?: boolean }).detected) {
      const noDetectReport = isAr
        ? "# \u0644\u0645 \u064a\u062a\u0645 \u0627\u0643\u062a\u0634\u0627\u0641 \u062d\u0631\u0643\u0629\n\n\u0644\u0645 \u064a\u062a\u0645 \u0627\u0644\u0639\u062b\u0648\u0631 \u0639\u0644\u0649 \u062c\u0633\u0645 \u0645\u062a\u062d\u0631\u0643 \u0641\u064a \u0627\u0644\u0641\u064a\u062f\u064a\u0648. \u062d\u0627\u0648\u0644 \u0631\u0641\u0639 \u0641\u064a\u062f\u064a\u0648 \u064a\u0638\u0647\u0631 \u0641\u064a\u0647 \u0645\u0642\u0630\u0648\u0641 \u0648\u0627\u0636\u062d."
        : "# No Motion Detected\n\nNo moving projectile was found in the video. Try uploading a video with a clear projectile.";
      return new Response(
        JSON.stringify({ text: noDetectReport, detected: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Extract object type first to get smart defaults
    const objectType = String((visionData as { objectType?: string }).objectType || "projectile");
    const defaults = getSmartDefaults(objectType);

    // Extract and validate physics values - USE SMART DEFAULTS if AI returns 0
    const rawV0 = Number((visionData as { velocity?: number }).velocity) || 0;
    const rawAngle = Number((visionData as { angle?: number }).angle) || 0;
    const rawH0 = Number((visionData as { height?: number }).height) || 0;

    const v0 = rawV0 > 0 ? rawV0 : defaults.velocity;
    const angle = rawAngle > 0 ? rawAngle : defaults.angle;
    const h0 = rawH0 > 0 ? rawH0 : defaults.height;
    const g = Number((visionData as { gravity?: number }).gravity) || 9.81;
    const mass = Number((visionData as { mass?: number }).mass) || defaults.mass;
    const confidence = Number((visionData as { confidence?: number }).confidence) || 70;
    const analysisSummaryAr = String((visionData as { analysis_summary_ar?: string }).analysis_summary_ar || "");
    const motionDescription = String((visionData as { motionDescription?: string }).motionDescription || "");

    let usedDefaults = false;
    if (rawV0 === 0 || rawAngle === 0) {
      usedDefaults = true;
      console.log("[video-analyze] AI returned zeros, using smart defaults for: " + objectType);
    }

    // Always recompute physics from v0 and angle for consistency
    const rad = angle * Math.PI / 180;
    const v0x = Math.round(v0 * Math.cos(rad) * 100) / 100;
    const v0y = Math.round(v0 * Math.sin(rad) * 100) / 100;
    const maxHeight = Math.round((h0 + (v0y * v0y) / (2 * g)) * 100) / 100;
    const tUp = v0y / g;
    const tDown = Math.sqrt(Math.max(0, 2 * maxHeight / g));
    const totalTime = Math.round((tUp + tDown) * 100) / 100;
    const maxRange = Math.round(v0x * totalTime * 100) / 100;
    const vyEnd = g * totalTime - v0y;
    const impactVelocity = Math.round(Math.sqrt(v0x * v0x + vyEnd * vyEnd) * 100) / 100;
    const kineticEnergy = Math.round(0.5 * mass * v0 * v0 * 100) / 100;
    const potentialEnergy = Math.round(mass * g * maxHeight * 100) / 100;

    // Energy verification
    const verification = verifyWithEnergy({
      velocity: v0, angle, height: h0, gravity: g,
      maxHeight, impactVelocity,
    });

    // Cross-check AI results with mathematical results
    const aiMaxHeight = Number((visionData as { maxHeight?: number }).maxHeight) || 0;
    const aiRange = Number((visionData as { maxRange?: number }).maxRange) || 0;
    const heightDiff = aiMaxHeight > 0 ? Math.abs(aiMaxHeight - maxHeight) / aiMaxHeight : 0;
    const rangeDiff = aiRange > 0 ? Math.abs(aiRange - maxRange) / aiRange : 0;
    
    let consistencyNote = "";
    if (heightDiff > 0.25 || rangeDiff > 0.25) {
      consistencyNote = isAr 
        ? "\u26a0\ufe0f \u062a\u0646\u0628\u064a\u0647: \u0647\u0646\u0627\u0643 \u062a\u0641\u0627\u0648\u062a \u0641\u064a \u062a\u062a\u0628\u0639 \u0627\u0644\u062d\u0631\u0643\u0629 \u0639\u0628\u0631 \u0627\u0644\u0625\u0637\u0627\u0631\u0627\u062a. \u062a\u0645 \u062a\u0635\u062d\u064a\u062d \u0627\u0644\u0642\u064a\u0645 \u0641\u064a\u0632\u064a\u0627\u0626\u064a\u0627\u064b."
        : "\u26a0\ufe0f Warning: Discrepancy in motion tracking across frames. Physics-corrected values applied.";
    }

    if (usedDefaults) {
      const defaultNote = isAr
        ? "\u2139\ufe0f \u062a\u0645 \u0627\u0633\u062a\u062e\u062f\u0627\u0645 \u0642\u064a\u0645 \u0645\u0639\u064a\u0627\u0631\u064a\u0629 \u0644\u0644\u062c\u0633\u0645 \u0644\u0635\u0639\u0648\u0628\u0629 \u0627\u0644\u062a\u0642\u062f\u064a\u0631 \u0627\u0644\u062f\u0642\u064a\u0642 \u0645\u0646 \u0627\u0644\u0641\u064a\u062f\u064a\u0648."
        : "\u2139\ufe0f Standard physical defaults used due to tracking limitations in the video.";
      consistencyNote += (consistencyNote ? "\n" : "") + defaultNote;
    }

    const processingTime = Date.now() - startTime;

    const finalJson: Record<string, unknown> = {
      detected: true, confidence, angle, velocity: v0,
      mass, height: h0, objectType, gravity: g,
      v0x, v0y, maxHeight, maxRange, totalTime, impactVelocity,
      kineticEnergy, potentialEnergy,
      verified: verification.verified,
      energyError: Math.round(verification.energyError * 10000) / 100,
      framesUsed: limitedFrames.length,
      framesReceived: frames.length,
      analysisSummaryAr: analysisSummaryAr,
      providers: { extraction: "Mistral", solving: "Mistral" },
      processingTimeMs: processingTime,
      consistencyNote,
    };

    // Upsert to Supabase analyses table
    console.log("[video-analyze] Upserting analysis to database...");
    const dbRecord: Record<string, unknown> = {
      source_type: "video",
      source_filename: videoName || "video",
      initial_velocity: v0,
      launch_angle: angle,
      launch_height: h0,
      max_altitude: maxHeight,
      horizontal_range: maxRange,
      time_of_flight: totalTime,
      impact_velocity: impactVelocity,
      v0x: v0x,
      v0y: v0y,
      object_type: objectType,
      estimated_mass: mass,
      motion_type: "projectile",
      confidence_score: confidence,
      analysis_method: "estimated",
      analysis_engine: "mistral_pixtral_vision",
      calibration_source: "auto",
      gravity: g,
      report_text: motionDescription,
      report_lang: isAr ? "ar" : "en",
      analysis_summary_ar: analysisSummaryAr,
      ai_provider: "Mistral",
      processing_time_ms: processingTime,
      user_id: userId || null,
    };

    const analysisId = await upsertAnalysis(supabase, dbRecord);
    if (analysisId) {
      console.log("[video-analyze] Analysis saved with ID:", analysisId);
      finalJson.analysisId = analysisId;
    }

    // Build report
    const report = [
      "```json",
      JSON.stringify(finalJson, null, 2),
      "```",
      "",
      isAr ? "# APAS AI \u062a\u0642\u0631\u064a\u0631 \u062a\u062d\u0644\u064a\u0644 \u0627\u0644\u0641\u064a\u062f\u064a\u0648" : "# APAS AI Video Analysis Report",
      "",
      isAr ? "## \u0627\u0644\u0643\u0627\u0626\u0646 \u0627\u0644\u0645\u0643\u062a\u0634\u0641" : "## Detected Object",
      (isAr ? "\u0627\u0644\u0646\u0648\u0639: " : "Type: ") + "**" + objectType + "**",
      (isAr ? "\u0627\u0644\u0643\u062a\u0644\u0629: " : "Mass: ") + "**" + mass + "** kg",
      (isAr ? "\u0646\u0633\u0628\u0629 \u0627\u0644\u062b\u0642\u0629: " : "Confidence: ") + "**" + confidence + "%**",
      "",
      isAr ? "## \u0627\u0644\u0645\u0639\u0637\u064a\u0627\u062a \u0627\u0644\u0645\u0633\u062a\u062e\u0631\u062c\u0629" : "## Extracted Data",
      (isAr ? "\u0627\u0644\u0633\u0631\u0639\u0629 \u0627\u0644\u0627\u0628\u062a\u062f\u0627\u0626\u064a\u0629: " : "Initial velocity: ") + "**V₀ = " + v0 + "** m/s",
      (isAr ? "\u0632\u0627\u0648\u064a\u0629 \u0627\u0644\u0625\u0637\u0644\u0627\u0642: " : "Launch angle: ") + "**\u03b8 = " + angle + " deg**",
      (isAr ? "\u0627\u0631\u062a\u0641\u0627\u0639 \u0627\u0644\u0625\u0637\u0644\u0627\u0642: " : "Launch height: ") + "**h₀ = " + h0 + "** m",
      "",
      isAr ? "## \u0627\u0644\u0646\u062a\u0627\u0626\u062c \u0627\u0644\u0645\u062d\u0633\u0648\u0628\u0629" : "## Computed Results",
      "V₀x = " + v0x + " m/s",
      "V₀y = " + v0y + " m/s",
      (isAr ? "\u0623\u0642\u0635\u0649 \u0627\u0631\u062a\u0641\u0627\u0639 = " : "Max height = ") + maxHeight + " m",
      (isAr ? "\u0627\u0644\u0645\u062f\u0649 = " : "Range = ") + maxRange + " m",
      (isAr ? "\u0632\u0645\u0646 \u0627\u0644\u0637\u064a\u0631\u0627\u0646 = " : "Time of flight = ") + totalTime + " s",
      (isAr ? "\u0633\u0631\u0639\u0629 \u0627\u0644\u0627\u0635\u0637\u062f\u0627\u0645 = " : "Impact velocity = ") + impactVelocity + " m/s",
      "",
      isAr ? "## \u0627\u0644\u062a\u062d\u0642\u0642 \u0645\u0646 \u062d\u0641\u0638 \u0627\u0644\u0637\u0627\u0642\u0629" : "## Energy Conservation Check",
      (verification.verified ? "\u2705 " : "\u26a0\ufe0f ") + verification.note,
      "",
      finalJson.consistencyNote ? (finalJson.consistencyNote as string) + "\n" : "",
      (isAr ? "\u0645\u0632\u0648\u062f \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064a: " : "AI Provider: ") + "Mistral AI (Pixtral Vision)",
      (isAr ? "\u0627\u0644\u0625\u0637\u0627\u0631\u0627\u062a: " : "Frames: ") + limitedFrames.length + "/" + frames.length + " used",
      (isAr ? "\u0632\u0645\u0646 \u0627\u0644\u0645\u0639\u0627\u0644\u062c\u0629: " : "Processing time: ") + processingTime + " ms",
    ];

    return new Response(
      JSON.stringify({ text: report.join("\n"), analysis: finalJson }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("video-analyze error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
