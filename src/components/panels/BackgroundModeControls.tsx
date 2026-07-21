import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { BackgroundImagePlacement, RGB } from "../../models/types";
import type {
  DiagramBackgroundColor,
  DiagramBackgroundMode,
} from "../../utils/diagramBackground";
import {
  BACKGROUND_IMAGE_MAX_FILE_BYTES,
  BACKGROUND_IMAGE_SCALE_MAX,
  BACKGROUND_IMAGE_SCALE_MIN,
  backgroundModeUsesColour,
  backgroundModeUsesGridColour,
  backgroundModeUsesImage,
  clampBackgroundImageScale,
} from "../../utils/diagramBackground";
import { GRID_COLOR_PALETTE } from "../../utils/gridBackground";
import { BackgroundColorPicker } from "../pickers/BackgroundColorPicker";
import { RgbPicker } from "../pickers/RgbPicker";
import { BackgroundPatternPreview } from "./BackgroundPatternPreview";

interface BackgroundModeControlsProps {
  mode: DiagramBackgroundMode;
  backgroundColor: DiagramBackgroundColor;
  gridColor: RGB;
  backgroundImageData?: string | null;
  backgroundImagePlacement?: BackgroundImagePlacement;
  backgroundImageScale?: number;
  onModeChange: (mode: DiagramBackgroundMode) => void;
  onBackgroundColorChange: (color: DiagramBackgroundColor) => void;
  onGridColorChange: (color: RGB) => void;
  onBackgroundImageDataChange?: (imageData: string | null) => void;
  onBackgroundImagePlacementChange?: (
    placement: BackgroundImagePlacement,
  ) => void;
  onBackgroundImageScaleChange?: (scale: number) => void;
  colourLabel?: string;
  detailColourLabel?: string;
}

export function BackgroundModeControls({
  mode,
  backgroundColor,
  gridColor,
  backgroundImageData = null,
  backgroundImagePlacement = "center",
  backgroundImageScale = 1,
  onModeChange,
  onBackgroundColorChange,
  onGridColorChange,
  onBackgroundImageDataChange,
  onBackgroundImagePlacementChange,
  onBackgroundImageScaleChange,
  colourLabel,
  detailColourLabel,
}: BackgroundModeControlsProps) {
  const { t } = useTranslation();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const showPrimaryColour = backgroundModeUsesColour(mode);
  const showGridColour = backgroundModeUsesGridColour(mode);
  const showImageControls = backgroundModeUsesImage(mode);
  const showPreview = showPrimaryColour || showGridColour || mode === "blank";
  const scalePercent = Math.round(
    clampBackgroundImageScale(backgroundImageScale) * 100,
  );

  const handleImageFile = (file: File | null) => {
    setImageError(null);
    if (!file) {
      onBackgroundImageDataChange?.(null);
      return;
    }
    if (file.size > BACKGROUND_IMAGE_MAX_FILE_BYTES) {
      setImageError(t("diagramProperties.backgroundImageTooLarge"));
      if (imageInputRef.current) imageInputRef.current.value = "";
      return;
    }
    if (!file.type.startsWith("image/")) {
      setImageError(t("diagramProperties.backgroundImageInvalid"));
      if (imageInputRef.current) imageInputRef.current.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        onBackgroundImageDataChange?.(result);
      }
    };
    reader.onerror = () => {
      setImageError(t("diagramProperties.backgroundImageInvalid"));
    };
    reader.readAsDataURL(file);
  };

  const handleClearImage = () => {
    setImageError(null);
    onBackgroundImageDataChange?.(null);
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  return (
    <>
      <label className="field">
        <span>{t("diagramProperties.background")}</span>
        <select
          value={mode}
          onChange={(e) =>
            onModeChange(e.target.value as DiagramBackgroundMode)
          }
        >
          <option value="plain">{t("diagramProperties.backgroundPlain")}</option>
          <option value="blank">{t("diagramProperties.backgroundBlank")}</option>
          <option value="grid">{t("diagramProperties.backgroundGrid")}</option>
          <option value="dots">{t("diagramProperties.backgroundDots")}</option>
          <option value="image">{t("diagramProperties.backgroundImage")}</option>
        </select>
      </label>

      {showPreview && (
        <div className="background-mode-editor">
          <BackgroundPatternPreview
            mode={mode}
            backgroundColor={backgroundColor}
            gridColor={gridColor}
            backgroundImageData={backgroundImageData}
            backgroundImagePlacement={backgroundImagePlacement}
            backgroundImageScale={backgroundImageScale}
          />
          <div className="background-mode-pickers">
            {showPrimaryColour && (
              <BackgroundColorPicker
                label={
                  showImageControls
                    ? t("diagramProperties.backgroundImageUnderlay")
                    : (colourLabel ?? t("diagramProperties.backgroundColour"))
                }
                value={backgroundColor}
                onChange={onBackgroundColorChange}
              />
            )}
            {showGridColour && (
              <RgbPicker
                label={
                  detailColourLabel ??
                  t("diagramAppearance.backgroundDetailColour")
                }
                value={gridColor}
                onChange={onGridColorChange}
                palette={GRID_COLOR_PALETTE}
              />
            )}
            {showImageControls && (
              <>
                <div className="field">
                  <span>{t("diagramProperties.backgroundImageFile")}</span>
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      handleImageFile(e.target.files?.[0] ?? null)
                    }
                  />
                  {backgroundImageData && (
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={handleClearImage}
                    >
                      {t("diagramProperties.backgroundImageClear")}
                    </button>
                  )}
                  {imageError && <p className="hint">{imageError}</p>}
                </div>
                <label className="field">
                  <span>{t("diagramProperties.backgroundImagePlacement")}</span>
                  <select
                    value={backgroundImagePlacement}
                    onChange={(e) =>
                      onBackgroundImagePlacementChange?.(
                        e.target.value as BackgroundImagePlacement,
                      )
                    }
                  >
                    <option value="center">
                      {t("diagramProperties.backgroundImageCenter")}
                    </option>
                    <option value="tile">
                      {t("diagramProperties.backgroundImageTile")}
                    </option>
                  </select>
                </label>
                <label className="field">
                  <span>
                    {t("diagramProperties.backgroundImageScale", {
                      percent: scalePercent,
                    })}
                  </span>
                  <input
                    type="range"
                    min={BACKGROUND_IMAGE_SCALE_MIN * 100}
                    max={BACKGROUND_IMAGE_SCALE_MAX * 100}
                    step={5}
                    value={scalePercent}
                    onChange={(e) =>
                      onBackgroundImageScaleChange?.(
                        Number(e.target.value) / 100,
                      )
                    }
                  />
                </label>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
