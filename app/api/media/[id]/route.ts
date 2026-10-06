import { Readable } from "node:stream";
import { documentStore } from "@/lib/documents/store.mjs";
import { mediaDrive, type StoredAsset } from "@/lib/documents/assets";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^media\.[a-f0-9]{48}$/.test(id)) return new Response("Not found", { status: 404 });
  const asset = await documentStore.getDocument<StoredAsset>(id);
  if (!asset?.driveFileId || !["imageAsset", "fileAsset"].includes(asset._type)) return new Response("Not found", { status: 404 });
  const range = req.headers.get("range");
  if (range && !/^bytes=\d*-\d*$/.test(range)) return new Response("Invalid range", { status: 416 });
  try {
    const drive = await mediaDrive();
    const file = await drive.files.get({ fileId: asset.driveFileId, alt: "media" }, {
      responseType: "stream", ...(range ? { headers: { Range: range } } : {}),
    });
    const inline = /^(image\/(jpeg|png|gif|webp|avif)|video\/|audio\/)/.test(asset.mimeType);
    const headers = new Headers({
      "Content-Type": asset.mimeType,
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(asset.originalFilename)}`,
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "sandbox; default-src 'none'",
      "Referrer-Policy": "no-referrer",
      "Cache-Control": "private, max-age=3600",
      "Accept-Ranges": "bytes",
    });
    for (const name of ["content-length", "content-range"]) {
      const value = file.headers[name];
      if (typeof value === "string") headers.set(name, value);
    }
    return new Response(Readable.toWeb(file.data) as ReadableStream<Uint8Array>, { status: file.status, headers });
  } catch {
    return new Response("File temporarily unavailable", { status: 503, headers: { "Retry-After": "60" } });
  }
}
