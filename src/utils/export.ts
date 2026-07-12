import type Konva from "konva";
import type { Bounds } from "../models/types";
import { computeDiagramBounds } from "./geometry";
import type { Diagram } from "../models/types";

export interface ExportOptions {
  bounds: Bounds;
  pixelRatio: number;
}

export function getAutoExportBounds(
  diagram: Diagram,
  padding = 32,
): Bounds | null {
  return computeDiagramBounds(diagram, padding);
}

export function exportStageToPng(
  stage: Konva.Stage,
  options: ExportOptions,
): string {
  const { bounds, pixelRatio } = options;
  return stage.toDataURL({
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    pixelRatio,
    mimeType: "image/png",
  });
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
