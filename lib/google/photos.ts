import { getAuthenticatedClient } from "@/lib/gmail/client";

const BASE_URL = "https://photoslibrary.googleapis.com/v1";

export type PhotoAlbum = {
  id: string;
  title: string;
  productUrl: string;
  mediaItemsCount?: number;
  coverPhotoBaseUrl?: string;
};

export type MediaItem = {
  id: string;
  productUrl: string;
  baseUrl: string;
  mimeType: string;
  filename: string;
  mediaMetadata: {
    creationTime: string;
    width?: string;
    height?: string;
  };
};

async function getAccessToken(): Promise<string> {
  const auth = await getAuthenticatedClient();
  if (!auth) throw new Error("Not authenticated with Google");
  const token = auth.oauth2Client.credentials.access_token;
  if (!token) throw new Error("No access token available");
  return token;
}

export async function listAlbums(
  pageToken?: string
): Promise<{ albums: PhotoAlbum[]; nextPageToken?: string }> {
  const token = await getAccessToken();
  const url = new URL(`${BASE_URL}/albums`);
  url.searchParams.set("pageSize", "50");
  if (pageToken) url.searchParams.set("pageToken", pageToken);

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Photos API error: ${res.status}`);

  const data = await res.json();
  return {
    albums: (data.albums ?? []) as PhotoAlbum[],
    nextPageToken: data.nextPageToken,
  };
}

export async function listMediaItems(opts?: {
  albumId?: string;
  pageToken?: string;
  pageSize?: number;
}): Promise<{ mediaItems: MediaItem[]; nextPageToken?: string }> {
  const token = await getAccessToken();
  const pageSize = opts?.pageSize ?? 50;

  if (opts?.albumId) {
    const res = await fetch(`${BASE_URL}/mediaItems:search`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        albumId: opts.albumId,
        pageSize,
        pageToken: opts.pageToken,
      }),
    });
    if (!res.ok) throw new Error(`Photos API error: ${res.status}`);
    const data = await res.json();
    return {
      mediaItems: (data.mediaItems ?? []) as MediaItem[],
      nextPageToken: data.nextPageToken,
    };
  }

  const url = new URL(`${BASE_URL}/mediaItems`);
  url.searchParams.set("pageSize", String(pageSize));
  if (opts?.pageToken) url.searchParams.set("pageToken", opts.pageToken);

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Photos API error: ${res.status}`);

  const data = await res.json();
  return {
    mediaItems: (data.mediaItems ?? []) as MediaItem[],
    nextPageToken: data.nextPageToken,
  };
}
