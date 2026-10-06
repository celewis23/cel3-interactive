// Compatibility name for existing routes; writes are atomic Postgres transactions.
import { documentStore } from "@/lib/documents/store.mjs";
import { uploadAsset } from "@/lib/documents/assets";

export const sanityWriteClient = { ...documentStore, assets: { upload: uploadAsset } };
