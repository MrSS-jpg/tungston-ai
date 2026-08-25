import { supportsNativeFiles } from "@/lib/providers";

export const runtime = "nodejs";

const MAX_INLINE_BYTES = 15 * 1024 * 1024; // 15MB cap for base64 fallback (avoids bloating request/response JSON)

// Uploads once to Gemini's file store and hands back a small `fileUri` reference
// instead of round-tripping the raw file (base64) on every following turn.
async function uploadToGemini(file: File, apiKey: string) {
  const bytes = Buffer.from(await file.arrayBuffer());
  const boundary = `tungston-${Date.now()}`;
  const metadata = JSON.stringify({ file: { displayName: file.name } });

  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Type: ${file.type || "application/octet-stream"}\r\n\r\n`),
    bytes,
    Buffer.from(`\r\n--${boundary}--`),
  ]);

  const res = await fetch(`https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`, {
    method: "POST",
    headers: {
      "X-Goog-Upload-Protocol": "multipart",
      "Content-Type": `multipart/related; boundary=${boundary}`,
    },
    body,
  });
  if (!res.ok) throw new Error(`Gemini upload failed: ${res.status} ${await res.text()}`);
  const json = await res.json();
  return { uri: json.file.uri as string, mimeType: json.file.mimeType as string };
}

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

    const apiKey = process.env.GEMINI_API_KEY;
    if (supportsNativeFiles && apiKey) {
      try {
        const { uri, mimeType } = await uploadToGemini(file, apiKey);
        return Response.json({ name: file.name, mimeType, fileUri: uri, sizeBytes: file.size });
      } catch {
        // fall through to inline fallback below
      }
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
