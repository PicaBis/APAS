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

// \u2500\u2500 ENS Professor Prompt Builder \u2500\u2500

function buildGroqVisionPrompt(lang: string): string {
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
    "STEP 1 - DETECT PROJECTILE:",
    "Look for ANY object being launched, thrown, shot, or in mid-flight trajectory.",
    "Valid projectiles: ball (basketball, football, tennis, etc.), rocket, stone, bullet, grenade, arrow, javelin, cannonball, missile, any thrown/launched object.",
    "If NO clear projectile or projectile motion is visible, respond with ONLY this JSON:",
    '{"detected": false, "error": "' + noProjectileMsg + '"}',
    "",
    "STEP 2 - EXPERT ANALYSIS (only if projectile detected):",
    "Analyze the visual context carefully like a real physics professor:",
    "- Identify the projectile object specifically (e.g., 'basketball', 'soccer ball', 'stone')",
    "- Use reference objects for scale: person ~1.7m, door ~2m, car ~1.5m tall, basketball hoop 3.05m, football goal 2.44m",
    "- Estimate launch angle from trajectory arc, body posture, arm position",
    "- Estimate initial velocity from context (sport type, throw strength, visible arc)",
    "- Estimate launch height from ground reference",
    "- Estimate mass from object type",
    "- Consider air resistance qualitatively",
    "",
    "STEP 3 - COMPUTE ALL PHYSICS:",
    "Using your estimates, compute precisely:",
    "- v0x = v0 * cos(angle), v0y = v0 * sin(angle)",
    "- Max height: H = h0 + v0y^2 / (2*g)",
    "- Time of flight: solve y(t) = 0 quadratic",
    "- Range: R = v0x * T",
    "- Impact velocity: v_impact = sqrt(v0x^2 + (v0y - g*T)^2)",
    "- Kinetic energy at launch: KE = 0.5 * m * v0^2",
    "- Potential energy at max height: PE = m * g * H",
    "",
    "STEP 4 - SCIENTIFIC EXPLANATION:",
    "Write a detailed scientific explanation " + langInstruction + " of HOW you arrived at these values.",
    "Reference visual cues: 'Based on the ball elevation relative to the hoop...', 'The player arm angle suggests...'",
    "This section is called '" + sciLabel + "'.",
    "",
    "RESPOND WITH ONLY valid JSON (no markdown fences, no extra text):",
    "{",
    '  "detected": true,',
    '  "object_type": "specific object name",',
    '  "estimated_mass": 0.5,',
    '  "initial_velocity": 0,',
    '  "launch_angle": 0,',
    '  "launch_height": 0,',
    '  "gravity": 9.81,',
    '  "v0x": 0,',
    '  "v0y": 0,',
    '  "max_altitude": 0,',
    '  "horizontal_range": 0,',
    '  "time_of_flight": 0,',
    '  "impact_velocity": 0,',
    '  "kinetic_energy_launch": 0,',
    '  "potential_energy_max": 0,',
    '  "drag_effect": "none|slight|significant",',
    '  "motion_type": "projectile",',
    '  "confidence_score": 0,',
    '  "calibration_reference": "reference object used for scale",',
    '  "analysis_summary_ar": "' + summaryPlaceholder + '",',
    '  "scientific_explanation": "' + sciPlaceholder + '"',
    "}",
  ].join("\n");
}

// \u2500\u2500 Groq Vision API Call (EXCLUSIVE - no fallback) \u2500\u2500

