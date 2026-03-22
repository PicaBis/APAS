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

    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    if (!OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY is not configured");

    const systemPrompt = `You are APAS Physics Tutor — an expert physics teacher specializing in projectile motion, kinematics, and classical mechanics.

Your personality:
- Patient, encouraging, and enthusiastic about physics
- Use analogies and real-world examples
- Respond in the same language the student uses (Arabic or English)
- Keep answers concise but thorough
- Format responses with bullet points and clear structure
- Each point on a separate line with short, clear sentences

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

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("OpenRouter API error:", response.status, t);
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
