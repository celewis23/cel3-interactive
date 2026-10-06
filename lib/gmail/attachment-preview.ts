export function previewKind(mime: string): "image" | "pdf" | "text" | "audio" | "video" | "unsupported" {
  if (/^image\/(png|jpeg|gif|webp|avif|bmp)$/i.test(mime)) return "image";
  if (mime === "application/pdf") return "pdf";
  if (/^text\/(plain|csv|markdown)$/.test(mime) || /^(application\/json|application\/xml|text\/xml)$/.test(mime)) return "text";
  if (/^audio\/(mpeg|mp4|ogg|wav|x-wav|webm)$/.test(mime)) return "audio";
  if (/^video\/(mp4|webm|ogg|quicktime)$/.test(mime)) return "video";
  return "unsupported";
}

export function attachmentHeaders(filename: string, mimeType: string, inline: boolean, size: number) {
  const fallback = filename.replace(/[^\w .()-]/g, "_") || "attachment";
  const encoded = encodeURIComponent(filename.replace(/[\r\n\0]/g, "")).replace(/['()*]/g, c => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
  const canPreview = previewKind(mimeType) !== "unsupported";
  return {
    "Content-Type": canPreview ? mimeType : "application/octet-stream",
    "Content-Disposition": `${inline && canPreview ? "inline" : "attachment"}; filename="${fallback}"; filename*=UTF-8''${encoded}`,
    "Content-Length": String(size),
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "sandbox; default-src 'none'",
    "Cache-Control": "private, no-store",
  };
}
