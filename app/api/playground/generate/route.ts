import { streamWithGroqPool } from "@/lib/groqPool";
import { supabase } from "@/lib/supabase";

export const runtime = "edge";

const MAX_PROMPT_CHARS = 4000;
const MAX_EXISTING_HTML_CHARS = 80000;

const PLAYGROUND_SYSTEM_PROMPT = `You are Tungsten Playground, an elite UI/UX engineer that builds complete, production-grade, self-contained single-file HTML applications according to the user's specifications.

CRITICAL OUTPUT SPECIFICATIONS:
1. PURE CODE ONLY: Output ONLY the complete, working HTML5 document starting strictly with <!DOCTYPE html> and ending with </html>.
2. NO MARKDOWN FENCES: Do NOT wrap output in \`\`\`html or \`\`\`. Output raw executable HTML code directly so it can render immediately in an iframe.
3. ZERO CONVERSATIONAL FLUFF: Do NOT include greetings, preamble, or explanations. Start at <!DOCTYPE html> and stop at </html>.
4. SINGLE-FILE SELF-CONTAINED:
   - Include Tailwind CSS via CDN: <script src="https://cdn.tailwindcss.com"></script>
   - Add custom animations or overrides inside <style> tags.
   - Write complete, robust JavaScript inside <script> tags before </body>.
   - When icons are useful, use embedded SVG strings or Lucide CDN (<script src="https://unpkg.com/lucide@latest"></script> with lucide.createIcons()).
5. DESIGN & QUALITY:
   - High visual craftsmanship: bold Element 74 brutalist aesthetic (crisp 2px borders, hard box shadows, monospace/display typography, vibrant accent highlights like #FFA85C, #00F0FF, or clean monochromatic contrast).
   - Fully interactive and functional: inputs, timers, filters, calculations, and animations must actually work.
   - Use localStorage within the app where suitable (e.g. saving state, score, tasks, or settings).
   - Fully responsive on both mobile (375px) and desktop (1200px+).

ITERATIVE REVISIONS:
If the user provides existing HTML with an update request, modify and enhance that existing HTML precisely according to their instruction while preserving existing functional features. Always output the entire updated <!DOCTYPE html> document.`;

const encoder = new TextEncoder();

export async function POST(req: Request) {
  try {
    // 1. Origin verification
    const origin = req.headers.get("origin") || req.headers.get("referer");
    const host = req.headers.get("host") || "";
    if (origin && host) {
      try {
        const originUrl = new URL(origin);
        if (
          originUrl.host !== host &&
          !originUrl.host.endsWith(".vercel.app") &&
          !host.includes("localhost")
        ) {
          return new Response(JSON.stringify({ error: "Unauthorized cross-origin request." }), {
            status: 403,
            headers: { "Content-Type": "application/json" },
          });
        }
      } catch {
        // Continue if malformed
      }
    }

    // 2. Supabase Auth Verification
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({
          error: "Authentication required. Please sign in to Tungsten to code and run live Playground apps.",
          requiresAuth: true,
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const token = authHeader.slice(7).trim();
    if (!token) {
      return new Response(
        JSON.stringify({
          error: "Invalid authentication token.",
          requiresAuth: true,
        }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({
          error: "Session expired or invalid. Please sign in again.",
          requiresAuth: true,
        }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // 3. Payload Parsing
    const body = await req.json().catch(() => null);
    if (!body || typeof body.prompt !== "string" || !body.prompt.trim()) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid 'prompt' field." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const userPrompt = body.prompt.trim().slice(0, MAX_PROMPT_CHARS);
    const existingHtml = typeof body.existingHtml === "string" ? body.existingHtml.slice(0, MAX_EXISTING_HTML_CHARS) : "";
    const conversationHistory = Array.isArray(body.history) ? body.history : [];

    // Construct messages array
    const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: PLAYGROUND_SYSTEM_PROMPT },
    ];

    if (existingHtml) {
      messages.push({
        role: "user",
        content: `Here is the current HTML app code:\n\n\`\`\`html\n${existingHtml}\n\`\`\``,
      });
      messages.push({
        role: "assistant",
        content: "Understood. What modification or feature would you like to add or change in this app?",
      });
    }

    // Append prior conversational turn if refining
    for (const h of conversationHistory.slice(-4)) {
      if (h.role === "user" || h.role === "assistant") {
        messages.push({ role: h.role, content: String(h.content).slice(0, 2000) });
      }
    }

    // Add current user prompt
    messages.push({
      role: "user",
      content: existingHtml
        ? `Update the HTML application according to this request: ${userPrompt}\nRemember to output the complete <!DOCTYPE html> document without markdown fences or chat.`
        : `Build this application from scratch: ${userPrompt}\nRemember to output the complete <!DOCTYPE html> document without markdown fences or chat.`,
    });

    // 4. Request stream from 4-Account Groq Key Pool
    const { response: groqRes, keyPrefix, modelUsed } = await streamWithGroqPool(messages, {
      model: "openai/gpt-oss-120b",
      temperature: 0.6,
      max_tokens: 4096,
    });

    // 5. Pipe Groq's SSE stream to client
    const groqReader = groqRes.body!.getReader();
    const decoder = new TextDecoder();

    let isFirstChunk = true;

    const stream = new ReadableStream({
      async start(controller) {
        let buffer = "";

        try {
          while (true) {
            const { done, value } = await groqReader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed.startsWith("data: ") || trimmed === "data: [DONE]") continue;

              try {
                const parsed = JSON.parse(trimmed.slice(6));
                let delta = parsed?.choices?.[0]?.delta?.content;

                if (delta) {
                  // Strip markdown fences if the model emitted any by mistake
                  if (isFirstChunk) {
                    delta = delta.replace(/^```html\s*/i, "").replace(/^```\s*/, "");
                    if (delta.trim()) isFirstChunk = false;
                  }
                  controller.enqueue(encoder.encode(delta));
                }
              } catch {
                // Ignore parse error on partial chunks
              }
            }
          }
        } catch (err: any) {
          controller.enqueue(encoder.encode(`\n<!-- Stream interrupted: ${err.message} -->`));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "X-Tungsten-Model": modelUsed,
        "X-Tungsten-Key-Pool": keyPrefix,
      },
    });
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        error: error.message || "Failed to generate HTML app on Tungsten Playground.",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
