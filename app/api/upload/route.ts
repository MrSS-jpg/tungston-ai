export const runtime = "edge";

const MAX_INLINE_BYTES = 10 * 1024 * 1024;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

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

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const rawFiles = form.getAll("files");
    const singleFile = form.get("file");
    const files = rawFiles.length ? rawFiles : singleFile ? [singleFile] : [];

    const validFiles = files.filter((f): f is File => f instanceof File);
    if (!validFiles.length) {
      return Response.json({ error: "No file provided." }, { status: 400, headers: CORS_HEADERS });
    }

    const attachments = [];
    for (const file of validFiles.slice(0, 5)) {
      if (file.size > MAX_INLINE_BYTES) {
        return Response.json(
          { error: `File "${file.name}" exceeds the 10MB upload limit.` },
          { status: 413, headers: CORS_HEADERS }
        );
      }

      const isText = file.type.startsWith("text/") || /\.(md|txt|json|csv|js|ts|tsx|py|html|css)$/i.test(file.name);
      if (isText && file.size > 48 * 1024) {
        return Response.json(
          {
            error: `Text file "${file.name}" (${(file.size / 1024).toFixed(1)} KB) exceeds the 48 KB token safety cap.`,
          },
          { status: 413, headers: CORS_HEADERS }
        );
      }

      const arrayBuf = await file.arrayBuffer();
      const base64Str = arrayBufferToBase64(arrayBuf);
      const dataUrl = `data:${file.type || "text/plain"};base64,${base64Str}`;

      attachments.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: file.name,
        mimeType: file.type || "text/plain",
        dataUrl,
        sizeBytes: file.size,
      });
    }

    return Response.json({ attachments, ...attachments[0] }, { headers: CORS_HEADERS });
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 500, headers: CORS_HEADERS });
  }
}
