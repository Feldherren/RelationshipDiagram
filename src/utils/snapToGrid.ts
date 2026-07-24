import type {
  Bounds,
  Box,
  Character,
  FloatingText,
  MultiSelectableItem,
  Point,
  Selection,
} from "../models/types";
import { DEFAULT_DIAGRAM_FONT } from "./diagramFont";
import {
  getCharacterBounds,
  getCollapsedBoxBounds,
  getFloatingTextBounds,
  resolveBoxBounds,
} from "./geometry";
import { DIAGRAM_GRID_SIZE } from "./gridBackground";

export function snapCoord(value: number, gridSize = DIAGRAM_GRID_SIZE): number {
  return Math.round(value / gridSize) * gridSize;
}

/** Snap a center (or any point) to the nearest grid intersection. */
export function snapPointToGrid(
  point: Point,
  gridSize = DIAGRAM_GRID_SIZE,
): Point {
  return {
    x: snapCoord(point.x, gridSize),
    y: snapCoord(point.y, gridSize),
  };
}

/** Snap an expanded box top-left corner to the nearest grid intersection. */
export function snapBoxTopLeftToGrid(
  point: Point,
  gridSize = DIAGRAM_GRID_SIZE,
): Point {
  return snapPointToGrid(point, gridSize);
}

function unionBounds(a: Bounds, b: Bounds): Bounds {
  const minX = Math.min(a.x, b.x);
  const minY = Math.min(a.y, b.y);
  const maxX = Math.max(a.x + a.width, b.x + b.width);
  const maxY = Math.max(a.y + a.height, b.y + b.height);
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

function boundsForMultiItem(
  item: MultiSelectableItem,
  characters: Character[],
  boxes: Box[],
  floatingTexts: FloatingText[],
  fontFamily: string,
): Bounds | null {
  if (item.type === "character") {
    const character = characters.find((c) => c.id === item.id);
    if (!character) return null;
    return getCharacterBounds(character, fontFamily, 1, {
      includeConnectHandle: false,
    });
  }
  if (item.type === "floatingText") {
    const floatingText = floatingTexts.find((t) => t.id === item.id);
    if (!floatingText) return null;
    return getFloatingTextBounds(floatingText, fontFamily);
  }
  const box = boxes.find((b) => b.id === item.id);
  if (!box) return null;
  return box.collapsed
    ? getCollapsedBoxBounds(box, fontFamily)
    : resolveBoxBounds(box);
}

/** Union AABB of all items in a multi-selection (or null if empty/invalid). */
export function getMultiSelectionBounds(
  selection: Selection,
  characters: Character[],
  boxes: Box[],
  floatingTexts: FloatingText[],
  fontFamily: string = DEFAULT_DIAGRAM_FONT,
): Bounds | null {
  if (selection?.type !== "multi" || selection.items.length === 0) {
    return null;
  }

  let union: Bounds | null = null;
  for (const item of selection.items) {
    const bounds = boundsForMultiItem(
      item,
      characters,
      boxes,
      floatingTexts,
      fontFamily,
    );
    if (!bounds) continue;
    union = union ? unionBounds(union, bounds) : bounds;
  }
  return union;
}

/**
 * Snap a multi-selection move so the selection AABB top-left lands on a grid
 * intersection. Returns the corrected total delta from the initial bounds.
 */
export function snapMultiSelectionDelta(
  initialBounds: Bounds,
  totalDelta: { dx: number; dy: number },
  gridSize = DIAGRAM_GRID_SIZE,
): { dx: number; dy: number } {
  const snapped = snapPointToGrid(
    {
      x: initialBounds.x + totalDelta.dx,
      y: initialBounds.y + totalDelta.dy,
    },
    gridSize,
  );
  return {
    dx: snapped.x - initialBounds.x,
    dy: snapped.y - initialBounds.y,
  };
}

/** Snapshot of diagram entity positions at the start of a multi-drag. */
export interface MultiDragSnapshot {
  characters: Record<string, Point>;
  floatingTexts: Record<string, Point>;
  boxes: Record<
    string,
    {
      bounds: Bounds | null;
      anchorPosition: Point | null;
      collapsedPosition: Point | null;
      collapsed: boolean;
    }
  >;
  /** Contained members per selected box (so contents move with the box). */
  boxContents: Record<
    string,
    { characterIds: string[]; floatingTextIds: string[] }
  >;
  initialBounds: Bounds;
}

export function captureMultiDragSnapshot(
  selection: Selection,
  characters: Character[],
  boxes: Box[],
  floatingTexts: FloatingText[],
  fontFamily: string,
  getBoxContents: (box: Box) => {
    characterIds: string[];
    floatingTextIds: string[];
  },
): MultiDragSnapshot | null {
  if (selection?.type !== "multi" || selection.items.length === 0) {
    return null;
  }

  const initialBounds = getMultiSelectionBounds(
    selection,
    characters,
    boxes,
    floatingTexts,
    fontFamily,
  );
  if (!initialBounds) return null;

  const characterIds = new Set(
    selection.items.filter((i) => i.type === "character").map((i) => i.id),
  );
  const floatingTextIds = new Set(
    selection.items.filter((i) => i.type === "floatingText").map((i) => i.id),
  );
  const boxIds = new Set(
    selection.items.filter((i) => i.type === "box").map((i) => i.id),
  );

  const snapshot: MultiDragSnapshot = {
    characters: {},
    floatingTexts: {},
    boxes: {},
    boxContents: {},
    initialBounds,
  };

  for (const c of characters) {
    if (characterIds.has(c.id)) {
      snapshot.characters[c.id] = { ...c.position };
    }
  }
  for (const t of floatingTexts) {
    if (floatingTextIds.has(t.id)) {
      snapshot.floatingTexts[t.id] = { ...t.position };
    }
  }
  for (const b of boxes) {
    if (!boxIds.has(b.id)) continue;
    snapshot.boxes[b.id] = {
      bounds: b.bounds ? { ...b.bounds } : null,
      anchorPosition: b.anchorPosition ? { ...b.anchorPosition } : null,
      collapsedPosition: b.collapsedPosition
        ? { ...b.collapsedPosition }
        : null,
      collapsed: b.collapsed,
    };
    const contents = getBoxContents(b);
    snapshot.boxContents[b.id] = contents;
    for (const id of contents.characterIds) {
      const c = characters.find((ch) => ch.id === id);
      if (c) snapshot.characters[id] = { ...c.position };
    }
    for (const id of contents.floatingTextIds) {
      const t = floatingTexts.find((ft) => ft.id === id);
      if (t) snapshot.floatingTexts[id] = { ...t.position };
    }
  }

  return snapshot;
}
