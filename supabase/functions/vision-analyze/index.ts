import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { aiComplete } from "../_shared/ai-provider.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

// ── ELITE SYSTEM PROMPT ──
const SYSTEM_PROMPT = `
You are Professor APAS - an Elite Mechanical Physics Professor from ENS (Ecole Normale Superieure, Paris).
Your mission is to perform an ELITE object and physics analysis on the provided image.

RULES FOR UNSTOPPABLE ANALYSIS:
1. NEVER say "I cannot recognize the image" or "Image not found".
2. Even if the image is blurry, dark, or distorted, you must use your expert physics intuition to provide the most plausible calculated estimate.
3. Identify the main object specifically (Basketball, Rocket, Projectile, Stone, Bird, etc.).
4. DEDUCTIONALLY estimate all projectile parameters (Angle, Velocity, Height, Range) based on visual scale (reference objects: person ~1.7m, door ~2m, etc.) and known physics laws.
5. If it's a ROCKET, discuss propulsion and trajectory.
6. Provide a detailed scientific explanation in ARABIC describing exactly what you see and how the physics applies.

OUTPUT JSON FORMAT (STRICT):
{
  "detected": true,
  "object_type": "string",
  "launch_angle_deg": number,
  "initial_velocity_m_s": number,
  "launch_height_m": number,
  "estimated_mass_kg": number,
  "gravity_m_s2": 9.81,
  "analysis_summary_ar": "Detailed Arabic explanation of the physics observed...",
  "confidence_score": number (0-100)
}
`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const { imageBase64, mimeType, lang, userId, cloudinaryUrl } = await req.json();
    if (!imageBase64 && !cloudinaryUrl) throw new Error("No image data provided");

    console.log("[vision-analyze] Analyzing elite vision with Gemini 2.0 Flash...");

    const { text, provider } = await aiComplete({
      modelType: "vision",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: "Analyze this elite physics scenario." },
            {
              type: "image",
              inline_data: {
                mime_type: mimeType || "image/jpeg",
                data: imageBase64,
              },
            },
          ],
        },
      ],
    });

    const parsed = JSON.parse(text);

    // Auto-upsert into Supabase analyses table
    const { data: upserted, error: dbError } = await supabase
      .from("analyses")
      .upsert({
        user_id: userId,
        source_type: "image",
        cloudinary_url: cloudinaryUrl,
        object_type: parsed.object_type,
        velocity: parsed.initial_velocity_m_s,
        angle: parsed.launch_angle_deg,
        height: parsed.launch_height_m,
        mass: parsed.estimated_mass_kg,
        analysis_summary_ar: parsed.analysis_summary_ar,
        analysis_metadata: {
          confidence: parsed.confidence_score,
          provider,
          engine: "APAS Vision Elite",
        },
      })
      .select()
      .single();

    if (dbError) console.error("Database error:", dbError);

    return new Response(JSON.stringify({ 
      text: parsed.analysis_summary_ar, 
      analysis: parsed,
      recordId: upserted?.id
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("vision-analyze elite error:", e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
  }
});
