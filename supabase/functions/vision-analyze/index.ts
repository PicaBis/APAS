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

// -- Vision Prompt Builder --

function buildVisionPrompt(lang: string): string {
  const isAr = lang === "ar";
  const noProjectileAr = "\u0644\u0645 \u0623\u062a\u0639\u0631\u0641 \u0639\u0644\u0649 \u062c\u0633\u0645 \u0645\u0642\u0630\u0648\u0641 \u0641\u064a \u0647\u0630\u0647 \u0627\u0644\u0635\u0648\u0631\u0629. \u064a\u062c\u0628 \u0623\u0646 \u062a\u062d\u062a\u0648\u064a \u0627\u0644\u0635\u0648\u0631\u0629 \u0639\u0644\u0649 \u062c\u0633\u0645 \u064a\u064f\u0642\u0630\u0641 \u0628\u0648\u0636\u0648\u062d (\u0643\u0631\u0629\u060c \u0635\u0627\u0631\u0648\u062e\u060c \u062d\u062c\u0631\u060c \u0631\u0635\u0627\u0635\u0629\u060c \u0642\u0646\u0628\u0644\u0629\u060c \u0625\u0644\u062e).";
  const noProjectileEn = "No projectile detected in this image. The image must contain a clearly visible launched object (ball, rocket, stone, bullet, grenade, etc.).";
  const noProjectileMsg = isAr ? noProjectileAr : noProjectileEn;

  const sciLabel = isAr ? "\u0627\u0644\u062a\u0641\u0633\u064a\u0631 \u0627\u0644\u0639\u0644\u0645\u064a" : "Scientific Explanation";
  const summaryPlaceholder = isAr ? "\u0645\u0644\u062e\u0635 \u0627\u0644\u062a\u062d\u0644\u064a\u0644 \u0628\u0627\u0644\u0639\u0631\u0628\u064a\u0629" : "Arabic summary of the analysis";
  const sciPlaceholder = isAr ? "\u0627\u0644\u062a\u0641\u0633\u064a\u0631 \u0627\u0644\u0639\u0644\u0645\u064a \u0627\u0644\u0645\u0641\u0635\u0644 \u0628\u0627\u0644\u0639\u0631\u0628\u064a\u0629" : "Detailed scientific explanation";
  const langInstruction = isAr ? "IN ARABIC" : "IN ENGLISH";

  return [
    "You are Professor APAS - a world-renowned expert in Mechanical Physics from ENS (Ecole Normale Superieure, Paris).",
    "You specialize in projectile motion, ballistics, and Newtonian mechanics.",
    "",
    "TASK: Analyze the uploaded image for projectile motion.",
    "",
    "STEP 1 - CAREFULLY EXAMINE THE IMAGE:",
    "You MUST look at every detail of this specific image.",
    "NEVER assume it is a cannonball or any specific object without visual evidence.",
    "",
    "STEP 2 - DETECT PROJECTILE:",
    "Look for ANY object being launched, thrown, shot, or in mid-flight trajectory.",
    "Also detect diagrams, illustrations, animations showing projectile motion - these are VALID.",
    "If NO clear projectile is visible, respond with ONLY this JSON:",
    '{"detected": false, "error": "' + noProjectileMsg + '"}',
    "",
    "STEP 3 - EXPERT ANALYSIS (only if projectile detected):",
    "- Identify the projectile from its visual appearance",
    "- Use reference objects for scale",
    "- Estimate launch angle, velocity, height, mass",
    "",
    "CRITICAL: You MUST provide NON-ZERO values. NEVER return 0.",
    "",
    "STEP 4 - COMPUTE ALL PHYSICS:",
    "- v0x = v0 * cos(angle), v0y = v0 * sin(angle)",
    "- Max height: H = h0 + v0y^2 / (2*g)",
    "- Time of flight, Range, Impact velocity",
    "- Kinetic energy at launch, Potential energy at max height",
    "",
    "STEP 5 - DESCRIBE WHAT YOU SEE " + langInstruction + ".",
    "This section is called '" + sciLabel + "'.",
    "",
    "RESPOND WITH ONLY valid JSON (no markdown fences):",
    "{",
    '  "detected": true,',
    '  "object_type": "specific object name in English",',
    '  "estimated_mass": 4.5,',
    '  "initial_velocity": 120,',
    '  "launch_angle": 42,',
    '  "launch_height": 1.5,',
    '  "gravity": 9.81,',
    '  "v0x": 89.17, "v0y": 80.26,',
    '  "max_altitude": 329.96,',
    '  "horizontal_range": 1461.74,',
    '  "time_of_flight": 16.39,',
    '  "impact_velocity": 120.12,',
    '  "kinetic_energy_launch": 32400,',
    '  "potential_energy_max": 14588.73,',
    '  "drag_effect": "slight",',
    '  "motion_type": "projectile",',
    '  "confidence_score": 75,',
    '  "calibration_reference": "reference used",',
    '  "image_description": "detailed description ' + langInstruction + '",',
    '  "analysis_summary_ar": "' + summaryPlaceholder + '",',
    '  "scientific_explanation": "' + sciPlaceholder + '"',
    "}",
  ].join("\n");
}

