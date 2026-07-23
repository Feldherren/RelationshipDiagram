import {
  DEFAULT_DIAGRAM_FONT,
  formatFontForCanvas,
} from "./diagramFont";
import {
  MIN_FLOATING_TEXT_HEIGHT,
  MIN_FLOATING_TEXT_WIDTH,
} from "../models/types";

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

/** Line height multiplier used for floating-text layout and Konva rendering. */
export const FLOATING_TEXT_LINE_HEIGHT = 1.25;

/** Count visual lines after wrapping paragraphs to `maxTextWidth` (Konva `wrap="word"`). */
function countWrappedLines(
  paragraphs: string[],
  maxTextWidth: number,
  fontSize: number,
  fontFamily: string,
): number {
  let total = 0;
  for (const paragraph of paragraphs) {
    if (paragraph.length === 0) {
      total += 1;
      continue;
    }
    const words = paragraph.split(" ");
    let current = "";
    let lines = 0;
    for (const word of words) {
      const candidate = current.length > 0 ? `${current} ${word}` : word;
      if (
        measureLabelText(candidate, fontSize, "normal", fontFamily) <=
        maxTextWidth
      ) {
        current = candidate;
        continue;
      }
      if (current.length > 0) lines += 1;
      current = word;
    }
    if (current.length > 0 || words.length === 0) lines += 1;
    total += Math.max(1, lines);
  }
  return Math.max(1, total);
}

export function getFloatingTextSize(
  text: string,
  fontSize: number,
  fontFamily: string = DEFAULT_DIAGRAM_FONT,
  options?: { width?: number; height?: number },
): { width: number; height: number } {
  const { paddingX, paddingY } = getFloatingTextPadding(fontSize);
  const lines = text.length > 0 ? text.split("\n") : [""];
  const explicitWidth =
    typeof options?.width === "number" && Number.isFinite(options.width)
      ? Math.max(MIN_FLOATING_TEXT_WIDTH, Math.round(options.width))
      : undefined;
  const explicitHeight =
    typeof options?.height === "number" && Number.isFinite(options.height)
      ? Math.round(options.height)
      : undefined;

  if (explicitWidth != null) {
    const textWidth = Math.max(1, explicitWidth - paddingX * 2);
    const wrappedLineCount = countWrappedLines(
      lines,
      textWidth,
      fontSize,
      fontFamily,
    );
    const contentHeight =
      Math.ceil(fontSize * FLOATING_TEXT_LINE_HEIGHT * wrappedLineCount) +
      paddingY * 2;
    return {
      width: explicitWidth,
      // Once the user has resized, honour the stored height; otherwise fit content.
      height:
        explicitHeight != null
          ? Math.max(MIN_FLOATING_TEXT_HEIGHT, explicitHeight)
          : Math.max(MIN_FLOATING_TEXT_HEIGHT, contentHeight),
    };
  }

  let maxWidth = 0;
  for (const line of lines) {
    maxWidth = Math.max(
      maxWidth,
      measureLabelText(line, fontSize, "normal", fontFamily),
    );
  }
  const lineCount = Math.max(1, lines.length);
  const contentWidth = Math.ceil(maxWidth) + paddingX * 2;
  const contentHeight =
    Math.ceil(fontSize * FLOATING_TEXT_LINE_HEIGHT * lineCount) +
    paddingY * 2;
  return {
    width: contentWidth,
    height:
      explicitHeight != null
        ? Math.max(
            MIN_FLOATING_TEXT_HEIGHT,
            contentHeight,
            explicitHeight,
          )
        : contentHeight,
  };
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
