import type { PlatformBuilderSection } from "./types";

export const platformBuilderSections: PlatformBuilderSection[] = [
  {
    id: "business-goal",
    eyebrow: "Start",
    title: "Business Goal",
    description: "Pick the outcome that best matches where the platform should take the business.",
    features: [
      feature("launch-business", "business-goal", "Launch My Business", "Start with the digital foundation needed to go live.", "Clarifies the first version of your website, intake, and launch path.", "Rocket", "Launch clarity", "New brands, new offers"),
      feature("get-more-customers", "business-goal", "Get More Customers", "Build a platform that turns visitors into qualified leads.", "Focuses the platform around lead capture, follow-up, and conversion.", "Magnet", "Lead growth", "Service businesses"),
      feature("manage-clients", "business-goal", "Manage Clients", "Bring client records, notes, requests, and delivery into one place.", "Reduces scattered admin work and creates a clearer client workflow.", "Users", "Operational clarity", "Client-heavy teams"),
      feature("sell-online", "business-goal", "Sell Online", "Add ecommerce, payments, customer accounts, or digital products.", "Creates a more complete online revenue system.", "Cart", "Revenue channel", "Product and service sales", ["ecommerce"]),
      feature("automate-business", "business-goal", "Automate My Business", "Use automations to reduce repetitive work.", "Moves routine tasks into guided workflows and follow-up systems.", "Bolt", "Time savings", "Busy operators", ["automation"], true),
      feature("custom-build", "business-goal", "Build Something Custom", "Design a system around a workflow that off-the-shelf tools cannot handle.", "Creates room for custom data, approvals, roles, and business logic.", "Puzzle", "Custom scope", "Unique operations", ["custom"], true),
      feature("add-ai", "business-goal", "Add AI to My Business", "Layer AI into content, support, email, knowledge, or admin work.", "Uses AI where it can support real work without replacing strategy.", "Spark", "AI leverage", "AI-ready teams", ["ai"]),
      feature("mobile-app-experience", "business-goal", "Create a Mobile App Experience", "Make the platform feel great from a phone or app-like interface.", "Supports customers, teams, or owners who need mobile-first access.", "Phone", "Mobile access", "Field teams and customers", ["mobile"]),
    ],
  },
  {
    id: "website-foundation",
    eyebrow: "Presence",
    title: "Website Foundation",
    description: "Choose the public-facing foundation your platform needs.",
    features: [
      feature("starter-website", "website-foundation", "Starter Website", "A focused public website for a clear offer or business launch.", "Gives visitors a polished front door and a simple path to act.", "Window", "Brand presence", "Lean launches"),
      feature("multi-page-website", "website-foundation", "Multi-Page Business Website", "A full business website with services, about, contact, and conversion paths.", "Helps customers understand the business and take the next step.", "Layers", "Conversion depth", "Established businesses"),
      feature("blog-resource-center", "website-foundation", "Blog / Resource Center", "Publish helpful articles, updates, and guides.", "Builds trust and gives SEO content a home.", "Book", "Content engine", "Education-led brands"),
      feature("landing-pages", "website-foundation", "Landing Pages", "Dedicated campaign or offer pages.", "Improves focus for paid traffic, launches, and specific services.", "Target", "Campaign focus", "Growth campaigns"),
      feature("seo-foundation", "website-foundation", "SEO Foundation", "Technical and on-page basics for discoverability.", "Creates a stronger baseline for search visibility.", "Search", "Search readiness", "Local and niche services"),
      feature("analytics-tracking", "website-foundation", "Analytics & Tracking", "Track visits, actions, and conversion signals.", "Makes platform performance easier to understand and improve.", "Chart", "Performance insight", "Data-aware teams"),
      feature("content-management", "website-foundation", "Content Management", "Give the team a clean way to update content.", "Reduces developer dependence for normal content updates.", "Edit", "Content control", "Growing teams"),
      feature("portfolio-gallery", "website-foundation", "Portfolio / Gallery", "Show work, products, spaces, or outcomes visually.", "Turns proof and examples into a persuasive part of the website.", "Grid", "Trust signal", "Visual businesses"),
    ],
  },
  {
    id: "business-tools",
    eyebrow: "Operate",
    title: "Business Tools",
    description: "Add the operational tools that make the site more than a brochure.",
    features: [
      feature("business-dashboard", "business-tools", "Business Dashboard", "A central view of key activity, requests, and metrics.", "Keeps owners and teams oriented around the right data.", "Gauge", "Single source", "Operators", ["platform"]),
      feature("customer-management-crm", "business-tools", "Customer Management / CRM", "Store customer profiles, statuses, and relationship details.", "Creates a home base for sales and service history.", "Contact", "Customer clarity", "Sales teams", ["platform"]),
      feature("lead-tracking", "business-tools", "Lead Tracking", "Track new prospects from inquiry through next steps.", "Makes follow-up more consistent and visible.", "Pipeline", "Follow-up flow", "Lead-driven businesses", ["platform"]),
      feature("notes-files", "business-tools", "Notes & Files", "Attach notes, files, and context to client records.", "Keeps important details close to the work.", "File", "Context hub", "Service teams", ["platform"]),
      feature("appointment-management", "business-tools", "Appointment Management", "Manage appointments, requests, and calendar-driven work.", "Reduces scheduling friction for clients and staff.", "Calendar", "Scheduling flow", "Appointment businesses", ["platform"]),
      feature("task-management", "business-tools", "Task Management", "Assign, track, and organize work across the team.", "Turns handoffs into visible steps.", "Check", "Team execution", "Growing teams", ["platform"]),
      feature("customer-timeline", "business-tools", "Customer Timeline", "See a chronological history of customer interactions.", "Helps teams understand what happened and what comes next.", "Timeline", "Relationship memory", "Support teams", ["platform"]),
      feature("team-access", "business-tools", "Team Access", "Add roles and controlled access for staff.", "Keeps internal tools useful without exposing everything to everyone.", "Shield", "Role control", "Multi-person teams", ["platform", "team"]),
    ],
  },
  {
    id: "communication-tools",
    eyebrow: "Connect",
    title: "Communication Tools",
    description: "Choose how the platform should support conversations and follow-up.",
    features: [
      feature("client-portal", "communication-tools", "Client Portal", "Give clients a private place for requests, files, updates, or status.", "Improves transparency and reduces inbox back-and-forth.", "Door", "Client clarity", "Service delivery", ["platform", "portal"]),
      feature("business-inbox", "communication-tools", "Business Inbox", "Bring business messages into a shared workspace.", "Makes communication easier to manage as a team.", "Inbox", "Shared visibility", "Teams", ["communication"]),
      feature("email-templates", "communication-tools", "Email Templates", "Reusable messages for common workflows.", "Speeds up consistent client communication.", "Mail", "Faster replies", "Service teams", ["communication"]),
      feature("customer-messaging", "communication-tools", "Customer Messaging", "Message customers from inside the platform.", "Keeps communication attached to the customer record.", "Message", "Centralized contact", "Support teams", ["communication"]),
      feature("mass-email-campaigns", "communication-tools", "Mass Email Campaigns", "Send updates or offers to customer lists.", "Supports relationship-building and announcements.", "Campaign", "Audience reach", "Marketing teams", ["communication"]),
      feature("sms-integration", "communication-tools", "SMS Integration", "Add text-message workflows where appropriate.", "Supports urgent or mobile-first communication.", "Sms", "Fast contact", "Appointment and field teams", ["communication"], true),
      feature("ai-reply-assistant", "communication-tools", "AI Reply Assistant", "Draft or improve replies with AI assistance.", "Helps teams respond faster while staying in control.", "Reply", "Response support", "Busy inboxes", ["ai", "communication"]),
      feature("communication-analytics", "communication-tools", "Communication Analytics", "Track response patterns and campaign engagement.", "Makes communication performance easier to improve.", "Pulse", "Insight loop", "Growth teams", ["communication", "analytics"]),
    ],
  },
  {
    id: "ai-tools",
    eyebrow: "Assist",
    title: "AI Tools",
    description: "Add AI where it can reduce workload or support better customer experiences.",
    features: [
      feature("ai-content-writer", "ai-tools", "AI Content Writer", "Generate first drafts for website and marketing copy.", "Speeds up content creation while keeping human review in place.", "Pen", "Content speed", "Content-heavy teams", ["ai"]),
      feature("ai-blog-assistant", "ai-tools", "AI Blog Assistant", "Turn topics and notes into draft articles.", "Makes consistent publishing more manageable.", "Article", "Publishing support", "SEO-focused teams", ["ai"]),
      feature("ai-social-generator", "ai-tools", "AI Social Media Generator", "Create social post drafts from services, events, or blog content.", "Repurposes platform content into usable marketing assets.", "Share", "Content reuse", "Marketing teams", ["ai"]),
      feature("ai-email-assistant", "ai-tools", "AI Email Assistant", "Draft follow-up and service emails.", "Helps teams communicate faster with stronger starting points.", "At", "Reply speed", "Sales and support", ["ai"]),
      feature("ai-support-agent", "ai-tools", "AI Customer Support Agent", "Use AI to answer common questions from approved knowledge.", "Can reduce repetitive support while keeping escalation paths clear.", "Bot", "Support deflection", "Support-heavy businesses", ["ai"], true),
      feature("ai-knowledge-base", "ai-tools", "AI Knowledge Base", "Organize business knowledge for AI-assisted answers.", "Creates safer AI answers grounded in business-approved material.", "Brain", "Grounded answers", "Knowledge-heavy teams", ["ai"]),
      feature("ai-lead-assistant", "ai-tools", "AI Lead Assistant", "Help qualify, summarize, or route incoming leads.", "Makes lead intake faster and more actionable.", "Spark", "Lead triage", "Lead-heavy businesses", ["ai", "platform"]),
      feature("bring-your-own-ai-key", "ai-tools", "Bring Your Own AI Key", "Connect a client-owned AI provider account for heavier usage.", "Gives higher-usage businesses more direct control of AI costs.", "Key", "Usage control", "High-usage teams", ["ai", "byok"], true),
    ],
  },
  {
    id: "ecommerce",
    eyebrow: "Sell",
    title: "Ecommerce",
    description: "Add online selling, customer accounts, and revenue workflows.",
    features: [
      feature("product-catalog", "ecommerce", "Product Catalog", "Organize products, services, or digital offers.", "Makes offers easier to browse, manage, and sell.", "Catalog", "Offer clarity", "Product businesses", ["ecommerce"]),
      feature("online-store", "ecommerce", "Online Store", "Sell products or services online.", "Creates a direct purchase path for customers.", "Store", "Online revenue", "Sellers", ["ecommerce"]),
      feature("order-management", "ecommerce", "Order Management", "Track orders, statuses, and fulfillment details.", "Keeps online sales connected to operations.", "Package", "Fulfillment clarity", "Online sellers", ["ecommerce"]),
      feature("customer-accounts", "ecommerce", "Customer Accounts", "Let customers manage purchases, details, or history.", "Improves repeat customer experiences.", "Account", "Self service", "Repeat customers", ["ecommerce", "portal"]),
      feature("coupons-discounts", "ecommerce", "Coupons & Discounts", "Run promotions, codes, and offer-based pricing.", "Supports campaigns and customer incentives.", "Ticket", "Promotion support", "Retail and services", ["ecommerce"]),
      feature("subscriptions", "ecommerce", "Subscriptions", "Support recurring billing or repeat access.", "Creates subscription revenue and retention paths.", "Repeat", "Recurring revenue", "Membership businesses", ["ecommerce"], true),
      feature("memberships", "ecommerce", "Memberships", "Gate content, services, or benefits by membership level.", "Supports community, education, or subscription models.", "Badge", "Member access", "Membership brands", ["ecommerce", "portal"], true),
      feature("digital-products", "ecommerce", "Digital Products", "Sell downloads, templates, guides, or digital access.", "Creates scalable offers beyond service delivery.", "Download", "Scalable products", "Creators and educators", ["ecommerce"]),
    ],
  },
  {
    id: "mobile-experience",
    eyebrow: "Mobile",
    title: "Mobile Experience",
    description: "Shape how customers, owners, or teams use the platform from a phone.",
    features: [
      feature("pwa", "mobile-experience", "Installable Web App / PWA", "Make the platform installable from the browser.", "Adds app-like access without app store complexity.", "App", "App-like access", "Most platforms", ["mobile"]),
      feature("push-notifications", "mobile-experience", "Push Notifications", "Send timely updates to users who opt in.", "Supports alerts, reminders, and operational updates.", "Bell", "Timely updates", "Active users", ["mobile"], true),
      feature("mobile-dashboard", "mobile-experience", "Mobile Dashboard", "A phone-optimized dashboard for owners or staff.", "Keeps important activity visible away from the desk.", "Gauge", "Mobile visibility", "Owners and field teams", ["mobile", "platform"]),
      feature("customer-mobile-portal", "mobile-experience", "Customer Mobile Portal", "A customer portal designed for mobile use.", "Makes customer self-service easier on the devices they actually use.", "Portal", "Customer access", "Customer-facing platforms", ["mobile", "portal"]),
      feature("native-iphone-app", "mobile-experience", "Native iPhone App", "A dedicated iOS app when native app capabilities are needed.", "Supports deeper mobile experiences after scope review.", "Apple", "Native iOS", "App-first products", ["mobile", "native"], true),
      feature("native-android-app", "mobile-experience", "Native Android App", "A dedicated Android app when native app capabilities are needed.", "Supports app-first Android experiences after scope review.", "Android", "Native Android", "App-first products", ["mobile", "native"], true),
      feature("app-store-publishing", "mobile-experience", "App Store / Google Play Publishing", "Plan submission, store assets, and publishing support.", "Helps turn a native app build into a launched app store presence.", "Storefront", "Store launch", "Native app projects", ["mobile", "native"], true),
    ],
  },
  {
    id: "custom-software",
    eyebrow: "Custom",
    title: "Custom Software",
    description: "Select advanced systems that usually need discovery, architecture, and deeper scope planning.",
    features: [
      feature("custom-web-application", "custom-software", "Custom Web Application", "A custom application for a specific business workflow.", "Builds around how the business actually works.", "Code", "Custom workflow", "Unique processes", ["custom"], true),
      feature("workflow-automation", "custom-software", "Workflow Automation", "Automate approvals, handoffs, notifications, or data movement.", "Reduces repetitive manual coordination.", "Flow", "Automation", "Operations teams", ["custom", "automation"], true),
      feature("api-integrations", "custom-software", "API Integrations", "Connect third-party tools and data sources.", "Reduces double entry and keeps systems in sync.", "Plug", "Connected stack", "Multi-tool businesses", ["custom", "integration"], true),
      feature("internal-business-system", "custom-software", "Internal Business System", "Build internal tools for staff operations.", "Creates a controlled workspace for daily work.", "Building", "Internal OS", "Growing teams", ["custom", "platform"], true),
      feature("industry-specific-platform", "custom-software", "Industry-Specific Platform", "Design around niche workflows and business rules.", "Fits the platform to the reality of the industry.", "Compass", "Niche fit", "Specialized businesses", ["custom"], true),
      feature("reporting-dashboard", "custom-software", "Reporting Dashboard", "Custom reporting views across business data.", "Turns activity into decisions owners can trust.", "Report", "Decision support", "Data-driven teams", ["custom", "analytics"], true),
      feature("saas-platform", "custom-software", "SaaS Platform", "Build a multi-user software product or platform.", "Creates a product foundation with accounts, roles, and recurring value.", "Cloud", "Product platform", "Software ventures", ["custom", "saas"], true),
      feature("advanced-business-os", "custom-software", "Advanced Business Operating System", "A deeper operating system for complex business workflows.", "Unifies customer, team, data, and automation into one custom platform.", "System", "Unified operations", "Complex businesses", ["custom", "operating-system"], true),
    ],
  },
];

function feature(
  id: string,
  section: PlatformBuilderSection["id"],
  title: string,
  description: string,
  benefit: string,
  icon: string,
  estimatedImpact: string,
  recommendedFor?: string,
  tags: string[] = [],
  requiresCustomReview = false,
): PlatformBuilderSection["features"][number] {
  return {
    id,
    section,
    title,
    description,
    benefit,
    icon,
    estimatedImpact,
    recommendedFor,
    tags,
    requiresCustomReview,
  };
}

export const platformFeatureById = new Map(
  platformBuilderSections.flatMap((section) => section.features.map((item) => [item.id, item] as const)),
);

export function getPublicPlatformBuilderCatalog() {
  return platformBuilderSections;
}

export function getSelectedPlatformFeatures(ids: string[]) {
  const seen = new Set<string>();
  return ids
    .filter((id) => {
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    })
    .map((id) => platformFeatureById.get(id))
    .filter((feature): feature is NonNullable<typeof feature> => Boolean(feature));
}
