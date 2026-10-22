import { PageStructuredData } from "@/components/seo/StructuredData";
import { publicPageMetadata } from "@/lib/seo/site";
import { PlatformBuilderClient } from "@/components/platformBuilder/PlatformBuilderClient";
import { getPublicPlatformBuilderCatalog } from "@/lib/platformBuilder/catalog";

export const metadata = publicPageMetadata("/build-your-platform");

export default function BuildYourPlatformPage() {
  return <><PageStructuredData path="/build-your-platform" /><PlatformBuilderClient sections={getPublicPlatformBuilderCatalog()} /></>;
}
