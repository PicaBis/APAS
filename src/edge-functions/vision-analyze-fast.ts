import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Max-Age": "86400",
  "Vary": "Origin"
};

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

// Fast and simple vision analysis
export async function visionAnalyzeFastHandler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { imageBase64, mimeType, lang } = await req.json();
    if (!imageBase64) {
      return new Response(JSON.stringify({ error: "No image provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    const isAr = lang === "ar";
    
    // Simplified prompt for speed
    const prompt = isAr ? 
      `حلل هذه الصورة لحركة المقذوفات. أرجع JSON فقط:
{
  "detected": true,
  "object_type": "اسم الجسم",
  "initial_velocity": 25.5,
  "launch_angle": 38.2,
  "launch_height": 1.5,
  "estimated_mass": 0.5,
  "confidence_score": 75.0,
  "analysis_summary_ar": "ملخص التحليل"
}` :
      `Analyze this image for projectile motion. Return JSON only:
{
  "detected": true,
  "object_type": "object name",
  "initial_velocity": 25.5,
  "launch_angle": 38.2,
  "launch_height": 1.5,
  "estimated_mass": 0.5,
  "confidence_score": 75.0,
  "scientific_explanation": "analysis summary"
}`;

    console.log("[vision-fast] Calling Gemini 2.0 Flash API...");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

    const response = await fetch(GEMINI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": GEMINI_API_KEY,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              { 
                inline_data: {
                  mime_type: mimeType || "image/jpeg",
                  data: imageBase64.substring(0, 300000) // Smaller image for speed
                }
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 2000, // Much smaller for speed
          topP: 0.9,
          topK: 30,
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_NONE"
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH", 
            threshold: "BLOCK_NONE"
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_NONE"
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_NONE"
          }
        ]
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: "Rate limited. Please try again.",
          retry_after: 3000 
        }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      throw new Error(`Gemini API failed: ${response.status}`);
    }

    const data = await response.json();
    const rawResponse = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    if (!rawResponse) throw new Error("Empty response");

    console.log(`[vision-fast] Response length: ${rawResponse.length}`);
    
    // Parse JSON from response
    let parsed = {};
    try {
      const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error("JSON parse error:", e);
    }

    // Check if projectile was detected
    if (!parsed.detected) {
      const errorMsg = (parsed.error as string) ||
        (isAr ? "لم يتم اكتشاف مقذوف." : "No projectile detected.");
      return new Response(
        JSON.stringify({
          text: isAr ? `# لم يتم اكتشاف مقذوف\n\n${errorMsg}` : `# No Projectile Detected\n\n${errorMsg}`,
          detected: false,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Extract values with defaults
    const objectType = String(parsed.object_type || "projectile");
    const velocity = Number(parsed.initial_velocity) || 25;
    const angle = Number(parsed.launch_angle) || 45;
    const height = Number(parsed.launch_height) || 1.5;
    const mass = Number(parsed.estimated_mass) || 0.5;
    const confidence = Number(parsed.confidence_score) || 70;

    // Simple physics calculations
    const rad = angle * Math.PI / 180;
    const v0x = Math.round(velocity * Math.cos(rad) * 100) / 100;
    const v0y = Math.round(velocity * Math.sin(rad) * 100) / 100;
    const maxHeight = Math.round((height + (v0y * v0y) / (2 * 9.81)) * 100) / 100;
    const totalTime = Math.round((v0y / 9.81 + Math.sqrt(2 * maxHeight / 9.81)) * 100) / 100;
    const maxRange = Math.round(v0x * totalTime * 100) / 100;

    const finalJson = {
      detected: true,
      objectType,
      velocity,
      angle,
      height,
      mass,
      confidence,
      v0x,
      v0y,
      maxHeight,
      maxRange,
      totalTime,
      providers: { extraction: "Google Gemini 2.0 Flash (Fast)" },
      processingTimeMs: Date.now() - Date.now(),
    };

    return new Response(
      JSON.stringify({ text: JSON.stringify(finalJson, null, 2), analysis: finalJson }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );

  } catch (e) {
    console.error("vision-fast error:", e);
    
    let errorMessage = "Analysis failed";
    if (e instanceof Error) {
      if (e.message.includes("aborted")) {
        errorMessage = "Request timeout. Please try again.";
      } else if (e.message.includes("network")) {
        errorMessage = "Network error. Please check connection.";
      } else {
        errorMessage = e.message;
      }
    }
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        retry_after: 3000
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      },
    );
  }
}
