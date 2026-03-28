import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { aiComplete } from "../_shared/ai-provider.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

// ── Frame Limiting ──
const MAX_FRAMES = 10; // Gemini handles 10 frames easily and accurately

function limitFrames(frames: Array<{ data: string; timestamp: number }>) {
  if (frames.length <= MAX_FRAMES) return frames;
  const limited = [];
  const step = (frames.length - 1) / (MAX_FRAMES - 1);
  for (let i = 0; i < MAX_FRAMES; i++) {
    limited.push(frames[Math.round(i * step)]);
  }
  return limited;
}

// ── Main Handler ──

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const startTime = Date.now();
  try {
    const { frames, lang, userId } = await req.json();
    if (!frames || !Array.isArray(frames) || frames.length === 0) throw new Error("No frames provided");

    const isAr = lang === "ar";
    const limitedFrames = limitFrames(frames);

    console.log(`[video-analyze] Analyzing ${limitedFrames.length} frames with Gemini 2.0 Flash...`);

    // Prepare multimodal content for Gemini
    const userContent: any[] = [{ type: "text", text: "Analyze these sequential video frames for projectile motion. Identify the object, its launch angle, initial velocity, and height." }];
    
    limitedFrames.forEach((f, i) => {
      let base64 = f.data;
      let mime = "image/jpeg";
      if (base64.startsWith("data:")) {
        const match = base64.match(/^data:([^;]+);base64,(.+)$/);
        if (match) { mime = match[1]; base64 = match[2]; }
      }
      userContent.push({ type: "text", text: `Frame ${i+1} at ${f.timestamp.toFixed(2)}s:` });
      userContent.push({ inline_data: { mime_type: mime, data: base64 } });
    });

    const systemPrompt = `You are Professor APAS, an expert in motion analysis.
Analyze the sequence of frames to track a projectile.
1. Identify the object (e.g., ball, rocket).
2. Find the launch frame.
3. Calculate velocity based on displacement between frames and the provided timestamps.
4. Estimate launch angle and height relative to the ground.
5. Provide a detailed Arabic summary.

Output ONLY JSON:
{
  "detected": true,
  "objectType": "string",
  "velocity": number,
  "angle": number,
  "height": number,
  "gravity": 9.81,
  "confidence": number,
  "motionDescription": "string",
  "analysis_summary_ar": "string"
}`;

    const { text, provider } = await aiComplete({
      modelType: "video",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent }
      ]
    });

    const parsed = JSON.parse(text);
    if (!parsed.detected) {
      return new Response(JSON.stringify({ 
        detected: false, 
        text: isAr ? "لم يتم اكتشاف حركة مقذوف واضحة في الفيديو." : "No clear projectile motion detected in the video."
      }), { headers: corsHeaders });
    }

    // Recompute physics
    const v0 = parsed.velocity || 15;
    const angle = parsed.angle || 45;
    const h0 = parsed.height || 1.0;
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
    console.error("video-analyze error:", e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
  }
});

function buildMarkdownReport(isAr: boolean, r: any): string {
  return `
# ${isAr ? "تقرير تحليل الفيديو APAS" : "APAS Video Analysis Report"}

- **${isAr ? "الكائن:" : "Object:"}** ${r.objectType}
- **${isAr ? "السرعة المقدرة:" : "Estimated Velocity:"}** ${r.velocity} m/s
- **${isAr ? "الزاوية:" : "Angle:"}** ${r.angle}°
- **${isAr ? "الارتفاع:" : "Height:"}** ${r.height} m

### ${isAr ? "التحليل الحركي:" : "Kinetic Analysis:"}
${r.motionDescription}

### ${isAr ? "ملخص APAS:" : "APAS Summary:"}
${r.analysis_summary_ar}

---
*${isAr ? "تم التحليل بواسطة:" : "Analyzed by:"} ${r.provider}*
`;
}
