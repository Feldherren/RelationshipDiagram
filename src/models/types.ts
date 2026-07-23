export interface RGB {
  r: number;
  g: number;
  b: number;
}

export type BorderShape = "circle" | "square" | "pentagon" | "hexagon";
export type LineStyle = "straight" | "wavy" | "dotted" | "jagged";
export type NodeKind = "character" | "box" | "group";
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
  | "skull"
  | "question";

/** Visual identity for a membership group chip and hub corridors. */
export interface MembershipAppearance {
  backgroundColor: RGB;
  symbol: MembershipSymbol;
  symbolColor: RGB;
  borderColor: RGB;
  /** Corridor / spoke colour (defaults to backgroundColour). */
  corridorColor: RGB;
  /** Corridor opacity 0–1 (applied once to the whole spoke group). */
  corridorOpacity: number;
}

/** Default translucent corridor strength when none is stored. */
export const DEFAULT_GROUP_CORRIDOR_OPACITY = 0.18;

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
  "question",
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
  const bg = { ...backgroundColor };
  return {
    backgroundColor: bg,
    symbol: "none",
    symbolColor: { r: 255, g: 255, b: 255 },
    borderColor: { r: 51, g: 51, b: 51 },
    corridorColor: { ...bg },
    corridorOpacity: DEFAULT_GROUP_CORRIDOR_OPACITY,
  };
}

function clampCorridorOpacity(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.min(1, Math.max(0, value));
}

export function normalizeMembershipAppearance(
  appearance: Partial<MembershipAppearance> | undefined,
  fallbackBackground: RGB = { r: 100, g: 140, b: 100 },
): MembershipAppearance {
  const defaults = defaultMembershipAppearance(fallbackBackground);
  const backgroundColor = appearance?.backgroundColor
    ? { ...appearance.backgroundColor }
    : defaults.backgroundColor;
  return {
    backgroundColor,
    symbol: isMembershipSymbol(appearance?.symbol)
      ? appearance.symbol
      : defaults.symbol,
    symbolColor: appearance?.symbolColor
      ? { ...appearance.symbolColor }
      : defaults.symbolColor,
    borderColor: appearance?.borderColor
      ? { ...appearance.borderColor }
      : defaults.borderColor,
    corridorColor: appearance?.corridorColor
      ? { ...appearance.corridorColor }
      : { ...backgroundColor },
    corridorOpacity:
      clampCorridorOpacity(appearance?.corridorOpacity) ??
      defaults.corridorOpacity,
  };
}

/**
 * Semantic membership group — chips on members plus a connectable centroid hub
 * (badge + pale spokes). Line endpoints may use `kind: "group"`.
 * Optional `hubPosition` overrides the auto member-centroid for the badge.
 */
export interface Group {
  id: string;
  name: string;
  memberCharacterIds: string[];
  appearance: MembershipAppearance;
  /** Manual hub badge position; omit to follow the members’ centroid. */
  hubPosition?: Point;
}

/** Organisational region — labelled box, geometric containment, collapse. */
export interface Box {
  id: string;
  name: string;
  borderColor: RGB;
  collapsed: boolean;
  collapsedPosition?: { x: number; y: number };
  /** Frozen at collapse; while collapsed, only these members are hidden/moved. */
  containedCharacterIds?: string[];
  containedFloatingTextIds?: string[];
  anchorPosition?: { x: number; y: number };
  bounds?: Bounds;
}

export type FloatingTextAlign = "left" | "center" | "right";

/** Freestanding canvas annotation — not connected to characters, boxes, or lines. */
export interface FloatingText {
  id: string;
  position: { x: number; y: number };
  text: string;
  color: RGB;
  fontSize: number;
  /** Horizontal alignment within the text area. Defaults to center. */
  textAlign?: FloatingTextAlign;
  /** Explicit area width after the user resizes; omit for content-sized width. */
  width?: number;
  /** Explicit area height after the user resizes; omit for content-sized height. */
  height?: number;
}

export const DEFAULT_FLOATING_TEXT_COLOR: RGB = { r: 31, g: 31, b: 31 };
export const DEFAULT_FLOATING_TEXT_FONT_SIZE = 15;
export const DEFAULT_FLOATING_TEXT_ALIGN: FloatingTextAlign = "center";
export const MIN_FLOATING_TEXT_FONT_SIZE = 10;
export const MAX_FLOATING_TEXT_FONT_SIZE = 72;
export const MIN_FLOATING_TEXT_WIDTH = 40;
export const MIN_FLOATING_TEXT_HEIGHT = 24;
export const FLOATING_TEXT_ALIGNS: FloatingTextAlign[] = [
  "left",
  "center",
  "right",
];

export interface Viewport {
  x: number;
  y: number;
  scale: number;
}

/** Named camera bookmark stored with the diagram. */
export interface ViewBookmark {
  id: string;
  name: string;
  color: RGB;
  /** Saved pan/zoom to restore. */
  viewport: Viewport;
  /** World position for the flag marker (viewport centre at save time). */
  anchor: Point;
}

