import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LOVABLE_AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

// ── Smart Defaults Based on Object Type ──

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
  if (t.includes("baseball")) return { velocity: 35, angle: 35, height: 1.8, mass: 0.145 };
  if (t.includes("javelin")) return { velocity: 28, angle: 38, height: 2.0, mass: 0.8 };
  if (t.includes("arrow")) return { velocity: 60, angle: 25, height: 1.5, mass: 0.025 };
  if (t.includes("stone") || t.includes("rock")) return { velocity: 15, angle: 45, height: 1.7, mass: 0.3 };
  if (t.includes("shot") || t.includes("put")) return { velocity: 13, angle: 42, height: 2.0, mass: 7.26 };
  if (t.includes("grenade")) return { velocity: 18, angle: 42, height: 1.8, mass: 0.4 };
  if (t.includes("bullet")) return { velocity: 400, angle: 5, height: 1.5, mass: 0.01 };
  if (t.includes("tennis")) return { velocity: 25, angle: 20, height: 1.2, mass: 0.058 };
  if (t.includes("ball")) return { velocity: 15, angle: 45, height: 1.5, mass: 0.5 };
  return { velocity: 20, angle: 45, height: 1.5, mass: 0.5 };
}

// ── JSON Parser ──

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

// ── Energy Conservation Verification ──

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

// ── Vision Prompt ──

function buildVisionPrompt(lang: string): string {
  const isAr = lang === "ar";
  const langInstruction = isAr ? "IN ARABIC" : "IN ENGLISH";

  return `You are Professor APAS - a world-renowned expert in Mechanical Physics from ENS (Ecole Normale Superieure, Paris).
You specialize in projectile motion, ballistics, and Newtonian mechanics.

TASK: Analyze the uploaded image for projectile motion with EXTREME precision.

STEP 1 - CAREFULLY EXAMINE THE IMAGE:
- Describe EXACTLY what you see: colors, shapes, objects, people, environment, trajectory arcs.
- NEVER assume it is a cannonball unless you see an actual cannon. Identify the SPECIFIC object from visual cues.
- If it's a diagram/illustration of projectile motion, analyze it as a real scenario.

STEP 2 - DETECT PROJECTILE:
- Look for ANY object being launched, thrown, shot, or in mid-flight.
- Valid: ball (basketball, football, tennis, etc.), rocket, stone, bullet, arrow, javelin, shot-put, any thrown/launched object.
- Diagrams and educational illustrations are VALID.
- If NO projectile visible, respond: {"detected": false, "error": "${isAr ? 'لم أتعرف على جسم مقذوف في هذه الصورة' : 'No projectile detected in this image'}"}

STEP 3 - EXPERT ANALYSIS (only if detected):
- Identify object SPECIFICALLY from visual appearance
- Use reference objects for scale: person ~1.7m, door ~2m, car ~1.5m tall, basketball hoop 3.05m
- Estimate launch angle from trajectory arc with HIGH PRECISION (e.g., 42.35 not 40)
- Estimate initial velocity from context with HIGH PRECISION (e.g., 15.62 not 15)
- Estimate launch height from ground reference
- Estimate mass from object type

CRITICAL RULES:
- NEVER return 0 for initial_velocity or launch_angle
- Use at least 2 decimal places
- Professors estimate, they NEVER return zeros
- Provide a COMPREHENSIVE scientific explanation ${langInstruction}

STEP 4 - COMPUTE ALL PHYSICS:
- v0x = v0·cos(θ), v0y = v0·sin(θ)
- Max height: H = h₀ + v0y²/(2·g)
- Time of flight: solve y(t)=0
- Range: R = v0x·T
- Impact velocity: v_impact = √(v0x² + (v0y−g·T)²)
- Kinetic energy: KE = ½·m·v0²
- Potential energy at max height: PE = m·g·H

RESPOND WITH ONLY valid JSON (no markdown fences):
{
  "detected": true,
  "object_type": "specific object name in English",
  "estimated_mass": 4.5,
  "initial_velocity": 120.45,
  "launch_angle": 42.18,
  "launch_height": 1.53,
  "gravity": 9.81,
  "v0x": 89.17,
  "v0y": 80.26,
  "max_altitude": 329.96,
  "horizontal_range": 1461.74,
  "time_of_flight": 16.39,
  "impact_velocity": 120.12,
  "kinetic_energy_launch": 32400.12,
  "potential_energy_max": 14588.73,
  "drag_effect": "slight",
  "motion_type": "projectile",
  "confidence_score": 75.5,
  "calibration_reference": "reference object used for scale",
  "image_description": "detailed description ${langInstruction}",
  "analysis_summary_ar": "${isAr ? 'ملخص التحليل بالعربية' : 'Arabic summary'}",
  "scientific_explanation": "${isAr ? 'التفسير العلمي المفصل بالعربية' : 'Detailed scientific explanation'}"
}

ALL numeric values MUST be non-zero and physically realistic with decimal precision.
The object_type MUST match what you ACTUALLY see.`;
}

