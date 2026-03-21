import { google } from "googleapis";
import { getAuthenticatedClient } from "@/lib/gmail/client";

export type DriveFile = {
  id: string;
  name: string;
  mimeType: string;
  size?: number;
  modifiedTime: string;
  thumbnailLink?: string;
  webViewLink?: string;
  webContentLink?: string;
  parents?: string[];
  isFolder: boolean;
  iconLink?: string;
};

export const FOLDER_MIME = "application/vnd.google-apps.folder";

function mapFile(f: {
  id?: string | null;
  name?: string | null;
  mimeType?: string | null;
  size?: string | null;
  modifiedTime?: string | null;
  thumbnailLink?: string | null;
  webViewLink?: string | null;
  webContentLink?: string | null;
  parents?: string[] | null;
  iconLink?: string | null;
}): DriveFile {
  return {
    id: f.id ?? "",
    name: f.name ?? "",
    mimeType: f.mimeType ?? "",
    size: f.size ? parseInt(f.size, 10) : undefined,
    modifiedTime: f.modifiedTime ?? "",
    thumbnailLink: f.thumbnailLink ?? undefined,
    webViewLink: f.webViewLink ?? undefined,
    webContentLink: f.webContentLink ?? undefined,
    parents: f.parents ?? undefined,
    isFolder: f.mimeType === FOLDER_MIME,
    iconLink: f.iconLink ?? undefined,
  };
}

export async function listFiles(opts?: {
  folderId?: string;
  pageToken?: string;
  pageSize?: number;
}): Promise<{ files: DriveFile[]; nextPageToken?: string }> {
  const auth = await getAuthenticatedClient();
  if (!auth) throw new Error("Not authenticated with Google");

  const drive = google.drive({ version: "v3", auth: auth.oauth2Client });
  const folderId = opts?.folderId ?? "root";

  const res = await drive.files.list({
    q: `'${folderId}' in parents and trashed = false`,
    orderBy: "folder,name",
    pageSize: opts?.pageSize ?? 50,
    pageToken: opts?.pageToken,
    fields:
      "nextPageToken, files(id, name, mimeType, size, modifiedTime, thumbnailLink, webViewLink, webContentLink, parents, iconLink)",
  });

  return {
    files: (res.data.files ?? []).map(mapFile),
    nextPageToken: res.data.nextPageToken ?? undefined,
  };
}

export async function getFileMeta(fileId: string): Promise<DriveFile> {
  const auth = await getAuthenticatedClient();
  if (!auth) throw new Error("Not authenticated with Google");

  const drive = google.drive({ version: "v3", auth: auth.oauth2Client });
  const res = await drive.files.get({
    fileId,
    fields:
      "id, name, mimeType, size, modifiedTime, thumbnailLink, webViewLink, webContentLink, parents, iconLink",
  });

  return mapFile(res.data);
}

export async function createFolder(
  name: string,
  parentId?: string
): Promise<DriveFile> {
  const auth = await getAuthenticatedClient();
  if (!auth) throw new Error("Not authenticated with Google");

  const drive = google.drive({ version: "v3", auth: auth.oauth2Client });
  const res = await drive.files.create({
    requestBody: {
      name,
      mimeType: FOLDER_MIME,
      parents: parentId ? [parentId] : undefined,
    },
    fields:
      "id, name, mimeType, size, modifiedTime, thumbnailLink, webViewLink, webContentLink, parents, iconLink",
  });

  return mapFile(res.data);
}

export async function deleteFile(fileId: string): Promise<void> {
  const auth = await getAuthenticatedClient();
  if (!auth) throw new Error("Not authenticated with Google");

  const drive = google.drive({ version: "v3", auth: auth.oauth2Client });
  await drive.files.delete({ fileId });
}

export async function uploadFile(params: {
  name: string;
  mimeType: string;
  data: Buffer;
  parentId?: string;
}): Promise<DriveFile> {
  const auth = await getAuthenticatedClient();
  if (!auth) throw new Error("Not authenticated with Google");

  const drive = google.drive({ version: "v3", auth: auth.oauth2Client });
  const { Readable } = await import("stream");

  const res = await drive.files.create({
    requestBody: {
      name: params.name,
      parents: params.parentId ? [params.parentId] : undefined,
    },
    media: {
      mimeType: params.mimeType,
      body: Readable.from(params.data),
    },
    fields:
      "id, name, mimeType, size, modifiedTime, thumbnailLink, webViewLink, webContentLink, parents, iconLink",
  });

  return mapFile(res.data);
}
