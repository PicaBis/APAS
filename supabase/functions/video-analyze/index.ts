import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// -- Retry Utilities --

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  label: string,
  maxRetries = 2,
  initialDelay = 1500,
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

// -- Smart Defaults Based on Object Type --

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

// -- Frame Limiting --
const MAX_FRAMES = 8;

function limitFrames(
  frames: Array<{ data: string; timestamp: number }>,
): Array<{ data: string; timestamp: number }> {
  if (frames.length <= MAX_FRAMES) return frames;
  console.log("[video-analyze] Limiting frames from " + frames.length + " to " + MAX_FRAMES);
  const limited: Array<{ data: string; timestamp: number }> = [];
  const step = (frames.length - 1) / (MAX_FRAMES - 1);
  for (let i = 0; i < MAX_FRAMES; i++) {
    const idx = Math.round(i * step);
    limited.push(frames[idx]);
  }
  return limited;
}

// -- Video Vision Prompt --

function buildVideoVisionPrompt(_lang?: string): string {
  return [
    "You are Professor APAS - expert in Mechanical Physics from ENS.",
    "You specialize in projectile motion analysis from video footage.",
    "",
    "TASK: Analyze these video frames for projectile motion.",
    "",
    "STEP 1 - DETECT PROJECTILE:",
    "Watch ALL frames sequentially. Look for ANY object being launched, thrown, shot, or in mid-flight.",
    "Also detect diagrams, illustrations, animations showing projectile motion - these are VALID.",
    "If NO clear projectile motion is visible, respond with ONLY:",
    '{"detected": false, "error": "No projectile motion detected in this video."}',
    "",
    "STEP 2 - TRACK AND ANALYZE:",
    "- Identify the projectile from its visual appearance - DO NOT default to cannonball",
    "- Track position across frames",
    "- Use reference objects for scale",
    "- Estimate launch angle, velocity, height, mass",
    "",
    "CRITICAL: You MUST provide NON-ZERO values. NEVER return 0.",
    "",
    "STEP 3 - COMPUTE PHYSICS:",
    "- v0x = v0 * cos(angle), v0y = v0 * sin(angle)",
    "- Max height: H = h0 + v0y^2 / (2*g)",
    "- Time of flight, Range, Impact velocity",
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
    '  "v0x": 89.17, "v0y": 80.26,',
    '  "maxHeight": 329.96,',
    '  "maxRange": 1461.74,',
    '  "totalTime": 16.39,',
    '  "impactVelocity": 120.12,',
    '  "calibrationRef": "reference object used",',
    '  "motionDescription": "description of motion observed",',
    '  "analysis_summary_ar": "Arabic summary"',
    "}",
    "",
    "ALL numeric values MUST be non-zero and physically realistic!",
  ].join("\n");
}

// -- Build frame content for vision APIs --

function buildFrameContent(
  frames: Array<{ data: string; timestamp: number }>,
  maxFrames: number,
): Array<{ base64: string; mime: string; timestamp: string }> {
  const result: Array<{ base64: string; mime: string; timestamp: string }> = [];
  const step = frames.length > 1 ? (frames.length - 1) / (Math.min(maxFrames, frames.length) - 1) : 0;
  const count = Math.min(maxFrames, frames.length);

  for (let i = 0; i < count; i++) {
    const idx = Math.round(i * step);
    const frame = frames[idx];
    const ts = typeof frame.timestamp === "number" ? frame.timestamp.toFixed(3) : String(idx * 0.1);

    let base64Data = frame.data;
    let frameMime = "image/jpeg";
    if (base64Data.startsWith("data:")) {
      const match = base64Data.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        frameMime = match[1];
        base64Data = match[2];
      }
    }
    result.push({ base64: base64Data, mime: frameMime, timestamp: ts });
  }
  return result;
}

// -- Mistral Vision for Video --

const MISTRAL_VIDEO_VISION_MODELS = [
  "pixtral-large-latest",
  "pixtral-12b-2409",
  "mistral-small-latest",
];

