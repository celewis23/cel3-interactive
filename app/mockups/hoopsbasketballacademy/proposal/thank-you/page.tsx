"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import styles from "../proposal.module.css";

type SessionInfo = {
  paid: boolean;
  selectionName: string | null;
  dueTodayCents: number | null;
  monthlyCents: number | null;
  businessName: string | null;
  checklist: string[];
  pdf: { contractId: string; token: string } | null;
};

function money(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

export default function HoopsThankYouPage() {
  return (
    <Suspense fallback={null}>
      <HoopsThankYouContent />
    </Suspense>
  );
}

function HoopsThankYouContent() {
  const params = useSearchParams();
  const sessionId = params.get("session_id");
  const [info, setInfo] = useState<SessionInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    let attempts = 0;

    async function poll() {
      attempts += 1;
      try {
        const res = await fetch(`/api/mockups/hoopsbasketballacademy/proposal/session?session_id=${encodeURIComponent(sessionId!)}`);
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) { setError(data.error || "Could not look up this session."); return; }
        setInfo(data);
        // The webhook creates the contract/PDF asynchronously — poll a few times if it's not ready yet.
        if (data.paid && !data.pdf && attempts < 6) setTimeout(poll, 2000);
      } catch {
        if (!cancelled) setError("Could not look up this session.");
      }
    }
    poll();
    return () => { cancelled = true; };
  }, [sessionId]);

  return (
    <div className={styles.page} data-hoops>
      <div className={styles.topBar}>
        <div className={styles.topBarInner}>
          <a className={styles.backLink} href="/mockups/hoopsbasketballacademy">&larr; Back to overview</a>
          <h1 className={`${styles.d} ${styles.h1}`}>{info?.paid ? "You're all set!" : "Confirming…"}</h1>
          {info?.paid && (
            <p className={styles.offerNote}>
              Thanks{info.businessName ? `, ${info.businessName}` : ""}! You&apos;re confirmed for <strong>{info.selectionName}</strong>.
            </p>
          )}
        </div>
      </div>

      <div className={styles.layout} style={{ gridTemplateColumns: "1fr" }}>
        <div>
          {!sessionId && <div className={styles.section}><p className={styles.error}>Missing checkout session.</p></div>}
          {error && <div className={styles.section}><p className={styles.error}>{error}</p></div>}

          {info?.paid && (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>What you bought</h2>
              <div className={styles.summaryRow}><span>Due today (paid)</span><b className={styles.m}>{info.dueTodayCents != null ? money(info.dueTodayCents) : "—"}</b></div>
              <div className={styles.summaryRow}><span>Monthly, starting at launch</span><b className={styles.m}>{info.monthlyCents != null ? money(info.monthlyCents) : "—"}</b></div>

              {info.pdf ? (
                <a
                  className={`${styles.btn} ${styles.ghost}`}
                  style={{ width: "auto", marginTop: 16 }}
                  href={`/api/mockups/hoopsbasketballacademy/proposal/pdf?contractId=${encodeURIComponent(info.pdf.contractId)}&token=${encodeURIComponent(info.pdf.token)}`}
                >
                  Download your signed proposal (PDF)
                </a>
              ) : (
                <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 16 }}>Preparing your signed proposal PDF&hellip; refresh in a moment if it doesn&rsquo;t appear.</p>
              )}
            </div>
          )}

          {info?.paid && info.checklist.length > 0 && (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Next steps</h2>
              <p style={{ fontSize: 14, color: "var(--muted)" }}>We&apos;ll be in touch to schedule your kickoff call. Before then, it helps to have ready:</p>
              <ul style={{ fontSize: 14, lineHeight: 1.7 }}>
                {info.checklist.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
          )}

          {info && !info.paid && (
            <div className={styles.section}><p>This session hasn&rsquo;t completed payment yet.</p></div>
          )}
        </div>
      </div>
    </div>
  );
}
