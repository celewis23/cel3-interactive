import { readFile } from "node:fs/promises";
import path from "node:path";
import type { NextRequest } from "next/server";
import { DIRECTORY_COOKIE, verifyDirectoryToken } from "@/lib/mockups/directory-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authorized = verifyDirectoryToken(request.cookies.get(DIRECTORY_COOKIE)?.value);
  // Separate reads keep the directory entirely out of the locked page response.
  const html = authorized
    ? await readFile(path.join(process.cwd(), "app/mockups/directory.html"), "utf8")
    : await readFile(path.join(process.cwd(), "app/mockups/access.html"), "utf8");
  return new Response(html, { headers: {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "private, no-store, max-age=0",
    "Vary": "Cookie",
    "X-Content-Type-Options": "nosniff",
    "X-Robots-Tag": "noindex, nofollow, noarchive",
  } });
}
