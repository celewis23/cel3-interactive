import { DateTime } from "luxon";
import AnalyticsDashboard from "./analytics/AnalyticsDashboard";

export const dynamic = "force-dynamic";

const TZ = "America/New_York";

export default function AdminDashboard() {
  const todayLabel = DateTime.now().setZone(TZ).toFormat("cccc, LLLL d");

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2 border-b border-white/8 pb-5">
        <p className="text-xs uppercase tracking-[0.22em] text-sky-300/70">{todayLabel}</p>
        <div>
          <h1 className="text-2xl font-semibold text-white">Dashboard</h1>
          <p className="mt-1 text-sm text-white/40">
            Revenue, pipeline activity, project health, lead flow, and workspace actions in one place.
          </p>
        </div>
      </div>

      <AnalyticsDashboard />
    </div>
  );
}
