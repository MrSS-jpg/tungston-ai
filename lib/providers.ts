// Every provider below is reached through the same two functions —
// streamCompletion() and generateImage() — so swapping the backend the
// app runs on is a one-line env var change (AI_PROVIDER), not a rewrite.

export type WireMessage = {
  role: "user" | "assistant" | "system";
  content: string;
  attachments?: { mimeType: string; fileUri?: string; dataUrl?: string }[];
};

const PROVIDER = (process.env.AI_PROVIDER || "gemini").toLowerCase();
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

/** Reads an upstream SSE ("data: {...}") body and forwards a plaintext delta for each chunk. */
async function pipeSSE(
  body: ReadableStream<Uint8Array>,
  controller: ReadableStreamDefaultController<Uint8Array>,
  extractDelta: (json: any) => string | undefined
) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trim();
      if (payload === "[DONE]") continue;
      try {
        const delta = extractDelta(JSON.parse(payload));
        if (delta) controller.enqueue(encoder.encode(delta));
      } catch {
        // ignore partial/non-JSON keep-alive lines
      }
    }
  }
}

// ---------- Gemini (default: native files, native image gen, 1M context) ----------

function toGeminiContents(messages: WireMessage[]) {
  return messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [
        ...(m.content ? [{ text: m.content }] : []),
        ...(m.attachments ?? []).map((a) =>
          a.fileUri
            ? { fileData: { fileUri: a.fileUri, mimeType: a.mimeType } }
            : { inlineData: { mimeType: a.mimeType, data: (a.dataUrl ?? "").split(",")[1] ?? "" } }
        ),
      ],
    }));
}

async function streamGemini(messages: WireMessage[], system?: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
  const model = process.env.GEMINI_MODEL || "gemini-3.1-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: toGeminiContents(messages),
      ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
      generationConfig: { temperature: 0.7 },
    }),
  });
  if (!res.ok || !res.body) throw new Error(`Gemini error ${res.status}: ${await res.text()}`);

  return textStream((controller) =>
    pipeSSE(res.body!, controller, (json) => json?.candidates?.[0]?.content?.parts?.[0]?.text)
  );
}

async function generateImageGemini(prompt: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
  const model = process.env.GEMINI_IMAGE_MODEL || "gemini-3.1-flash-image";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }] }),
  });
  if (!res.ok) throw new Error(`Gemini image error ${res.status}: ${await res.text()}`);
  const json = await res.json();
  const parts: any[] = json?.candidates?.[0]?.content?.parts ?? [];
  const images = parts
    .filter((p) => p.inlineData?.data)
    .map((p) => `data:${p.inlineData.mimeType};base64,${p.inlineData.data}`);
  if (!images.length) throw new Error("No image returned by Gemini");
  return images;
}

// ---------- Any OpenAI-compatible provider (OpenRouter, Groq, Cerebras, Mistral) ----------

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

async function generateImageOpenRouter(prompt: string) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not set");
  const model = process.env.OPENROUTER_IMAGE_MODEL || "google/gemini-3.1-flash-image";
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }], modalities: ["image", "text"] }),
  });
  if (!res.ok) throw new Error(`OpenRouter image error ${res.status}: ${await res.text()}`);
  const json = await res.json();
  const images: string[] =
    json?.choices?.[0]?.message?.images?.map((i: any) => i.image_url?.url).filter(Boolean) ?? [];
  if (!images.length) throw new Error("No image returned by OpenRouter");
  return images;
}

// ---------- Bytez (best-effort: catalog/schema varies per model, no native streaming here) ----------

async function streamBytez(messages: WireMessage[], system?: string) {
  const apiKey = process.env.BYTEZ_API_KEY;
  const model = process.env.BYTEZ_MODEL;
  if (!apiKey || !model) throw new Error("BYTEZ_API_KEY and BYTEZ_MODEL must both be set");
  const wire = system ? [{ role: "system" as const, content: system }, ...messages] : messages;

  const res = await fetch(`https://api.bytez.com/models/v2/${model}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Key ${apiKey}` },
    body: JSON.stringify({ messages: wire.map((m) => ({ role: m.role, content: m.content })) }),
  });
  if (!res.ok) throw new Error(`Bytez error ${res.status}: ${await res.text()}`);
  const json = await res.json();
  const text: string = json?.output?.content ?? json?.output ?? JSON.stringify(json);
  return textStream(async (controller) => controller.enqueue(encoder.encode(text)));
}

// Explorium is a B2B contact/company data-enrichment API, not a chat model host —
// it has no chat completion endpoint, so it's intentionally not wired up here.

// ---------- Public entry points ----------

export async function streamCompletion(messages: WireMessage[], system?: string): Promise<ReadableStream<Uint8Array>> {
  switch (PROVIDER) {
    case "gemini":
      return streamGemini(messages, system);
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
    case "bytez":
      return streamBytez(messages, system);
    default:
      throw new Error(`Unknown AI_PROVIDER "${PROVIDER}". Use gemini, openrouter, groq, cerebras, mistral, or bytez.`);
  }
}

export async function generateImage(prompt: string): Promise<string[]> {
  if (PROVIDER === "gemini") return generateImageGemini(prompt);
  if (PROVIDER === "openrouter") return generateImageOpenRouter(prompt);
  throw new Error("Image generation needs AI_PROVIDER=gemini or AI_PROVIDER=openrouter.");
}

export const supportsNativeFiles = PROVIDER === "gemini";
export const currentProvider = PROVIDER;

// Rough context ceilings per provider, used only to drive the UI's usage gauge.
// Override with CONTEXT_WINDOW_TOKENS if a specific model differs.
const CONTEXT_WINDOWS: Record<string, number> = {
  gemini: 1_048_576,
  openrouter: 128_000,
  groq: 128_000,
  cerebras: 128_000,
  mistral: 128_000,
  bytez: 32_000,
};
export const contextWindowTokens = Number(process.env.CONTEXT_WINDOW_TOKENS) || CONTEXT_WINDOWS[PROVIDER] || 128_000;
