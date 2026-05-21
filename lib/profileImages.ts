import { sanityWriteClient } from "@/lib/sanity.write";

const MAX_PROFILE_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_PROFILE_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);

export async function uploadProfileImage(file: File) {
  if (!file || file.size <= 0) throw new Error("Choose an image to upload");

  const mime = file.type || "application/octet-stream";
  if (!ALLOWED_PROFILE_IMAGE_TYPES.has(mime)) {
    throw new Error("Profile picture must be a JPEG, PNG, WebP, GIF, or AVIF image");
  }

  if (file.size > MAX_PROFILE_IMAGE_BYTES) {
    throw new Error("Profile picture must be 5 MB or smaller");
  }

  const uploaded = await sanityWriteClient.assets.upload("image", Buffer.from(await file.arrayBuffer()), {
    filename: file.name,
    contentType: mime,
  });

  return {
    assetId: uploaded._id,
    url: uploaded.url,
  };
}
