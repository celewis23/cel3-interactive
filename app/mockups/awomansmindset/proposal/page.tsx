"use client";

import { useMemo, useState } from "react";
import styles from "./proposal.module.css";
import {
  AWM_SELECTIONS,
  AWM_OFFER_EXPIRES_AT,
  AWM_PAYMENT_TERMS,
  AWM_NOT_INCLUDED,
  AWM_TIMELINE_SUMMARY,
  type AwmSelectionId,
} from "@/lib/mockups/awomansmindset/config";
import { quoteAwmSelection } from "@/lib/mockups/awomansmindset/pricing";

const OVERVIEW_URL = "/mockups/awomansmindset";
const SELECTION_ORDER: AwmSelectionId[] = ["special-offer", "tier1", "tier2", "tier3", "code"];

function money(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

/** The "code" tier has no recurring fee — show that in words rather than "$0". */
function monthlyLabel(cents: number, oneTimeOnly: boolean): string {
  if (oneTimeOnly) return "No monthly fee";
  return money(cents);
}

function daysUntil(date: Date): number {
  return Math.max(0, Math.ceil((date.getTime() - Date.now()) / 86_400_000));
}

type BillingAddress = { line1: string; city: string; state: string; postalCode: string };

export default function AwmProposalPage() {
  const [selectionId, setSelectionId] = useState<AwmSelectionId>("special-offer");
  const [step, setStep] = useState<"select" | "accept">("select");
  const [ask, setAsk] = useState<null | "question" | "call">(null);

  const [businessName, setBusinessName] = useState("A Woman's Mindset");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [billingAddress, setBillingAddress] = useState<BillingAddress>({ line1: "", city: "", state: "", postalCode: "" });
  const [signerName, setSignerName] = useState("");
  const [agreed, setAgreed] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selection = AWM_SELECTIONS[selectionId];
  const quote = useMemo(() => quoteAwmSelection(selectionId), [selectionId]);
  const offerDaysLeft = daysUntil(AWM_OFFER_EXPIRES_AT);

  async function handlePay() {
    setError(null);
    if (!businessName.trim() || !contactName.trim() || !email.trim() || !phone.trim()) {
      setError("Please fill in business, contact, email and phone.");
      return;
    }
    if (!billingAddress.line1.trim() || !billingAddress.city.trim() || !billingAddress.state.trim() || !billingAddress.postalCode.trim()) {
      setError("Please complete the billing address.");
      return;
    }
    if (!agreed) {
      setError("Please check the box to agree to the terms.");
      return;
    }
    if (!signerName.trim()) {
      setError("Please type your full name as your signature.");
      return;
    }

    setSubmitting(true);
    try {
      const acceptRes = await fetch("/api/mockups/awomansmindset/proposal/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName, contactName, email, phone, billingAddress, signerName, agreed,
          selectionId,
        }),
      });
      const acceptData = await acceptRes.json();
      if (!acceptRes.ok) throw new Error(acceptData.error || "Could not record your acceptance.");

      const checkoutRes = await fetch("/api/mockups/awomansmindset/proposal/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acceptanceId: acceptData.acceptanceId, selectionId }),
      });
      const checkoutData = await checkoutRes.json();
      if (!checkoutRes.ok) throw new Error(checkoutData.error || "Could not start checkout.");
      window.location.href = checkoutData.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.page} data-awm>
      <div className={styles.topBar}>
        <div className={styles.topBarInner}>
          <a className={styles.backLink} href={OVERVIEW_URL}>&larr; Back to overview</a>
          <h1 className={`${styles.d} ${styles.h1}`}>Your proposal</h1>
          <p className={styles.offerNote}>Prepared for Ada Thompson &mdash; A Woman&apos;s Mindset &mdash; by CEL3 Interactive. Pick any option below &mdash; whatever you choose is exactly what you sign and pay for.</p>
          {offerDaysLeft > 0 && (
            <span className={styles.expiry}>Special offer good through December 7, 2026 &middot; {offerDaysLeft} day{offerDaysLeft === 1 ? "" : "s"} left</span>
          )}
        </div>
      </div>

      {step === "select" && (
        <div className={styles.layout}>
          <div>
            <div className={styles.cards}>
              {SELECTION_ORDER.map((id) => {
                const s = AWM_SELECTIONS[id];
                const featured = id === "special-offer";
                const isSelected = selectionId === id;
                return (
                  <button
                    key={id}
                    type="button"
                    className={[styles.card, featured ? styles.featured : "", isSelected ? styles.selected : ""].join(" ")}
                    onClick={() => setSelectionId(id)}
                    aria-pressed={isSelected}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <span className={`${styles.d} ${styles.cardName}`}>{s.name}</span>
                      <span className={styles.radioDot} aria-hidden="true" />
                    </div>
                    <p className={styles.cardTagline}>{s.tagline}</p>
                    <div className={styles.cardPrice}>
                      <div><b>{money(s.dueTodayCents)}</b><span>project total</span></div>
                      <div><b>{monthlyLabel(s.monthlyCents, s.oneTimeOnly)}</b><span>{s.oneTimeOnly ? "one-time only" : "/month at launch"}</span></div>
                    </div>

                    <div className={styles.editsBy}>Edits: {s.editsBy}</div>

                    <details className={styles.detail} onClick={(e) => e.stopPropagation()}>
                      <summary>What&rsquo;s included</summary>
                      <ul>
                        {s.includes.map((item) => <li key={item}>{item}</li>)}
                      </ul>
                    </details>
                  </button>
                );
              })}
            </div>

            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Your options at a glance</h2>
              <table className={styles.table}>
                <thead>
                  <tr><th>Selection</th><th>Project total</th><th>Monthly at launch</th><th>Edits</th></tr>
                </thead>
                <tbody>
                  {SELECTION_ORDER.map((id) => {
                    const s = AWM_SELECTIONS[id];
                    return (
                      <tr key={id}>
                        <td>{s.name}</td>
                        <td className={styles.m}>{money(s.dueTodayCents)}</td>
                        <td className={styles.m}>{monthlyLabel(s.monthlyCents, s.oneTimeOnly)}</td>
                        <td>{s.editsBy}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Timeline &amp; payment</h2>
              <p style={{ fontSize: 14, color: "var(--muted)" }}>{AWM_TIMELINE_SUMMARY}</p>
              <ul style={{ fontSize: 14, lineHeight: 1.7, color: "var(--muted)" }}>
                {AWM_PAYMENT_TERMS.map((t) => <li key={t}>{t}</li>)}
              </ul>
              <h3 style={{ fontSize: 14, marginTop: 16 }}>Not included</h3>
              <ul style={{ fontSize: 14, color: "var(--muted)" }}>
                {AWM_NOT_INCLUDED.map((t) => <li key={t}>{t}</li>)}
              </ul>
            </div>

            <div className={styles.linkRow} style={{ marginTop: 20 }}>
              <button type="button" className={`${styles.btn} ${styles.ghost}`} onClick={() => setAsk("question")}>Ask a question</button>
              <button type="button" className={`${styles.btn} ${styles.ghost}`} onClick={() => setAsk("call")}>Not ready yet &mdash; request a call</button>
            </div>
          </div>

          <aside className={styles.summaryPanel}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: "var(--muted)", textTransform: "uppercase" }}>Your selection</div>
              <div className={`${styles.d}`} style={{ fontSize: 18, marginTop: 4 }}>{selection.name}</div>
            </div>
            <div className={styles.summaryRow}><span>Project total</span><b className={styles.m}>{money(quote.dueTodayCents)}</b></div>
            <div className={styles.summaryRow}><span>{quote.oneTimeOnly ? "Monthly" : "Monthly at launch"}</span><b className={styles.m}>{monthlyLabel(quote.monthlyCents, quote.oneTimeOnly)}</b></div>
            <button type="button" className={`${styles.btn} ${styles.gold}`} onClick={() => setStep("accept")}>
              Continue to sign &amp; pay
            </button>
          </aside>
        </div>
      )}

      {step === "accept" && (
        <div className={styles.layout}>
          <div>
            <div className={styles.section}>
              <button type="button" className={`${styles.btn} ${styles.ghost}`} style={{ width: "auto", marginBottom: 16 }} onClick={() => setStep("select")}>
                &larr; Back to selection
              </button>
              <h2 className={styles.sectionTitle}>Accept &amp; sign</h2>
              <div className={styles.formGrid}>
                <label className={styles.field}>Business name
                  <input value={businessName} onChange={(e) => setBusinessName(e.target.value)} required />
                </label>
                <label className={styles.field}>Contact name
                  <input value={contactName} onChange={(e) => setContactName(e.target.value)} required />
                </label>
                <label className={styles.field}>Email
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </label>
                <label className={styles.field}>Phone
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required />
                </label>
                <label className={styles.field}>Billing address
                  <input value={billingAddress.line1} onChange={(e) => setBillingAddress((a) => ({ ...a, line1: e.target.value }))} required />
                </label>
                <label className={styles.field}>City
                  <input value={billingAddress.city} onChange={(e) => setBillingAddress((a) => ({ ...a, city: e.target.value }))} required />
                </label>
                <label className={styles.field}>State
                  <input value={billingAddress.state} onChange={(e) => setBillingAddress((a) => ({ ...a, state: e.target.value }))} required />
                </label>
                <label className={styles.field}>Postal code
                  <input value={billingAddress.postalCode} onChange={(e) => setBillingAddress((a) => ({ ...a, postalCode: e.target.value }))} required />
                </label>
              </div>

              <h3 style={{ fontSize: 14, marginTop: 20 }}>Summary</h3>
              <p style={{ fontSize: 14 }}>{selection.name} &mdash; {money(quote.dueTodayCents)} project total{quote.oneTimeOnly ? ", one-time, no monthly fee." : `, ${money(quote.monthlyCents)}/month starting at launch.`}</p>

              <div className={styles.terms}>
                <strong>Terms</strong>
                <ul>
                  {AWM_PAYMENT_TERMS.map((t) => <li key={t}>{t}</li>)}
                  <li>Not included: {AWM_NOT_INCLUDED.join(", ")}.</li>
                  <li>Change requests beyond the included monthly hours are quoted and billed separately before work begins.</li>
                </ul>
              </div>

              <label className={styles.agreeRow}>
                <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
                <span>I agree to the proposal terms: payment in full up front or an arranged 50% up front and 50% upon completion, {quote.oneTimeOnly ? "no monthly fee for this one-time handoff" : "monthly billing from launch, month to month with no contract"}.</span>
              </label>

              <label className={styles.field} style={{ marginTop: 10 }}>Type your name to sign
                <input value={signerName} onChange={(e) => setSignerName(e.target.value)} required />
              </label>
              <p style={{ fontSize: 12, color: "var(--muted)" }}>Secure card payment by Stripe opens next and collects the full project price. Prefer two payments? Go back to selection and use Ask a question to arrange 50% up front and 50% upon completion before paying.</p>

              {error && <p className={styles.error}>{error}</p>}
            </div>
          </div>

          <aside className={styles.summaryPanel}>
            <div className={`${styles.d}`} style={{ fontSize: 18 }}>{selection.name}</div>
            <div className={styles.summaryRow}><span>Project total</span><b className={styles.m}>{money(quote.dueTodayCents)}</b></div>
            <div className={styles.summaryRow}><span>{quote.oneTimeOnly ? "Monthly" : "Monthly at launch"}</span><b className={styles.m}>{monthlyLabel(quote.monthlyCents, quote.oneTimeOnly)}</b></div>
            <button type="button" className={`${styles.btn} ${styles.gold}`} disabled={submitting} onClick={handlePay}>
              {submitting ? "Starting checkout…" : `Sign and pay ${money(quote.dueTodayCents)}`}
            </button>
            <p style={{ fontSize: 11, color: "var(--muted)" }}>You&rsquo;ll pay securely via Stripe on the next screen.</p>
          </aside>
        </div>
      )}

      {ask && <AskModal kind={ask} onClose={() => setAsk(null)} />}
    </div>
  );
}

