import type {
  Bounds,
  Diagram,
  Line,
  Point,
  Selection,
  Viewport,
} from "../models/types";
import {
  COLLAPSED_BOX_SIZE,
  GROUP_HUB_BADGE_RADIUS,
} from "../models/types";
import { DEFAULT_DIAGRAM_FONT } from "./diagramFont";
import {
  getBoxById,
  getBoxEdgePoint,
  getCharacterById,
  getCharacterEdgePoint,
  getCharacterShapeBounds,
  getCollapsedBoxSquareBounds,
  getFloatingTextBounds,
  getFloatingTextById,
  resolveBoxBounds,
} from "./geometry";
import { getGroupHubPosition } from "./groupHub";
import { getPillLabelSize } from "./labelMetrics";
import { getLineDisplayLabel } from "./lineEndpoints";
import { routeLine } from "./lineRouting";

export const SELECTION_FLOAT_WIDTH = 260;
export const SELECTION_FLOAT_GAP = 12;
export const SELECTION_FLOAT_MARGIN = 8;

/** Default screen anchor for floating (non–world-anchored) selection panels. */
export function defaultFloatAnchorScreen(
  stageWidth: number,
  stageHeight: number,
): Point {
  return {
    x: stageWidth / 2 + SELECTION_FLOAT_WIDTH / 2,
    y: stageHeight / 2,
  };
}

export function clampSelectionFloatPosition(args: {
  left: number;
  top: number;
  stageWidth: number;
  stageHeight: number;
  panelWidth: number;
  panelHeight: number;
  margin?: number;
}): { left: number; top: number } {
  const {
    stageWidth,
    stageHeight,
    panelWidth,
    panelHeight,
    margin = SELECTION_FLOAT_MARGIN,
  } = args;
  const maxLeft = Math.max(margin, stageWidth - panelWidth - margin);
  const maxTop = Math.max(margin, stageHeight - panelHeight - margin);
  return {
    left: Math.max(margin, Math.min(args.left, maxLeft)),
    top: Math.max(margin, Math.min(args.top, maxTop)),
  };
}

/** True when a pointer target is a control that should not start panel drag. */
export function isSelectionFloatInteractiveTarget(
  target: EventTarget | null,
): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest(
      "button, input, textarea, select, a, label, summary, [role='button'], [contenteditable='true']",
    ),
  );
}

/** Stable key for float placement state across a selection session. */
export function selectionFloatPlacementKey(
  selection: NonNullable<Selection>,
): string | null {
  if (selection.type === "multi") {
    return `multi:${selection.items.map((i) => `${i.type}:${i.id}`).join(",")}`;
  }
  if (selection.type === "group") {
    return `group:${selection.id}:${selection.anchorCharacterId ?? ""}`;
  }
  return `${selection.type}:${selection.id}`;
}

/**
 * Closest point on the panel rectangle edge to `anchorScreen`.
 * Used to draw a connector from the selected element to a detached float.
 */
export function connectorEndpoints(
  panel: Bounds,
  anchorScreen: Point,
): { from: Point; to: Point } {
  const left = panel.x;
  const right = panel.x + panel.width;
  const top = panel.y;
  const bottom = panel.y + panel.height;

  const clampedX = clamp(anchorScreen.x, left, right);
  const clampedY = clamp(anchorScreen.y, top, bottom);

  // Anchor is outside (or on edge): project onto the nearest edge.
  let toX = clampedX;
  let toY = clampedY;
  const insideX = anchorScreen.x > left && anchorScreen.x < right;
  const insideY = anchorScreen.y > top && anchorScreen.y < bottom;

  if (insideX && insideY) {
    // Anchor somehow inside the panel: pick nearest side.
    const distLeft = anchorScreen.x - left;
    const distRight = right - anchorScreen.x;
    const distTop = anchorScreen.y - top;
    const distBottom = bottom - anchorScreen.y;
    const min = Math.min(distLeft, distRight, distTop, distBottom);
    if (min === distLeft) toX = left;
    else if (min === distRight) toX = right;
    else if (min === distTop) toY = top;
    else toY = bottom;
  } else if (insideX) {
    toY = anchorScreen.y <= top ? top : bottom;
  } else if (insideY) {
    toX = anchorScreen.x <= left ? left : right;
  } else {
    // Corner case: already clamped to a corner via clampedX/Y.
    toX = clampedX;
    toY = clampedY;
  }

  return {
    from: { ...anchorScreen },
    to: { x: toX, y: toY },
  };
}

