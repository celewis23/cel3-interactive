import { FormField } from "@/lib/forms";
import { DateTime } from "luxon";

type EmailParams = {
  formTitle: string;
  submittedAt: string;
  fields: FormField[];
  answers: Record<string, unknown>;
  files: Record<string, string[]>;
  includeFileLinks: boolean;
  isTest?: boolean;
};

export function buildNotificationEmail(params: EmailParams): {
  subject: string;
  html: string;
  text: string;
} {
  const { formTitle, submittedAt, fields, answers, files, includeFileLinks, isTest } = params;
  const formattedDate = DateTime.fromISO(submittedAt).toFormat("ccc, LLL d yyyy 'at' h:mm a");

  let fieldsHtml = "";
  let fieldsText = "";

  for (const field of fields) {
    if (field.fieldType === "section_header") {
      fieldsHtml += `<tr><td colspan="2" style="padding:12px 16px 4px;font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.08em;border-top:1px solid #1e293b">${esc(field.label)}</td></tr>`;
      fieldsText += `\n--- ${field.label} ---\n`;
      continue;
    }
    const raw = answers[field.id];
    let display = "";
    if (Array.isArray(raw)) {
      display = raw.join(", ");
    } else if (raw !== undefined && raw !== null) {
      display = String(raw);
    } else {
      display = "(no answer)";
    }

    let fileHtml = "";
    let fileTxt = "";
    if (field.fieldType === "file_upload" && includeFileLinks && files[field.id]?.length) {
      const links = files[field.id]
        .map(u => `<a href="${esc(u)}" style="color:#38bdf8">${esc(u.split("/").pop() || u)}</a>`)
        .join(", ");
      fileHtml = `<br><small style="color:#64748b">Files: ${links}</small>`;
      fileTxt = `\n  Files: ${files[field.id].join(", ")}`;
    }

    fieldsHtml += `
      <tr>
        <td style="padding:8px 16px;font-size:12px;color:#94a3b8;vertical-align:top;white-space:nowrap;width:35%">${esc(field.label)}</td>
        <td style="padding:8px 16px;font-size:13px;color:#e2e8f0;vertical-align:top">${esc(display)}${fileHtml}</td>
      </tr>`;
    fieldsText += `${field.label}: ${display}${fileTxt}\n`;
  }

  const testBanner = isTest
    ? `<div style="background:#7c3aed;color:white;text-align:center;padding:6px 16px;font-size:11px;font-weight:600;letter-spacing:0.05em">TEST EMAIL — sample data only</div>`
    : "";

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:ui-sans-serif,system-ui,-apple-system,sans-serif">
${testBanner}
<table width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:32px 16px">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;margin:0 auto">
  <tr><td style="padding:24px 28px 12px">
    <div style="font-size:10px;letter-spacing:0.15em;text-transform:uppercase;color:#38bdf8;margin-bottom:4px">CEL3 Forms</div>
    <h1 style="margin:0 0 4px;font-size:18px;font-weight:600;color:#f8fafc">New Submission</h1>
    <p style="margin:0;font-size:13px;color:#64748b">${esc(formTitle)} &middot; ${formattedDate}</p>
  </td></tr>
  <tr><td style="background:#1e293b;border-radius:8px;padding:4px 0 12px">
    <table width="100%" cellpadding="0" cellspacing="0">${fieldsHtml}</table>
  </td></tr>
  <tr><td style="padding:20px 28px;text-align:center">
    <p style="margin:0;font-size:11px;color:#334155">Powered by <strong style="color:#475569">CEL3 Interactive</strong></p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;

  const text = `New CEL3 Forms Submission\n${formTitle} — ${formattedDate}\n\n${fieldsText}\n\n---\nPowered by CEL3 Interactive`;
  const subject = `New CEL3 Forms Submission — ${formTitle}`;

  return { subject, html, text };
}

function esc(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
