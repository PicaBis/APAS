/**
 * Shared AI Provider — Gemini (vision) + Mistral (logic/math) + Groq (fallback).
 *
 * Strategy:
 * - Vision tasks: Gemini 2.5 Flash (best for image/video understanding)
 * - Math/logic tasks: Mistral Large (best for mathematical reasoning & curve fitting)
 * - Chat fallback: Groq (fast inference for simple text tasks)
 */

type ModelType = "chat" | "vision" | "math";

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
      console.log(`[Retry] ${label} rate limited (429), waiting ${delay}ms before retry ${attempt + 1}/${maxRetries}...`);
      await sleep(delay);
    }
  }
  throw lastError!;
}

interface ChatMessage {
  role: string;
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
}

interface AIRequestOptions {
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
}

// ── Gemini API (Vision + Chat) ──

async function callGemini(
  messages: ChatMessage[],
  temperature = 0.3,
  maxTokens = 4000,
): Promise<string> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");

  const contents: Array<{ role: string; parts: Array<Record<string, unknown>> }> = [];
  let systemInstruction: string | undefined;

  for (const msg of messages) {
    if (msg.role === "system") {
      systemInstruction = typeof msg.content === "string" ? msg.content : "";
      continue;
    }

    const parts: Array<Record<string, unknown>> = [];

    if (typeof msg.content === "string") {
      parts.push({ text: msg.content });
    } else if (Array.isArray(msg.content)) {
      for (const part of msg.content) {
        if (part.type === "text" && part.text) {
          parts.push({ text: part.text });
        } else if (part.type === "image_url" && part.image_url?.url) {
          const url = part.image_url.url;
          const dataMatch = url.match(/^data:([^;]+);base64,(.+)$/);
          if (dataMatch) {
            parts.push({
              inline_data: { mime_type: dataMatch[1], data: dataMatch[2] },
            });
          } else {
            parts.push({ text: `[Image URL: ${url}]` });
          }
        }
      }
    }

    if (parts.length > 0) {
      contents.push({ role: msg.role === "assistant" ? "model" : "user", parts });
    }
  }

  const body: Record<string, unknown> = {
    contents,
    generationConfig: { temperature, maxOutputTokens: maxTokens },
  };

  if (systemInstruction) {
    body.systemInstruction = { parts: [{ text: systemInstruction }] };
  }

  const model = "gemini-2.5-flash";

  return retryWithBackoff(async () => {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
    );

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gemini API error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    const candidate = data.candidates?.[0];
    if (!candidate?.content?.parts?.length) {
      throw new Error("Gemini returned no content");
    }

    return candidate.content.parts.map((p: { text?: string }) => p.text || "").join("");
  }, "Gemini");
}

// ── Mistral API (Math/Logic) ──

async function callMistral(
  messages: ChatMessage[],
  temperature = 0.2,
  maxTokens = 4000,
): Promise<string> {
  const apiKey = Deno.env.get("MISTRAL_API_KEY");
  if (!apiKey) throw new Error("MISTRAL_API_KEY is not configured");

  const mistralMessages = messages.map((msg) => {
    if (typeof msg.content === "string") {
      return { role: msg.role, content: msg.content };
    }
    const textParts = (msg.content as Array<{ type: string; text?: string }>)
      .filter((p) => p.type === "text" && p.text)
      .map((p) => p.text)
      .join("\n");
    return { role: msg.role, content: textParts };
  });

  return retryWithBackoff(async () => {
    const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "mistral-large-latest",
        messages: mistralMessages,
        temperature,
        max_tokens: maxTokens,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Mistral API error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || "";
  }, "Mistral");
}

// ── Groq API (Fast fallback) ──

async function callGroq(
  messages: ChatMessage[],
  temperature = 0.3,
  maxTokens = 4000,
): Promise<string> {
  const apiKey = Deno.env.get("GROQ_API_KEY");
  if (!apiKey) throw new Error("GROQ_API_KEY is not configured");

  const groqMessages = messages.map((msg) => {
    if (typeof msg.content === "string") {
      return { role: msg.role, content: msg.content };
    }
    const textParts = (msg.content as Array<{ type: string; text?: string }>)
      .filter((p) => p.type === "text" && p.text)
      .map((p) => p.text)
      .join("\n");
    return { role: msg.role, content: textParts };
  });

  return retryWithBackoff(async () => {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: groqMessages,
        temperature,
        max_tokens: maxTokens,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Groq API error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || "";
  }, "Groq");
}

