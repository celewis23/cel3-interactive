"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getStroke } from "perfect-freehand";

type Workspace = {
  _id: string;
  title: string;
  order?: number;
  isFavorite?: boolean;
  _createdAt?: string;
  _updatedAt?: string;
};

type Section = {
  _id: string;
  title: string;
  workspaceId: string;
  order?: number;
  color?: string | null;
};

type LinkedRecord = { type: "client" | "project" | "task" | "invoice" | "ticket"; id: string; label?: string };
type LinkOption = { _id: string; label: string; email?: string; status?: string; projectId?: string };

type Page = {
  _id: string;
  title: string;
  content: string | null;
  canvasData: string | null;
  blocksJson: string | null;
  color: string | null;
  isPinned: boolean;
  isFavorite: boolean;
  workspaceId: string;
  sectionId: string;
  parentPageId: string | null;
  order: number;
  tags: string[];
  metadataJson: string | null;
  linkedRecords: LinkedRecord[];
  _createdAt: string;
  _updatedAt: string;
};

type NoteBlockType = "text" | "checklist" | "image" | "file" | "link" | "drawing" | "ai";

type NoteBlock = {
  id: string;
  pageId: string;
  type: NoteBlockType;
  content: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  createdBy?: string | null;
};

type Stroke = {
  id: string;
  points: number[][];
  color: string;
  size: number;
  isEraser: boolean;
  highlighter?: boolean;
};

type AttachmentDisplayMode = "inline" | "file";

type Attachment = {
  id: string;
  name: string;
  mimeType: string;
  dataUrl?: string;
  url?: string;
  extractedHtml?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  displayMode: AttachmentDisplayMode;
};

type CanvasData = { strokes: Stroke[]; attachments?: Attachment[] };

type NotesPayload = {
  workspaces: Workspace[];
  sections: Section[];
  pages: Page[];
  defaults: { workspaceId: string; sectionId: string };
  aiAvailable: boolean;
  linkOptions: {
    clients: LinkOption[];
    projects: LinkOption[];
    tasks: LinkOption[];
    invoices: LinkOption[];
    tickets: LinkOption[];
  };
};

const PEN_COLORS = ["#ffffff", "#94a3b8", "#111827", "#38bdf8", "#22c55e", "#f43f5e", "#f59e0b", "#8b5cf6"];
const PEN_SIZES = [2, 4, 8, 14, 22];
const CANVAS_WIDTH = 2200;
const CANVAS_HEIGHT = 1500;

function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
}

