export interface ImageFocus {
  x: number;
  y: number;
}

export const DEFAULT_IMAGE_FOCUS: ImageFocus = { x: 0.5, y: 0 };

export function resolveImageFocus(focus?: ImageFocus): ImageFocus {
  return focus ?? DEFAULT_IMAGE_FOCUS;
}

export function getCoverImageExcess(
  image: HTMLImageElement,
  size: number,
): { excessX: number; excessY: number } {
  const containerSize = size * 2;
  const imgW = image.naturalWidth || image.width;
  const imgH = image.naturalHeight || image.height;
  if (imgW <= 0 || imgH <= 0) {
    return { excessX: 0, excessY: 0 };
  }
  const scale = Math.max(containerSize / imgW, containerSize / imgH);
  const width = imgW * scale;
  const height = imgH * scale;
  return {
    excessX: Math.max(0, width - containerSize),
    excessY: Math.max(0, height - containerSize),
  };
}

export function getCoverImageLayout(
  image: HTMLImageElement,
  size: number,
  focus: ImageFocus = DEFAULT_IMAGE_FOCUS,
): { x: number; y: number; width: number; height: number } {
  const containerSize = size * 2;
  const imgW = image.naturalWidth || image.width;
  const imgH = image.naturalHeight || image.height;
  if (imgW <= 0 || imgH <= 0) {
    return { x: -size, y: -size, width: containerSize, height: containerSize };
  }

  const scale = Math.max(containerSize / imgW, containerSize / imgH);
  const width = imgW * scale;
  const height = imgH * scale;
  const excessX = Math.max(0, width - containerSize);
  const excessY = Math.max(0, height - containerSize);
  const focusX = Math.min(1, Math.max(0, focus.x));
  const focusY = Math.min(1, Math.max(0, focus.y));

  return {
    x: -size - excessX * focusX,
    y: -size - excessY * focusY,
    width,
    height,
  };
}
