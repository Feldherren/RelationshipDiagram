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
import { EMPTY_DIAGRAM } from "./autosaveState";
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
  DEFAULT_DIAGRAM_SUBTITLE_COLOR,
  DEFAULT_DIAGRAM_TITLE_COLOR,
  resolveDiagramSubtitleColor,
  resolveDiagramTitleColor,
  serializeDiagramSubtitleColor,
  serializeDiagramTitleColor,
} from "../utils/diagramHeaderPill";
import {
  cloneDiagramAppearance,
  DEFAULT_DIAGRAM_APPEARANCE,
  patchDiagramAppearance,
  resolveDiagramAppearance,
  serializeDiagramAppearance,
} from "../utils/diagramAppearance";
import { getAppPreferences } from "../utils/appPreferences";

interface DiagramState {
  characters: Character[];
  lines: Line[];
  groups: Group[];
  boxes: Box[];
  floatingTexts: FloatingText[];
  viewport: Viewport;
  selection: Selection;
  toolMode: ToolMode;
  connectFrom: NodeRef | null;
  connectDrag: ConnectDrag | null;
  showGrid: boolean;
  gridStyle: GridStyle;
  exportBounds: Bounds | null;
  stageSize: { width: number; height: number };
  diagramTitle: string;
  diagramSubtitle: string;
  diagramTitleColor: RGB;
  diagramSubtitleColor: RGB;
  showDiagramHeader: boolean;
  diagramFontFamily: string;
  fontMissing: boolean;
  diagramBackgroundColor: RGB | null;
  diagramAppearance: DiagramAppearance;
  autosaveEnabled: boolean;

  setStageSize: (width: number, height: number) => void;
  setViewport: (viewport: Partial<Viewport>) => void;
  setToolMode: (mode: ToolMode) => void;
  setSelection: (selection: Selection) => void;
  setShowGrid: (show: boolean) => void;
  setGridStyle: (style: GridStyle) => void;
  setDiagramBackgroundMode: (mode: DiagramBackgroundMode) => void;
  setAutosaveEnabled: (enabled: boolean) => void;
  setExportBounds: (bounds: Bounds | null) => void;
  setDiagramTitle: (title: string) => void;
  setDiagramSubtitle: (subtitle: string) => void;
  setDiagramTitleColor: (color: RGB) => void;
  setDiagramSubtitleColor: (color: RGB) => void;
  setShowDiagramHeader: (show: boolean) => void;
  setDiagramBackgroundColor: (color: RGB | null) => void;
  setDiagramFontFamily: (fontFamily: string) => Promise<void>;
  setDiagramAppearance: (patch: Partial<DiagramAppearance>) => void;
  replaceDiagramAppearance: (appearance: DiagramAppearance) => void;
  initializeFonts: () => Promise<void>;
  bootstrapApp: () => Promise<void>;
  getAutosaveSnapshot: () => ReturnType<typeof createAutosaveSnapshot>;
  flushAutosave: () => Promise<void>;
  newDiagram: () => Promise<void>;

  addCharacterAt: (position: { x: number; y: number }) => void;
  updateCharacter: (id: string, patch: Partial<Character>) => void;
  deleteCharacter: (id: string) => void;
  moveCharacter: (id: string, position: { x: number; y: number }) => void;

  addLine: (from: NodeRef, to: NodeRef) => void;
  updateLine: (id: string, patch: Partial<Line>) => void;
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
  updateBox: (id: string, patch: Partial<Box>) => void;
  deleteBox: (id: string) => void;
  toggleBoxCollapse: (id: string) => void;
  moveBox: (
    id: string,
    delta: { dx: number; dy: number },
    contents: { characterIds: string[]; floatingTextIds: string[] },
  ) => void;

  addFloatingTextAt: (position: { x: number; y: number }) => void;
  updateFloatingText: (id: string, patch: Partial<FloatingText>) => void;
  deleteFloatingText: (id: string) => void;
  moveFloatingText: (id: string, position: { x: number; y: number }) => void;

