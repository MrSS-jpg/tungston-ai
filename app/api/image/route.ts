import { generateImage } from "@/lib/providers";
import { checkImageLimit, getClientIp } from "@/lib/ratelimit";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const limit = await checkImageLimit(ip);
    if (!limit.allowed) {
      return Response.json(
        { error: `You've hit the hourly image limit (${limit.limit}/hr) for this app. Try again after it resets.` },
        { status: 429 }
      );
    }

    const { prompt } = await req.json();
    if (!prompt || typeof prompt !== "string") {
      return Response.json({ error: "A text prompt is required." }, { status: 400 });
    }
    const images = await generateImage(prompt);
    return Response.json({ images });
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 500 });
  }
}
