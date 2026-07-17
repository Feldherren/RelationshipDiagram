import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { v4 as uuidv4 } from "uuid";
import i18n from "../i18n";
import type {
  Bounds,
  Box,
  Character,
  ConnectDrag,
  Diagram,
  DiagramAppearance,
  FloatingText,
  GridStyle,
  Group,
  Line,
  NodeRef,
  RGB,
  Selection,
  ToolMode,
  ViewBookmark,
  Viewport,
} from "../models/types";
import {
  DEFAULT_CHARACTER_SIZE,
  DEFAULT_FLOATING_TEXT_FONT_SIZE,
  defaultMembershipAppearance,
} from "../models/types";
import {
  getBoxCenter,
  getEmptyBoxBounds,
  isCharacterContainedInBox,
  resolveBoxBounds,
} from "../utils/geometry";
import {
  DEFAULT_DIAGRAM_FONT,
  cleanupDeprecatedFonts,
  ensureFontLoaded,
  isDefaultDiagramFont,
} from "../utils/diagramFont";
import { isDeprecatedFontFamily } from "../utils/systemFonts";
import {
  initialBendForRouteIndex,
  initialSelfLoopBend,
  isSelfConnection,
  nextRouteIndex,
} from "../utils/lineRouting";
import {
  findConnectionTargetAt,
  sameNodeRef,
} from "../utils/connection";
import {
  getCollapsedBoxForCharacter,
  getCollapsedBoxForFloatingText,
} from "../utils/lineEndpoints";
import {
  createAutosaveSnapshot,
  loadAutosave,
  saveAutosave,
} from "../utils/autosaveStorage";
import {
  EMPTY_DIAGRAM,
  type PersistedDiagramState,
  pickPersistedState,
} from "./autosaveState";
import { performAutosave, cancelScheduledAutosave } from "./autosaveScheduler";
import {
  DEFAULT_DIAGRAM_BACKGROUND,
  applyDiagramBackgroundMode,
  getDiagramBackgroundMode,
  type DiagramBackgroundMode,
  resolveDiagramBackground,
  serializeDiagramBackground,
} from "../utils/diagramBackground";
import {
  cloneDiagramAppearance,
  DEFAULT_DIAGRAM_APPEARANCE,
  mergeLegacyHeaderColors,
  patchDiagramAppearance,
  resolveDiagramAppearance,
  serializeDiagramAppearance,
} from "../utils/diagramAppearance";
import {
  getAppPreferences,
  setAppPreferences,
} from "../utils/appPreferences";
import { computeDiagramBounds } from "../utils/diagramBounds";
import { computeViewportForBounds } from "../utils/viewportFit";
import { randomPastelColor } from "../utils/pastelPalette";

interface HistoryOptions {
  recordHistory?: boolean;
}

interface DiagramState {
  characters: Character[];
  lines: Line[];
  groups: Group[];
  boxes: Box[];
  floatingTexts: FloatingText[];
  viewport: Viewport;
  bookmarks: ViewBookmark[];
  bookmarksVisible: boolean;
  selection: Selection;
  /** When false, the selection float stays closed even if something is selected. */
  selectionDetailsOpen: boolean;
  toolMode: ToolMode;
  connectFrom: NodeRef | null;
  connectDrag: ConnectDrag | null;
  showGrid: boolean;
  gridStyle: GridStyle;
  exportBounds: Bounds | null;
  stageSize: { width: number; height: number };
  diagramTitle: string;
  diagramSubtitle: string;
  showDiagramHeader: boolean;
  diagramFontFamily: string;
  fontMissing: boolean;
  diagramBackgroundColor: RGB | null;
  diagramAppearance: DiagramAppearance;
  autosaveEnabled: boolean;
  undoStack: PersistedDiagramState[];
  redoStack: PersistedDiagramState[];

  setStageSize: (width: number, height: number) => void;
  setViewport: (viewport: Partial<Viewport>) => void;
  fitViewportToContent: () => void;
  captureHistory: () => void;
  undo: () => void;
  redo: () => void;
  setToolMode: (mode: ToolMode) => void;
  setSelection: (
    selection: Selection,
    options?: { openDetails?: boolean },
  ) => void;
  openSelectionDetails: () => void;
  setShowGrid: (show: boolean) => void;
  setGridStyle: (style: GridStyle) => void;
  setDiagramBackgroundMode: (mode: DiagramBackgroundMode) => void;
  setAutosaveEnabled: (enabled: boolean) => void;
  setExportBounds: (bounds: Bounds | null) => void;
  setDiagramTitle: (title: string) => void;
  setDiagramSubtitle: (subtitle: string) => void;
  setShowDiagramHeader: (show: boolean) => void;
  setDiagramBackgroundColor: (color: RGB | null) => void;
  setDiagramFontFamily: (fontFamily: string) => Promise<void>;
  setDiagramAppearance: (patch: Partial<DiagramAppearance>) => void;
  replaceDiagramAppearance: (appearance: DiagramAppearance) => void;
  setBookmarksVisible: (visible: boolean) => void;
  addBookmark: (name?: string, color?: RGB) => void;
  updateBookmark: (
    id: string,
    patch: Partial<Pick<ViewBookmark, "name" | "color">>,
  ) => void;
  updateBookmarkView: (id: string) => void;
  updateBookmarkFrame: (
    id: string,
    patch: { anchor?: ViewBookmark["anchor"]; viewport?: Viewport },
    options?: HistoryOptions,
  ) => void;
  deleteBookmark: (id: string) => void;
  goToBookmark: (id: string) => void;
  initializeFonts: () => Promise<void>;
  bootstrapApp: () => Promise<void>;
  getAutosaveSnapshot: () => ReturnType<typeof createAutosaveSnapshot>;
  flushAutosave: () => Promise<void>;
  newDiagram: () => Promise<void>;

