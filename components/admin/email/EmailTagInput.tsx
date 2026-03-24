"use client";

import { useState, useRef, KeyboardEvent, ClipboardEvent } from "react";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface Props {
  emails: string[];
  onChange: (emails: string[]) => void;
  placeholder?: string;
  required?: boolean;
}

export default function EmailTagInput({
  emails,
  onChange,
  placeholder = "name@example.com",
  required = false,
}: Props) {
  const [input, setInput] = useState("");
  const [invalid, setInvalid] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === "," || e.key === "Tab") {
      if (input.trim()) {
        e.preventDefault();
        commit(input);
      }
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
    <div
      className={`flex flex-wrap gap-1.5 items-center bg-white/5 border rounded-xl px-3 py-2 cursor-text transition-colors focus-within:border-sky-400/50 ${
        invalid ? "border-red-500/50" : "border-white/10"
      }`}
      onClick={() => inputRef.current?.focus()}
    >
      {emails.map((email) => (
        <span
          key={email}
          className="inline-flex items-center gap-1 bg-sky-500/15 border border-sky-500/25 text-sky-300 text-xs px-2 py-0.5 rounded-lg max-w-[220px]"
        >
          <span className="truncate">{email}</span>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              onChange(emails.filter((e2) => e2 !== email));
            }}
            className="text-sky-400/60 hover:text-sky-200 transition-colors shrink-0 ml-0.5"
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
        onChange={(e) => { setInput(e.target.value); setInvalid(false); }}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onBlur={handleBlur}
        placeholder={emails.length === 0 ? placeholder : ""}
        required={required && emails.length === 0}
        className="flex-1 min-w-[140px] bg-transparent text-white text-sm placeholder-white/25 outline-none py-0.5"
      />

      {invalid && (
        <span className="w-full text-xs text-red-400 mt-0.5">Invalid email address</span>
      )}
    </div>
  );
}
