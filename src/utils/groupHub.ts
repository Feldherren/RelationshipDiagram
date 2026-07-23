import type {
  Box,
  Character,
  Group,
  Line,
  NodeRef,
  Point,
} from "../models/types";
import { GROUP_HUB_BADGE_RADIUS } from "../models/types";
import { isCharacterContainedInBox } from "./geometry";
import { DEFAULT_DIAGRAM_FONT } from "./diagramFont";

/** Spoke stroke ≈ slightly larger than the member’s diameter. */
export const GROUP_SPOKE_WIDTH_FACTOR = 1.12;
export const GROUP_HUB_HIT_PADDING = 10;

/**
 * Member world position for hub geometry. If the character is a member of a
 * collapsed box, use that box’s collapsed square centre.
 */
export function getGroupMemberAnchor(
  character: Character,
  boxes: Box[],
): Point {
  const p = character.position;
  for (const box of boxes) {
    if (!box.collapsed) continue;
    if (isCharacterContainedInBox(character, box)) {
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

/**
 * True when every existing member is fully inside the *same* collapsed box
 * (same containment as hiding characters on the canvas). Members split across
 * different collapsed boxes do not qualify — the hub stays as the visible link.
 */
export function areAllGroupMembersInCollapsedBoxes(
  group: Group,
  characters: Character[],
  boxes: Box[],
  fontFamily: string = DEFAULT_DIAGRAM_FONT,
): boolean {
  const byId = new Map(characters.map((c) => [c.id, c]));
  let sharedCollapsedBoxId: string | null = null;
  let foundMember = false;
  for (const id of group.memberCharacterIds) {
    const character = byId.get(id);
    if (!character) continue;
    foundMember = true;
    const collapsedBox = boxes.find(
      (box) =>
        box.collapsed && isCharacterContainedInBox(character, box, fontFamily),
    );
    if (!collapsedBox) return false;
    if (sharedCollapsedBoxId == null) {
      sharedCollapsedBoxId = collapsedBox.id;
    } else if (collapsedBox.id !== sharedCollapsedBoxId) {
      return false;
    }
  }
  return foundMember;
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

/**
 * Effective hub badge position: manual override if set, otherwise member centroid.
 */
export function getGroupHubPosition(
  group: Group,
  characters: Character[],
  boxes: Box[],
): Point | null {
  if (group.hubPosition) {
    return { x: group.hubPosition.x, y: group.hubPosition.y };
  }
  return getGroupCentroid(group, characters, boxes);
}

export function isGroupHubManuallyPlaced(group: Group): boolean {
  return group.hubPosition != null;
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

/** Canvas eye for group hubs: all / connected-only / none. */
export type GroupsCanvasMode = "full" | "connected" | "hidden";

export function isGroupsCanvasMode(value: unknown): value is GroupsCanvasMode {
  return value === "full" || value === "connected" || value === "hidden";
}

/** Migrate prefs: prefer `groupsCanvasMode`, else legacy `groupsVisible` boolean. */
export function parseGroupsCanvasMode(
  modeValue: unknown,
  legacyVisible?: unknown,
): GroupsCanvasMode {
  if (isGroupsCanvasMode(modeValue)) return modeValue;
  if (typeof legacyVisible === "boolean") {
    return legacyVisible ? "full" : "hidden";
  }
  return "full";
}

export function cycleGroupsCanvasMode(mode: GroupsCanvasMode): GroupsCanvasMode {
  if (mode === "full") return "connected";
  if (mode === "connected") return "hidden";
  return "full";
}

export interface GroupCanvasVisibilityContext {
  groupsCanvasMode: GroupsCanvasMode;
  selectedGroupId: string | null;
  toolMode: string;
  connectFrom: NodeRef | null;
  connectDragFrom: NodeRef | null;
  lines: Line[];
  groups: Group[];
  characters: Character[];
  boxes: Box[];
  fontFamily: string;
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

function groupHasLines(groupId: string, lines: Line[]): boolean {
  return lines.some((line) => lineInvolvesGroup(line, groupId));
}

function isGroupCollapsedAway(
  groupId: string,
  ctx: GroupCanvasVisibilityContext,
): boolean {
  const group = ctx.groups.find((g) => g.id === groupId);
  if (!group) return false;
  return areAllGroupMembersInCollapsedBoxes(
    group,
    ctx.characters,
    ctx.boxes,
    ctx.fontFamily,
  );
}

/**
 * Corridor spokes. Full mode: all membered groups. Otherwise only force-visible
 * / connecting exceptions (never in connected/hidden for idle groups).
 */
export function shouldShowGroupHubSpokes(
  groupId: string,
  ctx: GroupCanvasVisibilityContext & { hasMembers: boolean },
): boolean {
  if (!ctx.hasMembers) return false;
  if (isGroupForceVisible(groupId, ctx)) return true;
  if (isConnecting(ctx)) return true;
  if (isGroupCollapsedAway(groupId, ctx)) return false;
  if (ctx.groupsCanvasMode === "full") return true;
  return false;
}

/**
 * Hub badge. Full: all with members. Connected: only groups with lines.
 * Hidden: force-visible / connecting only. Also hidden when every member is
 * inside the same collapsed box (unless selected / connecting).
 */
export function shouldShowGroupHubBadge(
  groupId: string,
  ctx: GroupCanvasVisibilityContext & { hasMembers: boolean },
): boolean {
  if (!ctx.hasMembers) return false;
  if (isGroupForceVisible(groupId, ctx)) return true;
  if (isConnecting(ctx)) return true;
  if (isGroupCollapsedAway(groupId, ctx)) return false;
  if (ctx.groupsCanvasMode === "full") return true;
  if (ctx.groupsCanvasMode === "connected") {
    return groupHasLines(groupId, ctx.lines);
  }
  return false;
}

/** Group-linked lines: hidden only in hidden mode (unless edit/connect exceptions). */
export function shouldShowGroupLine(
  line: Line,
  ctx: GroupCanvasVisibilityContext,
): boolean {
  if (!lineInvolvesGroup(line)) return true;
  const groupIds = [line.from, line.to]
    .filter((ref) => ref.kind === "group")
    .map((ref) => ref.id);
  if (groupIds.some((id) => isGroupForceVisible(id, ctx))) return true;
  if (isConnecting(ctx)) return true;
  if (groupIds.some((id) => isGroupCollapsedAway(id, ctx))) return false;
  if (ctx.groupsCanvasMode === "hidden") return false;
  return true;
}
