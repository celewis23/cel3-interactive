import { createHash } from "node:crypto";
import type { NextRequest } from "next/server";

// ── Bot detection ─────────────────────────────────────────────────────────────

const BOT_RE =
  /bot|crawl|spider|slurp|bingpreview|scan|probe|headless|lighthouse|pingdom|uptime|monitor|facebookexternalhit|whatsapp|telegrambot|linkedinbot|twitterbot|discordbot|slackbot|embedly|quora|pinterest|vkshare|curl|wget|python|axios|go-http|okhttp|java\/|libwww|httpclient|prerender|screenshot|dataprovider|semrush|ahrefs|mj12|dotbot|petalbot|bytespider|gptbot|claudebot|ccbot|perplexity/i;

export function isBot(userAgent: string | null): boolean {
  return !userAgent || BOT_RE.test(userAgent);
}

// ── Lightweight user-agent parsing ────────────────────────────────────────────

export function parseUserAgent(ua: string): { device: string; browser: string; os: string } {
  let device = "Desktop";
  if (/iPad|Tablet|Silk/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua))) {
    device = "Tablet";
  } else if (/Mobi|iPhone|iPod/i.test(ua)) {
    device = "Mobile";
  }

  let browser = "Other";
  if (/Edg(e|A|iOS)?\//i.test(ua)) browser = "Edge";
  else if (/OPR\/|Opera/i.test(ua)) browser = "Opera";
  else if (/SamsungBrowser/i.test(ua)) browser = "Samsung Internet";
  else if (/Firefox|FxiOS/i.test(ua)) browser = "Firefox";
  else if (/CriOS|Chrome/i.test(ua)) browser = "Chrome";
  else if (/Safari/i.test(ua)) browser = "Safari";

  let os = "Other";
  if (/Windows/i.test(ua)) os = "Windows";
  else if (/iPhone|iPad|iPod/i.test(ua)) os = "iOS";
  else if (/Mac OS X|Macintosh/i.test(ua)) os = "macOS";
  else if (/Android/i.test(ua)) os = "Android";
  else if (/CrOS/i.test(ua)) os = "ChromeOS";
  else if (/Linux/i.test(ua)) os = "Linux";

  return { device, browser, os };
}

// ── Visitor identity ──────────────────────────────────────────────────────────

// Cookieless daily-rotating visitor id: the same person counts once per day,
// but no durable identifier is ever stored client-side.
export function hashVisitor(ip: string, userAgent: string): string {
  const day = new Date().toISOString().slice(0, 10);
  const salt = process.env.ANALYTICS_SALT ?? "";
  return createHash("sha256")
    .update(`${day}|${ip}|${userAgent}|${salt}`)
    .digest("hex")
    .slice(0, 32);
}

// ── Request context ───────────────────────────────────────────────────────────

export function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "0.0.0.0";
}

export function geoFromHeaders(req: NextRequest): {
  country: string | null;
  region: string | null;
  city: string | null;
} {
  const decode = (v: string | null) => {
    if (!v) return null;
    try {
      return decodeURIComponent(v);
    } catch {
      return v;
    }
  };
  return {
    country: decode(req.headers.get("x-vercel-ip-country")),
    region: decode(req.headers.get("x-vercel-ip-country-region")),
    city: decode(req.headers.get("x-vercel-ip-city")),
  };
}
