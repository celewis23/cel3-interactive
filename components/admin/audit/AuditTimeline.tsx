"use client";

import { useState, useEffect } from "react";

interface AuditEvent {
  _id: string;
  timestamp: string;
  userName: string;
  isOwner: boolean;
  action: string;
  description: string;
  ipAddress: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
}

interface Props {
  resourceId: string;
  resourceType?: string;
}

function formatTs(ts: string) {
  const d = new Date(ts);
  return d.toLocaleString(undefined, {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function actionDot(action: string) {
  if (action.includes("delete") || action.includes("void") || action.includes("declined")) return "bg-red-500";
  if (action.includes("create") || action.includes("invite") || action.includes("approved")) return "bg-emerald-500";
  if (action.includes("send") || action.includes("sign") || action.includes("login")) return "bg-sky-500";
  return "bg-white/30";
}

export default function AuditTimeline({ resourceId, resourceType }: Props) {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!resourceId) return;
    const params = new URLSearchParams({ resourceId, limit: "100" });
    if (resourceType) params.set("resourceType", resourceType);

    fetch(`/api/admin/audit?${params}`)
      .then((r) => r.ok ? r.json() : { events: [] })
      .then((d) => setEvents(d.events ?? []))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, [resourceId, resourceType]);

  if (loading) {
    return <div className="text-sm text-white/30 py-4 text-center">Loading activity…</div>;
  }

  if (events.length === 0) {
    return <div className="text-sm text-white/30 py-4 text-center">No activity recorded</div>;
  }

  return (
    <div className="space-y-0">
      {events.map((ev, i) => (
        <div key={ev._id} className="flex gap-3">
          {/* Dot + line */}
          <div className="flex flex-col items-center">
            <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${actionDot(ev.action)}`} />
            {i < events.length - 1 && <div className="w-px flex-1 bg-white/8 mt-1" />}
          </div>

          {/* Content */}
          <div className="pb-4 min-w-0">
            <p className="text-sm text-white/80">{ev.description}</p>
            <p className="text-xs text-white/35 mt-0.5">
              {ev.userName} · {formatTs(ev.timestamp)}
            </p>
            <span className="inline-block mt-1 text-[10px] font-mono text-white/30">{ev.action}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
