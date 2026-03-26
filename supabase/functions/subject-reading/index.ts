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
Your task is to read physics exercises/problems from images, extract ONLY explicitly given data, and solve them step by step.

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
5. If the image contains diagrams, graphs, curves, or figures, describe them carefully and extract any readable numerical values from them (axis values, labeled points, etc.)

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
1. Read and transcribe the problem EXACTLY as written — do not add or change anything
2. Extract ONLY data that is EXPLICITLY written as numerical values in the exercise text or clearly labeled on diagrams/graphs
3. Identify what the exercise asks to find or calculate
4. If the exercise contains graphs or curves, read numerical values directly from the axes and labeled points
5. Solve step by step using ONLY the explicitly given data

=== CRITICAL: DATA EXTRACTION RULES (ANTI-HALLUCINATION) ===
- ONLY put a numerical value in extractedData if it is EXPLICITLY written as a number in the exercise text, in the "given data" section, or clearly readable from a graph/diagram axis
- If a variable is mentioned but NO numerical value is given for it (e.g., the exercise says "initial velocity v0" without specifying v0 = <number>), you MUST set it to null
- If a value does NOT appear anywhere in the exercise, you MUST set it to null
- NEVER invent, assume, or guess values. NEVER fill in "typical" or "common" values
- If there is no initial height mentioned or shown in the exercise, height MUST be null — do NOT assume h = 0 or any other value
- Variables that the exercise ASKS you to FIND or CALCULATE are NOT given data — they must be null in extractedData
- When in doubt, use null. It is ALWAYS better to return null than to hallucinate a value
- ${isAr ? "لا تخترع أي قيمة غير مذكورة صراحة في التمرين. إذا لم يُعطَ رقم، ضع null" : "Never invent any value not explicitly stated. If no number is given, use null"}

=== GRAPH AND DIAGRAM ANALYSIS ===
- If the image contains a trajectory diagram, identify: launch point, landing point, max height point, angle direction
- If the image contains a graph (e.g., Ec(t), v(t), x(t), y(t)), read values from the axes:
  * Read the axis labels and units
  * Read specific numerical values at key points (peaks, zeros, intersections)
  * These graph-read values CAN be included in extractedData if they directly correspond to a physical quantity
- If the image contains a curve of kinetic energy Ec(J) vs time t(s), you can extract: max Ec value, time values at key points
- Describe what each figure/graph shows in the explanation section

