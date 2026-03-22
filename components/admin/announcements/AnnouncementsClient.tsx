"use client";

import { useState, useEffect, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Reaction {
  _key: string;
  userId: string | null;
  userName: string;
  reactedAt: string;
}

interface Announcement {
  _id: string;
  title: string;
  body: string;
  priority: "normal" | "urgent";
  authorName: string;
  authorId: string | null;
  expiryDate: string | null;
  archived: boolean;
  createdAt: string;
  reactions: Reaction[];
  readBy: string[];
}

interface Pin {
  _id: string;
  title: string;
  content: string | null;
  url: string | null;
  category: string;
  authorName: string;
  authorId: string | null;
  order: number;
  createdAt: string;
}

interface Props {
  canPost: boolean;
  currentUserId: string | null;
}

type Tab = "feed" | "pinboard" | "archive";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return "just now";
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? "s" : ""} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatExpiry(dateStr: string): string {
  const date = new Date(dateStr);
  return `Expires ${date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
}

function formatReactors(reactions: Reaction[]): string {
  if (reactions.length === 0) return "";
  const names = reactions.map((r) => r.userName);
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  if (names.length === 3) return `${names[0]}, ${names[1]}, and ${names[2]}`;
  return `${names[0]}, ${names[1]}, and ${names.length - 2} others`;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-white/3 border border-white/8 rounded-xl p-5 animate-pulse space-y-3">
      <div className="h-4 bg-white/8 rounded w-2/3" />
      <div className="space-y-2">
        <div className="h-3 bg-white/5 rounded w-full" />
        <div className="h-3 bg-white/5 rounded w-5/6" />
        <div className="h-3 bg-white/5 rounded w-4/6" />
      </div>
      <div className="h-3 bg-white/5 rounded w-1/3" />
    </div>
  );
}

// ─── Post Form ────────────────────────────────────────────────────────────────

interface PostFormProps {
  onPost: (a: Announcement) => void;
}

function PostForm({ onPost }: PostFormProps) {
  const [expanded, setExpanded] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [priority, setPriority] = useState<"normal" | "urgent">("normal");
  const [expiryDate, setExpiryDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim(),
          priority,
          expiryDate: expiryDate || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to post announcement");
      const data = await res.json();
      onPost(data.announcement ?? data);
      setTitle("");
      setBody("");
      setPriority("normal");
      setExpiryDate("");
      setExpanded(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="w-full flex items-center gap-2 px-4 py-3 bg-white/3 border border-white/8 rounded-xl text-sm text-white/50 hover:text-white hover:bg-white/5 hover:border-white/15 transition-all text-left"
      >
        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        Post Announcement
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white/3 border border-white/8 rounded-xl p-5 space-y-4"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">New Announcement</h3>
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="text-white/30 hover:text-white/70 transition-colors"
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <input
        type="text"
        placeholder="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-sky-500/50"
      />

      <textarea
        placeholder="Write your announcement..."
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={4}
        required
        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-sky-500/50 resize-none"
      />

      <div className="flex items-center gap-4 flex-wrap">
        {/* Priority toggle */}
        <div className="flex items-center gap-1 p-1 bg-white/5 rounded-lg">
          <button
            type="button"
            onClick={() => setPriority("normal")}
            className={`px-3 py-1.5 text-xs rounded-md transition-all ${
              priority === "normal"
                ? "bg-white/10 text-white font-medium"
                : "text-white/40 hover:text-white/70"
            }`}
          >
            Normal
          </button>
          <button
            type="button"
            onClick={() => setPriority("urgent")}
            className={`px-3 py-1.5 text-xs rounded-md transition-all ${
              priority === "urgent"
                ? "bg-amber-500/20 text-amber-400 font-medium"
                : "text-white/40 hover:text-amber-400/70"
            }`}
          >
            Urgent
          </button>
        </div>

        {/* Expiry */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/40">Expires</span>
          <input
            type="date"
            value={expiryDate}
            onChange={(e) => setExpiryDate(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white/70 focus:outline-none focus:border-sky-500/50"
          />
        </div>
      </div>

      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={submitting || !title.trim() || !body.trim()}
          className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:pointer-events-none"
        >
          {submitting ? "Posting…" : "Post"}
        </button>
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-sm rounded-lg transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// ─── Announcement Card ────────────────────────────────────────────────────────

interface AnnouncementCardProps {
  announcement: Announcement;
  canPost: boolean;
  currentUserId: string | null;
  onArchive: (id: string) => void;
  onUnarchive?: (id: string) => void;
  onReact: (id: string, reactions: Reaction[]) => void;
  onUpdate: (id: string, updates: Partial<Announcement>) => void;
  showArchived?: boolean;
}

function AnnouncementCard({
  announcement,
  canPost,
  currentUserId,
  onArchive,
  onUnarchive,
  onReact,
  onUpdate,
  showArchived = false,
}: AnnouncementCardProps) {
  const [hovered, setHovered] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(announcement.title);
  const [editBody, setEditBody] = useState(announcement.body);
  const [editPriority, setEditPriority] = useState(announcement.priority);
  const [saving, setSaving] = useState(false);
  const [archiving, setArchiving] = useState(false);

  const isUrgent = announcement.priority === "urgent";
  const hasReacted = currentUserId
    ? announcement.reactions.some((r) => r.userId === currentUserId)
    : false;
  const reactors = formatReactors(announcement.reactions);

  async function handleReact() {
    if (!currentUserId) return;

    // Optimistic update
    let nextReactions: Reaction[];
    if (hasReacted) {
      nextReactions = announcement.reactions.filter((r) => r.userId !== currentUserId);
    } else {
      nextReactions = [
        ...announcement.reactions,
        {
          _key: `${currentUserId}-${Date.now()}`,
          userId: currentUserId,
          userName: "You",
          reactedAt: new Date().toISOString(),
        },
      ];
    }
    onReact(announcement._id, nextReactions);

    try {
      const res = await fetch(`/api/admin/announcements/${announcement._id}/react`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      if (data.reactions) {
        onReact(announcement._id, data.reactions);
      }
    } catch {
      // Revert on error
      onReact(announcement._id, announcement.reactions);
    }
  }

  async function handleArchive() {
    setArchiving(true);
    try {
      await fetch(`/api/admin/announcements/${announcement._id}`, {
        method: "DELETE",
      });
      onArchive(announcement._id);
    } catch {
      // ignore
    } finally {
      setArchiving(false);
    }
  }

  async function handleUnarchive() {
    try {
      await fetch(`/api/admin/announcements/${announcement._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived: false }),
      });
      if (onUnarchive) onUnarchive(announcement._id);
    } catch {
      // ignore
    }
  }

  async function handleSaveEdit() {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/announcements/${announcement._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle.trim(),
          body: editBody.trim(),
          priority: editPriority,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      onUpdate(announcement._id, {
        title: editTitle.trim(),
        body: editBody.trim(),
        priority: editPriority,
      });
      setEditing(false);
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  }

  const borderClass = isUrgent
    ? "border-l-4 border-l-amber-500 border border-white/8"
    : "border border-white/8";

  return (
    <div
      className={`bg-white/3 ${borderClass} rounded-xl p-5 space-y-3 relative group transition-colors hover:bg-white/4`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {isUrgent && (
              <span className="inline-flex items-center px-2 py-0.5 bg-amber-500/15 text-amber-400 text-xs font-semibold rounded uppercase tracking-wide">
                Urgent
              </span>
            )}
            {showArchived && (
              <span className="inline-flex items-center px-2 py-0.5 bg-white/8 text-white/40 text-xs rounded uppercase tracking-wide">
                Archived
              </span>
            )}
            {editing ? (
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm font-semibold text-white focus:outline-none focus:border-sky-500/50"
              />
            ) : (
              <h3 className="text-base font-semibold text-white">{announcement.title}</h3>
            )}
          </div>
          <p className="text-xs text-white/40 mt-1">
            {announcement.authorName} · {timeAgo(announcement.createdAt)}
            {announcement.expiryDate && (
              <span className="ml-2 text-white/30">{formatExpiry(announcement.expiryDate)}</span>
            )}
          </p>
        </div>

        {/* Actions (visible on hover or always for canPost) */}
        {canPost && (hovered || editing) && (
          <div className="flex items-center gap-1 flex-shrink-0">
            {!editing && (
              <button
                onClick={() => setEditing(true)}
                title="Edit"
                className="p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/8 transition-colors"
              >
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                </svg>
              </button>
            )}
            {!showArchived ? (
              <button
                onClick={handleArchive}
                disabled={archiving}
                title="Archive"
                className="px-2 py-1 rounded-lg text-xs text-white/30 hover:text-amber-400/70 hover:bg-amber-500/10 transition-colors disabled:opacity-50"
              >
                {archiving ? "…" : "Archive"}
              </button>
            ) : (
              <button
                onClick={handleUnarchive}
                title="Unarchive"
                className="px-2 py-1 rounded-lg text-xs text-white/30 hover:text-sky-400/70 hover:bg-sky-500/10 transition-colors"
              >
                Unarchive
              </button>
            )}
          </div>
        )}
      </div>

      {/* Body / Edit form */}
      {editing ? (
        <div className="space-y-3">
          <textarea
            value={editBody}
            onChange={(e) => setEditBody(e.target.value)}
            rows={4}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-sky-500/50 resize-none"
          />
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 p-1 bg-white/5 rounded-lg">
              <button
                type="button"
                onClick={() => setEditPriority("normal")}
                className={`px-3 py-1 text-xs rounded-md transition-all ${
                  editPriority === "normal"
                    ? "bg-white/10 text-white font-medium"
                    : "text-white/40 hover:text-white/70"
                }`}
              >
                Normal
              </button>
              <button
                type="button"
                onClick={() => setEditPriority("urgent")}
                className={`px-3 py-1 text-xs rounded-md transition-all ${
                  editPriority === "urgent"
                    ? "bg-amber-500/20 text-amber-400 font-medium"
                    : "text-white/40 hover:text-amber-400/70"
                }`}
              >
                Urgent
              </button>
            </div>
            <button
              onClick={handleSaveEdit}
              disabled={saving}
              className="px-3 py-1.5 bg-sky-500 hover:bg-sky-400 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              onClick={() => {
                setEditing(false);
                setEditTitle(announcement.title);
                setEditBody(announcement.body);
                setEditPriority(announcement.priority);
              }}
              className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-xs rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-white/70 whitespace-pre-wrap leading-relaxed">{announcement.body}</p>
      )}

      {/* Reactions */}
      {!editing && (
        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={handleReact}
            disabled={!currentUserId}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-sm transition-all ${
              hasReacted
                ? "bg-sky-500/15 text-sky-400 hover:bg-sky-500/20"
                : "bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/70"
            } disabled:opacity-40 disabled:pointer-events-none`}
          >
            <span>👍</span>
            <span className="text-xs font-medium">{announcement.reactions.length}</span>
          </button>
          {reactors && (
            <p className="text-xs text-white/30">
              👍 {reactors}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Feed Tab ─────────────────────────────────────────────────────────────────

interface FeedTabProps {
  canPost: boolean;
  currentUserId: string | null;
}

function FeedTab({ canPost, currentUserId }: FeedTabProps) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/announcements");
      if (!res.ok) throw new Error("Failed to load announcements");
      const data = await res.json();
      const items: Announcement[] = data.announcements ?? data ?? [];
      setAnnouncements(items);

      // Fire-and-forget mark as read
      if (currentUserId) {
        items.forEach((a) => {
          if (!a.readBy.includes(currentUserId)) {
            fetch(`/api/admin/announcements/${a._id}/read`, { method: "POST" }).catch(() => {});
          }
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  function handlePost(a: Announcement) {
    setAnnouncements((prev) => [a, ...prev]);
  }

  function handleArchive(id: string) {
    setAnnouncements((prev) => prev.filter((a) => a._id !== id));
  }

  function handleReact(id: string, reactions: Reaction[]) {
    setAnnouncements((prev) =>
      prev.map((a) => (a._id === id ? { ...a, reactions } : a))
    );
  }

  function handleUpdate(id: string, updates: Partial<Announcement>) {
    setAnnouncements((prev) =>
      prev.map((a) => (a._id === id ? { ...a, ...updates } : a))
    );
  }

  return (
    <div className="space-y-4">
      {canPost && <PostForm onPost={handlePost} />}

      {loading ? (
        <div className="space-y-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : error ? (
        <div className="bg-white/3 border border-white/8 rounded-xl p-8 text-center space-y-3">
          <p className="text-red-400 text-sm">{error}</p>
          <button
            onClick={fetchAnnouncements}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-sm rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      ) : announcements.length === 0 ? (
        <div className="bg-white/3 border border-white/8 rounded-xl p-12 text-center">
          <div className="text-4xl mb-3">📋</div>
          <p className="text-white/40 text-sm">No announcements yet</p>
          {canPost && (
            <p className="text-white/25 text-xs mt-1">Post the first announcement above</p>
          )}
        </div>
      ) : (
        announcements.map((a) => (
          <AnnouncementCard
            key={a._id}
            announcement={a}
            canPost={canPost}
            currentUserId={currentUserId}
            onArchive={handleArchive}
            onReact={handleReact}
            onUpdate={handleUpdate}
          />
        ))
      )}
    </div>
  );
}

// ─── Pinboard Tab ─────────────────────────────────────────────────────────────

interface PinCardProps {
  pin: Pin;
  canPost: boolean;
  currentUserId: string | null;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Pin>) => void;
  onDragStart: (id: string) => void;
  onDragOver: (e: React.DragEvent, id: string) => void;
  onDrop: (e: React.DragEvent, id: string) => void;
  isDragOver: boolean;
}

function PinCard({
  pin,
  canPost,
  currentUserId,
  onDelete,
  onUpdate,
  onDragStart,
  onDragOver,
  onDrop,
  isDragOver,
}: PinCardProps) {
  const [hovered, setHovered] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(pin.title);
  const [editContent, setEditContent] = useState(pin.content ?? "");
  const [editUrl, setEditUrl] = useState(pin.url ?? "");
  const [editCategory, setEditCategory] = useState(pin.category);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const canEdit = canPost || pin.authorId === currentUserId;

  async function handleDelete() {
    setDeleting(true);
    try {
      await fetch(`/api/admin/pins/${pin._id}`, { method: "DELETE" });
      onDelete(pin._id);
    } catch {
      // ignore
    } finally {
      setDeleting(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/pins/${pin._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle.trim(),
          content: editContent.trim() || null,
          url: editUrl.trim() || null,
          category: editCategory.trim(),
        }),
      });
      if (!res.ok) throw new Error("Failed");
      onUpdate(pin._id, {
        title: editTitle.trim(),
        content: editContent.trim() || null,
        url: editUrl.trim() || null,
        category: editCategory.trim(),
      });
      setEditing(false);
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  }

  const cardContent = (
    <div
      className={`bg-white/3 border rounded-xl p-4 space-y-3 transition-all cursor-grab active:cursor-grabbing ${
        isDragOver
          ? "border-sky-500/50 bg-sky-500/5 scale-[1.01]"
          : "border-white/8 hover:bg-white/5 hover:border-white/15"
      }`}
      draggable={!editing}
      onDragStart={() => onDragStart(pin._id)}
      onDragOver={(e) => onDragOver(e, pin._id)}
      onDrop={(e) => onDrop(e, pin._id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Drag handle + title row */}
      <div className="flex items-start gap-2">
        <span className="text-white/20 text-lg leading-none mt-0.5 flex-shrink-0 select-none" title="Drag to reorder">
          ⠿
        </span>
        <div className="flex-1 min-w-0">
          {editing ? (
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm font-semibold text-white focus:outline-none focus:border-sky-500/50"
            />
          ) : (
            <h4 className="text-sm font-semibold text-white leading-snug">{pin.title}</h4>
          )}
        </div>
        {canEdit && (hovered || editing) && !editing && (
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => setEditing(true)}
              title="Edit"
              className="p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/8 transition-colors"
            >
              <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
              </svg>
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              title="Delete"
              className="p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
            >
              <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Content / Edit */}
      {editing ? (
        <div className="space-y-2 pl-5">
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            placeholder="Content (optional)"
            rows={3}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-sky-500/50 resize-none"
          />
          <input
            type="url"
            value={editUrl}
            onChange={(e) => setEditUrl(e.target.value)}
            placeholder="URL (optional)"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-sky-500/50"
          />
          <input
            type="text"
            value={editCategory}
            onChange={(e) => setEditCategory(e.target.value)}
            placeholder="Category"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-sky-500/50"
          />
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-3 py-1.5 bg-sky-500 hover:bg-sky-400 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              onClick={() => {
                setEditing(false);
                setEditTitle(pin.title);
                setEditContent(pin.content ?? "");
                setEditUrl(pin.url ?? "");
                setEditCategory(pin.category);
              }}
              className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-xs rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="pl-5 space-y-2">
          {pin.content && (
            <p className="text-xs text-white/50 leading-relaxed line-clamp-3">{pin.content}</p>
          )}
          {pin.url && (
            <a
              href={pin.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300 transition-colors"
            >
              <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
              <span className="truncate max-w-[200px]">{pin.url.replace(/^https?:\/\//, "")}</span>
            </a>
          )}
        </div>
      )}

      {/* Footer */}
      {!editing && (
        <div className="flex items-center justify-between pl-5 pt-1">
          <span className="inline-flex items-center px-2 py-0.5 bg-sky-500/15 text-sky-400 text-xs rounded">
            {pin.category}
          </span>
          <span className="text-xs text-white/30">{pin.authorName} · {timeAgo(pin.createdAt)}</span>
        </div>
      )}
    </div>
  );

  // If url and no content, make card a link
  if (pin.url && !pin.content && !editing) {
    return (
      <a href={pin.url} target="_blank" rel="noopener noreferrer" className="block">
        {cardContent}
      </a>
    );
  }

  return cardContent;
}

// ─── Add Pin Form ─────────────────────────────────────────────────────────────

interface AddPinFormProps {
  existingCategories: string[];
  onAdd: (pin: Pin) => void;
}

function AddPinForm({ existingCategories, onAdd }: AddPinFormProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [url, setUrl] = useState("");
  const [category, setCategory] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredCategories = existingCategories.filter(
    (c) => c.toLowerCase().includes(category.toLowerCase()) && c !== category
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !category.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/pins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim() || null,
          url: url.trim() || null,
          category: category.trim(),
        }),
      });
      if (!res.ok) throw new Error("Failed to add pin");
      const data = await res.json();
      onAdd(data.pin ?? data);
      setTitle("");
      setContent("");
      setUrl("");
      setCategory("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white/3 border border-white/8 rounded-xl p-4 space-y-3"
    >
      <h3 className="text-xs font-semibold text-white/50 uppercase tracking-widest">Add Pin</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <input
          type="text"
          placeholder="Title *"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-sky-500/50"
        />
        <div className="relative">
          <input
            type="text"
            placeholder="Category *"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            required
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-sky-500/50"
          />
          {showSuggestions && filteredCategories.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-neutral-900 border border-white/10 rounded-lg overflow-hidden z-10 shadow-xl">
              {filteredCategories.map((c) => (
                <button
                  key={c}
                  type="button"
                  onMouseDown={() => {
                    setCategory(c);
                    setShowSuggestions(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-white/70 hover:bg-white/8 hover:text-white transition-colors"
                >
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <input
        type="url"
        placeholder="URL (optional)"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-sky-500/50"
      />
      <textarea
        placeholder="Content (optional)"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={2}
        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-sky-500/50 resize-none"
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={submitting || !title.trim() || !category.trim()}
          className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:pointer-events-none"
        >
          {submitting ? "Adding…" : "Add Pin"}
        </button>
      </div>
    </form>
  );
}

// ─── Pinboard Tab ─────────────────────────────────────────────────────────────

interface PinboardTabProps {
  canPost: boolean;
  currentUserId: string | null;
}

function PinboardTab({ canPost, currentUserId }: PinboardTabProps) {
  const [pins, setPins] = useState<Pin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const fetchPins = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/pins");
      if (!res.ok) throw new Error("Failed to load pins");
      const data = await res.json();
      const items: Pin[] = data.pins ?? data ?? [];
      setPins(items.sort((a, b) => a.order - b.order));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPins();
  }, [fetchPins]);

  const categories = ["All", ...Array.from(new Set(pins.map((p) => p.category)))];
  const filteredPins =
    selectedCategory === "All" ? pins : pins.filter((p) => p.category === selectedCategory);

  function handleAdd(pin: Pin) {
    setPins((prev) => [pin, ...prev]);
  }

  function handleDelete(id: string) {
    setPins((prev) => prev.filter((p) => p._id !== id));
  }

  function handleUpdate(id: string, updates: Partial<Pin>) {
    setPins((prev) => prev.map((p) => (p._id === id ? { ...p, ...updates } : p)));
  }

  function handleDragStart(id: string) {
    setDraggedId(id);
  }

  function handleDragOver(e: React.DragEvent, id: string) {
    e.preventDefault();
    setDragOverId(id);
  }

  async function handleDrop(e: React.DragEvent, targetId: string) {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }

    const newPins = [...pins];
    const fromIndex = newPins.findIndex((p) => p._id === draggedId);
    const toIndex = newPins.findIndex((p) => p._id === targetId);

    if (fromIndex === -1 || toIndex === -1) return;

    const [moved] = newPins.splice(fromIndex, 1);
    newPins.splice(toIndex, 0, moved);

    const reordered = newPins.map((p, i) => ({ ...p, order: i }));
    setPins(reordered);
    setDraggedId(null);
    setDragOverId(null);

    // Persist reorder
    try {
      await fetch("/api/admin/pins/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: reordered.map((p) => p._id) }),
      });
    } catch {
      // ignore
    }
  }

  const existingCategories = Array.from(new Set(pins.map((p) => p.category)));

  return (
    <div className="space-y-5">
      {/* Add pin form */}
      <AddPinForm existingCategories={existingCategories} onAdd={handleAdd} />

      {/* Category filters */}
      {!loading && pins.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                selectedCategory === cat
                  ? "bg-sky-500/20 text-sky-400 border border-sky-500/30"
                  : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white border border-transparent"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : error ? (
        <div className="bg-white/3 border border-white/8 rounded-xl p-8 text-center space-y-3">
          <p className="text-red-400 text-sm">{error}</p>
          <button
            onClick={fetchPins}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-sm rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      ) : filteredPins.length === 0 ? (
        <div className="bg-white/3 border border-white/8 rounded-xl p-12 text-center">
          <div className="text-4xl mb-3">📌</div>
          <p className="text-white/40 text-sm">
            {selectedCategory === "All" ? "No pins yet" : `No pins in "${selectedCategory}"`}
          </p>
          <p className="text-white/25 text-xs mt-1">Add a pin using the form above</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPins.map((pin) => (
            <PinCard
              key={pin._id}
              pin={pin}
              canPost={canPost}
              currentUserId={currentUserId}
              onDelete={handleDelete}
              onUpdate={handleUpdate}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              isDragOver={dragOverId === pin._id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Archive Tab ──────────────────────────────────────────────────────────────

interface ArchiveTabProps {
  currentUserId: string | null;
}

function ArchiveTab({ currentUserId }: ArchiveTabProps) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const fetchArchive = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/announcements?archived=true");
      if (!res.ok) throw new Error("Failed to load archive");
      const data = await res.json();
      setAnnouncements(data.announcements ?? data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchArchive();
  }, [fetchArchive]);

  function handleUnarchive(id: string) {
    setAnnouncements((prev) => prev.filter((a) => a._id !== id));
  }

  function handleReact(id: string, reactions: Reaction[]) {
    setAnnouncements((prev) =>
      prev.map((a) => (a._id === id ? { ...a, reactions } : a))
    );
  }

  function handleUpdate(id: string, updates: Partial<Announcement>) {
    setAnnouncements((prev) =>
      prev.map((a) => (a._id === id ? { ...a, ...updates } : a))
    );
  }

  const filtered = search.trim()
    ? announcements.filter(
        (a) =>
          a.title.toLowerCase().includes(search.toLowerCase()) ||
          a.body.toLowerCase().includes(search.toLowerCase())
      )
    : announcements;

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <svg
          width="14" height="14"
          fill="none" stroke="currentColor" strokeWidth="1.5"
          viewBox="0 0 24 24"
          className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
        <input
          type="text"
          placeholder="Search archive…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-sky-500/50"
        />
      </div>

      {loading ? (
        <div className="space-y-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : error ? (
        <div className="bg-white/3 border border-white/8 rounded-xl p-8 text-center space-y-3">
          <p className="text-red-400 text-sm">{error}</p>
          <button
            onClick={fetchArchive}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-sm rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white/3 border border-white/8 rounded-xl p-12 text-center">
          <div className="text-4xl mb-3">🗃️</div>
          <p className="text-white/40 text-sm">
            {search.trim() ? "No results found" : "Archive is empty"}
          </p>
        </div>
      ) : (
        filtered.map((a) => (
          <AnnouncementCard
            key={a._id}
            announcement={a}
            canPost={true}
            currentUserId={currentUserId}
            onArchive={() => {}}
            onUnarchive={handleUnarchive}
            onReact={handleReact}
            onUpdate={handleUpdate}
            showArchived
          />
        ))
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AnnouncementsClient({ canPost, currentUserId }: Props) {
  const [tab, setTab] = useState<Tab>("feed");

  const tabs: Array<{ id: Tab; label: string; adminOnly?: boolean }> = [
    { id: "feed", label: "Feed" },
    { id: "pinboard", label: "Pinboard" },
    { id: "archive", label: "Archive", adminOnly: true },
  ];

  const visibleTabs = tabs.filter((t) => !t.adminOnly || canPost);

  return (
    <div className="space-y-6">
      {/* Tab bar */}
      <div className="flex items-center gap-1 border-b border-white/8">
        {visibleTabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px ${
              tab === t.id
                ? "border-sky-500 text-white"
                : "border-transparent text-white/40 hover:text-white/70"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "feed" && (
        <FeedTab canPost={canPost} currentUserId={currentUserId} />
      )}
      {tab === "pinboard" && (
        <PinboardTab canPost={canPost} currentUserId={currentUserId} />
      )}
      {tab === "archive" && canPost && (
        <ArchiveTab currentUserId={currentUserId} />
      )}
      {tab === "archive" && !canPost && (
        <div className="bg-white/3 border border-white/8 rounded-xl p-12 text-center">
          <div className="text-4xl mb-3">🔒</div>
          <p className="text-white/40 text-sm">Access restricted</p>
        </div>
      )}
    </div>
  );
}
