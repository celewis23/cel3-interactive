export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { cookies } from "next/headers";
import { verifySessionToken, COOKIE_NAME } from "@/lib/admin/auth";
import { redirect } from "next/navigation";
import { sanityServer } from "@/lib/sanityServer";
import AutomationBuilder from "@/components/admin/automations/AutomationBuilder";

export default async function BuilderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const session = token ? verifySessionToken(token) : null;
  if (!session || session.step !== "full") redirect("/admin/login");

  const { id } = await params;

  // Fetch existing automation or pass null for new
  const automation = id === "new"
    ? null
    : await sanityServer.fetch(
        `*[_type == "automation" && _id == $id][0] {
          _id, name, description, triggerType, triggerConfig,
          nodes, enabled, runCount, lastRunAt, _createdAt, _updatedAt
        }`,
        { id }
      );

  // Fetch recent runs for run log tab
  const recentRuns = id === "new" ? [] : await sanityServer.fetch(
    `*[_type == "automationRun" && automationId == $id] | order(startedAt desc) [0...20] {
      _id, status, startedAt, completedAt, triggeredByClientId, branchPath, isDryRun, error,
      "steps": *[_type == "automationRunStep" && runId == ^._id] | order(_createdAt asc) {
        _id, nodeId, nodeType, nodeLabel, status, outputData, error, executeAt, executedAt
      }
    }`,
    { id }
  );

  // Fetch forms, staff for inspector dropdowns
  const [forms, staff] = await Promise.all([
    sanityServer.fetch(`*[_type == "cel3Form"] | order(name asc) { _id, name }`),
    sanityServer.fetch(`*[_type == "staffMember" && isActive == true] | order(name asc) { _id, name, email }`),
  ]);

  return (
    <AutomationBuilder
      initialAutomation={automation}
      initialRuns={recentRuns}
      forms={forms ?? []}
      staff={staff ?? []}
      automationId={id}
    />
  );
}
