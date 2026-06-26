import type { WorkDetail } from "@/lib/types";

function block(style: "normal" | "h2", text: string) {
  return {
    _type: "block",
    style,
    children: [{ _type: "span", text }],
    markDefs: [],
  };
}

function body(problem: string, approach: string, build: string, results: string) {
  return [
    block("h2", "Problem"),
    block("normal", problem),
    block("h2", "Approach"),
    block("normal", approach),
    block("h2", "Build"),
    block("normal", build),
    block("h2", "Results"),
    block("normal", results),
  ];
}

export const workCaseStudyFallbacks: Record<string, WorkDetail> = {
  "sacred-vibes-yoga": {
    _id: "fallback.sacred-vibes-yoga",
    title: "Sacred Vibes Yoga",
    slug: "sacred-vibes-yoga",
    summary:
      "A wellness platform that turns a calm brand presence into a clearer path for booking, events, digital content, and customer trust.",
    client: "Sacred Vibes Yoga",
    industry: "Healing & Wellness",
    timeline: "Brand platform and booking-focused website",
    stack: ["Responsive website", "Booking pathway", "Events", "Content system", "Member-ready UX"],
    results: [
      "Created a calmer first impression around healing, wellness, classes, events, and digital studio content.",
      "Reduced friction between visitor interest and booking intent with clear calls to action.",
      "Supported multiple customer paths: experiences, events, blog content, sign-in, and direct contact.",
      "Gave the brand a polished digital home that feels aligned with the in-person wellness experience.",
    ],
    body: body(
      "Sacred Vibes needed a digital presence that felt peaceful and premium while still helping visitors take action. The site had to communicate the wellness brand, guide people toward sessions and events, and keep the experience from feeling cluttered or transactional.",
      "The experience was shaped around emotional clarity first: strong visual atmosphere, simple navigation, direct booking prompts, and content areas that support education and trust. The goal was to let the visitor understand the energy of the brand before asking them to take the next step.",
      "The build organizes the public experience around home, experiences, events, about, digital studio, blog, and contact pathways. Calls to action for beginning the journey, booking a session, and signing in are positioned so the site can support both new visitors and returning community members.",
      "The result is a polished wellness website that connects brand feeling to practical conversion paths. Sacred Vibes can present its healing work, promote events and services, and give visitors a clearer route from discovery to booking."
    ),
  },
  "magdalenas-metaphysical": {
    _id: "fallback.magdalenas-metaphysical",
    title: "Magdalena's Metaphysical",
    slug: "magdalenas-metaphysical",
    summary:
      "A spiritual retail and services platform for a Richmond botanica, combining ecommerce, practitioner bookings, events, rituals, content, and admin workflows.",
    client: "Magdalena's Metaphysical",
    industry: "Metaphysical Retail & Services",
    timeline: "Commerce and services platform",
    stack: ["Next.js", "Admin dashboard", "Products", "Services", "Events", "Email workflows"],
    results: [
      "Unified shop discovery, spiritual services, events, rituals, journal content, and store visit information.",
      "Added operational support for admin management, email workflows, practitioners, bookings, and customer communication.",
      "Created a richer brand experience around the botanica while preserving clear commercial paths.",
      "Made the site capable of supporting both public storytelling and day-to-day business management.",
    ],
    body: body(
      "Magdalena's needed more than a visual refresh. The business needed a digital system that could represent a spiritual retail brand, support in-person and online customer journeys, and give the team operational tools behind the scenes.",
      "The approach was to treat the botanica as a complete business platform: public storytelling on the front end, structured commerce and services in the middle, and admin workflows behind it. The brand experience stays mystical and editorial, while the system underneath supports practical business activity.",
      "The build includes public areas for shop, practitioners, events, rituals, journal content, about, and visit information. Admin features support email, settings, dashboard activity, service flows, events, product content, practitioner information, and AI-assisted customer communication.",
      "Magdalena's now has a platform that can carry the full weight of the business: retail, services, events, content, customer communication, and operational management. The result feels like a branded spiritual destination instead of a disconnected website and admin stack."
    ),
  },
  "haus-of-anubis": {
    _id: "fallback.haus-of-anubis",
    title: "Haus of Anubis",
    slug: "haus-of-anubis",
    summary:
      "A luxury spiritual apothecary platform with cinematic brand presentation, ecommerce pathways, ritual education, tarot services, and admin support.",
    client: "Haus of Anubis",
    industry: "Luxury Spiritual Commerce",
    timeline: "Brand and commerce system",
    stack: ["Next.js", "Commerce", "Admin tools", "Checkout", "Email templates", "AI-assisted media"],
    results: [
      "Translated a highly visual spiritual brand into a cinematic web experience.",
      "Supported apothecary shopping, services, rituals, journal content, events, and customer account paths.",
      "Added admin and checkout foundations so the brand can operate beyond a static website.",
      "Created a premium digital environment aligned with Egyptian-inspired symbolism and spiritual commerce.",
    ],
    body: body(
      "Haus of Anubis needed a site that could carry a strong visual identity without becoming only an art direction exercise. The business also needed practical paths for shopping, services, ritual education, events, and customer management.",
      "The platform was approached as a luxury digital temple: cinematic presentation, strong visual hierarchy, and clear commercial structure underneath. The experience needed to feel immersive while still allowing customers to find products, explore services, and move toward checkout or booking.",
      "The build includes public pages for shop, services, rituals, journal content, events, and about content, with account, cart, search, checkout, and admin flows supporting the business layer. Email templates and AI-assisted creative tooling extend the system beyond the public website.",
      "The result is a branded commerce experience that feels distinctive and operationally useful. Haus of Anubis can present ritual goods, services, education, and visual storytelling in one connected platform."
    ),
  },
  "calm-therapeutic-massage": {
    _id: "fallback.calm-therapeutic-massage",
    title: "Calm Therapeutic Massage",
    slug: "calm-therapeutic-massage",
    summary:
      "A service business website structured around trust, local discovery, appointment intent, and a simple path from interest to contact.",
    client: "Calm Therapeutic Massage",
    industry: "Massage Therapy",
    timeline: "Service business website",
    stack: ["Responsive website", "Service pages", "Local SEO", "Contact pathway", "Booking intent"],
    results: [
      "Positioned massage therapy services around credibility, comfort, and clear next steps.",
      "Created a cleaner path for visitors to understand services and move toward scheduling.",
      "Supported local discovery with a structure built for service intent and search visibility.",
      "Gave the business a practical digital foundation for trust, inquiries, and future booking workflows.",
    ],
    body: body(
      "Service businesses often lose leads when the website makes visitors work too hard to understand the offer, trust the provider, or find the next step. Calm Therapeutic Massage needed a simple, credible presence built around appointment intent.",
      "The approach focused on clarity and comfort: explain the service value quickly, keep the visual tone calm, and remove unnecessary friction from the path to contact. The site needed to feel professional without becoming overdesigned.",
      "The build centers on service presentation, local search relevance, contact prompts, and a straightforward content structure that can support future booking or intake workflows. The experience is designed for visitors who already have a need and want confidence before reaching out.",
      "The result is a service-business website foundation that supports trust, local visibility, and inquiry generation. It gives Calm Therapeutic Massage a cleaner path from first visit to appointment conversation."
    ),
  },
  "blu-lotus-garden": {
    _id: "fallback.blu-lotus-garden",
    title: "Blu Lotus Garden",
    slug: "blu-lotus-garden",
    summary:
      "A botanical wellness and sound therapy commerce presence built around product discovery, herbal remedies, trust, and a calm customer journey.",
    client: "Blu Lotus Garden",
    industry: "Botanical Wellness",
    timeline: "Wellness commerce website",
    stack: ["Responsive storefront", "Product discovery", "Cart pathway", "Sound therapy content", "Brand system"],
    results: [
      "Created a clear storefront path for botanical wellness products and sound therapy offerings.",
      "Balanced ecommerce calls to action with a calm wellness brand presentation.",
      "Made the product and service story easier to understand from the first screen.",
      "Established a flexible foundation for shop, blog, contact, and future wellness content.",
    ],
    body: body(
      "Blu Lotus Garden needed to present herbal wellness products and sound therapy in a way that felt trustworthy, calm, and ready for commerce. The challenge was to make the site feel like a wellness brand while still helping visitors shop and take action.",
      "The approach paired clean navigation with direct product and service positioning. The homepage introduces the botanical wellness focus, then guides visitors toward shopping, sound therapy, brand story, blog content, and contact.",
      "The build supports a storefront-style experience with shop navigation, cart behavior, product-forward hero content, service calls to action, and a visual identity centered on botanical calm. The structure leaves room for deeper educational content as the brand grows.",
      "Blu Lotus Garden gained a clearer digital storefront and brand platform. Visitors can understand the offering quickly, move toward shopping, and connect the product experience to the larger wellness story."
    ),
  },
  "mr-1-dribble-pull-up": {
    _id: "fallback.mr-1-dribble-pull-up",
    title: "Mr. 1 Dribble Pull Up",
    slug: "mr-1-dribble-pull-up",
    summary:
      "A basketball training brand system designed to turn attention into program interest, inquiries, content engagement, and customer momentum.",
    client: "Mr. 1 Dribble Pull Up",
    industry: "Sports Training",
    timeline: "Training brand platform",
    stack: ["Brand website", "Lead generation", "Program positioning", "Mobile-first UX", "Content pathway"],
    results: [
      "Positioned the training brand around a memorable concept and clear audience action.",
      "Created a platform direction for programs, inquiries, training content, and customer conversion.",
      "Built the experience with mobile-first visitors in mind, where most sports audiences discover brands.",
      "Gave the brand a stronger digital foundation for turning social attention into owned leads.",
    ],
    body: body(
      "Sports training brands often build attention on social platforms but lose momentum when there is no clear owned destination for programs, inquiries, and next steps. Mr. 1 Dribble Pull Up needed a digital brand system that could turn interest into action.",
      "The approach was to make the concept direct, memorable, and conversion-oriented. The site direction centers the trainer's positioning, then gives athletes, parents, and prospects a clearer path toward programs, contact, and ongoing content.",
      "The build focuses on mobile-first presentation, program messaging, lead generation, brand identity, and content pathways that can expand into booking, payments, training resources, or member access over time.",
      "The result is a stronger foundation for a training business that depends on trust, visibility, and speed of action. The brand can use the platform to capture interest from social traffic and move people toward a real training relationship."
    ),
  },
  forgeos: {
    _id: "fallback.forgeos",
    title: "ForgeOS",
    slug: "forgeos",
    summary:
      "A business operating workspace for managing clients, projects, systems, delivery workflows, and repeatable service operations in one place.",
    client: "Internal Product",
    industry: "Business Operations SaaS",
    timeline: "Product platform",
    stack: ["Workspace UX", "Client management", "Project operations", "Delivery workflows", "SaaS architecture"],
    results: [
      "Defined a central workspace for service delivery, client work, projects, and operational control.",
      "Reduced the need to spread delivery context across separate documents, tools, and trackers.",
      "Created a product direction that can support repeatable workflows for builders and service teams.",
      "Established a stronger foundation for client portals, automations, and AI-assisted operations.",
    ],
    body: body(
      "Builders and service teams often run delivery from a scattered mix of notes, task boards, invoices, folders, and client messages. ForgeOS was shaped to bring that operating context into one business workspace.",
      "The product direction focuses on clarity across clients, projects, repeatable processes, and internal systems. Instead of treating each tool as separate, ForgeOS frames the business as an operating system where work, relationships, and delivery workflows stay connected.",
      "The build concept includes workspace dashboards, client and project organization, workflow views, system documentation, and operational surfaces that can expand into portals, automations, billing, and AI-supported decision making.",
      "ForgeOS gives the product line a clear operating-platform foundation. It is positioned as a workspace for teams that need less fragmentation and more control over how work gets delivered."
    ),
  },
  flowforge: {
    _id: "fallback.flowforge",
    title: "FlowForge",
    slug: "flowforge",
    summary:
      "A workflow automation product concept for designing repeatable processes, triggers, handoffs, approvals, and execution paths.",
    client: "Internal Product",
    industry: "Workflow Automation",
    timeline: "SaaS product concept",
    stack: ["Automation design", "Process mapping", "Triggers", "Approvals", "Operational UX"],
    results: [
      "Clarified how repeatable business processes can be modeled as reusable workflows.",
      "Created a direction for connecting triggers, handoffs, approvals, and execution status.",
      "Positioned automation as a visual operating layer instead of a hidden technical setup.",
      "Established a product foundation for teams that need process clarity before deeper automation.",
    ],
    body: body(
      "Many businesses want automation, but their processes are not clearly mapped. The work often lives in someone's head, in scattered SOPs, or across disconnected tools. FlowForge addresses that gap by making process design visible and reusable.",
      "The approach was to design around workflow clarity first. Before a process can be automated, a team needs to see the steps, triggers, handoffs, approvals, and edge cases. FlowForge frames automation as an operational design surface.",
      "The product concept includes workflow maps, reusable process templates, trigger definitions, approval points, handoff logic, and execution visibility. The goal is to let teams build operational flow without needing to start from low-level automation rules.",
      "FlowForge creates a clearer bridge between process documentation and automation. It gives teams a way to design the work, understand the flow, and prepare repeatable systems for execution."
    ),
  },
  griotos: {
    _id: "fallback.griotos",
    title: "GriotOS",
    slug: "griotos",
    summary:
      "A multi-channel marketing and social media operations platform for publishing, campaign execution, audience management, and AI-assisted content workflows.",
    client: "Internal Product",
    industry: "Marketing Technology",
    timeline: "SaaS product platform",
    stack: ["Social publishing", "Campaigns", "AI Content Studio", "Email", "SMS", "Analytics"],
    results: [
      "Consolidated social publishing, blog distribution, email campaigns, SMS campaigns, and engagement management.",
      "Reduced workflow fragmentation by replacing disconnected marketing tools with a unified operating system.",
      "Enabled faster content production with AI-assisted drafting, rewriting, and brand-voice alignment.",
      "Improved campaign visibility through centralized analytics and cross-channel reporting.",
    ],
    body: body(
      "Marketing teams often operate across fragmented tools for social publishing, email, blog distribution, audience management, and reporting. That fragmentation creates inconsistent execution, slower campaign velocity, and poor visibility across channels.",
      "GriotOS was structured as a single operating system for content and campaign operations. The focus was to unify planning, content generation, scheduling, publishing, engagement workflows, and brand governance inside one coordinated platform.",
      "The platform includes campaign visibility, cross-channel performance, social drafting and scheduling, a visual content calendar, blog workflows, email campaigns, SMS campaigns, contact management, engagement workflows, connected accounts, notifications, and an AI Content Studio.",
      "GriotOS turns fragmented marketing workflows into a unified system for content operations. The result is clearer campaign visibility, faster content production, and stronger consistency across publishing, audience communication, and brand execution."
    ),
  },
  biobox: {
    _id: "fallback.biobox",
    title: "BioBox",
    slug: "biobox",
    summary:
      "A modular creator profile and digital presence platform combining link-in-bio functionality, media, commerce, messaging, discovery, and Studio collaboration.",
    client: "Internal Product",
    industry: "Creator Platform",
    timeline: "SaaS product platform",
    stack: ["Profile builder", "Commerce", "Messaging", "Discovery", "Studio workspaces"],
    results: [
      "Replaced rigid link-in-bio templates with a modular draggable, resizable box-based builder.",
      "Unified public profiles, messaging, discovery, commerce, analytics, and collaboration.",
      "Extended the product with Studio workspaces, team roles, templates, version history, and multi-page publishing.",
      "Reached launch-candidate scope with core creator workflows, billing, growth, and digital delivery integrated.",
    ],
    body: body(
      "Most creator profile tools force everyone into the same rigid template. That limits brand expression, makes monetization feel bolted on, and turns simple public pages into disconnected stacks of links, embeds, storefronts, and messaging tools.",
      "BioBox was designed as a modular creator presence system rather than a static link page. The product centers on draggable, resizable boxes that let creators shape layout, media, commerce, and interaction around their own style.",
      "The core builder supports drag-and-drop layout editing, resizable boxes, adaptive rendering, contextual controls, and a mobile-specific editing shell. The system includes public profiles, discovery, follows, messaging, wall interactions, commerce, analytics, notifications, and Studio collaboration.",
      "BioBox delivers a launch-ready creator platform that combines public presence, monetization, collaboration, and growth tooling in one system. Creators get more control than a standard link-in-bio product without stitching multiple tools together."
    ),
  },
  archeionos: {
    _id: "fallback.archeionos",
    title: "ArcheionOS",
    slug: "archeionos",
    summary:
      "A backoffice operating system for managing clients, projects, billing, contracts, automations, email, portals, and operational records.",
    client: "Internal Product",
    industry: "Backoffice SaaS",
    timeline: "Business operating system",
    stack: ["Prisma", "Better Auth", "Resend", "Client portals", "Billing", "Automations"],
    results: [
      "Modeled a full backoffice data layer for organizations, clients, invoices, estimates, projects, tasks, contracts, and automations.",
      "Connected core business workflows across client management, billing, project delivery, email, and portal access.",
      "Added email templates for invites, invoices, payment reminders, booking confirmations, and welcome flows.",
      "Created an operating-system foundation for service businesses that need their admin tools to work together.",
    ],
    body: body(
      "Service businesses often outgrow generic admin tools because client records, billing, projects, contracts, email, and portals all live in different systems. ArcheionOS was designed to bring those backoffice workflows into one operating system.",
      "The approach was to model the business around connected records instead of isolated features. Organizations, users, clients, projects, tasks, invoices, estimates, contracts, automations, email accounts, and portal access are treated as parts of one operational graph.",
      "The backoffice build includes database packages, authentication, organization roles, client records, billing models, estimates, invoices, projects, task assignments, time entries, contracts, portal tokens, automation runs, approval workflows, and transactional email templates through Resend.",
      "ArcheionOS creates a foundation for a serious backoffice platform. It gives businesses a path to manage operations from one system and creates room for AI, automation, reporting, and client-facing workflows to build on top of shared data."
    ),
  },
  meterwise: {
    _id: "fallback.meterwise",
    title: "MeterWise",
    slug: "meterwise",
    summary:
      "A utility intelligence platform concept for tracking usage, accounts, alerts, customer-facing energy insights, and operational visibility.",
    client: "Internal Product",
    industry: "Utility Data & Analytics",
    timeline: "Data product concept",
    stack: ["Usage dashboards", "Account workflows", "Alerts", "Analytics", "Customer insights"],
    results: [
      "Defined a product direction around utility usage intelligence and customer account visibility.",
      "Created a dashboard-centered experience for tracking usage, alerts, and operational status.",
      "Positioned the platform for both internal operations and customer-facing insight workflows.",
      "Established a foundation for future analytics, notification, and reporting features.",
    ],
    body: body(
      "Utility customers and operators often need clearer insight into usage, account status, changes, and alerts. Without a focused interface, important patterns stay buried in raw data or fragmented account systems.",
      "MeterWise was approached as a utility intelligence platform: usage data, customer account context, alerting, and operational visibility presented through a clean product interface. The goal is to make energy or meter activity easier to understand and act on.",
      "The concept centers on dashboards, account workflows, usage tracking, alert states, customer insights, and reporting views. The platform direction can support internal teams, customer-facing portals, and data-driven notifications as it grows.",
      "MeterWise creates a clear foundation for a data product in the utility space. It turns usage and account information into a more understandable operating surface for decisions, service, and customer communication."
    ),
  },
};

export function getWorkCaseStudyFallback(slug?: string) {
  return slug ? workCaseStudyFallbacks[slug] ?? null : null;
}

export function hasWorkCaseStudyFallback(slug?: string) {
  return Boolean(getWorkCaseStudyFallback(slug));
}
