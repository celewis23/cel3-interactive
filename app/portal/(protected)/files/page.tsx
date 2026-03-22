"use client";
import { useState, useEffect, useRef } from "react";

type DriveFile = {
  id: string;
  name: string;
  mimeType: string;
  size: number | null;
  modifiedTime: string;
  webViewLink: string | null;
  webContentLink: string | null;
  iconLink: string | null;
};

function formatBytes(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function PortalFilesPage() {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [connected, setConnected] = useState(true);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/portal/files");
      const data = await res.json();
      setFiles(data.files ?? []);
      setConnected(data.connected ?? false);
    } catch {
      setConnected(false);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/portal/files", { method: "POST", body: formData });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Upload failed");
      }
      await load();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Files</h1>
          <p className="text-sm text-white/40 mt-1">Your shared documents</p>
        </div>
        {connected && (
          <div>
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleUpload}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className={`px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-black font-semibold text-sm transition-colors cursor-pointer ${uploading ? "opacity-40 pointer-events-none" : ""}`}
            >
              {uploading ? "Uploading…" : "Upload file"}
            </label>
          </div>
        )}
      </div>

      {uploadError && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl p-3">
          {uploadError}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col gap-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-14 bg-white/3 border border-white/8 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : !connected ? (
        <div className="bg-white/3 border border-white/8 rounded-2xl p-8 text-center">
          <p className="text-white/40 text-sm">
            No file storage configured for your account. Contact us to get a shared Drive folder set up.
          </p>
        </div>
      ) : files.length === 0 ? (
        <div className="bg-white/3 border border-white/8 rounded-2xl p-8 text-center">
          <p className="text-white/40 text-sm mb-3">No files yet.</p>
          <label
            htmlFor="file-upload"
            className="text-xs text-sky-400 hover:text-sky-300 cursor-pointer transition-colors"
          >
            Upload your first file →
          </label>
        </div>
      ) : (
        <div className="bg-white/3 border border-white/8 rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/8">
                <th className="px-4 py-3 text-left text-xs text-white/40 font-medium">Name</th>
                <th className="px-4 py-3 text-left text-xs text-white/40 font-medium hidden sm:table-cell">Modified</th>
                <th className="px-4 py-3 text-right text-xs text-white/40 font-medium hidden sm:table-cell">Size</th>
                <th className="px-4 py-3 text-right text-xs text-white/40 font-medium">Download</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {files.map((f) => (
                <tr key={f.id} className="hover:bg-white/2 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {f.iconLink && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={f.iconLink} alt="" width={16} height={16} className="flex-shrink-0" />
                      )}
                      {f.webViewLink ? (
                        <a
                          href={f.webViewLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-white hover:text-sky-400 transition-colors truncate max-w-[200px]"
                        >
                          {f.name}
                        </a>
                      ) : (
                        <span className="text-sm text-white truncate max-w-[200px]">{f.name}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className="text-xs text-white/40">
                      {new Date(f.modifiedTime).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right hidden sm:table-cell">
                    <span className="text-xs text-white/40">{formatBytes(f.size)}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {f.webContentLink && (
                      <a
                        href={f.webContentLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-white/40 hover:text-white transition-colors"
                      >
                        ↓
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
