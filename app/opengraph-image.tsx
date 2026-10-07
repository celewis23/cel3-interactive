import { ImageResponse } from "next/og";

export const alt = "CEL3 Interactive — websites, client portals, dashboards and business systems";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(<div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "68px 76px", background: "#050a12", color: "white", borderLeft: "14px solid #00aeef" }}>
    <div style={{ display: "flex", fontSize: 38, fontWeight: 700, color: "#38bdf8" }}>CEL3 Interactive</div>
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <div style={{ display: "flex", fontSize: 70, fontWeight: 700, lineHeight: 1.06, maxWidth: 980 }}>The business system behind your website.</div>
      <div style={{ display: "flex", fontSize: 29, color: "#cbd5e1" }}>Websites · Client portals · Dashboards · AI workflows</div>
    </div>
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 23, color: "#94a3b8" }}><span>Richmond-based</span><span>cel3interactive.com</span></div>
  </div>, size);
}
