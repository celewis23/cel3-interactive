"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
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
type NoteState = "active" | "archived" | "trash";
type QuickFilter = "all" | "favorites" | "archived" | "trash";
type SortMode = "updated" | "created" | "title" | "favorites";

type Page = {
  _id: string;
  title: string;
  content: string | null;
  canvasData: string | null;
  blocksJson: string | null;
  color: string | null;
  isPinned: boolean;
  isFavorite: boolean;
  isArchived: boolean;
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

type NoteBlockType = "text" | "checklist" | "image" | "link" | "audio" | "video" | "file" | "drawing" | "ai";

type NoteBlock = {
  id: string;
  pageId: string;
  type: NoteBlockType;
  content: string;
  contentJson?: string | null;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  zIndex?: number;
  metadata?: Record<string, unknown>;
  metadataJson?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type Stroke = {
  id: string;
  points: number[][];
  color: string;
  size: number;
  isEraser: boolean;
};

type DrawingContent = {
  strokes: Stroke[];
  width: number;
  height: number;
};

type AttachmentContent = {
  src?: string;
  title?: string;
  caption?: string;
  mimeType?: string;
  size?: number;
  name?: string;
};

type SaveStatus = "saved" | "dirty" | "saving" | "error";
type MobileView = "library" | "list" | "editor";

const PEN_COLORS = ["#0f172a", "#38bdf8", "#22c55e", "#f43f5e", "#f59e0b", "#8b5cf6"];
const PEN_SIZES = [2, 4, 7, 12];

function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
}

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function htmlEscape(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function stripHtml(value: string) {
  return value.replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
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

function formatDate(iso?: string) {
  if (!iso) return "Unknown";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function metadataFor(page: Pick<Page, "metadataJson" | "isArchived">): Record<string, unknown> {
  return parseJson<Record<string, unknown>>(page.metadataJson, {});
}

function noteState(page: Pick<Page, "metadataJson" | "isArchived">): NoteState {
  const state = metadataFor(page).noteState;
  if (state === "trash" || state === "archived") return state;
  return page.isArchived ? "archived" : "active";
}

function withNoteState(page: Page, state: NoteState) {
  return JSON.stringify({ ...metadataFor(page), noteState: state });
}

function blockContent<T>(block: NoteBlock, fallback: T): T {
  return parseJson<T>(block.contentJson, fallback);
}

function blocksFor(page: Pick<Page, "blocksJson"> | null) {
  return parseJson<NoteBlock[]>(page?.blocksJson, []);
}

function plainTextFromBlocks(blocks: NoteBlock[]) {
  return blocks.map((block) => {
    if (block.type === "text" || block.type === "ai") {
      const content = blockContent<{ text?: string }>(block, { text: block.content });
      return content.text || block.content || "";
    }
    if (block.type === "checklist") {
      const content = blockContent<{ items?: Array<{ text?: string; checked?: boolean }> }>(block, { items: [] });
      return (content.items ?? []).map((item) => `${item.checked ? "[x]" : "[ ]"} ${item.text ?? ""}`).join("\n");
    }
    if (block.type === "link") {
      const content = blockContent<{ title?: string; url?: string; description?: string }>(block, {});
      return [content.title, content.url, content.description, block.content].filter(Boolean).join(" ");
    }
    const media = blockContent<AttachmentContent>(block, {});
    return [media.title, media.name, media.caption, block.content].filter(Boolean).join(" ");
  }).filter(Boolean).join("\n\n");
}

function htmlFromLegacyBlocks(page: Page) {
  const blocks = blocksFor(page);
  if (!blocks.length) return "";
  const chunks = blocks.map((block) => {
    if (block.type === "text" || block.type === "ai") {
      const content = blockContent<{ text?: string }>(block, { text: block.content });
      return (content.text || block.content || "")
        .split(/\n{2,}/)
        .map((paragraph) => `<p>${htmlEscape(paragraph).replace(/\n/g, "<br>")}</p>`)
        .join("");
    }
    if (block.type === "checklist") {
      const content = blockContent<{ items?: Array<{ id?: string; text?: string; checked?: boolean }> }>(block, { items: [] });
      return `<ul data-type="taskList">${(content.items ?? []).map((item) => (
        `<li data-type="taskItem" data-checked="${item.checked ? "true" : "false"}"><label><input type="checkbox"${item.checked ? " checked" : ""}><span></span></label><div><p>${htmlEscape(item.text ?? "")}</p></div></li>`
      )).join("")}</ul>`;
    }
    if (block.type === "link") {
      const content = blockContent<{ title?: string; url?: string; description?: string }>(block, {});
      const href = content.url || block.content || "#";
      return `<p><a href="${htmlEscape(href)}">${htmlEscape(content.title || href)}</a>${content.description ? ` - ${htmlEscape(content.description)}` : ""}</p>`;
    }
    return "";
  }).filter(Boolean);
  return chunks.join("") || `<p>${htmlEscape(plainTextFromBlocks(blocks))}</p>`;
}

function editorContentFor(page: Page | null) {
  if (!page) return "<p></p>";
  const content = page.content?.trim();
  if (content) {
    if (/<[a-z][\s\S]*>/i.test(content)) return content;
    return content.split(/\n{2,}/).map((paragraph) => `<p>${htmlEscape(paragraph).replace(/\n/g, "<br>")}</p>`).join("");
  }
  return htmlFromLegacyBlocks(page) || "<p></p>";
}

function pageSearchText(page: Page) {
  return [
    page.title,
    stripHtml(editorContentFor(page)),
    plainTextFromBlocks(blocksFor(page)),
    page.tags.join(" "),
    page.linkedRecords.map((record) => record.label).join(" "),
  ].join(" ").toLowerCase();
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function drawStrokeToCanvas(
  ctx: CanvasRenderingContext2D,
  points: number[][],
  size: number,
  color: string,
  isEraser: boolean
) {
  if (points.length < 2) return;
  const outline = getStroke(points, { size, thinning: 0.45, smoothing: 0.45, streamline: 0.45, simulatePressure: true });
  if (outline.length < 2) return;
  ctx.save();
  if (isEraser) {
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = "rgba(0,0,0,1)";
  } else {
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = color;
  }
  ctx.beginPath();
  ctx.moveTo(outline[0][0], outline[0][1]);
  for (let i = 1; i < outline.length; i += 1) ctx.lineTo(outline[i][0], outline[i][1]);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function createDrawingBlock(pageId: string, drawing: DrawingContent, existing?: NoteBlock): NoteBlock {
  const now = new Date().toISOString();
  return {
    id: existing?.id ?? uid("drawing"),
    pageId,
    type: "drawing",
    content: "Drawing",
    contentJson: JSON.stringify(drawing),
    width: drawing.width,
    height: drawing.height,
    zIndex: existing?.zIndex ?? 10,
    metadata: { editorBlock: true },
    metadataJson: JSON.stringify({ editorBlock: true }),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
}

function createAttachmentBlock(pageId: string, file: File, src: string): NoteBlock {
  const now = new Date().toISOString();
  const type: NoteBlockType = file.type.startsWith("image/") ? "image" : file.type.startsWith("audio/") ? "audio" : file.type.startsWith("video/") ? "video" : "file";
  const content: AttachmentContent = {
    src,
    title: file.name,
    name: file.name,
    mimeType: file.type || "application/octet-stream",
    size: file.size,
  };
  return {
    id: uid(type),
    pageId,
    type,
    content: file.name,
    contentJson: JSON.stringify(content),
    width: 560,
    height: type === "image" ? 340 : 132,
    zIndex: 10,
    metadata: { editorBlock: true, name: file.name, mimeType: content.mimeType, size: file.size, dataUrl: src },
    metadataJson: JSON.stringify({ editorBlock: true, name: file.name, mimeType: content.mimeType, size: file.size, dataUrl: src }),
    createdAt: now,
    updatedAt: now,
  };
}

function Icon({ name, size = 16 }: { name: string; size?: number }) {
  const paths: Record<string, React.ReactNode> = {
    all: <><path d="M4 4h16v16H4z" /><path d="M8 8h8M8 12h8M8 16h5" /></>,
    star: <path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9Z" />,
    archive: <><path d="M3 7h18M5 7v13h14V7" /><path d="M9 11h6" /></>,
    trash: <><path d="M3 6h18M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2" /></>,
    plus: <path d="M12 5v14M5 12h14" />,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>,
    folder: <path d="M3 6h7l2 2h9v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />,
    tag: <><path d="M20 12 12 20 4 12V4h8Z" /><circle cx="8.5" cy="8.5" r="1" /></>,
    pin: <><path d="m15 4 5 5-4 1-4 7-2-2 7-4Z" /><path d="m5 19 5-5" /></>,
    image: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m6 16 4-5 3 4 2-3 3 4" /></>,
    file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></>,
    pen: <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />,
    back: <path d="M15 18 9 12l6-6" />,
    more: <><circle cx="12" cy="5" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="12" cy="19" r="1" /></>,
    link: <><path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1.2 1.2" /><path d="M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1.2-1.2" /></>,
    check: <path d="m4 12 5 5L20 6" />,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name] ?? paths.all}
    </svg>
  );
}

function ToolbarButton({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onMouseDown={(event) => {
        event.preventDefault();
        onClick();
      }}
      className={`flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${
        active ? "bg-sky-500/18 text-sky-100" : "text-white/55 hover:bg-white/8 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

function RichNoteEditor({
  note,
  value,
  onChange,
  onImageFiles,
  onAttachFiles,
  onInsertDrawing,
}: {
  note: Page | null;
  value: string;
  onChange: (html: string) => void;
  onImageFiles: (files: FileList | File[]) => void;
  onAttachFiles: (files: FileList | File[]) => void;
  onInsertDrawing: () => void;
}) {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Underline,
      TaskList.configure({ HTMLAttributes: { class: "notes-task-list" } }),
      TaskItem.configure({ nested: true, HTMLAttributes: { class: "notes-task-item" } }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: "text-sky-700 underline underline-offset-2" },
      }),
      Image.configure({
        HTMLAttributes: { class: "notes-inline-image" },
      }),
      Placeholder.configure({
        placeholder: "Start writing...",
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: "notes-prosemirror min-h-full outline-none px-8 py-7 text-[15px] leading-7 text-slate-900 md:px-12 md:py-10",
      },
      handlePaste(view, event) {
        const files = Array.from(event.clipboardData?.files ?? []);
        const images = files.filter((file) => file.type.startsWith("image/"));
        if (!images.length) return false;
        event.preventDefault();
        void Promise.all(images.map(fileToDataUrl)).then((urls) => {
          urls.forEach((src) => {
            view.dispatch(view.state.tr.replaceSelectionWith(view.state.schema.nodes.image.create({ src })));
          });
        });
        return true;
      },
      handleDrop(view, event) {
        const files = Array.from(event.dataTransfer?.files ?? []);
        if (!files.length) return false;
        event.preventDefault();
        const images = files.filter((file) => file.type.startsWith("image/"));
        const others = files.filter((file) => !file.type.startsWith("image/"));
        if (images.length) onImageFiles(images);
        if (others.length) onAttachFiles(others);
        view.focus();
        return true;
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    if (editor.getHTML() !== value) {
      editor.commands.setContent(value || "<p></p>", { emitUpdate: false });
    }
  }, [editor, note?._id, value]);

  if (!editor) {
    return <div className="flex min-h-[420px] items-center justify-center text-sm text-slate-400">Loading editor...</div>;
  }

  function applyLink() {
    const previous = editor?.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL", previous || "https://");
    if (!url) return;
    editor?.chain().focus().setLink({ href: url.startsWith("http") ? url : `https://${url}` }).run();
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex shrink-0 flex-wrap items-center gap-1 border-b border-slate-200 bg-white px-3 py-2">
        <ToolbarButton label="Undo" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}>
          <span>Undo</span>
        </ToolbarButton>
        <ToolbarButton label="Redo" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}>
          <span>Redo</span>
        </ToolbarButton>
        <div className="mx-1 h-5 w-px bg-slate-200" />
        <ToolbarButton label="Heading 1" active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
          H1
        </ToolbarButton>
        <ToolbarButton label="Heading 2" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
          H2
        </ToolbarButton>
        <ToolbarButton label="Paragraph" active={editor.isActive("paragraph")} onClick={() => editor.chain().focus().setParagraph().run()}>
          P
        </ToolbarButton>
        <div className="mx-1 h-5 w-px bg-slate-200" />
        <ToolbarButton label="Bold" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
          <strong>B</strong>
        </ToolbarButton>
        <ToolbarButton label="Italic" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <em>I</em>
        </ToolbarButton>
        <ToolbarButton label="Underline" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}>
          <span className="underline">U</span>
        </ToolbarButton>
        <div className="mx-1 h-5 w-px bg-slate-200" />
        <ToolbarButton label="Bulleted list" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          Bullets
        </ToolbarButton>
        <ToolbarButton label="Numbered list" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          1.
        </ToolbarButton>
        <ToolbarButton label="Checklist" active={editor.isActive("taskList")} onClick={() => editor.chain().focus().toggleTaskList().run()}>
          <span className="flex items-center gap-1"><Icon name="check" size={13} /> Check</span>
        </ToolbarButton>
        <ToolbarButton label="Quote" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
          Quote
        </ToolbarButton>
        <ToolbarButton label="Code block" active={editor.isActive("codeBlock")} onClick={() => editor.chain().focus().toggleCodeBlock().run()}>
          Code
        </ToolbarButton>
        <ToolbarButton label="Divider" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
          HR
        </ToolbarButton>
        <div className="mx-1 h-5 w-px bg-slate-200" />
        <ToolbarButton label="Link" active={editor.isActive("link")} onClick={applyLink}>
          <Icon name="link" size={14} />
        </ToolbarButton>
        <ToolbarButton label="Image" onClick={() => imageInputRef.current?.click()}>
          <Icon name="image" size={14} />
        </ToolbarButton>
        <ToolbarButton label="Attach file" onClick={() => fileInputRef.current?.click()}>
          <Icon name="file" size={14} />
        </ToolbarButton>
        <ToolbarButton label="Insert drawing" onClick={onInsertDrawing}>
          <Icon name="pen" size={14} />
        </ToolbarButton>
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(event) => {
            if (event.target.files) onImageFiles(event.target.files);
            event.target.value = "";
          }}
        />
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(event) => {
            if (event.target.files) onAttachFiles(event.target.files);
            event.target.value = "";
          }}
        />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto bg-white">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

function DrawingPreview({ drawing }: { drawing: DrawingContent }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const width = 360;
    const height = Math.max(140, Math.round(width * drawing.height / drawing.width));
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.scale(width / drawing.width, height / drawing.height);
    drawing.strokes.forEach((stroke) => drawStrokeToCanvas(ctx, stroke.points, stroke.size, stroke.color, stroke.isEraser));
  }, [drawing]);

  return <canvas ref={canvasRef} className="w-full rounded-xl bg-white" style={{ height: 180 }} />;
}

function DrawingModal({
  initial,
  onClose,
  onSave,
}: {
  initial?: DrawingContent;
  onClose: () => void;
  onSave: (drawing: DrawingContent) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [strokes, setStrokes] = useState<Stroke[]>(initial?.strokes ?? []);
  const strokesRef = useRef<Stroke[]>(initial?.strokes ?? []);
  const currentRef = useRef<number[][]>([]);
  const [tool, setTool] = useState<"pen" | "eraser">("pen");
  const [color, setColor] = useState(PEN_COLORS[0]);
  const [size, setSize] = useState(PEN_SIZES[1]);
  const toolRef = useRef(tool);
  const colorRef = useRef(color);
  const sizeRef = useRef(size);

  useEffect(() => { strokesRef.current = strokes; }, [strokes]);
  useEffect(() => { toolRef.current = tool; }, [tool]);
  useEffect(() => { colorRef.current = color; }, [color]);
  useEffect(() => { sizeRef.current = size; }, [size]);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    strokesRef.current.forEach((stroke) => drawStrokeToCanvas(ctx, stroke.points, stroke.size, stroke.color, stroke.isEraser));
    if (currentRef.current.length > 1) {
      drawStrokeToCanvas(ctx, currentRef.current, sizeRef.current, colorRef.current, toolRef.current === "eraser");
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    function resize() {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      render();
    }
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    return () => observer.disconnect();
  }, [render]);

  useEffect(() => {
    render();
  }, [render, strokes]);

  function point(event: React.PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return [event.clientX - rect.left, event.clientY - rect.top, event.pressure || 0.5];
  }

  function finishStroke() {
    const points = currentRef.current;
    currentRef.current = [];
    if (points.length < 2) return;
    const next = [...strokesRef.current, {
      id: uid("stroke"),
      points,
      color,
      size: tool === "eraser" ? size * 3 : size,
      isEraser: tool === "eraser",
    }];
    setStrokes(next);
  }

  function saveDrawing() {
    const canvas = canvasRef.current;
    const rect = canvas?.getBoundingClientRect();
    onSave({
      strokes,
      width: Math.max(1, Math.round(rect?.width ?? initial?.width ?? 900)),
      height: Math.max(1, Math.round(rect?.height ?? initial?.height ?? 480)),
    });
  }

  return (
    <div className="fixed inset-0 z-[4000] flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Drawing editor">
      <div className="flex h-[min(760px,92dvh)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-white/12 bg-[#0b0f16] shadow-2xl">
        <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-white/8 p-3">
          <button type="button" onClick={() => setTool("pen")} className={`rounded-xl px-3 py-2 text-sm ${tool === "pen" ? "bg-sky-500 text-white" : "bg-white/8 text-white/65"}`}>Pen</button>
          <button type="button" onClick={() => setTool("eraser")} className={`rounded-xl px-3 py-2 text-sm ${tool === "eraser" ? "bg-sky-500 text-white" : "bg-white/8 text-white/65"}`}>Eraser</button>
          <div className="h-7 w-px bg-white/10" />
          {PEN_COLORS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setColor(item)}
              aria-label={`Use ${item}`}
              className={`h-7 w-7 rounded-full border-2 ${color === item ? "border-white" : "border-transparent"}`}
              style={{ background: item }}
            />
          ))}
          <div className="h-7 w-px bg-white/10" />
          <select value={size} onChange={(event) => setSize(Number(event.target.value))} className="rounded-xl border border-white/10 bg-white/8 px-3 py-2 text-sm text-white">
            {PEN_SIZES.map((item) => <option key={item} value={item}>{item}px</option>)}
          </select>
          <button type="button" onClick={() => setStrokes([])} className="rounded-xl bg-red-500/12 px-3 py-2 text-sm text-red-200">Clear</button>
          <div className="flex-1" />
          <button type="button" onClick={onClose} className="rounded-xl bg-white/8 px-4 py-2 text-sm text-white/70">Cancel</button>
          <button type="button" onClick={saveDrawing} className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-white">Save drawing</button>
        </div>
        <div className="min-h-0 flex-1 bg-[#e8edf4] p-4">
          <canvas
            ref={canvasRef}
            className="h-full w-full touch-none rounded-xl bg-white shadow-inner"
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
              currentRef.current = [point(event)];
            }}
            onPointerMove={(event) => {
              if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
              currentRef.current = [...currentRef.current, point(event)];
              render();
            }}
            onPointerUp={(event) => {
              event.currentTarget.releasePointerCapture(event.pointerId);
              finishStroke();
            }}
            onPointerCancel={finishStroke}
          />
        </div>
      </div>
    </div>
  );
}

