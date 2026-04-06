"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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

function isGoogleNative(mimeType: string) {
  return mimeType.includes("google-apps") &&
    !mimeType.includes("folder") &&
    !mimeType.includes("shortcut");
}

async function uploadDriveFileDirect(params: {
  accessToken: string;
  file: File;
  folderId?: string | null;
}): Promise<DriveFile> {
  const initRes = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true&fields=id,name,mimeType,size,modifiedTime,thumbnailLink,webViewLink,webContentLink,parents,iconLink",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${params.accessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Type": params.file.type || "application/octet-stream",
        "X-Upload-Content-Length": String(params.file.size),
      },
      body: JSON.stringify({
        name: params.file.name,
        parents: params.folderId ? [params.folderId] : undefined,
      }),
    }
  );

  if (!initRes.ok) {
    const data = await initRes.json().catch(() => ({}));
    const message =
      (data as { error?: { message?: string } }).error?.message ??
      "Failed to start Drive upload";
    throw new Error(message);
  }

  const uploadUrl = initRes.headers.get("Location");
  if (!uploadUrl) {
    throw new Error("Drive upload session did not return an upload URL");
  }

  const uploadRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": params.file.type || "application/octet-stream",
    },
    body: params.file,
  });

  if (!uploadRes.ok) {
    const data = await uploadRes.json().catch(() => ({}));
    const message =
      (data as { error?: { message?: string } }).error?.message ??
      "Drive upload failed";
    throw new Error(message);
  }

  const uploaded = await uploadRes.json();
  return {
    id: uploaded.id ?? "",
    name: uploaded.name ?? params.file.name,
    mimeType: uploaded.mimeType ?? params.file.type ?? "application/octet-stream",
    size: uploaded.size ? parseInt(String(uploaded.size), 10) : params.file.size,
    modifiedTime: uploaded.modifiedTime ?? new Date().toISOString(),
    thumbnailLink: uploaded.thumbnailLink ?? undefined,
    webViewLink: uploaded.webViewLink ?? undefined,
    webContentLink: uploaded.webContentLink ?? undefined,
    parents: uploaded.parents ?? undefined,
    isFolder: uploaded.mimeType === "application/vnd.google-apps.folder",
    iconLink: uploaded.iconLink ?? undefined,
  };
}

function FolderIcon({ className = "text-sky-400" }: { className?: string }) {
  return (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
    </svg>
  );
}

