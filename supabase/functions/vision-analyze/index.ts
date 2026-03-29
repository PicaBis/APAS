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

// \u2500\u2500 ENS Professor Prompt Builder \u2500\u2500

function buildMistralVisionPrompt(lang: string): string {
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
    "Your tone is authoritative, analytical, and professional - like a senior professor delivering a masterclass.",
    "",
    "TASK: Analyze the uploaded image for projectile motion.",
    "",
    "STEP 1 - CAREFULLY EXAMINE THE IMAGE:",
    "You MUST look at every detail of this specific image. Describe the colors, shapes, objects, people, environment, and any motion visible.",
    "NEVER assume it is a cannonball or any specific object without visual evidence. Look at the ACTUAL content of the image.",
    "If you see a person throwing a ball, identify the specific type of ball (basketball, tennis ball, etc.) from its color, size, and texture.",
    "If you see a diagram or illustration, describe what it shows specifically.",
    "",
    "STEP 2 - DETECT PROJECTILE:",
    "Look for ANY object being launched, thrown, shot, or in mid-flight trajectory.",
    "Valid projectiles: ball (basketball, football, tennis, etc.), rocket, stone, bullet, grenade, arrow, javelin, cannonball, missile, any thrown/launched object.",
    "Also detect diagrams, illustrations, animations, or educational images showing projectile motion - these are VALID.",
    "Even if it is a cartoon, diagram, or educational illustration of projectile motion, you MUST analyze it as a real projectile scenario.",
    "If NO clear projectile or projectile motion is visible, respond with ONLY this JSON:",
    '{"detected": false, "error": "' + noProjectileMsg + '"}',
    "",
    "STEP 3 - EXPERT ANALYSIS (only if projectile detected):",
    "Analyze the visual context carefully like a real physics professor:",
    "- Identify the projectile object SPECIFICALLY from its visual appearance (color, shape, size, texture) - DO NOT default to cannonball",
    "- Use reference objects for scale: person ~1.7m, door ~2m, car ~1.5m tall, basketball hoop 3.05m, football goal 2.44m, cannon ~1.2m tall",
    "- Estimate launch angle from trajectory arc, body posture, arm position, or trajectory curve visible. Provide HIGH PRECISION decimal values (e.g., 42.35 instead of 40).",
    "- Estimate initial velocity from context (sport type, throw strength, visible arc, weapon type). Provide HIGH PRECISION decimal values (e.g., 15.62 instead of 15).",
    "- Estimate launch height from ground reference. Provide HIGH PRECISION decimal values (e.g., 1.42 instead of 1.5).",
    "- Estimate mass from object type (basketball ~0.62kg, football ~0.43kg, cannonball ~4.5kg, stone ~0.3kg, etc.)",
    "- Consider air resistance qualitatively",
    "",
    "CRITICAL RULES FOR ESTIMATION:",
    "- You MUST provide NON-ZERO values for initial_velocity, launch_angle, and launch_height.",
    "- DECIMAL PRECISION: Use at least 2 decimal places for all estimates (e.g., 14.82, 43.15). AVOID round numbers like 45, 10, or 20 unless they are mathematically perfect.",
    "- NEVER return 0 for initial_velocity. A projectile MUST have a non-zero initial velocity to be in motion.",
    "- NEVER return 0 for launch_angle. Even a horizontal throw has a small angle (~5 degrees). Estimate from the visual trajectory.",
    "- Use your extensive physics knowledge to provide REALISTIC estimates based on the type of projectile and scenario.",
    "- For a cannonball: velocity is typically 80-200 m/s, angle 30-50 degrees",
    "- For a ball throw: velocity is typically 8-30 m/s, angle 30-60 degrees",
    "- For a rocket/missile: velocity is typically 100-500 m/s, angle 30-70 degrees",
    "- For a stone throw: velocity is typically 10-20 m/s, angle 35-55 degrees",
    "- If unsure, provide your BEST ESTIMATE based on physics principles - professors estimate, they NEVER return zeros!",
    "",
    "STEP 4 - COMPUTE ALL PHYSICS using the projectile motion equation:",
    "The fundamental equation is: y = x*tan(\\u03B8) - (g*x\\u00B2)/(2*v0\\u00B2*cos\\u00B2(\\u03B8))",
    "Ensure your angle (\\u03B8) and velocity (v0) estimates are CONSISTENT with the visual trajectory.",
    "Using your HIGH PRECISION estimates, compute precisely:",
    "- v0x = v0 * cos(angle), v0y = v0 * sin(angle)",
    "- Max height: H = h0 + v0y^2 / (2*g)",
    "- Time of flight: solve y(t) = 0 quadratic",
    "- Range: R = v0x * T",
    "- Impact velocity: v_impact = sqrt(v0x^2 + (v0y - g*T)^2)",
    "- Kinetic energy at launch: KE = 0.5 * m * v0^2",
    "- Potential energy at max height: PE = m * g * H",
    "",
    "STEP 5 - DESCRIBE WHAT YOU SEE:",
    "Write a detailed description " + langInstruction + " of WHAT you see in the image.",
    "Describe the scene, the projectile, the launch mechanism, the trajectory, reference objects, colors, background.",
    "Then explain HOW you arrived at these physics values based on visual cues.",
    "Reference visual cues: 'Based on the cannon barrel length...', 'The trajectory arc suggests...', 'The ball elevation relative to...'",
    "This section is called '" + sciLabel + "'.",
    "",
    "RESPOND WITH ONLY valid JSON (no markdown fences, no extra text):",
    "{",
    '  "detected": true,',
    '  "object_type": "specific object name in English based on WHAT YOU ACTUALLY SEE",',
    '  "estimated_mass": 4.5,',
    '  "initial_velocity": 120.45,',
    '  "launch_angle": 42.18,',
    '  "launch_height": 1.53,',
    '  "gravity": 9.81,',
    '  "v0x": 89.17,',
    '  "v0y": 80.26,',
    '  "max_altitude": 329.96,',
    '  "horizontal_range": 1461.74,',
    '  "time_of_flight": 16.39,',
    '  "impact_velocity": 120.12,',
    '  "kinetic_energy_launch": 32400.12,',
    '  "potential_energy_max": 14588.73,',
    '  "drag_effect": "slight",',
    '  "motion_type": "projectile",',
    '  "confidence_score": 75.5,',
    '  "calibration_reference": "cannon barrel ~1.2m used as scale reference",',
    '  "image_description": "detailed description of what you see in the image ' + langInstruction + '",',
    '  "analysis_summary_ar": "' + summaryPlaceholder + '",',
    '  "scientific_explanation": "' + sciPlaceholder + '"',
    "}",
    "",
    "REMEMBER: ALL numeric values MUST be non-zero and physically realistic.",
    "PRECISION: Use decimal places for ALL physics values. Do NOT return integers.",
    "CRITICAL: The object_type MUST match what you ACTUALLY see in the image. Do NOT default to 'cannonball' unless you see an actual cannon and cannonball.",
    "You are a professor - provide expert estimates based on CAREFUL visual analysis of THIS SPECIFIC image!",
  ].join("\n");
}

