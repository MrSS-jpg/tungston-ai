import { currentProvider, contextWindowTokens } from "@/lib/providers";

export const runtime = "edge";

export async function GET() {
  return Response.json(
    { provider: currentProvider, contextWindowTokens },
    {
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400",
      },
    }
  );
}
