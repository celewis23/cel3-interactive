import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE_NAME, verifySessionToken } from "@/lib/admin/auth";
import {
  getLeadIntelligenceUsageSummary,
  listLeadIntelligenceProviderConfigs,
  listLeadIntelligenceResults,
  listLeadIntelligenceSearches,
} from "@/lib/lead-intelligence/service";
import LeadIntelligenceClient from "@/components/admin/lead-intelligence/LeadIntelligenceClient";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function LeadIntelligencePage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const session = token ? verifySessionToken(token) : null;
  if (!session || session.step !== "full") redirect("/admin/login");

  const [searches, providers, usage, results] = await Promise.all([
    listLeadIntelligenceSearches(20),
    listLeadIntelligenceProviderConfigs(),
    getLeadIntelligenceUsageSummary(),
    listLeadIntelligenceResults(undefined, 50),
  ]);

  return (
    <LeadIntelligenceClient
      initialSearches={searches}
      initialProviders={providers}
      initialUsage={usage}
      initialResults={results}
    />
  );
}
