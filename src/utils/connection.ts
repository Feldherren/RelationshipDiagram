import type { Point } from "../models/types";
import type { Character, Group, NodeRef } from "../models/types";
import { COLLAPSED_GROUP_SIZE } from "../models/types";

function isCharacterHidden(characterId: string, groups: Group[]): boolean {
  return groups.some(
    (g) => g.collapsed && g.memberCharacterIds.includes(characterId),
  );
}

export function sameNodeRef(a: NodeRef, b: NodeRef): boolean {
  return a.id === b.id && a.kind === b.kind;
}

export function findConnectionTargetAt(
  point: Point,
  characters: Character[],
  groups: Group[],
): NodeRef | null {
  let best: { ref: NodeRef; dist: number } | null = null;

  for (const character of characters) {
    if (isCharacterHidden(character.id, groups)) continue;
    const dist = Math.hypot(
      point.x - character.position.x,
      point.y - character.position.y,
    );
    const hitRadius = character.size + 14;
    if (dist <= hitRadius && (!best || dist < best.dist)) {
      best = { ref: { id: character.id, kind: "character" }, dist };
    }
  }

  for (const group of groups) {
    if (!group.collapsed) continue;
    const pos = group.collapsedPosition ?? { x: 0, y: 0 };
    const dist = Math.hypot(point.x - pos.x, point.y - pos.y);
    const hitRadius = COLLAPSED_GROUP_SIZE + 14;
    if (dist <= hitRadius && (!best || dist < best.dist)) {
      best = { ref: { id: group.id, kind: "group" }, dist };
    }
  }

  return best?.ref ?? null;
}

export function getConnectHandleOffset(size: number): Point {
  return { x: size + 4, y: -size - 4 };
}
