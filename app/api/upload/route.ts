export const runtime = "nodejs";

const MAX_INLINE_BYTES = 15 * 1024 * 1024; // 15MB cap for base64 fallback (avoids bloating request/response JSON)

function toDataUrl(file: File, bytes: Buffer) {
  return `data:${file.type || "application/octet-stream"};base64,${bytes.toString("base64")}`;
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return Response.json({ error: "No file provided." }, { status: 400 });
    }
    if (file.size > MAX_INLINE_BYTES * 2) {
      return Response.json({ error: "File is too large (30MB limit)." }, { status: 413 });
    }

    // Cap text and markdown files to 40KB to avoid blowing out Groq tokens
    const isText = file.type.startsWith("text/") || file.name.endsWith(".md") || file.name.endsWith(".txt");
    if (isText && file.size > 40 * 1024) {
      return Response.json(
        { error: `File "${file.name}" (${(file.size / 1024).toFixed(1)} KB) exceeds the 40 KB limit. Text files are capped to protect API token limits.` },
        { status: 413 }
      );
    }

    if (file.size > MAX_INLINE_BYTES) {
      return Response.json({ error: "File too large to send inline for this provider." }, { status: 413 });
    }
    const bytes = Buffer.from(await file.arrayBuffer());
    return Response.json({ name: file.name, mimeType: file.type, dataUrl: toDataUrl(file, bytes), sizeBytes: file.size });
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 500 });
  }
}
