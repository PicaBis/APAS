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
  - Object type and estimated mass
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

- Velocity (must match launch mechanism):
  - Hand throw (overhead): 15-35 m/s
  - Hand throw (underhand): 5-15 m/s
  - Free throw (basketball): 6-8 m/s
  - Jump shot (basketball): 8-12 m/s
  - Kick: 15-40 m/s
  - Bow/crossbow: 40-100 m/s

- Launch angle: estimate PRECISELY from visual cues (arm angle, trajectory arc, release point)
- Height: realistic for the scenario (0-3m for human launch)

RESPONSE FORMAT:
Always respond with a JSON block first, then a brief analysis.

If NO projectile detected (ONLY for completely unrelated images):
\`\`\`json
{"detected": false, "confidence": 0}
\`\`\`
Then explain in ${isAr ? "Arabic" : "English"} what you see.

If projectile IS detected:
\`\`\`json
{"detected": true, "confidence": <0-100>, "angle": <degrees>, "velocity": <m/s>, "mass": <kg>, "height": <m>, "objectType": "<specific type>"}
\`\`\`
Then provide a SHORT analysis in ${isAr ? "Arabic" : "English"}:
- ${isAr ? "نوع المقذوف والتقنية" : "Projectile type and technique"}
- ${isAr ? "تبرير القيم بناءً على ما تراه في الصورة" : "Value justification based on visual evidence"}
- ${isAr ? "المسار المتوقع" : "Expected trajectory"}
- ${isAr ? "ملاحظات فيزيائية" : "Physics notes"}

IMPORTANT: Each value MUST be justified by what you actually SEE in this specific image. Never use default/template values.`;

    const { text, provider } = await aiComplete({
      modelType: "vision",
      temperature: 0.4,
      max_tokens: 1500,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: isAr
                ? `[تحليل فريد #${analysisId.slice(0, 8)}] حلل هذه الصورة بدقة. ابحث عن أي جسم يمكن أن يكون مقذوفاً. انظر إلى الوضعية والزاوية والتقنية المحددة. لا تستخدم قيماً افتراضية. افحص الصورة بالكامل قبل أن تقرر عدم وجود مقذوف.`
                : `[Unique Analysis #${analysisId.slice(0, 8)}] Carefully analyze this specific image. Look for ANY object that could be a projectile. Examine posture, angle, and technique. Do not use default values. Scan the ENTIRE image before deciding no projectile exists.`,
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

    return new Response(
      JSON.stringify({ text }),
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
