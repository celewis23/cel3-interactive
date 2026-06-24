import type { PlatformBuilderFeature, PlatformContactInput, PlatformRecommendation } from "./types";

type ProposalPdfInput = {
  proposalId: string;
  contact: PlatformContactInput;
  features: PlatformBuilderFeature[];
  recommendation: PlatformRecommendation;
  generatedAt: string;
};

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const LEFT = 54;
const TOP = 58;
const LINE_HEIGHT = 14;
const MAX_CHARS = 86;

export function generatePlatformProposalPdf(input: ProposalPdfInput) {
  const pages = buildPages(input);
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

type PdfLine = { text: string; size?: number; bold?: boolean; gap?: number };

function buildPages(input: ProposalPdfInput) {
  const selectedBySection = groupBySection(input.features);
  const fullName = `${input.contact.firstName} ${input.contact.lastName}`.trim();
  const date = new Date(input.generatedAt).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const lines: PdfLine[] = [
    { text: "CEL3 INTERACTIVE", size: 11, bold: true },
    { text: "Business Platform Proposal", size: 24, bold: true, gap: 24 },
    { text: `Prepared for: ${fullName} / ${input.contact.businessName}`, size: 12 },
    { text: `Date: ${date}`, size: 12 },
    { text: `Proposal ID: ${input.proposalId}`, size: 12, gap: 26 },
    { text: "Executive Summary", size: 16, bold: true },
    ...paragraph("CEL3 Interactive builds website business systems that combine modern websites, business tools, communication systems, AI tools, mobile experiences, and ongoing support. This proposal is based on the platform features selected in the Build Your Platform experience."),
    { text: "Recommended Package", size: 16, bold: true, gap: 18 },
    { text: `Package: ${input.recommendation.packageName}` },
    { text: `Setup investment range: ${input.recommendation.setupInvestmentRange}` },
    { text: `Monthly investment range: ${input.recommendation.monthlyInvestmentRange}` },
    { text: `Estimated timeline: ${input.recommendation.timelineEstimate}` },
    { text: `Custom consultation required: ${input.recommendation.customConsultationRequired ? "Yes" : "No"}`, gap: 18 },
    { text: "Selected Features", size: 16, bold: true },
  ];

  for (const [section, features] of selectedBySection) {
    lines.push({ text: section, size: 13, bold: true, gap: 10 });
    for (const feature of features) {
      lines.push({ text: `${feature.title}: ${feature.description}`, bold: true });
      lines.push(...paragraph(`Benefit: ${feature.benefit}`, 82));
    }
  }

  lines.push(
    { text: "AI Usage", size: 16, bold: true, gap: 18 },
    ...paragraph(`${input.recommendation.aiUsageRecommendation} AI usage is included or available depending on the selected platform. Higher-usage businesses may connect their own AI provider account or purchase additional CEL3-managed AI credits.`),
  );

  if (input.features.some((feature) => feature.section === "mobile-experience")) {
    lines.push(
      { text: "Mobile App Notes", size: 16, bold: true, gap: 18 },
      ...paragraph("Installable web apps and PWAs are usually the fastest path to app-like access from a phone. Native iPhone or Android apps may be recommended when the project needs app store distribution, deeper device capabilities, or a mobile-first product experience."),
    );
  }

  lines.push(
    { text: "Project Timeline", size: 16, bold: true, gap: 18 },
    { text: "1. Discovery & Planning" },
    { text: "2. Design & Architecture" },
    { text: "3. Development" },
    { text: "4. Content & Configuration" },
    { text: "5. Testing" },
    { text: "6. Launch" },
    { text: "7. Support & Growth", gap: 18 },
    { text: "Next Steps", size: 16, bold: true },
    { text: "Schedule discovery call" },
    { text: "Review proposal" },
    { text: "Confirm scope" },
    { text: "Pay deposit" },
    { text: "Begin build", gap: 18 },
    { text: "Disclaimer", size: 16, bold: true },
    ...paragraph("Pricing is an estimate based on selected features. Final pricing may change after discovery, technical review, content review, integrations, and scope confirmation."),
  );

  return paginate(lines);
}

function paragraph(text: string, maxChars = MAX_CHARS): PdfLine[] {
  return wrap(text, maxChars).map((line) => ({ text: line }));
}

function groupBySection(features: PlatformBuilderFeature[]) {
  const sections = new Map<string, PlatformBuilderFeature[]>();
  for (const feature of features) {
    const label = titleCase(feature.section.replace(/-/g, " "));
    sections.set(label, [...(sections.get(label) ?? []), feature]);
  }
  return sections.entries();
}

function titleCase(value: string) {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function paginate(lines: PdfLine[]) {
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

function renderPageContent(lines: PdfLine[]) {
  let y = PAGE_HEIGHT - TOP;
  const commands = ["0.06 0.09 0.13 rg 0 0 612 792 re f", "0.16 0.74 0.96 rg 54 724 120 3 re f"];
  for (const line of lines) {
    y -= line.gap ?? 0;
    const size = line.size ?? 10;
    const font = line.bold ? "F2" : "F1";
    commands.push(`BT /${font} ${size} Tf 1 1 1 rg ${LEFT} ${y.toFixed(2)} Td (${escapePdfText(line.text)}) Tj ET`);
    y -= line.size ? line.size + 7 : LINE_HEIGHT;
  }
  commands.push(`BT /F1 8 Tf 0.55 0.65 0.72 rg ${LEFT} 30 Td (CEL3 Interactive - Business Platform Proposal) Tj ET`);
  return commands.join("\n");
}

function wrap(text: string, maxChars: number) {
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

function escapePdfText(value: string) {
  return value.replace(/[^\x20-\x7E]/g, "").replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}
