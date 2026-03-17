"use client";

import { useState } from "react";

type CaseStudyGalleryProps = {
  title: string;
  previewImage?: string | null;
  galleryImages: string[];
};

export default function CaseStudyGallery({
  title,
  previewImage,
  galleryImages,
}: CaseStudyGalleryProps) {
  const initialImage = previewImage ?? galleryImages[0] ?? null;
  const [selectedImage, setSelectedImage] = useState(initialImage);

  return (
    <>
      <div className="mt-8 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div className="text-xs tracking-[0.25em] uppercase text-white/55">Preview</div>
          <div className="text-xs text-white/40">Select a gallery image</div>
        </div>

        <div className="bg-black/40">
          {selectedImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={selectedImage}
              alt={`${title} preview`}
              className="aspect-[16/10] h-full w-full object-cover"
            />
          ) : (
            <div className="flex aspect-[16/10] items-center justify-center text-sm text-white/45">
              No preview image available.
            </div>
          )}
        </div>
      </div>

      {!!galleryImages.length && (
        <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="text-xs tracking-[0.25em] uppercase text-white/55">Gallery</div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            {galleryImages.slice(0, 6).map((url, i) => {
              const isActive = url === selectedImage;

              return (
                <button
                  key={url}
                  type="button"
                  onClick={() => setSelectedImage(url)}
                  className={`overflow-hidden rounded-xl border bg-black/40 text-left transition-colors ${
                    isActive
                      ? "border-[rgb(var(--accent))] ring-1 ring-[rgb(var(--accent))]/60"
                      : "border-white/10 hover:border-white/25"
                  }`}
                  aria-label={`Show ${title} gallery image ${i + 1}`}
                  aria-pressed={isActive}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={`${title} ${i + 1}`} className="aspect-[4/3] h-full w-full object-cover" />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
