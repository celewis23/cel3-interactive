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

type MessageAttachment = {
  _key: string;
  driveFileId: string;
  fileName: string;
  fileUrl: string | null;
  webViewLink: string | null;
  webContentLink: string | null;
  thumbnailLink: string | null;
  contentType: string;
  size: number | null;
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
  attachments?: MessageAttachment[];
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

function formatFileSize(value?: number | null) {
  if (!value) return "";
  if (value < 1024 * 1024) return `${Math.ceil(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function conversationLabel(conversation: Conversation) {
  return conversation.title || conversation.company || conversation.clientName || conversation.clientEmail || "Conversation";
}

function fileLabel(file: File) {
  return `${file.name}${file.size ? ` (${formatFileSize(file.size)})` : ""}`;
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
  const [attachments, setAttachments] = useState<File[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [portalUsers, setPortalUsers] = useState<PortalUser[]>([]);
  const [selectedPortalUserId, setSelectedPortalUserId] = useState("");
  const [portalUserSearch, setPortalUserSearch] = useState("");
  const [loadingPortalUsers, setLoadingPortalUsers] = useState(false);
  const [starting, setStarting] = useState(false);
  const [search, setSearch] = useState("");
  const [showNewConversation, setShowNewConversation] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selected = useMemo(
    () => conversations.find((item) => item._id === selectedId) ?? null,
    [conversations, selectedId]
  );

  const filteredPortalUsers = useMemo(() => {
    const query = portalUserSearch.trim().toLowerCase();
    if (!query) return portalUsers;
    return portalUsers.filter((user) =>
      [user.name, user.email, user.company].filter(Boolean).some((value) => String(value).toLowerCase().includes(query))
    );
  }, [portalUserSearch, portalUsers]);

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
  }, [search]);

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

  function onFilesSelected(files: FileList | null) {
    if (!files) return;
    setAttachments((current) => [...current, ...Array.from(files)].slice(0, 8));
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function sendMessage() {
    const body = compose.trim();
    if (!selectedId || (!body && attachments.length === 0)) return;
    const selectedFiles = attachments;
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
      attachments: selectedFiles.map((file, index) => ({
        _key: `pending-file-${index}`,
        driveFileId: "",
        fileName: file.name,
        fileUrl: null,
        webViewLink: null,
        webContentLink: null,
        thumbnailLink: null,
        contentType: file.type || "application/octet-stream",
        size: file.size,
      })),
      pending: true,
    };
    setMessages((prev) => [...prev, optimistic]);
    setCompose("");
    setAttachments([]);
    try {
      const hasFiles = selectedFiles.length > 0;
      const init: RequestInit = { method: "POST" };
      if (hasFiles) {
        const formData = new FormData();
        formData.set("body", body);
        selectedFiles.forEach((file) => formData.append("files", file));
        init.body = formData;
      } else {
        init.headers = { "Content-Type": "application/json" };
        init.body = JSON.stringify({ body });
      }

      const res = await fetch(`/api/messages/conversations/${selectedId}/messages`, init);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send message");
      setMessages((prev) => prev.map((item) => item._id === optimistic._id ? data.message : item));
      void loadConversations(true);
    } catch (err) {
      setMessages((prev) => prev.filter((item) => item._id !== optimistic._id));
      setCompose(body);
      setAttachments(selectedFiles);
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
      setShowNewConversation(false);
      if (mode === "admin") {
        setSelectedPortalUserId(portalUsers[0]?._id || "");
        setPortalUserSearch("");
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

      <div className="messenger-shell min-h-[620px] overflow-hidden rounded-2xl border border-white/8 bg-white/3">
        <aside className={`messenger-list ${selectedId ? "hidden" : "block"} border-white/8 md:block`}>
          <div className="border-b border-white/8 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-white">Chats</h2>
              <button
                type="button"
                onClick={() => setShowNewConversation(true)}
                className="rounded-xl bg-sky-500 px-3 py-2 text-xs font-semibold text-black shadow-lg shadow-sky-950/30 transition hover:bg-sky-400"
              >
                + New conversation
              </button>
            </div>
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
                          {message.body && <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-white/75">{message.body}</p>}
                          {message.attachments && message.attachments.length > 0 && (
                            <div className="mt-3 grid gap-2">
                              {message.attachments.map((attachment) => {
                                const href = attachment.webViewLink || attachment.fileUrl || attachment.webContentLink || "#";
                                return (
                                  <a
                                    key={attachment._key}
                                    href={href}
                                    target={href === "#" ? undefined : "_blank"}
                                    rel="noreferrer"
                                    className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-2 text-left transition hover:border-sky-500/40"
                                  >
                                    {attachment.thumbnailLink ? (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img src={attachment.thumbnailLink} alt="" className="h-11 w-11 rounded-lg object-cover" />
                                    ) : (
                                      <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-white/8 text-xs text-white/55">FILE</span>
                                    )}
                                    <span className="min-w-0 flex-1">
                                      <span className="block truncate text-xs font-semibold text-white/80">{attachment.fileName}</span>
                                      <span className="block text-[11px] text-white/35">{formatFileSize(attachment.size)}</span>
                                    </span>
                                  </a>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={endRef} />
              </div>

              <div className="border-t border-white/8 p-4">
                {attachments.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-2">
                    {attachments.map((file, index) => (
                      <span key={`${file.name}-${index}`} className="inline-flex max-w-full items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/65">
                        <span className="truncate">{fileLabel(file)}</span>
                        <button
                          type="button"
                          onClick={() => setAttachments((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                          className="text-white/35 transition hover:text-white"
                          aria-label={`Remove ${file.name}`}
                        >
                          x
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex items-end gap-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(event) => onFilesSelected(event.target.files)}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/55 transition hover:border-sky-500/40 hover:text-white"
                    aria-label="Attach files"
                  >
                    <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m21.44 11.05-8.49 8.49a6 6 0 0 1-8.49-8.49l8.49-8.49a4 4 0 1 1 5.66 5.66l-8.49 8.49a2 2 0 1 1-2.83-2.83l7.78-7.78" />
                    </svg>
                  </button>
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
                    disabled={sending || (!compose.trim() && attachments.length === 0)}
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

      {showNewConversation && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/65 px-4 pt-24 backdrop-blur-sm md:justify-start md:pl-[max(1rem,calc((100vw-1120px)/2+1rem))]">
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="Close new conversation"
            onClick={() => setShowNewConversation(false)}
          />
          <form
            onSubmit={startConversation}
            className="relative w-full max-w-md origin-top-left animate-[chatModalIn_180ms_ease-out] rounded-2xl border border-white/10 bg-[#07090c] p-5 shadow-2xl shadow-black/50"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-white">{mode === "admin" ? "New client chat" : "New conversation"}</h2>
                <p className="mt-1 text-xs text-white/40">
                  {mode === "admin" ? "Choose a portal user, add a subject, and send the first message." : "Start a thread with the CEL3 team."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowNewConversation(false)}
                className="rounded-full p-1 text-white/40 transition hover:bg-white/5 hover:text-white"
                aria-label="Close"
              >
                x
              </button>
            </div>

            <div className="grid gap-3">
              {mode === "admin" && (
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <input
                    value={portalUserSearch}
                    onChange={(event) => setPortalUserSearch(event.target.value)}
                    placeholder="Search people"
                    className="mb-3 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none placeholder:text-white/25 focus:border-sky-500/50"
                  />
                  <div className="max-h-48 overflow-y-auto pr-1">
                    {loadingPortalUsers ? (
                      <div className="p-3 text-sm text-white/35">Loading portal users...</div>
                    ) : filteredPortalUsers.length === 0 ? (
                      <div className="p-3 text-sm text-white/35">No portal users found.</div>
                    ) : (
                      filteredPortalUsers.map((user) => {
                        const active = user._id === selectedPortalUserId;
                        return (
                          <button
                            key={user._id}
                            type="button"
                            onClick={() => setSelectedPortalUserId(user._id)}
                            className={`mb-2 flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${active ? "border-sky-500/45 bg-sky-500/10" : "border-white/8 bg-black/15 hover:border-white/20"}`}
                          >
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/8 text-xs font-semibold text-white/70">
                              {(user.name || user.email).slice(0, 1).toUpperCase()}
                            </span>
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-medium text-white">{user.name || user.email}</span>
                              <span className="block truncate text-xs text-white/35">{[user.company, user.email].filter(Boolean).join(" - ")}</span>
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
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
                rows={4}
                maxLength={5000}
                placeholder={mode === "admin" ? "Write the first message..." : "Write your message..."}
                className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-white/25 focus:border-sky-500/50"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewConversation(false)}
                  className="rounded-xl border border-white/10 px-4 py-2 text-sm text-white/55 transition hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={starting || !newBody.trim() || (mode === "admin" && (!selectedPortalUserId || loadingPortalUsers))}
                  className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-sky-400 disabled:opacity-40"
                >
                  {starting ? "Starting..." : "Chat"}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
