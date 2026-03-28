import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { aiComplete } from "../_shared/ai-provider.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

const SYSTEM_PROMPT = `
You are a Dynamic Systems Physicist. 
Your mission is to read, understand, and deduce physics parameters from any video frames provided.

RULES FOR ELITE INTERPRETATION:
1. Identify the overall context.
2. Deduce launch angle, initial velocity, and trajectory by analyzing key moments (launch, peak, impact) from the sequence.
3. If the video is blurry, laggy, or low-quality, you MUST still provide the most plausible physics-based estimate.
4. Output must be a reasoned estimate formatted for direct dashboard integration.

OUTPUT JSON FORMAT (STRICT):
{
  "detected": true,
  "object_type": "string",
  "launch_angle_deg": number,
  "initial_velocity_m_s": number,
  "launch_height_m": number,
  "gravity_m_s2": 9.81,
  "motion_description_ar": "Scientific description in Arabic of the motion observed across frames...",
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
    const { frames, lang, userId, cloudinaryUrl } = await req.json();
    if (!frames || !Array.isArray(frames)) throw new Error("No frames provided");

    console.log(`[video-analyze] Analyzing ${frames.length} frames with Gemini 2.0 Flash...`);

    const userContent: any[] = [{ type: "text", text: "Analyze this video sequence for physics parameters." }];
    
    // Sample frames to stay within token limits but maintain quality
    const sampledFrames = frames.slice(0, 10); 
    sampledFrames.forEach((f, i) => {
      userContent.push({ type: "text", text: `Frame ${i+1} at ${f.timestamp}s:` });
      userContent.push({
        type: "image",
        inline_data: { mime_type: "image/jpeg", data: f.data.split(",")[1] || f.data },
      });
    });

    const { text, provider } = await aiComplete({
      modelType: "video",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
    });

    const parsed = JSON.parse(text);

    // Auto-upsert into Supabase
    const { data: upserted, error: dbError } = await supabase
      .from("analyses")
      .upsert({
        user_id: userId,
        source_type: "video",
        cloudinary_url: cloudinaryUrl,
        object_type: parsed.object_type,
        velocity: parsed.initial_velocity_m_s,
        angle: parsed.launch_angle_deg,
        height: parsed.launch_height_m,
        analysis_summary_ar: parsed.motion_description_ar,
        analysis_metadata: {
          confidence: parsed.confidence_score,
          provider,
          engine: "APAS Video Elite",
          frameCount: frames.length
        },
      })
      .select()
      .single();

    if (dbError) console.error("Database error:", dbError);

    return new Response(JSON.stringify({ 
      text: parsed.motion_description_ar, 
      analysis: parsed,
      recordId: upserted?.id
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("video-analyze elite error:", e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
  }
});
