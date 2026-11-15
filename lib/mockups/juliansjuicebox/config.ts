// Single source of truth for the Julian's Juicebox proposal: copy, pricing and terms.
// Verified against the "Interactive proposal" design export
// (public/mockups/juliansjuicebox/Interactive proposal (pick an option, then sign)-html.zip).
// Change prices only here — the Checkout session and the webhook both read this file.
//
// `[X]` below is a placeholder left in the design file (weeks / hours), not filled in here —
// see the final report for every bracket placeholder still outstanding.

export const JUICEBOX_PROPOSAL_SLUG = "juliansjuicebox";

export type JuiceboxSelectionId = "special-offer" | "tier1" | "tier2" | "tier3";

export type JuiceboxSelection = {
  id: JuiceboxSelectionId;
  name: string;
  tagline: string;
  dueTodayCents: number;
  monthlyCents: number;
  /** Stripe line-item name for the one-time charge. */
  lineItemName: string;
  editsBy: string;
  includes: string[];
};

// There is no add-on on this proposal — the site editor is simply bundled from Tier 2 up.
export const JUICEBOX_SELECTIONS: Record<JuiceboxSelectionId, JuiceboxSelection> = {
  "special-offer": {
    id: "special-offer",
    name: "Special offer — Complete Store",
    tagline: "Everything in Tier 3. Regular price is $4,000 and $150 a month.",
    dueTodayCents: 200_000,
    monthlyCents: 12_500,
    lineItemName: "Special offer — Complete Store build",
    editsBy: "Make edits yourself, or hand them to CEL3.",
    includes: [
      "New website in the design you choose",
      "Your own store, cart and checkout, replacing Shopify",
      "Admin Console: orders, products, inventory, customers, subscriptions, discounts",
      "Visual site editor, media library, email inbox and bulletins",
      "Owner app and customer app",
      "Hosting, maintenance and support",
    ],
  },
  tier1: {
    id: "tier1",
    name: "Tier 1 — Website",
    tagline: "A new website that brings in customers and tells your story.",
    dueTodayCents: 150_000,
    monthlyCents: 7_500,
    lineItemName: "Tier 1 — Website build",
    editsBy: "CEL3 makes them for you.",
    includes: [
      "New website in the design you choose",
      "Home, Shop, About, Why Raw, FAQs and the quiz",
      "Shop page linking to your current Shopify checkout",
      "Mailing list sign-up",
      "Hosting, maintenance and support",
    ],
  },
  tier2: {
    id: "tier2",
    name: "Tier 2 — Website + Admin Console",
    tagline: "One place to run the business, on top of the Tier 1 website.",
    dueTodayCents: 250_000,
    monthlyCents: 10_000,
    lineItemName: "Tier 2 — Website + Admin Console build",
    editsBy: "You or CEL3, your choice.",
    includes: [
      "Everything in Tier 1",
      "Visual site editor",
      "Media library",
      "Email inbox in the console",
      "Bulletins to your customers",
      "Owner app and customer app",
    ],
  },
  tier3: {
    id: "tier3",
    name: "Tier 3 — Full Store",
    tagline: "Your own store, cart and checkout, replacing Shopify.",
    dueTodayCents: 400_000,
    monthlyCents: 15_000,
    lineItemName: "Tier 3 — Full Store build",
    editsBy: "You or CEL3, your choice.",
    includes: [
      "Everything in Tier 2",
      "Your own store, cart and checkout, replacing Shopify",
      "Orders, products, inventory and subscriptions",
      "Discounts, abandoned-cart reminders and reviews",
      "Shipping, sales tax and sales reports",
      "Ordering and order tracking in the customer app",
    ],
  },
};

/** 11:59pm America/New_York on the date the proposal names. */
export const JUICEBOX_OFFER_EXPIRES_AT = new Date("2026-11-28T23:59:59-05:00");

// Left exactly as the design file has it — a client-confirmed number, not a guess.
export const JUICEBOX_TIMELINE_SUMMARY =
  "The website goes live about 2 weeks after kickoff. The console, store and apps follow in [X] weeks.";

export const JUICEBOX_PAYMENT_TERMS = [
  "Pay in full up front, or split the project into two payments: 50% up front to start and the remaining 50% upon completion.",
  "To split your payment, use Ask a question to arrange the two payments before signing and paying online. Online checkout collects the full project price.",
  "Monthly billing starts at launch.",
  "Tier prices held 12 months.",
  "Month to month, no contract.",
  "Card processing fees from Stripe are separate, the same as on Shopify today.",
  "Monthly includes [X] hours of edits by CEL3. Unused hours don't roll over.",
  "Extra work is $125 an hour, quoted before it starts.",
];

export const JUICEBOX_NOT_INCLUDED = [
  "Photo or video shoots",
  "Logo redesign",
  "Native App Store or Google Play apps",
  "Shipping labels and postage",
];

// Not from the proposal copy itself (which the client sees) — a reasonable, clearly-inferred
// onboarding checklist for the back-office project board, same role as Hoops' checklist.
export const JUICEBOX_ONBOARDING_CHECKLIST: Record<JuiceboxSelectionId, string[]> = {
  "special-offer": fullChecklist(),
  tier1: [
    "Photos of your products and kitchen for the site and app",
    "Your logo files and any brand colors",
    "Current product list, prices and descriptions",
    "Your Julian's story content for the About page",
  ],
  tier2: fullChecklist(),
  tier3: [...fullChecklist(), "For the store migration: your current Shopify product/order export, shipping rates and tax settings"],
};

function fullChecklist(): string[] {
  return [
    "Photos of your products and kitchen for the site and app",
    "Your logo files and any brand colors",
    "Current product list, prices and descriptions",
    "Your Julian's story content for the About page",
  ];
}

export function isJuiceboxSelectionId(value: unknown): value is JuiceboxSelectionId {
  return typeof value === "string" && value in JUICEBOX_SELECTIONS;
}
