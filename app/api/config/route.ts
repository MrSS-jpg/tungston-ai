import { currentProvider, contextWindowTokens } from "@/lib/providers";

export const runtime = "nodejs";

export async function GET() {
  return Response.json({ provider: currentProvider, contextWindowTokens });
}
