import type { Metadata } from "next";
import { Space_Grotesk, Space_Mono, Inter } from "next/font/google";

const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--awm-font-display", weight: ["500", "600", "700"] });
const spaceMono = Space_Mono({ subsets: ["latin"], variable: "--awm-font-mono", weight: ["400", "700"] });
const inter = Inter({ subsets: ["latin"], variable: "--awm-font-body" });

export const metadata: Metadata = {
  title: "A Woman's Mindset — proposal",
  robots: { index: false, follow: false, noarchive: true },
};

export default function AwmLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${spaceGrotesk.variable} ${spaceMono.variable} ${inter.variable}`} data-awm>
      {children}
    </div>
  );
}
