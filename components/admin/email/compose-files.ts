import { buildRawMessage, htmlToPlainText, MAX_ATTACHMENT_BYTES, toBase64 } from "@/lib/gmail/mime";

export interface AttachedFile { id: string; name: string; size: number; file: File }
export const attachedFilesFrom = (files: File[]) => files.map(file => ({ id: crypto.randomUUID(), name: file.name, size: file.size, file }));

interface ComposeOptions {
  mode?: "send" | "reply" | "forward";
  to: string; subject: string; htmlBody: string; cc?: string; bcc?: string;
  threadId?: string; inReplyTo?: string; references?: string;
  originalMessageId?: string;
  attachmentRefs?: { attachmentId: string; filename: string; mimeType: string; size?: number }[];
  attachments?: AttachedFile[];
}

/** Only re-embed this app's authenticated Gmail images. Never fetch arbitrary URLs. */
async function embedForwardedImages(html: string): Promise<string> {
  const document = new DOMParser().parseFromString(html, "text/html");
  const sources = new Map<string, string>();
  for (const image of Array.from(document.querySelectorAll("img[src]"))) {
    const source = image.getAttribute("src")!;
    const url = new URL(source, window.location.origin);
    if (url.origin !== window.location.origin || !/^\/api\/admin\/email\/attachment\/[^/]+\/[^/]+$/.test(url.pathname)) continue;
    if (!sources.has(source)) {
      const res = await fetch(url);
      if (!res.ok) throw new Error("An original inline image could not be loaded. Please retry.");
      const blob = await res.blob();
      if (!/^image\/(png|jpeg|gif|webp)$/i.test(blob.type)) throw new Error("An original inline image uses an unsupported format.");
      sources.set(source, `data:${blob.type};base64,${toBase64(new Uint8Array(await blob.arrayBuffer()))}`);
    }
    image.setAttribute("src", sources.get(source)!);
  }
  return document.body.innerHTML;
}

export async function sendComposerMessage(options: ComposeOptions): Promise<void> {
  const { mode = "send", attachments = [], ...fields } = options;
  const htmlBody = await embedForwardedImages(fields.htmlBody);
  const payload = { ...fields, htmlBody, message: htmlToPlainText(htmlBody) };
  const fileBytes = attachments.reduce((n, a) => n + a.file.size, 0);
  if (fileBytes > MAX_ATTACHMENT_BYTES) throw new Error("Images and attachments must total 25 MB or less. Use Drive links for larger files.");
  // Leave headroom below Vercel's request limit, including multipart overhead.
  if (new TextEncoder().encode(JSON.stringify(payload)).length + fileBytes < 3 * 1024 * 1024) {
    const form = new FormData();
    if (mode === "send") {
      for (const key of ["to", "subject", "htmlBody", "cc", "bcc"] as const) if (payload[key]) form.set(key, payload[key]!);
      if (!htmlBody) form.set("htmlBody", "<p></p>");
    } else form.set("payload", JSON.stringify(payload));
    for (const a of attachments) form.append("attachments", a.file);
    const res = await fetch(`/api/admin/email/${mode}`, { method: "POST", body: form });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error ?? `Could not send email (${res.status}).`);
    }
    return;
  }

  const parts = await Promise.all(attachments.map(async a => ({ filename: a.file.name, mimeType: a.file.type, data: new Uint8Array(await a.file.arrayBuffer()) })));
  if (mode === "forward" && fields.originalMessageId) {
    for (const ref of fields.attachmentRefs ?? []) {
      const res = await fetch(`/api/admin/email/attachment/${encodeURIComponent(fields.originalMessageId)}/${encodeURIComponent(ref.attachmentId)}`);
      if (!res.ok) throw new Error(`Could not load original attachment: ${ref.filename}`);
      parts.push({ filename: ref.filename, mimeType: res.headers.get("content-type") ?? ref.mimeType, data: new Uint8Array(await res.arrayBuffer()) });
    }
  }
  const raw = buildRawMessage({ ...payload, subject: mode === "reply" && !/^Re:/i.test(fields.subject) ? `Re: ${fields.subject}` : fields.subject, attachments: parts });
  const configRes = await fetch("/api/admin/email/send-config", { cache: "no-store" });
  const config = await configRes.json();
  if (!configRes.ok || !config.accessToken) throw new Error(config.error ?? "Reconnect Gmail to send this email.");
  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST", headers: { Authorization: `Bearer ${config.accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ raw, ...(mode === "reply" ? { threadId: fields.threadId } : {}) }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error?.message ?? "Gmail could not send this email.");
  }
}
