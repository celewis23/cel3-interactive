import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Public release information contains no account data or device credentials. */
export async function GET() {
  try {
    const release = JSON.parse(await readFile(path.join(process.cwd(), "public/downloads/meterwise-release.json"), "utf8"));
    return NextResponse.json(release, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "No Android release is available yet" }, { status: 404, headers: { "Cache-Control": "no-store" } });
  }
}
