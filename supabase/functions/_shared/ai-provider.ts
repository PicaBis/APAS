/**
 * Shared AI Provider with automatic fallback
 * Primary: Groq API
 * Fallback: Mistral AI API
 * 
 * Both APIs are OpenAI-compatible, so the same request/response format works.
 */

type ModelType = "chat" | "vision";

interface ProviderConfig {
  name: string;
  apiUrl: string;
  apiKey: string;
  models: Record<ModelType, string>;
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
    });
  }

  return providers;
}

/**
 * Non-streaming AI completion with automatic fallback.
 * Tries Groq first, then Mistral if Groq fails for any reason.
 */
export async function aiComplete(
  options: AIRequestOptions & { modelType: ModelType }
): Promise<{ text: string; provider: string }> {
  const providers = getProviders();
  if (providers.length === 0) throw new Error("No AI providers configured (set GROQ_API_KEY and/or MISTRAL_API_KEY)");

  for (const provider of providers) {
    try {
      const model = provider.models[options.modelType];
      console.log(`[AI] Trying ${provider.name} (${model})...`);

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
        continue; // Try next provider
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
 * Tries Groq first, then Mistral if Groq fails for any reason.
 * Returns the raw Response body stream (SSE format).
 */
export async function aiStream(
  options: AIRequestOptions & { modelType: ModelType }
): Promise<{ body: ReadableStream<Uint8Array>; provider: string }> {
  const providers = getProviders();
  if (providers.length === 0) throw new Error("No AI providers configured (set GROQ_API_KEY and/or MISTRAL_API_KEY)");

  for (const provider of providers) {
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
