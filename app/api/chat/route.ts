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

    // Determine user authentication status from Supabase Bearer token
    let userTier: "guest" | "authenticated" = "guest";
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.slice(7).trim();
      if (token) {
        try {
          const { data: { user }, error } = await supabase.auth.getUser(token);
          if (user && !error) {
            userTier = "authenticated";
            userId = user.id;
          }
        } catch {
          userTier = "guest";
        }
      }
    }

    // Check for client-provided BYOK headers
    const byokKey = req.headers.get("x-byok-key")?.trim() || undefined;
    const byokProvider = req.headers.get("x-byok-provider")?.trim().toLowerCase() || "groq";

    // If no BYOK key provided, enforce host rate limits to protect server key
    if (!byokKey) {
      const rateLimitId = userId ? `usr:${userId}` : `ip:${ip}`;
      const limit = await checkChatLimit(rateLimitId, userTier);
      if (!limit.allowed) {
        const errorMsg =
          limit.reason === "burst"
            ? `Cooldown active: wait ${limit.reset}s before sending another message.`
            : `Rate limit reached (${limit.limit} msgs / ${userTier === "authenticated" ? "hr" : "15m"}). Resets in ${limit.reset}s. Or switch to BYOK in the top bar.`;

        return new Response(
          JSON.stringify({
            error: errorMsg,
            rate_limited: true,
            reset: limit.reset,
            limit: limit.limit,
            remaining: limit.remaining,
          }),
          {
            status: 429,
            headers: {
              "Content-Type": "application/json",
              "X-RateLimit-Limit": String(limit.limit),
              "X-RateLimit-Remaining": String(limit.remaining),
              "X-RateLimit-Reset": String(limit.reset),
              "Retry-After": String(limit.reset),
            },
          }
        );
      }
    }

    const body = await req.json();
    const messages: WireMessage[] = Array.isArray(body?.messages) ? body.messages : [];
    if (!messages.length) {
      return new Response(JSON.stringify({ error: "No messages provided." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Assemble system prompt with custom project files context if active (capped to 64KB safe limit)
    let effectiveSystemPrompt = SYSTEM_PROMPT;
    if (body.projectContext && typeof body.projectContext === "string" && body.projectContext.trim().length > 0) {
      const rawContext = body.projectContext.trim();
      const MAX_SAFE_CONTEXT_CHARS = 64 * 1024; // 64 KB safety limit
      let safeContext = rawContext;
      if (rawContext.length > MAX_SAFE_CONTEXT_CHARS) {
        safeContext =
          rawContext.slice(0, MAX_SAFE_CONTEXT_CHARS) +
          "\n\n[WARNING: Attached project context exceeded the 64 KB safe cap and was truncated to protect Groq API token limits.]";
      }

      effectiveSystemPrompt +=
        "\n\n=== ATTACHED PROJECT CONTEXT & FILES ===\n" +
        safeContext +
        "\n========================================\n" +
        "You have direct access to the project files above. Treat their contents as persistent knowledge and ground truth for this project.";
    }

    const trimmed = messages.slice(-MAX_HISTORY_MESSAGES);
    const stream = await streamCompletion(trimmed, effectiveSystemPrompt, {
      userTier,
      modelOverride: body.modelOverride,
      byokApiKey: byokKey,
      byokProvider,
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        "X-User-Tier": userTier,
      },
    });
  } catch (err: any) {
    const msg = err?.message || String(err);
    if (msg.includes("UPSTREAM_429")) {
      return new Response(
        JSON.stringify({
          error: "Upstream Groq capacity temporarily reached. Please wait a few moments or switch to your own BYOK key.",
          quota_exceeded: true,
        }),
        {
          status: 429,
          headers: { "Content-Type": "application/json", "Retry-After": "15" },
        }
      );
    }
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
