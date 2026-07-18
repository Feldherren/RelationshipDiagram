import type { BackgroundImagePlacement, GridStyle, RGB } from "../models/types";
import { colorsEqual, rgbToCss, rgbToHex } from "../models/types";

export const DEFAULT_DIAGRAM_BACKGROUND: RGB = { r: 250, g: 251, b: 252 };

export type DiagramBackgroundColor = RGB | null;

/** Canvas background appearance: solid, transparent, grid overlay, or image. */
export type DiagramBackgroundMode =
  | "plain"
  | "blank"
  | "grid"
  | "dots"
  | "image";

export const DEFAULT_BACKGROUND_IMAGE_PLACEMENT: BackgroundImagePlacement =
  "center";
export const DEFAULT_BACKGROUND_IMAGE_SCALE = 1;
export const BACKGROUND_IMAGE_SCALE_MIN = 0.1;
export const BACKGROUND_IMAGE_SCALE_MAX = 4;
/** Soft cap for wallpaper uploads (protects theme localStorage quota). */
export const BACKGROUND_IMAGE_MAX_FILE_BYTES = Math.floor(1.5 * 1024 * 1024);

/** Canvas fill presets — paler analogues of GRID_COLOR_PALETTE, plus transparent. */
export const BACKGROUND_PRESETS: {
  id: string;
  color: DiagramBackgroundColor;
}[] = [
  { id: "white", color: { r: 255, g: 255, b: 255 } },
  { id: "offWhite", color: DEFAULT_DIAGRAM_BACKGROUND },
  { id: "paleGrey", color: { r: 239, g: 239, b: 241 } },
  { id: "paleRose", color: { r: 252, g: 239, b: 239 } },
  { id: "palePeach", color: { r: 253, g: 243, b: 232 } },
  { id: "paleCream", color: { r: 252, g: 250, b: 239 } },
  { id: "paleMint", color: { r: 238, g: 248, b: 240 } },
  { id: "paleSky", color: { r: 238, g: 245, b: 252 } },
  { id: "paleIndigo", color: { r: 244, g: 245, b: 254 } },
  { id: "paleViolet", color: { r: 249, g: 242, b: 254 } },
  { id: "transparent", color: null },
];

export function resolveDiagramBackground(
  color: DiagramBackgroundColor | undefined,
): DiagramBackgroundColor {
  if (color === null) return null;
  if (color === undefined) return DEFAULT_DIAGRAM_BACKGROUND;
  return color;
}

export function serializeDiagramBackground(
  color: DiagramBackgroundColor,
): DiagramBackgroundColor | undefined {
  if (color === null) return null;
  if (colorsEqual(color, DEFAULT_DIAGRAM_BACKGROUND)) return undefined;
  return color;
}

export function findBackgroundPreset(color: DiagramBackgroundColor) {
  return BACKGROUND_PRESETS.find((entry) => {
    if (entry.color === null) return color === null;
    if (color === null) return false;
    return colorsEqual(entry.color, color);
  });
}

export function backgroundColorForDisplay(
  color: DiagramBackgroundColor,
): string | null {
  if (color === null) return null;
  return rgbToCss(color);
}

export function backgroundColorForPicker(color: DiagramBackgroundColor): RGB {
  return color ?? DEFAULT_DIAGRAM_BACKGROUND;
}

export function backgroundHexForPicker(color: DiagramBackgroundColor): string {
  return rgbToHex(backgroundColorForPicker(color));
}

export function getDiagramBackgroundMode(
  showGrid: boolean,
  gridStyle: GridStyle,
  backgroundColor: DiagramBackgroundColor,
): DiagramBackgroundMode {
  if (showGrid && gridStyle === "dots") return "dots";
  if (showGrid) return "grid";
  if (backgroundColor === null) return "blank";
  return "plain";
}

/**
 * Prefer an explicit image mode from appearance; otherwise derive from canvas flags.
 */
export function syncBackgroundModeFromCanvasState(
  preferredMode: DiagramBackgroundMode,
  showGrid: boolean,
  gridStyle: GridStyle,
  backgroundColor: DiagramBackgroundColor,
): DiagramBackgroundMode {
  if (preferredMode === "image") return "image";
  return getDiagramBackgroundMode(showGrid, gridStyle, backgroundColor);
}

export function applyDiagramBackgroundMode(
  mode: DiagramBackgroundMode,
  currentBackground: DiagramBackgroundColor,
): {
  showGrid: boolean;
  gridStyle: GridStyle;
  backgroundColor: DiagramBackgroundColor;
} {
  switch (mode) {
    case "blank":
      return { showGrid: false, gridStyle: "lines", backgroundColor: null };
    case "plain":
      return {
        showGrid: false,
        gridStyle: "lines",
        backgroundColor: currentBackground ?? DEFAULT_DIAGRAM_BACKGROUND,
      };
    case "grid":
      return {
        showGrid: true,
        gridStyle: "lines",
        backgroundColor: currentBackground ?? DEFAULT_DIAGRAM_BACKGROUND,
      };
    case "dots":
      return {
        showGrid: true,
        gridStyle: "dots",
        backgroundColor: currentBackground ?? DEFAULT_DIAGRAM_BACKGROUND,
      };
    case "image":
      return {
        showGrid: false,
        gridStyle: "lines",
        backgroundColor: currentBackground ?? DEFAULT_DIAGRAM_BACKGROUND,
      };
  }
}

export function backgroundModeUsesColour(mode: DiagramBackgroundMode): boolean {
  return mode !== "blank";
}

export function backgroundModeUsesGridColour(
  mode: DiagramBackgroundMode,
): boolean {
  return mode === "grid" || mode === "dots";
}

export function backgroundModeUsesImage(mode: DiagramBackgroundMode): boolean {
  return mode === "image";
}

export function clampBackgroundImageScale(scale: number): number {
  if (!Number.isFinite(scale)) return DEFAULT_BACKGROUND_IMAGE_SCALE;
  return Math.min(
    BACKGROUND_IMAGE_SCALE_MAX,
    Math.max(BACKGROUND_IMAGE_SCALE_MIN, scale),
  );
}

export function isBackgroundImagePlacement(
  value: unknown,
): value is BackgroundImagePlacement {
  return value === "tile" || value === "center";
}
