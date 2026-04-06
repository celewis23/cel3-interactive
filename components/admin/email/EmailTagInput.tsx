"use client";

import { useRef, useState, KeyboardEvent, ClipboardEvent } from "react";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type EmailSuggestion = {
  email: string;
  label: string;
  sublabel?: string;
};

interface Props {
  emails: string[];
  onChange: (emails: string[]) => void;
  placeholder?: string;
  required?: boolean;
  suggestions?: EmailSuggestion[];
  loadingSuggestions?: boolean;
  onInputChange?: (value: string) => void;
}

export default function EmailTagInput({
  emails,
  onChange,
  placeholder = "name@example.com",
  required = false,
  suggestions = [],
  loadingSuggestions = false,
  onInputChange,
}: Props) {
  const [input, setInput] = useState("");
  const [invalid, setInvalid] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const visibleSuggestions = suggestions.filter(
    (suggestion) =>
      suggestion.email &&
      !emails.some((email) => email.toLowerCase() === suggestion.email.toLowerCase())
  );
  const activeSuggestionIndex =
    visibleSuggestions.length === 0
      ? 0
      : Math.min(highlightedIndex, visibleSuggestions.length - 1);
  const showSuggestions =
    input.trim().length > 0 &&
    (loadingSuggestions || visibleSuggestions.length > 0);

  function commit(raw: string) {
    const val = raw.trim().replace(/,+$/, "");
    if (!val) return;
    if (!EMAIL_RE.test(val)) {
      setInvalid(true);
      return;
    }
    if (!emails.includes(val)) {
      onChange([...emails, val]);
    }
    setInput("");
    setInvalid(false);
  }

  function commitSuggestion(suggestion: EmailSuggestion) {
    if (!emails.some((email) => email.toLowerCase() === suggestion.email.toLowerCase())) {
      onChange([...emails, suggestion.email]);
    }
    setInput("");
    setInvalid(false);
    setHighlightedIndex(0);
    onInputChange?.("");
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" && visibleSuggestions.length > 0) {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1) % visibleSuggestions.length);
      return;
    }
    if (e.key === "ArrowUp" && visibleSuggestions.length > 0) {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev - 1 + visibleSuggestions.length) % visibleSuggestions.length);
      return;
    }
    if (e.key === "Enter" || e.key === "," || e.key === "Tab") {
      if (input.trim()) {
        e.preventDefault();
        if (e.key === "Enter" && visibleSuggestions[activeSuggestionIndex]) {
          commitSuggestion(visibleSuggestions[activeSuggestionIndex]);
          return;
        }
        commit(input);
      }
      return;
    }
    if (e.key === "Escape") {
      setHighlightedIndex(0);
      return;
    }
    if (e.key === "Backspace" && !input && emails.length > 0) {
      onChange(emails.slice(0, -1));
    }
    if (invalid) setInvalid(false);
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    const text = e.clipboardData.getData("text");
    if (!text.includes(",") && !text.includes(";") && !text.includes(" ")) return;
    e.preventDefault();
    const parts = text.split(/[,;\s]+/).map((s) => s.trim()).filter(Boolean);
    const valid: string[] = [];
    for (const part of parts) {
      if (EMAIL_RE.test(part) && !emails.includes(part)) {
        valid.push(part);
      }
    }
    if (valid.length) onChange([...emails, ...valid]);
    setInput("");
  }

  function handleBlur() {
    if (input.trim()) commit(input);
  }

  return (
    <div className="relative">
      <div
        className={`flex flex-wrap gap-1.5 items-center rounded-xl border bg-black px-3 py-2 cursor-text transition-colors focus-within:border-sky-400/50 ${
          invalid ? "border-sky-400/50" : "border-white/10"
        }`}
        onClick={() => inputRef.current?.focus()}
      >
        {emails.map((email) => (
          <span
            key={email}
            className="inline-flex max-w-[220px] items-center gap-1 rounded-lg border border-sky-400/20 bg-sky-400/10 px-2 py-0.5 text-xs text-sky-100"
          >
            <span className="truncate">{email}</span>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(emails.filter((e2) => e2 !== email));
              }}
              className="ml-0.5 shrink-0 text-sky-200/70 transition-colors hover:text-white"
              aria-label={`Remove ${email}`}
            >
              <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </span>
        ))}

        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setInvalid(false);
            onInputChange?.(e.target.value);
          }}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onBlur={handleBlur}
          placeholder={emails.length === 0 ? placeholder : ""}
          required={required && emails.length === 0}
          className="flex-1 min-w-[140px] bg-transparent text-white text-sm placeholder-white/25 outline-none py-0.5"
        />

        {invalid && (
          <span className="mt-0.5 w-full text-xs text-sky-200">Invalid email address</span>
        )}
      </div>

      {showSuggestions && (
        <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-xl border border-white/10 bg-[#090b10] shadow-2xl">
          {loadingSuggestions ? (
            <div className="px-3 py-2 text-xs text-white/40">Searching contacts…</div>
          ) : (
            visibleSuggestions.map((suggestion, index) => (
              <button
                key={`${suggestion.email}-${index}`}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  commitSuggestion(suggestion);
                }}
                className={`flex w-full items-start justify-between gap-3 px-3 py-2 text-left transition-colors ${
                  index === activeSuggestionIndex
                    ? "bg-sky-500/10"
                    : "hover:bg-white/5"
                }`}
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm text-white/85">{suggestion.label}</span>
                  <span className="block truncate text-xs text-white/40">
                    {suggestion.sublabel ? `${suggestion.email} • ${suggestion.sublabel}` : suggestion.email}
                  </span>
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
