/**
 * Multi-Account Tavily Web Search Pool & Load Balancer
 * Supports comma/newline/whitespace separated keys in TAVILY_API_KEYS as well as
 * TAVILY_API_KEY_1..TAVILY_API_KEY_16 and TAVILY_API_KEY.
 * Automatically rotates keys and falls back on HTTP 429 / 432 / 401 / 402 quota errors.
 */

export type TavilyResult = {
  title: string;
  url: string;
  content: string;
  score?: number;
  published_date?: string;
};

export type TavilySearchResponse = {
  query: string;
  answer?: string;
  results: TavilyResult[];
  keyPrefix?: string;
};

const tavilyCooldowns = new Map<string, number>();
let tavilyIndex = 0;

/**
 * Extracts all unique non-empty Tavily keys (tvly-*) from environment variables.
 */
export function getTavilyKeys(): string[] {
  const candidates: Array<string | undefined> = [];

  if (process.env.TAVILY_API_KEYS) {
    for (const part of process.env.TAVILY_API_KEYS.split(/[\s,;]+/)) {
      candidates.push(part);
    }
  }

  for (let i = 1; i <= 20; i++) {
    candidates.push(process.env[`TAVILY_API_KEY_${i}`]);
  }
  candidates.push(process.env.TAVILY_API_KEY);

  return Array.from(
    new Set(
      candidates
        .map((k) => k?.trim())
        .filter((k): k is string => Boolean(k && k.startsWith("tvly-") && k.length > 16))
    )
  );
}

export function hasTavilyConfigured(): boolean {
  return getTavilyKeys().length > 0;
}

export function markTavilyKeyThrottled(key: string, durationMs = 120_000) {
  tavilyCooldowns.set(key, Date.now() + durationMs);
}

function getPrioritizedTavilyKeys(byokKey?: string): string[] {
  const custom = byokKey?.trim();
  if (custom && custom.startsWith("tvly-")) {
    return [custom];
  }

  const keys = getTavilyKeys();
  if (!keys.length) return [];

  const now = Date.now();
  for (const [k, exp] of tavilyCooldowns.entries()) {
    if (now > exp) tavilyCooldowns.delete(k);
  }

  const start = tavilyIndex % keys.length;
  tavilyIndex = (tavilyIndex + 1) % 1_000_000;

  const ordered: string[] = [];
  for (let i = 0; i < keys.length; i++) {
    ordered.push(keys[(start + i) % keys.length]);
  }

  const healthy = ordered.filter((k) => !tavilyCooldowns.has(k));
  const throttled = ordered.filter((k) => tavilyCooldowns.has(k));
  return [...healthy, ...throttled];
}

export function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "web";
  }
}

/**
 * Executes a live web search via the Tavily API pool with automatic key rotation.
 */
export async function searchWithTavilyPool(
  query: string,
  options?: {
    maxResults?: number;
    searchDepth?: "basic" | "advanced";
    includeAnswer?: boolean;
    byokTavilyKey?: string;
    timeoutMs?: number;
  }
): Promise<TavilySearchResponse> {
  const cleanQuery = query.trim().slice(0, 400);
  if (!cleanQuery) {
    throw new Error("Search query cannot be empty.");
  }

  const keys = getPrioritizedTavilyKeys(options?.byokTavilyKey);
  if (!keys.length) {
    throw new Error("NO_TAVILY_KEYS: Web search keys are not configured in server environment (TAVILY_API_KEYS).");
  }

  const maxResults = Math.min(Math.max(options?.maxResults ?? 5, 1), 8);
  const searchDepth = options?.searchDepth ?? "basic";
  const includeAnswer = options?.includeAnswer ?? true;
  const timeoutMs = options?.timeoutMs ?? 8000;

  let lastErr = "";

  for (const key of keys) {
    try {
      const res = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          api_key: key,
          query: cleanQuery,
          search_depth: searchDepth,
          include_answer: includeAnswer,
          max_results: maxResults,
          include_raw_content: false,
        }),
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (res.ok) {
        const data: any = await res.json();
        const rawResults: any[] = Array.isArray(data?.results) ? data.results : [];
        return {
          query: cleanQuery,
          answer: typeof data?.answer === "string" ? data.answer : undefined,
          results: rawResults.map((r) => ({
            title: String(r?.title || extractDomain(String(r?.url || ""))).slice(0, 180),
            url: String(r?.url || ""),
            content: String(r?.content || "").slice(0, 1200),
            score: typeof r?.score === "number" ? r.score : undefined,
            published_date: typeof r?.published_date === "string" ? r.published_date : undefined,
          })),
          keyPrefix: key.slice(0, 12) + "...",
        };
      }

      const status = res.status;
      const bodyText = await res.text().catch(() => "");
      lastErr = `Tavily HTTP ${status}: ${bodyText.slice(0, 140)}`;

      if (status === 429 || status === 432 || status === 402) {
        // Quota/rate limit exhausted — rotate cleanly to next Tavily key
        markTavilyKeyThrottled(key, 300_000);
        continue;
      }

      if (status === 401 || status === 403) {
        markTavilyKeyThrottled(key, 3_600_000);
        continue;
      }

      if (status >= 500) {
        continue;
      }

      throw new Error(lastErr);
    } catch (err: any) {
      lastErr = err?.message || "Network error contacting Tavily";
      continue;
    }
  }

  throw new Error(`All Tavily search keys exhausted or unreachable. ${lastErr}`);
}