// ── Public API ──

/**
 * Non-streaming AI completion with provider fallback chain.
 * - vision: Gemini 1.5 Flash -> Mistral Large -> Groq Llama 3 (fallback)
 * - math: Mistral -> Gemini (fallback)
 * - chat: Groq -> Mistral (fallback)
 */
export async function aiComplete(
  options: AIRequestOptions & { modelType: ModelType },
): Promise<{ text: string; provider: string }> {
  const { modelType, messages, temperature, max_tokens } = options;

  if (modelType === "vision") {
    try {
      console.log("[AI] Trying Gemini 1.5 Flash for vision task...");
      const text = await callGemini(messages, temperature, max_tokens);
      console.log("[AI] Gemini succeeded, response length:", text.length);
      return { text, provider: "Gemini" };
    } catch (err) {
      console.warn("[AI] Gemini failed:", (err as Error).message);
    }
    try {
      console.log("[AI] Falling back to Mistral Large for vision...");
      const text = await callMistral(messages, temperature, max_tokens);
      return { text, provider: "Mistral" };
    } catch (err) {
      console.warn("[AI] Mistral failed:", (err as Error).message);
    }
    try {
      console.log("[AI] Falling back to Groq Llama 3...");
      const text = await callGroq(messages, temperature, max_tokens);
      return { text, provider: "Groq" };
    } catch (err) {
      console.warn("[AI] Groq failed:", (err as Error).message);
    }
    throw new Error("All vision providers failed (Gemini, Mistral, Groq)");
  }

  if (modelType === "math") {
    try {
      console.log("[AI] Trying Mistral for math task...");
      const text = await callMistral(messages, temperature, max_tokens);
      console.log("[AI] Mistral succeeded, response length:", text.length);
      return { text, provider: "Mistral" };
    } catch (err) {
      console.warn("[AI] Mistral failed:", (err as Error).message);
    }
    try {
      console.log("[AI] Falling back to Gemini for math...");
      const text = await callGemini(messages, temperature, max_tokens);
      return { text, provider: "Gemini" };
    } catch (err) {
      console.warn("[AI] Gemini failed for math:", (err as Error).message);
    }
    throw new Error("All math providers failed (Mistral, Gemini)");
  }

  // Chat: Groq primary
  try {
    console.log("[AI] Trying Groq for chat task...");
    const text = await callGroq(messages, temperature, max_tokens);
    return { text, provider: "Groq" };
  } catch (err) {
    console.warn("[AI] Groq failed:", (err as Error).message);
  }
  try {
    console.log("[AI] Falling back to Mistral for chat...");
    const text = await callMistral(messages, temperature, max_tokens);
    return { text, provider: "Mistral" };
  } catch (err) {
    console.warn("[AI] Mistral failed:", (err as Error).message);
  }
  throw new Error("All chat providers failed (Groq, Mistral)");
}

/**
 * Streaming AI completion — creates a single-chunk readable stream.
 */
export async function aiStream(
  options: AIRequestOptions & { modelType: ModelType },
): Promise<{ body: ReadableStream<Uint8Array>; provider: string }> {
  const { text, provider } = await aiComplete(options);
  const encoder = new TextEncoder();
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

/**
 * Direct Mistral call for mathematical verification and curve fitting.
 */
export async function mathVerify(
  prompt: string,
  temperature = 0.1,
): Promise<{ text: string; provider: string }> {
  const messages: ChatMessage[] = [
    {
      role: "system",
      content: `You are a computational physics engine. You ONLY perform mathematical calculations and curve fitting.
You receive raw data points and apply physics equations to derive precise values.
You NEVER guess or estimate — you COMPUTE.
Output ONLY the JSON result, no explanations.`,
    },
    { role: "user", content: prompt },
  ];
  return aiComplete({ modelType: "math", messages, temperature, max_tokens: 2000 });
}
