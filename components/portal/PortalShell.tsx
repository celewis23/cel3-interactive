"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import PortalAssistant from "@/components/portal/PortalAssistant";

const NAV = [
  { label: "Overview", href: "/portal" },
  { label: "Getting Started", href: "/portal/onboarding" },
  { label: "Invoices", href: "/portal/invoices" },
  { label: "Projects", href: "/portal/projects" },
  { label: "Requests", href: "/portal/requests" },
  { label: "Files", href: "/portal/files" },
  { label: "Estimates", href: "/portal/estimates" },
  { label: "Contracts", href: "/portal/contracts" },
  { label: "Appointments", href: "/portal/appointments" },
];

export default function PortalShell({
  user,
  children,
}: {
  user: {
    name: string | null;
    company: string | null;
    email: string;
    siteUrl?: string | null;
    managementUrl?: string | null;
  };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem("cel3-portal-theme");
    const nextTheme = stored === "light" ? "light" : "dark";
    setTheme(nextTheme);
    document.documentElement.setAttribute("data-portal-theme", nextTheme);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-portal-theme", theme);
    window.localStorage.setItem("cel3-portal-theme", theme);
  }, [theme]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  async function handleLogout() {
    await fetch("/api/portal/auth/logout", { method: "POST" });
    router.push("/portal/auth/login");
  }

  const initials = (user.name ?? user.company ?? user.email)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "U";

  const shellClass = theme === "light"
    ? "portal-theme-light min-h-screen bg-[#f3f2ee] text-[#111111] flex flex-col"
    : "portal-theme-dark min-h-screen bg-[#0d0d0d] text-white flex flex-col";
  const headerClass = theme === "light"
    ? "border-b border-black/10 bg-[#f7f6f2]/95 backdrop-blur-sm flex-shrink-0"
    : "border-b border-white/8 bg-[#0a0a0a] flex-shrink-0";
  const mobileHeaderClass = theme === "light"
    ? "md:hidden border-b border-black/10 bg-[#f7f6f2] px-4 py-2"
    : "md:hidden border-b border-white/8 bg-[#0a0a0a] px-4 py-2";
  const brandClass = theme === "light" ? "text-sm font-semibold text-[#111111] flex-shrink-0" : "text-sm font-semibold text-white flex-shrink-0";
  const iconButtonClass = theme === "light"
    ? "w-10 h-10 rounded-full border border-black/10 bg-white/70 text-[#111111] hover:bg-white transition-colors flex items-center justify-center"
    : "w-10 h-10 rounded-full border border-white/10 bg-white/5 text-white hover:bg-white/10 transition-colors flex items-center justify-center";
  const menuClass = theme === "light"
    ? "absolute right-0 top-full mt-3 w-72 rounded-2xl border border-black/10 bg-white/95 shadow-[0_24px_80px_rgba(0,0,0,0.12)] backdrop-blur-xl overflow-hidden"
    : "absolute right-0 top-full mt-3 w-72 rounded-2xl border border-white/10 bg-[#101010]/95 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl overflow-hidden";
  const rowClass = theme === "light"
    ? "flex items-center gap-3 px-4 py-3 text-sm text-[#111111] hover:bg-black/5 transition-colors"
    : "flex items-center gap-3 px-4 py-3 text-sm text-white hover:bg-white/5 transition-colors";
  const mutedClass = theme === "light" ? "text-black/50" : "text-white/40";

  function openMenu() {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setMenuOpen(true);
  }

  function closeMenuSoon() {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
    }
    closeTimerRef.current = window.setTimeout(() => {
      setMenuOpen(false);
      closeTimerRef.current = null;
    }, 320);
  }

  return (
    <div className={`portal-shell ${shellClass}`}>
      {/* Top bar */}
      <header className={headerClass}>
        <div className="max-w-6xl mx-auto px-4 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/portal" className={brandClass}>
              CEL3 <span className="text-sky-400">Interactive</span>
            </Link>
            <nav className="hidden md:flex items-center gap-0.5">
              {NAV.map((item) => {
                const isActive =
                  item.href === "/portal"
                    ? pathname === "/portal"
                    : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                      isActive
                        ? "bg-sky-500/10 text-sky-400"
                        : theme === "light"
                          ? "text-black/60 hover:text-black hover:bg-black/5"
                          : "text-white/50 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setTheme((prev) => prev === "dark" ? "light" : "dark")}
              className={iconButtonClass}
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1.5m0 15V21m9-9h-1.5m-15 0H3m15.364 6.364-1.06-1.06M6.697 6.697 5.636 5.636m12.728 0-1.06 1.061M6.697 17.303l-1.061 1.06M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0Z" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3c-.008.116-.01.233-.01.35A7.5 7.5 0 0018.65 10.8c.117 0 .234-.002.35-.01Z" />
                </svg>
              )}
            </button>
            <div
              ref={menuRef}
              className="relative"
              onMouseEnter={openMenu}
              onMouseLeave={closeMenuSoon}
            >
              <button
                type="button"
                onClick={() => setMenuOpen((prev) => !prev)}
                className={`${iconButtonClass} overflow-hidden`}
                aria-label="Open account menu"
              >
                <span className="w-full h-full flex items-center justify-center rounded-full bg-sky-500/15 text-sky-400 font-semibold text-sm">
                  {initials}
                </span>
              </button>

              {menuOpen && (
                <div className={menuClass} onMouseEnter={openMenu} onMouseLeave={closeMenuSoon}>
                  <div className={`px-4 py-4 border-b ${theme === "light" ? "border-black/8" : "border-white/8"}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-sky-500/15 text-sky-400 font-semibold flex items-center justify-center">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <p className={`text-sm font-semibold truncate ${theme === "light" ? "text-[#111111]" : "text-white"}`}>
                          {user.name ?? user.company ?? "Portal Account"}
                        </p>
                        <p className={`text-xs truncate ${mutedClass}`}>{user.email}</p>
                      </div>
                    </div>
                  </div>

                  <div className="py-2">
                    {user.managementUrl && (
                      <Link href="/portal/manage-site" target="_blank" className={rowClass}>
                        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5h15m-13.5-3.75L17.25 4.5m-8.25 0h8.25v8.25" />
                        </svg>
                        <span>Manage Site</span>
                      </Link>
                    )}
                    {user.siteUrl && (
                      <a href={user.siteUrl} target="_blank" rel="noopener noreferrer" className={rowClass}>
                        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                        </svg>
                        <span>Open Site</span>
                      </a>
                    )}
                    <Link href="/portal/settings" className={rowClass}>
                      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 12h9.75m-9.75 6h9.75M3.75 6h.008v.008H3.75V6Zm0 6h.008v.008H3.75V12Zm0 6h.008v.008H3.75V18Z" />
                      </svg>
                      <span>Settings</span>
                    </Link>
                    <Link href="/portal/privacy" className={rowClass}>
                      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 9h10.5A2.25 2.25 0 0019.5 17.25v-4.5A2.25 2.25 0 0017.25 10.5H6.75A2.25 2.25 0 004.5 12.75v4.5A2.25 2.25 0 006.75 19.5Z" />
                      </svg>
                      <span>Privacy</span>
                    </Link>
                    <div className={`px-4 py-3 border-t mt-2 ${theme === "light" ? "border-black/8" : "border-white/8"}`}>
                      <button
                        type="button"
                        onClick={handleLogout}
                        className={`w-full flex items-center gap-3 text-left text-sm transition-colors ${theme === "light" ? "text-[#111111] hover:text-sky-600" : "text-white hover:text-sky-300"}`}
                      >
                        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                        </svg>
                        <span>Log out</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile nav */}
      <div className={mobileHeaderClass}>
        <div className="flex gap-1 overflow-x-auto">
          {NAV.map((item) => {
            const isActive =
              item.href === "/portal"
                ? pathname === "/portal"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors flex-shrink-0 ${
                  isActive
                    ? "bg-sky-500/10 text-sky-400"
                    : theme === "light"
                      ? "text-black/60 hover:text-black hover:bg-black/5"
                      : "text-white/50 hover:text-white hover:bg-white/5"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 lg:px-8 py-8">{children}</main>
      <PortalAssistant />
    </div>
  );
}
