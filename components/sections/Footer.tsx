import Link from "next/link";
import { Container } from "../layout/Container";
import { NAV_LINKS, PILLAR_LINKS } from "@/lib/siteLinks";
import { Logo } from "@/components/brand/Logo";
import ClientYear from "@/components/ui/ClientYear";

export default function Footer() {
  // Server-safe (no hydration edge cases at year boundary).
  // Update yearly, or swap to a tiny client component if you want it dynamic.
  const year = 2026;

  return (
    <footer className="relative border-t border-white/10 bg-black/30">
      <Container>
        <div className="py-14">
          <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
            {/* Brand */}
            <div className="max-w-sm">
              <div className="text-white font-semibold tracking-tight">
                <Logo />
              </div>

              <p className="mt-3 text-sm text-white/65">
                Interactive websites, web apps, and dashboards for teams ready to
                invest in forward-thinking technology.
              </p>

              <div className="mt-5 flex items-center gap-3 text-sm">
                <Link
                  href="/assessment"
                  className="rounded-full border border-white/20 bg-white/5 px-4 py-2 text-white/85 hover:bg-[rgb(var(--accent))] transition-colors"
                >
                  Start With an Assessment
                </Link>

                <Link
                  href="/work"
                  className="text-white/70 hover:text-[rgb(var(--accent))] transition-colors"
                >
                  View Work →
                </Link>
              </div>
            </div>

            {/* Nav (shared) */}
            <div className="grid grid-cols-2 gap-x-10 gap-y-2 md:grid-cols-1">
              <div className="col-span-2 md:col-span-1 text-xs tracking-[0.25em] uppercase text-white/45 mb-2">
                Navigation
              </div>

              {NAV_LINKS.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="text-sm text-white/70 hover:text-[rgb(var(--accent))] transition-colors"
                >
                  {l.label}
                </Link>
              ))}
            </div>
              {/* Pillars (footer-only) */}
              <div>
                <div className="text-xs tracking-[0.25em] uppercase text-white/45 mb-3">
                  Capabilities
                </div>
                <ul className="space-y-2">
                  {PILLAR_LINKS.map((p) => (
                    <li key={p.href}>
                      <Link
                        href={p.href}
                        className="text-sm text-white/70 hover:text-[rgb(var(--accent))] transition-colors"
                      >
                        {p.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            {/* Contact / small trust */}
            <div className="max-w-sm">
              <div className="text-xs tracking-[0.25em] uppercase text-white/45">
                Contact
              </div>

              <p className="mt-3 text-sm text-white/65">
                Prefer email? Send your scope and timeline.
              </p>

              <a
                href="mailto:info@cel3interactive.com"
                className="mt-3 inline-flex text-sm text-white/80 hover:text-[rgb(var(--accent))] transition-colors"
              >
                info@cel3interactive.com
              </a>

              {/* subtle footer “signal” interaction (CSS-only) */}
              <div className="mt-6 h-px w-full bg-white/10 overflow-hidden rounded-full relative">
                <div className="footer-sweep absolute inset-y-0 w-24 opacity-60" />
              </div>
            </div>
          </div>

          <div className="mt-10 flex flex-col gap-2 border-t border-white/10 pt-6 md:flex-row md:items-center md:justify-between">
            <div className="text-xs text-white/50">
              © <ClientYear /> CEL3 Interactive. All rights reserved.
            </div>
            <div className="text-xs text-white/45">
              Built for speed • Built for clarity
            </div>
          </div>
        </div>
      </Container>
    </footer>
  );
}
