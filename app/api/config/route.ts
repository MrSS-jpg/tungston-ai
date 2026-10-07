import { currentProvider, contextWindowTokens } from "@/lib/providers";

export const runtime = "edge";

export async function GET() {
  return Response.json({ provider: currentProvider, contextWindowTokens });
}
