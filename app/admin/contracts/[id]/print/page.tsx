import { sanityServer } from "@/lib/sanityServer";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ContractPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const contract = await sanityServer.fetch(
    `*[_type == "contract" && _id == $id][0]{
      _id, number, date, expiryDate, status, clientName, clientEmail,
      clientCompany, templateName, body, variables, signerName,
      signatureData, signatureType, signedAt, signatureIp
    }`,
    { id }
  ) as {
    _id: string;
    number: string;
    date: string;
    expiryDate: string;
    status: string;
    clientName: string;
    clientEmail: string | null;
    clientCompany: string | null;
    templateName: string | null;
    body: string;
    variables: Record<string, string>;
    signerName: string | null;
    signatureData: string | null;
    signatureType: string | null;
    signedAt: string | null;
    signatureIp: string | null;
  } | null;

  if (!contract) notFound();

  return (
    <html>
      <head>
        <title>Contract {contract.number}</title>
        <style>{`
          @media print { body { margin: 0; } .no-print { display: none; } }
          body { font-family: Georgia, serif; color: #111; max-width: 800px; margin: 0 auto; padding: 40px 32px; }
          h1, h2, h3 { font-family: -apple-system, sans-serif; }
          .header { border-bottom: 2px solid #111; padding-bottom: 20px; margin-bottom: 32px; }
          .meta { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 16px; margin-bottom: 32px; }
          .meta-block label { font-size: 11px; text-transform: uppercase; letter-spacing: .1em; color: #6b7280; display: block; margin-bottom: 4px; }
          .meta-block span { font-size: 15px; font-weight: 600; }
          .body { line-height: 1.8; font-size: 14px; }
          .sig-block { margin-top: 48px; border-top: 1px solid #e5e7eb; padding-top: 24px; }
          .sig-box { border: 1px solid #d1d5db; border-radius: 8px; padding: 12px; display: inline-block; background: #fff; margin-top: 8px; }
          .print-btn { position: fixed; top: 16px; right: 16px; background: #0ea5e9; color: #fff; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 600; }
        `}</style>
      </head>
      <body>
        <button className="print-btn no-print" onClick={() => window.print()}>
          Print / Save PDF
        </button>

        <div className="header">
          <div style={{ fontSize: "22px", fontWeight: 700, marginBottom: "4px" }}>CEL3 Interactive</div>
          <div style={{ color: "#6b7280", fontSize: "13px" }}>
            {contract.templateName ?? "Contract"} — {contract.number}
          </div>
        </div>

        <div className="meta">
          <div className="meta-block">
            <label>Prepared for</label>
            <span>{contract.clientName}</span>
            {contract.clientCompany && <div style={{ fontSize: "13px", color: "#6b7280" }}>{contract.clientCompany}</div>}
            {contract.clientEmail && <div style={{ fontSize: "13px", color: "#6b7280" }}>{contract.clientEmail}</div>}
          </div>
          <div className="meta-block">
            <label>Contract Date</label>
            <span>{contract.date}</span>
          </div>
          {contract.expiryDate && (
            <div className="meta-block">
              <label>Expires</label>
              <span>{contract.expiryDate}</span>
            </div>
          )}
          <div className="meta-block">
            <label>Status</label>
            <span style={{ textTransform: "capitalize" }}>{contract.status}</span>
          </div>
        </div>

        <div className="body" dangerouslySetInnerHTML={{ __html: contract.body }} />

        {contract.status === "signed" && (
          <div className="sig-block">
            <div style={{ fontWeight: 600, marginBottom: "12px" }}>Electronically Signed</div>
            {contract.signatureData && (
              <div className="sig-box">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={contract.signatureData} alt="Signature" style={{ height: "64px", width: "auto" }} />
              </div>
            )}
            <div style={{ marginTop: "12px", fontSize: "13px", color: "#374151" }}>
              <div>Signed by: <strong>{contract.signerName}</strong></div>
              {contract.signedAt && (
                <div>Date: {new Date(contract.signedAt).toLocaleString()}</div>
              )}
              <div>Method: {contract.signatureType}</div>
              {contract.signatureIp && (
                <div style={{ color: "#9ca3af", fontSize: "11px", marginTop: "4px" }}>
                  IP address: {contract.signatureIp}
                </div>
              )}
            </div>
          </div>
        )}

        <script
          dangerouslySetInnerHTML={{
            __html: `document.querySelector('.print-btn')?.addEventListener('click', () => window.print());`,
          }}
        />
      </body>
    </html>
  );
}
