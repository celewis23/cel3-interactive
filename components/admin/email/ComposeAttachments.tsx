"use client";

import { useRef, useState } from "react";
import { attachedFilesFrom, type AttachedFile } from "./compose-files";

export default function ComposeAttachments({ files, onChange, disabled = false }: {
  files: AttachedFile[]; onChange: (files: AttachedFile[]) => void; disabled?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  return <div className={`my-2 rounded-xl border border-dashed p-3 text-xs ${over ? "border-sky-400 bg-sky-400/10" : "border-white/15 text-white/55"}`}
    data-testid="attachment-dropzone"
    onDragOver={event => { if (event.dataTransfer.types.includes("Files")) { event.preventDefault(); event.stopPropagation(); if (!disabled) setOver(true); } }}
    onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setOver(false); }}
    onDrop={event => { event.preventDefault(); event.stopPropagation(); setOver(false); if (!disabled) onChange([...files, ...attachedFilesFrom(Array.from(event.dataTransfer.files))]); }}>
    <button type="button" disabled={disabled} onClick={() => input.current?.click()} className="font-medium text-sky-300 hover:text-sky-200 disabled:opacity-40">Attach files</button>
    <span> or drop here to send as attachments. Drop images into the message to place them inline.</span>
    <input ref={input} aria-label="Choose attachments" type="file" multiple hidden disabled={disabled} onChange={e => { onChange([...files, ...attachedFilesFrom(Array.from(e.target.files ?? []))]); e.target.value = ""; }} />
    {files.length > 0 && <ul className="mt-2 flex flex-wrap gap-2">{files.map(file => <li key={file.id} className="flex min-w-0 items-center gap-2 rounded-lg border border-white/10 bg-black px-2 py-1.5">
      <span className="max-w-48 truncate" title={file.name}>{file.name}</span><span>{(file.size / 1024 / 1024).toFixed(1)} MB</span>
      <button type="button" disabled={disabled} aria-label={`Remove ${file.name}`} onClick={() => onChange(files.filter(f => f.id !== file.id))} className="px-1 text-white/70 hover:text-red-300">×</button>
    </li>)}</ul>}
  </div>;
}
