export interface RGB {
  r: number;
  g: number;
  b: number;
}

export type BorderShape = "circle" | "square" | "pentagon" | "hexagon";
export type LineStyle = "straight" | "wavy" | "dotted" | "jagged";
export type NodeKind = "character" | "group";
export type ToolMode = "select" | "exportBounds";

export interface ConnectDrag {
  from: NodeRef;
  startX: number;
  startY: number;
  x: number;
  y: number;
}

export interface NodeRef {
  id: string;
  kind: NodeKind;
}

export interface Character {
  id: string;
  position: { x: number; y: number };
  name: string;
  subtitle?: string;
  imageData?: string;
  imageFocus?: { x: number; y: number };
  borderShape: BorderShape;
  borderColor: RGB;
  size: number;
}

export interface Line {
  id: string;
  from: NodeRef;
  to: NodeRef;
  color: RGB;
  style: LineStyle;
  startArrow: boolean;
  endArrow: boolean;
  label?: string;
  routeIndex: number;
  bend?: number;
}

export interface Group {
  id: string;
  name: string;
  memberCharacterIds: string[];
  collapsed: boolean;
  collapsedPosition?: { x: number; y: number };
  borderColor: RGB;
}

export interface Viewport {
  x: number;
  y: number;
  scale: number;
}

export interface Diagram {
  schemaVersion: 1;
  title?: string;
  subtitle?: string;
  showHeader?: boolean;
  fontFamily?: string;
  characters: Character[];
  lines: Line[];
  groups: Group[];
  viewport?: Viewport;
}

export type Selection =
  | { type: "character"; id: string }
  | { type: "line"; id: string }
  | { type: "group"; id: string }
  | null;

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

export const DEFAULT_CHARACTER_SIZE = 40;
export const GROUP_PADDING = 48;
export const GROUP_HEADER_HEIGHT = 28;
export const COLLAPSED_GROUP_SIZE = 44;

export function rgbToCss(color: RGB): string {
  return `rgb(${color.r}, ${color.g}, ${color.b})`;
}

export function defaultRgb(): RGB {
  return { r: 80, g: 120, b: 200 };
}
