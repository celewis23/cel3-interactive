import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/postgres";
import { checkDirectoryCode, createDirectoryToken, DIRECTORY_COOKIE, DIRECTORY_TTL_SECONDS } from "@/lib/mockups/directory-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow" };
const fail = (error: string, status: number, extra = {}) => NextResponse.json({ error }, { status, headers: { ...headers, ...extra } });

// Keep submitted access codes out of activity logs.
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  // Next's development URL may use localhost while the browser uses 127.0.0.1.
  const requestOrigin = `${request.nextUrl.protocol}//${request.headers.get("host") || request.nextUrl.host}`;
  if (origin && origin !== requestOrigin) return fail("Open the directory page to continue.", 403);
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) return fail("Use the access code form.", 415);
  if (Number(request.headers.get("content-length")) > 256) return fail("Enter the 4-digit code.", 413);
  let code: unknown;
  try {
    const reader = request.body?.getReader();
    if (!reader) return fail("Enter the 4-digit code.", 400);
    let length = 0; const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > 256) { await reader.cancel(); return fail("Enter the 4-digit code.", 413); }
      chunks.push(value);
    }
    code = JSON.parse(Buffer.concat(chunks).toString("utf8"))?.code;
  } catch { return fail("Enter the 4-digit code.", 400); }
  if (typeof code !== "string") return fail("Enter the 4-digit code.", 400);
  const normalized = code.replace(/\s/g, "");
  if (!/^\d{4}$/.test(normalized)) return fail("Enter the 4-digit code.", 400);
  try {
    const address = (request.headers.get("x-vercel-forwarded-for") || request.headers.get("x-forwarded-for") || "unknown").split(",")[0].trim().slice(0, 100);
    const bucket = createHash("sha256").update(`mockups-directory:${address}`).digest("hex");
    await sql.query(`DELETE FROM mockup_directory_attempts WHERE bucket IN
      (SELECT bucket FROM mockup_directory_attempts WHERE window_start < now() - interval '1 day' LIMIT 100)`);
    const rows = await sql.query<{ attempts: number }>(`INSERT INTO mockup_directory_attempts (bucket) VALUES ($1)
      ON CONFLICT (bucket) DO UPDATE SET
        attempts = CASE WHEN mockup_directory_attempts.window_start < now() - interval '15 minutes' THEN 1 ELSE mockup_directory_attempts.attempts + 1 END,
        window_start = CASE WHEN mockup_directory_attempts.window_start < now() - interval '15 minutes' THEN now() ELSE mockup_directory_attempts.window_start END
      RETURNING attempts`, [bucket]);
    if (!rows[0] || rows[0].attempts > 10) return fail("Too many attempts. Please try again in 15 minutes.", 429, { "Retry-After": "900" });
    if (!checkDirectoryCode(normalized)) return fail("That code didn’t match. Please try again.", 401);
    const response = NextResponse.json({ ok: true }, { headers });
    response.cookies.set(DIRECTORY_COOKIE, createDirectoryToken(), {
      httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax",
      path: "/mockups", maxAge: DIRECTORY_TTL_SECONDS,
    });
    return response;
  } catch {
    console.error("Mockup directory access unavailable");
    return fail("The directory is temporarily unavailable. Please try again shortly.", 503);
  }
}
