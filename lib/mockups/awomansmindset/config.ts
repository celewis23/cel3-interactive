// Single source of truth for the A Woman's Mindset proposal: copy, pricing and terms.
// Verified against the "Interactive proposal" design export
// (public/mockups/awomansmindset/Proposal-html.zip, Proposal.dc.html).
// Change prices only here — the Checkout session and the webhook both read this file.

export const AWM_PROPOSAL_SLUG = "awomansmindset";

export type AwmSelectionId = "special-offer" | "tier1" | "tier2" | "tier3" | "code";

export type AwmSelection = {
  id: AwmSelectionId;
  name: string;
  tagline: string;
  dueTodayCents: number;
  monthlyCents: number;
  /** True only for the design-only code handoff: no hosting, no monthly fee, nothing recurring. */
  oneTimeOnly: boolean;
  /** Stripe line-item name for the one-time charge. */
  lineItemName: string;
  editsBy: string;
  includes: string[];
};

export const AWM_SELECTIONS: Record<AwmSelectionId, AwmSelection> = {
  "special-offer": {
    id: "special-offer",
    name: "Special offer — Complete Creator Platform",
    tagline: "Everything in Tier 3. Regular price is $3,500 and $150 a month.",
    dueTodayCents: 200_000,
    monthlyCents: 12_500,
    oneTimeOnly: false,
    lineItemName: "Special offer — Complete Creator Platform build",
    editsBy: "Make edits yourself in Studio, or hand them to CEL3.",
    includes: [
      "New website in the design you choose — Editorial Burgundy or Noir Gallery",
      "Studio admin console in a matching style: site copy, photos, video, shop links",
      "Inbox connected to your collabs email, contracts with e-signature, invoices",
      "Brand portal and Studio on your phone with alerts",
      "Hosting, maintenance and support",
    ],
  },
  tier1: {
    id: "tier1",
    name: "Tier 1 — Website",
    tagline: "A new home for A Woman's Mindset that wins brand deals and drives shop clicks.",
    dueTodayCents: 150_000,
    monthlyCents: 7_500,
    oneTimeOnly: false,
    lineItemName: "Tier 1 — Website build",
    editsBy: "CEL3 makes them for you.",
    includes: [
      "Your choice of design: Editorial Burgundy or Noir Gallery",
      "About, portfolio gallery, showreel, stats, shop links, collaborate",
      "Built for phones first, with your Reels as background video",
      "Collab inquiry form and downloadable media kit",
      "Search and social sharing set up",
      "Hosting, security, backups and support",
    ],
  },
  tier2: {
    id: "tier2",
    name: "Tier 2 — Website + Studio",
    tagline: "Run your creator business from one place, on top of the Tier 1 website.",
    dueTodayCents: 250_000,
    monthlyCents: 10_000,
    oneTimeOnly: false,
    lineItemName: "Tier 2 — Website + Studio build",
    editsBy: "You or CEL3, your choice.",
    includes: [
      "Everything in Tier 1",
      "Studio dashboard: what needs you today, deadlines, unpaid invoices",
      "Edit site copy, photos, video and shop links, with live preview and publish",
      "Inbox: send and receive brand email from your collabs address",
      "Contracts: drafts, e-signature, deliverable checklists, mark as paid",
      "Studio in your choice of Burgundy or Noir style",
    ],
  },
  tier3: {
    id: "tier3",
    name: "Tier 3 — Complete Creator Platform",
    tagline: "Studio on your phone, plus a private portal for the brands you work with.",
    dueTodayCents: 350_000,
    monthlyCents: 15_000,
    oneTimeOnly: false,
    lineItemName: "Tier 3 — Complete Creator Platform build",
    editsBy: "You or CEL3, your choice.",
    includes: [
      "Everything in Tier 2",
      "Studio on your phone: install from the browser, alerts for new brand emails and signatures",
      "Brand portal: brands review your proposal, sign, approve content and download files",
      "Invoices with online card payment through Stripe",
      "Live media kit page that updates with your latest numbers",
    ],
  },
  code: {
    id: "code",
    name: "Design only — Code handoff",
    tagline: "Your chosen design as code you own. Install it on WordPress or Shopify, or hand it to your own developer.",
    dueTodayCents: 120_000,
    monthlyCents: 0,
    oneTimeOnly: true,
    lineItemName: "Design only — Code handoff",
    editsBy: "You or your developer. CEL3 is available at $125 an hour.",
    includes: [
      "Your chosen design — Editorial Burgundy or Noir Gallery — fully responsive",
      "WordPress theme (.zip): upload in Appearance › Themes, edit text and photos in the WordPress editor",
      "Shopify theme (.zip): upload in Online Store › Themes, edit in the Shopify theme editor",
      "Developer package: plain HTML, CSS and JavaScript that installs on any host",
      "Developer package: Next.js and TypeScript source, ready to deploy on Vercel",
      "Written install guide for each version, plus your photos and fonts",
    ],
  },
};

