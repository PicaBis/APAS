import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Stage 1: Gemini Vision watches video frames and extracts physics data
async function callGeminiVideoAnalysis(
  frames: Array<{ data: string; timestamp: number }>,
  lang: string,
  videoName: string,
): Promise<string> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

  const isAr = lang === "ar";

  const visionPrompt = [
    "You are APAS Video Analyzer. Watch these video frames carefully and analyze the projectile motion.",
    "",
    "YOUR TASK:",
    "1. Watch ALL frames sequentially to understand the motion",
    "2. Identify the moving object (ball, rocket, stone, etc.) - be SPECIFIC",
    "3. Track the object position across frames",
    "4. Based ONLY on what you SEE, estimate:",
    "   - Launch angle (from horizontal)",
    "   - Initial velocity (use reference objects for scale)",
    "   - Launch height",
    "   - Object type and mass",
    "",
    "VISUAL ESTIMATION RULES:",
    "- Use reference objects for scale: person ~1.7m, door ~2m, car ~1.5m tall, basketball hoop 3.05m",
    "- Estimate angle from the initial direction of motion relative to horizontal",
    "- Estimate velocity from how fast the object moves between frames",
    "- Most real throws are 20-70 degrees. Near 90 is VERY rare.",
    "- Track the SAME object across ALL frames. Do NOT switch objects.",
    "- The trajectory should form a smooth parabolic curve",
    "",
    "RESPOND WITH ONLY valid JSON (no markdown fences):",
    "{",
    '  "detected": true,',
    '  "objectType": "specific object name",',
    '  "confidence": 0,',
    '  "angle": 0,',
    '  "velocity": 0,',
    '  "height": 0,',
    '  "mass": 0.5,',
    '  "gravity": 9.81,',
    '  "calibrationRef": "reference object used for scale",',
    '  "motionDescription": "description of the motion observed",',
    '  "positions": [',
    '    {"frame": 1, "x": 0, "y": 0, "t": 0}',
    "  ]",
    "}",
  ].join("\n");

  // Build content parts with frames
  const parts: Array<{ text?: string; inline_data?: { mime_type: string; data: string } }> = [];
  parts.push({ text: visionPrompt });

  for (let i = 0; i < frames.length; i++) {
    const ts = typeof frames[i].timestamp === "number" ? frames[i].timestamp.toFixed(3) : String(i * 0.1);
    parts.push({ text: "--- Frame " + (i + 1) + "/" + frames.length + " (Time: " + ts + "s) ---" });

    // Extract base64 data from data URL if needed
    let base64Data = frames[i].data;
    let frameMime = "image/jpeg";
    if (base64Data.startsWith("data:")) {
      const match = base64Data.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        frameMime = match[1];
        base64Data = match[2];
      }
    }
    parts.push({ inline_data: { mime_type: frameMime, data: base64Data } });
  }

  const body = {
    contents: [{ role: "user", parts }],
    generationConfig: { temperature: 0.2, maxOutputTokens: 4000 },
    systemInstruction: {
      parts: [
        {
          text: "You are a precise video physics analyzer. Watch the frames carefully. Track the moving object. Estimate physics values from visual context ONLY. Output valid JSON only.",
        },
      ],
    },
  };

  const res = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" + apiKey,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error("Gemini API error (" + res.status + "): " + err);
  }

  const data = await res.json();
  const candidate = data.candidates?.[0];
  if (!candidate?.content?.parts?.length) throw new Error("Gemini returned no content");
  return candidate.content.parts.map((p: { text?: string }) => p.text || "").join("");
}

