import Link from "next/link";

type Pillar = {
  label: string;
  href: string;
  desc: string;
};

const PILLARS: Pillar[] = [
  {
    label: "Custom Web Applications",
    href: "/custom-web-applications",
    desc: "Platforms, portals, and internal tools built around real workflows.",
  },
  {
    label: "Custom CRMs & Dashboards",
    href: "/custom-crm-dashboards",
    desc: "Replace spreadsheets with a single source of truth and automation.",
  },
  {
    label: "Interactive Digital Experiences",
    href: "/interactive-digital-experiences",
    desc: "Marketing and brand experiences that communicate state and intent.",
  },
    {
    label: "AI-Enhanced Systems",
    href: "/ai-enhanced-systems",
    desc: "Marketing and brand experiences that communicate state and intent.",
  },
];

export default function PillarLinks({
  currentHref,
  title = "Explore the system",
}: {
  currentHref: string;
  title?: string;
}) {
  const related = PILLARS.filter((p) => p.href !== currentHref);

  return (
    <section className="mt-10 rounded-2xl border border-white/10 bg-black/25 backdrop-blur p-6">
      <div className="flex items-end justify-between gap-6">
        <div>
          <p className="text-xs tracking-[0.25em] uppercase text-white/55">
            Pillar cluster
          </p>
          <h2 className="mt-3 text-2xl md:text-3xl font-semibold tracking-tight text-white">
            {title}
          </h2>
          <p className="mt-3 max-w-3xl text-sm text-white/70">
            These pillars connect. If one matches your need, the others usually matter too.
          </p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-3">
        {related.map((p) => (
          <Link
            key={p.href}
            href={p.href}
            className="group rounded-xl border border-white/10 bg-white/5 p-4 transition-colors hover:bg-white/10"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="text-sm font-semibold text-white">{p.label}</div>
              <span className="text-xs tracking-[0.22em] uppercase text-white/45 group-hover:text-white/70 transition-colors">
                Open →
              </span>
            </div>
            <div className="mt-2 text-sm text-white/70">{p.desc}</div>

            {/* subtle “signal” underline */}
            <div className="mt-4 h-px w-full bg-white/10 overflow-hidden rounded-full relative">
              <div
                className="absolute inset-y-0 -left-24 w-24 opacity-0 group-hover:opacity-60 transition-opacity"
                style={{
                  background:
                    "linear-gradient(to right, transparent, rgba(var(--accent),0.55), transparent)",
                  animation: "pillarLinkSweep 2.6s linear infinite",
                }}
              />
            </div>
          </Link>
        ))}
      </div>

      <style>{`
        @keyframes pillarLinkSweep {
          0% { transform: translateX(0); opacity: 0; }
          15% { opacity: .6; }
          50% { opacity: .75; }
          85% { opacity: .6; }
          100% { transform: translateX(520px); opacity: 0; }
        }
      `}</style>
    </section>
  );
}
