"use client";

import { useEffect, useState } from "react";
import { Container } from "../layout/Container";
import Link from "next/link";

const links = [
  { href: "/#work", label: "Highlights" },
  { href: "/work", label: "Work" },
  { href: "/#capabilities", label: "Capabilities" },
  { href: "/#approach", label: "Approach" },
];

export function NavBar() {
  const [active, setActive] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setActive(window.scrollY > 10);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Lock body scroll when mobile menu is open (premium feel)
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

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
            {/* Brand */}
            <Link
              href="/"
              className="text-white font-semibold tracking-tight"
              aria-label="CEL3 Interactive"
              onClick={() => setOpen(false)}
            >
              CEL3 Interactive
            </Link>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-7">
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="text-sm text-white/70 hover:text-white transition-colors"
                >
                  {l.label}
                </Link>
              ))}

              <Link
                href="/#fit"
                className="text-sm text-white border border-white/20 hover:border-white/40 rounded-full px-4 py-2 transition-colors"
              >
                Let’s See If We’re a Fit
              </Link>
            </nav>

            {/* Mobile actions */}
            <div className="md:hidden flex items-center gap-2">
              <button
                type="button"
                aria-label={open ? "Close menu" : "Open menu"}
                aria-expanded={open}
                onClick={() => setOpen((v) => !v)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/5 text-white hover:bg-white/10 transition-colors"
              >
                {/* hamburger -> X */}
                <span className="relative block h-4 w-5">
                  <span
                    className={[
                      "absolute left-0 top-0 h-[2px] w-5 bg-white transition-transform duration-200",
                      open ? "translate-y-[7px] rotate-45" : "",
                    ].join(" ")}
                  />
                  <span
                    className={[
                      "absolute left-0 top-[7px] h-[2px] w-5 bg-white transition-opacity duration-200",
                      open ? "opacity-0" : "opacity-100",
                    ].join(" ")}
                  />
                  <span
                    className={[
                      "absolute left-0 top-[14px] h-[2px] w-5 bg-white transition-transform duration-200",
                      open ? "translate-y-[-7px] -rotate-45" : "",
                    ].join(" ")}
                  />
                </span>
              </button>
            </div>
          </div>
        </Container>
      </div>

      {/* Mobile overlay menu */}
      {open ? (
        <div className="md:hidden fixed inset-0 z-50">
          {/* Backdrop */}
          <button
            aria-label="Close menu"
            className="absolute inset-0 bg-black/60"
            onClick={() => setOpen(false)}
          />

          {/* Panel */}
          <div className="absolute left-0 right-0 top-0">
            <div className="pt-20 px-4">
              <div className="mx-auto max-w-6xl rounded-2xl border border-white/10 bg-black/70 backdrop-blur-md overflow-hidden">
                <div className="p-4">
                  <div className="text-xs tracking-[0.25em] uppercase text-white/55">
                    Navigation
                  </div>

                  <div className="mt-4 grid gap-2">
                    <Link
                      href="/work"
                      onClick={() => setOpen(false)}
                      className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white/85 hover:bg-white/10 transition-colors"
                    >
                      Work
                    </Link>

                    <Link
                      href="/#work"
                      onClick={() => setOpen(false)}
                      className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white/85 hover:bg-white/10 transition-colors"
                    >
                      Highlights
                    </Link>

                    {links
                      .filter((l) => l.label !== "Work" && l.label !== "Highlights")
                      .map((l) => (
                        <Link
                          key={l.href}
                          href={l.href}
                          onClick={() => setOpen(false)}
                          className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white/85 hover:bg-white/10 transition-colors"
                        >
                          {l.label}
                        </Link>
                      ))}

                    <Link
                      href="/#fit"
                      onClick={() => setOpen(false)}
                      className="rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-white hover:bg-white/15 transition-colors"
                    >
                      Let’s See If We’re a Fit →
                    </Link>
                  </div>

                  <div className="mt-4 text-sm text-white/60">
                    Tap anywhere outside to close.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
