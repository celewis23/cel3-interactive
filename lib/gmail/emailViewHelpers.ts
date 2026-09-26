import { DateTime } from "luxon";
import type { GmailAttachment, GmailMessageParsed } from "@/lib/gmail/types";

/**
 * Shared pure helpers for rendering Gmail messages/threads client-side.
 * Used by both InboxClient.tsx (the main single-page inbox) and
 * ThreadClient.tsx (the standalone thread detail page) — kept in one place
 * so a fix in one doesn't silently miss the other.
 */

export function formatMessageDate(ms: number): string {
  return DateTime.fromMillis(ms).toFormat("LLL d, yyyy 'at' h:mm a");
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function attachmentUrl(messageId: string, att: GmailAttachment, inline = false): string {
  const p = new URLSearchParams({
    filename: att.filename,
    mime: att.mimeType,
    ...(inline ? { inline: "1" } : {}),
  });
  return `/api/admin/email/attachment/${messageId}/${att.attachmentId}?${p}`;
}

/** Replace cid: image references in HTML with proxied attachment URLs */
export function resolveCidReferences(
  html: string,
  messageId: string,
  attachments: GmailAttachment[]
): string {
  return html.replace(/src="cid:([^"]+)"/gi, (_match, cid) => {
    const att = attachments.find((a) => a.contentId === cid || a.contentId === cid.trim());
    if (!att) return `src=""`;
    return `src="${attachmentUrl(messageId, att, true)}"`;
  });
}

export function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function extractEmail(from: string): string {
  const match = from.match(/<(.+?)>/) ?? from.match(/(\S+@\S+)/);
  return match ? match[1] : from;
}

export function extractName(from: string): string {
  const match = from.match(/^(.+?)\s*<.+>$/);
  if (match) return match[1].trim().replace(/^"|"$/g, "");
  return from.split("@")[0] ?? from;
}

/** Builds the quoted "---------- Forwarded message ----------" block for a Forward compose. */
export function forwardedBlockHtml(message: GmailMessageParsed): string {
  const originalBody = message.bodyHtml
    ? resolveCidReferences(message.bodyHtml, message.id, message.attachments)
    : `<pre style="white-space:pre-wrap;font-family:inherit;">${escapeHtml(message.bodyText ?? "")}</pre>`;
  return `
    <p>---------- Forwarded message ----------<br>
    From: ${escapeHtml(message.headers.from ?? "")}<br>
    Date: ${escapeHtml(formatMessageDate(message.internalDate))}<br>
    Subject: ${escapeHtml(message.headers.subject ?? "")}<br>
    To: ${escapeHtml(message.headers.to ?? "")}</p>
    <blockquote style="margin:0 0 0 .8ex;border-left:2px solid #ccc;padding-left:1ex">${originalBody}</blockquote>
  `;
}
