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
    // 1. Auth check (with Free Test Pass support)
    let isMember = false;
    let userEmail = "";

    const authHeader = req.headers.get("Authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.slice(7).trim();
      if (token && token !== "guest" && token !== "undefined") {
        try {
          const { data: { user } } = await supabase.auth.getUser(token);
          if (user) {
            isMember = true;
            userEmail = user.email || "";
          }
        } catch {
          // If Supabase host is unreachable or paused, continue under Free Test mode
        }
      }
    }

    // 2. Payload Parsing
    const body = await req.json().catch(() => null);
    if (!body || typeof body.prompt !== "string" || !body.prompt.trim()) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid 'prompt' field." }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    const userPrompt = body.prompt.trim().slice(0, MAX_PROMPT_CHARS);
    const existingHtml = typeof body.existingHtml === "string" ? body.existingHtml.slice(0, MAX_EXISTING_HTML_CHARS) : "";
    const conversationHistory = Array.isArray(body.history) ? body.history : [];

    // Construct messages array
    const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: PLAYGROUND_SYSTEM_PROMPT },
    ];

    // Include recent session history
    for (const item of conversationHistory.slice(-4)) {
      if (item && (item.role === "user" || item.role === "assistant") && typeof item.content === "string") {
        messages.push({
          role: item.role,
          content: item.content.slice(0, 4000),
        });
      }
    }

    // Append current prompt & context
    if (existingHtml) {
      messages.push({
        role: "user",
        content: `Here is the current working HTML app:\n\n${existingHtml}\n\nPlease update and enhance this app according to this request: ${userPrompt}\n\nRemember: Output ONLY the complete updated HTML document from <!DOCTYPE html> to </html>. Zero markdown, zero preamble.`,
      });
    } else {
      messages.push({
        role: "user",
        content: `Build a complete, standalone, production-ready single-file HTML application for: ${userPrompt}\n\nRemember: Output ONLY the raw executable HTML from <!DOCTYPE html> to </html> with embedded Tailwind CSS and interactive JavaScript. Zero markdown fences, zero explanation.`,
      });
    }

    // 3. Dispatch to Groq 4-Key Pool with GPT-OSS 120B
    const { response: groqRes, modelUsed, keyPrefix } = await streamWithGroqPool(
      messages,
      {
        model: "openai/gpt-oss-120b",
        temperature: 0.4,
        max_tokens: 8192,
      }
    );

    if (!groqRes.ok) {
      const errText = await groqRes.text().catch(() => "Unknown upstream error");
      return new Response(
        JSON.stringify({ error: `Groq LPU Array error: ${errText}` }),
        {
          status: 502,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    // 4. Pipe Groq's SSE stream to client
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
        "Access-Control-Allow-Origin": "*",
        "X-Tungsten-Model": modelUsed,
        "X-Tungsten-Key-Pool": keyPrefix,
        "X-Tungsten-Tier": isMember ? `MEMBER (${userEmail})` : "FREE_TEST_PASS",
      },
    });
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        error: error.message || "Failed to generate HTML app on Tungsten Playground.",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
}