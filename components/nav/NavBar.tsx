"use client";

import { useEffect, useState } from "react";
import { Container } from "../layout/Container";
import Link from "next/link";

const links = [
  { href: "#work", label: "Highlights"},
  { href: "https://www.cel3interactive.com/work", label: "Work" },
  { href: "#capabilities", label: "Capabilities" },
  { href: "#approach", label: "Approach" },
  { href: "#fit", label: "Fit" },
];

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
              href="https://www.cel3interactive.com"
              className="text-white font-semibold tracking-tight"
              aria-label="CEL3 Interactive"
            >
              CEL3 Interactive
            </Link>

            <nav className="hidden md:flex items-center gap-7">
              {links.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  className="text-sm text-white/70 hover:text-white transition-colors"
                >
                  {l.label}
                </a>
              ))}
              <a
                href="#fit"
                className="text-sm text-white border border-white/20 hover:border-white/40 rounded-full px-4 py-2 transition-colors"
              >
                Let’s See If We’re a Fit
              </a>
            </nav>

            <a
              href="#fit"
              className="md:hidden text-xs text-white border border-white/20 rounded-full px-3 py-2"
            >
              Fit
            </a>
          </div>
        </Container>
      </div>
    </div>
  );
}
