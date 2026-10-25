export const runtime = "edge";

const MAX_INLINE_BYTES = 10 * 1024 * 1024; // 10MB cap for edge uploads

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  const CHUNK_SIZE = 0x8000;
  for (let i = 0; i < len; i += CHUNK_SIZE) {
    const chunk = bytes.subarray(i, Math.min(i + CHUNK_SIZE, len));
    binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
  }
  return btoa(binary);
}

export async function POST(req: Request) {
  try {
    // Security: Validate origin if present
    const origin = req.headers.get("origin") || req.headers.get("referer");
    const host = req.headers.get("host") || "";
    if (origin && host) {
      try {
        const originUrl = new URL(origin);
        if (originUrl.host !== host && !originUrl.host.endsWith(".vercel.app") && !host.includes("localhost")) {
          return new Response(JSON.stringify({ error: "Unauthorized upload request." }), {
            status: 403,
            headers: { "Content-Type": "application/json" },
          });
        }
      } catch {
        // continue
      }
    }

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return Response.json({ error: "No file provided." }, { status: 400 });
    }
    if (file.size > MAX_INLINE_BYTES * 2) {
      return Response.json({ error: "File is too large (20MB limit)." }, { status: 413 });
    }

    // Cap text and markdown files to 40KB to avoid blowing out Groq tokens
    const isText = file.type.startsWith("text/") || file.name.endsWith(".md") || file.name.endsWith(".txt");
    if (isText && file.size > 40 * 1024) {
      return Response.json(
        {
          error: `File "${file.name}" (${(file.size / 1024).toFixed(1)} KB) exceeds the 40 KB limit. Text files are capped to protect API token limits.`,
        },
        { status: 413 }
      );
    }

    if (file.size > MAX_INLINE_BYTES) {
      return Response.json({ error: "File too large to send inline for this provider." }, { status: 413 });
    }

    const arrayBuf = await file.arrayBuffer();
    const base64Str = arrayBufferToBase64(arrayBuf);
    const dataUrl = `data:${file.type || "application/octet-stream"};base64,${base64Str}`;

    return Response.json({
      name: file.name,
      mimeType: file.type,
      dataUrl,
      sizeBytes: file.size,
    });
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 500 });
  }
}
