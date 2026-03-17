"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useMemo,
  useState,
} from "react";

type CaseStudyGalleryContextValue = {
  title: string;
  galleryImages: string[];
  selectedImage: string | null;
  setSelectedImage: (url: string) => void;
};

const CaseStudyGalleryContext = createContext<CaseStudyGalleryContextValue | null>(null);

function useCaseStudyGallery() {
  const context = useContext(CaseStudyGalleryContext);

  if (!context) {
    throw new Error("CaseStudyGallery components must be used within the provider.");
  }

  return context;
}

type ProviderProps = {
  title: string;
  galleryImages: string[];
  children: ReactNode;
};

export function CaseStudyGalleryProvider({
  title,
  galleryImages,
  children,
}: ProviderProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const value = useMemo(
    () => ({
      title,
      galleryImages,
      selectedImage,
      setSelectedImage,
    }),
    [galleryImages, selectedImage, title]
  );

  return (
    <CaseStudyGalleryContext.Provider value={value}>
      {children}
    </CaseStudyGalleryContext.Provider>
  );
}

export function CaseStudyGalleryPreview() {
  const { selectedImage, title } = useCaseStudyGallery();

  if (!selectedImage) return null;

  return (
    <div className="mt-8 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
      <div className="bg-black/40">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={selectedImage}
          alt={`${title} preview`}
          className="aspect-[16/10] h-full w-full object-cover"
        />
      </div>
    </div>
  );
}

export function CaseStudyGalleryThumbnails() {
  const { galleryImages, selectedImage, setSelectedImage, title } = useCaseStudyGallery();

  if (!galleryImages.length) {
    return (
      <div className="col-span-2 text-sm text-white/60">
        Add gallery images in Sanity to show key screens.
      </div>
    );
  }

  return (
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
  );
}