// Stage 2: Mistral solves the physics problem from extracted data
async function callMistralSolve(
  extractedJson: string,
  lang: string,
): Promise<string> {
  const apiKey = Deno.env.get("MISTRAL_API_KEY");
  if (!apiKey) throw new Error("MISTRAL_API_KEY not configured");

  const isAr = lang === "ar";

  const solvePrompt = [
    "You are APAS Physics Solver. Given the video analysis data, compute all projectile motion values.",
    "",
    "VIDEO ANALYSIS DATA:",
    extractedJson,
    "",
    "COMPUTE:",
    "1. v0x = v0 * cos(angle), v0y = v0 * sin(angle)",
    "2. Max height: H = h0 + v0y^2 / (2*g)",
    "3. Time of flight: solve y(t) = 0",
    "4. Range: R = v0x * T",
    "5. Impact velocity: v_impact = sqrt(v0x^2 + (v0y - g*T)^2)",
    "6. Energy at launch: KE + PE = 0.5*m*v0^2 + m*g*h0",
    "",
    "Show step-by-step calculations.",
    "RESPOND IN " + (isAr ? "ARABIC" : "ENGLISH") + ".",
    "",
    "FORMAT AS valid JSON (no markdown fences):",
    "{",
    '  "v0x": 0, "v0y": 0,',
    '  "maxHeight": 0, "totalTime": 0,',
    '  "maxRange": 0, "impactVelocity": 0,',
    '  "kineticEnergy": 0, "potentialEnergy": 0,',
    '  "stepByStepSolution": "detailed solution"',
    "}",
  ].join("\n");

  const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + apiKey,
    },
    body: JSON.stringify({
      model: "mistral-large-latest",
      messages: [
        {
          role: "system",
          content: "You are a precise physics solver. Compute projectile motion values step by step. Respond with valid JSON only.",
        },
        { role: "user", content: solvePrompt },
      ],
      temperature: 0.1,
      max_tokens: 3000,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error("Mistral API error (" + res.status + "): " + err);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

function parseJsonFromText(text: string): Record<string, unknown> {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) {
    try { return JSON.parse(fenced[1].trim()); } catch { /* fallback */ }
  }
  const raw = text.match(/\{[\s\S]*\}/);
  if (raw) {
    try { return JSON.parse(raw[0]); } catch { /* fallback */ }
  }
  return {};
}

// Energy conservation verification
function verifyWithEnergy(r: {
  velocity?: number; angle?: number; height?: number;
  gravity?: number; maxHeight?: number; impactVelocity?: number;
}): { verified: boolean; energyError: number; note: string } {
  const v0 = r.velocity || 0;
  const h0 = r.height || 0;
  const g = r.gravity || 9.81;
  const vImpact = r.impactVelocity || 0;

  if (v0 === 0) return { verified: true, energyError: 0, note: "No velocity to verify" };

  const energyLaunch = 0.5 * v0 * v0 + g * h0;
  const energyImpact = 0.5 * vImpact * vImpact;
  const errorImpact = energyLaunch > 0 ? Math.abs(energyLaunch - energyImpact) / energyLaunch : 0;

  if (errorImpact < 0.05) return { verified: true, energyError: errorImpact, note: "Energy conservation verified (<5% error)" };
  if (errorImpact < 0.15) return { verified: true, energyError: errorImpact, note: "Energy conservation approximate (5-15% error)" };
  return { verified: false, energyError: errorImpact, note: "Energy conservation failed (>15% error)" };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { frames, lang, videoName } = await req.json();

    if (!frames || !Array.isArray(frames) || frames.length === 0) {
      return new Response(JSON.stringify({ error: "No frames provided" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    console.log("[video-analyze] Received " + frames.length + " frames for analysis");
    const isAr = lang === "ar";

    // Stage 1: Gemini Vision watches the video
    console.log("[video-analyze] Stage 1: Gemini Vision analysis...");
    const geminiResponse = await callGeminiVideoAnalysis(frames, lang, videoName || "video");
    console.log("[video-analyze] Stage 1 complete, length:", geminiResponse.length);

    const visionData = parseJsonFromText(geminiResponse);

    if (!(visionData as { detected?: boolean }).detected) {
      const noDetectReport = isAr
        ? "# لم يتم اكتشاف حركة\n\nلم يتم العثور على جسم متحرك في الفيديو. حاول رفع فيديو يظهر فيه مقذوف واضح."
        : "# No Motion Detected\n\nNo moving projectile was found in the video. Try uploading a video with a clear projectile.";
      return new Response(
        JSON.stringify({ text: noDetectReport }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const v0 = (visionData as { velocity?: number }).velocity || 15;
    const angle = (visionData as { angle?: number }).angle || 45;
    const h0 = (visionData as { height?: number }).height || 1;
    const mass = (visionData as { mass?: number }).mass || 0.5;
    const g = (visionData as { gravity?: number }).gravity || 9.81;
    const objectType = (visionData as { objectType?: string }).objectType || "projectile";
    const confidence = (visionData as { confidence?: number }).confidence || 60;

    // Stage 2: Mistral computes derived values
    console.log("[video-analyze] Stage 2: Mistral physics solving...");
    const solveInput = JSON.stringify({ velocity: v0, angle, height: h0, mass, gravity: g, objectType });
    const mistralResponse = await callMistralSolve(solveInput, lang);
    console.log("[video-analyze] Stage 2 complete");

    const computed = parseJsonFromText(mistralResponse);
    const stepSolution = (computed as { stepByStepSolution?: string }).stepByStepSolution || "";

    // Fill computed values
    const rad = angle * Math.PI / 180;
    const v0x = (computed as { v0x?: number }).v0x || Math.round(v0 * Math.cos(rad) * 100) / 100;
    const v0y = (computed as { v0y?: number }).v0y || Math.round(v0 * Math.sin(rad) * 100) / 100;
    const maxHeight = (computed as { maxHeight?: number }).maxHeight || Math.round((h0 + (v0y * v0y) / (2 * g)) * 100) / 100;
    const tUp = v0y / g;
    const tDown = Math.sqrt(Math.max(0, 2 * maxHeight / g));
    const totalTime = (computed as { totalTime?: number }).totalTime || Math.round((tUp + tDown) * 100) / 100;
    const maxRange = (computed as { maxRange?: number }).maxRange || Math.round(v0x * totalTime * 100) / 100;
    const vyEnd = g * totalTime - v0y;
    const impactVelocity = (computed as { impactVelocity?: number }).impactVelocity || Math.round(Math.sqrt(v0x * v0x + vyEnd * vyEnd) * 100) / 100;

    // Stage 3: Energy verification
    console.log("[video-analyze] Stage 3: Energy verification...");
    const verification = verifyWithEnergy({
      velocity: v0, angle, height: h0, gravity: g,
      maxHeight, impactVelocity,
    });

    const finalJson = {
      detected: true, confidence, angle, velocity: v0,
      mass, height: h0, objectType, gravity: g,
      v0x, v0y, maxHeight, maxRange, totalTime, impactVelocity,
      verified: verification.verified,
      energyError: Math.round(verification.energyError * 10000) / 100,
    };

    // Build report
    const report = [
      "```json",
      JSON.stringify(finalJson, null, 2),
      "```",
      "",
      isAr ? "# APAS AI تقرير تحليل الفيديو" : "# APAS AI Video Analysis Report",
      "",
      isAr ? "## الكائن المكتشف" : "## Detected Object",
      (isAr ? "النوع: " : "Type: ") + "**" + objectType + "**",
      (isAr ? "الكتلة: " : "Mass: ") + "**" + mass + "** kg",
      (isAr ? "نسبة الثقة: " : "Confidence: ") + "**" + confidence + "%**",
      "",
      isAr ? "## المعطيات المستخرجة" : "## Extracted Data",
      (isAr ? "السرعة الابتدائية: " : "Initial velocity: ") + "**" + v0 + "** m/s",
      (isAr ? "زاوية الإطلاق: " : "Launch angle: ") + "**" + angle + " deg**",
      (isAr ? "ارتفاع الإطلاق: " : "Launch height: ") + "**" + h0 + "** m",
      "",
      isAr ? "## النتائج المحسوبة" : "## Computed Results",
      "v0x = " + v0x + " m/s",
      "v0y = " + v0y + " m/s",
      (isAr ? "أقصى ارتفاع = " : "Max height = ") + maxHeight + " m",
      (isAr ? "المدى = " : "Range = ") + maxRange + " m",
      (isAr ? "زمن الطيران = " : "Time of flight = ") + totalTime + " s",
      (isAr ? "سرعة الاصطدام = " : "Impact velocity = ") + impactVelocity + " m/s",
    ];

    if (stepSolution) {
      report.push("", isAr ? "## الحل خطوة بخطوة" : "## Step-by-Step Solution", stepSolution);
    }

    report.push(
      "",
      isAr ? "## التحقق من حفظ الطاقة" : "## Energy Conservation Check",
      (verification.verified ? "OK" : "WARNING") + ": " + verification.note,
    );

    return new Response(
      JSON.stringify({ text: report.join("\n") }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("video-analyze error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
