import type { CSSProperties } from "react";
import type { BackgroundImagePlacement, Point } from "../models/types";
import {
  clampBackgroundImageScale,
  DEFAULT_BACKGROUND_IMAGE_OFFSET,
  DEFAULT_BACKGROUND_IMAGE_PLACEMENT,
  DEFAULT_BACKGROUND_IMAGE_SCALE,
} from "./diagramBackground";

export interface BackgroundImagePaintOptions {
  imageData: string | null | undefined;
  placement?: BackgroundImagePlacement;
  scale?: number;
  /** World-space anchor (centre or tile origin). */
  offset?: Point | null;
}

export interface BackgroundImageNaturalSize {
  width: number;
  height: number;
}

export interface BackgroundImageViewport {
  x: number;
  y: number;
  scale: number;
}

function resolveImageScale(scale: number | undefined): number {
  return clampBackgroundImageScale(scale ?? DEFAULT_BACKGROUND_IMAGE_SCALE);
}

function resolvePlacement(
  placement: BackgroundImagePlacement | undefined,
): BackgroundImagePlacement {
  return placement ?? DEFAULT_BACKGROUND_IMAGE_PLACEMENT;
}

function resolveOffset(offset: Point | null | undefined): Point {
  if (
    offset &&
    Number.isFinite(offset.x) &&
    Number.isFinite(offset.y)
  ) {
    return { x: offset.x, y: offset.y };
  }
  return { ...DEFAULT_BACKGROUND_IMAGE_OFFSET };
}

/**
 * CSS wallpaper locked to diagram world space (same pan/zoom as the stage).
 * Centre places the image around `offset`; tile aligns a tile corner to `offset`.
 */
export function buildBackgroundImageCssStyle(
  options: BackgroundImagePaintOptions & {
    naturalSize?: BackgroundImageNaturalSize | null;
    /** When set, size/position track the live viewport transform. */
    viewport?: BackgroundImageViewport | null;
    /** Preview swatch: centre in the box without world anchoring. */
    previewCentered?: boolean;
  },
): CSSProperties {
  const { imageData, naturalSize } = options;
  if (!imageData) return {};

  const placement = resolvePlacement(options.placement);
  const imageScale = resolveImageScale(options.scale);
  const offset = resolveOffset(options.offset);
  const viewport = options.viewport;

  if (!naturalSize || naturalSize.width <= 0 || naturalSize.height <= 0) {
    return {
      backgroundImage: `url("${imageData}")`,
      backgroundRepeat: placement === "tile" ? "repeat" : "no-repeat",
      backgroundPosition: "center",
    };
  }

  if (!viewport || options.previewCentered) {
    const w = naturalSize.width * imageScale;
    const h = naturalSize.height * imageScale;
    return {
      backgroundImage: `url("${imageData}")`,
      backgroundRepeat: placement === "tile" ? "repeat" : "no-repeat",
      backgroundPosition: "center",
      backgroundSize: `${w}px ${h}px`,
    };
  }

  const viewScale =
    Number.isFinite(viewport.scale) && viewport.scale > 0 ? viewport.scale : 1;
  const tileW = naturalSize.width * imageScale;
  const tileH = naturalSize.height * imageScale;
  const screenW = tileW * viewScale;
  const screenH = tileH * viewScale;

  // screen = world * scale + viewport.{x,y}
  const posX =
    placement === "center"
      ? viewport.x + (offset.x - tileW / 2) * viewScale
      : viewport.x + offset.x * viewScale;
  const posY =
    placement === "center"
      ? viewport.y + (offset.y - tileH / 2) * viewScale
      : viewport.y + offset.y * viewScale;

  return {
    backgroundImage: `url("${imageData}")`,
    backgroundRepeat: placement === "tile" ? "repeat" : "no-repeat",
    backgroundPosition: `${posX}px ${posY}px`,
    backgroundSize: `${screenW}px ${screenH}px`,
  };
}

export function loadHtmlImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Failed to load background image"));
    image.src = src;
  });
}

