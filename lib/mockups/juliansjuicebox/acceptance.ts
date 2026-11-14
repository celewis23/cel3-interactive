import { randomUUID } from "node:crypto";
import { sanityWriteClient } from "@/lib/sanity.write";
import { sanityServer } from "@/lib/sanityServer";
import { JUICEBOX_PROPOSAL_SLUG } from "./config";
import type { JuiceboxSelectionId } from "./config";

export type JuiceboxBillingAddress = {
  line1: string;
  city: string;
  state: string;
  postalCode: string;
};

export type JuiceboxProposalAcceptance = {
  _id: string;
  _type: "juiceboxProposalAcceptance";
  _createdAt?: string;
  proposalSlug: string;
  status: "accepted" | "checkout-created" | "paid";
  businessName: string;
  contactName: string;
  email: string;
  phone: string;
  billingAddress: JuiceboxBillingAddress;
  selectionId: JuiceboxSelectionId;
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

export async function createJuiceboxAcceptance(
  input: Omit<JuiceboxProposalAcceptance, "_id" | "_type" | "proposalSlug" | "status" | "stripeCheckoutSessionId" | "stripeCustomerId">
): Promise<JuiceboxProposalAcceptance> {
  return sanityWriteClient.create({
    _id: `juicebox-acceptance-${randomUUID()}`,
    _type: "juiceboxProposalAcceptance",
    proposalSlug: JUICEBOX_PROPOSAL_SLUG,
    status: "accepted",
    stripeCheckoutSessionId: null,
    stripeCustomerId: null,
    ...input,
  }) as Promise<JuiceboxProposalAcceptance>;
}

export async function getJuiceboxAcceptance(id: string): Promise<JuiceboxProposalAcceptance | null> {
  if (!id || typeof id !== "string") return null;
  return sanityServer.fetch<JuiceboxProposalAcceptance | null>(
    `*[_type == "juiceboxProposalAcceptance" && _id == $id][0]`,
    { id }
  );
}

export async function markJuiceboxAcceptanceCheckoutCreated(
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

export async function markJuiceboxAcceptancePaid(id: string): Promise<void> {
  await sanityWriteClient.patch(id).set({ status: "paid" }).commit();
}

// ─── Webhook durability (the brief's "outbox"), kept in the same document store as
// everything else rather than a second storage mechanism — see final report for why.

export type JuiceboxWebhookEvent = {
  _id: string;
  _type: "juiceboxProposalWebhookEvent";
  sessionId: string;
  status: "received" | "done" | "failed";
  attempts: number;
  lastError: string | null;
  receivedAt: string;
  processedAt: string | null;
};

export async function claimJuiceboxWebhookEvent(sessionId: string): Promise<JuiceboxWebhookEvent> {
  return sanityWriteClient.createIfNotExists({
    _id: `juicebox-webhook-event-${sessionId}`,
    _type: "juiceboxProposalWebhookEvent",
    sessionId,
    status: "received",
    attempts: 0,
    lastError: null,
    receivedAt: new Date().toISOString(),
    processedAt: null,
  }) as Promise<JuiceboxWebhookEvent>;
}

export async function markJuiceboxWebhookEventDone(id: string): Promise<void> {
  await sanityWriteClient.patch(id).set({ status: "done", processedAt: new Date().toISOString() }).commit();
}

export async function markJuiceboxWebhookEventFailed(id: string, attempts: number, error: string): Promise<void> {
  await sanityWriteClient.patch(id).set({ status: "failed", attempts, lastError: error }).commit();
}

export async function listFailedJuiceboxWebhookEvents(): Promise<JuiceboxWebhookEvent[]> {
  return sanityServer.fetch<JuiceboxWebhookEvent[]>(
    `*[_type == "juiceboxProposalWebhookEvent" && status == "failed" && attempts < 8]`
  );
}
