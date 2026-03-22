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
    const { imageBase64, mimeType, lang } = await req.json();

    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    if (!OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY is not configured");

    const isAr = lang === "ar";

    const analysisId = crypto.randomUUID();

    const systemPrompt = `You are APAS Subject Reader — an expert physics problem solver specialized in projectile motion and mechanics.
Your task is to read physics exercises/problems from images and solve them step by step.

ANALYSIS ID: ${analysisId}

INSTRUCTIONS:
1. Look at the image and determine if it contains a physics problem or exercise
2. The problem could be handwritten, printed, or from a textbook
3. It may be in Arabic, French, or English
4. Focus on projectile motion, kinematics, and classical mechanics problems

IF NO PHYSICS PROBLEM IS FOUND:
Respond with:
\`\`\`json
{"recognized": false}
\`\`\`
Then say: "${isAr ? "لم اتعرف على التمرين" : "I did not recognize the exercise"}"

IF A PHYSICS PROBLEM IS FOUND:
1. Read and transcribe the problem
2. Extract all given data
3. Identify what needs to be found
4. Determine if it's a projectile motion problem

Respond with:
\`\`\`json
{
  "recognized": true,
  "type": "<problem type: projectile motion / free fall / inclined plane / etc>",
  "isProjectileMotion": <true if projectile motion, false otherwise>,
  "extractedData": {
    "velocity": <initial velocity in m/s or null>,
    "angle": <launch angle in degrees or null>,
    "height": <initial height in m or null>,
    "mass": <mass in kg or null>,
    "range": <horizontal range in m or null>,
    "gravity": <gravity in m/s² or null, default 9.81>
  }
}
\`\`\`

Then provide in ${isAr ? "Arabic" : "English"}:

**${isAr ? "نص التمرين" : "Exercise Text"}:**
(Transcribe the problem exactly as written)

**${isAr ? "المعطيات" : "Given Data"}:**
(List all given values with units)

**${isAr ? "المطلوب" : "Required"}:**
(What needs to be found)

**${isAr ? "الشرح" : "Explanation"}:**
(Brief explanation of the physics concepts involved)

## ${isAr ? "الحل" : "Solution"}

(Provide complete step-by-step solution with:
- Equations used
- Substitution of values
- Final answers with units
- For projectile motion: calculate range, max height, flight time, etc.)

IMPORTANT: Be thorough in the solution. Show all work and intermediate steps.`;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-4o",
        temperature: 0.3,
        max_tokens: 3000,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: isAr
                  ? `[قراءة تمرين #${analysisId.slice(0, 8)}] اقرأ هذا التمرين الفيزيائي وحله خطوة بخطوة.`
                  : `[Exercise Reading #${analysisId.slice(0, 8)}] Read this physics exercise and solve it step by step.`,
              },
              {
                type: "image_url",
                image_url: { url: `data:${mimeType};base64,${imageBase64}` },
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("OpenRouter API error:", response.status, t);
      return new Response(
        JSON.stringify({ error: `AI error: ${response.status}` }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content || "";

    return new Response(
      JSON.stringify({ text }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("subject-reading error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
