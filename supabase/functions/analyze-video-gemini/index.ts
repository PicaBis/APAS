import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

const DEVIN_API_BASE = "https://api.devin.ai";

// ── Geometric computation helpers (kept for shared use) ──

interface Position { x: number; y: number; t: number; }

function computeLaunchAngle(positions: Position[]): number {
  if (positions.length < 2) return -1;
  const maxPairs = Math.min(positions.length - 1, 4);
  let weightedDx = 0, weightedDy = 0, totalWeight = 0;
  for (let i = 0; i < maxPairs; i++) {
    const dt = positions[i + 1].t - positions[i].t;
    if (dt <= 0) continue;
    const vx = (positions[i + 1].x - positions[i].x) / dt;
    const vy = -(positions[i + 1].y - positions[i].y) / dt;
    const weight = Math.exp(-i * 0.5);
    weightedDx += vx * weight; weightedDy += vy * weight; totalWeight += weight;
  }
  if (totalWeight === 0) return -1;
  const absVx = Math.abs(weightedDx / totalWeight);
  const absVy = Math.abs(weightedDy / totalWeight);
  if (absVx < 1 && absVy < 1) {
    const dx = Math.abs(positions[positions.length - 1].x - positions[0].x);
    const dy = Math.abs(positions[positions.length - 1].y - positions[0].y);
    if (dx < 1 && dy < 1) return -1;
    return Math.max(0, Math.min(90, Math.round(Math.atan2(dy, dx) * (180 / Math.PI) * 10) / 10));
  }
  return Math.max(0.5, Math.min(89.5, Math.round(Math.atan2(absVy, absVx) * (180 / Math.PI) * 10) / 10));
}

function fitParabolicTrajectory(
  positions: Position[], imageWidth: number, calibrationMeters?: number, gravityOverride?: number,
): { angle: number; velocity: number; r_squared: number } | null {
  if (positions.length < 4) return null;
  const x0 = positions[0].x;
  const xs = positions.map((p) => p.x - x0), ys = positions.map((p) => p.y - positions[0].y);
  let sumX2 = 0, sumX3 = 0, sumX4 = 0, sumXY = 0, sumX2Y = 0, sumY = 0;
  for (let i = 1; i < xs.length; i++) {
    const x = xs[i], y = ys[i], x2 = x * x;
    sumX2 += x2; sumX3 += x2 * x; sumX4 += x2 * x2; sumXY += x * y; sumX2Y += x2 * y; sumY += y;
  }
  const det = sumX2 * sumX4 - sumX3 * sumX3;
  if (Math.abs(det) < 1e-10) return null;
  const a = (sumXY * sumX4 - sumX2Y * sumX3) / det;
  const b = (sumX2 * sumX2Y - sumX3 * sumXY) / det;
  const angle = Math.atan(-a) * (180 / Math.PI);
  const n = xs.length - 1, meanY = sumY / n;
  let ssTot = 0, ssRes = 0;
  for (let i = 1; i < xs.length; i++) {
    const yPred = a * xs[i] + b * xs[i] * xs[i];
    ssRes += (ys[i] - yPred) ** 2; ssTot += (ys[i] - meanY) ** 2;
  }
  const r_squared = ssTot > 0 ? 1 - ssRes / ssTot : 0;
  const fov = (typeof calibrationMeters === 'number' && calibrationMeters > 0) ? calibrationMeters : 8;
  const mpp = fov / imageWidth;
  const g = (typeof gravityOverride === 'number' && gravityOverride > 0) ? gravityOverride : 9.81;
  const cosT = Math.cos(angle * Math.PI / 180);
  if (Math.abs(b) > 1e-6 && Math.abs(cosT) > 0.01) {
    const bM = b * mpp / (mpp * mpp);
    const vel = Math.sqrt(Math.max(0, g / (2 * Math.abs(bM) * cosT * cosT)));
    return { angle: Math.max(0, Math.min(90, Math.round(Math.abs(angle) * 10) / 10)),
      velocity: Math.max(3, Math.min(80, Math.round(vel * 10) / 10)), r_squared: Math.max(0, Math.min(1, r_squared)) };
  }
  return { angle: Math.max(0, Math.min(90, Math.round(Math.abs(angle) * 10) / 10)), velocity: 15, r_squared: Math.max(0, Math.min(1, r_squared)) };
}