function NoteListItem({
  page,
  active,
  snippet,
  onSelect,
  onFavorite,
}: {
  page: Page;
  active: boolean;
  snippet: string;
  onSelect: () => void;
  onFavorite: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full border-b border-white/8 px-4 py-3 text-left transition-colors ${active ? "bg-sky-500/12" : "hover:bg-white/5"}`}
    >
      <div className="flex items-start gap-3">
        <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${page.isPinned ? "bg-amber-400" : page.isFavorite ? "bg-sky-400" : "bg-white/18"}`} />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold text-white/85">{page.title || "Untitled Note"}</span>
            {page.isPinned && <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] text-amber-200">Pinned</span>}
          </span>
          <span className="mt-1 line-clamp-2 text-xs leading-relaxed text-white/40">{snippet || "No content yet"}</span>
          <span className="mt-2 flex items-center gap-2 text-[11px] text-white/28">
            <span>{relativeTime(page._updatedAt)}</span>
            {page.tags.slice(0, 2).map((tag) => <span key={tag} className="rounded-full bg-white/7 px-1.5 py-0.5">{tag}</span>)}
          </span>
        </span>
        <span
          role="button"
          tabIndex={0}
          onClick={(event) => {
            event.stopPropagation();
            onFavorite();
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              event.stopPropagation();
              onFavorite();
            }
          }}
          className={`rounded-lg p-1.5 ${page.isFavorite ? "text-sky-300" : "text-white/25 hover:text-white/60"}`}
          aria-label={page.isFavorite ? "Remove favorite" : "Favorite note"}
        >
          <Icon name="star" size={15} />
        </span>
      </div>
    </button>
  );
}