async function callGroqVision(
  imageBase64: string,
  mimeType: string,
  lang: string,
): Promise<string> {
  const apiKey = Deno.env.get("GROQ_API_KEY");
  if (!apiKey) throw new Error("GROQ_API_KEY not configured");

  const prompt = buildGroqVisionPrompt(lang);
  const dataUrl = "data:" + mimeType + ";base64," + imageBase64;

  return retryWithBackoff(async () => {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + apiKey,
      },
      body: JSON.stringify({
        model: "llama-3.2-90b-vision-preview",
        messages: [
          {
            role: "system",
            content: "You are Professor APAS from ENS (Ecole Normale Superieure). You are the world's foremost expert in projectile motion and Newtonian mechanics. You analyze images with scientific rigor and provide authoritative, precise physics analysis. You MUST respond with ONLY valid JSON - no markdown, no extra text.",
          },
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

    if (!res.ok) {
      const err = await res.text();
      throw new Error("Groq API error (" + res.status + "): " + err);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || "";
  }, "Groq-Vision");
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
    const { data, error } = await supabase
      .from("analyses")
      .insert(analysisData)
      .select("id")
      .single();

    if (error) {
      console.warn("[vision-analyze] DB upsert failed:", error.message);
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
    (isAr ? "\u0627\u0644\u0633\u0631\u0639\u0629 \u0627\u0644\u0627\u0628\u062a\u062f\u0627\u0626\u064a\u0629: " : "Initial velocity: ") + "**" + v0 + "** m/s",
    (isAr ? "\u0632\u0627\u0648\u064a\u0629 \u0627\u0644\u0625\u0637\u0644\u0627\u0642: " : "Launch angle: ") + "**" + angle + " deg**",
    (isAr ? "\u0627\u0644\u0627\u0631\u062a\u0641\u0627\u0639 \u0627\u0644\u0627\u0628\u062a\u062f\u0627\u0626\u064a: " : "Initial height: ") + "**" + h0 + "** m",
    (isAr ? "\u0627\u0644\u062c\u0627\u0630\u0628\u064a\u0629: " : "Gravity: ") + "**" + g + "** m/s\u00B2",
    "",
    isAr ? "## \u0627\u0644\u0646\u062a\u0627\u0626\u062c \u0627\u0644\u0645\u062d\u0633\u0648\u0628\u0629" : "## Computed Results",
    "v0x = " + v0x + " m/s",
    "v0y = " + v0y + " m/s",
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
    isAr ? "## \u0627\u0644\u062a\u062d\u0642\u0642 \u0645\u0646 \u062d\u0641\u0638 \u0627\u0644\u0637\u0627\u0642\u0629" : "## Energy Conservation Check",
    (verification.verified ? "OK" : "WARNING") + ": " + verification.note,
    "",
    (isAr ? "\u0645\u0632\u0648\u062f \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064a: " : "AI Provider: ") + "Groq (Exclusive)",
    (isAr ? "\u0632\u0645\u0646 \u0627\u0644\u0645\u0639\u0627\u0644\u062c\u0629: " : "Processing time: ") + processingTime + " ms",
  ];
  return lines.join("\n");
}

// \u2500\u2500 Main Handler \u2500\u2500

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const { imageBase64, mimeType, lang, userId } = await req.json();
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

    // Upload image to storage
    const fileId = crypto.randomUUID();
    console.log("[vision-analyze] Uploading image to storage...");
    const imageUrl = await uploadImageToStorage(supabase, imageBase64, mimeType || "image/jpeg", fileId);
    console.log("[vision-analyze] Image URL:", imageUrl ? "uploaded" : "skipped");

    // Call Groq Vision (EXCLUSIVE - no fallback)
    console.log("[vision-analyze] Calling Groq Vision (exclusive provider)...");
    const rawResponse = await callGroqVision(imageBase64, mimeType || "image/jpeg", lang);
    console.log("[vision-analyze] Groq response length:", rawResponse.length);

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

    // Extract and validate physics values
    const v0 = Number(parsed.initial_velocity) || 0;
    const angle = Number(parsed.launch_angle) || 0;
    const h0 = Number(parsed.launch_height) || 0;
    const g = Number(parsed.gravity) || 9.81;
    const mass = Number(parsed.estimated_mass) || 0.5;
    const objectType = String(parsed.object_type || "projectile");
    const confidence = Number(parsed.confidence_score) || 70;

    // Compute/verify values
    const rad = angle * Math.PI / 180;
    const v0x = parsed.v0x ? Number(parsed.v0x) : Math.round(v0 * Math.cos(rad) * 100) / 100;
    const v0y = parsed.v0y ? Number(parsed.v0y) : Math.round(v0 * Math.sin(rad) * 100) / 100;
    const maxHeight = parsed.max_altitude ? Number(parsed.max_altitude) : Math.round((h0 + (v0y * v0y) / (2 * g)) * 100) / 100;

    let totalTime = Number(parsed.time_of_flight) || 0;
    if (!totalTime) {
      const tUp = v0y / g;
      const tDown = Math.sqrt(Math.max(0, 2 * maxHeight / g));
      totalTime = Math.round((tUp + tDown) * 100) / 100;
    }

    const maxRange = parsed.horizontal_range ? Number(parsed.horizontal_range) : Math.round(v0x * totalTime * 100) / 100;

    let impactVelocity = Number(parsed.impact_velocity) || 0;
    if (!impactVelocity) {
      const vyEnd = g * totalTime - v0y;
      impactVelocity = Math.round(Math.sqrt(v0x * v0x + vyEnd * vyEnd) * 100) / 100;
    }

    const kineticEnergy = Number(parsed.kinetic_energy_launch) || Math.round(0.5 * mass * v0 * v0 * 100) / 100;
    const potentialEnergy = Number(parsed.potential_energy_max) || Math.round(mass * g * maxHeight * 100) / 100;
    const dragEffect = String(parsed.drag_effect || "none");
    const motionType = String(parsed.motion_type || "projectile");
    const calibrationRef = String(parsed.calibration_reference || "");
    const analysisSummaryAr = String(parsed.analysis_summary_ar || "");
    const scientificExplanation = String(parsed.scientific_explanation || "");

    // Energy verification
    const verification = verifyWithEnergy({
      velocity: v0, angle, height: h0, gravity: g,
      maxHeight, impactVelocity,
    });
    console.log("[vision-analyze] Energy verification:", verification);

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
      verified: verification.verified,
      energyError: Math.round(verification.energyError * 10000) / 100,
      providers: { extraction: "Groq", solving: "Groq" },
      processingTimeMs: processingTime,
    };

    // Upsert to Supabase analyses table
    console.log("[vision-analyze] Upserting analysis to database...");
    const dbRecord: Record<string, unknown> = {
      source_type: "image",
      source_url: imageUrl,
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
      analysis_engine: "groq_vision_llama3",
      calibration_source: "auto",
      calibration_reference: calibrationRef,
      gravity: g,
      report_text: scientificExplanation,
      report_lang: isAr ? "ar" : "en",
      analysis_summary_ar: analysisSummaryAr,
      ai_provider: "Groq",
      processing_time_ms: processingTime,
      user_id: userId || null,
    };

    const analysisId = await upsertAnalysis(supabase, dbRecord);
    if (analysisId) {
      console.log("[vision-analyze] Analysis saved with ID:", analysisId);
      finalJson.analysisId = analysisId;
    }

    // Build rich report
    const report = buildReport(isAr, finalJson, objectType, mass, confidence, v0, angle, h0, g, v0x, v0y, maxHeight, maxRange, totalTime, impactVelocity, kineticEnergy, potentialEnergy, scientificExplanation, verification, processingTime);

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
