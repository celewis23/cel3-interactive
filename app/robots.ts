import type { MetadataRoute } from "next";
import { SITE_URL, privatePaths } from "@/lib/seo/site";

export default function robots(): MetadataRoute.Robots {
  return {
    // Preserve the public AI crawling default until the owner chooses a policy.
    rules: [{
      userAgent: "*",
      allow: ["/", "/admin/login", "/admin/pin", "/portal/auth/login"],
      // Public utility/preview URLs must remain crawlable so crawlers can see
      // their noindex response headers. Robots rules do not protect private data.
      disallow: privatePaths.filter(path => !["/mockups", "/downloads", "/site-suspended", "/assessment/success"].includes(path)),
    }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
