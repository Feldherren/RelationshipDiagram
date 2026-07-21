export const DB_NAME = "RelationshipDiagram";
export const DB_VERSION = 3;
export const FONT_STORE = "fonts";
export const AUTOSAVE_STORE = "autosave";
export const AUTOSAVE_KEY = "latest";
/** Preference / theme wallpaper data URLs (keyed by string). */
export const WALLPAPERS_STORE = "wallpapers";

export function openDiagramDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(FONT_STORE)) {
        db.createObjectStore(FONT_STORE, { keyPath: "family" });
      }
      if (!db.objectStoreNames.contains(AUTOSAVE_STORE)) {
        db.createObjectStore(AUTOSAVE_STORE);
      }
      if (!db.objectStoreNames.contains(WALLPAPERS_STORE)) {
        db.createObjectStore(WALLPAPERS_STORE);
      }
    };
  });
}
