"use client";
/* eslint-disable @next/next/no-img-element -- Previews use authenticated local blob URLs. */

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { GmailAttachment } from "@/lib/gmail/types";
import { previewKind } from "@/lib/gmail/attachment-preview";

function attachmentPath(messageId: string, attachmentId: string) {
  return `/api/admin/email/attachment/${encodeURIComponent(messageId)}/${encodeURIComponent(attachmentId)}`;
}

export function AttachmentPreview({ messageId, attachment, onClose }: {
  messageId: string; attachment: GmailAttachment; onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [file, setFile] = useState<{ blob: Blob; url: string; text?: string } | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [driveUrl, setDriveUrl] = useState("");
  const [attempt, setAttempt] = useState(0);
  const path = attachmentPath(messageId, attachment.attachmentId);
  const kind = file ? previewKind(file.blob.type) : "unsupported";

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current?.showModal();
    return () => { document.body.style.overflow = overflow; previous?.focus(); };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let objectUrl = "";
    setError(""); setFile(null);
    void (async () => {
      try {
        const res = await fetch(`${path}?inline=1`, { signal: controller.signal });
        if (!res.ok) throw new Error("This attachment could not be loaded.");
        const blob = await res.blob();
        const text = previewKind(blob.type) === "text" ? await blob.slice(0, 1024 * 1024).text() : undefined;
        if (controller.signal.aborted) return;
        objectUrl = URL.createObjectURL(blob);
        setFile({ blob, url: objectUrl, text });
      } catch (err) {
        if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "Could not load attachment.");
      }
    })();
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [path, attempt]);

  function download() {
    if (!file) return;
    const link = document.createElement("a");
    link.href = file.url; link.download = attachment.filename;
    document.body.appendChild(link); link.click(); link.remove();
  }

  async function saveAs() {
    if (!file) return;
    const browser = window as Window & { showSaveFilePicker?: (options: { suggestedName: string }) => Promise<{ createWritable(): Promise<{ write(blob: Blob): Promise<void>; close(): Promise<void> }> }> };
    if (!browser.showSaveFilePicker) { download(); setNotice("Download started. Your browser controls where the file is saved."); return; }
    try {
      const handle = await browser.showSaveFilePicker({ suggestedName: attachment.filename });
      const writable = await handle.createWritable(); await writable.write(file.blob); await writable.close();
      setNotice("File saved.");
    } catch (err) { if (!(err instanceof DOMException && err.name === "AbortError")) setNotice("Could not save the file. Try Download instead."); }
  }

  async function copy() {
    if (!file) return;
    try {
      if (kind === "image") {
        const png = (async () => {
          const image = new Image(); image.src = file.url; await image.decode();
          const canvas = document.createElement("canvas"); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
          const context = canvas.getContext("2d");
          if (!context) throw new Error("Canvas unavailable");
          context.drawImage(image, 0, 0);
          return new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("Image conversion failed")), "image/png"));
        })();
        await navigator.clipboard.write([new ClipboardItem({ "image/png": png })]);
        setNotice("Image copied to clipboard.");
      } else if (kind === "text") {
        await navigator.clipboard.writeText(await file.blob.text()); setNotice("Text copied to clipboard.");
      } else {
        await navigator.clipboard.writeText(new URL(path, window.location.origin).href);
        setNotice("Private attachment link copied. Opening it requires backoffice access.");
      }
    } catch { setNotice("Clipboard access is unavailable. Use Download or Save as instead."); }
  }

  async function saveToDrive() {
    if (busy || driveUrl) return;
    setBusy(true); setNotice("");
    try {
      const res = await fetch(`${path}/drive`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not save to Google Drive.");
      setDriveUrl(data.url); setNotice("Saved to My Drive in your connected Google account.");
    } catch (err) { setNotice(err instanceof Error ? err.message : "Could not save to Google Drive."); }
    finally { setBusy(false); }
  }

  const buttonClass = "rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm hover:bg-white/15 disabled:opacity-40";
  return createPortal(<dialog ref={dialog} aria-label={`Preview ${attachment.filename}`} onCancel={e => { e.preventDefault(); onClose(); }}
    onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    className="fixed inset-0 m-0 h-[100dvh] max-h-none w-screen max-w-none border-0 bg-transparent p-3 text-white backdrop:bg-black/85 sm:p-6">
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-white/15 bg-[#101114] shadow-2xl">
      <header className="flex shrink-0 items-center gap-3 border-b border-white/10 px-4 py-3">
        <div className="min-w-0 flex-1"><h2 className="truncate text-base font-medium" title={attachment.filename}>{attachment.filename}</h2><p className="text-xs text-white/45">{(attachment.size / 1024 / 1024).toFixed(1)} MB</p></div>
        <button type="button" autoFocus onClick={onClose} className={buttonClass} aria-label="Close preview">Close ×</button>
      </header>
      <div className="flex shrink-0 flex-wrap gap-2 border-b border-white/10 p-3">
        <button type="button" className={buttonClass} disabled={!file} onClick={download}>Download</button>
        <button type="button" className={buttonClass} disabled={!file} onClick={() => void saveAs()}>Save as…</button>
        <button type="button" className={buttonClass} disabled={!file} onClick={() => void copy()}>{kind === "image" ? "Copy image" : kind === "text" ? "Copy text" : "Copy link"}</button>
        <button type="button" className={buttonClass} disabled={!file || busy || !!driveUrl} onClick={() => void saveToDrive()}>{busy ? "Saving…" : driveUrl ? "Saved to Drive" : "Save to Google Drive"}</button>
        {driveUrl && <a href={driveUrl} target="_blank" rel="noopener noreferrer" className={buttonClass}>Open in Drive ↗</a>}
      </div>
      {notice && <p role="status" className="shrink-0 border-b border-white/10 px-4 py-2 text-sm text-sky-200">{notice}</p>}
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-black/30 p-3 sm:p-6">
        {error ? <div role="alert" className="text-center"><p>{error}</p><button type="button" className={`${buttonClass} mt-3`} onClick={() => setAttempt(v => v + 1)}>Retry</button></div>
          : !file ? <p role="status">Loading attachment…</p>
          : kind === "image" ? <img src={file.url} alt={attachment.filename} className="max-h-full max-w-full object-contain" />
          : kind === "pdf" ? <iframe title={attachment.filename} src={file.url} className="h-full w-full rounded bg-white" sandbox="allow-scripts allow-same-origin" />
          : kind === "text" ? <div className="h-full w-full"><pre className="whitespace-pre-wrap break-words p-3 text-sm">{file.text}</pre>{file.blob.size > 1024 * 1024 && <p className="p-3 text-white/50">Preview shows the first 1 MB. Download for the full file.</p>}</div>
          : kind === "audio" ? <audio controls src={file.url} className="max-w-full" />
          : kind === "video" ? <video controls src={file.url} className="max-h-full max-w-full" />
          : <div className="text-center"><p className="text-lg">Preview unavailable for this file type</p><p className="mt-2 text-sm text-white/50">Download it or save it to Google Drive to open it.</p></div>}
      </div>
    </div>
  </dialog>, document.body);
}

export default function AttachmentChip({ messageId, att }: { messageId: string; att: GmailAttachment }) {
  const [open, setOpen] = useState(false);
  return <><button type="button" onClick={() => setOpen(true)} aria-label={`Preview ${att.filename}`} className="inline-flex max-w-full items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-left text-xs text-white/70 hover:border-sky-400/40 hover:bg-sky-400/10 hover:text-white">
    <span aria-hidden="true">📎</span><span className="max-w-60 truncate">{att.filename}</span><span className="shrink-0 text-white/40">{(att.size / 1024).toFixed(0)} KB</span>
  </button>{open && <AttachmentPreview messageId={messageId} attachment={att} onClose={() => setOpen(false)} />}</>;
}
