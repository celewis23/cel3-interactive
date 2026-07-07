// High-signal outreach templates for the lead generator.
//
// Voice: peer-to-peer operations expert, not vendor. Every generated email
// must follow these rules:
//  1. No automation triggers ("I was reviewing…", "I noticed your website…").
//     Openings establish organic local/regional context instead.
//  2. Lead with the prospect's operational friction — the gap between
//     high-volume public actions (ticketing, booking, intake, memberships)
//     and the manual back-office work caused by tools that don't talk —
//     never with a list of CEL3 capabilities.
//  3. Human sign-off: sender name + company, never a bare company name.
//  4. Low-friction CTA: permission to send a brief structural blueprint,
//     not a request for a call.
//  5. Crisp systems language. No marketing fluff.

export const LEAD_OUTREACH_SENDER_NAME =
  process.env.LEAD_OUTREACH_SENDER_NAME ?? "Clarence";

export type OutreachEmailInput = {
  businessName: string;
  city?: string | null;
  region?: string | null;
  niche?: string | null;
  /**
   * Optional lead-specific friction observation (one sentence, written in
   * terms of what hurts them operationally). Inserted between the domain
   * friction paragraph and the CTA.
   */
  angle?: string | null;
  senderName?: string;
};

// Deterministic variant picker so a given business always renders the same
// email, but the batch as a whole doesn't read as one blast.
function pick<T>(options: T[], seedText: string): T {
  let h = 0;
  for (let i = 0; i < seedText.length; i++) {
    h = (h * 31 + seedText.charCodeAt(i)) >>> 0;
  }
  return options[h % options.length];
}

// ── Friction domains ──────────────────────────────────────────────────────────
// publicSide: the high-volume public-facing actions that mostly run themselves.
// backOffice: the manual administrative lifting staff absorbs behind them.
// blueprint: what the offered systems-path document covers.

type FrictionDomain = {
  publicNoun: string;
  publicSide: string;
  backOffice: string;
  blueprint: string;
};

const DOMAINS: Record<string, FrictionDomain> = {
  ticketing: {
    publicNoun: "ticketing and event inquiries",
    publicSide: "ticket sales, show calendars, and private-event inquiries",
    backOffice:
      "holds, settlements, artist and promoter threads, and inquiry follow-up end up living in inboxes and spreadsheets that never reconcile",
    blueprint:
      "how venues usually connect ticketing, private-event intake, and follow-up into one operational flow",
  },
  wellness: {
    publicNoun: "class bookings and memberships",
    publicSide: "class bookings, intro offers, memberships, and workshop signups",
    backOffice:
      "attendance, lapsed-member follow-up, waivers, and training leads get tracked by hand across half a dozen disconnected screens",
    blueprint:
      "how studios usually connect scheduling, member records, and follow-up without adding admin hours",
  },
  attraction: {
    publicNoun: "admissions and memberships",
    publicSide:
      "admissions, memberships, donations, field-trip requests, and venue-rental inquiries",
    backOffice:
      "the same visitor gets re-keyed into three different tools and reports get stitched together by hand at the end of the month",
    blueprint:
      "how visitor organizations usually connect admissions, membership, and rental intake into one reporting layer",
  },
  education: {
    publicNoun: "registrations and memberships",
    publicSide: "enrollments, class registrations, memberships, and event RSVPs",
    backOffice:
      "rosters, reminders, and follow-up run manually because registration, email, and records live in separate tools",
    blueprint:
      "how program-driven organizations usually connect registration, records, and follow-up into one flow",
  },
  hospitality: {
    publicNoun: "reservations and private events",
    publicSide: "reservations, private-event inquiries, and club or membership signups",
    backOffice:
      "inquiry follow-up and repeat-guest outreach get handled by hand out of an inbox, and good leads quietly age out",
    blueprint:
      "how venues usually route private-event inquiries from first touch to booked date without manual chasing",
  },
  default: {
    publicNoun: "intake and follow-up",
    publicSide: "inquiries, bookings, and signups",
    backOffice:
      "the follow-up behind them runs on manual effort because the front-of-house tools and the back-office records never sync",
    blueprint:
      "how service organizations usually connect intake, records, and follow-up into one operational flow",
  },
};

function detectDomain(niche: string | null | undefined): FrictionDomain {
  const n = (niche ?? "").toLowerCase();
  if (/(music|venue|ticket|theatre|theater|performing)/.test(n)) return DOMAINS.ticketing;
  if (/(yoga|fitness|wellness|spa)/.test(n)) return DOMAINS.wellness;
  if (/(museum|zoo|garden|attraction|park|aquarium)/.test(n)) return DOMAINS.attraction;
  if (/(education|class|writers|school|studio|gallery|arts|nonprofit)/.test(n)) return DOMAINS.education;
  if (/(winery|restaurant|brewery|dining|hospitality|catering)/.test(n)) return DOMAINS.hospitality;
  return DOMAINS.default;
}

// ── Template ──────────────────────────────────────────────────────────────────

function opening(input: OutreachEmailInput): string {
  const name = input.businessName;
  const city = input.city?.trim() || "your part of Virginia";
  const isRichmond = (input.region ?? "").toLowerCase() === "richmond" ||
    city.toLowerCase() === "richmond";

  if (isRichmond) {
    return pick(
      [
        `I run CEL3 Interactive here in Richmond, so ${name} has been on my radar for a while — we move in a lot of the same local circles.`,
        `I run CEL3 Interactive here in Richmond. Organizations like ${name} are a big part of why this city works, and I pay attention to how they operate.`,
      ],
      name
    );
  }

  return pick(
    [
      `I've been following the work you all do out in ${city} for a while — I run CEL3 Interactive up in Richmond, and organizations like ${name} are the kind of operations I keep an eye on across the state.`,
      `I run CEL3 Interactive up in Richmond, and I've been following what you all have built out in ${city}.`,
    ],
    name
  );
}

export function buildOutreachSubject(input: OutreachEmailInput): string {
  const domain = detectDomain(input.niche);
  return pick(
    [
      `The manual work behind ${domain.publicNoun} at ${input.businessName}`,
      `${input.businessName} — when ${domain.publicNoun} outgrow the back office`,
      `A systems question about ${domain.publicNoun} at ${input.businessName}`,
    ],
    `subject:${input.businessName}`
  );
}

export function buildOutreachBodyHtml(input: OutreachEmailInput): string {
  const domain = detectDomain(input.niche);
  const sender = input.senderName?.trim() || LEAD_OUTREACH_SENDER_NAME;
  const angle = input.angle?.trim();

  const paragraphs = [
    "<p>Hi there,</p>",
    `<p>${opening(input)}</p>`,
    `<p>At your volume, the public side — ${domain.publicSide} — mostly runs itself. Where organizations your size usually feel it is behind the counter: ${domain.backOffice}. The tools each do their job; they just don't talk to each other, so the staff ends up being the integration layer.</p>`,
    angle ? `<p>${angle}</p>` : null,
    `<p>I keep a short structural blueprint for exactly this — a one-page systems path showing ${domain.blueprint}. If you're open to it, I'd love to drop it over to see if any of those operational bottlenecks resonate with what your team runs into. No meeting required.</p>`,
    `<p>${sender}<br>CEL3 Interactive</p>`,
  ];

  return paragraphs.filter(Boolean).join("");
}

export function buildOutreachEmail(input: OutreachEmailInput): {
  subject: string;
  bodyHtml: string;
} {
  return {
    subject: buildOutreachSubject(input),
    bodyHtml: buildOutreachBodyHtml(input),
  };
}
