export interface RGB {
  r: number;
  g: number;
  b: number;
}

export type BorderShape = "circle" | "square" | "pentagon" | "hexagon";
export type LineStyle = "straight" | "wavy" | "dotted" | "jagged";
export type NodeKind = "character" | "box";
export type ToolMode = "select" | "exportBounds" | "editGroupMembers";

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
  /** Original file name for display only; not required to render the image. */
  imageFileName?: string;
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

/** Built-in glyph drawn on membership chips. */
export type MembershipSymbol =
  | "none"
  | "star"
  | "moon"
  | "heart"
  | "diamond"
  | "circle"
  | "ring"
  | "square"
  | "triangle"
  | "hexagon"
  | "plus"
  | "cross"
  | "slash"
  | "music"
  | "sword"
  | "flame"
  | "droplet"
  | "breeze"
  | "rock"
  | "plant"
  | "sparkle"
  | "skull";

/** Visual identity for a membership group chip. */
export interface MembershipAppearance {
  backgroundColor: RGB;
  symbol: MembershipSymbol;
  symbolColor: RGB;
  borderColor: RGB;
}

export const MEMBERSHIP_SYMBOLS: MembershipSymbol[] = [
  "none",
  "star",
  "moon",
  "heart",
  "diamond",
  "circle",
  "ring",
  "square",
  "triangle",
  "hexagon",
  "plus",
  "cross",
  "slash",
  "music",
  "sword",
  "flame",
  "droplet",
  "breeze",
  "rock",
  "plant",
  "sparkle",
  "skull",
];

export function isMembershipSymbol(value: unknown): value is MembershipSymbol {
  return (
    typeof value === "string" &&
    MEMBERSHIP_SYMBOLS.includes(value as MembershipSymbol)
  );
}

export function defaultMembershipAppearance(
  backgroundColor: RGB = { r: 100, g: 140, b: 100 },
): MembershipAppearance {
  return {
    backgroundColor: { ...backgroundColor },
    symbol: "none",
    symbolColor: { r: 255, g: 255, b: 255 },
    borderColor: { r: 51, g: 51, b: 51 },
  };
}

export function normalizeMembershipAppearance(
  appearance: Partial<MembershipAppearance> | undefined,
  fallbackBackground: RGB = { r: 100, g: 140, b: 100 },
): MembershipAppearance {
  const defaults = defaultMembershipAppearance(fallbackBackground);
  return {
    backgroundColor: appearance?.backgroundColor
      ? { ...appearance.backgroundColor }
      : defaults.backgroundColor,
    symbol: isMembershipSymbol(appearance?.symbol)
      ? appearance.symbol
      : defaults.symbol,
    symbolColor: appearance?.symbolColor
      ? { ...appearance.symbolColor }
      : defaults.symbolColor,
    borderColor: appearance?.borderColor
      ? { ...appearance.borderColor }
      : defaults.borderColor,
  };
}

/** Semantic membership group — chips / highlight only; not a canvas connect target. */
export interface Group {
  id: string;
  name: string;
  memberCharacterIds: string[];
  appearance: MembershipAppearance;
}

/** Organisational region — labelled box, geometric containment, collapse. */
export interface Box {
  id: string;
  name: string;
  borderColor: RGB;
  collapsed: boolean;
  collapsedPosition?: { x: number; y: number };
  anchorPosition?: { x: number; y: number };
  bounds?: Bounds;
}

/** Freestanding canvas annotation — not connected to characters, boxes, or lines. */
export interface FloatingText {
  id: string;
  position: { x: number; y: number };
  text: string;
  color: RGB;
  fontSize: number;
}

export const DEFAULT_FLOATING_TEXT_COLOR: RGB = { r: 31, g: 31, b: 31 };
export const DEFAULT_FLOATING_TEXT_FONT_SIZE = 15;
export const MIN_FLOATING_TEXT_FONT_SIZE = 10;

export interface Viewport {
  x: number;
  y: number;
  scale: number;
}

export type GridStyle = "lines" | "dots";

