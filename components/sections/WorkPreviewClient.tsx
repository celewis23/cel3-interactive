"use client";

import Link from "next/link";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { useMemo } from "react";

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

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

// Premium easing curve (smooth, not bouncy)
const easePremium: [number, number, number, number] = [0.21, 0.47, 0.32, 0.98];

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
  const mx = useMotionValue(0);
  const my = useMotionValue(0);

  // Smoother “magnetic” movement (a touch heavier)
  const sx = useSpring(mx, { stiffness: 110, damping: 18, mass: 0.7 });
  const sy = useSpring(my, { stiffness: 110, damping: 18, mass: 0.7 });

  const onMove = (e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width; // 0..1
    const py = (e.clientY - rect.top) / rect.height; // 0..1

    // Gentle drift. Premium = subtle.
    const dx = (px - 0.5) * 14;
    const dy = (py - 0.5) * 10;

    mx.set(clamp(dx, -10, 10));
    my.set(clamp(dy, -8, 8));
  };

  const onLeave = () => {
    mx.set(0);
    my.set(0);
  };

  const cardClassName =
    "group block rounded-2xl border border-white/10 bg-white/5 overflow-hidden hover:bg-white/[0.07] transition-colors";

  const cardContent = (
    <>
      <div className="relative aspect-[16/10] border-b border-white/10 bg-black/40 overflow-hidden">
        {item.heroUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <motion.img
            src={item.heroUrl}
            alt={item.title}
            className="h-full w-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
            whileHover={{ scale: 1.045 }}
            transition={{ duration: 0.55, ease: easePremium }}
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
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-90px" }}
      transition={{ duration: 0.55, ease: easePremium, delay: index * 0.06 }}
    >
      <motion.div
        style={{ x: sx, y: sy }}
        whileHover={{ scale: 1.012 }}
        transition={{ type: "spring", stiffness: 210, damping: 18 }}
        className="will-change-transform"
      >
        {item.href ? (
          <Link href={item.href} onMouseMove={onMove} onMouseLeave={onLeave} className={cardClassName}>
            {cardContent}
          </Link>
        ) : (
          <article onMouseMove={onMove} onMouseLeave={onLeave} className={cardClassName}>
            {cardContent}
          </article>
        )}
      </motion.div>
    </motion.div>
  );
}

export default function WorkPreviewClient({ items }: { items: Item[] }) {
  const safeItems = useMemo(() => items.slice(0, 6), [items]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {safeItems.map((item, i) => (
        <WorkCard key={item._id} item={item} index={i} />
      ))}
    </div>
  );
}
