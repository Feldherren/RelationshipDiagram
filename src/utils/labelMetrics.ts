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
): { width: number; height: number } {
  const textWidth = measureLabelText(text, fontSize, fontStyle, fontFamily);
  return {
    width: Math.ceil(textWidth) + LABEL_PADDING_X * 2,
    height: fontSize + LABEL_PADDING_Y * 2,
  };
}

export function getPillLabelHeight(fontSize: number): number {
  return fontSize + LABEL_PADDING_Y * 2;
}
