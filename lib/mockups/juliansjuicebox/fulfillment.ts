import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { sanityWriteClient } from "@/lib/sanity.write";
import { sanityServer } from "@/lib/sanityServer";
import { sendEmail } from "@/lib/gmail/api";
import { completeOnboardingStepForClient } from "@/lib/onboarding/autoComplete";
import {
  claimJuiceboxWebhookEvent, getJuiceboxAcceptance, markJuiceboxAcceptancePaid,
  markJuiceboxWebhookEventDone, markJuiceboxWebhookEventFailed,
} from "./acceptance";
import { quoteJuiceboxSelection } from "./pricing";
import { JUICEBOX_ONBOARDING_CHECKLIST, JUICEBOX_SELECTIONS } from "./config";
import { generateJuiceboxProposalPdf } from "./proposalPdf";

const DEFAULT_PM_COLUMNS = [
  { id: "backlog", name: "Backlog", taskIds: [] as string[] },
  { id: "in-progress", name: "In Progress", taskIds: [] as string[] },
  { id: "in-review", name: "In Review", taskIds: [] as string[] },
  { id: "done", name: "Done", taskIds: [] as string[] },
];

/**
 * Entry point for Stripe's checkout.session.completed webhook for the Julian's Juicebox
 * proposal flow. Idempotent: safe to call more than once for the same session.
 */
export async function fulfillJuiceboxProposalCheckout(session: Stripe.Checkout.Session): Promise<void> {
  if (session.metadata?.proposalSlug !== "juliansjuicebox") return; // not ours

  const event = await claimJuiceboxWebhookEvent(session.id);
  if (event.status === "done") return;

  try {
    await runFulfillment(session);
    await markJuiceboxWebhookEventDone(event._id);
  } catch (err) {
    await markJuiceboxWebhookEventFailed(event._id, (event.attempts ?? 0) + 1, err instanceof Error ? err.message : String(err));
    throw err;
  }
}

