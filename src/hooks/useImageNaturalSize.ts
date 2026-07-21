import { useEffect, useState } from "react";
import type { BackgroundImageNaturalSize } from "../utils/backgroundImageStyle";

/** Resolve natural pixel size for a wallpaper data URL (or other image src). */
export function useImageNaturalSize(
  src: string | null | undefined,
): BackgroundImageNaturalSize | null {
  const [size, setSize] = useState<BackgroundImageNaturalSize | null>(null);

  useEffect(() => {
    if (!src) {
      setSize(null);
      return;
    }

    let cancelled = false;
    const image = new Image();
    image.onload = () => {
      if (cancelled) return;
      setSize({
        width: image.naturalWidth,
        height: image.naturalHeight,
      });
    };
    image.onerror = () => {
      if (!cancelled) setSize(null);
    };
    image.src = src;

    return () => {
      cancelled = true;
    };
  }, [src]);

  return size;
}
