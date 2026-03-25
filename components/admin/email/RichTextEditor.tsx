"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import TextAlign from "@tiptap/extension-text-align";
import Image from "@tiptap/extension-image";
import { useState, useCallback, useEffect, useRef } from "react";

const TEXT_COLORS = [
  { label: "Default", value: "" },
  { label: "Black", value: "#000000" },
  { label: "Dark Gray", value: "#374151" },
  { label: "Gray", value: "#6B7280" },
  { label: "Accent", value: "#38BDF8" },
];

// Common emoji categories for quick insertion
const EMOJI_LIST = [
  "😀","😁","😂","🤣","😊","😍","🥰","😎","🤔","😅",
  "👍","👎","👋","🙏","💪","✅","❌","⭐","🔥","💡",
  "📧","📎","📁","📅","📊","💼","🎉","🎊","🚀","💯",
  "❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔",
  "😢","😭","😤","😠","😱","😴","🤗","😏","🙄","😬",
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
          ? "bg-sky-400/15 text-sky-200"
          : "text-white/60 hover:bg-white/8 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="w-px h-5 bg-white/10 mx-0.5 self-center" />;
}

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
  editorHeight?: string;
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = "Write your message…",
  minHeight = "240px",
  editorHeight = "420px",
}: Props) {
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const imageUploadRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: "underline text-blue-600 cursor-pointer" },
      }),
      TextStyle,
      Color,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Image.configure({
        inline: true,
        HTMLAttributes: { style: "max-width: 100%; height: auto;" },
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "outline-none h-full overflow-y-auto p-4 text-sm text-gray-900 leading-relaxed",
        style: `min-height: ${minHeight}; height: 100%;`,
      },
      handlePaste(view, event) {
        // Handle pasted images
        const items = Array.from(event.clipboardData?.items ?? []);
        const imageItem = items.find((item) => item.type.startsWith("image/"));
        if (imageItem) {
          event.preventDefault();
          const file = imageItem.getAsFile();
          if (!file) return false;
          const reader = new FileReader();
          reader.onload = (e) => {
            const src = e.target?.result as string;
            if (src) {
              view.dispatch(
                view.state.tr.replaceSelectionWith(
                  view.state.schema.nodes.image.create({ src })
                )
              );
            }
          };
          reader.readAsDataURL(file);
          return true;
        }
        return false;
      },
    },
  });

  // Sync external value changes (e.g. reset or signature injection)
  useEffect(() => {
    if (!editor) return;
    if (value === "" && editor.getHTML() !== "<p></p>") {
      editor.commands.clearContent();
    } else if (value && value !== editor.getHTML()) {
      // Only set content if it looks like an initial/signature injection
      // and the editor is empty or has only empty paragraphs
      const currentIsEmpty = editor.getHTML().replace(/<p><\/p>/g, "").trim() === "";
      if (currentIsEmpty && value) {
        editor.commands.setContent(value);
      }
    }
  }, [editor, value]);

  const applyLink = useCallback(() => {
    if (!editor) return;
    if (!linkUrl.trim()) {
      editor.chain().focus().unsetLink().run();
    } else {
      const url = linkUrl.startsWith("http") ? linkUrl : `https://${linkUrl}`;
      editor.chain().focus().setLink({ href: url }).run();
    }
    setShowLinkInput(false);
    setLinkUrl("");
  }, [editor, linkUrl]);

  function insertEmoji(emoji: string) {
    if (!editor) return;
    editor.chain().focus().insertContent(emoji).run();
    setShowEmojiPicker(false);
  }

  function handleImageUpload(files: FileList | null) {
    if (!editor || !files) return;
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const src = e.target?.result as string;
        if (src) editor.chain().focus().setImage({ src }).run();
      };
      reader.readAsDataURL(file);
    });
  }

  if (!editor) return null;

  const isLink = editor.isActive("link");

  return (
    <div className="rounded-xl border border-white/10 bg-[#090b10] transition-colors focus-within:border-sky-400/50">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 rounded-t-xl border-b border-white/8 bg-black px-2 py-1.5">
        {/* Text style */}
        <ToolbarBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Bold">
          <strong>B</strong>
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Italic">
          <em>I</em>
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="Underline">
          <span className="underline">U</span>
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} title="Strikethrough">
          <span className="line-through">S</span>
        </ToolbarBtn>

        <Divider />

        {/* Headings */}
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          active={editor.isActive("heading", { level: 1 })}
          title="Heading 1"
        >
          <span className="text-xs font-bold">H1</span>
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive("heading", { level: 2 })}
          title="Heading 2"
        >
          <span className="text-xs font-bold">H2</span>
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => editor.chain().focus().setParagraph().run()}
          active={editor.isActive("paragraph")}
          title="Normal text"
        >
          <span className="text-xs">¶</span>
        </ToolbarBtn>

        <Divider />

        {/* Alignment */}
        <ToolbarBtn onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })} title="Align left">
          <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M3 6h18v2H3V6zm0 4h12v2H3v-2zm0 4h18v2H3v-2zm0 4h12v2H3v-2z"/></svg>
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} title="Align center">
          <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M3 6h18v2H3V6zm3 4h12v2H6v-2zm-3 4h18v2H3v-2zm3 4h12v2H6v-2z"/></svg>
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })} title="Align right">
          <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M3 6h18v2H3V6zm6 4h12v2H9v-2zM3 14h18v2H3v-2zm6 4h12v2H9v-2z"/></svg>
        </ToolbarBtn>

        <Divider />

        {/* Lists */}
        <ToolbarBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Bullet list">
          <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M4 6h2v2H4V6zm4 0h12v2H8V6zM4 11h2v2H4v-2zm4 0h12v2H8v-2zM4 16h2v2H4v-2zm4 0h12v2H8v-2z"/></svg>
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Ordered list">
          <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M4.828 5H3V4h2v3H4V5zM8 6h12v2H8V6zm-4 6H3v-1h2v.5H4v1h1V13H3v-1h2v-2H3v1h1v1zm5-1h11v2H9v-2zm-5 6h2v.5h-1v1h1v.5H4v-1h1v-1H4v-1zm5 0h11v2H9v-2z"/></svg>
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} title="Blockquote">
          <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z"/></svg>
        </ToolbarBtn>

        <Divider />

        {/* Color picker */}
        <div className="relative">
          <ToolbarBtn onClick={() => { setShowColorPicker((v) => !v); setShowEmojiPicker(false); }} active={showColorPicker} title="Text color">
            <span className="flex flex-col items-center gap-0.5">
              <span className="text-xs font-bold">A</span>
              <span
                className="w-3 h-0.5 rounded"
                style={{ backgroundColor: editor.getAttributes("textStyle").color || "#ffffff" }}
              />
            </span>
          </ToolbarBtn>
          {showColorPicker && (
            <div className="absolute top-full left-0 z-50 mt-1 flex w-[140px] flex-wrap gap-1 rounded-xl border border-white/10 bg-black p-2 shadow-xl">
              {TEXT_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  title={c.label}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    if (c.value) {
                      editor.chain().focus().setColor(c.value).run();
                    } else {
                      editor.chain().focus().unsetColor().run();
                    }
                    setShowColorPicker(false);
                  }}
                  className="h-6 w-6 rounded border border-white/10 transition-transform hover:scale-110"
                  style={{ backgroundColor: c.value || "#6B7280" }}
                />
              ))}
            </div>
          )}
        </div>

        <Divider />

        {/* Link */}
        <ToolbarBtn
          onClick={() => {
            if (isLink) {
              editor.chain().focus().unsetLink().run();
            } else {
              setLinkUrl(editor.getAttributes("link").href || "");
              setShowLinkInput(true);
            }
          }}
          active={isLink}
          title={isLink ? "Remove link" : "Insert link"}
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        </ToolbarBtn>

        <Divider />

        {/* Emoji picker */}
        <div className="relative">
          <ToolbarBtn onClick={() => { setShowEmojiPicker((v) => !v); setShowColorPicker(false); }} active={showEmojiPicker} title="Insert emoji">
            <span className="text-base leading-none">😊</span>
          </ToolbarBtn>
          {showEmojiPicker && (
            <div className="absolute top-full left-0 z-50 mt-1 flex max-h-48 w-[220px] flex-wrap gap-1 overflow-y-auto rounded-xl border border-white/10 bg-black p-2 shadow-xl">
              {EMOJI_LIST.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    insertEmoji(emoji);
                  }}
                  className="flex h-7 w-7 items-center justify-center rounded text-base transition-colors hover:bg-white/10"
                  title={emoji}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Inline image upload */}
        <ToolbarBtn
          onClick={() => imageUploadRef.current?.click()}
          title="Insert image"
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
          </svg>
        </ToolbarBtn>
        <input
          ref={imageUploadRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            handleImageUpload(e.target.files);
            e.target.value = "";
          }}
        />

        <Divider />

        {/* Clear formatting */}
        <ToolbarBtn
          onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
          title="Clear formatting"
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L17.94 6M12 12L9.06 9.06M15 15l-3-3M3 6h18M7 12l5 6h9" />
          </svg>
        </ToolbarBtn>
      </div>

      {/* Link URL input bar */}
      {showLinkInput && (
        <div className="flex items-center gap-2 border-b border-white/8 bg-black px-3 py-2">
          <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="text-white/40 shrink-0">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          <input
            autoFocus
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); applyLink(); }
              if (e.key === "Escape") { setShowLinkInput(false); setLinkUrl(""); }
            }}
            placeholder="https://example.com"
            className="flex-1 bg-transparent text-sm text-white placeholder-white/25 outline-none"
          />
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); applyLink(); }}
            className="rounded-lg bg-sky-500 px-2.5 py-1 text-xs text-white transition-colors hover:bg-sky-400"
          >
            Apply
          </button>
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); setShowLinkInput(false); setLinkUrl(""); }}
            className="text-xs text-white/40 hover:text-white transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Editor canvas — white bg like an email */}
      <div className="relative overflow-hidden rounded-b-xl bg-white" style={{ height: editorHeight, minHeight }}>
        {editor.isEmpty && (
          <p className="absolute top-4 left-4 text-sm text-gray-400 pointer-events-none select-none">
            {placeholder}
          </p>
        )}
        <div className="h-full">
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
}
