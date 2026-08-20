import { sendEmail } from "@/lib/gmail/api";

export type DunningInvoice = {
  clientName: string;
  clientEmail: string;
  number: string;
  amountDueCents: number;
  hostedInvoiceUrl: string | null;
};

function formatCurrency(cents: number): string {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function formatDate(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric" });
}

function shell(opts: { heading: string; bodyHtml: string; ctaUrl?: string | null; ctaLabel?: string }): string {
  return `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;">
      <p style="font-size:13px;color:#888;margin:0 0 6px;text-transform:uppercase;letter-spacing:0.08em">CEL3 Interactive</p>
      <h1 style="font-size:22px;font-weight:700;color:#000;margin:0 0 16px;line-height:1.3">${opts.heading}</h1>
      <div style="font-size:15px;color:#444;margin:0 0 28px;line-height:1.6">${opts.bodyHtml}</div>
      ${opts.ctaUrl ? `
      <a href="${opts.ctaUrl}" style="display:inline-block;padding:13px 28px;background:#0ea5e9;color:#fff;text-decoration:none;border-radius:10px;font-weight:600;font-size:15px;">
        ${opts.ctaLabel ?? "View invoice"}
      </a>` : ""}
    </div>
  `;
}

export async function sendFirstNoticeEmail(invoice: DunningInvoice, payByIso: string): Promise<void> {
  await sendEmail({
    to: invoice.clientEmail,
    subject: `Payment reminder — Invoice ${invoice.number}`,
    htmlBody: shell({
      heading: "We haven't received your payment yet",
      bodyHtml: `
        <p>Hi ${invoice.clientName},</p>
        <p>Invoice ${invoice.number} for ${formatCurrency(invoice.amountDueCents)} is now past due. Please submit
        payment by <strong>${formatDate(payByIso)}</strong> to avoid a late fee.</p>
      `,
      ctaUrl: invoice.hostedInvoiceUrl,
      ctaLabel: "Pay invoice",
    }),
  });
}

export async function sendSecondNoticeEmail(invoice: DunningInvoice, lateFeeCents: number, interruptByIso: string): Promise<void> {
  await sendEmail({
    to: invoice.clientEmail,
    subject: `Second notice — Invoice ${invoice.number} past due`,
    htmlBody: shell({
      heading: "A late fee has been applied to your account",
      bodyHtml: `
        <p>Hi ${invoice.clientName},</p>
        <p>Invoice ${invoice.number} for ${formatCurrency(invoice.amountDueCents)} is still unpaid, so a
        ${formatCurrency(lateFeeCents)} late fee has been added to your account as a separate invoice.</p>
        <p>If payment isn't received by <strong>${formatDate(interruptByIso)}</strong>, your website service
        will be interrupted.</p>
      `,
      ctaUrl: invoice.hostedInvoiceUrl,
      ctaLabel: "Pay invoice",
    }),
  });
}

export async function sendInterruptionNoticeEmail(invoice: DunningInvoice): Promise<void> {
  await sendEmail({
    to: invoice.clientEmail,
    subject: `Action required — Invoice ${invoice.number} is now overdue`,
    htmlBody: shell({
      heading: "Your website service is interrupted",
      bodyHtml: `
        <p>Hi ${invoice.clientName},</p>
        <p>Invoice ${invoice.number} for ${formatCurrency(invoice.amountDueCents)} remains unpaid. Your hosting
        and maintenance service is now interrupted until this invoice is paid in full.</p>
      `,
      ctaUrl: invoice.hostedInvoiceUrl,
      ctaLabel: "Pay invoice",
    }),
  });
}
