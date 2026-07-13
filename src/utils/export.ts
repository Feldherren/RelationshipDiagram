import type Konva from "konva";
import KonvaLib from "konva";
import type { Bounds, RGB } from "../models/types";
import { rgbToCss } from "../models/types";
import { computeDiagramBounds } from "./diagramBounds";
import type { Diagram } from "../models/types";
import { expandBounds, mergeBounds } from "./geometry";
import { resolveDiagramBackground } from "./diagramBackground";
import {
  DIAGRAM_SUBTITLE_FONT_SIZE,
  DIAGRAM_TITLE_FONT_SIZE,
  ensureFontLoaded,
} from "./diagramFont";
import { formatUiFontFamily } from "./systemFonts";
import {
  drawExportHeaderPills,
  layoutExportHeader,
  type ExportHeaderConfig,
} from "./exportHeader";

export const GRID_NODE_NAME = "diagram-grid";
export const EXPORT_BACKGROUND_NODE_NAME = "diagram-export-background";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Failed to load export image"));
    image.src = src;
  });
}

async function compositeExportHeader(
  stageDataUrl: string,
  crop: Bounds,
  pixelRatio: number,
  headerLayout: NonNullable<ReturnType<typeof layoutExportHeader>>,
  fontFamily: string,
): Promise<string> {
  const image = await loadImage(stageDataUrl);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(crop.width * pixelRatio));
  canvas.height = Math.max(1, Math.round(crop.height * pixelRatio));
  const ctx = canvas.getContext("2d");
  if (!ctx) return stageDataUrl;

  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  drawExportHeaderPills(ctx, headerLayout, fontFamily, crop, pixelRatio);
  return canvas.toDataURL("image/png");
}

export interface ExportOptions {
  bounds: Bounds;
  pixelRatio: number;
  backgroundColor?: RGB | null;
  header?: ExportHeaderConfig;
  viewportScale?: number;
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

export async function exportStageToPng(
  stage: Konva.Stage,
  options: ExportOptions,
): Promise<string> {
  const { bounds, pixelRatio, backgroundColor, header, viewportScale = 1 } =
    options;

  if (header?.showHeader) {
    await ensureFontLoaded(header.fontFamily);
    const formattedFamily = formatUiFontFamily(header.fontFamily);
    await Promise.all([
      document.fonts.load(
        `normal ${DIAGRAM_TITLE_FONT_SIZE}px ${formattedFamily}`,
      ),
      document.fonts.load(
        `normal ${DIAGRAM_SUBTITLE_FONT_SIZE}px ${formattedFamily}`,
      ),
    ]);
    await document.fonts.ready;
  }

  const resolvedBackground = resolveDiagramBackground(backgroundColor);
  const position = stage.position();
  const scale = { x: stage.scaleX(), y: stage.scaleY() };
  const crop = normalizeBounds(bounds);
  const layer = stage.getLayers()[0];
  const tempNodes: KonvaLib.Node[] = [];
  let backgroundRect: KonvaLib.Rect | null = null;
  const headerLayout =
    header && layer ? layoutExportHeader(crop, header, viewportScale) : null;

  stage.position({ x: 0, y: 0 });
  stage.scale({ x: 1, y: 1 });

  if (resolvedBackground !== null && layer) {
    backgroundRect = new KonvaLib.Rect({
      x: crop.x,
      y: crop.y,
      width: crop.width,
      height: crop.height,
      fill: rgbToCss(resolvedBackground),
      listening: false,
      name: EXPORT_BACKGROUND_NODE_NAME,
    });
    layer.add(backgroundRect);
    backgroundRect.moveToBottom();
    tempNodes.push(backgroundRect);
  }

  stage.batchDraw();

  let stageDataUrl: string;
  try {
    stageDataUrl = stage.toDataURL({
      x: crop.x,
      y: crop.y,
      width: crop.width,
      height: crop.height,
      pixelRatio,
      mimeType: "image/png",
    });
  } finally {
    for (const node of tempNodes) {
      node.destroy();
    }
    stage.position(position);
    stage.scale(scale);
    stage.batchDraw();
  }

  if (!headerLayout || !header) {
    return stageDataUrl;
  }

  return compositeExportHeader(
    stageDataUrl,
    crop,
    pixelRatio,
    headerLayout,
    header.fontFamily,
  );
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
