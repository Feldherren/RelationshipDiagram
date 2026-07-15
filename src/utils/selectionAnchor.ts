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
} from "../models/types";
import { DEFAULT_DIAGRAM_FONT } from "./diagramFont";
import {
  getBoxById,
  getCharacterById,
  getCollapsedBoxSquareBounds,
  getFloatingTextBounds,
  getFloatingTextById,
  getGroupById,
  resolveBoxBounds,
} from "./geometry";
import { getPillLabelSize } from "./labelMetrics";
import { getLineDisplayLabel } from "./lineEndpoints";
import { routeLine } from "./lineRouting";

export const SELECTION_FLOAT_WIDTH = 260;
export const SELECTION_FLOAT_GAP = 12;
export const SELECTION_FLOAT_MARGIN = 8;

const LINE_LABEL_FONT_SIZE = 12;
/** Padding around the label midpoint when a line has no visible pill. */
const UNLABELED_LINE_HIT = 14;

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

  if (selection.type === "group") {
    const group = getGroupById(diagram, selection.id);
    if (!group) return null;
    const anchorCharacterId =
      selection.anchorCharacterId ?? group.memberCharacterIds[0];
    if (!anchorCharacterId) return null;
    const character = getCharacterById(diagram, anchorCharacterId);
    if (!character) return null;
    return {
      x: character.position.x + character.size,
      y: character.position.y,
    };
  }

  return null;
}

export function worldToScreen(world: Point, viewport: Viewport): Point {
  return {
    x: world.x * viewport.scale + viewport.x,
    y: world.y * viewport.scale + viewport.y,
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
