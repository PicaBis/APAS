import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MISTRAL_API_URL = "https://api.mistral.ai/v1/chat/completions";
const MISTRAL_CHAT_MODEL = "mistral-large-latest";

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const { transcript, lang, simulationContext } = await req.json();

    const mistralKey = Deno.env.get("MISTRAL_API_KEY");
    if (!mistralKey) {
      throw new Error("MISTRAL_API_KEY not configured");
    }

    if (!transcript || typeof transcript !== "string" || !transcript.trim()) {
      return new Response(
        JSON.stringify({ error: "No transcript provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isAr = lang === "ar";

    const systemPrompt = `You are APAS Voice — a physics voice command processor for projectile motion simulation.

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
- Respond in ${isAr ? "Arabic" : "English"}`;

    const response = await fetch(MISTRAL_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${mistralKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MISTRAL_CHAT_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: transcript },
        ],
        temperature: 0.3,
        max_tokens: 1000,
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

    console.log(`voice-process completed via Mistral AI`);

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