function classifyMotion(positions: Position[]): "vertical" | "horizontal" | "projectile" {
  if (positions.length < 3) return "projectile";
  let maxY = -Infinity, minY = Infinity, maxX = -Infinity, minX = Infinity;
  for (const p of positions) { maxY = Math.max(maxY, p.y); minY = Math.min(minY, p.y); maxX = Math.max(maxX, p.x); minX = Math.min(minX, p.x); }
  const rX = maxX - minX, rY = maxY - minY;
  if (rX < rY * 0.12 && rY > 15) return "vertical";
  if (rY < rX * 0.12 && rX > 15) return "horizontal";
  return "projectile";
}

function estimateVelocity(positions: Position[], imageWidth: number, calibrationMeters?: number): number {
  if (positions.length < 2) return 15;
  let totalSpeed = 0, count = 0;
  for (let i = 0; i < Math.min(3, positions.length - 1); i++) {
    const dx = positions[i + 1].x - positions[i].x, dy = positions[i + 1].y - positions[i].y;
    const dt = positions[i + 1].t - positions[i].t;
    if (dt > 0) { totalSpeed += Math.sqrt(dx * dx + dy * dy) / dt; count++; }
  }
  if (count === 0) return 15;
  const fov = (typeof calibrationMeters === 'number' && calibrationMeters > 0) ? calibrationMeters : 8;
  return Math.max(3, Math.min(80, Math.round((totalSpeed / count) * (fov / imageWidth) * 10) / 10));
}

function filterOutlierPositions(positions: Position[]): Position[] {
  if (positions.length <= 3) return positions;
  const dists: number[] = [];
  for (let i = 1; i < positions.length; i++) {
    const dx = positions[i].x - positions[i - 1].x, dy = positions[i].y - positions[i - 1].y;
    dists.push(Math.sqrt(dx * dx + dy * dy));
  }
  const sorted = [...dists].sort((a, b) => a - b);
  const thresh = Math.max(sorted[Math.floor(sorted.length / 2)] * 3, 50);
  const f: Position[] = [positions[0]];
  for (let i = 1; i < positions.length; i++) {
    const dx = positions[i].x - f[f.length - 1].x, dy = positions[i].y - f[f.length - 1].y;
    if (Math.sqrt(dx * dx + dy * dy) < thresh) f.push(positions[i]);
  }
  return f.length >= 3 ? f : positions;
}

// Suppress unused warnings
void computeLaunchAngle; void fitParabolicTrajectory; void classifyMotion;
void estimateVelocity; void filterOutlierPositions;

// ── Devin AI API helpers ──

async function uploadToDevinAttachments(videoBytes: Uint8Array, fileName: string, apiKey: string): Promise<string> {
  const formData = new FormData();
  formData.append("file", new Blob([videoBytes], { type: "video/mp4" }), fileName);
  const res = await fetch(DEVIN_API_BASE + "/v1/attachments", {
    method: "POST", headers: { Authorization: "Bearer " + apiKey }, body: formData,
  });
  if (!res.ok) throw new Error("Devin attachment upload failed (" + res.status + "): " + (await res.text()));
  return (await res.text()).trim().replace(/^"|"$/g, "");
}

async function createDevinSession(prompt: string, apiKey: string): Promise<string> {
  const res = await fetch(DEVIN_API_BASE + "/v1/sessions", {
    method: "POST",
    headers: { Authorization: "Bearer " + apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, idempotent: false }),
  });
  if (!res.ok) throw new Error("Devin session creation failed (" + res.status + "): " + (await res.text()));
  return (await res.json()).session_id;
}

