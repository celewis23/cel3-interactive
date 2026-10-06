/** Shared by the server and browser upload path. All binary parts use MIME base64. */
export interface MimeAttachment {
  filename: string;
  mimeType: string;
  data: Uint8Array;
  contentId?: string;
}

export const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;
export const MAX_MESSAGE_BYTES = 35 * 1024 * 1024;
export const INLINE_IMAGE_TYPE = /^image\/(png|jpeg|gif|webp)$/i;

export function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

export function htmlToPlainText(html: string): string {
  return html.replace(/<br\s*\/?>|<\/(?:p|div|li)>/gi, "\n")
    .replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
}

export function hasMessageContent(html: string): boolean {
  return !!htmlToPlainText(html) || /<img\b[^>]*\bsrc\s*=/i.test(html);
}

function header(value: string): string {
  if (/[\r\n\0]/.test(value)) throw new Error("An email header contains an invalid line break.");
  return value;
}

function encodedHeader(value: string): string {
  header(value);
  return /[^\x20-\x7e]/.test(value) ? `=?UTF-8?B?${toBase64(new TextEncoder().encode(value))}?=` : value;
}

function filenameParams(value: string): string {
  const clean = value.replace(/[\r\n\0]/g, "");
  const fallback = clean.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  const encoded = encodeURIComponent(clean).replace(/['()*]/g, c => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
  return `filename="${fallback || "attachment"}"; filename*=UTF-8''${encoded}`;
}

/** Convert editor data URLs to content IDs; repeated copies of one image share a part. */
export function extractInlineImages(html: string): { html: string; images: MimeAttachment[] } {
  const images: MimeAttachment[] = [];
  const seen = new Map<string, string>();
  let total = 0;
  const result = html.replace(/(<img\b[^>]*?\bsrc\s*=\s*)(["'])(data:[^"']+)\2/gi, (_match, prefix, quote, src: string) => {
    const known = seen.get(src);
    if (known) return `${prefix}${quote}cid:${known}${quote}`;
    const match = /^data:(image\/(?:png|jpeg|gif|webp));base64,([a-z0-9+/=\s]+)$/i.exec(src);
    if (!match) throw new Error("Inline images must be PNG, JPEG, GIF, or WebP files.");
    const encoded = match[2].replace(/\s/g, "");
    if (encoded.length > Math.ceil(MAX_ATTACHMENT_BYTES / 3) * 4) throw new Error("Images and attachments must total 25 MB or less. Use a Drive link for larger files.");
    const decoded = atob(encoded);
    total += decoded.length;
    if (total > MAX_ATTACHMENT_BYTES) throw new Error("Images and attachments must total 25 MB or less. Use a Drive link for larger files.");
    const contentId = `image-${crypto.randomUUID()}@cel3interactive.com`;
    images.push({ filename: `image-${images.length + 1}.${match[1].split("/")[1]}`, mimeType: match[1], data: Uint8Array.from(decoded, c => c.charCodeAt(0)), contentId });
    seen.set(src, contentId);
    return `${prefix}${quote}cid:${contentId}${quote}`;
  });
  return { html: result, images };
}

export interface MessageOptions {
  to: string; from?: string; subject: string; body?: string; htmlBody?: string;
  cc?: string; bcc?: string; inReplyTo?: string; references?: string; attachments?: MimeAttachment[];
}

/** RFC 2387: inline parts belong with the HTML, ordinary attachments in multipart/mixed. */
export function buildMimeMessage(opts: MessageOptions): string {
  const { html, images } = extractInlineImages(opts.htmlBody ?? "");
  const attachments = opts.attachments ?? [];
  if ([...images, ...attachments].reduce((sum, a) => sum + a.data.byteLength, 0) > MAX_ATTACHMENT_BYTES) {
    throw new Error("Images and attachments must total 25 MB or less. Use a Drive link for larger files.");
  }
  const wrap = (value: string) => value.match(/.{1,76}/g)?.join("\r\n") ?? "";
  const textPart = (type: string, value: string) => `Content-Type: ${type}; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n${wrap(toBase64(new TextEncoder().encode(value)))}`;
  const binaryPart = (a: MimeAttachment) => {
    const mime = /^[\w.+-]+\/[\w.+-]+$/.test(a.mimeType) ? a.mimeType : "application/octet-stream";
    return [`Content-Type: ${mime}`, `Content-Disposition: ${a.contentId ? "inline" : "attachment"}; ${filenameParams(a.filename)}`,
      ...(a.contentId ? [`Content-ID: <${header(a.contentId)}>`] : []), "Content-Transfer-Encoding: base64", "", wrap(toBase64(a.data))].join("\r\n");
  };
  const multipart = (kind: string, parts: string[]) => {
    const boundary = `cel3_${crypto.randomUUID()}`;
    return `Content-Type: multipart/${kind}; boundary="${boundary}"\r\n\r\n${parts.map(p => `--${boundary}\r\n${p}\r\n`).join("")}--${boundary}--\r\n`;
  };
  let body = textPart("text/plain", opts.body ?? htmlToPlainText(opts.htmlBody ?? ""));
  if (html) {
    let htmlPart = textPart("text/html", html);
    if (images.length) htmlPart = multipart("related", [htmlPart, ...images.map(binaryPart)]);
    body = multipart("alternative", [body, htmlPart]);
  }
  if (attachments.length) body = multipart("mixed", [body, ...attachments.map(binaryPart)]);
  const raw = [
    `To: ${header(opts.to)}`, ...(opts.from ? [`From: ${header(opts.from)}`] : []),
    ...(opts.cc ? [`Cc: ${header(opts.cc)}`] : []), ...(opts.bcc ? [`Bcc: ${header(opts.bcc)}`] : []),
    `Subject: ${encodedHeader(opts.subject)}`, ...(opts.inReplyTo ? [`In-Reply-To: ${header(opts.inReplyTo)}`] : []),
    ...(opts.references ? [`References: ${header(opts.references)}`] : []), "MIME-Version: 1.0", body,
  ].join("\r\n");
  if (new TextEncoder().encode(raw).length > MAX_MESSAGE_BYTES) throw new Error("This email exceeds Gmail's message size limit after encoding. Use smaller images or Drive links.");
  return raw;
}

export function buildRawMessage(opts: MessageOptions): string {
  return toBase64(new TextEncoder().encode(buildMimeMessage(opts))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
