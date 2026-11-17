// A small, paginated text PDF. CSV attachments retain original Unicode text.
export function statementPdf(lines: string[]): Buffer {
  const wrapped = lines.flatMap(line => {
    const clean = line.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^\x20-\x7e]/g, "?");
    return clean.match(/.{1,88}(?:\s|$)|.{1,88}/g) ?? [""];
  });
  const pages: string[][] = [];
  for (let i = 0; i < wrapped.length; i += 45) pages.push(wrapped.slice(i, i + 45));
  const objects = ["<< /Type /Catalog /Pages 2 0 R >>", "", "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"];
  const ids: number[] = [];
  for (const [index, page] of pages.entries()) {
    const escaped = (text: string) => text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
    const content = ["BT /F1 10 Tf 48 744 Td 15 TL", ...page.flatMap(line => [`(${escaped(line)}) Tj`, "T*"]), "ET", `BT /F1 8 Tf 48 30 Td (CEL3 Interactive | Page ${index + 1} of ${pages.length}) Tj ET`].join("\n");
    const streamId = objects.length + 1;
    objects.push(`<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`);
    ids.push(objects.length + 1);
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ${streamId} 0 R >>`);
  }
  objects[1] = `<< /Type /Pages /Kids [${ids.map(id => `${id} 0 R`).join(" ")}] /Count ${ids.length} >>`;
  let out = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => { offsets.push(Buffer.byteLength(out)); out += `${index + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = Buffer.byteLength(out);
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n` + offsets.slice(1).map(offset => `${String(offset).padStart(10, "0")} 00000 n \n`).join("");
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(out);
}