// -- Mistral Vision API Call --

const MISTRAL_VISION_MODELS = [
  "pixtral-large-latest",
  "pixtral-12b-2409",
  "mistral-small-latest",
];

async function callMistralVision(
  imageBase64: string,
  mimeType: string,
  lang: string,
  cloudinaryUrl?: string | null,
): Promise<{ result: string; provider: string }> {
  const apiKey = Deno.env.get("MISTRAL_API_KEY");
  if (!apiKey) throw new Error("MISTRAL_API_KEY not configured");

  const prompt = buildVisionPrompt(lang);
  const dataUrl = "data:" + mimeType + ";base64," + imageBase64;

  const systemMessage = "You are a World-Class Physics Professor from ENS. Analyze the provided image with EXTREME PRECISION. " +
    "You MUST carefully examine every pixel. Each image is UNIQUE. " +
    "Identify the SPECIFIC object based on visual appearance. DO NOT default to cannonball. " +
    "Respond with ONLY valid JSON. Provide realistic NON-ZERO values. " +
    "Include analysis_summary_ar with expert explanation in ARABIC.";

  const imageContent = cloudinaryUrl
    ? { type: "image_url" as const, image_url: { url: cloudinaryUrl } }
    : { type: "image_url" as const, image_url: { url: dataUrl } };

  let lastError: Error | null = null;

  for (const model of MISTRAL_VISION_MODELS) {
    try {
      console.log("[vision-analyze] Trying Mistral model: " + model);
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
              { role: "user", content: [{ type: "text", text: prompt }, imageContent] },
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
      }, "Mistral-Vision-" + model);

      console.log("[vision-analyze] Mistral model " + model + " succeeded");
      return { result, provider: "Mistral (" + model + ")" };
    } catch (err) {
      lastError = err as Error;
      const errMsg = lastError.message || "";
      if (errMsg.includes("400") || errMsg.includes("404") || errMsg.includes("decommissioned")) {
        console.warn("[vision-analyze] Mistral model " + model + " unavailable, trying next...");
        continue;
      }
      if (errMsg.includes("429")) {
        console.warn("[vision-analyze] Mistral rate limited after retries, trying fallback...");
        break;
      }
      throw lastError;
    }
  }
  throw lastError || new Error("All Mistral vision models failed");
}

// -- Gemini Vision API Call (Fallback) --

async function callGeminiVision(
  imageBase64: string,
  mimeType: string,
  lang: string,
): Promise<{ result: string; provider: string }> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

  const prompt = buildVisionPrompt(lang);
  console.log("[vision-analyze] Using Gemini Vision fallback...");

  const res = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" + apiKey,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            { inline_data: { mime_type: mimeType || "image/jpeg", data: imageBase64 } },
          ],
        }],
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
  console.log("[vision-analyze] Gemini succeeded, length: " + text.length);
  return { result: text, provider: "Gemini" };
}

// -- Groq Vision API Call (Fallback 2) --

