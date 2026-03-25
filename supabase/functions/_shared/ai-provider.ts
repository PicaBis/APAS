/**
 * Shared AI Provider — Devin AI API only.
 * Uses Devin session-based API for all AI completions.
 */

const DEVIN_API_BASE = "https://api.devin.ai";

type ModelType = "chat" | "vision";

interface ChatMessage {
  role: string;
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
}

interface AIRequestOptions {
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
}

/**
 * Upload a base64 image to Devin attachments API.
 */
async function uploadBase64Image(base64Data: string, mimeType: string, apiKey: string): Promise<string> {
  // Convert base64 to binary
  const binaryStr = atob(base64Data);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }

  const formData = new FormData();
  const ext = mimeType.includes("png") ? "png" : mimeType.includes("webp") ? "webp" : "jpg";
  formData.append("file", new Blob([bytes], { type: mimeType }), "image." + ext);

  const res = await fetch(DEVIN_API_BASE + "/v1/attachments", {
    method: "POST",
    headers: { Authorization: "Bearer " + apiKey },
    body: formData,
  });

  if (!res.ok) {
    throw new Error("Devin attachment upload failed (" + res.status + "): " + (await res.text()));
  }
  return (await res.text()).trim().replace(/^"|"$/g, "");
}

/**
 * Build a text prompt from OpenAI-style messages, uploading any images.
 */
async function buildPromptFromMessages(messages: ChatMessage[], apiKey: string): Promise<string> {
  const parts: string[] = [];

  for (const msg of messages) {
    if (typeof msg.content === "string") {
      if (msg.role === "system") {
        parts.push("SYSTEM INSTRUCTIONS:\n" + msg.content);
      } else {
        parts.push(msg.content);
      }
    } else if (Array.isArray(msg.content)) {
      for (const part of msg.content) {
        if (part.type === "text" && part.text) {
          parts.push(part.text);
        } else if (part.type === "image_url" && part.image_url?.url) {
          const url = part.image_url.url;
          const dataMatch = url.match(/^data:([^;]+);base64,(.+)$/);
          if (dataMatch) {
            try {
              const attachmentUrl = await uploadBase64Image(dataMatch[2], dataMatch[1], apiKey);
              parts.push('ATTACHMENT:"' + attachmentUrl + '"');
            } catch (err) {
              console.error("[AI] Failed to upload image attachment:", err);
              parts.push("[Image could not be uploaded]");
            }
          } else {
            parts.push('ATTACHMENT:"' + url + '"');
          }
        }
      }
    }
  }

  return parts.join("\n\n");
}

/**
 * Create a Devin session and poll until completion.
 */
async function callDevinSession(prompt: string, apiKey: string, maxWaitMs = 300000): Promise<string> {
  // Create session
  const createRes = await fetch(DEVIN_API_BASE + "/v1/sessions", {
    method: "POST",
    headers: { Authorization: "Bearer " + apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, idempotent: false }),
  });
  if (!createRes.ok) {
    throw new Error("Devin session creation failed (" + createRes.status + "): " + (await createRes.text()));
  }
  const sessionId = (await createRes.json()).session_id;
  console.log("[AI] Devin session created: " + sessionId);

  // Poll until complete
  const startTime = Date.now();
  while (Date.now() - startTime < maxWaitMs) {
    const pollRes = await fetch(DEVIN_API_BASE + "/v1/sessions/" + sessionId, {
      headers: { Authorization: "Bearer " + apiKey },
    });
    if (!pollRes.ok) {
      throw new Error("Devin session poll failed (" + pollRes.status + "): " + (await pollRes.text()));
    }
    const data = await pollRes.json();
    const status = data.status_enum || data.status;
    console.log("[AI] Devin session " + sessionId + " status: " + status);

    if (status === "finished" || status === "stopped" || status === "failed") {
      // Extract text from messages
      const messages = data.messages || [];
      let responseText = "";
      for (const m of messages) {
        if ((m.role === "devin" || m.role === "assistant") && m.content && m.content.length > responseText.length) {
          responseText = m.content;
        }
      }
      if (!responseText && data.structured_output) {
        responseText = JSON.stringify(data.structured_output);
      }
      if (!responseText) {
        throw new Error("Devin session completed but returned no output");
      }
      return responseText;
    }

    await new Promise((r) => setTimeout(r, 5000));
  }

  throw new Error("Devin session timed out after " + (maxWaitMs / 1000) + " seconds");
}

/**
 * Non-streaming AI completion using Devin API.
 */
export async function aiComplete(
  options: AIRequestOptions & { modelType: ModelType }
): Promise<{ text: string; provider: string }> {
  const apiKey = Deno.env.get("DEVIN_API_KEY");
  if (!apiKey) throw new Error("DEVIN_API_KEY is not configured");

  console.log("[AI] Using Devin AI API...");
  const prompt = await buildPromptFromMessages(options.messages, apiKey);
  const text = await callDevinSession(prompt, apiKey);
  console.log("[AI] Devin AI succeeded, response length: " + text.length);
  return { text, provider: "Devin AI" };
}

/**
 * Streaming AI completion — Devin API does not support streaming,
 * so this creates a single-chunk readable stream from the full response.
 */
export async function aiStream(
  options: AIRequestOptions & { modelType: ModelType }
): Promise<{ body: ReadableStream<Uint8Array>; provider: string }> {
  const { text, provider } = await aiComplete(options);
  const encoder = new TextEncoder();
  // Wrap in SSE format so consumers that parse "data: " lines can consume it
  const ssePayload = JSON.stringify({ choices: [{ delta: { content: text } }] });
  const sseFormatted = `data: ${ssePayload}\n\ndata: [DONE]\n\n`;
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(sseFormatted));
      controller.close();
    },
  });
  return { body, provider };
}
