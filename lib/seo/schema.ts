import { absoluteUrl, BUSINESS_EMAIL, BUSINESS_NAME, publicPages, SITE_URL, SOCIAL_IMAGE } from "./site";

export type SchemaNode = Record<string, unknown>;
const organizationId = `${SITE_URL}/#organization`;
const websiteId = `${SITE_URL}/#website`;

function businessGraph(): SchemaNode[] {
  return [
    { "@type": "Organization", "@id": organizationId, name: BUSINESS_NAME, url: SITE_URL,
      email: BUSINESS_EMAIL, description: "Richmond-based developer of websites, client portals, dashboards, business consoles and AI-assisted workflows.",
      location: { "@type": "Place", name: "Richmond" },
    },
    { "@type": "WebSite", "@id": websiteId, url: SITE_URL, name: BUSINESS_NAME, publisher: { "@id": organizationId }, inLanguage: "en" },
  ];
}

function breadcrumbs(path: string, title: string): SchemaNode {
  const items = [{ name: "Home", item: absoluteUrl("/") }];
  if (path.startsWith("/work/")) items.push({ name: "Case Studies", item: absoluteUrl("/work") });
  items.push({ name: title, item: absoluteUrl(path) });
  return { "@type": "BreadcrumbList", "@id": `${absoluteUrl(path)}#breadcrumb`, itemListElement: items.map((item, i) => ({ "@type": "ListItem", position: i + 1, ...item })) };
}

export function publicPageGraph(path: string) {
  const page = publicPages[path];
  if (!page) throw new Error(`Unknown public page: ${path}`);
  const url = absoluteUrl(path);
  const isService = !["/", "/work", "/build-your-platform"].includes(path);
  const graph = businessGraph();
  graph.push({ "@type": path === "/work" ? "CollectionPage" : "WebPage", "@id": `${url}#webpage`, url,
    name: page.title, description: page.description, isPartOf: { "@id": websiteId }, about: { "@id": organizationId },
    inLanguage: "en", ...(path !== "/" ? { breadcrumb: { "@id": `${url}#breadcrumb` } } : {}),
    ...(isService ? { mainEntity: { "@id": `${url}#service` } } : {}),
  });
  if (path !== "/") graph.push(breadcrumbs(path, page.title));
  if (isService) graph.push({ "@type": "Service", "@id": `${url}#service`, name: page.title,
    serviceType: page.title, description: page.description, url, provider: { "@id": organizationId },
    ...(path === "/assessment" ? { offers: { "@type": "Offer", url, price: "150", priceCurrency: "USD" } } : {}),
  });
  return { "@context": "https://schema.org", "@graph": graph };
}

export function caseStudyGraph(work: { title: string; slug: string; summary?: string | null }, image?: string | null) {
  const path = `/work/${encodeURIComponent(work.slug)}`;
  const url = absoluteUrl(path);
  return { "@context": "https://schema.org", "@graph": [
    ...businessGraph(), breadcrumbs(path, work.title),
    { "@type": "WebPage", "@id": `${url}#webpage`, url, name: `${work.title} Case Study`, isPartOf: { "@id": websiteId },
      breadcrumb: { "@id": `${url}#breadcrumb` }, mainEntity: { "@id": `${url}#article` } },
    { "@type": "Article", "@id": `${url}#article`, url, headline: `${work.title} Case Study`,
      ...(work.summary ? { description: work.summary } : {}), image: image ? absoluteUrl(image) : SOCIAL_IMAGE,
      author: { "@id": organizationId }, publisher: { "@id": organizationId }, mainEntityOfPage: { "@id": `${url}#webpage` }, inLanguage: "en" },
  ] };
}

export function serializeSchema(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
}
