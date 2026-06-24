import { NextRequest, NextResponse } from "next/server";
import { getPlatformBuilderLeadForProposal } from "@/lib/platformBuilder/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const token = req.nextUrl.searchParams.get("token") ?? "";
  if (!token) {
    return NextResponse.json({ error: "Missing proposal token" }, { status: 401 });
  }

  const lead = await getPlatformBuilderLeadForProposal(id, token);
  if (!lead?.proposal?.pdfBase64) {
    return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
  }

  const pdf = Buffer.from(lead.proposal.pdfBase64, "base64");
  return new NextResponse(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${lead.proposal.fileName}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
