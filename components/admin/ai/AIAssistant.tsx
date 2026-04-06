"use client";

import { useState, useRef, useEffect, useCallback, KeyboardEvent } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

type AdminTheme = "dark" | "light";

interface Message {
  role: "user" | "assistant";
  content: string;
}

// ── Markdown renderer (lightweight) ──────────────────────────────────────────

function renderMarkdown(text: string, theme: AdminTheme): string {
  const codeBlockClass =
    theme === "light"
      ? "bg-black/[0.04] border border-black/8 rounded-lg p-3 text-xs overflow-x-auto my-2 text-emerald-700"
      : "bg-black/40 rounded-lg p-3 text-xs overflow-x-auto my-2 text-emerald-300";
  const inlineCodeClass =
    theme === "light"
      ? "bg-black/[0.05] px-1.5 py-0.5 rounded text-xs text-emerald-700"
      : "bg-black/40 px-1.5 py-0.5 rounded text-xs text-emerald-300";
  const headingClass = theme === "light" ? "text-[#111111]" : "text-white";
  const ruleClass = theme === "light" ? "border-black/10 my-3" : "border-white/10 my-3";

  return text
    // Code blocks
    .replace(/```[\w]*\n([\s\S]*?)```/g, `<pre class="${codeBlockClass}"><code>$1</code></pre>`)
    // Inline code
    .replace(/`([^`]+)`/g, `<code class="${inlineCodeClass}">$1</code>`)
    // Bold
    .replace(/\*\*(.+?)\*\*/g, `<strong class="${headingClass} font-semibold">$1</strong>`)
    // Italic
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Headers
    .replace(/^### (.+)$/gm, `<div class="text-sm font-semibold ${headingClass} mt-3 mb-1">$1</div>`)
    .replace(/^## (.+)$/gm,  `<div class="text-base font-semibold ${headingClass} mt-3 mb-1">$1</div>`)
    .replace(/^# (.+)$/gm,   `<div class="text-lg font-bold ${headingClass} mt-3 mb-1">$1</div>`)
    // Unordered lists
    .replace(/^[-*] (.+)$/gm, '<li class="ml-3 list-disc">$1</li>')
    // Numbered lists
    .replace(/^\d+\. (.+)$/gm, '<li class="ml-3 list-decimal">$1</li>')
    // Horizontal rule
    .replace(/^---$/gm, `<hr class="${ruleClass}" />`)
    // Line breaks (double newline = paragraph gap)
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>');
}

// ── Suggestion chips ──────────────────────────────────────────────────────────

const SUGGESTIONS = [
  "Show me active projects",
  "What invoices are unpaid?",
  "Summarize recent activity",
  "List contacts added this month",
  "How many expenses this week?",
  "Show open contracts",
];

const STORAGE_KEY = "cel3-admin-ai-chat";

// ── Main Component ────────────────────────────────────────────────────────────

export default function AIAssistant({ theme }: { theme: AdminTheme }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (!stored) return;
      const parsed = JSON.parse(stored) as Message[];
      if (Array.isArray(parsed)) setMessages(parsed);
    } catch {
      // Ignore malformed local state and start fresh.
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {
      // Ignore local storage failures.
    }
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    setError(null);
    const userMsg: Message = { role: "user", content: trimmed };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Request failed (${res.status})`);
      }

      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.response }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [messages, loading]);

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  const clearChat = () => {
    setMessages([]);
    setError(null);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore local storage failures.
    }
  };

  const panelClass =
    theme === "light"
      ? "bg-[#f8f6f1] border-black/10"
      : "bg-[#0f0f0f] border-white/10";
  const panelHeaderBorderClass = theme === "light" ? "border-black/8" : "border-white/8";
  const panelTitleClass = theme === "light" ? "text-[#111111]" : "text-white";
  const mutedTextClass = theme === "light" ? "text-black/40" : "text-white/40";
  const secondaryTextClass = theme === "light" ? "text-black/60" : "text-white/60";
  const hoverTextClass = theme === "light" ? "text-black/35 hover:text-[#111111] hover:bg-black/5" : "text-white/30 hover:text-white hover:bg-white/5";
  const suggestionClass =
    theme === "light"
      ? "bg-black/[0.025] border-black/8 text-black/65 hover:text-[#111111] hover:border-sky-500/25 hover:bg-sky-500/[0.08]"
      : "bg-white/4 border-white/8 text-white/60 hover:text-white hover:border-sky-500/30 hover:bg-sky-500/5";
  const assistantBubbleClass =
    theme === "light"
      ? "bg-black/[0.04] text-black/80 rounded-bl-sm"
      : "bg-white/6 text-white/85 rounded-bl-sm";
  const loadingBubbleClass = theme === "light" ? "bg-black/[0.04] rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1.5" : "bg-white/6 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1.5";
  const inputShellClass =
    theme === "light"
      ? "bg-black/[0.03] border-black/10"
      : "bg-white/5 border-white/10";
  const inputTextClass = theme === "light" ? "text-[#111111] placeholder-black/30" : "text-white placeholder-white/30";
  const panelFooterHintClass = theme === "light" ? "text-black/25" : "text-white/20";
  const floatingClosedClass = "bg-sky-500 hover:bg-sky-400 text-black shadow-sky-500/30";
  const floatingOpenClass =
    theme === "light"
      ? "bg-[#f8f6f1] border border-black/10 text-black/60 shadow-black/10"
      : "bg-white/10 border border-white/20 text-white/70";
  const disabledSendClass = theme === "light" ? "disabled:bg-black/10 disabled:text-black/20" : "disabled:bg-white/10 disabled:text-white/20";

  return (
    <>
      {/* Floating button — sits above the mobile bottom nav bar on small screens */}
      <button
        onClick={() => setOpen(!open)}
        className={`fixed bottom-[76px] right-4 lg:bottom-6 lg:right-6 z-50 w-12 h-12 rounded-full shadow-2xl flex items-center justify-center transition-all duration-200 ${
          open
            ? floatingOpenClass
            : floatingClosedClass
        }`}
        title="AI Assistant"
        aria-label="Open AI Assistant"
      >
        {open ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
          </svg>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div className={`fixed z-50 rounded-2xl border shadow-2xl flex flex-col overflow-hidden ${panelClass}
          bottom-[136px] left-2 right-2 max-h-[calc(100dvh-180px)]
          lg:bottom-[88px] lg:left-auto lg:right-6 lg:w-[420px] lg:max-w-[calc(100vw-2rem)] lg:h-[600px] lg:max-h-[calc(100vh-6rem)]`}>
          {/* Header */}
          <div className={`flex items-center justify-between px-4 py-3 border-b flex-shrink-0 ${panelHeaderBorderClass}`}>
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-sky-500/20 flex items-center justify-center">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-sky-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
              </div>
              <div>
                <div className={`text-sm font-semibold ${panelTitleClass}`}>AI Assistant</div>
                <div className={`text-[10px] ${mutedTextClass}`}>Powered by Claude</div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button
                  onClick={clearChat}
                  className={`p-1.5 rounded-lg transition-colors text-xs ${hoverTextClass}`}
                  title="Clear conversation"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                  </svg>
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className={`p-1.5 rounded-lg transition-colors ${hoverTextClass}`}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="space-y-4">
                <div className="text-center py-6">
                  <div className="w-12 h-12 rounded-2xl bg-sky-500/10 flex items-center justify-center mx-auto mb-3">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-sky-400">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
                    </svg>
                  </div>
                  <div className={`text-sm font-semibold ${panelTitleClass}`}>How can I help?</div>
                  <div className={`text-xs mt-1 ${mutedTextClass}`}>I have access to all your backoffice data</div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className={`text-left px-3 py-2.5 rounded-xl border text-xs transition-all ${suggestionClass}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.role === "assistant" && (
                    <div className="w-6 h-6 rounded-lg bg-sky-500/20 flex items-center justify-center mr-2 flex-shrink-0 mt-0.5">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-sky-400">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                      </svg>
                    </div>
                  )}
                  <div
                    className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-sky-500/20 text-sky-50 rounded-br-sm"
                        : assistantBubbleClass
                    }`}
                  >
                    {msg.role === "assistant" ? (
                      <div
                        dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content, theme) }}
                        className={secondaryTextClass}
                      />
                    ) : (
                      msg.content
                    )}
                  </div>
                </div>
              ))
            )}

            {/* Loading indicator */}
            {loading && (
              <div className="flex justify-start">
                <div className="w-6 h-6 rounded-lg bg-sky-500/20 flex items-center justify-center mr-2 flex-shrink-0 mt-0.5">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-sky-400">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  </svg>
                </div>
                <div className={loadingBubbleClass}>
                  <span className="w-1.5 h-1.5 bg-sky-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 bg-sky-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 bg-sky-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="mx-2 px-3.5 py-2.5 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400">
                {error}
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className={`p-3 border-t flex-shrink-0 ${panelHeaderBorderClass}`}>
            <div className={`flex items-end gap-2 border rounded-xl px-3 py-2 focus-within:border-sky-500/40 transition-colors ${inputShellClass}`}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Ask anything about your backoffice…"
                rows={1}
                className={`flex-1 bg-transparent text-sm resize-none focus:outline-none min-h-[24px] max-h-[120px] leading-6 ${inputTextClass}`}
                style={{ height: "24px", overflowY: "hidden" }}
                onInput={(e) => {
                  const el = e.currentTarget;
                  el.style.height = "24px";
                  el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
                  el.style.overflowY = el.scrollHeight > 120 ? "auto" : "hidden";
                }}
              />
              <button
                onClick={() => send(input)}
                disabled={!input.trim() || loading}
                className={`flex-shrink-0 w-7 h-7 rounded-lg bg-sky-500 text-black flex items-center justify-center transition-colors hover:bg-sky-400 disabled:cursor-not-allowed ${disabledSendClass}`}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
                </svg>
              </button>
            </div>
            <div className={`text-[10px] text-center mt-2 ${panelFooterHintClass}`}>Enter to send · Shift+Enter for newline</div>
          </div>
        </div>
      )}
    </>
  );
}
