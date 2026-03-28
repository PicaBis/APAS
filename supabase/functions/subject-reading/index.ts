import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { aiComplete } from "../_shared/ai-provider.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { imageBase64, mimeType, lang } = await req.json();
    const isAr = lang === "ar";

    const systemPrompt = `You are APAS Subject Reader — an expert physics problem solver specialized in projectile motion (المقذوفات).
Your task is to read physics exercises from images, extract data, and solve them step by step.

LANGUAGE: Respond ENTIRELY in ${isAr ? "Arabic (العربية)" : "English"}.

INSTRUCTIONS:
1. Use OCR to read the problem from the image.
2. Extract numerical data (velocity, angle, height, mass, gravity).
3. Identify if it's a projectile motion problem.
4. Solve it step-by-step using kinematics equations.
5. If graphs are present, read values from axes.

Output MUST include a JSON block:
\`\`\`json
{
  "recognized": true,
  "isProjectileMotion": true,
  "extractedData": {
    "velocity": number | null,
    "angle": number | null,
    "height": number | null,
    "mass": number | null,
    "gravity": number | null
  }
}
\`\`\`
Then provide the full exercise text, given data, explanation, and step-by-step solution in ${isAr ? "Arabic" : "English"}.
Use simple ASCII math (v0, theta, ^2, sqrt). NEVER use LaTeX ($ or \\).`;

    const { text, provider } = await aiComplete({
      modelType: "vision",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            { type: "text", text: "Read and solve this physics exercise." },
            { 
              type: "text", // Gemini helper in ai-provider handles inline_data
              inline_data: { mime_type: mimeType || "image/jpeg", data: imageBase64 } 
            }
          ]
        }
      ]
    });

    return new Response(JSON.stringify({ text, provider }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (e) {
    console.error("subject-reading error:", e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
  }
});
