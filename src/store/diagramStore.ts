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
  MultiSelectableItem,
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
  COLLAPSED_BOX_SIZE,
  defaultMembershipAppearance,
} from "../models/types";
import {
  getCharactersContainedInBox,
  getEmptyBoxBounds,
  getFloatingTextsContainedInBox,
  isCharacterContainedInBox,
  resolveBoxBounds,
} from "../utils/geometry";
import { selectionAfterRemovingItem } from "../utils/selectionMulti";
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
  createEmptyDiagram,
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
  syncBackgroundModeFromCanvasState,
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
  hydrateAppPreferenceWallpapers,
  setAppPreferences,
} from "../utils/appPreferences";
import { computeDiagramBounds } from "../utils/diagramBounds";
import {
  computeViewportForBounds,
  viewportFromCenterAndScale,
} from "../utils/viewportFit";
import { randomPastelColor } from "../utils/pastelPalette";
import { remapDiagramElementColors } from "../utils/remapDiagramThemeColors";
import type { GroupsCanvasMode } from "../utils/groupHub";
import {
  snapBoxTopLeftToGrid,
  snapMultiSelectionDelta,
  snapPointToGrid,
  type MultiDragSnapshot,
} from "../utils/snapToGrid";

interface HistoryOptions {
  recordHistory?: boolean;
}

/** Optional absolute-from-snapshot options for box drag (supports snap-to-grid). */
export interface MoveBoxSnapOptions extends HistoryOptions {
  initialBox?: Box;
  initialCharacterPositions?: Record<string, { x: number; y: number }>;
  initialFloatingTextPositions?: Record<string, { x: number; y: number }>;
  totalDelta?: { dx: number; dy: number };
  /** When true, apply totalDelta from snapshot without re-snapping (multi-select). */
  skipSnap?: boolean;
}

