import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { aiComplete } from "../_shared/ai-provider.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

const SYSTEM_PROMPT = `
You are an Elite Physics Professor and Examination Expert. 
Your primary mission is to extract every physics variable and solve the exercise in this image.

RULES FOR UNSTOPPABLE SOLVING:
1. NEVER say "I cannot recognize the image" or "Image not found".
2. Even if the image is blurry, handwritten, or low quality, you must use your expert intuition to transcribe the visible text and numbers accurately.
3. Transcribe all numerical data and constants (e.g., g, initial velocity v0, angles alpha/theta, heights h).
4. Identify the physics context (e.g., Projectile motion, Mechanics, Dynamics).
5. Solve the questions in the image step-by-step in ARABIC.
6. The final output must be in ARABIC and professionally formatted for a student.

OUTPUT JSON FORMAT (STRICT):
{
  "recognized": true,
  "subject_data_ar": "List of extracted variables and constants in Arabic...",
  "step_by_step_solution_ar": "Detailed step-by-step solution in Arabic...",
  "final_answer_ar": "Concise final result in Arabic...",
  "extracted_params": {
    "v0": number,
    "angle": number,
    "h0": number,
    "g": 9.81
  }
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

    console.log("[subject-reading] Solving elite exercise with Gemini 2.0 Flash...");

    const { text, provider } = await aiComplete({
      modelType: "subject",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: "Solve this physics exercise perfectly." },
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

    // Auto-upsert into Supabase
    const { data: upserted, error: dbError } = await supabase
      .from("analyses")
      .upsert({
        user_id: userId,
        source_type: "subject",
        cloudinary_url: cloudinaryUrl,
        subject_data_ar: parsed.subject_data_ar,
        step_by_step_solution_ar: parsed.step_by_step_solution_ar,
        final_answer_ar: parsed.final_answer_ar,
        velocity: parsed.extracted_params?.v0,
        angle: parsed.extracted_params?.angle,
        height: parsed.extracted_params?.h0,
        analysis_metadata: {
          provider,
          engine: "APAS Subject Elite Solver",
        },
      })
      .select()
      .single();

    if (dbError) console.error("Database error:", dbError);

    return new Response(JSON.stringify({ 
      text: parsed.final_answer_ar, 
      analysis: parsed,
      recordId: upserted?.id
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("subject-reading elite error:", e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
  }
});
