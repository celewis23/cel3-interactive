"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Mode = "admin" | "portal";

type Conversation = {
  _id: string;
  title: string | null;
  status: string;
  type: string;
  clientName: string | null;
  clientEmail: string | null;
  company: string | null;
  lastMessageAt: string;
  lastMessagePreview: string | null;
  lastSenderName: string | null;
  unreadCount: number;
  participantCount: number;
};

type Message = {
  _id: string;
  conversationId: string;
  senderActorId: string;
  senderKind: "admin" | "client" | "system";
  senderName: string;
  senderEmail: string | null;
  body: string;
  createdAt: string;
  deletedAt: string | null;
  pending?: boolean;
};

type PortalUser = {
  _id: string;
  email: string;
  name: string | null;
  company: string | null;
  status: string;
};

const POLL_MS = 15_000;

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function conversationLabel(conversation: Conversation) {
  return conversation.title || conversation.company || conversation.clientName || conversation.clientEmail || "Conversation";
}

export default function MessengerClient({
  mode,
  initialConversationId,
}: {
  mode: Mode;
  initialConversationId?: string | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryConversationId = mode === "portal" ? searchParams.get("conversation") : null;
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState(initialConversationId || queryConversationId || "");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [compose, setCompose] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [portalUsers, setPortalUsers] = useState<PortalUser[]>([]);
  const [selectedPortalUserId, setSelectedPortalUserId] = useState("");
  const [loadingPortalUsers, setLoadingPortalUsers] = useState(false);
  const [starting, setStarting] = useState(false);
  const [search, setSearch] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const selected = useMemo(
    () => conversations.find((item) => item._id === selectedId) ?? null,
    [conversations, selectedId]
  );

  const loadConversations = useCallback(async (silent = false) => {
    if (!silent) setLoadingList(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("q", search.trim());
      const res = await fetch(`/api/messages/conversations${params.toString() ? `?${params}` : ""}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load conversations");
      const items: Conversation[] = data.conversations ?? [];
      setConversations(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load conversations");
    } finally {
      if (!silent) setLoadingList(false);
    }
  }, [search, selectedId]);

  const loadThread = useCallback(async (conversationId: string, silent = false) => {
    if (!conversationId) return;
    if (!silent) setLoadingThread(true);
    try {
      const res = await fetch(`/api/messages/conversations/${conversationId}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load conversation");
      setMessages(data.messages ?? []);
      setConversations((prev) => prev.map((item) => item._id === conversationId ? data.conversation : item));
      await fetch(`/api/messages/conversations/${conversationId}/read`, { method: "POST" }).catch(() => {});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load conversation");
    } finally {
      if (!silent) setLoadingThread(false);
    }
  }, []);

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (mode !== "admin") return;
    let cancelled = false;
    async function loadPortalUsers() {
      setLoadingPortalUsers(true);
      try {
        const res = await fetch("/api/messages/portal-users", { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load portal users");
        if (!cancelled) {
          const users: PortalUser[] = data.users ?? [];
          setPortalUsers(users);
          setSelectedPortalUserId((current) => current || users[0]?._id || "");
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load portal users");
      } finally {
        if (!cancelled) setLoadingPortalUsers(false);
      }
    }
    void loadPortalUsers();
    return () => {
      cancelled = true;
    };
  }, [mode]);

  useEffect(() => {
    const next = initialConversationId || queryConversationId || "";
    if (next && next !== selectedId) setSelectedId(next);
  }, [initialConversationId, queryConversationId, selectedId]);

  useEffect(() => {
    if (!selectedId) return;
    void loadThread(selectedId);
  }, [loadThread, selectedId]);

  useEffect(() => {
    const id = window.setInterval(() => {
      void loadConversations(true);
      if (selectedId) void loadThread(selectedId, true);
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [loadConversations, loadThread, selectedId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, selectedId]);

  function selectConversation(id: string) {
    setSelectedId(id);
    if (mode === "admin") router.push(`/admin/messages/${id}`);
    else router.push(`/portal/messages?conversation=${id}`);
  }

  function returnToConversationList() {
    setSelectedId("");
    setMessages([]);
    if (mode === "admin") router.push("/admin/messages");
    else router.push("/portal/messages");
  }

  async function sendMessage() {
    const body = compose.trim();
    if (!selectedId || !body) return;
    setSending(true);
    setError("");
    const optimistic: Message = {
      _id: `pending-${Date.now()}`,
      conversationId: selectedId,
      senderActorId: "pending",
      senderKind: mode === "admin" ? "admin" : "client",
      senderName: "You",
      senderEmail: null,
      body,
      createdAt: new Date().toISOString(),
      deletedAt: null,
      pending: true,
    };
    setMessages((prev) => [...prev, optimistic]);
    setCompose("");
    try {
      const res = await fetch(`/api/messages/conversations/${selectedId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send message");
      setMessages((prev) => prev.map((item) => item._id === optimistic._id ? data.message : item));
      void loadConversations(true);
    } catch (err) {
      setMessages((prev) => prev.filter((item) => item._id !== optimistic._id));
      setCompose(body);
      setError(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setSending(false);
    }
  }

  async function startConversation(e: React.FormEvent) {
    e.preventDefault();
    const body = newBody.trim();
    if (!body) return;
    if (mode === "admin" && !selectedPortalUserId) {
      setError("Choose a portal user before starting a conversation");
      return;
    }
    setStarting(true);
    setError("");
    try {
      const res = await fetch("/api/messages/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle.trim(),
          body,
          portalUserId: mode === "admin" ? selectedPortalUserId : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start conversation");
      setNewTitle("");
      setNewBody("");
      if (mode === "admin") {
        setSelectedPortalUserId(portalUsers[0]?._id || "");
      }
      await loadConversations(true);
      selectConversation(data.conversation._id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start conversation");
    } finally {
      setStarting(false);
    }
  }

  const threadTitle = selected ? conversationLabel(selected) : mode === "admin" ? "Select a conversation" : "Messages";

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">{mode === "admin" ? "Client Messages" : "Messages"}</h1>
          <p className="mt-1 text-sm text-white/40">
            {mode === "admin" ? "Review client conversations and reply from the admin console." : "Send a note directly to the CEL3 team and keep the conversation history here."}
          </p>
        </div>
        {mode === "portal" && (
          <Link href="/portal/requests" className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white/60 transition-colors hover:border-white/20 hover:text-white">
            Work requests
          </Link>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>
      )}

      {(mode === "portal" || mode === "admin") && (
        <form onSubmit={startConversation} className={`${selectedId ? "hidden" : "block"} rounded-2xl border border-white/8 bg-white/3 p-5 md:block`}>
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-white">
              {mode === "admin" ? "Start a client conversation" : "Start a conversation"}
            </h2>
            <p className="mt-1 text-xs text-white/35">
              {mode === "admin"
                ? "Choose a portal user and send the first message into their client portal."
                : "Use this for questions, approvals, billing, project updates, or general support."}
            </p>
          </div>
          <div className="grid gap-3">
            {mode === "admin" && (
              <select
                value={selectedPortalUserId}
                onChange={(event) => setSelectedPortalUserId(event.target.value)}
                disabled={loadingPortalUsers || portalUsers.length === 0}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none transition-colors focus:border-sky-500/50 disabled:opacity-40 [color-scheme:dark]"
              >
                {loadingPortalUsers ? (
                  <option value="">Loading portal users...</option>
                ) : portalUsers.length === 0 ? (
                  <option value="">No portal users available</option>
                ) : (
                  portalUsers.map((user) => (
                    <option key={user._id} value={user._id}>
                      {[user.name || user.email, user.company].filter(Boolean).join(" - ")}
                    </option>
                  ))
                )}
              </select>
            )}
            <input
              value={newTitle}
              onChange={(event) => setNewTitle(event.target.value)}
              maxLength={120}
              placeholder="Subject (optional)"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-white/25 focus:border-sky-500/50"
            />
            <textarea
              value={newBody}
              onChange={(event) => setNewBody(event.target.value)}
              rows={3}
              maxLength={5000}
              placeholder={mode === "admin" ? "Write your first message to this client..." : "Write your message to the CEL3 team..."}
              className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-white/25 focus:border-sky-500/50"
            />
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={starting || !newBody.trim() || (mode === "admin" && (!selectedPortalUserId || loadingPortalUsers))}
                className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-sky-400 disabled:opacity-40"
              >
                {starting ? "Sending..." : "Send message"}
              </button>
            </div>
          </div>
        </form>
      )}

      <div className="messenger-shell min-h-[620px] overflow-hidden rounded-2xl border border-white/8 bg-white/3">
        <aside className={`messenger-list ${selectedId ? "hidden" : "block"} border-white/8 md:block`}>
          <div className="border-b border-white/8 p-4">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search conversations"
              className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none placeholder:text-white/25 focus:border-sky-500/50"
            />
          </div>
          <div className="max-h-[560px] overflow-y-auto">
            {loadingList ? (
              <div className="space-y-2 p-4">
                {[0, 1, 2].map((item) => <div key={item} className="h-16 animate-pulse rounded-xl bg-white/5" />)}
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-6 text-center text-sm text-white/35">
                {mode === "admin" ? "No client conversations yet." : "No conversations yet."}
              </div>
            ) : (
              conversations.map((conversation) => {
                const active = conversation._id === selectedId;
                return (
                  <button
                    key={conversation._id}
                    type="button"
                    onClick={() => selectConversation(conversation._id)}
                    className={`w-full border-b border-white/5 px-4 py-3 text-left transition-colors ${active ? "bg-sky-500/10" : "hover:bg-white/5"}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-white">{conversationLabel(conversation)}</span>
                      {conversation.unreadCount > 0 && (
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-sky-500 px-1.5 text-[11px] font-bold text-black">
                          {conversation.unreadCount > 99 ? "99+" : conversation.unreadCount}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-white/30">
                      <span className="truncate">{conversation.clientEmail || conversation.company || conversation.type}</span>
                      <span className="shrink-0">{formatTime(conversation.lastMessageAt)}</span>
                    </div>
                    {conversation.lastMessagePreview && (
                      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-white/45">{conversation.lastMessagePreview}</p>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <section className={`messenger-thread ${selectedId ? "flex" : "hidden"} min-h-[620px] flex-col md:flex`}>
          <div className="flex items-center justify-between gap-3 border-b border-white/8 px-5 py-4">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={returnToConversationList}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/60 transition-colors hover:text-white md:hidden"
                aria-label="Back to conversations"
              >
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                </svg>
              </button>
              <div className="min-w-0">
                <h2 className="truncate text-sm font-semibold text-white">{threadTitle}</h2>
                {selected && (
                  <p className="mt-0.5 truncate text-xs text-white/35">
                    {[selected.clientEmail, selected.company, selected.status].filter(Boolean).join(" - ")}
                  </p>
                )}
              </div>
            </div>
            {selected?.unreadCount ? (
              <span className="rounded-full bg-sky-500/15 px-2 py-1 text-xs text-sky-300">{selected.unreadCount} unread</span>
            ) : null}
          </div>

          {!selectedId ? (
            <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-white/35">
              {mode === "admin" ? "Choose a client conversation from the list." : "Start a conversation or choose an existing one."}
            </div>
          ) : loadingThread ? (
            <div className="flex-1 space-y-3 p-5">
              {[0, 1, 2, 3].map((item) => <div key={item} className="h-14 animate-pulse rounded-xl bg-white/5" />)}
            </div>
          ) : (
            <>
              <div className="flex-1 space-y-3 overflow-y-auto p-5">
                {messages.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-white/35">No messages in this conversation yet.</div>
                ) : (
                  messages.map((message) => {
                    const mine = mode === "admin" ? message.senderKind === "admin" : message.senderKind === "client";
                    return (
                      <div key={message._id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[min(680px,85%)] rounded-2xl border px-4 py-3 ${mine ? "border-sky-500/20 bg-sky-500/15" : "border-white/8 bg-black/20"}`}>
                          <div className="mb-1 flex flex-wrap items-center gap-2">
                            <span className="text-xs font-semibold text-white/75">{mine ? "You" : message.senderName}</span>
                            <span className="text-[11px] text-white/30">{formatTime(message.createdAt)}</span>
                            {message.pending && <span className="text-[11px] text-sky-300">Sending</span>}
                          </div>
                          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-white/75">{message.body}</p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={endRef} />
              </div>

              <div className="border-t border-white/8 p-4">
                <div className="flex items-end gap-3">
                  <textarea
                    value={compose}
                    onChange={(event) => setCompose(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        void sendMessage();
                      }
                    }}
                    rows={1}
                    maxLength={5000}
                    placeholder="Write a reply..."
                    className="min-h-11 flex-1 resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/25 focus:border-sky-500/50"
                  />
                  <button
                    type="button"
                    onClick={() => void sendMessage()}
                    disabled={sending || !compose.trim()}
                    className="rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-sky-400 disabled:opacity-40"
                  >
                    {sending ? "Sending..." : "Send"}
                  </button>
                </div>
                <p className="mt-2 text-xs text-white/25">Enter to send. Shift+Enter for a new line.</p>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
