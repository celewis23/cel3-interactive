import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { GeistSans } from "geist/font/sans";

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
  title: {
    default: "CEL3 Interactive",
    template: "%s | CEL3 Interactive",
  },
  description:
    "Custom web applications, CRMs, dashboards, and interactive digital experiences.",
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Google Analytics */}
        <script
          src="https://www.googletagmanager.com/gtag/js?id=G-G1FLY7YQQB"
        />
        <script
          id="ga-init"
        >
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-G1FLY7YQQB', {
              page_path: window.location.pathname,
            });
          `}
        </script>
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} bg-black text-white antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
