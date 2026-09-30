"use client";

import { useState, type FormEvent } from "react";
import styles from "./download.module.css";

export default function DownloadForm() {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return;
    setBusy(true); setMessage("Preparing your download…");
    try {
      const response = await fetch("/api/downloads/unlockingrva", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }), cache: "no-store" });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(typeof data.error === "string" ? data.error : "The download could not start. Please try again.");
      }
      if (!response.headers.get("content-type")?.includes("application/zip")) throw new Error("The download could not start. Please try again.");
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a"); link.href = url; link.download = "UnlockingRVA-Option-C-Frontend.zip";
      document.body.append(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      setMessage("Your download has started. Look for UnlockingRVA-Option-C-Frontend.zip in your downloads.");
      setCode("");
    } catch (error) { setMessage(error instanceof Error ? error.message : "The download could not start. Please try again."); }
    finally { setBusy(false); }
  }
  return <form className={styles.form} onSubmit={submit}>
    <label htmlFor="access-code">Your access code</label>
    <p id="code-help">Enter the code supplied by CEL3 Interactive. Spaces and hyphens are optional.</p>
    <input id="access-code" name="access-code" type="password" autoComplete="off" autoCapitalize="characters" spellCheck={false} maxLength={40} required aria-describedby="code-help download-status" value={code} onChange={event => setCode(event.target.value)} disabled={busy} />
    <button type="submit" disabled={busy}>{busy ? "Preparing download…" : "Download your website ZIP ↓"}</button>
    <p id="download-status" role="status" aria-live="polite" className={styles.status}>{message}</p>
  </form>;
}
