import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  outputFileTracingIncludes: {
    "/mockups": ["./app/mockups/access.html", "./app/mockups/directory.html"],
  },
  async redirects() {
    return [{ source: "/:path*", has: [{ type: "host", value: "www.cel3interactive.com" }], destination: "https://cel3interactive.com/:path*", statusCode: 301 }];
  },
  async headers() {
    return ["/admin/:path*", "/api/:path*", "/portal/:path*", "/forms/:path*", "/contracts/:path*", "/estimates/:path*", "/downloads/:path*", "/mockups/:path*", "/site-suspended", "/assessment/success"].map(source => ({
      source, headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }],
    }));
  },
  async rewrites() {
    return [
      { source: "/mockups/index.html", destination: "/mockups" },
      { source: "/mockups/electric-sun-society", destination: "/mockups/electric-sun-society/index.html" },
      { source: "/mockups/neejah-styles", destination: "/mockups/neejah-styles/index.html" },
      { source: "/mockups/secret-squares", destination: "/mockups/secret-squares/index.html" },
      { source: "/mockups/glue-craft-studio", destination: "/mockups/glue-craft-studio/index.html" },
      { source: "/mockups/unlockingrva", destination: "/mockups/unlockingrva/index.html" },
      // Keep the spelling in the client's share link working as well.
      { source: "/mockups/ulockingrva", destination: "/mockups/unlockingrva/index.html" },
      { source: "/mockups/youmatterrva", destination: "/mockups/youmatterrva/index.html" },
      { source: "/mockups/enrich-her-wellness", destination: "/mockups/enrich-her-wellness/index.html" },
    ];
  },
};

export default nextConfig;
