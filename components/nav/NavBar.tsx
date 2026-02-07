"use client";

import { useEffect, useState } from "react";
import { Container } from "../layout/Container";
import Link from "next/link";
import { NAV_LINKS } from "@/lib/siteLinks";
import { Logo } from "../brand/Logo";

export function NavBar() {
  const [active, setActive] = useState(false);

  useEffect(() => {
    const onScroll = () => setActive(window.scrollY > 10);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="fixed inset-x-0 top-0 z-50">
      <div
        className={[
          "transition-all",
          active
            ? "backdrop-blur bg-black/40 border-b border-white/10"
            : "bg-transparent",
        ].join(" ")}
      >
        <Container>
          <div className="flex items-center justify-between py-4">
            <Link
              href="/"
              className="text-white font-semibold tracking-tight"
              aria-label="CEL3 Interactive"
            >
              <Logo />
            </Link>

            <nav className="hidden md:flex items-center gap-7">
              {NAV_LINKS.filter((l) => l.label !== "Fit").map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="text-sm text-white/70 hover:text-[rgb(var(--accent))]/100 transition-colors"
                >
                  {l.label}
                </Link>
              ))}

              <Link
                href="/#fit"
                className="text-sm text-white border border-white/20 hover:bg-[rgb(var(--accent))]/100 rounded-full px-4 py-2 transition-colors"
              >
                Let’s See If We’re a Fit
              </Link>
            </nav>

            {/* mobile: keep minimal, you already have a mobile menu elsewhere */}
            <div className="md:hidden" />
          </div>
        </Container>
      </div>
    </div>
  );
}
