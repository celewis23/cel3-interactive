// Hand-rolled PDF writer (no PDF library in this repo) — same approach as
// lib/platformBuilder/proposalPdf.ts, adapted for the accepted Hoops proposal:
// selection, pricing, terms and the signature block the client agreed to.

import { HOOPS_NOT_INCLUDED, HOOPS_OVERAGE_RATE_NOTE, HOOPS_PAYMENT_TERMS, HOOPS_SELECTIONS, HOOPS_ADD_ON, type HoopsSelectionId } from "./config";

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const LEFT = 54;
const TOP = 58;
const LINE_HEIGHT = 14;
const MAX_CHARS = 90;

type PdfLine = { text: string; size?: number; bold?: boolean; gap?: number };

export type HoopsProposalPdfInput = {
  contractNumber: string;
  businessName: string;
  contactName: string;
  email: string;
  selectionId: HoopsSelectionId;
  addOn: boolean;
  dueTodayCents: number;
  monthlyCents: number;
  signerName: string;
  signedAt: string;
  ip: string | null;
  priceHash: string;
};

export function generateHoopsProposalPdf(input: HoopsProposalPdfInput): Buffer {
  const lines = buildLines(input);
  return buildPdfBuffer(paginate(lines));
}

function money(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function buildLines(input: HoopsProposalPdfInput): PdfLine[] {
  const selection = HOOPS_SELECTIONS[input.selectionId];
  const signedDate = new Date(input.signedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  const lines: PdfLine[] = [
    { text: "CEL3 INTERACTIVE", size: 11, bold: true },
    { text: "Hoops Basketball Academy — Website & Platform", size: 20, bold: true, gap: 20 },
    { text: `Contract: ${input.contractNumber}`, size: 11 },
    { text: `Business: ${input.businessName}`, size: 11 },
    { text: `Contact: ${input.contactName} <${input.email}>`, size: 11, gap: 20 },
    { text: "What you accepted", size: 14, bold: true },
    { text: selection.name, bold: true },
    ...paragraph(selection.tagline),
  ];

  for (const item of selection.includes) lines.push(...paragraph(`• ${item}`));
  if (input.addOn) lines.push(...paragraph(`• Add-on: ${HOOPS_ADD_ON.name} — ${HOOPS_ADD_ON.description}`));

  lines.push(
    { text: "Pricing", size: 14, bold: true, gap: 18 },
    { text: `Due today (paid in full): ${money(input.dueTodayCents)}` },
    { text: `Monthly, starting at launch: ${money(input.monthlyCents)}/month`, gap: 18 },
    { text: "Payment terms", size: 14, bold: true },
  );
  for (const term of HOOPS_PAYMENT_TERMS) lines.push(...paragraph(term));
  lines.push(...paragraph(HOOPS_OVERAGE_RATE_NOTE));

  lines.push({ text: "Not included", size: 14, bold: true, gap: 18 });
  for (const item of HOOPS_NOT_INCLUDED) lines.push({ text: `• ${item}` });

  lines.push(
    { text: "Signature", size: 14, bold: true, gap: 20 },
    { text: `Signed by: ${input.signerName}` },
    { text: `Date: ${signedDate}` },
    { text: `IP address: ${input.ip ?? "unknown"}` },
    { text: `Proposal/price hash: ${input.priceHash}`, size: 8 },
  );

  return lines;
}

function paragraph(text: string, maxChars = MAX_CHARS): PdfLine[] {
  return wrap(text, maxChars).map((line) => ({ text: line }));
}

function wrap(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function paginate(lines: PdfLine[]): PdfLine[][] {
  const pages: PdfLine[][] = [];
  let current: PdfLine[] = [];
  let y = TOP;
  for (const line of lines) {
    y += line.gap ?? 0;
    const size = line.size ?? 10;
    if (y + size + LINE_HEIGHT > PAGE_HEIGHT - 54) {
      pages.push(current);
      current = [];
      y = TOP;
    }
    current.push(line);
    y += line.size ? line.size + 7 : LINE_HEIGHT;
  }
  if (current.length) pages.push(current);
  return pages;
}

function renderPageContent(lines: PdfLine[]): string {
  let y = PAGE_HEIGHT - TOP;
  const commands = ["1 1 1 rg 0 0 612 792 re f", "0.004 0.129 0.412 rg 54 724 120 3 re f"];
  for (const line of lines) {
    y -= line.gap ?? 0;
    const size = line.size ?? 10;
    const font = line.bold ? "F2" : "F1";
    commands.push(`BT /${font} ${size} Tf 0.04 0.08 0.19 rg ${LEFT} ${y.toFixed(2)} Td (${escapePdfText(line.text)}) Tj ET`);
    y -= line.size ? line.size + 7 : LINE_HEIGHT;
  }
  commands.push(`BT /F1 8 Tf 0.29 0.34 0.46 rg ${LEFT} 30 Td (Hoops Basketball Academy - prepared by CEL3 Interactive) Tj ET`);
  return commands.join("\n");
}

function escapePdfText(value: string): string {
  return value.replace(/[^\x20-\x7E]/g, "").replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function buildPdfBuffer(pages: PdfLine[][]): Buffer {
  const objects: string[] = [];
  const pageObjectIds: number[] = [];

  objects.push("<< /Type /Catalog /Pages 2 0 R >>");
  objects.push("<< /Type /Pages /Kids [] /Count 0 >>");
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");

  for (const page of pages) {
    const content = renderPageContent(page);
    const contentObjectId = objects.length + 1;
    objects.push(`<< /Length ${Buffer.byteLength(content, "ascii")} >>\nstream\n${content}\nendstream`);
    const pageObjectId = objects.length + 1;
    pageObjectIds.push(pageObjectId);
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentObjectId} 0 R >>`);
  }

  objects[1] = `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageObjectIds.length} >>`;

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf, "ascii"));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(pdf, "ascii");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i < offsets.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, "ascii");
}
