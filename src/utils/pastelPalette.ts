import type { RGB } from "../models/types";

/** Shared pastel swatches (red through violet); excludes white/black. */
export const PASTEL_COLORS: RGB[] = [
  { r: 248, g: 155, b: 155 },
  { r: 250, g: 197, b: 149 },
  { r: 245, g: 226, b: 145 },
  { r: 166, g: 222, b: 173 },
  { r: 150, g: 199, b: 246 },
  { r: 170, g: 176, b: 245 },
  { r: 207, g: 154, b: 245 },
];

export function randomPastelColor(): RGB {
  const index = Math.floor(Math.random() * PASTEL_COLORS.length);
  return { ...PASTEL_COLORS[index] };
}
