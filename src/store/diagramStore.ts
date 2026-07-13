import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";
import type {
  Bounds,
  Character,
  ConnectDrag,
  Diagram,
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
  defaultRgb,
} from "../models/types";
import { getGroupCenter, getGroupMemberBounds } from "../utils/geometry";
import {
  DEFAULT_DIAGRAM_FONT,
  cleanupDeprecatedFonts,
  ensureFontLoaded,
  isDefaultDiagramFont,
} from "../utils/diagramFont";
import { isDeprecatedFontFamily } from "../utils/systemFonts";
import {
  initialBendForRouteIndex,
  nextRouteIndex,
} from "../utils/lineRouting";
import {
  findConnectionTargetAt,
  sameNodeRef,
} from "../utils/connection";
import {
  createAutosaveSnapshot,
  loadAutosave,
  saveAutosave,
} from "../utils/autosaveStorage";
import { EMPTY_DIAGRAM } from "./autosaveState";
import {
  DEFAULT_DIAGRAM_BACKGROUND,
  resolveDiagramBackground,
  serializeDiagramBackground,
} from "../utils/diagramBackground";

interface DiagramState {
  characters: Character[];
  lines: Line[];
  groups: Group[];
  viewport: Viewport;
  selection: Selection;
  toolMode: ToolMode;
  connectFrom: NodeRef | null;
  connectDrag: ConnectDrag | null;
  showGrid: boolean;
  exportBounds: Bounds | null;
  stageSize: { width: number; height: number };
  diagramTitle: string;
  diagramSubtitle: string;
  showDiagramHeader: boolean;
  diagramFontFamily: string;
  fontMissing: boolean;
  diagramBackgroundColor: RGB | null;
  autosaveEnabled: boolean;

  setStageSize: (width: number, height: number) => void;
  setViewport: (viewport: Partial<Viewport>) => void;
  setToolMode: (mode: ToolMode) => void;
  setSelection: (selection: Selection) => void;
  setShowGrid: (show: boolean) => void;
  setExportBounds: (bounds: Bounds | null) => void;
  setDiagramTitle: (title: string) => void;
  setDiagramSubtitle: (subtitle: string) => void;
  setShowDiagramHeader: (show: boolean) => void;
  setDiagramBackgroundColor: (color: RGB | null) => void;
  setDiagramFontFamily: (fontFamily: string) => Promise<void>;
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

  addGroupAt: (position: { x: number; y: number }) => void;
  updateGroup: (id: string, patch: Partial<Group>) => void;
  deleteGroup: (id: string) => void;
  toggleGroupCollapse: (id: string) => void;
  addCharacterToGroup: (characterId: string, groupId: string) => void;

  handleNodeClick: (ref: NodeRef) => void;
  startConnectDrag: (from: NodeRef, point: { x: number; y: number }) => void;
  updateConnectDrag: (point: { x: number; y: number }) => void;
  endConnectDrag: (point: { x: number; y: number }) => void;
  cancelConnect: () => void;
  deleteSelected: () => void;
  loadDiagram: (
    diagram: Diagram,
    options?: { showGrid?: boolean },
  ) => Promise<void>;
  getDiagram: () => Diagram;
  screenToWorld: (screen: { x: number; y: number }) => { x: number; y: number };
  getViewportCenter: () => { x: number; y: number };
}

function createDefaultCharacter(position: { x: number; y: number }): Character {
  return {
    id: uuidv4(),
    position,
    name: "",
    borderShape: "circle",
    borderColor: defaultRgb(),
    size: DEFAULT_CHARACTER_SIZE,
  };
}

