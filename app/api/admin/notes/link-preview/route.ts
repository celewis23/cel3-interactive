export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";

function readMeta(html: string, names: string[]) {
  for (const name of names) {
    const propertyPattern = new RegExp(`<meta[^>]+(?:property|name)=["']${name}["'][^>]+content=["']([^"']*)["'][^>]*>`, "i");
    const contentFirstPattern = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${name}["'][^>]*>`, "i");
    const match = html.match(propertyPattern) || html.match(contentFirstPattern);
    if (match?.[1]) return match[1].trim();
  }
  return "";
}

function readTitle(html: string) {
  const title = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() ?? "";
  return title.replace(/\s+/g, " ");
}

function absolutize(value: string, base: URL) {
  if (!value) return "";
  try {
    return new URL(value, base).toString();
  } catch {
    return value;
  }
}

export async function GET(req: NextRequest) {
  const authErr = await requirePermission(req, "notes", "view");
  if (authErr) return authErr;

  const rawUrl = new URL(req.url).searchParams.get("url")?.trim();
  if (!rawUrl) return NextResponse.json({ error: "URL is required" }, { status: 400 });

  let target: URL;
  try {
    target = new URL(rawUrl);
    if (target.protocol !== "http:" && target.protocol !== "https:") throw new Error("Unsupported protocol");
  } catch {
    return NextResponse.json({ error: "Valid http or https URL is required" }, { status: 400 });
  }

  try {
    const res = await fetch(target.toString(), {
      redirect: "follow",
      headers: {
        "User-Agent": "CEL3InteractiveNotes/1.0 (+https://cel3interactive.com)",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(6500),
    });
    const contentType = res.headers.get("content-type") ?? "";
    if (!res.ok || !contentType.includes("text/html")) {
      return NextResponse.json({
        url: target.toString(),
        title: target.hostname,
        description: "",
        image: "",
        siteName: target.hostname,
      });
    }

    const html = (await res.text()).slice(0, 250_000);
    const finalUrl = new URL(res.url || target.toString());
    const title = readMeta(html, ["og:title", "twitter:title"]) || readTitle(html) || finalUrl.hostname;
    const description = readMeta(html, ["og:description", "description", "twitter:description"]);
    const image = absolutize(readMeta(html, ["og:image", "twitter:image"]), finalUrl);
    const siteName = readMeta(html, ["og:site_name"]) || finalUrl.hostname;

    return NextResponse.json({
      url: finalUrl.toString(),
      title,
      description,
      image,
      siteName,
    });
  } catch {
    return NextResponse.json({
      url: target.toString(),
      title: target.hostname,
      description: "",
      image: "",
      siteName: target.hostname,
    });
  }
}
