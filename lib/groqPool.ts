/**
 * 4-Account Groq Key Pool & Load Balancer
 * Distributes requests across multiple Groq developer accounts and keys,
 * automatically falling back on HTTP 429 (Rate Limits) or 401 (Auth issues).
 */

export type GroqPoolStats = {
  totalKeys: number;
  healthyKeys: number;
  currentIndex: number;
};

// Store cooldowns across requests in edge/serverless memory
const keyCooldowns = new Map<string, number>();
let globalIndex = 0;

/**
 * Retrieves all unique non-empty Groq keys from environment variables.
 */
export function getGroqKeys(): string[] {
  const rawKeys = [
    process.env.GROQ_API_KEY_1,
    process.env.GROQ_API_KEY_2,
    process.env.GROQ_API_KEY_3,
    process.env.GROQ_API_KEY_4,
    process.env.GROQ_API_KEY,
  ];

  const unique = Array.from(
    new Set(
      rawKeys
        .map((k) => k?.trim())
        .filter((k): k is string => Boolean(k && k.startsWith("gsk_") && k.length > 20))
    )
  );

  return unique;
}

/**
 * Returns available keys ordered by round-robin starting position,
 * prioritizing keys that are NOT currently in cooldown.
 */
export function getPrioritizedKeys(): string[] {
  const keys = getGroqKeys();
  if (!keys.length) return [];

  const now = Date.now();
  // Clear expired cooldowns
  for (const [k, exp] of keyCooldowns.entries()) {
    if (now > exp) keyCooldowns.delete(k);
  }

  // Rotate starting index
  const start = globalIndex % keys.length;
  globalIndex = (globalIndex + 1) % 1000000;

  const ordered: string[] = [];
  for (let i = 0; i < keys.length; i++) {
    ordered.push(keys[(start + i) % keys.length]);
  }

  // Partition into healthy vs throttled
  const healthy = ordered.filter((k) => !keyCooldowns.has(k));
  const throttled = ordered.filter((k) => keyCooldowns.has(k));

  return [...healthy, ...throttled];
}

/**
 * Mark a key as throttled (HTTP 429) for a specified duration (default 60 seconds)
 */
export function markKeyThrottled(key: string, durationMs = 60_000) {
  keyCooldowns.set(key, Date.now() + durationMs);
}

/**
 * Stream a chat completion with multi-key pool rotation and model fallback.
 * Primary model: openai/gpt-oss-120b
 * Secondary fallback: openai/gpt-oss-20b
 */
export async function streamWithGroqPool(
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  options?: {
    model?: string;
    temperature?: number;
    max_tokens?: number;
  }
): Promise<{
  response: Response;
  keyPrefix: string;
  modelUsed: string;
}> {
  const keys = getPrioritizedKeys();
  if (!keys.length) {
    throw new Error("No Groq API keys configured in environment (GROQ_API_KEY_1..4).");
  }

  const primaryModel = options?.model || "openai/gpt-oss-120b";
  const fallbackModel = "openai/gpt-oss-20b";
  const candidateModels = primaryModel === fallbackModel ? [primaryModel] : [primaryModel, fallbackModel];

  let lastError = "";

  for (const modelToTry of candidateModels) {
    for (const key of keys) {
      try {
        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${key}`,
          },
          body: JSON.stringify({
            model: modelToTry,
            messages,
            temperature: options?.temperature ?? 0.6,
            max_tokens: options?.max_tokens ?? 4096,
            stream: true,
          }),
        });

        if (res.ok && res.body) {
          return {
            response: res,
            keyPrefix: key.slice(0, 8) + "...",
            modelUsed: modelToTry,
          };
        }

        const errStatus = res.status;
        const errText = await res.text().catch(() => "");
        lastError = `Groq HTTP ${errStatus} on ${modelToTry}: ${errText.slice(0, 160)}`;

        if (errStatus === 429) {
          // Rate limit exceeded on this key/account — throttle it and try next key
          markKeyThrottled(key, 60_000);
          continue;
        }

        if (errStatus === 401) {
          // Bad auth key — throttle it indefinitely
          markKeyThrottled(key, 3_600_000);
          continue;
        }

        // If model not found or decommissioned, move to fallback model
        if (errStatus === 404 || errStatus === 400) {
          break; // break inner loop to try next candidate model
        }
      } catch (err: any) {
        lastError = err.message || "Network error contacting Groq";
        continue;
      }
    }
  }

  throw new Error(`All Groq key pool accounts exhausted. ${lastError}`);
}
