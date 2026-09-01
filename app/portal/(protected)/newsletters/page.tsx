import Link from "next/link";
import { getPortalUser } from "@/lib/portal/getPortalUser";
import { listPortalNewsletters } from "@/lib/newsletters/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function fmtDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export default async function PortalNewslettersPage() {
  const user = await getPortalUser();
  const newsletters = await listPortalNewsletters(user._id, 100).catch(() => []);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div>
        <Link href="/portal" className="text-xs text-white/40 transition-colors hover:text-white/70">
          Back to Dashboard
        </Link>
        <h1 className="mt-4 text-2xl font-bold text-white">Newsletters</h1>
        <p className="mt-1 text-sm text-white/40">Updates, resources, and announcements from CEL3 Interactive.</p>
      </div>

      <div className="flex flex-col gap-3">
        {newsletters.length === 0 && (
          <div className="rounded-2xl border border-white/8 bg-white/3 px-5 py-8 text-sm text-white/35">
            No newsletters have been published to your portal yet.
          </div>
        )}

        {newsletters.map((newsletter) => (
          <Link
            key={newsletter.id}
            href={`/portal/newsletters/${newsletter.id}`}
            className="group rounded-2xl border border-white/8 bg-white/3 p-5 transition-colors hover:border-sky-500/35 hover:bg-sky-500/5"
          >
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  {!newsletter.readAt && <span className="h-2 w-2 rounded-full bg-sky-400" />}
                  <h2 className="truncate text-lg font-semibold text-white">{newsletter.subject}</h2>
                </div>
                {newsletter.summary && (
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-white/55">{newsletter.summary}</p>
                )}
              </div>
              <span className="shrink-0 text-xs text-white/35">{fmtDate(newsletter.deliveredAt)}</span>
            </div>
            <span className="mt-4 inline-flex text-xs font-medium text-sky-400/80 transition-colors group-hover:text-sky-300">
              Read newsletter
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