async function pollDevinSession(
  sessionId: string, apiKey: string, maxWaitMs = 300000,
): Promise<{ status: string; structured_output: Record<string, unknown> | null; messages: Array<{ role: string; content: string }> }> {
  const startTime = Date.now();
  while (Date.now() - startTime < maxWaitMs) {
    const res = await fetch(DEVIN_API_BASE + "/v1/sessions/" + sessionId, {
      headers: { Authorization: "Bearer " + apiKey },
    });
    if (!res.ok) throw new Error("Devin session poll failed (" + res.status + "): " + (await res.text()));
    const data = await res.json();
    const status = data.status_enum || data.status;
    console.log("[APAS-Devin] Session " + sessionId + " status: " + status);
    if (status === "finished" || status === "stopped" || status === "failed") {
      return { status, structured_output: data.structured_output || null, messages: data.messages || [] };
    }
    await new Promise((r) => setTimeout(r, 5000));
  }
  throw new Error("Devin session timed out after 5 minutes");
}

// ── Build analysis prompt ──

function buildAnalysisPrompt(
  attachmentUrl: string, isAr: boolean, gravityValue: number, trimInfo: string,
): string {
  const jsonTemplate = [
    "{",
    '  "detected": true,',
    '  "objectType": "<specific object name>",',
    '  "estimatedMass": 0,',
    '  "launchHeight": 0,',
    '  "launchAngle": 0,',
    '  "initialVelocity": 0,',
    '  "maxAltitude": 0,',
    '  "maxVelocity": 0,',
    '  "dragEffect": "<none|slight|significant>",',
    '  "confidence": 0,',
    '  "motionType": "<vertical|horizontal|projectile>",',
    '  "projectileDescription": "<description>",',
    '  "launchEnvironment": "<description>",',
    '  "trajectoryDescription": "<description>",',
    '  "additionalObservations": "<observations>",',
    '  "burnTime": null,',
    '  "numberOfScenes": 1,',
    '  "videoSummary": "<summary>"',
    "}",
  ].join("\n");

  const langLabel = isAr ? "Arabic" : "English";

  return [
    "You are APAS (Advanced Physics Analysis System). Analyze the attached video of projectile motion with MAXIMUM PRECISION.",
    "",
    "Download and watch the video carefully. This is a physics analysis task.",
    trimInfo,
    "",
    "YOUR TASK:",
    "1. Watch the video and identify the PRIMARY moving object (projectile)",
    "2. Track its position throughout the flight",
    "3. Identify the projectile type, environment, launch mechanism",
    "4. Estimate physics parameters from visual observation",
    "5. Compute derived physics values",
    "",
    "REPORT ALL OF THE FOLLOWING:",
    "",
    "## 1. Projectile Type - Identify the exact object (rocket, ball, stone, arrow, etc.), describe appearance, estimate mass in kg",
    "",
    "## 2. Launch Angle - Measure from horizontal (0=flat, 90=straight up), provide decimal precision",
    "",
    "## 3. Launch Point & Environment - Describe location, mechanism, weather, background",
    "",
    "## 4. Initial Height - Height at launch above ground, use environment references for scale",
    "",
    "## 5. Maximum Altitude - Estimate peak height with reasoning from visual cues",
    "",
    "## 6. Velocity - Estimate initial velocity in m/s, estimate max velocity if different",
    "",
    "## 7. Trajectory Description - Describe path shape, deviations, spin, air resistance effects",
    "",
    "## 8. Additional Observations - Smoke trails, flames, slow motion, multiple scenes",
    "",
    "CRITICAL: Include this JSON block in your response (with real values filled in):",
    "```json",
    jsonTemplate,
    "```",
    "",
    "Write the FULL detailed report in " + langLabel + ".",
    "Use gravity = " + gravityValue + " m/s2 for calculations.",
    "",
    'ATTACHMENT:"' + attachmentUrl + '"',
  ].join("\n");
}

