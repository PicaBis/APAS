import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MISTRAL_API_URL = "https://api.mistral.ai/v1/chat/completions";
const MISTRAL_CHAT_MODEL = "mistral-large-latest";
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_CHAT_MODEL = "llama-3.3-70b-versatile";

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const { transcript, lang, simulationContext } = await req.json();

    const mistralKey = Deno.env.get("MISTRAL_API_KEY");
    const groqKey = Deno.env.get("GROQ_API_KEY");
    if (!mistralKey && !groqKey) {
      throw new Error("No AI provider configured (set MISTRAL_API_KEY and/or GROQ_API_KEY)");
    }

    if (!transcript || typeof transcript !== "string" || !transcript.trim()) {
      return new Response(
        JSON.stringify({ error: "No transcript provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isAr = lang === "ar";

    const systemPrompt = `You are APAS Voice — a physics voice command processor for projectile motion simulation.

LANGUAGE RULES (ABSOLUTELY CRITICAL — VIOLATION IS UNACCEPTABLE):
- You MUST respond ENTIRELY in ${isAr ? "Arabic (العربية)" : "English"}. Every single word must be in ${isAr ? "Arabic" : "English"}.
- NEVER use Chinese, Russian, French, Spanish, Portuguese, or ANY other language. Not even a single word or character.
- ${isAr ? "اكتب كل شيء بالعربية الفصحى الواضحة. لا تستخدم أي لغة أخرى مطلقاً." : "Write everything in clear English. Never use any other language."}

The user speaks voice commands to set simulation parameters for projectile motion.
Your job is to extract physics parameters from spoken text and identify any MISSING required parameters.

Current simulation context:
${simulationContext ? `- Velocity: ${simulationContext.velocity} m/s
- Angle: ${simulationContext.angle} degrees
- Height: ${simulationContext.height} m
- Gravity: ${simulationContext.gravity} m/s²
- Mass: ${simulationContext.mass} kg` : "No current context available"}

INSTRUCTIONS:
1. Parse the user's spoken text for physics parameters related to projectile motion
2. Extract any of these parameters if mentioned:
   - velocity (m/s) — initial velocity / السرعة الابتدائية
   - angle (degrees) — launch angle / زاوية الإطلاق / زاوية القذف
   - height (m) — initial height / الارتفاع الابتدائي
   - mass (kg) — mass of projectile / الكتلة
   - gravity (m/s²) — gravitational acceleration / الجاذبية
3. If the user says relative commands like "increase velocity" or "double the angle", calculate the new value based on the current simulation context
4. Check if the spoken text contains enough physics data. If key parameters are missing and the user seems to be describing a problem, tell them what's missing.

RESPONSE FORMAT — You MUST always return a JSON block:
\`\`\`json
{
  "velocity": <number or null>,
  "angle": <number or null>,
  "height": <number or null>,
  "mass": <number or null>,
  "gravity": <number or null>,
  "missing": [<list of parameter names that seem expected but were not provided>],
  "understood": <true if at least one parameter was extracted, false otherwise>
}
\`\`\`

After the JSON block, provide a brief response in ${isAr ? "Arabic" : "English"}:
- If parameters were extracted: confirm what was understood and applied
- If parameters are missing: tell the user specifically what they forgot to mention
  - Example (Arabic): "فهمت السرعة 20 م/ث، لكنك لم تذكر لي زاوية الإطلاق. ما هي الزاوية؟"
  - Example (English): "I got velocity 20 m/s, but you didn't mention the launch angle. What is the angle?"
- If nothing was understood: ask the user to repeat with specific physics values

IMPORTANT:
- Only include parameters that were explicitly mentioned or clearly implied
- Use null for parameters that were NOT mentioned
- The "missing" array should contain names of parameters the user seems to have forgotten
- Keep the response brief and natural
- NEVER use LaTeX notation ($, \\frac, \\cdot, \\theta, etc.)
- NEVER use Unicode subscripts/superscripts (v₀, θ, ², ·)
- Write equations in simple ASCII: v0, theta, sin(), cos(), ^2
- Write units in plain text: m/s, m/s^2, kg, m
- LANGUAGE REMINDER: Every word must be in ${isAr ? "Arabic" : "English"}. No exceptions.`;

    // Build provider list: Mistral first, Groq as fallback
    const providers: Array<{ name: string; url: string; key: string; model: string }> = [];
    if (mistralKey) providers.push({ name: "Mistral", url: MISTRAL_API_URL, key: mistralKey, model: MISTRAL_CHAT_MODEL });
    if (groqKey) providers.push({ name: "Groq", url: GROQ_API_URL, key: groqKey, model: GROQ_CHAT_MODEL });

    const requestBody = {
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: transcript },
      ],
      temperature: 0.3,
      max_tokens: 1000,
      stream: false,
    };

    let text = "";
    let usedProvider = "";
    for (const provider of providers) {
      try {
        console.log(`[voice-process] Trying ${provider.name}...`);
        const response = await fetch(provider.url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${provider.key}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ...requestBody, model: provider.model }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[voice-process] ${provider.name} error ${response.status}: ${errorText}`);
          continue;
        }

        const data = await response.json();
        text = data?.choices?.[0]?.message?.content || "";
        if (!text) {
          console.warn(`[voice-process] ${provider.name} returned empty response`);
          continue;
        }
        usedProvider = provider.name;
        break;
      } catch (err) {
        console.error(`[voice-process] ${provider.name} request failed:`, err);
        continue;
      }
    }

    if (!usedProvider) {
      throw new Error("All AI providers failed for voice-process");
    }

    console.log(`voice-process completed via ${usedProvider}`);

    return new Response(
      JSON.stringify({ text }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("voice-process error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
