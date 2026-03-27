import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CEL3 Interactive Backoffice",
    short_name: "CEL3 Backoffice",
    description: "CEL3 Interactive backoffice workspace",
    start_url: "/admin",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#000000",
    icons: [
      {
        src: "/window.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
