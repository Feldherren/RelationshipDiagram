import type { RGB } from "../models/types";
import { colorsEqual, rgbToCss, rgbToHex } from "../models/types";

export const DEFAULT_DIAGRAM_BACKGROUND: RGB = { r: 250, g: 251, b: 252 };

export type DiagramBackgroundColor = RGB | null;

export const BACKGROUND_PRESETS: {
  label: string;
  color: DiagramBackgroundColor;
}[] = [
  { label: "Off-white", color: DEFAULT_DIAGRAM_BACKGROUND },
  { label: "Pale rose", color: { r: 252, g: 239, b: 239 } },
  { label: "Pale peach", color: { r: 253, g: 243, b: 232 } },
  { label: "Pale cream", color: { r: 252, g: 250, b: 239 } },
  { label: "Pale mint", color: { r: 238, g: 248, b: 240 } },
  { label: "Pale sky", color: { r: 238, g: 245, b: 252 } },
  { label: "Pale lavender", color: { r: 243, g: 238, b: 252 } },
  { label: "Transparent", color: null },
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
