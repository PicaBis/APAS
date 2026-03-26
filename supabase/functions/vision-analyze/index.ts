import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Stage 1: Gemini extracts raw data from image
async function callGeminiExtract(
  imageBase64: string,
  mimeType: string,
  lang: string,
): Promise<string> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

  const isAr = lang === "ar";

  const extractionPrompt = [
    "You are APAS Vision Extractor. Your ONLY job is to extract raw data from this image. DO NOT solve any problem.",
    "",
    "TYPES OF IMAGES:",
    "A) PHYSICS EXERCISE / HOMEWORK: Extract ALL given values, variables, equations, and what is asked to solve.",
    "B) REAL PHOTO of projectile motion: Identify the object, estimate angle, speed, height from visual cues.",
    "C) DIAGRAM: Extract labeled values, angles, vectors, dimensions.",
    "",
    "FOR EXERCISES (Type A) - READ EVERY WORD carefully:",
    "- Extract ALL given constants (velocity, angle, height, mass, gravity, time, distance, etc.)",
    "- Extract the QUESTION - what needs to be solved?",
    "- Extract any equations shown",
    "- Extract units for each value",
    "- If there are multiple parts (a, b, c...), list each sub-question",
    "",
    "FOR REAL PHOTOS (Type B):",
    "- Identify the projectile object specifically (ball, rocket, stone, etc.)",
    "- Use reference objects for scale (person ~1.7m, door ~2m, car ~1.5m tall)",
    "- Estimate launch angle from trajectory arc or body posture",
    "- Estimate initial velocity from context",
    "",
    "RESPOND WITH ONLY valid JSON (no markdown fences):",
    "{",
    '  "imageType": "exercise or photo or diagram",',
    '  "extractedData": {',
    '    "givenValues": {',
    '      "velocity": {"value": null, "unit": "m/s"},',
    '      "angle": {"value": null, "unit": "degrees"},',
    '      "height": {"value": null, "unit": "m"},',
    '      "mass": {"value": null, "unit": "kg"},',
    '      "gravity": {"value": null, "unit": "m/s^2"},',
    '      "time": {"value": null, "unit": "s"},',
    '      "distance": {"value": null, "unit": "m"}',
    "    },",
    '    "additionalValues": {},',
    '    "questionsToSolve": [],',
    '    "equationsShown": [],',
    '    "objectType": "specific object name",',
    '    "rawText": "all text extracted from the image",',
    '    "confidence": 0,',
    '    "calibrationRef": null,',
    '    "language": "' + (isAr ? "ar" : "en") + '"',
    "  }",
    "}",
  ].join("\n");

  const body = {
    contents: [
      {
        role: "user",
        parts: [
          { text: extractionPrompt },
          { inline_data: { mime_type: mimeType, data: imageBase64 } },
        ],
      },
    ],
    generationConfig: { temperature: 0.2, maxOutputTokens: 3000 },
    systemInstruction: {
      parts: [
        {
          text: "You are a precise data extractor. Extract ONLY what you see. Do NOT solve, compute, or infer. Output ONLY valid JSON.",
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

// Stage 2: Mistral solves the physics problem
async function callMistralSolve(
  extractedJson: string,
  lang: string,
): Promise<string> {
  const apiKey = Deno.env.get("MISTRAL_API_KEY");
  if (!apiKey) throw new Error("MISTRAL_API_KEY not configured");

  const isAr = lang === "ar";

  const solvePrompt = [
    "You are APAS Physics Solver. Solve the physics problem step by step.",
    "",
    "EXTRACTED DATA:",
    extractedJson,
    "",
    "INSTRUCTIONS:",
    "1. Use Newton's laws and kinematic equations",
    "2. Show EVERY step of your solution",
    "3. Use these equations:",
    "   x(t) = v0 * cos(theta) * t",
    "   y(t) = h0 + v0 * sin(theta) * t - 0.5 * g * t^2",
    "   v0x = v0 * cos(theta), v0y = v0 * sin(theta)",
    "   Max height: H = h0 + v0y^2 / (2*g)",
    "   Time of flight: solve y(t) = 0",
    "   Range: R = v0x * T",
    "   Impact velocity: v_impact = sqrt(v0x^2 + (v0y - g*T)^2)",
    "4. If the image was an exercise with specific questions, answer EACH question",
    "5. If it was a photo, compute all standard projectile motion values",
    "6. Provide numerical answers with units",
    "7. Use gravity = 9.81 m/s^2 unless specified otherwise",
    "",
    "RESPOND IN " + (isAr ? "ARABIC" : "ENGLISH") + ".",
    "",
    "FORMAT YOUR RESPONSE AS valid JSON (no markdown fences):",
    "{",
    '  "solved": true,',
    '  "results": {',
    '    "velocity": 0, "angle": 0, "height": 0, "mass": 0.5,',
    '    "gravity": 9.81, "v0x": 0, "v0y": 0, "maxHeight": 0,',
    '    "totalTime": 0, "maxRange": 0, "impactVelocity": 0,',
    '    "objectType": "", "confidence": 0',
    "  },",
    '  "stepByStepSolution": "detailed solution text",',
    '  "answeredQuestions": [{"question": "...", "answer": "..."}]',
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
          content: "You are a precise physics solver. Use Newton's laws and kinematic equations. Show every calculation step. Be exact. Respond with valid JSON only.",
        },
        { role: "user", content: solvePrompt },
      ],
      temperature: 0.1,
      max_tokens: 4000,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error("Mistral API error (" + res.status + "): " + err);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

// Stage 3: Energy conservation verification
function verifyWithEnergy(r: {
  velocity?: number;
  angle?: number;
  height?: number;
  gravity?: number;
  maxHeight?: number;
  impactVelocity?: number;
}): { verified: boolean; energyError: number; note: string } {
  const v0 = r.velocity || 0;
  const h0 = r.height || 0;
  const g = r.gravity || 9.81;
  const vImpact = r.impactVelocity || 0;

  if (v0 === 0) return { verified: true, energyError: 0, note: "No velocity to verify" };

  const energyLaunch = 0.5 * v0 * v0 + g * h0;
  const energyImpact = 0.5 * vImpact * vImpact;

  const angleRad = (r.angle || 0) * Math.PI / 180;
  const v0x = v0 * Math.cos(angleRad);
  const hMax = r.maxHeight || 0;
  const energyAtPeak = 0.5 * v0x * v0x + g * hMax;

  const errorImpact = energyLaunch > 0 ? Math.abs(energyLaunch - energyImpact) / energyLaunch : 0;
  const errorPeak = energyLaunch > 0 ? Math.abs(energyLaunch - energyAtPeak) / energyLaunch : 0;
  const maxError = Math.max(errorImpact, errorPeak);

  if (maxError < 0.05) return { verified: true, energyError: maxError, note: "Energy conservation verified (<5% error)" };
  if (maxError < 0.15) return { verified: true, energyError: maxError, note: "Energy conservation approximate (5-15% error)" };
  return { verified: false, energyError: maxError, note: "Energy conservation failed (>15% error)" };
}

function parseJsonFromText(text: string): Record<string, unknown> {
  // Try fenced code block first
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) {
    try { return JSON.parse(fenced[1].trim()); } catch { /* fallback */ }
  }
  // Try raw JSON
  const raw = text.match(/\{[\s\S]*\}/);
  if (raw) {
    try { return JSON.parse(raw[0]); } catch { /* fallback */ }
  }
  return {};
}

serve(async (req) => {
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

    const isAr = lang === "ar";

    // Stage 1: Gemini extracts raw data
    console.log("[vision-analyze] Stage 1: Gemini extraction...");
    const geminiResponse = await callGeminiExtract(imageBase64, mimeType || "image/jpeg", lang);
    console.log("[vision-analyze] Stage 1 complete, length:", geminiResponse.length);

    const extractedData = parseJsonFromText(geminiResponse);

    // Stage 2: Mistral solves the problem
    console.log("[vision-analyze] Stage 2: Mistral solving...");
    const mistralResponse = await callMistralSolve(JSON.stringify(extractedData, null, 2), lang);
    console.log("[vision-analyze] Stage 2 complete, length:", mistralResponse.length);

    const solvedData = parseJsonFromText(mistralResponse);
    const results = (solvedData as { results?: Record<string, unknown> }).results || {};
    const stepSolution = (solvedData as { stepByStepSolution?: string }).stepByStepSolution || mistralResponse.replace(/```(?:json)?[\s\S]*?```/g, "").trim();
    const answeredQuestions = (solvedData as { answeredQuestions?: Array<{ question: string; answer: string }> }).answeredQuestions || [];

    // Fill computed values if missing
    const v0 = (results.velocity as number) || 0;
    const angle = (results.angle as number) || 0;
    const h0 = (results.height as number) || 0;
    const g = (results.gravity as number) || 9.81;
    const rad = angle * Math.PI / 180;

    if (!results.v0x) results.v0x = Math.round(v0 * Math.cos(rad) * 100) / 100;
    if (!results.v0y) results.v0y = Math.round(v0 * Math.sin(rad) * 100) / 100;
    const v0y = results.v0y as number;
    const v0x = results.v0x as number;
    if (!results.maxHeight) results.maxHeight = Math.round((h0 + (v0y * v0y) / (2 * g)) * 100) / 100;
    if (!results.totalTime) {
      const tUp = v0y / g;
      const tDown = Math.sqrt(Math.max(0, 2 * (results.maxHeight as number) / g));
      results.totalTime = Math.round((tUp + tDown) * 100) / 100;
    }
    if (!results.maxRange) results.maxRange = Math.round(v0x * (results.totalTime as number) * 100) / 100;
    if (!results.impactVelocity) {
      const vyEnd = g * (results.totalTime as number) - v0y;
      results.impactVelocity = Math.round(Math.sqrt(v0x * v0x + vyEnd * vyEnd) * 100) / 100;
    }

    // Stage 3: Energy verification
    console.log("[vision-analyze] Stage 3: Energy verification...");
    const verification = verifyWithEnergy({
      velocity: v0, angle, height: h0, gravity: g,
      maxHeight: results.maxHeight as number,
      impactVelocity: results.impactVelocity as number,
    });
    console.log("[vision-analyze] Verification:", verification);

    const finalJson = {
      detected: true,
      confidence: (results.confidence as number) || 75,
      angle, velocity: v0,
      mass: (results.mass as number) || 0.5,
      height: h0,
      objectType: (results.objectType as string) || "projectile",
      gravity: g,
      v0x: results.v0x, v0y: results.v0y,
      maxHeight: results.maxHeight, maxRange: results.maxRange,
      totalTime: results.totalTime, impactVelocity: results.impactVelocity,
      imageType: (extractedData as { imageType?: string }).imageType || "photo",
      verified: verification.verified,
      energyError: Math.round(verification.energyError * 10000) / 100,
    };

    const report = [
      "```json",
      JSON.stringify(finalJson, null, 2),
      "```",
      "",
      isAr ? "# APAS AI تقرير تحليل" : "# APAS AI Analysis Report",
      "",
      isAr ? "## المعطيات المستخرجة" : "## Extracted Data",
      (isAr ? "السرعة الابتدائية: " : "Initial velocity: ") + "**" + v0 + "** m/s",
      (isAr ? "زاوية الإطلاق: " : "Launch angle: ") + "**" + angle + " deg**",
      (isAr ? "الارتفاع الابتدائي: " : "Initial height: ") + "**" + h0 + "** m",
      (isAr ? "الجاذبية: " : "Gravity: ") + "**" + g + "** m/s2",
      "",
      isAr ? "## الحل خطوة بخطوة" : "## Step-by-Step Solution",
      stepSolution,
      "",
      isAr ? "## النتائج" : "## Results",
      "v0x = " + results.v0x + " m/s",
      "v0y = " + results.v0y + " m/s",
      (isAr ? "أقصى ارتفاع = " : "Max height = ") + results.maxHeight + " m",
      (isAr ? "المدى = " : "Range = ") + results.maxRange + " m",
      (isAr ? "زمن الطيران = " : "Time of flight = ") + results.totalTime + " s",
      (isAr ? "سرعة الاصطدام = " : "Impact velocity = ") + results.impactVelocity + " m/s",
      "",
      isAr ? "## التحقق من حفظ الطاقة" : "## Energy Conservation Check",
      (verification.verified ? "OK" : "WARNING") + ": " + verification.note,
    ];

    if (answeredQuestions.length > 0) {
      report.push("", isAr ? "## إجابات الأسئلة" : "## Answered Questions");
      for (const qa of answeredQuestions) {
        report.push("**" + qa.question + "**", qa.answer, "");
      }
    }

    return new Response(
      JSON.stringify({ text: report.join("\n") }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("vision-analyze error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
