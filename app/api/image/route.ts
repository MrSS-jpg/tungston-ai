import { generateImage } from "@/lib/providers";
import { checkImageLimit, getClientIp } from "@/lib/ratelimit";

export const runtime = "edge";

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400",
    },
  });
}

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const limit = await checkImageLimit(ip);
    if (!limit.allowed) {
      return Response.json(
        { error: `You've hit the hourly image limit (${limit.limit}/hr) for this app. Try again after it resets.` },
        { status: 429, headers: { "Access-Control-Allow-Origin": "*" } }
      );
    }

    const { prompt } = await req.json();
    if (!prompt || typeof prompt !== "string") {
      return Response.json(
        { error: "A text prompt is required." },
        { status: 400, headers: { "Access-Control-Allow-Origin": "*" } }
      );
    }
    const images = await generateImage(prompt);
    return Response.json({ images }, { headers: { "Access-Control-Allow-Origin": "*" } });
  } catch (err) {
    return Response.json(
      { error: (err as Error).message },
      { status: 500, headers: { "Access-Control-Allow-Origin": "*" } }
    );
  }
}
