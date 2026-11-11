// Single source of truth for the Hoops Basketball Academy proposal: copy, pricing and terms.
// Numbers here are verified against the downloaded proposal PDF
// (public/mockups/hoopsbasketballacademy/Proposal — Hoops Basketball Academy Website & Platform.pdf).
// Change prices only here — the Checkout session and the webhook both read this file.

export const HOOPS_PROPOSAL_SLUG = "hoopsbasketballacademy";

export type HoopsSelectionId = "special-offer" | "tier1" | "tier2" | "tier3";

export type HoopsSelection = {
  id: HoopsSelectionId;
  name: string;
  tagline: string;
  dueTodayCents: number;
  monthlyCents: number;
  /** Stripe line-item name for the one-time charge. */
  lineItemName: string;
  addOnAllowed: boolean;
  /** true only for the special offer, where the editor is bundled free. */
  addOnIncluded: boolean;
  addOnPriceCents: number;
  includes: string[];
};

export const HOOPS_SELECTIONS: Record<HoopsSelectionId, HoopsSelection> = {
  "special-offer": {
    id: "special-offer",
    name: "Special offer — Complete Platform",
    tagline: "Everything in Tier 3, plus the visual site editor, included free.",
    dueTodayCents: 200_000,
    monthlyCents: 12_500,
    lineItemName: "Special offer — Complete Platform build (editor included)",
    addOnAllowed: false,
    addOnIncluded: true,
    addOnPriceCents: 0,
    includes: [
      "Website: Home, About, Request a Workout, Hoops Legends, 3x3 League",
      "Admin Console: requests & enrollment, athletes, drills, inbox, billing, league management, settings",
      "Coach app + Family & Athlete app",
      "Hosting, security, backups, updates, support",
      "Visual site editor — included free",
    ],
  },
  tier1: {
    id: "tier1",
    name: "Tier 1 — Website",
    tagline: "A custom website that brings in new families and hosts your 3x3 league.",
    dueTodayCents: 150_000,
    monthlyCents: 8_000,
    lineItemName: "Tier 1 — Website build",
    addOnAllowed: false,
    addOnIncluded: false,
    addOnPriceCents: 0,
    includes: [
      "Website: Home, About, Request a Workout, Hoops Legends, 3x3 League",
      "Hosting, security, backups, updates, support",
      "Workout request alerts by email",
    ],
  },
  tier2: {
    id: "tier2",
    name: "Tier 2 — Website + Admin Console",
    tagline: "One place to run the academy: requests, enrollment, billing, training plans and the league.",
    dueTodayCents: 250_000,
    monthlyCents: 16_000,
    lineItemName: "Tier 2 — Website + Admin Console build",
    addOnAllowed: true,
    addOnIncluded: false,
    addOnPriceCents: 50_000,
    includes: [
      "Everything in Tier 1",
      "Admin Console: dashboard, requests & one-click enrollment, athletes & progress",
      "Drill library & workout builder, unified inbox, billing with Stripe, league management, settings",
      "Database, file and video storage; email sending for invites, receipts and messages",
    ],
  },
  tier3: {
    id: "tier3",
    name: "Tier 3 — Complete Platform",
    tagline: "Puts the academy in everyone's pocket with the Coach and Family & Athlete apps.",
    dueTodayCents: 350_000,
    monthlyCents: 20_000,
    lineItemName: "Tier 3 — Complete Platform build",
    addOnAllowed: true,
    addOnIncluded: false,
    addOnPriceCents: 50_000,
    includes: [
      "Everything in Tier 2",
      "Coach app — console on your phone, push alerts, session check-in codes, send workouts from the gym floor",
      "Family & Athlete app — progress, payment history, messages, homework with a drill timer, scan-in attendance",
      "Push notifications for the apps",
    ],
  },
};

export const HOOPS_ADD_ON = {
  name: "Visual site editor",
  priceCents: 50_000,
  description: "Edit your own website without calling us — headline, text, buttons, photos and colors, previewed on desktop, tablet and phone.",
};

/** 11:59pm America/New_York on the date the proposal names. */
export const HOOPS_OFFER_EXPIRES_AT = new Date("2026-11-15T23:59:59-05:00");

export const HOOPS_OVERAGE_RATE_NOTE = "Work beyond the included hours is billed at $125/hour, quoted before we start. Unused hours don't roll over.";

export const HOOPS_TIMELINE = {
  summary: "Your website goes live first, about 2 weeks after kickoff. Tier 1 alone takes about 2 weeks; adding a tier later adds its own build time from the day you book it.",
  allThreeWeeks: 25,
};

export const HOOPS_PAYMENT_TERMS = [
  "Payment is due in full upfront to start the project.",
  "The monthly plan is billed starting the month the platform launches.",
  "Tier prices are held for 12 months, so you can start with the website and add the Admin Console or apps later at the prices above.",
  "Monthly plans are billed month to month, with no long-term contract.",
  "Card processing fees (Stripe) are paid from your own revenue and are not part of these prices.",
];

export const HOOPS_NOT_INCLUDED = [
  "Professional photo or video shoots",
  "Logo redesign",
  "Native App Store / Google Play apps",
];

export const HOOPS_ONBOARDING_CHECKLIST: Record<HoopsSelectionId, string[]> = {
  "special-offer": fullChecklist(),
  tier1: [
    "Photos of the gym and players (shot list provided), logo files, and any brand colors beyond Duke blue and white",
    "Your story, mission and coach bio for the About page",
    "Legends names, schools or teams, photos and a short quote for each",
    "League teams, schedule and past scores",
  ],
  tier2: fullChecklist(),
  tier3: fullChecklist(),
};

function fullChecklist(): string[] {
  return [
    "Photos of the gym and players (shot list provided), logo files, and any brand colors beyond Duke blue and white",
    "Your story, mission and coach bio for the About page",
    "Legends names, schools or teams, photos and a short quote for each",
    "League teams, schedule and past scores",
    "Programs, prices, current athlete and family list, and a Stripe account (we help set it up)",
  ];
}

export function isHoopsSelectionId(value: unknown): value is HoopsSelectionId {
  return typeof value === "string" && value in HOOPS_SELECTIONS;
}
