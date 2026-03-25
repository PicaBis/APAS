/**
 * Shared AI Provider with automatic fallback.
 * Supports Gemini (native API), Groq, and Mistral (OpenAI-compatible).
 */

type ModelType = "chat" | "vision";

interface ProviderConfig {
  name: string;
  apiUrl: string;
  apiKey: string;
  models: Record<ModelType, string>;
  type: "openai" | "gemini";
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

function getProviders(): ProviderConfig[] {
  const providers: ProviderConfig[] = [];

  // Gemini — best for vision (native multimodal with high accuracy)
  const geminiKey = Deno.env.get("GEMINI_API_KEY");
  if (geminiKey) {
    providers.push({
      name: "Gemini",
      apiUrl: "https://generativelanguage.googleapis.com",
      apiKey: geminiKey,
      models: {
        chat: "gemini-2.5-flash",
        vision: "gemini-2.5-flash",
      },
      type: "gemini",
    });
  }

  const groqKey = Deno.env.get("GROQ_API_KEY");
  if (groqKey) {
    providers.push({
      name: "Groq",
      apiUrl: "https://api.groq.com/openai/v1/chat/completions",
      apiKey: groqKey,
      models: {
        chat: "llama-3.3-70b-versatile",
        vision: "meta-llama/llama-4-scout-17b-16e-instruct",
      },
      type: "openai",
    });
  }

  const mistralKey = Deno.env.get("MISTRAL_API_KEY");
  if (mistralKey) {
    providers.push({
      name: "Mistral",
      apiUrl: "https://api.mistral.ai/v1/chat/completions",
      apiKey: mistralKey,
      models: {
        chat: "mistral-large-latest",
        vision: "pixtral-large-latest",
      },
      type: "openai",
    });
  }

  return providers;
}

/**
 * Call Gemini's native generateContent API.
 * Converts OpenAI-style messages to Gemini format.
 */
async function callGemini(
  provider: ProviderConfig,
  model: string,
  messages: ChatMessage[],
  temperature: number,
  maxTokens: number,
): Promise<string> {
  const systemParts: string[] = [];
  // deno-lint-ignore no-explicit-any
  const contentParts: Array<Record<string, any>> = [];

  for (const msg of messages) {
    if (msg.role === "system") {
      systemParts.push(typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content));
      continue;
    }

    if (typeof msg.content === "string") {
      contentParts.push({ text: msg.content });
    } else if (Array.isArray(msg.content)) {
      for (const part of msg.content) {
        if (part.type === "text" && part.text) {
          contentParts.push({ text: part.text });
        } else if (part.type === "image_url" && part.image_url?.url) {
          const url = part.image_url.url;
          const dataMatch = url.match(/^data:([^;]+);base64,(.+)$/);
          if (dataMatch) {
            contentParts.push({
              inline_data: {
                mime_type: dataMatch[1],
                data: dataMatch[2],
              },
            });
          } else {
            contentParts.push({ text: `[Image URL: ${url}]` });
          }
        }
      }
    }
  }

  // deno-lint-ignore no-explicit-any
  const requestBody: Record<string, any> = {
    contents: [{ parts: contentParts }],
    generationConfig: {
      temperature,
      maxOutputTokens: maxTokens,
    },
  };

  if (systemParts.length > 0) {
    requestBody.systemInstruction = {
      parts: [{ text: systemParts.join("\n\n") }],
    };
  }

  const response = await fetch(
    `${provider.apiUrl}/v1beta/models/${model}:generateContent?key=${provider.apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
  if (!text) {
    throw new Error("Gemini returned empty response");
  }
  return text;
}

/**
 * Non-streaming AI completion with automatic fallback.
 * Tries each configured provider in order until one succeeds.
 */
export async function aiComplete(
  options: AIRequestOptions & { modelType: ModelType }
): Promise<{ text: string; provider: string }> {
  const providers = getProviders();
  if (providers.length === 0) throw new Error("No AI providers configured (set GEMINI_API_KEY, GROQ_API_KEY, and/or MISTRAL_API_KEY)");

  for (const provider of providers) {
    try {
      const model = provider.models[options.modelType];
      console.log(`[AI] Trying ${provider.name} (${model})...`);

      if (provider.type === "gemini") {
        const text = await callGemini(
          provider,
          model,
          options.messages,
          options.temperature ?? 0.4,
          options.max_tokens ?? 2000,
        );
        console.log(`[AI] ${provider.name} succeeded`);
        return { text, provider: provider.name };
      }

      // OpenAI-compatible providers (Groq, Mistral)
      const response = await fetch(provider.apiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${provider.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: options.messages,
          temperature: options.temperature ?? 0.4,
          max_tokens: options.max_tokens ?? 2000,
          stream: false,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[AI] ${provider.name} error ${response.status}: ${errorText}`);
        continue;
      }

      const data = await response.json();
      const text = data?.choices?.[0]?.message?.content || "";

      if (!text) {
        console.warn(`[AI] ${provider.name} returned empty response, trying next provider`);
        continue;
      }

      console.log(`[AI] ${provider.name} succeeded`);
      return { text, provider: provider.name };
    } catch (err) {
      console.error(`[AI] ${provider.name} request failed:`, err);
      continue;
    }
  }

  throw new Error("All AI providers failed");
}

/**
 * Streaming AI completion with automatic fallback.
 * Tries each configured provider in order until one succeeds.
 * Returns the raw Response body stream (SSE format).
 * Note: Gemini is skipped for streaming as it uses a different protocol.
 */
export async function aiStream(
  options: AIRequestOptions & { modelType: ModelType }
): Promise<{ body: ReadableStream<Uint8Array>; provider: string }> {
  const providers = getProviders();
  if (providers.length === 0) throw new Error("No AI providers configured (set GEMINI_API_KEY, GROQ_API_KEY, and/or MISTRAL_API_KEY)");

  for (const provider of providers) {
    // Skip Gemini for streaming — uses a different protocol
    if (provider.type === "gemini") continue;

    try {
      const model = provider.models[options.modelType];
      console.log(`[AI] Streaming: trying ${provider.name} (${model})...`);

      const response = await fetch(provider.apiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${provider.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: options.messages,
          temperature: options.temperature ?? 0.4,
          max_tokens: options.max_tokens ?? 2000,
          stream: true,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[AI] ${provider.name} streaming error ${response.status}: ${errorText}`);
        continue;
      }

      if (!response.body) {
        console.warn(`[AI] ${provider.name} returned no body, trying next provider`);
        continue;
      }

      console.log(`[AI] ${provider.name} streaming started`);
      return { body: response.body, provider: provider.name };
    } catch (err) {
      console.error(`[AI] ${provider.name} streaming request failed:`, err);
      continue;
    }
  }

  throw new Error("All AI providers failed");
}
