import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MISTRAL_API_URL = "https://api.mistral.ai/v1/chat/completions";
const MISTRAL_VISION_MODEL = "pixtral-large-latest";

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const { imageBase64, mimeType, lang } = await req.json();

    const mistralKey = Deno.env.get("MISTRAL_API_KEY");
    if (!mistralKey) {
      throw new Error("MISTRAL_API_KEY not configured");
    }

    const isAr = lang === "ar";
    const analysisId = crypto.randomUUID();

    const systemPrompt = `You are APAS Subject Reader — an expert physics problem solver specialized EXCLUSIVELY in projectile motion (المقذوفات).
Your task is to read physics exercises/problems from images and solve them step by step.

ANALYSIS ID: ${analysisId}

LANGUAGE RULES (ABSOLUTELY CRITICAL — VIOLATION IS UNACCEPTABLE):
- You MUST respond ENTIRELY in ${isAr ? "Arabic (العربية)" : "English"}. Every single word must be in ${isAr ? "Arabic" : "English"}.
- NEVER use Chinese, Russian, French, Spanish, Portuguese, or ANY other language. Not even a single word or character.
- ${isAr ? "اكتب كل شيء بالعربية الفصحى الواضحة. لا تستخدم أي لغة أخرى مطلقاً." : "Write everything in clear English. Never use any other language."}

INSTRUCTIONS:
1. Look at the image and determine if it contains a physics problem or exercise
2. The problem could be handwritten, printed, or from a textbook
3. It may be in Arabic, French, or English — but YOUR response must ALWAYS be in ${isAr ? "Arabic" : "English"}
4. Focus ONLY on projectile motion problems (المقذوفات / mouvement de projectile)

IF NO PHYSICS PROBLEM IS FOUND:
Respond with:
\`\`\`json
{"recognized": false}
\`\`\`
Then say: "${isAr ? "لم اتعرف على التمرين. يرجى تحميل صورة تحتوي على تمرين فيزياء خاص بالمقذوفات." : "I did not recognize the exercise. Please upload an image containing a projectile motion physics exercise."}"

IF A PHYSICS PROBLEM IS FOUND BUT NOT PROJECTILE MOTION:
Respond with:
\`\`\`json
{"recognized": true, "type": "<problem type>", "isProjectileMotion": false, "extractedData": {}}
\`\`\`
Then explain that this system specializes in projectile motion problems only.

IF A PROJECTILE MOTION PROBLEM IS FOUND:
1. Read and transcribe the problem carefully
2. Extract ALL given data (velocity, angle, height, mass, gravity, range, time, etc.)
3. Identify what needs to be found
4. Solve step by step

Respond with:
\`\`\`json
{
  "recognized": true,
  "type": "projectile motion",
  "isProjectileMotion": true,
  "extractedData": {
    "velocity": <initial velocity in m/s or null>,
    "angle": <launch angle in degrees or null>,
    "height": <initial height in m or null>,
    "mass": <mass in kg or null>,
    "range": <horizontal range in m or null>,
    "gravity": <gravity in m/s² or null, default 9.81>
  }
}
\`\`\`

Then provide in ${isAr ? "Arabic" : "English"}:

**${isAr ? "نص التمرين" : "Exercise Text"}:**
(Transcribe the problem exactly as written in the image)

**${isAr ? "المعطيات" : "Given Data"}:**
(List ALL given values with their units and symbols)

**${isAr ? "المطلوب" : "Required"}:**
(What needs to be calculated/found)

**${isAr ? "الشرح" : "Explanation"}:**
(Brief explanation of the physics concepts: projectile motion equations, components of velocity, etc.)

## ${isAr ? "الحل" : "Solution"}

(Complete step-by-step solution:
1. Write the relevant equations:
   - x(t) = v0 * cos(theta) * t
   - y(t) = h0 + v0 * sin(theta) * t - 0.5 * g * t^2
   - vx = v0 * cos(theta)
   - vy = v0 * sin(theta) - g * t
   - Range R = v0^2 * sin(2*theta) / g
   - Max height H = v0^2 * sin(theta)^2 / (2*g)
   - Flight time T = 2 * v0 * sin(theta) / g
2. Substitute the given values
3. Calculate intermediate results
4. Provide final answers with proper units
5. Include range, max height, flight time if applicable)

IMPORTANT RULES:
- Be thorough in the solution. Show ALL work and intermediate steps.
- Use simple ASCII math notation (not LaTeX): v0, theta, sin(), cos(), sqrt(), ^2
- NEVER use LaTeX notation. Specifically NEVER use any of these:
  * Dollar signs: $...$ or $$...$$
  * Backslash commands: \\frac, \\cdot, \\theta, \\sqrt, \\text, \\left, \\right, \\implies, \\circ, \\times
  * Curly brace groups: {numerator}{denominator}
  * Unicode subscripts/superscripts: v₀, θ, ², ·
- CORRECT equation format examples:
  * vx = v0 * cos(theta)
  * vy = v0 * sin(theta) - g * t
  * R = v0^2 * sin(2 * theta) / g
  * H = v0^2 * sin(theta)^2 / (2 * g)
  * v0x = 20 * cos(30°) = 20 * (sqrt(3) / 2) = 10 * sqrt(3) m/s
- WRONG equation format (NEVER do this):
  * $v_{0x} = v_0 \\cdot \\cos(\\theta)$
  * \\frac{v_0^2}{2g}
  * v₀·cos(θ)·t
  * \\text{م/ث}
- Write units in plain text: m/s, m/s^2, kg, m, J, N
- ${isAr ? "اكتب الوحدات بالعربية البسيطة: م/ث، م/ث^2، كغ، م، جول، نيوتن" : "Write units in plain text"}
- If gravity is not specified, use g = 9.81 m/s^2 (or 10 m/s^2 if the exercise says so)
- LANGUAGE REMINDER: Every word of your response must be in ${isAr ? "Arabic" : "English"}. No exceptions.`;

    const response = await fetch(MISTRAL_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${mistralKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MISTRAL_VISION_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: isAr
                  ? `[قراءة تمرين #${analysisId.slice(0, 8)}] اقرأ هذا التمرين الفيزيائي الخاص بالمقذوفات وحله خطوة بخطوة. استخرج جميع المعطيات وطبقها.`
                  : `[Exercise Reading #${analysisId.slice(0, 8)}] Read this projectile motion physics exercise and solve it step by step. Extract all given data and apply it.`,
              },
              {
                type: "image_url",
                image_url: { url: `data:${mimeType};base64,${imageBase64}` },
              },
            ],
          },
        ],
        temperature: 0.3,
        max_tokens: 4000,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Mistral API error ${response.status}: ${errorText}`);
      throw new Error(`Mistral API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content || "";

    console.log(`subject-reading completed via Mistral AI`);

    return new Response(
      JSON.stringify({ text }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("subject-reading error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
