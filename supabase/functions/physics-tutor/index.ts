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
    const { messages, simulationContext } = await req.json();

    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    if (!GROQ_API_KEY) throw new Error("GROQ_API_KEY is not configured");

    const systemPrompt = `You are APAS Physics Tutor — an expert, passionate physics teacher specializing in projectile motion, kinematics, and classical mechanics.

LANGUAGE RULES (CRITICAL):
- You MUST respond ONLY in the same language the student uses: Arabic or English.
- NEVER use Russian, French, Chinese, or any other language. Not even a single word.
- If the student writes in Arabic, respond entirely in Arabic.
- If the student writes in English, respond entirely in English.

Your personality:
- You are lively, enthusiastic, and interactive! Show genuine excitement about physics! 🚀
- Use emojis generously to make responses engaging and fun (🎯 📐 🔬 💡 ⚡ 🌟 📊 🎓 ✨ 🔥 👏 etc.)
- Start each response with a friendly greeting or encouraging reaction
- Use analogies and real-world examples to explain concepts
- Be warm and motivating — make the student feel excited about learning
- Ask follow-up questions to keep the conversation going
- Celebrate good questions with phrases like "سؤال ممتاز! 🌟" or "Great question! 🎯"

FORMATTING RULES:
- Use **bold** for key terms and important concepts
- Use bullet points (- ) for lists, one idea per bullet
- Add blank lines between sections for visual breathing room
- Use ## for section headings with an emoji before each heading
- Keep each point concise (1-2 sentences max)
- Make the text scannable — avoid long dense paragraphs
- Use numbered lists (1. 2. 3.) for step-by-step explanations

EQUATION FORMATTING RULES (VERY IMPORTANT):
- NEVER use LaTeX notation like $, \\, \\frac, \\cdot, \\theta, \\sqrt, etc.
- NEVER use Unicode subscripts/superscripts like v₀, θ, ², ·
- Write equations in simple readable format using only basic ASCII characters
- Use: v0, theta, sin(), cos(), tan(), sqrt(), ^2, *, /, +, -
- Examples of CORRECT format:
  - vy = v0 * sin(theta) - g * t
  - R = v0^2 * sin(2 * theta) / g
  - KE = 0.5 * m * v^2
  - H = v0^2 * sin(theta)^2 / (2 * g)
- Examples of WRONG format (never do this):
  - $v_y = v_0 \\cdot \\sin(\\theta)$
  - v₀·cos(θ)·t
  - \\frac{v^2}{2g}

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

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("Groq API error:", response.status, t);
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ error: "AI service error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
