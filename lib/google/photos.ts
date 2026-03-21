import { google } from "googleapis";
import { getAuthenticatedClient } from "@/lib/gmail/client";

export type PhotoAlbum = {
  id: string;
  title: string;
  mediaItemsCount?: number;
};

export type MediaItem = {
  id: string;
  baseUrl: string;
  mimeType: string;
  filename: string;
  mediaMetadata: {
    creationTime: string;
    width?: string;
    height?: string;
  };
};

const IMAGE_Q = "mimeType contains 'image/' and trashed = false";

export async function listAlbums(
  pageToken?: string
): Promise<{ albums: PhotoAlbum[]; nextPageToken?: string }> {
  const auth = await getAuthenticatedClient();
  if (!auth) throw new Error("Not authenticated with Google");

  const drive = google.drive({ version: "v3", auth: auth.oauth2Client });
  const res = await drive.files.list({
    q: "mimeType = 'application/vnd.google-apps.folder' and trashed = false",
    fields: "nextPageToken, files(id, name)",
    pageSize: 50,
    ...(pageToken ? { pageToken } : {}),
  });

  return {
    albums: (res.data.files ?? []).map((f) => ({ id: f.id!, title: f.name! })),
    nextPageToken: res.data.nextPageToken ?? undefined,
  };
}

export async function listMediaItems(opts?: {
  albumId?: string;
  pageToken?: string;
  pageSize?: number;
}): Promise<{ mediaItems: MediaItem[]; nextPageToken?: string }> {
  const auth = await getAuthenticatedClient();
  if (!auth) throw new Error("Not authenticated with Google");

  const drive = google.drive({ version: "v3", auth: auth.oauth2Client });
  const pageSize = opts?.pageSize ?? 50;

  let q = IMAGE_Q;
  if (opts?.albumId) q += ` and '${opts.albumId}' in parents`;

  const res = await drive.files.list({
    q,
    fields: "nextPageToken, files(id, name, mimeType, createdTime, imageMediaMetadata)",
    pageSize,
    orderBy: "createdTime desc",
    ...(opts?.pageToken ? { pageToken: opts.pageToken } : {}),
  });

  return {
    mediaItems: (res.data.files ?? []).map((f) => ({
      id: f.id!,
      baseUrl: `/api/admin/photos/file/${f.id}`,
      mimeType: f.mimeType ?? "image/jpeg",
      filename: f.name ?? "",
      mediaMetadata: {
        creationTime: f.createdTime ?? new Date().toISOString(),
        width: f.imageMediaMetadata?.width ? String(f.imageMediaMetadata.width) : undefined,
        height: f.imageMediaMetadata?.height ? String(f.imageMediaMetadata.height) : undefined,
      },
    })),
    nextPageToken: res.data.nextPageToken ?? undefined,
  };
}
