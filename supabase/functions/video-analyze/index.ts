import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LOVABLE_AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

// ── Smart Defaults ──

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

// ── Frame Limiting ──
const MAX_FRAMES = 6;

function limitFrames(
  frames: Array<{ data: string; timestamp: number }>,
): Array<{ data: string; timestamp: number }> {
  if (frames.length <= MAX_FRAMES) return frames;
  const limited: Array<{ data: string; timestamp: number }> = [];
  const step = (frames.length - 1) / (MAX_FRAMES - 1);
  for (let i = 0; i < MAX_FRAMES; i++) {
    const idx = Math.round(i * step);
    limited.push(frames[idx]);
  }
  return limited;
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

// ── Energy Verification ──

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

// ── Video Prompt ──

function buildVideoPrompt(lang: string): string {
  const isAr = lang === "ar";
  const langInstruction = isAr ? "IN ARABIC" : "IN ENGLISH";

  return `You are Professor APAS - a world-renowned expert in Mechanical Physics from ENS Paris.
You specialize in projectile motion analysis from video footage.

TASK: Analyze these video frames for projectile motion with EXTREME precision.

STEP 1 - DETECT PROJECTILE:
Watch ALL frames sequentially. Look for ANY object being launched, thrown, shot, or in mid-flight.
Valid: ball, rocket, stone, bullet, grenade, arrow, javelin, shot-put, any thrown/launched object.
Diagrams and animations are VALID.
If NO projectile visible, respond: {"detected": false, "error": "${isAr ? 'لم يتم اكتشاف حركة مقذوف في الفيديو' : 'No projectile motion detected'}"}

STEP 2 - TRACK AND ANALYZE:
- Identify the projectile SPECIFICALLY from visual appearance (color, shape, size, texture)
- Track object position across frames
- Use reference objects for scale: person ~1.7m, door ~2m, car ~1.5m, basketball hoop 3.05m
- Estimate with HIGH PRECISION (2+ decimal places)
- NEVER return 0 for velocity or angle

STEP 3 - COMPUTE PHYSICS:
- v0x = v0·cos(θ), v0y = v0·sin(θ)
- Max height: H = h₀ + v0y²/(2·g)
- Time of flight: solve y(t)=0
- Range: R = v0x·T
- Impact velocity: v_impact = √(v0x² + (v0y−g·T)²)

STEP 4 - DESCRIBE what you see ${langInstruction}:
Provide a comprehensive scientific explanation of the motion observed.

RESPOND WITH ONLY valid JSON (no markdown fences):
{
  "detected": true,
  "objectType": "specific object name in English",
  "confidence": 75.5,
  "angle": 42.18,
  "velocity": 120.45,
  "height": 1.53,
  "mass": 4.5,
  "gravity": 9.81,
  "maxHeight": 329.96,
  "maxRange": 1461.74,
  "totalTime": 16.39,
  "impactVelocity": 120.12,
  "calibrationRef": "reference object used for scale",
  "motionDescription": "comprehensive description ${langInstruction}",
  "analysis_summary_ar": "${isAr ? 'ملخص التحليل بالعربية' : 'Arabic summary'}"
}

ALL numeric values MUST be non-zero and physically realistic!`;
}

// ── Main Handler ──

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const { frames, lang } = await req.json();

    if (!frames || !Array.isArray(frames) || frames.length === 0) {
      return new Response(JSON.stringify({ error: "No frames provided" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const isAr = lang === "ar";

    // Limit frames
    const limitedFrames = limitFrames(frames);
    console.log("[video-analyze] Using " + limitedFrames.length + " frames (from " + frames.length + ")");

    // Build content with frames
    const visionPrompt = buildVideoPrompt(lang);
    const contentParts: Array<{ type: string; text?: string; image_url?: { url: string } }> = [
      { type: "text", text: visionPrompt },
    ];
    limitedFrames.forEach((f, i) => {
      contentParts.push({ type: "text", text: `Frame ${i + 1} (t=${f.timestamp.toFixed(2)}s)` });
      // Strip existing data URI prefix if present to avoid double-prefix
      const rawBase64 = f.data.replace(/^data:image\/[a-zA-Z]+;base64,/, "");
      contentParts.push({ type: "image_url", image_url: { url: `data:image/jpeg;base64,${rawBase64}` } });
    });

    console.log("[video-analyze] Calling Lovable AI (Gemini 2.5 Flash)...");

    const response = await fetch(LOVABLE_AI_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are Professor APAS, Elite Physics Analyzer from ENS Paris. Analyze video frames for projectile motion. Respond with ONLY valid JSON." },
          { role: "user", content: contentParts },
        ],
        temperature: 0.2,
        max_tokens: 6000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[video-analyze] Lovable AI error ${response.status}: ${errorText}`);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again." }), {
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

    console.log(`[video-analyze] AI response length: ${rawResponse.length}`);
    const visionData = parseJsonFromText(rawResponse);

    if (!(visionData as { detected?: boolean }).detected) {
      const noDetectReport = isAr
        ? "# لم يتم اكتشاف حركة\n\nلم يتم العثور على جسم متحرك في الفيديو."
        : "# No Motion Detected\n\nNo moving projectile was found in the video.";
      return new Response(
        JSON.stringify({ text: noDetectReport, detected: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Extract values
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
    const motionDescription = String((visionData as { motionDescription?: string }).motionDescription || "");
    const analysisSummaryAr = String((visionData as { analysis_summary_ar?: string }).analysis_summary_ar || "");

    let usedDefaults = false;
    if (rawV0 === 0 || rawAngle === 0) {
      usedDefaults = true;
      console.log("[video-analyze] AI returned zeros, using smart defaults for: " + objectType);
    }

    // Recompute physics
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

    const verification = verifyWithEnergy({
      velocity: v0, angle, height: h0, gravity: g, maxHeight, impactVelocity,
    });

    let consistencyNote = "";
    if (usedDefaults) {
      consistencyNote = isAr
        ? "ℹ️ تم استخدام قيم معيارية للجسم لصعوبة التقدير الدقيق من الفيديو."
        : "ℹ️ Standard physical defaults used due to tracking limitations.";
    }

    const processingTime = Date.now() - startTime;

    const finalJson: Record<string, unknown> = {
      detected: true, confidence, angle, velocity: v0,
      mass, height: h0, objectType, gravity: g,
      v0x, v0y, maxHeight, maxRange, totalTime, impactVelocity,
      kineticEnergy, potentialEnergy,
      verified: verification.verified,
      energyError: Math.round(verification.energyError * 10000) / 100,
      framesUsed: limitedFrames.length, framesReceived: frames.length,
      analysisSummaryAr, motionDescription,
      providers: { extraction: "Lovable AI (Gemini)", solving: "Lovable AI (Gemini)" },
      processingTimeMs: processingTime,
      consistencyNote,
    };

    const report = [
      "```json", JSON.stringify(finalJson, null, 2), "```", "",
      isAr ? "# APAS AI تقرير تحليل الفيديو" : "# APAS AI Video Analysis Report", "",
      isAr ? "## الكائن المكتشف" : "## Detected Object",
      (isAr ? "النوع: " : "Type: ") + "**" + objectType + "**",
      (isAr ? "الكتلة: " : "Mass: ") + "**" + mass + "** kg",
      (isAr ? "نسبة الثقة: " : "Confidence: ") + "**" + confidence + "%**", "",
      isAr ? "## المعطيات المستخرجة" : "## Extracted Data",
      (isAr ? "السرعة الابتدائية: " : "Initial velocity: ") + "**V₀ = " + v0 + "** m/s",
      (isAr ? "زاوية الإطلاق: " : "Launch angle: ") + "**θ = " + angle + " deg**",
      (isAr ? "ارتفاع الإطلاق: " : "Launch height: ") + "**h₀ = " + h0 + "** m", "",
      isAr ? "## النتائج المحسوبة" : "## Computed Results",
      "V₀x = " + v0x + " m/s", "V₀y = " + v0y + " m/s",
      (isAr ? "أقصى ارتفاع = " : "Max height = ") + maxHeight + " m",
      (isAr ? "المدى = " : "Range = ") + maxRange + " m",
      (isAr ? "زمن الطيران = " : "Time of flight = ") + totalTime + " s",
      (isAr ? "سرعة الاصطدام = " : "Impact velocity = ") + impactVelocity + " m/s", "",
      isAr ? "## الطاقة" : "## Energy",
      (isAr ? "الطاقة الحركية = " : "KE = ") + kineticEnergy + " J",
      (isAr ? "الطاقة الكامنة = " : "PE = ") + potentialEnergy + " J", "",
      isAr ? "## وصف الحركة" : "## Motion Description",
      motionDescription, "",
      isAr ? "## التحقق من حفظ الطاقة" : "## Energy Conservation Check",
      (verification.verified ? "✅ " : "⚠️ ") + verification.note, "",
      consistencyNote ? consistencyNote + "\n" : "",
      (isAr ? "الإطارات: " : "Frames: ") + limitedFrames.length + "/" + frames.length,
      (isAr ? "زمن المعالجة: " : "Processing time: ") + processingTime + " ms",
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
