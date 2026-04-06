import { google } from "googleapis";
import { getAuthenticatedClient } from "@/lib/gmail/client";

export const DOC_MIME = "application/vnd.google-apps.document";
export const SHEET_MIME = "application/vnd.google-apps.spreadsheet";

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

const ALL_DRIVE_LIST_OPTIONS = {
  includeItemsFromAllDrives: true,
  supportsAllDrives: true,
} as const;

const ALL_DRIVE_MUTATION_OPTIONS = {
  supportsAllDrives: true,
} as const;

export function normalizeDriveId(value?: string | null): string | undefined {
  const input = value?.trim();
  if (!input) return undefined;
  if (input === "root") return input;
  if (!input.includes("/") && !input.includes("?")) return input;

  try {
    const url = new URL(input);
    const idParam = url.searchParams.get("id")?.trim();
    if (idParam) return idParam;

    const pathMatch = url.pathname.match(
      /\/(?:drive\/(?:u\/\d+\/)?folders|folders|file\/d)\/([^/]+)/
    );
    if (pathMatch?.[1]) return pathMatch[1];
  } catch {
    return input;
  }

  return input;
}

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
  search?: string;
  foldersOnly?: boolean;
}): Promise<{ files: DriveFile[]; nextPageToken?: string }> {
  const auth = await getAuthenticatedClient();
  if (!auth) throw new Error("Not authenticated with Google");

  const drive = google.drive({ version: "v3", auth: auth.oauth2Client });

  let q: string;
  if (opts?.search) {
    q = `fullText contains '${opts.search.replace(/'/g, "\\'")}' and trashed = false`;
    if (opts?.foldersOnly) q += ` and mimeType = '${FOLDER_MIME}'`;
  } else {
    const folderId = normalizeDriveId(opts?.folderId) ?? "root";
    q = `'${folderId}' in parents and trashed = false`;
    if (opts?.foldersOnly) q += ` and mimeType = '${FOLDER_MIME}'`;
  }

  const res = await drive.files.list({
    q,
    orderBy: opts?.search ? "modifiedTime desc" : "folder,name",
    pageSize: opts?.pageSize ?? 50,
    pageToken: opts?.pageToken,
    fields:
      "nextPageToken, files(id, name, mimeType, size, modifiedTime, thumbnailLink, webViewLink, webContentLink, parents, iconLink)",
    ...ALL_DRIVE_LIST_OPTIONS,
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
    fileId: normalizeDriveId(fileId) ?? fileId,
    fields:
      "id, name, mimeType, size, modifiedTime, thumbnailLink, webViewLink, webContentLink, parents, iconLink",
    ...ALL_DRIVE_MUTATION_OPTIONS,
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
      parents: normalizeDriveId(parentId) ? [normalizeDriveId(parentId)!] : undefined,
    },
    fields:
      "id, name, mimeType, size, modifiedTime, thumbnailLink, webViewLink, webContentLink, parents, iconLink",
    ...ALL_DRIVE_MUTATION_OPTIONS,
  });

  return mapFile(res.data);
}

export async function deleteFile(fileId: string): Promise<void> {
  const auth = await getAuthenticatedClient();
  if (!auth) throw new Error("Not authenticated with Google");

  const drive = google.drive({ version: "v3", auth: auth.oauth2Client });
  await drive.files.delete({
    fileId: normalizeDriveId(fileId) ?? fileId,
    ...ALL_DRIVE_MUTATION_OPTIONS,
  });
}

export async function createGoogleDoc(
  name: string,
  parentId?: string
): Promise<DriveFile> {
  const auth = await getAuthenticatedClient();
  if (!auth) throw new Error("Not authenticated with Google");

  const drive = google.drive({ version: "v3", auth: auth.oauth2Client });
  const res = await drive.files.create({
    requestBody: {
      name,
      mimeType: DOC_MIME,
      parents: normalizeDriveId(parentId) ? [normalizeDriveId(parentId)!] : undefined,
    },
    fields:
      "id, name, mimeType, size, modifiedTime, thumbnailLink, webViewLink, webContentLink, parents, iconLink",
    ...ALL_DRIVE_MUTATION_OPTIONS,
  });
  return mapFile(res.data);
}

export async function createGoogleSheet(
  name: string,
  parentId?: string
): Promise<DriveFile> {
  const auth = await getAuthenticatedClient();
  if (!auth) throw new Error("Not authenticated with Google");

  const drive = google.drive({ version: "v3", auth: auth.oauth2Client });
  const res = await drive.files.create({
    requestBody: {
      name,
      mimeType: SHEET_MIME,
      parents: normalizeDriveId(parentId) ? [normalizeDriveId(parentId)!] : undefined,
    },
    fields:
      "id, name, mimeType, size, modifiedTime, thumbnailLink, webViewLink, webContentLink, parents, iconLink",
    ...ALL_DRIVE_MUTATION_OPTIONS,
  });
  return mapFile(res.data);
}

