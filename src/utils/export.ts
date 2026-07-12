import type Konva from "konva";
import type { Bounds } from "../models/types";
import { computeDiagramBounds } from "./diagramBounds";
import type { Diagram } from "../models/types";
import { expandBounds, mergeBounds } from "./geometry";

export const GRID_NODE_NAME = "diagram-grid";

export interface ExportOptions {
  bounds: Bounds;
  pixelRatio: number;
}

function normalizeBounds(bounds: Bounds): Bounds {
  const x = Math.floor(bounds.x);
  const y = Math.floor(bounds.y);
  const right = Math.ceil(bounds.x + bounds.width);
  const bottom = Math.ceil(bounds.y + bounds.height);
  return {
    x,
    y,
    width: Math.max(1, right - x),
    height: Math.max(1, bottom - y),
  };
}

export function getStageContentBounds(
  stage: Konva.Stage,
  padding = 32,
): Bounds | null {
  const layer = stage.getLayers()[0];
  if (!layer) return null;

  let result: Bounds | null = null;

  for (const child of layer.getChildren()) {
    if (child.name() === GRID_NODE_NAME || !child.visible()) continue;

    const rect = child.getClientRect({
      relativeTo: layer,
      skipShadow: false,
    });
    if (rect.width <= 0 || rect.height <= 0) continue;

    const bounds: Bounds = {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
    };
    result = result ? mergeBounds(result, bounds) : bounds;
  }

  if (!result) return null;
  return expandBounds(normalizeBounds(result), padding);
}

export function getAutoExportBounds(
  diagram: Diagram,
  padding = 32,
  viewportScale = 1,
  stage?: Konva.Stage | null,
): Bounds | null {
  if (stage) {
    stage.batchDraw();
    const stageBounds = getStageContentBounds(stage, padding);
    if (stageBounds) return stageBounds;
  }

  return computeDiagramBounds(diagram, padding, viewportScale);
}

export function exportStageToPng(
  stage: Konva.Stage,
  options: ExportOptions,
): string {
  const { bounds, pixelRatio } = options;
  const position = stage.position();
  const scale = { x: stage.scaleX(), y: stage.scaleY() };
  const crop = normalizeBounds(bounds);

  stage.position({ x: 0, y: 0 });
  stage.scale({ x: 1, y: 1 });
  stage.batchDraw();

  try {
    return stage.toDataURL({
      x: crop.x,
      y: crop.y,
      width: crop.width,
      height: crop.height,
      pixelRatio,
      mimeType: "image/png",
    });
  } finally {
    stage.position(position);
    stage.scale(scale);
    stage.batchDraw();
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
