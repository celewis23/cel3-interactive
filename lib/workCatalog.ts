export type WorkProjectType =
  | "web-apps-mobile-apps"
  | "saas-projects"
  | "websites-business-systems";

export type WorkCatalogProject = {
  title: string;
  slug: string;
  type: WorkProjectType;
  client?: string;
  summary: string;
  tags: string[];
  image?: string;
  featured?: boolean;
};

export type WorkCatalogSection = {
  id: WorkProjectType;
  label: string;
  eyebrow: string;
  description: string;
  projects: WorkCatalogProject[];
};

export const workCatalogSections: WorkCatalogSection[] = [
  {
    id: "web-apps-mobile-apps",
    label: "Web Apps & Mobile Apps",
    eyebrow: "Interactive products",
    description:
      "Custom app-style builds, dashboards, portals, and mobile-first product systems where the interface is part of the business workflow.",
    projects: [
      {
        title: "BioBox",
        slug: "biobox",
        type: "web-apps-mobile-apps",
        summary:
          "A mobile-first product and content system built around structured health, lifestyle, and bio-profile experiences.",
        tags: ["Mobile experience", "Product UX", "Dashboard"],
        image: "/bioboxscreen1.png",
        featured: true,
      },
      {
        title: "GriotOS",
        slug: "griotos",
        type: "web-apps-mobile-apps",
        summary:
          "A creator operating system with app-like workflows for content, studio management, publishing, and creative operations.",
        tags: ["PWA", "Creator tools", "Operations"],
        image: "/griotos.png",
        featured: true,
      },
      {
        title: "MeterWise",
        slug: "meterwise",
        type: "web-apps-mobile-apps",
        summary:
          "A utility intelligence platform concept for tracking usage, accounts, alerts, and customer-facing energy insights.",
        tags: ["Dashboard", "Mobile workflow", "Data product"],
        image: "/work/meterwise-card.jpg",
        featured: true,
      },
      {
        title: "ForgeOS",
        slug: "forgeos",
        type: "web-apps-mobile-apps",
        summary:
          "A business operating workspace for managing projects, systems, client work, and repeatable delivery workflows.",
        tags: ["Workspace", "Internal tools", "Ops platform"],
        image: "/work/forgeos-card.jpg",
      },
    ],
  },
  {
    id: "saas-projects",
    label: "SaaS Projects",
    eyebrow: "Product platforms",
    description:
      "Original software products, productized platforms, and operating systems designed around repeatable user workflows.",
    projects: [
      {
        title: "ForgeOS",
        slug: "forgeos",
        type: "saas-projects",
        summary:
          "A modular operating system for builders and service teams that need project, client, and workflow control in one workspace.",
        tags: ["SaaS", "Operations", "Workspace"],
        image: "/work/forgeos-card.jpg",
        featured: true,
      },
      {
        title: "FlowForge",
        slug: "flowforge",
        type: "saas-projects",
        summary:
          "A workflow automation product concept for mapping repeatable processes, triggers, handoffs, and team execution.",
        tags: ["Automation", "Workflow", "Process design"],
        image: "/work/flowforge-card.jpg",
      },
      {
        title: "GriotOS",
        slug: "griotos",
        type: "saas-projects",
        summary:
          "A creator-centered SaaS platform for managing creative operations, publishing systems, and studio workflows.",
        tags: ["SaaS", "Creator OS", "PWA"],
        image: "/griotos.png",
        featured: true,
      },
      {
        title: "BioBox",
        slug: "biobox",
        type: "saas-projects",
        summary:
          "A profile-driven SaaS experience built around structured personal data, mobile interaction, and dashboard views.",
        tags: ["SaaS", "Profiles", "Mobile app"],
        image: "/bioboxscreen1.png",
        featured: true,
      },
      {
        title: "ArcheionOS",
        slug: "archeionos",
        type: "saas-projects",
        summary:
          "A knowledge and archive operating system concept for organizing records, references, and structured intelligence.",
        tags: ["Knowledge base", "Archive", "AI-ready"],
        image: "/work/archeionos-card.jpg",
      },
      {
        title: "MeterWise",
        slug: "meterwise",
        type: "saas-projects",
        summary:
          "A SaaS platform concept for usage intelligence, customer account workflows, and operational visibility.",
        tags: ["SaaS", "Utilities", "Analytics"],
        image: "/work/meterwise-card.jpg",
        featured: true,
      },
    ],
  },
  {
    id: "websites-business-systems",
    label: "Websites & Digital Business Systems",
    eyebrow: "Client platforms",
    description:
      "Client websites and business systems that connect public presence to booking, sales, content, customer journeys, and operational workflows.",
    projects: [
      {
        title: "Sacred Vibes Yoga",
        slug: "sacred-vibes-yoga",
        type: "websites-business-systems",
        client: "Sacred Vibes Yoga",
        summary:
          "A wellness brand presence shaped around classes, trust, local discovery, and a calmer customer path from interest to action.",
        tags: ["Wellness", "Website", "Bookings"],
        image: "/work/sacred-vibes-yoga-card.jpg",
      },
      {
        title: "Magdalenas Metaphysical",
        slug: "magdalenas-metaphysical",
        type: "websites-business-systems",
        client: "Magdalenas Metaphysical",
        summary:
          "A mystical retail and services experience designed to support discovery, offerings, events, and customer engagement.",
        tags: ["Retail", "Events", "Website"],
        image: "/work/magdalenas-metaphysical-card.jpg",
      },
      {
        title: "Haus of Anubis",
        slug: "haus-of-anubis",
        type: "websites-business-systems",
        client: "Haus of Anubis",
        summary:
          "A brand-forward digital system for a specialized business with a strong visual identity and service-driven customer journey.",
        tags: ["Brand system", "Website", "Customer journey"],
        image: "/work/haus-of-anubis-card.jpg",
      },
      {
        title: "Calm Therapeutic Massage",
        slug: "calm-therapeutic-massage",
        type: "websites-business-systems",
        client: "Calm Therapeutic Massage",
        summary:
          "A service business website structured around credibility, appointment intent, local search, and a low-friction path to contact.",
        tags: ["Massage therapy", "Bookings", "Local SEO"],
      },
      {
        title: "Blu Lotus Garden",
        slug: "blu-lotus-garden",
        type: "websites-business-systems",
        client: "Blu Lotus Garden",
        summary:
          "A calm, content-ready digital presence for a wellness or lifestyle brand built around story, offerings, and customer trust.",
        tags: ["Wellness", "Content", "Website"],
        image: "/work/blu-lotus-garden-card.jpg",
      },
      {
        title: "Mr. 1 Dribble Pull Up",
        slug: "mr-1-dribble-pull-up",
        type: "websites-business-systems",
        client: "Mr. 1 Dribble Pull Up",
        summary:
          "A sports training brand system built to turn audience attention into programs, inquiries, content, and customer momentum.",
        tags: ["Sports", "Training", "Lead generation"],
        image: "/work/mr-1-dribble-pull-up-card.jpg",
      },
    ],
  },
];

export const workCatalogProjects = workCatalogSections.flatMap((section) => section.projects);