async function callGroqVision(
  imageBase64: string,
  mimeType: string,
  lang: string,
): Promise<{ result: string; provider: string }> {
  const apiKey = Deno.env.get("GROQ_API_KEY");
  if (!apiKey) throw new Error("GROQ_API_KEY not configured");

  const prompt = buildVisionPrompt(lang);
  const dataUrl = "data:" + mimeType + ";base64," + imageBase64;
  console.log("[vision-analyze] Using Groq Vision fallback...");

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + apiKey,
    },
    body: JSON.stringify({
      model: "llama-3.2-90b-vision-preview",
      messages: [{ role: "user", content: [{ type: "text", text: prompt }, { type: "image_url", image_url: { url: dataUrl } }] }],
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
  console.log("[vision-analyze] Groq succeeded, length: " + text.length);
  return { result: text, provider: "Groq" };
}

// -- Unified Vision Call with Fallback Chain --

async function callVisionWithFallback(
  imageBase64: string, mimeType: string, lang: string, cloudinaryUrl?: string | null,
): Promise<{ result: string; provider: string }> {
  const errors: string[] = [];

  try {
    return await callMistralVision(imageBase64, mimeType, lang, cloudinaryUrl);
  } catch (e) {
    const msg = (e as Error).message;
    console.warn("[vision-analyze] Mistral failed: " + msg);
    errors.push("Mistral: " + msg);
  }

  try {
    return await callGeminiVision(imageBase64, mimeType, lang);
  } catch (e) {
    const msg = (e as Error).message;
    console.warn("[vision-analyze] Gemini failed: " + msg);
    errors.push("Gemini: " + msg);
  }

  try {
    return await callGroqVision(imageBase64, mimeType, lang);
  } catch (e) {
    const msg = (e as Error).message;
    console.warn("[vision-analyze] Groq failed: " + msg);
    errors.push("Groq: " + msg);
  }

  throw new Error("All vision AI providers failed. Errors: " + errors.join(" | "));
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
  const angleRad = (r.angle || 0) * Math.PI / 180;
  const v0x = v0 * Math.cos(angleRad);
  const hMax = r.maxHeight || 0;
  const energyAtPeak = 0.5 * v0x * v0x + g * hMax;

  const errorImpact = energyLaunch > 0 ? Math.abs(energyLaunch - energyImpact) / energyLaunch : 0;
  const errorPeak = energyLaunch > 0 ? Math.abs(energyLaunch - energyAtPeak) / energyLaunch : 0;
  const maxError = Math.max(errorImpact, errorPeak);

  if (maxError < 0.05) return { verified: true, energyError: maxError, note: "Energy conservation verified (<5% error)" };
  if (maxError < 0.15) return { verified: true, energyError: maxError, note: "Energy conservation approximate (5-15% error)" };
  return { verified: false, energyError: maxError, note: "Energy conservation failed (>15% error)" };
}

// -- Upload Image to Storage --

async function uploadImageToStorage(
  supabase: ReturnType<typeof createClient>,
  imageBase64: string, mimeType: string, filename: string,
): Promise<string | null> {
  try {
    const ext = mimeType.split("/")[1] || "jpg";
    const storagePath = "uploads/" + filename + "." + ext;
    const binaryStr = atob(imageBase64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);

    const { error } = await supabase.storage
      .from("vision-analyze")
      .upload(storagePath, bytes, { contentType: mimeType, upsert: true });
    if (error) { console.warn("[vision-analyze] Storage upload failed:", error.message); return null; }

    const { data: urlData } = supabase.storage.from("vision-analyze").getPublicUrl(storagePath);
    return urlData?.publicUrl || null;
  } catch (err) {
    console.warn("[vision-analyze] Storage upload error:", (err as Error).message);
    return null;
  }
}

// -- Upsert Analysis to Database --

async function upsertAnalysis(
  supabase: ReturnType<typeof createClient>,
  analysisData: Record<string, unknown>,
): Promise<string | null> {
  try {
    const { data, error } = await supabase.from("analyses").insert(analysisData).select("id").single();
    if (error) { console.warn("[vision-analyze] DB upsert failed:", error.message); return null; }
    return data?.id || null;
  } catch (err) {
    console.warn("[vision-analyze] DB upsert error:", (err as Error).message);
    return null;
  }
}

// -- Report Builder --

function buildReport(
  isAr: boolean, finalJson: Record<string, unknown>,
  objectType: string, mass: number, confidence: number,
  v0: number, angle: number, h0: number, g: number,
  v0x: number, v0y: number, maxHeight: number, maxRange: number,
  totalTime: number, impactVelocity: number,
  kineticEnergy: number, potentialEnergy: number,
  scientificExplanation: string,
  verification: { verified: boolean; note: string },
  processingTime: number, aiProvider: string,
): string {
  const lines = [
    "```json", JSON.stringify(finalJson, null, 2), "```", "",
    isAr ? "# APAS AI \u062a\u0642\u0631\u064a\u0631 \u062a\u062d\u0644\u064a\u0644 \u0627\u0644\u0645\u0642\u0630\u0648\u0641" : "# APAS AI Projectile Analysis Report",
    "",
    isAr ? "## \u0627\u0644\u0643\u0627\u0626\u0646 \u0627\u0644\u0645\u0643\u062a\u0634\u0641" : "## Detected Object",
    (isAr ? "\u0627\u0644\u0646\u0648\u0639: " : "Type: ") + "**" + objectType + "**",
    (isAr ? "\u0627\u0644\u0643\u062a\u0644\u0629: " : "Mass: ") + "**" + mass + "** kg",
    (isAr ? "\u0646\u0633\u0628\u0629 \u0627\u0644\u062b\u0642\u0629: " : "Confidence: ") + "**" + confidence + "%**",
    "",
    isAr ? "## \u0627\u0644\u0645\u0639\u0637\u064a\u0627\u062a \u0627\u0644\u0645\u0633\u062a\u062e\u0631\u062c\u0629" : "## Extracted Data",
    (isAr ? "\u0627\u0644\u0633\u0631\u0639\u0629 \u0627\u0644\u0627\u0628\u062a\u062f\u0627\u0626\u064a\u0629: " : "Initial velocity: ") + "**" + v0 + "** m/s",
    (isAr ? "\u0632\u0627\u0648\u064a\u0629 \u0627\u0644\u0625\u0637\u0644\u0627\u0642: " : "Launch angle: ") + "**" + angle + " deg**",
    (isAr ? "\u0627\u0644\u0627\u0631\u062a\u0641\u0627\u0639 \u0627\u0644\u0627\u0628\u062a\u062f\u0627\u0626\u064a: " : "Initial height: ") + "**" + h0 + "** m",
    "",
    isAr ? "## \u0627\u0644\u0646\u062a\u0627\u0626\u062c \u0627\u0644\u0645\u062d\u0633\u0648\u0628\u0629" : "## Computed Results",
    "v0x = " + v0x + " m/s, v0y = " + v0y + " m/s",
    (isAr ? "\u0623\u0642\u0635\u0649 \u0627\u0631\u062a\u0641\u0627\u0639 = " : "Max height = ") + maxHeight + " m",
    (isAr ? "\u0627\u0644\u0645\u062f\u0649 = " : "Range = ") + maxRange + " m",
    (isAr ? "\u0632\u0645\u0646 \u0627\u0644\u0637\u064a\u0631\u0627\u0646 = " : "Time of flight = ") + totalTime + " s",
    (isAr ? "\u0633\u0631\u0639\u0629 \u0627\u0644\u0627\u0635\u0637\u062f\u0627\u0645 = " : "Impact velocity = ") + impactVelocity + " m/s",
    "",
    isAr ? "## \u0627\u0644\u0637\u0627\u0642\u0629" : "## Energy",
    (isAr ? "\u0627\u0644\u0637\u0627\u0642\u0629 \u0627\u0644\u062d\u0631\u0643\u064a\u0629 = " : "KE = ") + kineticEnergy + " J",
    (isAr ? "\u0627\u0644\u0637\u0627\u0642\u0629 \u0627\u0644\u0643\u0627\u0645\u0646\u0629 = " : "PE = ") + potentialEnergy + " J",
    "",
    isAr ? "## \u0627\u0644\u062a\u0641\u0633\u064a\u0631 \u0627\u0644\u0639\u0644\u0645\u064a" : "## Scientific Explanation",
    scientificExplanation,
    "",
    (verification.verified ? "OK" : "WARNING") + ": " + verification.note,
    "",
    (isAr ? "\u0645\u0632\u0648\u062f AI: " : "AI Provider: ") + aiProvider,
    (isAr ? "\u0632\u0645\u0646 \u0627\u0644\u0645\u0639\u0627\u0644\u062c\u0629: " : "Processing: ") + processingTime + " ms",
  ];
  return lines.join("\n");
}

// -- Main Handler --

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const { imageBase64, mimeType, lang, userId, cloudinaryUrl } = await req.json();
    if (!imageBase64) {
      return new Response(JSON.stringify({ error: "No image provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isAr = lang === "ar";
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const fileId = crypto.randomUUID();
    let imageUrl: string | null = cloudinaryUrl || null;
    if (!imageUrl) {
      imageUrl = await uploadImageToStorage(supabase, imageBase64, mimeType || "image/jpeg", fileId);
    }

    // Call Vision AI with fallback chain: Mistral -> Gemini -> Groq
    console.log("[vision-analyze] Calling Vision AI with fallback chain...");
    const { result: rawResponse, provider: aiProvider } = await callVisionWithFallback(
      imageBase64, mimeType || "image/jpeg", lang, cloudinaryUrl,
    );

    const parsed = parseJsonFromText(rawResponse);

    if (!parsed.detected) {
      const errorMsg = (parsed.error as string) ||
        (isAr ? "\u0644\u0645 \u0623\u062a\u0639\u0631\u0641 \u0639\u0644\u0649 \u062c\u0633\u0645 \u0645\u0642\u0630\u0648\u0641." : "No projectile detected.");
      return new Response(
        JSON.stringify({ text: (isAr ? "# \u0644\u0645 \u064a\u062a\u0645 \u0627\u0643\u062a\u0634\u0627\u0641 \u0645\u0642\u0630\u0648\u0641\n\n" : "# No Projectile Detected\n\n") + errorMsg, detected: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const objectType = String(parsed.object_type || "projectile");
    const defaults = getSmartDefaults(objectType);

    const rawV0 = Number(parsed.initial_velocity) || 0;
    const rawAngle = Number(parsed.launch_angle) || 0;
    const rawH0 = Number(parsed.launch_height) || 0;

    const v0 = rawV0 > 0 ? rawV0 : defaults.velocity;
    const angle = rawAngle > 0 ? rawAngle : defaults.angle;
    const h0 = rawH0 > 0 ? rawH0 : defaults.height;
    const g = Number(parsed.gravity) || 9.81;
    const mass = Number(parsed.estimated_mass) || defaults.mass;
    const confidence = Number(parsed.confidence_score) || 70;

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
    const dragEffect = String(parsed.drag_effect || "slight");
    const motionType = String(parsed.motion_type || "projectile");
    const calibrationRef = String(parsed.calibration_reference || "");
    const analysisSummaryAr = String(parsed.analysis_summary_ar || "");
    const scientificExplanation = String(parsed.scientific_explanation || "");
    const imageDescription = String(parsed.image_description || "");

    const verification = verifyWithEnergy({ velocity: v0, angle, height: h0, gravity: g, maxHeight, impactVelocity });
    const processingTime = Date.now() - startTime;

    const finalJson: Record<string, unknown> = {
      detected: true, confidence, angle, velocity: v0, mass, height: h0,
      objectType, gravity: g, v0x, v0y, maxHeight, maxRange, totalTime,
      impactVelocity, kineticEnergy, potentialEnergy, dragEffect, motionType,
      calibrationRef, analysisSummaryAr, scientificExplanation, imageDescription,
      verified: verification.verified,
      energyError: Math.round(verification.energyError * 10000) / 100,
      providers: { extraction: aiProvider, solving: aiProvider },
      processingTimeMs: processingTime,
    };

    // Upsert to database
    const dbRecord: Record<string, unknown> = {
      source_type: "image", source_url: imageUrl || cloudinaryUrl,
      cloudinary_url: cloudinaryUrl || null,
      source_filename: fileId + "." + (mimeType || "image/jpeg").split("/")[1],
      initial_velocity: v0, launch_angle: angle, launch_height: h0,
      max_altitude: maxHeight, horizontal_range: maxRange,
      time_of_flight: totalTime, impact_velocity: impactVelocity,
      v0x, v0y, object_type: objectType, estimated_mass: mass,
      drag_effect: dragEffect, motion_type: motionType,
      confidence_score: confidence, analysis_method: "estimated",
      analysis_engine: aiProvider.includes("Gemini") ? "gemini_vision" : aiProvider.includes("Groq") ? "groq_vision" : "mistral_pixtral_vision",
      calibration_source: "auto", calibration_reference: calibrationRef,
      gravity: g, report_text: scientificExplanation,
      report_lang: isAr ? "ar" : "en",
      analysis_summary_ar: analysisSummaryAr,
      ai_provider: aiProvider, processing_time_ms: processingTime,
      user_id: userId || null,
    };

    const analysisId = await upsertAnalysis(supabase, dbRecord);
    if (analysisId) finalJson.analysisId = analysisId;

    const report = buildReport(isAr, finalJson, objectType, mass, confidence, v0, angle, h0, g, v0x, v0y, maxHeight, maxRange, totalTime, impactVelocity, kineticEnergy, potentialEnergy, scientificExplanation, verification, processingTime, aiProvider);

    return new Response(
      JSON.stringify({ text: report, analysis: finalJson }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("vision-analyze error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
