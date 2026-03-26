import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Retry Utilities ──

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  label: string,
  maxRetries = 3,
  initialDelay = 2000,
): Promise<T> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err as Error;
      const is429 = lastError.message.includes("429");
      if (!is429 || attempt === maxRetries) throw lastError;
      const delay = initialDelay * Math.pow(2, attempt);
      console.log(
        "[Retry] " + label + " rate limited (429), waiting " + delay + "ms before retry " + (attempt + 1) + "/" + maxRetries + "...",
      );
      await sleep(delay);
    }
  }
  throw lastError!;
}

// ── Frame Limiting ──
// Limit frames to reduce token consumption and avoid rate limits.
const MAX_FRAMES = 8;

function limitFrames(
  frames: Array<{ data: string; timestamp: number }>,
): Array<{ data: string; timestamp: number }> {
  if (frames.length <= MAX_FRAMES) return frames;

  console.log("[video-analyze] Limiting frames from " + frames.length + " to " + MAX_FRAMES + " (evenly sampled)");
  const limited: Array<{ data: string; timestamp: number }> = [];
  const step = (frames.length - 1) / (MAX_FRAMES - 1);
  for (let i = 0; i < MAX_FRAMES; i++) {
    const idx = Math.round(i * step);
    limited.push(frames[idx]);
  }
  return limited;
}

// ── Vision Prompt ──

