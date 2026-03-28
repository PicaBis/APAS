/**
 * Shared AI Provider — Multi-Provider Routing (Gemini, Groq, Mistral).
 * 
 * Optimized Strategy:
 * - Vision/Video: Gemini 2.0 Flash (Best spatial reasoning)
 * - Text/Subject: Groq Llama 3.3 70B (Fastest reasoning)
 * - Fallback: Mistral Large
 */

export type ModelType = "chat" | "vision" | "math" | "subject" | "video";
export type Provider = "gemini" | "groq" | "mistral";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string | Array<{ type: string; text?: string; image_url?: { url: string }; inline_data?: { mime_type: string; data: string } }>;
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

// ── Provider: Gemini (Google AI) ──

async function callGemini(options: AIRequestOptions): Promise<string> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

  // Convert messages to Gemini format
  const contents = options.messages
    .filter(m => m.role !== "system")
    .map(m => {
      if (typeof m.content === "string") {
        return { role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] };
      }
      return {
        role: m.role === "assistant" ? "model" : "user",
        parts: m.content.map(p => {
          if (p.type === "text") return { text: p.text };
          if (p.inline_data) return { inline_data: p.inline_data };
          if (p.image_url) {
             // We'd need to fetch the image and convert to base64 if it's a URL
             // For now, assume vision tasks use inline_data (base64)
             return { text: "[Image URL not supported directly in Gemini helper yet]" };
          }
          return { text: "" };
        })
      };
    });

  const systemInstruction = options.messages.find(m => m.role === "system")?.content;

  return retryWithBackoff(async () => {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
        generationConfig: {
          temperature: options.temperature ?? 0.2,
          maxOutputTokens: options.max_tokens ?? 4000,
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

  // Groq only supports text for Llama 3.3
  const groqMessages = options.messages.map(msg => {
    if (typeof msg.content === "string") return msg;
    const text = msg.content.filter(p => p.type === "text").map(p => p.text).join("\n");
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

// ── Provider: Mistral ──

async function callMistral(options: AIRequestOptions): Promise<string> {
  const apiKey = Deno.env.get("MISTRAL_API_KEY");
  if (!apiKey) throw new Error("MISTRAL_API_KEY not configured");

  return retryWithBackoff(async () => {
    const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: options.modelType === "vision" || options.modelType === "video" ? "pixtral-large-latest" : "mistral-large-latest",
        messages: options.messages,
        temperature: options.temperature ?? 0.3,
        max_tokens: options.max_tokens ?? 4000,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Mistral API error (${res.status}): ${err}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || "";
  }, "Mistral");
}

// ── Public API ──

export async function aiComplete(
  options: AIRequestOptions,
): Promise<{ text: string; provider: string }> {
  const type = options.modelType || "chat";
  let provider = options.provider;

  // Auto-routing based on type if no provider specified
  if (!provider) {
    if (type === "vision" || type === "video") provider = "gemini";
    else if (type === "subject" || type === "math") provider = "groq";
    else provider = "groq"; // Default to Groq for chat/speed
  }

  try {
    let text = "";
    if (provider === "gemini") text = await callGemini(options);
    else if (provider === "groq") text = await callGroq(options);
    else text = await callMistral(options);

    return { text, provider };
  } catch (err) {
    console.error(`[AI] Provider ${provider} failed:`, err);
    // Fallback chain
    if (provider !== "mistral") {
      console.log("[AI] Falling back to Mistral...");
      const text = await callMistral(options);
      return { text, provider: "Mistral (fallback)" };
    }
    throw err;
  }
}

export async function aiStream(
  options: AIRequestOptions,
): Promise<{ body: ReadableStream<Uint8Array>; provider: string }> {
  // Simple SSE wrapper for non-streaming providers or when streaming is complex
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

export async function mathVerify(prompt: string): Promise<{ text: string; provider: string }> {
  return aiComplete({
    modelType: "math",
    messages: [
      { role: "system", content: "You are a physics math engine. Output ONLY JSON." },
      { role: "user", content: prompt }
    ]
  });
}
