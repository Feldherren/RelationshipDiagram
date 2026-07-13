import type { Point } from "../models/types";
import type { Bounds, Character, Group, NodeRef } from "../models/types";
import { COLLAPSED_GROUP_SIZE } from "../models/types";
import { resolveGroupBounds } from "./geometry";
import { getCollapsedGroupForCharacter } from "./lineEndpoints";

/** Matches RoundedRectAura outer padding in HoverAura.tsx */
const GROUP_CONNECTION_HIT_PADDING = 20;
const CHARACTER_CONNECTION_HIT_PADDING = 14;

function isCharacterHidden(characterId: string, groups: Group[]): boolean {
  return getCollapsedGroupForCharacter(characterId, groups) != null;
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

/** Distance to the group border; 0 on the stroke, larger toward the interior. */
function distanceToExpandedGroupOutline(point: Point, bounds: Bounds): number {
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
  groups: Group[],
): NodeRef | null {
  let bestCharacter: { ref: NodeRef; dist: number } | null = null;

  for (const character of characters) {
    if (isCharacterHidden(character.id, groups)) continue;
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

  let bestGroup: { ref: NodeRef; dist: number } | null = null;

  for (const group of groups) {
    if (group.collapsed) {
      const pos = group.collapsedPosition ?? { x: 0, y: 0 };
      const dist = Math.hypot(point.x - pos.x, point.y - pos.y);
      const hitRadius = COLLAPSED_GROUP_SIZE + CHARACTER_CONNECTION_HIT_PADDING;
      if (dist <= hitRadius && (!bestGroup || dist < bestGroup.dist)) {
        bestGroup = { ref: { id: group.id, kind: "group" }, dist };
      }
      continue;
    }

    const bounds = resolveGroupBounds(group, characters);
    if (!bounds) continue;
    const dist = distanceToExpandedGroupOutline(point, bounds);
    if (
      dist <= GROUP_CONNECTION_HIT_PADDING &&
      (!bestGroup || dist < bestGroup.dist)
    ) {
      bestGroup = { ref: { id: group.id, kind: "group" }, dist };
    }
  }

  return bestGroup?.ref ?? null;
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

export function getGroupConnectHandlePosition(
  bounds: Bounds,
): Point {
  return {
    x: bounds.x + bounds.width - 10,
    y: bounds.y + 14,
  };
}

export function getCollapsedGroupConnectHandlePosition(
  size: number,
): Point {
  const offset = getConnectHandleOffset(size);
  return { x: offset.x, y: offset.y };
}
