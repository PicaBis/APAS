import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { frames, lang, videoName, totalFrames, fps } = await req.json();

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured");

    if (!frames || !Array.isArray(frames) || frames.length === 0) {
      return new Response(JSON.stringify({ error: "No frames provided" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    console.log(`Received ${frames.length} frames for video analysis, fps: ${fps}, totalFrames: ${totalFrames}`);

    const isAr = lang === "ar";
    const analysisId = crypto.randomUUID();
    const timestamp = new Date().toISOString();

    // Build the multi-frame content array for GPT-4o
    const userContent: Array<{ type: string; text?: string; image_url?: { url: string } }> = [];

    userContent.push({
      type: "text",
      text: isAr
        ? `[تحليل فيديو فريد #${analysisId.slice(0, 8)}] هذه ${frames.length} إطارات مستخرجة من فيديو "${videoName || "unknown"}". الفيديو يحتوي على ${totalFrames || "unknown"} إطار إجمالي بمعدل ${fps || "unknown"} إطار/ثانية. حلل حركة المقذوف عبر جميع الإطارات. تتبع موقع الجسم في كل إطار وحدد المسار والسرعة والزاوية.`
        : `[Unique Video Analysis #${analysisId.slice(0, 8)}] These are ${frames.length} frames extracted from video "${videoName || "unknown"}". The video has ${totalFrames || "unknown"} total frames at ${fps || "unknown"} fps. Analyze the projectile motion across ALL frames. Track the object's position in each frame to determine trajectory, velocity, and angle.`,
    });

    // Add each frame as an image
    for (let i = 0; i < frames.length; i++) {
      userContent.push({
        type: "text",
        text: isAr ? `--- الإطار ${i + 1}/${frames.length} (الوقت: ${frames[i].timestamp?.toFixed(2) || i * 0.1}ث) ---` : `--- Frame ${i + 1}/${frames.length} (Time: ${frames[i].timestamp?.toFixed(2) || i * 0.1}s) ---`,
      });
      userContent.push({
        type: "image_url",
        image_url: { url: frames[i].data },
      });
    }

    const systemPrompt = `You are APAS Video Analyzer — an expert physics video analyzer specialized in projectile motion.
You receive a sequence of frames extracted from a video showing projectile motion.

ANALYSIS ID: ${analysisId}
TIMESTAMP: ${timestamp}

YOUR TASK:
1. Examine EACH frame carefully and track the projectile's position across frames
2. Calculate the trajectory by comparing positions between consecutive frames
3. Determine launch angle from the initial trajectory direction
4. Estimate velocity from how far the object moves between frames (using frame timing)
5. Identify the object type and estimate its mass
6. Determine the launch height

MULTI-FRAME ANALYSIS METHOD:
- Frame 1: Identify the projectile and its initial position
- Frames 2-N: Track position changes to map the trajectory
- Use position differences between frames to calculate velocity components
- The arc shape reveals the launch angle
- The deceleration pattern confirms projectile motion (gravity effect)

CRITICAL RULES:
- Analyze THIS SPECIFIC video's frames. Do NOT use template values.
- Each video is unique — different throws produce different parameters.
- Track the ACTUAL object movement visible across the frames.
- If the object moves more pixels between frames = higher velocity.
- If the arc is steep = higher launch angle.
- Use the frame timestamps to calculate real velocity.

REALISTIC VALUE RANGES:
- Mass (must match identified object):
  - Football/soccer ball: 0.41-0.45 kg | Basketball: 0.58-0.65 kg
  - Tennis ball: 0.056-0.059 kg | Baseball: 0.142-0.149 kg
  - Stone/rock: 0.1-2 kg | Shot put: 4-7.26 kg
- Velocity: Hand throw 5-35 m/s | Kick 15-40 m/s
- Angle: Estimate from trajectory arc (0-90 degrees)
- Height: 0-3m for human launch

RESPONSE FORMAT:
\`\`\`json
{"detected": true/false, "confidence": <0-100>, "angle": <degrees>, "velocity": <m/s>, "mass": <kg>, "height": <m>, "objectType": "<type>"}
\`\`\`

Then provide analysis in ${isAr ? "Arabic" : "English"}:
- ${isAr ? "نوع المقذوف" : "Projectile type"}
- ${isAr ? "تحليل المسار عبر الإطارات" : "Trajectory analysis across frames"}
- ${isAr ? "حساب السرعة من حركة الإطارات" : "Velocity calculation from frame movement"}
- ${isAr ? "تقدير زاوية الإطلاق" : "Launch angle estimation"}
- ${isAr ? "ملاحظات فيزيائية" : "Physics notes"}`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        temperature: 0.4,
        max_tokens: 2000,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: `AI error: ${response.status}` }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ text }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error analyzing video:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