function relativeTime(iso?: string): string {
  if (!iso) return "now";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function blocksForPage(page: Page | null): NoteBlock[] {
  if (!page) return [];
  const parsed = parseJson<NoteBlock[]>(page.blocksJson, []);
  if (parsed.length) return parsed.map((block) => ({ ...block, pageId: page._id }));
  if (page.content?.trim()) {
    const now = page._createdAt || new Date().toISOString();
    return [{
      id: `legacy_text_${page._id}`,
      pageId: page._id,
      type: "text",
      content: page.content,
      x: 96,
      y: 96,
      width: 520,
      height: 280,
      zIndex: 10,
      metadata: { migratedFrom: "adminNote.content" },
      createdAt: now,
      updatedAt: page._updatedAt || now,
    }];
  }
  return [];
}

function pageTextFromBlocks(blocks: NoteBlock[]) {
  return blocks
    .filter((block) => ["text", "checklist", "link", "ai"].includes(block.type))
    .map((block) => block.content.trim())
    .filter(Boolean)
    .join("\n\n");
}

function drawStrokeToCanvas(
  ctx: CanvasRenderingContext2D,
  points: number[][],
  size: number,
  color: string,
  isEraser: boolean,
  highlighter = false
) {
  const outline = getStroke(points, { size, thinning: 0.5, smoothing: 0.5, streamline: 0.5, simulatePressure: true });
  if (outline.length < 2) return;
  ctx.save();
  if (isEraser) {
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = "rgba(0,0,0,1)";
  } else {
    ctx.globalCompositeOperation = highlighter ? "multiply" : "source-over";
    ctx.globalAlpha = highlighter ? 0.34 : 1;
    ctx.fillStyle = color;
  }
  ctx.beginPath();
  ctx.moveTo(outline[0][0], outline[0][1]);
  for (let i = 1; i < outline.length; i += 1) ctx.lineTo(outline[i][0], outline[i][1]);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function isPenEraser(e: React.PointerEvent): boolean {
  if (e.pointerType !== "pen") return false;
  return (e.buttons & 32) !== 0 || e.button === 5;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function processFile(file: File): Promise<Attachment> {
  const id = uid("file");
  const { name, type: mimeType } = file;
  if (mimeType.startsWith("image/")) {
    return { id, name, mimeType, dataUrl: await fileToDataUrl(file), x: 0, y: 0, width: 440, height: 320, displayMode: "inline" };
  }
  if (mimeType.startsWith("video/")) {
    return { id, name, mimeType, dataUrl: await fileToDataUrl(file), x: 0, y: 0, width: 520, height: 300, displayMode: "inline" };
  }
  if (mimeType === "application/pdf") {
    return { id, name, mimeType, dataUrl: await fileToDataUrl(file), x: 0, y: 0, width: 640, height: 820, displayMode: "inline" };
  }
  if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || name.endsWith(".docx")) {
    const arrayBuffer = await file.arrayBuffer();
    const mammoth = await import("mammoth");
    const result = await mammoth.convertToHtml({ arrayBuffer });
    return { id, name, mimeType, extractedHtml: result.value, x: 0, y: 0, width: 640, height: 420, displayMode: "inline" };
  }
  if (
    mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    mimeType === "application/vnd.ms-excel" ||
    name.endsWith(".xlsx") ||
    name.endsWith(".xls")
  ) {
    const arrayBuffer = await file.arrayBuffer();
    const XLSX = await import("xlsx");
    const wb = XLSX.read(arrayBuffer, { type: "array" });
    const firstSheet = wb.SheetNames[0];
    const html = XLSX.utils.sheet_to_html(wb.Sheets[firstSheet]);
    return { id, name, mimeType, extractedHtml: html, x: 0, y: 0, width: 720, height: 420, displayMode: "inline" };
  }
  if (mimeType === "text/csv" || name.endsWith(".csv")) {
    const text = await file.text();
    const rows = text.trim().split("\n").map((row) => row.split(",").map((cell) => cell.replace(/^"|"$/g, "")));
    const html = `<table>${rows.map((row, i) => `<tr>${row.map((cell) => i === 0 ? `<th>${cell}</th>` : `<td>${cell}</td>`).join("")}</tr>`).join("")}</table>`;
    return { id, name, mimeType, extractedHtml: html, x: 0, y: 0, width: 640, height: 320, displayMode: "inline" };
  }
  return { id, name, mimeType: mimeType || "application/octet-stream", dataUrl: await fileToDataUrl(file), x: 0, y: 0, width: 360, height: 110, displayMode: "file" };
}

function openBlockFile(block: NoteBlock) {
  const src = String(block.metadata.dataUrl || block.metadata.url || "");
  if (!src) return;
  if (src.startsWith("data:")) {
    const [header, data] = src.split(",");
    const mime = header.split(":")[1]?.split(";")[0] || "application/octet-stream";
    const bytes = atob(data);
    const arr = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i += 1) arr[i] = bytes.charCodeAt(i);
    const blobUrl = URL.createObjectURL(new Blob([arr], { type: mime }));
    window.open(blobUrl, "_blank", "noopener,noreferrer");
    setTimeout(() => URL.revokeObjectURL(blobUrl), 10_000);
  } else {
    window.open(src, "_blank", "noopener,noreferrer");
  }
}

function fileBlockFromAttachment(pageId: string, attachment: Attachment, x: number, y: number, zIndex: number): NoteBlock {
  const isImage = attachment.mimeType.startsWith("image/");
  const now = new Date().toISOString();
  return {
    id: uid(isImage ? "image" : "file"),
    pageId,
    type: isImage ? "image" : "file",
    content: attachment.name,
    x,
    y,
    width: attachment.width,
    height: attachment.displayMode === "file" ? 116 : attachment.height,
    zIndex,
    metadata: {
      name: attachment.name,
      mimeType: attachment.mimeType,
      dataUrl: attachment.dataUrl,
      url: attachment.url,
      extractedHtml: attachment.extractedHtml,
      displayMode: attachment.displayMode,
    },
    createdAt: now,
    updatedAt: now,
  };
}

function FileTypeIcon({ mimeType, size = 14 }: { mimeType: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      {mimeType.startsWith("image/") ? <path d="m8 17 2.5-3 2 2.4 2.5-3.4 2 4" /> : <path d="M8 13h8M8 17h6" />}
    </svg>
  );
}

function SelectionMenu({
  onDuplicate,
  onDelete,
  onBringForward,
  onSendBack,
}: {
  onDuplicate: () => void;
  onDelete: () => void;
  onBringForward: () => void;
  onSendBack: () => void;
}) {
  return (
    <div className="absolute -top-10 right-0 z-30 flex items-center gap-1 rounded-xl border border-white/12 bg-[#0b0f14]/95 p-1 shadow-2xl backdrop-blur-xl">
      <IconButton label="Duplicate" onClick={onDuplicate}>
        <path d="M8 8h10v10H8zM5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
      </IconButton>
      <IconButton label="Bring forward" onClick={onBringForward}>
        <path d="M12 19V5M5 12l7-7 7 7" />
      </IconButton>
      <IconButton label="Send back" onClick={onSendBack}>
        <path d="M12 5v14M19 12l-7 7-7-7" />
      </IconButton>
      <IconButton label="Delete" tone="danger" onClick={onDelete}>
        <path d="M3 6h18M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2" />
      </IconButton>
    </div>
  );
}

function IconButton({
  label,
  onClick,
  tone = "normal",
  disabled = false,
  children,
}: {
  label: string;
  onClick: () => void;
  tone?: "normal" | "danger" | "active";
  disabled?: boolean;
  children: React.ReactNode;
}) {
  const toneClass =
    tone === "danger"
      ? "text-red-300 hover:bg-red-500/12"
      : tone === "active"
        ? "bg-sky-500/15 text-sky-200"
        : "text-white/55 hover:bg-white/10 hover:text-white";
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${toneClass}`}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {children}
      </svg>
    </button>
  );
}

function NoteBlockView({
  block,
  selected,
  onSelect,
  onChange,
  onDelete,
  onDuplicate,
  onLayer,
  onDragStart,
  onDrag,
  onResizeStart,
  onResize,
}: {
  block: NoteBlock;
  selected: boolean;
  onSelect: () => void;
  onChange: (updates: Partial<NoteBlock>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onLayer: (direction: "front" | "back") => void;
  onDragStart: (e: React.PointerEvent, block: NoteBlock) => void;
  onDrag: (e: React.PointerEvent) => void;
  onResizeStart: (e: React.PointerEvent, block: NoteBlock) => void;
  onResize: (e: React.PointerEvent) => void;
}) {
  const commonClass = selected
    ? "border-sky-300/65 shadow-[0_18px_60px_rgba(14,165,233,0.16)]"
    : "border-white/10 shadow-[0_14px_50px_rgba(0,0,0,0.25)] hover:border-white/18";
  const mimeType = String(block.metadata.mimeType || "");
  const dataUrl = String(block.metadata.dataUrl || "");
  const url = String(block.metadata.url || "");
  const extractedHtml = String(block.metadata.extractedHtml || "");

  return (
    <div
      className={`absolute rounded-xl border bg-[#0b0f14]/92 backdrop-blur-md transition-[border-color,box-shadow] ${commonClass}`}
      style={{ left: block.x, top: block.y, width: block.width, height: block.height, zIndex: block.zIndex }}
      onPointerDown={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      {selected && (
        <SelectionMenu
          onDuplicate={onDuplicate}
          onDelete={onDelete}
          onBringForward={() => onLayer("front")}
          onSendBack={() => onLayer("back")}
        />
      )}
      <div
        className="flex h-8 cursor-move select-none items-center gap-2 rounded-t-xl border-b border-white/8 bg-white/[0.035] px-2 text-[11px] text-white/42"
        onPointerDown={(e) => onDragStart(e, block)}
        onPointerMove={onDrag}
        onPointerUp={(e) => e.currentTarget.releasePointerCapture(e.pointerId)}
      >
        <BlockIcon type={block.type} />
        <span className="truncate">{block.type === "ai" ? "AI output" : block.type}</span>
        <span className="ml-auto font-mono text-[10px] text-white/22">{block.zIndex}</span>
      </div>

      {block.type === "text" && (
        <textarea
          value={block.content}
          onChange={(e) => onChange({ content: e.target.value, updatedAt: new Date().toISOString() })}
          placeholder="Start typing..."
          className="h-[calc(100%-2rem)] w-full resize-none rounded-b-xl bg-transparent p-3 text-sm leading-relaxed text-white/84 outline-none placeholder:text-white/18"
        />
      )}

      {block.type === "checklist" && (
        <div className="h-[calc(100%-2rem)] overflow-auto p-3">
          <textarea
            value={block.content}
            onChange={(e) => onChange({ content: e.target.value, updatedAt: new Date().toISOString() })}
            placeholder={"One task per line\n[ ] Draft proposal\n[x] Send recap"}
            className="min-h-full w-full resize-none bg-transparent text-sm leading-7 text-white/84 outline-none placeholder:text-white/18"
          />
        </div>
      )}

      {block.type === "link" && (
        <div className="flex h-[calc(100%-2rem)] flex-col justify-center gap-2 p-4">
          <input
            value={String(block.metadata.url || "")}
            onChange={(e) => onChange({ metadata: { ...block.metadata, url: e.target.value }, updatedAt: new Date().toISOString() })}
            placeholder="https://..."
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-sky-200 outline-none placeholder:text-white/20"
          />
          <textarea
            value={block.content}
            onChange={(e) => onChange({ content: e.target.value, updatedAt: new Date().toISOString() })}
            placeholder="Bookmark notes"
            className="flex-1 resize-none bg-transparent text-sm text-white/76 outline-none placeholder:text-white/18"
          />
          {String(block.metadata.url || "") && (
            <a href={String(block.metadata.url)} target="_blank" rel="noreferrer" className="text-xs text-sky-300 hover:text-sky-200">
              Open bookmark
            </a>
          )}
        </div>
      )}

      {block.type === "image" && (
        <div className="h-[calc(100%-2rem)] overflow-hidden rounded-b-xl bg-black/30">
          {/* User-supplied data URLs and private file URLs are not suitable for next/image. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={dataUrl || url} alt={block.content || "Note image"} className="h-full w-full object-contain" draggable={false} />
        </div>
      )}

      {block.type === "file" && (
        <div className="h-[calc(100%-2rem)] overflow-auto p-3">
          {extractedHtml ? (
            <div
              className="notes-doc-content text-xs text-white/72"
              // Admin-only file preview generated from the user's uploaded document.
              dangerouslySetInnerHTML={{ __html: extractedHtml }}
            />
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openBlockFile(block);
              }}
              className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[0.035] p-3 text-left transition-colors hover:bg-white/8"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/8 text-sky-300">
                <FileTypeIcon mimeType={mimeType} size={20} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-white/78">{block.content || "Attachment"}</span>
                <span className="mt-0.5 block truncate text-[11px] text-white/35">{mimeType || "File attachment"}</span>
              </span>
            </button>
          )}
        </div>
      )}

      {block.type === "ai" && (
        <textarea
          value={block.content}
          onChange={(e) => onChange({ content: e.target.value, updatedAt: new Date().toISOString() })}
          className="h-[calc(100%-2rem)] w-full resize-none rounded-b-xl bg-sky-500/[0.045] p-3 text-sm leading-relaxed text-sky-50/86 outline-none"
        />
      )}

      <div
        className="absolute bottom-0 right-0 h-6 w-6 cursor-se-resize rounded-br-xl"
        style={{ background: "linear-gradient(135deg, transparent 50%, rgba(255,255,255,0.16) 50%)" }}
        onPointerDown={(e) => onResizeStart(e, block)}
        onPointerMove={onResize}
        onPointerUp={(e) => e.currentTarget.releasePointerCapture(e.pointerId)}
      />
    </div>
  );
}

function BlockIcon({ type }: { type: NoteBlockType }) {
  const paths: Record<NoteBlockType, React.ReactNode> = {
    text: <><path d="M4 6h16M9 6v12M15 6v12M7 18h10" /></>,
    checklist: <><path d="m4 7 2 2 4-4M12 8h8M4 15l2 2 4-4M12 16h8" /></>,
    image: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="m6 17 4-5 3 4 2-3 3 4" /><circle cx="8" cy="8" r="1" /></>,
    file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></>,
    link: <><path d="M10 13a5 5 0 0 0 7.54.54l2-2a5 5 0 0 0-7.07-7.07l-1.14 1.14" /><path d="M14 11a5 5 0 0 0-7.54-.54l-2 2a5 5 0 0 0 7.07 7.07l1.14-1.14" /></>,
    drawing: <><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></>,
    ai: <><path d="M12 3l1.9 5.6L20 10.5l-5.2 3.4.2 6.1-5-3.6-5 3.6.2-6.1L0 10.5l6.1-1.9Z" /></>,
  };
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {paths[type]}
    </svg>
  );
}

function DrawingLayer({
  data,
  active,
  onActiveChange,
  onSave,
}: {
  data: CanvasData;
  active: boolean;
  onActiveChange: (active: boolean) => void;
  onSave: (data: CanvasData) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [strokes, setStrokes] = useState<Stroke[]>(data.strokes ?? []);
  const strokesRef = useRef<Stroke[]>(data.strokes ?? []);
  const [history, setHistory] = useState<Stroke[][]>([data.strokes ?? []]);
  const [histIdx, setHistIdx] = useState(0);
  const [tool, setTool] = useState<"pen" | "highlighter" | "eraser">("pen");
  const [color, setColor] = useState(PEN_COLORS[0]);
  const [sizeIdx, setSizeIdx] = useState(1);
  const [drawing, setDrawing] = useState(false);
  const [penEraserActive, setPenEraserActive] = useState(false);
  const currentPtsRef = useRef<number[][]>([]);
  const eraserRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const colorRef = useRef(color);
  const sizeIdxRef = useRef(sizeIdx);
  const toolRef = useRef(tool);

  useEffect(() => { colorRef.current = color; }, [color]);
  useEffect(() => { sizeIdxRef.current = sizeIdx; }, [sizeIdx]);
  useEffect(() => { toolRef.current = tool; }, [tool]);

  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const stroke of strokesRef.current) {
      drawStrokeToCanvas(ctx, stroke.points, stroke.isEraser ? stroke.size * 3 : stroke.size, stroke.color, stroke.isEraser, stroke.highlighter);
    }
    if (currentPtsRef.current.length > 1) {
      const isEraser = eraserRef.current;
      const size = isEraser ? PEN_SIZES[sizeIdxRef.current] * 3 : PEN_SIZES[sizeIdxRef.current];
      drawStrokeToCanvas(ctx, currentPtsRef.current, size, colorRef.current, isEraser, toolRef.current === "highlighter");
    }
  }, []);

  useEffect(() => {
    strokesRef.current = strokes;
    renderCanvas();
  }, [renderCanvas, strokes]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    function resize() {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      renderCanvas();
    }
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    return () => observer.disconnect();
  }, [renderCanvas]);

  function pushHistory(next: Stroke[]) {
    setHistory((prev) => {
      const trimmed = prev.slice(0, histIdx + 1);
      trimmed.push(next);
      setHistIdx(trimmed.length - 1);
      return trimmed;
    });
  }

  function save(next: Stroke[]) {
    onSave({ ...data, strokes: next });
  }

  function undo() {
    if (histIdx <= 0) return;
    const next = history[histIdx - 1];
    setHistIdx((idx) => idx - 1);
    setStrokes(next);
    save(next);
  }

  function redo() {
    if (histIdx >= history.length - 1) return;
    const next = history[histIdx + 1];
    setHistIdx((idx) => idx + 1);
    setStrokes(next);
    save(next);
  }

  function getPoint(e: React.PointerEvent<HTMLCanvasElement>): number[] {
    const rect = canvasRef.current!.getBoundingClientRect();
    return [e.clientX - rect.left, e.clientY - rect.top, e.pressure || 0.5];
  }

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!active) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrawing(true);
    const erasing = e.pointerType === "pen" ? isPenEraser(e) : toolRef.current === "eraser";
    eraserRef.current = erasing;
    if (e.pointerType === "pen") {
      setPenEraserActive(erasing);
      if (erasing) setTool("eraser");
    }
    currentPtsRef.current = [getPoint(e)];
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing || !active) return;
    if (e.pointerType === "pen") {
      const erasing = isPenEraser(e);
      if (erasing !== eraserRef.current) {
        eraserRef.current = erasing;
        setPenEraserActive(erasing);
        if (erasing) setTool("eraser");
      }
    }
    currentPtsRef.current = [...currentPtsRef.current, getPoint(e)];
    if (rafRef.current === null) {
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        renderCanvas();
      });
    }
  }

  function onPointerUp(e?: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing || !currentPtsRef.current.length) return;
    setDrawing(false);
    if (e?.pointerType === "pen") setPenEraserActive(false);
    const pts = currentPtsRef.current;
    currentPtsRef.current = [];
    if (pts.length < 2) return;
    const isEraser = eraserRef.current;
    const next = [...strokesRef.current, {
      id: uid("stroke"),
      points: pts,
      color: isEraser ? "eraser" : colorRef.current,
      size: PEN_SIZES[sizeIdxRef.current],
      isEraser,
      highlighter: toolRef.current === "highlighter",
    }];
    setStrokes(next);
    pushHistory(next);
    save(next);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!active) return;
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === "z") {
        e.preventDefault();
        undo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === "y" || (e.shiftKey && e.key.toLowerCase() === "z"))) {
        e.preventDefault();
        redo();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const currentSize = PEN_SIZES[sizeIdx];

  return (
    <>
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 h-full w-full touch-none ${active ? "pointer-events-auto" : "pointer-events-none"}`}
        style={{ cursor: active ? (tool === "eraser" ? "cell" : "crosshair") : "default" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={(e) => onPointerUp(e)}
        onPointerLeave={(e) => onPointerUp(e)}
      />
      <div className="absolute bottom-5 left-1/2 z-[90] flex -translate-x-1/2 flex-wrap items-center justify-center gap-1.5 rounded-2xl border border-white/12 bg-[#080d12]/90 p-2 shadow-2xl backdrop-blur-xl">
        <button
          type="button"
          onClick={() => onActiveChange(!active)}
          className={`rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${active ? "bg-sky-500 text-white" : "bg-white/8 text-white/62 hover:bg-white/12"}`}
        >
          Ink
        </button>
        <IconButton label="Pen" tone={active && tool === "pen" ? "active" : "normal"} onClick={() => { setTool("pen"); onActiveChange(true); }}>
          <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </IconButton>
        <IconButton label="Highlighter" tone={active && tool === "highlighter" ? "active" : "normal"} onClick={() => { setTool("highlighter"); onActiveChange(true); }}>
          <path d="m9 11 6 6M4 20l4-1 10-10a2.1 2.1 0 0 0-3-3L5 16Z" />
        </IconButton>
        <IconButton label="Eraser" tone={active && tool === "eraser" ? "active" : "normal"} onClick={() => { setTool("eraser"); onActiveChange(true); }}>
          <path d="M20 20H7L3 16l11-11 6 6-3 3M6 18 17 7" />
        </IconButton>
        {penEraserActive && <span className="h-2 w-2 rounded-full bg-sky-300" title="Pen eraser detected" />}
        <div className="mx-1 h-6 w-px bg-white/10" />
        <div className="flex items-center gap-1">
          {PEN_COLORS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setColor(item)}
              className={`h-6 w-6 rounded-full border-2 transition-transform ${color === item ? "scale-110 border-white/80" : "border-transparent"}`}
              style={{ background: item }}
              aria-label={`Stroke color ${item}`}
            />
          ))}
        </div>
        <div className="mx-1 h-6 w-px bg-white/10" />
        <button type="button" onClick={() => setSizeIdx((idx) => Math.max(0, idx - 1))} className="h-8 w-8 rounded-lg text-white/55 hover:bg-white/8">-</button>
        <span className="w-7 text-center font-mono text-xs text-white/58">{currentSize}</span>
        <button type="button" onClick={() => setSizeIdx((idx) => Math.min(PEN_SIZES.length - 1, idx + 1))} className="h-8 w-8 rounded-lg text-white/55 hover:bg-white/8">+</button>
        <div className="mx-1 h-6 w-px bg-white/10" />
        <IconButton label="Undo" disabled={histIdx <= 0} onClick={undo}>
          <path d="M3 7v6h6" /><path d="M21 17a9 9 0 0 0-15-6.7L3 13" />
        </IconButton>
        <IconButton label="Redo" disabled={histIdx >= history.length - 1} onClick={redo}>
          <path d="M21 7v6h-6" /><path d="M3 17a9 9 0 0 1 15-6.7L21 13" />
        </IconButton>
        <IconButton label="Clear drawing" tone="danger" onClick={() => {
          if (!confirm("Clear drawing on this page?")) return;
          setStrokes([]);
          pushHistory([]);
          save([]);
        }}>
          <path d="M3 6h18M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2" />
        </IconButton>
      </div>
    </>
  );
}

function PageContextPanel({
  page,
  linkOptions,
  onPatch,
  onClose,
}: {
  page: Page;
  linkOptions: NotesPayload["linkOptions"];
  onPatch: (patch: Partial<Page>) => void;
  onClose: () => void;
}) {
  const [tagValue, setTagValue] = useState("");
  const metadata = parseJson<Record<string, string>>(page.metadataJson, {});

  function addTag() {
    const tag = tagValue.trim();
    if (!tag || page.tags.includes(tag)) return;
    onPatch({ tags: [...page.tags, tag] });
    setTagValue("");
  }

  function addLink(type: LinkedRecord["type"], id: string) {
    const collection = type === "client" ? linkOptions.clients :
      type === "project" ? linkOptions.projects :
      type === "task" ? linkOptions.tasks :
      type === "invoice" ? linkOptions.invoices :
      linkOptions.tickets;
    const item = collection.find((option) => option._id === id);
    if (!item || page.linkedRecords.some((link) => link.type === type && link.id === id)) return;
    onPatch({ linkedRecords: [...page.linkedRecords, { type, id, label: item.label }] });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="notes-page-context-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="max-h-[88dvh] w-full max-w-2xl overflow-hidden rounded-3xl border border-white/10 bg-[#070b11] shadow-[0_28px_120px_rgba(0,0,0,0.55)]">
        <div className="flex items-start justify-between gap-4 border-b border-white/8 p-5">
          <div>
            <div id="notes-page-context-title" className="text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-300/80">Page Context</div>
            <p className="mt-2 max-w-xl text-xs leading-relaxed text-white/38">Private internal note. Future portal sharing can be modeled from linked records, but this page is not exposed to clients.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl bg-white/8 px-3 py-2 text-xs text-white/58 hover:bg-white/12 hover:text-white/82">
            Close
          </button>
        </div>

        <div className="max-h-[calc(88dvh-104px)] overflow-y-auto p-5">
          <div className="grid gap-5 md:grid-cols-2">
            <section>
          <label className="text-[11px] font-semibold uppercase tracking-widest text-white/28">Tags</label>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {page.tags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => onPatch({ tags: page.tags.filter((item) => item !== tag) })}
                className="rounded-full border border-sky-300/20 bg-sky-400/10 px-2 py-1 text-xs text-sky-100/80"
                title="Remove tag"
              >
                {tag}
              </button>
            ))}
          </div>
          <div className="mt-2 flex gap-1">
            <input
              value={tagValue}
              onChange={(e) => setTagValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") addTag(); }}
              placeholder="Add tag"
              className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 text-xs text-white/75 outline-none placeholder:text-white/20"
            />
            <button type="button" onClick={addTag} className="rounded-lg bg-white/8 px-3 text-xs text-white/62 hover:bg-white/12">Add</button>
          </div>
            </section>

            <section className="space-y-2">
          <label className="text-[11px] font-semibold uppercase tracking-widest text-white/28">Connections</label>
          {(["client", "project", "task", "invoice", "ticket"] as const).map((type) => {
            const options = type === "client" ? linkOptions.clients :
              type === "project" ? linkOptions.projects :
              type === "task" ? linkOptions.tasks :
              type === "invoice" ? linkOptions.invoices :
              linkOptions.tickets;
            return (
              <select
                key={type}
                value=""
                onChange={(e) => addLink(type, e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 text-xs text-white/72 outline-none"
              >
                <option value="">Link {type}</option>
                {options.map((option) => <option key={option._id} value={option._id}>{option.label || option._id}</option>)}
              </select>
            );
          })}
          <div className="space-y-1.5">
            {page.linkedRecords.map((link) => (
              <button
                key={`${link.type}:${link.id}`}
                type="button"
                onClick={() => onPatch({ linkedRecords: page.linkedRecords.filter((item) => !(item.type === link.type && item.id === link.id)) })}
                className="block w-full rounded-lg border border-white/8 bg-white/[0.035] px-2.5 py-2 text-left text-xs text-white/62"
                title="Remove connection"
              >
                <span className="font-semibold text-white/72">{link.type}</span> {link.label || link.id}
              </button>
            ))}
          </div>
            </section>

            <section className="md:col-span-2">
          <label className="text-[11px] font-semibold uppercase tracking-widest text-white/28">Metadata</label>
          <div className="mt-2 grid gap-2 md:grid-cols-2">
            <input
              value={metadata.status || ""}
              onChange={(e) => onPatch({ metadataJson: JSON.stringify({ ...metadata, status: e.target.value }) })}
              placeholder="Status"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 text-xs text-white/72 outline-none placeholder:text-white/20"
            />
            <input
              value={metadata.owner || ""}
              onChange={(e) => onPatch({ metadataJson: JSON.stringify({ ...metadata, owner: e.target.value }) })}
              placeholder="Owner / context"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 text-xs text-white/72 outline-none placeholder:text-white/20"
            />
          </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

function WorkspaceRow({
  workspace,
  active,
  onSelect,
  onRename,
  onDuplicate,
  onArchive,
  onMove,
}: {
  workspace: Workspace;
  active: boolean;
  onSelect: () => void;
  onRename: (title: string) => void;
  onDuplicate: () => void;
  onArchive: () => void;
  onMove: (direction: -1 | 1) => void;
}) {
  const [editing, setEditing] = useState(false);
  return (
    <div className={`group rounded-xl border px-2 py-2 transition-colors ${active ? "border-sky-400/30 bg-sky-400/12" : "border-transparent hover:bg-white/5"}`}>
      <div className="flex items-center gap-2">
        <button type="button" onClick={onSelect} className="flex min-w-0 flex-1 items-center gap-2 text-left">
          <span className="h-2.5 w-2.5 rounded-full bg-sky-400 shadow-[0_0_18px_rgba(56,189,248,0.55)]" />
          {editing ? (
            <input
              autoFocus
              defaultValue={workspace.title}
              onBlur={(e) => { setEditing(false); onRename(e.target.value); }}
              onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
              className="min-w-0 flex-1 bg-transparent text-sm font-medium text-white/82 outline-none"
            />
          ) : (
            <span className="truncate text-sm font-medium text-white/82">{workspace.title}</span>
          )}
        </button>
        <button type="button" onClick={() => setEditing(true)} className="opacity-0 transition-opacity group-hover:opacity-100 text-white/35 hover:text-white/70">Edit</button>
      </div>
      <div className="mt-2 hidden items-center gap-1 group-hover:flex">
        <button type="button" onClick={onDuplicate} className="rounded-md px-2 py-1 text-[11px] text-white/40 hover:bg-white/8 hover:text-white/70">Duplicate</button>
        <button type="button" onClick={() => onMove(-1)} className="rounded-md px-2 py-1 text-[11px] text-white/40 hover:bg-white/8">Up</button>
        <button type="button" onClick={() => onMove(1)} className="rounded-md px-2 py-1 text-[11px] text-white/40 hover:bg-white/8">Down</button>
        <button type="button" onClick={onArchive} className="ml-auto rounded-md px-2 py-1 text-[11px] text-red-300/70 hover:bg-red-500/10">Archive</button>
      </div>
    </div>
  );
}

function SectionRow({
  section,
  active,
  onSelect,
  onRename,
  onDuplicate,
  onArchive,
  onMove,
}: {
  section: Section;
  active: boolean;
  onSelect: () => void;
  onRename: (title: string) => void;
  onDuplicate: () => void;
  onArchive: () => void;
  onMove: (direction: -1 | 1) => void;
}) {
  const [editing, setEditing] = useState(false);
  return (
    <div className={`group rounded-lg border px-2 py-2 transition-colors ${active ? "border-white/15 bg-white/10" : "border-transparent hover:bg-white/5"}`}>
      <button type="button" onClick={onSelect} className="flex w-full min-w-0 items-center gap-2 text-left">
        <span className="h-5 w-1 rounded-full" style={{ background: section.color || "#38bdf8" }} />
        {editing ? (
          <input
            autoFocus
            defaultValue={section.title}
            onBlur={(e) => { setEditing(false); onRename(e.target.value); }}
            onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
            className="min-w-0 flex-1 bg-transparent text-sm text-white/78 outline-none"
          />
        ) : (
          <span className="truncate text-sm text-white/78">{section.title}</span>
        )}
      </button>
      <div className="mt-2 hidden items-center gap-1 group-hover:flex">
        <button type="button" onClick={() => setEditing(true)} className="rounded-md px-2 py-1 text-[11px] text-white/40 hover:bg-white/8">Rename</button>
        <button type="button" onClick={onDuplicate} className="rounded-md px-2 py-1 text-[11px] text-white/40 hover:bg-white/8">Duplicate</button>
        <button type="button" onClick={() => onMove(-1)} className="rounded-md px-2 py-1 text-[11px] text-white/40 hover:bg-white/8">Up</button>
        <button type="button" onClick={() => onMove(1)} className="rounded-md px-2 py-1 text-[11px] text-white/40 hover:bg-white/8">Down</button>
        <button type="button" onClick={onArchive} className="ml-auto rounded-md px-2 py-1 text-[11px] text-red-300/70 hover:bg-red-500/10">Archive</button>
      </div>
    </div>
  );
}

function PageRow({
  page,
  active,
  subpage,
  onSelect,
  onRename,
  onDuplicate,
  onArchive,
  onMove,
}: {
  page: Page;
  active: boolean;
  subpage?: boolean;
  onSelect: () => void;
  onRename: (title: string) => void;
  onDuplicate: () => void;
  onArchive: () => void;
  onMove: (direction: -1 | 1) => void;
}) {
  const [editing, setEditing] = useState(false);
  return (
    <div className={`${subpage ? "ml-4" : ""} group rounded-xl border px-3 py-2.5 transition-colors ${active ? "border-sky-300/30 bg-sky-400/12" : "border-transparent hover:bg-white/5"}`}>
      <button type="button" onClick={onSelect} className="block w-full text-left">
        <div className="flex items-center gap-2">
          {page.isPinned && <span className="text-amber-300">pin</span>}
          {page.isFavorite && <span className="text-sky-300">star</span>}
          {editing ? (
            <input
              autoFocus
              defaultValue={page.title}
              onBlur={(e) => { setEditing(false); onRename(e.target.value); }}
              onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
              className="min-w-0 flex-1 bg-transparent text-sm font-medium text-white/82 outline-none"
            />
          ) : (
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-white/82">{page.title}</span>
          )}
        </div>
        <div className="mt-1 flex items-center gap-2 text-[11px] text-white/30">
          <span>{relativeTime(page._updatedAt)}</span>
          {page.tags.slice(0, 2).map((tag) => <span key={tag} className="rounded-full bg-white/6 px-1.5">{tag}</span>)}
        </div>
      </button>
      <div className="mt-2 hidden items-center gap-1 group-hover:flex">
        <button type="button" onClick={() => setEditing(true)} className="rounded-md px-2 py-1 text-[11px] text-white/40 hover:bg-white/8">Rename</button>
        <button type="button" onClick={onDuplicate} className="rounded-md px-2 py-1 text-[11px] text-white/40 hover:bg-white/8">Duplicate</button>
        <button type="button" onClick={() => onMove(-1)} className="rounded-md px-2 py-1 text-[11px] text-white/40 hover:bg-white/8">Up</button>
        <button type="button" onClick={() => onMove(1)} className="rounded-md px-2 py-1 text-[11px] text-white/40 hover:bg-white/8">Down</button>
        <button type="button" onClick={onArchive} className="ml-auto rounded-md px-2 py-1 text-[11px] text-red-300/70 hover:bg-red-500/10">Archive</button>
      </div>
    </div>
  );
}

export default function NotesClient() {
  const [payload, setPayload] = useState<NotesPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [workspacesCollapsed, setWorkspacesCollapsed] = useState(false);
  const [pagesCollapsed, setPagesCollapsed] = useState(false);
  const [contextOpen, setContextOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [filterMode, setFilterMode] = useState<"all" | "favorites" | "recent" | "tags">("all");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [drawingActive, setDrawingActive] = useState(false);
  const [saving, setSaving] = useState(false);
  const [processingFile, setProcessingFile] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [guide, setGuide] = useState<{ x?: number; y?: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragRef = useRef<{ id: string; startX: number; startY: number; baseX: number; baseY: number } | null>(null);
  const resizeRef = useRef<{ id: string; startX: number; startY: number; baseW: number; baseH: number } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/notes");
      if (!res.ok) throw new Error("Failed to load notes");
      const data = await res.json() as NotesPayload;
      setPayload(data);
      const workspaceId = selectedWorkspaceId || data.workspaces[0]?._id || data.defaults.workspaceId;
      const sectionId = selectedSectionId || data.sections.find((section) => section.workspaceId === workspaceId)?._id || data.defaults.sectionId;
      const pageId = selectedPageId || data.pages.find((page) => page.sectionId === sectionId)?._id || data.pages[0]?._id || null;
      setSelectedWorkspaceId(workspaceId);
      setSelectedSectionId(sectionId);
      setSelectedPageId(pageId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load notes");
    } finally {
      setLoading(false);
    }
  }, [selectedPageId, selectedSectionId, selectedWorkspaceId]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!contextOpen) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setContextOpen(false);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [contextOpen]);

  const workspaces = useMemo(() => payload?.workspaces ?? [], [payload?.workspaces]);
  const sections = useMemo(() => payload?.sections ?? [], [payload?.sections]);
  const pages = useMemo(() => payload?.pages ?? [], [payload?.pages]);
  const selectedWorkspace = workspaces.find((workspace) => workspace._id === selectedWorkspaceId) ?? null;
  const workspaceSections = sections.filter((section) => section.workspaceId === selectedWorkspaceId);
  const selectedSection = sections.find((section) => section._id === selectedSectionId) ?? workspaceSections[0] ?? null;
  const selectedPage = pages.find((page) => page._id === selectedPageId) ?? null;
  const allTags = useMemo(() => [...new Set(pages.flatMap((page) => page.tags))].sort(), [pages]);

  const visiblePages = useMemo(() => {
    const search = query.trim().toLowerCase();
    return pages
      .filter((page) => page.sectionId === selectedSectionId)
      .filter((page) => {
        if (filterMode === "favorites" && !page.isFavorite && !page.isPinned) return false;
        if (filterMode === "recent" && Date.now() - new Date(page._updatedAt).getTime() > 7 * 24 * 60 * 60 * 1000) return false;
        if (filterMode === "tags" && selectedTag && !page.tags.includes(selectedTag)) return false;
        if (!search) return true;
        const haystack = `${page.title} ${page.content ?? ""} ${page.tags.join(" ")} ${page.linkedRecords.map((link) => link.label).join(" ")}`.toLowerCase();
        return haystack.includes(search);
      })
      .sort((a, b) => {
        if (a.parentPageId && !b.parentPageId) return 1;
        if (!a.parentPageId && b.parentPageId) return -1;
        return (a.order ?? 0) - (b.order ?? 0);
      });
  }, [filterMode, pages, query, selectedSectionId, selectedTag]);

  const blocks = useMemo(() => blocksForPage(selectedPage), [selectedPage]);
  const canvasData = useMemo(() => parseJson<CanvasData>(selectedPage?.canvasData, { strokes: [] }), [selectedPage?.canvasData]);

  function updatePayload(updater: (payload: NotesPayload) => NotesPayload) {
    setPayload((prev) => prev ? updater(prev) : prev);
  }

  function patchEntity(id: string, targetType: "workspace" | "section" | "page", patch: Record<string, unknown>, debounce = false) {
    updatePayload((current) => {
      if (targetType === "workspace") {
        return { ...current, workspaces: current.workspaces.map((item) => item._id === id ? { ...item, ...patch } : item) };
      }
      if (targetType === "section") {
        return { ...current, sections: current.sections.map((item) => item._id === id ? { ...item, ...patch } : item) };
      }
      return {
        ...current,
        pages: current.pages.map((item) => item._id === id ? { ...item, ...patch, _updatedAt: new Date().toISOString() } as Page : item),
      };
    });

    const send = async () => {
      setSaving(true);
      try {
        const res = await fetch(`/api/admin/notes/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ targetType, ...patch }),
        });
        if (!res.ok) throw new Error("Save failed");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Save failed");
      } finally {
        setSaving(false);
      }
    };

    if (debounce) {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(send, 650);
    } else {
      void send();
    }
  }

  function patchPage(patch: Partial<Page>, debounce = true) {
    if (!selectedPage) return;
    patchEntity(selectedPage._id, "page", patch as Record<string, unknown>, debounce);
  }

  function updateBlocks(next: NoteBlock[], debounce = true) {
    if (!selectedPage) return;
    patchPage({ blocksJson: JSON.stringify(next), content: pageTextFromBlocks(next) }, debounce);
  }

  function addBlock(type: NoteBlockType, x = 120, y = 120, metadata: Record<string, unknown> = {}, content = "") {
    if (!selectedPage) return;
    const now = new Date().toISOString();
    const maxZ = Math.max(10, ...blocks.map((block) => block.zIndex));
    const nextBlock: NoteBlock = {
      id: uid(type),
      pageId: selectedPage._id,
      type,
      content: content || (type === "checklist" ? "[ ] New item" : type === "link" ? "Bookmark" : ""),
      x,
      y,
      width: type === "image" ? 460 : type === "file" ? 420 : 420,
      height: type === "image" ? 320 : type === "file" ? 132 : 220,
      zIndex: maxZ + 1,
      metadata,
      createdAt: now,
      updatedAt: now,
    };
    setSelectedBlockId(nextBlock.id);
    updateBlocks([...blocks, nextBlock], false);
  }

  function updateBlock(id: string, updates: Partial<NoteBlock>, debounce = true) {
    updateBlocks(blocks.map((block) => block.id === id ? { ...block, ...updates, updatedAt: new Date().toISOString() } : block), debounce);
  }

  function duplicateBlock(block: NoteBlock) {
    const now = new Date().toISOString();
    const copy = {
      ...block,
      id: uid(block.type),
      x: block.x + 28,
      y: block.y + 28,
      zIndex: Math.max(...blocks.map((item) => item.zIndex), block.zIndex) + 1,
      createdAt: now,
      updatedAt: now,
    };
    setSelectedBlockId(copy.id);
    updateBlocks([...blocks, copy], false);
  }

  function deleteBlock(id: string) {
    updateBlocks(blocks.filter((block) => block.id !== id), false);
    if (selectedBlockId === id) setSelectedBlockId(null);
  }

  function layerBlock(block: NoteBlock, direction: "front" | "back") {
    const zIndexes = blocks.map((item) => item.zIndex);
    updateBlock(block.id, { zIndex: direction === "front" ? Math.max(...zIndexes) + 1 : Math.min(...zIndexes) - 1 }, false);
  }

  function startDrag(e: React.PointerEvent, block: NoteBlock) {
    e.stopPropagation();
    setSelectedBlockId(block.id);
    dragRef.current = { id: block.id, startX: e.clientX, startY: e.clientY, baseX: block.x, baseY: block.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function dragBlock(e: React.PointerEvent) {
    if (!dragRef.current) return;
    const rawX = Math.max(0, Math.min(CANVAS_WIDTH - 120, dragRef.current.baseX + e.clientX - dragRef.current.startX));
    const rawY = Math.max(0, Math.min(CANVAS_HEIGHT - 80, dragRef.current.baseY + e.clientY - dragRef.current.startY));
    const snapX = Math.round(rawX / 20) * 20;
    const snapY = Math.round(rawY / 20) * 20;
    const nearX = Math.abs(rawX - snapX) < 6;
    const nearY = Math.abs(rawY - snapY) < 6;
    setGuide({ x: nearX ? snapX : undefined, y: nearY ? snapY : undefined });
    updateBlock(dragRef.current.id, { x: nearX ? snapX : rawX, y: nearY ? snapY : rawY }, true);
  }

  function startResize(e: React.PointerEvent, block: NoteBlock) {
    e.stopPropagation();
    setSelectedBlockId(block.id);
    resizeRef.current = { id: block.id, startX: e.clientX, startY: e.clientY, baseW: block.width, baseH: block.height };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function resizeBlock(e: React.PointerEvent) {
    if (!resizeRef.current) return;
    updateBlock(resizeRef.current.id, {
      width: Math.max(180, resizeRef.current.baseW + e.clientX - resizeRef.current.startX),
      height: Math.max(96, resizeRef.current.baseH + e.clientY - resizeRef.current.startY),
    }, true);
  }

  useEffect(() => {
    function clearInteraction() {
      dragRef.current = null;
      resizeRef.current = null;
      setGuide(null);
    }
    window.addEventListener("pointerup", clearInteraction);
    return () => window.removeEventListener("pointerup", clearInteraction);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const editing = target?.tagName === "TEXTAREA" || target?.tagName === "INPUT";
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "n") {
        e.preventDefault();
        void createPage();
      }
      if (!editing && e.key === "Delete" && selectedBlockId) {
        deleteBlock(selectedBlockId);
      }
      if (!editing && e.key.toLowerCase() === "t") addBlock("text", 120, 120);
      if (!editing && e.key.toLowerCase() === "c") addBlock("checklist", 140, 140);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  async function createWorkspace() {
    const res = await fetch("/api/admin/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "workspace", title: "New Workspace" }),
    });
    if (!res.ok) return setError("Failed to create workspace");
    await load();
  }

  async function createSection() {
    if (!selectedWorkspaceId) return;
    const res = await fetch("/api/admin/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "section", title: "New Section", workspaceId: selectedWorkspaceId }),
    });
    if (!res.ok) return setError("Failed to create section");
    const section = await res.json() as Section;
    await load();
    setSelectedSectionId(section._id);
  }

  async function createPage(parentPageId: string | null = null) {
    if (!selectedWorkspaceId || !selectedSectionId) return;
    const res = await fetch("/api/admin/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "page",
        title: parentPageId ? "New Subpage" : "Untitled Page",
        workspaceId: selectedWorkspaceId,
        sectionId: selectedSectionId,
        parentPageId,
        blocksJson: JSON.stringify([]),
      }),
    });
    if (!res.ok) return setError("Failed to create page");
    const page = await res.json() as Page;
    await load();
    setSelectedPageId(page._id);
  }

  async function duplicateEntity(target: "workspace" | "section" | "page", id: string) {
    const action = target === "workspace" ? "duplicateWorkspace" : target === "section" ? "duplicateSection" : "duplicatePage";
    const body = target === "workspace" ? { action, workspaceId: id } : target === "section" ? { action, sectionId: id } : { action, pageId: id };
    const res = await fetch("/api/admin/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return setError(`Failed to duplicate ${target}`);
    await load();
  }

  async function archiveEntity(target: "workspace" | "section" | "page", id: string) {
    if (!confirm(`Archive this ${target}?`)) return;
    const res = await fetch(`/api/admin/notes/${id}?target=${target}`, { method: "DELETE" });
    if (!res.ok) return setError(`Failed to archive ${target}`);
    updatePayload((current) => ({
      ...current,
      workspaces: target === "workspace" ? current.workspaces.filter((item) => item._id !== id) : current.workspaces,
      sections: target === "section" ? current.sections.filter((item) => item._id !== id) : current.sections,
      pages: target === "page" ? current.pages.filter((item) => item._id !== id) : current.pages,
    }));
    if (selectedPageId === id) setSelectedPageId(null);
  }

  function moveItem(target: "workspace" | "section" | "page", id: string, direction: -1 | 1) {
    const collection = target === "workspace" ? workspaces : target === "section" ? workspaceSections : visiblePages.filter((page) => !page.parentPageId);
    const index = collection.findIndex((item) => item._id === id);
    const swap = collection[index + direction];
    const current = collection[index];
    if (!current || !swap) return;
    const currentOrder = current.order ?? index;
    const swapOrder = swap.order ?? index + direction;
    patchEntity(current._id, target, { order: swapOrder }, false);
    patchEntity(swap._id, target, { order: currentOrder }, false);
  }

  async function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    if (!selectedPage) return;
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setProcessingFile(true);
    try {
      let next = [...blocks];
      for (const file of files) {
        const att = await processFile(file);
        next = [...next, fileBlockFromAttachment(selectedPage._id, att, 160 + next.length * 24, 160 + next.length * 24, Math.max(10, ...next.map((block) => block.zIndex)) + 1)];
      }
      updateBlocks(next, false);
    } finally {
      setProcessingFile(false);
      e.target.value = "";
    }
  }

  function createLinkBlock() {
    const url = window.prompt("Bookmark URL");
    if (!url) return;
    addBlock("link", 150, 150, { url }, url);
  }

  async function runAi(action: "summarize" | "tasks" | "cleanup" | "proposal" | "email" | "organize") {
    if (!payload?.aiAvailable || !selectedPage) return;
    setAiBusy(true);
    try {
      const source = pageTextFromBlocks(blocks) || selectedPage.content || selectedPage.title;
      const promptMap = {
        summarize: "Summarize this CEL3 Interactive backoffice note in a concise executive style.",
        tasks: "Extract actionable tasks from this note. Return clear bullets with owners or due dates when present.",
        cleanup: "Clean up this note into organized, polished internal notes while preserving facts.",
        proposal: "Turn this note into a draft proposal outline for CEL3 Interactive.",
        email: "Turn this note into a professional follow-up email draft.",
        organize: "Suggest how to organize these notes into sections and pages.",
      };
      const res = await fetch("/api/admin/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{
            role: "user",
            content: `${promptMap[action]}\n\nNote title: ${selectedPage.title}\n\n${source}`,
          }],
        }),
      });
      if (!res.ok) throw new Error("AI action failed");
      const data = await res.json() as { response?: string };
      addBlock("ai", 180, 180, { action, sourcePageId: selectedPage._id }, data.response || "No AI output returned.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI action failed");
    } finally {
      setAiBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-[calc(100dvh-8rem)] items-center justify-center rounded-2xl border border-white/8 bg-black/20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-sky-300" />
      </div>
    );
  }

  if (error && !payload) {
    return (
      <div className="flex h-[calc(100dvh-8rem)] flex-col items-center justify-center gap-3 rounded-2xl border border-red-400/20 bg-red-500/8 text-center">
        <p className="text-sm font-semibold text-red-100">Notes could not load</p>
        <p className="text-xs text-red-100/55">{error}</p>
        <button type="button" onClick={load} className="rounded-xl bg-white/10 px-4 py-2 text-sm text-white/75 hover:bg-white/15">Retry</button>
      </div>
    );
  }

  return (
    <div className="notes-workspace flex h-full min-h-[720px] overflow-hidden border border-white/10 bg-[#05070a] shadow-[0_24px_90px_rgba(0,0,0,0.35)]">
      <style>{`
        .notes-doc-content table { border-collapse: collapse; width: 100%; font-size: 11px; }
        .notes-doc-content th, .notes-doc-content td { border: 1px solid rgba(255,255,255,0.1); padding: 3px 6px; text-align: left; }
        .notes-doc-content th { background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.8); }
        .notes-doc-content td, .notes-doc-content p, .notes-doc-content li { color: rgba(255,255,255,0.68); }
      `}</style>

      <aside className={`hidden shrink-0 flex-col overflow-hidden border-r border-white/8 bg-white/[0.025] transition-[width] duration-300 md:flex ${workspacesCollapsed ? "w-12" : "w-72"}`}>
        {workspacesCollapsed ? (
          <button
            type="button"
            onClick={() => setWorkspacesCollapsed(false)}
            className="flex h-full w-12 items-center justify-center text-[11px] font-semibold uppercase tracking-[0.24em] text-white/38 transition-colors hover:bg-white/[0.04] hover:text-sky-200"
            aria-label="Open workspaces panel"
          >
            <span className="-rotate-90 whitespace-nowrap">Workspaces</span>
          </button>
        ) : (
        <>
        <div className="border-b border-white/8 p-4">
          <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-300">CEL3 Notes</div>
          <div className="mt-2 flex items-center gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search notes, tags, clients..."
              className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/72 outline-none placeholder:text-white/22"
            />
            <button type="button" onClick={createWorkspace} className="h-9 w-9 rounded-xl bg-sky-500 text-white shadow-[0_12px_30px_rgba(14,165,233,0.25)]">+</button>
            <button type="button" onClick={() => setWorkspacesCollapsed(true)} className="h-9 rounded-xl bg-white/8 px-2 text-xs text-white/45 hover:bg-white/12 hover:text-white/72" aria-label="Collapse workspaces panel">Collapse</button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-white/25">Workspaces</span>
          </div>
          <div className="space-y-1.5">
            {workspaces.map((workspace) => (
              <WorkspaceRow
                key={workspace._id}
                workspace={workspace}
                active={workspace._id === selectedWorkspaceId}
                onSelect={() => {
                  setSelectedWorkspaceId(workspace._id);
                  const firstSection = sections.find((section) => section.workspaceId === workspace._id);
                  setSelectedSectionId(firstSection?._id ?? null);
                  setSelectedPageId(pages.find((page) => page.sectionId === firstSection?._id)?._id ?? null);
                }}
                onRename={(title) => patchEntity(workspace._id, "workspace", { title }, false)}
                onDuplicate={() => duplicateEntity("workspace", workspace._id)}
                onArchive={() => archiveEntity("workspace", workspace._id)}
                onMove={(direction) => moveItem("workspace", workspace._id, direction)}
              />
            ))}
          </div>

          <div className="mt-6 mb-3 flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-white/25">Sections</span>
            <button type="button" onClick={createSection} className="rounded-lg bg-white/8 px-2 py-1 text-xs text-white/55 hover:bg-white/12">New</button>
          </div>
          <div className="space-y-1">
            {workspaceSections.length === 0 ? (
              <button type="button" onClick={createSection} className="w-full rounded-xl border border-dashed border-white/12 px-3 py-6 text-sm text-white/35">Create a section</button>
            ) : workspaceSections.map((section) => (
              <SectionRow
                key={section._id}
                section={section}
                active={section._id === selectedSectionId}
                onSelect={() => {
                  setSelectedSectionId(section._id);
                  setSelectedPageId(pages.find((page) => page.sectionId === section._id)?._id ?? null);
                }}
                onRename={(title) => patchEntity(section._id, "section", { title }, false)}
                onDuplicate={() => duplicateEntity("section", section._id)}
                onArchive={() => archiveEntity("section", section._id)}
                onMove={(direction) => moveItem("section", section._id, direction)}
              />
            ))}
          </div>
        </div>
        </>
        )}
      </aside>

      <aside className={`hidden shrink-0 flex-col overflow-hidden border-r border-white/8 bg-black/18 transition-[width] duration-300 lg:flex ${pagesCollapsed ? "w-12" : "w-80"}`}>
        {pagesCollapsed ? (
          <button
            type="button"
            onClick={() => setPagesCollapsed(false)}
            className="flex h-full w-12 items-center justify-center text-[11px] font-semibold uppercase tracking-[0.24em] text-white/38 transition-colors hover:bg-white/[0.04] hover:text-sky-200"
            aria-label="Open pages panel"
          >
            <span className="-rotate-90 whitespace-nowrap">Pages</span>
          </button>
        ) : (
        <>
        <div className="border-b border-white/8 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-white/82">{selectedSection?.title ?? "Pages"}</div>
              <div className="mt-0.5 text-xs text-white/28">{visiblePages.length} page{visiblePages.length === 1 ? "" : "s"}</div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button type="button" onClick={() => createPage()} className="rounded-xl bg-sky-500 px-3 py-2 text-xs font-semibold text-white">New Page</button>
              <button type="button" onClick={() => setPagesCollapsed(true)} className="rounded-xl bg-white/8 px-2 py-2 text-xs text-white/45 hover:bg-white/12 hover:text-white/72" aria-label="Collapse pages panel">Collapse</button>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-4 gap-1 rounded-xl border border-white/8 bg-white/[0.035] p-1">
            {(["all", "favorites", "recent", "tags"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setFilterMode(mode)}
                className={`rounded-lg px-2 py-1.5 text-[11px] capitalize transition-colors ${filterMode === mode ? "bg-white/12 text-white/78" : "text-white/35 hover:text-white/62"}`}
              >
                {mode}
              </button>
            ))}
          </div>
          {filterMode === "tags" && (
            <select value={selectedTag ?? ""} onChange={(e) => setSelectedTag(e.target.value || null)} className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70 outline-none">
              <option value="">Any tag</option>
              {allTags.map((tag) => <option key={tag} value={tag}>{tag}</option>)}
            </select>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {visiblePages.length === 0 ? (
            <div className="flex h-44 flex-col items-center justify-center rounded-2xl border border-dashed border-white/12 text-center">
              <p className="text-sm text-white/42">No pages here</p>
              <button type="button" onClick={() => createPage()} className="mt-3 rounded-xl bg-white/8 px-3 py-2 text-xs text-white/62 hover:bg-white/12">Create page</button>
            </div>
          ) : (
            <div className="space-y-1.5">
              {visiblePages.filter((page) => !page.parentPageId).map((page) => (
                <div key={page._id} className="space-y-1">
                  <PageRow
                    page={page}
                    active={page._id === selectedPageId}
                    onSelect={() => setSelectedPageId(page._id)}
                    onRename={(title) => patchEntity(page._id, "page", { title }, false)}
                    onDuplicate={() => duplicateEntity("page", page._id)}
                    onArchive={() => archiveEntity("page", page._id)}
                    onMove={(direction) => moveItem("page", page._id, direction)}
                  />
                  {visiblePages.filter((subpage) => subpage.parentPageId === page._id).map((subpage) => (
                    <PageRow
                      key={subpage._id}
                      page={subpage}
                      subpage
                      active={subpage._id === selectedPageId}
                      onSelect={() => setSelectedPageId(subpage._id)}
                      onRename={(title) => patchEntity(subpage._id, "page", { title }, false)}
                      onDuplicate={() => duplicateEntity("page", subpage._id)}
                      onArchive={() => archiveEntity("page", subpage._id)}
                      onMove={(direction) => moveItem("page", subpage._id, direction)}
                    />
                  ))}
                  <button type="button" onClick={() => createPage(page._id)} className="ml-4 rounded-lg px-2 py-1 text-[11px] text-white/28 hover:bg-white/6 hover:text-white/55">Add subpage</button>
                </div>
              ))}
            </div>
          )}
        </div>
        </>
        )}
      </aside>

      <main className="flex min-w-0 flex-1 flex-col bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.12),transparent_32%),linear-gradient(180deg,#071018,#05070a)]">
        <div className="flex shrink-0 flex-col gap-2 border-b border-white/8 bg-black/35 p-3 lg:hidden">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
            <select
              value={selectedWorkspaceId ?? ""}
              onChange={(e) => {
                const workspaceId = e.target.value;
                const firstSection = sections.find((section) => section.workspaceId === workspaceId);
                setSelectedWorkspaceId(workspaceId);
                setSelectedSectionId(firstSection?._id ?? null);
                setSelectedPageId(pages.find((page) => page.sectionId === firstSection?._id)?._id ?? null);
              }}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/72 outline-none"
            >
              {workspaces.map((workspace) => <option key={workspace._id} value={workspace._id}>{workspace.title}</option>)}
            </select>
            <select
              value={selectedSectionId ?? ""}
              onChange={(e) => {
                setSelectedSectionId(e.target.value);
                setSelectedPageId(pages.find((page) => page.sectionId === e.target.value)?._id ?? null);
              }}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/72 outline-none"
            >
              {workspaceSections.map((section) => <option key={section._id} value={section._id}>{section.title}</option>)}
            </select>
            <select
              value={selectedPageId ?? ""}
              onChange={(e) => setSelectedPageId(e.target.value || null)}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/72 outline-none"
            >
              <option value="">Select page</option>
              {visiblePages.map((page) => <option key={page._id} value={page._id}>{page.parentPageId ? "- " : ""}{page.title}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={createWorkspace} className="rounded-xl bg-white/8 px-3 py-2 text-xs text-white/62">Workspace</button>
            <button type="button" onClick={createSection} className="rounded-xl bg-white/8 px-3 py-2 text-xs text-white/62">Section</button>
            <button type="button" onClick={() => createPage()} className="rounded-xl bg-sky-500 px-3 py-2 text-xs font-semibold text-white">Page</button>
          </div>
        </div>

        {selectedPage ? (
          <>
            <header className="flex shrink-0 flex-wrap items-center gap-3 border-b border-white/8 bg-black/20 px-4 py-3 backdrop-blur-xl">
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center gap-2 text-[11px] text-white/32">
                  <span>{selectedWorkspace?.title ?? "Workspace"}</span>
                  <span>/</span>
                  <span>{selectedSection?.title ?? "Section"}</span>
                  <span>/</span>
                  <span className="text-sky-200/72">{selectedPage.title}</span>
                </div>
                <input
                  value={selectedPage.title}
                  onChange={(e) => patchPage({ title: e.target.value }, true)}
                  className="w-full bg-transparent text-xl font-semibold text-white/90 outline-none placeholder:text-white/20"
                  placeholder="Untitled Page"
                />
              </div>
              {saving && <span className="text-xs text-white/30">Saving...</span>}
              {error && <span className="rounded-lg bg-red-500/10 px-2 py-1 text-xs text-red-200">{error}</span>}
              <button type="button" onClick={() => setContextOpen(true)} className="rounded-xl bg-sky-500/12 px-3 py-2 text-xs text-sky-100/75 hover:bg-sky-500/18">Page Context</button>
              <button type="button" onClick={() => patchPage({ isPinned: !selectedPage.isPinned }, false)} className={`rounded-xl px-3 py-2 text-xs ${selectedPage.isPinned ? "bg-amber-500/18 text-amber-200" : "bg-white/8 text-white/52 hover:bg-white/12"}`}>Pin</button>
              <button type="button" onClick={() => patchPage({ isFavorite: !selectedPage.isFavorite }, false)} className={`rounded-xl px-3 py-2 text-xs ${selectedPage.isFavorite ? "bg-sky-500/18 text-sky-200" : "bg-white/8 text-white/52 hover:bg-white/12"}`}>Favorite</button>
            </header>

            <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-white/8 bg-black/12 px-4 py-2">
              <button type="button" onClick={() => addBlock("text", 120, 120)} className="rounded-xl bg-white/8 px-3 py-2 text-xs text-white/62 hover:bg-white/12">Text</button>
              <button type="button" onClick={() => addBlock("checklist", 140, 140)} className="rounded-xl bg-white/8 px-3 py-2 text-xs text-white/62 hover:bg-white/12">Checklist</button>
              <button type="button" onClick={createLinkBlock} className="rounded-xl bg-white/8 px-3 py-2 text-xs text-white/62 hover:bg-white/12">Link</button>
              <button type="button" onClick={() => fileInputRef.current?.click()} className="rounded-xl bg-white/8 px-3 py-2 text-xs text-white/62 hover:bg-white/12">{processingFile ? "Processing..." : "Image/File"}</button>
              <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileInput} accept="image/*,video/*,application/pdf,.docx,.xlsx,.xls,.csv,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,*/*" />
              <div className="h-6 w-px bg-white/10" />
              {payload?.aiAvailable ? (
                <div className="flex flex-wrap items-center gap-1">
                  {(["summarize", "tasks", "cleanup", "proposal", "email", "organize"] as const).map((action) => (
                    <button key={action} type="button" disabled={aiBusy} onClick={() => runAi(action)} className="rounded-xl bg-sky-500/10 px-3 py-2 text-xs text-sky-100/75 hover:bg-sky-500/16 disabled:opacity-45">
                      {aiBusy ? "AI..." : action}
                    </button>
                  ))}
                </div>
              ) : (
                <span className="text-xs text-white/25">AI actions appear when the backoffice AI service is configured.</span>
              )}
            </div>

            <div className="flex min-h-0 flex-1">
              <div className="min-w-0 flex-1 overflow-auto">
                <div
                  className="relative m-5 rounded-2xl border border-white/10 bg-[#f6f8fb] shadow-[0_28px_90px_rgba(0,0,0,0.36)]"
                  style={{
                    width: CANVAS_WIDTH,
                    height: CANVAS_HEIGHT,
                    backgroundImage: "radial-gradient(circle, rgba(10,20,30,0.12) 1px, transparent 1px)",
                    backgroundSize: "24px 24px",
                  }}
                  onPointerDown={(e) => {
                    if (drawingActive) return;
                    if (e.target !== e.currentTarget) return;
                    const rect = e.currentTarget.getBoundingClientRect();
                    addBlock("text", e.clientX - rect.left, e.clientY - rect.top);
                    setSelectedBlockId(null);
                  }}
                >
                  {blocks.length === 0 && (canvasData.strokes?.length ?? 0) === 0 && (
                    <div className="pointer-events-none absolute left-24 top-24 max-w-sm rounded-2xl border border-sky-500/15 bg-white/80 p-5 text-slate-600 shadow-xl">
                      <p className="text-sm font-semibold text-slate-900">Start anywhere</p>
                      <p className="mt-1 text-sm leading-relaxed">Click the canvas to create a note block, drag blocks freely, or turn on Ink for pen and highlighter strokes.</p>
                    </div>
                  )}
                  {guide?.x !== undefined && <div className="pointer-events-none absolute top-0 h-full w-px bg-sky-400/55" style={{ left: guide.x }} />}
                  {guide?.y !== undefined && <div className="pointer-events-none absolute left-0 h-px w-full bg-sky-400/55" style={{ top: guide.y }} />}
                  {blocks.map((block) => (
                    <NoteBlockView
                      key={block.id}
                      block={block}
                      selected={block.id === selectedBlockId}
                      onSelect={() => setSelectedBlockId(block.id)}
                      onChange={(updates) => updateBlock(block.id, updates)}
                      onDelete={() => deleteBlock(block.id)}
                      onDuplicate={() => duplicateBlock(block)}
                      onLayer={(direction) => layerBlock(block, direction)}
                      onDragStart={startDrag}
                      onDrag={dragBlock}
                      onResizeStart={startResize}
                      onResize={resizeBlock}
                    />
                  ))}
                  <DrawingLayer
                    key={selectedPage._id}
                    data={canvasData}
                    active={drawingActive}
                    onActiveChange={setDrawingActive}
                    onSave={(nextData) => patchPage({ canvasData: JSON.stringify(nextData) }, true)}
                  />
                </div>
              </div>
            </div>
            {contextOpen && (
              <PageContextPanel
                page={selectedPage}
                linkOptions={payload?.linkOptions ?? { clients: [], projects: [], tasks: [], invoices: [], tickets: [] }}
                onPatch={(patch) => patchPage(patch, false)}
                onClose={() => setContextOpen(false)}
              />
            )}
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
              <p className="text-lg font-semibold text-white/78">No page selected</p>
              <p className="mt-2 max-w-sm text-sm leading-relaxed text-white/38">Create a page in the current section to start a freeform CEL3 workspace note.</p>
              <button type="button" onClick={() => createPage()} className="mt-5 rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-white">Create Page</button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
