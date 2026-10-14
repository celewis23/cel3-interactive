import Link from "next/link";
import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { verifySessionToken, COOKIE_NAME } from "@/lib/admin/auth";
import { getMockupBySlug, listChoicesForMockup } from "@/lib/mockups/db";
import StatusToggle from "@/components/admin/mockups/StatusToggle";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

export default async function MockupDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const session = token ? verifySessionToken(token) : null;
  if (!session || session.step !== "full") redirect("/admin/login");

  const { slug } = await params;
  const mockup = await getMockupBySlug(slug);
  if (!mockup) notFound();
  const choices = await listChoicesForMockup(slug);

  return (
    <div>
      <Link href="/admin/mockups" className="text-sm text-white/40 hover:text-white/70 transition-colors">
        ← All mockups
      </Link>

      <div className="flex items-center justify-between gap-4 mt-3 mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-white">{mockup.name}</h1>
          <p className="text-sm text-white/40 mt-1">
            /{mockup.slug} ·{" "}
            <a
              href={`/mockups/${mockup.slug}/`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sky-400 hover:text-sky-300"
            >
              open the mockup ↗
            </a>
          </p>
        </div>
        <StatusToggle slug={mockup.slug} status={mockup.status} />
      </div>

      <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wide mb-3">
        {choices.length} design choice{choices.length !== 1 ? "s" : ""}
      </h2>

      {choices.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-white/10 rounded-2xl">
          <p className="text-white/30 text-sm">No one has picked a direction on this mockup yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {choices.map((c) => (
            <div key={c.id} className="p-4 rounded-xl border border-white/8 bg-white/2">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white">{c.contactName}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-400 border border-sky-500/20">
                    {c.concept}
                  </span>
                </div>
                <span className="text-xs text-white/35">{formatDateTime(c.createdAt)}</span>
              </div>
              <div className="text-xs text-white/50 mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
                {c.contactEmail && <a href={`mailto:${c.contactEmail}`} className="hover:text-white/80">{c.contactEmail}</a>}
                {c.contactPhone && <a href={`tel:${c.contactPhone}`} className="hover:text-white/80">{c.contactPhone}</a>}
                {c.pipelineContactId && (
                  <Link href={`/admin/pipeline/contacts/${c.pipelineContactId}`} className="text-sky-400 hover:text-sky-300">
                    view in pipeline →
                  </Link>
                )}
              </div>
              {c.notes && (
                <p className="text-sm text-white/70 mt-3 whitespace-pre-wrap leading-relaxed border-t border-white/8 pt-3">
                  {c.notes}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