  addCharacterAt: (position: { x: number; y: number }) => void;
  updateCharacter: (
    id: string,
    patch: Partial<Character>,
    options?: HistoryOptions,
  ) => void;
  deleteCharacter: (id: string) => void;
  moveCharacter: (
    id: string,
    position: { x: number; y: number },
    options?: HistoryOptions,
  ) => void;

  addLine: (from: NodeRef, to: NodeRef) => void;
  updateLine: (id: string, patch: Partial<Line>, options?: HistoryOptions) => void;
  deleteLine: (id: string) => void;

  addGroup: (name?: string) => void;
  updateGroup: (
    id: string,
    patch: Partial<Omit<Group, "appearance">> & {
      appearance?: Partial<Group["appearance"]>;
    },
  ) => void;
  deleteGroup: (id: string) => void;
  addCharacterToGroup: (characterId: string, groupId: string) => void;
  removeCharacterFromGroup: (characterId: string, groupId: string) => void;
  toggleCharacterInGroup: (characterId: string, groupId: string) => void;

  addBoxAt: (position: { x: number; y: number }) => void;
  updateBox: (id: string, patch: Partial<Box>, options?: HistoryOptions) => void;
  deleteBox: (id: string) => void;
  toggleBoxCollapse: (id: string) => void;
  moveBox: (
    id: string,
    delta: { dx: number; dy: number },
    contents: { characterIds: string[]; floatingTextIds: string[] },
    options?: HistoryOptions,
  ) => void;

  addFloatingTextAt: (position: { x: number; y: number }) => void;
  updateFloatingText: (
    id: string,
    patch: Partial<FloatingText>,
    options?: HistoryOptions,
  ) => void;
  deleteFloatingText: (id: string) => void;
  moveFloatingText: (
    id: string,
    position: { x: number; y: number },
    options?: HistoryOptions,
  ) => void;

  handleNodeClick: (ref: NodeRef, options?: { openDetails?: boolean }) => void;
  startConnectDrag: (from: NodeRef, point: { x: number; y: number }) => void;
  updateConnectDrag: (point: { x: number; y: number }) => void;
  endConnectDrag: (point: { x: number; y: number }) => void;
  cancelConnect: () => void;
  deleteSelected: () => void;
  loadDiagram: (diagram: Diagram) => Promise<void>;
  getDiagram: () => Diagram;
  screenToWorld: (screen: { x: number; y: number }) => { x: number; y: number };
  getViewportCenter: () => { x: number; y: number };
}

function createDefaultCharacter(
  position: { x: number; y: number },
  borderColor: RGB,
): Character {
  return {
    id: uuidv4(),
    position,
    name: "",
    borderShape: "circle",
    borderColor: { ...borderColor },
    size: DEFAULT_CHARACTER_SIZE,
  };
}

function isRgbValue(value: unknown): value is RGB {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.r === "number" &&
    typeof v.g === "number" &&
    typeof v.b === "number"
  );
}

function normalizeBookmarks(raw: unknown): ViewBookmark[] {
  if (!Array.isArray(raw)) return [];
  const result: ViewBookmark[] = [];
  for (const entry of raw) {
    if (typeof entry !== "object" || entry === null) continue;
    const b = entry as Record<string, unknown>;
    if (typeof b.id !== "string" || typeof b.name !== "string") continue;
    if (!isRgbValue(b.color)) continue;
    const vp = b.viewport;
    const anchor = b.anchor;
    if (typeof vp !== "object" || vp === null) continue;
    if (typeof anchor !== "object" || anchor === null) continue;
    const viewport = vp as Record<string, unknown>;
    const point = anchor as Record<string, unknown>;
    if (
      typeof viewport.x !== "number" ||
      typeof viewport.y !== "number" ||
      typeof viewport.scale !== "number" ||
      typeof point.x !== "number" ||
      typeof point.y !== "number"
    ) {
      continue;
    }
    result.push({
      id: b.id,
      name: b.name.slice(0, 80),
      color: { r: b.color.r, g: b.color.g, b: b.color.b },
      viewport: {
        x: viewport.x,
        y: viewport.y,
        scale: viewport.scale,
      },
      anchor: { x: point.x, y: point.y },
    });
  }
  return result;
}

const HISTORY_LIMIT = 100;

