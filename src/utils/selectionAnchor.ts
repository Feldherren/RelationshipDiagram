import type {
  Diagram,
  Point,
  Selection,
  Viewport,
} from "../models/types";
import {
  COLLAPSED_BOX_SIZE,
  DEFAULT_FLOATING_TEXT_FONT_SIZE,
} from "../models/types";
import {
  getBoxById,
  getCharacterById,
  getCollapsedBoxSquareBounds,
  getFloatingTextById,
  getGroupById,
  resolveBoxBounds,
} from "./geometry";
import { getLineAnchors } from "./lineRouting";

export const SELECTION_FLOAT_WIDTH = 260;
export const SELECTION_FLOAT_GAP = 12;
export const SELECTION_FLOAT_MARGIN = 8;

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
    const fontSize = floatingText.fontSize || DEFAULT_FLOATING_TEXT_FONT_SIZE;
    const approxHalfWidth = Math.max(
      fontSize,
      (floatingText.text.length || 1) * fontSize * 0.35,
    );
    return {
      x: floatingText.position.x + approxHalfWidth,
      y: floatingText.position.y,
    };
  }

  if (selection.type === "line") {
    const line = diagram.lines.find((l) => l.id === selection.id);
    if (!line) return null;
    const { start, end } = getLineAnchors(line, diagram);
    return {
      x: (start.x + end.x) / 2,
      y: (start.y + end.y) / 2,
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

export function placeSelectionFloat(args: {
  anchorScreen: Point;
  stageWidth: number;
  stageHeight: number;
  panelWidth: number;
  panelHeight: number;
  gap?: number;
  margin?: number;
}): { left: number; top: number } {
  const {
    anchorScreen,
    stageWidth,
    stageHeight,
    panelWidth,
    panelHeight,
    gap = SELECTION_FLOAT_GAP,
    margin = SELECTION_FLOAT_MARGIN,
  } = args;

  let left = anchorScreen.x + gap;
  if (left + panelWidth > stageWidth - margin) {
    left = anchorScreen.x - gap - panelWidth;
  }
  left = Math.max(
    margin,
    Math.min(left, stageWidth - panelWidth - margin),
  );

  let top = anchorScreen.y - panelHeight / 2;
  top = Math.max(
    margin,
    Math.min(top, stageHeight - panelHeight - margin),
  );

  return { left, top };
}
