import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MISTRAL_API_URL = "https://api.mistral.ai/v1/chat/completions";
const MISTRAL_VISION_MODEL = "pixtral-large-latest";
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const { imageBase64, mimeType, lang } = await req.json();

    const mistralKey = Deno.env.get("MISTRAL_API_KEY");
    const groqKey = Deno.env.get("GROQ_API_KEY");
    if (!mistralKey && !groqKey) {
      throw new Error("No AI provider configured (set MISTRAL_API_KEY and/or GROQ_API_KEY)");
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

    // Build provider list with fallback — Groq is primary, Mistral is fallback for subject reading
    const providers: Array<{ name: string; url: string; key: string; model: string; imageUrlFormat: 'object' | 'string' }> = [];
    if (groqKey) providers.push({ name: "Groq", url: GROQ_API_URL, key: groqKey, model: GROQ_VISION_MODEL, imageUrlFormat: 'object' });
    if (mistralKey) providers.push({ name: "Mistral", url: MISTRAL_API_URL, key: mistralKey, model: MISTRAL_VISION_MODEL, imageUrlFormat: 'string' });

    const userText = isAr
      ? `[قراءة تمرين #${analysisId.slice(0, 8)}] اقرأ هذا التمرين الفيزيائي الخاص بالمقذوفات وحله خطوة بخطوة. استخرج جميع المعطيات وطبقها.`
      : `[Exercise Reading #${analysisId.slice(0, 8)}] Read this projectile motion physics exercise and solve it step by step. Extract all given data and apply it.`;

    const imageDataUri = `data:${mimeType};base64,${imageBase64}`;

    let text = "";
    let usedProvider = "";
    for (const provider of providers) {
      try {
        console.log(`[subject-reading] Trying ${provider.name}...`);

        // OpenAI-compatible providers (Groq, Mistral)
        const imageUrlValue = provider.imageUrlFormat === 'string' ? imageDataUri : { url: imageDataUri };

        const response = await fetch(provider.url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${provider.key}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: provider.model,
            messages: [
              { role: "system", content: systemPrompt },
              {
                role: "user",
                content: [
                  { type: "text", text: userText },
                  { type: "image_url", image_url: imageUrlValue },
                ],
              },
            ],
            temperature: 0.3,
            max_tokens: 8000,
            stream: false,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[subject-reading] ${provider.name} error ${response.status}: ${errorText}`);
          continue;
        }

        const data = await response.json();
        text = data?.choices?.[0]?.message?.content || "";
        if (!text) {
          console.warn(`[subject-reading] ${provider.name} returned empty response`);
          continue;
        }

        usedProvider = provider.name;
        break;
      } catch (err) {
        console.error(`[subject-reading] ${provider.name} request failed:`, err);
        continue;
      }
    }

    if (!usedProvider) {
      throw new Error("All AI providers failed for subject-reading");
    }

    console.log(`subject-reading completed via ${usedProvider}`);

    // ── Physics Sanity Check: verify extracted values against kinematics equations ──
    let finalText = text;
    try {
      const jsonMatch = text.match(/```json\s*([\s\S]*?)```/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[1].trim());
        if (parsed.recognized && parsed.isProjectileMotion && parsed.extractedData) {
          const ed = parsed.extractedData;
          const v0 = ed.velocity;
          const angle = ed.angle;
          const h = ed.height ?? 0;
          const g = ed.gravity ?? 9.81;
          const givenRange = ed.range;

          // If we have v0 and angle, compute derived values and cross-check with given range
          if (v0 != null && angle != null && v0 > 0) {
            const aRad = angle * Math.PI / 180;
            const v0x = v0 * Math.cos(aRad);
            const v0y = v0 * Math.sin(aRad);
            const maxHeight = h + (v0y * v0y) / (2 * g);
            const tApex = v0y / g;
            const tFall = Math.sqrt(2 * maxHeight / g);
            const totalTime = tApex + tFall;
            const computedRange = Math.round(v0x * totalTime * 100) / 100;

            // Add computed values to extracted data
            parsed.extractedData.computedRange = computedRange;
            parsed.extractedData.computedMaxHeight = Math.round(maxHeight * 100) / 100;
            parsed.extractedData.computedTotalTime = Math.round(totalTime * 100) / 100;

            // Sanity check: if given range exists, compare with computed range
            if (givenRange != null && givenRange > 0) {
              const rangeError = Math.abs(computedRange - givenRange) / givenRange;
              parsed.extractedData.rangeConsistency = rangeError < 0.1 ? "consistent" : rangeError < 0.3 ? "approximate" : "inconsistent";
              if (rangeError > 0.3) {
                console.warn(`[subject-reading] Physics inconsistency: computed range ${computedRange} vs given range ${givenRange}`);
                parsed.extractedData.sanityWarning = `Computed range (${computedRange} m) differs significantly from given range (${givenRange} m). Check if values are correct.`;
              }
            }

            parsed.sanityChecked = true;

            // Rebuild text with updated JSON
            const newJson = "```json\n" + JSON.stringify(parsed, null, 2) + "\n```";
            const afterJson = text.replace(/```json[\s\S]*?```/, "").trim();
            finalText = newJson + "\n\n" + afterJson;
          }
        }
      }
    } catch {
      // If sanity check fails, use original text
    }

    return new Response(
      JSON.stringify({ text: finalText }),
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
