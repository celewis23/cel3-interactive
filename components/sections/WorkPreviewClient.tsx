import Link from "next/link";
import MarketingImage from "@/components/seo/MarketingImage";

type Item = {
  _id: string;
  title: string;
  slug: string;
  summary?: string;
  client?: string;
  industry?: string;
  tags?: string[];
  href?: string | null;
  heroUrl?: string | null;
};

const generatedGradients = [
  "from-sky-300/28 via-cyan-300/10 to-white/5",
  "from-emerald-300/24 via-sky-300/10 to-white/5",
  "from-amber-300/24 via-rose-300/10 to-white/5",
  "from-fuchsia-300/22 via-sky-300/10 to-white/5",
];

function initials(title: string) {
  return title
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .map((word) => word[0]?.toUpperCase())
    .join("");
}

function GeneratedPreview({ title, index }: { title: string; index: number }) {
  return (
    <div
      className={`relative flex h-full min-h-[190px] items-center justify-center overflow-hidden bg-gradient-to-br ${generatedGradients[index % generatedGradients.length]}`}
    >
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:22px_22px] opacity-35" />
      <div className="absolute left-5 top-5 h-2.5 w-2.5 rounded-full bg-sky-300" />
      <div className="absolute right-6 top-7 h-10 w-10 rounded-full border border-white/18 bg-white/5" />
      <div className="absolute bottom-5 left-5 right-5 grid grid-cols-3 gap-2">
        <div className="h-2 rounded-full bg-white/18" />
        <div className="h-2 rounded-full bg-white/10" />
        <div className="h-2 rounded-full bg-white/14" />
      </div>
      <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl border border-white/18 bg-black/32 text-2xl font-semibold text-white shadow-2xl backdrop-blur">
        {initials(title)}
      </div>
    </div>
  );
}

function WorkCard({ item, index }: { item: Item; index: number }) {
  const cardClassName =
    "group block rounded-2xl border border-white/10 bg-white/5 overflow-hidden hover:bg-white/[0.07] transition-colors";

  const cardContent = (
    <>
      <div className="relative aspect-[16/10] border-b border-white/10 bg-black/40 overflow-hidden">
        {item.heroUrl ? (
          <MarketingImage
            src={item.heroUrl}
            alt={item.title}
            className="h-full w-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
            width={800}
            height={500}
            sizes="(min-width: 1024px) 360px, (min-width: 768px) 45vw, 92vw"
            loading="lazy"
          />
        ) : (
          <GeneratedPreview title={item.title} index={index} />
        )}

        <div className="pointer-events-none absolute inset-0 opacity-60">
          <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-black/0 to-black/10" />
        </div>

        <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
          <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/10 to-white/0" />
        </div>
      </div>

      <div className="p-5">
        <div className="text-lg font-semibold">{item.title}</div>
        <div className="mt-1 text-xs text-white/50">
          {item.client ? item.client : "CEL3 Interactive"}{" "}
          {item.industry ? `• ${item.industry}` : ""}
        </div>

        <p className="mt-3 text-sm text-white/70 line-clamp-3">
          {item.summary ?? "Full breakdown: problem → approach → build → results."}
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {(item.tags ?? []).slice(0, 3).map((tag) => (
            <span key={tag} className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-white/56">
              {tag}
            </span>
          ))}
        </div>

        <div className="mt-5 text-sm text-white/70 group-hover:text-white transition-colors">
          {item.href ? "View case study →" : "Project snapshot"}
        </div>
      </div>
    </>
  );

  return (
    <div>
        {item.href ? (
          <Link prefetch={false} href={item.href} className={cardClassName}>
            {cardContent}
          </Link>
        ) : (
          <article className={cardClassName}>
            {cardContent}
          </article>
        )}
    </div>
  );
}

export default function WorkPreviewClient({ items }: { items: Item[] }) {
  const safeItems = items.slice(0, 6);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {safeItems.map((item, i) => (
        <WorkCard key={item._id} item={item} index={i} />
      ))}
    </div>
  );
}
