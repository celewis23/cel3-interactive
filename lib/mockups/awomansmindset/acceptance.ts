import { randomUUID } from "node:crypto";
import { sanityWriteClient } from "@/lib/sanity.write";
import { sanityServer } from "@/lib/sanityServer";
import { AWM_PROPOSAL_SLUG } from "./config";
import type { AwmSelectionId } from "./config";

export type AwmBillingAddress = {
  line1: string;
  city: string;
  state: string;
  postalCode: string;
};

export type AwmProposalAcceptance = {
  _id: string;
  _type: "awmProposalAcceptance";
  _createdAt?: string;
  proposalSlug: string;
  status: "accepted" | "checkout-created" | "paid";
  businessName: string;
  contactName: string;
  email: string;
  phone: string;
  billingAddress: AwmBillingAddress;
  selectionId: AwmSelectionId;
  dueTodayCents: number;
  monthlyCents: number;
  signerName: string;
  agreed: boolean;
  signedAt: string;
  ip: string | null;
  userAgent: string | null;
  proposalVersion: string;
  priceHash: string;
  stripeCheckoutSessionId: string | null;
  stripeCustomerId: string | null;
};

export async function createAwmAcceptance(
  input: Omit<AwmProposalAcceptance, "_id" | "_type" | "proposalSlug" | "status" | "stripeCheckoutSessionId" | "stripeCustomerId">
): Promise<AwmProposalAcceptance> {
  return sanityWriteClient.create({
    _id: `awm-acceptance-${randomUUID()}`,
    _type: "awmProposalAcceptance",
    proposalSlug: AWM_PROPOSAL_SLUG,
    status: "accepted",
    stripeCheckoutSessionId: null,
    stripeCustomerId: null,
    ...input,
  }) as Promise<AwmProposalAcceptance>;
}

export async function getAwmAcceptance(id: string): Promise<AwmProposalAcceptance | null> {
  if (!id || typeof id !== "string") return null;
  return sanityServer.fetch<AwmProposalAcceptance | null>(
    `*[_type == "awmProposalAcceptance" && _id == $id][0]`,
    { id }
  );
}

export async function markAwmAcceptanceCheckoutCreated(
  id: string,
  stripeCheckoutSessionId: string,
  stripeCustomerId: string
): Promise<void> {
  await sanityWriteClient.patch(id).set({
    status: "checkout-created",
    stripeCheckoutSessionId,
    stripeCustomerId,
  }).commit();
}

export async function markAwmAcceptancePaid(id: string): Promise<void> {
  await sanityWriteClient.patch(id).set({ status: "paid" }).commit();
}

// ─── Webhook durability (the brief's "outbox"), kept in the same document store as
// everything else rather than a second storage mechanism — see final report for why.

export type AwmWebhookEvent = {
  _id: string;
  _type: "awmProposalWebhookEvent";
  sessionId: string;
  status: "received" | "done" | "failed";
  attempts: number;
  lastError: string | null;
  receivedAt: string;
  processedAt: string | null;
};

export async function claimAwmWebhookEvent(sessionId: string): Promise<AwmWebhookEvent> {
  return sanityWriteClient.createIfNotExists({
    _id: `awm-webhook-event-${sessionId}`,
    _type: "awmProposalWebhookEvent",
    sessionId,
    status: "received",
    attempts: 0,
    lastError: null,
    receivedAt: new Date().toISOString(),
    processedAt: null,
  }) as Promise<AwmWebhookEvent>;
}

export async function markAwmWebhookEventDone(id: string): Promise<void> {
  await sanityWriteClient.patch(id).set({ status: "done", processedAt: new Date().toISOString() }).commit();
}

export async function markAwmWebhookEventFailed(id: string, attempts: number, error: string): Promise<void> {
  await sanityWriteClient.patch(id).set({ status: "failed", attempts, lastError: error }).commit();
}

export async function listFailedAwmWebhookEvents(): Promise<AwmWebhookEvent[]> {
  return sanityServer.fetch<AwmWebhookEvent[]>(
    `*[_type == "awmProposalWebhookEvent" && status == "failed" && attempts < 8]`
  );
}