async function callMistralVideoAnalysis(
  frames: Array<{ data: string; timestamp: number }>,
  lang: string,
): Promise<{ result: string; provider: string }> {
  const apiKey = Deno.env.get("MISTRAL_API_KEY");
  if (!apiKey) throw new Error("MISTRAL_API_KEY not configured");

  const visionPrompt = buildVideoVisionPrompt(lang);
  const frameData = buildFrameContent(frames, 6);

  const visionContent: Array<{ type: string; text?: string; image_url?: { url: string } }> = [];
  visionContent.push({ type: "text", text: visionPrompt + "\n\nNote: Showing key frames from the video." });

  for (let i = 0; i < frameData.length; i++) {
    const f = frameData[i];
    visionContent.push({ type: "text", text: "--- Frame " + (i + 1) + "/" + frameData.length + " (Time: " + f.timestamp + "s) ---" });
    visionContent.push({ type: "image_url", image_url: { url: "data:" + f.mime + ";base64," + f.base64 } });
  }

  const systemMessage = "You are Professor APAS from ENS. ZERO BIAS: Provide strictly scientific estimates. " +
    "Identify the ACTUAL object - DO NOT default to cannonball. Respond with ONLY valid JSON. NEVER return zeros.";

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
      return { result, provider: "Mistral (" + model + ")" };
    } catch (err) {
      lastError = err as Error;
      const errMsg = lastError.message || "";
      if (errMsg.includes("400") || errMsg.includes("404") || errMsg.includes("decommissioned")) {
        console.warn("[video-analyze] Mistral model " + model + " unavailable, trying next...");
        continue;
      }
      if (errMsg.includes("429")) {
        console.warn("[video-analyze] Mistral rate limited after retries, trying fallback...");
        break;
      }
      throw lastError;
    }
  }
  throw lastError || new Error("All Mistral video vision models failed");
}

// -- Gemini Vision for Video (Fallback) --

async function callGeminiVideoAnalysis(
  frames: Array<{ data: string; timestamp: number }>,
  lang: string,
): Promise<{ result: string; provider: string }> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

  const visionPrompt = buildVideoVisionPrompt(lang);
  const frameData = buildFrameContent(frames, 6);
  console.log("[video-analyze] Using Gemini Vision fallback...");

  const parts: Array<{ text?: string; inline_data?: { mime_type: string; data: string } }> = [];
  parts.push({ text: visionPrompt + "\n\nAnalyze these video frames:" });

  for (let i = 0; i < frameData.length; i++) {
    const f = frameData[i];
    parts.push({ text: "--- Frame " + (i + 1) + " (Time: " + f.timestamp + "s) ---" });
    parts.push({ inline_data: { mime_type: f.mime, data: f.base64 } });
  }

  const res = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" + apiKey,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 4000 },
      }),
    },
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error("Gemini API error (" + res.status + "): " + errText);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  console.log("[video-analyze] Gemini succeeded, length: " + text.length);
  return { result: text, provider: "Gemini" };
}

// -- Groq Vision for Video (Fallback 2) --

