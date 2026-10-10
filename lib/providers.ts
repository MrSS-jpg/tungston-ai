// Every provider below is reached through the same two functions —
// streamCompletion() and generateImage() — so swapping the backend the
// app runs on is a one-line env var change (AI_PROVIDER), not a rewrite.

export type WireMessage = {
  role: "user" | "assistant" | "system";
  content: string;
  attachments?: { mimeType: string; fileUri?: string; dataUrl?: string }[];
};

export type StreamCompletionOptions = {
  userTier?: "guest" | "authenticated";
  modelOverride?: string;
};

let PROVIDER = (process.env.AI_PROVIDER || "groq").toLowerCase();
if (PROVIDER === "gemini") PROVIDER = "groq";
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

// ---------- Any OpenAI-compatible provider (Groq, Nara, OpenRouter, Cerebras, Mistral) ----------

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
  cfg: {
    baseUrl: string;
    apiKey: string | undefined;
    model: string;
    extraHeaders?: Record<string, string>;
    fallbackModels?: string[];
  }
) {
  if (!cfg.apiKey) throw new Error(`${PROVIDER.toUpperCase()}_API_KEY is not set`);
  const wire = system ? [{ role: "system" as const, content: system }, ...messages] : messages;

  const candidateModels = [cfg.model, ...(cfg.fallbackModels || [])];
  let lastErr = "";
  let activeRes: Response | null = null;

  for (const modelToTry of candidateModels) {
    try {
      const res = await fetch(cfg.baseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${cfg.apiKey}`,
          ...cfg.extraHeaders,
        },
        body: JSON.stringify({ model: modelToTry, stream: true, messages: toOpenAIMessages(wire) }),
      });

      if (res.ok && res.body) {
        activeRes = res;
        break;
      }

      const errText = await res.text();
      lastErr = `${PROVIDER} error ${res.status}: ${errText}`;

      // Catch model 404 or 400 decommissioned/unavailable errors and seamlessly try next model
      const isModelError =
        res.status === 404 ||
        (res.status === 400 && (
          errText.includes("model_decommissioned") ||
          errText.includes("decommissioned") ||
          errText.includes("model_not_found") ||
          errText.includes("does not exist") ||
          errText.includes("no longer supported")
        ));

      if (isModelError) {
        continue;
      }

      // For hard auth or quota errors (401, 429), fail immediately
      throw new Error(lastErr);
    } catch (e: any) {
      if (e.message && (e.message.includes("404") || e.message.includes("decommissioned"))) continue;
      throw e;
    }
  }

  if (!activeRes || !activeRes.body) {
    throw new Error(lastErr || `${PROVIDER} could not establish a stream with any requested model.`);
  }

  return textStream((controller) =>
    pipeSSE(activeRes!.body!, controller, (json) => json?.choices?.[0]?.delta?.content)
  );
}

// ---------- Public entry points ----------

export async function streamCompletion(
  messages: WireMessage[],
  system?: string,
  options?: StreamCompletionOptions
): Promise<ReadableStream<Uint8Array>> {
  const isAuth = options?.userTier === "authenticated";

  switch (PROVIDER) {
    case "groq": {
      // Production-ready Groq model list:
      // llama-3.3-70b-versatile is the guaranteed active flagship.
      // llama-3.1-8b-instant, gemma2-9b-it, qwen-2.5-32b as robust alternatives.
      const guestFallbacks = [
        "llama-3.3-70b-versatile",
        "llama-3.1-8b-instant",
        "gemma2-9b-it",
      ];
      const authFallbacks = [
        "llama-3.3-70b-versatile",
        "qwen-2.5-32b",
        "openai/gpt-oss-20b",
        "gemma2-9b-it",
      ];

      const primaryGuest = process.env.GROQ_GUEST_MODEL || process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
      const primaryAuth = process.env.GROQ_AUTH_MODEL || process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

      const chosenModel = options?.modelOverride || (isAuth ? primaryAuth : primaryGuest);
      const fallbacks = (isAuth ? authFallbacks : guestFallbacks).filter((m) => m !== chosenModel);

      return streamOpenAICompatible(messages, system, {
        baseUrl: "https://api.groq.com/openai/v1/chat/completions",
        apiKey: process.env.GROQ_API_KEY,
        model: chosenModel,
        fallbackModels: fallbacks,
      });
    }
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
        model: isAuth
          ? (options?.modelOverride || process.env.OPENROUTER_AUTH_MODEL || "openai/gpt-oss-20b")
          : (process.env.OPENROUTER_GUEST_MODEL || "meta-llama/llama-3.1-8b-instruct:free"),
        extraHeaders: { "HTTP-Referer": process.env.APP_URL || "https://tungston.ai", "X-Title": "Tungston AI" },
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
      throw new Error(`Unknown AI_PROVIDER "${PROVIDER}". Use groq, nara, openrouter, cerebras, or mistral.`);
  }
}

export async function generateImage(prompt: string): Promise<string[]> {
  throw new Error("Image generation is not supported natively by the current provider setup.");
}

export const supportsNativeFiles = false;
export const currentProvider = PROVIDER;

const CONTEXT_WINDOWS: Record<string, number> = {
  groq: 128_000,
  nara: 128_000,
  openrouter: 128_000,
  cerebras: 128_000,
  mistral: 128_000,
};
export const contextWindowTokens = Number(process.env.CONTEXT_WINDOW_TOKENS) || CONTEXT_WINDOWS[PROVIDER] || 128_000;
