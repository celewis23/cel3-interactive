export const runtime = "nodejs";

/**
 * Daily check: suspends a client's website once their overdue invoices pass
 * the configured days-late threshold, and restores clients that were
 * auto-suspended once they no longer have any overdue invoices.
 * Manually-suspended clients are never auto-restored.
 */

import { NextRequest, NextResponse } from "next/server";
import { sanityServer } from "@/lib/sanityServer";
import { sanityWriteClient } from "@/lib/sanity.write";
import { getEnforcementSettings } from "@/lib/billing/enforcementSettings";
import { automationEngine } from "@/lib/automations/engine";
import { sendPushNotificationToAudience } from "@/lib/notifications/push";
import { logAudit, AuditAction } from "@/lib/audit/log";
import { syncVercelWebsiteStatus } from "@/lib/billing/websiteStatusSync";

function isAuthorizedCron(req: NextRequest) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (process.env.CRON_SECRET && secret === process.env.CRON_SECRET) return true;
  return req.headers.get("x-vercel-cron") === "1";
}

export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = { suspended: 0, restored: 0, vercelSyncFailed: 0 };

  try {
    const settings = await getEnforcementSettings();
    if (!settings.autoSuspendEnabled) {
      return NextResponse.json({ ok: true, skipped: "auto-suspend disabled", ...results });
    }

    const today = new Date().toISOString().split("T")[0];

    // ── Days-late per client, from open/overdue invoices ──────────────────────
    const overdueInvoices = await sanityServer.fetch<Array<{ clientId?: string; dueDate: string }>>(
      `*[_type == "invoice" && status in ["open", "sent", "overdue"] && dueDate < $today && defined(clientId)] {
        clientId, dueDate
      }`,
      { today }
    );

    const daysLateByClient = new Map<string, number>();
    for (const inv of overdueInvoices) {
      if (!inv.clientId) continue;
      const daysLate = Math.floor((Date.now() - new Date(inv.dueDate).getTime()) / 86400000);
      const current = daysLateByClient.get(inv.clientId) ?? 0;
      if (daysLate > current) daysLateByClient.set(inv.clientId, daysLate);
    }

    // ── Suspend clients over the threshold ─────────────────────────────────────
    const eligibleClientIds = [...daysLateByClient.entries()]
      .filter(([, daysLate]) => daysLate >= settings.daysLateThreshold)
      .map(([clientId]) => clientId);

    if (eligibleClientIds.length > 0) {
      const clients = await sanityServer.fetch<Array<{
        _id: string;
        name: string | null;
        websiteStatus?: string;
        websiteAutoSuspendExempt?: boolean;
        vercelProjectId: string | null;
        vercelDomain: string | null;
      }>>(
        `*[_type == "pipelineContact" && _id in $ids]{ _id, name, websiteStatus, websiteAutoSuspendExempt, vercelProjectId, vercelDomain }`,
        { ids: eligibleClientIds }
      );

      for (const client of clients) {
        if (client.websiteStatus === "suspended" || client.websiteAutoSuspendExempt) continue;
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
          description: `Website auto-suspended for ${client.name ?? "client"} (${daysLateByClient.get(client._id)} days overdue)`,
        }, { userId: null, userName: "Billing enforcement", userEmail: "", isOwner: false });

        automationEngine.fire("default", "client_status_changed", { websiteStatus: "suspended" }, "contact", client._id, client._id);

        await sendPushNotificationToAudience(
          {
            title: "Client website auto-suspended",
            body: `${client.name ?? "A client"}'s website was suspended for non-payment (${daysLateByClient.get(client._id)} days overdue).`,
            href: `/admin/pipeline/contacts/${client._id}`,
            tag: `website-suspended:${client._id}`,
          },
          { module: "clients", action: "view" }
        ).catch(console.error);

        results.suspended++;
      }
    }

    // ── Restore clients that were auto-suspended and are now current ──────────
    const autoSuspended = await sanityServer.fetch<Array<{
      _id: string;
      name: string | null;
      vercelProjectId: string | null;
      vercelDomain: string | null;
    }>>(
      `*[_type == "pipelineContact" && websiteStatus == "suspended" && websiteStatusReason == "auto_nonpayment"]{ _id, name, vercelProjectId, vercelDomain }`
    );

    for (const client of autoSuspended) {
      if (daysLateByClient.has(client._id)) continue; // still overdue
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
      }, { userId: null, userName: "Billing enforcement", userEmail: "", isOwner: false });

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
