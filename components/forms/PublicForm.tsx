"use client";
import { useState, useRef } from "react";
import { Cel3Form, FormField, isFieldVisible } from "@/lib/forms";

const CLS_INPUT = "w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/25 focus:outline-none focus:border-sky-400/50 transition-colors";
const CLS_LABEL = "block text-sm font-medium text-white mb-1.5";
const CLS_HELP = "text-xs text-white/35 mt-1";

export default function PublicForm({ form }: { form: Cel3Form }) {
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [files, setFiles] = useState<Record<string, FileList | null>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  function setAnswer(fieldId: string, value: string | string[]) {
    setAnswers(prev => ({ ...prev, [fieldId]: value }));
  }

  function toggleCheckbox(fieldId: string, option: string) {
    setAnswers(prev => {
      const current = (prev[fieldId] as string[]) || [];
      const next = current.includes(option)
        ? current.filter(v => v !== option)
        : [...current, option];
      return { ...prev, [fieldId]: next };
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const allFields = form.fields || [];
    // Only process fields that are currently visible given the current answers
    const visibleFields = allFields.filter(
      f => f.fieldType !== "section_header" && isFieldVisible(f, answers)
    );

    // Client-side required validation — only for visible fields
    for (const field of visibleFields) {
      if (!field.isRequired) continue;
      if (field.fieldType === "file_upload") {
        const fl = files[field.id];
        if (!fl || fl.length === 0) {
          setError(`"${field.label}" is required`);
          return;
        }
      } else if (field.fieldType === "checkbox") {
        const vals = (answers[field.id] as string[]) || [];
        if (vals.length === 0) {
          setError(`"${field.label}" is required`);
          return;
        }
      } else {
        const val = String(answers[field.id] ?? "").trim();
        if (!val) {
          setError(`"${field.label}" is required`);
          return;
        }
      }
    }

    setSubmitting(true);
    try {
      const fd = new FormData();
      // Only append answers for visible fields — hidden fields are intentionally excluded
      for (const field of visibleFields) {
        if (field.fieldType === "file_upload") continue;
        const val = answers[field.id];
        if (Array.isArray(val)) {
          for (const v of val) fd.append(field.id, v);
        } else if (val !== undefined) {
          fd.append(field.id, String(val));
        }
      }
      // Append files for visible file-upload fields only
      for (const field of visibleFields.filter(f => f.fieldType === "file_upload")) {
        const fl = files[field.id];
        if (fl) {
          for (let i = 0; i < fl.length; i++) {
            fd.append(field.id, fl[i]);
          }
        }
      }

      const res = await fetch(`/api/forms/${form.slug}/submit`, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submission failed");
      setDone(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-14 h-14 rounded-full bg-sky-500/15 flex items-center justify-center mx-auto mb-5">
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="text-sky-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-white mb-2">Response recorded</h1>
          <p className="text-sm text-white/40">Thank you for your submission.</p>
          <p className="text-xs text-white/20 mt-6">— CEL3 Interactive</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black px-4 py-12">
      <div className="max-w-xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="text-xs text-sky-400 tracking-widest uppercase mb-2">CEL3 Forms</div>
          <h1 className="text-2xl font-semibold text-white">{form.title}</h1>
          {form.description && (
            <p className="text-sm text-white/40 mt-2">{form.description}</p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {(form.fields || []).filter(field => isFieldVisible(field, answers)).map(field => (
            <FieldRenderer
              key={field.id}
              field={field}
              answer={answers[field.id]}
              fileRef={el => { fileRefs.current[field.id] = el; }}
              onAnswer={setAnswer}
              onCheckboxToggle={toggleCheckbox}
              onFile={(id, fl) => setFiles(prev => ({ ...prev, [id]: fl }))}
            />
          ))}

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-black font-semibold text-sm transition-colors"
            >
              {submitting ? "Submitting…" : "Submit"}
            </button>
          </div>
        </form>

        <p className="text-center text-xs text-white/20 mt-8">Powered by CEL3 Interactive</p>
      </div>
    </div>
  );
}

function FieldRenderer({
  field,
  answer,
  fileRef,
  onAnswer,
  onCheckboxToggle,
  onFile,
}: {
  field: FormField;
  answer: string | string[] | undefined;
  fileRef: (el: HTMLInputElement | null) => void;
  onAnswer: (id: string, v: string | string[]) => void;
  onCheckboxToggle: (id: string, option: string) => void;
  onFile: (id: string, fl: FileList | null) => void;
}) {
  const [dragOver, setDragOver] = useState(false);
  const localRef = useRef<HTMLInputElement | null>(null);

  if (field.fieldType === "section_header") {
    return (
      <div className="pt-4 pb-1 border-b border-white/8">
        <h2 className="text-sm font-semibold text-white/60 uppercase tracking-widest">{field.label}</h2>
      </div>
    );
  }

  const required = field.isRequired ? <span className="text-sky-400 ml-0.5">*</span> : null;

  if (field.fieldType === "textarea") {
    return (
      <div>
        <label className={CLS_LABEL}>{field.label}{required}</label>
        <textarea
          value={(answer as string) || ""}
          onChange={e => onAnswer(field.id, e.target.value)}
          placeholder={field.placeholder}
          rows={4}
          className={CLS_INPUT + " resize-none"}
        />
        {field.helpText && <p className={CLS_HELP}>{field.helpText}</p>}
      </div>
    );
  }

  if (field.fieldType === "dropdown") {
    return (
      <div>
        <label className={CLS_LABEL}>{field.label}{required}</label>
        <select
          value={(answer as string) || ""}
          onChange={e => onAnswer(field.id, e.target.value)}
          className={CLS_INPUT + " bg-white/5"}
        >
          <option value="" className="bg-[#0a0a0a] text-white/40">
            {field.placeholder || "Select an option…"}
          </option>
          {(field.options || []).map(opt => (
            <option key={opt} value={opt} className="bg-[#0a0a0a]">{opt}</option>
          ))}
        </select>
        {field.helpText && <p className={CLS_HELP}>{field.helpText}</p>}
      </div>
    );
  }

  if (field.fieldType === "checkbox") {
    const checked = (answer as string[]) || [];
    return (
      <div>
        <label className={CLS_LABEL}>{field.label}{required}</label>
        <div className="space-y-2">
          {(field.options || []).map(opt => (
            <label key={opt} className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={checked.includes(opt)}
                onChange={() => onCheckboxToggle(field.id, opt)}
                className="w-4 h-4 rounded border-white/20 bg-white/5 text-sky-500 focus:ring-sky-400 focus:ring-offset-0"
              />
              <span className="text-sm text-white/70">{opt}</span>
            </label>
          ))}
        </div>
        {field.helpText && <p className={CLS_HELP}>{field.helpText}</p>}
      </div>
    );
  }

  if (field.fieldType === "radio") {
    return (
      <div>
        <label className={CLS_LABEL}>{field.label}{required}</label>
        <div className="space-y-2">
          {(field.options || []).map(opt => (
            <label key={opt} className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                name={field.id}
                value={opt}
                checked={(answer as string) === opt}
                onChange={() => onAnswer(field.id, opt)}
                className="w-4 h-4 border-white/20 bg-white/5 text-sky-500 focus:ring-sky-400 focus:ring-offset-0"
              />
              <span className="text-sm text-white/70">{opt}</span>
            </label>
          ))}
        </div>
        {field.helpText && <p className={CLS_HELP}>{field.helpText}</p>}
      </div>
    );
  }

  if (field.fieldType === "file_upload") {
    const accepted = field.acceptedFileTypes || "image/*,audio/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip";
    const maxMb = field.maxFileSizeMb || 10;
    return (
      <div>
        <label className={CLS_LABEL}>{field.label}{required}</label>
        <div
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
            dragOver ? "border-sky-400/60 bg-sky-400/5" : "border-white/10 hover:border-white/20"
          }`}
          onClick={() => localRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => {
            e.preventDefault();
            setDragOver(false);
            onFile(field.id, e.dataTransfer.files);
          }}
        >
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" className="mx-auto mb-2 text-white/25">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
          <p className="text-sm text-white/40">
            Drag & drop or <span className="text-sky-400">browse</span>
          </p>
          <p className="text-xs text-white/25 mt-1">
            {accepted.replace(/,/g, ", ")} · max {maxMb}MB
          </p>
        </div>
        <input
          ref={el => { localRef.current = el; fileRef(el); }}
          type="file"
          accept={accepted}
          multiple
          className="hidden"
          onChange={e => onFile(field.id, e.target.files)}
        />
        {field.helpText && <p className={CLS_HELP}>{field.helpText}</p>}
      </div>
    );
  }

  // Default: text-like inputs
  const inputType: Record<string, string> = {
    number: "number", email: "email", phone: "tel", date: "date",
  };
  return (
    <div>
      <label className={CLS_LABEL}>{field.label}{required}</label>
      <input
        type={inputType[field.fieldType] || "text"}
        value={(answer as string) || ""}
        onChange={e => onAnswer(field.id, e.target.value)}
        placeholder={field.placeholder}
        className={CLS_INPUT}
      />
      {field.helpText && <p className={CLS_HELP}>{field.helpText}</p>}
    </div>
  );
}
