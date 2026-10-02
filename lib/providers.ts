// Every provider below is reached through the same two functions —
// streamCompletion() and generateImage() — so swapping the backend the
// app runs on is a one-line env var change (AI_PROVIDER), not a rewrite.

export type WireMessage = {
  role: "user" | "assistant" | "system";
  content: string;
  attachments?: { mimeType: string; fileUri?: string; dataUrl?: string }[];
};

const PROVIDER = (process.env.AI_PROVIDER || "nara").toLowerCase();
const encoder = new TextEncoder();

function textStream(pull: (controller: ReadableStreamDefaultController<Uint8Array>) => Promise<void>) {
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        await pull(controller);
      } catch (err) {
        controller.enqueue(encoder.encode(`\n\n[stream error: ${(err as Error).message}]`));
      } finally {
        controller.close();
      }
    },
  });
}

// Minimal SSE parser
async function pipeSSE(
  body: ReadableStream<Uint8Array>,
  controller: ReadableStreamDefaultController<Uint8Array>,
  parseDelta: (json: any) => string | undefined
) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ") || line === "data: [DONE]") continue;
      try {
        const data = JSON.parse(line.slice(6));
        const delta = parseDelta(data);
        if (delta) controller.enqueue(encoder.encode(delta));
      } catch (e) {
        // ignore parse error for chunk
      }
    }
  }
}

// ---------- Any OpenAI-compatible provider (Nara, OpenRouter, Groq, Cerebras, Mistral) ----------

function toOpenAIMessages(messages: WireMessage[]) {
  return messages.map((m) => {
    const imageAttachments = (m.attachments ?? []).filter((a) => a.dataUrl && a.mimeType.startsWith("image/"));
    if (!imageAttachments.length) return { role: m.role, content: m.content };
    return {
      role: m.role,
      content: [
        ...(m.content ? [{ type: "text", text: m.content }] : []),
        ...imageAttachments.map((a) => ({ type: "image_url", image_url: { url: a.dataUrl } })),
      ],
    };
  });
}

async function streamOpenAICompatible(
  messages: WireMessage[],
  system: string | undefined,
  cfg: { baseUrl: string; apiKey: string | undefined; model: string; extraHeaders?: Record<string, string> }
) {
  if (!cfg.apiKey) throw new Error(`${PROVIDER.toUpperCase()}_API_KEY is not set`);
  const wire = system ? [{ role: "system" as const, content: system }, ...messages] : messages;

  const res = await fetch(cfg.baseUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cfg.apiKey}`,
      ...cfg.extraHeaders,
    },
    body: JSON.stringify({ model: cfg.model, stream: true, messages: toOpenAIMessages(wire) }),
  });
  if (!res.ok || !res.body) throw new Error(`${PROVIDER} error ${res.status}: ${await res.text()}`);

  return textStream((controller) =>
    pipeSSE(res.body!, controller, (json) => json?.choices?.[0]?.delta?.content)
  );
}

// ---------- Public entry points ----------

export async function streamCompletion(messages: WireMessage[], system?: string): Promise<ReadableStream<Uint8Array>> {
  switch (PROVIDER) {
    case "nara":
      return streamOpenAICompatible(messages, system, {
        baseUrl: "https://router.bynara.id/v1/chat/completions",
        apiKey: process.env.NARA_API_KEY || process.env.NARA_ROUTER_API_KEY,
        model: process.env.NARA_MODEL || "agnes-2.5-flash",
      });
    case "openrouter":
      return streamOpenAICompatible(messages, system, {
        baseUrl: "https://openrouter.ai/api/v1/chat/completions",
        apiKey: process.env.OPENROUTER_API_KEY,
        model: process.env.OPENROUTER_MODEL || "google/gemini-3.1-flash",
        extraHeaders: { "HTTP-Referer": process.env.APP_URL || "https://tungston.ai", "X-Title": "Tungston AI" },
      });
    case "groq":
      return streamOpenAICompatible(messages, system, {
        baseUrl: "https://api.groq.com/openai/v1/chat/completions",
        apiKey: process.env.GROQ_API_KEY,
        model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
      });
    case "cerebras":
      return streamOpenAICompatible(messages, system, {
        baseUrl: "https://api.cerebras.ai/v1/chat/completions",
        apiKey: process.env.CEREBRAS_API_KEY,
        model: process.env.CEREBRAS_MODEL || "llama-3.3-70b",
      });
    case "mistral":
      return streamOpenAICompatible(messages, system, {
        baseUrl: "https://api.mistral.ai/v1/chat/completions",
        apiKey: process.env.MISTRAL_API_KEY,
        model: process.env.MISTRAL_MODEL || "mistral-large-latest",
      });
    default:
      throw new Error(`Unknown AI_PROVIDER "${PROVIDER}". Use nara, openrouter, groq, cerebras, or mistral.`);
  }
}

export async function generateImage(prompt: string): Promise<string[]> {
  throw new Error("Image generation is not supported natively by the current provider setup.");
}

export const supportsNativeFiles = false;
export const currentProvider = PROVIDER;

const CONTEXT_WINDOWS: Record<string, number> = {
  nara: 128_000,
  openrouter: 128_000,
  groq: 128_000,
  cerebras: 128_000,
  mistral: 128_000,
};
export const contextWindowTokens = Number(process.env.CONTEXT_WINDOW_TOKENS) || CONTEXT_WINDOWS[PROVIDER] || 128_000;