async function callGroqVideoAnalysis(
  frames: Array<{ data: string; timestamp: number }>,
  lang: string,
): Promise<{ result: string; provider: string }> {
  const apiKey = Deno.env.get("GROQ_API_KEY");
  if (!apiKey) throw new Error("GROQ_API_KEY not configured");

  const visionPrompt = buildVideoVisionPrompt(lang);
  // Groq only supports single image, so use the middle frame
  const midIdx = Math.floor(frames.length / 2);
  const frame = frames[midIdx];
  let base64Data = frame.data;
  let frameMime = "image/jpeg";
  if (base64Data.startsWith("data:")) {
    const match = base64Data.match(/^data:([^;]+);base64,(.+)$/);
    if (match) { frameMime = match[1]; base64Data = match[2]; }
  }
  const dataUrl = "data:" + frameMime + ";base64," + base64Data;

  console.log("[video-analyze] Using Groq Vision fallback (single frame)...");

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + apiKey,
    },
    body: JSON.stringify({
      model: "llama-3.2-90b-vision-preview",
      messages: [{
        role: "user",
        content: [
          { type: "text", text: visionPrompt + "\n\nAnalyze this key frame from a video:" },
          { type: "image_url", image_url: { url: dataUrl } },
        ],
      }],
      temperature: 0.2,
      max_tokens: 4000,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error("Groq API error (" + res.status + "): " + errText);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || "";
  console.log("[video-analyze] Groq succeeded, length: " + text.length);
  return { result: text, provider: "Groq" };
}

// -- Unified Video Vision Call with Fallback Chain --

async function callVideoVisionWithFallback(
  frames: Array<{ data: string; timestamp: number }>,
  lang: string,
): Promise<{ result: string; provider: string }> {
  const errors: string[] = [];

  try {
    return await callMistralVideoAnalysis(frames, lang);
  } catch (e) {
    const msg = (e as Error).message;
    console.warn("[video-analyze] Mistral failed: " + msg);
    errors.push("Mistral: " + msg);
  }

  try {
    return await callGeminiVideoAnalysis(frames, lang);
  } catch (e) {
    const msg = (e as Error).message;
    console.warn("[video-analyze] Gemini failed: " + msg);
    errors.push("Gemini: " + msg);
  }

  try {
    return await callGroqVideoAnalysis(frames, lang);
  } catch (e) {
    const msg = (e as Error).message;
    console.warn("[video-analyze] Groq failed: " + msg);
    errors.push("Groq: " + msg);
  }

  throw new Error("All video vision AI providers failed. Errors: " + errors.join(" | "));
}

// -- JSON Parser --

function parseJsonFromText(text: string): Record<string, unknown> {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) { try { return JSON.parse(fenced[1].trim()); } catch { /* fallback */ } }
  const raw = text.match(/\{[\s\S]*\}/);
  if (raw) { try { return JSON.parse(raw[0]); } catch { /* fallback */ } }
  return {};
}

// -- Energy Conservation Verification --

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

// -- Upsert Analysis to Database --

async function upsertAnalysis(
  supabase: ReturnType<typeof createClient>,
  analysisData: Record<string, unknown>,
): Promise<string | null> {
  try {
    const { data, error } = await supabase.from("analyses").insert(analysisData).select("id").single();
    if (error) { console.warn("[video-analyze] DB upsert failed:", error.message); return null; }
    return data?.id || null;
  } catch (err) {
    console.warn("[video-analyze] DB upsert error:", (err as Error).message);
    return null;
  }
}

