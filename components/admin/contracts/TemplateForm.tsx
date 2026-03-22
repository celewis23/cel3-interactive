"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";

const CATEGORIES = ["service-agreement", "nda", "proposal", "scope", "retainer", "other"];

const COMMON_VARS = [
  "clientName",
  "clientEmail",
  "clientCompany",
  "projectName",
  "contractNumber",
  "contractDate",
  "startDate",
  "endDate",
  "totalAmount",
  "paymentTerms",
];

function ToolbarBtn({
  onClick,
  active,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      title={title}
      className={`p-1.5 rounded text-sm transition-colors ${
        active
          ? "bg-sky-500/20 text-sky-400"
          : "text-white/60 hover:text-white hover:bg-white/8"
      }`}
    >
      {children}
    </button>
  );
}

interface TemplateData {
  _id?: string;
  name?: string;
  category?: string;
  body?: string;
  variables?: string[];
}

interface Props {
  initial?: TemplateData;
}

export default function TemplateForm({ initial }: Props) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? "");
  const [category, setCategory] = useState(initial?.category ?? "other");
  const [customVars, setCustomVars] = useState<string[]>(
    (initial?.variables ?? []).filter((v) => !COMMON_VARS.includes(v))
  );
  const [newVar, setNewVar] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content: initial?.body ?? "",
    editorProps: {
      attributes: {
        class: "outline-none p-6 text-sm text-gray-900 leading-relaxed min-h-[400px]",
      },
    },
  });

  const insertVariable = useCallback(
    (varName: string) => {
      editor?.chain().focus().insertContent(`{{${varName}}}`).run();
    },
    [editor]
  );

  function addCustomVar() {
    const v = newVar.trim().replace(/\s+/g, "_");
    if (!v || customVars.includes(v) || COMMON_VARS.includes(v)) return;
    setCustomVars((prev) => [...prev, v]);
    setNewVar("");
  }

  async function handleSave() {
    setError(null);
    if (!name.trim()) {
      setError("Template name is required.");
      return;
    }
    setSaving(true);
    try {
      const allVars = [...COMMON_VARS, ...customVars];
      const payload = {
        name: name.trim(),
        category,
        body: editor?.getHTML() ?? "",
        variables: allVars,
      };

      const url = initial?._id
        ? `/api/admin/contracts/templates/${initial._id}`
        : "/api/admin/contracts/templates";
      const method = initial?._id ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || "Failed to save.");
        return;
      }
      router.push("/admin/contracts/templates");
      router.refresh();
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Name + Category */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">
            Template Name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Web Design Agreement"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-sky-400/50"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">
            Category
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-sky-400/50 appearance-none"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c} className="bg-[#0f0f0f] text-white">
                {c.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Variable palette */}
      <div>
        <label className="block text-xs font-medium text-white/50 mb-2 uppercase tracking-wider">
          Variables — click to insert into template
        </label>
        <div className="flex flex-wrap gap-2 mb-3">
          {[...COMMON_VARS, ...customVars].map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => insertVariable(v)}
              className="px-2.5 py-1 rounded-lg bg-sky-500/10 text-sky-400 text-xs font-mono hover:bg-sky-500/20 transition-colors border border-sky-500/20"
            >
              {`{{${v}}}`}
            </button>
          ))}
        </div>
        {/* Add custom var */}
        <div className="flex gap-2">
          <input
            type="text"
            value={newVar}
            onChange={(e) => setNewVar(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomVar(); } }}
            placeholder="Add custom variable…"
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-white/25 focus:outline-none focus:border-sky-400/50 font-mono"
          />
          <button
            type="button"
            onClick={addCustomVar}
            className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-xs transition-colors border border-white/10"
          >
            Add
          </button>
        </div>
      </div>

      {/* TipTap editor */}
      <div>
        <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">
          Contract Body
        </label>
        <div className="border border-white/10 rounded-xl overflow-hidden focus-within:border-sky-400/50 transition-colors">
          {editor && (
            <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 bg-white/3 border-b border-white/8">
              <ToolbarBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Bold">
                <strong>B</strong>
              </ToolbarBtn>
              <ToolbarBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Italic">
                <em>I</em>
              </ToolbarBtn>
              <ToolbarBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="Underline">
                <span className="underline">U</span>
              </ToolbarBtn>
              <div className="w-px h-5 bg-white/10 mx-0.5 self-center" />
              <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })} title="H1">
                <span className="text-xs font-bold">H1</span>
              </ToolbarBtn>
              <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} title="H2">
                <span className="text-xs font-bold">H2</span>
              </ToolbarBtn>
              <ToolbarBtn onClick={() => editor.chain().focus().setParagraph().run()} active={editor.isActive("paragraph")} title="Paragraph">
                <span className="text-xs">¶</span>
              </ToolbarBtn>
              <div className="w-px h-5 bg-white/10 mx-0.5 self-center" />
              <ToolbarBtn onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })} title="Left">
                <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M3 6h18v2H3V6zm0 4h12v2H3v-2zm0 4h18v2H3v-2zm0 4h12v2H3v-2z"/></svg>
              </ToolbarBtn>
              <ToolbarBtn onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} title="Center">
                <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M3 6h18v2H3V6zm3 4h12v2H6v-2zm-3 4h18v2H3v-2zm3 4h12v2H6v-2z"/></svg>
              </ToolbarBtn>
              <ToolbarBtn onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })} title="Right">
                <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M3 6h18v2H3V6zm6 4h12v2H9v-2zM3 14h18v2H3v-2zm6 4h12v2H9v-2z"/></svg>
              </ToolbarBtn>
              <div className="w-px h-5 bg-white/10 mx-0.5 self-center" />
              <ToolbarBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Bullet list">
                <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M4 6h2v2H4V6zm4 0h12v2H8V6zM4 11h2v2H4v-2zm4 0h12v2H8v-2zM4 16h2v2H4v-2zm4 0h12v2H8v-2z"/></svg>
              </ToolbarBtn>
              <ToolbarBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Ordered list">
                <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M4.828 5H3V4h2v3H4V5zM8 6h12v2H8V6zm-4 6H3v-1h2v.5H4v1h1V13H3v-1h2v-2H3v1h1v1zm5-1h11v2H9v-2zm-5 6h2v.5h-1v1h1v.5H4v-1h1v-1H4v-1zm5 0h11v2H9v-2z"/></svg>
              </ToolbarBtn>
              <ToolbarBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} title="Blockquote">
                <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z"/></svg>
              </ToolbarBtn>
              <div className="w-px h-5 bg-white/10 mx-0.5 self-center" />
              <ToolbarBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Divider">
                <span className="text-xs">—</span>
              </ToolbarBtn>
            </div>
          )}
          <div className="bg-white">
            <EditorContent editor={editor} />
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex-1 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
        >
          {saving ? "Saving…" : initial?._id ? "Save Changes" : "Create Template"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-sm transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
