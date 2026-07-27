/**
 * External-link icon (Tabler-style, 24×24 viewBox).
 * Stroke-based: open box corner, diagonal shaft, arrowhead corner.
 */
export const EXTERNAL_LINK_PATHS = [
  "M12 6h-6a2 2 0 0 0 -2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-6",
  "M11 13l9 -9",
  "M15 4h5v5",
] as const;

/** Map native coords into chip unit space (±~0.75). */
export const EXTERNAL_LINK_LAYOUT = {
  centerX: 12,
  centerY: 12,
  unitScale: 0.065,
} as const;
