import sharp from "sharp";

/** Detect TIFF bytes even when a sender labels the attachment as a JPEG. */
export async function renderImagePreview(data: Buffer, mimeType: string) {
  const signature = data.subarray(0, 4).toString("hex");
  if (!["49492a00", "4d4d002a", "49492b00", "4d4d002b"].includes(signature)) {
    return { data, mimeType, converted: false };
  }
  // Decode only raster TIFFs, bound memory use and render the first page.
  // Downloads and Drive saves continue to use the original bytes.
  const preview = await sharp(data, { limitInputPixels: 40_000_000, pages: 1 })
    .rotate()
    .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 90, effort: 3 })
    .toBuffer();
  return { data: preview, mimeType: "image/webp", converted: true };
}
