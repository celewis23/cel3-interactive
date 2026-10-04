import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  outputFileTracingIncludes: {
    "/mockups": ["./app/mockups/access.html", "./app/mockups/directory.html"],
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