Respond with:
\`\`\`json
{
  "recognized": true,
  "type": "projectile motion",
  "isProjectileMotion": true,
  "extractedData": {
    "velocity": <initial velocity in m/s ONLY if explicitly given as a number, otherwise null>,
    "angle": <launch angle in degrees ONLY if explicitly given as a number, otherwise null>,
    "height": <initial height in m ONLY if explicitly given as a number, otherwise null>,
    "mass": <mass in kg ONLY if explicitly given as a number, otherwise null>,
    "range": <horizontal range in m ONLY if explicitly given as a number, otherwise null>,
    "gravity": <gravity in m/s² ONLY if explicitly given, otherwise null>
  },
  "toFind": ["list of quantities the exercise asks to calculate, e.g. velocity, angle, range, max height, flight time"],
  "graphData": {
    "hasGraph": <true if the image contains any graph or curve, false otherwise>,
    "graphType": "<description of graph type, e.g. 'Ec(J) vs t(s)', 'y vs x trajectory', or null>",
    "readValues": "<description of values readable from the graph, or null>"
  },
  "diagrams": "<brief description of any diagrams, figures, or illustrations in the image, or null>"
}
\`\`\`

Then provide in ${isAr ? "Arabic" : "English"}:

**${isAr ? "نص التمرين" : "Exercise Text"}:**
(Transcribe the problem EXACTLY as written in the image — do not modify, add, or remove anything)

**${isAr ? "المعطيات" : "Given Data"}:**
(List ONLY values that are EXPLICITLY stated as numbers in the exercise. Do NOT include values you calculated or assumed.
${isAr ? "اذكر فقط القيم المكتوبة صراحة كأرقام في التمرين. لا تضف أي قيمة من عندك." : "Only list values explicitly written as numbers. Do not add any values of your own."})

${isAr ? "**وصف الأشكال والمنحنيات:**" : "**Figures and Graphs Description:**"}
(${isAr ? "صف ما تراه في الأشكال والمنحنيات المرفقة بالتمرين، واذكر القيم القابلة للقراءة من المحاور" : "Describe what you see in any figures, graphs, or diagrams attached to the exercise, and mention readable values from axes"})

**${isAr ? "المطلوب" : "Required"}:**
(What needs to be calculated/found — these are NOT given data)

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
   - Ec = 0.5 * m * v^2
2. Substitute ONLY the explicitly given values
3. If a required value is not given, explain how to find it from the graph or other given data BEFORE using it
4. Calculate intermediate results
5. Provide final answers with proper units
6. Include range, max height, flight time if applicable)

IMPORTANT RULES:
- Be thorough in the solution. Show ALL work and intermediate steps.
- If you need a value that is not given, explain that it must be determined first (from a graph, from another equation, etc.) — NEVER just assume a number
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
      ? `[قراءة تمرين #${analysisId.slice(0, 8)}] اقرأ هذا التمرين الفيزيائي الخاص بالمقذوفات وحله خطوة بخطوة. استخرج فقط المعطيات المذكورة صراحة كأرقام في التمرين — لا تخترع أي قيمة غير موجودة. إذا كان التمرين يحتوي على منحنى أو رسم بياني، اقرأ القيم من المحاور. ضع null لأي قيمة غير مذكورة.`
      : `[Exercise Reading #${analysisId.slice(0, 8)}] Read this projectile motion physics exercise and solve it step by step. Extract ONLY data explicitly written as numbers in the exercise — NEVER invent values. If the exercise has graphs or curves, read values from axes. Use null for any value not explicitly given.`;

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
    // Only runs sanity checks when both v0 and angle are explicitly given (not null)
    let finalText = text;
    try {
      const jsonMatch = text.match(/```json\s*([\s\S]*?)```/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[1].trim());
        if (parsed.recognized && parsed.isProjectileMotion && parsed.extractedData) {
          const ed = parsed.extractedData;
          const v0 = ed.velocity;
          const angle = ed.angle;
          const h = ed.height; // Keep null if not given — do NOT default to 0
          const g = ed.gravity ?? 9.81;
          const givenRange = ed.range;

          // Count how many values are null to detect potential hallucination
          const nullCount = [v0, angle, h, ed.mass, givenRange].filter(v => v == null).length;
          const nonNullCount = 5 - nullCount;
          parsed.extractedData.explicitValueCount = nonNullCount;

          // If we have v0 and angle (both explicitly given), compute derived values
          if (v0 != null && angle != null && v0 > 0) {
            const aRad = angle * Math.PI / 180;
            const v0x = v0 * Math.cos(aRad);
            const v0y = v0 * Math.sin(aRad);
            const h0 = h ?? 0; // Use 0 for computation only if height is not given
            const maxHeight = h0 + (v0y * v0y) / (2 * g);
            const tApex = v0y / g;
            const tFall = Math.sqrt(2 * maxHeight / g);
            const totalTime = tApex + tFall;
            const computedRange = Math.round(v0x * totalTime * 100) / 100;

            // Add computed values separately — not as "extracted" data
            parsed.computedValues = {
              range: computedRange,
              maxHeight: Math.round(maxHeight * 100) / 100,
              totalTime: Math.round(totalTime * 100) / 100,
            };

            // Sanity check: if given range exists, compare with computed range
            if (givenRange != null && givenRange > 0) {
              const rangeError = Math.abs(computedRange - givenRange) / givenRange;
              parsed.computedValues.rangeConsistency = rangeError < 0.1 ? "consistent" : rangeError < 0.3 ? "approximate" : "inconsistent";
              if (rangeError > 0.3) {
                console.warn(`[subject-reading] Physics inconsistency: computed range ${computedRange} vs given range ${givenRange}`);
                parsed.computedValues.sanityWarning = `Computed range (${computedRange} m) differs significantly from given range (${givenRange} m). Check if values are correct.`;
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
