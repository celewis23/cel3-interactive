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
  throw new Error("Missing Sanity environment variables required to seed GriotOS.");
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
          "Marketing teams often operate across fragmented tools for social publishing, email, blog distribution, audience management, and reporting. That fragmentation creates inconsistent execution, slower campaign velocity, and poor visibility across channels.",
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
          "GriotOS was structured as a single operating system for content and campaign operations. The focus was to unify planning, content generation, scheduling, publishing, engagement workflows, and brand governance inside one coordinated platform rather than a stack of disconnected tools.",
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
          "The platform includes a central dashboard for campaign visibility, cross-channel performance, and operational status tracking. Social publishing supports drafting, scheduling, and multi-platform distribution, while a visual content calendar gives teams a single planning surface across campaigns and post schedules.",
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
          "Beyond social, GriotOS supports blog publishing workflows, email campaigns, SMS campaigns, contact management, engagement inbox workflows, brand profile management, asset libraries, connected accounts, notifications, and user settings. The AI Content Studio adds assisted drafting, rewrite flows, and brand-aware content generation to speed up execution without losing consistency.",
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
          "GriotOS turned fragmented marketing workflows into a unified system for content operations. The result is a stronger foundation for scale, clearer campaign visibility, faster content production, and better consistency across publishing, audience communication, and brand execution.",
      },
    ],
    markDefs: [],
  },
];

const doc = {
  _id: "project.griotos",
  _type: "project",
  title: "GriotOS",
  slug: {
    _type: "slug",
    current: "griotos",
  },
  summary:
    "GriotOS is a multi-channel marketing and social media operations platform built to unify publishing, campaign execution, audience management, and AI-assisted content workflows in one system.",
  featured: true,
  client: "Internal Product",
  industry: "Marketing Technology",
  results: [
    "Consolidated social publishing, blog distribution, email campaigns, SMS campaigns, and engagement management into one platform.",
    "Reduced workflow fragmentation by replacing multiple disconnected tools with a unified operating system.",
    "Enabled faster content production with AI-assisted drafting, rewriting, and brand-voice alignment.",
    "Improved campaign visibility through centralized analytics, activity feeds, and cross-channel performance reporting.",
  ],
  body,
};

const result = await client.createOrReplace(doc);

console.log(`Seeded case study: ${result.title} (${result.slug?.current ?? "no-slug"})`);
