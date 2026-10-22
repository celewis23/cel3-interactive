import type { Metadata } from "next";
import { SITE_URL } from "@/lib/seo/site";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SiteChrome } from "@/components/layout/SiteChrome";
import WebAnalyticsTracker from "@/components/analytics/WebAnalyticsTracker";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
  // The default public body uses the system font; load Geist only where used.
  preload: false,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});



export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
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
        <Script src="https://www.googletagmanager.com/gtag/js?id=G-G1FLY7YQQB" strategy="lazyOnload" />
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
