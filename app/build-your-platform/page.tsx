import type { Metadata } from "next";
import { PlatformBuilderClient } from "@/components/platformBuilder/PlatformBuilderClient";
import { getPublicPlatformBuilderCatalog } from "@/lib/platformBuilder/catalog";

export const metadata: Metadata = {
  title: "Build Your Platform | CEL3 Interactive",
  description: "Choose website, CRM, AI, ecommerce, mobile, and custom software features to generate a CEL3 Interactive business platform proposal.",
};

export default function BuildYourPlatformPage() {
  return <PlatformBuilderClient sections={getPublicPlatformBuilderCatalog()} />;
}
