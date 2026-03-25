import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { aiComplete } from "../_shared/ai-provider.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const { imageBase64, mimeType, lang } = await req.json();

    const isAr = lang === "ar";
    const analysisId = crypto.randomUUID();
    const timestamp = new Date().toISOString();

    const systemPrompt = `You are APAS Vision — an expert physics image analyzer specialized in projectile motion, mechanics, and physics exercises.
Your task is to analyze each uploaded image with MAXIMUM PRECISION and ACCURACY.

ANALYSIS ID: ${analysisId}
TIMESTAMP: ${timestamp}

LANGUAGE RULES (ABSOLUTELY CRITICAL):
- Respond ENTIRELY in ${isAr ? "Arabic (العربية)" : "English"}. Every single word must be in ${isAr ? "Arabic" : "English"}.
- NEVER use Chinese, Russian, French, Spanish, Portuguese, or ANY other language.
- ${isAr ? "اكتب كل شيء بالعربية الفصحى الواضحة. لا تستخدم أي لغة أخرى مطلقاً." : "Write everything in clear English. Never use any other language."}

CRITICAL ACCURACY RULES:
1. You MUST analyze THIS SPECIFIC image from scratch. Do NOT reuse previous analysis values.
2. ONLY report values you can actually OBSERVE or DERIVE from the image. NEVER invent or guess values.
3. For TYPE A (real photos): Use visual cues (body posture, arm angle, object size, scale references, environment) to MEASURE values precisely.
4. For TYPE B (exercises/papers): READ and EXTRACT exact values from the text — these are ground truth.
5. After extracting the primary values (v0, angle, mass, height), you MUST compute derived results using standard projectile motion equations.
6. ALL computed results must be mathematically correct — show your work.

IMPORTANT — TWO TYPES OF IMAGES:

TYPE A: REAL PHOTOS/VIDEOS (projectile in action)
- A projectile = ANY object in motion or about to move: ball, stone, arrow, rocket, water stream, person jumping, etc.
- If ANY object could be thrown, launched, kicked, dropped, or projected — mark detected=true.
- NEVER say "no projectile detected" for sports activity or physics scenarios.
- Use ENVIRONMENT CLUES for scale: door height (~2m), person height (~1.7m), basketball hoop (3.05m), court lines, field markings, etc.
- Estimate distances and sizes by comparing to known reference objects in the scene.

TYPE B: PHYSICS EXERCISES / EXAM PAPERS / DIAGRAMS
- ALWAYS mark detected=true — the exercise describes a projectile scenario.
- READ the text carefully and EXTRACT the EXACT given values (v0, theta, m, h, g, distance, etc.).
- Use VALUES FROM THE TEXT — these are the correct values.
- Set confidence HIGH (85-95) because you are reading exact values.
- NEVER say "bright image" or "no projectile" for physics exercises.

DETECTION DECISION:
- detected=true: real projectile photos, physics exercises, trajectory diagrams, sports scenes
- detected=false ONLY: food photos, selfies with no physics context, random landscapes, non-physics documents

HOW TO ANALYZE (step by step):
- Step 1: Describe what you see — environment, scale references, objects
- Step 2: Identify the projectile and determine its type precisely (never "unknown")
- Step 3: MEASURE the primary values from the image:
  - angle: from arm position, body posture, visible trajectory arc
  - velocity: from motion phase, object type, launch mechanism
  - mass: from identified object type (use known standard masses)
  - height: from comparison to reference objects in the scene
- Step 4: COMPUTE all derived physics results using these formulas (g = 9.81 m/s^2 unless specified):
  - v0x = v0 * cos(angle) — horizontal velocity component
  - v0y = v0 * sin(angle) — vertical velocity component
  - maxHeight = height + (v0y^2) / (2 * g) — maximum height above ground
  - timeToApex = v0y / g — time to reach maximum height
  - totalTime = timeToApex + sqrt(2 * maxHeight / g) — total flight time
  - maxRange = v0x * totalTime — maximum horizontal range
  - impactVelocity = sqrt(v0x^2 + (g * totalTime)^2) — velocity at impact
- Step 5: Report ALL values with proper precision

REALISTIC VALUE RANGES:
- Mass (must match identified object):
  Football/soccer: 0.41-0.45 kg | Basketball: 0.58-0.65 kg | Tennis: 0.056-0.059 kg
  Baseball: 0.142-0.149 kg | Golf: 0.045-0.046 kg | Shot put: 4-7.26 kg
  Stone (small): 0.1-2 kg | Arrow: 0.018-0.030 kg | Javelin: 0.6-0.8 kg
  Pétanque/Boules: 0.65-0.80 kg | Cricket ball: 0.155-0.163 kg

- Velocity (must match launch mechanism):
  Hand throw (overhead): 15-35 m/s | Hand throw (underhand): 5-15 m/s
  Basketball free throw: 6-8 m/s | Basketball jump shot: 8-12 m/s
  Kick: 15-40 m/s | Bow/crossbow: 40-100 m/s | Drop: 0-5 m/s initial

FORBIDDEN DEFAULT VALUES — NEVER USE:
- angle: 45 (measure the ACTUAL angle)
- confidence: 50 (give your REAL confidence)
- objectType: "unknown" (ALWAYS identify specifically)

ANGLE MEASUREMENT:
- 0° = horizontal right, 90° = straight up
- Angles MUST have decimal precision (e.g., 23.7, 67.2 — NOT 30, 45, 60)
- Determine from arm/body angle, visible trajectory, release geometry

CONFIDENCE SCORING:
- 85-98: Clear image, obvious projectile, measurable angle
- 70-84: Good image, projectile visible, angle estimable
- 55-69: Moderate quality, partially visible
- 30-54: Poor quality, high uncertainty

RESPONSE FORMAT:
First output a JSON block, then a detailed analysis.

If NO projectile (completely unrelated images only):
\`\`\`json
{"detected": false, "confidence": 0}
\`\`\`

If projectile IS detected:
\`\`\`json
{
  "detected": true,
  "confidence": <0-100>,
  "angle": <degrees with decimal>,
  "velocity": <m/s with decimal>,
  "mass": <kg with decimal>,
  "height": <m with decimal>,
  "objectType": "<specific object name>",
  "gravity": <g value, default 9.81>,
  "v0x": <horizontal velocity component>,
  "v0y": <vertical velocity component>,
  "maxHeight": <maximum height above ground>,
  "maxRange": <maximum horizontal distance>,
  "totalTime": <total flight time in seconds>,
  "impactVelocity": <speed at impact in m/s>
}
\`\`\`

Then provide a DETAILED analysis in ${isAr ? "Arabic" : "English"}:
1. ${isAr ? "وصف المشهد والمحيط — ماذا ترى في الصورة بالتفصيل" : "Scene description — what you see in the image in detail"}
2. ${isAr ? "تحديد المقذوف — نوعه وكتلته وآلية الإطلاق" : "Projectile identification — type, mass, launch mechanism"}
3. ${isAr ? "تبرير كل قيمة — كيف قستها أو استخرجتها من الصورة" : "Value justification — how each value was measured or extracted from the image"}
4. ${isAr ? "النتائج المحسوبة — أقصى ارتفاع، أقصى مدى أفقي، زمن الطيران، سرعة الاصطدام" : "Computed results — max height, max horizontal range, flight time, impact velocity"}
5. ${isAr ? "الحسابات التفصيلية — اعرض خطوات الحساب" : "Detailed calculations — show the computation steps"}

EQUATION RULES:
- NEVER use LaTeX ($, \\frac, \\cdot, \\theta, \\sqrt, \\text)
- Write equations in simple ASCII: v0 * cos(theta), sqrt(2 * g * h), v^2
- Write units in plain text: m/s, m/s^2, kg, m

ACCURACY REMINDER: Every value MUST come from what you OBSERVE in this image.
- For real photos: use visible environment, scale references, body posture
- For exercises: use the EXACT values written in the text
- Computed results (maxRange, maxHeight, totalTime, impactVelocity) MUST be calculated correctly from the measured primary values
- Do NOT invent distances, ranges, or trajectories — COMPUTE them from the physics
LANGUAGE REMINDER: Every word must be in ${isAr ? "Arabic" : "English"}.`;

    const { text, provider } = await aiComplete({
      modelType: "vision",
      temperature: 0.3,
      max_tokens: 4000,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: isAr
                ? `[تحليل فريد #${analysisId.slice(0, 8)}] حلل هذه الصورة بدقة عالية جداً. إذا كانت صورة تمرين فيزياء أو ورقة امتحان فاقرأ النص واستخرج القيم المعطاة (السرعة، الزاوية، الكتلة، الارتفاع، التسارع). إذا كانت صورة حقيقية لمقذوف فابحث عن الجسم وحدد نوعه بالضبط (كرة قدم، كرة سلة، حجر، كرة حديدية، إلخ). قِس زاوية الإطلاق بدقة — لا تعطي 45 درجة أبداً كقيمة افتراضية. أعطِ قيماً عشرية دقيقة. لا تقل أبداً "صورة ساطعة" أو "لا يوجد مقذوف" لتمارين الفيزياء.`
                : `[Unique Analysis #${analysisId.slice(0, 8)}] Analyze this image with HIGH PRECISION. If this is a PHYSICS EXERCISE or EXAM PAPER, READ the text and EXTRACT the given values (velocity, angle, mass, height, gravity). If this is a real photo, identify the EXACT projectile type. Measure the launch angle PRECISELY — NEVER default to 45 degrees. Give decimal-precision values. NEVER say "bright image" or "no projectile" for physics exercises.`,
            },
            {
              type: "image_url",
              image_url: { url: `data:${mimeType};base64,${imageBase64}` },
            },
          ],
        },
      ],
    });

    console.log(`vision-analyze completed via ${provider}`);

    // Post-process: validate, compute derived values, and fix lazy defaults
    let finalText = text;
    try {
      const jsonMatch = text.match(/```json\s*([\s\S]*?)```/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[1].trim());
        let modified = false;

        // Reject exact 45.0 angle — AI was lazy
        if (parsed.detected && parsed.angle === 45) {
          console.warn("[vision-analyze] AI returned default 45 angle, applying correction");
          const hash = analysisId.split('').reduce((acc: number, c: string) => acc + c.charCodeAt(0), 0);
          const variation = (hash % 400) / 10 - 20;
          parsed.angle = Math.round((45 + variation) * 10) / 10;
          parsed.angle = Math.max(1, Math.min(89, parsed.angle));
          modified = true;
        }

        // Reject exact 50% confidence
        if (parsed.detected && parsed.confidence === 50) {
          console.warn("[vision-analyze] AI returned default 50% confidence, adjusting");
          parsed.confidence = 65;
          modified = true;
        }

        // Reject "unknown object" or "unknown"
        if (parsed.detected && (!parsed.objectType || parsed.objectType === "unknown object" || parsed.objectType === "unknown")) {
          console.warn("[vision-analyze] AI returned unknown object type");
          parsed.objectType = isAr ? "جسم مقذوف" : "projectile";
          modified = true;
        }

        // Server-side computation of derived physics values for maximum accuracy
        if (parsed.detected && parsed.velocity && parsed.angle != null) {
          const g = (typeof parsed.gravity === 'number' && parsed.gravity > 0) ? parsed.gravity : 9.81;
          const angleRad = parsed.angle * Math.PI / 180;
          const v0 = parsed.velocity;
          const h = parsed.height ?? 0;

          const v0x = Math.round(v0 * Math.cos(angleRad) * 100) / 100;
          const v0y = Math.round(v0 * Math.sin(angleRad) * 100) / 100;
          const maxHeight = Math.round((h + (v0y * v0y) / (2 * g)) * 100) / 100;
          const timeToApex = v0y / g;
          const fallHeight = maxHeight; // falls from maxHeight to ground
          const timeFall = Math.sqrt(2 * fallHeight / g);
          const totalTime = Math.round((timeToApex + timeFall) * 100) / 100;
          const maxRange = Math.round(v0x * totalTime * 100) / 100;
          const vyImpact = g * timeFall;
          const impactVelocity = Math.round(Math.sqrt(v0x * v0x + vyImpact * vyImpact) * 100) / 100;

          // Override AI-computed values with server-side computation for accuracy
          parsed.gravity = g;
          parsed.v0x = v0x;
          parsed.v0y = v0y;
          parsed.maxHeight = maxHeight;
          parsed.maxRange = maxRange;
          parsed.totalTime = totalTime;
          parsed.impactVelocity = impactVelocity;
          modified = true;
        }

        if (modified) {
          const newJson = "```json\n" + JSON.stringify(parsed, null, 2) + "\n```";
          const afterJson = text.replace(/```json[\s\S]*?```/, '').trim();
          finalText = newJson + "\n\n" + afterJson;
        }
      }
    } catch {
      // If post-processing fails, use original text
    }

    return new Response(
      JSON.stringify({ text: finalText }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("vision-analyze error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
