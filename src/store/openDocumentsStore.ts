import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";
import type { Diagram } from "../models/types";
import { getAppPreferences } from "../utils/appPreferences";
import { flushAutosaveNow } from "./autosaveScheduler";
import { useDiagramStore } from "./diagramStore";
import type {
  DiagramFileAssociation,
  OpenDiagramSession,
} from "./diagramSession";
import {
  AUTOSAVE_WORKSPACE_INDEX_KEY,
  idbDelete,
  idbGetAllKeys,
  idbPut,
  loadAutosaveWorkspace,
  sessionAutosaveKey,
  sessionToAutosaveRecord,
  type AutosaveWorkspaceIndex,
  type SessionAutosaveRecord,
} from "./openDocumentsAutosave";
import { AUTOSAVE_KEY } from "../utils/diagramDb";

function isActiveTabReusable(): boolean {
  const live = useDiagramStore.getState();
  const docs = useOpenDocumentsStore.getState();
  if (live.dirty) return false;
  if (docs.activeFilePath || docs.activeFileHandle) return false;
  if (live.diagramTitle.trim()) return false;
  return (
    live.characters.length === 0 &&
    live.lines.length === 0 &&
    live.groups.length === 0 &&
    live.boxes.length === 0 &&
    live.floatingTexts.length === 0
  );
}

function buildActiveSessionSnapshot(): OpenDiagramSession {
  const docs = useOpenDocumentsStore.getState();
  const live = useDiagramStore.getState();
  const captured = live.captureSession();
  return {
    ...captured,
    sessionId: docs.activeSessionId,
    title: live.diagramTitle,
    filePath: docs.activeFilePath,
    fileHandle: docs.activeFileHandle,
    savedDiagram: live.getDiagram(),
  };
}

async function enableAutosaveAfterLoad(): Promise<void> {
  const prefs = getAppPreferences();
  useDiagramStore.setState({ autosaveEnabled: prefs.autosaveEnabled });
  if (prefs.autosaveEnabled) {
    await useDiagramStore.getState().flushAutosave();
  }
}

async function sessionFromAutosaveRecord(
  record: SessionAutosaveRecord,
): Promise<OpenDiagramSession> {
  await useDiagramStore.getState().loadDiagram(record.diagram, {
    dirty: record.dirty,
  });
  const captured = useDiagramStore.getState().captureSession();
  return {
    ...captured,
    sessionId: record.sessionId,
    title: record.diagram.title ?? "",
    filePath: record.filePath,
    savedDiagram: useDiagramStore.getState().getDiagram(),
    dirty: record.dirty,
  };
}

/** Write all open tabs + index. */
export async function flushOpenDocumentsAutosave(): Promise<void> {
  const docs = useOpenDocumentsStore.getState();
  if (!docs.ready) return;

  const live = useDiagramStore.getState();
  const activeSession = buildActiveSessionSnapshot();
  const allSessions: OpenDiagramSession[] = [
    activeSession,
    ...docs.order
      .filter((id) => id !== docs.activeSessionId)
      .map((id) => docs.stashed[id])
      .filter((s): s is OpenDiagramSession => s != null),
  ];

  const sessionIds = docs.order.slice();
  const index: AutosaveWorkspaceIndex = {
    schemaVersion: 2,
    savedAt: Date.now(),
    activeSessionId: docs.activeSessionId,
    sessionIds,
  };

  await idbPut(AUTOSAVE_WORKSPACE_INDEX_KEY, index);

  const keepKeys = new Set(sessionIds.map((id) => sessionAutosaveKey(id)));
  keepKeys.add(AUTOSAVE_WORKSPACE_INDEX_KEY);

  for (const session of allSessions) {
    const diagram =
      session.sessionId === docs.activeSessionId
        ? live.getDiagram()
        : session.savedDiagram;
    await idbPut(
      sessionAutosaveKey(session.sessionId),
      sessionToAutosaveRecord(
        session.sessionId,
        session.dirty,
        diagram,
        session.filePath,
      ),
    );
  }

  const keys = await idbGetAllKeys();
  for (const key of keys) {
    if (typeof key !== "string") continue;
    if (key === AUTOSAVE_KEY) {
      await idbDelete(key);
      continue;
    }
    if (key.startsWith("session:") && !keepKeys.has(key)) {
      await idbDelete(key);
    }
  }
}