function EmptyState({ title, body, actionLabel, onAction }: { title: string; body: string; actionLabel: string; onAction: () => void }) {
  return (
    <div className="flex h-full items-center justify-center p-6">
      <div className="max-w-sm text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-sky-300">
          <Icon name="all" size={22} />
        </div>
        <h3 className="mt-4 text-base font-semibold text-white/85">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-white/38">{body}</p>
        <button type="button" onClick={onAction} className="mt-5 rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-white shadow-[0_14px_35px_rgba(14,165,233,0.24)]">
          {actionLabel}
        </button>
      </div>
    </div>
  );
}

export default function EvernoteNotesClient() {
  const [payload, setPayload] = useState<NotesPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | "all">("all");
  const [selectedSectionId, setSelectedSectionId] = useState<string | "all">("all");
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");
  const [sortMode, setSortMode] = useState<SortMode>("updated");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Partial<Page>>>({});
  const [saveStatus, setSaveStatus] = useState<Record<string, SaveStatus>>({});
  const [mobileView, setMobileView] = useState<MobileView>("library");
  const [drawingTarget, setDrawingTarget] = useState<NoteBlock | "new" | null>(null);
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/notes");
      if (!res.ok) throw new Error("Failed to load notes");
      const data = await res.json() as NotesPayload;
      setPayload(data);
      const firstActive = data.pages.find((page) => noteState(page) === "active") ?? data.pages[0] ?? null;
      setSelectedWorkspaceId((current) => current || "all");
      setSelectedSectionId((current) => current || "all");
      setSelectedPageId((current) => current ?? firstActive?._id ?? null);
      setMobileView(firstActive ? "editor" : "library");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load notes");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const timers = saveTimers.current;
    return () => {
      Object.values(timers).forEach(clearTimeout);
    };
  }, []);

  const workspaces = useMemo(() => payload?.workspaces ?? [], [payload?.workspaces]);
  const sections = useMemo(() => payload?.sections ?? [], [payload?.sections]);
  const pages = useMemo(() => payload?.pages ?? [], [payload?.pages]);
  const defaults = payload?.defaults;

  const pagesWithDrafts = useMemo(() => pages.map((page) => ({ ...page, ...(drafts[page._id] ?? {}) } as Page)), [drafts, pages]);
  const selectedPage = pagesWithDrafts.find((page) => page._id === selectedPageId) ?? null;
  const selectedSection = selectedPage ? sections.find((section) => section._id === selectedPage.sectionId) ?? null : null;
  const selectedWorkspace = selectedPage ? workspaces.find((workspace) => workspace._id === selectedPage.workspaceId) ?? null : null;
  const allTags = useMemo(() => [...new Set(pagesWithDrafts.flatMap((page) => page.tags ?? []))].sort((a, b) => a.localeCompare(b)), [pagesWithDrafts]);
  const selectedBlocks = useMemo(() => blocksFor(selectedPage), [selectedPage]);
  const drawingBlocks = selectedBlocks.filter((block) => block.type === "drawing");
  const attachmentBlocks = selectedBlocks.filter((block) => ["file", "audio", "video"].includes(block.type));

  const filteredPages = useMemo(() => {
    const search = query.trim().toLowerCase();
    return pagesWithDrafts
      .filter((page) => {
        const state = noteState(page);
        if (quickFilter === "archived") return state === "archived";
        if (quickFilter === "trash") return state === "trash";
        if (state !== "active") return false;
        if (quickFilter === "favorites" && !page.isFavorite && !page.isPinned) return false;
        if (selectedWorkspaceId !== "all" && page.workspaceId !== selectedWorkspaceId) return false;
        if (selectedSectionId !== "all" && page.sectionId !== selectedSectionId) return false;
        if (selectedTag && !page.tags.includes(selectedTag)) return false;
        if (!search) return true;
        return pageSearchText(page).includes(search);
      })
      .sort((a, b) => {
        if (sortMode === "favorites") {
          const scoreA = Number(a.isPinned) * 2 + Number(a.isFavorite);
          const scoreB = Number(b.isPinned) * 2 + Number(b.isFavorite);
          if (scoreA !== scoreB) return scoreB - scoreA;
          return new Date(b._updatedAt).getTime() - new Date(a._updatedAt).getTime();
        }
        if (sortMode === "created") return new Date(b._createdAt).getTime() - new Date(a._createdAt).getTime();
        if (sortMode === "title") return a.title.localeCompare(b.title);
        return new Date(b._updatedAt).getTime() - new Date(a._updatedAt).getTime();
      });
  }, [pagesWithDrafts, query, quickFilter, selectedSectionId, selectedTag, selectedWorkspaceId, sortMode]);

  function updatePageLocal(id: string, patch: Partial<Page>) {
    setDrafts((current) => ({ ...current, [id]: { ...(current[id] ?? {}), ...patch, _updatedAt: new Date().toISOString() } }));
    setPayload((current) => current ? {
      ...current,
      pages: current.pages.map((page) => page._id === id ? { ...page, ...patch, _updatedAt: new Date().toISOString() } as Page : page),
    } : current);
  }

  async function persistPage(id: string, patch: Partial<Page>) {
    setSaveStatus((current) => ({ ...current, [id]: "saving" }));
    try {
      const res = await fetch(`/api/admin/notes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetType: "page", ...patch }),
      });
      if (!res.ok) throw new Error("Save failed");
      setSaveStatus((current) => ({ ...current, [id]: "saved" }));
      setDrafts((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
    } catch (err) {
      setSaveStatus((current) => ({ ...current, [id]: "error" }));
      setError(err instanceof Error ? err.message : "Save failed");
    }
  }

  function patchPage(id: string, patch: Partial<Page>, debounce = true) {
    updatePageLocal(id, patch);
    setSaveStatus((current) => ({ ...current, [id]: "dirty" }));
    if (saveTimers.current[id]) clearTimeout(saveTimers.current[id]);
    if (debounce) {
      saveTimers.current[id] = setTimeout(() => {
        void persistPage(id, patch);
      }, 850);
    } else {
      void persistPage(id, patch);
    }
  }

  async function createWorkspace() {
    const res = await fetch("/api/admin/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "workspace", title: "New Notebook" }),
    });
    if (!res.ok) return setError("Failed to create notebook");
    const workspace = await res.json() as Workspace;
    setPayload((current) => current ? { ...current, workspaces: [...current.workspaces, workspace] } : current);
    setSelectedWorkspaceId(workspace._id);
    setSelectedSectionId("all");
    setMobileView("library");
  }

  async function createSection(workspaceId = selectedWorkspaceId === "all" ? workspaces[0]?._id : selectedWorkspaceId) {
    if (!workspaceId || workspaceId === "all") return;
    const res = await fetch("/api/admin/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "section", title: "New Folder", workspaceId }),
    });
    if (!res.ok) return setError("Failed to create folder");
    const section = await res.json() as Section;
    setPayload((current) => current ? { ...current, sections: [...current.sections, section] } : current);
    setSelectedWorkspaceId(workspaceId);
    setSelectedSectionId(section._id);
    setMobileView("list");
  }

  async function createPage(sectionId = selectedSectionId === "all" ? sections.find((section) => section.workspaceId === (selectedWorkspaceId === "all" ? workspaces[0]?._id : selectedWorkspaceId))?._id : selectedSectionId) {
    const workspaceId = selectedWorkspaceId === "all"
      ? sections.find((section) => section._id === sectionId)?.workspaceId ?? workspaces[0]?._id ?? defaults?.workspaceId
      : selectedWorkspaceId;
    if (!workspaceId || !sectionId || sectionId === "all") return setError("Create or select a folder first");
    const res = await fetch("/api/admin/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "page",
        title: "Untitled Note",
        content: "<p></p>",
        blocksJson: JSON.stringify([]),
        workspaceId,
        sectionId,
        tags: [],
        metadataJson: JSON.stringify({ noteState: "active", editor: "document" }),
      }),
    });
    if (!res.ok) return setError("Failed to create note");
    const page = await res.json() as Page;
    const normalized = { ...page, isPinned: false, isFavorite: false, isArchived: false, tags: page.tags ?? [], linkedRecords: page.linkedRecords ?? [] };
    setPayload((current) => current ? { ...current, pages: [normalized, ...current.pages] } : current);
    setSelectedWorkspaceId(workspaceId);
    setSelectedSectionId(sectionId);
    setSelectedPageId(page._id);
    setMobileView("editor");
  }

  async function permanentDelete(page: Page) {
    if (!confirm(`Permanently delete "${page.title || "Untitled Note"}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/admin/notes/${page._id}?target=page&permanent=true`, { method: "DELETE" });
    if (!res.ok) return setError("Failed to delete note");
    setPayload((current) => current ? { ...current, pages: current.pages.filter((item) => item._id !== page._id) } : current);
    if (selectedPageId === page._id) setSelectedPageId(filteredPages.find((item) => item._id !== page._id)?._id ?? null);
  }

  function updateBlocks(nextBlocks: NoteBlock[], debounce = true) {
    if (!selectedPage) return;
    patchPage(selectedPage._id, {
      blocksJson: JSON.stringify(nextBlocks),
      content: selectedPage.content ?? editorContentFor(selectedPage),
    }, debounce);
  }

  async function insertImages(files: FileList | File[]) {
    if (!selectedPage) return;
    const fileArray = Array.from(files).filter((file) => file.type.startsWith("image/"));
    if (!fileArray.length) return;
    const dataUrls = await Promise.all(fileArray.map(fileToDataUrl));
    const imageHtml = dataUrls.map((src) => `<p><img src="${src}" /></p>`).join("");
    const current = editorContentFor(selectedPage);
    patchPage(selectedPage._id, { content: `${current}${imageHtml}` }, true);
  }

  async function attachFiles(files: FileList | File[]) {
    if (!selectedPage) return;
    const additions = await Promise.all(Array.from(files).map(async (file) => createAttachmentBlock(selectedPage._id, file, await fileToDataUrl(file))));
    updateBlocks([...selectedBlocks, ...additions], false);
  }

  function saveDrawing(drawing: DrawingContent) {
    if (!selectedPage) return;
    if (drawingTarget && drawingTarget !== "new") {
      updateBlocks(selectedBlocks.map((block) => block.id === drawingTarget.id ? createDrawingBlock(selectedPage._id, drawing, block) : block), false);
    } else {
      updateBlocks([...selectedBlocks, createDrawingBlock(selectedPage._id, drawing)], false);
    }
    setDrawingTarget(null);
  }

  function addTag(tag: string) {
    if (!selectedPage) return;
    const clean = tag.trim().replace(/^#/, "");
    if (!clean || selectedPage.tags.includes(clean)) return;
    patchPage(selectedPage._id, { tags: [...selectedPage.tags, clean] }, false);
  }

  const selectedSaveStatus = selectedPage ? saveStatus[selectedPage._id] ?? "saved" : "saved";

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
        <button type="button" onClick={() => void load()} className="rounded-xl bg-white/10 px-4 py-2 text-sm text-white/75 hover:bg-white/15">Retry</button>
      </div>
    );
  }

  return (
    <div className="notes-evernote flex h-full min-h-[720px] overflow-hidden border border-white/10 bg-[#05070a] shadow-[0_24px_90px_rgba(0,0,0,0.35)]">
      <style>{`
        .notes-evernote .ProseMirror p.is-editor-empty:first-child::before { color: #94a3b8; content: attr(data-placeholder); float: left; height: 0; pointer-events: none; }
        .notes-evernote .notes-prosemirror h1 { font-size: 1.9rem; line-height: 2.3rem; font-weight: 750; margin: 1rem 0 .6rem; color: #0f172a; }
        .notes-evernote .notes-prosemirror h2 { font-size: 1.35rem; line-height: 1.9rem; font-weight: 700; margin: .9rem 0 .45rem; color: #0f172a; }
        .notes-evernote .notes-prosemirror p { margin: .55rem 0; }
        .notes-evernote .notes-prosemirror ul, .notes-evernote .notes-prosemirror ol { padding-left: 1.35rem; margin: .6rem 0; }
        .notes-evernote .notes-prosemirror blockquote { border-left: 3px solid #38bdf8; margin: .8rem 0; padding-left: 1rem; color: #475569; }
        .notes-evernote .notes-prosemirror pre { background: #0f172a; color: #e2e8f0; border-radius: .85rem; padding: .9rem 1rem; overflow-x: auto; }
        .notes-evernote .notes-prosemirror hr { border: 0; border-top: 1px solid #e2e8f0; margin: 1.25rem 0; }
        .notes-evernote .notes-inline-image { display: block; max-width: 100%; height: auto; border-radius: .9rem; margin: .85rem 0; }
        .notes-evernote .notes-task-list { list-style: none; padding-left: 0; }
        .notes-evernote .notes-task-item { display: flex; gap: .55rem; align-items: flex-start; margin: .35rem 0; }
        .notes-evernote .notes-task-item > label { margin-top: .2rem; user-select: none; }
        .notes-evernote .notes-task-item > div { flex: 1; min-width: 0; }
        .notes-evernote .notes-task-item[data-checked="true"] > div { color: #64748b; text-decoration: line-through; }
      `}</style>

      <aside className={`${mobileView === "library" ? "flex" : "hidden"} w-full shrink-0 flex-col border-r border-white/8 bg-white/[0.025] md:flex md:w-72`}>
        <div className="border-b border-white/8 p-4">
          <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-300">CEL3 Notes</div>
          <button type="button" onClick={() => void createPage()} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-sky-500 px-3 py-2 text-sm font-semibold text-white">
            <Icon name="plus" size={15} /> New note
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <div className="space-y-1">
            {([
              ["all", "All Notes", "all"],
              ["favorites", "Favorites", "star"],
              ["archived", "Archived", "archive"],
              ["trash", "Trash", "trash"],
            ] as Array<[QuickFilter, string, string]>).map(([filter, label, icon]) => (
              <button
                key={filter}
                type="button"
                onClick={() => {
                  setQuickFilter(filter);
                  setSelectedWorkspaceId("all");
                  setSelectedSectionId("all");
                  setMobileView("list");
                }}
                className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors ${quickFilter === filter ? "bg-sky-500/12 text-sky-100" : "text-white/55 hover:bg-white/6 hover:text-white"}`}
              >
                <Icon name={icon} size={15} />
                <span className="flex-1 text-left">{label}</span>
              </button>
            ))}
          </div>

          <div className="mt-6 flex items-center justify-between px-1">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-white/25">Notebooks</span>
            <button type="button" onClick={() => void createWorkspace()} className="rounded-lg p-1 text-white/35 hover:bg-white/8 hover:text-white" aria-label="New notebook">
              <Icon name="plus" size={14} />
            </button>
          </div>
          <div className="mt-2 space-y-1">
            {workspaces.map((workspace) => (
              <div key={workspace._id} className={`rounded-xl ${selectedWorkspaceId === workspace._id ? "bg-white/8" : ""}`}>
                <button
                  type="button"
                  onClick={() => {
                    setQuickFilter("all");
                    setSelectedWorkspaceId(workspace._id);
                    setSelectedSectionId("all");
                    setMobileView("list");
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-white/65 hover:text-white"
                >
                  <Icon name="folder" size={15} />
                  <span className="min-w-0 flex-1 truncate text-left">{workspace.title}</span>
                </button>
                {selectedWorkspaceId === workspace._id && (
                  <div className="pb-2 pl-8 pr-2">
                    {sections.filter((section) => section.workspaceId === workspace._id).map((section) => (
                      <button
                        key={section._id}
                        type="button"
                        onClick={() => {
                          setSelectedSectionId(section._id);
                          setMobileView("list");
                        }}
                        className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs ${selectedSectionId === section._id ? "bg-sky-500/12 text-sky-100" : "text-white/42 hover:bg-white/6 hover:text-white/75"}`}
                      >
                        <span className="h-2 w-2 rounded-full" style={{ background: section.color ?? "#38bdf8" }} />
                        <span className="min-w-0 truncate">{section.title}</span>
                      </button>
                    ))}
                    <button type="button" onClick={() => void createSection(workspace._id)} className="mt-1 rounded-lg px-2 py-1 text-xs text-white/30 hover:bg-white/6 hover:text-white/60">
                      New folder
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-6 px-1">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-white/25">Tags</span>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {allTags.length === 0 ? (
                <span className="text-xs text-white/25">No tags yet</span>
              ) : allTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => {
                    setSelectedTag(selectedTag === tag ? null : tag);
                    setMobileView("list");
                  }}
                  className={`rounded-full border px-2 py-1 text-xs ${selectedTag === tag ? "border-sky-400/40 bg-sky-500/14 text-sky-100" : "border-white/8 bg-white/5 text-white/45 hover:text-white/75"}`}
                >
                  #{tag}
                </button>
              ))}
            </div>
          </div>
        </div>
      </aside>

      <aside className={`${mobileView === "list" ? "flex" : "hidden"} w-full shrink-0 flex-col border-r border-white/8 bg-black/18 md:flex md:w-80`}>
        <div className="border-b border-white/8 p-4">
          <div className="flex items-center gap-2 md:hidden">
            <button type="button" onClick={() => setMobileView("library")} className="rounded-lg p-2 text-white/60 hover:bg-white/8" aria-label="Back to notebooks">
              <Icon name="back" />
            </button>
            <span className="text-sm font-semibold text-white/75">Notes</span>
          </div>
          <div className="relative mt-3 md:mt-0">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search title, body, tags..."
              className="mt-0 w-full rounded-xl border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-sm text-white/75 outline-none placeholder:text-white/25 focus:border-sky-400/45"
            />
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/28">
              <Icon name="search" size={14} />
            </span>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <select value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)} className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70 outline-none">
              <option value="updated">Recently updated</option>
              <option value="created">Created date</option>
              <option value="title">Title</option>
              <option value="favorites">Favorites first</option>
            </select>
            <button type="button" onClick={() => void createPage()} className="rounded-xl bg-sky-500 px-3 py-2 text-xs font-semibold text-white">New</button>
          </div>
          <div className="mt-2 text-xs text-white/30">{filteredPages.length} note{filteredPages.length === 1 ? "" : "s"}</div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {filteredPages.length === 0 ? (
            <EmptyState title="No notes found" body="Create a note or adjust your filters to see notes here." actionLabel="Create note" onAction={() => void createPage()} />
          ) : filteredPages.map((page) => (
            <NoteListItem
              key={page._id}
              page={page}
              active={page._id === selectedPageId}
              snippet={stripHtml(editorContentFor(page)) || plainTextFromBlocks(blocksFor(page))}
              onSelect={() => {
                setSelectedPageId(page._id);
                setMobileView("editor");
              }}
              onFavorite={() => patchPage(page._id, { isFavorite: !page.isFavorite }, false)}
            />
          ))}
        </div>
      </aside>

      <main className={`${mobileView === "editor" ? "flex" : "hidden"} min-w-0 flex-1 flex-col bg-[#eef2f7] md:flex`}>
        {selectedPage ? (
          <>
            <header className="shrink-0 border-b border-slate-200 bg-white">
              <div className="flex items-center gap-2 px-4 py-3">
                <button type="button" onClick={() => setMobileView("list")} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 md:hidden" aria-label="Back to note list">
                  <Icon name="back" />
                </button>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[11px] text-slate-400">
                    {selectedWorkspace?.title ?? "Notebook"} / {selectedSection?.title ?? "Folder"}
                  </div>
                  <input
                    value={selectedPage.title}
                    onChange={(event) => patchPage(selectedPage._id, { title: event.target.value }, true)}
                    placeholder="Untitled Note"
                    className="mt-1 w-full bg-transparent text-2xl font-semibold text-slate-950 outline-none placeholder:text-slate-300"
                  />
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs ${
                  selectedSaveStatus === "saving" ? "bg-amber-100 text-amber-700" :
                  selectedSaveStatus === "dirty" ? "bg-slate-100 text-slate-600" :
                  selectedSaveStatus === "error" ? "bg-red-100 text-red-700" :
                  "bg-emerald-100 text-emerald-700"
                }`}>
                  {selectedSaveStatus === "saving" ? "Saving..." : selectedSaveStatus === "dirty" ? "Unsaved changes" : selectedSaveStatus === "error" ? "Save failed" : "Saved"}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 px-4 py-2 text-xs text-slate-500">
                <span>Created {formatDate(selectedPage._createdAt)}</span>
                <span>Updated {relativeTime(selectedPage._updatedAt)}</span>
                <select
                  value={selectedPage.sectionId}
                  onChange={(event) => {
                    const section = sections.find((item) => item._id === event.target.value);
                    if (!section) return;
                    patchPage(selectedPage._id, { sectionId: section._id, workspaceId: section.workspaceId }, false);
                  }}
                  className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600"
                >
                  {sections.map((section) => <option key={section._id} value={section._id}>{section.title}</option>)}
                </select>
                <button type="button" onClick={() => patchPage(selectedPage._id, { isPinned: !selectedPage.isPinned }, false)} className={`rounded-lg px-2 py-1 ${selectedPage.isPinned ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>Pin</button>
                <button type="button" onClick={() => patchPage(selectedPage._id, { isFavorite: !selectedPage.isFavorite }, false)} className={`rounded-lg px-2 py-1 ${selectedPage.isFavorite ? "bg-sky-100 text-sky-700" : "bg-slate-100 text-slate-600"}`}>Favorite</button>
                {noteState(selectedPage) === "active" ? (
                  <>
                    <button type="button" onClick={() => patchPage(selectedPage._id, { isArchived: true, metadataJson: withNoteState(selectedPage, "archived") }, false)} className="rounded-lg bg-slate-100 px-2 py-1 text-slate-600">Archive</button>
                    <button type="button" onClick={() => patchPage(selectedPage._id, { isArchived: true, metadataJson: withNoteState(selectedPage, "trash") }, false)} className="rounded-lg bg-red-50 px-2 py-1 text-red-600">Trash</button>
                  </>
                ) : (
                  <>
                    <button type="button" onClick={() => patchPage(selectedPage._id, { isArchived: false, metadataJson: withNoteState(selectedPage, "active") }, false)} className="rounded-lg bg-emerald-100 px-2 py-1 text-emerald-700">Restore</button>
                    {noteState(selectedPage) === "trash" && <button type="button" onClick={() => void permanentDelete(selectedPage)} className="rounded-lg bg-red-100 px-2 py-1 text-red-700">Delete forever</button>}
                  </>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-100 px-4 py-2">
                {selectedPage.tags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => patchPage(selectedPage._id, { tags: selectedPage.tags.filter((item) => item !== tag) }, false)}
                    className="rounded-full bg-sky-50 px-2 py-1 text-xs text-sky-700 hover:bg-sky-100"
                    title="Remove tag"
                  >
                    #{tag}
                  </button>
                ))}
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    const input = event.currentTarget.elements.namedItem("tag") as HTMLInputElement | null;
                    if (!input) return;
                    addTag(input.value);
                    input.value = "";
                  }}
                >
                  <input name="tag" placeholder="Add tag" className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600 outline-none focus:border-sky-300" />
                </form>
              </div>
            </header>

            <RichNoteEditor
              key={selectedPage._id}
              note={selectedPage}
              value={editorContentFor(selectedPage)}
              onChange={(html) => patchPage(selectedPage._id, { content: html, metadataJson: JSON.stringify({ ...metadataFor(selectedPage), editor: "document", noteState: noteState(selectedPage) }) }, true)}
              onImageFiles={(files) => void insertImages(files)}
              onAttachFiles={(files) => void attachFiles(files)}
              onInsertDrawing={() => setDrawingTarget("new")}
            />

            {(drawingBlocks.length > 0 || attachmentBlocks.length > 0) && (
              <section className="max-h-72 shrink-0 overflow-y-auto border-t border-slate-200 bg-white px-5 py-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400">Attachments and drawings</h3>
                  <button type="button" onClick={() => setDrawingTarget("new")} className="rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-600">Add drawing</button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {drawingBlocks.map((block) => {
                    const drawing = blockContent<DrawingContent>(block, { strokes: [], width: 900, height: 480 });
                    return (
                      <div key={block.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                        <DrawingPreview drawing={drawing} />
                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-xs font-medium text-slate-600">Drawing</span>
                          <button type="button" onClick={() => setDrawingTarget(block)} className="rounded-lg bg-white px-2 py-1 text-xs text-slate-600 shadow-sm">Edit</button>
                        </div>
                      </div>
                    );
                  })}
                  {attachmentBlocks.map((block) => {
                    const media = blockContent<AttachmentContent>(block, {});
                    return (
                      <button
                        key={block.id}
                        type="button"
                        onClick={() => {
                          if (media.src) window.open(media.src, "_blank", "noopener,noreferrer");
                        }}
                        className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-left hover:bg-white"
                      >
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-700"><Icon name="file" /></span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-slate-800">{media.name || media.title || block.content}</span>
                          <span className="block truncate text-xs text-slate-400">{media.mimeType || "Attachment"}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}
          </>
        ) : (
          <EmptyState title="No note selected" body="Choose a note from the list or create a new one to start writing." actionLabel="Create note" onAction={() => void createPage()} />
        )}
      </main>

      {drawingTarget && (
        <DrawingModal
          initial={drawingTarget === "new" ? undefined : blockContent<DrawingContent>(drawingTarget, { strokes: [], width: 900, height: 480 })}
          onClose={() => setDrawingTarget(null)}
          onSave={saveDrawing}
        />
      )}
    </div>
  );
}
