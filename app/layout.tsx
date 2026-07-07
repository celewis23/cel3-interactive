import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SiteChrome } from "@/components/layout/SiteChrome";
import WebAnalyticsTracker from "@/components/analytics/WebAnalyticsTracker";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});



export const metadata: Metadata = {
  metadataBase: new URL("https://www.cel3interactive.com"),
  manifest: "/manifest.webmanifest",
  title: {
    default: "CEL3 Interactive",
    template: "%s | CEL3 Interactive",
  },
  description:
    "Custom web applications, CRMs, dashboards, and interactive digital experiences.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "CEL3 Backoffice",
  },
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} bg-black text-white antialiased`}
      >
        <Script src="https://www.googletagmanager.com/gtag/js?id=G-G1FLY7YQQB" strategy="afterInteractive" />
        <Script id="ga-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-G1FLY7YQQB', {
              page_path: window.location.pathname,
            });
          `}
        </Script>
        <WebAnalyticsTracker />
        <SiteChrome>{children}</SiteChrome>
      </body>
    </html>
  );
}
