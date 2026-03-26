/**
 * Shared AI Provider — Groq EXCLUSIVE for all tasks.
 *
 * Strategy:
 * - Vision tasks: Groq Llama (exclusive)
 * - Math/logic tasks: Groq Llama (exclusive)
 * - Chat: Groq Llama (exclusive)
 *
 * No Mistral fallback — Groq only with retry + backoff.
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

// ── Groq API (EXCLUSIVE Provider) ──

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
 * Non-streaming AI completion — Groq EXCLUSIVE for all task types.
 * No fallback to other providers.
 */
export async function aiComplete(
  options: AIRequestOptions & { modelType: ModelType },
): Promise<{ text: string; provider: string }> {
  const { messages, temperature, max_tokens } = options;

  console.log("[AI] Using Groq (exclusive) for task...");
  const text = await callGroq(messages, temperature, max_tokens);
  console.log("[AI] Groq succeeded, response length:", text.length);
  return { text, provider: "Groq" };
}

/**
 * Streaming AI completion — Groq EXCLUSIVE.
 * Last resort: falls back to aiComplete-then-wrap if streaming fails.
 */
export async function aiStream(
  options: AIRequestOptions & { modelType: ModelType },
): Promise<{ body: ReadableStream<Uint8Array>; provider: string }> {
  const { messages, temperature = 0.3, max_tokens = 4000 } = options;

  // Prepare messages (strip image parts for text-only model)
  const textOnlyMessages = messages.map((msg) => {
    if (typeof msg.content === "string") return { role: msg.role, content: msg.content };
    const textParts = (msg.content as Array<{ type: string; text?: string }>)
      .filter((p) => p.type === "text" && p.text)
      .map((p) => p.text)
      .join("\n");
    return { role: msg.role, content: textParts };
  });

  const apiKey = Deno.env.get("GROQ_API_KEY");
  if (!apiKey) throw new Error("GROQ_API_KEY is not configured for streaming");

  try {
    console.log("[aiStream] Trying Groq streaming...");
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
      throw new Error(`Groq streaming failed (${res.status}): ${errText}`);
    }

    console.log("[aiStream] Groq streaming connected");
    return { body: res.body!, provider: "Groq" };
  } catch (err) {
    console.warn("[aiStream] Groq streaming error:", (err as Error).message);
  }

  // Last resort: fall back to non-streaming aiComplete, then wrap as SSE
  console.warn("[aiStream] Streaming failed, falling back to aiComplete + wrap");
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
 * Direct Groq call for mathematical verification and curve fitting.
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
