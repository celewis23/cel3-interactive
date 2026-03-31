import { sanityServer } from "@/lib/sanityServer";
import { sanityWriteClient } from "@/lib/sanity.write";

type TemplateStep = {
  title: string;
  description: string | null;
  dueDateOffsetDays: number | null;
  actionType: string;
};

type StarterTemplate = {
  name: string;
  description: string;
  category: string;
  steps: TemplateStep[];
};

const STARTER_TEMPLATES: StarterTemplate[] = [
  {
    name: "Web Design Client Kickoff",
    description: "A polished website-project onboarding flow covering contracts, assets, kickoff, and portal activation.",
    category: "web-design",
    steps: [
      { title: "Send contract", description: "Issue the web design contract for signature.", dueDateOffsetDays: 0, actionType: "send-contract" },
      { title: "Send estimate or deposit invoice", description: "Share pricing approval and initial payment details.", dueDateOffsetDays: 0, actionType: "send-estimate" },
      { title: "Invite client to portal", description: "Prepare portal access for files, communication, and approvals.", dueDateOffsetDays: 1, actionType: "invite-portal" },
      { title: "Schedule kickoff call", description: "Book the kickoff and align on goals, scope, and timing.", dueDateOffsetDays: 2, actionType: "schedule-call" },
      { title: "Request brand assets", description: "Collect logos, copy, brand guide, and inspiration examples.", dueDateOffsetDays: 2, actionType: "request-file" },
      { title: "Create project workspace", description: "Open the project and organize tasks for delivery.", dueDateOffsetDays: 3, actionType: "create-project" },
    ],
  },
  {
    name: "E-Commerce Store Launch",
    description: "A ready-made checklist for product-heavy store builds and launch prep.",
    category: "ecommerce",
    steps: [
      { title: "Send contract", description: "Get the store build agreement approved.", dueDateOffsetDays: 0, actionType: "send-contract" },
      { title: "Collect catalog and pricing data", description: "Request product exports, pricing rules, shipping info, and tax details.", dueDateOffsetDays: 1, actionType: "request-file" },
      { title: "Invite client to portal", description: "Set up portal access for product assets, status, and requests.", dueDateOffsetDays: 1, actionType: "invite-portal" },
      { title: "Schedule merchandising review", description: "Review category structure, featured products, and collection logic.", dueDateOffsetDays: 3, actionType: "schedule-call" },
      { title: "Create implementation project", description: "Spin up the project board and assign launch tasks.", dueDateOffsetDays: 3, actionType: "create-project" },
      { title: "Confirm payment milestone", description: "Send the payment request tied to the implementation milestone.", dueDateOffsetDays: 4, actionType: "send-estimate" },
    ],
  },
  {
    name: "Retainer Client Onboarding",
    description: "A clean recurring-services setup for ongoing support and monthly delivery.",
    category: "retainer",
    steps: [
      { title: "Send retainer agreement", description: "Lock in scope, cadence, and support terms.", dueDateOffsetDays: 0, actionType: "send-contract" },
      { title: "Invite client to portal", description: "Create a place for requests, uploads, and updates.", dueDateOffsetDays: 0, actionType: "invite-portal" },
      { title: "Create recurring project board", description: "Set up a shared workspace for ongoing tasks.", dueDateOffsetDays: 1, actionType: "create-project" },
      { title: "Schedule monthly planning call", description: "Align on initial priorities and communication rhythm.", dueDateOffsetDays: 2, actionType: "schedule-call" },
      { title: "Request access and credentials", description: "Collect CMS, hosting, analytics, and store access.", dueDateOffsetDays: 2, actionType: "request-file" },
    ],
  },
  {
    name: "Consulting Engagement Setup",
    description: "A starter flow for advisory or strategy clients who need a fast, professional onboarding sequence.",
    category: "consulting",
    steps: [
      { title: "Send consulting agreement", description: "Issue the consulting contract and confirm engagement terms.", dueDateOffsetDays: 0, actionType: "send-contract" },
      { title: "Send initial invoice or estimate", description: "Collect approval and payment before strategy sessions begin.", dueDateOffsetDays: 0, actionType: "send-estimate" },
      { title: "Schedule discovery session", description: "Book the first strategy or discovery call.", dueDateOffsetDays: 1, actionType: "schedule-call" },
      { title: "Request background materials", description: "Ask for business docs, analytics, org charts, or current workflows.", dueDateOffsetDays: 1, actionType: "request-file" },
      { title: "Invite client to portal", description: "Provide a central place for files and follow-up requests.", dueDateOffsetDays: 2, actionType: "invite-portal" },
    ],
  },
];

export async function ensureDefaultOnboardingTemplates() {
  const count = await sanityServer.fetch<number>(`count(*[_type == "onboardingTemplate"])`);
  if (count > 0) {
    return sanityServer.fetch(
      `*[_type == "onboardingTemplate"] | order(_createdAt desc) {
        _id, name, description, category, steps, _createdAt
      }`
    );
  }

  for (const template of STARTER_TEMPLATES) {
    await sanityWriteClient.create({
      _type: "onboardingTemplate",
      name: template.name,
      description: template.description,
      category: template.category,
      steps: template.steps.map((step, index) => ({
        _key: crypto.randomUUID(),
        order: index,
        title: step.title,
        description: step.description,
        dueDateOffsetDays: step.dueDateOffsetDays,
        actionType: step.actionType,
      })),
    });
  }

  return sanityServer.fetch(
    `*[_type == "onboardingTemplate"] | order(_createdAt desc) {
      _id, name, description, category, steps, _createdAt
    }`
  );
}
