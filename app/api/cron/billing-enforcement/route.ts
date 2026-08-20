export const runtime = "nodejs";

/**
 * Daily collections check. For each overdue invoice, walks a fixed ladder
 * (expressed as days past the invoice's due date, not calendar dates):
 *   stage 1 — first notice email
 *   stage 2 — second notice email + a real $25 (configurable) late fee,
 *             billed as its own separate Stripe invoice (Stripe doesn't allow
 *             adding line items to an already-finalized invoice)
 *   stage 3 — "service interrupted" email
 *   stage 4 — website actually suspended (Vercel domain redirect)
 * Dunning progress is tracked on a separate `invoiceDunningState` Sanity doc
 * per invoice rather than on the `invoice` doc itself, because
 * syncStripeInvoiceToSanity() fully replaces that doc on every sync and
 * would silently wipe any extra fields stored directly on it.
 * Only the single newly-reached stage fires per run, so a missed cron
 * run doesn't fire every skipped stage's email at once.
 * Clients auto-suspended for non-payment are restored once they have no
 * remaining overdue invoices (including any late-fee invoice).
 */

import { NextRequest, NextResponse } from "next/server";
import { sanityServer } from "@/lib/sanityServer";
import { sanityWriteClient } from "@/lib/sanity.write";
import { getEnforcementSettings } from "@/lib/billing/enforcementSettings";
import { automationEngine } from "@/lib/automations/engine";
import { sendPushNotificationToAudience } from "@/lib/notifications/push";
import { logAudit, AuditAction } from "@/lib/audit/log";
import { syncVercelWebsiteStatus } from "@/lib/billing/websiteStatusSync";
import { createInvoice } from "@/lib/stripe/billing";
import { syncStripeInvoiceToSanity } from "@/lib/stripe/sync";
import {
  sendFirstNoticeEmail,
  sendSecondNoticeEmail,
  sendInterruptionNoticeEmail,
  type DunningInvoice,
} from "@/lib/billing/dunningEmails";

function isAuthorizedCron(req: NextRequest) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (process.env.CRON_SECRET && secret === process.env.CRON_SECRET) return true;
  return req.headers.get("x-vercel-cron") === "1";
}

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split("T")[0];
}

type InvoiceRow = {
  _id: string;
  clientId?: string;
  clientName: string;
  clientEmail: string | null;
  stripeCustomerId: string;
  number: string;
  dueDate: string;
  amountDueCents: number;
  hostedInvoiceUrl: string | null;
};

type DunningStateRow = {
  invoiceId: string;
  dunningStage: number;
  lateFeeInvoiceId: string | null;
  isLateFee: boolean;
};

type ClientRow = {
  _id: string;
  name: string | null;
  websiteStatus?: string;
  websiteAutoSuspendExempt?: boolean;
  vercelProjectId: string | null;
  vercelDomain: string | null;
};

const SYSTEM_AUDIT_USER = { userId: null, userName: "Billing enforcement", userEmail: "", isOwner: false };

