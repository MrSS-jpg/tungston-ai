import { streamCompletion, type WireMessage } from "@/lib/providers";
import { checkChatLimit, getClientIp } from "@/lib/ratelimit";

export const runtime = "nodejs";

// Keeps request payloads (and provider token bills) bounded on long chats.
// Gemini's 1M window rarely needs this, but it protects smaller-context providers.
const MAX_HISTORY_MESSAGES = 24;

const SYSTEM_PROMPT =
  "You are Tungston AI, a durable and dependable assistant. Answer clearly and directly. " +
  "Use markdown for structure only when it aids clarity, not by default. Keep replies concise unless depth is requested.";

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const limit = await checkChatLimit(ip);
    if (!limit.allowed) {
      return new Response(
        `You've hit the hourly message limit (${limit.limit}/hr) for this app. Try again after it resets.`,
        { status: 429 }
      );
    }

    const body = await req.json();
    const messages: WireMessage[] = Array.isArray(body?.messages) ? body.messages : [];
    if (!messages.length) {
      return new Response("No messages provided.", { status: 400 });
    }

    const trimmed = messages.slice(-MAX_HISTORY_MESSAGES);
    const stream = await streamCompletion(trimmed, SYSTEM_PROMPT);

    return new Response(stream, {
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    });
  } catch (err) {
    return new Response(`Error: ${(err as Error).message}`, { status: 500 });
  }
}