/** Hide connector when the panel is still effectively next to the anchor. */
export function shouldShowFloatConnector(
  panel: Bounds,
  anchorScreen: Point,
  minDistance: number = SELECTION_FLOAT_GAP,
): boolean {
  const { from, to } = connectorEndpoints(panel, anchorScreen);
  const dx = from.x - to.x;
  const dy = from.y - to.y;
  return Math.hypot(dx, dy) >= minDistance;
}

/** Point on a rect edge in the direction of `toward` (from rect center). */
function boundsEdgePoint(bounds: Bounds, toward: Point): Point {
  const cx = bounds.x + bounds.width / 2;
  const cy = bounds.y + bounds.height / 2;
  const dx = toward.x - cx;
  const dy = toward.y - cy;
  if (dx === 0 && dy === 0) return { x: cx, y: cy };
  const hw = bounds.width / 2;
  const hh = bounds.height / 2;
  const scale = 1 / Math.max(Math.abs(dx) / hw, Math.abs(dy) / hh);
  return { x: cx + dx * scale, y: cy + dy * scale };
}

/**
 * Live world attachment for the float connector: the point on the selected
 * element's outline facing toward `towardWorld` (usually the panel center).
 */
export function getSelectionConnectorAnchorWorld(
  selection: NonNullable<Selection>,
  diagram: Diagram,
  towardWorld: Point,
  /** Needed for screen-sized markers (bookmarks). */
  viewportScale: number = 1,
): Point | null {
  if (selection.type === "character") {
    const character = getCharacterById(diagram, selection.id);
    if (!character) return null;
    return getCharacterEdgePoint(character, towardWorld);
  }

  if (selection.type === "box") {
    const box = getBoxById(diagram, selection.id);
    if (!box) return null;
    return getBoxEdgePoint(box, towardWorld);
  }

  if (selection.type === "floatingText") {
    const floatingText = getFloatingTextById(diagram, selection.id);
    if (!floatingText) return null;
    return boundsEdgePoint(
      getFloatingTextBounds(
        floatingText,
        diagram.fontFamily ?? DEFAULT_DIAGRAM_FONT,
      ),
      towardWorld,
    );
  }

  if (selection.type === "line") {
    const line = diagram.lines.find((l) => l.id === selection.id);
    if (!line) return null;
    return boundsEdgePoint(
      getLineSelectionAvoidBounds(line, diagram),
      towardWorld,
    );
  }

  if (selection.type === "group") {
    const group = diagram.groups.find((g) => g.id === selection.id);
    if (!group) return null;
    const hub = getGroupHubPosition(
      group,
      diagram.characters,
      diagram.boxes,
    );
    if (hub) {
      const dx = towardWorld.x - hub.x;
      const dy = towardWorld.y - hub.y;
      const len = Math.hypot(dx, dy) || 1;
      return {
        x: hub.x + (dx / len) * GROUP_HUB_BADGE_RADIUS,
        y: hub.y + (dy / len) * GROUP_HUB_BADGE_RADIUS,
      };
    }
    if (!selection.anchorCharacterId) return null;
    const character = getCharacterById(diagram, selection.anchorCharacterId);
    if (!character) return null;
    return getCharacterEdgePoint(character, towardWorld);
  }

  if (selection.type === "bookmark") {
    const bookmark = diagram.bookmarks?.find((b) => b.id === selection.id);
    if (!bookmark) return null;
    return boundsEdgePoint(
      getBookmarkMarkerWorldBounds(bookmark.anchor, viewportScale),
      towardWorld,
    );
  }

  return null;
}

/**
 * World bounds of the canvas bookmark ribbon.
 * Sized to match BookmarkFlag (screen-pixel icon scaled into world space),
 * expanded to the outer edge of the selected stroke.
 */
function getBookmarkMarkerWorldBounds(
  anchor: Point,
  viewportScale: number,
): Bounds {
  // Keep in sync with BookmarkFlag: RIBBON_PX=30, path ~x5–17/y3–21, tip at bottom.
  const inv = 1 / Math.max(0.01, viewportScale);
  const iconScale = (30 / 18) * inv;
  const halfWidth = 7 * iconScale;
  const height = 18 * iconScale;
  // Selected stroke is 1.5 screen-px, centered on the path — use the outer rim.
  const strokeOutset = (1.5 / 2) * inv;
  return {
    x: anchor.x - halfWidth - strokeOutset,
    y: anchor.y - height - strokeOutset,
    width: 2 * (halfWidth + strokeOutset),
    height: height + 2 * strokeOutset,
  };
}

const LINE_LABEL_FONT_SIZE = 12;
/** Padding around the label midpoint when a line has no visible pill. */
const UNLABELED_LINE_HIT = 14;

