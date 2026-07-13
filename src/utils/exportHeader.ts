import type { Bounds, Diagram } from "../models/types";
import {
  DIAGRAM_HEADER_PILL_GAP,
  formatDiagramHeaderCanvasFont,
  getDiagramHeaderPillFontSize,
  getDiagramHeaderPillTextFill,
  measureDiagramHeaderPill,
  type DiagramHeaderPillVariant,
} from "./diagramHeaderPill";
import { collectContentObstacles } from "./diagramBounds";
import { boundsIntersect, expandBounds } from "./geometry";

export const EXPORT_TITLE_TOP_MARGIN = 12;
export const EXPORT_TITLE_PILL_GAP = DIAGRAM_HEADER_PILL_GAP;
const HEADER_CLEARANCE = 12;
const HEADER_SCAN_STEP = 8;
const HEADER_HORIZONTAL_STEP = 4;
const HEADER_EDGE_MARGIN = 12;

export interface ExportHeaderConfig {
  title: string;
  subtitle: string;
  showHeader: boolean;
  fontFamily: string;
  diagram: Diagram;
}

interface ExportHeaderPillLayout {
  text: string;
  centerY: number;
  variant: DiagramHeaderPillVariant;
  width: number;
  height: number;
}

export interface ExportHeaderLayout {
  centerX: number;
  pills: ExportHeaderPillLayout[];
}

function measureHeaderBlock(
  title: string,
  subtitle: string,
  fontFamily: string,
): {
  titleSize: { width: number; height: number } | null;
  subtitleSize: { width: number; height: number } | null;
  blockWidth: number;
  blockHeight: number;
} {
  const titleSize = title
    ? measureDiagramHeaderPill(title, "title", fontFamily)
    : null;
  const subtitleSize = subtitle
    ? measureDiagramHeaderPill(subtitle, "subtitle", fontFamily)
    : null;

  const blockWidth = Math.max(titleSize?.width ?? 0, subtitleSize?.width ?? 0);
  let blockHeight = 0;
  if (titleSize) blockHeight += titleSize.height;
  if (titleSize && subtitleSize) blockHeight += EXPORT_TITLE_PILL_GAP;
  if (subtitleSize) blockHeight += subtitleSize.height;

  return { titleSize, subtitleSize, blockWidth, blockHeight };
}

function getHeaderBlockBounds(
  centerX: number,
  blockTop: number,
  blockWidth: number,
  blockHeight: number,
): Bounds {
  return {
    x: centerX - blockWidth / 2,
    y: blockTop,
    width: blockWidth,
    height: blockHeight,
  };
}

function headerOverlapsContent(
  headerBounds: Bounds,
  obstacles: Bounds[],
): boolean {
  const paddedHeader = expandBounds(headerBounds, HEADER_CLEARANCE);
  return obstacles.some((obstacle) => boundsIntersect(paddedHeader, obstacle));
}

function headerFitsAt(
  centerX: number,
  blockTop: number,
  blockWidth: number,
  blockHeight: number,
  obstacles: Bounds[],
): boolean {
  return !headerOverlapsContent(
    getHeaderBlockBounds(centerX, blockTop, blockWidth, blockHeight),
    obstacles,
  );
}

function findHorizontalPlacement(
  cropBounds: Bounds,
  blockTop: number,
  blockWidth: number,
  blockHeight: number,
  obstacles: Bounds[],
): number | null {
  const minCenterX = cropBounds.x + HEADER_EDGE_MARGIN + blockWidth / 2;
  const maxCenterX =
    cropBounds.x + cropBounds.width - HEADER_EDGE_MARGIN - blockWidth / 2;
  if (minCenterX > maxCenterX) return null;

  const idealCenterX = cropBounds.x + cropBounds.width / 2;
  const preferredCenterX = Math.min(
    maxCenterX,
    Math.max(minCenterX, idealCenterX),
  );

  if (
    headerFitsAt(
      preferredCenterX,
      blockTop,
      blockWidth,
      blockHeight,
      obstacles,
    )
  ) {
    return preferredCenterX;
  }

  const maxLeftOffset = preferredCenterX - minCenterX;
  const maxRightOffset = maxCenterX - preferredCenterX;
  const maxOffset = Math.max(maxLeftOffset, maxRightOffset);

  for (
    let offset = HEADER_HORIZONTAL_STEP;
    offset <= maxOffset;
    offset += HEADER_HORIZONTAL_STEP
  ) {
    if (offset <= maxLeftOffset) {
      const left = preferredCenterX - offset;
      if (headerFitsAt(left, blockTop, blockWidth, blockHeight, obstacles)) {
        return left;
      }
    }
    if (offset <= maxRightOffset) {
      const right = preferredCenterX + offset;
      if (headerFitsAt(right, blockTop, blockWidth, blockHeight, obstacles)) {
        return right;
      }
    }
  }

  return null;
}

