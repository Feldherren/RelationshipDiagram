import type {
  Bounds,
  Character,
  Diagram,
  Group,
  Point,
  RGB,
} from "../models/types";
import {
  CHARACTER_BORDER_STROKE_WIDTH,
  COLLAPSED_GROUP_SIZE,
  DEFAULT_CHARACTER_SIZE,
  GROUP_HEADER_HEIGHT,
  GROUP_PADDING,
} from "../models/types";
import {
  CHARACTER_LABEL_GAP,
  CHARACTER_LABEL_PADDING_X,
  CHARACTER_LABEL_PADDING_Y,
  CHARACTER_NAME_FONT_SIZE,
  CHARACTER_SUBTITLE_FONT_SIZE,
  getPillLabelSize,
} from "./labelMetrics";
import { DEFAULT_DIAGRAM_FONT } from "./diagramFont";
import { getConnectHandleOffset } from "./connection";

const CONNECT_HANDLE_SCREEN_RADIUS = 10;
const NODE_STROKE_MARGIN = CHARACTER_BORDER_STROKE_WIDTH / 2;
const PILL_STROKE_MARGIN = 2;
const LABEL_EXTRA_MARGIN = 2;

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

export function getCharacterBounds(
  character: Character,
  fontFamily: string = DEFAULT_DIAGRAM_FONT,
  viewportScale = 1,
): Bounds {
  const size = character.size || DEFAULT_CHARACTER_SIZE;
  const { x, y } = character.position;
  const handleRadius = CONNECT_HANDLE_SCREEN_RADIUS / viewportScale;

  let minX = x - size - NODE_STROKE_MARGIN;
  let maxX = x + size + NODE_STROKE_MARGIN;
  let minY = y - size - NODE_STROKE_MARGIN;
  let maxY = y + size + NODE_STROKE_MARGIN;

  const handleOffset = getConnectHandleOffset(size);
  const handleX = x + handleOffset.x;
  const handleY = y + handleOffset.y;
  minX = Math.min(minX, handleX - handleRadius);
  maxX = Math.max(maxX, handleX + handleRadius);
  minY = Math.min(minY, handleY - handleRadius);
  maxY = Math.max(maxY, handleY + handleRadius);

  let labelTop = y + size + 8;

  if (character.name) {
    const nameSize = getPillLabelSize(
      character.name,
      CHARACTER_NAME_FONT_SIZE,
      "bold",
      fontFamily,
      CHARACTER_LABEL_PADDING_X,
      CHARACTER_LABEL_PADDING_Y,
    );
    minX = Math.min(minX, x - nameSize.width / 2 - PILL_STROKE_MARGIN);
    maxX = Math.max(maxX, x + nameSize.width / 2 + PILL_STROKE_MARGIN);
    minY = Math.min(minY, labelTop - LABEL_EXTRA_MARGIN);
    maxY = Math.max(maxY, labelTop + nameSize.height + LABEL_EXTRA_MARGIN);
    labelTop += nameSize.height + CHARACTER_LABEL_GAP;
  }

  if (character.subtitle) {
    const subtitleSize = getPillLabelSize(
      character.subtitle,
      CHARACTER_SUBTITLE_FONT_SIZE,
      "normal",
      fontFamily,
      CHARACTER_LABEL_PADDING_X,
      CHARACTER_LABEL_PADDING_Y,
    );
    minX = Math.min(minX, x - subtitleSize.width / 2 - PILL_STROKE_MARGIN);
    maxX = Math.max(maxX, x + subtitleSize.width / 2 + PILL_STROKE_MARGIN);
    minY = Math.min(minY, labelTop - LABEL_EXTRA_MARGIN);
    maxY = Math.max(maxY, labelTop + subtitleSize.height + LABEL_EXTRA_MARGIN);
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

export function getCollapsedGroupBounds(
  group: Group,
  fontFamily: string = DEFAULT_DIAGRAM_FONT,
): Bounds {
  const center = group.collapsedPosition ?? { x: 0, y: 0 };
  const size = COLLAPSED_GROUP_SIZE;

  let minX = center.x - size;
  let maxX = center.x + size;
  let minY = center.y - size;
  let maxY = center.y + size;

  if (group.name) {
    const pill = getPillLabelSize(group.name, 12, "bold", fontFamily);
    const pillCenterY = center.y - (size + pill.height / 2 + 6);
    minX = Math.min(minX, center.x - pill.width / 2);
    maxX = Math.max(maxX, center.x + pill.width / 2);
    minY = Math.min(minY, pillCenterY - pill.height / 2);
    maxY = Math.max(maxY, pillCenterY + pill.height / 2);
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

export function getGroupMemberBounds(
  group: Group,
  characters: Character[],
  fontFamily: string = DEFAULT_DIAGRAM_FONT,
  viewportScale = 1,
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
    const b = getCharacterBounds(member, fontFamily, viewportScale);
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

function regularPolygonEdgePoint(
  center: Point,
  radius: number,
  sides: number,
  toward: Point,
): Point {
  const dx = toward.x - center.x;
  const dy = toward.y - center.y;
  if (dx === 0 && dy === 0) {
    return { x: center.x, y: center.y - radius };
  }

  const angle = Math.atan2(dy, dx);
  const step = (2 * Math.PI) / sides;
  const startAngle = -Math.PI / 2;
  let rel = angle - startAngle;
  rel = ((rel % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  const sectorMid = startAngle + Math.floor(rel / step) * step + step / 2;
  const alpha = angle - sectorMid;
  const dist = (radius * Math.cos(Math.PI / sides)) / Math.cos(alpha);

  return {
    x: center.x + Math.cos(angle) * dist,
    y: center.y + Math.sin(angle) * dist,
  };
}

function polygonEdgePoint(
  center: Point,
  radius: number,
  sides: number,
  toward: Point,
): Point {
  return regularPolygonEdgePoint(center, radius, sides, toward);
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

function pointInRegularPolygon(
  point: Point,
  center: Point,
  radius: number,
  sides: number,
): boolean {
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  if (dx === 0 && dy === 0) return true;
  const angle = Math.atan2(dy, dx);
  const step = (2 * Math.PI) / sides;
  const startAngle = -Math.PI / 2;
  let rel = angle - startAngle;
  rel = ((rel % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  const sectorMid = startAngle + Math.floor(rel / step) * step + step / 2;
  const alpha = angle - sectorMid;
  const edgeDist = (radius * Math.cos(Math.PI / sides)) / Math.cos(alpha);
  return Math.hypot(dx, dy) <= edgeDist + 0.01;
}

export function isPointInsideNode(
  kind: "character" | "group",
  id: string,
  point: Point,
  diagram: Pick<Diagram, "characters" | "groups">,
): boolean {
  if (kind === "character") {
    const character = getCharacterById(diagram, id);
    if (!character) return false;
    const center = character.position;
    const size = character.size || DEFAULT_CHARACTER_SIZE;
    const dx = point.x - center.x;
    const dy = point.y - center.y;
    switch (character.borderShape) {
      case "square":
        return Math.max(Math.abs(dx), Math.abs(dy)) <= size;
      case "pentagon":
        return pointInRegularPolygon(point, center, size, 5);
      case "hexagon":
        return pointInRegularPolygon(point, center, size, 6);
      default:
        return Math.hypot(dx, dy) <= size;
    }
  }

  const group = getGroupById(diagram, id);
  if (!group) return false;
  if (group.collapsed) {
    const center = group.collapsedPosition ?? { x: 0, y: 0 };
    return (
      Math.hypot(point.x - center.x, point.y - center.y) <= COLLAPSED_GROUP_SIZE
    );
  }
  const bounds = getGroupMemberBounds(group, diagram.characters);
  if (!bounds) return false;
  return (
    point.x >= bounds.x &&
    point.x <= bounds.x + bounds.width &&
    point.y >= bounds.y &&
    point.y <= bounds.y + bounds.height
  );
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

export function rgbaWithAlpha(color: RGB, alpha: number): string {
  return `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;
}