/**
 * World bounds of the selected object to keep the detail panel clear of.
 * Returns null for group/multi (not world-anchored while open).
 */
export function getSelectionAvoidBounds(
  selection: NonNullable<Selection>,
  diagram: Diagram,
  viewportScale = 1,
): Bounds | null {
  if (selection.type === "character") {
    const character = getCharacterById(diagram, selection.id);
    if (!character) return null;
    return getCharacterShapeBounds(character);
  }

  if (selection.type === "box") {
    const box = getBoxById(diagram, selection.id);
    if (!box) return null;
    if (box.collapsed) {
      const center = box.collapsedPosition ?? { x: 0, y: 0 };
      return getCollapsedBoxSquareBounds(center);
    }
    return resolveBoxBounds(box);
  }

  if (selection.type === "floatingText") {
    const floatingText = getFloatingTextById(diagram, selection.id);
    if (!floatingText) return null;
    return getFloatingTextBounds(
      floatingText,
      diagram.fontFamily ?? DEFAULT_DIAGRAM_FONT,
    );
  }

  if (selection.type === "line") {
    const line = diagram.lines.find((l) => l.id === selection.id);
    if (!line) return null;
    return getLineSelectionAvoidBounds(line, diagram);
  }

  if (selection.type === "bookmark") {
    const bookmark = diagram.bookmarks?.find((b) => b.id === selection.id);
    if (!bookmark) return null;
    return getBookmarkMarkerWorldBounds(bookmark.anchor, viewportScale);
  }

  return null;
}

/** World bounds of the line label (or a small pad at the mid-curve) to keep clear of. */
export function getLineSelectionAvoidBounds(
  line: Line,
  diagram: Diagram,
): Bounds {
  const routed = routeLine(line, diagram);
  const displayLabel = getLineDisplayLabel(line, diagram);
  if (displayLabel) {
    const pill = getPillLabelSize(
      displayLabel,
      LINE_LABEL_FONT_SIZE,
      "normal",
      diagram.fontFamily ?? DEFAULT_DIAGRAM_FONT,
    );
    return {
      x: routed.labelPoint.x - pill.width / 2,
      y: routed.labelPoint.y - pill.height / 2,
      width: pill.width,
      height: pill.height,
    };
  }
  return {
    x: routed.labelPoint.x - UNLABELED_LINE_HIT,
    y: routed.labelPoint.y - UNLABELED_LINE_HIT,
    width: UNLABELED_LINE_HIT * 2,
    height: UNLABELED_LINE_HIT * 2,
  };
}

/** World point used as the “near the object” anchor (prefer right edge). */
export function getSelectionAnchorWorld(
  selection: NonNullable<Selection>,
  diagram: Diagram,
): Point | null {
  if (selection.type === "character") {
    const character = getCharacterById(diagram, selection.id);
    if (!character) return null;
    return {
      x: character.position.x + character.size,
      y: character.position.y,
    };
  }

  if (selection.type === "box") {
    const box = getBoxById(diagram, selection.id);
    if (!box) return null;
    if (box.collapsed) {
      const center = box.collapsedPosition ?? { x: 0, y: 0 };
      const bounds = getCollapsedBoxSquareBounds(center);
      return {
        x: bounds.x + bounds.width,
        y: center.y,
      };
    }
    const bounds = resolveBoxBounds(box);
    if (!bounds) {
      const center = box.collapsedPosition ?? { x: 0, y: 0 };
      return {
        x: center.x + COLLAPSED_BOX_SIZE,
        y: center.y,
      };
    }
    return {
      x: bounds.x + bounds.width,
      y: bounds.y + bounds.height / 2,
    };
  }

  if (selection.type === "floatingText") {
    const floatingText = getFloatingTextById(diagram, selection.id);
    if (!floatingText) return null;
    const bounds = getFloatingTextBounds(
      floatingText,
      diagram.fontFamily ?? DEFAULT_DIAGRAM_FONT,
    );
    return {
      x: bounds.x + bounds.width,
      y: floatingText.position.y,
    };
  }

  if (selection.type === "line") {
    const line = diagram.lines.find((l) => l.id === selection.id);
    if (!line) return null;
    const avoid = getLineSelectionAvoidBounds(line, diagram);
    return {
      x: avoid.x + avoid.width,
      y: avoid.y + avoid.height / 2,
    };
  }

  // Groups and multi-select are not world-anchored while open; chip opens use
  // getGroupChipAnchorWorld once for the initial screen placement.
  if (selection.type === "group" || selection.type === "multi") {
    return null;
  }

  if (selection.type === "bookmark") {
    const bookmark = diagram.bookmarks?.find((b) => b.id === selection.id);
    if (!bookmark) return null;
    return { ...bookmark.anchor };
  }

  return null;
}

