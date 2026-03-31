"use client";

import { KeyboardEvent, useEffect, useRef, useState } from "react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const STORAGE_KEY = "cel3-portal-ai-chat";
const SUGGESTIONS = [
  "What invoices are still unpaid?",
  "What is the status of my requests?",
  "Summarize my active projects",
  "Do I have anything waiting on me?",
];

function renderMarkdown(text: string): string {
  return text
    .replace(/```[\w]*\n([\s\S]*?)```/g, '<pre class="bg-black/40 rounded-lg p-3 text-xs overflow-x-auto my-2 text-emerald-300"><code>$1</code></pre>')
    .replace(/`([^`]+)`/g, '<code class="bg-black/40 px-1.5 py-0.5 rounded text-xs text-emerald-300">$1</code>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>')
    .replace(/^[-*] (.+)$/gm, '<li class="ml-3 list-disc">$1</li>')
    .replace(/^\d+\. (.+)$/gm, '<li class="ml-3 list-decimal">$1</li>')
    .replace(/\n\n/g, "<br/><br/>")
    .replace(/\n/g, "<br/>");
}

export default function PortalAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    try {
      const storedTheme = window.localStorage.getItem("cel3-portal-theme");
      setTheme(storedTheme === "light" ? "light" : "dark");
    } catch {
      setTheme("dark");
    }
  }, [open]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (!stored) return;
      const parsed = JSON.parse(stored) as Message[];
      if (Array.isArray(parsed)) setMessages(parsed);
    } catch {
      // Ignore malformed local state.
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {
      // Ignore local storage failures.
    }
  }, [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (open) {
      window.setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const nextMessages = [...messages, { role: "user" as const, content: trimmed }];
    setMessages(nextMessages);
    setInput("");
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/portal/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
      });
      const data = await res.json().catch(() => ({})) as { response?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
      setMessages((prev) => [...prev, { role: "assistant", content: data.response ?? "I couldn't generate a response." }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void send(input);
    }
  }

  function clearConversation() {
    setMessages([]);
    setError(null);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore local storage failures.
    }
  }

  const iconButtonClass = theme === "light"
    ? open
      ? "bg-white border border-black/10 text-black shadow-[0_18px_50px_rgba(0,0,0,0.12)]"
      : "bg-sky-500 hover:bg-sky-400 text-black shadow-[0_18px_50px_rgba(14,165,233,0.35)]"
    : open
      ? "bg-white/10 border border-white/20 text-white/70"
      : "bg-sky-500 hover:bg-sky-400 text-black shadow-sky-500/30";
  const panelClass = theme === "light"
    ? "fixed z-50 bg-[#faf8f4] border border-black/10 rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.14)] flex flex-col overflow-hidden bottom-[136px] left-2 right-2 max-h-[calc(100dvh-180px)] lg:bottom-[88px] lg:left-auto lg:right-6 lg:w-[420px] lg:max-w-[calc(100vw-2rem)] lg:h-[600px] lg:max-h-[calc(100vh-6rem)]"
    : "fixed z-50 bg-[#0f0f0f] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden bottom-[136px] left-2 right-2 max-h-[calc(100dvh-180px)] lg:bottom-[88px] lg:left-auto lg:right-6 lg:w-[420px] lg:max-w-[calc(100vw-2rem)] lg:h-[600px] lg:max-h-[calc(100vh-6rem)]";
  const mutedClass = theme === "light" ? "text-black/45" : "text-white/40";
  const cardClass = theme === "light" ? "bg-black/[0.03] border border-black/8" : "bg-white/4 border border-white/8";
  const inputWrapClass = theme === "light"
    ? "flex items-end gap-2 bg-black/[0.03] border border-black/10 rounded-xl px-3 py-2 focus-within:border-sky-500/40 transition-colors"
    : "flex items-end gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2 focus-within:border-sky-500/40 transition-colors";
  const textClass = theme === "light" ? "text-[#111111]" : "text-white";
  const assistantBubbleClass = theme === "light" ? "bg-black/[0.04] text-black/80 rounded-bl-sm" : "bg-white/6 text-white/85 rounded-bl-sm";
  const userBubbleClass = "bg-sky-500/20 text-sky-50 rounded-br-sm";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`fixed bottom-[76px] right-4 lg:bottom-6 lg:right-6 z-50 w-12 h-12 rounded-full shadow-2xl flex items-center justify-center transition-all duration-200 ${iconButtonClass}`}
        title="Portal Assistant"
        aria-label="Open portal assistant"
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

      {open && (
        <div className={panelClass}>
          <div className={`flex items-center justify-between px-4 py-3 border-b flex-shrink-0 ${theme === "light" ? "border-black/8" : "border-white/8"}`}>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-sky-500/15 text-sky-400 flex items-center justify-center">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
              </div>
              <div>
                <div className={`text-sm font-semibold ${textClass}`}>Portal Assistant</div>
                <div className={`text-[10px] ${mutedClass}`}>Limited to your account, projects, requests, and billing</div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={clearConversation}
                  className={`p-1.5 rounded-lg transition-colors ${mutedClass} ${theme === "light" ? "hover:bg-black/5 hover:text-black" : "hover:bg-white/5 hover:text-white"}`}
                  title="Clear conversation"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                  </svg>
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className={`p-1.5 rounded-lg transition-colors ${mutedClass} ${theme === "light" ? "hover:bg-black/5 hover:text-black" : "hover:bg-white/5 hover:text-white"}`}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="space-y-4">
                <div className="text-center py-6">
                  <div className="w-12 h-12 rounded-2xl bg-sky-500/10 flex items-center justify-center mx-auto mb-3">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-sky-400">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
                    </svg>
                  </div>
                  <div className={`text-sm font-semibold ${textClass}`}>Ask about your account</div>
                  <div className={`text-xs mt-1 ${mutedClass}`}>This assistant cannot see other clients.</div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {SUGGESTIONS.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => void send(suggestion)}
                      className={`text-left px-3 py-2.5 rounded-xl text-xs transition-all ${cardClass} ${theme === "light" ? "text-black/65 hover:text-black hover:border-sky-500/30 hover:bg-sky-500/5" : "text-white/60 hover:text-white hover:border-sky-500/30 hover:bg-sky-500/5"}`}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((message, index) => (
                <div key={`${message.role}-${index}`} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                  {message.role === "assistant" && (
                    <div className="w-6 h-6 rounded-lg bg-sky-500/20 flex items-center justify-center mr-2 flex-shrink-0 mt-0.5">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-sky-400">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                      </svg>
                    </div>
                  )}
                  <div className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${message.role === "user" ? userBubbleClass : assistantBubbleClass}`}>
                    {message.role === "assistant" ? (
                      <div dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }} />
                    ) : (
                      message.content
                    )}
                  </div>
                </div>
              ))
            )}

            {loading && (
              <div className="flex justify-start">
                <div className="w-6 h-6 rounded-lg bg-sky-500/20 flex items-center justify-center mr-2 flex-shrink-0 mt-0.5">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-sky-400">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  </svg>
                </div>
                <div className={`rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1.5 ${theme === "light" ? "bg-black/[0.04]" : "bg-white/6"}`}>
                  <span className="w-1.5 h-1.5 bg-sky-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 bg-sky-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 bg-sky-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}

            {error && (
              <div className="mx-2 px-3.5 py-2.5 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400">
                {error}
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          <div className={`p-3 border-t flex-shrink-0 ${theme === "light" ? "border-black/8" : "border-white/8"}`}>
            <div className={inputWrapClass}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Ask about your projects, invoices, requests, or portal access…"
                rows={1}
                className={`flex-1 bg-transparent text-sm placeholder:opacity-50 resize-none focus:outline-none min-h-[24px] max-h-[120px] leading-6 ${textClass}`}
                style={{ height: "24px", overflowY: "hidden" }}
                onInput={(event) => {
                  const el = event.currentTarget;
                  el.style.height = "24px";
                  el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
                  el.style.overflowY = el.scrollHeight > 120 ? "auto" : "hidden";
                }}
              />
              <button
                type="button"
                onClick={() => void send(input)}
                disabled={!input.trim() || loading}
                className="flex-shrink-0 w-8 h-8 rounded-lg bg-sky-500 disabled:bg-black/10 disabled:text-black/20 text-black flex items-center justify-center transition-colors hover:bg-sky-400 disabled:cursor-not-allowed"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
                </svg>
              </button>
            </div>
            <div className={`text-[10px] text-center mt-2 ${mutedClass}`}>Only your account data is available here.</div>
          </div>
        </div>
      )}
    </>
  );
}