function findHeaderPlacement(
  cropBounds: Bounds,
  blockWidth: number,
  blockHeight: number,
  obstacles: Bounds[],
): { centerX: number; blockTop: number } {
  const maxTop = cropBounds.y + cropBounds.height - blockHeight;
  const defaultCenterX = cropBounds.x + cropBounds.width / 2;
  let blockTop = cropBounds.y + EXPORT_TITLE_TOP_MARGIN;

  while (blockTop <= maxTop) {
    const centerX = findHorizontalPlacement(
      cropBounds,
      blockTop,
      blockWidth,
      blockHeight,
      obstacles,
    );
    if (centerX !== null) {
      return { centerX, blockTop };
    }
    blockTop += HEADER_SCAN_STEP;
  }

  return {
    centerX: defaultCenterX,
    blockTop: cropBounds.y + EXPORT_TITLE_TOP_MARGIN,
  };
}

export function layoutExportHeader(
  cropBounds: Bounds,
  config: ExportHeaderConfig,
  viewportScale = 1,
): ExportHeaderLayout | null {
  if (!config.showHeader) return null;

  const title = config.title.trim();
  const subtitle = config.subtitle.trim();
  if (!title && !subtitle) return null;

  const { titleSize, subtitleSize, blockWidth, blockHeight } = measureHeaderBlock(
    title,
    subtitle,
    config.fontFamily,
  );
  if (blockWidth <= 0 || blockHeight <= 0) return null;

  const obstacles = collectContentObstacles(config.diagram, viewportScale);
  const { centerX, blockTop } = findHeaderPlacement(
    cropBounds,
    blockWidth,
    blockHeight,
    obstacles,
  );

  const pills: ExportHeaderPillLayout[] = [];
  let cursorY = blockTop;

  if (title && titleSize) {
    pills.push({
      text: title,
      centerY: cursorY + titleSize.height / 2,
      variant: "title",
      width: titleSize.width,
      height: titleSize.height,
    });
    cursorY += titleSize.height;
  }

  if (subtitle && subtitleSize) {
    if (title) cursorY += EXPORT_TITLE_PILL_GAP;
    pills.push({
      text: subtitle,
      centerY: cursorY + subtitleSize.height / 2,
      variant: "subtitle",
      width: subtitleSize.width,
      height: subtitleSize.height,
    });
  }

  return { centerX, pills };
}

export function drawExportHeaderPills(
  ctx: CanvasRenderingContext2D,
  layout: ExportHeaderLayout,
  fontFamily: string,
  crop: Bounds,
  pixelRatio: number,
): void {
  for (const pill of layout.pills) {
    const centerX = (layout.centerX - crop.x) * pixelRatio;
    const centerY = (pill.centerY - crop.y) * pixelRatio;
    const pillWidth = pill.width * pixelRatio;
    const pillHeight = pill.height * pixelRatio;
    const x = centerX - pillWidth / 2;
    const y = centerY - pillHeight / 2;
    const radius = pillHeight / 2;
    const fontSize = getDiagramHeaderPillFontSize(pill.variant) * pixelRatio;

    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.06)";
    ctx.shadowBlur = 4 * pixelRatio;
    ctx.shadowOffsetY = 1 * pixelRatio;

    ctx.beginPath();
    ctx.roundRect(x, y, pillWidth, pillHeight, radius);
    ctx.fillStyle = "#ffffff";
    ctx.fill();

    ctx.shadowColor = "transparent";
    ctx.strokeStyle = "#c8c8c8";
    ctx.lineWidth = Math.max(1, pixelRatio);
    ctx.stroke();

    ctx.font = formatDiagramHeaderCanvasFont(fontSize, fontFamily);
    ctx.fillStyle = getDiagramHeaderPillTextFill(pill.variant);
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    const metrics = ctx.measureText(pill.text);
    const ascent = metrics.actualBoundingBoxAscent ?? fontSize * 0.8;
    const descent = metrics.actualBoundingBoxDescent ?? fontSize * 0.2;
    const textY = centerY + (ascent - descent) / 2;
    ctx.fillText(pill.text, centerX, textY);
    ctx.restore();
  }
}