interface OpenDocumentsState {
  ready: boolean;
  order: string[];
  activeSessionId: string;
  stashed: Record<string, OpenDiagramSession>;
  activeFilePath?: string;
  activeFileHandle?: FileSystemFileHandle;

  buildActiveSessionSnapshot: () => OpenDiagramSession;
  bootstrap: () => Promise<void>;
  switchTab: (sessionId: string) => Promise<void>;
  openNewTab: () => Promise<void>;
  openDiagramInTab: (
    diagram: Diagram,
    association?: DiagramFileAssociation,
  ) => Promise<void>;
  closeTab: (sessionId: string) => Promise<"ok" | "cancelled">;
  markActiveSaved: (association?: DiagramFileAssociation) => void;
  setActiveAssociation: (association: DiagramFileAssociation) => void;
  stashActive: () => void;
}

export const useOpenDocumentsStore = create<OpenDocumentsState>((set, get) => ({
  ready: false,
  order: [],
  activeSessionId: "",
  stashed: {},
  activeFilePath: undefined,
  activeFileHandle: undefined,

  buildActiveSessionSnapshot,

  stashActive: () => {
    const snapshot = buildActiveSessionSnapshot();
    set((s) => ({
      stashed: { ...s.stashed, [snapshot.sessionId]: snapshot },
    }));
  },

  bootstrap: async () => {
    const prefs = getAppPreferences();
    useDiagramStore.setState({ autosaveEnabled: false });

    if (prefs.autosaveEnabled) {
      const workspace = await loadAutosaveWorkspace();
      if (workspace && workspace.sessions.length > 0) {
        const stashed: Record<string, OpenDiagramSession> = {};
        const order: string[] = [];

        for (const record of workspace.sessions) {
          const session = await sessionFromAutosaveRecord(record);
          order.push(session.sessionId);
          stashed[session.sessionId] = session;
        }

        const activeId = workspace.index.activeSessionId;
        const active = stashed[activeId] ?? stashed[order[0]];
        const { [active.sessionId]: _omit, ...rest } = stashed;

        set({
          ready: true,
          order,
          activeSessionId: active.sessionId,
          stashed: rest,
          activeFilePath: active.filePath,
          activeFileHandle: undefined,
        });
        await useDiagramStore.getState().applySession(active);
        await enableAutosaveAfterLoad();
        return;
      }
    }

    const sessionId = uuidv4();
    set({
      ready: true,
      order: [sessionId],
      activeSessionId: sessionId,
      stashed: {},
      activeFilePath: undefined,
      activeFileHandle: undefined,
    });
    await useDiagramStore.getState().newDiagram();
    set({
      activeSessionId: sessionId,
      order: [sessionId],
    });
  },

  switchTab: async (sessionId) => {
    const { activeSessionId, stashed, order } = get();
    if (sessionId === activeSessionId) return;
    if (!order.includes(sessionId)) return;
    const target = stashed[sessionId];
    if (!target) return;

    const flush = () => useDiagramStore.getState().flushAutosave();
    if (useDiagramStore.getState().autosaveEnabled) {
      await flushAutosaveNow(flush);
    }

    const outgoing = buildActiveSessionSnapshot();
    const { [sessionId]: _removed, ...rest } = stashed;

    set({
      activeSessionId: sessionId,
      activeFilePath: target.filePath,
      activeFileHandle: target.fileHandle,
      stashed: { ...rest, [outgoing.sessionId]: outgoing },
    });

    await useDiagramStore.getState().applySession(target);

    if (useDiagramStore.getState().autosaveEnabled) {
      await flush();
    }
  },

  openNewTab: async () => {
    if (isActiveTabReusable()) {
      await useDiagramStore.getState().newDiagram();
      set({
        activeFilePath: undefined,
        activeFileHandle: undefined,
      });
      return;
    }

    const flush = () => useDiagramStore.getState().flushAutosave();
    if (useDiagramStore.getState().autosaveEnabled) {
      await flushAutosaveNow(flush);
    }

    get().stashActive();
    const sessionId = uuidv4();
    set((s) => ({
      order: [...s.order, sessionId],
      activeSessionId: sessionId,
      activeFilePath: undefined,
      activeFileHandle: undefined,
    }));
    await useDiagramStore.getState().newDiagram();
  },

  openDiagramInTab: async (diagram, association) => {
    if (isActiveTabReusable()) {
      await useDiagramStore.getState().loadDiagram(diagram, { dirty: false });
      set({
        activeFilePath: association?.filePath,
        activeFileHandle: association?.fileHandle,
      });
      if (useDiagramStore.getState().autosaveEnabled) {
        await useDiagramStore.getState().flushAutosave();
      }
      return;
    }

    const flush = () => useDiagramStore.getState().flushAutosave();
    if (useDiagramStore.getState().autosaveEnabled) {
      await flushAutosaveNow(flush);
    }

    get().stashActive();
    const sessionId = uuidv4();
    set((s) => ({
      order: [...s.order, sessionId],
      activeSessionId: sessionId,
      activeFilePath: association?.filePath,
      activeFileHandle: association?.fileHandle,
    }));
    await useDiagramStore.getState().loadDiagram(diagram, { dirty: false });
    if (useDiagramStore.getState().autosaveEnabled) {
      await useDiagramStore.getState().flushAutosave();
    }
  },

  closeTab: async (sessionId) => {
    const { order, activeSessionId, stashed } = get();
    if (!order.includes(sessionId)) return "cancelled";

    const isActive = sessionId === activeSessionId;

    const flush = () => useDiagramStore.getState().flushAutosave();
    if (useDiagramStore.getState().autosaveEnabled) {
      await flushAutosaveNow(flush);
    }

    if (order.length === 1) {
      await useDiagramStore.getState().newDiagram();
      const newId = uuidv4();
      set({
        order: [newId],
        activeSessionId: newId,
        stashed: {},
        activeFilePath: undefined,
        activeFileHandle: undefined,
      });
      if (useDiagramStore.getState().autosaveEnabled) {
        await flush();
      }
      return "ok";
    }

    const newOrder = order.filter((id) => id !== sessionId);
    if (isActive) {
      const currentIndex = order.indexOf(sessionId);
      const nextId =
        newOrder[Math.min(currentIndex, newOrder.length - 1)] ?? newOrder[0];
      const next = stashed[nextId];
      if (!next) return "cancelled";
      const { [nextId]: _n, [sessionId]: _s, ...rest } = stashed;
      set({
        order: newOrder,
        activeSessionId: nextId,
        activeFilePath: next.filePath,
        activeFileHandle: next.fileHandle,
        stashed: rest,
      });
      await useDiagramStore.getState().applySession(next);
    } else {
      const { [sessionId]: _removed, ...rest } = stashed;
      set({
        order: newOrder,
        stashed: rest,
      });
    }

    if (useDiagramStore.getState().autosaveEnabled) {
      await flush();
    }
    return "ok";
  },

  markActiveSaved: (association) => {
    useDiagramStore.getState().setDirty(false);
    if (association) {
      set({
        activeFilePath: association.filePath ?? get().activeFilePath,
        activeFileHandle: association.fileHandle ?? get().activeFileHandle,
      });
    }
  },

  setActiveAssociation: (association) => {
    set({
      activeFilePath: association.filePath,
      activeFileHandle: association.fileHandle,
    });
  },
}));

/** Tab row view-model for the UI. */
export function getOpenTabSummaries(): Array<{
  sessionId: string;
  title: string;
  dirty: boolean;
  filePath?: string;
  active: boolean;
}> {
  const docs = useOpenDocumentsStore.getState();
  const live = useDiagramStore.getState();
  return docs.order.map((sessionId) => {
    if (sessionId === docs.activeSessionId) {
      return {
        sessionId,
        title: live.diagramTitle,
        dirty: live.dirty,
        filePath: docs.activeFilePath,
        active: true,
      };
    }
    const session = docs.stashed[sessionId];
    return {
      sessionId,
      title: session?.title ?? "",
      dirty: session?.dirty ?? false,
      filePath: session?.filePath,
      active: false,
    };
  });
}