/** World point beside a character when a group is opened from its chip. */
export function getGroupChipAnchorWorld(
  anchorCharacterId: string | undefined,
  diagram: Diagram,
): Point | null {
  if (!anchorCharacterId) return null;
  const character = getCharacterById(diagram, anchorCharacterId);
  if (!character) return null;
  return {
    x: character.position.x + character.size,
    y: character.position.y,
  };
}

export function worldToScreen(world: Point, viewport: Viewport): Point {
  return {
    x: world.x * viewport.scale + viewport.x,
    y: world.y * viewport.scale + viewport.y,
  };
}

export function screenToWorld(screen: Point, viewport: Viewport): Point {
  return {
    x: (screen.x - viewport.x) / viewport.scale,
    y: (screen.y - viewport.y) / viewport.scale,
  };
}

export function worldBoundsToScreen(
  bounds: Bounds,
  viewport: Viewport,
): Bounds {
  return {
    x: bounds.x * viewport.scale + viewport.x,
    y: bounds.y * viewport.scale + viewport.y,
    width: bounds.width * viewport.scale,
    height: bounds.height * viewport.scale,
  };
}

function clamp(
  value: number,
  min: number,
  max: number,
): number {
  return Math.max(min, Math.min(value, max));
}

function rectsOverlap(
  a: Bounds,
  b: Bounds,
): boolean {
  return !(
    a.x + a.width <= b.x ||
    b.x + b.width <= a.x ||
    a.y + a.height <= b.y ||
    b.y + b.height <= a.y
  );
}

function overlapArea(a: Bounds, b: Bounds): number {
  const x0 = Math.max(a.x, b.x);
  const y0 = Math.max(a.y, b.y);
  const x1 = Math.min(a.x + a.width, b.x + b.width);
  const y1 = Math.min(a.y + a.height, b.y + b.height);
  if (x1 <= x0 || y1 <= y0) return 0;
  return (x1 - x0) * (y1 - y0);
}

export function placeSelectionFloat(args: {
  anchorScreen: Point;
  stageWidth: number;
  stageHeight: number;
  panelWidth: number;
  panelHeight: number;
  gap?: number;
  margin?: number;
  /** When set (e.g. a line label), prefer placements that do not cover this rect. */
  avoidScreen?: Bounds;
}): { left: number; top: number } {
  const {
    anchorScreen,
    stageWidth,
    stageHeight,
    panelWidth,
    panelHeight,
    gap = SELECTION_FLOAT_GAP,
    margin = SELECTION_FLOAT_MARGIN,
    avoidScreen,
  } = args;

  const maxLeft = Math.max(margin, stageWidth - panelWidth - margin);
  const maxTop = Math.max(margin, stageHeight - panelHeight - margin);

  if (!avoidScreen) {
    let left = anchorScreen.x + gap;
    if (left + panelWidth > stageWidth - margin) {
      left = anchorScreen.x - gap - panelWidth;
    }
    left = clamp(left, margin, maxLeft);

    let top = anchorScreen.y - panelHeight / 2;
    top = clamp(top, margin, maxTop);

    return { left, top };
  }

  const avoid = avoidScreen;
  const midY = avoid.y + avoid.height / 2;
  const midX = avoid.x + avoid.width / 2;

  const candidates: { left: number; top: number }[] = [
    {
      left: avoid.x + avoid.width + gap,
      top: midY - panelHeight / 2,
    },
    {
      left: avoid.x - gap - panelWidth,
      top: midY - panelHeight / 2,
    },
    {
      left: midX - panelWidth / 2,
      top: avoid.y + avoid.height + gap,
    },
    {
      left: midX - panelWidth / 2,
      top: avoid.y - gap - panelHeight,
    },
  ];

  let best: { left: number; top: number } | null = null;
  let bestOverlap = Infinity;

  for (const candidate of candidates) {
    const left = clamp(candidate.left, margin, maxLeft);
    const top = clamp(candidate.top, margin, maxTop);
    const panelBounds: Bounds = {
      x: left,
      y: top,
      width: panelWidth,
      height: panelHeight,
    };
    if (!rectsOverlap(panelBounds, avoid)) {
      return { left, top };
    }
    const area = overlapArea(panelBounds, avoid);
    if (area < bestOverlap) {
      bestOverlap = area;
      best = { left, top };
    }
  }

  return best ?? { left: margin, top: margin };
}
