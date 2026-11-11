import { NextRequest, NextResponse } from "next/server";
import { sanityServer } from "@/lib/sanityServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const contractId = req.nextUrl.searchParams.get("contractId");
  const token = req.nextUrl.searchParams.get("token");
  if (!contractId || !token) return NextResponse.json({ error: "Missing contractId or token" }, { status: 400 });

  const contract = await sanityServer.fetch<{ priceHash: string; acceptedProposalPdfBase64: string | null; number: string } | null>(
    `*[_type == "contract" && _id == $id && proposalSlug == "hoopsbasketballacademy"][0]{ priceHash, acceptedProposalPdfBase64, number }`,
    { id: contractId }
  );
  if (!contract || contract.priceHash !== token || !contract.acceptedProposalPdfBase64) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return new NextResponse(Buffer.from(contract.acceptedProposalPdfBase64, "base64"), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Hoops-Basketball-Academy-Proposal-${contract.number}.pdf"`,
      "X-Robots-Tag": "noindex, nofollow, noarchive",
    },
  });
}
