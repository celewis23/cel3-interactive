"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { DateTime } from "luxon";
import type { BillingCustomer } from "@/lib/stripe/billing";
import type { CustomerDriveLink } from "@/lib/stripe/customerDriveLinks";

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    google: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    gapi: any;
  }
}

function fmt(cents: number, currency = "usd") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

const DASH = <span className="text-white/20">—</span>;

// ─── CustomerInfoCard ─────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="flex gap-3">
      <span className="text-xs text-white/30 w-32 flex-shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-white/70 flex-1 break-words">{value}</span>
    </div>
  );
}

export function CustomerInfoCard({ customer }: { customer: BillingCustomer }) {
  const hasAddress =
    customer.addressLine1 ||
    customer.addressCity ||
    customer.addressState ||
    customer.addressPostalCode ||
    customer.country;
  const hasShipping =
    customer.shippingName ||
    customer.shippingAddressLine1 ||
    customer.shippingAddressCity;
  const metaEntries = Object.entries(customer.metadata ?? {});

  return (
    <div className="bg-white/3 border border-white/8 rounded-2xl p-5">
      <h3 className="text-xs font-semibold uppercase tracking-widest text-white/30 mb-4">
        Customer Info
      </h3>
      <div className="space-y-2.5">
        <InfoRow label="Name" value={customer.name} />
        <InfoRow label="Email" value={customer.email} />
        <InfoRow label="Phone" value={customer.phone} />
        <InfoRow label="Description" value={customer.description} />
        {hasAddress && (
          <InfoRow
            label="Address"
            value={[
              customer.addressLine1,
              customer.addressCity,
              customer.addressState,
              customer.addressPostalCode,
              customer.country,
            ]
              .filter(Boolean)
              .join(", ")}
          />
        )}
        {hasShipping && (
          <InfoRow
            label="Shipping"
            value={[
              customer.shippingName,
              customer.shippingPhone,
              customer.shippingAddressLine1,
              customer.shippingAddressCity,
              customer.shippingAddressState,
              customer.shippingAddressPostalCode,
            ]
              .filter(Boolean)
              .join(", ")}
          />
        )}
        <InfoRow
          label="Tax Exempt"
          value={
            customer.taxExempt && customer.taxExempt !== "none" ? (
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-sky-500/20 text-sky-400 capitalize">
                {customer.taxExempt}
              </span>
            ) : null
          }
        />
        <InfoRow
          label="Delinquent"
          value={
            customer.delinquent ? (
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400">
                Yes
              </span>
            ) : null
          }
        />
        {customer.preferredLocales.length > 0 && (
          <InfoRow label="Locales" value={customer.preferredLocales.join(", ")} />
        )}
        <InfoRow
          label="Created"
          value={DateTime.fromSeconds(customer.created).toFormat("LLL d, yyyy")}
        />
        <InfoRow
          label="Live Mode"
          value={
            customer.livemode ? (
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                Live
              </span>
            ) : (
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400">
                Test
              </span>
            )
          }
        />
        {metaEntries.length > 0 && (
          <div className="flex gap-3">
            <span className="text-xs text-white/30 w-32 flex-shrink-0 pt-0.5">Metadata</span>
            <div className="flex-1 space-y-1">
              {metaEntries.map(([k, v]) => (
                <div key={k} className="text-xs">
                  <span className="text-white/30">{k}:</span>{" "}
                  <span className="text-white/60">{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── CustomerDriveFoldersCard ─────────────────────────────────────────────────

export function CustomerDriveFoldersCard({
  customerId,
  initialLinks,
}: {
  customerId: string;
  initialLinks: CustomerDriveLink[];
}) {
  const [links, setLinks] = useState<CustomerDriveLink[]>(initialLinks);
  const [unlinking, setUnlinking] = useState<string | null>(null);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUnlink = useCallback(
    async (folderId: string) => {
      setUnlinking(folderId);
      setError(null);
      try {
        const res = await fetch(
          `/api/admin/billing/customers/${customerId}/drive-links/${encodeURIComponent(folderId)}`,
          { method: "DELETE" }
        );
        if (!res.ok) throw new Error("Failed to unlink folder");
        setLinks((prev) => prev.filter((l) => l.folderId !== folderId));
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setUnlinking(null);
      }
    },
    [customerId]
  );

  const handleLinkFolder = useCallback(async () => {
    setPickerLoading(true);
    setError(null);
    try {
      const configRes = await fetch("/api/admin/email/drive-config");
      if (!configRes.ok) throw new Error("Failed to get picker config");
      const { accessToken, apiKey, clientId } = await configRes.json();
      if (!accessToken || !apiKey || !clientId) throw new Error("Picker config incomplete");

      await new Promise<void>((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "https://apis.google.com/js/api.js";
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("Failed to load Google API"));
        if (!document.querySelector('script[src="https://apis.google.com/js/api.js"]')) {
          document.head.appendChild(script);
        } else {
          resolve();
        }
      });

      await new Promise<void>((resolve) => {
        window.gapi.load("picker", { callback: resolve });
      });

      const picker = new window.google.picker.PickerBuilder()
        .setOAuthToken(accessToken)
        .setDeveloperKey(apiKey)
        .setAppId(clientId)
        .addView(
          new window.google.picker.DocsView(window.google.picker.ViewId.FOLDERS)
            .setSelectFolderEnabled(true)
            .setMimeTypes("application/vnd.google-apps.folder")
        )
        .setCallback(async (data: { action: string; docs?: { id: string; name: string }[] }) => {
          if (data.action === window.google.picker.Action.PICKED && data.docs?.[0]) {
            const folder = data.docs[0];
            try {
              const res = await fetch(
                `/api/admin/billing/customers/${customerId}/drive-links`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ folderId: folder.id, folderName: folder.name }),
                }
              );
              if (!res.ok) throw new Error("Failed to link folder");
              const link = await res.json();
              setLinks((prev) => [link, ...prev.filter((l) => l.folderId !== folder.id)]);
            } catch (e) {
              setError((e as Error).message);
            }
          }
          setPickerLoading(false);
        })
        .build();
      picker.setVisible(true);
    } catch (e) {
      setError((e as Error).message);
      setPickerLoading(false);
    }
  }, [customerId]);

  return (
    <div className="bg-white/3 border border-white/8 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-white/30">
          Drive Folders
        </h3>
        <button
          onClick={handleLinkFolder}
          disabled={pickerLoading}
          className="flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/20 px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50"
        >
          <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          {pickerLoading ? "Opening…" : "Link folder"}
        </button>
      </div>

      {error && (
        <div className="mb-3 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs">
          {error}
        </div>
      )}

      {links.length === 0 ? (
        <p className="text-sm text-white/30 text-center py-4">No Drive folders linked</p>
      ) : (
        <div className="space-y-2">
          {links.map((link) => (
            <div
              key={link.folderId}
              className="flex items-center gap-3 px-3 py-2.5 bg-white/3 border border-white/8 rounded-xl"
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" className="text-yellow-400 flex-shrink-0">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
              </svg>
              <span className="flex-1 min-w-0 text-sm text-white/70 truncate">{link.folderName}</span>
              <a
                href={`https://drive.google.com/drive/folders/${link.folderId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-sky-400 hover:text-sky-300 flex-shrink-0"
              >
                Open ↗
              </a>
              <button
                onClick={() => handleUnlink(link.folderId)}
                disabled={unlinking === link.folderId}
                className="text-white/30 hover:text-red-400 transition-colors disabled:opacity-50 flex-shrink-0"
                title="Unlink"
              >
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── QuickContactCard ─────────────────────────────────────────────────────────

export function QuickContactCard({ customer }: { customer: BillingCustomer }) {
  const [showChatModal, setShowChatModal] = useState(false);
  const [chatSpaceName, setChatSpaceName] = useState("");
  const [chatMessage, setChatMessage] = useState("");
  const [chatSending, setChatSending] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [meetUrl, setMeetUrl] = useState<string | null>(null);
  const [meetLoading, setMeetLoading] = useState(false);

  const handleSendChatMessage = async () => {
    if (!chatSpaceName || !chatMessage.trim()) return;
    setChatSending(true);
    setChatError(null);
    try {
      const res = await fetch("/api/admin/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spaceName: chatSpaceName, text: chatMessage }),
      });
      if (!res.ok) throw new Error("Failed to send message");
      setShowChatModal(false);
      setChatMessage("");
      setChatSpaceName("");
    } catch (e) {
      setChatError((e as Error).message);
    } finally {
      setChatSending(false);
    }
  };

  const handleCreateMeet = async () => {
    setMeetLoading(true);
    try {
      const res = await fetch("/api/admin/meet/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `Meeting with ${customer.name ?? customer.email ?? "Customer"}`,
        }),
      });
      if (!res.ok) throw new Error("Failed to create Meet");
      const data = await res.json();
      setMeetUrl(data.meetLink ?? data.hangoutLink ?? null);
    } catch {
      // ignore
    } finally {
      setMeetLoading(false);
    }
  };

  return (
    <div className="bg-white/3 border border-white/8 rounded-2xl p-5">
      <h3 className="text-xs font-semibold uppercase tracking-widest text-white/30 mb-3">
        Quick Contact
      </h3>
      <div className="space-y-2">
        {customer.email && (
          <a
            href={`/admin/email/compose?to=${encodeURIComponent(customer.email)}`}
            className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl bg-white/3 border border-white/8 text-sm text-white/70 hover:text-white hover:bg-white/8 transition-colors"
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
            Compose email
          </a>
        )}
        {customer.email && (
          <a
            href={`mailto:${customer.email}`}
            className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sm text-sky-400 hover:text-sky-300 hover:bg-sky-500/20 transition-colors"
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
            Email (mailto)
          </a>
        )}
        {customer.phone && (
          <a
            href={`tel:${customer.phone}`}
            className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/20 transition-colors"
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
            </svg>
            Call {customer.phone}
          </a>
        )}
        <button
          onClick={() => setShowChatModal(true)}
          className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl bg-white/3 border border-white/8 text-sm text-white/70 hover:text-white hover:bg-white/8 transition-colors"
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 01.778-.332 48.294 48.294 0 005.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
          </svg>
          Send Chat message
        </button>
        <button
          onClick={handleCreateMeet}
          disabled={meetLoading}
          className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl bg-white/3 border border-white/8 text-sm text-white/70 hover:text-white hover:bg-white/8 transition-colors disabled:opacity-50"
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
          </svg>
          {meetLoading ? "Creating…" : "Create Meet link"}
        </button>
        {meetUrl && (
          <a
            href={meetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs text-sky-400 hover:text-sky-300 mt-1 px-3"
          >
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
            </svg>
            {meetUrl}
          </a>
        )}
      </div>

      {/* Chat modal */}
      {showChatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-[#111] border border-white/10 rounded-2xl p-6 w-full max-w-md mx-4">
            <h3 className="text-sm font-semibold text-white mb-4">Send Chat Message</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-white/40 block mb-1">Space name (e.g. spaces/ABCDE)</label>
                <input
                  type="text"
                  value={chatSpaceName}
                  onChange={(e) => setChatSpaceName(e.target.value)}
                  placeholder="spaces/ABCDE"
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/30 outline-none focus:border-sky-500/50"
                />
              </div>
              <div>
                <label className="text-xs text-white/40 block mb-1">Message</label>
                <textarea
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/30 outline-none focus:border-sky-500/50 resize-none"
                />
              </div>
              {chatError && (
                <p className="text-xs text-red-400">{chatError}</p>
              )}
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => { setShowChatModal(false); setChatError(null); }}
                  className="px-4 py-2 rounded-xl text-sm text-white/50 hover:text-white bg-white/5 hover:bg-white/8 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendChatMessage}
                  disabled={chatSending || !chatSpaceName || !chatMessage.trim()}
                  className="px-4 py-2 rounded-xl text-sm text-white bg-sky-500 hover:bg-sky-400 disabled:opacity-50 transition-colors"
                >
                  {chatSending ? "Sending…" : "Send"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── CustomerBillingCard ──────────────────────────────────────────────────────

export function CustomerBillingCard({ customer }: { customer: BillingCustomer }) {
  return (
    <div className="bg-white/3 border border-white/8 rounded-2xl p-5">
      <h3 className="text-xs font-semibold uppercase tracking-widest text-white/30 mb-3">
        Billing
      </h3>
      <div className="space-y-2.5">
        {customer.balance !== 0 && (
          <div className="flex justify-between items-center">
            <span className="text-xs text-white/40">Balance</span>
            <span className={customer.balance < 0 ? "text-sm text-emerald-400" : "text-sm text-amber-400"}>
              {customer.balance < 0 ? `${fmt(Math.abs(customer.balance), customer.currency)} cr` : fmt(customer.balance, customer.currency)}
            </span>
          </div>
        )}
        {customer.cashBalance && Object.keys(customer.cashBalance).length > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-xs text-white/40">Cash Balance</span>
            <div className="text-right">
              {Object.entries(customer.cashBalance).map(([cur, amt]) => (
                <div key={cur} className="text-sm text-white/70">{fmt(amt, cur)}</div>
              ))}
            </div>
          </div>
        )}
        {customer.invoiceCreditBalance && Object.keys(customer.invoiceCreditBalance).length > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-xs text-white/40">Invoice Credit</span>
            <div className="text-right">
              {Object.entries(customer.invoiceCreditBalance).map(([cur, amt]) => (
                <div key={cur} className="text-sm text-emerald-400">{fmt(Math.abs(amt), cur)}</div>
              ))}
            </div>
          </div>
        )}
        {customer.subscriptionStatus && (
          <div className="flex justify-between items-center">
            <span className="text-xs text-white/40">Subscription</span>
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${customer.subscriptionStatus === "active" ? "bg-emerald-500/20 text-emerald-400" : "bg-white/10 text-white/40"}`}>
              {customer.subscriptionStatus}
            </span>
          </div>
        )}
        {customer.subscriptionPlanNickname && (
          <div className="flex justify-between items-center">
            <span className="text-xs text-white/40">Plan</span>
            <span className="text-sm text-white/70">{customer.subscriptionPlanNickname}</span>
          </div>
        )}
        {customer.subscriptionCurrentPeriodEnd && (
          <div className="flex justify-between items-center">
            <span className="text-xs text-white/40">Renews</span>
            <span className="text-sm text-white/60">
              {DateTime.fromSeconds(customer.subscriptionCurrentPeriodEnd).toFormat("LLL d, yyyy")}
            </span>
          </div>
        )}
        {customer.discountCouponName && (
          <div className="flex justify-between items-center">
            <span className="text-xs text-white/40">Coupon</span>
            <span className="text-sm text-white/70">
              {customer.discountCouponName}
              {customer.discountCouponPercentOff != null && ` (${customer.discountCouponPercentOff}% off)`}
            </span>
          </div>
        )}
        {customer.balance === 0 && !customer.subscriptionStatus && !customer.discountCouponName && (
          <p className="text-sm text-white/30 text-center py-2">No billing activity</p>
        )}
      </div>
      <div className="mt-3 pt-3 border-t border-white/8">
        <Link
          href={`/admin/billing/invoices?customerId=${customer.id}`}
          className="text-xs text-sky-400 hover:text-sky-300 transition-colors"
        >
          View invoices →
        </Link>
      </div>
    </div>
  );
}

// ─── Main CustomerDetailClient ────────────────────────────────────────────────

interface Props {
  customer: BillingCustomer;
  initialLinks: CustomerDriveLink[];
}

export default function CustomerDetailClient({ customer, initialLinks }: Props) {
  return (
    <div className="max-w-4xl">
      {/* Back */}
      <Link
        href="/admin/billing/customers"
        className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white mb-6 transition-colors"
      >
        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
        Customers
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">
            {customer.name ?? <span className="text-white/40 italic">No name</span>}
          </h1>
          <p className="text-sm text-white/40 mt-0.5 font-mono">{customer.id}</p>
        </div>
        <div className="flex gap-2 flex-shrink-0 flex-wrap">
          {customer.email && (
            <a
              href={`mailto:${customer.email}`}
              className="px-3 py-1.5 rounded-lg text-xs text-sky-400 bg-sky-500/10 border border-sky-500/20 hover:bg-sky-500/20 transition-colors"
            >
              Email
            </a>
          )}
          {customer.phone && (
            <a
              href={`tel:${customer.phone}`}
              className="px-3 py-1.5 rounded-lg text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
            >
              Call
            </a>
          )}
          <a
            href={`https://dashboard.stripe.com/customers/${customer.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-lg text-xs text-white/50 bg-white/5 border border-white/10 hover:text-white hover:bg-white/8 transition-colors"
          >
            Stripe ↗
          </a>
        </div>
      </div>

      {/* Two-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: 2 cols */}
        <div className="lg:col-span-2 space-y-6">
          <CustomerInfoCard customer={customer} />
          <CustomerDriveFoldersCard customerId={customer.id} initialLinks={initialLinks} />
        </div>

        {/* Right: sidebar */}
        <div className="space-y-4">
          <QuickContactCard customer={customer} />
          <CustomerBillingCard customer={customer} />
        </div>
      </div>
    </div>
  );
}