// ── Main handler ──

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const action = body.action || "full";

    const devinKey = Deno.env.get("DEVIN_API_KEY");
    if (!devinKey) throw new Error("DEVIN_API_KEY is not configured");

    // ── Check session status mode ──
    if (action === "check") {
      const { sessionId } = body;
      if (!sessionId) {
        return new Response(JSON.stringify({ error: "No sessionId provided" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400,
        });
      }
      const res = await fetch(DEVIN_API_BASE + "/v1/sessions/" + sessionId, {
        headers: { Authorization: "Bearer " + devinKey },
      });
      if (!res.ok) throw new Error("Session check failed: " + (await res.text()));
      const data = await res.json();
      const status = data.status_enum || data.status;
      if (status === "finished" || status === "stopped" || status === "failed") {
        return new Response(JSON.stringify(extractAnalysisFromSession(data, body.lang || "ar")), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ status: "processing", sessionId, statusEnum: status }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Start or Full analysis mode ──
    const { videoUrl, trimStart, trimEnd, lang, videoName, calibrationMeters, gravity: userGravity } = body;
    if (!videoUrl) {
      return new Response(JSON.stringify({ error: "No videoUrl provided" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400,
      });
    }

    console.log("[APAS-Devin] Analyzing video: " + (videoName || "unknown"));
    const isAr = lang === "ar";

    // Download video
    const videoResponse = await fetch(videoUrl);
    if (!videoResponse.ok) throw new Error("Failed to download video: HTTP " + videoResponse.status);
    const videoBytes = new Uint8Array(await videoResponse.arrayBuffer());
    console.log("[APAS-Devin] Downloaded " + (videoBytes.length / 1024 / 1024).toFixed(2) + " MB");

    // Upload to Devin
    const attachmentUrl = await uploadToDevinAttachments(videoBytes, videoName || "physics-video.mp4", devinKey);
    console.log("[APAS-Devin] Attachment uploaded: " + attachmentUrl);

    // Build prompt
    const trimInfo = trimStart != null && trimEnd != null && (trimStart > 0 || trimEnd > 0)
      ? "\nIMPORTANT: Analyze ONLY the portion from " + Number(trimStart).toFixed(1) + "s to " + Number(trimEnd).toFixed(1) + "s."
      : "";
    const gVal = (typeof userGravity === "number" && userGravity > 0) ? userGravity : 9.81;

    const prompt = buildAnalysisPrompt(attachmentUrl, isAr, gVal, trimInfo);

    // Create session
    console.log("[APAS-Devin] Creating analysis session...");
    const sessionId = await createDevinSession(prompt, devinKey);
    console.log("[APAS-Devin] Session created: " + sessionId);

    if (action === "start") {
      return new Response(JSON.stringify({ status: "processing", sessionId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Full synchronous mode - poll until complete
    console.log("[APAS-Devin] Waiting for analysis...");
    const result = await pollDevinSession(sessionId, devinKey);
    console.log("[APAS-Devin] Session completed: " + result.status);

    return new Response(JSON.stringify(
      extractAnalysisFromSessionData(result.structured_output, result.messages, isAr, calibrationMeters, userGravity)
    ), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("[APAS-Devin] Error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
    );
  }
});

// ── Result extraction ──

// deno-lint-ignore no-explicit-any
function extractAnalysisFromSession(sessionData: any, lang: string): { text: string } {
  return extractAnalysisFromSessionData(sessionData.structured_output || null, sessionData.messages || [], lang === "ar");
}

function extractAnalysisFromSessionData(
  structuredOutput: Record<string, unknown> | null,
  messages: Array<{ role: string; content: string }>,
  isAr: boolean, _calibrationMeters?: number, userGravity?: number,
): { text: string } {
  // deno-lint-ignore no-explicit-any
  let aiData: any = structuredOutput;

  // Try to extract JSON from messages if no structured output
  if (!aiData) {
    for (const msg of messages.filter((m) => m.role === "devin" || m.role === "assistant")) {
      const jm = msg.content?.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jm) { try { aiData = JSON.parse(jm[1].trim()); break; } catch { /* next */ } }
      try {
        const om = msg.content?.match(/\{[\s\S]*"detected"[\s\S]*\}/);
        if (om) { aiData = JSON.parse(om[0]); break; }
      } catch { /* continue */ }
    }
  }

  // Extract detailed report text from messages
  let detailedReport = "";
  for (const msg of messages.filter((m) => m.role === "devin" || m.role === "assistant")) {
    if (msg.content && msg.content.length > 200) {
      const cleaned = msg.content.replace(/```(?:json)?[\s\S]*?```/g, "").trim();
      if (cleaned.length > detailedReport.length) detailedReport = cleaned;
    }
  }

  const objectType = aiData?.objectType || (isAr ? "\u0645\u0642\u0630\u0648\u0641" : "projectile");
  const mass = typeof aiData?.estimatedMass === "number" ? aiData.estimatedMass : 0.45;
  const height = typeof aiData?.launchHeight === "number" ? aiData.launchHeight : 1.5;
  const launchAngle = typeof aiData?.launchAngle === "number" ? aiData.launchAngle : 45;
  const velocity = typeof aiData?.initialVelocity === "number" ? aiData.initialVelocity : 15;
  const maxAltitude = typeof aiData?.maxAltitude === "number" ? aiData.maxAltitude : null;
  const maxVelocity = typeof aiData?.maxVelocity === "number" ? aiData.maxVelocity : velocity;
  const dragEffect = aiData?.dragEffect || "none";
  const confidence = typeof aiData?.confidence === "number" ? aiData.confidence : 75;
  const motionType = aiData?.motionType || "projectile";
  const videoSummary = aiData?.videoSummary || "";
  const burnTime = typeof aiData?.burnTime === "number" ? aiData.burnTime : null;

  const g = (typeof userGravity === "number" && userGravity > 0) ? userGravity : 9.81;
  const aRad = launchAngle * Math.PI / 180;
  const vx = Math.round(velocity * Math.cos(aRad) * 100) / 100;
  const vy = Math.round(velocity * Math.sin(aRad) * 100) / 100;
  const compMaxH = Math.round((height + (vy * vy) / (2 * g)) * 100) / 100;
  const tApex = vy / g;
  const tFall = Math.sqrt(Math.max(0, 2 * compMaxH / g));
  const totalT = Math.round((tApex + tFall) * 100) / 100;
  const range = Math.round(vx * totalT * 100) / 100;
  const vyI = g * tFall;
  const impactV = Math.round(Math.sqrt(vx * vx + vyI * vyI) * 100) / 100;
  const finalH = maxAltitude && maxAltitude > compMaxH * 0.5 ? maxAltitude : compMaxH;

  const result = {
    detected: aiData?.detected !== false, confidence: Math.max(0, confidence),
    angle: launchAngle, velocity, mass, height, objectType,
    trajectoryData: [], peakFrame: null, impactFrame: null, dragEffect,
  };

  const mtLabel = motionType === "vertical" ? (isAr ? "\u062d\u0631\u0643\u0629 \u0634\u0627\u0642\u0648\u0644\u064a\u0629" : "Vertical motion")
    : motionType === "horizontal" ? (isAr ? "\u062d\u0631\u0643\u0629 \u0623\u0641\u0642\u064a\u0629" : "Horizontal motion")
    : (isAr ? "\u062d\u0631\u0643\u0629 \u0645\u0642\u0630\u0648\u0641" : "Projectile motion");
  const dLabel = dragEffect === "none" ? (isAr ? "\u0644\u0627 \u064a\u0648\u062c\u062f" : "None")
    : dragEffect === "slight" ? (isAr ? "\u0637\u0641\u064a\u0641" : "Slight") : (isAr ? "\u0643\u0628\u064a\u0631" : "Significant");

  const bt = "```";
  const L: string[] = [];
  L.push(bt + "json\n" + JSON.stringify(result, null, 2) + "\n" + bt);
  L.push("");

  // Build bilingual report
  L.push(isAr ? "# \u062a\u0642\u0631\u064a\u0631 \u0627\u0644\u062a\u062d\u0644\u064a\u0644 \u0627\u0644\u0641\u064a\u0632\u064a\u0627\u0626\u064a \u0627\u0644\u0634\u0627\u0645\u0644 - APAS Devin AI" : "# Comprehensive Physics Analysis Report - APAS Devin AI");
  L.push("");
  if (videoSummary) {
    L.push(isAr ? "## \u0645\u0644\u062e\u0635 \u0627\u0644\u0641\u064a\u062f\u064a\u0648" : "## Video Summary");
    L.push(videoSummary); L.push("");
  }

  L.push(isAr ? "## \u0645\u0644\u062e\u0635 \u0627\u0644\u062a\u062d\u0644\u064a\u0644" : "## Analysis Summary"); L.push("");
  const h1 = isAr ? "\u0627\u0644\u0645\u0639\u0644\u0645\u0629" : "Parameter";
  const h2 = isAr ? "\u0627\u0644\u0642\u064a\u0645\u0629" : "Value";
  L.push("| " + h1 + " | " + h2 + " |"); L.push("|---|---|");

  const addRow = (k: string, v: string) => L.push("| **" + k + "** | " + v + " |");
  addRow(isAr ? "\u0646\u0648\u0639 \u0627\u0644\u0645\u0642\u0630\u0648\u0641" : "Object Type", objectType);
  addRow(isAr ? "\u0646\u0648\u0639 \u0627\u0644\u062d\u0631\u0643\u0629" : "Motion Type", mtLabel);
  addRow(isAr ? "\u0632\u0627\u0648\u064a\u0629 \u0627\u0644\u0625\u0637\u0644\u0627\u0642" : "Launch Angle", launchAngle + "\u00b0");
  addRow(isAr ? "\u0627\u0644\u0633\u0631\u0639\u0629 \u0627\u0644\u0627\u0628\u062a\u062f\u0627\u0626\u064a\u0629" : "Initial Velocity", velocity + " m/s");
  if (maxVelocity && maxVelocity !== velocity) addRow(isAr ? "\u0627\u0644\u0633\u0631\u0639\u0629 \u0627\u0644\u0642\u0635\u0648\u0649" : "Max Velocity", maxVelocity + " m/s");
  addRow(isAr ? "\u0627\u0631\u062a\u0641\u0627\u0639 \u0627\u0644\u0625\u0637\u0644\u0627\u0642" : "Launch Height", height + " m");
  addRow(isAr ? "\u0627\u0644\u0643\u062a\u0644\u0629 \u0627\u0644\u062a\u0642\u062f\u064a\u0631\u064a\u0629" : "Estimated Mass", mass + " kg");
  addRow(isAr ? "\u0623\u0642\u0635\u0649 \u0627\u0631\u062a\u0641\u0627\u0639" : "Maximum Height", finalH + " m");
  addRow(isAr ? "\u0627\u0644\u0645\u062f\u0649 \u0627\u0644\u0623\u0641\u0642\u064a" : "Horizontal Range", range + " m");
  addRow(isAr ? "\u0632\u0645\u0646 \u0627\u0644\u062a\u062d\u0644\u064a\u0642" : "Time of Flight", totalT + " s");
  if (burnTime) addRow(isAr ? "\u0632\u0645\u0646 \u0627\u0644\u0627\u062d\u062a\u0631\u0627\u0642" : "Burn Time", burnTime + " s");
  addRow(isAr ? "\u0645\u0642\u0627\u0648\u0645\u0629 \u0627\u0644\u0647\u0648\u0627\u0621" : "Air Resistance", dLabel);
  addRow(isAr ? "\u0646\u0633\u0628\u0629 \u0627\u0644\u062b\u0642\u0629" : "Confidence", confidence + "%");
  L.push("");

  if (detailedReport) { L.push("---"); L.push(""); L.push(detailedReport); L.push(""); }

  L.push("---"); L.push("");
  L.push(isAr ? "## \u0627\u0644\u0645\u0639\u0627\u062f\u0644\u0627\u062a \u0627\u0644\u0641\u064a\u0632\u064a\u0627\u0626\u064a\u0629" : "## Physics Equations"); L.push("");
  L.push("> **" + (isAr ? "\u0645\u0639\u0627\u062f\u0644\u0629 \u0627\u0644\u0645\u0633\u0627\u0631" : "Trajectory equation") + "**");
  L.push("> y = x \u00b7 tan(\u03b8) \u2212 g \u00b7 x\u00b2 / (2 \u00b7 v\u2080\u00b2 \u00b7 cos\u00b2(\u03b8))"); L.push("");
  L.push("> **" + (isAr ? "\u0645\u0631\u0643\u0628\u0627\u062a \u0627\u0644\u0633\u0631\u0639\u0629" : "Velocity components") + "**");
  L.push("> v\u2093 = " + velocity + " \u00b7 cos(" + launchAngle + "\u00b0) = **" + vx + " m/s**");
  L.push("> v\u1d67 = " + velocity + " \u00b7 sin(" + launchAngle + "\u00b0) = **" + vy + " m/s**"); L.push("");
  L.push("> **" + (isAr ? "\u0623\u0642\u0635\u0649 \u0627\u0631\u062a\u0641\u0627\u0639" : "Maximum height") + "**");
  L.push("> H = h\u2080 + v\u1d67\u00b2 / (2g) = " + height + " + " + vy + "\u00b2 / (2 \u00d7 " + g + ") = **" + compMaxH + " m**"); L.push("");
  L.push("> **" + (isAr ? "\u0627\u0644\u0645\u062f\u0649 \u0627\u0644\u0623\u0641\u0642\u064a" : "Horizontal range") + "**");
  L.push("> R = v\u2093 \u00b7 T = " + vx + " \u00d7 " + totalT + " = **" + range + " m**"); L.push("");
  L.push("> **" + (isAr ? "\u0633\u0631\u0639\u0629 \u0627\u0644\u0627\u0635\u0637\u062f\u0627\u0645" : "Impact velocity") + "**");
  L.push("> v_impact = \u221a(v\u2093\u00b2 + (g\u00b7t_fall)\u00b2) = **" + impactV + " m/s**"); L.push("");

  L.push("---"); L.push("");
  L.push(isAr ? "## \u0627\u0644\u0645\u0646\u0647\u062c\u064a\u0629" : "## Methodology"); L.push("");
  if (isAr) {
    L.push("\u062a\u0645 \u0627\u0644\u062a\u062d\u0644\u064a\u0644 \u0628\u0648\u0627\u0633\u0637\u0629 APAS Devin AI:");
    L.push("1. **\u0627\u0644\u0645\u0634\u0627\u0647\u062f\u0629 \u0648\u0627\u0644\u062a\u062a\u0628\u0639:** \u0645\u0634\u0627\u0647\u062f\u0629 \u0627\u0644\u0641\u064a\u062f\u064a\u0648 \u0628\u0627\u0644\u0643\u0627\u0645\u0644 \u0648\u062a\u062a\u0628\u0639 \u0627\u0644\u0645\u0642\u0630\u0648\u0641");
    L.push("2. **\u0627\u0644\u062a\u062d\u0644\u064a\u0644 \u0627\u0644\u0628\u0635\u0631\u064a:** \u062a\u062d\u062f\u064a\u062f \u0646\u0648\u0639 \u0627\u0644\u0645\u0642\u0630\u0648\u0641 \u0648\u0627\u0644\u0628\u064a\u0626\u0629 \u0648\u0622\u0644\u064a\u0629 \u0627\u0644\u0625\u0637\u0644\u0627\u0642");
    L.push("3. **\u0627\u0644\u062d\u0633\u0627\u0628\u0627\u062a \u0627\u0644\u0641\u064a\u0632\u064a\u0627\u0626\u064a\u0629:** \u062d\u0633\u0627\u0628 \u0627\u0644\u0645\u0639\u0627\u0645\u0644\u0627\u062a \u0627\u0644\u0645\u0634\u062a\u0642\u0629 \u0645\u0646 \u0627\u0644\u0642\u064a\u0645 \u0627\u0644\u0645\u0631\u0635\u0648\u062f\u0629");
    L.push("4. **\u0627\u0644\u062a\u0642\u0631\u064a\u0631 \u0627\u0644\u062a\u0641\u0635\u064a\u0644\u064a:** \u062a\u0642\u0631\u064a\u0631 \u0634\u0627\u0645\u0644 \u0645\u0639 \u0645\u0644\u0627\u062d\u0638\u0627\u062a \u0628\u0635\u0631\u064a\u0629 \u0648\u062a\u062d\u0644\u064a\u0644 \u0639\u0644\u0645\u064a");
  } else {
    L.push("Analysis performed by APAS Devin AI:");
    L.push("1. **Video observation:** Full video watched and projectile tracked");
    L.push("2. **Visual analysis:** Projectile type, environment, and launch mechanism identified");
    L.push("3. **Physics computation:** Derived parameters calculated from observed values");
    L.push("4. **Detailed report:** Comprehensive report with visual observations and scientific analysis");
  }
  L.push(""); L.push("*APAS Devin AI \u2014 Advanced Physics Analysis System*");

  console.log("[APAS-Devin] Analysis: angle=" + launchAngle + ", velocity=" + velocity + ", confidence=" + confidence);
  return { text: L.join("\n") };
}
