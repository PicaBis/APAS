/**
 * Shared AI Provider — Multi-Provider Routing (Gemini, Groq, Mistral).
 * 
 * Optimized for APAS Elite Analysis System.
 */

export type ModelType = "chat" | "vision" | "math" | "subject" | "video";
export type Provider = "gemini" | "groq" | "mistral";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string | Array<{ 
    type: "text" | "image" | "image_url"; 
    text?: string; 
    image_url?: { url: string }; 
    inline_data?: { mime_type: string; data: string } 
  }>;
}

export interface AIRequestOptions {
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  provider?: Provider;
  modelType?: ModelType;
}

// ── Retry Utilities ──

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  label: string,
  maxRetries = 2,
  initialDelay = 1000,
): Promise<T> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err as Error;
      const isRetryable = lastError.message.includes("429") || lastError.message.includes("500") || lastError.message.includes("503");
      if (!isRetryable || attempt === maxRetries) throw lastError;
      const delay = initialDelay * Math.pow(2, attempt);
      console.log(`[Retry] ${label} failed, waiting ${delay}ms before retry ${attempt + 1}/${maxRetries}...`);
      await sleep(delay);
    }
  }
  throw lastError!;
}

// ── Provider: Gemini 2.0 Flash ──

async function callGemini(options: AIRequestOptions): Promise<string> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

  const contents = options.messages
    .filter(m => m.role !== "system")
    .map(m => {
      if (typeof m.content === "string") {
        return { role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] };
      }
      return {
        role: m.role === "assistant" ? "model" : "user",
        parts: m.content.map(p => {
          if (p.text) return { text: p.text };
          if (p.inline_data) return { inline_data: p.inline_data };
          if (p.type === "image" && p.inline_data) return { inline_data: p.inline_data };
          return null;
        }).filter(Boolean)
      };
    });

  const systemInstruction = options.messages.find(m => m.role === "system")?.content;

  return retryWithBackoff(async () => {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        systemInstruction: typeof systemInstruction === "string" ? { parts: [{ text: systemInstruction }] } : undefined,
        generationConfig: {
          temperature: options.temperature ?? 0.1,
          maxOutputTokens: options.max_tokens ?? 8000,
          responseMimeType: "application/json",
        }
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Gemini API error (${res.status}): ${err}`);
    }

    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  }, "Gemini");
}

// ── Provider: Groq (Llama 3.3) ──

async function callGroq(options: AIRequestOptions): Promise<string> {
  const apiKey = Deno.env.get("GROQ_API_KEY");
  if (!apiKey) throw new Error("GROQ_API_KEY not configured");

  const groqMessages = options.messages.map(msg => {
    if (typeof msg.content === "string") return msg;
    const text = msg.content.map(p => p.text || "").filter(Boolean).join("\n");
    return { role: msg.role, content: text };
  });

  return retryWithBackoff(async () => {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: groqMessages,
        temperature: options.temperature ?? 0.1,
        max_tokens: options.max_tokens ?? 4000,
        response_format: { type: "json_object" }
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Groq API error (${res.status}): ${err}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || "";
  }, "Groq");
}

// ── Public API ──

export async function aiComplete(
  options: AIRequestOptions,
): Promise<{ text: string; provider: string }> {
  const type = options.modelType || "chat";
  let provider = options.provider;

  if (!provider) {
    if (type === "vision" || type === "video" || type === "subject") provider = "gemini";
    else provider = "groq";
  }

  try {
    let text = "";
    if (provider === "gemini") text = await callGemini(options);
    else text = await callGroq(options);

    return { text, provider };
  } catch (err) {
    console.error(`[AI] Provider ${provider} failed:`, err);
    throw err;
  }
}

export async function aiStream(
  options: AIRequestOptions,
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