function buildVideoVisionPrompt(): string {
  return [
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
}

// ── Stage 1 Providers: Analyze video frames ──

function buildFrameParts(
  frames: Array<{ data: string; timestamp: number }>,
): Array<{ text?: string; inline_data?: { mime_type: string; data: string } }> {
  const parts: Array<{ text?: string; inline_data?: { mime_type: string; data: string } }> = [];
  parts.push({ text: buildVideoVisionPrompt() });

  for (let i = 0; i < frames.length; i++) {
    const ts = typeof frames[i].timestamp === "number" ? frames[i].timestamp.toFixed(3) : String(i * 0.1);
    parts.push({ text: "--- Frame " + (i + 1) + "/" + frames.length + " (Time: " + ts + "s) ---" });

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

  return parts;
}

// Provider 1: Gemini (primary for video vision)
async function callGeminiVideoAnalysis(
  frames: Array<{ data: string; timestamp: number }>,
): Promise<string> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

  const parts = buildFrameParts(frames);

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

  return retryWithBackoff(async () => {
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
  }, "Gemini-Video");
}

// Provider 2: Mistral Pixtral (vision fallback for video frames)
async function callMistralVideoAnalysis(
  frames: Array<{ data: string; timestamp: number }>,
): Promise<string> {
  const apiKey = Deno.env.get("MISTRAL_API_KEY");
  if (!apiKey) throw new Error("MISTRAL_API_KEY not configured");

  const visionPrompt = buildVideoVisionPrompt();

  // Build content array with text + images
  const content: Array<{ type: string; text?: string; image_url?: { url: string } }> = [];
  content.push({ type: "text", text: visionPrompt });

  for (let i = 0; i < frames.length; i++) {
    const ts = typeof frames[i].timestamp === "number" ? frames[i].timestamp.toFixed(3) : String(i * 0.1);
    content.push({ type: "text", text: "--- Frame " + (i + 1) + "/" + frames.length + " (Time: " + ts + "s) ---" });

    let base64Data = frames[i].data;
    let frameMime = "image/jpeg";
    if (base64Data.startsWith("data:")) {
      const match = base64Data.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        frameMime = match[1];
        base64Data = match[2];
      }
    }
    const dataUrl = "data:" + frameMime + ";base64," + base64Data;
    content.push({ type: "image_url", image_url: { url: dataUrl } });
  }

  return retryWithBackoff(async () => {
    const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + apiKey,
      },
      body: JSON.stringify({
        model: "pixtral-large-latest",
        messages: [
          {
            role: "system",
            content: "You are a precise video physics analyzer. Watch the frames carefully. Track the moving object. Estimate physics values from visual context ONLY. Output valid JSON only.",
          },
          { role: "user", content },
        ],
        temperature: 0.2,
        max_tokens: 4000,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error("Mistral API error (" + res.status + "): " + err);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || "";
  }, "Mistral-Video");
}

// Provider 3: Groq Vision (fallback for video frames)
async function callGroqVideoAnalysis(
  frames: Array<{ data: string; timestamp: number }>,
): Promise<string> {
  const apiKey = Deno.env.get("GROQ_API_KEY");
  if (!apiKey) throw new Error("GROQ_API_KEY not configured");

  const visionPrompt = buildVideoVisionPrompt();

  // Groq vision supports single image; send the first and last frames with context
  const content: Array<{ type: string; text?: string; image_url?: { url: string } }> = [];
  content.push({ type: "text", text: visionPrompt + "\n\nNote: Showing key frames from the video." });

  // Send up to 4 evenly-spaced frames for Groq (limited vision context)
  const groqMaxFrames = Math.min(4, frames.length);
  const step = frames.length > 1 ? (frames.length - 1) / (groqMaxFrames - 1) : 0;
  for (let i = 0; i < groqMaxFrames; i++) {
    const idx = Math.round(i * step);
    const frame = frames[idx];
    const ts = typeof frame.timestamp === "number" ? frame.timestamp.toFixed(3) : String(idx * 0.1);
    content.push({ type: "text", text: "--- Frame " + (i + 1) + "/" + groqMaxFrames + " (Time: " + ts + "s) ---" });

    let base64Data = frame.data;
    let frameMime = "image/jpeg";
    if (base64Data.startsWith("data:")) {
      const match = base64Data.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        frameMime = match[1];
        base64Data = match[2];
      }
    }
    const dataUrl = "data:" + frameMime + ";base64," + base64Data;
    content.push({ type: "image_url", image_url: { url: dataUrl } });
  }

  return retryWithBackoff(async () => {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + apiKey,
      },
      body: JSON.stringify({
        model: "llama-3.2-90b-vision-preview",
        messages: [
          {
            role: "system",
            content: "You are a precise video physics analyzer. Watch the frames carefully. Track the moving object. Estimate physics values from visual context ONLY. Output valid JSON only.",
          },
          { role: "user", content },
        ],
        temperature: 0.2,
        max_tokens: 4000,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error("Groq API error (" + res.status + "): " + err);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || "";
  }, "Groq-Video");
}

// Stage 1: Analyze video with fallback chain Gemini -> Mistral -> Groq
async function analyzeVideoFrames(
  frames: Array<{ data: string; timestamp: number }>,
): Promise<{ response: string; provider: string }> {
  try {
    console.log("[video-analyze] Trying Gemini for video analysis...");
    const response = await callGeminiVideoAnalysis(frames);
    console.log("[video-analyze] Gemini video analysis succeeded, length:", response.length);
    return { response, provider: "Gemini" };
  } catch (err) {
    console.warn("[video-analyze] Gemini video analysis failed:", (err as Error).message);
  }

  try {
    console.log("[video-analyze] Falling back to Mistral Pixtral for video analysis...");
    const response = await callMistralVideoAnalysis(frames);
    console.log("[video-analyze] Mistral video analysis succeeded, length:", response.length);
    return { response, provider: "Mistral" };
  } catch (err) {
    console.warn("[video-analyze] Mistral video analysis failed:", (err as Error).message);
  }

  try {
    console.log("[video-analyze] Falling back to Groq Vision for video analysis...");
    const response = await callGroqVideoAnalysis(frames);
    console.log("[video-analyze] Groq video analysis succeeded, length:", response.length);
    return { response, provider: "Groq" };
  } catch (err) {
    console.warn("[video-analyze] Groq video analysis failed:", (err as Error).message);
  }

  throw new Error("All video analysis providers failed (Gemini, Mistral, Groq)");
}

// ── Stage 2 Providers: Solve physics from extracted data ──

function buildVideoSolvePrompt(extractedJson: string, lang: string): string {
  const isAr = lang === "ar";
  return [
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
}

async function callMistralSolve(extractedJson: string, lang: string): Promise<string> {
  const apiKey = Deno.env.get("MISTRAL_API_KEY");
  if (!apiKey) throw new Error("MISTRAL_API_KEY not configured");

  const solvePrompt = buildVideoSolvePrompt(extractedJson, lang);

  return retryWithBackoff(async () => {
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
  }, "Mistral-Solve");
}

async function callGroqSolve(extractedJson: string, lang: string): Promise<string> {
  const apiKey = Deno.env.get("GROQ_API_KEY");
  if (!apiKey) throw new Error("GROQ_API_KEY not configured");

  const solvePrompt = buildVideoSolvePrompt(extractedJson, lang);

  return retryWithBackoff(async () => {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + apiKey,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
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
      throw new Error("Groq API error (" + res.status + "): " + err);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || "";
  }, "Groq-Solve");
}

// Stage 2: Solve with fallback chain Mistral -> Groq
async function solvePhysics(
  extractedJson: string,
  lang: string,
): Promise<{ response: string; provider: string }> {
  try {
    console.log("[video-analyze] Trying Mistral for solving...");
    const response = await callMistralSolve(extractedJson, lang);
    console.log("[video-analyze] Mistral solving succeeded, length:", response.length);
    return { response, provider: "Mistral" };
  } catch (err) {
    console.warn("[video-analyze] Mistral solving failed:", (err as Error).message);
  }

  try {
    console.log("[video-analyze] Falling back to Groq for solving...");
    const response = await callGroqSolve(extractedJson, lang);
    console.log("[video-analyze] Groq solving succeeded, length:", response.length);
    return { response, provider: "Groq" };
  } catch (err) {
    console.warn("[video-analyze] Groq solving failed:", (err as Error).message);
  }

  throw new Error("All solving providers failed (Mistral, Groq)");
}

// ── Utilities ──

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

    // Limit frames to reduce token consumption
    const limitedFrames = limitFrames(frames);
    console.log("[video-analyze] Using " + limitedFrames.length + " frames (limited from " + frames.length + ")");

    // Stage 1: Vision analysis with fallback chain
    console.log("[video-analyze] Stage 1: Video analysis with fallback chain...");
    const extraction = await analyzeVideoFrames(limitedFrames);
    console.log("[video-analyze] Stage 1 complete via", extraction.provider);

    const visionData = parseJsonFromText(extraction.response);

    if (!(visionData as { detected?: boolean }).detected) {
      const noDetectReport = isAr
        ? "# \u0644\u0645 \u064a\u062a\u0645 \u0627\u0643\u062a\u0634\u0627\u0641 \u062d\u0631\u0643\u0629\n\n\u0644\u0645 \u064a\u062a\u0645 \u0627\u0644\u0639\u062b\u0648\u0631 \u0639\u0644\u0649 \u062c\u0633\u0645 \u0645\u062a\u062d\u0631\u0643 \u0641\u064a \u0627\u0644\u0641\u064a\u062f\u064a\u0648. \u062d\u0627\u0648\u0644 \u0631\u0641\u0639 \u0641\u064a\u062f\u064a\u0648 \u064a\u0638\u0647\u0631 \u0641\u064a\u0647 \u0645\u0642\u0630\u0648\u0641 \u0648\u0627\u0636\u062d."
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

    // Stage 2: Physics solving with fallback chain
    console.log("[video-analyze] Stage 2: Physics solving with fallback chain...");
    const solveInput = JSON.stringify({ velocity: v0, angle, height: h0, mass, gravity: g, objectType });
    const solution = await solvePhysics(solveInput, lang);
    console.log("[video-analyze] Stage 2 complete via", solution.provider);

    const computed = parseJsonFromText(solution.response);
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
      framesUsed: limitedFrames.length,
      framesReceived: frames.length,
      providers: { extraction: extraction.provider, solving: solution.provider },
    };

    // Build report
    const report = [
      "```json",
      JSON.stringify(finalJson, null, 2),
      "```",
      "",
      isAr ? "# APAS AI \u062a\u0642\u0631\u064a\u0631 \u062a\u062d\u0644\u064a\u0644 \u0627\u0644\u0641\u064a\u062f\u064a\u0648" : "# APAS AI Video Analysis Report",
      "",
      isAr ? "## \u0627\u0644\u0643\u0627\u0626\u0646 \u0627\u0644\u0645\u0643\u062a\u0634\u0641" : "## Detected Object",
      (isAr ? "\u0627\u0644\u0646\u0648\u0639: " : "Type: ") + "**" + objectType + "**",
      (isAr ? "\u0627\u0644\u0643\u062a\u0644\u0629: " : "Mass: ") + "**" + mass + "** kg",
      (isAr ? "\u0646\u0633\u0628\u0629 \u0627\u0644\u062b\u0642\u0629: " : "Confidence: ") + "**" + confidence + "%**",
      "",
      isAr ? "## \u0627\u0644\u0645\u0639\u0637\u064a\u0627\u062a \u0627\u0644\u0645\u0633\u062a\u062e\u0631\u062c\u0629" : "## Extracted Data",
      (isAr ? "\u0627\u0644\u0633\u0631\u0639\u0629 \u0627\u0644\u0627\u0628\u062a\u062f\u0627\u0626\u064a\u0629: " : "Initial velocity: ") + "**" + v0 + "** m/s",
      (isAr ? "\u0632\u0627\u0648\u064a\u0629 \u0627\u0644\u0625\u0637\u0644\u0627\u0642: " : "Launch angle: ") + "**" + angle + " deg**",
      (isAr ? "\u0627\u0631\u062a\u0641\u0627\u0639 \u0627\u0644\u0625\u0637\u0644\u0627\u0642: " : "Launch height: ") + "**" + h0 + "** m",
      "",
      isAr ? "## \u0627\u0644\u0646\u062a\u0627\u0626\u062c \u0627\u0644\u0645\u062d\u0633\u0648\u0628\u0629" : "## Computed Results",
      "v0x = " + v0x + " m/s",
      "v0y = " + v0y + " m/s",
      (isAr ? "\u0623\u0642\u0635\u0649 \u0627\u0631\u062a\u0641\u0627\u0639 = " : "Max height = ") + maxHeight + " m",
      (isAr ? "\u0627\u0644\u0645\u062f\u0649 = " : "Range = ") + maxRange + " m",
      (isAr ? "\u0632\u0645\u0646 \u0627\u0644\u0637\u064a\u0631\u0627\u0646 = " : "Time of flight = ") + totalTime + " s",
      (isAr ? "\u0633\u0631\u0639\u0629 \u0627\u0644\u0627\u0635\u0637\u062f\u0627\u0645 = " : "Impact velocity = ") + impactVelocity + " m/s",
    ];

    if (stepSolution) {
      report.push("", isAr ? "## \u0627\u0644\u062d\u0644 \u062e\u0637\u0648\u0629 \u0628\u062e\u0637\u0648\u0629" : "## Step-by-Step Solution", stepSolution);
    }

    report.push(
      "",
      isAr ? "## \u0627\u0644\u062a\u062d\u0642\u0642 \u0645\u0646 \u062d\u0641\u0638 \u0627\u0644\u0637\u0627\u0642\u0629" : "## Energy Conservation Check",
      (verification.verified ? "OK" : "WARNING") + ": " + verification.note,
      "",
      (isAr ? "\u0645\u0632\u0648\u062f\u0627\u062a \u0627\u0644\u0630\u0643\u0627\u0621 \u0627\u0644\u0627\u0635\u0637\u0646\u0627\u0639\u064a: " : "AI Providers: ") + "Extraction=" + extraction.provider + ", Solving=" + solution.provider,
      (isAr ? "\u0627\u0644\u0625\u0637\u0627\u0631\u0627\u062a: " : "Frames: ") + limitedFrames.length + "/" + frames.length + " used",
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
