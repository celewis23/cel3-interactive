import { sanityServer } from "@/lib/sanityServer";
import { sanityWriteClient } from "@/lib/sanity.write";

type OnboardingStep = {
  _key: string;
  status: string;
  completedAt: string | null;
  actionType: string;
};

type OnboardingInstance = {
  _id: string;
  status: string;
  steps: OnboardingStep[];
};

export type OnboardingClientMatch = {
  portalUserId?: string | null;
  pipelineContactId?: string | null;
  stripeCustomerId?: string | null;
  clientEmail?: string | null;
  clientName?: string | null;
};

function clean(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function buildMatchFilter(match: OnboardingClientMatch) {
  const clauses: string[] = [];
  const params: Record<string, string> = {};

  const portalUserId = clean(match.portalUserId);
  if (portalUserId) {
    clauses.push("portalUserId == $portalUserId");
    params.portalUserId = portalUserId;
  }

  const pipelineContactId = clean(match.pipelineContactId);
  if (pipelineContactId) {
    clauses.push("pipelineContactId == $pipelineContactId");
    params.pipelineContactId = pipelineContactId;
  }

  const stripeCustomerId = clean(match.stripeCustomerId);
  if (stripeCustomerId) {
    clauses.push("stripeCustomerId == $stripeCustomerId");
    params.stripeCustomerId = stripeCustomerId;
  }

  const clientEmail = clean(match.clientEmail)?.toLowerCase();
  if (clientEmail) {
    clauses.push("lower(clientEmail) == $clientEmail");
    params.clientEmail = clientEmail;
  }

  const clientName = clean(match.clientName);
  if (clientName && clauses.length === 0) {
    clauses.push("clientName == $clientName");
    params.clientName = clientName;
  }

  return clauses.length > 0 ? { filter: clauses.join(" || "), params } : null;
}

export async function completeOnboardingStepForClient(
  actionType: string,
  match: OnboardingClientMatch
): Promise<void> {
  const built = buildMatchFilter(match);
  if (!built) return;

  try {
    const instances = await sanityServer.fetch<OnboardingInstance[]>(
      `*[_type == "onboardingInstance" && status == "active" && (${built.filter})]{
        _id, status, steps
      }`,
      built.params
    );
    const now = new Date().toISOString();

    for (const instance of instances) {
      const steps = instance.steps ?? [];
      let changed = false;
      const updatedSteps = steps.map((step) => {
        if (step.actionType !== actionType || step.status !== "pending") return step;
        changed = true;
        return { ...step, status: "complete", completedAt: step.completedAt ?? now };
      });

      if (!changed) continue;

      const patch: Record<string, unknown> = { steps: updatedSteps };
      if (updatedSteps.every((step) => ["complete", "skipped"].includes(step.status))) {
        patch.status = "completed";
      }

      await sanityWriteClient.patch(instance._id).set(patch).commit();
    }
  } catch (err) {
    console.error("ONBOARDING_AUTO_COMPLETE_ERR:", err);
  }
}
