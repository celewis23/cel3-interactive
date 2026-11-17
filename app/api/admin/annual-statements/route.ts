import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getSessionInfo } from "@/lib/admin/permissions";
import { withActivity } from "@/lib/audit/withActivity";
import { logAudit } from "@/lib/audit/log";
import { sanityServer } from "@/lib/sanityServer";
import { sanityWriteClient } from "@/lib/sanity.write";
import { listProjects } from "@/lib/meterwise/client";
import { annualSettings, clientAttachments, clientStatement, hostingAttachments, hostingStatement, statementClients, sendIndividualStatement } from "@/lib/billing/annualStatementService";
import { validateHostingPayment, yearWindow, type HostingPayment, type ClientMapping } from "@/lib/billing/annualStatements";

export const runtime = "nodejs";
export const maxDuration = 300;
function ownerOnly(req: NextRequest) {
  const session = getSessionInfo(req);
  return !session ? NextResponse.json({ error: "Unauthorized" }, { status: 401 }) : !session.isOwner ? NextResponse.json({ error: "Owner access required" }, { status: 403 }) : null;
}
export async function GET(req: NextRequest) {
  const auth = ownerOnly(req); if (auth) return auth;
  try {
    const year = Number(req.nextUrl.searchParams.get("year") ?? new Date().getFullYear() - 1);
    yearWindow(year);
    const action = req.nextUrl.searchParams.get("action");
    if (action === "client") {
      const clients = await statementClients();
      const client = clients.find(row => row.id === req.nextUrl.searchParams.get("customerId"));
      if (!client) return NextResponse.json({ error: "Client not found in CEL3 records" }, { status: 404 });
      const statement = await clientStatement(year, client);
      if (req.nextUrl.searchParams.get("download") === "pdf") return new NextResponse(new Uint8Array(clientAttachments(statement)[0].content), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="CEL3-${year}-payments.pdf"`, "Cache-Control": "no-store" } });
      return NextResponse.json({ statement });
    }
    if (action === "hosting") {
      const report = await hostingStatement(year);
      if (req.nextUrl.searchParams.get("download") === "pdf") return new NextResponse(new Uint8Array(hostingAttachments(report)[0].content), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="CEL3-${year}-hosting.pdf"`, "Cache-Control": "no-store" } });
      return NextResponse.json({ report });
    }
    const [settings, clients, projects, deliveries] = await Promise.all([
      annualSettings(), statementClients(), listProjects(),
      sanityServer.fetch(`*[_type == "annualStatementDelivery" && year == $year]{_id, recipientKey, sentAt, startedAt, status, providerId}`, { year }),
    ]);
    return NextResponse.json({ settings, clients, projects, deliveries });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Statement preview failed" }, { status: 503 }); }
}
async function handlePOST(req: NextRequest) {
  const auth = ownerOnly(req); if (auth) return auth;
  try {
    const body = await req.json();
    if (body.action === "send") {
      if (typeof body.recipientKey !== "string" || body.confirmSend !== true) throw new Error("Choose and confirm a statement recipient");
      const result = await sendIndividualStatement(Number(body.year), body.recipientKey);
      logAudit(req, { action: "billing.annual_statement_manual_send", resourceType: "annualStatementDelivery", resourceId: result.id, description: `Manual ${body.year} statement delivery: ${result.status}` });
      return NextResponse.json(result);
    }
    if (body.action === "settings") {
      if (typeof body.enabled !== "boolean" || typeof body.ownerEmail !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.ownerEmail)) throw new Error("A valid owner email is required");
      const [projects, clients] = await Promise.all([listProjects(), statementClients()]);
      const seen = new Set<string>();
      if (!Array.isArray(body.mappings) || body.mappings.length > 1000) throw new Error("Invalid mappings");
      const mappings: ClientMapping[] = body.mappings.map((mapping: ClientMapping) => {
        if (!projects.some(project => project.id === mapping.projectId) || seen.has(mapping.projectId)) throw new Error("Invalid or duplicate Meterwise project");
        seen.add(mapping.projectId);
        const client = clients.find(client => client.id === mapping.customerId);
        if (mapping.customerId !== null && !client) throw new Error("Client must be in CEL3 records");
        const project = projects.find(project => project.id === mapping.projectId)!;
        return { projectId: mapping.projectId, customerId: client?.id ?? null, label: client?.name ?? `CEL3 / internal: ${project.name}` };
      });
      const disabledRecipients = body.disabledRecipients ?? [];
      if (!Array.isArray(disabledRecipients) || disabledRecipients.some((key: unknown) => typeof key !== "string" || (key !== "owner-hosting" && !clients.some(client => client.id === key)))) throw new Error("Invalid automatic delivery recipients");
      await sanityWriteClient.createOrReplace({ _id: "annualStatementSettings", _type: "annualStatementSettings", enabled: body.enabled, ownerEmail: body.ownerEmail.trim(), mappings, disabledRecipients: [...new Set(disabledRecipients)] });
      logAudit(req, { action: "billing.annual_statement_settings_updated", resourceType: "annualStatementSettings", resourceId: "annualStatementSettings", description: "Updated January 15 annual statement delivery and client mappings" });
      return NextResponse.json({ ok: true });
    }
    if (body.action === "hostingPayment") {
      const payment = body.payment as Omit<HostingPayment, "_id">;
      validateHostingPayment(payment, new Set((await listProjects()).map(project => project.id)));
      if (body.confirmedPaid !== true) throw new Error("Confirm this is an actual payment supported by a provider invoice/receipt");
      const identity = `${payment.provider.trim().toLowerCase()}|${payment.invoiceReference.trim()}`;
      const id = `annualHostingPayment.${createHash("sha256").update(identity).digest("hex")}`;
      if (await sanityServer.getDocument(id)) return NextResponse.json({ error: "This provider invoice has already been recorded" }, { status: 409 });
      await sanityWriteClient.create({ ...payment, provider: payment.provider.trim(), invoiceReference: payment.invoiceReference.trim(), _id: id, _type: "annualHostingPayment", confirmedPaidAt: new Date().toISOString(), confirmedPaidBy: "owner" });
      logAudit(req, { action: "billing.hosting_payment_recorded", resourceType: "annualHostingPayment", resourceId: id, resourceLabel: payment.invoiceReference, description: `Recorded confirmed ${payment.provider} hosting payment` });
      return NextResponse.json({ ok: true, id }, { status: 201 });
    }
    throw new Error("Unknown action");
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Statement settings failed" }, { status: 400 }); }
}
export const POST = withActivity("/api/admin/annual-statements", "POST", handlePOST);
