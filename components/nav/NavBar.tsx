"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Container } from "../layout/Container";
import { NAV_LINKS } from "@/lib/siteLinks";
import { Logo } from "../brand/Logo";

export function NavBar() {
  const [active, setActive] = useState(false);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // keep nav links consistent (exclude Fit from the inline list)
  const links = useMemo(
    () => NAV_LINKS.filter((l) => l.label !== "Fit"),
    []
  );

  useEffect(() => {
    const onScroll = () => setActive(window.scrollY > 10);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close menu when route changes
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Escape to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Lock body scroll when menu is open
  useEffect(() => {
    if (!open) {
      document.documentElement.style.overflow = "";
      return;
    }
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [open]);

  const headerClass = [
    "transition-all",
    active || open
      ? "backdrop-blur bg-black/40 border-b border-white/10"
      : "bg-transparent",
  ].join(" ");

  return (
    <div className="fixed inset-x-0 top-0 z-50">
      <div className={headerClass}>
        <Container>
          <div className="flex items-center justify-between py-4">
            {/* IMPORTANT: Logo already contains a Link */}
            <div className="text-white font-semibold tracking-tight">
              <Logo />
            </div>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-7">
              {links.map((l) => (
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

            {/* Mobile toggle */}
            <div className="md:hidden flex items-center gap-2">
              <button
                type="button"
                aria-label={open ? "Close menu" : "Open menu"}
                aria-expanded={open}
                onClick={() => setOpen((v) => !v)}
                className={[
                  "relative h-10 w-10 rounded-full border border-white/15 bg-white/5",
                  "hover:bg-white/10 transition-colors left-[-25px]",
                  "focus:outline-none focus:ring-2 focus:ring-white/15",
                ].join(" ")}
              >
                {/* Hamburger / Close icon */}
                <span className="sr-only">{open ? "Close" : "Menu"}</span>
                <div className="absolute left-1/2 top-1/2 w-5 -translate-x-1/2 -translate-y-1/2">
                  <span
                    className={[
                      "block h-[2px] w-5 rounded-full bg-white/80 transition-transform duration-200",
                      open ? "translate-y-[6px] rotate-45" : "translate-y-0 rotate-0",
                    ].join(" ")}
                  />
                  <span
                    className={[
                      "mt-[5px] block h-[2px] w-5 rounded-full bg-white/60 transition-opacity duration-200",
                      open ? "opacity-0" : "opacity-100",
                    ].join(" ")}
                  />
                  <span
                    className={[
                      "mt-[5px] block h-[2px] w-5 rounded-full bg-white/80 transition-transform duration-200",
                      open ? "-translate-y-[6px] -rotate-45" : "translate-y-0 rotate-0",
                    ].join(" ")}
                  />
                </div>

                {/* tiny “signal” dot */}
                <span
                  className={[
                    "absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full",
                    open ? "bg-[rgb(var(--accent))]" : "bg-white/20",
                  ].join(" ")}
                />
              </button>
            </div>
          </div>
        </Container>

        {/* Mobile panel */}
        <div
          className={[
            "md:hidden overflow-hidden transition-[max-height,opacity] duration-200",
            open ? "max-h-[520px] opacity-100" : "max-h-0 opacity-0",
          ].join(" ")}
        >
          <Container>
            <div className="pb-5">
              <div className="rounded-2xl border border-white/10 bg-black/35 backdrop-blur p-4">
                {/* subtle top sweep */}
                <div className="relative h-px w-full bg-white/10 overflow-hidden rounded-full">
                  <div
                    className="absolute inset-y-0 -left-24 w-24 opacity-60"
                    style={{
                      background:
                        "linear-gradient(to right, transparent, rgba(var(--accent),0.55), transparent)",
                      animation: open ? "navSweep 2.4s linear infinite" : "none",
                    }}
                  />
                </div>

                <div className="mt-4 grid gap-2">
                  {links.map((l) => (
                    <Link
                      key={l.href}
                      href={l.href}
                      onClick={() => setOpen(false)}
                      className={[
                        "rounded-xl border border-white/10 bg-white/5 px-4 py-3",
                        "text-sm text-white/80 hover:bg-white/10 transition-colors",
                        "flex items-center justify-between",
                      ].join(" ")}
                    >
                      <span>{l.label}</span>
                      <span className="text-xs tracking-[0.22em] uppercase text-white/40">
                        open
                      </span>
                    </Link>
                  ))}
                </div>

                <Link
                  href="/#fit"
                  onClick={() => setOpen(false)}
                  className={[
                    "mt-4 block text-center rounded-full px-5 py-3 text-sm",
                    "border border-white/20 bg-white/10 text-white",
                    "hover:bg-[rgba(var(--accent),0.95)] hover:border-transparent transition-colors",
                  ].join(" ")}
                >
                  Let’s See If We’re a Fit
                </Link>
              </div>
            </div>
          </Container>

          <style>{`
            @keyframes navSweep {
              0% { transform: translateX(0); opacity: 0; }
              15% { opacity: .55; }
              50% { opacity: .75; }
              85% { opacity: .55; }
              100% { transform: translateX(520px); opacity: 0; }
            }
          `}</style>
        </div>
      </div>

      {/* Backdrop (tap to close) */}
      {open ? (
        <button
          type="button"
          aria-label="Close menu backdrop"
          onClick={() => setOpen(false)}
          className="md:hidden fixed inset-0 top-[72px] bg-black/40"
        />
      ) : null}
    </div>
  );
}
