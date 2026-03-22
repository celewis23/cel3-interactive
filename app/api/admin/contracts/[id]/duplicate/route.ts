import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, COOKIE_NAME } from "@/lib/admin/auth";
import { sanityServer } from "@/lib/sanityServer";
import { sanityWriteClient } from "@/lib/sanity.write";

export const runtime = "nodejs";

function requireAuth(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return false;
  return verifySessionToken(token)?.step === "full";
}

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  if (!requireAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { id } = await params;

    const original = await sanityServer.fetch<{
      templateId: string | null;
      templateName: string | null;
      category: string;
      clientName: string;
      clientEmail: string | null;
      clientCompany: string | null;
      pipelineContactId: string | null;
      stripeCustomerId: string | null;
      portalUserId: string | null;
      projectId: string | null;
      projectName: string | null;
      body: string;
      variables: Record<string, string>;
      notes: string | null;
    }>(`*[_type == "contract" && _id == $id][0]{
      templateId, templateName, category, clientName, clientEmail, clientCompany,
      pipelineContactId, stripeCustomerId, portalUserId, projectId, projectName,
      body, variables, notes
    }`, { id });

    if (!original) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const count = await sanityServer.fetch<number>(`count(*[_type == "contract"])`);
    const year = new Date().getFullYear();
    const number = `CON-${year}-${String(count + 1).padStart(3, "0")}`;

    const today = new Date().toISOString().slice(0, 10);
    const expiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const duplicate = await sanityWriteClient.create({
      _type: "contract",
      number,
      templateId: original.templateId,
      templateName: original.templateName,
      category: original.category,
      date: today,
      expiryDate: expiry,
      status: "draft",
      clientName: original.clientName,
      clientEmail: original.clientEmail,
      clientCompany: original.clientCompany,
      pipelineContactId: original.pipelineContactId,
      stripeCustomerId: original.stripeCustomerId,
      portalUserId: original.portalUserId,
      projectId: original.projectId,
      projectName: original.projectName,
      body: original.body,
      variables: original.variables,
      signingToken: crypto.randomUUID(),
      notes: original.notes,
      sentAt: null,
      viewedAt: null,
      signedAt: null,
      declinedAt: null,
      signatureData: null,
      signatureType: null,
      signatureIp: null,
      signerName: null,
      signedPdfDriveFileId: null,
    });

    return NextResponse.json(duplicate, { status: 201 });
  } catch (err) {
    console.error("CONTRACTS_DUPLICATE_ERR:", err);
    return NextResponse.json({ error: "Failed to duplicate contract" }, { status: 500 });
  }
}
