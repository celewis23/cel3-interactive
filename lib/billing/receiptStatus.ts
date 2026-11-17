import { sanityServer } from "@/lib/sanityServer";

export type ReceiptStatus = { sentAt?: string; startedAt?: string; to?: string; unavailable?: boolean };
export async function invoiceReceiptStatuses(invoiceIds: string[]): Promise<Record<string, ReceiptStatus>> {
  if (!invoiceIds.length) return {};
  const ids = invoiceIds.flatMap(id => [`invoiceReceipt.live.${id}`, `invoiceReceipt.test.${id}`]);
  try {
    const rows = await sanityServer.fetch<{ _id: string; sentAt?: string; startedAt?: string; to?: string }[]>(
      `*[_type == "invoiceReceiptDelivery" && _id in $ids]{_id,sentAt,startedAt,"to":message.to}`, { ids },
    );
    return Object.fromEntries(rows.map(row => [row._id.replace(/^invoiceReceipt\.(live|test)\./, ""), row]));
  } catch {
    return Object.fromEntries(invoiceIds.map(id => [id, { unavailable: true }]));
  }
}
