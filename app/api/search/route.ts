import { formulateSearchQuery } from "@/lib/providers";
import { checkChatLimit, getClientIp } from "@/lib/ratelimit";
import { extractDomain, searchWithTavilyPool } from "@/lib/tavilyPool";

export const runtime = "edge";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-tavily-key",
  "Access-Control-Max-Age": "86400",
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const byokTavilyKey = req.headers.get("x-tavily-key")?.trim() || undefined;

    if (!byokTavilyKey) {
      const limit = await checkChatLimit(`search:${ip}`, "guest");
      if (!limit.allowed) {
        return Response.json(
          { error: `Search cooldown active. Retry in ${limit.reset}s.` },
          { status: 429, headers: CORS_HEADERS }
        );
      }
    }

    const body = await req.json().catch(() => null);
    const rawQuery = typeof body?.query === "string" ? body.query.trim() : "";
    if (!rawQuery) {
      return Response.json({ error: "A search query is required." }, { status: 400, headers: CORS_HEADERS });
    }

    const query = body?.refine !== false ? await formulateSearchQuery(rawQuery) : rawQuery;
    const searchRes = await searchWithTavilyPool(query, {
      maxResults: Number(body?.maxResults) || 5,
      searchDepth: body?.depth === "advanced" ? "advanced" : "basic",
      includeAnswer: true,
      byokTavilyKey,
    });

    return Response.json(
      {
        query: searchRes.query,
        answer: searchRes.answer || null,
        results: searchRes.results.map((r, idx) => ({
          index: idx + 1,
          title: r.title,
          url: r.url,
          domain: extractDomain(r.url),
          snippet: r.content,
          publishedDate: r.published_date || null,
        })),
      },
      { headers: CORS_HEADERS }
    );
  } catch (err: any) {
    return Response.json(
      { error: err?.message || "Web search failed." },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
