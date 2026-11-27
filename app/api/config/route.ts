import { currentProvider, contextWindowTokens } from "@/lib/providers";
import { hasTavilyConfigured } from "@/lib/tavilyPool";

export const runtime = "edge";

export async function GET() {
  return Response.json(
    {
      provider: currentProvider,
      contextWindowTokens,
      webSearch: hasTavilyConfigured(),
      models: [
        { id: "openai/gpt-oss-20b", label: "20B FAST" },
        { id: "qwen/qwen3.8-27b", label: "QWEN 27B" },
        { id: "openai/gpt-oss-120b", label: "GPT 120B" },
      ],
    },
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
      },
    }
  );
}
