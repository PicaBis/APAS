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

    const systemPrompt = `You are APAS Subject Reader — an expert physics professor from ENS Paris, specialized EXCLUSIVELY in projectile motion (المقذوفات).
Your task is to analyze physics exercises from images, extract ALL data, and solve them with absolute mathematical precision.

ANALYSIS ID: ${analysisId}

CRITICAL FORMATTING RULES (NO EXCEPTIONS):
1. NO LATEX: NEVER use LaTeX syntax like \\frac, \\cdot, \\theta, \\sqrt, \\text, \\left, \\right, \\implies, \\circ, \\times, or $ signs.
2. NO $ SIGNS: NEVER surround variables or equations with dollar signs.
3. CLEAN TEXT EQUATIONS: Use standard symbols: V₀, θ, h₀, g, sin(θ), cos(θ), sqrt(), ², ½, ·, ±, →, ≈, ≥, ≤.
4. UNIFORM SYMBOLS: Always use V₀ for initial velocity, θ for angle, h₀ for initial height, g for gravity.
5. NO x = f(t) or z = h(t): NEVER use functional notation like f(t) or h(t). Write the full equation instead.
6. EXAMPLES OF CORRECT FORMAT:
   * x(t) = V₀·cos(θ)·t
   * y(t) = h₀ + V₀·sin(θ)·t − ½g·t²
   * R = V₀²·sin(2θ) / g
   * V₀ = sqrt(R·g / sin(2θ))
7. EXAMPLES OF FORBIDDEN FORMAT (NEVER DO THIS):
   * $x = f(t)$
   * $z = h(t)$
   * $v_{0x} = v_0 \cdot \cos(\theta)$
   * \\frac{v_0^2}{2g}

SOLVING STRATEGY (MANDATORY):
- If the problem asks for V₀ and gives the Range (R) and Angle (θ), you MUST calculate V₀ using: V₀ = sqrt(R·g / sin(2θ)).
- NEVER provide 0 or null for velocity or angle if they can be calculated from other given data in the image.
- A professor NEVER returns 0 for a moving projectile. If a value is missing, derive it from the trajectory.
- Ensure all calculated values are physically consistent (e.g., if range is 21.51m and angle is 45°, V₀ must be ~14.5 m/s, NOT 0).

LANGUAGE RULES:
- Respond ENTIRELY in ${isAr ? "Arabic (العربية)" : "English"}.
- ${isAr ? "اكتب كل شيء بالعربية الفصحى الواضحة." : "Write everything in clear English."}

Respond with:
\`\`\`json
{
  "recognized": true,
  "type": "projectile motion",
  "isProjectileMotion": true,
  "extractedData": {
    "velocity": <calculated or extracted initial velocity in m/s>,
    "angle": <calculated or extracted launch angle in degrees>,
    "height": <calculated or extracted initial height in m>,
    "mass": <extracted mass in kg or null>,
    "range": <extracted horizontal range in m>,
    "gravity": <extracted gravity in m/s² or default 9.81>
  }
}
\`\`\`

Then provide in ${isAr ? "Arabic" : "English"}:

**${isAr ? "نص التمرين" : "Exercise Text"}:**
(Transcribe the problem exactly)

**${isAr ? "المعطيات" : "Given Data"}:**
(List ALL values with symbols: V₀, θ, h₀, g, R, m)

**${isAr ? "المطلوب" : "Required"}:**
(What needs to be found)

**${isAr ? "الشرح" : "Explanation"}:**
(Physics concepts using CLEAN symbols)

## ${isAr ? "الحل" : "Solution"}
(Step-by-step mathematical solution. Show calculations for V₀ if it was derived from Range/Angle. Show ALL intermediate steps using the CLEAN format.)`;

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
                parsed.extractedData.sanityWarning = isAr 
                  ? `\u0627\u0644\u0645\u062f\u0649 \u0627\u0644\u0645\u062d\u0633\u0648\u0628 (${computedRange} \u0645) \u064a\u062e\u062a\u0644\u0641 \u0639\u0646 \u0627\u0644\u0645\u062f\u0649 \u0627\u0644\u0645\u0639\u0637\u0649 (${givenRange} \u0645). \u064a\u0631\u062c\u0649 \u0627\u0644\u062a\u062d\u0642\u0642 \u0645\u0646 \u0627\u0644\u0642\u064a\u0645.`
                  : `Computed range (${computedRange} m) differs significantly from given range (${givenRange} m). Check if values are correct.`;
              }
            }
          } else if (v0 === 0 && givenRange != null && givenRange > 0 && angle != null && angle > 0) {
            // Bugfix: if AI returns v0=0 but we have range and angle, calculate v0
            const aRad = angle * Math.PI / 180;
            const gVal = g || 9.81;
            const sin2Theta = Math.sin(2 * aRad);
            if (sin2Theta > 0) {
              const derivedV0 = Math.sqrt((givenRange * gVal) / sin2Theta);
              parsed.extractedData.velocity = Math.round(derivedV0 * 100) / 100;
              console.log(`[subject-reading] Fixed zero velocity: derived ${parsed.extractedData.velocity} m/s from range ${givenRange} and angle ${angle}`);
            }
          }

          // If we have a valid velocity (either extracted or derived), finalize results
          if (parsed.extractedData.velocity != null && parsed.extractedData.velocity > 0) {
            parsed.sanityChecked = true;

            // Rebuild text with updated JSON
            const newJson = "```json\n" + JSON.stringify(parsed, null, 2) + "\n```";
            const afterJson = text.replace(/```json[\s\S]*?```/, "").trim();
            
            let warningHeader = "";
            if (parsed.extractedData.sanityWarning) {
              warningHeader = isAr 
                ? `> \u26a0\ufe0f **\u062a\u0646\u0628\u064a\u0647 \u0641\u064a\u0632\u064a\u0627\u0626\u064a**: ${parsed.extractedData.sanityWarning}\n\n`
                : `> \u26a0\ufe0f **Physics Warning**: ${parsed.extractedData.sanityWarning}\n\n`;
            }

            finalText = newJson + "\n\n" + warningHeader + afterJson;
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
