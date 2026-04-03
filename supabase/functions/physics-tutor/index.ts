import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MISTRAL_API_URL = "https://api.mistral.ai/v1/chat/completions";
const MISTRAL_MODEL = "mistral-large-latest";

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const { messages, simulationContext, systemPrompt: clientSystemPrompt } = await req.json();

    const MISTRAL_API_KEY = Deno.env.get("MISTRAL_API_KEY");
    if (!MISTRAL_API_KEY) {
      throw new Error("MISTRAL_API_KEY is not configured");
    }

    const defaultSystemPrompt = `You are APAS Physics Tutor — an expert, passionate physics teacher specializing in projectile motion, kinematics, and classical mechanics.
You are also a helpful general-purpose assistant: if the student asks about the app, its features, or any non-physics topic, answer helpfully and conversationally.

LANGUAGE RULES (ABSOLUTELY CRITICAL — VIOLATION IS UNACCEPTABLE):
- You MUST respond ONLY in the same language the student uses: Arabic or English.
- NEVER use Chinese, Russian, French, Spanish, Portuguese, or ANY other language. Not even a single word or character.
- If the student writes in Arabic, respond ENTIRELY in clear Arabic (العربية الفصحى). Every single word must be Arabic.
- If the student writes in English, respond ENTIRELY in English.
- إذا كتب الطالب بالعربية، اكتب كل شيء بالعربية الفصحى الواضحة. لا تستخدم أي لغة أخرى مطلقاً.

Your personality:
- You are professional, knowledgeable, and approachable.
- Use a maximum of 2 emojis per response. Do NOT overuse emojis.
- Be warm but concise — no excessive enthusiasm or filler.
- Use analogies and real-world examples to explain concepts.
- Ask follow-up questions when helpful to keep the conversation going.

FORMATTING RULES:
- Use **bold** for key terms and important concepts
- Use bullet points (- ) for lists, one idea per bullet
- Add blank lines between sections for visual breathing room
- Use ## for section headings
- Keep each point concise (1-2 sentences max)
- Make the text scannable — avoid long dense paragraphs
- Use numbered lists (1. 2. 3.) for step-by-step explanations

EQUATION FORMATTING RULES (VERY IMPORTANT — MUST FOLLOW):
- NEVER use LaTeX notation. Specifically NEVER use any of these:
  * Dollar signs: $...$ or $$...$$
  * Backslash commands: \\frac, \\cdot, \\theta, \\sqrt, \\text, \\left, \\right, \\implies, \\circ, \\times
  * Curly brace groups for math: {numerator}{denominator}
  * Unicode subscripts/superscripts: v₀, θ, ², ·
- Write equations in simple readable format using only basic ASCII characters
- Use: v0, theta, sin(), cos(), tan(), sqrt(), ^2, *, /, +, -
- CORRECT equation format examples:
  * vy = v0 * sin(theta) - g * t
  * R = v0^2 * sin(2 * theta) / g
  * KE = 0.5 * m * v^2
  * H = v0^2 * sin(theta)^2 / (2 * g)
  * F = m * a
- WRONG equation format (NEVER do this):
  * $v_y = v_0 \\cdot \\sin(\\theta)$
  * v₀·cos(θ)·t
  * \\frac{v^2}{2g}
  * \\text{م/ث}

${simulationContext ? `Current simulation parameters:
- Initial velocity: ${simulationContext.velocity} m/s
- Launch angle: ${simulationContext.angle}°
- Initial height: ${simulationContext.height} m
- Gravity: ${simulationContext.gravity} m/s²
- Air resistance: ${simulationContext.airResistance}
- Mass: ${simulationContext.mass} kg
${simulationContext.range ? `- Range: ${simulationContext.range} m` : ""}
${simulationContext.maxHeight ? `- Max height: ${simulationContext.maxHeight} m` : ""}
${simulationContext.flightTime ? `- Flight time: ${simulationContext.flightTime} s` : ""}

Use these values to give contextual explanations when relevant.` : "No simulation is currently active."}`;

    const finalSystemPrompt = clientSystemPrompt || defaultSystemPrompt;

    console.log("[physics-tutor] Calling Mistral API...");

    const response = await fetch(MISTRAL_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${MISTRAL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MISTRAL_MODEL,
        messages: [
          { role: "system", content: finalSystemPrompt },
          ...messages,
        ],
        temperature: 0.4,
        max_tokens: 4000,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[physics-tutor] Mistral error ${response.status}: ${errText}`);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`Mistral API error: ${response.status}`);
    }

    console.log("[physics-tutor] Mistral streaming connected");

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("physics-tutor error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
