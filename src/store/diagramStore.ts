import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";
import type {
  Bounds,
  Character,
  Diagram,
  Group,
  Line,
  NodeRef,
  Selection,
  ToolMode,
  Viewport,
} from "../models/types";
import {
  DEFAULT_CHARACTER_SIZE,
  defaultRgb,
} from "../models/types";
import { getGroupCenter, getGroupMemberBounds } from "../utils/geometry";
import { getLinePairKey } from "../utils/lineRouting";

interface DiagramState {
  characters: Character[];
  lines: Line[];
  groups: Group[];
  viewport: Viewport;
  selection: Selection;
  toolMode: ToolMode;
  connectFrom: NodeRef | null;
  showGrid: boolean;
  exportBounds: Bounds | null;
  stageSize: { width: number; height: number };

  setStageSize: (width: number, height: number) => void;
  setViewport: (viewport: Partial<Viewport>) => void;
  setToolMode: (mode: ToolMode) => void;
  setSelection: (selection: Selection) => void;
  setShowGrid: (show: boolean) => void;
  setExportBounds: (bounds: Bounds | null) => void;

  addCharacterAt: (position: { x: number; y: number }) => void;
  updateCharacter: (id: string, patch: Partial<Character>) => void;
  deleteCharacter: (id: string) => void;
  moveCharacter: (id: string, position: { x: number; y: number }) => void;

  addLine: (from: NodeRef, to: NodeRef) => void;
  updateLine: (id: string, patch: Partial<Line>) => void;
  deleteLine: (id: string) => void;

  addGroupFromSelection: () => void;
  updateGroup: (id: string, patch: Partial<Group>) => void;
  deleteGroup: (id: string) => void;
  toggleGroupCollapse: (id: string) => void;
  addCharacterToGroup: (characterId: string, groupId: string) => void;

  handleNodeClick: (ref: NodeRef) => void;
  deleteSelected: () => void;
  loadDiagram: (diagram: Diagram) => void;
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

function nextRouteIndex(
  from: NodeRef,
  to: NodeRef,
  lines: Line[],
): number {
  const tempLine: Line = {
    id: "",
    from,
    to,
    color: defaultRgb(),
    style: "straight",
    startArrow: false,
    endArrow: true,
    routeIndex: 0,
  };
  const key = getLinePairKey(tempLine);
  const existing = lines.filter((l) => getLinePairKey(l) === key);
  if (existing.length === 0) return 0;
  return Math.max(...existing.map((l) => l.routeIndex)) + 1;
}

export const useDiagramStore = create<DiagramState>((set, get) => ({
  characters: [],
  lines: [],
  groups: [],
  viewport: { x: 0, y: 0, scale: 1 },
  selection: null,
  toolMode: "select",
  connectFrom: null,
  showGrid: true,
  exportBounds: null,
  stageSize: { width: 800, height: 600 },

  setStageSize: (width, height) => set({ stageSize: { width, height } }),
  setViewport: (patch) =>
    set((s) => ({ viewport: { ...s.viewport, ...patch } })),
  setToolMode: (mode) =>
    set({ toolMode: mode, connectFrom: null, exportBounds: mode === "exportBounds" ? get().exportBounds : null }),
  setSelection: (selection) => set({ selection }),
  setShowGrid: (show) => set({ showGrid: show }),
  setExportBounds: (bounds) => set({ exportBounds: bounds }),

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
    const line: Line = {
      id: uuidv4(),
      from,
      to,
      color: { r: 60, g: 60, b: 60 },
      style: "straight",
      startArrow: false,
      endArrow: true,
      routeIndex: nextRouteIndex(from, to, get().lines),
    };
    set((s) => ({
      lines: [...s.lines, line],
      selection: { type: "line", id: line.id },
      connectFrom: null,
      toolMode: "select",
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

  addGroupFromSelection: () => {
    const { selection, characters, groups } = get();
    let memberIds: string[] = [];

    if (selection?.type === "character") {
      memberIds = [selection.id];
    }

    if (memberIds.length === 0) return;

    const members = characters.filter((c) => memberIds.includes(c.id));
    const bounds = {
      minX: Math.min(...members.map((m) => m.position.x)),
      minY: Math.min(...members.map((m) => m.position.y)),
    };

    const group: Group = {
      id: uuidv4(),
      name: `Group ${groups.length + 1}`,
      memberCharacterIds: memberIds,
      collapsed: false,
      collapsedPosition: { x: bounds.minX, y: bounds.minY },
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
    const { toolMode, connectFrom } = get();
    if (toolMode === "connect") {
      if (!connectFrom) {
        set({ connectFrom: ref, selection: null });
        return;
      }
      if (connectFrom.id === ref.id && connectFrom.kind === ref.kind) {
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

  deleteSelected: () => {
    const { selection } = get();
    if (!selection) return;
    if (selection.type === "character") get().deleteCharacter(selection.id);
    if (selection.type === "line") get().deleteLine(selection.id);
    if (selection.type === "group") get().deleteGroup(selection.id);
  },

  loadDiagram: (diagram) =>
    set({
      characters: diagram.characters,
      lines: diagram.lines,
      groups: diagram.groups,
      viewport: diagram.viewport ?? { x: 0, y: 0, scale: 1 },
      selection: null,
      connectFrom: null,
      toolMode: "select",
    }),

  getDiagram: () => {
    const { characters, lines, groups, viewport } = get();
    return {
      schemaVersion: 1 as const,
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
