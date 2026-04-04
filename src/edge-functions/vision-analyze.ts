import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS, GET, HEAD, PUT",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Max-Age": "86400",
  "Vary": "Origin"
};

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

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

// ── Enhanced JSON Parser ──

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

// ── Advanced Energy Conservation Verification ──

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

// ── Enhanced Vision Prompt with Advanced Physics ──

function buildVisionPrompt(lang: string): string {
  const isAr = lang === "ar";
  const langInstruction = isAr ? "IN ARABIC" : "IN ENGLISH";

  return `You are Professor APAS - a world-renowned expert in Mechanical Physics from ENS (École Normale Supérieure, Paris).
You specialize in projectile motion, ballistics, and Newtonian mechanics with 25+ years of experience.

TASK: Analyze the uploaded image for projectile motion with EXTREME precision and scientific rigor.

STEP 1 - METICULOUS VISUAL EXAMINATION:
- Describe EXACTLY what you see: colors, shapes, objects, people, environment, trajectory arcs, shadows.
- Identify lighting conditions, atmospheric effects, and motion blur patterns.
- NEVER assume it is a cannonball unless you see an actual cannon. Identify the SPECIFIC object from visual cues.
- If it's a diagram/illustration of projectile motion, analyze it as a real scenario with proper scaling.

STEP 2 - PROJECTILE DETECTION:
- Look for ANY object being launched, thrown, shot, or in mid-flight trajectory.
- Valid: ball (basketball, football, tennis, golf, etc.), rocket, stone, bullet, arrow, javelin, shot-put, discus, hammer, any thrown/launched object.
- Educational diagrams, physics illustrations, and trajectory plots are VALID scenarios.
- If NO projectile visible, respond: {"detected": false, "error": "${isAr ? 'لم يتم اكتشاف جسم مقذوف في هذه الصورة' : 'No projectile detected in this image'}"}

STEP 3 - EXPERT PHYSICS ANALYSIS (only if detected):
- Identify object SPECIFICALLY from visual appearance and context
- Use multiple reference objects for scale: person ~1.7m, door ~2m, car ~1.5m tall, basketball hoop 3.05m, tennis net 1.07m
- Estimate launch angle from trajectory arc with EXTREME PRECISION (e.g., 42.35° not 40°)
- Estimate initial velocity from context with HIGH PRECISION (e.g., 15.62 m/s not 15 m/s)
- Estimate launch height from ground reference with precision
- Estimate mass from object type and visual size
- Consider air resistance effects and atmospheric conditions if visible

STEP 4 - COMPREHENSIVE PHYSICS COMPUTATION:
- v0x = v0·cos(θ), v0y = v0·sin(θ)
- Maximum height: H = h₀ + v0y²/(2·g)
- Time to apex: t_apex = v0y/g
- Time of flight: solve y(t)=0 considering launch height
- Range: R = v0x·T
- Impact velocity: v_impact = √(v0x² + (v0y−g·T)²)
- Kinetic energy: KE = ½·m·v0²
- Potential energy at max height: PE = m·g·H
- Momentum: p = m·v0
- Drag coefficient estimation based on object shape

CRITICAL REQUIREMENTS:
- NEVER return 0 for initial_velocity or launch_angle - professors always estimate non-zero values
- Use at least 2 decimal places for all measurements
- Provide realistic values based on object type and scenario
- Include uncertainty estimates for measurements
- Consider environmental factors (wind, altitude, humidity if visible)

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
  "drag_coefficient": 0.47,
  "cross_sectional_area": 0.052,
  "momentum": 540.2,
  "reynolds_number": 250000,
  "motion_type": "projectile",
  "confidence_score": 75.5,
  "calibration_reference": "reference object used for scale",
  "image_description": "detailed description ${langInstruction}",
  "analysis_summary_ar": "${isAr ? 'ملخص التحليل المفصل بالعربية' : 'Arabic summary'}",
  "scientific_explanation": "${isAr ? 'التفسير العلمي المفصل بالعربية' : 'Detailed scientific explanation'}",
  "environmental_factors": {
    "wind_resistance": "slight",
    "altitude_effects": "minimal",
    "air_density": "standard"
  },
  "measurement_uncertainty": {
    "velocity_uncertainty": 0.5,
    "angle_uncertainty": 2.0,
    "height_uncertainty": 0.1
  }
}

ALL numeric values MUST be non-zero, physically realistic with decimal precision, and scientifically justified.
The object_type MUST match what you ACTUALLY see with high confidence.`;
}

