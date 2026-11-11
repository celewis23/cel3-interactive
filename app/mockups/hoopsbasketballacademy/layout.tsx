import type { Metadata } from "next";
import { Archivo, Inter, JetBrains_Mono } from "next/font/google";

const archivo = Archivo({ subsets: ["latin"], variable: "--hoops-font-display", weight: ["700", "900"] });
const inter = Inter({ subsets: ["latin"], variable: "--hoops-font-body" });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--hoops-font-mono", weight: ["500", "700"] });

export const metadata: Metadata = {
  title: "Hoops Basketball Academy — proposal",
  robots: { index: false, follow: false, noarchive: true },
};

export default function HoopsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${archivo.variable} ${inter.variable} ${jetbrainsMono.variable}`} data-hoops>
      {children}
    </div>
  );
}
