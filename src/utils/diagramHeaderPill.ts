import {
  DIAGRAM_SUBTITLE_FONT_SIZE,
  DIAGRAM_TITLE_FONT_SIZE,
} from "./diagramFont";
import { formatUiFontFamily } from "./systemFonts";
import type { RGB } from "../models/types";
import { colorsEqual, rgbToCss } from "../models/types";

export const DIAGRAM_HEADER_PILL_PADDING_X = 16;
export const DIAGRAM_HEADER_PILL_PADDING_Y = 6;
export const DIAGRAM_HEADER_PILL_GAP = 6;

/** Matches export header text colours (#1f1f1f / #5c5c5c). */
export const DEFAULT_DIAGRAM_TITLE_COLOR: RGB = { r: 31, g: 31, b: 31 };
export const DEFAULT_DIAGRAM_SUBTITLE_COLOR: RGB = { r: 92, g: 92, b: 92 };

/** Fixed pill chrome — same as export, independent of UI theme. */
export const DIAGRAM_HEADER_PILL_FILL = "#ffffff";
export const DIAGRAM_HEADER_PILL_STROKE = "#c8c8c8";
export const DIAGRAM_HEADER_PILL_SHADOW = "rgba(0, 0, 0, 0.06)";

export type DiagramHeaderPillVariant = "title" | "subtitle";

function isRgb(value: unknown): value is RGB {
  if (!value || typeof value !== "object") return false;
  const color = value as RGB;
  return (
    typeof color.r === "number" &&
    typeof color.g === "number" &&
    typeof color.b === "number" &&
    [color.r, color.g, color.b].every(
      (channel) => Number.isFinite(channel) && channel >= 0 && channel <= 255,
    )
  );
}

export function resolveDiagramTitleColor(color: unknown): RGB {
  return isRgb(color)
    ? { r: color.r, g: color.g, b: color.b }
    : { ...DEFAULT_DIAGRAM_TITLE_COLOR };
}

export function resolveDiagramSubtitleColor(color: unknown): RGB {
  return isRgb(color)
    ? { r: color.r, g: color.g, b: color.b }
    : { ...DEFAULT_DIAGRAM_SUBTITLE_COLOR };
}

export function serializeDiagramTitleColor(color: RGB): RGB | undefined {
  return colorsEqual(color, DEFAULT_DIAGRAM_TITLE_COLOR)
    ? undefined
    : { ...color };
}

export function serializeDiagramSubtitleColor(color: RGB): RGB | undefined {
  return colorsEqual(color, DEFAULT_DIAGRAM_SUBTITLE_COLOR)
    ? undefined
    : { ...color };
}

export function getDiagramHeaderPillFontSize(
  variant: DiagramHeaderPillVariant,
  fontSize?: number,
): number {
  if (typeof fontSize === "number" && Number.isFinite(fontSize)) {
    return fontSize;
  }
  return variant === "title"
    ? DIAGRAM_TITLE_FONT_SIZE
    : DIAGRAM_SUBTITLE_FONT_SIZE;
}

export function getDiagramHeaderPillClassName(
  variant: DiagramHeaderPillVariant,
): string {
  return variant === "title" ? "diagram-title-pill" : "diagram-subtitle-pill";
}

export function getDiagramHeaderPillTextFill(color: RGB): string {
  return rgbToCss(color);
}

export function formatDiagramHeaderCanvasFont(
  fontSize: number,
  fontFamily: string,
): string {
  return `normal ${fontSize}px ${formatUiFontFamily(fontFamily)}`;
}

let canvasMeasureCtx: CanvasRenderingContext2D | null = null;

function getCanvasMeasureCtx(): CanvasRenderingContext2D {
  if (!canvasMeasureCtx) {
    const canvas = document.createElement("canvas");
    canvasMeasureCtx = canvas.getContext("2d")!;
  }
  return canvasMeasureCtx;
}

function measureCanvasTextWidth(
  text: string,
  fontSize: number,
  fontFamily: string,
): number {
  const ctx = getCanvasMeasureCtx();
  ctx.font = formatDiagramHeaderCanvasFont(fontSize, fontFamily);
  return ctx.measureText(text).width;
}

let measureRoot: HTMLDivElement | null = null;

function getMeasureRoot(): HTMLDivElement {
  if (!measureRoot) {
    measureRoot = document.createElement("div");
    measureRoot.style.cssText =
      "position:fixed;left:-10000px;top:0;visibility:hidden;pointer-events:none";
    document.body.appendChild(measureRoot);
  }
  return measureRoot;
}

export function measureDiagramHeaderPill(
  text: string,
  variant: DiagramHeaderPillVariant,
  fontFamily: string,
  fontSize?: number,
): { width: number; height: number } {
  const resolvedSize = getDiagramHeaderPillFontSize(variant, fontSize);
  const root = getMeasureRoot();
  root.replaceChildren();

  const pill = document.createElement("span");
  pill.className = getDiagramHeaderPillClassName(variant);
  pill.style.fontFamily = formatUiFontFamily(fontFamily);
  pill.style.fontSize = `${resolvedSize}px`;
  pill.textContent = text;
  root.appendChild(pill);

  const rect = pill.getBoundingClientRect();
  const canvasTextWidth = measureCanvasTextWidth(
    text,
    resolvedSize,
    fontFamily,
  );
  const canvasPillWidth =
    Math.ceil(canvasTextWidth) + DIAGRAM_HEADER_PILL_PADDING_X * 2;

  return {
    width: Math.max(Math.ceil(rect.width), canvasPillWidth),
    height: Math.ceil(rect.height),
  };
}
