import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { aiComplete } from "../_shared/ai-provider.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { transcript, lang, simulationContext } = await req.json();
    const isAr = lang === "ar";

    const systemPrompt = `You are APAS Voice — a physics voice command processor.
Extract physics parameters from the transcript for projectile motion.

Current context:
- Velocity: ${simulationContext?.velocity}
- Angle: ${simulationContext?.angle}
- Height: ${simulationContext?.height}

Return ONLY JSON:
{
  "velocity": number | null,
  "angle": number | null,
  "height": number | null,
  "understood": boolean,
  "response": "friendly confirmation in ${isAr ? "Arabic" : "English"}"
}
Use ASCII math, no LaTeX.`;

    const { text, provider } = await aiComplete({
      modelType: "chat",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: transcript }
      ]
    });

    return new Response(JSON.stringify({ text, provider }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (e) {
    console.error("voice-process error:", e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
  }
});
