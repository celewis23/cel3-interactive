import fs from "node:fs";
import path from "node:path";
import { createClient } from "@sanity/client";

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  const content = fs.readFileSync(filePath, "utf8");

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

const rootDir = process.cwd();
loadEnvFile(path.join(rootDir, ".env.local"));

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET;
const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION;
const token = process.env.SANITY_API_WRITE_TOKEN;

if (!projectId || !dataset || !apiVersion || !token) {
  throw new Error("Missing Sanity environment variables required to seed BioBox.");
}

const client = createClient({
  projectId,
  dataset,
  apiVersion,
  token,
  useCdn: false,
});

const body = [
  {
    _type: "block",
    style: "h2",
    children: [{ _type: "span", text: "Problem" }],
    markDefs: [],
  },
  {
    _type: "block",
    style: "normal",
    children: [
      {
        _type: "span",
        text:
          "Most creator profile tools force everyone into the same rigid template. That limits brand expression, makes monetization feel bolted on, and turns simple public pages into disconnected stacks of links, embeds, storefronts, and messaging tools.",
      },
    ],
    markDefs: [],
  },
  {
    _type: "block",
    style: "h2",
    children: [{ _type: "span", text: "Approach" }],
    markDefs: [],
  },
  {
    _type: "block",
    style: "normal",
    children: [
      {
        _type: "span",
        text:
          "BioBox was designed as a modular creator presence system rather than a static link page. The product centers on draggable, resizable boxes that let creators shape layout, media, commerce, and interaction around their own style while keeping publishing, monetization, and discovery inside one platform.",
      },
    ],
    markDefs: [],
  },
  {
    _type: "block",
    style: "h2",
    children: [{ _type: "span", text: "Build" }],
    markDefs: [],
  },
  {
    _type: "block",
    style: "normal",
    children: [
      {
        _type: "span",
        text:
          "The core builder supports drag-and-drop layout editing, resizable boxes, adaptive rendering, contextual controls, and a mobile-specific editing shell. The box system includes hero, bio, links, media, message, wall, shop, contact, featured creator, tip jar, and programmable code modules so creators can assemble profiles that feel custom without losing usability.",
      },
    ],
    markDefs: [],
  },
  {
    _type: "block",
    style: "normal",
    children: [
      {
        _type: "span",
        text:
          "Beyond the page builder, BioBox includes public profiles, discovery, follows, messaging, wall interactions, commerce with Stripe checkout, digital product delivery, analytics, notifications, and tiered plan entitlements. Studio expands the system into multi-page workspaces with roles, invites, templates, version history, activity tracking, and collaboration safeguards.",
      },
    ],
    markDefs: [],
  },
  {
    _type: "block",
    style: "h2",
    children: [{ _type: "span", text: "Results" }],
    markDefs: [],
  },
  {
    _type: "block",
    style: "normal",
    children: [
      {
        _type: "span",
        text:
          "BioBox delivers a launch-ready creator platform that combines public presence, monetization, collaboration, and growth tooling in one system. The result is a stronger foundation for creators who want more control than a standard link-in-bio product without taking on the complexity of stitching multiple tools together.",
      },
    ],
    markDefs: [],
  },
];

const doc = {
  _id: "project.biobox",
  _type: "project",
  title: "BioBox",
  slug: {
    _type: "slug",
    current: "biobox",
  },
  summary:
    "BioBox is a modular creator profile and digital presence platform that combines link-in-bio functionality, media, commerce, messaging, discovery, and Studio collaboration in one flexible system.",
  featured: true,
  client: "Internal Product",
  industry: "Creator Platform",
  results: [
    "Replaced rigid link-in-bio templates with a modular, draggable, resizable box-based builder.",
    "Unified public profiles, messaging, discovery, commerce, analytics, and collaboration into one platform.",
    "Extended the product with Studio workspaces, team roles, templates, version history, and multi-page publishing.",
    "Reached launch-candidate scope with core creator workflows, billing, growth, and digital delivery integrated.",
  ],
  body,
};

const result = await client.createOrReplace(doc);

console.log(`Seeded case study: ${result.title} (${result.slug?.current ?? "no-slug"})`);
