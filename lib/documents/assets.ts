import { randomBytes } from "node:crypto";
import { Readable } from "node:stream";
import { documentStore } from "./store.mjs";

export type StoredAsset = {
  _id: string;
  _type: "imageAsset" | "fileAsset";
  url: string;
  driveFileId: string;
  mimeType: string;
  originalFilename: string;
  size: number;
};

export async function mediaDrive() {
  const [{ google }, { getAuthenticatedClient }] = await Promise.all([
    import("googleapis"), import("@/lib/gmail/client"),
  ]);
  const auth = await getAuthenticatedClient();
  if (!auth) throw new Error("Connect Google Workspace before uploading files");
  return google.drive({ version: "v3", auth: auth.oauth2Client });
}

export async function uploadAsset(kind: "image" | "file", buffer: Buffer, options: { filename?: string; contentType?: string } = {}): Promise<StoredAsset> {
  if (!buffer.length || buffer.length > 200 * 1024 * 1024) throw new Error("File must be between 1 byte and 200 MB");
  const drive = await mediaDrive();
  // appProperties identify our storage without modifying user-created folders.
  const folders = await drive.files.list({
    q: "trashed = false and mimeType = 'application/vnd.google-apps.folder' and appProperties has { key='cel3MediaRoot' and value='v1' }",
    fields: "files(id)", pageSize: 1,
  });
  let folder = folders.data.files?.[0]?.id;
  if (!folder) {
    const created = await drive.files.create({ requestBody: {
      name: "CEL3 Backoffice Files", mimeType: "application/vnd.google-apps.folder", appProperties: { cel3MediaRoot: "v1" },
    }, fields: "id" });
    folder = created.data.id;
  }
  if (!folder) throw new Error("Could not create the backoffice file folder");
  const id = `media.${randomBytes(24).toString("hex")}`;
  const mimeType = options.contentType || "application/octet-stream";
  const filename = options.filename || "upload";
  const uploaded = await drive.files.create({
    requestBody: { name: filename, parents: [folder], appProperties: { cel3Asset: id } },
    media: { mimeType, body: Readable.from(buffer) }, fields: "id",
  });
  if (!uploaded.data.id) throw new Error("File upload did not return an ID");
  const origin = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.cel3interactive.com").replace(/\/$/, "");
  // Like the previous asset CDN, URLs are shareable capabilities. Drive itself
  // remains private; the random 192-bit identifier is required to retrieve a file.
  const asset: StoredAsset = { _id: id, _type: kind === "image" ? "imageAsset" : "fileAsset",
    url: `${origin}/api/media/${id}`, driveFileId: uploaded.data.id, mimeType,
    originalFilename: filename, size: buffer.length };
  try { await documentStore.create(asset); }
  catch (error) {
    await drive.files.delete({ fileId: uploaded.data.id }).catch(() => {});
    throw error;
  }
  return asset;
}
