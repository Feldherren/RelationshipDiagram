import type {
  Bounds,
  Character,
  Diagram,
  Group,
  Point,
  RGB,
} from "../models/types";
import {
  COLLAPSED_GROUP_SIZE,
  DEFAULT_CHARACTER_SIZE,
  GROUP_HEADER_HEIGHT,
  GROUP_PADDING,
} from "../models/types";

export function distance(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function normalize(v: Point): Point {
  const len = Math.hypot(v.x, v.y) || 1;
  return { x: v.x / len, y: v.y / len };
}

export function perpendicular(v: Point): Point {
  return { x: -v.y, y: v.x };
}

export function getCharacterById(
  diagram: Pick<Diagram, "characters">,
  id: string,
): Character | undefined {
  return diagram.characters.find((c) => c.id === id);
}

export function getGroupById(
  diagram: Pick<Diagram, "groups">,
  id: string,
): Group | undefined {
  return diagram.groups.find((g) => g.id === id);
}

export function getCharacterBounds(character: Character): Bounds {
  const size = character.size || DEFAULT_CHARACTER_SIZE;
  const subtitleSpace = character.subtitle ? 22 : 0;
  const nameSpace = character.name ? 18 : 0;
  const extraHeight = subtitleSpace + nameSpace;
  return {
    x: character.position.x - size,
    y: character.position.y - size,
    width: size * 2,
    height: size * 2 + extraHeight,
  };
}

export function getGroupMemberBounds(
  group: Group,
  characters: Character[],
): Bounds | null {
  const members = characters.filter((c) =>
    group.memberCharacterIds.includes(c.id),
  );
  if (members.length === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const member of members) {
    const b = getCharacterBounds(member);
    minX = Math.min(minX, b.x);
    minY = Math.min(minY, b.y);
    maxX = Math.max(maxX, b.x + b.width);
    maxY = Math.max(maxY, b.y + b.height);
  }

  return {
    x: minX - GROUP_PADDING,
    y: minY - GROUP_PADDING - GROUP_HEADER_HEIGHT,
    width: maxX - minX + GROUP_PADDING * 2,
    height: maxY - minY + GROUP_PADDING * 2 + GROUP_HEADER_HEIGHT,
  };
}

export function getGroupCenter(group: Group, characters: Character[]): Point {
  if (group.collapsed && group.collapsedPosition) {
    return group.collapsedPosition;
  }
  const bounds = getGroupMemberBounds(group, characters);
  if (!bounds) {
    return group.collapsedPosition ?? { x: 0, y: 0 };
  }
  return {
    x: bounds.x + bounds.width / 2,
    y: bounds.y + bounds.height / 2,
  };
}

export function getNodeCenter(
  kind: "character" | "group",
  id: string,
  diagram: Pick<Diagram, "characters" | "groups">,
): Point {
  if (kind === "character") {
    const character = getCharacterById(diagram, id);
    return character?.position ?? { x: 0, y: 0 };
  }
  const group = getGroupById(diagram, id);
  if (!group) return { x: 0, y: 0 };
  return getGroupCenter(group, diagram.characters);
}

export function getNodeRadius(
  kind: "character" | "group",
  id: string,
  diagram: Pick<Diagram, "characters" | "groups">,
): number {
  if (kind === "character") {
    const character = getCharacterById(diagram, id);
    return character?.size ?? DEFAULT_CHARACTER_SIZE;
  }
  const group = getGroupById(diagram, id);
  if (!group) return COLLAPSED_GROUP_SIZE;
  if (group.collapsed) return COLLAPSED_GROUP_SIZE;
  const bounds = getGroupMemberBounds(group, diagram.characters);
  if (!bounds) return COLLAPSED_GROUP_SIZE;
  return Math.max(bounds.width, bounds.height) / 2;
}

function circleEdgePoint(center: Point, radius: number, toward: Point): Point {
  const dir = normalize({ x: toward.x - center.x, y: toward.y - center.y });
  return { x: center.x + dir.x * radius, y: center.y + dir.y * radius };
}

function squareEdgePoint(center: Point, half: number, toward: Point): Point {
  const dx = toward.x - center.x;
  const dy = toward.y - center.y;
  if (dx === 0 && dy === 0) return { x: center.x + half, y: center.y };
  const scale = half / Math.max(Math.abs(dx), Math.abs(dy));
  return { x: center.x + dx * scale, y: center.y + dy * scale };
}

function polygonEdgePoint(
  center: Point,
  radius: number,
  sides: number,
  toward: Point,
): Point {
  const angle = Math.atan2(toward.y - center.y, toward.x - center.x);
  const step = (Math.PI * 2) / sides;
  const start = -Math.PI / 2;
  let bestPoint = center;
  let bestDist = Infinity;

  for (let i = 0; i < sides; i++) {
    const a = start + i * step;
    const px = center.x + Math.cos(a) * radius;
    const py = center.y + Math.sin(a) * radius;
    const d = distance({ x: px, y: py }, toward);
    if (d < bestDist) {
      bestDist = d;
      bestPoint = { x: px, y: py };
    }
  }

  const dir = normalize({ x: toward.x - center.x, y: toward.y - center.y });
  const edgeRadius =
    radius / Math.cos(((angle - start) % step) - step / 2 + step / 2);
  void edgeRadius;
  return bestPoint.x !== center.x || bestPoint.y !== center.y
    ? bestPoint
    : {
        x: center.x + dir.x * radius,
        y: center.y + dir.y * radius,
      };
}

function rectEdgePoint(bounds: Bounds, toward: Point): Point {
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

export function getCharacterEdgePoint(
  character: Character,
  toward: Point,
): Point {
  const center = character.position;
  const size = character.size || DEFAULT_CHARACTER_SIZE;
  switch (character.borderShape) {
    case "square":
      return squareEdgePoint(center, size, toward);
    case "pentagon":
      return polygonEdgePoint(center, size, 5, toward);
    case "hexagon":
      return polygonEdgePoint(center, size, 6, toward);
    default:
      return circleEdgePoint(center, size, toward);
  }
}

export function getGroupEdgePoint(
  group: Group,
  characters: Character[],
  toward: Point,
): Point {
  if (group.collapsed) {
    const center = group.collapsedPosition ?? { x: 0, y: 0 };
    return circleEdgePoint(center, COLLAPSED_GROUP_SIZE, toward);
  }
  const bounds = getGroupMemberBounds(group, characters);
  if (!bounds) {
    const center = group.collapsedPosition ?? { x: 0, y: 0 };
    return circleEdgePoint(center, COLLAPSED_GROUP_SIZE, toward);
  }
  return rectEdgePoint(bounds, toward);
}

export function getNodeEdgePoint(
  kind: "character" | "group",
  id: string,
  toward: Point,
  diagram: Pick<Diagram, "characters" | "groups">,
): Point {
  if (kind === "character") {
    const character = getCharacterById(diagram, id);
    if (!character) return toward;
    return getCharacterEdgePoint(character, toward);
  }
  const group = getGroupById(diagram, id);
  if (!group) return toward;
  return getGroupEdgePoint(group, diagram.characters, toward);
}

export function mergeBounds(a: Bounds, b: Bounds): Bounds {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  const maxX = Math.max(a.x + a.width, b.x + b.width);
  const maxY = Math.max(a.y + a.height, b.y + b.height);
  return { x, y, width: maxX - x, height: maxY - y };
}

export function expandBounds(bounds: Bounds, padding: number): Bounds {
  return {
    x: bounds.x - padding,
    y: bounds.y - padding,
    width: bounds.width + padding * 2,
    height: bounds.height + padding * 2,
  };
}

export function computeDiagramBounds(
  diagram: Diagram,
  padding = 32,
): Bounds | null {
  let result: Bounds | null = null;

  for (const character of diagram.characters) {
    const inCollapsedGroup = diagram.groups.some(
      (g) => g.collapsed && g.memberCharacterIds.includes(character.id),
    );
    if (inCollapsedGroup) continue;
    const b = getCharacterBounds(character);
    result = result ? mergeBounds(result, b) : b;
  }

  for (const group of diagram.groups) {
    if (group.collapsed) {
      const center = group.collapsedPosition ?? { x: 0, y: 0 };
      const b: Bounds = {
        x: center.x - COLLAPSED_GROUP_SIZE,
        y: center.y - COLLAPSED_GROUP_SIZE,
        width: COLLAPSED_GROUP_SIZE * 2,
        height: COLLAPSED_GROUP_SIZE * 2,
      };
      result = result ? mergeBounds(result, b) : b;
    } else {
      const b = getGroupMemberBounds(group, diagram.characters);
      if (b) result = result ? mergeBounds(result, b) : b;
    }
  }

  if (!result) return null;
  return expandBounds(result, padding);
}

export function rgbaWithAlpha(color: RGB, alpha: number): string {
  return `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;
}
