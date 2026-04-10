"use client";

import { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo } from "react";
import { getStroke } from "perfect-freehand";

// ─── Types ────────────────────────────────────────────────────────────────────

type Note = {
  _id: string;
  title: string;
  content: string | null;
  canvasData: string | null;
  color: string | null;
  isPinned: boolean;
  _createdAt: string;
  _updatedAt: string;
};

type Stroke = {
  id: string;
  points: number[][];
  color: string;
  size: number;
  isEraser: boolean;
};

type CanvasData = { strokes: Stroke[] };

// ─── Canvas stroke renderer ───────────────────────────────────────────────────
//
// Draws a single perfect-freehand stroke onto a 2D canvas context.
// Eraser strokes use `destination-out` compositing so they punch through ink
// to reveal the transparent canvas background (and the CSS dot-grid behind it).
//

function drawStrokeToCanvas(
  ctx: CanvasRenderingContext2D,
  points: number[][],
  size: number,
  color: string,
  isEraser: boolean
) {
  const outline = getStroke(points, { size, thinning: 0.5, smoothing: 0.5, streamline: 0.5, simulatePressure: true });
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
  for (let i = 1; i < outline.length; i++) ctx.lineTo(outline[i][0], outline[i][1]);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// ─── Foldable / dual-screen layout hook ──────────────────────────────────────
//
// Detects whether the app is spanned across two screens (Surface Duo, Galaxy Z
// Fold, etc.) using the CSS `vertical-viewport-segments` media feature and the
// legacy `window.getWindowSegments()` API shipped on Surface Duo.
//
// Returns:
//   isSpanned      – true when two side-by-side viewport segments are detected
//   leftScreenWidth – pixel width of the left segment (viewport origin → hinge)
//                     null if the exact position cannot be determined
//
type FoldState = { isSpanned: boolean; leftScreenWidth: number | null };

function useFoldableLayout(): FoldState {
  const [state, setState] = useState<FoldState>({ isSpanned: false, leftScreenWidth: null });

  useEffect(() => {
    function detect() {
      // Vertical fold = two columns side by side (Surface Duo portrait, Z Fold landscape)
      const mq = window.matchMedia("(vertical-viewport-segments: 2)");
      if (!mq.matches) {
        setState({ isSpanned: false, leftScreenWidth: null });
        return;
      }

      let leftWidth: number | null = null;

      // Method 1 – legacy Surface Duo API (still present on Duo 1 / Duo 2)
      const getSegs = (window as unknown as Record<string, unknown>).getWindowSegments as
        (() => DOMRect[]) | undefined;
      if (typeof getSegs === "function") {
        const segs = getSegs();
        if (segs.length >= 2) leftWidth = segs[0].right;
      }

      // Method 2 – probe element with CSS env() variable
      // env(viewport-segment-right, 0, 0) = right edge of the first segment
      if (leftWidth === null) {
        const probe = document.createElement("div");
        probe.setAttribute(
          "style",
          "position:fixed;top:-9999px;left:0;width:env(viewport-segment-right,0,0);height:1px;pointer-events:none;visibility:hidden;"
        );
        document.body.appendChild(probe);
        const w = parseFloat(getComputedStyle(probe).width);
        document.body.removeChild(probe);
        if (w > 0 && w < window.innerWidth * 0.95) leftWidth = w;
      }

      setState({ isSpanned: true, leftScreenWidth: leftWidth });
    }

    detect();
    const mq = window.matchMedia("(vertical-viewport-segments: 2)");
    mq.addEventListener("change", detect);
    window.addEventListener("resize", detect);
    return () => {
      mq.removeEventListener("change", detect);
      window.removeEventListener("resize", detect);
    };
  }, []);

  return state;
}

// ─── Pen eraser detection ─────────────────────────────────────────────────────
//
// The Surface Pen (and many other digitizers) has two ends:
//   • Tip  – the writing nib
//   • Tail – the flat eraser end
//
// The W3C Pointer Events spec encodes the eraser end as:
//   e.button  === 5  on pointerdown  (the "eraser" button index)
//   e.buttons  & 32  on any event    (bit 5 of the buttons bitmask)
//
// OneNote uses exactly this mechanism.  We auto-detect it per-stroke so the
// user never needs to manually toggle the toolbar tool when using a stylus.
//
function isPenEraser(e: React.PointerEvent): boolean {
  if (e.pointerType !== "pen") return false;
  return (e.buttons & 32) !== 0 || e.button === 5;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const NOTE_COLORS = [
  { label: "None",   value: null,      dot: "bg-white/10 border border-white/20" },
  { label: "Amber",  value: "#f59e0b", dot: "bg-amber-500" },
  { label: "Blue",   value: "#3b82f6", dot: "bg-blue-500" },
  { label: "Green",  value: "#22c55e", dot: "bg-green-500" },
  { label: "Pink",   value: "#ec4899", dot: "bg-pink-500" },
  { label: "Purple", value: "#a855f7", dot: "bg-purple-500" },
  { label: "Red",    value: "#ef4444", dot: "bg-red-500" },
];

const PEN_COLORS = [
  "#ffffff", "#94a3b8", "#1e293b",
  "#3b82f6", "#22c55e", "#ef4444",
  "#f59e0b", "#a855f7", "#ec4899",
];

const PEN_SIZES = [2, 4, 8, 14, 22];

// ─── Relative time ────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
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

// ─── Drawing Canvas ───────────────────────────────────────────────────────────

function DrawingCanvas({
  initialData,
  onSave,
}: {
  initialData: CanvasData;
  onSave: (data: CanvasData) => void;
}) {
  // Two-canvas stack: background (dark fill + dot grid) is static; ink canvas sits
  // on top and is transparent where not inked. Erasing removes pixels from the ink
  // canvas via destination-out, revealing the background canvas underneath.
  const bgCanvasRef = useRef<HTMLCanvasElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [strokes, setStrokes] = useState<Stroke[]>(initialData.strokes ?? []);
  // Refs that mirror state so renderCanvas() always reads the latest values
  // without needing to be re-created on every render.
  const strokesRef = useRef<Stroke[]>(initialData.strokes ?? []);
  const [history, setHistory] = useState<Stroke[][]>([initialData.strokes ?? []]);
  const [histIdx, setHistIdx] = useState(0);
  const [drawing, setDrawing] = useState(false);
  const [tool, setTool] = useState<"pen" | "eraser">("pen");
  const [penColor, setPenColor] = useState(PEN_COLORS[0]);
  const penColorRef = useRef(PEN_COLORS[0]);
  const [sizeIdx, setSizeIdx] = useState(1);
  const sizeIdxRef = useRef(1);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  // Tracks the effective tool for the stroke currently being drawn.
  const currentStrokeIsEraserRef = useRef(false);
  // True while a physical pen eraser end is in contact — drives toolbar highlight
  const [penEraserActive, setPenEraserActive] = useState(false);
  // Live stroke points accumulated during a pointer-drag (ref avoids per-point re-renders)
  const currentPtsRef = useRef<number[][]>([]);
  const rafRef = useRef<number | null>(null);

  // Sync state → refs
  useEffect(() => { penColorRef.current = penColor; }, [penColor]);
  useEffect(() => { sizeIdxRef.current = sizeIdx; }, [sizeIdx]);
  useEffect(() => {
    strokesRef.current = strokes;
    renderCanvas();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strokes]);

  // Size both canvases to match their CSS box; re-render on resize
  useEffect(() => {
    const ink = canvasRef.current;
    const bg = bgCanvasRef.current;
    if (!ink || !bg) return;
    function resize() {
      if (!ink || !bg) return;
      const w = ink.offsetWidth;
      const h = ink.offsetHeight;
      if (ink.width !== w || ink.height !== h) {
        ink.width = w; ink.height = h;
        bg.width = w; bg.height = h;
      }
      renderBackground(); // eslint-disable-line react-hooks/exhaustive-deps
      renderCanvas();     // eslint-disable-line react-hooks/exhaustive-deps
    }
    const obs = new ResizeObserver(resize);
    obs.observe(ink);
    resize();
    return () => obs.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function renderBackground() {
    const bg = bgCanvasRef.current;
    if (!bg || !bg.width || !bg.height) return;
    const ctx = bg.getContext("2d");
    if (!ctx) return;
    const { width: w, height: h } = bg;
    // Dark canvas fill
    ctx.fillStyle = "#080808";
    ctx.fillRect(0, 0, w, h);
    // Dot grid
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    for (let x = 0; x < w; x += 20) {
      for (let y = 0; y < h; y += 20) {
        ctx.beginPath();
        ctx.arc(x + 0.75, y + 0.75, 0.75, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function renderCanvas() {
    const ink = canvasRef.current;
    if (!ink || !ink.width || !ink.height) return;
    const ctx = ink.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, ink.width, ink.height);
    for (const s of strokesRef.current) {
      drawStrokeToCanvas(ctx, s.points, s.isEraser ? s.size * 3 : s.size, s.color, s.isEraser);
    }
    const livePts = currentPtsRef.current;
    if (livePts.length > 1) {
      const isEraser = currentStrokeIsEraserRef.current;
      const liveSize = isEraser
        ? PEN_SIZES[sizeIdxRef.current] * 3
        : PEN_SIZES[sizeIdxRef.current];
      drawStrokeToCanvas(ctx, livePts, liveSize, penColorRef.current, isEraser);
    }
  }

  const pushHistory = useCallback((s: Stroke[]) => {
    setHistory((h) => {
      const next = h.slice(0, histIdx + 1);
      next.push(s);
      setHistIdx(next.length - 1);
      return next;
    });
  }, [histIdx]);

  function undo() {
    if (histIdx <= 0) return;
    const prev = history[histIdx - 1];
    setHistIdx((i) => i - 1);
    setStrokes(prev);
    onSave({ strokes: prev });
  }

  function redo() {
    if (histIdx >= history.length - 1) return;
    const next = history[histIdx + 1];
    setHistIdx((i) => i + 1);
    setStrokes(next);
    onSave({ strokes: next });
  }

  function getPoint(e: React.PointerEvent<HTMLCanvasElement>): number[] {
    const rect = canvasRef.current!.getBoundingClientRect();
    return [e.clientX - rect.left, e.clientY - rect.top, e.pressure || 0.5];
  }

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrawing(true);
    const erasing = e.pointerType === "pen" ? isPenEraser(e) : tool === "eraser";
    currentStrokeIsEraserRef.current = erasing;
    if (e.pointerType === "pen") {
      setPenEraserActive(erasing);
      setTool(erasing ? "eraser" : "pen");
    }
    currentPtsRef.current = [getPoint(e)];
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing) return;
    if (e.pointerType === "pen") {
      const erasing = isPenEraser(e);
      if (erasing !== currentStrokeIsEraserRef.current) {
        currentStrokeIsEraserRef.current = erasing;
        setPenEraserActive(erasing);
        setTool(erasing ? "eraser" : "pen");
      }
    }
    currentPtsRef.current = [...currentPtsRef.current, getPoint(e)];
    // Throttle redraws to one per animation frame
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
    const isEraser = currentStrokeIsEraserRef.current;
    const pts = currentPtsRef.current;
    currentPtsRef.current = [];
    if (pts.length < 2) return;
    const newStroke: Stroke = {
      id: Math.random().toString(36).slice(2),
      points: pts,
      color: isEraser ? "eraser" : penColorRef.current,
      size: PEN_SIZES[sizeIdxRef.current],
      isEraser,
    };
    const next = [...strokesRef.current, newStroke];
    setStrokes(next);
    pushHistory(next);
    onSave({ strokes: next });
  }

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === "z") { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && (e.shiftKey && e.key === "z" || e.key === "y")) { e.preventDefault(); redo(); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const currentSize = PEN_SIZES[sizeIdx];

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-white/8 bg-white/3 flex-wrap shrink-0">
        {/* Pen / Eraser toggle */}
        <div className="flex rounded-lg overflow-hidden border border-white/10">
          <button
            onClick={() => setTool("pen")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
              tool === "pen" ? "bg-white/15 text-white" : "text-white/45 hover:text-white/70 hover:bg-white/5"
            }`}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4 12.5-12.5z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Pen
          </button>
          <button
            onClick={() => { setTool("eraser"); setPenEraserActive(false); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border-l border-white/10 transition-colors ${
              tool === "eraser" ? "bg-white/15 text-white" : "text-white/45 hover:text-white/70 hover:bg-white/5"
            }`}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 20H7L3 16l11-11 6 6-3 3" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M6.0001 17.9999L17 7" strokeLinecap="round" />
            </svg>
            Eraser
            {/* Dim indicator when pen eraser end is auto-detected */}
            {penEraserActive && (
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" title="Pen eraser detected" />
            )}
          </button>
        </div>

        {/* Colour picker (pen only) */}
        {tool === "pen" && (
          <div className="relative">
            <button
              onClick={() => setColorPickerOpen((o) => !o)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 transition-colors"
              title="Pen colour"
            >
              <span className="w-3.5 h-3.5 rounded-full border border-white/20 flex-shrink-0" style={{ background: penColor }} />
              <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" className="text-white/30">
                <path d="M5 7L1 3h8L5 7z" />
              </svg>
            </button>
            {colorPickerOpen && (
              <div
                className="absolute left-0 top-full mt-1 z-50 p-2 rounded-xl border border-white/10 bg-[#111]/90 backdrop-blur-xl shadow-2xl"
                onMouseLeave={() => setColorPickerOpen(false)}
              >
                <div className="grid grid-cols-3 gap-1.5">
                  {PEN_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => { setPenColor(c); setColorPickerOpen(false); }}
                      className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 ${
                        penColor === c ? "border-white/70 scale-110" : "border-transparent"
                      }`}
                      style={{ background: c, outline: c === "#ffffff" ? "1px solid rgba(255,255,255,0.15)" : undefined }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Size control */}
        <div className="flex items-center gap-1 px-2 py-1.5 rounded-lg border border-white/10">
          <button
            onClick={() => setSizeIdx((s) => Math.max(0, s - 1))}
            disabled={sizeIdx === 0}
            className="text-white/40 hover:text-white/70 disabled:opacity-25 transition-colors"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M2 5h6" strokeLinecap="round" />
            </svg>
          </button>
          <span className="w-5 text-center text-xs text-white/60 tabular-nums">{currentSize}</span>
          <button
            onClick={() => setSizeIdx((s) => Math.min(PEN_SIZES.length - 1, s + 1))}
            disabled={sizeIdx === PEN_SIZES.length - 1}
            className="text-white/40 hover:text-white/70 disabled:opacity-25 transition-colors"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M5 2v6M2 5h6" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="w-px h-4 bg-white/10 mx-0.5" />

        {/* Undo / Redo */}
        <button
          onClick={undo}
          disabled={histIdx <= 0}
          className="p-1.5 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/5 disabled:opacity-25 transition-colors"
          title="Undo (Ctrl+Z)"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 7v6h6" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button
          onClick={redo}
          disabled={histIdx >= history.length - 1}
          className="p-1.5 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/5 disabled:opacity-25 transition-colors"
          title="Redo (Ctrl+Y)"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 7v6h-6" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M3 17a9 9 0 019-9 9 9 0 016 2.3L21 13" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <div className="w-px h-4 bg-white/10 mx-0.5" />

        <button
          onClick={() => { setStrokes([]); pushHistory([]); onSave({ strokes: [] }); }}
          className="px-2.5 py-1.5 text-xs text-white/35 hover:text-red-400 hover:bg-red-500/8 rounded-lg transition-colors"
        >
          Clear
        </button>

        <span className="ml-auto text-[11px] text-white/25">
          {strokes.length} stroke{strokes.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Two-canvas stack: background (always visible) + ink layer (with erasing) */}
      <div className="flex-1 overflow-hidden relative select-none">
        {/* Background canvas – dark fill + dot grid; never cleared by erasing */}
        <canvas ref={bgCanvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />

        {strokes.length === 0 && !drawing && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none z-10">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-white/8">
              <path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4 12.5-12.5z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <p className="text-sm text-white/15">
              Draw with your pen, stylus, or mouse
            </p>
          </div>
        )}

        {/* Ink canvas – transparent; destination-out erasing reveals the background canvas */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full touch-none"
          style={{ touchAction: "none", cursor: tool === "eraser" ? "cell" : "crosshair" }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={(e) => onPointerUp(e)}
          onPointerLeave={(e) => onPointerUp(e)}
        />
      </div>
    </div>
  );
}

// ─── Text Editor ──────────────────────────────────────────────────────────────

function TextEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/8 bg-white/3 shrink-0">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/30">
          <polyline points="4 7 4 4 20 4 20 7" strokeLinecap="round" strokeLinejoin="round" />
          <line x1="9" y1="20" x2="15" y2="20" strokeLinecap="round" />
          <line x1="12" y1="4" x2="12" y2="20" strokeLinecap="round" />
        </svg>
        <span className="text-xs text-white/30 font-medium">Text note</span>
        <span className="ml-auto text-[11px] text-white/20">{value.length} chars</span>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={"Start typing...\n\nMarkdown is supported:\n  # Heading\n  **bold**  _italic_\n  - bullet list"}
        className="flex-1 resize-none bg-transparent p-5 text-sm leading-relaxed text-white/85 placeholder-white/18 outline-none font-mono"
        spellCheck
      />
    </div>
  );
}

// ─── Note Card ────────────────────────────────────────────────────────────────

function NoteCard({
  note,
  active,
  onSelect,
  onPin,
  onDelete,
}: {
  note: Note;
  active: boolean;
  onSelect: () => void;
  onPin: () => void;
  onDelete: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <button
      onClick={onSelect}
      className={`group w-full text-left rounded-xl px-3 py-2.5 transition-all duration-100 relative ${
        active
          ? "bg-white/10 ring-1 ring-white/15"
          : "hover:bg-white/5"
      }`}
    >
      {/* Colour dot */}
      {note.color && (
        <span
          className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1 h-5 rounded-full opacity-70"
          style={{ background: note.color }}
        />
      )}
      <div className={note.color ? "pl-2" : ""}>
        <div className="flex items-center gap-1.5 mb-0.5">
          {note.isPinned && (
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className="text-amber-400/80 shrink-0">
              <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5v6h2v-6h5v-2l-2-2z" />
            </svg>
          )}
          <span className="text-sm font-medium text-white/82 truncate flex-1">{note.title}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] text-white/30 truncate leading-snug">
            {note.content
              ? note.content.slice(0, 50).replace(/\n/g, " ")
              : note.canvasData
              ? "Canvas note"
              : "Empty note"}
          </span>
          <span className="text-[10px] text-white/22 shrink-0">{relativeTime(note._updatedAt)}</span>
        </div>
      </div>

      {/* Context menu */}
      <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="relative">
          <button
            onClick={(e) => { e.stopPropagation(); setMenuOpen((o) => !o); }}
            className="p-1 rounded-md bg-white/8 hover:bg-white/15 transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-white/50">
              <circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" />
            </svg>
          </button>
          {menuOpen && (
            <div
              className="absolute right-0 top-full mt-1 z-50 w-36 rounded-xl border border-white/10 bg-[#111]/95 backdrop-blur-xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => { onPin(); setMenuOpen(false); }}
                className="flex items-center gap-2.5 w-full px-3 py-2.5 text-xs text-white/70 hover:bg-white/8 hover:text-white transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-amber-400/70">
                  <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5v6h2v-6h5v-2l-2-2z" />
                </svg>
                {note.isPinned ? "Unpin" : "Pin"}
              </button>
              <button
                onClick={() => { onDelete(); setMenuOpen(false); }}
                className="flex items-center gap-2.5 w-full px-3 py-2.5 text-xs text-red-400/70 hover:bg-red-500/8 hover:text-red-400 transition-colors border-t border-white/5"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function NotesClient() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"text" | "canvas">("text");
  const [saving, setSaving] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Auto-enter fullscreen whenever a note is opened or created
  useEffect(() => {
    if (selectedId) setIsFullscreen(true);
  }, [selectedId]);

  // Escape exits fullscreen
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && isFullscreen) setIsFullscreen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isFullscreen]);

  // ── Foldable / dual-screen layout ──────────────────────────────────────────
  // When the app is spanned across two screens (Surface Duo, Galaxy Z Fold…)
  // we expand the notes list to fill exactly the left screen so the hinge gap
  // falls precisely on the divider between the list and the editor pane.
  const { isSpanned, leftScreenWidth } = useFoldableLayout();
  const listRef = useRef<HTMLDivElement>(null);
  const [listPanelWidth, setListPanelWidth] = useState<number | undefined>(undefined);

  useLayoutEffect(() => {
    if (!isSpanned || leftScreenWidth === null) {
      setListPanelWidth(undefined);
      return;
    }
    if (listRef.current) {
      const containerLeft = listRef.current.getBoundingClientRect().left;
      // Width = (right edge of left screen) − (left edge of our panel)
      const w = Math.max(160, Math.floor(leftScreenWidth - containerLeft));
      setListPanelWidth(w);
    }
  }, [isSpanned, leftScreenWidth]);

  // Load notes
  useEffect(() => {
    fetch("/api/admin/notes")
      .then((r) => r.ok ? r.json() : [])
      .then((data: Note[]) => {
        setNotes(data);
        if (data.length > 0) setSelectedId(data[0]._id);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const selected = notes.find((n) => n._id === selectedId) ?? null;

  const filtered = useMemo(
    () => notes.filter((n) =>
      n.title.toLowerCase().includes(search.toLowerCase()) ||
      (n.content ?? "").toLowerCase().includes(search.toLowerCase())
    ),
    [notes, search]
  );

  // ── Save helpers ─────────────────────────────────────────────────────────────

  function scheduleSave(id: string, patch: Partial<Note>) {
    // Optimistic update
    setNotes((prev) =>
      prev.map((n) => (n._id === id ? { ...n, ...patch, _updatedAt: new Date().toISOString() } : n))
    );
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaving(true);
    saveTimer.current = setTimeout(async () => {
      try {
        await fetch(`/api/admin/notes/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        });
      } finally {
        setSaving(false);
      }
    }, 700);
  }

  // ── Create ───────────────────────────────────────────────────────────────────

  async function handleCreate() {
    const res = await fetch("/api/admin/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Untitled Note" }),
    });
    if (!res.ok) return;
    const { _id } = await res.json() as { _id: string };
    const newNote: Note = {
      _id,
      title: "Untitled Note",
      content: null,
      canvasData: null,
      color: null,
      isPinned: false,
      _createdAt: new Date().toISOString(),
      _updatedAt: new Date().toISOString(),
    };
    setNotes((prev) => [newNote, ...prev]);
    setSelectedId(_id);
    setTab("text");
  }

  // ── Delete ────────────────────────────────────────────────────────────────────

  async function handleDelete(id: string) {
    await fetch(`/api/admin/notes/${id}`, { method: "DELETE" });
    const remaining = notes.filter((n) => n._id !== id);
    setNotes(remaining);
    if (selectedId === id) setSelectedId(remaining[0]?._id ?? null);
  }

  // ── Pin ────────────────────────────────────────────────────────────────────────

  function handlePin(note: Note) {
    scheduleSave(note._id, { isPinned: !note.isPinned });
    // Re-sort pinned to top
    setTimeout(() => {
      setNotes((prev) => [...prev].sort((a, b) => {
        if (a.isPinned === b.isPinned) return new Date(b._updatedAt).getTime() - new Date(a._updatedAt).getTime();
        return a.isPinned ? -1 : 1;
      }));
    }, 100);
  }

  // ── Canvas ────────────────────────────────────────────────────────────────────

  const currentCanvasData = useMemo<CanvasData>(() => {
    if (!selected?.canvasData) return { strokes: [] };
    try { return JSON.parse(selected.canvasData) as CanvasData; }
    catch { return { strokes: [] }; }
  }, [selected?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCanvasSave = useCallback((data: CanvasData) => {
    if (!selected) return;
    scheduleSave(selected._id, { canvasData: JSON.stringify(data) });
  }, [selected?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  const hasCanvasStrokes = useMemo(() => {
    if (!selected?.canvasData) return false;
    try { return (JSON.parse(selected.canvasData) as CanvasData).strokes?.length > 0; }
    catch { return false; }
  }, [selected?.canvasData]);

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── Left: note list ── */}
      <div
        ref={listRef}
        className="flex flex-col shrink-0 border-r border-white/8 bg-black/20 overflow-hidden transition-[width] duration-200"
        style={{ width: listPanelWidth ?? 256 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/8 shrink-0">
          <div className="flex items-center gap-2">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="text-white/50">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-sm font-semibold text-white/75">Notes</span>
            {notes.length > 0 && (
              <span className="text-xs text-white/25">({notes.length})</span>
            )}
          </div>
          <button
            onClick={handleCreate}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/6 hover:bg-white/12 transition-colors"
            title="New note"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-white/60">
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="px-3 py-2 border-b border-white/5 shrink-0">
          <div className="relative">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/25">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" strokeLinecap="round" />
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search notes…"
              className="w-full pl-8 pr-3 py-1.5 bg-white/5 rounded-lg text-xs text-white/70 placeholder-white/22 outline-none focus:bg-white/8 transition-colors"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto py-1.5 px-1.5">
          {loading ? (
            <div className="flex items-center justify-center h-24">
              <div className="w-5 h-5 rounded-full border-2 border-white/10 border-t-white/40 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 gap-3 px-4 text-center">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-white/10">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <p className="text-xs text-white/22">
                {search ? "No results" : "No notes yet"}
              </p>
              {!search && (
                <button
                  onClick={handleCreate}
                  className="text-xs text-white/45 hover:text-white/70 underline underline-offset-2 transition-colors"
                >
                  Create your first note
                </button>
              )}
            </div>
          ) : (
            <>
              {filtered.some((n) => n.isPinned) && (
                <p className="text-[10px] font-semibold uppercase tracking-widest text-white/20 px-3 pt-1 pb-1.5">Pinned</p>
              )}
              {filtered.filter((n) => n.isPinned).map((note) => (
                <NoteCard
                  key={note._id}
                  note={note}
                  active={note._id === selectedId}
                  onSelect={() => setSelectedId(note._id)}
                  onPin={() => handlePin(note)}
                  onDelete={() => handleDelete(note._id)}
                />
              ))}
              {filtered.some((n) => n.isPinned) && filtered.some((n) => !n.isPinned) && (
                <p className="text-[10px] font-semibold uppercase tracking-widest text-white/20 px-3 pt-3 pb-1.5">Notes</p>
              )}
              {filtered.filter((n) => !n.isPinned).map((note) => (
                <NoteCard
                  key={note._id}
                  note={note}
                  active={note._id === selectedId}
                  onSelect={() => setSelectedId(note._id)}
                  onPin={() => handlePin(note)}
                  onDelete={() => handleDelete(note._id)}
                />
              ))}
            </>
          )}
        </div>
      </div>

      {/* ── Right: editor (or fullscreen overlay) ── */}
      {selected ? (
        <div className={
          isFullscreen
            ? "fixed inset-0 z-[9999] flex flex-col bg-[#080808]"
            : "flex-1 flex flex-col overflow-hidden min-w-0"
        }>
          {/* Top bar */}
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/8 shrink-0">

            {/* Back to notes — only visible in fullscreen */}
            {isFullscreen && (
              <button
                onClick={() => setIsFullscreen(false)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-white/45 hover:text-white/80 hover:bg-white/6 transition-colors shrink-0 mr-1"
                title="Back to notes list  (Esc)"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="text-xs font-medium">Notes</span>
              </button>
            )}

            <input
              value={selected.title}
              onChange={(e) => scheduleSave(selected._id, { title: e.target.value })}
              className="flex-1 bg-transparent text-base font-semibold text-white/85 placeholder-white/25 outline-none min-w-0"
              placeholder="Untitled Note"
            />

            {saving && (
              <span className="text-[11px] text-white/25 animate-pulse shrink-0">Saving…</span>
            )}

            {/* Colour */}
            <div className="relative">
              <button
                onClick={() => setColorPickerOpen((o) => !o)}
                className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
                title="Note colour"
              >
                <span
                  className="w-3 h-3 rounded-full border border-white/20"
                  style={{ background: selected.color ?? "transparent" }}
                />
                <svg width="9" height="9" viewBox="0 0 10 10" fill="currentColor" className="text-white/25">
                  <path d="M5 7L1 3h8L5 7z" />
                </svg>
              </button>
              {colorPickerOpen && (
                <div
                  className="absolute right-0 top-full mt-1 z-50 p-2.5 rounded-xl border border-white/10 bg-[#111]/95 backdrop-blur-xl shadow-2xl"
                  onMouseLeave={() => setColorPickerOpen(false)}
                >
                  <p className="text-[10px] text-white/25 font-medium mb-2 px-0.5">Note colour</p>
                  <div className="grid grid-cols-4 gap-1.5">
                    {NOTE_COLORS.map((c) => (
                      <button
                        key={c.label}
                        onClick={() => { scheduleSave(selected._id, { color: c.value }); setColorPickerOpen(false); }}
                        className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 ${
                          selected.color === c.value ? "border-white/60 scale-110" : "border-transparent"
                        } ${c.dot}`}
                        title={c.label}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Pin */}
            <button
              onClick={() => handlePin(selected)}
              className={`p-1.5 rounded-lg transition-colors ${
                selected.isPinned
                  ? "text-amber-400 bg-amber-500/10"
                  : "text-white/30 hover:text-white/60 hover:bg-white/5"
              }`}
              title={selected.isPinned ? "Unpin" : "Pin note"}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5v6h2v-6h5v-2l-2-2z" />
              </svg>
            </button>

            {/* Delete */}
            <button
              onClick={() => handleDelete(selected._id)}
              className="p-1.5 rounded-lg text-white/25 hover:text-red-400 hover:bg-red-500/8 transition-colors"
              title="Delete note"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {/* Fullscreen toggle */}
            <button
              onClick={() => setIsFullscreen((f) => !f)}
              className="p-1.5 rounded-lg text-white/25 hover:text-white/60 hover:bg-white/5 transition-colors ml-0.5"
              title={isFullscreen ? "Exit fullscreen  (Esc)" : "Fullscreen"}
            >
              {isFullscreen ? (
                /* Compress / exit icon */
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M8 3v3a2 2 0 01-2 2H3M21 8h-3a2 2 0 01-2-2V3M3 16h3a2 2 0 012 2v3M16 21v-3a2 2 0 012-2h3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                /* Expand icon */
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M8 3H5a2 2 0 00-2 2v3M21 8V5a2 2 0 00-2-2h-3M3 16v3a2 2 0 002 2h3M16 21h3a2 2 0 002-2v-3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
          </div>

          {/* Tab switcher */}
          <div className="flex items-center gap-0 border-b border-white/8 px-5 shrink-0">
            <button
              onClick={() => setTab("text")}
              className={`flex items-center gap-1.5 px-1 py-2.5 text-xs font-medium border-b-2 mr-4 transition-colors ${
                tab === "text"
                  ? "border-white/60 text-white/80"
                  : "border-transparent text-white/30 hover:text-white/55"
              }`}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="4 7 4 4 20 4 20 7" strokeLinecap="round" strokeLinejoin="round" />
                <line x1="9" y1="20" x2="15" y2="20" strokeLinecap="round" />
                <line x1="12" y1="4" x2="12" y2="20" strokeLinecap="round" />
              </svg>
              Text
            </button>
            <button
              onClick={() => setTab("canvas")}
              className={`flex items-center gap-1.5 px-1 py-2.5 text-xs font-medium border-b-2 transition-colors ${
                tab === "canvas"
                  ? "border-white/60 text-white/80"
                  : "border-transparent text-white/30 hover:text-white/55"
              }`}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4 12.5-12.5z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Canvas
              {hasCanvasStrokes && (
                <span className="w-1.5 h-1.5 rounded-full bg-white/40 inline-block" />
              )}
            </button>
          </div>

          {/* Editor */}
          <div className="flex-1 overflow-hidden">
            {tab === "text" ? (
              <TextEditor
                value={selected.content ?? ""}
                onChange={(v) => scheduleSave(selected._id, { content: v })}
              />
            ) : (
              <DrawingCanvas
                key={selected._id}
                initialData={currentCanvasData}
                onSave={handleCanvasSave}
              />
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-white/4 flex items-center justify-center mb-1">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" className="text-white/20">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-white/50">No note selected</p>
            <p className="text-xs text-white/25 mt-1">Select a note or create a new one</p>
          </div>
          <button
            onClick={handleCreate}
            className="mt-1 px-4 py-2 rounded-xl bg-white/8 hover:bg-white/13 text-sm text-white/65 hover:text-white/85 transition-colors"
          >
            New note
          </button>
          <p className="text-xs text-white/15 max-w-xs leading-relaxed">
            Switch between Text and Canvas tabs in any note to type or draw with your pen or stylus.
          </p>
        </div>
      )}
    </div>
  );
}
