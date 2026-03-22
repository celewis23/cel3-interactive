"use client";

import { useState, useRef, useEffect } from "react";

type FileType = "doc" | "sheet" | "other";

interface Props {
  fileId: string;
  fileName: string;
  fileType: FileType;
  onClose: () => void;
  onRename?: (newName: string) => void;
}

function detectType(mimeType: string): FileType {
  if (mimeType.includes("document")) return "doc";
  if (mimeType.includes("spreadsheet")) return "sheet";
  return "other";
}

export { detectType };

const EMBED_BASE: Record<FileType, string> = {
  doc:   "https://docs.google.com/document/d",
  sheet: "https://docs.google.com/spreadsheets/d",
  other: "https://drive.google.com/file/d",
};

const DOWNLOAD_FORMATS: Record<FileType, { label: string; format: string }[]> = {
  doc: [
    { label: "PDF (.pdf)",  format: "pdf" },
    { label: "Word (.docx)", format: "docx" },
    { label: "Plain text (.txt)", format: "txt" },
  ],
  sheet: [
    { label: "PDF (.pdf)",   format: "pdf" },
    { label: "Excel (.xlsx)", format: "xlsx" },
    { label: "CSV (.csv)",   format: "csv" },
  ],
  other: [
    { label: "PDF (.pdf)", format: "pdf" },
  ],
};

export default function DocEditorModal({ fileId, fileName, fileType, onClose, onRename }: Props) {
  const [name, setName] = useState(fileName);
  const [editingName, setEditingName] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [showDownload, setShowDownload] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [iframeError, setIframeError] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const downloadRef = useRef<HTMLDivElement>(null);

  const embedUrl =
    fileType === "other"
      ? `${EMBED_BASE[fileType]}/${fileId}/preview`
      : `${EMBED_BASE[fileType]}/${fileId}/edit?rm=minimal`;

  const openUrl =
    fileType === "other"
      ? `${EMBED_BASE.doc.replace("document/d", "file/d")}/${fileId}/view`
      : `${EMBED_BASE[fileType]}/${fileId}/edit`;

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (downloadRef.current && !downloadRef.current.contains(e.target as Node)) {
        setShowDownload(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Focus name input when editing
  useEffect(() => {
    if (editingName) nameInputRef.current?.select();
  }, [editingName]);

  async function handleRename() {
    if (!name.trim() || name.trim() === fileName) {
      setEditingName(false);
      setName(fileName);
      return;
    }
    setRenaming(true);
    try {
      const res = await fetch(`/api/admin/drive/rename/${fileId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (res.ok) {
        onRename?.(name.trim());
      }
    } finally {
      setRenaming(false);
      setEditingName(false);
    }
  }

  async function handleDownload(format: string) {
    setDownloading(format);
    setShowDownload(false);
    try {
      const res = await fetch(`/api/admin/drive/export/${fileId}?format=${format}`);
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const cd = res.headers.get("Content-Disposition") ?? "";
      const match = cd.match(/filename="(.+?)"/);
      a.download = match?.[1] ?? `${name}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Download failed. Try opening in Google to download directly.");
    } finally {
      setDownloading(null);
    }
  }

  const typeLabel = fileType === "doc" ? "Doc" : fileType === "sheet" ? "Sheet" : "File";
  const typeColor = fileType === "doc" ? "text-blue-400" : fileType === "sheet" ? "text-green-400" : "text-white/40";
  const formats = DOWNLOAD_FORMATS[fileType];

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-[#0a0a0a]">
      {/* ── Toolbar ─────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-white/8 bg-[#0f0f0f] flex-shrink-0">
        {/* File type badge */}
        <span className={`text-xs font-bold uppercase tracking-widest flex-shrink-0 ${typeColor}`}>
          {typeLabel}
        </span>

        {/* File name */}
        <div className="flex-1 min-w-0">
          {editingName ? (
            <input
              ref={nameInputRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={handleRename}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRename();
                if (e.key === "Escape") { setName(fileName); setEditingName(false); }
              }}
              className="w-full bg-white/5 border border-sky-500/50 rounded-lg px-2 py-1 text-sm text-white outline-none"
              disabled={renaming}
            />
          ) : (
            <button
              onClick={() => setEditingName(true)}
              className="text-sm font-medium text-white hover:text-sky-300 transition-colors truncate max-w-full text-left"
              title="Click to rename"
            >
              {name}
            </button>
          )}
        </div>

        {/* Auto-save note */}
        <span className="text-xs text-white/25 flex-shrink-0 hidden sm:block">Auto-saved to Drive</span>

        {/* Download dropdown */}
        <div className="relative flex-shrink-0" ref={downloadRef}>
          <button
            onClick={() => setShowDownload((v) => !v)}
            disabled={!!downloading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-white/70 hover:text-white bg-white/5 hover:bg-white/10 border border-white/8 transition-colors"
          >
            {downloading ? (
              <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeOpacity=".25"/>
                <path d="M21 12a9 9 0 00-9-9" strokeLinecap="round"/>
              </svg>
            ) : (
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
            )}
            Download
            <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </button>
          {showDownload && (
            <div className="absolute right-0 top-full mt-1.5 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl py-1 min-w-[180px] z-10">
              {formats.map((f) => (
                <button
                  key={f.format}
                  onClick={() => handleDownload(f.format)}
                  className="w-full text-left px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Open in Google */}
        <a
          href={openUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-white/70 hover:text-white bg-white/5 hover:bg-white/10 border border-white/8 transition-colors"
          title="Open in Google"
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
          </svg>
          <span className="hidden sm:inline">Open in Google</span>
        </a>

        {/* Close */}
        <button
          onClick={onClose}
          className="flex-shrink-0 p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors"
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* ── Editor iframe ───────────────────────────────────── */}
      <div className="flex-1 relative bg-white">
        {iframeError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#0a0a0a] text-center px-8">
            <svg width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24" className="text-white/20">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            <div>
              <p className="text-white/60 text-sm mb-1">Couldn't load the embedded editor.</p>
              <p className="text-white/30 text-xs mb-4">Your browser or Google settings may block embedded editors.</p>
              <a
                href={openUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-white bg-sky-500 hover:bg-sky-400 transition-colors"
              >
                Open in Google
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                </svg>
              </a>
            </div>
          </div>
        ) : (
          <iframe
            key={fileId}
            src={embedUrl}
            className="w-full h-full border-0"
            title={name}
            allow="clipboard-read; clipboard-write"
            onError={() => setIframeError(true)}
          />
        )}
      </div>
    </div>
  );
}
