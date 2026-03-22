"use client";

import { useState, useEffect, useRef } from "react";
import { DateTime } from "luxon";
import DocEditorModal, { detectType } from "@/components/admin/drive/DocEditorModal";

type DriveFile = {
  id: string;
  name: string;
  mimeType: string;
  size?: number;
  modifiedTime: string;
  thumbnailLink?: string;
  webViewLink?: string;
  webContentLink?: string;
  parents?: string[];
  isFolder: boolean;
  iconLink?: string;
};

type Breadcrumb = { id: string | null; name: string };

function formatSize(bytes?: number): string {
  if (bytes === undefined || bytes === null) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FolderIcon() {
  return (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" className="text-sky-400">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
    </svg>
  );
}

function ImageIcon() {
  return (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" className="text-white/30">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
    </svg>
  );
}

function DocIcon() {
  return (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" className="text-white/30">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" className="text-white/30">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
    </svg>
  );
}

function getFileIcon(file: DriveFile) {
  if (file.isFolder) return <FolderIcon />;
  if (file.mimeType.startsWith("image/")) return <ImageIcon />;
  if (
    file.mimeType.includes("document") ||
    file.mimeType.includes("pdf") ||
    file.mimeType.includes("text") ||
    file.mimeType.includes("spreadsheet") ||
    file.mimeType.includes("presentation")
  )
    return <DocIcon />;
  return <FileIcon />;
}

export default function DriveClient() {
  const [folderId, setFolderId] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([{ id: null, name: "My Drive" }]);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [nextPageToken, setNextPageToken] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newFolderMode, setNewFolderMode] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [creatingDoc, setCreatingDoc] = useState(false);
  const [creatingSheet, setCreatingSheet] = useState(false);
  const [editor, setEditor] = useState<{ fileId: string; fileName: string; mimeType: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function fetchFiles(folderIdParam: string | null, pageToken?: string, append = false) {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (folderIdParam) params.set("folderId", folderIdParam);
      if (pageToken) params.set("pageToken", pageToken);
      const res = await fetch(`/api/admin/drive/files?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load files");
      const data = await res.json();
      setFiles((prev) => (append ? [...prev, ...data.files] : data.files));
      setNextPageToken(data.nextPageToken);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchFiles(folderId);
  }, [folderId]);

  function navigateToFolder(file: DriveFile) {
    setBreadcrumbs((prev) => [...prev, { id: file.id, name: file.name }]);
    setFolderId(file.id);
  }

  function navigateToCrumb(crumb: Breadcrumb, index: number) {
    setBreadcrumbs((prev) => prev.slice(0, index + 1));
    setFolderId(crumb.id);
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (folderId) formData.append("folderId", folderId);
      const res = await fetch("/api/admin/drive/files", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload failed");
      await fetchFiles(folderId);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleCreateFolder() {
    if (!newFolderName.trim()) return;
    setCreatingFolder(true);
    try {
      const res = await fetch("/api/admin/drive/folder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newFolderName.trim(), parentId: folderId ?? undefined }),
      });
      if (!res.ok) throw new Error("Failed to create folder");
      setNewFolderMode(false);
      setNewFolderName("");
      await fetchFiles(folderId);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setCreatingFolder(false);
    }
  }

  async function handleDelete(file: DriveFile) {
    if (!confirm(`Delete "${file.name}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/admin/drive/files/${file.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      setFiles((prev) => prev.filter((f) => f.id !== file.id));
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function handleCreateDoc(type: "doc" | "sheet") {
    const setter = type === "doc" ? setCreatingDoc : setCreatingSheet;
    setter(true);
    try {
      const res = await fetch("/api/admin/drive/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, folderId: folderId ?? undefined }),
      });
      if (!res.ok) throw new Error("Failed to create");
      const file = await res.json() as DriveFile;
      setFiles((prev) => [file, ...prev]);
      setEditor({ fileId: file.id, fileName: file.name, mimeType: file.mimeType });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setter(false);
    }
  }

  function openFile(file: DriveFile) {
    const isGoogleDoc = file.mimeType.includes("document") || file.mimeType.includes("spreadsheet");
    if (isGoogleDoc) {
      setEditor({ fileId: file.id, fileName: file.name, mimeType: file.mimeType });
    } else if (file.webViewLink) {
      window.open(file.webViewLink, "_blank");
    }
  }

  return (
    <div>
      {/* Modal */}
      {editor && (
        <DocEditorModal
          fileId={editor.fileId}
          fileName={editor.fileName}
          fileType={detectType(editor.mimeType)}
          onClose={() => setEditor(null)}
          onRename={(newName) =>
            setFiles((prev) =>
              prev.map((f) => (f.id === editor.fileId ? { ...f, name: newName } : f))
            )
          }
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <h1 className="text-2xl font-semibold text-white">My Drive</h1>
        <div className="flex items-center gap-2 flex-wrap">
          {/* New Doc */}
          <button
            onClick={() => handleCreateDoc("doc")}
            disabled={creatingDoc}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm text-blue-300 hover:text-white bg-blue-500/10 hover:bg-blue-500/20 transition-colors border border-blue-500/20 disabled:opacity-50"
          >
            <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            {creatingDoc ? "Creating…" : "New Doc"}
          </button>
          {/* New Sheet */}
          <button
            onClick={() => handleCreateDoc("sheet")}
            disabled={creatingSheet}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm text-green-300 hover:text-white bg-green-500/10 hover:bg-green-500/20 transition-colors border border-green-500/20 disabled:opacity-50"
          >
            <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m-3.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-1.5A1.125 1.125 0 0118 18.375M20.625 4.5H3.375m17.25 0c.621 0 1.125.504 1.125 1.125M20.625 4.5h-1.5C18.504 4.5 18 5.004 18 5.625m3.75 0v1.5c0 .621-.504 1.125-1.125 1.125M3.375 4.5c-.621 0-1.125.504-1.125 1.125M3.375 4.5h1.5C5.496 4.5 6 5.004 6 5.625m-3.75 0v1.5c0 .621.504 1.125 1.125 1.125m0 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m1.5-3.75C5.496 8.25 6 7.746 6 7.125v-1.5M4.875 8.25C5.496 8.25 6 8.754 6 9.375v1.5m0-5.25v5.25m0-5.25C6 5.004 6.504 4.5 7.125 4.5h9.75c.621 0 1.125.504 1.125 1.125m1.125 2.625h1.5m-1.5 0A1.125 1.125 0 0118 7.125v-1.5m1.125 2.625c-.621 0-1.125.504-1.125 1.125v1.5m2.625-2.625c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125M18 5.625v5.25M7.125 12h9.75m-9.75 0A1.125 1.125 0 016 10.875M7.125 12C6.504 12 6 12.504 6 13.125m0-2.25C6 11.496 5.496 12 4.875 12M18 10.875c0 .621-.504 1.125-1.125 1.125M18 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-12 5.25v-5.25m0 5.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125m-12 0v-1.5c0-.621.504-1.125 1.125-1.125M18 18.375v-5.25m0 5.25v-1.5c0-.621-.504-1.125-1.125-1.125M18 13.125v1.5c0 .621.504 1.125 1.125 1.125M18 13.125c0-.621.504-1.125 1.125-1.125M6 13.125v1.5c0 .621-.504 1.125-1.125 1.125M4.875 14.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m0-3.75h1.5m-1.5 3.75h1.5" />
            </svg>
            {creatingSheet ? "Creating…" : "New Sheet"}
          </button>
          {/* New Folder */}
          <button
            onClick={() => setNewFolderMode(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm text-white/60 hover:text-white bg-white/5 hover:bg-white/10 transition-colors border border-white/8"
          >
            <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10.5v6m3-3H9m4.06-7.19l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
            </svg>
            New Folder
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm text-white bg-sky-500 hover:bg-sky-400 disabled:opacity-50 transition-colors"
          >
            <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            {uploading ? "Uploading…" : "Upload"}
          </button>
          <input ref={fileInputRef} type="file" className="hidden" onChange={handleUpload} />
        </div>
      </div>

      {/* New folder input */}
      {newFolderMode && (
        <div className="flex items-center gap-2 mb-4">
          <input
            autoFocus
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreateFolder();
              if (e.key === "Escape") { setNewFolderMode(false); setNewFolderName(""); }
            }}
            placeholder="Folder name"
            className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/30 outline-none focus:border-sky-500/50 w-56"
          />
          <button
            onClick={handleCreateFolder}
            disabled={creatingFolder || !newFolderName.trim()}
            className="px-3 py-2 rounded-xl text-sm text-white bg-sky-500 hover:bg-sky-400 disabled:opacity-50 transition-colors"
          >
            {creatingFolder ? "Creating…" : "Create"}
          </button>
          <button
            onClick={() => { setNewFolderMode(false); setNewFolderName(""); }}
            className="px-3 py-2 rounded-xl text-sm text-white/50 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Breadcrumbs */}
      <div className="flex items-center gap-1 mb-4 flex-wrap">
        {breadcrumbs.map((crumb, i) => (
          <div key={i} className="flex items-center gap-1">
            {i > 0 && <span className="text-white/20 text-sm">/</span>}
            <button
              onClick={() => navigateToCrumb(crumb, i)}
              className={`text-sm px-1.5 py-0.5 rounded transition-colors ${
                i === breadcrumbs.length - 1
                  ? "text-white/70 cursor-default"
                  : "text-sky-400 hover:text-sky-300 hover:bg-sky-500/10"
              }`}
              disabled={i === breadcrumbs.length - 1}
            >
              {crumb.name}
            </button>
          </div>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* File list */}
      <div className="bg-white/3 border border-white/8 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
        {/* Table header */}
        <div className="grid grid-cols-[auto_1fr_100px_160px_80px] gap-0 px-4 py-2 border-b border-white/8 min-w-[520px]">
          <div className="w-7" />
          <div className="text-xs text-white/30 uppercase tracking-wider">Name</div>
          <div className="text-xs text-white/30 uppercase tracking-wider text-right">Size</div>
          <div className="text-xs text-white/30 uppercase tracking-wider">Modified</div>
          <div className="text-xs text-white/30 uppercase tracking-wider text-right">Actions</div>
        </div>

        {loading ? (
          <div className="px-4 py-8 space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-9 rounded-lg bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : files.length === 0 ? (
          <div className="px-4 py-12 text-center text-white/30 text-sm">
            This folder is empty
          </div>
        ) : (
          <div className="min-w-[520px]">
            {files.map((file) => (
              <div
                key={file.id}
                className="grid grid-cols-[auto_1fr_100px_160px_80px] gap-0 px-4 py-2.5 border-b border-white/5 last:border-0 hover:bg-white/3 group transition-colors"
              >
                <div className="w-7 flex items-center">{getFileIcon(file)}</div>
                <div className="flex items-center min-w-0">
                  {file.isFolder ? (
                    <button
                      onClick={() => navigateToFolder(file)}
                      className="text-sm text-white/80 hover:text-sky-400 transition-colors truncate text-left"
                    >
                      {file.name}
                    </button>
                  ) : (
                    <button
                      onClick={() => openFile(file)}
                      className={`text-sm transition-colors truncate text-left ${
                        file.mimeType.includes("document")
                          ? "text-blue-300 hover:text-blue-100"
                          : file.mimeType.includes("spreadsheet")
                          ? "text-green-300 hover:text-green-100"
                          : "text-white/80 hover:text-white"
                      }`}
                    >
                      {file.name}
                    </button>
                  )}
                </div>
                <div className="flex items-center justify-end">
                  <span className="text-xs text-white/30">{formatSize(file.size)}</span>
                </div>
                <div className="flex items-center">
                  <span className="text-xs text-white/30">
                    {file.modifiedTime
                      ? DateTime.fromISO(file.modifiedTime).toFormat("MMM d, yyyy")
                      : "—"}
                  </span>
                </div>
                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {file.webViewLink && (
                    <a
                      href={file.webViewLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 rounded text-white/40 hover:text-white transition-colors"
                      title="Open"
                    >
                      <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                      </svg>
                    </a>
                  )}
                  <button
                    onClick={() => handleDelete(file)}
                    className="p-1 rounded text-white/40 hover:text-red-400 transition-colors"
                    title="Delete"
                  >
                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        </div>{/* /overflow-x-auto */}
      </div>

      {/* Load more */}
      {nextPageToken && !loading && (
        <div className="mt-4 flex justify-center">
          <button
            onClick={() => fetchFiles(folderId, nextPageToken, true)}
            className="px-4 py-2 rounded-xl text-sm text-white/60 hover:text-white bg-white/5 hover:bg-white/10 border border-white/8 transition-colors"
          >
            Load more
          </button>
        </div>
      )}
    </div>
  );
}
