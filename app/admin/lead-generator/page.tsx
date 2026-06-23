import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionToken, COOKIE_NAME } from "@/lib/admin/auth";
import {
  getLeadGeneratorSettings,
  listLeadCandidates,
} from "@/lib/leads/service";
import LeadGeneratorClient from "@/components/admin/leads/LeadGeneratorClient";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function LeadGeneratorPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const session = token ? verifySessionToken(token) : null;
  if (!session || session.step !== "full") redirect("/admin/login");

  const [leads, settings] = await Promise.all([
    listLeadCandidates("all"),
    getLeadGeneratorSettings(),
  ]);

  return <LeadGeneratorClient initialLeads={leads} initialSettings={settings} />;
}
