import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    id: "/admin", name: "CEL3 Backoffice", short_name: "Backoffice",
    description: "Your CEL3 Interactive backoffice, including Meterwise",
    start_url: "/admin", scope: "/admin", display: "standalone",
    background_color: "#000000", theme_color: "#000000",
    icons: [{ src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any maskable" }],
    shortcuts: [{ name: "Meterwise", short_name: "Meterwise", url: "/admin/meterwise" }],
  }, { headers: { "Content-Type": "application/manifest+json", "Cache-Control": "public, max-age=300" } });
}
