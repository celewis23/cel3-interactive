"use client";

import { useState, useEffect, useCallback } from "react";
import { DateTime } from "luxon";

type PhotoAlbum = {
  id: string;
  title: string;
  productUrl: string;
  mediaItemsCount?: number;
  coverPhotoBaseUrl?: string;
};

type MediaItem = {
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

export default function PhotosClient() {
  const [albums, setAlbums] = useState<PhotoAlbum[]>([]);
  const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(null);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [nextPageToken, setNextPageToken] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    async function fetchAlbums() {
      try {
        const res = await fetch("/api/admin/photos/albums");
        if (!res.ok) throw new Error("Failed to load albums");
        const data = await res.json();
        setAlbums(data.albums ?? []);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    }
    fetchAlbums();
  }, []);

  const fetchMedia = useCallback(async (albumId: string | null, pageToken?: string, append = false) => {
    setLoadingMedia(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (albumId) params.set("albumId", albumId);
      if (pageToken) params.set("pageToken", pageToken);
      params.set("pageSize", "50");
      const res = await fetch(`/api/admin/photos/media?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load photos");
      const data = await res.json();
      setMediaItems((prev) => (append ? [...prev, ...(data.mediaItems ?? [])] : (data.mediaItems ?? [])));
      setNextPageToken(data.nextPageToken);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoadingMedia(false);
    }
  }, []);

  useEffect(() => {
    fetchMedia(selectedAlbumId);
  }, [selectedAlbumId, fetchMedia]);

  function selectAlbum(albumId: string | null) {
    setSelectedAlbumId(albumId);
    setMediaItems([]);
    setNextPageToken(undefined);
  }

  const lightboxItem = lightboxIndex !== null ? mediaItems[lightboxIndex] : null;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-white">Photos</h1>
          {mediaItems.length > 0 && (
            <p className="text-sm text-white/40 mt-0.5">{mediaItems.length} items</p>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Album selector */}
      {!loading && (
        <div className="mb-6 overflow-x-auto pb-2">
          <div className="flex gap-3 min-w-max">
            <button
              onClick={() => selectAlbum(null)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm border transition-colors flex-shrink-0 ${
                selectedAlbumId === null
                  ? "bg-sky-500/15 border-sky-500/30 text-sky-400"
                  : "bg-white/3 border-white/8 text-white/60 hover:text-white hover:bg-white/8"
              }`}
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" className="flex-shrink-0">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
              </svg>
              All Photos
            </button>
            {albums.map((album) => (
              <button
                key={album.id}
                onClick={() => selectAlbum(album.id)}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm border transition-colors flex-shrink-0 ${
                  selectedAlbumId === album.id
                    ? "bg-sky-500/15 border-sky-500/30 text-sky-400"
                    : "bg-white/3 border-white/8 text-white/60 hover:text-white hover:bg-white/8"
                }`}
              >
                {album.coverPhotoBaseUrl && (
                  <img
                    src={`${album.coverPhotoBaseUrl}=w48-h48-c`}
                    alt=""
                    className="w-8 h-8 rounded-lg object-cover"
                  />
                )}
                <div className="text-left">
                  <div className="font-medium leading-tight">{album.title}</div>
                  {album.mediaItemsCount && (
                    <div className="text-xs opacity-60 mt-0.5">{album.mediaItemsCount} items</div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Photo grid */}
      {loadingMedia && mediaItems.length === 0 ? (
        <div className="columns-2 sm:columns-3 lg:columns-4 gap-2">
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="mb-2 break-inside-avoid rounded-xl bg-white/5 animate-pulse"
              style={{ height: `${160 + (i % 3) * 60}px` }}
            />
          ))}
        </div>
      ) : mediaItems.length === 0 && !loadingMedia ? (
        <div className="py-16 text-center text-white/30 text-sm">
          No photos found
        </div>
      ) : (
        <div className="columns-2 sm:columns-3 lg:columns-4 gap-2">
          {mediaItems.map((item, idx) => (
            <div key={item.id} className="mb-2 break-inside-avoid group relative cursor-pointer" onClick={() => setLightboxIndex(idx)}>
              <img
                src={`${item.baseUrl}=w400-h400`}
                alt={item.filename}
                className="w-full rounded-xl object-cover transition-opacity group-hover:opacity-90"
                loading="lazy"
              />
              <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity bg-black/30 flex items-end p-2">
                <span className="text-xs text-white/80 leading-tight">
                  {item.mediaMetadata?.creationTime
                    ? DateTime.fromISO(item.mediaMetadata.creationTime).toFormat("MMM d, yyyy")
                    : ""}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Load more */}
      {nextPageToken && !loadingMedia && (
        <div className="mt-6 flex justify-center">
          <button
            onClick={() => fetchMedia(selectedAlbumId, nextPageToken, true)}
            className="px-4 py-2 rounded-xl text-sm text-white/60 hover:text-white bg-white/5 hover:bg-white/10 border border-white/8 transition-colors"
          >
            Load more
          </button>
        </div>
      )}

      {/* Lightbox */}
      {lightboxItem && lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setLightboxIndex(null)}
        >
          <button
            className="absolute top-4 right-4 text-white/60 hover:text-white p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors z-10"
            onClick={() => setLightboxIndex(null)}
          >
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Prev */}
          {lightboxIndex > 0 && (
            <button
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors z-10"
              onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex - 1); }}
            >
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
          )}

          {/* Next */}
          {lightboxIndex < mediaItems.length - 1 && (
            <button
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors z-10"
              onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex + 1); }}
            >
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          )}

          <img
            src={`${lightboxItem.baseUrl}=w1200`}
            alt={lightboxItem.filename}
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
