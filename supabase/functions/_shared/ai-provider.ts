/**
 * Shared AI Provider — Groq (vision + chat) + Mistral (logic/math).
 *
 * Strategy:
 * - Vision tasks: Groq Llama 3 (primary) -> Mistral (fallback)
 * - Math/logic tasks: Mistral Large (primary) -> Groq (fallback)
 * - Chat: Groq (primary) -> Mistral (fallback)
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
 * - vision: Groq Llama 3 (primary) -> Mistral (fallback)
 * - math: Mistral (primary) -> Groq (fallback)
 * - chat: Groq (primary) -> Mistral (fallback)
 */
export async function aiComplete(
  options: AIRequestOptions & { modelType: ModelType },
): Promise<{ text: string; provider: string }> {
  const { modelType, messages, temperature, max_tokens } = options;

  if (modelType === "vision") {
    try {
      console.log("[AI] Trying Groq Llama 3 for vision task...");
      const text = await callGroq(messages, temperature, max_tokens);
      console.log("[AI] Groq succeeded, response length:", text.length);
      return { text, provider: "Groq" };
    } catch (err) {
      console.warn("[AI] Groq failed:", (err as Error).message);
    }
    try {
      console.log("[AI] Falling back to Mistral for vision...");
      const text = await callMistral(messages, temperature, max_tokens);
      return { text, provider: "Mistral" };
    } catch (err) {
      console.warn("[AI] Mistral failed:", (err as Error).message);
    }
    throw new Error("All vision providers failed (Groq, Mistral)");
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
      console.log("[AI] Falling back to Groq for math...");
      const text = await callGroq(messages, temperature, max_tokens);
      return { text, provider: "Groq" };
    } catch (err) {
      console.warn("[AI] Groq failed for math:", (err as Error).message);
    }
    throw new Error("All math providers failed (Mistral, Groq)");
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
 * Streaming AI completion — pipes real SSE stream from provider to client.
 * Falls back through providers: Groq (primary) -> Mistral (fallback).
 * Last resort: falls back to aiComplete-then-wrap if all streaming attempts fail.
 */
export async function aiStream(
  options: AIRequestOptions & { modelType: ModelType },
): Promise<{ body: ReadableStream<Uint8Array>; provider: string }> {
  const { messages, temperature = 0.3, max_tokens = 4000, modelType } = options;

  // Prepare messages for each provider (strip image parts for text-only providers)
  const textOnlyMessages = messages.map((msg) => {
    if (typeof msg.content === "string") return { role: msg.role, content: msg.content };
    const textParts = (msg.content as Array<{ type: string; text?: string }>)
      .filter((p) => p.type === "text" && p.text)
      .map((p) => p.text)
      .join("\n");
    return { role: msg.role, content: textParts };
  });

  // Determine provider order based on model type
  const providers = modelType === "math"
    ? ["mistral", "groq"] as const
    : ["groq", "mistral"] as const;

  for (const providerName of providers) {
    try {
      if (providerName === "groq") {
        const apiKey = Deno.env.get("GROQ_API_KEY");
        if (!apiKey) { console.warn("[aiStream] GROQ_API_KEY not set, skipping"); continue; }

        console.log(`[aiStream] Trying Groq streaming...`);
        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: textOnlyMessages,
            temperature,
            max_tokens,
            stream: true,
          }),
        });

        if (!res.ok) {
          const errText = await res.text();
          console.warn(`[aiStream] Groq streaming failed (${res.status}): ${errText}`);
          continue;
        }

        console.log("[aiStream] Groq streaming connected");
        return { body: res.body!, provider: "Groq" };
      }

      if (providerName === "mistral") {
        const apiKey = Deno.env.get("MISTRAL_API_KEY");
        if (!apiKey) { console.warn("[aiStream] MISTRAL_API_KEY not set, skipping"); continue; }

        console.log(`[aiStream] Trying Mistral streaming...`);
        const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: "mistral-large-latest",
            messages: textOnlyMessages,
            temperature,
            max_tokens,
            stream: true,
          }),
        });

        if (!res.ok) {
          const errText = await res.text();
          console.warn(`[aiStream] Mistral streaming failed (${res.status}): ${errText}`);
          continue;
        }

        console.log("[aiStream] Mistral streaming connected");
        return { body: res.body!, provider: "Mistral" };
      }
    } catch (err) {
      console.warn(`[aiStream] ${providerName} streaming error:`, (err as Error).message);
    }
  }

  // Last resort: fall back to non-streaming aiComplete, then wrap as SSE
  console.warn("[aiStream] All streaming providers failed, falling back to aiComplete + wrap");
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
