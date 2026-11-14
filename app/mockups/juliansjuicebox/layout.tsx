import type { Metadata } from "next";
import { Space_Grotesk, Inter, JetBrains_Mono } from "next/font/google";

const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--juicebox-font-display", weight: ["500", "700"] });
const inter = Inter({ subsets: ["latin"], variable: "--juicebox-font-body" });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--juicebox-font-mono", weight: ["500", "700"] });

export const metadata: Metadata = {
  title: "Julian's Juicebox — proposal",
  robots: { index: false, follow: false, noarchive: true },
};

export default function JuiceboxLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${spaceGrotesk.variable} ${inter.variable} ${jetbrainsMono.variable}`} data-juicebox>
      {children}
    </div>
  );
}
