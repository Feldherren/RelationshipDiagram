import type {
  Bounds,
  Box,
  BoxResizeEdge,
  Character,
  Diagram,
  FloatingText,
  Group,
  Point,
  RGB,
} from "../models/types";
import {
  CHARACTER_BORDER_STROKE_WIDTH,
  COLLAPSED_BOX_SIZE,
  DEFAULT_CHARACTER_SIZE,
  DEFAULT_FLOATING_TEXT_FONT_SIZE,
  BOX_HEADER_HEIGHT,
  BOX_PADDING,
  MIN_BOX_HEIGHT,
  MIN_BOX_WIDTH,
} from "../models/types";
import {
  CHARACTER_LABEL_GAP,
  CHARACTER_LABEL_PADDING_X,
  CHARACTER_LABEL_PADDING_Y,
  CHARACTER_NAME_FONT_SIZE,
  CHARACTER_SUBTITLE_FONT_SIZE,
  getFloatingTextSize,
  getPillLabelSize,
} from "./labelMetrics";
import { DEFAULT_DIAGRAM_FONT } from "./diagramFont";
import { getConnectHandleOffset, CONNECT_HANDLE_SCREEN_RADIUS } from "./connection";

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

export function getBoxById(
  diagram: Pick<Diagram, "boxes">,
  id: string,
): Box | undefined {
  return diagram.boxes.find((b) => b.id === id);
}

export function getFloatingTextById(
  diagram: Pick<Diagram, "floatingTexts">,
  id: string,
): FloatingText | undefined {
  return diagram.floatingTexts?.find((t) => t.id === id);
}

export function getGroupsForCharacter(
  characterId: string,
  groups: Group[],
): Group[] {
  return groups.filter((g) => g.memberCharacterIds.includes(characterId));
}

