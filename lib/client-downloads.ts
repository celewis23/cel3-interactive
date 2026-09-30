import { createHash, timingSafeEqual } from "node:crypto";
import { sql } from "@/lib/postgres";

const headers = {
  "Cache-Control": "private, no-store, max-age=0",
  "X-Content-Type-Options": "nosniff",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
};
const digest = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");
const fail = (message: string, status: number, extra: Record<string, string> = {}) =>
  Response.json({ error: message }, { status, headers: { ...headers, ...extra } });

export async function downloadPackage(request: Request, slug: string): Promise<Response> {
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) return fail("Package not found.", 404);
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return fail("Open the download page to continue.", 403);
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) return fail("Use the download form to continue.", 415);
  if (Number(request.headers.get("content-length")) > 1024) return fail("Invalid access code.", 413);
  let code: unknown;
  try {
    // Bound streamed bodies too; a missing Content-Length cannot bypass this limit.
    const reader = request.body?.getReader();
    if (!reader) return fail("Enter your access code.", 400);
    let length = 0; const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > 1024) { await reader.cancel(); return fail("Invalid access code.", 413); }
      chunks.push(value);
    }
    code = JSON.parse(Buffer.concat(chunks).toString("utf8"))?.code;
  } catch { return fail("Enter your access code.", 400); }
  if (typeof code !== "string") return fail("Enter your access code.", 400);
  const normalized = code.replace(/[\s-]/g, "").toUpperCase();
  if (!/^[A-Z0-9]{20}$/.test(normalized)) return fail("Check your access code and try again.", 403);
  try {
    // Vercel supplies the forwarding address. Only a hash is retained locally.
    const address = (request.headers.get("x-vercel-forwarded-for") || request.headers.get("x-forwarded-for") || "unknown").split(",")[0].trim().slice(0, 100);
    const bucket = digest(`${slug}:${address}`);
    await sql.query(`DELETE FROM client_download_attempts WHERE bucket IN
      (SELECT bucket FROM client_download_attempts WHERE window_start < now() - interval '1 day' LIMIT 100)`);
    const attempts = await sql.query<{ attempts: number }>(`INSERT INTO client_download_attempts (bucket) VALUES ($1)
      ON CONFLICT (bucket) DO UPDATE SET
        attempts = CASE WHEN client_download_attempts.window_start < now() - interval '15 minutes' THEN 1 ELSE client_download_attempts.attempts + 1 END,
        window_start = CASE WHEN client_download_attempts.window_start < now() - interval '15 minutes' THEN now() ELSE client_download_attempts.window_start END
      RETURNING attempts`, [bucket]);
    if (!attempts[0] || attempts[0].attempts > 10) return fail("Too many attempts. Please try again in 15 minutes.", 429, { "Retry-After": "900" });
    const packages = await sql.query<{ code_hash: string }>("SELECT code_hash FROM client_download_packages WHERE slug = $1 AND enabled = true", [slug]);
    const expected = packages[0]?.code_hash ?? "0".repeat(64);
    const supplied = digest(normalized);
    if (!/^[a-f0-9]{64}$/.test(expected) || !timingSafeEqual(Buffer.from(supplied, "hex"), Buffer.from(expected, "hex")) || !packages[0]) {
      return fail("Check your access code and try again.", 403);
    }
    // Recheck the hash and enabled flag in this read so revocation is immediate.
    const rows = await sql.query<{ filename: string; archive_base64: string; sha256: string; byte_size: number }>(
      "SELECT filename, archive_base64, sha256, byte_size FROM client_download_packages WHERE slug = $1 AND code_hash = $2 AND enabled = true", [slug, supplied]);
    const record = rows[0];
    if (!record) return fail("This download is unavailable. Please contact CEL3 Interactive.", 403);
    const archive = Buffer.from(record.archive_base64, "base64");
    if (archive.length !== record.byte_size || archive.length > 4000000 || digest(archive) !== record.sha256) throw new Error("Archive integrity mismatch");
    const filename = record.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    return new Response(new Uint8Array(archive), { headers: { ...headers,
      "Content-Type": "application/zip", "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(archive.length), "X-Archive-SHA256": record.sha256,
    } });
  } catch {
    // Do not log request bodies, codes, package contents, or database credentials.
    console.error("Client package download unavailable");
    return fail("The download is temporarily unavailable. Please try again shortly.", 503);
  }
}
