import type { LatLng, ScoutingPhoto } from "./types";

const DB_NAME = "riverside-rally-photos";
const STORE_NAME = "photos";
const DB_VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is not available in this browser."));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function savePhoto(photo: ScoutingPhoto): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(photo);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function getPhotosForDestination(destinationId: string): Promise<ScoutingPhoto[]> {
  const db = await openDb();
  const all = await new Promise<ScoutingPhoto[]>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => resolve(req.result as ScoutingPhoto[]);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return all.filter((p) => p.destinationId === destinationId);
}

export async function getAllPhotos(): Promise<ScoutingPhoto[]> {
  const db = await openDb();
  const all = await new Promise<ScoutingPhoto[]>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => resolve(req.result as ScoutingPhoto[]);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return all;
}

export async function deletePhoto(id: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export function makePhotoId(): string {
  return `photo-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export async function fileToPhoto(
  file: File,
  destinationId: string,
  caption: string | undefined,
  gps: LatLng | undefined,
): Promise<ScoutingPhoto> {
  return {
    id: makePhotoId(),
    destinationId,
    blob: file,
    caption,
    takenAt: new Date().toISOString(),
    gps,
  };
}