/** 11:59pm America/New_York on the date the proposal names. */
export const AWM_OFFER_EXPIRES_AT = new Date("2026-12-07T23:59:59-05:00");

// Left exactly as the design file has it — a client-confirmed number, not a guess.
export const AWM_TIMELINE_SUMMARY =
  "Your website goes live about 2 weeks after kickoff. Studio and the brand portal follow, with everything live within about 3 weeks. The design-only code handoff is delivered within about 2 weeks.";

export const AWM_PAYMENT_TERMS = [
  "Pay in full up front, or split the project into two payments: 50% up front to start and the remaining 50% on completion.",
  "To split your payment, use Ask a question to arrange the two payments before signing and paying online. Online checkout collects the full project price.",
  "Monthly billing starts at launch. The design-only code handoff has no monthly fee.",
  "Tier prices held 12 months — launch the website first and add Studio later at the same price.",
  "Month to month, no contract.",
  "Card processing fees from Stripe are separate.",
  "Monthly includes 3 hours of edits by CEL3. Unused hours don't roll over.",
  "Extra work is $125 an hour, quoted before it starts.",
];

export const AWM_NOT_INCLUDED = [
  "Photo or video shoots — we build with your existing photos and Reels",
  "Logo redesign",
  "Translating site copy into German or Italian (the site is built ready for it)",
  "Native App Store or Google Play apps",
  "Your email account itself — Studio connects to the Gmail you already use",
  "With the design-only code handoff: hosting, domain, WordPress or Shopify plans, installation, the Studio console and ongoing support. Installation and support are available at $125 an hour.",
];

// Not from the proposal copy itself (which the client sees) — a reasonable, clearly-inferred
// onboarding checklist for the back-office project board, same role as Hoops'/Juicebox's checklist.
export const AWM_ONBOARDING_CHECKLIST: Record<AwmSelectionId, string[]> = {
  "special-offer": fullChecklist(),
  tier1: [
    "Your logo files and any brand colors beyond burgundy/cream or noir/red",
    "Your Reels and full-size photos for the site's gallery and hero",
    "Your bio, stats and brand roster for the About section",
    "Your shop links (ShopMy, Amazon, AWIN) and collabs email address",
  ],
  tier2: fullChecklist(),
  tier3: fullChecklist(),
  code: [
    "Your logo files and any brand colors beyond burgundy/cream or noir/red",
    "Your Reels and full-size photos for the site's gallery and hero",
    "Your bio, stats and brand roster for the About section",
    "Which package(s) to deliver: WordPress, Shopify, plain HTML/CSS/JS, and/or Next.js",
    "Your developer's contact info, if someone else will install it",
  ],
};

function fullChecklist(): string[] {
  return [
    "Your logo files and any brand colors beyond burgundy/cream or noir/red",
    "Your Reels and full-size photos for the site's gallery and hero",
    "Your bio, stats and brand roster for the About section",
    "Your shop links (ShopMy, Amazon, AWIN) and collabs email address",
    "Access to the Gmail inbox Studio should connect to",
  ];
}

export function isAwmSelectionId(value: unknown): value is AwmSelectionId {
  return typeof value === "string" && value in AWM_SELECTIONS;
}
