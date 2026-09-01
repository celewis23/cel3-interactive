import Link from "next/link";
import { notFound } from "next/navigation";
import { getPortalUser } from "@/lib/portal/getPortalUser";
import { getPortalNewsletter, markPortalNewsletterRead } from "@/lib/newsletters/db";
import { buildPortalNewsletterStyle, normalizeVideoUrl } from "@/lib/newsletters/render";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function fmtDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export default async function PortalNewsletterDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getPortalUser();
  const { id } = await params;
  const newsletter = await getPortalNewsletter(user._id, id);
  if (!newsletter) notFound();

  await markPortalNewsletterRead(user._id, id).catch(() => null);
  const videoUrl = normalizeVideoUrl(newsletter.videoUrl);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <Link href="/portal/newsletters" className="text-xs text-white/40 transition-colors hover:text-white/70">
          Back to Newsletters
        </Link>
        <span className="text-xs text-white/35">{fmtDate(newsletter.deliveredAt)}</span>
      </div>

      <article
        className="overflow-hidden rounded-2xl border border-white/10 shadow-2xl"
        style={buildPortalNewsletterStyle(newsletter)}
      >
        <header className="p-7 text-white md:p-9" style={{ backgroundColor: newsletter.accentColor }}>
          <div
            className="[&_a]:text-white [&_a]:underline [&_h1]:mb-0 [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:leading-tight [&_p]:my-1"
            dangerouslySetInnerHTML={{ __html: newsletter.headerHtml }}
          />
        </header>

        <main className="bg-white/95 p-7 md:p-9" style={{ color: newsletter.textColor }}>
          <div className="mb-7 border-b border-black/10 pb-5">
            <h1 className="text-3xl font-bold leading-tight">{newsletter.subject}</h1>
            {newsletter.summary && <p className="mt-3 text-sm leading-6 opacity-70">{newsletter.summary}</p>}
          </div>

          <div
            className="max-w-none text-[15px] leading-7
              [&_a]:font-medium [&_a]:underline
              [&_blockquote]:border-l-4 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:opacity-80
              [&_h1]:mb-3 [&_h1]:mt-7 [&_h1]:text-2xl [&_h1]:font-bold
              [&_h2]:mb-3 [&_h2]:mt-7 [&_h2]:text-xl [&_h2]:font-semibold
              [&_h3]:mb-2 [&_h3]:mt-5 [&_h3]:text-lg [&_h3]:font-semibold
              [&_img]:my-5 [&_img]:max-w-full [&_img]:rounded-xl
              [&_ol]:my-4 [&_ol]:list-decimal [&_ol]:pl-6
              [&_p]:my-4
              [&_ul]:my-4 [&_ul]:list-disc [&_ul]:pl-6"
            style={{ ["--tw-prose-links" as string]: newsletter.primaryColor }}
            dangerouslySetInnerHTML={{ __html: newsletter.bodyHtml }}
          />

          {videoUrl && (
            <div className="mt-8 aspect-video overflow-hidden rounded-2xl bg-black">
              <iframe
                src={videoUrl}
                title="Newsletter video"
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}
        </main>

        <footer className="p-6 text-sm leading-6 text-white md:px-9" style={{ backgroundColor: newsletter.accentColor }}>
          <div dangerouslySetInnerHTML={{ __html: newsletter.footerHtml }} />
        </footer>
      </article>
    </div>
  );
}
