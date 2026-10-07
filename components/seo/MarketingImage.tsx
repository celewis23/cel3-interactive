import Image, { type ImageProps } from "next/image";

// Optimize public, local portfolio assets. Authenticated API images and external
// URLs keep their original delivery rather than passing through a public cache.
export default function MarketingImage({ src, ...props }: Omit<ImageProps, "src"> & { src: string }) {
  const isPublicAsset = src.startsWith("/") && !src.startsWith("//") && !src.startsWith("/api/");
  return <Image {...props} src={src} unoptimized={!isPublicAsset} />;
}
