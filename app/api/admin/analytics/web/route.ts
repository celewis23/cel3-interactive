import { NextRequest, NextResponse } from "next/server";
import { DateTime } from "luxon";
import { requirePermission } from "@/lib/admin/permissions";
import { sql } from "@/lib/postgres";

export const runtime = "nodejs";

const TZ = "America/New_York";

type Range = "today" | "7d" | "30d" | "90d" | "12m";
type Granularity = "hour" | "day" | "month";

function rangeWindow(range: Range): {
  start: DateTime;
  prevStart: DateTime;
  granularity: Granularity;
} {
  const now = DateTime.now().setZone(TZ);
  switch (range) {
    case "today": {
      const start = now.startOf("day");
      return { start, prevStart: start.minus({ days: 1 }), granularity: "hour" };
    }
    case "7d": {
      const start = now.startOf("day").minus({ days: 6 });
      return { start, prevStart: start.minus({ days: 7 }), granularity: "day" };
    }
    case "90d": {
      const start = now.startOf("day").minus({ days: 89 });
      return { start, prevStart: start.minus({ days: 90 }), granularity: "day" };
    }
    case "12m": {
      const start = now.startOf("month").minus({ months: 11 });
      return { start, prevStart: start.minus({ months: 12 }), granularity: "month" };
    }
    case "30d":
    default: {
      const start = now.startOf("day").minus({ days: 29 });
      return { start, prevStart: start.minus({ days: 30 }), granularity: "day" };
    }
  }
}

// Fill missing buckets so charts show gaps as zeros
function fillSeries(
  rows: { bucket: string; pageviews: number; visitors: number; sessions: number }[],
  start: DateTime,
  granularity: Granularity
) {
  const byBucket = new Map(rows.map((r) => [r.bucket, r]));
  const end = DateTime.now().setZone(TZ);
  const step = { [granularity + "s"]: 1 } as Record<string, number>;
  const series: { bucket: string; pageviews: number; visitors: number; sessions: number }[] = [];
  for (let t = start; t <= end; t = t.plus(step)) {
    const key = t.toFormat("yyyy-MM-dd'T'HH:mm");
    const row = byBucket.get(key);
    series.push({
      bucket: key,
      pageviews: row ? Number(row.pageviews) : 0,
      visitors: row ? Number(row.visitors) : 0,
      sessions: row ? Number(row.sessions) : 0,
    });
  }
  return series;
}

