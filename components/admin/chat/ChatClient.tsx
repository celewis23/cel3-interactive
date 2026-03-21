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

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const autoRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load spaces
  useEffect(() => {
    async function fetchSpaces() {
      setSpacesLoading(true);
      try {
        const res = await fetch("/api/admin/chat/spaces");
        if (!res.ok) throw new Error("Failed to load spaces");
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
      // API returns createTime desc; reverse for display (oldest first)
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
      // Refresh to get real message
      await fetchMessages(selectedSpace);
    } catch (e) {
      setError((e as Error).message);
      // Remove optimistic on failure
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

  return (
    <div className="-m-6 lg:-m-8 flex h-[calc(100vh-0px)]" style={{ height: "calc(100vh - 56px)" }}>
      {/* Left panel: spaces list */}
      <aside className="w-64 flex-shrink-0 border-r border-white/8 flex flex-col bg-[#0a0a0a]">
        <div className="px-4 py-4 border-b border-white/8">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-white/40">Spaces</h2>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          {spacesLoading ? (
            <div className="px-4 space-y-2 pt-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-9 rounded-lg bg-white/5 animate-pulse" />
              ))}
            </div>
          ) : spaces.length === 0 ? (
            <div className="px-4 py-6 text-xs text-white/30 text-center">No spaces found</div>
          ) : (
            spaces.map((space) => {
              const isActive = selectedSpace?.name === space.name;
              const label = space.displayName || spaceTypeBadge(space.spaceType);
              return (
                <button
                  key={space.name}
                  onClick={() => {
                    setSelectedSpace(space);
                    setMessages([]);
                    setNextPageToken(undefined);
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
              );
            })
          )}
        </div>
      </aside>

      {/* Right panel: messages */}
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

            {error && (
              <div className="mx-5 mt-3 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs">
                {error}
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-1">
              {/* Load more */}
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
                      </div>
                      <p className="text-sm text-white/70 mt-0.5 leading-relaxed whitespace-pre-wrap break-words">
                        {msg.text ?? msg.formattedText ?? ""}
                      </p>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="flex-shrink-0 px-5 py-4 border-t border-white/8">
              <div className="flex items-end gap-3">
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
    </div>
  );
}
