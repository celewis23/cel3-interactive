import type { Metadata } from "next";
import AdminShell from "./AdminShell";

export const metadata: Metadata = {
  manifest: "/admin/manifest.webmanifest",
  appleWebApp: { capable: true, title: "CEL3 Backoffice", statusBarStyle: "black-translucent" },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
