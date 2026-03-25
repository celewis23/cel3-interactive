"use client";

import { useState, useEffect, useRef, useCallback, DragEvent } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface AssetFolder {
  _id: string;
  name: string;
  parentId: string | null;
  _createdAt: string;
}

interface AssetItem {
  _id: string;
  name: string;
  fileUrl: string;
  fileType: string;
  mimeType: string;
  sizeBytes: number;
  tags: string[];
  folderId: string | null;
  linkedEntityType: string | null;
  linkedEntityId: string | null;
  isPublic: boolean;
  publicToken: string | null;
  publicExpiresAt: string | null;
  sourceRef: string | null;
  _createdAt: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1024 * 1024 * 1024) return `${(b / 1024 / 1024).toFixed(1)} MB`;
  return `${(b / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function typeIcon(fileType: string): string {
  switch (fileType) {
    case "image":        return "🖼";
    case "video":        return "🎬";
    case "pdf":          return "📄";
    case "doc":          return "📝";
    case "spreadsheet":  return "📊";
    case "presentation": return "📑";
    case "font":         return "🔤";
    case "zip":          return "🗜";
    default:             return "📁";
  }
}

// ── Sub-components ────────────────────────────────────────────────────────────

function FolderTreeItem({
  folder,
  folders,
  selected,
  onSelect,
  depth,
}: {
  folder: AssetFolder;
  folders: AssetFolder[];
  selected: string | null;
  onSelect: (id: string | null) => void;
  depth: number;
}) {
  const [open, setOpen] = useState(false);
  const children = folders.filter((f) => f.parentId === folder._id);
  const isActive = selected === folder._id;

  return (
    <div>
      <button
        onClick={() => { onSelect(folder._id); setOpen(!open); }}
        className={`w-full flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-sm text-left transition-colors ${
          isActive ? "bg-sky-500/15 text-sky-400" : "text-white/60 hover:text-white hover:bg-white/5"
        }`}
        style={{ paddingLeft: `${8 + depth * 12}px` }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          className={`flex-shrink-0 transition-transform ${open ? "rotate-90" : ""} ${children.length === 0 ? "opacity-0" : ""}`}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="flex-shrink-0">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
        </svg>
        <span className="truncate flex-1">{folder.name}</span>
      </button>
      {open && children.map((c) => (
        <FolderTreeItem key={c._id} folder={c} folders={folders} selected={selected} onSelect={onSelect} depth={depth + 1} />
      ))}
    </div>
  );
}

function AssetPreview({ asset }: { asset: AssetItem }) {
  if (asset.fileType === "image") {
    return (
      <div className="w-full aspect-video bg-black/40 rounded-xl overflow-hidden flex items-center justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={asset.fileUrl} alt={asset.name} className="max-w-full max-h-full object-contain" />
      </div>
    );
  }
  if (asset.fileType === "video") {
    return (
      <div className="w-full aspect-video bg-black/40 rounded-xl overflow-hidden">
        <video src={asset.fileUrl} controls className="w-full h-full" />
      </div>
    );
  }
  if (asset.fileType === "pdf") {
    return (
      <div className="w-full aspect-video bg-black/40 rounded-xl overflow-hidden">
        <iframe src={`${asset.fileUrl}#view=FitH`} className="w-full h-full" title={asset.name} />
      </div>
    );
  }
  return (
    <div className="w-full aspect-video bg-black/40 rounded-xl flex items-center justify-center">
      <span className="text-6xl">{typeIcon(asset.fileType)}</span>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

const BRAND_KIT_FOLDER_NAMES = new Set(["Brand Kit", "Logo", "Fonts", "Colors", "Templates"]);

export default function AssetsClient() {
  const [folders, setFolders] = useState<AssetFolder[]>([]);
  const [assets, setAssets] = useState<AssetItem[]>([]);
  const [total, setTotal] = useState(0);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(undefined as unknown as null);
  const [selectedAsset, setSelectedAsset] = useState<AssetItem | null>(null);
  const [search, setSearch] = useState("");
  const [filterTag, setFilterTag] = useState("");
  const [filterType, setFilterType] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderParent, setNewFolderParent] = useState<string | null>(null);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [shareExpiry, setShareExpiry] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [editName, setEditName] = useState("");
  const [editTags, setEditTags] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const site = typeof window !== "undefined" ? window.location.origin : "";

  // ── Fetch folders ─────────────────────────────────────────────────────────

  const loadFolders = useCallback(async () => {
    const res = await fetch("/api/admin/assets/folders");
    if (res.ok) {
      const data = await res.json();
      setFolders(data.folders ?? []);
    }
  }, []);

  // ── Fetch assets ──────────────────────────────────────────────────────────

  const loadAssets = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedFolder !== undefined) params.set("folderId", selectedFolder ?? "null");
      if (search)     params.set("q", search);
      if (filterTag)  params.set("tag", filterTag);
      if (filterType) params.set("fileType", filterType);
      params.set("limit", "60");

      const res = await fetch(`/api/admin/assets?${params}`);
      if (res.ok) {
        const data = await res.json();
        setAssets(data.assets ?? []);
        setTotal(data.total ?? 0);
      }
    } finally {
      setLoading(false);
    }
  }, [selectedFolder, search, filterTag, filterType]);

  useEffect(() => { loadFolders(); }, [loadFolders]);
  useEffect(() => { loadAssets(); }, [loadAssets]);

  // ── Upload handler ────────────────────────────────────────────────────────

  const uploadFiles = useCallback(async (files: FileList | File[]) => {
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append("file", file);
        if (selectedFolder) fd.append("folderId", selectedFolder);
        await fetch("/api/admin/assets/upload", { method: "POST", body: fd });
      }
      await loadAssets();
    } finally {
      setUploading(false);
    }
  }, [selectedFolder, loadAssets]);

  const onDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files);
  }, [uploadFiles]);

  // ── Create folder ─────────────────────────────────────────────────────────

  async function createFolder() {
    if (!newFolderName.trim()) return;
    await fetch("/api/admin/assets/folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newFolderName.trim(), parentId: newFolderParent }),
    });
    setNewFolderName("");
    setShowNewFolder(false);
    await loadFolders();
  }

  // ── Share link ────────────────────────────────────────────────────────────

  async function generateShareLink() {
    if (!selectedAsset) return;
    const body: Record<string, unknown> = { generateToken: true };
    if (shareExpiry) body.publicExpiresAt = new Date(shareExpiry).toISOString();

    const res = await fetch(`/api/admin/assets/${selectedAsset._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const updated = await res.json();
      setSelectedAsset((prev) => prev ? { ...prev, ...updated } : prev);
      setShareLink(`${site}/api/admin/assets/share?token=${updated.publicToken}`);
    }
  }

  async function revokeShareLink() {
    if (!selectedAsset) return;
    await fetch(`/api/admin/assets/${selectedAsset._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPublic: false }),
    });
    setSelectedAsset((prev) => prev ? { ...prev, isPublic: false, publicToken: null } : prev);
    setShareLink(null);
  }

  async function saveEditedAsset() {
    if (!selectedAsset) return;
    const tags = editTags.split(",").map((t) => t.trim()).filter(Boolean);
    const res = await fetch(`/api/admin/assets/${selectedAsset._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName, tags }),
    });
    if (res.ok) {
      const updated = await res.json();
      setSelectedAsset((prev) => prev ? { ...prev, ...updated } : prev);
      setAssets((prev) => prev.map((a) => a._id === updated._id ? { ...a, ...updated } : a));
      setEditingName(false);
    }
  }

  async function deleteAsset(id: string) {
    if (!confirm("Delete this asset?")) return;
    await fetch(`/api/admin/assets/${id}`, { method: "DELETE" });
    setAssets((prev) => prev.filter((a) => a._id !== id));
    if (selectedAsset?._id === id) setSelectedAsset(null);
  }

  // ── All unique tags ───────────────────────────────────────────────────────

  const allTags = Array.from(new Set(assets.flatMap((a) => a.tags ?? [])));

  // ── Root folders (for sidebar) ────────────────────────────────────────────

  const rootFolders = folders.filter((f) => !f.parentId);
  const brandFolders = rootFolders.filter((f) => BRAND_KIT_FOLDER_NAMES.has(f.name));
  const regularFolders = rootFolders.filter((f) => !BRAND_KIT_FOLDER_NAMES.has(f.name));

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full">
      {/* ── Left: Folder Tree ── */}
      <aside className="w-52 flex-shrink-0 border-r border-white/8 flex flex-col">
        <div className="px-3 pt-4 pb-2 flex items-center justify-between">
          <span className="text-xs font-semibold text-white/40 uppercase tracking-wider">Folders</span>
          <button
            onClick={() => { setShowNewFolder(true); setNewFolderParent(selectedFolder); }}
            className="p-1 rounded hover:bg-white/5 text-white/40 hover:text-white transition-colors"
            title="New folder"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 pb-4 space-y-0.5">
          {/* All assets */}
          <button
            onClick={() => setSelectedFolder(undefined as unknown as null)}
            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors ${
              selectedFolder === undefined ? "bg-sky-500/15 text-sky-400" : "text-white/60 hover:text-white hover:bg-white/5"
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
            </svg>
            All Assets
          </button>

          {/* Unsorted */}
          <button
            onClick={() => setSelectedFolder(null)}
            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors ${
              selectedFolder === null ? "bg-sky-500/15 text-sky-400" : "text-white/60 hover:text-white hover:bg-white/5"
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
            </svg>
            Unsorted
          </button>

          {/* Brand Kit (pinned) */}
          {brandFolders.length > 0 && (
            <>
              <div className="pt-3 pb-1 px-2">
                <span className="text-[10px] font-semibold text-amber-400/70 uppercase tracking-wider">Brand Kit</span>
              </div>
              {brandFolders.map((f) => (
                <FolderTreeItem key={f._id} folder={f} folders={folders} selected={selectedFolder} onSelect={setSelectedFolder} depth={0} />
              ))}
            </>
          )}

          {/* Regular folders */}
          {regularFolders.length > 0 && (
            <>
              {brandFolders.length > 0 && <div className="pt-2 pb-1 px-2"><span className="text-[10px] font-semibold text-white/30 uppercase tracking-wider">Folders</span></div>}
              {regularFolders.map((f) => (
                <FolderTreeItem key={f._id} folder={f} folders={folders} selected={selectedFolder} onSelect={setSelectedFolder} depth={0} />
              ))}
            </>
          )}
        </nav>
      </aside>

      {/* ── Center: Asset Grid ── */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-colors ${dragOver ? "bg-sky-500/5" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
      >
        {/* Toolbar */}
        <div className="px-6 pt-6 pb-4 flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-0 max-w-sm">
            <svg width="14" height="14" className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35"/>
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search assets…"
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-sky-500/50"
            />
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500/50"
          >
            <option value="">All types</option>
            <option value="image">Images</option>
            <option value="video">Video</option>
            <option value="pdf">PDF</option>
            <option value="doc">Documents</option>
            <option value="spreadsheet">Spreadsheets</option>
            <option value="font">Fonts</option>
            <option value="zip">Archives</option>
          </select>

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-black text-sm font-semibold disabled:opacity-50 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            {uploading ? "Uploading…" : "Upload"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && uploadFiles(e.target.files)}
          />
        </div>

        {/* Tag strip */}
        {allTags.length > 0 && (
          <div className="px-6 pb-3 flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setFilterTag("")}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${!filterTag ? "bg-sky-500/20 text-sky-400" : "bg-white/5 text-white/50 hover:text-white"}`}
            >
              All
            </button>
            {allTags.map((t) => (
              <button
                key={t}
                onClick={() => setFilterTag(filterTag === t ? "" : t)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${filterTag === t ? "bg-sky-500/20 text-sky-400" : "bg-white/5 text-white/50 hover:text-white"}`}
              >
                #{t}
              </button>
            ))}
          </div>
        )}

        {/* Drag overlay */}
        {dragOver && (
          <div className="mx-6 mb-4 border-2 border-dashed border-sky-500/50 rounded-2xl p-8 text-center text-sky-400/70 text-sm">
            Drop files to upload
          </div>
        )}

        {/* Grid */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {loading ? (
            <div className="flex items-center justify-center h-32 text-white/30 text-sm">Loading…</div>
          ) : assets.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3 text-white/30">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
              </svg>
              <span className="text-sm">No assets here. Drop files or click Upload.</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {assets.map((asset) => (
                <button
                  key={asset._id}
                  onClick={() => {
                    setSelectedAsset(asset);
                    setEditName(asset.name);
                    setEditTags((asset.tags ?? []).join(", "));
                    setShareLink(asset.isPublic && asset.publicToken ? `${site}/api/admin/assets/share?token=${asset.publicToken}` : null);
                  }}
                  className={`group relative flex flex-col rounded-xl border overflow-hidden text-left transition-all ${
                    selectedAsset?._id === asset._id
                      ? "border-sky-500/60 bg-sky-500/5"
                      : "border-white/8 bg-white/3 hover:border-white/20 hover:bg-white/5"
                  }`}
                >
                  {/* Thumbnail */}
                  <div className="aspect-square w-full bg-black/30 flex items-center justify-center overflow-hidden">
                    {asset.fileType === "image" ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={asset.fileUrl} alt={asset.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-3xl">{typeIcon(asset.fileType)}</span>
                    )}
                  </div>
                  {/* Name */}
                  <div className="px-2 py-1.5">
                    <div className="text-xs text-white/80 truncate">{asset.name}</div>
                    <div className="text-[10px] text-white/30 mt-0.5">{formatBytes(asset.sizeBytes)}</div>
                  </div>
                  {/* Shared badge */}
                  {asset.isPublic && (
                    <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.81 15.312a4.5 4.5 0 01-1.242-7.244l4.5-4.5a4.5 4.5 0 016.364 6.364l-1.757 1.757" />
                      </svg>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
          {total > assets.length && (
            <div className="pt-4 text-center text-sm text-white/30">
              Showing {assets.length} of {total} assets
            </div>
          )}
        </div>
      </div>

      {/* ── Right: Detail Panel ── */}
      {selectedAsset && (
        <aside className="w-72 flex-shrink-0 border-l border-white/8 flex flex-col overflow-y-auto">
          {/* Header */}
          <div className="px-4 pt-4 pb-3 flex items-center justify-between border-b border-white/8">
            <span className="text-sm font-semibold text-white">Details</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => deleteAsset(selectedAsset._id)}
                className="p-1.5 rounded-lg text-red-400/60 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                title="Delete"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
              </button>
              <button
                onClick={() => setSelectedAsset(null)}
                className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div className="p-4 space-y-4 flex-1 overflow-y-auto">
            {/* Preview */}
            <AssetPreview asset={selectedAsset} />

            {/* Name */}
            {editingName ? (
              <div className="space-y-2">
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-sky-500/50"
                />
                <div className="text-xs text-white/40 mb-1">Tags (comma-separated)</div>
                <input
                  value={editTags}
                  onChange={(e) => setEditTags(e.target.value)}
                  placeholder="logo, primary, brand"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-sky-500/50"
                />
                <div className="flex gap-2">
                  <button onClick={saveEditedAsset} className="flex-1 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-black text-xs font-semibold transition-colors">Save</button>
                  <button onClick={() => setEditingName(false)} className="flex-1 py-1.5 rounded-lg bg-white/5 text-white/60 text-xs transition-colors">Cancel</button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="text-sm font-medium text-white break-all">{selectedAsset.name}</div>
                  <button onClick={() => setEditingName(true)} className="p-1 rounded text-white/30 hover:text-white flex-shrink-0">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                    </svg>
                  </button>
                </div>
                {(selectedAsset.tags ?? []).length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {selectedAsset.tags.map((t) => (
                      <span key={t} className="px-2 py-0.5 rounded-full bg-white/8 text-white/50 text-xs">#{t}</span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Metadata */}
            <div className="bg-white/3 rounded-xl p-3 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-white/40">Type</span>
                <span className="text-white/70 capitalize">{selectedAsset.fileType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">Size</span>
                <span className="text-white/70">{formatBytes(selectedAsset.sizeBytes)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">MIME</span>
                <span className="text-white/70 truncate ml-2">{selectedAsset.mimeType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">Uploaded</span>
                <span className="text-white/70">{new Date(selectedAsset._createdAt).toLocaleDateString()}</span>
              </div>
              {selectedAsset.linkedEntityType && (
                <div className="flex justify-between">
                  <span className="text-white/40">Linked to</span>
                  <span className="text-white/70 capitalize">{selectedAsset.linkedEntityType}</span>
                </div>
              )}
            </div>

            {/* Open / Download */}
            <div className="flex gap-2">
              <a
                href={selectedAsset.fileUrl}
                target="_blank"
                rel="noreferrer"
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                </svg>
                Open
              </a>
              <a
                href={selectedAsset.fileUrl + "?dl="}
                download={selectedAsset.name}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Download
              </a>
            </div>

            {/* Share */}
            <div className="space-y-2">
              <div className="text-xs font-semibold text-white/40 uppercase tracking-wider">Share</div>
              {selectedAsset.isPublic && shareLink ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      readOnly
                      value={shareLink}
                      className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white/70 focus:outline-none"
                    />
                    <button
                      onClick={() => navigator.clipboard.writeText(shareLink)}
                      className="flex-shrink-0 p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                      title="Copy"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
                      </svg>
                    </button>
                  </div>
                  {selectedAsset.publicExpiresAt && (
                    <div className="text-[10px] text-amber-400/70">Expires {new Date(selectedAsset.publicExpiresAt).toLocaleDateString()}</div>
                  )}
                  <button onClick={revokeShareLink} className="w-full py-1.5 rounded-lg bg-red-500/10 text-red-400 text-xs hover:bg-red-500/20 transition-colors">
                    Revoke link
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div>
                    <label className="text-[10px] text-white/40 block mb-1">Expires (optional)</label>
                    <input
                      type="date"
                      value={shareExpiry}
                      onChange={(e) => setShareExpiry(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500/50"
                    />
                  </div>
                  <button onClick={generateShareLink} className="w-full py-2 rounded-lg bg-sky-500/15 text-sky-400 text-xs font-medium hover:bg-sky-500/25 transition-colors">
                    Generate share link
                  </button>
                </div>
              )}
            </div>
          </div>
        </aside>
      )}

      {/* ── New Folder Modal ── */}
      {showNewFolder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-[#111] border border-white/10 rounded-2xl p-6 w-80 space-y-4">
            <div className="text-sm font-semibold text-white">New Folder</div>
            <input
              autoFocus
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") createFolder(); if (e.key === "Escape") setShowNewFolder(false); }}
              placeholder="Folder name"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-sky-500/50"
            />
            <div>
              <label className="text-xs text-white/40 block mb-1">Parent folder (optional)</label>
              <select
                value={newFolderParent ?? ""}
                onChange={(e) => setNewFolderParent(e.target.value || null)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
              >
                <option value="">— Root —</option>
                {folders.map((f) => (
                  <option key={f._id} value={f._id}>{f.name}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <button onClick={createFolder} className="flex-1 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-black text-sm font-semibold transition-colors">Create</button>
              <button onClick={() => setShowNewFolder(false)} className="flex-1 py-2.5 rounded-xl bg-white/5 text-white/60 text-sm transition-colors">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