function AskModal({ kind, onClose }: { kind: "question" | "call"; onClose: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    if (!name.trim() || !email.trim()) { setError("Name and email are required."); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/mockups/awomansmindset/proposal/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, name, email, message, preferredTime }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not send your message.");
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.modalOverlay} role="dialog" aria-modal="true" onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {done ? (
          <>
            <h3 className={styles.d}>Thanks!</h3>
            <p>{kind === "call" ? "We'll reach out to schedule a call." : "We'll get back to you shortly."}</p>
            <button type="button" className={styles.btn} onClick={onClose}>Close</button>
          </>
        ) : (
          <>
            <h3 className={styles.d}>{kind === "call" ? "Request a call" : "Ask a question"}</h3>
            <label className={styles.field}>Name<input value={name} onChange={(e) => setName(e.target.value)} /></label>
            <label className={styles.field}>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
            {kind === "call" && (
              <label className={styles.field}>Preferred time<input value={preferredTime} onChange={(e) => setPreferredTime(e.target.value)} placeholder="e.g. Thursday afternoon" /></label>
            )}
            <label className={styles.field}>Message<textarea rows={3} value={message} onChange={(e) => setMessage(e.target.value)} /></label>
            {error && <p className={styles.error}>{error}</p>}
            <div style={{ display: "flex", gap: 10 }}>
              <button type="button" className={`${styles.btn} ${styles.ghost}`} onClick={onClose}>Cancel</button>
              <button type="button" className={styles.btn} disabled={submitting} onClick={submit}>{submitting ? "Sending…" : "Send"}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
