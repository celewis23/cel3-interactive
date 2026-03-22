"use client";

import { useState } from "react";
import Link from "next/link";
import DocEditorModal, { detectType } from "@/components/admin/drive/DocEditorModal";

type EditorState = { fileId: string; fileName: string; mimeType: string } | null;

const ACTIONS = [
  {
    label: "New Project",
    href: "/admin/projects",
    color: "text-sky-400",
    bg: "hover:bg-sky-500/10 hover:border-sky-500/20",
    icon: (
      <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3" />
      </svg>
    ),
  },
  {
    label: "New Doc",
    action: "doc" as const,
    color: "text-blue-400",
    bg: "hover:bg-blue-500/10 hover:border-blue-500/20",
    icon: (
      <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
  },
  {
    label: "New Sheet",
    action: "sheet" as const,
    color: "text-green-400",
    bg: "hover:bg-green-500/10 hover:border-green-500/20",
    icon: (
      <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0112 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h1.5m-1.5 0c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h17.25" />
      </svg>
    ),
  },
  {
    label: "New Email",
    href: "/admin/email",
    color: "text-amber-400",
    bg: "hover:bg-amber-500/10 hover:border-amber-500/20",
    icon: (
      <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
      </svg>
    ),
  },
  {
    label: "New Chat",
    href: "/admin/chat",
    color: "text-purple-400",
    bg: "hover:bg-purple-500/10 hover:border-purple-500/20",
    icon: (
      <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 01.778-.332 48.294 48.294 0 005.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
      </svg>
    ),
  },
  {
    label: "Schedule Meet",
    href: "/admin/meet",
    color: "text-rose-400",
    bg: "hover:bg-rose-500/10 hover:border-rose-500/20",
    icon: (
      <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
      </svg>
    ),
  },
  {
    label: "Add Contact",
    href: "/admin/contacts",
    color: "text-teal-400",
    bg: "hover:bg-teal-500/10 hover:border-teal-500/20",
    icon: (
      <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
      </svg>
    ),
  },
  {
    label: "New Form",
    href: "/admin/forms/new",
    color: "text-orange-400",
    bg: "hover:bg-orange-500/10 hover:border-orange-500/20",
    icon: (
      <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
      </svg>
    ),
  },
] as const;

export default function QuickActionsClient() {
  const [editor, setEditor] = useState<EditorState>(null);
  const [creatingFile, setCreatingFile] = useState<"doc" | "sheet" | null>(null);

  async function createFile(type: "doc" | "sheet") {
    setCreatingFile(type);
    try {
      const res = await fetch("/api/admin/drive/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      if (!res.ok) throw new Error();
      const file = await res.json() as { id: string; name: string; mimeType: string };
      setEditor({ fileId: file.id, fileName: file.name, mimeType: file.mimeType });
    } catch {
      alert("Could not create file. Make sure Google is connected in Integrations.");
    } finally {
      setCreatingFile(null);
    }
  }

  return (
    <>
      {editor && (
        <DocEditorModal
          fileId={editor.fileId}
          fileName={editor.fileName}
          fileType={detectType(editor.mimeType)}
          onClose={() => setEditor(null)}
        />
      )}

      <section>
        <h2 className="text-xs uppercase tracking-widest text-white/30 mb-3">Quick Actions</h2>
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
          {ACTIONS.map((item) => {
            const isCreating = "action" in item && creatingFile === item.action;
            const tileClass = `flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl border border-white/8 bg-white/3 ${item.bg} transition-colors aspect-square`;

            const content = (
              <>
                <span className={`${item.color} ${isCreating ? "opacity-40" : ""}`}>
                  {isCreating ? (
                    <svg className="animate-spin" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeOpacity=".2" />
                      <path d="M21 12a9 9 0 00-9-9" strokeLinecap="round" />
                    </svg>
                  ) : item.icon}
                </span>
                <span className="text-[10px] sm:text-xs text-white/50 font-medium leading-tight text-center">
                  {item.label}
                </span>
              </>
            );

            if ("action" in item) {
              const action = item.action;
              return (
                <button
                  key={item.label}
                  onClick={() => createFile(action)}
                  disabled={!!creatingFile}
                  className={tileClass}
                >
                  {content}
                </button>
              );
            }

            return (
              <Link key={item.label} href={item.href} className={tileClass}>
                {content}
              </Link>
            );
          })}
        </div>
      </section>
    </>
  );
}
