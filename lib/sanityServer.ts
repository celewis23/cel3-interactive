import { createClient } from "@sanity/client";

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET!;
const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION ?? "2025-01-01";
const token = process.env.SANITY_API_TOKEN ?? process.env.SANITY_API_WRITE_TOKEN;

if (!projectId) throw new Error("Missing NEXT_PUBLIC_SANITY_PROJECT_ID");
if (!dataset) throw new Error("Missing NEXT_PUBLIC_SANITY_DATASET");
if (!token) throw new Error("Missing SANITY_API_TOKEN or SANITY_API_WRITE_TOKEN");

export const sanityServer = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: false,
  token,
});
