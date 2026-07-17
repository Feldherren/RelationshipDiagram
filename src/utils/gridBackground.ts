import type { Bounds, GridStyle, RGB, Viewport } from "../models/types";
import { rgbToCss } from "../models/types";

export const DIAGRAM_GRID_SIZE = 40;
export const DEFAULT_DIAGRAM_GRID_COLOR: RGB = { r: 224, g: 224, b: 224 };
export const DIAGRAM_GRID_STROKE = rgbToCss(DEFAULT_DIAGRAM_GRID_COLOR);
export const DIAGRAM_GRID_DOT_RADIUS = 1.25;

/** Lighter swatches for grid/dot detail colour — paired with BACKGROUND_PRESETS hues. */
export const GRID_COLOR_PALETTE: { id: string; color: RGB }[] = [
  { id: "white", color: { r: 255, g: 255, b: 255 } },
  { id: "lightGrey", color: { ...DEFAULT_DIAGRAM_GRID_COLOR } },
  { id: "softGrey", color: { r: 192, g: 192, b: 192 } },
  { id: "lightRed", color: { r: 252, g: 210, b: 210 } },
  { id: "lightOrange", color: { r: 253, g: 229, b: 207 } },
  { id: "lightYellow", color: { r: 251, g: 242, b: 205 } },
  { id: "lightGreen", color: { r: 215, g: 241, b: 219 } },
  { id: "lightBlue", color: { r: 208, g: 230, b: 251 } },
  { id: "lightIndigo", color: { r: 217, g: 220, b: 251 } },
  { id: "lightViolet", color: { r: 234, g: 210, b: 251 } },
];

export function computeGridLineBounds(
  region: Bounds,
  gridSize = DIAGRAM_GRID_SIZE,
): { startX: number; endX: number; startY: number; endY: number } {
  const startX = Math.floor(region.x / gridSize) * gridSize;
  const endX = Math.ceil((region.x + region.width) / gridSize) * gridSize;
  const startY = Math.floor(region.y / gridSize) * gridSize;
  const endY = Math.ceil((region.y + region.height) / gridSize) * gridSize;
  return { startX, endX, startY, endY };
}

export function computeViewportGridLineBounds(
  viewport: Viewport,
  stageWidth: number,
  stageHeight: number,
  gridSize = DIAGRAM_GRID_SIZE,
): { startX: number; endX: number; startY: number; endY: number } {
  const startX =
    Math.floor(-viewport.x / viewport.scale / gridSize) * gridSize;
  const endX =
    startX +
    Math.ceil(stageWidth / viewport.scale / gridSize + 2) * gridSize;
  const startY =
    Math.floor(-viewport.y / viewport.scale / gridSize) * gridSize;
  const endY =
    startY +
    Math.ceil(stageHeight / viewport.scale / gridSize + 2) * gridSize;
  return { startX, endX, startY, endY };
}

/** Path-building only — callers apply stroke/fill via Konva shape styles. */
interface GridDrawContext {
  beginPath(): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  arc(x: number, y: number, radius: number, startAngle: number, endAngle: number): void;
}

export function drawGridLines(
  ctx: GridDrawContext,
  bounds: { startX: number; endX: number; startY: number; endY: number },
  gridSize = DIAGRAM_GRID_SIZE,
): void {
  const { startX, endX, startY, endY } = bounds;
  ctx.beginPath();
  for (let x = startX; x <= endX; x += gridSize) {
    ctx.moveTo(x, startY);
    ctx.lineTo(x, endY);
  }
  for (let y = startY; y <= endY; y += gridSize) {
    ctx.moveTo(startX, y);
    ctx.lineTo(endX, y);
  }
}

export function drawGridDots(
  ctx: GridDrawContext,
  bounds: { startX: number; endX: number; startY: number; endY: number },
  gridSize = DIAGRAM_GRID_SIZE,
  dotRadius = DIAGRAM_GRID_DOT_RADIUS,
): void {
  const { startX, endX, startY, endY } = bounds;
  ctx.beginPath();
  for (let x = startX; x <= endX; x += gridSize) {
    for (let y = startY; y <= endY; y += gridSize) {
      ctx.moveTo(x + dotRadius, y);
      ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
    }
  }
}

export function drawGrid(
  ctx: GridDrawContext,
  bounds: { startX: number; endX: number; startY: number; endY: number },
  gridStyle: GridStyle,
  gridSize = DIAGRAM_GRID_SIZE,
): void {
  if (gridStyle === "dots") {
    drawGridDots(ctx, bounds, gridSize);
  } else {
    drawGridLines(ctx, bounds, gridSize);
  }
}