export const useDiagramStore = create<DiagramState>((set, get) => ({
  characters: [],
  lines: [],
  groups: [],
  viewport: { x: 0, y: 0, scale: 1 },
  selection: null,
  toolMode: "select",
  connectFrom: null,
  connectDrag: null,
  showGrid: true,
  exportBounds: null,
  stageSize: { width: 800, height: 600 },
  diagramTitle: "",
  diagramSubtitle: "",
  showDiagramHeader: true,
  diagramFontFamily: DEFAULT_DIAGRAM_FONT,
  fontMissing: false,
  diagramBackgroundColor: DEFAULT_DIAGRAM_BACKGROUND,
  autosaveEnabled: false,

  setStageSize: (width, height) => set({ stageSize: { width, height } }),
  setViewport: (patch) =>
    set((s) => ({ viewport: { ...s.viewport, ...patch } })),
  setToolMode: (mode) =>
    set({
      toolMode: mode,
      connectFrom: null,
      connectDrag: null,
      exportBounds: mode === "exportBounds" ? get().exportBounds : null,
    }),
  setSelection: (selection) => set({ selection }),
  setShowGrid: (show) => set({ showGrid: show }),
  setExportBounds: (bounds) => set({ exportBounds: bounds }),

  setDiagramTitle: (title) => set({ diagramTitle: title }),

  setDiagramSubtitle: (subtitle) => set({ diagramSubtitle: subtitle }),

  setShowDiagramHeader: (show) => set({ showDiagramHeader: show }),

  setDiagramBackgroundColor: (color) => set({ diagramBackgroundColor: color }),

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
    set({ autosaveEnabled: false });

    const snapshot = await loadAutosave();
    if (snapshot) {
      await get().loadDiagram(snapshot.diagram, { showGrid: snapshot.showGrid });
    } else {
      await get().initializeFonts();
    }

    set({ autosaveEnabled: true });
  },

  getAutosaveSnapshot: () => {
    const { showGrid } = get();
    return createAutosaveSnapshot(get().getDiagram(), showGrid);
  },

  flushAutosave: async () => {
    if (!get().autosaveEnabled) return;
    try {
      await saveAutosave(get().getAutosaveSnapshot());
    } catch (err) {
      console.error("Autosave failed:", err);
    }
  },

  newDiagram: async () => {
    set({ autosaveEnabled: false });
    await get().loadDiagram(EMPTY_DIAGRAM, { showGrid: true });
    set({ autosaveEnabled: true });
    await get().flushAutosave();
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
    const character = createDefaultCharacter(position);
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
    if (from.id === to.id && from.kind === to.kind) return;
    const existingLines = get().lines;
    const routeIndex = nextRouteIndex(from, to, existingLines);
    const line: Line = {
      id: uuidv4(),
      from,
      to,
      color: { r: 60, g: 60, b: 60 },
      style: "straight",
      startArrow: false,
      endArrow: true,
      routeIndex,
      bend: initialBendForRouteIndex(routeIndex),
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

  addGroupAt: (position) => {
    const { groups } = get();
    const group: Group = {
      id: uuidv4(),
      name: `Group ${groups.length + 1}`,
      memberCharacterIds: [],
      collapsed: false,
      anchorPosition: position,
      collapsedPosition: position,
      borderColor: { r: 100, g: 140, b: 100 },
    };

    set((s) => ({
      groups: [...s.groups, group],
      selection: { type: "group", id: group.id },
    }));
  },

  updateGroup: (id, patch) =>
    set((s) => ({
      groups: s.groups.map((g) => (g.id === id ? { ...g, ...patch } : g)),
    })),

  deleteGroup: (id) =>
    set((s) => ({
      groups: s.groups.filter((g) => g.id !== id),
      lines: s.lines.filter(
        (l) =>
          !(l.from.kind === "group" && l.from.id === id) &&
          !(l.to.kind === "group" && l.to.id === id),
      ),
      selection:
        s.selection?.type === "group" && s.selection.id === id
          ? null
          : s.selection,
    })),

  toggleGroupCollapse: (id) => {
    const state = get();
    const group = state.groups.find((g) => g.id === id);
    if (!group) return;

    if (!group.collapsed) {
      const center = getGroupCenter(group, state.characters);
      set((s) => ({
        groups: s.groups.map((g) =>
          g.id === id
            ? { ...g, collapsed: true, collapsedPosition: center }
            : g,
        ),
      }));
    } else {
      set((s) => ({
        groups: s.groups.map((g) =>
          g.id === id ? { ...g, collapsed: false } : g,
        ),
      }));
    }
  },

  addCharacterToGroup: (characterId, groupId) =>
    set((s) => ({
      groups: s.groups.map((g) => {
        if (g.id !== groupId) {
          return {
            ...g,
            memberCharacterIds: g.memberCharacterIds.filter(
              (id) => id !== characterId,
            ),
          };
        }
        if (g.memberCharacterIds.includes(characterId)) return g;
        return {
          ...g,
          memberCharacterIds: [...g.memberCharacterIds, characterId],
        };
      }),
    })),

  handleNodeClick: (ref) => {
    const { connectFrom } = get();
    if (connectFrom) {
      if (sameNodeRef(connectFrom, ref)) {
        set({ connectFrom: null });
        return;
      }
      get().addLine(connectFrom, ref);
      return;
    }
    if (ref.kind === "character") {
      set({ selection: { type: "character", id: ref.id } });
    } else {
      set({ selection: { type: "group", id: ref.id } });
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
    }),

  updateConnectDrag: (point) =>
    set((s) =>
      s.connectDrag
        ? { connectDrag: { ...s.connectDrag, x: point.x, y: point.y } }
        : {},
    ),

  endConnectDrag: (point) => {
    const { connectDrag, characters, groups } = get();
    if (!connectDrag) return;

    const moved = Math.hypot(
      point.x - connectDrag.startX,
      point.y - connectDrag.startY,
    );
    const target = findConnectionTargetAt(point, characters, groups);

    if (target && !sameNodeRef(connectDrag.from, target)) {
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
  },

  loadDiagram: async (diagram, options) => {
    await cleanupDeprecatedFonts();

    let fontFamily = diagram.fontFamily ?? DEFAULT_DIAGRAM_FONT;
    if (isDeprecatedFontFamily(fontFamily)) {
      fontFamily = DEFAULT_DIAGRAM_FONT;
    }

    const resolvedFamily = await ensureFontLoaded(fontFamily);
    set({
      characters: diagram.characters,
      lines: diagram.lines,
      groups: diagram.groups,
      viewport: diagram.viewport ?? { x: 0, y: 0, scale: 1 },
      diagramTitle: diagram.title ?? "",
      diagramSubtitle: diagram.subtitle ?? "",
      showDiagramHeader: diagram.showHeader ?? true,
      diagramFontFamily: resolvedFamily ?? fontFamily,
      fontMissing: !resolvedFamily && !isDefaultDiagramFont(fontFamily),
      diagramBackgroundColor: resolveDiagramBackground(diagram.backgroundColor),
      showGrid: options?.showGrid ?? get().showGrid,
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
      viewport,
      diagramTitle,
      diagramSubtitle,
      showDiagramHeader,
      diagramFontFamily,
      diagramBackgroundColor,
    } = get();
    return {
      schemaVersion: 1 as const,
      title: diagramTitle || undefined,
      subtitle: diagramSubtitle || undefined,
      showHeader: showDiagramHeader ? undefined : false,
      fontFamily:
        diagramFontFamily !== DEFAULT_DIAGRAM_FONT
          ? diagramFontFamily
          : undefined,
      backgroundColor: serializeDiagramBackground(diagramBackgroundColor),
      characters,
      lines,
      groups,
      viewport,
    };
  },
}));

export function getCharacterInitials(name: string): string {
  if (!name.trim()) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function isCharacterHidden(characterId: string, groups: Group[]): boolean {
  return groups.some(
    (g) => g.collapsed && g.memberCharacterIds.includes(characterId),
  );
}

export function getExpandedGroupBounds(
  group: Group,
  characters: Character[],
) {
  return getGroupMemberBounds(group, characters);
}