// ── Export Handler for Supabase Edge Functions ──

export async function visionAnalyzeHandler(req: Request): Promise<Response> {
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

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    const isAr = lang === "ar";
    const prompt = buildVisionPrompt(lang);
    const dataUrl = `data:${mimeType || "image/jpeg"};base64,${imageBase64}`;

    console.log("[vision-analyze] Calling Gemini 2.0 Flash API...");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    const response = await fetch(GEMINI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": GEMINI_API_KEY,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt.substring(0, 2000) }, // Limit prompt for speed
              { 
                inline_data: {
                  mime_type: mimeType || "image/jpeg",
                  data: imageBase64.substring(0, 500000) // Limit image size
                }
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 4000, // Reduced for speed
          topP: 0.95,
          topK: 40,
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_NONE"
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH", 
            threshold: "BLOCK_NONE"
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_NONE"
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_NONE"
          }
        ]
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[vision-analyze] Gemini API error ${response.status}: ${errorText}`);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: "Rate limited. Please try again in a moment.",
          retry_after: 5000 
        }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 403) {
        return new Response(JSON.stringify({ 
          error: "API quota exceeded. Please try again later.",
          retry_after: 60000 
        }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      // Handle connection errors
      if (response.status === 0 || !response.status) {
        return new Response(JSON.stringify({ 
          error: "Connection timeout. Please check your internet connection.",
          retry_after: 3000 
        }), {
          status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      throw new Error(`Gemini API request failed: ${response.status}`);
    }

    const data = await response.json();
    const rawResponse = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    if (!rawResponse) throw new Error("Gemini returned empty response");

    console.log(`[vision-analyze] Gemini response length: ${rawResponse.length}`);
    const parsed = parseJsonFromText(rawResponse);

    // Check if projectile was detected
    if (!parsed.detected) {
      const errorMsg = (parsed.error as string) ||
        (isAr ? "لم يتم اكتشاف جسم مقذوف في هذه الصورة." : "No projectile detected in this image.");
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

    // Extract and validate physics values with enhanced precision
    const rawV0 = Number(parsed.initial_velocity) || 0;
    const rawAngle = Number(parsed.launch_angle) || 0;
    const rawH0 = Number(parsed.launch_height) || 0;

    const v0 = rawV0 > 0 ? rawV0 : defaults.velocity;
    const angle = rawAngle > 0 ? rawAngle : defaults.angle;
    const h0 = rawH0 > 0 ? rawH0 : defaults.height;
    const g = Number(parsed.gravity) || 9.81;
    const mass = Number(parsed.estimated_mass) || defaults.mass;
    const confidence = Number(parsed.confidence_score) || 70;

    // Extract enhanced physics parameters
    const dragCoefficient = Number(parsed.drag_coefficient) || 0.47;
    const crossSectionalArea = Number(parsed.cross_sectional_area) || 0.01;
    const momentum = Number(parsed.momentum) || (mass * v0);
    const reynoldsNumber = Number(parsed.reynolds_number) || 100000;

    let usedDefaults = false;
    if (rawV0 === 0 || rawAngle === 0) {
      usedDefaults = true;
      console.log("[vision-analyze] AI returned zeros, using smart defaults for: " + objectType);
    }

    // Enhanced physics recomputation with higher precision
    const rad = angle * Math.PI / 180;
    const v0x = Math.round(v0 * Math.cos(rad) * 1000) / 1000;
    const v0y = Math.round(v0 * Math.sin(rad) * 1000) / 1000;
    const maxHeight = Math.round((h0 + (v0y * v0y) / (2 * g)) * 1000) / 1000;
    const tUp = v0y / g;
    const tDown = Math.sqrt(Math.max(0, 2 * maxHeight / g));
    const totalTime = Math.round((tUp + tDown) * 1000) / 1000;
    const maxRange = Math.round(v0x * totalTime * 1000) / 1000;
    const vyEnd = g * totalTime - v0y;
    const impactVelocity = Math.round(Math.sqrt(v0x * v0x + vyEnd * vyEnd) * 1000) / 1000;
    const kineticEnergy = Math.round(0.5 * mass * v0 * v0 * 1000) / 1000;
    const potentialEnergy = Math.round(mass * g * maxHeight * 1000) / 1000;
    const scientificExplanation = String(parsed.scientific_explanation || "");
    const imageDescription = String(parsed.image_description || "");
    const analysisSummaryAr = String(parsed.analysis_summary_ar || "");
    const calibrationRef = String(parsed.calibration_reference || "");
    const dragEffect = String(parsed.drag_effect || "slight");

    // Extract environmental factors
    const environmentalFactors = parsed.environmental_factors as Record<string, unknown> || {};
    const windResistance = String(environmentalFactors.wind_resistance || "minimal");
    const altitudeEffects = String(environmentalFactors.altitude_effects || "minimal");
    const airDensity = String(environmentalFactors.air_density || "standard");

    // Extract measurement uncertainties
    const measurementUncertainty = parsed.measurement_uncertainty as Record<string, unknown> || {};
    const velocityUncertainty = Number(measurementUncertainty.velocity_uncertainty) || 0.5;
    const angleUncertainty = Number(measurementUncertainty.angle_uncertainty) || 2.0;
    const heightUncertainty = Number(measurementUncertainty.height_uncertainty) || 0.1;

    // Enhanced energy verification
    const verification = verifyWithEnergy({
      velocity: v0, angle, height: h0, gravity: g, maxHeight, impactVelocity,
    });

    let consistencyNote = "";
    if (usedDefaults) {
      consistencyNote = isAr
        ? "ℹ️ تم استخدام قيم افتراضية ذكية للجسم لعدم وضوح حركة المقذوف."
        : "ℹ️ Using intelligent defaults for this object type as motion cues were unclear.";
    }

    const processingTime = Date.now() - startTime;

    const finalJson: Record<string, unknown> = {
      detected: true, 
      confidence, 
      angle, 
      velocity: v0, 
      mass, 
      height: h0,
      objectType, 
      gravity: g, 
      v0x, 
      v0y, 
      maxHeight, 
      maxRange, 
      totalTime,
      impactVelocity, 
      kineticEnergy, 
      potentialEnergy, 
      dragEffect,
      dragCoefficient,
      crossSectionalArea,
      momentum,
      reynoldsNumber,
      motionType: "projectile", 
      calibrationRef, 
      analysisSummaryAr,
      scientificExplanation, 
      imageDescription,
      verified: verification.verified,
      energyError: Math.round(verification.energyError * 10000) / 10000,
      providers: { 
        extraction: "Google Gemini 2.0 Flash", 
        solving: "Google Gemini 2.0 Flash" 
      },
      processingTimeMs: processingTime,
      consistencyNote,
      environmentalFactors: {
        windResistance,
        altitudeEffects,
        airDensity
      },
      measurementUncertainty: {
        velocityUncertainty,
        angleUncertainty,
        heightUncertainty
      }
    };

    // Build comprehensive report with enhanced formatting
    const report = [
      "```json", JSON.stringify(finalJson, null, 2), "```", "",
      isAr ? "# APAS AI تقرير تحليل المقذوف المتقدم" : "# APAS AI Advanced Projectile Analysis Report", "",
      isAr ? "## الكائن المكتشف" : "## Detected Object",
      (isAr ? "النوع: " : "Type: ") + "**" + objectType + "**",
      (isAr ? "الكتلة: " : "Mass: ") + "**" + mass + "** kg",
      (isAr ? "معامل السحب: " : "Drag Coefficient: ") + "**" + dragCoefficient + "**",
      (isAr ? "المقطع العرضي: " : "Cross-sectional Area: ") + "**" + crossSectionalArea + "** m²",
      (isAr ? "الزخم: " : "Momentum: ") + "**" + momentum + "** kg·m/s",
      (isAr ? "نسبة الثقة: " : "Confidence: ") + "**" + confidence + "%**", "",
      isAr ? "## المعطيات المستخرجة" : "## Extracted Data",
      (isAr ? "السرعة الابتدائية: " : "Initial velocity: ") + "**V₀ = " + v0 + "** m/s",
      (isAr ? "زاوية الإطلاق: " : "Launch angle: ") + "**θ = " + angle + "°**",
      (isAr ? "الارتفاع الابتدائي: " : "Initial height: ") + "**h₀ = " + h0 + "** m",
      (isAr ? "الجاذبية: " : "Gravity: ") + "**g = " + g + "** m/s²", "",
      isAr ? "## النتائج المحسوبة" : "## Computed Results",
      "V₀x = " + v0x + " m/s", "V₀y = " + v0y + " m/s",
      (isAr ? "أقصى ارتفاع = " : "Max height = ") + maxHeight + " m",
      (isAr ? "المدى الأفقي = " : "Horizontal range = ") + maxRange + " m",
      (isAr ? "زمن الطيران = " : "Time of flight = ") + totalTime + " s",
      (isAr ? "سرعة الاصطدام = " : "Impact velocity = ") + impactVelocity + " m/s", "",
      isAr ? "## الطاقة والديناميكا" : "## Energy & Dynamics",
      (isAr ? "الطاقة الحركية = " : "Kinetic energy = ") + kineticEnergy + " J",
      (isAr ? "الطاقة الكامنة = " : "Potential energy = ") + potentialEnergy + " J",
      (isAr ? "رقم رينولدز = " : "Reynolds number = ") + reynoldsNumber, "",
      isAr ? "## العوامل البيئية" : "## Environmental Factors",
      (isAr ? "مقاومة الرياح: " : "Wind resistance: ") + windResistance,
      (isAr ? "تأثيرات الارتفاع: " : "Altitude effects: ") + altitudeEffects,
      (isAr ? "كثافة الهواء: " : "Air density: ") + airDensity, "",
      isAr ? "## عدم اليقين في القياسات" : "## Measurement Uncertainty",
      (isAr ? "عدم اليقين السرعة: " : "Velocity uncertainty: ") + "±" + velocityUncertainty + " m/s",
      (isAr ? "عدم اليقين الزاوية: " : "Angle uncertainty: ") + "±" + angleUncertainty + "°",
      (isAr ? "عدم اليقين الارتفاع: " : "Height uncertainty: ") + "±" + heightUncertainty + " m", "",
      isAr ? "## التحقق من حفظ الطاقة" : "## Energy Conservation Check",
      (verification.verified ? "✅ " : "⚠️ ") + verification.note, "",
      consistencyNote ? consistencyNote + "\n" : "",
      isAr ? "## معلومات إضافية" : "## Additional Information",
      imageDescription, "",
      scientificExplanation, "",
      isAr ? "## زمن المعالجة" : "## Processing Time",
      processingTime + " ms",
      isAr ? "## مزود الخدمة" : "## Service Provider",
      "Google Gemini 2.0 Flash API",
    ];

    return new Response(
      JSON.stringify({ text: report.join("\n"), analysis: finalJson }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("vision-analyze error:", e);
    
    // Handle specific error types
    let errorMessage = "Unknown error occurred";
    let statusCode = 500;
    
    if (e instanceof Error) {
      if (e.message.includes("aborted")) {
        errorMessage = "Request timeout. Please try again.";
        statusCode = 408;
      } else if (e.message.includes("network") || e.message.includes("fetch")) {
        errorMessage = "Network error. Please check your connection.";
        statusCode = 503;
      } else if (e.message.includes("JSON")) {
        errorMessage = "Invalid response format. Please try again.";
        statusCode = 422;
      } else {
        errorMessage = e.message;
      }
    }
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        error_type: e instanceof Error ? e.constructor.name : "Unknown",
        retry_after: 3000
      }),
      { 
        status: statusCode, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      },
    );
  }
}

serve(visionAnalyzeHandler);
