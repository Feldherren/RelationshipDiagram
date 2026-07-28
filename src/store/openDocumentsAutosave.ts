import type { Diagram } from "../models/types";
import {
  AUTOSAVE_KEY,
  AUTOSAVE_STORE,
  openDiagramDb,
} from "../utils/diagramDb";
import {
  type AutosaveSnapshot,
  parseAutosaveSnapshot,
} from "../utils/autosaveStorage";
import { v4 as uuidv4 } from "uuid";

export const AUTOSAVE_WORKSPACE_INDEX_KEY = "workspace-index";

export function sessionAutosaveKey(sessionId: string): string {
  return `session:${sessionId}`;
}

/** Persisted per-tab snapshot (document only; undo stacks stay in memory). */
export interface SessionAutosaveRecord {
  schemaVersion: 1;
  savedAt: number;
  sessionId: string;
  dirty: boolean;
  filePath?: string;
  diagram: Diagram;
}

export interface AutosaveWorkspaceIndex {
  schemaVersion: 2;
  savedAt: number;
  activeSessionId: string;
  sessionIds: string[];
}

function isSessionAutosaveRecord(data: unknown): data is SessionAutosaveRecord {
  const record = data as SessionAutosaveRecord;
  return (
    record != null &&
    record.schemaVersion === 1 &&
    typeof record.sessionId === "string" &&
    record.diagram != null
  );
}

function isWorkspaceIndex(data: unknown): data is AutosaveWorkspaceIndex {
  const record = data as AutosaveWorkspaceIndex;
  return (
    record != null &&
    record.schemaVersion === 2 &&
    typeof record.activeSessionId === "string" &&
    Array.isArray(record.sessionIds)
  );
}

async function idbGet(key: string): Promise<unknown> {
  const db = await openDiagramDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(AUTOSAVE_STORE, "readonly");
    tx.onerror = () => reject(tx.error);
    const request = tx.objectStore(AUTOSAVE_STORE).get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function idbPut(key: string, value: unknown): Promise<void> {
  const db = await openDiagramDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(AUTOSAVE_STORE, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.objectStore(AUTOSAVE_STORE).put(value, key);
  });
}

export async function idbDelete(key: string): Promise<void> {
  const db = await openDiagramDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(AUTOSAVE_STORE, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.objectStore(AUTOSAVE_STORE).delete(key);
  });
}

export async function idbGetAllKeys(): Promise<IDBValidKey[]> {
  const db = await openDiagramDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(AUTOSAVE_STORE, "readonly");
    tx.onerror = () => reject(tx.error);
    const request = tx.objectStore(AUTOSAVE_STORE).getAllKeys();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function sessionToAutosaveRecord(
  sessionId: string,
  dirty: boolean,
  diagram: Diagram,
  filePath?: string,
): SessionAutosaveRecord {
  return {
    schemaVersion: 1,
    savedAt: Date.now(),
    sessionId,
    dirty,
    filePath,
    diagram,
  };
}

export async function loadAutosaveWorkspace(): Promise<{
  index: AutosaveWorkspaceIndex;
  sessions: SessionAutosaveRecord[];
} | null> {
  const indexRaw = await idbGet(AUTOSAVE_WORKSPACE_INDEX_KEY);
  if (isWorkspaceIndex(indexRaw) && indexRaw.sessionIds.length > 0) {
    const sessions: SessionAutosaveRecord[] = [];
    for (const sessionId of indexRaw.sessionIds) {
      const raw = await idbGet(sessionAutosaveKey(sessionId));
      if (!isSessionAutosaveRecord(raw)) continue;
      try {
        const parsed = parseAutosaveSnapshot({
          schemaVersion: 1,
          savedAt: raw.savedAt,
          diagram: raw.diagram,
        } satisfies AutosaveSnapshot);
        sessions.push({
          ...raw,
          diagram: parsed.diagram,
        });
      } catch {
        // skip corrupt slot
      }
    }
    if (sessions.length === 0) return null;
    const sessionIds = sessions.map((s) => s.sessionId);
    const activeSessionId = sessionIds.includes(indexRaw.activeSessionId)
      ? indexRaw.activeSessionId
      : sessionIds[0];
    return {
      index: {
        ...indexRaw,
        activeSessionId,
        sessionIds,
      },
      sessions,
    };
  }

  // Migrate legacy single-slot autosave.
  const legacyRaw = await idbGet(AUTOSAVE_KEY);
  if (!legacyRaw) return null;
  try {
    const legacy = parseAutosaveSnapshot(legacyRaw);
    const sessionId = uuidv4();
    const record: SessionAutosaveRecord = {
      schemaVersion: 1,
      savedAt: legacy.savedAt,
      sessionId,
      dirty: true,
      diagram: legacy.diagram,
    };
    return {
      index: {
        schemaVersion: 2,
        savedAt: legacy.savedAt,
        activeSessionId: sessionId,
        sessionIds: [sessionId],
      },
      sessions: [record],
    };
  } catch {
    return null;
  }
}

/** Clear workspace autosave slots (and legacy key). Used by Settings. */
export async function clearAutosave(): Promise<void> {
  const keys = await idbGetAllKeys();
  for (const key of keys) {
    if (typeof key !== "string") continue;
    if (
      key === AUTOSAVE_KEY ||
      key === AUTOSAVE_WORKSPACE_INDEX_KEY ||
      key.startsWith("session:")
    ) {
      await idbDelete(key);
    }
  }
}
