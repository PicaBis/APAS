import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MISTRAL_API_URL = "https://api.mistral.ai/v1/chat/completions";
const MISTRAL_MODEL = "pixtral-large-latest";

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const { imageBase64, mimeType, lang } = await req.json();

    const MISTRAL_API_KEY = Deno.env.get("MISTRAL_API_KEY");
    if (!MISTRAL_API_KEY) {
      throw new Error("MISTRAL_API_KEY is not configured");
    }

    const isAr = lang === "ar";
    const analysisId = crypto.randomUUID();

    const systemPrompt = `You are APAS Subject Reader — an expert physics professor from ENS Paris, specialized EXCLUSIVELY in projectile motion (المقذوفات).
Your task is to analyze physics exercises from images, extract ALL data, SOLVE for unknowns, and return the FINAL CALCULATED values.

ANALYSIS ID: ${analysisId}

CRITICAL FORMATTING RULES (NO EXCEPTIONS):
1. NO LATEX: NEVER use LaTeX syntax like \\frac, \\cdot, \\theta, \\sqrt, \\text, \\left, \\right, \\implies, \\circ, \\times, or $ signs.
2. NO $ SIGNS: NEVER surround variables or equations with dollar signs.
3. CLEAN TEXT EQUATIONS: Use standard symbols: V0, theta, h0, g, sin(theta), cos(theta), sqrt(), ^2.
4. UNIFORM SYMBOLS: Always use V0 for initial velocity, theta for angle, h0 for initial height, g for gravity.

SOLVING STRATEGY (MANDATORY — THIS IS THE MOST IMPORTANT PART):
- READ THE ENTIRE EXERCISE: Extract "Given" data (معطيات) AND "Target" data (مطلوب).
- SOLVE BEFORE RESPONDING: You MUST solve the physics problem to find ALL unknowns BEFORE generating the final JSON block.
- THE JSON "extractedData" MUST CONTAIN FINAL SOLVED VALUES, NOT JUST GIVEN DATA.
- CRITICAL RULE: If the problem gives Range (R) and Angle (θ) and Height (h0), you MUST calculate V0 using:
  V0 = sqrt(R*g / sin(2*theta)) for h0=0, or solve the full quadratic for h0!=0.
- CRITICAL RULE: If the problem gives Range (R) and V0, you MUST calculate the angle.
- NEVER return 0 for velocity or angle if they can be calculated from other given data.
- A REAL professor ALWAYS solves the exercise FIRST, THEN fills in the JSON with the SOLVED values.

EXAMPLE OF CORRECT BEHAVIOR:
Given: R = 21.51 m, theta = 45 deg, h0 = 2.00 m, g = 9.8 m/s^2
Step 1: Use x(t) = V0*cos(theta)*t and y(t) = h0 + V0*sin(theta)*t - 0.5*g*t^2
Step 2: At landing y=0: 0 = h0 + V0*sin(theta)*t - 0.5*g*t^2
Step 3: At landing x=R: R = V0*cos(theta)*t => t = R/(V0*cos(theta))
Step 4: Substitute and solve for V0
Step 5: JSON must have "velocity": <calculated value like 14.2>, NOT 0

LANGUAGE RULES:
- Respond ENTIRELY in ${isAr ? "Arabic (العربية)" : "English"}.

Respond with:
\`\`\`json
{
  "recognized": true,
  "type": "projectile motion",
  "isProjectileMotion": true,
  "extractedData": {
    "velocity": <FINAL SOLVED initial velocity in m/s — NEVER 0 if calculable>,
    "angle": <FINAL SOLVED launch angle in degrees — NEVER 0 if calculable>,
    "height": <FINAL SOLVED initial height in m>,
    "mass": <extracted mass in kg or null>,
    "range": <extracted or solved horizontal range in m>,
    "gravity": <extracted gravity in m/s^2 or default 9.81>,
    "objectType": "<detected object type like ball, shot-put, cannon>"
  }
}
\`\`\`

Then provide in ${isAr ? "Arabic" : "English"}:

**${isAr ? "نص التمرين" : "Exercise Text"}:**
(Transcribe the problem exactly)

**${isAr ? "المعطيات" : "Given Data"}:**
(List ALL values with symbols)

**${isAr ? "المطلوب" : "Required"}:**
(What needs to be found)

**${isAr ? "الشرح" : "Explanation"}:**
(Physics concepts)

## ${isAr ? "الحل" : "Solution"}
(Step-by-step mathematical solution showing ALL calculations)`;

    const userText = isAr
      ? `[قراءة تمرين #${analysisId.slice(0, 8)}] اقرأ هذا التمرين الفيزيائي الخاص بالمقذوفات وحله خطوة بخطوة. استخرج جميع المعطيات، احسب المجاهيل، واملأ JSON بالقيم المحسوبة النهائية وليس القيم المعطاة فقط.`
      : `[Exercise Reading #${analysisId.slice(0, 8)}] Read this projectile motion physics exercise and solve it step by step. Extract all given data, calculate unknowns, and fill JSON with FINAL CALCULATED values not just given data.`;

    const imageDataUri = `data:${mimeType};base64,${imageBase64}`;

    console.log(`[subject-reading] Calling Mistral Pixtral...`);

    const response = await fetch(MISTRAL_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${MISTRAL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MISTRAL_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: userText },
              { type: "image_url", image_url: { url: imageDataUri } },
            ],
          },
        ],
        temperature: 0.2,
        max_tokens: 8000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[subject-reading] Mistral error ${response.status}: ${errorText}`);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      throw new Error(`Mistral API error: ${response.status}`);
    }

    const data = await response.json();
    let text = data?.choices?.[0]?.message?.content || "";

    if (!text) {
      throw new Error("Mistral returned empty response");
    }

    console.log(`[subject-reading] Completed via Mistral Pixtral`);

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

          // If v0=0 but we have range and angle, calculate v0
          if ((!v0 || v0 === 0) && givenRange != null && givenRange > 0 && angle != null && angle > 0) {
            const aRad = angle * Math.PI / 180;
            const gVal = g || 9.81;
            
            if (h === 0) {
              const sin2Theta = Math.sin(2 * aRad);
              if (sin2Theta > 0) {
                parsed.extractedData.velocity = Math.round(Math.sqrt((givenRange * gVal) / sin2Theta) * 100) / 100;
              }
            } else {
              const cosTheta = Math.cos(aRad);
              const tanTheta = Math.tan(aRad);
              const denominator = 2 * cosTheta * cosTheta * (h + givenRange * tanTheta);
              if (denominator > 0) {
                const v0Squared = (gVal * givenRange * givenRange) / denominator;
                if (v0Squared > 0) {
                  parsed.extractedData.velocity = Math.round(Math.sqrt(v0Squared) * 100) / 100;
                }
              }
            }
            console.log(`[subject-reading] Fixed zero velocity: derived ${parsed.extractedData.velocity} m/s`);
          }

          // Deep text scan fallback for velocity
          if (!parsed.extractedData.velocity || parsed.extractedData.velocity === 0) {
            const textVelocityMatch = text.match(/(?:v0|V₀|V0|السرعة الابتدائية)\s*[:=≈]\s*(\d+\.?\d*)\s*(?:m\/s|م\/ث)?/i);
            if (textVelocityMatch && textVelocityMatch[1]) {
              const foundV0 = parseFloat(textVelocityMatch[1]);
              if (foundV0 > 0) {
                parsed.extractedData.velocity = foundV0;
                console.log(`[subject-reading] Fallback: Found velocity ${foundV0} in text.`);
              }
            }
          }

          // Compute derived values for verification
          if (parsed.extractedData.velocity > 0 && angle != null && angle > 0) {
            const aRad = angle * Math.PI / 180;
            const v0x = parsed.extractedData.velocity * Math.cos(aRad);
            const v0y = parsed.extractedData.velocity * Math.sin(aRad);
            const maxHeight = (h || 0) + (v0y * v0y) / (2 * g);
            const tApex = v0y / g;
            const tFall = Math.sqrt(2 * maxHeight / g);
            const totalTime = tApex + tFall;
            const computedRange = Math.round(v0x * totalTime * 100) / 100;

            parsed.extractedData.computedRange = computedRange;
            parsed.extractedData.computedMaxHeight = Math.round(maxHeight * 100) / 100;
            parsed.extractedData.computedTotalTime = Math.round(totalTime * 100) / 100;
            parsed.sanityChecked = true;
          }

          // Rebuild text with updated JSON
          const newJson = "```json\n" + JSON.stringify(parsed, null, 2) + "\n```";
          const afterJson = text.replace(/```json[\s\S]*?```/, "").trim();
          finalText = newJson + "\n\n" + afterJson;
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
