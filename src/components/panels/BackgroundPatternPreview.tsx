import { useTranslation } from "react-i18next";
import type { CSSProperties } from "react";
import type { BackgroundImagePlacement, RGB } from "../../models/types";
import { rgbToCss } from "../../models/types";
import {
  DEFAULT_DIAGRAM_BACKGROUND,
  type DiagramBackgroundColor,
  type DiagramBackgroundMode,
} from "../../utils/diagramBackground";
import { buildBackgroundImageCssStyle } from "../../utils/backgroundImageStyle";
import { useImageNaturalSize } from "../../hooks/useImageNaturalSize";

const PREVIEW_GRID_STEP = 10;

interface BackgroundPatternPreviewProps {
  mode: DiagramBackgroundMode;
  backgroundColor: DiagramBackgroundColor;
  gridColor: RGB;
  backgroundImageData?: string | null;
  backgroundImagePlacement?: BackgroundImagePlacement;
  backgroundImageScale?: number;
}

export function BackgroundPatternPreview({
  mode,
  backgroundColor,
  gridColor,
  backgroundImageData = null,
  backgroundImagePlacement = "center",
  backgroundImageScale = 1,
}: BackgroundPatternPreviewProps) {
  const { t } = useTranslation();
  const fill =
    backgroundColor === null
      ? undefined
      : rgbToCss(backgroundColor ?? DEFAULT_DIAGRAM_BACKGROUND);
  const grid = rgbToCss(gridColor);
  const wallpaperSize = useImageNaturalSize(
    mode === "image" ? backgroundImageData : null,
  );

  let className = "background-pattern-preview";
  const style: CSSProperties = {};

  if (mode === "blank") {
    className += " background-pattern-preview-blank";
  } else if (fill) {
    style.backgroundColor = fill;
  }

  if (mode === "grid") {
    style.backgroundImage = `
      linear-gradient(${grid} 1px, transparent 1px),
      linear-gradient(90deg, ${grid} 1px, transparent 1px)
    `;
    style.backgroundSize = `${PREVIEW_GRID_STEP}px ${PREVIEW_GRID_STEP}px`;
  } else if (mode === "dots") {
    style.backgroundImage = `radial-gradient(circle, ${grid} 1.25px, transparent 1.25px)`;
    style.backgroundSize = `${PREVIEW_GRID_STEP}px ${PREVIEW_GRID_STEP}px`;
  } else if (mode === "image" && backgroundImageData) {
    Object.assign(
      style,
      buildBackgroundImageCssStyle({
        imageData: backgroundImageData,
        placement: backgroundImagePlacement,
        scale: backgroundImageScale,
        naturalSize: wallpaperSize,
        previewCentered: true,
      }),
    );
  }

  return (
    <div
      className={className}
      style={style}
      aria-label={t("diagramAppearance.previewBackgroundAria")}
      role="img"
    />
  );
}