function restoreHistorySnapshot(
  snapshot: PersistedDiagramState,
  viewport: Viewport,
) {
  return {
    ...snapshot,
    viewport,
    selection: null,
    selectionDetailsOpen: false,
    connectFrom: null,
    connectDrag: null,
    toolMode: "select" as const,
    exportBounds: null,
  };
}

export const useDiagramStore = create<DiagramState>()(
  subscribeWithSelector((set, get) => ({
  characters: [],
  lines: [],
  groups: [],
  boxes: [],
  floatingTexts: [],
  viewport: { x: 0, y: 0, scale: 1 },
  bookmarks: [],
  bookmarksVisible: true,
  selection: null,
  selectionDetailsOpen: false,
  toolMode: "select",
  connectFrom: null,
  connectDrag: null,
  showGrid: true,
  gridStyle: "lines",
  exportBounds: null,
  stageSize: { width: 800, height: 600 },
  diagramTitle: "",
  diagramSubtitle: "",
  showDiagramHeader: true,
  diagramFontFamily: DEFAULT_DIAGRAM_FONT,
  fontMissing: false,
  diagramBackgroundColor: DEFAULT_DIAGRAM_BACKGROUND,
  diagramAppearance: cloneDiagramAppearance(DEFAULT_DIAGRAM_APPEARANCE),
  autosaveEnabled: false,
  undoStack: [],
  redoStack: [],

  setStageSize: (width, height) => set({ stageSize: { width, height } }),
  setViewport: (patch) =>
    set((s) => ({ viewport: { ...s.viewport, ...patch } })),
  fitViewportToContent: () => {
    const { stageSize, viewport } = get();
    const bounds = computeDiagramBounds(get().getDiagram(), 32, viewport.scale);
    if (!bounds) return;
    set({ viewport: computeViewportForBounds(bounds, stageSize) });
  },
  captureHistory: () =>
    set((s) => ({
      undoStack: [
        ...s.undoStack.slice(-(HISTORY_LIMIT - 1)),
        pickPersistedState(s),
      ],
      redoStack: [],
    })),
  undo: () => {
    const { undoStack } = get();
    const previous = undoStack.at(-1);
    if (!previous) return;
    const current = pickPersistedState(get());
    set((s) => ({
      ...restoreHistorySnapshot(previous, s.viewport),
      undoStack: s.undoStack.slice(0, -1),
      redoStack: [...s.redoStack, current],
    }));
  },
  redo: () => {
    const { redoStack } = get();
    const next = redoStack.at(-1);
    if (!next) return;
    const current = pickPersistedState(get());
    set((s) => ({
      ...restoreHistorySnapshot(next, s.viewport),
      undoStack: [...s.undoStack, current],
      redoStack: s.redoStack.slice(0, -1),
    }));
  },
  setToolMode: (mode) => {
    if (mode === "editGroupMembers" && get().selection?.type !== "group") {
      return;
    }
    set({
      toolMode: mode,
      connectFrom: null,
      connectDrag: null,
      exportBounds: mode === "exportBounds" ? get().exportBounds : null,
    });
  },
  setSelection: (selection, options) => {
    const { toolMode, selection: prev } = get();
    const editingGroupId =
      toolMode === "editGroupMembers" && prev?.type === "group"
        ? prev.id
        : null;
    const stayingOnEditedGroup =
      editingGroupId != null &&
      selection?.type === "group" &&
      selection.id === editingGroupId;
    const openDetails =
      options?.openDetails ??
      (selection != null && selection.type !== "bookmark");
    set({
      selection,
      selectionDetailsOpen: openDetails,
      ...(editingGroupId != null && !stayingOnEditedGroup
        ? { toolMode: "select" as const }
        : {}),
    });
  },
  openSelectionDetails: () => {
    const { selection } = get();
    if (!selection || selection.type === "bookmark") return;
    set({ selectionDetailsOpen: true });
  },
  setShowGrid: (show) =>
    {
      get().captureHistory();
      set((s) => ({
        showGrid: show,
        diagramAppearance: {
          ...s.diagramAppearance,
          backgroundMode: getDiagramBackgroundMode(
            show,
            s.gridStyle,
            s.diagramBackgroundColor,
          ),
        },
      }));
    },
  setGridStyle: (style) => {
    get().captureHistory();
    set((s) => ({
      gridStyle: style,
      diagramAppearance: {
        ...s.diagramAppearance,
        backgroundMode: getDiagramBackgroundMode(
          s.showGrid,
          style,
          s.diagramBackgroundColor,
        ),
      },
    }));
  },
  setDiagramBackgroundMode: (mode) => {
    get().setDiagramAppearance({ backgroundMode: mode });
  },
  setAutosaveEnabled: (enabled) => set({ autosaveEnabled: enabled }),
  setExportBounds: (bounds) => set({ exportBounds: bounds }),

  setDiagramTitle: (title) => {
    get().captureHistory();
    set({ diagramTitle: title });
  },

  setDiagramSubtitle: (subtitle) => {
    get().captureHistory();
    set({ diagramSubtitle: subtitle });
  },

  setShowDiagramHeader: (show) => {
    get().captureHistory();
    set({ showDiagramHeader: show });
  },

  setDiagramBackgroundColor: (color) => {
    get().setDiagramAppearance({ backgroundColor: color });
  },

  setDiagramFontFamily: async (fontFamily) => {
    get().captureHistory();
    if (isDefaultDiagramFont(fontFamily) || isDeprecatedFontFamily(fontFamily)) {
      set({
        diagramFontFamily: DEFAULT_DIAGRAM_FONT,
        fontMissing: false,
      });
      return;
    }

    const resolvedFamily = await ensureFontLoaded(fontFamily);
    set({
      diagramFontFamily: resolvedFamily ?? fontFamily,
      fontMissing: !resolvedFamily,
    });
  },

  setDiagramAppearance: (patch) => {
    get().captureHistory();
    set((s) => {
      const diagramAppearance = patchDiagramAppearance(
        s.diagramAppearance,
        patch,
      );
      if (
        patch.backgroundMode === undefined &&
        patch.backgroundColor === undefined
      ) {
        return { diagramAppearance };
      }
      const background = applyDiagramBackgroundMode(
        diagramAppearance.backgroundMode,
        diagramAppearance.backgroundColor,
      );
      return {
        diagramAppearance: {
          ...diagramAppearance,
          backgroundMode: getDiagramBackgroundMode(
            background.showGrid,
            background.gridStyle,
            background.backgroundColor,
          ),
          backgroundColor: background.backgroundColor,
        },
        showGrid: background.showGrid,
        gridStyle: background.gridStyle,
        diagramBackgroundColor: background.backgroundColor,
      };
    });
  },

  replaceDiagramAppearance: (appearance) => {
    get().captureHistory();
    const diagramAppearance = cloneDiagramAppearance(appearance);
    const background = applyDiagramBackgroundMode(
      diagramAppearance.backgroundMode,
      diagramAppearance.backgroundColor,
    );
    set({
      diagramAppearance: {
        ...diagramAppearance,
        backgroundMode: getDiagramBackgroundMode(
          background.showGrid,
          background.gridStyle,
          background.backgroundColor,
        ),
        backgroundColor: background.backgroundColor,
      },
      showGrid: background.showGrid,
      gridStyle: background.gridStyle,
      diagramBackgroundColor: background.backgroundColor,
    });
  },

  initializeFonts: async () => {
    await cleanupDeprecatedFonts();

    let { diagramFontFamily } = get();
    if (isDeprecatedFontFamily(diagramFontFamily)) {
      diagramFontFamily = DEFAULT_DIAGRAM_FONT;
      set({ diagramFontFamily });
    }

    const resolvedFamily = await ensureFontLoaded(diagramFontFamily);
    set({
      diagramFontFamily: resolvedFamily ?? diagramFontFamily,
      fontMissing:
        !resolvedFamily && !isDefaultDiagramFont(diagramFontFamily),
    });
  },

  bootstrapApp: async () => {
    const prefs = getAppPreferences();
    cancelScheduledAutosave();
    set({ autosaveEnabled: false });

    if (prefs.autosaveEnabled) {
      const snapshot = await loadAutosave();
      if (snapshot) {
        await get().loadDiagram(snapshot.diagram);
      } else {
        await get().initializeFonts();
      }
    } else {
      await get().initializeFonts();
    }

    set({
      autosaveEnabled: prefs.autosaveEnabled,
      bookmarksVisible: prefs.bookmarksVisible,
    });
  },

  getAutosaveSnapshot: () => createAutosaveSnapshot(get().getDiagram()),

  flushAutosave: async () => {
    if (!get().autosaveEnabled) return;
    try {
      await performAutosave(
        () => get().getAutosaveSnapshot(),
        saveAutosave,
      );
    } catch (err) {
      console.error("Autosave failed:", err);
    }
  },

  newDiagram: async () => {
    const prefs = getAppPreferences();
    cancelScheduledAutosave();
    set({ autosaveEnabled: false });

    const appearance = prefs.diagramAppearance;
    const background = applyDiagramBackgroundMode(
      appearance.backgroundMode,
      appearance.backgroundColor,
    );

    const diagram: Diagram = {
      ...EMPTY_DIAGRAM,
      showGrid: background.showGrid,
      gridStyle: background.gridStyle,
      showHeader: prefs.defaultShowHeader ? undefined : false,
      backgroundColor: serializeDiagramBackground(background.backgroundColor),
      fontFamily: isDefaultDiagramFont(prefs.defaultDiagramFont)
        ? undefined
        : prefs.defaultDiagramFont,
      appearance: serializeDiagramAppearance({
        ...appearance,
        backgroundMode: getDiagramBackgroundMode(
          background.showGrid,
          background.gridStyle,
          background.backgroundColor,
        ),
        backgroundColor: background.backgroundColor,
      }),
    };
    await get().loadDiagram(diagram);
    set({ undoStack: [], redoStack: [] });
    set({ autosaveEnabled: prefs.autosaveEnabled });
    if (prefs.autosaveEnabled) {
      await get().flushAutosave();
    }
  },

  screenToWorld: (screen) => {
    const { viewport } = get();
    return {
      x: (screen.x - viewport.x) / viewport.scale,
      y: (screen.y - viewport.y) / viewport.scale,
    };
  },

  getViewportCenter: () => {
    const { stageSize, viewport } = get();
    return {
      x: (stageSize.width / 2 - viewport.x) / viewport.scale,
      y: (stageSize.height / 2 - viewport.y) / viewport.scale,
    };
  },

  addCharacterAt: (position) => {
    get().captureHistory();
    const character = createDefaultCharacter(
      position,
      get().diagramAppearance.defaultCharacterBorderColor,
    );
    set((s) => ({
      characters: [...s.characters, character],
      selection: { type: "character", id: character.id },
      selectionDetailsOpen: false,
    }));
  },

  updateCharacter: (id, patch, options) => {
    if (options?.recordHistory !== false) get().captureHistory();
    set((s) => ({
      characters: s.characters.map((c) =>
        c.id === id ? { ...c, ...patch } : c,
      ),
    }));
  },

  deleteCharacter: (id) => {
    get().captureHistory();
    set((s) => ({
      characters: s.characters.filter((c) => c.id !== id),
      lines: s.lines.filter(
        (l) =>
          !(l.from.kind === "character" && l.from.id === id) &&
          !(l.to.kind === "character" && l.to.id === id),
      ),
      groups: s.groups.map((g) => ({
        ...g,
        memberCharacterIds: g.memberCharacterIds.filter((mid) => mid !== id),
      })),
      selection:
        s.selection?.type === "character" && s.selection.id === id
          ? null
          : s.selection,
    }));
  },

  moveCharacter: (id, position, options) => {
    if (options?.recordHistory !== false) get().captureHistory();
    set((s) => ({
      characters: s.characters.map((c) =>
        c.id === id ? { ...c, position } : c,
      ),
    }));
  },

  addLine: (from, to) => {
    get().captureHistory();
    const existingLines = get().lines;
    const routeIndex = nextRouteIndex(from, to, existingLines);
    const self = isSelfConnection({ from, to });
    const line: Line = {
      id: uuidv4(),
      from,
      to,
      color: { ...get().diagramAppearance.defaultLineColor },
      style: "straight",
      startArrow: false,
      endArrow: true,
      routeIndex,
      bend: self
        ? initialSelfLoopBend(routeIndex)
        : initialBendForRouteIndex(routeIndex),
    };
    set((s) => ({
      lines: [...s.lines, line],
      selection: { type: "line", id: line.id },
      selectionDetailsOpen: false,
      connectFrom: null,
      connectDrag: null,
    }));
  },

  updateLine: (id, patch, options) => {
    if (options?.recordHistory !== false) get().captureHistory();
    set((s) => ({
      lines: s.lines.map((l) => (l.id === id ? { ...l, ...patch } : l)),
    }));
  },

  deleteLine: (id) => {
    get().captureHistory();
    set((s) => ({
      lines: s.lines.filter((l) => l.id !== id),
      selection:
        s.selection?.type === "line" && s.selection.id === id
          ? null
          : s.selection,
    }));
  },

  addGroup: (name) => {
    get().captureHistory();
    const { groups } = get();
    const group: Group = {
      id: uuidv4(),
      name: name?.trim() || i18n.t("defaults.groupName", { n: groups.length + 1 }),
      memberCharacterIds: [],
      appearance: defaultMembershipAppearance(),
    };
    set((s) => ({
      groups: [...s.groups, group],
      selection: { type: "group", id: group.id },
      selectionDetailsOpen: false,
    }));
  },

  updateGroup: (id, patch) => {
    get().captureHistory();
    set((s) => ({
      groups: s.groups.map((g) => {
        if (g.id !== id) return g;
        const { appearance: appearancePatch, ...rest } = patch;
        return {
          ...g,
          ...rest,
          appearance: appearancePatch
            ? { ...g.appearance, ...appearancePatch }
            : g.appearance,
        };
      }),
    }));
  },

  deleteGroup: (id) => {
    get().captureHistory();
    set((s) => {
      const deletingEditedGroup =
        s.toolMode === "editGroupMembers" &&
        s.selection?.type === "group" &&
        s.selection.id === id;
      return {
        groups: s.groups.filter((g) => g.id !== id),
        selection:
          s.selection?.type === "group" && s.selection.id === id
            ? null
            : s.selection,
        ...(deletingEditedGroup ? { toolMode: "select" as const } : {}),
      };
    });
  },

  addCharacterToGroup: (characterId, groupId) => {
    get().captureHistory();
    set((s) => ({
      groups: s.groups.map((g) => {
        if (g.id !== groupId) return g;
        if (g.memberCharacterIds.includes(characterId)) return g;
        return {
          ...g,
          memberCharacterIds: [...g.memberCharacterIds, characterId],
        };
      }),
    }));
  },

  removeCharacterFromGroup: (characterId, groupId) => {
    get().captureHistory();
    set((s) => ({
      groups: s.groups.map((g) =>
        g.id === groupId
          ? {
              ...g,
              memberCharacterIds: g.memberCharacterIds.filter(
                (id) => id !== characterId,
              ),
            }
          : g,
      ),
    }));
  },

  toggleCharacterInGroup: (characterId, groupId) => {
    const group = get().groups.find((g) => g.id === groupId);
    if (!group) return;
    if (group.memberCharacterIds.includes(characterId)) {
      get().removeCharacterFromGroup(characterId, groupId);
    } else {
      get().addCharacterToGroup(characterId, groupId);
    }
  },

  addBoxAt: (position) => {
    get().captureHistory();
    const { boxes, diagramAppearance } = get();
    const bounds = getEmptyBoxBounds(position);
    const box: Box = {
      id: uuidv4(),
      name: i18n.t("defaults.boxName", { n: boxes.length + 1 }),
      collapsed: false,
      anchorPosition: position,
      collapsedPosition: position,
      bounds,
      borderColor: { ...diagramAppearance.defaultBoxBorderColor },
    };

    set((s) => ({
      boxes: [...s.boxes, box],
      selection: { type: "box", id: box.id },
      selectionDetailsOpen: false,
    }));
  },

  updateBox: (id, patch, options) => {
    if (options?.recordHistory !== false) get().captureHistory();
    set((s) => ({
      boxes: s.boxes.map((b) => (b.id === id ? { ...b, ...patch } : b)),
    }));
  },

  deleteBox: (id) => {
    get().captureHistory();
    set((s) => ({
      boxes: s.boxes.filter((b) => b.id !== id),
      lines: s.lines.filter(
        (l) =>
          !(l.from.kind === "box" && l.from.id === id) &&
          !(l.to.kind === "box" && l.to.id === id),
      ),
      selection:
        s.selection?.type === "box" && s.selection.id === id
          ? null
          : s.selection,
    }));
  },

  toggleBoxCollapse: (id) => {
    get().captureHistory();
    const state = get();
    const box = state.boxes.find((b) => b.id === id);
    if (!box) return;

    if (!box.collapsed) {
      const center = getBoxCenter(box);
      set((s) => ({
        boxes: s.boxes.map((b) =>
          b.id === id
            ? { ...b, collapsed: true, collapsedPosition: center }
            : b,
        ),
      }));
    } else {
      set((s) => ({
        boxes: s.boxes.map((b) =>
          b.id === id ? { ...b, collapsed: false } : b,
        ),
      }));
    }
  },

  moveBox: (id, delta, contents, options) => {
    if (options?.recordHistory !== false) get().captureHistory();
    set((s) => {
      const box = s.boxes.find((b) => b.id === id);
      if (!box) return {};

      const containedCharacterIds = new Set(contents.characterIds);
      const containedFloatingTextIds = new Set(contents.floatingTextIds);

      return {
        characters: s.characters.map((c) => {
          if (!containedCharacterIds.has(c.id)) return c;
          return {
            ...c,
            position: {
              x: c.position.x + delta.dx,
              y: c.position.y + delta.dy,
            },
          };
        }),
        floatingTexts: s.floatingTexts.map((t) => {
          if (!containedFloatingTextIds.has(t.id)) return t;
          return {
            ...t,
            position: {
              x: t.position.x + delta.dx,
              y: t.position.y + delta.dy,
            },
          };
        }),
        boxes: s.boxes.map((b) => {
          if (b.id !== id) return b;
          const next: Box = { ...b };
          if (b.bounds) {
            next.bounds = {
              ...b.bounds,
              x: b.bounds.x + delta.dx,
              y: b.bounds.y + delta.dy,
            };
          }
          if (b.anchorPosition) {
            next.anchorPosition = {
              x: b.anchorPosition.x + delta.dx,
              y: b.anchorPosition.y + delta.dy,
            };
          }
          if (b.collapsedPosition) {
            next.collapsedPosition = {
              x: b.collapsedPosition.x + delta.dx,
              y: b.collapsedPosition.y + delta.dy,
            };
          }
          return next;
        }),
      };
    });
  },

  addFloatingTextAt: (position) => {
    get().captureHistory();
    const floatingText: FloatingText = {
      id: uuidv4(),
      position,
      text: "",
      color: { ...get().diagramAppearance.defaultFloatingTextColor },
      fontSize: DEFAULT_FLOATING_TEXT_FONT_SIZE,
    };
    set((s) => ({
      floatingTexts: [...s.floatingTexts, floatingText],
      selection: { type: "floatingText", id: floatingText.id },
      selectionDetailsOpen: false,
    }));
  },

  updateFloatingText: (id, patch, options) => {
    if (options?.recordHistory !== false) get().captureHistory();
    set((s) => ({
      floatingTexts: s.floatingTexts.map((t) =>
        t.id === id ? { ...t, ...patch } : t,
      ),
    }));
  },

  deleteFloatingText: (id) => {
    get().captureHistory();
    set((s) => ({
      floatingTexts: s.floatingTexts.filter((t) => t.id !== id),
      selection:
        s.selection?.type === "floatingText" && s.selection.id === id
          ? null
          : s.selection,
    }));
  },

  moveFloatingText: (id, position, options) => {
    if (options?.recordHistory !== false) get().captureHistory();
    set((s) => ({
      floatingTexts: s.floatingTexts.map((t) =>
        t.id === id ? { ...t, position } : t,
      ),
    }));
  },

  handleNodeClick: (ref, options) => {
    const { connectFrom, toolMode, selection } = get();
    const openDetails = options?.openDetails ?? false;
    if (connectFrom) {
      // A right-click / double-click "open details" gesture must not draw a line.
      if (openDetails) return;
      get().addLine(connectFrom, ref);
      return;
    }
    if (toolMode === "editGroupMembers" && selection?.type === "group") {
      // Ignore open-details gestures while editing membership.
      if (openDetails) return;
      if (ref.kind === "character") {
        get().toggleCharacterInGroup(ref.id, selection.id);
        return;
      }
      get().setSelection({ type: "box", id: ref.id });
      return;
    }
    if (ref.kind === "character") {
      get().setSelection({ type: "character", id: ref.id }, { openDetails });
    } else {
      get().setSelection({ type: "box", id: ref.id }, { openDetails });
    }
  },

  startConnectDrag: (from, point) =>
    set({
      connectDrag: {
        from,
        startX: point.x,
        startY: point.y,
        x: point.x,
        y: point.y,
      },
      connectFrom: null,
      selection: null,
      toolMode: "select",
    }),

  updateConnectDrag: (point) =>
    set((s) =>
      s.connectDrag
        ? { connectDrag: { ...s.connectDrag, x: point.x, y: point.y } }
        : {},
    ),

  endConnectDrag: (point) => {
    const { connectDrag, characters, boxes } = get();
    if (!connectDrag) return;

    const moved = Math.hypot(
      point.x - connectDrag.startX,
      point.y - connectDrag.startY,
    );
    const target = findConnectionTargetAt(point, characters, boxes);

    if (target) {
      if (sameNodeRef(connectDrag.from, target)) {
        // Short click on + keeps click-to-connect mode; drag onto self = self-loop.
        if (moved >= 6) {
          get().addLine(connectDrag.from, target);
        } else {
          set({ connectFrom: connectDrag.from, connectDrag: null });
        }
        return;
      }
      get().addLine(connectDrag.from, target);
      return;
    }

    if (moved < 6) {
      set({ connectFrom: connectDrag.from, connectDrag: null });
      return;
    }

    set({ connectDrag: null });
  },

  cancelConnect: () => set({ connectFrom: null, connectDrag: null }),

  setBookmarksVisible: (visible) => {
    const { selection } = get();
    set({
      bookmarksVisible: visible,
      ...(visible === false && selection?.type === "bookmark"
        ? { selection: null }
        : {}),
    });
    setAppPreferences({ bookmarksVisible: visible });
  },

  addBookmark: (name, color) => {
    get().captureHistory();
    const { viewport, bookmarks } = get();
    const anchor = get().getViewportCenter();
    const defaultName = i18n.t("bookmarks.defaultName", {
      n: bookmarks.length + 1,
    });
    const bookmark: ViewBookmark = {
      id: uuidv4(),
      name: (name?.trim() || defaultName).slice(0, 80),
      color: color ? { ...color } : randomPastelColor(),
      viewport: { ...viewport },
      anchor: { ...anchor },
    };
    set((s) => ({ bookmarks: [...s.bookmarks, bookmark] }));
  },

  updateBookmark: (id, patch) => {
    get().captureHistory();
    set((s) => ({
      bookmarks: s.bookmarks.map((b) => {
        if (b.id !== id) return b;
        return {
          ...b,
          ...(patch.name !== undefined
            ? { name: patch.name.trim().slice(0, 80) || b.name }
            : {}),
          ...(patch.color !== undefined ? { color: { ...patch.color } } : {}),
        };
      }),
    }));
  },

  updateBookmarkView: (id) => {
    get().captureHistory();
    const { viewport } = get();
    const anchor = get().getViewportCenter();
    set((s) => ({
      bookmarks: s.bookmarks.map((b) =>
        b.id === id
          ? { ...b, viewport: { ...viewport }, anchor: { ...anchor } }
          : b,
      ),
    }));
  },

  updateBookmarkFrame: (id, patch, options) => {
    if (options?.recordHistory !== false) get().captureHistory();
    set((s) => ({
      bookmarks: s.bookmarks.map((b) => {
        if (b.id !== id) return b;
        return {
          ...b,
          ...(patch.anchor !== undefined
            ? { anchor: { ...patch.anchor } }
            : {}),
          ...(patch.viewport !== undefined
            ? { viewport: { ...patch.viewport } }
            : {}),
        };
      }),
    }));
  },

  deleteBookmark: (id) => {
    get().captureHistory();
    set((s) => ({
      bookmarks: s.bookmarks.filter((b) => b.id !== id),
      ...(s.selection?.type === "bookmark" && s.selection.id === id
        ? { selection: null }
        : {}),
    }));
  },

  goToBookmark: (id) => {
    const bookmark = get().bookmarks.find((b) => b.id === id);
    if (!bookmark) return;
    set({ viewport: { ...bookmark.viewport } });
  },

  deleteSelected: () => {
    const { selection } = get();
    if (!selection) return;
    if (selection.type === "character") get().deleteCharacter(selection.id);
    if (selection.type === "line") get().deleteLine(selection.id);
    if (selection.type === "group") get().deleteGroup(selection.id);
    if (selection.type === "box") get().deleteBox(selection.id);
    if (selection.type === "floatingText")
      get().deleteFloatingText(selection.id);
    if (selection.type === "bookmark") get().deleteBookmark(selection.id);
  },

  loadDiagram: async (diagram) => {
    cancelScheduledAutosave();
    await cleanupDeprecatedFonts();

    let fontFamily = diagram.fontFamily ?? DEFAULT_DIAGRAM_FONT;
    if (isDeprecatedFontFamily(fontFamily)) {
      fontFamily = DEFAULT_DIAGRAM_FONT;
    }

    const resolvedFamily = await ensureFontLoaded(fontFamily);
    const diagramBackgroundColor = resolveDiagramBackground(
      diagram.backgroundColor,
    );
    const showGrid = diagram.showGrid ?? true;
    const gridStyle = diagram.gridStyle === "dots" ? "dots" : "lines";
    const resolvedAppearance = mergeLegacyHeaderColors(
      resolveDiagramAppearance(diagram.appearance),
      diagram.titleColor,
      diagram.subtitleColor,
    );
    set({
      characters: diagram.characters,
      lines: diagram.lines,
      groups: diagram.groups,
      boxes: diagram.boxes,
      floatingTexts: diagram.floatingTexts ?? [],
      viewport: diagram.viewport ?? { x: 0, y: 0, scale: 1 },
      bookmarks: normalizeBookmarks(diagram.bookmarks),
      diagramTitle: diagram.title ?? "",
      diagramSubtitle: diagram.subtitle ?? "",
      showDiagramHeader: diagram.showHeader ?? true,
      diagramFontFamily: resolvedFamily ?? fontFamily,
      fontMissing: !resolvedFamily && !isDefaultDiagramFont(fontFamily),
      diagramBackgroundColor,
      diagramAppearance: {
        ...resolvedAppearance,
        // Keep open-diagram background as source of truth for the live canvas.
        backgroundMode: getDiagramBackgroundMode(
          showGrid,
          gridStyle,
          diagramBackgroundColor,
        ),
        backgroundColor: diagramBackgroundColor,
      },
      showGrid,
      gridStyle,
      selection: null,
      selectionDetailsOpen: false,
      connectFrom: null,
      connectDrag: null,
      toolMode: "select",
      exportBounds: null,
      undoStack: [],
      redoStack: [],
    });

    if (get().autosaveEnabled) {
      await get().flushAutosave();
    }
  },

  getDiagram: () => {
    const {
      characters,
      lines,
      groups,
      boxes,
      floatingTexts,
      viewport,
      bookmarks,
      diagramTitle,
      diagramSubtitle,
      showDiagramHeader,
      diagramFontFamily,
      diagramBackgroundColor,
      diagramAppearance,
      showGrid,
      gridStyle,
    } = get();
    return {
      schemaVersion: 2 as const,
      title: diagramTitle || undefined,
      subtitle: diagramSubtitle || undefined,
      showHeader: showDiagramHeader ? undefined : false,
      showGrid: showGrid ? undefined : false,
      gridStyle: gridStyle === "lines" ? undefined : gridStyle,
      fontFamily:
        diagramFontFamily !== DEFAULT_DIAGRAM_FONT
          ? diagramFontFamily
          : undefined,
      backgroundColor: serializeDiagramBackground(diagramBackgroundColor),
      appearance: serializeDiagramAppearance(diagramAppearance),
      characters,
      lines,
      groups,
      boxes,
      floatingTexts: floatingTexts.length > 0 ? floatingTexts : undefined,
      viewport,
      bookmarks: bookmarks.length > 0 ? bookmarks : undefined,
    };
  },
  })),
);

export function getCharacterInitials(name: string): string {
  if (!name.trim()) return i18n.t("defaults.initialsEmpty");
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function isCharacterHidden(
  characterId: string,
  boxes: Box[],
  characters: Character[],
  fontFamily?: string,
): boolean {
  return (
    getCollapsedBoxForCharacter(
      characterId,
      boxes,
      characters,
      fontFamily,
    ) != null
  );
}

export function isFloatingTextHidden(
  floatingTextId: string,
  boxes: Box[],
  floatingTexts: FloatingText[],
  fontFamily?: string,
): boolean {
  return (
    getCollapsedBoxForFloatingText(
      floatingTextId,
      boxes,
      floatingTexts,
      fontFamily,
    ) != null
  );
}

export function getExpandedBoxBounds(box: Box) {
  return resolveBoxBounds(box);
}

export { isCharacterContainedInBox };