function drawTileClipped(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  tileX: number,
  tileY: number,
  tileW: number,
  tileH: number,
  clip: { x: number; y: number; width: number; height: number },
): void {
  const clipLeft = clip.x;
  const clipTop = clip.y;
  const clipRight = clip.x + clip.width;
  const clipBottom = clip.y + clip.height;

  const left = Math.max(tileX, clipLeft);
  const top = Math.max(tileY, clipTop);
  const right = Math.min(tileX + tileW, clipRight);
  const bottom = Math.min(tileY + tileH, clipBottom);
  if (right <= left || bottom <= top) return;

  const outW = right - left;
  const outH = bottom - top;
  const u0 = ((left - tileX) / tileW) * image.naturalWidth;
  const v0 = ((top - tileY) / tileH) * image.naturalHeight;
  const u1 = (outW / tileW) * image.naturalWidth;
  const v1 = (outH / tileH) * image.naturalHeight;

  ctx.drawImage(image, u0, v0, u1, v1, left, top, outW, outH);
}

/**
 * Paint wallpaper into a rectangle.
 * When `worldOrigin` is set, placement is anchored in diagram world space
 * (local point (bounds.x, bounds.y) maps to that world point).
 */
export function paintBackgroundImage(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  bounds: { x: number; y: number; width: number; height: number },
  placement: BackgroundImagePlacement = DEFAULT_BACKGROUND_IMAGE_PLACEMENT,
  scale: number = DEFAULT_BACKGROUND_IMAGE_SCALE,
  worldOrigin?: { x: number; y: number },
  offset: Point = DEFAULT_BACKGROUND_IMAGE_OFFSET,
): void {
  const clamped = resolveImageScale(scale);
  const tileW = Math.max(1, image.naturalWidth * clamped);
  const tileH = Math.max(1, image.naturalHeight * clamped);
  const anchor = resolveOffset(offset);

  if (placement === "center") {
    const worldX = anchor.x - tileW / 2;
    const worldY = anchor.y - tileH / 2;
    const localX = worldOrigin
      ? bounds.x + worldX - worldOrigin.x
      : bounds.x + (bounds.width - tileW) / 2 + anchor.x;
    const localY = worldOrigin
      ? bounds.y + worldY - worldOrigin.y
      : bounds.y + (bounds.height - tileH) / 2 + anchor.y;
    drawTileClipped(ctx, image, localX, localY, tileW, tileH, bounds);
    return;
  }

  // Tile mode: grid origin at `anchor` in world space.
  const origin = worldOrigin ?? { x: bounds.x, y: bounds.y };
  const startCol = Math.floor((origin.x - anchor.x) / tileW);
  const startRow = Math.floor((origin.y - anchor.y) / tileH);
  const endCol = Math.ceil((origin.x + bounds.width - anchor.x) / tileW);
  const endRow = Math.ceil((origin.y + bounds.height - anchor.y) / tileH);

  for (let row = startRow; row < endRow; row += 1) {
    for (let col = startCol; col < endCol; col += 1) {
      const worldX = anchor.x + col * tileW;
      const worldY = anchor.y + row * tileH;
      const localX = bounds.x + worldX - origin.x;
      const localY = bounds.y + worldY - origin.y;
      drawTileClipped(ctx, image, localX, localY, tileW, tileH, bounds);
    }
  }
}

/** Rasterize wallpaper into an offscreen canvas matching the fill size. */
export async function createBackgroundImageCanvas(
  width: number,
  height: number,
  options: BackgroundImagePaintOptions & {
    /** World-space top-left of this canvas (export crop origin). */
    worldOrigin?: { x: number; y: number };
  },
): Promise<HTMLCanvasElement | null> {
  if (!options.imageData || width <= 0 || height <= 0) return null;
  const image = await loadHtmlImage(options.imageData);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  paintBackgroundImage(
    ctx,
    image,
    { x: 0, y: 0, width: canvas.width, height: canvas.height },
    resolvePlacement(options.placement),
    resolveImageScale(options.scale),
    options.worldOrigin,
    resolveOffset(options.offset),
  );
  return canvas;
}

const WALLPAPER_STYLE_KEYS = [
  "backgroundImage",
  "backgroundRepeat",
  "backgroundPosition",
  "backgroundSize",
] as const;

/** Apply wallpaper CSS onto a DOM node (imperative pan/zoom path). */
export function applyWallpaperCssToElement(
  el: HTMLElement,
  css: CSSProperties,
): void {
  for (const key of WALLPAPER_STYLE_KEYS) {
    const value = css[key];
    if (value != null) {
      el.style[key] = String(value);
    }
  }
}

/** Clear wallpaper-related inline styles. */
export function clearWallpaperCssOnElement(el: HTMLElement): void {
  for (const key of WALLPAPER_STYLE_KEYS) {
    el.style[key] = "";
  }
}
