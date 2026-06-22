"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { MotionProvider } from "@/components/motion/MotionProvider";
import { NavBar } from "@/components/nav/NavBar";
import Footer from "@/components/sections/Footer";

const CHROME_EXCLUDED_PREFIXES = [
  "/admin",
  "/portal",
  "/forms",
  "/contracts",
  "/estimates",
];

function shouldShowSiteChrome(pathname: string) {
  return !CHROME_EXCLUDED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function SiteChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/";

  if (!shouldShowSiteChrome(pathname)) return <>{children}</>;

  return (
    <MotionProvider>
      <div className="min-h-screen bg-black text-white">
        <NavBar />
        {children}
        <Footer />
      </div>
    </MotionProvider>
  );
}
