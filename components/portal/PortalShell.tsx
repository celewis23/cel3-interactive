"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

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
  user: { name: string | null; company: string | null; email: string };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/portal/auth/logout", { method: "POST" });
    router.push("/portal/auth/login");
  }

  return (
    <div className="min-h-screen bg-[#0d0d0d] flex flex-col">
      {/* Top bar */}
      <header className="border-b border-white/8 bg-[#0a0a0a] flex-shrink-0">
        <div className="max-w-6xl mx-auto px-4 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/portal" className="text-sm font-semibold text-white flex-shrink-0">
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
            <span className="text-xs text-white/30 hidden sm:block truncate max-w-[160px]">
              {user.company || user.email}
            </span>
            <button
              onClick={handleLogout}
              className="text-xs text-white/40 hover:text-white/70 transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Mobile nav */}
      <div className="md:hidden border-b border-white/8 bg-[#0a0a0a] px-4 py-2">
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
    </div>
  );
}
