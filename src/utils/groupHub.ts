import type {
  Box,
  Character,
  Group,
  Line,
  NodeRef,
  Point,
} from "../models/types";
import { GROUP_HUB_BADGE_RADIUS } from "../models/types";

/** Spoke stroke ≈ slightly larger than the member’s diameter. */
export const GROUP_SPOKE_WIDTH_FACTOR = 1.12;
export const GROUP_HUB_HIT_PADDING = 10;

/**
 * Member world position for hub geometry. If the character’s centre lies inside
 * a collapsed box’s bounds, use that box’s collapsed square centre.
 */
export function getGroupMemberAnchor(
  character: Character,
  boxes: Box[],
): Point {
  const p = character.position;
  for (const box of boxes) {
    if (!box.collapsed || !box.bounds) continue;
    const b = box.bounds;
    if (
      p.x >= b.x &&
      p.x <= b.x + b.width &&
      p.y >= b.y &&
      p.y <= b.y + b.height
    ) {
      return box.collapsedPosition ?? p;
    }
  }
  return p;
}

export function getGroupMemberAnchors(
  group: Group,
  characters: Character[],
  boxes: Box[],
): { character: Character; anchor: Point }[] {
  const byId = new Map(characters.map((c) => [c.id, c]));
  const result: { character: Character; anchor: Point }[] = [];
  for (const id of group.memberCharacterIds) {
    const character = byId.get(id);
    if (!character) continue;
    result.push({
      character,
      anchor: getGroupMemberAnchor(character, boxes),
    });
  }
  return result;
}

export function getGroupCentroid(
  group: Group,
  characters: Character[],
  boxes: Box[],
): Point | null {
  const members = getGroupMemberAnchors(group, characters, boxes);
  if (members.length === 0) return null;
  let x = 0;
  let y = 0;
  for (const { anchor } of members) {
    x += anchor.x;
    y += anchor.y;
  }
  return { x: x / members.length, y: y / members.length };
}

export function getGroupHubHitRadius(): number {
  return GROUP_HUB_BADGE_RADIUS + GROUP_HUB_HIT_PADDING;
}

export function spokeStrokeWidth(characterSize: number): number {
  return Math.max(characterSize * 2 * GROUP_SPOKE_WIDTH_FACTOR, 8);
}

export function lineInvolvesGroup(line: Line, groupId?: string): boolean {
  if (groupId) {
    return (
      (line.from.kind === "group" && line.from.id === groupId) ||
      (line.to.kind === "group" && line.to.id === groupId)
    );
  }
  return line.from.kind === "group" || line.to.kind === "group";
}

export interface GroupCanvasVisibilityContext {
  groupsVisible: boolean;
  selectedGroupId: string | null;
  toolMode: string;
  connectFrom: NodeRef | null;
  connectDragFrom: NodeRef | null;
  lines: Line[];
}

function isConnecting(ctx: GroupCanvasVisibilityContext): boolean {
  return ctx.connectFrom != null || ctx.connectDragFrom != null;
}

function isGroupForceVisible(
  groupId: string,
  ctx: GroupCanvasVisibilityContext,
): boolean {
  if (ctx.selectedGroupId === groupId) return true;
  if (
    ctx.toolMode === "editGroupMembers" &&
    ctx.selectedGroupId === groupId
  ) {
    return true;
  }
  if (ctx.connectFrom?.kind === "group" && ctx.connectFrom.id === groupId) {
    return true;
  }
  if (
    ctx.connectDragFrom?.kind === "group" &&
    ctx.connectDragFrom.id === groupId
  ) {
    return true;
  }
  return false;
}

/**
 * Centroid hub + spokes. Membership chips are not gated by `groupsVisible`.
 * Eye open: show hubs for every group that has members.
 * Eye closed: hide hubs except while selected/editing that group, or while
 * connecting (so group endpoints stay targetable).
 */
export function shouldShowGroupHub(
  groupId: string,
  ctx: GroupCanvasVisibilityContext & { hasMembers: boolean },
): boolean {
  if (!ctx.hasMembers) return false;
  if (ctx.groupsVisible) return true;
  if (isGroupForceVisible(groupId, ctx)) return true;
  return isConnecting(ctx);
}

/** Hide relationship lines that touch a group when group chrome is decluttered. */
export function shouldShowGroupLine(
  line: Line,
  ctx: GroupCanvasVisibilityContext,
): boolean {
  if (!lineInvolvesGroup(line)) return true;
  if (ctx.groupsVisible) return true;
  const groupIds = [line.from, line.to]
    .filter((ref) => ref.kind === "group")
    .map((ref) => ref.id);
  if (groupIds.some((id) => isGroupForceVisible(id, ctx))) return true;
  // While connecting, keep group lines visible so the graph stays coherent.
  return isConnecting(ctx);
}
