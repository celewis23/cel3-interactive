"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";

const RichTextEditor = dynamic(() => import("./RichTextEditor"), { ssr: false });

export default function SignatureEditor() {
  const [html, setHtml] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/email/signature")
      .then((r) => r.ok ? r.json() : { html: "" })
      .then(({ html: h }: { html: string }) => {
        setHtml(h ?? "");
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  async function save() {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const res = await fetch("/api/admin/email/signature", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html }),
      });
      if (!res.ok) throw new Error("Failed to save");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError("Failed to save signature. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function importFromGmail() {
    setImporting(true);
    setError("");
    setSaved(false);
    try {
      const res = await fetch("/api/admin/email/signature", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? "No Gmail signature found");
      }
      const { html: imported } = await res.json() as { html: string };
      setHtml(imported ?? "");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to import from Gmail");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="space-y-4 rounded-2xl border border-white/10 bg-[#090b10] p-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-base font-semibold text-white">Email Signature</h2>
          <p className="text-xs text-white/40 mt-0.5">
            Automatically appended to all new emails and replies.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {saved && (
            <span className="flex items-center gap-1 text-xs text-sky-200">
              <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Saved
            </span>
          )}
          <button
            onClick={importFromGmail}
            disabled={importing || !loaded}
            title="Pull your current Gmail signature and load it into the editor"
            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-black px-3 py-2 text-sm text-white/60 transition-colors hover:border-white/20 hover:text-white disabled:opacity-50"
          >
            {importing ? (
              <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
            )}
            {importing ? "Importing…" : "Import from Gmail"}
          </button>
          <button
            onClick={save}
            disabled={saving || !loaded}
            className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-sky-400 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      {error && (
        <p className="text-sm text-white/70">{error}</p>
      )}

      {loaded && (
        <RichTextEditor
          value={html}
          onChange={setHtml}
          placeholder="Your name, title, contact info…"
          minHeight="160px"
        />
      )}
    </div>
  );
}
