import { streamCompletion, type WireMessage } from "@/lib/providers";
import { checkChatLimit, getClientIp } from "@/lib/ratelimit";
import { supabase } from "@/lib/supabase";

export const runtime = "edge";

const MAX_HISTORY_MESSAGES = 24;

const SYSTEM_PROMPT =
  "You are Tungston AI, an industrial, high-precision, and dependable AI assistant built with pure brutalist clarity. " +
  "Answer clearly and directly with zero fluff. Use markdown for structure only when it aids readability. " +
  "Keep replies concise unless technical depth or code is requested.";

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

    // Determine user authentication status from Supabase Bearer token
    let userTier: "guest" | "authenticated" = "guest";
    const authHeader = req.headers.get("Authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.slice(7).trim();
      if (token) {
        try {
          const { data: { user }, error } = await supabase.auth.getUser(token);
          if (user && !error) {
            userTier = "authenticated";
          }
        } catch (e) {
          // Token verification failed; fallback to guest mode safely
          userTier = "guest";
        }
      }
    }

    const body = await req.json();
    const messages: WireMessage[] = Array.isArray(body?.messages) ? body.messages : [];
    if (!messages.length) {
      return new Response("No messages provided.", { status: 400 });
    }

    // Assemble system prompt with custom project files context if active
    let effectiveSystemPrompt = SYSTEM_PROMPT;
    if (body.projectContext && typeof body.projectContext === "string" && body.projectContext.trim().length > 0) {
      effectiveSystemPrompt +=
        "\n\n=== ATTACHED PROJECT CONTEXT & FILES ===\n" +
        body.projectContext.trim() +
        "\n========================================\n" +
        "You have direct access to the project files above. Treat their contents as persistent knowledge and ground truth for this project.";
    }

    const trimmed = messages.slice(-MAX_HISTORY_MESSAGES);
    const stream = await streamCompletion(trimmed, effectiveSystemPrompt, {
      userTier,
      modelOverride: body.modelOverride,
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        "X-User-Tier": userTier,
      },
    });
  } catch (err) {
    return new Response(`Error: ${(err as Error).message}`, { status: 500 });
  }
}