// ── Main Handler ──

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const { imageBase64, mimeType, lang } = await req.json();
    if (!imageBase64) {
      return new Response(JSON.stringify({ error: "No image provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const isAr = lang === "ar";
    const prompt = buildVisionPrompt(lang);
    const dataUrl = `data:${mimeType || "image/jpeg"};base64,${imageBase64}`;

    console.log("[vision-analyze] Calling Lovable AI (Gemini 2.5 Flash)...");

    const response = await fetch(LOVABLE_AI_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are Professor APAS, Elite Physics Analyzer from ENS Paris. Follow all instructions precisely. Respond with ONLY valid JSON." },
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
        temperature: 0.2,
        max_tokens: 6000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[vision-analyze] Lovable AI error ${response.status}: ${errorText}`);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI request failed: ${response.status}`);
    }

    const data = await response.json();
    const rawResponse = data?.choices?.[0]?.message?.content || "";
    if (!rawResponse) throw new Error("AI returned empty response");

    console.log(`[vision-analyze] AI response length: ${rawResponse.length}`);
    const parsed = parseJsonFromText(rawResponse);

    // Check if projectile was detected
    if (!parsed.detected) {
      const errorMsg = (parsed.error as string) ||
        (isAr ? "لم أتعرف على جسم مقذوف في هذه الصورة." : "No projectile detected in this image.");
      return new Response(
        JSON.stringify({
          text: isAr ? "# لم يتم اكتشاف مقذوف\n\n" + errorMsg : "# No Projectile Detected\n\n" + errorMsg,
          detected: false,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Extract object type first to get smart defaults
    const objectType = String(parsed.object_type || "projectile");
    const defaults = getSmartDefaults(objectType);

    // Extract and validate physics values
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

    // Recompute physics for consistency
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
    const scientificExplanation = String(parsed.scientific_explanation || "");
    const imageDescription = String(parsed.image_description || "");
    const analysisSummaryAr = String(parsed.analysis_summary_ar || "");
    const calibrationRef = String(parsed.calibration_reference || "");
    const dragEffect = String(parsed.drag_effect || "slight");

    // Energy verification
    const verification = verifyWithEnergy({
      velocity: v0, angle, height: h0, gravity: g, maxHeight, impactVelocity,
    });

    let consistencyNote = "";
    if (usedDefaults) {
      consistencyNote = isAr
        ? "ℹ️ تم استخدام قيم افتراضية للجسم لعدم وضوح معالم الحركة."
        : "ℹ️ Using standard physical defaults for this object type as motion cues were unclear.";
    }

    const processingTime = Date.now() - startTime;

    const finalJson: Record<string, unknown> = {
      detected: true, confidence, angle, velocity: v0, mass, height: h0,
      objectType, gravity: g, v0x, v0y, maxHeight, maxRange, totalTime,
      impactVelocity, kineticEnergy, potentialEnergy, dragEffect,
      motionType: "projectile", calibrationRef, analysisSummaryAr,
      scientificExplanation, imageDescription,
      verified: verification.verified,
      energyError: Math.round(verification.energyError * 10000) / 100,
      providers: { extraction: "Lovable AI (Gemini)", solving: "Lovable AI (Gemini)" },
      processingTimeMs: processingTime,
      consistencyNote,
    };

    // Build rich report
    const report = [
      "```json", JSON.stringify(finalJson, null, 2), "```", "",
      isAr ? "# APAS AI تقرير تحليل المقذوف" : "# APAS AI Projectile Analysis Report", "",
      isAr ? "## الكائن المكتشف" : "## Detected Object",
      (isAr ? "النوع: " : "Type: ") + "**" + objectType + "**",
      (isAr ? "الكتلة: " : "Mass: ") + "**" + mass + "** kg",
      (isAr ? "نسبة الثقة: " : "Confidence: ") + "**" + confidence + "%**", "",
      isAr ? "## المعطيات المستخرجة" : "## Extracted Data",
      (isAr ? "السرعة الابتدائية: " : "Initial velocity: ") + "**V₀ = " + v0 + "** m/s",
      (isAr ? "زاوية الإطلاق: " : "Launch angle: ") + "**θ = " + angle + " deg**",
      (isAr ? "الارتفاع الابتدائي: " : "Initial height: ") + "**h₀ = " + h0 + "** m",
      (isAr ? "الجاذبية: " : "Gravity: ") + "**g = " + g + "** m/s²", "",
      isAr ? "## النتائج المحسوبة" : "## Computed Results",
      "V₀x = " + v0x + " m/s", "V₀y = " + v0y + " m/s",
      (isAr ? "أقصى ارتفاع = " : "Max height = ") + maxHeight + " m",
      (isAr ? "المدى = " : "Range = ") + maxRange + " m",
      (isAr ? "زمن الطيران = " : "Time of flight = ") + totalTime + " s",
      (isAr ? "سرعة الاصطدام = " : "Impact velocity = ") + impactVelocity + " m/s", "",
      isAr ? "## الطاقة" : "## Energy",
      (isAr ? "الطاقة الحركية = " : "Kinetic energy = ") + kineticEnergy + " J",
      (isAr ? "الطاقة الكامنة = " : "Potential energy = ") + potentialEnergy + " J", "",
      isAr ? "## التفسير العلمي" : "## Scientific Explanation",
      scientificExplanation, "",
      isAr ? "## التحقق من حفظ الطاقة" : "## Energy Conservation Check",
      (verification.verified ? "✅ " : "⚠️ ") + verification.note, "",
      consistencyNote ? consistencyNote + "\n" : "",
      (isAr ? "زمن المعالجة: " : "Processing time: ") + processingTime + " ms",
    ];

    return new Response(
      JSON.stringify({ text: report.join("\n"), analysis: finalJson }),
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
