import type { Point } from "../models/types";
import type { Bounds, Box, Character, NodeRef } from "../models/types";
import { resolveBoxBounds, getCollapsedBoxSquareBounds } from "./geometry";
import { getCollapsedBoxForCharacter } from "./lineEndpoints";

/** Matches RoundedRectAura outer padding in HoverAura.tsx */
const BOX_CONNECTION_HIT_PADDING = 20;
const CHARACTER_CONNECTION_HIT_PADDING = 14;

function isCharacterHidden(
  characterId: string,
  boxes: Box[],
  characters: Character[],
): boolean {
  return getCollapsedBoxForCharacter(characterId, boxes, characters) != null;
}

export function sameNodeRef(a: NodeRef, b: NodeRef): boolean {
  return a.id === b.id && a.kind === b.kind;
}

function distanceToRect(point: Point, bounds: Bounds): number {
  const closestX = Math.max(
    bounds.x,
    Math.min(point.x, bounds.x + bounds.width),
  );
  const closestY = Math.max(
    bounds.y,
    Math.min(point.y, bounds.y + bounds.height),
  );
  return Math.hypot(point.x - closestX, point.y - closestY);
}

/** Distance to the box border; 0 on the stroke, larger toward the interior. */
function distanceToExpandedBoxOutline(point: Point, bounds: Bounds): number {
  const outsideDist = distanceToRect(point, bounds);
  if (outsideDist > 0) return outsideDist;

  return Math.min(
    point.x - bounds.x,
    bounds.x + bounds.width - point.x,
    point.y - bounds.y,
    bounds.y + bounds.height - point.y,
  );
}

export function findConnectionTargetAt(
  point: Point,
  characters: Character[],
  boxes: Box[],
): NodeRef | null {
  let bestCharacter: { ref: NodeRef; dist: number } | null = null;

  for (const character of characters) {
    if (isCharacterHidden(character.id, boxes, characters)) continue;
    const dist = Math.hypot(
      point.x - character.position.x,
      point.y - character.position.y,
    );
    const hitRadius = character.size + CHARACTER_CONNECTION_HIT_PADDING;
    if (dist <= hitRadius && (!bestCharacter || dist < bestCharacter.dist)) {
      bestCharacter = { ref: { id: character.id, kind: "character" }, dist };
    }
  }

  if (bestCharacter) {
    return bestCharacter.ref;
  }

  let bestBox: { ref: NodeRef; dist: number } | null = null;

  for (const box of boxes) {
    if (box.collapsed) {
      const pos = box.collapsedPosition ?? { x: 0, y: 0 };
      const bounds = getCollapsedBoxSquareBounds(pos);
      const dist = distanceToRect(point, bounds);
      if (
        dist <= BOX_CONNECTION_HIT_PADDING &&
        (!bestBox || dist < bestBox.dist)
      ) {
        bestBox = { ref: { id: box.id, kind: "box" }, dist };
      }
      continue;
    }

    const bounds = resolveBoxBounds(box);
    if (!bounds) continue;
    const dist = distanceToExpandedBoxOutline(point, bounds);
    if (
      dist <= BOX_CONNECTION_HIT_PADDING &&
      (!bestBox || dist < bestBox.dist)
    ) {
      bestBox = { ref: { id: box.id, kind: "box" }, dist };
    }
  }

  return bestBox?.ref ?? null;
}

export const CONNECT_HANDLE_SCREEN_RADIUS = 14;
export const CONNECT_HANDLE_FONT_SIZE = 18;

export function getConnectHandleOffset(size: number): Point {
  // Sit on the top-right diagonal so the handle rim straddles the shape border.
  const centerDistance =
    size + CONNECT_HANDLE_SCREEN_RADIUS * 0.5;
  const axisOffset = centerDistance / Math.SQRT2;
  return { x: axisOffset, y: -axisOffset };
}

export function getBoxConnectHandlePosition(bounds: Bounds): Point {
  return {
    x: bounds.x + bounds.width - 10,
    y: bounds.y + 14,
  };
}

export function getCollapsedBoxConnectHandlePosition(size: number): Point {
  const offset = getConnectHandleOffset(size);
  return { x: offset.x, y: offset.y };
}
