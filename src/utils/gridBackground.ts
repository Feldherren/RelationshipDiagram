import type { Bounds, Viewport } from "../models/types";

export const DIAGRAM_GRID_SIZE = 40;
export const DIAGRAM_GRID_STROKE = "#e0e0e0";

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