export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = {
    firstNotice: 0,
    secondNotice: 0,
    interruptionNotice: 0,
    suspended: 0,
    restored: 0,
    vercelSyncFailed: 0,
    errors: 0,
  };

  try {
    const settings = await getEnforcementSettings();
    const today = new Date().toISOString().split("T")[0];

    const overdueInvoices = await sanityServer.fetch<InvoiceRow[]>(
      `*[_type == "invoice" && status in ["open", "sent", "overdue"] && dueDate < $today && defined(clientId)] {
        _id, clientId, clientName, clientEmail, stripeCustomerId, number, dueDate, amountDueCents, hostedInvoiceUrl
      }`,
      { today }
    );

    // Any client with at least one overdue invoice (original or late-fee) still owes money.
    const clientIdsStillOwing = new Set(overdueInvoices.map((inv) => inv.clientId).filter((id): id is string => !!id));

    if (settings.autoSuspendEnabled && overdueInvoices.length > 0) {
      const invoiceIds = overdueInvoices.map((inv) => inv._id);
      const dunningStates = await sanityServer.fetch<DunningStateRow[]>(
        `*[_type == "invoiceDunningState" && invoiceId in $ids]{ invoiceId, dunningStage, lateFeeInvoiceId, isLateFee }`,
        { ids: invoiceIds }
      );
      const stateByInvoiceId = new Map(dunningStates.map((s) => [s.invoiceId, s]));

      const clientIds = [...clientIdsStillOwing];
      const clients = await sanityServer.fetch<ClientRow[]>(
        `*[_type == "pipelineContact" && _id in $ids]{ _id, name, websiteStatus, websiteAutoSuspendExempt, vercelProjectId, vercelDomain }`,
        { ids: clientIds }
      );
      const clientById = new Map(clients.map((c) => [c._id, c]));

      for (const inv of overdueInvoices) {
        const state = stateByInvoiceId.get(inv._id);
        if (state?.isLateFee) continue; // late-fee invoices don't run their own ladder

        const daysPastDue = Math.floor((Date.now() - new Date(`${inv.dueDate}T00:00:00Z`).getTime()) / 86400000);
        const currentStage = state?.dunningStage ?? 0;

        let targetStage = 0;
        if (daysPastDue >= settings.suspendDays) targetStage = 4;
        else if (daysPastDue >= settings.finalNoticeDays) targetStage = 3;
        else if (daysPastDue >= settings.secondNoticeDays) targetStage = 2;
        else if (daysPastDue >= settings.firstNoticeDays) targetStage = 1;

        if (targetStage <= currentStage) continue;
        const nextStage = currentStage + 1; // advance one stage per run

        try {
          let lateFeeInvoiceId = state?.lateFeeInvoiceId ?? null;
          const client = inv.clientId ? clientById.get(inv.clientId) : undefined;
          const dunningInvoice: DunningInvoice = {
            clientName: inv.clientName,
            clientEmail: inv.clientEmail ?? "",
            number: inv.number,
            amountDueCents: inv.amountDueCents,
            hostedInvoiceUrl: inv.hostedInvoiceUrl,
          };

          if (nextStage === 1) {
            if (inv.clientEmail) {
              await sendFirstNoticeEmail(dunningInvoice, addDays(inv.dueDate, settings.secondNoticeDays));
            }
            results.firstNotice++;
          } else if (nextStage === 2) {
            if (!lateFeeInvoiceId) {
              const feeInvoice = await createInvoice({
                customerId: inv.stripeCustomerId,
                daysUntilDue: 7,
                collectionMethod: "send_invoice",
                description: `Late payment fee — Invoice ${inv.number}`,
                lineItems: [{ description: "Late payment fee", amount: settings.lateFeeCents / 100 }],
                send: true,
              });
              await syncStripeInvoiceToSanity(feeInvoice);
              await sanityWriteClient.createOrReplace({
                _id: `dunning:${feeInvoice.id}`,
                _type: "invoiceDunningState",
                invoiceId: feeInvoice.id,
                dunningStage: 0,
                isLateFee: true,
                lateFeeInvoiceId: null,
                lastDunningEmailAt: null,
              });
              lateFeeInvoiceId = feeInvoice.id;
            }
            if (inv.clientEmail) {
              await sendSecondNoticeEmail(dunningInvoice, settings.lateFeeCents, addDays(inv.dueDate, settings.finalNoticeDays));
            }
            results.secondNotice++;
          } else if (nextStage === 3) {
            if (inv.clientEmail) {
              await sendInterruptionNoticeEmail(dunningInvoice);
            }
            results.interruptionNotice++;
          } else if (nextStage === 4) {
            if (client && client.websiteStatus !== "suspended" && !client.websiteAutoSuspendExempt) {
              const now = new Date().toISOString();
              await sanityWriteClient.patch(client._id).set({
                websiteStatus: "suspended",
                websiteStatusReason: "auto_nonpayment",
                websiteSuspendedAt: now,
              }).commit();

              const vercelSync = await syncVercelWebsiteStatus(client, "suspended");
              if (!vercelSync.ok) {
                console.error(`BILLING_ENFORCEMENT_VERCEL_SYNC_ERR (${client._id}):`, vercelSync.error);
                results.vercelSyncFailed++;
              }

              logAudit(req, {
                action: AuditAction.CLIENT_WEBSITE_SUSPENDED,
                resourceType: "contact",
                resourceId: client._id,
                resourceLabel: client.name ?? undefined,
                description: `Website auto-suspended for ${client.name ?? "client"} (invoice ${inv.number}, ${daysPastDue} days overdue)`,
              }, SYSTEM_AUDIT_USER);

              automationEngine.fire("default", "client_status_changed", { websiteStatus: "suspended" }, "contact", client._id, client._id);

              await sendPushNotificationToAudience(
                {
                  title: "Client website auto-suspended",
                  body: `${client.name ?? "A client"}'s website was suspended for non-payment (invoice ${inv.number}).`,
                  href: `/admin/pipeline/contacts/${client._id}`,
                  tag: `website-suspended:${client._id}`,
                },
                { module: "clients", action: "view" }
              ).catch(console.error);

              results.suspended++;
            }
          }

          await sanityWriteClient.createOrReplace({
            _id: `dunning:${inv._id}`,
            _type: "invoiceDunningState",
            invoiceId: inv._id,
            dunningStage: nextStage,
            isLateFee: false,
            lateFeeInvoiceId,
            lastDunningEmailAt: new Date().toISOString(),
          });
        } catch (err) {
          console.error(`DUNNING_STAGE_ERR (${inv._id}, stage ${nextStage}):`, err);
          results.errors++;
        }
      }
    }

    // ── Restore clients that were auto-suspended and no longer owe anything ───
    const autoSuspended = await sanityServer.fetch<Array<{
      _id: string; name: string | null; vercelProjectId: string | null; vercelDomain: string | null;
    }>>(
      `*[_type == "pipelineContact" && websiteStatus == "suspended" && websiteStatusReason == "auto_nonpayment"]{ _id, name, vercelProjectId, vercelDomain }`
    );

    for (const client of autoSuspended) {
      if (clientIdsStillOwing.has(client._id)) continue;
      const now = new Date().toISOString();
      await sanityWriteClient.patch(client._id).set({
        websiteStatus: "active",
        websiteStatusReason: null,
        websiteRestoredAt: now,
      }).commit();

      const vercelSync = await syncVercelWebsiteStatus(client, "active");
      if (!vercelSync.ok) {
        console.error(`BILLING_ENFORCEMENT_VERCEL_SYNC_ERR (${client._id}):`, vercelSync.error);
        results.vercelSyncFailed++;
      }

      logAudit(req, {
        action: AuditAction.CLIENT_WEBSITE_RESTORED,
        resourceType: "contact",
        resourceId: client._id,
        resourceLabel: client.name ?? undefined,
        description: `Website auto-restored for ${client.name ?? "client"} (no remaining overdue invoices)`,
      }, SYSTEM_AUDIT_USER);

      automationEngine.fire("default", "client_status_changed", { websiteStatus: "active" }, "contact", client._id, client._id);

      await sendPushNotificationToAudience(
        {
          title: "Client website restored",
          body: `${client.name ?? "A client"}'s website was automatically restored — no overdue invoices remain.`,
          href: `/admin/pipeline/contacts/${client._id}`,
          tag: `website-restored:${client._id}`,
        },
        { module: "clients", action: "view" }
      ).catch(console.error);

      results.restored++;
    }

    return NextResponse.json({ ok: true, ...results });
  } catch (err) {
    console.error("BILLING_ENFORCEMENT_CRON_ERR:", err);
    return NextResponse.json({ error: "Processing failed", ...results }, { status: 500 });
  }
}
