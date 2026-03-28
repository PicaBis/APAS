import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { aiComplete } from "../_shared/ai-provider.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

// ── Prompt Builder ──

function buildSystemPrompt(): string {
  return `You are Professor APAS, a world-class expert in Newtonian Physics and Computer Vision from ENS Paris.
Your mission is to analyze images for projectile motion scenarios.

CRITICAL INSTRUCTIONS:
1. ALWAYS provide a physics analysis if there is ANY hint of a projectile (ball, stone, rocket, person throwing something, or even a diagram of motion).
2. DO NOT be overly strict. If you see a ball in the air, it IS a projectile. If you see a person in a throwing posture, analyze the potential projectile.
3. If no projectile is visible, but the user is asking about physics, assume a default scenario (e.g., a standard ball throw) based on the environment.
4. ESTIMATE values based on visual scale:
   - Use humans (~1.7m), doors (~2m), or sports equipment for scale.
   - Initial Velocity: Typical for the sport/object (e.g., 10-30m/s for sports, 100m/s+ for ballistics).
   - Angle: Measure relative to the horizontal ground.
   - Height: Distance from ground to launch point.
5. Provide scientific reasoning for your estimates in 'scientific_explanation'.
6. Include a detailed Arabic summary in 'analysis_summary_ar' for students.

Output ONLY valid JSON.`;
}

function buildUserPrompt(lang: string): string {
  return `Analyze this image for projectile motion.
Return a JSON object with:
{
  "detected": true,
  "object_type": "specific name",
  "estimated_mass": number (kg),
  "initial_velocity": number (m/s),
  "launch_angle": number (degrees),
  "launch_height": number (meters),
  "gravity": 9.81,
  "image_description": "detailed description",
  "scientific_explanation": "how you calculated these values",
  "analysis_summary_ar": "Detailed Arabic summary explaining the physics",
  "confidence_score": number (0-100)
}`;
}

// ── Main Handler ──

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const startTime = Date.now();
  try {
    const { imageBase64, mimeType, lang } = await req.json();
    if (!imageBase64) throw new Error("No image data provided");

    const isAr = lang === "ar";
    
    const { text, provider } = await aiComplete({
      modelType: "vision",
      messages: [
        { role: "system", content: buildSystemPrompt() },
        { 
          role: "user", 
          content: [
            { text: buildUserPrompt(lang) },
            { 
              inline_data: { 
                mime_type: mimeType || "image/jpeg", 
                data: imageBase64 
              } 
            }
          ] 
        }
      ]
    });

    const parsed = JSON.parse(text);
    if (!parsed.detected) {
       return new Response(JSON.stringify({ 
         detected: false, 
         text: isAr ? "لم يتم العثور على مقذوف واضح." : "No clear projectile detected."
       }), { headers: corsHeaders });
    }

    // Recompute physics
    const v0 = parsed.initial_velocity || 20;
    const angle = parsed.launch_angle || 45;
    const h0 = parsed.launch_height || 1.5;
    const g = parsed.gravity || 9.81;

    const rad = angle * Math.PI / 180;
    const v0x = v0 * Math.cos(rad);
    const v0y = v0 * Math.sin(rad);
    const maxHeight = h0 + (v0y * v0y) / (2 * g);
    const totalTime = (v0y + Math.sqrt(v0y * v0y + 2 * g * h0)) / g;
    const maxRange = v0x * totalTime;

    const finalResult = {
      ...parsed,
      v0x: Math.round(v0x * 100) / 100,
      v0y: Math.round(v0y * 100) / 100,
      maxHeight: Math.round(maxHeight * 100) / 100,
      maxRange: Math.round(maxRange * 100) / 100,
      totalTime: Math.round(totalTime * 100) / 100,
      processingTimeMs: Date.now() - startTime,
      provider
    };

    return new Response(JSON.stringify({ 
      text: buildMarkdownReport(isAr, finalResult),
      analysis: finalResult 
    }), { headers: corsHeaders });

  } catch (e) {
    console.error("vision-analyze error:", e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
  }
});

function buildMarkdownReport(isAr: boolean, r: any): string {
  return `
# ${isAr ? "تقرير تحليل الرؤية APAS" : "APAS Vision Analysis Report"}

- **${isAr ? "الكائن:" : "Object:"}** ${r.object_type}
- **${isAr ? "السرعة:" : "Velocity:"}** ${r.initial_velocity} m/s
- **${isAr ? "الزاوية:" : "Angle:"}** ${r.launch_angle}°
- **${isAr ? "الارتفاع:" : "Height:"}** ${r.launch_height} m

---
*${isAr ? "تم التحليل بواسطة:" : "Analyzed by:"} ${r.provider}*
`;
}
