import type { Diagram } from "../models/types";
import { parseDiagram } from "./persistence";
import {
  AUTOSAVE_KEY,
  AUTOSAVE_STORE,
  openDiagramDb,
} from "./diagramDb";

export interface AutosaveSnapshot {
  schemaVersion: 1;
  savedAt: number;
  /** @deprecated Migrated into diagram.showGrid on load */
  showGrid?: boolean;
  diagram: Diagram;
}

export function createAutosaveSnapshot(diagram: Diagram): AutosaveSnapshot {
  return {
    schemaVersion: 1,
    savedAt: Date.now(),
    diagram,
  };
}

function parseAutosaveSnapshot(data: unknown): AutosaveSnapshot {
  const record = data as AutosaveSnapshot;
  if (record.schemaVersion !== 1 || !record.diagram) {
    throw new Error("Invalid autosave format");
  }

  let diagram = parseDiagram(JSON.stringify(record.diagram));

  if (diagram.showGrid === undefined && typeof record.showGrid === "boolean") {
    diagram = { ...diagram, showGrid: record.showGrid };
  }

  return {
    schemaVersion: 1,
    savedAt: record.savedAt ?? 0,
    diagram,
  };
}

export async function saveAutosave(snapshot: AutosaveSnapshot): Promise<void> {
  const db = await openDiagramDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(AUTOSAVE_STORE, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.objectStore(AUTOSAVE_STORE).put(snapshot, AUTOSAVE_KEY);
  });
}

export async function loadAutosave(): Promise<AutosaveSnapshot | null> {
  const db = await openDiagramDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(AUTOSAVE_STORE, "readonly");
    tx.onerror = () => reject(tx.error);
    const request = tx.objectStore(AUTOSAVE_STORE).get(AUTOSAVE_KEY);
    request.onsuccess = () => {
      if (!request.result) {
        resolve(null);
        return;
      }
      try {
        resolve(parseAutosaveSnapshot(request.result));
      } catch {
        resolve(null);
      }
    };
    request.onerror = () => reject(request.error);
  });
}

export async function clearAutosave(): Promise<void> {
  const db = await openDiagramDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(AUTOSAVE_STORE, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.objectStore(AUTOSAVE_STORE).delete(AUTOSAVE_KEY);
  });
}
