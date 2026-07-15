import type { GridStyle, RGB } from "../models/types";
import { colorsEqual, rgbToCss, rgbToHex } from "../models/types";

export const DEFAULT_DIAGRAM_BACKGROUND: RGB = { r: 250, g: 251, b: 252 };

export type DiagramBackgroundColor = RGB | null;

/** Canvas background appearance: solid, transparent, or grid overlay variants. */
export type DiagramBackgroundMode = "plain" | "blank" | "grid" | "dots";

export const BACKGROUND_PRESETS: {
  id: string;
  color: DiagramBackgroundColor;
}[] = [
  { id: "offWhite", color: DEFAULT_DIAGRAM_BACKGROUND },
  { id: "paleRose", color: { r: 252, g: 239, b: 239 } },
  { id: "palePeach", color: { r: 253, g: 243, b: 232 } },
  { id: "paleCream", color: { r: 252, g: 250, b: 239 } },
  { id: "paleMint", color: { r: 238, g: 248, b: 240 } },
  { id: "paleSky", color: { r: 238, g: 245, b: 252 } },
  { id: "paleLavender", color: { r: 243, g: 238, b: 252 } },
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
  }
}

export function backgroundModeUsesColour(mode: DiagramBackgroundMode): boolean {
  return mode !== "blank";
}
