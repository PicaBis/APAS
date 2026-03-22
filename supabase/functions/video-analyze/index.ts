import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

const MISTRAL_API_URL = "https://api.mistral.ai/v1/chat/completions";
const MISTRAL_VISION_MODEL = "pixtral-large-latest";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { frames, lang, videoName, totalFrames, fps } = await req.json();

    if (!frames || !Array.isArray(frames) || frames.length === 0) {
      return new Response(JSON.stringify({ error: "No frames provided" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const mistralKey = Deno.env.get("MISTRAL_API_KEY");
    if (!mistralKey) {
      throw new Error("MISTRAL_API_KEY not configured");
    }

    console.log(`Received ${frames.length} frames for video analysis, fps: ${fps}, totalFrames: ${totalFrames}`);

    const isAr = lang === "ar";
    const analysisId = crypto.randomUUID();
    const timestamp = new Date().toISOString();

    // Build the multi-frame content array
    const userContent: Array<{ type: string; text?: string; image_url?: { url: string } }> = [];

    userContent.push({
      type: "text",
      text: isAr
        ? `[تحليل فيديو فريد #${analysisId.slice(0, 8)}] هذه ${frames.length} إطارات مستخرجة من فيديو "${videoName || "unknown"}". الفيديو يحتوي على ${totalFrames || "unknown"} إطار إجمالي بمعدل ${fps || "unknown"} إطار/ثانية. حلل حركة المقذوف عبر جميع الإطارات. تتبع موقع الجسم في كل إطار وحدد المسار والسرعة والزاوية. افحص كل إطار بعناية — أي جسم متحرك يعتبر مقذوفاً محتملاً.`
        : `[Unique Video Analysis #${analysisId.slice(0, 8)}] These are ${frames.length} frames extracted from video "${videoName || "unknown"}". The video has ${totalFrames || "unknown"} total frames at ${fps || "unknown"} fps. Analyze the projectile motion across ALL frames. Track the object's position in each frame to determine trajectory, velocity, and angle. Examine each frame carefully — any moving object is a potential projectile.`,
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

IMPORTANT — PROJECTILE DETECTION RULES:
- You MUST carefully examine ALL frames before deciding if a projectile is present.
- A projectile can be ANY moving object: ball, stone, person, vehicle, water, etc.
- If ANY object changes position between frames, it is a projectile candidate.
- NEVER say "no projectile detected" if there is any moving object visible across frames.
- Even small, blurry, or partially visible moving objects count as projectiles.
- When in doubt, ALWAYS lean toward detected=true with a lower confidence.

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

    const response = await fetch(MISTRAL_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${mistralKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MISTRAL_VISION_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        temperature: 0.4,
        max_tokens: 2000,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Mistral API error ${response.status}: ${errorText}`);
      throw new Error(`Mistral API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content || "";

    console.log(`video-analyze completed via Mistral AI`);

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