// \u2500\u2500 Mistral Vision API Call (EXCLUSIVE - no Groq/LLaMA fallback) \u2500\u2500

const MISTRAL_VISION_MODELS = ["pixtral-12b-2409", "pixtral-large-latest"];
const GROQ_VISION_MODEL = "llama-3.2-90b-vision-preview";
const GEMINI_VISION_MODEL = "gemini-1.5-flash";

async function callAiWithFallback(
  imageBase64: string,
  mimeType: string,
  lang: string,
  cloudinaryUrl: string | null | undefined,
): Promise<{ text: string; provider: string }> {
  const isAr = lang === "ar";
  const systemMessage = "You are Professor APAS - a senior mechanical physics expert from ENS Paris. Follow all instructions precisely.";
  const prompt = buildMistralVisionPrompt(lang);
  const dataUrl = `data:${mimeType};base64,${imageBase64}`;

  const mistralKey = Deno.env.get("MISTRAL_API_KEY");
  const groqKey = Deno.env.get("GROQ_API_KEY");
  const geminiKey = Deno.env.get("GEMINI_API_KEY");

  const errors: string[] = [];

  // --- 1. TRY MISTRAL (Primary) ---
  if (mistralKey) {
    for (const model of MISTRAL_VISION_MODELS) {
      try {
        console.log(`[vision-analyze] Trying Mistral (${model})...`);
        const imageContent = cloudinaryUrl
          ? { type: "image_url", image_url: { url: cloudinaryUrl } }
          : { type: "image_url", image_url: { url: dataUrl } };

        const res = await retryWithBackoff(async () => {
          return await fetch("https://api.mistral.ai/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${mistralKey}` },
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
        }, 'Mistral-Vision-' + model);

        if (!res.ok) throw new Error(`Mistral ${model} error: ${res.status}`);
        const data = await res.json();
        const text = data.choices?.[0]?.message?.content;
        if (text) return { text, provider: `Mistral (${model})` };
      } catch (err) {
        console.warn(`[vision-analyze] Mistral ${model} failed:`, (err as Error).message);
        errors.push(`Mistral ${model}: ${(err as Error).message}`);
      }
    }
  }

  // --- 2. TRY GROQ (Secondary) ---
  if (groqKey) {
    try {
      console.log(`[vision-analyze] Falling back to Groq (${GROQ_VISION_MODEL})...`);
      const res = await retryWithBackoff(async () => {
        return await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${groqKey}` },
          body: JSON.stringify({
            model: GROQ_VISION_MODEL,
            messages: [
              { role: "system", content: systemMessage },
              {
                role: "user",
                content: [
                  { type: "text", text: prompt },
                  { type: "image_url", image_url: { url: dataUrl } },
                ],
              },
            ],
            temperature: 0.2,
            max_tokens: 4000,
          }),
        });
      }, 'Groq-Vision');

      if (!res.ok) throw new Error(`Groq error: ${res.status}`);
      const data = await res.json();
      const text = data.choices?.[0]?.message?.content;
      if (text) return { text, provider: "Groq (Llama Vision)" };
    } catch (err) {
      console.warn("[vision-analyze] Groq failed:", (err as Error).message);
      errors.push(`Groq: ${(err as Error).message}`);
    }
  }

  // --- 3. TRY GEMINI (Tertiary) ---
  if (geminiKey) {
    try {
      console.log(`[vision-analyze] Falling back to Gemini (${GEMINI_VISION_MODEL})...`);
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_VISION_MODEL}:generateContent?key=${geminiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: `${systemMessage}\n\n${prompt}` },
              { inline_data: { mime_type: mimeType, data: imageBase64 } },
            ],
          }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 4000 },
        }),
      });

      if (!res.ok) throw new Error(`Gemini error: ${res.status}`);
      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) return { text, provider: "Gemini Flash" };
    } catch (err) {
      console.warn("[vision-analyze] Gemini failed:", (err as Error).message);
      errors.push(`Gemini: ${(err as Error).message}`);
    }
  }

  throw new Error(`All vision providers failed: ${errors.join(" | ")}`);
}

async function callMistralVision(
  imageBase64: string,
  mimeType: string,
  lang: string,
  cloudinaryUrl?: string | null,
): Promise<{ text: string; provider: string }> {
  return await callAiWithFallback(imageBase64, mimeType, lang, cloudinaryUrl);
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
  velocity?: number;
  angle?: number;
  height?: number;
  gravity?: number;
  maxHeight?: number;
  impactVelocity?: number;
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

// \u2500\u2500 Upload Image to Storage \u2500\u2500

async function uploadImageToStorage(
  supabase: ReturnType<typeof createClient>,
  imageBase64: string,
  mimeType: string,
  filename: string,
): Promise<string | null> {
  try {
    const ext = mimeType.split("/")[1] || "jpg";
    const storagePath = "uploads/" + filename + "." + ext;

    const binaryStr = atob(imageBase64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    const { error } = await supabase.storage
      .from("vision-analyze")
      .upload(storagePath, bytes, {
        contentType: mimeType,
        upsert: true,
      });

    if (error) {
      console.warn("[vision-analyze] Storage upload failed:", error.message);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from("vision-analyze")
      .getPublicUrl(storagePath);

    return urlData?.publicUrl || null;
  } catch (err) {
    console.warn("[vision-analyze] Storage upload error:", (err as Error).message);
    return null;
  }
}

// \u2500\u2500 Upsert Analysis to Database \u2500\u2500

async function upsertAnalysis(
  supabase: ReturnType<typeof createClient>,
  analysisData: Record<string, unknown>,
): Promise<string | null> {
  try {
    // Check if analysis already exists for this source_url or cloudinary_url
    const sourceUrl = analysisData.source_url;
    const cloudinaryUrl = analysisData.cloudinary_url;

    if (sourceUrl || cloudinaryUrl) {
      const { data: existing } = await supabase
        .from("analyses")
        .select("id")
        .or(`source_url.eq."${sourceUrl}",cloudinary_url.eq."${cloudinaryUrl}"`)
        .limit(1)
        .maybeSingle();

      if (existing) {
        console.log("[vision-analyze] Found existing analysis, updating instead of inserting...");
        const { data, error } = await supabase
          .from("analyses")
          .update(analysisData)
          .eq("id", existing.id)
          .select("id")
          .single();

        if (error) {
          console.warn("[vision-analyze] DB update failed:", error.message);
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
      console.warn("[vision-analyze] DB insert failed:", error.message);
      return null;
    }

    return data?.id || null;
  } catch (err) {
    console.warn("[vision-analyze] DB upsert error:", (err as Error).message);
    return null;
  }
}

// \u2500\u2500 Report Builder \u2500\u2500

function buildReport(
  isAr: boolean,
  finalJson: Record<string, unknown>,
  objectType: string, mass: number, confidence: number,
  v0: number, angle: number, h0: number, g: number,
  v0x: number, v0y: number, maxHeight: number, maxRange: number,
  totalTime: number, impactVelocity: number,
  kineticEnergy: number, potentialEnergy: number,
  scientificExplanation: string,
  imageDescription: string,
  verification: { verified: boolean; note: string },
  processingTime: number,
): string {
  const lines = [
    "```json",
    JSON.stringify(finalJson, null, 2),
    "```",
    "",
    isAr ? "# APAS AI \u062a\u0642\u0631\u064a\u0631 \u062a\u062d\u0644\u064a\u0644 \u0627\u0644\u0645\u0642\u0630\u0648\u0641" : "# APAS AI Projectile Analysis Report",
    "",
    isAr ? "## \u0627\u0644\u0643\u0627\u0626\u0646 \u0627\u0644\u0645\u0643\u062a\u0634\u0641" : "## Detected Object",
    (isAr ? "\u0627\u0644\u0646\u0648\u0639: " : "Type: ") + "**" + objectType + "**",
    (isAr ? "\u0627\u0644\u0643\u062a\u0644\u0629: " : "Mass: ") + "**" + mass + "** kg",
    (isAr ? "\u0646\u0633\u0628\u0629 \u0627\u0644\u062b\u0642\u0629: " : "Confidence: ") + "**" + confidence + "%**",
    "",
    isAr ? "## \u0627\u0644\u0645\u0639\u0637\u064a\u0627\u062a \u0627\u0644\u0645\u0633\u062a\u062e\u0631\u062c\u0629" : "## Extracted Data",
    (isAr ? "\u0627\u0644\u0633\u0631\u0639\u0629 \u0627\u0644\u0627\u0628\u062a\u062f\u0627\u0626\u064a\u0629: " : "Initial velocity: ") + "**V₀ = " + v0 + "** m/s",
    (isAr ? "\u0632\u0627\u0648\u064a\u0629 \u0627\u0644\u0625\u0637\u0644\u0627\u0642: " : "Launch angle: ") + "**\u03b8 = " + angle + " deg**",
    (isAr ? "\u0627\u0644\u0627\u0631\u062a\u0641\u0627\u0639 \u0627\u0644\u0627\u0628\u062a\u062f\u0627\u0626\u064a: " : "Initial height: ") + "**h₀ = " + h0 + "** m",
    (isAr ? "\u0627\u0644\u062c\u0627\u0630\u0628\u064a\u0629: " : "Gravity: ") + "**g = " + g + "** m/s\u00B2",
    "",
    isAr ? "## \u0627\u0644\u0646\u062a\u0627\u0626\u062c \u0627\u0644\u0645\u062d\u0633\u0648\u0628\u0629" : "## Computed Results",
    "V₀x = " + v0x + " m/s",
    "V₀y = " + v0y + " m/s",
    (isAr ? "\u0623\u0642\u0635\u0649 \u0627\u0631\u062a\u0641\u0627\u0639 = " : "Max height = ") + maxHeight + " m",
    (isAr ? "\u0627\u0644\u0645\u062f\u0649 = " : "Range = ") + maxRange + " m",
    (isAr ? "\u0632\u0645\u0646 \u0627\u0644\u0637\u064a\u0631\u0627\u0646 = " : "Time of flight = ") + totalTime + " s",
    (isAr ? "\u0633\u0631\u0639\u0629 \u0627\u0644\u0627\u0635\u0637\u062f\u0627\u0645 = " : "Impact velocity = ") + impactVelocity + " m/s",
    "",
    isAr ? "## \u0627\u0644\u0637\u0627\u0642\u0629" : "## Energy",
    (isAr ? "\u0627\u0644\u0637\u0627\u0642\u0629 \u0627\u0644\u062d\u0631\u0643\u064a\u0629 \u0639\u0646\u062f \u0627\u0644\u0625\u0637\u0644\u0627\u0642 = " : "Kinetic energy at launch = ") + kineticEnergy + " J",
    (isAr ? "\u0627\u0644\u0637\u0627\u0642\u0629 \u0627\u0644\u0643\u0627\u0645\u0646\u0629 \u0639\u0646\u062f \u0623\u0642\u0635\u0649 \u0627\u0631\u062a\u0641\u0627\u0639 = " : "Potential energy at max height = ") + potentialEnergy + " J",
    "",
    isAr ? "## \u0627\u0644\u062a\u0641\u0633\u064a\u0631 \u0627\u0644\u0639\u0644\u0645\u064a" : "## Scientific Explanation",
    scientificExplanation,
    "",
    (isAr ? "## \u0627\u0644\u062a\u062d\u0642\u0642 \u0645\u0646 \u062d\u0641\u0638 \u0627\u0644\u0637\u0627\u0642\u0629" : "## Energy Conservation Check"),
    (verification.verified ? "\u2705 " : "\u26a0\ufe0f ") + verification.note,
    "",
    finalJson.consistencyNote ? (finalJson.consistencyNote as string) + "\n" : "",
    (isAr ? "\u0645\u0632\u0648\u062f \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064a: " : "AI Provider: ") + finalJson.providers.extraction,
    (isAr ? "\u0632\u0645\u0646 \u0627\u0644\u0645\u0639\u0627\u0644\u062c\u0629: " : "Processing time: ") + processingTime + " ms",
  ];
  
  // If fallback was used (Mistral failed), add a notice
  const usedFallback = !String(finalJson.providers.extraction).toLowerCase().includes("mistral");
  if (usedFallback) {
    const fallbackNotice = isAr
      ? `> \u2139\ufe0f **\u0645\u0644\u062d\u0648\u0638\u0629**: \u062a\u0645 \u0627\u0644\u062a\u062d\u0648\u064a\u0644 \u062a\u0644\u0642\u0627\u0626\u064a\u0627\u064b \u0625\u0644\u0649 **${finalJson.providers.extraction}** \u0644\u0636\u0645\u0627\u0646 \u0633\u0631\u0639\u0629 \u0627\u0644\u0627\u0633\u062a\u062c\u0627\u0628\u0629.`
      : `> \u2139\ufe0f **Note**: Automatically switched to **${finalJson.providers.extraction}** to ensure fast response.`;
    lines.splice(lines.indexOf(isAr ? "# APAS AI \u062a\u0642\u0631\u064a\u0631 \u062a\u062d\u0644\u064a\u0644 \u0627\u0644\u0645\u0642\u0630\u0648\u0641" : "# APAS AI Projectile Analysis Report") + 1, 0, "", fallbackNotice);
  }

  return lines.join("\n");
}

// \u2500\u2500 Main Handler \u2500\u2500

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

    // Initialize Supabase client with service role for DB/storage operations
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Use Cloudinary URL if provided, otherwise upload to Supabase storage
    const fileId = crypto.randomUUID();
    let imageUrl: string | null = cloudinaryUrl || null;
    if (!imageUrl) {
      console.log("[vision-analyze] No Cloudinary URL, uploading to Supabase storage...");
      imageUrl = await uploadImageToStorage(supabase, imageBase64, mimeType || "image/jpeg", fileId);
    } else {
      console.log("[vision-analyze] Using Cloudinary URL:", imageUrl);
    }

    // Call AI Vision with fallback (Mistral -> Groq -> Gemini)
    console.log("[vision-analyze] Calling AI Vision with fallback...");
    const { text: rawResponse, provider } = await callMistralVision(imageBase64, mimeType || "image/jpeg", lang, cloudinaryUrl);
    console.log(`[vision-analyze] AI response length: ${rawResponse.length} (from ${provider})`);

    const parsed = parseJsonFromText(rawResponse);

    // Check if projectile was detected
    if (!parsed.detected) {
      const errorMsg = (parsed.error as string) ||
        (isAr
          ? "\u0644\u0645 \u0623\u062a\u0639\u0631\u0641 \u0639\u0644\u0649 \u062c\u0633\u0645 \u0645\u0642\u0630\u0648\u0641 \u0641\u064a \u0647\u0630\u0647 \u0627\u0644\u0635\u0648\u0631\u0629. \u064a\u062c\u0628 \u0623\u0646 \u062a\u062d\u062a\u0648\u064a \u0627\u0644\u0635\u0648\u0631\u0629 \u0639\u0644\u0649 \u062c\u0633\u0645 \u064a\u064f\u0642\u0630\u0641 \u0628\u0648\u0636\u0648\u062d (\u0643\u0631\u0629\u060c \u0635\u0627\u0631\u0648\u062e\u060c \u062d\u062c\u0631\u060c \u0631\u0635\u0627\u0635\u0629\u060c \u0642\u0646\u0628\u0644\u0629\u060c \u0625\u0644\u062e)."
          : "No projectile detected in this image. The image must contain a clearly visible launched object (ball, rocket, stone, bullet, grenade, etc.).");

      return new Response(
        JSON.stringify({
          text: isAr
            ? "# \u0644\u0645 \u064a\u062a\u0645 \u0627\u0643\u062a\u0634\u0627\u0641 \u0645\u0642\u0630\u0648\u0641\n\n" + errorMsg
            : "# No Projectile Detected\n\n" + errorMsg,
          detected: false,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Extract object type first to get smart defaults
    const objectType = String(parsed.object_type || "projectile");
    const defaults = getSmartDefaults(objectType);

    // Extract and validate physics values - USE SMART DEFAULTS if AI returns 0
    const rawV0 = Number(parsed.initial_velocity) || 0;
    const rawAngle = Number(parsed.launch_angle) || 0;
    const rawH0 = Number(parsed.launch_height) || 0;

    const v0 = rawV0 > 0 ? rawV0 : defaults.velocity;
    const angle = rawAngle > 0 ? rawAngle : defaults.angle;
    const h0 = rawH0 > 0 ? rawH0 : defaults.height;
    const g = Number(parsed.gravity) || 9.81;
    const mass = Number(parsed.estimated_mass) || defaults.mass;
    const confidence = Number(parsed.confidence_score) || 70;

    let usedDefaults = false;
    if (rawV0 === 0 || rawAngle === 0) {
      usedDefaults = true;
      console.log("[vision-analyze] AI returned zeros, using smart defaults for: " + objectType);
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
    const dragEffect = String(parsed.drag_effect || "slight");
    const motionType = String(parsed.motion_type || "projectile");
    const calibrationRef = String(parsed.calibration_reference || "");
    const analysisSummaryAr = String(parsed.analysis_summary_ar || "");
    const scientificExplanation = String(parsed.scientific_explanation || "");
    const imageDescription = String(parsed.image_description || "");

    // Energy verification
    const verification = verifyWithEnergy({
      velocity: v0, angle, height: h0, gravity: g,
      maxHeight, impactVelocity,
    });
    console.log("[vision-analyze] Energy verification:", verification);

    // Cross-check AI results with mathematical results
    const aiMaxHeight = Number(parsed.max_altitude) || 0;
    const aiRange = Number(parsed.horizontal_range) || 0;
    const heightDiff = aiMaxHeight > 0 ? Math.abs(aiMaxHeight - maxHeight) / aiMaxHeight : 0;
    const rangeDiff = aiRange > 0 ? Math.abs(aiRange - maxRange) / aiRange : 0;
    
    let consistencyNote = "";
    if (heightDiff > 0.2 || rangeDiff > 0.2) {
      consistencyNote = isAr 
        ? "\u26a0\ufe0f \u062a\u0646\u0628\u064aه: \u0647ناك \u0627ختلاف \u0628ين \u0627لتقدير \u0627لبصري \u0648الحساب \u0627لفيز\u064aا\u0626ي. \u062aم \u0627لاعتماد \u0639لى \u0627لحساب \u0627لأدق."
        : "\u26a0\ufe0f Warning: Discrepancy between visual estimation and physical calculation. Using corrected physics values.";
    }

    if (usedDefaults) {
      const defaultNote = isAr
        ? "\u2139\ufe0f \u062aم \u0627ستخدام \u0642يم \u0627فتراضية \u0644لجسم \u0644عدم \u0648ضوح \u0645عالم \u0627لحركة."
        : "\u2139\ufe0f Using standard physical defaults for this object type as motion cues were unclear.";
      consistencyNote += (consistencyNote ? "\n" : "") + defaultNote;
    }

    const processingTime = Date.now() - startTime;

    // Build final JSON result
    const finalJson: Record<string, unknown> = {
      detected: true,
      confidence: confidence,
      angle: angle,
      velocity: v0,
      mass: mass,
      height: h0,
      objectType: objectType,
      gravity: g,
      v0x: v0x,
      v0y: v0y,
      maxHeight: maxHeight,
      maxRange: maxRange,
      totalTime: totalTime,
      impactVelocity: impactVelocity,
      kineticEnergy: kineticEnergy,
      potentialEnergy: potentialEnergy,
      dragEffect: dragEffect,
      motionType: motionType,
      calibrationRef: calibrationRef,
      analysisSummaryAr: analysisSummaryAr,
      scientificExplanation: scientificExplanation,
      imageDescription: imageDescription,
      verified: verification.verified,
      energyError: Math.round(verification.energyError * 10000) / 100,
      providers: { extraction: provider, solving: provider },
      processingTimeMs: processingTime,
      consistencyNote: consistencyNote,
    };

    // Upsert to Supabase analyses table
    console.log("[vision-analyze] Upserting analysis to database...");
    const dbRecord: Record<string, unknown> = {
      source_type: "image",
      source_url: imageUrl || cloudinaryUrl,
      cloudinary_url: cloudinaryUrl || null,
      source_filename: fileId + "." + (mimeType || "image/jpeg").split("/")[1],
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
      drag_effect: dragEffect,
      motion_type: motionType,
      confidence_score: confidence,
      analysis_method: "estimated",
      analysis_engine: "mistral_pixtral_vision",
      calibration_source: "auto",
      calibration_reference: calibrationRef,
      gravity: g,
      report_text: scientificExplanation,
      report_lang: isAr ? "ar" : "en",
      analysis_summary_ar: analysisSummaryAr,
      ai_provider: provider.split(" ")[0],
      processing_time_ms: processingTime,
      user_id: userId || null,
    };

    const analysisId = await upsertAnalysis(supabase, dbRecord);
    if (analysisId) {
      console.log("[vision-analyze] Analysis saved with ID:", analysisId);
      finalJson.analysisId = analysisId;
    }

    // Build rich report
    const report = buildReport(isAr, finalJson, objectType, mass, confidence, v0, angle, h0, g, v0x, v0y, maxHeight, maxRange, totalTime, impactVelocity, kineticEnergy, potentialEnergy, scientificExplanation, imageDescription, verification, processingTime);

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