export function getFloatingTextBounds(
  floatingText: FloatingText,
  fontFamily: string = DEFAULT_DIAGRAM_FONT,
): Bounds {
  const displayText = floatingText.text.trim() ? floatingText.text : "Text";
  const fontSize = floatingText.fontSize || DEFAULT_FLOATING_TEXT_FONT_SIZE;
  const size = getFloatingTextSize(displayText, fontSize, fontFamily);
  const { x, y } = floatingText.position;
  return {
    x: x - size.width / 2 - PILL_STROKE_MARGIN,
    y: y - size.height / 2 - PILL_STROKE_MARGIN,
    width: size.width + PILL_STROKE_MARGIN * 2,
    height: size.height + PILL_STROKE_MARGIN * 2,
  };
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
      "normal",
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

export function isPointOverCollapsedBox(
  point: Point,
  box: Box,
  padding = 0,
): boolean {
  const center = box.collapsedPosition ?? { x: 0, y: 0 };
  const half = COLLAPSED_BOX_SIZE + padding;
  return (
    Math.max(Math.abs(point.x - center.x), Math.abs(point.y - center.y)) <= half
  );
}

export function getCollapsedBoxSquareBounds(center: Point): Bounds {
  const half = COLLAPSED_BOX_SIZE;
  return {
    x: center.x - half,
    y: center.y - half,
    width: half * 2,
    height: half * 2,
  };
}

export function getCollapsedBoxBounds(
  box: Box,
  fontFamily: string = DEFAULT_DIAGRAM_FONT,
): Bounds {
  const center = box.collapsedPosition ?? { x: 0, y: 0 };
  const size = COLLAPSED_BOX_SIZE;

  let minX = center.x - size;
  let maxX = center.x + size;
  let minY = center.y - size;
  let maxY = center.y + size;

  if (box.name) {
    const pill = getPillLabelSize(box.name, 12, "normal", fontFamily);
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

export function getEmptyBoxBounds(anchor: Point): Bounds {
  const innerSize = DEFAULT_CHARACTER_SIZE * 2;
  const width = innerSize + BOX_PADDING * 2;
  const height = innerSize + BOX_PADDING * 2 + BOX_HEADER_HEIGHT;
  return {
    x: anchor.x - width / 2,
    y: anchor.y - height / 2,
    width,
    height,
  };
}

export function resolveBoxBounds(box: Box): Bounds | null {
  if (box.bounds) return box.bounds;
  if (!box.anchorPosition) return null;
  return getEmptyBoxBounds(box.anchorPosition);
}

export function isPointContainedInBox(point: Point, box: Box): boolean {
  const bounds = resolveBoxBounds(box);
  if (!bounds) return false;
  const { x, y } = point;
  return (
    x >= bounds.x &&
    x <= bounds.x + bounds.width &&
    y >= bounds.y &&
    y <= bounds.y + bounds.height
  );
}

export function isCharacterContainedInBox(
  character: Character,
  box: Box,
): boolean {
  return isPointContainedInBox(character.position, box);
}

export function getCharactersContainedInBox(
  box: Box,
  characters: Character[],
): Character[] {
  return characters.filter((c) => isCharacterContainedInBox(c, box));
}

export function isFloatingTextContainedInBox(
  floatingText: FloatingText,
  box: Box,
): boolean {
  return isPointContainedInBox(floatingText.position, box);
}

export function getFloatingTextsContainedInBox(
  box: Box,
  floatingTexts: FloatingText[],
): FloatingText[] {
  return floatingTexts.filter((t) => isFloatingTextContainedInBox(t, box));
}

export function resizeBoxBounds(
  start: Bounds,
  edge: BoxResizeEdge,
  pointer: Point,
  startPointer: Point,
  minWidth = MIN_BOX_WIDTH,
  minHeight = MIN_BOX_HEIGHT,
): Bounds {
  const dx = pointer.x - startPointer.x;
  const dy = pointer.y - startPointer.y;

  let { x, y, width, height } = start;

  if (edge.includes("e")) {
    width = Math.max(minWidth, start.width + dx);
  }
  if (edge.includes("w")) {
    const newWidth = Math.max(minWidth, start.width - dx);
    x = start.x + start.width - newWidth;
    width = newWidth;
  }
  if (edge.includes("s")) {
    height = Math.max(minHeight, start.height + dy);
  }
  if (edge.includes("n")) {
    const newHeight = Math.max(minHeight, start.height - dy);
    y = start.y + start.height - newHeight;
    height = newHeight;
  }

  return { x, y, width, height };
}

export function cursorForBoxResizeEdge(edge: BoxResizeEdge): string {
  switch (edge) {
    case "n":
    case "s":
      return "ns-resize";
    case "e":
    case "w":
      return "ew-resize";
    case "ne":
    case "sw":
      return "nesw-resize";
    case "nw":
    case "se":
      return "nwse-resize";
  }
}

export function getBoxCenter(box: Box): Point {
  if (box.collapsed && box.collapsedPosition) {
    return box.collapsedPosition;
  }
  const bounds = resolveBoxBounds(box);
  if (!bounds) {
    return box.collapsedPosition ?? { x: 0, y: 0 };
  }
  return {
    x: bounds.x + bounds.width / 2,
    y: bounds.y + bounds.height / 2,
  };
}

export function getNodeCenter(
  kind: "character" | "box",
  id: string,
  diagram: Pick<Diagram, "characters" | "boxes">,
): Point {
  if (kind === "character") {
    const character = getCharacterById(diagram, id);
    return character?.position ?? { x: 0, y: 0 };
  }
  const box = getBoxById(diagram, id);
  if (!box) return { x: 0, y: 0 };
  return getBoxCenter(box);
}

export function getNodeRadius(
  kind: "character" | "box",
  id: string,
  diagram: Pick<Diagram, "characters" | "boxes">,
): number {
  if (kind === "character") {
    const character = getCharacterById(diagram, id);
    return character?.size ?? DEFAULT_CHARACTER_SIZE;
  }
  const box = getBoxById(diagram, id);
  if (!box) return COLLAPSED_BOX_SIZE;
  if (box.collapsed) return COLLAPSED_BOX_SIZE;
  const bounds = resolveBoxBounds(box);
  if (!bounds) return COLLAPSED_BOX_SIZE;
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

export function getBoxEdgePoint(box: Box, toward: Point): Point {
  if (box.collapsed) {
    const center = box.collapsedPosition ?? { x: 0, y: 0 };
    return squareEdgePoint(center, COLLAPSED_BOX_SIZE, toward);
  }
  const bounds = resolveBoxBounds(box);
  if (!bounds) {
    const center = box.collapsedPosition ?? { x: 0, y: 0 };
    return squareEdgePoint(center, COLLAPSED_BOX_SIZE, toward);
  }
  return rectEdgePoint(bounds, toward);
}

export function getNodeEdgePoint(
  kind: "character" | "box",
  id: string,
  toward: Point,
  diagram: Pick<Diagram, "characters" | "boxes">,
): Point {
  if (kind === "character") {
    const character = getCharacterById(diagram, id);
    if (!character) return toward;
    return getCharacterEdgePoint(character, toward);
  }
  const box = getBoxById(diagram, id);
  if (!box) return toward;
  return getBoxEdgePoint(box, toward);
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
  kind: "character" | "box",
  id: string,
  point: Point,
  diagram: Pick<Diagram, "characters" | "boxes">,
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

  const box = getBoxById(diagram, id);
  if (!box) return false;
  if (box.collapsed) {
    const center = box.collapsedPosition ?? { x: 0, y: 0 };
    const dx = point.x - center.x;
    const dy = point.y - center.y;
    return Math.max(Math.abs(dx), Math.abs(dy)) <= COLLAPSED_BOX_SIZE;
  }
  const bounds = resolveBoxBounds(box);
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

export function boundsIntersect(a: Bounds, b: Bounds): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
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
