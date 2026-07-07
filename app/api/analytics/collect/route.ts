import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/postgres";
import { isBot, parseUserAgent, hashVisitor, clientIp, geoFromHeaders } from "@/lib/analytics/web";

export const runtime = "nodejs";

// Beacon receiver for first-party website analytics. Public by design
// (called from every visitor's browser); always answers 204 so failures
// never surface to visitors or invite retries.

const ok = () =>
  new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });

function clip(v: unknown, max = 512): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s ? s.slice(0, max) : null;
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    // sendBeacon posts as text/plain, so parse the raw text
    body = JSON.parse(await req.text());
  } catch {
    return ok();
  }

  const ua = req.headers.get("user-agent") ?? "";
  if (isBot(ua)) return ok();

  try {
    if (body.t === "exit") {
      const id = clip(body.i, 64);
      const duration = Number(body.d);
      if (id && Number.isFinite(duration) && duration >= 1) {
        await sql.query(
          `UPDATE web_events SET duration_sec = $1 WHERE id = $2 AND duration_sec IS NULL`,
          [Math.min(Math.round(duration), 7200), id]
        );
      }
      return ok();
    }

    if (body.t !== "pageview" && body.t !== "event") return ok();

    const id = clip(body.i, 64);
    const sessionId = clip(body.s, 64);
    const path = clip(body.p);
    if (!id || !sessionId || !path || !path.startsWith("/")) return ok();
    // Never record internal surfaces even if a beacon slips through
    if (/^\/(admin|portal|api|studio)(\/|$)/.test(path)) return ok();

    const eventName = body.t === "event" ? clip(body.n, 120) : null;
    if (body.t === "event" && !eventName) return ok();

    const referrer = clip(body.r, 1024);
    let referrerHost: string | null = null;
    if (referrer) {
      try {
        const host = new URL(referrer).hostname.replace(/^www\./, "");
        const selfHost = (req.headers.get("host") ?? "").replace(/^www\./, "").split(":")[0];
        if (host && host !== selfHost) referrerHost = host;
      } catch {
        // unparseable referrer — keep the raw string only
      }
    }

    const screenW = Number(body.w);
    const { device, browser, os } = parseUserAgent(ua);
    const geo = geoFromHeaders(req);

    await sql.query(
      `INSERT INTO web_events (
         id, event_type, event_name, path, referrer, referrer_host,
         utm_source, utm_medium, utm_campaign,
         visitor_id, session_id, country, region, city,
         device, browser, os, screen_w
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
       ON CONFLICT (id) DO NOTHING`,
      [
        id,
        body.t,
        eventName,
        path,
        referrerHost ? referrer : null,
        referrerHost,
        clip(body.us, 120),
        clip(body.um, 120),
        clip(body.uc, 120),
        hashVisitor(clientIp(req), ua),
        sessionId,
        geo.country,
        geo.region,
        geo.city,
        device,
        browser,
        os,
        Number.isFinite(screenW) && screenW > 0 ? Math.min(Math.round(screenW), 20000) : null,
      ]
    );
  } catch {
    // swallow — analytics must never break the site
  }
  return ok();
}
