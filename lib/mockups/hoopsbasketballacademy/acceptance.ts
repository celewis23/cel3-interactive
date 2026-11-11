import { randomUUID } from "node:crypto";
import { sanityWriteClient } from "@/lib/sanity.write";
import { sanityServer } from "@/lib/sanityServer";
import { HOOPS_PROPOSAL_SLUG } from "./config";
import type { HoopsSelectionId } from "./config";

export type HoopsBillingAddress = {
  line1: string;
  city: string;
  state: string;
  postalCode: string;
};

export type HoopsProposalAcceptance = {
  _id: string;
  _type: "hoopsProposalAcceptance";
  _createdAt?: string;
  proposalSlug: string;
  status: "accepted" | "checkout-created" | "paid";
  businessName: string;
  contactName: string;
  email: string;
  phone: string;
  billingAddress: HoopsBillingAddress;
  selectionId: HoopsSelectionId;
  addOnRequested: boolean;
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

export async function createHoopsAcceptance(
  input: Omit<HoopsProposalAcceptance, "_id" | "_type" | "proposalSlug" | "status" | "stripeCheckoutSessionId" | "stripeCustomerId">
): Promise<HoopsProposalAcceptance> {
  return sanityWriteClient.create({
    _id: `hoops-acceptance-${randomUUID()}`,
    _type: "hoopsProposalAcceptance",
    proposalSlug: HOOPS_PROPOSAL_SLUG,
    status: "accepted",
    stripeCheckoutSessionId: null,
    stripeCustomerId: null,
    ...input,
  }) as Promise<HoopsProposalAcceptance>;
}

export async function getHoopsAcceptance(id: string): Promise<HoopsProposalAcceptance | null> {
  if (!id || typeof id !== "string") return null;
  return sanityServer.fetch<HoopsProposalAcceptance | null>(
    `*[_type == "hoopsProposalAcceptance" && _id == $id][0]`,
    { id }
  );
}

export async function markHoopsAcceptanceCheckoutCreated(
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

export async function markHoopsAcceptancePaid(id: string): Promise<void> {
  await sanityWriteClient.patch(id).set({ status: "paid" }).commit();
}

export async function findHoopsAcceptanceBySessionId(sessionId: string): Promise<HoopsProposalAcceptance | null> {
  return sanityServer.fetch<HoopsProposalAcceptance | null>(
    `*[_type == "hoopsProposalAcceptance" && stripeCheckoutSessionId == $sessionId][0]`,
    { sessionId }
  );
}

// ─── Webhook durability (the brief's "outbox"), kept in the same document store as
// everything else rather than a second storage mechanism — see final report for why.

export type HoopsWebhookEvent = {
  _id: string;
  _type: "hoopsProposalWebhookEvent";
  sessionId: string;
  status: "received" | "done" | "failed";
  attempts: number;
  lastError: string | null;
  receivedAt: string;
  processedAt: string | null;
};

export async function claimHoopsWebhookEvent(sessionId: string): Promise<HoopsWebhookEvent> {
  return sanityWriteClient.createIfNotExists({
    _id: `hoops-webhook-event-${sessionId}`,
    _type: "hoopsProposalWebhookEvent",
    sessionId,
    status: "received",
    attempts: 0,
    lastError: null,
    receivedAt: new Date().toISOString(),
    processedAt: null,
  }) as Promise<HoopsWebhookEvent>;
}

export async function getHoopsWebhookEvent(sessionId: string): Promise<HoopsWebhookEvent | null> {
  return sanityServer.fetch<HoopsWebhookEvent | null>(
    `*[_type == "hoopsProposalWebhookEvent" && sessionId == $sessionId][0]`,
    { sessionId }
  );
}

export async function markHoopsWebhookEventDone(id: string): Promise<void> {
  await sanityWriteClient.patch(id).set({ status: "done", processedAt: new Date().toISOString() }).commit();
}

export async function markHoopsWebhookEventFailed(id: string, attempts: number, error: string): Promise<void> {
  await sanityWriteClient.patch(id).set({ status: "failed", attempts, lastError: error }).commit();
}

export async function listFailedHoopsWebhookEvents(): Promise<HoopsWebhookEvent[]> {
  return sanityServer.fetch<HoopsWebhookEvent[]>(
    `*[_type == "hoopsProposalWebhookEvent" && status == "failed" && attempts < 8]`
  );
}