// -- Main Handler --

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

    console.log("[video-analyze] Received " + frames.length + " frames");
    const isAr = lang === "ar";

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const limitedFrames = limitFrames(frames);

    // Call Video Vision AI with fallback chain: Mistral -> Gemini -> Groq
    console.log("[video-analyze] Calling Video Vision AI with fallback chain...");
    const { result: rawResponse, provider: aiProvider } = await callVideoVisionWithFallback(limitedFrames, lang || "ar");

    const visionData = parseJsonFromText(rawResponse);

    if (!(visionData as { detected?: boolean }).detected) {
      const noDetectReport = isAr
        ? "# \u0644\u0645 \u064a\u062a\u0645 \u0627\u0643\u062a\u0634\u0627\u0641 \u062d\u0631\u0643\u0629\n\n\u0644\u0645 \u064a\u062a\u0645 \u0627\u0644\u0639\u062b\u0648\u0631 \u0639\u0644\u0649 \u062c\u0633\u0645 \u0645\u062a\u062d\u0631\u0643 \u0641\u064a \u0627\u0644\u0641\u064a\u062f\u064a\u0648."
        : "# No Motion Detected\n\nNo moving projectile was found in the video.";
      return new Response(
        JSON.stringify({ text: noDetectReport, detected: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const objectType = String((visionData as { objectType?: string }).objectType || "projectile");
    const defaults = getSmartDefaults(objectType);

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

    const verification = verifyWithEnergy({ velocity: v0, angle, height: h0, gravity: g, maxHeight, impactVelocity });
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
      analysisSummaryAr,
      providers: { extraction: aiProvider, solving: aiProvider },
      processingTimeMs: processingTime,
    };

    // Upsert to database
    const dbRecord: Record<string, unknown> = {
      source_type: "video", source_filename: videoName || "video",
      initial_velocity: v0, launch_angle: angle, launch_height: h0,
      max_altitude: maxHeight, horizontal_range: maxRange,
      time_of_flight: totalTime, impact_velocity: impactVelocity,
      v0x, v0y, object_type: objectType, estimated_mass: mass,
      motion_type: "projectile", confidence_score: confidence,
      analysis_method: "estimated",
      analysis_engine: aiProvider.includes("Gemini") ? "gemini_vision" : aiProvider.includes("Groq") ? "groq_vision" : "mistral_pixtral_vision",
      calibration_source: "auto", gravity: g,
      report_text: motionDescription,
      report_lang: isAr ? "ar" : "en",
      analysis_summary_ar: analysisSummaryAr,
      ai_provider: aiProvider, processing_time_ms: processingTime,
      user_id: userId || null,
    };

    const analysisId = await upsertAnalysis(supabase, dbRecord);
    if (analysisId) finalJson.analysisId = analysisId;

    // Build report
    const report = [
      "```json", JSON.stringify(finalJson, null, 2), "```", "",
      isAr ? "# APAS AI \u062a\u0642\u0631\u064a\u0631 \u062a\u062d\u0644\u064a\u0644 \u0627\u0644\u0641\u064a\u062f\u064a\u0648" : "# APAS AI Video Analysis Report",
      "",
      isAr ? "## \u0627\u0644\u0643\u0627\u0626\u0646 \u0627\u0644\u0645\u0643\u062a\u0634\u0641" : "## Detected Object",
      (isAr ? "\u0627\u0644\u0646\u0648\u0639: " : "Type: ") + "**" + objectType + "**",
      (isAr ? "\u0627\u0644\u0643\u062a\u0644\u0629: " : "Mass: ") + "**" + mass + "** kg",
      (isAr ? "\u0646\u0633\u0628\u0629 \u0627\u0644\u062b\u0642\u0629: " : "Confidence: ") + "**" + confidence + "%**",
      "",
      isAr ? "## \u0627\u0644\u0645\u0639\u0637\u064a\u0627\u062a" : "## Extracted Data",
      (isAr ? "\u0627\u0644\u0633\u0631\u0639\u0629: " : "Velocity: ") + "**" + v0 + "** m/s",
      (isAr ? "\u0627\u0644\u0632\u0627\u0648\u064a\u0629: " : "Angle: ") + "**" + angle + " deg**",
      (isAr ? "\u0627\u0644\u0627\u0631\u062a\u0641\u0627\u0639: " : "Height: ") + "**" + h0 + "** m",
      "",
      isAr ? "## \u0627\u0644\u0646\u062a\u0627\u0626\u062c" : "## Results",
      "v0x=" + v0x + " v0y=" + v0y + " m/s",
      (isAr ? "\u0623\u0642\u0635\u0649 \u0627\u0631\u062a\u0641\u0627\u0639 = " : "Max height = ") + maxHeight + " m",
      (isAr ? "\u0627\u0644\u0645\u062f\u0649 = " : "Range = ") + maxRange + " m",
      (isAr ? "\u0632\u0645\u0646 \u0627\u0644\u0637\u064a\u0631\u0627\u0646 = " : "Time = ") + totalTime + " s",
      (isAr ? "\u0633\u0631\u0639\u0629 \u0627\u0644\u0627\u0635\u0637\u062f\u0627\u0645 = " : "Impact = ") + impactVelocity + " m/s",
      "",
      (verification.verified ? "OK" : "WARNING") + ": " + verification.note,
      "",
      (isAr ? "\u0645\u0632\u0648\u062f AI: " : "AI Provider: ") + aiProvider,
      (isAr ? "\u0627\u0644\u0625\u0637\u0627\u0631\u0627\u062a: " : "Frames: ") + limitedFrames.length + "/" + frames.length,
      (isAr ? "\u0632\u0645\u0646: " : "Time: ") + processingTime + " ms",
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