function getFileIcon(file: DriveFile) {
  if (file.isFolder) {
    return <FolderIcon />;
  }
  if (file.mimeType.includes("document")) {
    return (
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" className="text-blue-400">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    );
  }
  if (file.mimeType.includes("spreadsheet")) {
    return (
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" className="text-green-400">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0112 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h1.5m-1.5 0c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h17.25" />
      </svg>
    );
  }
  if (file.mimeType.startsWith("image/")) {
    return (
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" className="text-white/40">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
      </svg>
    );
  }
  return (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" className="text-white/30">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25" />
    </svg>
  );
}

// ── Folder Picker Modal ────────────────────────────────────────────────────────

interface FolderPickerProps {
  title: string;
  onConfirm: (folderId: string, folderName: string) => void;
  onClose: () => void;
  excludeId?: string;
}

function FolderPickerModal({ title, onConfirm, onClose, excludeId }: FolderPickerProps) {
  const [folderId,    setFolderId]    = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([{ id: null, name: "My Drive" }]);
  const [folders,     setFolders]     = useState<DriveFile[]>([]);
  const [loading,     setLoading]     = useState(true);

  const load = useCallback(async (id: string | null) => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ foldersOnly: "true" });
      if (id) p.set("folderId", id);
      const res = await fetch(`/api/admin/drive/files?${p}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setFolders((data.files as DriveFile[]).filter((f) => f.id !== excludeId));
    } finally { setLoading(false); }
  }, [excludeId]);

  useEffect(() => { load(null); }, [load]);

  function enterFolder(folder: DriveFile) {
    setBreadcrumbs((prev) => [...prev, { id: folder.id, name: folder.name }]);
    setFolderId(folder.id);
    load(folder.id);
  }

  function navToCrumb(crumb: Breadcrumb, idx: number) {
    setBreadcrumbs((prev) => prev.slice(0, idx + 1));
    setFolderId(crumb.id);
    load(crumb.id);
  }

  const currentName = breadcrumbs[breadcrumbs.length - 1].name;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/70">
      <div className="w-full max-w-sm bg-[#111] border border-white/10 rounded-2xl flex flex-col max-h-[70vh] overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8 flex-shrink-0">
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          <button onClick={onClose} className="p-1 rounded text-white/30 hover:text-white transition-colors">
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Breadcrumbs */}
        <div className="flex items-center gap-1 px-4 py-2 border-b border-white/5 flex-shrink-0 flex-wrap">
          {breadcrumbs.map((crumb, i) => (
            <div key={i} className="flex items-center gap-1">
              {i > 0 && <span className="text-white/20 text-xs">/</span>}
              <button onClick={() => navToCrumb(crumb, i)}
                className={`text-xs px-1 py-0.5 rounded transition-colors ${i === breadcrumbs.length - 1 ? "text-white/50 cursor-default" : "text-sky-400 hover:text-sky-300"}`}
                disabled={i === breadcrumbs.length - 1}>
                {crumb.name}
              </button>
            </div>
          ))}
        </div>

        {/* Folder list */}
        <div className="flex-1 overflow-y-auto py-1">
          {loading ? (
            <div className="py-6 text-center text-white/25 text-xs">Loading…</div>
          ) : folders.length === 0 ? (
            <div className="py-6 text-center text-white/25 text-xs">No subfolders</div>
          ) : (
            folders.map((f) => (
              <button key={f.id} onClick={() => enterFolder(f)}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors text-left group">
                <FolderIcon className="text-sky-400 flex-shrink-0" />
                <span className="text-sm text-white/70 group-hover:text-white truncate">{f.name}</span>
                <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="ml-auto text-white/20 flex-shrink-0">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 px-4 py-3 border-t border-white/8 flex-shrink-0">
          <button onClick={onClose} className="flex-1 py-2 rounded-xl border border-white/10 text-sm text-white/50 hover:text-white transition-colors">
            Cancel
          </button>
          <button onClick={() => onConfirm(folderId ?? "root", currentName)}
            className="flex-1 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-black text-sm font-semibold transition-colors">
            Move here
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function DriveClient() {
  const [folderId,     setFolderId]     = useState<string | null>(null);
  const [breadcrumbs,  setBreadcrumbs]  = useState<Breadcrumb[]>([{ id: null, name: "My Drive" }]);
  const [files,        setFiles]        = useState<DriveFile[]>([]);
  const [nextPageToken, setNextPageToken] = useState<string | undefined>();
  const [loading,      setLoading]      = useState(true);
  const [uploading,    setUploading]    = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const [newFolderMode, setNewFolderMode] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [creatingDoc,  setCreatingDoc]  = useState(false);
  const [creatingSheet, setCreatingSheet] = useState(false);
  const [editor,       setEditor]       = useState<{ fileId: string; fileName: string; mimeType: string } | null>(null);

  // Selection
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Rename inline
  const [renamingId,   setRenamingId]   = useState<string | null>(null);
  const [renameValue,  setRenameValue]  = useState("");
  const [renaming,     setRenaming]     = useState(false);

  // Move modal
  const [moveModal,    setMoveModal]    = useState<{ files: DriveFile[] } | null>(null);

  // Action dropdown
  const [actionMenu,   setActionMenu]   = useState<{ file: DriveFile; x: number; y: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Search
  const [searchQuery,  setSearchQuery]  = useState("");
  const [searching,    setSearching]    = useState(false);
  const [isSearchMode, setIsSearchMode] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Fetch ────────────────────────────────────────────────────────────────────

  async function fetchFiles(folderIdParam: string | null, pageToken?: string, append = false) {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (folderIdParam) params.set("folderId", folderIdParam);
      if (pageToken) params.set("pageToken", pageToken);
      const res = await fetch(`/api/admin/drive/files?${params}`);
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

  async function doSearch(q: string) {
    if (!q.trim()) { setIsSearchMode(false); fetchFiles(folderId); return; }
    setSearching(true);
    setIsSearchMode(true);
    try {
      const res = await fetch(`/api/admin/drive/files?q=${encodeURIComponent(q.trim())}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setFiles(data.files);
      setNextPageToken(data.nextPageToken);
    } catch {
      setError("Search failed");
    } finally {
      setSearching(false);
      setLoading(false);
    }
  }

  useEffect(() => { fetchFiles(folderId); }, [folderId]);

  // Debounce search
  function handleSearchChange(q: string) {
    setSearchQuery(q);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (!q.trim()) { setIsSearchMode(false); fetchFiles(folderId); return; }
    searchTimeout.current = setTimeout(() => doSearch(q), 400);
  }

  function clearSearch() {
    setSearchQuery(""); setIsSearchMode(false); fetchFiles(folderId);
  }

  // ── Close menu on outside click ───────────────────────────────────────────────

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActionMenu(null);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Navigation ───────────────────────────────────────────────────────────────

  function navigateToFolder(file: DriveFile) {
    setBreadcrumbs((prev) => [...prev, { id: file.id, name: file.name }]);
    setFolderId(file.id);
    setSelected(new Set());
    setSearchQuery(""); setIsSearchMode(false);
  }

  function navigateToCrumb(crumb: Breadcrumb, index: number) {
    setBreadcrumbs((prev) => prev.slice(0, index + 1));
    setFolderId(crumb.id);
    setSelected(new Set());
    setSearchQuery(""); setIsSearchMode(false);
  }

  // ── Selection ────────────────────────────────────────────────────────────────

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelected(files.every((f) => selected.has(f.id)) ? new Set() : new Set(files.map((f) => f.id)));
  }

  // ── Upload ───────────────────────────────────────────────────────────────────

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const configRes = await fetch("/api/admin/drive/config");
      const config = await configRes.json().catch(() => ({}));
      if (!configRes.ok || !config.accessToken) {
        throw new Error("Google Drive is not connected. Reconnect Google and try again.");
      }

      await uploadDriveFileDirect({
        accessToken: config.accessToken as string,
        file,
        folderId,
      });
      await fetchFiles(folderId);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  // ── Create folder ─────────────────────────────────────────────────────────────

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
      setNewFolderMode(false); setNewFolderName("");
      await fetchFiles(folderId);
    } catch (e) {
      setError((e as Error).message);
    } finally { setCreatingFolder(false); }
  }

  // ── Delete ───────────────────────────────────────────────────────────────────

  async function handleDelete(file: DriveFile) {
    setActionMenu(null);
    if (!confirm(`Delete "${file.name}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/admin/drive/files/${file.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      setFiles((prev) => prev.filter((f) => f.id !== file.id));
      setSelected((prev) => { const n = new Set(prev); n.delete(file.id); return n; });
    } catch (e) { setError((e as Error).message); }
  }

  async function handleBulkDelete() {
    if (!confirm(`Delete ${selected.size} item${selected.size > 1 ? "s" : ""}? This cannot be undone.`)) return;
    const ids = [...selected];
    for (const id of ids) {
      try {
        await fetch(`/api/admin/drive/files/${id}`, { method: "DELETE" });
        setFiles((prev) => prev.filter((f) => f.id !== id));
      } catch { /* continue */ }
    }
    setSelected(new Set());
  }

  // ── Rename ───────────────────────────────────────────────────────────────────

  function startRename(file: DriveFile) {
    setActionMenu(null);
    setRenamingId(file.id);
    setRenameValue(file.name);
  }

  async function commitRename(file: DriveFile) {
    if (!renameValue.trim() || renameValue.trim() === file.name) {
      setRenamingId(null); return;
    }
    setRenaming(true);
    try {
      const res = await fetch(`/api/admin/drive/rename/${file.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: renameValue.trim() }),
      });
      if (res.ok) setFiles((prev) => prev.map((f) => f.id === file.id ? { ...f, name: renameValue.trim() } : f));
    } finally { setRenaming(false); setRenamingId(null); }
  }

  // ── Move ─────────────────────────────────────────────────────────────────────

  function openMoveModal(filesToMove: DriveFile[]) {
    setActionMenu(null);
    setMoveModal({ files: filesToMove });
  }

  async function confirmMove(newParentId: string) {
    if (!moveModal) return;
    const filesToMove = moveModal.files;
    setMoveModal(null);

    for (const file of filesToMove) {
      const oldParentId = file.parents?.[0] ?? folderId ?? "root";
      try {
        const res = await fetch(`/api/admin/drive/files/${file.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ newParentId, oldParentId }),
        });
        if (res.ok) {
          setFiles((prev) => prev.filter((f) => f.id !== file.id));
          setSelected((prev) => { const n = new Set(prev); n.delete(file.id); return n; });
        }
      } catch { /* continue */ }
    }
  }

  // ── Copy ─────────────────────────────────────────────────────────────────────

  async function handleCopy(file: DriveFile) {
    setActionMenu(null);
    try {
      const res = await fetch(`/api/admin/drive/copy/${file.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parentId: folderId ?? undefined }),
      });
      if (!res.ok) throw new Error();
      const copy = await res.json() as DriveFile;
      setFiles((prev) => [copy, ...prev]);
    } catch { setError("Copy failed"); }
  }

  // ── Download ─────────────────────────────────────────────────────────────────

  async function handleDownload(file: DriveFile) {
    setActionMenu(null);
    try {
      const a = document.createElement("a");
      a.href = `/api/admin/drive/download/${file.id}`;
      a.download = file.name;
      a.click();
    } catch { setError("Download failed"); }
  }

  // ── Create Doc/Sheet ──────────────────────────────────────────────────────────

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
    } catch (e) { setError((e as Error).message); }
    finally { setter(false); }
  }

  function openFile(file: DriveFile) {
    const isGoogleDoc = file.mimeType.includes("document") || file.mimeType.includes("spreadsheet");
    if (isGoogleDoc) setEditor({ fileId: file.id, fileName: file.name, mimeType: file.mimeType });
    else if (file.webViewLink) window.open(file.webViewLink, "_blank");
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  const allSelected = files.length > 0 && files.every((f) => selected.has(f.id));
  const selectedFiles = files.filter((f) => selected.has(f.id));

  return (
    <div>
      {/* Modals */}
      {editor && (
        <DocEditorModal
          fileId={editor.fileId}
          fileName={editor.fileName}
          fileType={detectType(editor.mimeType)}
          onClose={() => setEditor(null)}
          onRename={(newName) => setFiles((prev) => prev.map((f) => f.id === editor.fileId ? { ...f, name: newName } : f))}
        />
      )}

      {moveModal && (
        <FolderPickerModal
          title={`Move ${moveModal.files.length === 1 ? `"${moveModal.files[0].name}"` : `${moveModal.files.length} items`}`}
          onConfirm={(id) => confirmMove(id)}
          onClose={() => setMoveModal(null)}
          excludeId={moveModal.files.length === 1 && moveModal.files[0].isFolder ? moveModal.files[0].id : undefined}
        />
      )}

      {/* Action dropdown */}
      {actionMenu && (
        <div
          ref={menuRef}
          className="fixed z-50 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl py-1 min-w-[160px]"
          style={{ top: actionMenu.y, left: actionMenu.x }}
        >
          <button onClick={() => startRename(actionMenu.file)}
            className="w-full text-left px-4 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5 flex items-center gap-2.5">
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931" /></svg>
            Rename
          </button>
          <button onClick={() => openMoveModal([actionMenu.file])}
            className="w-full text-left px-4 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5 flex items-center gap-2.5">
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 011.037-.443 48.282 48.282 0 005.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" /></svg>
            Move to
          </button>
          {!actionMenu.file.isFolder && (
            <button onClick={() => handleCopy(actionMenu.file)}
              className="w-full text-left px-4 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5 flex items-center gap-2.5">
              <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" /></svg>
              Make a copy
            </button>
          )}
          {!actionMenu.file.isFolder && !isGoogleNative(actionMenu.file.mimeType) && (
            <button onClick={() => handleDownload(actionMenu.file)}
              className="w-full text-left px-4 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5 flex items-center gap-2.5">
              <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
              Download
            </button>
          )}
          {actionMenu.file.webViewLink && (
            <a href={actionMenu.file.webViewLink} target="_blank" rel="noopener noreferrer"
              onClick={() => setActionMenu(null)}
              className="w-full text-left px-4 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5 flex items-center gap-2.5">
              <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" /></svg>
              Open in Google
            </a>
          )}
          <div className="my-1 border-t border-white/8" />
          <button onClick={() => handleDelete(actionMenu.file)}
            className="w-full text-left px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 flex items-center gap-2.5">
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
            Delete
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-5 flex-wrap">
        <h1 className="text-2xl font-semibold text-white">My Drive</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => handleCreateDoc("doc")} disabled={creatingDoc}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm text-blue-300 hover:text-white bg-blue-500/10 hover:bg-blue-500/20 transition-colors border border-blue-500/20 disabled:opacity-50">
            {creatingDoc ? "Creating…" : "New Doc"}
          </button>
          <button onClick={() => handleCreateDoc("sheet")} disabled={creatingSheet}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm text-green-300 hover:text-white bg-green-500/10 hover:bg-green-500/20 transition-colors border border-green-500/20 disabled:opacity-50">
            {creatingSheet ? "Creating…" : "New Sheet"}
          </button>
          <button onClick={() => setNewFolderMode(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm text-white/60 hover:text-white bg-white/5 hover:bg-white/10 transition-colors border border-white/8">
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10.5v6m3-3H9m4.06-7.19l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
            </svg>
            New Folder
          </button>
          <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm text-white bg-sky-500 hover:bg-sky-400 disabled:opacity-50 transition-colors">
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            {uploading ? "Uploading…" : "Upload"}
          </button>
          <input ref={fileInputRef} type="file" className="hidden" onChange={handleUpload} />
        </div>
      </div>

      {/* Search bar */}
      <div className="relative mb-4">
        <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"
          className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Search Drive…"
          className="w-full pl-9 pr-8 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-white/30 outline-none focus:border-sky-500/50 transition-colors"
        />
        {searchQuery && (
          <button onClick={clearSearch}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors">
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* New folder input */}
      {newFolderMode && (
        <div className="flex items-center gap-2 mb-4">
          <input autoFocus value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleCreateFolder(); if (e.key === "Escape") { setNewFolderMode(false); setNewFolderName(""); } }}
            placeholder="Folder name"
            className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/30 outline-none focus:border-sky-500/50 w-56" />
          <button onClick={handleCreateFolder} disabled={creatingFolder || !newFolderName.trim()}
            className="px-3 py-2 rounded-xl text-sm text-white bg-sky-500 hover:bg-sky-400 disabled:opacity-50 transition-colors">
            {creatingFolder ? "Creating…" : "Create"}
          </button>
          <button onClick={() => { setNewFolderMode(false); setNewFolderName(""); }}
            className="px-3 py-2 rounded-xl text-sm text-white/50 hover:text-white bg-white/5 hover:bg-white/10 transition-colors">
            Cancel
          </button>
        </div>
      )}

      {/* Breadcrumbs / Search status */}
      {isSearchMode ? (
        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm text-white/40">
            {searching ? "Searching…" : `Results for "${searchQuery}"`}
          </span>
          <button onClick={clearSearch} className="text-xs text-sky-400 hover:text-sky-300 transition-colors">
            Clear search
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-1 mb-4 flex-wrap">
          {breadcrumbs.map((crumb, i) => (
            <div key={i} className="flex items-center gap-1">
              {i > 0 && <span className="text-white/20 text-sm">/</span>}
              <button onClick={() => navigateToCrumb(crumb, i)}
                className={`text-sm px-1.5 py-0.5 rounded transition-colors ${i === breadcrumbs.length - 1 ? "text-white/70 cursor-default" : "text-sky-400 hover:text-sky-300 hover:bg-sky-500/10"}`}
                disabled={i === breadcrumbs.length - 1}>
                {crumb.name}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-sky-500/10 border border-sky-500/20 rounded-xl">
          <span className="text-sm text-sky-300 font-medium">{selected.size} selected</span>
          <div className="flex-1" />
          <button onClick={() => openMoveModal(selectedFiles)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-white/70 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors">
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 011.037-.443 48.282 48.282 0 005.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
            </svg>
            Move
          </button>
          <button onClick={handleBulkDelete}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-colors">
            <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
            </svg>
            Delete
          </button>
          <button onClick={() => setSelected(new Set())} className="text-xs text-white/30 hover:text-white transition-colors ml-1">
            Deselect
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-center justify-between">
          {error}
          <button onClick={() => setError(null)} className="text-red-400/60 hover:text-red-300 transition-colors">
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      )}

      {/* File list */}
      <div className="bg-white/3 border border-white/8 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          {/* Table header */}
          <div className="grid grid-cols-[28px_28px_1fr_100px_160px_36px] gap-0 px-4 py-2 border-b border-white/8 min-w-[520px]">
            <div className="flex items-center">
              <input type="checkbox" checked={allSelected} onChange={selectAll}
                className="w-3.5 h-3.5 rounded border-white/20 bg-white/5 accent-sky-500 cursor-pointer" />
            </div>
            <div className="w-7" />
            <div className="text-xs text-white/30 uppercase tracking-wider">Name</div>
            <div className="text-xs text-white/30 uppercase tracking-wider text-right">Size</div>
            <div className="text-xs text-white/30 uppercase tracking-wider">Modified</div>
            <div />
          </div>

          {loading ? (
            <div className="px-4 py-8 space-y-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-9 rounded-lg bg-white/5 animate-pulse" />
              ))}
            </div>
          ) : files.length === 0 ? (
            <div className="px-4 py-12 text-center text-white/30 text-sm">
              {isSearchMode ? "No files found" : "This folder is empty"}
            </div>
          ) : (
            <div className="min-w-[520px]">
              {files.map((file) => (
                <div key={file.id}
                  className={`grid grid-cols-[28px_28px_1fr_100px_160px_36px] gap-0 px-4 py-2.5 border-b border-white/5 last:border-0 hover:bg-white/3 group transition-colors ${selected.has(file.id) ? "bg-sky-500/5" : ""}`}>

                  {/* Checkbox */}
                  <div className="flex items-center">
                    <input type="checkbox" checked={selected.has(file.id)} onChange={() => toggleSelect(file.id)}
                      className="w-3.5 h-3.5 rounded border-white/20 bg-white/5 accent-sky-500 cursor-pointer" />
                  </div>

                  {/* Icon */}
                  <div className="w-7 flex items-center">{getFileIcon(file)}</div>

                  {/* Name */}
                  <div className="flex items-center min-w-0">
                    {renamingId === file.id ? (
                      <input
                        autoFocus
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onBlur={() => commitRename(file)}
                        onKeyDown={(e) => { if (e.key === "Enter") commitRename(file); if (e.key === "Escape") setRenamingId(null); }}
                        disabled={renaming}
                        className="text-sm text-white bg-white/10 border border-sky-500/50 rounded px-2 py-0.5 outline-none w-full max-w-xs"
                      />
                    ) : file.isFolder ? (
                      <button onClick={() => navigateToFolder(file)}
                        className="text-sm text-white/80 hover:text-sky-400 transition-colors truncate text-left">
                        {file.name}
                      </button>
                    ) : (
                      <button onClick={() => openFile(file)}
                        className={`text-sm transition-colors truncate text-left ${
                          file.mimeType.includes("document") ? "text-blue-300 hover:text-blue-100"
                          : file.mimeType.includes("spreadsheet") ? "text-green-300 hover:text-green-100"
                          : "text-white/80 hover:text-white"
                        }`}>
                        {file.name}
                      </button>
                    )}
                  </div>

                  {/* Size */}
                  <div className="flex items-center justify-end">
                    <span className="text-xs text-white/30">{formatSize(file.size)}</span>
                  </div>

                  {/* Modified */}
                  <div className="flex items-center">
                    <span className="text-xs text-white/30">
                      {file.modifiedTime ? DateTime.fromISO(file.modifiedTime).toFormat("MMM d, yyyy") : "—"}
                    </span>
                  </div>

                  {/* More actions */}
                  <div className="flex items-center justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                        setActionMenu({ file, x: Math.min(rect.left, window.innerWidth - 180), y: rect.bottom + 4 });
                      }}
                      className="p-1 rounded text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                      title="More actions"
                    >
                      <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
                        <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Load more */}
      {nextPageToken && !loading && !isSearchMode && (
        <div className="mt-4 flex justify-center">
          <button onClick={() => fetchFiles(folderId, nextPageToken, true)}
            className="px-4 py-2 rounded-xl text-sm text-white/60 hover:text-white bg-white/5 hover:bg-white/10 border border-white/8 transition-colors">
            Load more
          </button>
        </div>
      )}
    </div>
  );
}