export async function renameFile(
  fileId: string,
  name: string
): Promise<DriveFile> {
  const auth = await getAuthenticatedClient();
  if (!auth) throw new Error("Not authenticated with Google");

  const drive = google.drive({ version: "v3", auth: auth.oauth2Client });
  const res = await drive.files.update({
    fileId: normalizeDriveId(fileId) ?? fileId,
    requestBody: { name },
    fields:
      "id, name, mimeType, size, modifiedTime, thumbnailLink, webViewLink, webContentLink, parents, iconLink",
    ...ALL_DRIVE_MUTATION_OPTIONS,
  });
  return mapFile(res.data);
}

export async function exportDriveFile(
  fileId: string,
  exportMimeType: string
): Promise<{ data: Buffer; name: string }> {
  const auth = await getAuthenticatedClient();
  if (!auth) throw new Error("Not authenticated with Google");

  const drive = google.drive({ version: "v3", auth: auth.oauth2Client });
  const normalizedFileId = normalizeDriveId(fileId) ?? fileId;
  const meta = await drive.files.get({
    fileId: normalizedFileId,
    fields: "name",
    ...ALL_DRIVE_MUTATION_OPTIONS,
  });
  const res = await drive.files.export(
    { fileId: normalizedFileId, mimeType: exportMimeType },
    { responseType: "arraybuffer" }
  );
  return {
    data: Buffer.from(res.data as ArrayBuffer),
    name: meta.data.name ?? "document",
  };
}

export async function moveFile(
  fileId: string,
  newParentId: string,
  oldParentId: string
): Promise<DriveFile> {
  const auth = await getAuthenticatedClient();
  if (!auth) throw new Error("Not authenticated with Google");

  const drive = google.drive({ version: "v3", auth: auth.oauth2Client });
  const normalizedFileId = normalizeDriveId(fileId) ?? fileId;
  const normalizedNewParentId = normalizeDriveId(newParentId) ?? newParentId;
  const normalizedOldParentId = normalizeDriveId(oldParentId) ?? oldParentId;
  const res = await drive.files.update({
    fileId: normalizedFileId,
    addParents: normalizedNewParentId,
    removeParents: normalizedOldParentId,
    fields:
      "id, name, mimeType, size, modifiedTime, thumbnailLink, webViewLink, webContentLink, parents, iconLink",
    ...ALL_DRIVE_MUTATION_OPTIONS,
  });
  return mapFile(res.data);
}

export async function copyFile(
  fileId: string,
  name?: string,
  parentId?: string
): Promise<DriveFile> {
  const auth = await getAuthenticatedClient();
  if (!auth) throw new Error("Not authenticated with Google");

  const drive = google.drive({ version: "v3", auth: auth.oauth2Client });
  const res = await drive.files.copy({
    fileId: normalizeDriveId(fileId) ?? fileId,
    requestBody: {
      name: name ?? undefined,
      parents: normalizeDriveId(parentId) ? [normalizeDriveId(parentId)!] : undefined,
    },
    fields:
      "id, name, mimeType, size, modifiedTime, thumbnailLink, webViewLink, webContentLink, parents, iconLink",
    ...ALL_DRIVE_MUTATION_OPTIONS,
  });
  return mapFile(res.data);
}

export async function downloadFileContent(
  fileId: string
): Promise<{ data: Buffer; name: string; mimeType: string }> {
  const auth = await getAuthenticatedClient();
  if (!auth) throw new Error("Not authenticated with Google");

  const drive = google.drive({ version: "v3", auth: auth.oauth2Client });
  const normalizedFileId = normalizeDriveId(fileId) ?? fileId;
  const meta = await drive.files.get({
    fileId: normalizedFileId,
    fields: "name, mimeType",
    ...ALL_DRIVE_MUTATION_OPTIONS,
  });
  const res = await drive.files.get(
    { fileId: normalizedFileId, alt: "media", ...ALL_DRIVE_MUTATION_OPTIONS },
    { responseType: "arraybuffer" }
  );
  return {
    data: Buffer.from(res.data as ArrayBuffer),
    name: meta.data.name ?? "file",
    mimeType: meta.data.mimeType ?? "application/octet-stream",
  };
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
  const parentId = normalizeDriveId(params.parentId);

  const res = await drive.files.create({
    requestBody: {
      name: params.name,
      parents: parentId ? [parentId] : undefined,
    },
    media: {
      mimeType: params.mimeType,
      body: Readable.from(params.data),
    },
    fields:
      "id, name, mimeType, size, modifiedTime, thumbnailLink, webViewLink, webContentLink, parents, iconLink",
    ...ALL_DRIVE_MUTATION_OPTIONS,
  });

  return mapFile(res.data);
}
