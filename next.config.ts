import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  async rewrites() {
    return [
      { source: "/mockups/secret-squares", destination: "/mockups/secret-squares/index.html" },
      { source: "/mockups/glue-craft-studio", destination: "/mockups/glue-craft-studio/index.html" },
      { source: "/mockups/unlockingrva", destination: "/mockups/unlockingrva/index.html" },
      // Keep the spelling in the client's share link working as well.
      { source: "/mockups/ulockingrva", destination: "/mockups/unlockingrva/index.html" },
    ];
  },
};

export default nextConfig;
