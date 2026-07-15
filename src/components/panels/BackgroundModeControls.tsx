import { useTranslation } from "react-i18next";
import type { DiagramBackgroundColor, DiagramBackgroundMode } from "../../utils/diagramBackground";
import { backgroundModeUsesColour } from "../../utils/diagramBackground";
import { BackgroundColorPicker } from "../pickers/BackgroundColorPicker";

interface BackgroundModeControlsProps {
  mode: DiagramBackgroundMode;
  backgroundColor: DiagramBackgroundColor;
  onModeChange: (mode: DiagramBackgroundMode) => void;
  onBackgroundColorChange: (color: DiagramBackgroundColor) => void;
  colourLabel?: string;
}

export function BackgroundModeControls({
  mode,
  backgroundColor,
  onModeChange,
  onBackgroundColorChange,
  colourLabel,
}: BackgroundModeControlsProps) {
  const { t } = useTranslation();

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

      {backgroundModeUsesColour(mode) && (
        <BackgroundColorPicker
          label={colourLabel ?? t("diagramProperties.backgroundColour")}
          value={backgroundColor}
          onChange={onBackgroundColorChange}
        />
      )}
    </>
  );
}