async function runFulfillment(session: Stripe.Checkout.Session): Promise<void> {
  const acceptanceId = session.metadata?.acceptanceId;
  if (!acceptanceId) throw new Error(`Juicebox checkout session ${session.id} has no acceptanceId metadata`);
  const acceptance = await getJuiceboxAcceptance(acceptanceId);
  if (!acceptance) throw new Error(`Juicebox acceptance ${acceptanceId} not found for session ${session.id}`);

  const quote = quoteJuiceboxSelection(acceptance.selectionId);
  const selection = JUICEBOX_SELECTIONS[acceptance.selectionId];

  const full = await stripe.checkout.sessions.retrieve(session.id, {
    expand: ["payment_intent.latest_charge", "customer"],
  });
  const paymentIntent = typeof full.payment_intent === "object" ? full.payment_intent : null;
  const charge = paymentIntent && typeof paymentIntent.latest_charge === "object" ? paymentIntent.latest_charge : null;
  const paymentMethodId = typeof paymentIntent?.payment_method === "string" ? paymentIntent.payment_method : null;
  const stripeCustomerId = typeof full.customer === "string" ? full.customer : full.customer?.id ?? acceptance.stripeCustomerId;

  // 1. Client / contact
  const existing = await sanityServer.fetch<{ _id: string } | null>(
    `*[_type == "pipelineContact" && lower(email) == $email][0]{ _id }`,
    { email: acceptance.email.toLowerCase() }
  );
  const pipelineContactId = existing
    ? existing._id
    : (await sanityWriteClient.create({
        _type: "pipelineContact",
        name: acceptance.contactName,
        email: acceptance.email,
        phone: acceptance.phone,
        company: acceptance.businessName,
        source: "Julian's Juicebox proposal",
        notes: `Accepted "${selection.name}" via the Julian's Juicebox interactive proposal.`,
        owner: null,
        stage: "won",
        stageEnteredAt: new Date().toISOString(),
        estimatedValue: quote.dueTodayCents / 100,
        stripeCustomerId,
        closedAt: new Date().toISOString(),
      }))._id;
  if (existing) {
    await sanityWriteClient.patch(pipelineContactId).set({
      stage: "won", stripeCustomerId, closedAt: new Date().toISOString(),
    }).commit();
  }
  await sanityWriteClient.create({
    _type: "pipelineActivity",
    contactId: pipelineContactId,
    type: "won",
    text: `Signed and paid for "${selection.name}" ($${(quote.dueTodayCents / 100).toFixed(2)} due today, $${(quote.monthlyCents / 100).toFixed(2)}/mo at launch).`,
    fromStage: existing ? null : "new-lead",
    toStage: "won",
    author: "Julian's Juicebox proposal",
  });

  // 2. Contract (signed — the signature was already captured at acceptance time)
  const contractCount = await sanityServer.fetch<number>(`count(*[_type == "contract"])`);
  const contractNumber = `CON-${new Date().getFullYear()}-${String(contractCount + 1).padStart(3, "0")}`;
  const pdf = generateJuiceboxProposalPdf({
    contractNumber,
    businessName: acceptance.businessName,
    contactName: acceptance.contactName,
    email: acceptance.email,
    selectionId: acceptance.selectionId,
    dueTodayCents: quote.dueTodayCents,
    monthlyCents: quote.monthlyCents,
    signerName: acceptance.signerName,
    signedAt: acceptance.signedAt,
    ip: acceptance.ip,
    priceHash: acceptance.priceHash,
  });

  const contract = await sanityWriteClient.create({
    _type: "contract",
    number: contractNumber,
    templateId: null,
    templateName: "Julian's Juicebox — interactive proposal",
    category: "service-agreement",
    date: new Date().toISOString().slice(0, 10),
    expiryDate: null,
    status: "signed",
    clientName: acceptance.contactName,
    clientEmail: acceptance.email,
    clientCompany: acceptance.businessName,
    pipelineContactId,
    stripeCustomerId,
    portalUserId: null,
    projectId: null,
    projectName: `Julian's Juicebox — ${selection.name}`,
    body: null,
    variables: {},
    signingToken: null,
    notes: `Accepted via the Julian's Juicebox interactive proposal (${acceptance.proposalVersion}).`,
    sentAt: acceptance.signedAt,
    viewedAt: acceptance.signedAt,
    signedAt: acceptance.signedAt,
    declinedAt: null,
    signatureData: null,
    signatureType: "typed-name",
    signatureIp: acceptance.ip,
    signatureUserAgent: acceptance.userAgent,
    signerName: acceptance.signerName,
    signedPdfDriveFileId: null,
    // Juicebox-specific
    proposalSlug: "juliansjuicebox",
    selectionId: acceptance.selectionId,
    priceHash: acceptance.priceHash,
    dueTodayCents: quote.dueTodayCents,
    pendingMonthlyAmountCents: quote.monthlyCents,
    pendingSubscriptionStatus: "starts-at-launch",
    stripePaymentMethodId: paymentMethodId,
    stripePaymentIntentId: typeof full.payment_intent === "string" ? full.payment_intent : paymentIntent?.id ?? null,
    stripeChargeId: charge?.id ?? null,
    stripeReceiptUrl: charge?.receipt_url ?? null,
    acceptedProposalPdfBase64: pdf.toString("base64"),
  });

  // 3. Project + onboarding checklist as Kanban cards
  const project = await sanityWriteClient.create({
    _type: "pmProject",
    name: `Julian's Juicebox — ${selection.name}`,
    description: `Created automatically from the signed Julian's Juicebox proposal (contract ${contractNumber}).`,
    status: "active",
    dueDate: null,
    clientRef: pipelineContactId,
    clientName: acceptance.businessName,
    clientEmail: acceptance.email,
    pipelineContactId,
    stripeCustomerId,
    portalUserId: null,
    columns: DEFAULT_PM_COLUMNS,
    calendarEventId: null,
  });
  await sanityWriteClient.patch(contract._id).set({ projectId: project._id }).commit();

  const checklist = JUICEBOX_ONBOARDING_CHECKLIST[acceptance.selectionId];
  const taskIds: string[] = [];
  for (const item of checklist) {
    const task = await sanityWriteClient.create({
      _type: "pmTask",
      projectId: project._id,
      columnId: "backlog",
      title: item,
      description: "",
      priority: "medium",
      dueDate: null,
      assignee: null,
      clientRef: pipelineContactId,
      driveFileId: null,
      driveFileUrl: null,
      driveFileName: null,
    });
    taskIds.push(task._id);
  }
  if (taskIds.length) {
    await sanityWriteClient.patch(project._id).set({
      columns: DEFAULT_PM_COLUMNS.map((col) => (col.id === "backlog" ? { ...col, taskIds } : col)),
    }).commit();
  }

  await completeOnboardingStepForClient("create-project", {
    pipelineContactId, stripeCustomerId, clientEmail: acceptance.email, clientName: acceptance.contactName,
  });

  // 4. Mark the acceptance consumed
  await markJuiceboxAcceptancePaid(acceptance._id);

  // 5. Email the client a receipt + PDF, and notify the admin — best-effort, never fails fulfillment
  const amount = `$${(quote.dueTodayCents / 100).toFixed(2)}`;
  const monthly = `$${(quote.monthlyCents / 100).toFixed(2)}`;
  await sendEmail({
    to: acceptance.email,
    subject: "Your Julian's Juicebox proposal is confirmed",
    htmlBody: `<p>Hi ${escapeHtml(acceptance.contactName.split(" ")[0] || acceptance.contactName)},</p>
      <p>Thanks for signing! You're confirmed for <strong>${escapeHtml(selection.name)}</strong> — ${amount} paid today, ${monthly}/month starting the month your platform launches.</p>
      <p>Your signed proposal is attached. We'll be in touch shortly to schedule your kickoff call.</p>
      <p>CEL3 Interactive</p>`,
    attachments: [{ filename: `Julians-Juicebox-Proposal-${contractNumber}.pdf`, mimeType: "application/pdf", data: pdf }],
  }).catch((err) => console.error("JUICEBOX_CLIENT_EMAIL_ERR:", err));

  const adminEmail = process.env.JUICEBOX_ADMIN_EMAIL || process.env.ADMIN_USERNAME;
  if (adminEmail?.includes("@")) {
    await sendEmail({
      to: adminEmail,
      subject: "Julian's Juicebox proposal signed & paid",
      htmlBody: `<p>${escapeHtml(acceptance.businessName)} (${escapeHtml(acceptance.contactName)}, ${escapeHtml(acceptance.email)}) signed and paid for <strong>${escapeHtml(selection.name)}</strong>.</p>
        <ul>
          <li>Due today: ${amount}</li>
          <li>Monthly at launch: ${monthly}</li>
          <li>Contract: ${contractNumber}</li>
          <li>Project: /admin/projects/${project._id}</li>
        </ul>`,
      attachments: [{ filename: `Julians-Juicebox-Proposal-${contractNumber}.pdf`, mimeType: "application/pdf", data: pdf }],
    }).catch((err) => console.error("JUICEBOX_ADMIN_EMAIL_ERR:", err));
  }
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