export type GridStyle = "lines" | "dots";

/** Pill label chrome shared across matching canvas labels. */
export interface LabelChrome {
  textColor: RGB;
  backgroundColor: RGB;
  borderColor: RGB;
}

/** How a diagram wallpaper image is placed within the viewport / export crop. */
export type BackgroundImagePlacement = "tile" | "center";

/**
 * Diagram canvas appearance: creation defaults for new entities, plus
 * shared label chrome applied live to all matching pills, plus canvas background.
 */
export interface DiagramAppearance {
  /** Diagram-wide font family (labels, floating text, header). */
  fontFamily: string;
  /** Whether the diagram title/subtitle header is shown. */
  showHeader: boolean;
  /** Canvas background mode (plain / blank / grid / dots / image). */
  backgroundMode: "plain" | "blank" | "grid" | "dots" | "image";
  /** Canvas fill; null means transparent (blank). Underlay when mode is image. */
  backgroundColor: RGB | null;
  /** Data URL wallpaper when using image mode; null when unset. */
  backgroundImageData: string | null;
  /** Tile or centre the wallpaper within the fill rect. */
  backgroundImagePlacement: BackgroundImagePlacement;
  /** Scale relative to the image's natural pixel size; 1 = 100%. */
  backgroundImageScale: number;
  /**
   * World-space anchor for the wallpaper: centre point in centre mode,
   * tile-grid origin in tile mode. Default is the world origin.
   */
  backgroundImageOffset: Point;
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
  /** Diagram header title pill chrome; diagram-wide. */
  diagramTitleLabel: LabelChrome;
  /** Diagram header subtitle pill chrome; diagram-wide. */
  diagramSubtitleLabel: LabelChrome;
}

export interface Diagram {
  schemaVersion: 3;
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
  /** Named camera bookmarks; omit or empty when none. */
  bookmarks?: ViewBookmark[];
}

/** Items that can appear in a marquee multi-selection. */
export type MultiSelectableItem =
  | { type: "character"; id: string }
  | { type: "box"; id: string }
  | { type: "floatingText"; id: string };

export type Selection =
  | { type: "character"; id: string }
  | { type: "line"; id: string }
  | { type: "group"; id: string; anchorCharacterId?: string }
  | { type: "box"; id: string }
  | { type: "floatingText"; id: string }
  | { type: "bookmark"; id: string }
  | { type: "multi"; items: MultiSelectableItem[] }
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
export const MIN_CHARACTER_SIZE = 24;
export const MAX_CHARACTER_SIZE = 80;
export const CHARACTER_BORDER_STROKE_WIDTH = 4;
/** Corner radius for square / polygon character borders (matches square Rect). */
export const CHARACTER_BORDER_CORNER_RADIUS = 4;
export const BOX_PADDING = 48;
export const BOX_HEADER_HEIGHT = 28;
export const COLLAPSED_BOX_SIZE = 44;
export const MIN_BOX_WIDTH = 120;
export const MIN_BOX_HEIGHT = BOX_HEADER_HEIGHT + 32;
export const BOX_RESIZE_HANDLE_SCREEN_SIZE = 8;
export const MEMBERSHIP_CHIP_MAX_VISIBLE = 4;
export const MEMBERSHIP_CHIP_RADIUS = 11;
/** Larger chip used as the group centroid hub badge on the canvas. */
export const GROUP_HUB_BADGE_RADIUS = 18;

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

/** WCAG relative luminance (0 = black, 1 = white). */
export function relativeLuminance(color: RGB): number {
  const toLinear = (channel: number) => {
    const s = channel / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return (
    0.2126 * toLinear(color.r) +
    0.7152 * toLinear(color.g) +
    0.0722 * toLinear(color.b)
  );
}

/** Prefer dark ink when background luminance is above this (WCAG). */
export const LIGHT_BACKGROUND_LUMINANCE_THRESHOLD = 0.179;

export function isLightColor(color: RGB): boolean {
  return relativeLuminance(color) > LIGHT_BACKGROUND_LUMINANCE_THRESHOLD;
}

const CONTRASTING_INK_DARK: RGB = { r: 31, g: 31, b: 31 };
const CONTRASTING_INK_LIGHT: RGB = { r: 245, g: 245, b: 245 };

/** Near-black or near-white ink chosen for readable contrast on `background`. */
export function contrastingInk(background: RGB): RGB {
  return isLightColor(background)
    ? { ...CONTRASTING_INK_DARK }
    : { ...CONTRASTING_INK_LIGHT };
}

/** Standard source-over composite of `fg` at `alpha` onto opaque `bg`. */
export function blendRgbOver(fg: RGB, alpha: number, bg: RGB): RGB {
  const a = Math.min(1, Math.max(0, alpha));
  const inv = 1 - a;
  return {
    r: Math.round(fg.r * a + bg.r * inv),
    g: Math.round(fg.g * a + bg.g * inv),
    b: Math.round(fg.b * a + bg.b * inv),
  };
}