  handleNodeClick: (ref: NodeRef) => void;
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

export const useDiagramStore = create<DiagramState>()(
  subscribeWithSelector((set, get) => ({
  characters: [],
  lines: [],
  groups: [],
  boxes: [],
  floatingTexts: [],
  viewport: { x: 0, y: 0, scale: 1 },
  selection: null,
  toolMode: "select",
  connectFrom: null,
  connectDrag: null,
  showGrid: true,
  gridStyle: "lines",
  exportBounds: null,
  stageSize: { width: 800, height: 600 },
  diagramTitle: "",
  diagramSubtitle: "",
  diagramTitleColor: { ...DEFAULT_DIAGRAM_TITLE_COLOR },
  diagramSubtitleColor: { ...DEFAULT_DIAGRAM_SUBTITLE_COLOR },
  showDiagramHeader: true,
  diagramFontFamily: DEFAULT_DIAGRAM_FONT,
  fontMissing: false,
  diagramBackgroundColor: DEFAULT_DIAGRAM_BACKGROUND,
  diagramAppearance: cloneDiagramAppearance(DEFAULT_DIAGRAM_APPEARANCE),
  autosaveEnabled: false,

  setStageSize: (width, height) => set({ stageSize: { width, height } }),
  setViewport: (patch) =>
    set((s) => ({ viewport: { ...s.viewport, ...patch } })),
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
  setSelection: (selection) => {
    const { toolMode, selection: prev } = get();
    const editingGroupId =
      toolMode === "editGroupMembers" && prev?.type === "group"
        ? prev.id
        : null;
    const stayingOnEditedGroup =
      editingGroupId != null &&
      selection?.type === "group" &&
      selection.id === editingGroupId;
    set({
      selection,
      ...(editingGroupId != null && !stayingOnEditedGroup
        ? { toolMode: "select" as const }
        : {}),
    });
  },
  setShowGrid: (show) =>
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
    })),
  setGridStyle: (style) =>
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
    })),
  setDiagramBackgroundMode: (mode) => {
    get().setDiagramAppearance({ backgroundMode: mode });
  },
  setAutosaveEnabled: (enabled) => set({ autosaveEnabled: enabled }),
  setExportBounds: (bounds) => set({ exportBounds: bounds }),

  setDiagramTitle: (title) => set({ diagramTitle: title }),

  setDiagramSubtitle: (subtitle) => set({ diagramSubtitle: subtitle }),

  setDiagramTitleColor: (color) => set({ diagramTitleColor: { ...color } }),

  setDiagramSubtitleColor: (color) =>
    set({ diagramSubtitleColor: { ...color } }),

  setShowDiagramHeader: (show) => set({ showDiagramHeader: show }),

  setDiagramBackgroundColor: (color) => {
    get().setDiagramAppearance({ backgroundColor: color });
  },

  setDiagramFontFamily: async (fontFamily) => {
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

  setDiagramAppearance: (patch) =>
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
    }),

  replaceDiagramAppearance: (appearance) => {
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

    set({ autosaveEnabled: prefs.autosaveEnabled });
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
    const character = createDefaultCharacter(
      position,
      get().diagramAppearance.defaultCharacterBorderColor,
    );
    set((s) => ({
      characters: [...s.characters, character],
      selection: { type: "character", id: character.id },
    }));
  },

  updateCharacter: (id, patch) =>
    set((s) => ({
      characters: s.characters.map((c) =>
        c.id === id ? { ...c, ...patch } : c,
      ),
    })),

  deleteCharacter: (id) =>
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
    })),

  moveCharacter: (id, position) =>
    set((s) => ({
      characters: s.characters.map((c) =>
        c.id === id ? { ...c, position } : c,
      ),
    })),

  addLine: (from, to) => {
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
      connectFrom: null,
      connectDrag: null,
    }));
  },

  updateLine: (id, patch) =>
    set((s) => ({
      lines: s.lines.map((l) => (l.id === id ? { ...l, ...patch } : l)),
    })),

  deleteLine: (id) =>
    set((s) => ({
      lines: s.lines.filter((l) => l.id !== id),
      selection:
        s.selection?.type === "line" && s.selection.id === id
          ? null
          : s.selection,
    })),

  addGroup: (name) => {
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
    }));
  },

  updateGroup: (id, patch) =>
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
    })),

  deleteGroup: (id) =>
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
    }),

  addCharacterToGroup: (characterId, groupId) =>
    set((s) => ({
      groups: s.groups.map((g) => {
        if (g.id !== groupId) return g;
        if (g.memberCharacterIds.includes(characterId)) return g;
        return {
          ...g,
          memberCharacterIds: [...g.memberCharacterIds, characterId],
        };
      }),
    })),

  removeCharacterFromGroup: (characterId, groupId) =>
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
    })),

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
    }));
  },

  updateBox: (id, patch) =>
    set((s) => ({
      boxes: s.boxes.map((b) => (b.id === id ? { ...b, ...patch } : b)),
    })),

  deleteBox: (id) =>
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
    })),

  toggleBoxCollapse: (id) => {
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

  moveBox: (id, delta, contents) =>
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
    }),

  addFloatingTextAt: (position) => {
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
    }));
  },

  updateFloatingText: (id, patch) =>
    set((s) => ({
      floatingTexts: s.floatingTexts.map((t) =>
        t.id === id ? { ...t, ...patch } : t,
      ),
    })),

  deleteFloatingText: (id) =>
    set((s) => ({
      floatingTexts: s.floatingTexts.filter((t) => t.id !== id),
      selection:
        s.selection?.type === "floatingText" && s.selection.id === id
          ? null
          : s.selection,
    })),

  moveFloatingText: (id, position) =>
    set((s) => ({
      floatingTexts: s.floatingTexts.map((t) =>
        t.id === id ? { ...t, position } : t,
      ),
    })),

  handleNodeClick: (ref) => {
    const { connectFrom, toolMode, selection } = get();
    if (connectFrom) {
      get().addLine(connectFrom, ref);
      return;
    }
    if (toolMode === "editGroupMembers" && selection?.type === "group") {
      if (ref.kind === "character") {
        get().toggleCharacterInGroup(ref.id, selection.id);
        return;
      }
      get().setSelection({ type: "box", id: ref.id });
      return;
    }
    if (ref.kind === "character") {
      set({ selection: { type: "character", id: ref.id } });
    } else {
      set({ selection: { type: "box", id: ref.id } });
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

  deleteSelected: () => {
    const { selection } = get();
    if (!selection) return;
    if (selection.type === "character") get().deleteCharacter(selection.id);
    if (selection.type === "line") get().deleteLine(selection.id);
    if (selection.type === "group") get().deleteGroup(selection.id);
    if (selection.type === "box") get().deleteBox(selection.id);
    if (selection.type === "floatingText")
      get().deleteFloatingText(selection.id);
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
    const resolvedAppearance = resolveDiagramAppearance(diagram.appearance);
    set({
      characters: diagram.characters,
      lines: diagram.lines,
      groups: diagram.groups,
      boxes: diagram.boxes,
      floatingTexts: diagram.floatingTexts ?? [],
      viewport: diagram.viewport ?? { x: 0, y: 0, scale: 1 },
      diagramTitle: diagram.title ?? "",
      diagramSubtitle: diagram.subtitle ?? "",
      diagramTitleColor: resolveDiagramTitleColor(diagram.titleColor),
      diagramSubtitleColor: resolveDiagramSubtitleColor(diagram.subtitleColor),
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
      connectFrom: null,
      connectDrag: null,
      toolMode: "select",
      exportBounds: null,
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
      diagramTitle,
      diagramSubtitle,
      diagramTitleColor,
      diagramSubtitleColor,
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
      titleColor: serializeDiagramTitleColor(diagramTitleColor),
      subtitleColor: serializeDiagramSubtitleColor(diagramSubtitleColor),
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
