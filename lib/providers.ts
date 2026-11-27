import { getPrioritizedKeys, markKeyThrottled } from "./groqPool";

export type WireMessage = {
  role: "user" | "assistant" | "system";
  content: string;
  attachments?: { mimeType: string; fileUri?: string; dataUrl?: string }[];
};

export type StreamCompletionOptions = {
  userTier?: "guest" | "authenticated";
  modelOverride?: string;
  byokApiKey?: string;
  byokProvider?: string;
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
      } catch {
        // ignore malformed partial SSE chunk
      }
    }
  }
}

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
    apiKeys?: string[];
    model: string;
    extraHeaders?: Record<string, string>;
    fallbackModels?: string[];
  }
) {
  const candidateKeys = cfg.apiKeys && cfg.apiKeys.length > 0 ? cfg.apiKeys : cfg.apiKey ? [cfg.apiKey] : [];
  if (!candidateKeys.length) throw new Error(`${PROVIDER.toUpperCase()}_API_KEY is not set`);
  const wire = system ? [{ role: "system" as const, content: system }, ...messages] : messages;

  const candidateModels = [cfg.model, ...(cfg.fallbackModels || [])];
  let lastErr = "";
  let activeRes: Response | null = null;

  for (const modelToTry of candidateModels) {
    for (const keyToTry of candidateKeys) {
      try {
        const res = await fetch(cfg.baseUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${keyToTry}`,
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

        const isModelError =
          res.status === 404 ||
          (res.status === 400 &&
            (errText.includes("model_decommissioned") ||
              errText.includes("decommissioned") ||
              errText.includes("model_not_found") ||
              errText.includes("does not exist") ||
              errText.includes("not found") ||
              errText.includes("no longer supported") ||
              (errText.includes("model") &&
                (errText.includes("access") || errText.includes("unknown") || errText.includes("invalid")))));

        if (isModelError) {
          break;
        }

        if (res.status === 429) {
          markKeyThrottled(keyToTry, 60_000);
          continue;
        }

        if (res.status === 401) {
          markKeyThrottled(keyToTry, 3_600_000);
          continue;
        }

        throw new Error(lastErr);
      } catch (e: any) {
        if (
          e.message &&
          (e.message.includes("404") ||
            e.message.includes("decommissioned") ||
            e.message.includes("not exist") ||
            e.message.includes("model_not_found"))
        )
          break;
        continue;
      }
    }
    if (activeRes) break;
  }

  if (!activeRes || !activeRes.body) {
    throw new Error(lastErr || `${PROVIDER} could not establish a stream with any requested model or key.`);
  }

  return textStream((controller) =>
    pipeSSE(activeRes!.body!, controller, (json) => json?.choices?.[0]?.delta?.content)
  );
}

// ---------- Model Normalization (Live Active Groq Catalog) ----------

const MODEL_ALIASES: Record<string, string> = {
  "qwen-2.5-72b": "qwen/qwen3.8-27b",
  "qwen-27b": "qwen/qwen3.8-27b",
  "qwen/qwen3.8-27b": "qwen/qwen3.8-27b",
  "llama-3.3-70b": "openai/gpt-oss-120b",
  "llama-3.3-70b-versatile": "openai/gpt-oss-120b",
  "gpt-120b": "openai/gpt-oss-120b",
  "openai/gpt-oss-120b": "openai/gpt-oss-120b",
  "gpt-20b": "openai/gpt-oss-20b",
  "openai/gpt-oss-20b": "openai/gpt-oss-20b",
};

const ACTIVE_GROQ_MODELS = ["openai/gpt-oss-20b", "qwen/qwen3.8-27b", "openai/gpt-oss-120b"];

export function resolveGroqModel(requested?: string, fallback = "qwen/qwen3.8-27b"): string {
  if (!requested) return fallback;
  const trimmed = requested.trim();
  if (MODEL_ALIASES[trimmed]) return MODEL_ALIASES[trimmed];
  if (ACTIVE_GROQ_MODELS.includes(trimmed)) return trimmed;
  return fallback;
}

/**
 * Uses ultra-fast Groq 20B to rewrite a conversational prompt into a sharp web search query.
 * Falls back immediately to a sanitized direct prompt on timeout or missing key.
 */
export async function formulateSearchQuery(
  userPrompt: string,
  history: WireMessage[] = [],
  byokApiKey?: string
): Promise<string> {
  const cleanDirect = userPrompt.replace(/^\/search\s+/i, "").trim().slice(0, 280);
  if (cleanDirect.length <= 4) return cleanDirect;

  const keys = byokApiKey ? [byokApiKey] : getPrioritizedKeys();
  if (!keys.length) return cleanDirect;

  const recentUserCtx = history
    .filter((m) => m.role === "user")
    .slice(-3, -1)
    .map((m) => m.content.slice(0, 120))
    .join(" | ");

  const today = new Date().toISOString().slice(0, 10);

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${keys[0]}`,
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-20b",
        temperature: 0.1,
        max_tokens: 64,
        messages: [
          {
            role: "system",
            content:
              `Convert the user prompt into a concise web search engine query (3 to 9 words, no quotes, no explanation). Current date: ${today}. ` +
              (recentUserCtx ? `Prior topic context: ${recentUserCtx}` : ""),
          },
          { role: "user", content: cleanDirect },
        ],
      }),
      signal: AbortSignal.timeout(2500),
    });

    if (res.ok) {
      const json: any = await res.json();
      const refined = json?.choices?.[0]?.message?.content?.trim().replace(/^["']|["']$/g, "");
      if (refined && refined.length >= 3 && refined.length <= 200) {
        return refined;
      }
    }
  } catch {
    // Silent fallback to direct clean prompt
  }

  return cleanDirect;
}

export async function streamCompletion(
  messages: WireMessage[],
  system?: string,
  options?: StreamCompletionOptions
): Promise<ReadableStream<Uint8Array>> {
  const isAuth = options?.userTier === "authenticated";
  const byokKey = options?.byokApiKey?.trim();
  const byokProvider = (options?.byokProvider || "groq").toLowerCase();

  if (byokKey) {
    if (byokProvider === "openrouter") {
      return streamOpenAICompatible(messages, system, {
        baseUrl: "https://openrouter.ai/api/v1/chat/completions",
        apiKey: byokKey,
        model: options?.modelOverride || "meta-llama/llama-3.1-8b-instruct:free",
        extraHeaders: { "HTTP-Referer": "https://tungston-hazel.vercel.app", "X-Title": "Tungston AI" },
      });
    }
    if (byokProvider === "cerebras") {
      return streamOpenAICompatible(messages, system, {
        baseUrl: "https://api.cerebras.ai/v1/chat/completions",
        apiKey: byokKey,
        model: options?.modelOverride || "llama-3.3-70b",
      });
    }
    const chosenModel = resolveGroqModel(options?.modelOverride, isAuth ? "qwen/qwen3.8-27b" : "openai/gpt-oss-20b");
    return streamOpenAICompatible(messages, system, {
      baseUrl: "https://api.groq.com/openai/v1/chat/completions",
      apiKey: byokKey,
      model: chosenModel,
      fallbackModels: ACTIVE_GROQ_MODELS.filter((m) => m !== chosenModel),
    });
  }

  switch (PROVIDER) {
    case "groq": {
      const defaultPrimary = isAuth ? "qwen/qwen3.8-27b" : "openai/gpt-oss-20b";
      const chosenModel = resolveGroqModel(options?.modelOverride, defaultPrimary);
      const fallbacks = ACTIVE_GROQ_MODELS.filter((m) => m !== chosenModel);
      const groqKeys = getPrioritizedKeys();

      return streamOpenAICompatible(messages, system, {
        baseUrl: "https://api.groq.com/openai/v1/chat/completions",
        apiKey: groqKeys[0] || process.env.GROQ_API_KEY,
        apiKeys: groqKeys,
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
        model: options?.modelOverride || process.env.OPENROUTER_AUTH_MODEL || "openai/gpt-oss-20b",
        extraHeaders: { "HTTP-Referer": process.env.APP_URL || "https://tungston-hazel.vercel.app", "X-Title": "Tungston AI" },
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
      throw new Error(`Unknown AI_PROVIDER "${PROVIDER}".`);
  }
}

/**
 * Generates visual artwork via upstream image APIs if configured, falling back to
 * Groq-rendered industrial SVG concept plates so image synthesis always delivers output.
 */
export async function generateImage(prompt: string, byokKey?: string): Promise<string[]> {
  const cleanPrompt = prompt.trim().slice(0, 800);

  // 1. Optional Gemini Imagen/Image key if provided & has active quota
  const geminiKey = byokKey?.startsWith("AIza") ? byokKey : process.env.GEMINI_API_KEY;
  if (geminiKey) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `Generate image: ${cleanPrompt}` }] }],
            generationConfig: { responseModalities: ["IMAGE"] },
          }),
          signal: AbortSignal.timeout(12000),
        }
      );
      if (res.ok) {
        const json: any = await res.json();
        const parts: any[] = json?.candidates?.[0]?.content?.parts || [];
        const imgs = parts
          .filter((p) => p?.inlineData?.data)
          .map((p) => `data:${p.inlineData.mimeType || "image/png"};base64,${p.inlineData.data}`);
        if (imgs.length) return imgs;
      }
    } catch {
      // Fall through cleanly to Groq SVG Concept Forge
    }
  }

  // 2. Groq Element-74 Vector Schematic / Poster Synthesis
  const groqKeys = getPrioritizedKeys();
  if (!groqKeys.length) {
    throw new Error("No active image generation or Groq key configured.");
  }

  const svgPrompt =
    `Create an intricate, museum-grade Swiss Brutalist / Industrial schematic SVG illustration representing: "${cleanPrompt}".\n` +
    `REQUIREMENTS:\n` +
    `- Output ONLY valid raw <svg viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg">...</svg> code. Zero markdown fences or explanation.\n` +
    `- Aesthetic: High-contrast obsidian black (#0B0C0D), concrete beige (#EEEEE6), filament amber (#FFB800), precision blueprint grids, geometric primitives, crisp technical typography/labels, subtle glow filters, and architectural linework.\n` +
    `- Must include rich visual composition filling the 800x600 canvas.`;

  for (const key of groqKeys.slice(0, 3)) {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: "openai/gpt-oss-120b",
          temperature: 0.5,
          max_tokens: 3000,
          messages: [
            { role: "system", content: "You output pure valid standalone SVG markup starting with <svg and ending with </svg>. Zero prose." },
            { role: "user", content: svgPrompt },
          ],
        }),
        signal: AbortSignal.timeout(15000),
      });

      if (res.ok) {
        const json: any = await res.json();
        let raw = String(json?.choices?.[0]?.message?.content || "").trim();
        const startIdx = raw.indexOf("<svg");
        const endIdx = raw.lastIndexOf("</svg>");
        if (startIdx !== -1 && endIdx !== -1) {
          raw = raw.slice(startIdx, endIdx + 6);
          const bytes = new TextEncoder().encode(raw);
          let binary = "";
          for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
          return [`data:image/svg+xml;base64,${btoa(binary)}`];
        }
      }
    } catch {
      continue;
    }
  }

  throw new Error("Image forge engines are temporarily busy. Please try again.");
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
