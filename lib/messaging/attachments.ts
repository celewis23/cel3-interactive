export const MAX_ATTACHMENT_BYTES = 50 * 1024 * 1024;
export const MAX_ATTACHMENTS_PER_MESSAGE = 8;

const ALLOWED_ATTACHMENT_TYPES = new Set([
  "image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml", "image/avif",
  "audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav", "audio/mp4", "audio/aac", "audio/ogg", "audio/webm", "audio/x-m4a",
  "video/mp4", "video/webm", "video/quicktime",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/zip", "application/x-zip-compressed",
  "text/plain", "text/csv",
]);

const EXTENSION_TYPES: Record<string, string> = {
  pdf: 'application/pdf', doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  txt: 'text/plain', csv: 'text/csv', zip: 'application/zip',
};
export const MESSAGE_ATTACHMENT_ACCEPT = [...ALLOWED_ATTACHMENT_TYPES, ...Object.keys(EXTENSION_TYPES).map(ext => '.' + ext)].join(',');
export function attachmentContentType(name: string, type: string) {
  if (type && type !== 'application/octet-stream') return type;
  return EXTENSION_TYPES[name.split('.').pop()?.toLowerCase() ?? ''] || type || 'application/octet-stream';
}
export function attachmentError(file: { fileName: string; contentType: string; size: number }): string | null {
  if (!file.fileName || file.size <= 0) return 'Attached files cannot be empty';
  if (file.size > MAX_ATTACHMENT_BYTES) return file.fileName + ' is too large. Max file size is 50 MB';
  if (!ALLOWED_ATTACHMENT_TYPES.has(file.contentType)) return 'File type not allowed: ' + (file.contentType || 'unknown');
  return null;
}
