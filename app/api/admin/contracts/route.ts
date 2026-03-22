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

function substituteVariables(body: string, vars: Record<string, string>): string {
  let result = body;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(`{{${key}}}`, value || "");
  }
  return result;
}

export async function GET(req: NextRequest) {
  if (!requireAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const filter = status ? ` && status == "${status}"` : "";
    const contracts = await sanityServer.fetch(
      `*[_type == "contract"${filter}] | order(_createdAt desc) {
        _id, number, date, status, clientName, clientEmail, clientCompany,
        templateName, category, signerName, sentAt, viewedAt, signedAt,
        declinedAt, pipelineContactId, stripeCustomerId, portalUserId,
        projectId, projectName, _createdAt
      }`
    );
    return NextResponse.json(contracts);
  } catch (err) {
    console.error("CONTRACTS_GET_ERR:", err);
    return NextResponse.json({ error: "Failed to fetch contracts" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!requireAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    if (!body.clientName?.trim()) {
      return NextResponse.json({ error: "clientName is required" }, { status: 400 });
    }

    // Auto-generate contract number
    const count = await sanityServer.fetch<number>(`count(*[_type == "contract"])`);
    const year = new Date().getFullYear();
    const number = `CON-${year}-${String(count + 1).padStart(3, "0")}`;

    // Build variables map
    const variables: Record<string, string> = {
      clientName: body.clientName?.trim() || "",
      clientEmail: body.clientEmail?.trim() || "",
      clientCompany: body.clientCompany?.trim() || "",
      projectName: body.projectName?.trim() || "",
      contractNumber: number,
      contractDate: body.date || new Date().toISOString().slice(0, 10),
      startDate: body.variables?.startDate || "",
      endDate: body.variables?.endDate || "",
      totalAmount: body.variables?.totalAmount || "",
      paymentTerms: body.variables?.paymentTerms || "",
      ...body.variables,
    };

    // Substitute variables into template body
    const rawBody = body.body || "";
    const substitutedBody = substituteVariables(rawBody, variables);

    const today = new Date().toISOString().slice(0, 10);
    const expiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const contract = await sanityWriteClient.create({
      _type: "contract",
      number,
      templateId: body.templateId || null,
      templateName: body.templateName || null,
      category: body.category || "other",
      date: body.date || today,
      expiryDate: body.expiryDate || expiry,
      status: "draft",
      clientName: body.clientName.trim(),
      clientEmail: body.clientEmail?.trim() || null,
      clientCompany: body.clientCompany?.trim() || null,
      pipelineContactId: body.pipelineContactId || null,
      stripeCustomerId: body.stripeCustomerId || null,
      portalUserId: body.portalUserId || null,
      projectId: body.projectId || null,
      projectName: body.projectName?.trim() || null,
      body: substitutedBody,
      variables,
      signingToken: crypto.randomUUID(),
      notes: body.notes?.trim() || null,
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

    return NextResponse.json(contract, { status: 201 });
  } catch (err) {
    console.error("CONTRACTS_POST_ERR:", err);
    return NextResponse.json({ error: "Failed to create contract" }, { status: 500 });
  }
}
