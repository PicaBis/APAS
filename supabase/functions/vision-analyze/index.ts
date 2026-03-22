import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    if (!GROQ_API_KEY) throw new Error("GROQ_API_KEY is not configured");

    const isAr = lang === "ar";

    // Generate a unique analysis ID to prevent any caching or repetition
    const analysisId = crypto.randomUUID();
    const timestamp = new Date().toISOString();

    const systemPrompt = `You are APAS Vision — an expert physics image analyzer specialized in projectile motion.
Your task is to analyze each uploaded image INDEPENDENTLY and UNIQUELY.

ANALYSIS ID: ${analysisId}
TIMESTAMP: ${timestamp}

CRITICAL INSTRUCTIONS:
1. You MUST analyze THIS SPECIFIC image from scratch. Do NOT reuse any previous analysis values.
2. Look at the EXACT visual details: body posture, arm position, object size, trajectory angle, background scale references.
3. Two images of the same sport (e.g., basketball) MUST produce DIFFERENT values if the poses, angles, or contexts differ.
4. Focus on pixel-level visual cues: the angle of the arm/body, the position of the ball relative to the body, the phase of the throw.

HOW TO ANALYZE:
- Identify the exact object type visible
- Measure the launch angle from the visual trajectory or body posture (use reference lines: horizon, body angle, arm angle)
- Estimate velocity based on the specific motion phase (wind-up, release, follow-through)
- Determine height from the specific launch point relative to ground
- Assess the throwing technique (overhand, underhand, hook shot, etc.)

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

If NO projectile detected:
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

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
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
                  ? `[تحليل فريد #${analysisId.slice(0, 8)}] حلل هذه الصورة بدقة. انظر إلى الوضعية والزاوية والتقنية المحددة في هذه الصورة. لا تستخدم قيماً افتراضية.`
                  : `[Unique Analysis #${analysisId.slice(0, 8)}] Analyze this specific image carefully. Look at the exact posture, angle, and technique shown. Do not use default values.`,
              },
              {
                type: "image_url",
                image_url: { url: `data:${mimeType};base64,${imageBase64}` },
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("Groq API error:", response.status, t);
      return new Response(
        JSON.stringify({ error: `AI error: ${response.status}` }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content || "";

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
