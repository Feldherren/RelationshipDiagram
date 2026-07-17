import type { Bounds, Viewport } from "../models/types";

/** Same clamp as wheel zoom in usePanZoom. */
export const MIN_VIEWPORT_SCALE = 0.15;
export const MAX_VIEWPORT_SCALE = 4;

/**
 * Compute a viewport that centres and scales world-space bounds to fit the stage.
 * `bounds` should already include any desired padding (e.g. from computeDiagramBounds).
 */
export function computeViewportForBounds(
  bounds: Bounds,
  stageSize: { width: number; height: number },
): Viewport {
  const width = Math.max(1, bounds.width);
  const height = Math.max(1, bounds.height);
  const stageW = Math.max(1, stageSize.width);
  const stageH = Math.max(1, stageSize.height);

  const scale = Math.min(
    MAX_VIEWPORT_SCALE,
    Math.max(MIN_VIEWPORT_SCALE, Math.min(stageW / width, stageH / height)),
  );

  const contentCenterX = bounds.x + width / 2;
  const contentCenterY = bounds.y + height / 2;

  return {
    scale,
    x: stageW / 2 - contentCenterX * scale,
    y: stageH / 2 - contentCenterY * scale,
  };
}

/** World-space rectangle covered by a viewport for the given stage size. */
export function viewportToWorldBounds(
  viewport: Viewport,
  stageSize: { width: number; height: number },
): Bounds {
  const scale = Math.max(0.01, viewport.scale);
  return {
    x: (0 - viewport.x) / scale,
    y: (0 - viewport.y) / scale,
    width: Math.max(1, stageSize.width) / scale,
    height: Math.max(1, stageSize.height) / scale,
  };
}

/** Translate a viewport so its world content shifts by (dx, dy). */
export function translateViewport(
  viewport: Viewport,
  dx: number,
  dy: number,
): Viewport {
  return {
    ...viewport,
    x: viewport.x - dx * viewport.scale,
    y: viewport.y - dy * viewport.scale,
  };
}

/** Build a viewport centred on a world point at the given scale. */
export function viewportFromCenterAndScale(
  center: { x: number; y: number },
  scale: number,
  stageSize: { width: number; height: number },
): Viewport {
  const s = Math.min(
    MAX_VIEWPORT_SCALE,
    Math.max(MIN_VIEWPORT_SCALE, scale),
  );
  const stageW = Math.max(1, stageSize.width);
  const stageH = Math.max(1, stageSize.height);
  return {
    scale: s,
    x: stageW / 2 - center.x * s,
    y: stageH / 2 - center.y * s,
  };
}

/**
 * Aspect-locked resize around a fixed world centre.
 * Uses the pointer's offset from centre; size follows the stage aspect ratio.
 */
export function viewportFromCenterAndPointer(
  center: { x: number; y: number },
  pointer: { x: number; y: number },
  stageSize: { width: number; height: number },
): Viewport {
  const stageW = Math.max(1, stageSize.width);
  const stageH = Math.max(1, stageSize.height);
  const aspect = stageW / stageH;
  const dx = Math.abs(pointer.x - center.x);
  const dy = Math.abs(pointer.y - center.y);
  // Half-width that covers the pointer while matching stage aspect.
  const halfW = Math.max(dx, dy * aspect, 1);
  const worldW = halfW * 2;
  const scale = stageW / worldW;
  return viewportFromCenterAndScale(center, scale, stageSize);
}