export async function GET(req: NextRequest) {
  const denied = await requirePermission(req, "analytics", "view");
  if (denied) return denied;

  const rangeParam = req.nextUrl.searchParams.get("range");
  const range: Range = (["today", "7d", "30d", "90d", "12m"] as const).includes(
    rangeParam as Range
  )
    ? (rangeParam as Range)
    : "30d";

  const { start, prevStart, granularity } = rangeWindow(range);
  const startIso = start.toUTC().toISO();
  const prevStartIso = prevStart.toUTC().toISO();

  const pv = `event_type = 'pageview'`;

  try {
    const [
      summaryRows,
      sessionRows,
      seriesRows,
      pages,
      referrers,
      sources,
      campaigns,
      countries,
      devices,
      browsers,
      oses,
      customEvents,
      realtimeRows,
    ] = await Promise.all([
      sql.query<{
        pv_cur: string; pv_prev: string;
        uv_cur: string; uv_prev: string;
        dur_cur: string | null; dur_prev: string | null;
      }>(
        `SELECT
           count(*) FILTER (WHERE created_at >= $2) AS pv_cur,
           count(*) FILTER (WHERE created_at < $2) AS pv_prev,
           count(DISTINCT visitor_id) FILTER (WHERE created_at >= $2) AS uv_cur,
           count(DISTINCT visitor_id) FILTER (WHERE created_at < $2) AS uv_prev,
           avg(duration_sec) FILTER (WHERE created_at >= $2) AS dur_cur,
           avg(duration_sec) FILTER (WHERE created_at < $2) AS dur_prev
         FROM web_events
         WHERE ${pv} AND created_at >= $1`,
        [prevStartIso, startIso]
      ),
      sql.query<{ bucket: string; sessions: string; bounces: string }>(
        `SELECT CASE WHEN started >= $2 THEN 'cur' ELSE 'prev' END AS bucket,
                count(*) AS sessions,
                count(*) FILTER (WHERE views = 1) AS bounces
         FROM (
           SELECT session_id, min(created_at) AS started, count(*) AS views
           FROM web_events
           WHERE ${pv} AND created_at >= $1
           GROUP BY session_id
         ) s
         GROUP BY 1`,
        [prevStartIso, startIso]
      ),
      sql.query<{ bucket: string; pageviews: number; visitors: number; sessions: number }>(
        `SELECT to_char(date_trunc($1, created_at AT TIME ZONE '${TZ}'), 'YYYY-MM-DD"T"HH24:MI') AS bucket,
                count(*) AS pageviews,
                count(DISTINCT visitor_id) AS visitors,
                count(DISTINCT session_id) AS sessions
         FROM web_events
         WHERE ${pv} AND created_at >= $2
         GROUP BY 1 ORDER BY 1`,
        [granularity, startIso]
      ),
      sql.query<{ path: string; views: string; visitors: string; avg_sec: string | null }>(
        `SELECT path, count(*) AS views, count(DISTINCT visitor_id) AS visitors,
                round(avg(duration_sec)) AS avg_sec
         FROM web_events WHERE ${pv} AND created_at >= $1
         GROUP BY path ORDER BY views DESC LIMIT 12`,
        [startIso]
      ),
      sql.query<{ label: string; visitors: string; views: string }>(
        `SELECT coalesce(nullif(referrer_host, ''), 'Direct / none') AS label,
                count(DISTINCT visitor_id) AS visitors, count(*) AS views
         FROM web_events WHERE ${pv} AND created_at >= $1
         GROUP BY 1 ORDER BY 2 DESC LIMIT 12`,
        [startIso]
      ),
      sql.query<{ label: string; visitors: string; views: string }>(
        `SELECT coalesce(nullif(utm_source, ''), nullif(referrer_host, ''), 'Direct') AS label,
                count(DISTINCT visitor_id) AS visitors, count(*) AS views
         FROM web_events WHERE ${pv} AND created_at >= $1
         GROUP BY 1 ORDER BY 2 DESC LIMIT 12`,
        [startIso]
      ),
      sql.query<{ label: string; visitors: string; views: string }>(
        `SELECT utm_campaign AS label,
                count(DISTINCT visitor_id) AS visitors, count(*) AS views
         FROM web_events
         WHERE ${pv} AND created_at >= $1 AND utm_campaign IS NOT NULL AND utm_campaign <> ''
         GROUP BY 1 ORDER BY 2 DESC LIMIT 12`,
        [startIso]
      ),
      sql.query<{ label: string; visitors: string; views: string }>(
        `SELECT coalesce(nullif(country, ''), 'Unknown') AS label,
                count(DISTINCT visitor_id) AS visitors, count(*) AS views
         FROM web_events WHERE ${pv} AND created_at >= $1
         GROUP BY 1 ORDER BY 2 DESC LIMIT 12`,
        [startIso]
      ),
      sql.query<{ label: string; visitors: string; views: string }>(
        `SELECT coalesce(device, 'Other') AS label,
                count(DISTINCT visitor_id) AS visitors, count(*) AS views
         FROM web_events WHERE ${pv} AND created_at >= $1
         GROUP BY 1 ORDER BY 2 DESC`,
        [startIso]
      ),
      sql.query<{ label: string; visitors: string; views: string }>(
        `SELECT coalesce(browser, 'Other') AS label,
                count(DISTINCT visitor_id) AS visitors, count(*) AS views
         FROM web_events WHERE ${pv} AND created_at >= $1
         GROUP BY 1 ORDER BY 2 DESC LIMIT 8`,
        [startIso]
      ),
      sql.query<{ label: string; visitors: string; views: string }>(
        `SELECT coalesce(os, 'Other') AS label,
                count(DISTINCT visitor_id) AS visitors, count(*) AS views
         FROM web_events WHERE ${pv} AND created_at >= $1
         GROUP BY 1 ORDER BY 2 DESC LIMIT 8`,
        [startIso]
      ),
      sql.query<{ label: string; visitors: string; views: string }>(
        `SELECT event_name AS label,
                count(DISTINCT visitor_id) AS visitors, count(*) AS views
         FROM web_events
         WHERE event_type = 'event' AND created_at >= $1
         GROUP BY 1 ORDER BY 3 DESC LIMIT 12`,
        [startIso]
      ),
      sql.query<{ n: string }>(
        `SELECT count(DISTINCT visitor_id) AS n
         FROM web_events
         WHERE ${pv} AND created_at >= now() - interval '5 minutes'`
      ),
    ]);

    const s = summaryRows[0];
    const sessionsCur = sessionRows.find((r) => r.bucket === "cur");
    const sessionsPrev = sessionRows.find((r) => r.bucket === "prev");
    const bounceRate = (row?: { sessions: string; bounces: string }) => {
      const total = Number(row?.sessions ?? 0);
      return total > 0 ? Math.round((Number(row?.bounces ?? 0) / total) * 100) : null;
    };

    const toList = (rows: { label: string; visitors: string; views: string }[]) =>
      rows.map((r) => ({ label: r.label, visitors: Number(r.visitors), views: Number(r.views) }));

    return NextResponse.json({
      range,
      granularity,
      realtime: Number(realtimeRows[0]?.n ?? 0),
      summary: {
        visitors: { current: Number(s?.uv_cur ?? 0), previous: Number(s?.uv_prev ?? 0) },
        pageviews: { current: Number(s?.pv_cur ?? 0), previous: Number(s?.pv_prev ?? 0) },
        sessions: {
          current: Number(sessionsCur?.sessions ?? 0),
          previous: Number(sessionsPrev?.sessions ?? 0),
        },
        bounceRate: { current: bounceRate(sessionsCur), previous: bounceRate(sessionsPrev) },
        avgDuration: {
          current: s?.dur_cur != null ? Math.round(Number(s.dur_cur)) : null,
          previous: s?.dur_prev != null ? Math.round(Number(s.dur_prev)) : null,
        },
      },
      timeseries: fillSeries(seriesRows, start, granularity),
      pages: pages.map((p) => ({
        label: p.path,
        views: Number(p.views),
        visitors: Number(p.visitors),
        avgSec: p.avg_sec != null ? Number(p.avg_sec) : null,
      })),
      referrers: toList(referrers),
      sources: toList(sources),
      campaigns: toList(campaigns),
      countries: toList(countries),
      devices: toList(devices),
      browsers: toList(browsers),
      oses: toList(oses),
      events: toList(customEvents),
    });
  } catch (err) {
    console.error("web analytics query failed", err);
    return NextResponse.json({ error: "Failed to load analytics" }, { status: 500 });
  }
}
