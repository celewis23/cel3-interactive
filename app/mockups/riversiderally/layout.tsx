import type { Metadata, Viewport } from "next";
import "leaflet/dist/leaflet.css";
import "./riversiderally.css";

export const metadata: Metadata = {
  title: "James River Run — Riverside Rally",
  description: "Interactive automotive rally planner and scouting app for the James River Run.",
  robots: { index: false, follow: false, noarchive: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RiversideRallyLayout({ children }: { children: React.ReactNode }) {
  return <div data-riverside-rally>{children}</div>;
}