/** Pill label chrome shared across matching canvas labels. */
export interface LabelChrome {
  textColor: RGB;
  backgroundColor: RGB;
  borderColor: RGB;
}

/**
 * Diagram canvas appearance: creation defaults for new entities, plus
 * shared label chrome applied live to all matching pills, plus canvas background.
 */
export interface DiagramAppearance {
  /** Canvas background mode (plain / blank / grid / dots). */
  backgroundMode: "plain" | "blank" | "grid" | "dots";
  /** Canvas fill; null means transparent (blank). */
  backgroundColor: RGB | null;
  /** Grid line or dot colour when background mode is grid or dots. */
  backgroundGridColor: RGB;
  defaultLineColor: RGB;
  defaultCharacterBorderColor: RGB;
  /** Fill inside character shapes when no image is set; diagram-wide. */
  characterPlaceholderFill: RGB;
  /** Abbreviated name text inside character shapes without an image; diagram-wide. */
  characterInitialsColor: RGB;
  defaultBoxBorderColor: RGB;
  defaultFloatingTextColor: RGB;
  characterNameLabel: LabelChrome;
  characterSubtitleLabel: LabelChrome;
  lineLabel: LabelChrome;
  boxNameLabel: LabelChrome;
}

export interface Diagram {
  schemaVersion: 2;
  title?: string;
  subtitle?: string;
  /** Title text colour; omit for default export-matching dark grey. */
  titleColor?: RGB;
  /** Subtitle text colour; omit for default export-matching mid grey. */
  subtitleColor?: RGB;
  showHeader?: boolean;
  showGrid?: boolean;
  gridStyle?: GridStyle;
  fontFamily?: string;
  backgroundColor?: RGB | null;
  /** Canvas appearance defaults + shared label chrome; omit for built-ins. */
  appearance?: Partial<DiagramAppearance>;
  characters: Character[];
  lines: Line[];
  groups: Group[];
  boxes: Box[];
  floatingTexts?: FloatingText[];
  viewport?: Viewport;
}

export type Selection =
  | { type: "character"; id: string }
  | { type: "line"; id: string }
  | { type: "group"; id: string; anchorCharacterId?: string }
  | { type: "box"; id: string }
  | { type: "floatingText"; id: string }
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
export const CHARACTER_BORDER_STROKE_WIDTH = 4;
export const BOX_PADDING = 48;
export const BOX_HEADER_HEIGHT = 28;
export const COLLAPSED_BOX_SIZE = 44;
export const MIN_BOX_WIDTH = 120;
export const MIN_BOX_HEIGHT = BOX_HEADER_HEIGHT + 32;
export const BOX_RESIZE_HANDLE_SCREEN_SIZE = 8;
export const MEMBERSHIP_CHIP_MAX_VISIBLE = 4;
export const MEMBERSHIP_CHIP_RADIUS = 9;

export type BoxResizeEdge =
  | "n"
  | "s"
  | "e"
  | "w"
  | "ne"
  | "nw"
  | "se"
  | "sw";

export function rgbToCss(color: RGB): string {
  return `rgb(${color.r}, ${color.g}, ${color.b})`;
}

export function rgbToHex(color: RGB): string {
  return (
    "#" +
    [color.r, color.g, color.b]
      .map((channel) => channel.toString(16).padStart(2, "0"))
      .join("")
  );
}

export function parseHexColor(hexValue: string): RGB | null {
  const parsed = hexValue.replace(/^#/, "").trim();
  if (!/^[0-9a-fA-F]{6}$/.test(parsed)) return null;
  const r = parseInt(parsed.slice(0, 2), 16);
  const g = parseInt(parsed.slice(2, 4), 16);
  const b = parseInt(parsed.slice(4, 6), 16);
  if ([r, g, b].some((channel) => Number.isNaN(channel))) return null;
  return { r, g, b };
}

export function colorsEqual(a: RGB, b: RGB): boolean {
  return a.r === b.r && a.g === b.g && a.b === b.b;
}

export function defaultRgb(): RGB {
  return { r: 80, g: 120, b: 200 };
}
