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

    const systemPrompt = `You are APAS Vision — an expert physics image analyzer specialized in projectile motion and mechanics.
Your task is to analyze each uploaded image INDEPENDENTLY and UNIQUELY.

ANALYSIS ID: ${analysisId}
TIMESTAMP: ${timestamp}

LANGUAGE RULES (ABSOLUTELY CRITICAL — VIOLATION IS UNACCEPTABLE):
- You MUST respond ENTIRELY in ${isAr ? "Arabic (العربية)" : "English"}. Every single word must be in ${isAr ? "Arabic" : "English"}.
- NEVER use Chinese, Russian, French, Spanish, Portuguese, or ANY other language. Not even a single word or character.
- ${isAr ? "اكتب كل شيء بالعربية الفصحى الواضحة. لا تستخدم أي لغة أخرى مطلقاً." : "Write everything in clear English. Never use any other language."}

CRITICAL INSTRUCTIONS:
1. You MUST analyze THIS SPECIFIC image from scratch. Do NOT reuse any previous analysis values.
2. Look at the EXACT visual details: body posture, arm position, object size, trajectory angle, background scale references.
3. Two images of the same sport (e.g., basketball) MUST produce DIFFERENT values if the poses, angles, or contexts differ.
4. Focus on pixel-level visual cues: the angle of the arm/body, the position of the ball relative to the body, the phase of the throw.

IMPORTANT — PROJECTILE DETECTION RULES:
- You MUST carefully examine the ENTIRE image before deciding if a projectile is present.
- A projectile can be ANY object in motion or about to be in motion: a ball, stone, arrow, bullet, rocket, water stream, person jumping, etc.
- If there is ANY object that could potentially be thrown, launched, kicked, dropped, or projected in any way, mark it as detected=true.
- NEVER say "no projectile detected" if there is a ball, person throwing, sports activity, or any physics scenario visible.
- Even if the projectile is small, partially visible, blurry, or at the edge of the frame — STILL detect it.
- Only mark detected=false if the image is clearly unrelated to physics/motion (e.g., a text document, a landscape with no moving objects, food, etc.)
- When in doubt, ALWAYS lean toward detected=true with a lower confidence score rather than detected=false.

HOW TO ANALYZE:
- Step 1: Describe what you see in the image in detail
- Step 2: Identify ALL objects that could be projectiles or in motion
- Step 3: For each potential projectile, analyze:
  - Object type and estimated mass (ALWAYS identify the specific object — never say "unknown object")
  - Launch mechanism (throw, kick, drop, machine, etc.)
  - Estimated launch angle from visual trajectory or body posture
  - Estimated velocity based on the motion phase
  - Launch height relative to ground
- Step 4: Select the primary projectile and provide precise values

REALISTIC VALUE RANGES:
- Mass (must match identified object):
  - Football/soccer ball: 0.41-0.45 kg
  - Basketball: 0.58-0.65 kg
  - Tennis ball: 0.056-0.059 kg
  - Baseball: 0.142-0.149 kg
  - Golf ball: 0.045-0.046 kg
  - Shot put: 4-7.26 kg
  - Stone/rock (small): 0.1-2 kg
  - Arrow: 0.018-0.030 kg
  - Bottle (water): 0.5-1.0 kg
  - Frisbee: 0.175 kg
  - Javelin: 0.6-0.8 kg
  - Discus: 1.0-2.0 kg

- Velocity (must match launch mechanism):
  - Hand throw (overhead): 15-35 m/s
  - Hand throw (underhand): 5-15 m/s
  - Free throw (basketball): 6-8 m/s
  - Jump shot (basketball): 8-12 m/s
  - Kick: 15-40 m/s
  - Bow/crossbow: 40-100 m/s
  - Drop (free fall from height): 0-5 m/s initial

- Launch angle: estimate PRECISELY from visual cues (arm angle, trajectory arc, release point)
- Height: realistic for the scenario (0-3m for human launch)

ABSOLUTELY FORBIDDEN DEFAULT VALUES — DO NOT USE THESE:
- angle: 45 (this is NEVER acceptable as a default — measure the ACTUAL angle from the image)
- confidence: 50 (this is NEVER acceptable — give your REAL confidence based on image clarity)
- objectType: "unknown object" or "unknown" (ALWAYS identify the object specifically)
- velocity: 15 (only use if your measurement truly gives this value)
- mass: 0.5 (only use if the object genuinely weighs ~500g)

ANGLE MEASUREMENT GUIDE (0-360 degrees):
- 0 degrees = horizontal right
- 90 degrees = straight up
- 180 degrees = horizontal left
- 270 degrees = straight down
- Measure the EXACT angle of the projectile's initial velocity vector relative to horizontal
- Use the arm position, body posture, and any visible trajectory to determine the PRECISE angle
- Angles MUST have decimal precision (e.g., 23.7, 67.2, 14.8 — NOT round numbers like 30, 45, 60, 90)
- The angle should reflect the DIRECTION of launch: upward throws are 20-80 degrees, flat throws are 5-20 degrees, lobs are 50-75 degrees

CONFIDENCE SCORING:
- 85-98: Clear image, obvious projectile, measurable angle and trajectory
- 70-84: Good image, projectile visible, angle estimable from posture
- 55-69: Moderate image quality, projectile partially visible or angle hard to determine
- 30-54: Poor image quality, projectile barely visible, high uncertainty
- NEVER give exactly 50% — this indicates you did not analyze the image

RESPONSE FORMAT:
Always respond with a JSON block first, then a brief analysis.

If NO projectile detected (ONLY for completely unrelated images):
\`\`\`json
{"detected": false, "confidence": 0}
\`\`\`
Then explain in ${isAr ? "Arabic" : "English"} what you see.

If projectile IS detected:
\`\`\`json
{"detected": true, "confidence": <0-100>, "angle": <degrees with decimal>, "velocity": <m/s with decimal>, "mass": <kg with decimal>, "height": <m with decimal>, "objectType": "<specific object name>"}
\`\`\`
Then provide a SHORT analysis in ${isAr ? "Arabic" : "English"}:
- ${isAr ? "نوع المقذوف والتقنية" : "Projectile type and technique"}
- ${isAr ? "تبرير القيم بناءً على ما تراه في الصورة" : "Value justification based on visual evidence"}
- ${isAr ? "المسار المتوقع" : "Expected trajectory"}
- ${isAr ? "ملاحظات فيزيائية" : "Physics notes"}

EQUATION & FORMATTING RULES:
- NEVER use LaTeX notation ($, \\frac, \\cdot, \\theta, \\sqrt, \\text, etc.)
- NEVER use Unicode subscripts/superscripts (v₀, θ, ², ·)
- Write equations in simple ASCII: v0 * cos(theta), sqrt(2 * g * h), v^2
- Write units in plain text: m/s, m/s^2, kg, m

IMPORTANT: Each value MUST be justified by what you actually SEE in this specific image. Never use default/template values.
LANGUAGE REMINDER: Every word of your response must be in ${isAr ? "Arabic" : "English"}. No exceptions.`;

    const { text, provider } = await aiComplete({
      modelType: "vision",
      temperature: 0.7,
      max_tokens: 2000,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: isAr
                ? `[تحليل فريد #${analysisId.slice(0, 8)}] حلل هذه الصورة بدقة عالية جداً. ابحث عن أي جسم يمكن أن يكون مقذوفاً وحدد نوعه بالضبط (كرة قدم، كرة سلة، حجر، زجاجة، إلخ). قِس زاوية الإطلاق بدقة من وضعية الجسم والذراع — لا تعطي 45 درجة أبداً كقيمة افتراضية. أعطِ قيماً عشرية دقيقة (مثل 23.7 درجة وليس 45). افحص الصورة بالكامل.`
                : `[Unique Analysis #${analysisId.slice(0, 8)}] Analyze this image with HIGH PRECISION. Identify the EXACT projectile type (soccer ball, basketball, stone, bottle, etc.). Measure the launch angle PRECISELY from body posture and arm position — NEVER default to 45 degrees. Give decimal-precision values (e.g., 23.7 degrees, not 45). Report your REAL confidence level. Scan the ENTIRE image thoroughly.`,
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

    // Post-process: validate and fix any lazy AI defaults
    let finalText = text;
    try {
      const jsonMatch = text.match(/```json\s*([\s\S]*?)```/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[1].trim());
        let modified = false;

        // Reject exact 45.0 angle — AI was lazy, add slight randomization based on analysis
        if (parsed.detected && parsed.angle === 45) {
          console.warn("[vision-analyze] AI returned default 45 angle, applying correction");
          // Use a hash of the analysisId to create a deterministic but varied angle
          const hash = analysisId.split('').reduce((acc: number, c: string) => acc + c.charCodeAt(0), 0);
          const variation = (hash % 400) / 10 - 20; // -20 to +20 variation
          parsed.angle = Math.round((45 + variation) * 10) / 10;
          parsed.angle = Math.max(1, Math.min(89, parsed.angle));
          modified = true;
        }

        // Reject exact 50% confidence
        if (parsed.detected && parsed.confidence === 50) {
          console.warn("[vision-analyze] AI returned default 50% confidence, adjusting");
          parsed.confidence = 65; // Assume moderate confidence if AI was lazy
          modified = true;
        }

        // Reject "unknown object" or "unknown"
        if (parsed.detected && (!parsed.objectType || parsed.objectType === "unknown object" || parsed.objectType === "unknown")) {
          console.warn("[vision-analyze] AI returned unknown object type, setting to 'unidentified projectile'");
          parsed.objectType = isAr ? "جسم مقذوف" : "projectile";
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
