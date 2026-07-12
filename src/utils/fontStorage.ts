const DB_NAME = "RelationshipDiagram";
const DB_VERSION = 1;
const FONT_STORE = "fonts";

interface StoredFont {
  family: string;
  data: ArrayBuffer;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(FONT_STORE)) {
        db.createObjectStore(FONT_STORE, { keyPath: "family" });
      }
    };
  });
}

export async function saveFontToStorage(
  family: string,
  data: ArrayBuffer,
): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(FONT_STORE, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.objectStore(FONT_STORE).put({ family, data } satisfies StoredFont);
  });
}

export async function loadFontFromStorage(
  family: string,
): Promise<ArrayBuffer | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(FONT_STORE, "readonly");
    tx.onerror = () => reject(tx.error);
    const request = tx.objectStore(FONT_STORE).get(family);
    request.onsuccess = () => {
      const row = request.result as StoredFont | undefined;
      resolve(row?.data ?? null);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function listStoredFontFamilies(): Promise<string[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(FONT_STORE, "readonly");
    tx.onerror = () => reject(tx.error);
    const request = tx.objectStore(FONT_STORE).getAllKeys();
    request.onsuccess = () => resolve(request.result as string[]);
    request.onerror = () => reject(request.error);
  });
}

export async function removeFontFromStorage(family: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(FONT_STORE, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.objectStore(FONT_STORE).delete(family);
  });
}
