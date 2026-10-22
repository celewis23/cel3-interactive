import type { Metadata } from "next";

export const SITE_URL = "https://cel3interactive.com";
export const BUSINESS_NAME = "CEL3 Interactive";
export const BUSINESS_EMAIL = "info@cel3interactive.com";
export const SOCIAL_IMAGE = `${SITE_URL}/opengraph-image`;

// Only public facts. Phone, street address and founding year await confirmation.
export const publicPages: Record<string, { title: string; description: string }> = {
  "/": {
    "title": "Custom Business Platforms in Richmond",
    "description": "Richmond-based CEL3 Interactive builds websites, client portals, dashboards, business consoles and AI-assisted workflows for businesses with disconnected tools."
  },
  "/business-consoles-operations-platforms": {
    "title": "Custom Business Consoles & Operations Platforms",
    "description": "Custom backoffice systems for managing customers, bookings, payments, content, staff workflows, reporting, and AI-assisted operations."
  },
  "/custom-web-applications": {
    "title": "Custom Web Applications & Business Platforms",
    "description": "Custom portals, dashboards, ecommerce systems, booking flows, internal tools, and workflow platforms for companies that off-the-shelf software does not fit."
  },
  "/custom-data-dashboards": {
    "title": "Custom CRMs, Dashboards & Reporting Systems",
    "description": "Custom CRMs, customer records, dashboards, and reporting surfaces that turn scattered data into clear operational views your team can trust."
  },
  "/interactive-digital-experiences": {
    "title": "Business Websites & Digital Experiences",
    "description": "Business websites and digital experiences that explain services clearly, support customer action, and are built to be maintained."
  },
  "/ai-enhanced-systems": {
    "title": "AI-Assisted Workflows & Operations Systems",
    "description": "Practical AI-assisted workflows that help teams summarize, draft, route, follow up, and report faster while keeping important actions human-approved."
  },
  "/client-portals-service-businesses": {
    "title": "Client Portals for Service Businesses",
    "description": "Client portals, booking flows, dashboards, payment workflows, customer records, and AI-assisted admin tools for service businesses with disconnected operations."
  },
  "/work": {
    "title": "Case Studies & Platform Work",
    "description": "Explore CEL3 Interactive work across web apps, mobile app experiences, SaaS projects, websites, and digital business systems."
  },
  "/assessment": {
    "title": "$150 Digital Systems Audit",
    "description": "Review your website, tools, workflows and admin bottlenecks in a $150 Digital Systems Audit. Get recommendations and a roadmap before scoping a custom build."
  },
  "/build-your-platform": {
    "title": "Build Your Platform",
    "description": "Choose website, CRM, AI, ecommerce, mobile, and custom software features to generate a CEL3 Interactive business platform proposal."
  }
};

export function absoluteUrl(path: string): string { return new URL(path, SITE_URL).href; }

export function pageMetadata(path: string, title: string, description: string): Metadata {
  const fullTitle = `${title} | ${BUSINESS_NAME}`;
  return {
    title: { absolute: fullTitle }, description,
    alternates: { canonical: absoluteUrl(path) },
    openGraph: { type: "website", url: absoluteUrl(path), siteName: BUSINESS_NAME, title: fullTitle, description, images: [{ url: SOCIAL_IMAGE, width: 1200, height: 630, alt: `${BUSINESS_NAME} — custom business platforms` }] },
    twitter: { card: "summary_large_image", title: fullTitle, description, images: [SOCIAL_IMAGE] },
  };
}

export function publicPageMetadata(path: string): Metadata {
  const page = publicPages[path];
  if (!page) throw new Error(`Unknown public page: ${path}`);
  return pageMetadata(path, page.title, page.description);
}

export const privatePaths = ["/admin", "/api", "/portal", "/forms", "/contracts", "/estimates", "/downloads", "/mockups", "/site-suspended", "/assessment/success"];
