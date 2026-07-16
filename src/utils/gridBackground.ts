import type { Bounds, GridStyle, RGB, Viewport } from "../models/types";
import { rgbToCss } from "../models/types";

export const DIAGRAM_GRID_SIZE = 40;
export const DEFAULT_DIAGRAM_GRID_COLOR: RGB = { r: 224, g: 224, b: 224 };
export const DIAGRAM_GRID_STROKE = rgbToCss(DEFAULT_DIAGRAM_GRID_COLOR);
export const DIAGRAM_GRID_DOT_RADIUS = 1.25;

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

interface GridDrawContext {
  beginPath(): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  arc(x: number, y: number, radius: number, startAngle: number, endAngle: number): void;
  fill(): void;
  stroke(): void;
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
  ctx.stroke();
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
  ctx.fill();
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
