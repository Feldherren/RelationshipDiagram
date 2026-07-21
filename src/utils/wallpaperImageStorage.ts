import { WALLPAPERS_STORE, openDiagramDb } from "./diagramDb";

/** Active diagram-defaults wallpaper in app preferences. */
export const APPEARANCE_WALLPAPER_KEY = "appearance";

export function themeWallpaperKey(themeId: string): string {
  return `theme:${themeId}`;
}

export async function loadAllWallpapers(): Promise<Map<string, string>> {
  const db = await openDiagramDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(WALLPAPERS_STORE, "readonly");
    tx.onerror = () => reject(tx.error);
    const request = tx.objectStore(WALLPAPERS_STORE).openCursor();
    const result = new Map<string, string>();
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) {
        resolve(result);
        return;
      }
      if (typeof cursor.key === "string" && typeof cursor.value === "string") {
        result.set(cursor.key, cursor.value);
      }
      cursor.continue();
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Replace wallpaper rows to match `desired`.
 * Keys with null/empty values are deleted; other existing keys are removed.
 */
export async function syncWallpapers(
  desired: Map<string, string | null>,
): Promise<void> {
  const db = await openDiagramDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(WALLPAPERS_STORE, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    const store = tx.objectStore(WALLPAPERS_STORE);

    const keep = new Set<string>();
    for (const [key, dataUrl] of desired) {
      if (dataUrl) {
        keep.add(key);
        store.put(dataUrl, key);
      } else {
        store.delete(key);
      }
    }

    const cursorRequest = store.openCursor();
    cursorRequest.onsuccess = () => {
      const cursor = cursorRequest.result;
      if (!cursor) return;
      if (typeof cursor.key === "string" && !keep.has(cursor.key)) {
        cursor.delete();
      }
      cursor.continue();
    };
  });
}
