import {
  DEFAULT_DIAGRAM_FONT,
  formatFontForCanvas,
} from "./diagramFont";

let measureCtx: CanvasRenderingContext2D | null = null;

function getMeasureCtx(): CanvasRenderingContext2D {
  if (!measureCtx) {
    const canvas = document.createElement("canvas");
    measureCtx = canvas.getContext("2d")!;
  }
  return measureCtx;
}

export const LABEL_PADDING_X = 10;
export const LABEL_PADDING_Y = 4;

export const CHARACTER_NAME_FONT_SIZE = 15;
export const CHARACTER_SUBTITLE_FONT_SIZE = 12;
export const CHARACTER_LABEL_PADDING_X = 12;
export const CHARACTER_LABEL_PADDING_Y = 5;
export const CHARACTER_LABEL_GAP = 4;

/** Padding around floating text for hit-testing and the selection outline. */
export function getFloatingTextPadding(fontSize: number): {
  paddingX: number;
  paddingY: number;
} {
  return {
    paddingX: Math.max(4, Math.round(fontSize * 0.2)),
    paddingY: Math.max(2, Math.round(fontSize * 0.15)),
  };
}

export function getFloatingTextSize(
  text: string,
  fontSize: number,
  fontFamily: string = DEFAULT_DIAGRAM_FONT,
): { width: number; height: number } {
  const { paddingX, paddingY } = getFloatingTextPadding(fontSize);
  return getPillLabelSize(text, fontSize, "normal", fontFamily, paddingX, paddingY);
}

export function measureLabelText(
  text: string,
  fontSize: number,
  fontStyle: "normal" | "bold" = "normal",
  fontFamily: string = DEFAULT_DIAGRAM_FONT,
): number {
  const ctx = getMeasureCtx();
  ctx.font = `${fontStyle === "bold" ? "bold " : ""}${fontSize}px ${formatFontForCanvas(fontFamily)}`;
  return ctx.measureText(text).width;
}

export function getPillLabelSize(
  text: string,
  fontSize: number,
  fontStyle: "normal" | "bold" = "normal",
  fontFamily: string = DEFAULT_DIAGRAM_FONT,
  paddingX: number = LABEL_PADDING_X,
  paddingY: number = LABEL_PADDING_Y,
): { width: number; height: number } {
  const textWidth = measureLabelText(text, fontSize, fontStyle, fontFamily);
  return {
    width: Math.ceil(textWidth) + paddingX * 2,
    height: fontSize + paddingY * 2,
  };
}

export function getPillLabelHeight(
  fontSize: number,
  paddingY: number = LABEL_PADDING_Y,
): number {
  return fontSize + paddingY * 2;
}
