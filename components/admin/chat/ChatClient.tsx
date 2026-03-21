"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { DateTime } from "luxon";

type ChatSpace = {
  name: string;
  displayName?: string;
  spaceType: string;
  singleUserBotDm?: boolean;
  spaceUri?: string;
};

type ChatMessage = {
  name: string;
  text?: string;
  formattedText?: string;
  sender: { name: string; displayName?: string; type?: string };
  createTime: string;
  thread?: { name: string };
};

type ChatMember = {
  name: string;
  displayName?: string;
  email?: string;
  role: string;
};

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    google: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    gapi: any;
  }
}

function formatMessageTime(createTime: string): string {
  if (!createTime) return "";
  const dt = DateTime.fromISO(createTime);
  const now = DateTime.now();
  const diff = now.diff(dt, "hours").hours;
  if (diff < 24) return dt.toRelative() ?? dt.toFormat("h:mm a");
  return dt.toFormat("MMM d, h:mm a");
}

function spaceTypeBadge(spaceType: string): string {
  if (spaceType === "DIRECT_MESSAGE") return "DM";
  if (spaceType === "GROUP_CHAT") return "Group";
  return "Space";
}

function SpaceIcon({ spaceType }: { spaceType: string }) {
  if (spaceType === "DIRECT_MESSAGE") {
    return (
      <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
      </svg>
    );
  }
  return (
    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 01.778-.332 48.294 48.294 0 005.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
    </svg>
  );
}

// ─── Create Space Modal ───────────────────────────────────────────────────────

function CreateSpaceModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (space: ChatSpace) => void;
}) {
  const [displayName, setDisplayName] = useState("");
  const [spaceType, setSpaceType] = useState<"SPACE" | "GROUP_CHAT">("SPACE");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!displayName.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/chat/spaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName, spaceType, description: description || undefined }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error ?? "Failed to create space");
      }
      const space = await res.json() as ChatSpace;
      onCreated(space);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-[#111] border border-white/10 rounded-2xl p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white">Create Space</h3>
          <button onClick={onClose} className="text-white/40 hover:text-white">
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleCreate} className="space-y-3">
          <div>
            <label className="text-xs text-white/40 block mb-1">Name *</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/30 outline-none focus:border-sky-500/50"
            />
          </div>
          <div>
            <label className="text-xs text-white/40 block mb-1">Type</label>
            <select
              value={spaceType}
              onChange={(e) => setSpaceType(e.target.value as "SPACE" | "GROUP_CHAT")}
              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-sky-500/50"
            >
              <option value="SPACE">Space</option>
              <option value="GROUP_CHAT">Group Chat</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-white/40 block mb-1">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/30 outline-none focus:border-sky-500/50"
            />
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-white/50 bg-white/5 hover:bg-white/8 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading || !displayName.trim()} className="px-4 py-2 rounded-xl text-sm text-white bg-sky-500 hover:bg-sky-400 disabled:opacity-50 transition-colors">
              {loading ? "Creating…" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── New DM Modal ─────────────────────────────────────────────────────────────

function NewDMModal({
  onClose,
  onOpened,
}: {
  onClose: () => void;
  onOpened: (space: ChatSpace) => void;
}) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/chat/dm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error ?? "Failed to open DM");
      }
      const space = await res.json() as ChatSpace;
      onOpened(space);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-[#111] border border-white/10 rounded-2xl p-6 w-full max-w-sm mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white">New Direct Message</h3>
          <button onClick={onClose} className="text-white/40 hover:text-white">
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs text-white/40 block mb-1">Email address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              autoFocus
              required
              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/30 outline-none focus:border-sky-500/50"
            />
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-white/50 bg-white/5 hover:bg-white/8 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading || !email.trim()} className="px-4 py-2 rounded-xl text-sm text-white bg-sky-500 hover:bg-sky-400 disabled:opacity-50 transition-colors">
              {loading ? "Opening…" : "Open DM"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Members Panel ────────────────────────────────────────────────────────────

function MembersPanel({
  space,
  onClose,
}: {
  space: ChatSpace;
  onClose: () => void;
}) {
  const [members, setMembers] = useState<ChatMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [addEmail, setAddEmail] = useState("");
  const [adding, setAdding] = useState(false);
  const [removingName, setRemovingName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/chat/members?spaceName=${encodeURIComponent(space.name)}`);
        if (!res.ok) throw new Error("Failed to load members");
        const data = await res.json() as ChatMember[];
        setMembers(Array.isArray(data) ? data : []);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [space.name]);

  async function handleAdd() {
    if (!addEmail.trim()) return;
    setAdding(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/chat/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spaceName: space.name, email: addEmail }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error ?? "Failed to add member");
      }
      setAddEmail("");
      // Reload
      const listRes = await fetch(`/api/admin/chat/members?spaceName=${encodeURIComponent(space.name)}`);
      if (listRes.ok) setMembers(await listRes.json() as ChatMember[]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(memberName: string) {
    setRemovingName(memberName);
    setError(null);
    try {
      const res = await fetch(`/api/admin/chat/members/${encodeURIComponent(memberName)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error ?? "Failed to remove member");
      }
      setMembers((prev) => prev.filter((m) => m.name !== memberName));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRemovingName(null);
    }
  }

  return (
    <div className="w-72 flex-shrink-0 border-l border-white/8 flex flex-col bg-[#0a0a0a]">
      <div className="px-4 py-4 border-b border-white/8 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-white/40">Members</h3>
        <button onClick={onClose} className="text-white/30 hover:text-white">
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto py-2">
        {loading ? (
          <div className="px-4 space-y-2 pt-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-8 rounded-lg bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : members.length === 0 ? (
          <div className="px-4 py-4 text-xs text-white/30 text-center">No members</div>
        ) : (
          members.map((member) => (
            <div key={member.name} className="flex items-center gap-2 px-4 py-2">
              <div className="w-6 h-6 rounded-full bg-sky-500/20 flex items-center justify-center text-sky-400 text-xs font-semibold flex-shrink-0">
                {(member.displayName ?? member.email ?? "?").charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-white/70 truncate">{member.displayName ?? member.email ?? member.name}</p>
                <p className="text-xs text-white/30">{member.role === "ROLE_MANAGER" ? "Manager" : "Member"}</p>
              </div>
              <button
                onClick={() => handleRemove(member.name)}
                disabled={removingName === member.name}
                className="text-white/20 hover:text-red-400 transition-colors disabled:opacity-50"
                title="Remove"
              >
                <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))
        )}
      </div>
      <div className="px-4 py-3 border-t border-white/8">
        {error && <p className="text-xs text-red-400 mb-2">{error}</p>}
        <div className="flex gap-2">
          <input
            type="email"
            value={addEmail}
            onChange={(e) => setAddEmail(e.target.value)}
            placeholder="email@example.com"
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            className="flex-1 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-xs placeholder-white/30 outline-none focus:border-sky-500/50"
          />
          <button
            onClick={handleAdd}
            disabled={adding || !addEmail.trim()}
            className="px-2.5 py-1.5 rounded-lg text-xs text-white bg-sky-500 hover:bg-sky-400 disabled:opacity-50 transition-colors"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ChatClient() {
  const [spaces, setSpaces] = useState<ChatSpace[]>([]);
  const [spacesLoading, setSpacesLoading] = useState(true);
  const [selectedSpace, setSelectedSpace] = useState<ChatSpace | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [nextPageToken, setNextPageToken] = useState<string | undefined>(undefined);
  const [loadingMore, setLoadingMore] = useState(false);

  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New features state
  const [showCreateSpace, setShowCreateSpace] = useState(false);
  const [showNewDM, setShowNewDM] = useState(false);
  const [showMembersFor, setShowMembersFor] = useState<ChatSpace | null>(null);
  const [spaceMenuOpen, setSpaceMenuOpen] = useState<string | null>(null);
  const [editingMessage, setEditingMessage] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [deletingMessage, setDeletingMessage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const autoRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const spaceMenuRef = useRef<HTMLDivElement>(null);

  // Close space menu on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (spaceMenuRef.current && !spaceMenuRef.current.contains(e.target as Node)) {
        setSpaceMenuOpen(null);
      }
    }
    if (spaceMenuOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [spaceMenuOpen]);

  // Load spaces
  useEffect(() => {
    async function fetchSpaces() {
      setSpacesLoading(true);
      try {
        const res = await fetch("/api/admin/chat/spaces");
        if (!res.ok) {
          const body = await res.json().catch(() => ({})) as { error?: string };
          throw new Error(body.error ?? "Failed to load spaces");
        }
        const data = await res.json();
        setSpaces(Array.isArray(data) ? data : []);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setSpacesLoading(false);
      }
    }
    fetchSpaces();
  }, []);

  const fetchMessages = useCallback(async (space: ChatSpace, prepend = false, token?: string) => {
    if (!prepend) setMessagesLoading(true);
    else setLoadingMore(true);
    try {
      const params = new URLSearchParams({ spaceName: space.name });
      if (token) params.set("pageToken", token);
      const res = await fetch(`/api/admin/chat/messages?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load messages");
      const data = await res.json();
      const fetched: ChatMessage[] = (data.messages ?? []).slice().reverse();
      if (prepend) {
        setMessages((prev) => [...fetched, ...prev]);
      } else {
        setMessages(fetched);
      }
      setNextPageToken(data.nextPageToken ?? undefined);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setMessagesLoading(false);
      setLoadingMore(false);
    }
  }, []);

  // When space changes, load messages and set up auto-refresh
  useEffect(() => {
    if (!selectedSpace) return;
    fetchMessages(selectedSpace);

    if (autoRefreshRef.current) clearInterval(autoRefreshRef.current);
    autoRefreshRef.current = setInterval(() => {
      fetchMessages(selectedSpace);
    }, 30_000);

    return () => {
      if (autoRefreshRef.current) clearInterval(autoRefreshRef.current);
    };
  }, [selectedSpace, fetchMessages]);

  // Scroll to bottom on new messages (but not on load-more)
  useEffect(() => {
    if (!loadingMore) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loadingMore]);

  async function handleSend() {
    if (!inputText.trim() || !selectedSpace) return;
    setSending(true);
    setError(null);
    const text = inputText;
    setInputText("");

    // Optimistic
    const optimistic: ChatMessage = {
      name: `optimistic-${Date.now()}`,
      text,
      sender: { name: "me", displayName: "You" },
      createTime: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);

    try {
      await fetch("/api/admin/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spaceName: selectedSpace.name, text }),
      });
      await fetchMessages(selectedSpace);
    } catch (e) {
      setError((e as Error).message);
      setMessages((prev) => prev.filter((m) => m.name !== optimistic.name));
      setInputText(text);
    } finally {
      setSending(false);
    }
  }

  async function handleLoadMore() {
    if (!selectedSpace || !nextPageToken) return;
    await fetchMessages(selectedSpace, true, nextPageToken);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  async function handleDeleteMessage(msg: ChatMessage) {
    setDeletingMessage(msg.name);
    try {
      const res = await fetch(`/api/admin/chat/messages/${encodeURIComponent(msg.name)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete message");
      setMessages((prev) => prev.filter((m) => m.name !== msg.name));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setDeletingMessage(null);
    }
  }

  async function handleSaveEdit(msg: ChatMessage) {
    if (!editText.trim()) return;
    try {
      const res = await fetch(`/api/admin/chat/messages/${encodeURIComponent(msg.name)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: editText }),
      });
      if (!res.ok) throw new Error("Failed to update message");
      const updated = await res.json() as ChatMessage;
      setMessages((prev) => prev.map((m) => m.name === msg.name ? updated : m));
      setEditingMessage(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function handleFilePicker() {
    if (!selectedSpace) return;
    try {
      const configRes = await fetch("/api/admin/email/drive-config");
      if (!configRes.ok) throw new Error("Failed to get picker config");
      const { accessToken, apiKey, clientId } = await configRes.json();
      if (!accessToken || !apiKey || !clientId) throw new Error("Picker config incomplete");

      await new Promise<void>((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "https://apis.google.com/js/api.js";
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("Failed to load Google API"));
        if (!document.querySelector('script[src="https://apis.google.com/js/api.js"]')) {
          document.head.appendChild(script);
        } else {
          resolve();
        }
      });

      await new Promise<void>((resolve) => {
        window.gapi.load("picker", { callback: resolve });
      });

      const picker = new window.google.picker.PickerBuilder()
        .setOAuthToken(accessToken)
        .setDeveloperKey(apiKey)
        .setAppId(clientId)
        .addView(window.google.picker.ViewId.DOCS)
        .setCallback((data: { action: string; docs?: { url: string; name: string }[] }) => {
          if (data.action === window.google.picker.Action.PICKED && data.docs?.[0]) {
            const file = data.docs[0];
            setInputText((prev) => prev + (prev ? " " : "") + file.url);
          }
        })
        .build();
      picker.setVisible(true);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div className="-m-6 lg:-m-8 flex h-[calc(100vh-0px)]" style={{ height: "calc(100vh - 56px)" }}>
      {/* Left panel: spaces list */}
      <aside className="w-64 flex-shrink-0 border-r border-white/8 flex flex-col bg-[#0a0a0a]">
        <div className="px-4 py-4 border-b border-white/8 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-white/40">Spaces</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowNewDM(true)}
              className="text-white/30 hover:text-sky-400 transition-colors"
              title="New direct message"
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
            </button>
            <button
              onClick={() => setShowCreateSpace(true)}
              className="text-white/30 hover:text-sky-400 transition-colors"
              title="Create space"
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          {!spacesLoading && error && spaces.length === 0 && (
            <div className="mx-3 mb-2 px-3 py-2.5 bg-red-500/10 border border-red-500/20 rounded-xl text-xs space-y-1.5">
              <div className="text-red-400">{error}</div>
              {error.toLowerCase().includes("chat app not found") || error.toLowerCase().includes("chat app") ? (
                <div className="text-white/50 leading-relaxed">
                  The Chat API requires a Chat App configured in GCP. Go to{" "}
                  <span className="text-white/70">Google Cloud Console → APIs &amp; Services → Google Chat API → Configuration</span>
                  , fill in App name, Avatar URL, and Description, then Save.
                </div>
              ) : (error.toLowerCase().includes("scope") || error.toLowerCase().includes("insufficient") || error.toLowerCase().includes("auth") || error.includes("403")) ? (
                <div className="text-white/50">
                  Google account needs reconnecting to grant Chat permissions.{" "}
                  <a href="/admin/email" className="text-sky-400 hover:text-sky-300 underline">
                    Reconnect →
                  </a>
                </div>
              ) : null}
            </div>
          )}
          {spacesLoading ? (
            <div className="px-4 space-y-2 pt-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-9 rounded-lg bg-white/5 animate-pulse" />
              ))}
            </div>
          ) : spaces.length === 0 && !error ? (
            <div className="px-4 py-6 text-xs text-white/30 text-center">No spaces found</div>
          ) : (
            spaces.map((space) => {
              const isActive = selectedSpace?.name === space.name;
              const label = space.displayName || spaceTypeBadge(space.spaceType);
              return (
                <div key={space.name} className="relative group/space">
                  <button
                    onClick={() => {
                      setSelectedSpace(space);
                      setMessages([]);
                      setNextPageToken(undefined);
                      setShowMembersFor(null);
                    }}
                    className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-left transition-colors text-sm ${
                      isActive
                        ? "bg-sky-500/10 text-sky-400"
                        : "text-white/50 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <span className="flex-shrink-0">
                      <SpaceIcon spaceType={space.spaceType} />
                    </span>
                    <span className="flex-1 min-w-0 truncate">{label}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${
                      isActive ? "bg-sky-500/20 text-sky-400" : "bg-white/5 text-white/30"
                    }`}>
                      {spaceTypeBadge(space.spaceType)}
                    </span>
                  </button>
                  {/* Three-dot menu */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSpaceMenuOpen(spaceMenuOpen === space.name ? null : space.name);
                    }}
                    className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded text-white/0 group-hover/space:text-white/30 hover:!text-white transition-colors"
                    title="Options"
                  >
                    <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24">
                      <circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" />
                    </svg>
                  </button>
                  {spaceMenuOpen === space.name && (
                    <div ref={spaceMenuRef} className="absolute right-0 top-full mt-1 z-30 bg-[#111] border border-white/10 rounded-xl shadow-2xl py-1 w-40">
                      <button
                        onClick={() => { setShowMembersFor(space); setSpaceMenuOpen(null); setSelectedSpace(space); }}
                        className="w-full text-left px-3 py-1.5 text-xs text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                      >
                        Members
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </aside>

      {/* Right panel: messages */}
      <div className="flex-1 flex min-w-0">
        <div className="flex-1 flex flex-col min-w-0">
          {!selectedSpace ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="text-white/20 mb-2">
                  <svg width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24" className="mx-auto">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 01.778-.332 48.294 48.294 0 005.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                  </svg>
                </div>
                <p className="text-white/30 text-sm">Select a space to view messages</p>
              </div>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/8 flex-shrink-0">
                <div className="flex items-center gap-2.5">
                  <span className="text-white/40">
                    <SpaceIcon spaceType={selectedSpace.spaceType} />
                  </span>
                  <h2 className="text-sm font-medium text-white">
                    {selectedSpace.displayName || spaceTypeBadge(selectedSpace.spaceType)}
                  </h2>
                  <span className="text-xs px-1.5 py-0.5 rounded bg-white/5 text-white/30">
                    {spaceTypeBadge(selectedSpace.spaceType)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowMembersFor(showMembersFor?.name === selectedSpace.name ? null : selectedSpace)}
                    className={`p-1.5 rounded-lg transition-colors text-sm flex items-center gap-1.5 ${showMembersFor?.name === selectedSpace.name ? "text-sky-400 bg-sky-500/10" : "text-white/30 hover:text-white hover:bg-white/8"}`}
                    title="Members"
                  >
                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => fetchMessages(selectedSpace)}
                    className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/8 transition-colors"
                    title="Refresh"
                  >
                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                    </svg>
                  </button>
                </div>
              </div>

              {error && (
                <div className="mx-5 mt-3 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs">
                  {error}
                </div>
              )}

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-1">
                {nextPageToken && (
                  <div className="text-center py-2">
                    <button
                      onClick={handleLoadMore}
                      disabled={loadingMore}
                      className="text-xs text-white/40 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/8 transition-colors disabled:opacity-50"
                    >
                      {loadingMore ? "Loading…" : "Load earlier messages"}
                    </button>
                  </div>
                )}

                {messagesLoading ? (
                  <div className="space-y-3 pt-4">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="flex gap-3">
                        <div className="w-7 h-7 rounded-full bg-white/5 animate-pulse flex-shrink-0" />
                        <div className="flex-1 space-y-1.5">
                          <div className="h-3 bg-white/5 rounded animate-pulse w-24" />
                          <div className="h-4 bg-white/5 rounded animate-pulse w-3/4" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center py-12">
                    <p className="text-white/30 text-sm text-center">No messages yet</p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div key={msg.name} className="flex gap-3 py-1.5 group hover:bg-white/3 rounded-xl px-2 -mx-2 transition-colors">
                      <div className="w-7 h-7 rounded-full bg-sky-500/20 flex items-center justify-center flex-shrink-0 text-sky-400 text-xs font-semibold">
                        {(msg.sender.displayName ?? msg.sender.name).charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-white">
                            {msg.sender.displayName ?? msg.sender.name}
                          </span>
                          <span className="text-xs text-white/40">{formatMessageTime(msg.createTime)}</span>
                          {/* Message actions */}
                          {!msg.name.startsWith("optimistic-") && (
                            <span className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 ml-1">
                              <button
                                onClick={() => {
                                  setEditingMessage(msg.name);
                                  setEditText(msg.text ?? "");
                                }}
                                className="text-white/30 hover:text-sky-400 transition-colors"
                                title="Edit"
                              >
                                <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleDeleteMessage(msg)}
                                disabled={deletingMessage === msg.name}
                                className="text-white/30 hover:text-red-400 transition-colors disabled:opacity-50"
                                title="Delete"
                              >
                                <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                </svg>
                              </button>
                            </span>
                          )}
                        </div>
                        {editingMessage === msg.name ? (
                          <div className="mt-1 flex flex-col gap-1.5">
                            <textarea
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              rows={2}
                              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm outline-none focus:border-sky-500/50 resize-none"
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleSaveEdit(msg)}
                                disabled={!editText.trim()}
                                className="px-3 py-1 rounded-lg text-xs text-white bg-sky-500 hover:bg-sky-400 disabled:opacity-50 transition-colors"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setEditingMessage(null)}
                                className="px-3 py-1 rounded-lg text-xs text-white/50 bg-white/5 hover:bg-white/8 transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-white/70 mt-0.5 leading-relaxed whitespace-pre-wrap break-words">
                            {msg.text ?? msg.formattedText ?? ""}
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="flex-shrink-0 px-5 py-4 border-t border-white/8">
                <div className="flex items-end gap-3">
                  {/* File share button */}
                  <button
                    onClick={handleFilePicker}
                    className="flex-shrink-0 p-2 rounded-xl text-white/30 hover:text-sky-400 hover:bg-white/8 transition-colors"
                    title="Share Drive file"
                  >
                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
                    </svg>
                  </button>
                  <textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={`Message ${selectedSpace.displayName || spaceTypeBadge(selectedSpace.spaceType)}…`}
                    rows={1}
                    className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/30 outline-none focus:border-sky-500/50 resize-none"
                    style={{ minHeight: "40px", maxHeight: "120px" }}
                    onInput={(e) => {
                      const el = e.currentTarget;
                      el.style.height = "auto";
                      el.style.height = Math.min(el.scrollHeight, 120) + "px";
                    }}
                  />
                  <button
                    onClick={handleSend}
                    disabled={sending || !inputText.trim()}
                    className="flex-shrink-0 px-4 py-2 rounded-xl text-sm text-white bg-sky-500 hover:bg-sky-400 disabled:opacity-50 transition-colors"
                  >
                    {sending ? (
                      <svg className="animate-spin" width="14" height="14" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : (
                      <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                      </svg>
                    )}
                  </button>
                </div>
                <p className="text-xs text-white/20 mt-1.5">Enter to send, Shift+Enter for new line</p>
              </div>
            </>
          )}
        </div>

        {/* Members panel */}
        {showMembersFor && selectedSpace && (
          <MembersPanel
            space={showMembersFor}
            onClose={() => setShowMembersFor(null)}
          />
        )}
      </div>

      {/* Create space modal */}
      {showCreateSpace && (
        <CreateSpaceModal
          onClose={() => setShowCreateSpace(false)}
          onCreated={(space) => {
            setSpaces((prev) => [space, ...prev]);
            setShowCreateSpace(false);
          }}
        />
      )}

      {/* New DM modal */}
      {showNewDM && (
        <NewDMModal
          onClose={() => setShowNewDM(false)}
          onOpened={(space) => {
            setShowNewDM(false);
            // Add to spaces list if not already there
            setSpaces((prev) => {
              if (prev.find((s) => s.name === space.name)) return prev;
              return [space, ...prev];
            });
            // Select and open immediately
            setSelectedSpace(space);
            setMessages([]);
            setNextPageToken(undefined);
          }}
        />
      )}
    </div>
  );
}
