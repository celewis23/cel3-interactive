"use client";
import { useState, useEffect, useRef } from "react";

type PmTask = {
  _id: string;
  projectId: string;
  columnId: string;
  title: string;
  description: string;
  priority: "low" | "medium" | "high";
  dueDate: string | null;
  assignee: string | null;
  clientRef: string | null;
  driveFileId: string | null;
  driveFileUrl: string | null;
  driveFileName: string | null;
  _createdAt: string;
};

type PmComment = {
  _id: string;
  taskId: string;
  text: string;
  author: string;
  _createdAt: string;
};

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low", color: "text-white/50" },
  { value: "medium", label: "Medium", color: "text-yellow-400" },
  { value: "high", label: "High", color: "text-red-400" },
];

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function TaskDetailPanel({
  task,
  projectId,
  onClose,
  onUpdated,
  onDeleted,
}: {
  task: PmTask;
  projectId: string;
  onClose: () => void;
  onUpdated: (t: PmTask) => void;
  onDeleted: (id: string) => void;
}) {
  const [form, setForm] = useState({
    title: task.title,
    description: task.description ?? "",
    priority: task.priority,
    dueDate: task.dueDate ?? "",
    assignee: task.assignee ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [comments, setComments] = useState<PmComment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [postingComment, setPostingComment] = useState(false);
  const [driveUrl, setDriveUrl] = useState(task.driveFileUrl ?? "");
  const [driveFileName, setDriveFileName] = useState(task.driveFileName ?? "");
  const [linkingDrive, setLinkingDrive] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Reset form when task changes
  useEffect(() => {
    setForm({
      title: task.title,
      description: task.description ?? "",
      priority: task.priority,
      dueDate: task.dueDate ?? "",
      assignee: task.assignee ?? "",
    });
    setDriveUrl(task.driveFileUrl ?? "");
    setDriveFileName(task.driveFileName ?? "");
  }, [task._id]);

  // Load comments
  useEffect(() => {
    fetch(`/api/admin/pm/tasks/${task._id}/comments`)
      .then((r) => r.json())
      .then((data) => setComments(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [task._id]);

  // Close on backdrop click
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/pm/tasks/${task._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description,
          priority: form.priority,
          dueDate: form.dueDate || null,
          assignee: form.assignee.trim() || null,
        }),
      });
      const updated = await res.json();
      if (res.ok) onUpdated(updated);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this task? This cannot be undone.")) return;
    setDeleting(true);
    try {
      await fetch(`/api/admin/pm/tasks/${task._id}`, { method: "DELETE" });
      onDeleted(task._id);
    } finally {
      setDeleting(false);
    }
  }

  async function handlePostComment() {
    if (!commentText.trim() || postingComment) return;
    setPostingComment(true);
    try {
      const res = await fetch(`/api/admin/pm/tasks/${task._id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: commentText.trim() }),
      });
      const comment = await res.json();
      if (res.ok) {
        setComments((cs) => [...cs, comment]);
        setCommentText("");
      }
    } finally {
      setPostingComment(false);
    }
  }

  async function handleLinkDrive() {
    if (!driveUrl.trim()) return;
    setLinkingDrive(true);
    try {
      const urlObj = new URL(driveUrl.trim());
      const match = urlObj.pathname.match(/\/d\/([^/]+)/);
      const fileId = match?.[1] ?? null;
      const name = driveFileName.trim() || urlObj.pathname.split("/").pop() || "Drive file";

      const res = await fetch(`/api/admin/pm/tasks/${task._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          driveFileId: fileId,
          driveFileUrl: driveUrl.trim(),
          driveFileName: name,
        }),
      });
      const updated = await res.json();
      if (res.ok) onUpdated(updated);
    } catch {
      // invalid URL - ignore
    } finally {
      setLinkingDrive(false);
    }
  }

  async function handleRemoveDrive() {
    const res = await fetch(`/api/admin/pm/tasks/${task._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ driveFileId: null, driveFileUrl: null, driveFileName: null }),
    });
    const updated = await res.json();
    if (res.ok) {
      setDriveUrl("");
      setDriveFileName("");
      onUpdated(updated);
    }
  }

  const isDirty =
    form.title !== task.title ||
    form.description !== (task.description ?? "") ||
    form.priority !== task.priority ||
    form.dueDate !== (task.dueDate ?? "") ||
    form.assignee !== (task.assignee ?? "");

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-[#0a0a0a] border-l border-white/8 flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8 flex-shrink-0">
          <span className="text-xs uppercase tracking-widest text-white/30">Task</span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="text-xs text-red-400/60 hover:text-red-400 transition-colors px-2 py-1 rounded-lg hover:bg-red-400/5"
            >
              {deleting ? "Deleting…" : "Delete"}
            </button>
            <button
              onClick={onClose}
              className="text-white/30 hover:text-white/70 transition-colors text-lg leading-none px-1"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          {/* Title */}
          <div>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full bg-transparent text-white text-base font-semibold outline-none border-b border-transparent focus:border-white/20 pb-1 transition-colors placeholder-white/20"
              placeholder="Task title"
            />
          </div>

          {/* Priority + Due Date + Assignee */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] uppercase tracking-wide text-white/30 mb-1.5">Priority</label>
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value as PmTask["priority"] })}
                className="w-full px-2.5 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-sky-500/50 [color-scheme:dark]"
              >
                {PRIORITY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wide text-white/30 mb-1.5">Due Date</label>
              <input
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                className="w-full px-2.5 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-sky-500/50 [color-scheme:dark]"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-[10px] uppercase tracking-wide text-white/30 mb-1.5">Assignee</label>
              <input
                value={form.assignee}
                onChange={(e) => setForm({ ...form, assignee: e.target.value })}
                placeholder="Name or email"
                className="w-full px-2.5 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder-white/20 outline-none focus:border-sky-500/50"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-[10px] uppercase tracking-wide text-white/30 mb-1.5">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Add details, context, or notes…"
              rows={4}
              className="w-full px-2.5 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder-white/20 outline-none focus:border-sky-500/50 resize-none"
            />
          </div>

          {/* Save button */}
          {isDirty && (
            <button
              onClick={handleSave}
              disabled={saving || !form.title.trim()}
              className="w-full py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-40 text-black font-semibold text-sm transition-colors"
            >
              {saving ? "Saving…" : "Save Changes"}
            </button>
          )}

          {/* Drive attachment */}
          <div>
            <label className="block text-[10px] uppercase tracking-wide text-white/30 mb-2">Google Drive Attachment</label>
            {task.driveFileUrl ? (
              <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-white/4 border border-white/8">
                <a
                  href={task.driveFileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sky-400 text-sm hover:underline truncate flex items-center gap-1.5"
                >
                  <span>📎</span>
                  <span className="truncate">{task.driveFileName || "Drive file"}</span>
                </a>
                <button
                  onClick={handleRemoveDrive}
                  className="text-xs text-white/30 hover:text-red-400 transition-colors ml-2 flex-shrink-0"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <input
                  value={driveUrl}
                  onChange={(e) => setDriveUrl(e.target.value)}
                  placeholder="Paste Google Drive link…"
                  className="w-full px-2.5 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder-white/20 outline-none focus:border-sky-500/50"
                />
                <div className="flex gap-2">
                  <input
                    value={driveFileName}
                    onChange={(e) => setDriveFileName(e.target.value)}
                    placeholder="Display name (optional)"
                    className="flex-1 px-2.5 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder-white/20 outline-none focus:border-sky-500/50"
                  />
                  <button
                    onClick={handleLinkDrive}
                    disabled={!driveUrl.trim() || linkingDrive}
                    className="px-3 py-2 rounded-lg bg-white/8 hover:bg-white/14 disabled:opacity-40 text-white text-sm transition-colors flex-shrink-0"
                  >
                    Link
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Comments */}
          <div>
            <label className="block text-[10px] uppercase tracking-wide text-white/30 mb-3">Comments</label>
            {comments.length > 0 ? (
              <div className="space-y-3 mb-3">
                {comments.map((c) => (
                  <div key={c._id} className="flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-sky-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-[10px] text-sky-400 font-semibold">
                        {(c.author || "A")[0].toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="text-xs font-semibold text-white/70">{c.author || "Admin"}</span>
                        <span className="text-[10px] text-white/30">{timeAgo(c._createdAt)}</span>
                      </div>
                      <p className="text-sm text-white/60 leading-relaxed whitespace-pre-wrap">{c.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-white/25 mb-3">No comments yet.</p>
            )}

            <div className="flex gap-2">
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handlePostComment();
                }}
                placeholder="Add a comment… (⌘+Enter to post)"
                rows={2}
                className="flex-1 px-2.5 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder-white/20 outline-none focus:border-sky-500/50 resize-none"
              />
              <button
                onClick={handlePostComment}
                disabled={!commentText.trim() || postingComment}
                className="px-3 py-2 rounded-lg bg-white/8 hover:bg-white/14 disabled:opacity-40 text-white text-sm transition-colors self-end"
              >
                Post
              </button>
            </div>
          </div>

          {/* Metadata */}
          <div className="pt-2 border-t border-white/6">
            <p className="text-[11px] text-white/20">
              Created {new Date(task._createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
