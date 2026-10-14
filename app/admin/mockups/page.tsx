import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionToken, COOKIE_NAME } from "@/lib/admin/auth";
import { listMockups } from "@/lib/mockups/db";
import StatusToggle from "@/components/admin/mockups/StatusToggle";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function formatDate(value: string | null) {
  if (!value) return null;
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default async function MockupsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const session = token ? verifySessionToken(token) : null;
  if (!session || session.step !== "full") redirect("/admin/login");

  const mockups = await listMockups();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-white">Mockups</h1>
        <p className="text-sm text-white/40 mt-1">
          {mockups.length} mockup{mockups.length !== 1 ? "s" : ""} · track delivery status and client design choices
        </p>
      </div>

      {mockups.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-white/10 rounded-2xl">
          <p className="text-white/30 text-sm">No mockups yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {mockups.map((m) => (
            <Link
              key={m.slug}
              href={`/admin/mockups/${m.slug}`}
              className="flex items-center gap-4 p-4 rounded-xl border border-white/8 hover:border-white/20 bg-white/2 hover:bg-white/5 transition-all group"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white group-hover:text-sky-300 transition-colors truncate">
                    {m.name}
                  </span>
                  {m.choiceCount > 0 && (
                    <span className="shrink-0 text-xs px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-400 border border-sky-500/20">
                      {m.choiceCount} response{m.choiceCount !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
                <div className="text-xs text-white/35 mt-0.5 truncate">
                  /{m.slug}
                  {m.lastChoiceAt ? ` · last response ${formatDate(m.lastChoiceAt)}` : ""}
                  {m.status === "sent" && m.sentAt ? ` · sent ${formatDate(m.sentAt)}` : ""}
                </div>
              </div>

              <StatusToggle slug={m.slug} status={m.status} />

              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" className="text-white/20 group-hover:text-white/50 shrink-0 transition-colors">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
