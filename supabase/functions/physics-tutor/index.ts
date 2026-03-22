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

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

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

    // Convert messages from OpenAI format to Gemini format
    const contents = messages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    // Try Gemini 2.0 Flash first, then fallback to 1.5 Flash
    const models = ['gemini-2.0-flash', 'gemini-1.5-flash'];
    let lastError: Error | null = null;

    for (const model of models) {
      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${GEMINI_API_KEY}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: contents,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Gemini API error (${model}):`, response.status, errorText);
          
          if (response.status === 429) {
            // Rate limit - try next model
            continue;
          }
          if (response.status === 400 || response.status === 403) {
            // Bad request or forbidden - don't try other models
            return new Response(
              JSON.stringify({ error: "Invalid API request or insufficient permissions" }),
              { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          // Other errors - try next model
          lastError = new Error(`Gemini API error: ${response.status} ${errorText}`);
          continue;
        }

        // Convert Gemini SSE format to OpenAI-like format for client compatibility
        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("No response body");
        }

        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          async start(controller) {
            const decoder = new TextDecoder();
            let buffer = '';

            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                  if (!line.startsWith('data: ')) continue;
                  const data = line.slice(6).trim();
                  if (!data || data === '[DONE]') continue;

                  try {
                    const parsed = JSON.parse(data);
                    const content = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (content) {
                      // Format as OpenAI-style SSE for client compatibility
                      const sseData = JSON.stringify({
                        choices: [{ delta: { content } }]
                      });
                      controller.enqueue(encoder.encode(`data: ${sseData}\n\n`));
                    }
                  } catch (parseError) {
                    console.warn('Failed to parse Gemini response:', parseError);
                  }
                }
              }
            } finally {
              reader.releaseLock();
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
              controller.close();
            }
          }
        });

        return new Response(stream, {
          headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
        });

      } catch (error) {
        console.error(`Error with model ${model}:`, error);
        lastError = error instanceof Error ? error : new Error(`Unknown error with ${model}`);
        continue;
      }
    }

    // All models failed
    const errorMessage = lastError?.message || "All Gemini models failed";
    console.error("All Gemini models failed:", errorMessage);
    
    // Check if it's a rate limit issue
    if (errorMessage.includes('429')) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    return new Response(
      JSON.stringify({ error: "AI service temporarily unavailable" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("physics-tutor error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
