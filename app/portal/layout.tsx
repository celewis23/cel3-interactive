import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Client Portal — CEL3 Interactive",
  description: "Your dedicated client portal",
};

export default function PortalRootLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-[#0d0d0d] text-white">{children}</div>;
}