/** Optional absolute-from-snapshot options for multi-select drag. */
export interface MoveMultiSelectionOptions extends HistoryOptions {
  initialSnapshot?: MultiDragSnapshot;
  totalDelta?: { dx: number; dy: number };
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
  /** Group hub eye: full hubs+corridors, connected badges only, or hidden. */
  groupsCanvasMode: GroupsCanvasMode;
  selectionPulseEnabled: boolean;
  /** When true, line label text contrasts with the label background. */
  lineLabelContrastWithBackground: boolean;
  /** When true, drag/place snaps to grid intersections. */
  snapToGridEnabled: boolean;
  selection: Selection;
  /** When false, the selection float stays closed even if something is selected. */
  selectionDetailsOpen: boolean;
  /** Floating text currently being edited inline on the canvas (HTML overlay). */
  editingFloatingTextId: string | null;
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
  /** Stable id from Diagram.id; used for local per-diagram preferences. */
  diagramId: string;
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
  setMultiSelection: (items: MultiSelectableItem[]) => void;
  moveMultiSelectionByDelta: (
    delta: { dx: number; dy: number },
    options?: MoveMultiSelectionOptions,
  ) => void;
  openSelectionDetails: () => void;
  beginEditingFloatingText: (id: string) => void;
  endEditingFloatingText: () => void;
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
  setDiagramAppearance: (
    patch: Partial<DiagramAppearance>,
    options?: HistoryOptions,
  ) => void;
  replaceDiagramAppearance: (appearance: DiagramAppearance) => void;
  applyDiagramTheme: (
    appearance: DiagramAppearance,
    options?: { remapDefaultColors?: boolean },
  ) => void;
  setBookmarksVisible: (visible: boolean) => void;
  setGroupsCanvasMode: (mode: GroupsCanvasMode) => void;
  setSelectionPulseEnabled: (enabled: boolean) => void;
  setLineLabelContrastWithBackground: (enabled: boolean) => void;
  setSnapToGridEnabled: (enabled: boolean) => void;
  openBookmarkEdit: (id: string) => void;
  closeBookmarkEdit: () => void;
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
  goToBookmark: (id: string, options?: { keepZoom?: boolean }) => void;
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
    patch: Partial<Omit<Group, "appearance" | "hubPosition">> & {
      appearance?: Partial<Group["appearance"]>;
      /** Pass `null` to clear a manual hub and return to member centroid. */
      hubPosition?: Group["hubPosition"] | null;
    },
    options?: HistoryOptions,
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
    options?: MoveBoxSnapOptions,
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

function buildDiagramAppearanceStateUpdate(appearance: DiagramAppearance): {
  diagramAppearance: DiagramAppearance;
  showGrid: boolean;
  gridStyle: GridStyle;
  diagramBackgroundColor: RGB | null;
  diagramFontFamily: string;
  fontMissing: boolean;
  showDiagramHeader: boolean;
} {
  const diagramAppearance = cloneDiagramAppearance(appearance);
  const background = applyDiagramBackgroundMode(
    diagramAppearance.backgroundMode,
    diagramAppearance.backgroundColor,
  );
  let fontFamily = diagramAppearance.fontFamily || DEFAULT_DIAGRAM_FONT;
  if (isDeprecatedFontFamily(fontFamily)) {
    fontFamily = DEFAULT_DIAGRAM_FONT;
  }
  const syncedAppearance = {
    ...diagramAppearance,
    fontFamily,
    backgroundMode: syncBackgroundModeFromCanvasState(
      diagramAppearance.backgroundMode,
      background.showGrid,
      background.gridStyle,
      background.backgroundColor,
    ),
    backgroundColor: background.backgroundColor,
  };
  return {
    diagramAppearance: syncedAppearance,
    showGrid: background.showGrid,
    gridStyle: background.gridStyle,
    diagramBackgroundColor: background.backgroundColor,
    diagramFontFamily: fontFamily,
    fontMissing: false,
    showDiagramHeader: syncedAppearance.showHeader,
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
    editingFloatingTextId: null,
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
  groupsCanvasMode: "full" as GroupsCanvasMode,
  selectionPulseEnabled: true,
  lineLabelContrastWithBackground: false,
  snapToGridEnabled: false,
  selection: null,
  selectionDetailsOpen: false,
  editingFloatingTextId: null,
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
  diagramId: uuidv4(),
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
      (selection != null &&
        selection.type !== "bookmark" &&
        selection.type !== "multi");
    set({
      selection,
      selectionDetailsOpen: openDetails,
      editingFloatingTextId: null,
      ...(editingGroupId != null && !stayingOnEditedGroup
        ? { toolMode: "select" as const }
        : {}),
    });
  },
  setMultiSelection: (items) => {
    if (items.length === 0) {
      get().setSelection(null);
      return;
    }
    if (items.length === 1) {
      get().setSelection(items[0], { openDetails: false });
      return;
    }
    get().setSelection({ type: "multi", items }, { openDetails: false });
  },
  moveMultiSelectionByDelta: (delta, options) => {
    const { selection, characters, boxes, floatingTexts, diagramFontFamily } =
      get();
    if (selection?.type !== "multi" || selection.items.length === 0) return;

    const snapshot = options?.initialSnapshot;
    const totalDelta = options?.totalDelta ?? delta;

    if (snapshot) {
      let dx = totalDelta.dx;
      let dy = totalDelta.dy;
      if (get().snapToGridEnabled) {
        const snapped = snapMultiSelectionDelta(
          snapshot.initialBounds,
          totalDelta,
        );
        dx = snapped.dx;
        dy = snapped.dy;
      }

      if (options?.recordHistory !== false) get().captureHistory();

      const movedByBoxCharacters = new Set<string>();
      const movedByBoxFloatingTexts = new Set<string>();

      for (const [boxId, contents] of Object.entries(snapshot.boxContents)) {
        for (const id of contents.characterIds) movedByBoxCharacters.add(id);
        for (const id of contents.floatingTextIds) {
          movedByBoxFloatingTexts.add(id);
        }
        const initialBoxSnap = snapshot.boxes[boxId];
        if (!initialBoxSnap) continue;
        const initialBox: Box = {
          id: boxId,
          name: "",
          collapsed: initialBoxSnap.collapsed,
          borderColor: { r: 0, g: 0, b: 0 },
          bounds: initialBoxSnap.bounds ?? undefined,
          anchorPosition: initialBoxSnap.anchorPosition ?? undefined,
          collapsedPosition: initialBoxSnap.collapsedPosition ?? undefined,
        };
        get().moveBox(
          boxId,
          { dx, dy },
          contents,
          {
            recordHistory: false,
            initialBox,
            initialCharacterPositions: snapshot.characters,
            initialFloatingTextPositions: snapshot.floatingTexts,
            totalDelta: { dx, dy },
            skipSnap: true,
          },
        );
      }

      // Apply absolute positions for standalone characters/text from snapshot
      // (selection AABB snap already applied; do not snap per-item).
      const selectedCharacterIds = new Set(
        selection.items.filter((i) => i.type === "character").map((i) => i.id),
      );
      const selectedFloatingTextIds = new Set(
        selection.items
          .filter((i) => i.type === "floatingText")
          .map((i) => i.id),
      );

      const charUpdates: Record<string, { x: number; y: number }> = {};
      const textUpdates: Record<string, { x: number; y: number }> = {};

      for (const characterId of selectedCharacterIds) {
        if (movedByBoxCharacters.has(characterId)) continue;
        const start = snapshot.characters[characterId];
        if (!start) continue;
        charUpdates[characterId] = {
          x: start.x + dx,
          y: start.y + dy,
        };
      }
      for (const floatingTextId of selectedFloatingTextIds) {
        if (movedByBoxFloatingTexts.has(floatingTextId)) continue;
        const start = snapshot.floatingTexts[floatingTextId];
        if (!start) continue;
        textUpdates[floatingTextId] = {
          x: start.x + dx,
          y: start.y + dy,
        };
      }

      if (
        Object.keys(charUpdates).length > 0 ||
        Object.keys(textUpdates).length > 0
      ) {
        set((s) => ({
          characters:
            Object.keys(charUpdates).length === 0
              ? s.characters
              : s.characters.map((c) =>
                  charUpdates[c.id]
                    ? { ...c, position: charUpdates[c.id] }
                    : c,
                ),
          floatingTexts:
            Object.keys(textUpdates).length === 0
              ? s.floatingTexts
              : s.floatingTexts.map((t) =>
                  textUpdates[t.id]
                    ? { ...t, position: textUpdates[t.id] }
                    : t,
                ),
        }));
      }
      return;
    }

    if (delta.dx === 0 && delta.dy === 0) return;

    if (options?.recordHistory !== false) get().captureHistory();

    const selectedBoxIds = new Set(
      selection.items.filter((i) => i.type === "box").map((i) => i.id),
    );
    const selectedCharacterIds = new Set(
      selection.items.filter((i) => i.type === "character").map((i) => i.id),
    );
    const selectedFloatingTextIds = new Set(
      selection.items
        .filter((i) => i.type === "floatingText")
        .map((i) => i.id),
    );

    const movedByBoxCharacters = new Set<string>();
    const movedByBoxFloatingTexts = new Set<string>();

    for (const boxId of selectedBoxIds) {
      const box = boxes.find((b) => b.id === boxId);
      if (!box) continue;
      const containedCharacters = getCharactersContainedInBox(
        box,
        characters,
        diagramFontFamily,
      );
      const containedFloatingTexts = getFloatingTextsContainedInBox(
        box,
        floatingTexts,
        diagramFontFamily,
      );
      for (const c of containedCharacters) movedByBoxCharacters.add(c.id);
      for (const t of containedFloatingTexts) movedByBoxFloatingTexts.add(t.id);

      get().moveBox(
        boxId,
        delta,
        {
          characterIds: containedCharacters.map((c) => c.id),
          floatingTextIds: containedFloatingTexts.map((t) => t.id),
        },
        { recordHistory: false },
      );
    }

    for (const characterId of selectedCharacterIds) {
      if (movedByBoxCharacters.has(characterId)) continue;
      const character = get().characters.find((c) => c.id === characterId);
      if (!character) continue;
      get().moveCharacter(
        characterId,
        {
          x: character.position.x + delta.dx,
          y: character.position.y + delta.dy,
        },
        { recordHistory: false },
      );
    }

    for (const floatingTextId of selectedFloatingTextIds) {
      if (movedByBoxFloatingTexts.has(floatingTextId)) continue;
      const floatingText = get().floatingTexts.find(
        (t) => t.id === floatingTextId,
      );
      if (!floatingText) continue;
      get().moveFloatingText(
        floatingTextId,
        {
          x: floatingText.position.x + delta.dx,
          y: floatingText.position.y + delta.dy,
        },
        { recordHistory: false },
      );
    }
  },
  openSelectionDetails: () => {
    const { selection } = get();
    if (!selection || selection.type === "multi") {
      return;
    }
    if (selection.type === "floatingText") {
      get().beginEditingFloatingText(selection.id);
      return;
    }
    set({ selectionDetailsOpen: true, editingFloatingTextId: null });
  },
  beginEditingFloatingText: (id) => {
    if (!get().floatingTexts.some((t) => t.id === id)) return;
    if (get().editingFloatingTextId !== id) {
      get().captureHistory();
    }
    set({
      editingFloatingTextId: id,
      selection: { type: "floatingText", id },
      selectionDetailsOpen: true,
    });
  },
  endEditingFloatingText: () => {
    if (get().editingFloatingTextId == null) return;
    set({ editingFloatingTextId: null });
  },
  setShowGrid: (show) =>
    {
      get().captureHistory();
      set((s) => ({
        showGrid: show,
        diagramAppearance: {
          ...s.diagramAppearance,
          // Leaving image mode when the user explicitly toggles the grid.
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
        // Leaving image mode when the user explicitly changes grid style.
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
    set((s) => ({
      showDiagramHeader: show,
      diagramAppearance: {
        ...s.diagramAppearance,
        showHeader: show,
      },
    }));
  },

  setDiagramBackgroundColor: (color) => {
    get().setDiagramAppearance({ backgroundColor: color });
  },

  setDiagramFontFamily: async (fontFamily) => {
    get().captureHistory();
    if (isDefaultDiagramFont(fontFamily) || isDeprecatedFontFamily(fontFamily)) {
      set((s) => ({
        diagramFontFamily: DEFAULT_DIAGRAM_FONT,
        fontMissing: false,
        diagramAppearance: {
          ...s.diagramAppearance,
          fontFamily: DEFAULT_DIAGRAM_FONT,
        },
      }));
      return;
    }

    const resolvedFamily = await ensureFontLoaded(fontFamily);
    set((s) => ({
      diagramFontFamily: resolvedFamily ?? fontFamily,
      fontMissing: !resolvedFamily,
      diagramAppearance: {
        ...s.diagramAppearance,
        fontFamily: resolvedFamily ?? fontFamily,
      },
    }));
  },

  setDiagramAppearance: (patch, options) => {
    if (options?.recordHistory !== false) get().captureHistory();
    set((s) => {
      const diagramAppearance = patchDiagramAppearance(
        s.diagramAppearance,
        patch,
      );
      const headerPatch =
        patch.showHeader !== undefined
          ? { showDiagramHeader: diagramAppearance.showHeader }
          : {};
      if (
        patch.backgroundMode === undefined &&
        patch.backgroundColor === undefined
      ) {
        return { diagramAppearance, ...headerPatch };
      }
      const background = applyDiagramBackgroundMode(
        diagramAppearance.backgroundMode,
        diagramAppearance.backgroundColor,
      );
      return {
        diagramAppearance: {
          ...diagramAppearance,
          backgroundMode: syncBackgroundModeFromCanvasState(
            diagramAppearance.backgroundMode,
            background.showGrid,
            background.gridStyle,
            background.backgroundColor,
          ),
          backgroundColor: background.backgroundColor,
        },
        showGrid: background.showGrid,
        gridStyle: background.gridStyle,
        diagramBackgroundColor: background.backgroundColor,
        ...headerPatch,
      };
    });
  },

  replaceDiagramAppearance: (appearance) => {
    get().captureHistory();
    const update = buildDiagramAppearanceStateUpdate(appearance);
    set(update);

    const fontFamily = update.diagramFontFamily;
    if (isDefaultDiagramFont(fontFamily)) return;

    void ensureFontLoaded(fontFamily).then((resolvedFamily) => {
      const current = get().diagramAppearance;
      if (current.fontFamily !== fontFamily) return;
      set({
        diagramFontFamily: resolvedFamily ?? fontFamily,
        fontMissing: !resolvedFamily,
        diagramAppearance: {
          ...current,
          fontFamily: resolvedFamily ?? fontFamily,
        },
      });
    });
  },

  applyDiagramTheme: (appearance, options) => {
    get().captureHistory();
    const previousAppearance = get().diagramAppearance;
    const update = buildDiagramAppearanceStateUpdate(appearance);

    if (options?.remapDefaultColors) {
      const remapped = remapDiagramElementColors(
        {
          characters: get().characters,
          lines: get().lines,
          boxes: get().boxes,
          floatingTexts: get().floatingTexts,
        },
        previousAppearance,
        update.diagramAppearance,
      );
      set({
        ...update,
        ...remapped,
      });
    } else {
      set(update);
    }

    const fontFamily = update.diagramFontFamily;
    if (isDefaultDiagramFont(fontFamily)) return;

    void ensureFontLoaded(fontFamily).then((resolvedFamily) => {
      const current = get().diagramAppearance;
      if (current.fontFamily !== fontFamily) return;
      set({
        diagramFontFamily: resolvedFamily ?? fontFamily,
        fontMissing: !resolvedFamily,
        diagramAppearance: {
          ...current,
          fontFamily: resolvedFamily ?? fontFamily,
        },
      });
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
    await hydrateAppPreferenceWallpapers();
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
      groupsCanvasMode: prefs.groupsCanvasMode,
      selectionPulseEnabled: prefs.selectionPulseEnabled,
      lineLabelContrastWithBackground: prefs.lineLabelContrastWithBackground,
      snapToGridEnabled: prefs.snapToGridEnabled,
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
      ...createEmptyDiagram(),
      showGrid: background.showGrid,
      gridStyle: background.gridStyle,
      showHeader: appearance.showHeader ? undefined : false,
      backgroundColor: serializeDiagramBackground(background.backgroundColor),
      fontFamily: isDefaultDiagramFont(appearance.fontFamily)
        ? undefined
        : appearance.fontFamily,
      appearance: serializeDiagramAppearance({
        ...appearance,
        backgroundMode: syncBackgroundModeFromCanvasState(
          appearance.backgroundMode,
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
    const pos = get().snapToGridEnabled
      ? snapPointToGrid(position)
      : position;
    const character = createDefaultCharacter(
      pos,
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
      selection: selectionAfterRemovingItem(s.selection, "character", id),
    }));
  },

  moveCharacter: (id, position, options) => {
    const nextPos = get().snapToGridEnabled
      ? snapPointToGrid(position)
      : position;
    const current = get().characters.find((c) => c.id === id);
    if (
      current &&
      current.position.x === nextPos.x &&
      current.position.y === nextPos.y
    ) {
      return;
    }
    if (options?.recordHistory !== false) get().captureHistory();
    set((s) => ({
      characters: s.characters.map((c) =>
        c.id === id ? { ...c, position: nextPos } : c,
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
      selectionDetailsOpen: true,
      toolMode: "editGroupMembers",
      connectFrom: null,
      connectDrag: null,
    }));
  },

  updateGroup: (id, patch, options) => {
    if (options?.recordHistory !== false) get().captureHistory();
    set((s) => ({
      groups: s.groups.map((g) => {
        if (g.id !== id) return g;
        const { appearance: appearancePatch, hubPosition, ...rest } = patch;
        const next: Group = {
          ...g,
          ...rest,
          appearance: appearancePatch
            ? { ...g.appearance, ...appearancePatch }
            : g.appearance,
        };
        if ("hubPosition" in patch) {
          if (hubPosition == null) {
            delete next.hubPosition;
          } else {
            next.hubPosition = { x: hubPosition.x, y: hubPosition.y };
          }
        }
        return next;
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
      const lines = s.lines.filter(
        (l) =>
          !(l.from.kind === "group" && l.from.id === id) &&
          !(l.to.kind === "group" && l.to.id === id),
      );
      let selection = s.selection;
      if (selection?.type === "group" && selection.id === id) {
        selection = null;
      } else if (selection?.type === "line") {
        const selectedLineId = selection.id;
        if (!lines.some((l) => l.id === selectedLineId)) {
          selection = null;
        }
      }
      return {
        groups: s.groups.filter((g) => g.id !== id),
        lines,
        selection,
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
    const { boxes, diagramAppearance, snapToGridEnabled } = get();
    const anchor = snapToGridEnabled ? snapPointToGrid(position) : position;
    const bounds = getEmptyBoxBounds(anchor);
    const box: Box = {
      id: uuidv4(),
      name: i18n.t("defaults.boxName", { n: boxes.length + 1 }),
      collapsed: false,
      anchorPosition: anchor,
      collapsedPosition: anchor,
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
      selection: selectionAfterRemovingItem(s.selection, "box", id),
    }));
  },

  toggleBoxCollapse: (id) => {
    get().captureHistory();
    const state = get();
    const box = state.boxes.find((b) => b.id === id);
    if (!box) return;
    const fontFamily = state.diagramFontFamily;

    if (!box.collapsed) {
      const bounds = resolveBoxBounds(box);
      if (!bounds) return;
      // Freeze membership at collapse so the expanded footprint cannot capture
      // objects while the chip is dragged around.
      const containedCharacterIds = getCharactersContainedInBox(
        box,
        state.characters,
        fontFamily,
      ).map((c) => c.id);
      const containedFloatingTextIds = getFloatingTextsContainedInBox(
        box,
        state.floatingTexts,
        fontFamily,
      ).map((t) => t.id);
      // collapsedPosition is the chip centre; place it so the chip's upper-left
      // matches the expanded box's upper-left (keeps the collapse control put).
      const collapsedPosition = {
        x: bounds.x + COLLAPSED_BOX_SIZE,
        y: bounds.y + COLLAPSED_BOX_SIZE,
      };
      set((s) => ({
        boxes: s.boxes.map((b) =>
          b.id === id
            ? {
                ...b,
                collapsed: true,
                collapsedPosition,
                containedCharacterIds,
                containedFloatingTextIds,
              }
            : b,
        ),
      }));
      return;
    }

    const bounds = resolveBoxBounds(box);
    const collapsedPos = box.collapsedPosition;
    if (!bounds || !collapsedPos) {
      set((s) => ({
        boxes: s.boxes.map((b) => {
          if (b.id !== id) return b;
          const next: Box = { ...b, collapsed: false };
          delete next.containedCharacterIds;
          delete next.containedFloatingTextIds;
          return next;
        }),
      }));
      return;
    }

    const dx = collapsedPos.x - COLLAPSED_BOX_SIZE - bounds.x;
    const dy = collapsedPos.y - COLLAPSED_BOX_SIZE - bounds.y;
    const containedCharacterIds = new Set(
      box.containedCharacterIds ??
        getCharactersContainedInBox(box, state.characters, fontFamily).map(
          (c) => c.id,
        ),
    );
    const containedFloatingTextIds = new Set(
      box.containedFloatingTextIds ??
        getFloatingTextsContainedInBox(
          box,
          state.floatingTexts,
          fontFamily,
        ).map((t) => t.id),
    );

    set((s) => ({
      characters: s.characters.map((c) => {
        if (!containedCharacterIds.has(c.id) || (dx === 0 && dy === 0)) {
          return c;
        }
        return {
          ...c,
          position: {
            x: c.position.x + dx,
            y: c.position.y + dy,
          },
        };
      }),
      floatingTexts: s.floatingTexts.map((t) => {
        if (!containedFloatingTextIds.has(t.id) || (dx === 0 && dy === 0)) {
          return t;
        }
        return {
          ...t,
          position: {
            x: t.position.x + dx,
            y: t.position.y + dy,
          },
        };
      }),
      boxes: s.boxes.map((b) => {
        if (b.id !== id) return b;
        const next: Box = { ...b, collapsed: false };
        delete next.containedCharacterIds;
        delete next.containedFloatingTextIds;
        if (dx === 0 && dy === 0) return next;
        if (b.bounds) {
          next.bounds = {
            ...b.bounds,
            x: b.bounds.x + dx,
            y: b.bounds.y + dy,
          };
        }
        if (b.anchorPosition) {
          next.anchorPosition = {
            x: b.anchorPosition.x + dx,
            y: b.anchorPosition.y + dy,
          };
        }
        return next;
      }),
    }));
  },

  moveBox: (id, delta, contents, options) => {
    if (options?.recordHistory !== false) get().captureHistory();

    const snapEnabled = get().snapToGridEnabled && !options?.skipSnap;
    const hasSnapshot =
      options?.initialBox != null && options.totalDelta != null;

    if (hasSnapshot) {
      const initialBox = options.initialBox!;
      const totalDelta = options.totalDelta!;
      const initialChars = options.initialCharacterPositions ?? {};
      const initialTexts = options.initialFloatingTextPositions ?? {};

      let dx = totalDelta.dx;
      let dy = totalDelta.dy;

      if (snapEnabled) {
        if (initialBox.collapsed) {
          const origin =
            initialBox.collapsedPosition ??
            initialBox.anchorPosition ??
            { x: 0, y: 0 };
          const snapped = snapPointToGrid({
            x: origin.x + totalDelta.dx,
            y: origin.y + totalDelta.dy,
          });
          dx = snapped.x - origin.x;
          dy = snapped.y - origin.y;
        } else {
          const origin = initialBox.bounds
            ? { x: initialBox.bounds.x, y: initialBox.bounds.y }
            : (initialBox.anchorPosition ?? { x: 0, y: 0 });
          const snapped = snapBoxTopLeftToGrid({
            x: origin.x + totalDelta.dx,
            y: origin.y + totalDelta.dy,
          });
          dx = snapped.x - origin.x;
          dy = snapped.y - origin.y;
        }
      }

      const containedCharacterIds = new Set(contents.characterIds);
      const containedFloatingTextIds = new Set(contents.floatingTextIds);

      set((s) => ({
        characters: s.characters.map((c) => {
          if (!containedCharacterIds.has(c.id)) return c;
          const start = initialChars[c.id] ?? c.position;
          return {
            ...c,
            position: { x: start.x + dx, y: start.y + dy },
          };
        }),
        floatingTexts: s.floatingTexts.map((t) => {
          if (!containedFloatingTextIds.has(t.id)) return t;
          const start = initialTexts[t.id] ?? t.position;
          return {
            ...t,
            position: { x: start.x + dx, y: start.y + dy },
          };
        }),
        boxes: s.boxes.map((b) => {
          if (b.id !== id) return b;
          const next: Box = { ...b };
          if (initialBox.bounds) {
            next.bounds = {
              ...initialBox.bounds,
              x: initialBox.bounds.x + dx,
              y: initialBox.bounds.y + dy,
            };
          }
          if (initialBox.anchorPosition) {
            next.anchorPosition = {
              x: initialBox.anchorPosition.x + dx,
              y: initialBox.anchorPosition.y + dy,
            };
          }
          if (initialBox.collapsedPosition) {
            next.collapsedPosition = {
              x: initialBox.collapsedPosition.x + dx,
              y: initialBox.collapsedPosition.y + dy,
            };
          }
          return next;
        }),
      }));
      return;
    }

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
    const pos = get().snapToGridEnabled
      ? snapPointToGrid(position)
      : position;
    const floatingText: FloatingText = {
      id: uuidv4(),
      position: pos,
      text: "",
      color: { ...get().diagramAppearance.defaultFloatingTextColor },
      fontSize: DEFAULT_FLOATING_TEXT_FONT_SIZE,
    };
    set((s) => ({
      floatingTexts: [...s.floatingTexts, floatingText],
      selection: { type: "floatingText", id: floatingText.id },
      selectionDetailsOpen: true,
      editingFloatingTextId: floatingText.id,
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
      selection: selectionAfterRemovingItem(s.selection, "floatingText", id),
      editingFloatingTextId:
        s.editingFloatingTextId === id ? null : s.editingFloatingTextId,
    }));
  },

  moveFloatingText: (id, position, options) => {
    const nextPos = get().snapToGridEnabled
      ? snapPointToGrid(position)
      : position;
    const current = get().floatingTexts.find((t) => t.id === id);
    if (
      current &&
      current.position.x === nextPos.x &&
      current.position.y === nextPos.y
    ) {
      return;
    }
    if (options?.recordHistory !== false) get().captureHistory();
    set((s) => ({
      floatingTexts: s.floatingTexts.map((t) =>
        t.id === id ? { ...t, position: nextPos } : t,
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
      if (ref.kind === "group") {
        get().setSelection({ type: "group", id: ref.id }, { openDetails });
        return;
      }
      get().setSelection({ type: "box", id: ref.id });
      return;
    }
    if (ref.kind === "character") {
      get().setSelection({ type: "character", id: ref.id }, { openDetails });
    } else if (ref.kind === "group") {
      get().setSelection({ type: "group", id: ref.id }, { openDetails });
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
    const { connectDrag, characters, boxes, groups } = get();
    if (!connectDrag) return;

    const moved = Math.hypot(
      point.x - connectDrag.startX,
      point.y - connectDrag.startY,
    );
    const target = findConnectionTargetAt(
      point,
      characters,
      boxes,
      groups,
    );

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
    const { selection, selectionDetailsOpen } = get();
    // Keep selection while the bookmark float is open so the flag and extents
    // stay visible even when other bookmark markers are hidden.
    const clearBookmarkSelection =
      visible === false &&
      selection?.type === "bookmark" &&
      !selectionDetailsOpen;
    set({
      bookmarksVisible: visible,
      ...(clearBookmarkSelection ? { selection: null } : {}),
    });
    setAppPreferences({ bookmarksVisible: visible });
  },

  setGroupsCanvasMode: (mode) => {
    set({ groupsCanvasMode: mode });
    setAppPreferences({ groupsCanvasMode: mode });
  },

  setSelectionPulseEnabled: (enabled) => {
    set({ selectionPulseEnabled: enabled });
    setAppPreferences({ selectionPulseEnabled: enabled });
  },

  setLineLabelContrastWithBackground: (enabled) => {
    set({ lineLabelContrastWithBackground: enabled });
    setAppPreferences({ lineLabelContrastWithBackground: enabled });
  },

  setSnapToGridEnabled: (enabled) => {
    set({ snapToGridEnabled: enabled });
    setAppPreferences({ snapToGridEnabled: enabled });
  },

  openBookmarkEdit: (id) => {
    if (!get().bookmarks.some((b) => b.id === id)) return;
    set({
      selection: { type: "bookmark", id },
      selectionDetailsOpen: true,
    });
  },

  closeBookmarkEdit: () => {
    const { selection, selectionDetailsOpen } = get();
    if (selection?.type !== "bookmark" || !selectionDetailsOpen) return;
    set({
      selectionDetailsOpen: false,
      selection: null,
    });
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
            ? { name: patch.name.slice(0, 80) }
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
        ? { selection: null, selectionDetailsOpen: false }
        : {}),
    }));
  },

  goToBookmark: (id, options) => {
    const bookmark = get().bookmarks.find((b) => b.id === id);
    if (!bookmark) return;
    if (options?.keepZoom) {
      const { viewport, stageSize } = get();
      set({
        viewport: viewportFromCenterAndScale(
          bookmark.anchor,
          viewport.scale,
          stageSize,
        ),
      });
      return;
    }
    set({ viewport: { ...bookmark.viewport } });
  },

  deleteSelected: () => {
    const { selection } = get();
    if (!selection) return;

    if (selection.type === "multi") {
      get().captureHistory();
      const characterIds = selection.items
        .filter((i) => i.type === "character")
        .map((i) => i.id);
      const boxIds = selection.items
        .filter((i) => i.type === "box")
        .map((i) => i.id);
      const floatingTextIds = selection.items
        .filter((i) => i.type === "floatingText")
        .map((i) => i.id);

      set((s) => {
        const characterIdSet = new Set(characterIds);
        const boxIdSet = new Set(boxIds);
        const floatingTextIdSet = new Set(floatingTextIds);

        return {
          characters: s.characters.filter((c) => !characterIdSet.has(c.id)),
          boxes: s.boxes.filter((b) => !boxIdSet.has(b.id)),
          floatingTexts: s.floatingTexts.filter(
            (t) => !floatingTextIdSet.has(t.id),
          ),
          lines: s.lines.filter(
            (l) =>
              !(
                (l.from.kind === "character" &&
                  characterIdSet.has(l.from.id)) ||
                (l.to.kind === "character" && characterIdSet.has(l.to.id)) ||
                (l.from.kind === "box" && boxIdSet.has(l.from.id)) ||
                (l.to.kind === "box" && boxIdSet.has(l.to.id))
              ),
          ),
          groups: s.groups.map((g) => ({
            ...g,
            memberCharacterIds: g.memberCharacterIds.filter(
              (mid) => !characterIdSet.has(mid),
            ),
          })),
          selection: null,
          selectionDetailsOpen: false,
          editingFloatingTextId: null,
        };
      });
      return;
    }

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

    const resolvedAppearance = mergeLegacyHeaderColors(
      resolveDiagramAppearance(diagram.appearance),
      diagram.titleColor,
      diagram.subtitleColor,
    );
    let fontFamily =
      diagram.fontFamily ?? resolvedAppearance.fontFamily ?? DEFAULT_DIAGRAM_FONT;
    if (isDeprecatedFontFamily(fontFamily)) {
      fontFamily = DEFAULT_DIAGRAM_FONT;
    }

    const resolvedFamily = await ensureFontLoaded(fontFamily);
    const diagramBackgroundColor = resolveDiagramBackground(
      diagram.backgroundColor,
    );
    const showGrid = diagram.showGrid ?? true;
    const gridStyle = diagram.gridStyle === "dots" ? "dots" : "lines";
    const isImageBackground = resolvedAppearance.backgroundMode === "image";
    const liveShowGrid = isImageBackground ? false : showGrid;
    const liveGridStyle = isImageBackground ? "lines" : gridStyle;
    const liveFontFamily = resolvedFamily ?? fontFamily;
    const liveShowHeader =
      diagram.showHeader ?? resolvedAppearance.showHeader ?? true;
    set({
      characters: diagram.characters,
      lines: diagram.lines,
      groups: diagram.groups,
      boxes: diagram.boxes,
      floatingTexts: diagram.floatingTexts ?? [],
      viewport: diagram.viewport ?? { x: 0, y: 0, scale: 1 },
      bookmarks: normalizeBookmarks(diagram.bookmarks),
      diagramId: diagram.id,
      diagramTitle: diagram.title ?? "",
      diagramSubtitle: diagram.subtitle ?? "",
      showDiagramHeader: liveShowHeader,
      diagramFontFamily: liveFontFamily,
      fontMissing: !resolvedFamily && !isDefaultDiagramFont(fontFamily),
      diagramBackgroundColor,
      diagramAppearance: {
        ...resolvedAppearance,
        fontFamily: liveFontFamily,
        showHeader: liveShowHeader,
        // Keep open-diagram background as source of truth for the live canvas,
        // but preserve explicit image mode from appearance.
        backgroundMode: syncBackgroundModeFromCanvasState(
          resolvedAppearance.backgroundMode,
          liveShowGrid,
          liveGridStyle,
          diagramBackgroundColor,
        ),
        backgroundColor: diagramBackgroundColor,
      },
      showGrid: liveShowGrid,
      gridStyle: liveGridStyle,
      selection: null,
      selectionDetailsOpen: false,
      editingFloatingTextId: null,
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
      diagramId,
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
      schemaVersion: 3 as const,
      id: diagramId,
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
