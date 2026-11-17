import type { ReceiptStatus as Status } from "@/lib/billing/receiptStatus";

export default function ReceiptStatus({ receipt }: { receipt?: Status }) {
  if (receipt?.unavailable) return <p className="mt-2 text-xs text-amber-300">Receipt status unavailable</p>;
  if (receipt?.sentAt) return <p className="mt-2 text-xs text-emerald-300" title="Accepted by the email provider; inbox delivery is not confirmed">Receipt sent · {new Date(receipt.sentAt).toLocaleString("en-US", { timeZone: "America/New_York" })} ET{receipt.to ? ` · ${receipt.to}` : ""}</p>;
  return <p className="mt-2 text-xs text-amber-300">{receipt?.startedAt ? "Receipt not confirmed sent — check email provider logs" : "No receipt send recorded"}</p>;
}
