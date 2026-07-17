import { useTranslation } from "react-i18next";
import type { RGB } from "../../models/types";
import type {
  DiagramBackgroundColor,
  DiagramBackgroundMode,
} from "../../utils/diagramBackground";
import {
  backgroundModeUsesColour,
  backgroundModeUsesGridColour,
} from "../../utils/diagramBackground";
import { GRID_COLOR_PALETTE } from "../../utils/gridBackground";
import { BackgroundColorPicker } from "../pickers/BackgroundColorPicker";
import { RgbPicker } from "../pickers/RgbPicker";
import { BackgroundPatternPreview } from "./BackgroundPatternPreview";

interface BackgroundModeControlsProps {
  mode: DiagramBackgroundMode;
  backgroundColor: DiagramBackgroundColor;
  gridColor: RGB;
  onModeChange: (mode: DiagramBackgroundMode) => void;
  onBackgroundColorChange: (color: DiagramBackgroundColor) => void;
  onGridColorChange: (color: RGB) => void;
  colourLabel?: string;
  detailColourLabel?: string;
}

export function BackgroundModeControls({
  mode,
  backgroundColor,
  gridColor,
  onModeChange,
  onBackgroundColorChange,
  onGridColorChange,
  colourLabel,
  detailColourLabel,
}: BackgroundModeControlsProps) {
  const { t } = useTranslation();
  const showPrimaryColour = backgroundModeUsesColour(mode);
  const showGridColour = backgroundModeUsesGridColour(mode);
  const showPreview = showPrimaryColour || showGridColour || mode === "blank";

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
        </select>
      </label>

      {showPreview && (
        <div className="background-mode-editor">
          <BackgroundPatternPreview
            mode={mode}
            backgroundColor={backgroundColor}
            gridColor={gridColor}
          />
          {(showPrimaryColour || showGridColour) && (
            <div className="background-mode-pickers">
              {showPrimaryColour && (
                <BackgroundColorPicker
                  label={colourLabel ?? t("diagramProperties.backgroundColour")}
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
            </div>
          )}
        </div>
      )}
    </>
  );
}
