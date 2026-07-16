import { useTranslation } from "react-i18next";
import type { DiagramAppearance, LabelChrome, RGB } from "../../models/types";
import {
  applyDiagramBackgroundMode,
  type DiagramBackgroundMode,
} from "../../utils/diagramBackground";
import { RgbPicker } from "../pickers/RgbPicker";
import { BackgroundModeControls } from "./BackgroundModeControls";
import { FontPicker } from "./FontPicker";

interface CanvasSetupProps {
  backgroundMode: DiagramBackgroundMode;
  backgroundColor: RGB | null;
  showHeader: boolean;
  diagramFont: string;
  onBackgroundModeChange: (mode: DiagramBackgroundMode) => void;
  onBackgroundColorChange: (color: RGB | null) => void;
  onShowHeaderChange: (show: boolean) => void;
  onDiagramFontChange: (fontFamily: string) => void;
}

interface DiagramAppearancePanelProps {
  value: DiagramAppearance;
  onChange: (patch: Partial<DiagramAppearance>) => void;
  /** When set, shows background / header / font defaults above colour groups. */
  canvasSetup?: CanvasSetupProps;
}

function LabelChromeEditors({
  labelPrefix,
  chrome,
  onChange,
}: {
  labelPrefix: string;
  chrome: LabelChrome;
  onChange: (patch: Partial<LabelChrome>) => void;
}) {
  const { t } = useTranslation();
  return (
    <>
      <RgbPicker
        label={t(`${labelPrefix}Text`)}
        value={chrome.textColor}
        onChange={(textColor) => onChange({ textColor })}
      />
      <RgbPicker
        label={t(`${labelPrefix}Background`)}
        value={chrome.backgroundColor}
        onChange={(backgroundColor) => onChange({ backgroundColor })}
      />
      <RgbPicker
        label={t(`${labelPrefix}Border`)}
        value={chrome.borderColor}
        onChange={(borderColor) => onChange({ borderColor })}
      />
    </>
  );
}

export function DiagramAppearancePanel({
  value,
  onChange,
  canvasSetup,
}: DiagramAppearancePanelProps) {
  const { t } = useTranslation();

  return (
    <div className="diagram-appearance-panel">
      {canvasSetup && (
        <>
          <p className="hint">{t("diagramAppearance.canvasSetupHint")}</p>

          <BackgroundModeControls
            mode={canvasSetup.backgroundMode}
            backgroundColor={canvasSetup.backgroundColor}
            onModeChange={(mode) => {
              const background = applyDiagramBackgroundMode(
                mode,
                canvasSetup.backgroundColor,
              );
              canvasSetup.onBackgroundModeChange(mode);
              canvasSetup.onBackgroundColorChange(background.backgroundColor);
            }}
            onBackgroundColorChange={canvasSetup.onBackgroundColorChange}
            colourLabel={t("appSettings.defaultBackgroundColour")}
          />

          <label className="field checkbox">
            <input
              type="checkbox"
              checked={canvasSetup.showHeader}
              onChange={(e) =>
                canvasSetup.onShowHeaderChange(e.target.checked)
              }
            />
            <span>{t("appSettings.defaultShowHeader")}</span>
          </label>

          <div className="field">
            <span>{t("appSettings.defaultDiagramFont")}</span>
            <FontPicker
              value={canvasSetup.diagramFont}
              onChange={canvasSetup.onDiagramFontChange}
            />
          </div>

          <hr className="theme-editor-divider" />
        </>
      )}

      <fieldset className="theme-editor-group">
        <legend>{t("diagramAppearance.groupCreationDefaults")}</legend>
        <p className="hint">{t("diagramAppearance.creationDefaultsHint")}</p>
        <RgbPicker
          label={t("diagramAppearance.defaultLineColour")}
          value={value.defaultLineColor}
          onChange={(defaultLineColor) => onChange({ defaultLineColor })}
        />
        <RgbPicker
          label={t("diagramAppearance.defaultCharacterBorder")}
          value={value.defaultCharacterBorderColor}
          onChange={(defaultCharacterBorderColor) =>
            onChange({ defaultCharacterBorderColor })
          }
        />
        <RgbPicker
          label={t("diagramAppearance.defaultBoxBorder")}
          value={value.defaultBoxBorderColor}
          onChange={(defaultBoxBorderColor) =>
            onChange({ defaultBoxBorderColor })
          }
        />
        <RgbPicker
          label={t("diagramAppearance.defaultFloatingText")}
          value={value.defaultFloatingTextColor}
          onChange={(defaultFloatingTextColor) =>
            onChange({ defaultFloatingTextColor })
          }
        />
      </fieldset>

      <fieldset className="theme-editor-group">
        <legend>{t("diagramAppearance.groupLabelChrome")}</legend>
        <p className="hint">{t("diagramAppearance.labelChromeHint")}</p>

        <p className="diagram-appearance-subgroup">
          {t("diagramAppearance.characterNameLabel")}
        </p>
        <LabelChromeEditors
          labelPrefix="diagramAppearance.label"
          chrome={value.characterNameLabel}
          onChange={(patch) =>
            onChange({
              characterNameLabel: { ...value.characterNameLabel, ...patch },
            })
          }
        />

        <p className="diagram-appearance-subgroup">
          {t("diagramAppearance.characterSubtitleLabel")}
        </p>
        <LabelChromeEditors
          labelPrefix="diagramAppearance.label"
          chrome={value.characterSubtitleLabel}
          onChange={(patch) =>
            onChange({
              characterSubtitleLabel: {
                ...value.characterSubtitleLabel,
                ...patch,
              },
            })
          }
        />

        <p className="diagram-appearance-subgroup">
          {t("diagramAppearance.lineLabel")}
        </p>
        <LabelChromeEditors
          labelPrefix="diagramAppearance.label"
          chrome={value.lineLabel}
          onChange={(patch) =>
            onChange({
              lineLabel: { ...value.lineLabel, ...patch },
            })
          }
        />

        <p className="diagram-appearance-subgroup">
          {t("diagramAppearance.boxNameLabel")}
        </p>
        <LabelChromeEditors
          labelPrefix="diagramAppearance.label"
          chrome={value.boxNameLabel}
          onChange={(patch) =>
            onChange({
              boxNameLabel: { ...value.boxNameLabel, ...patch },
            })
          }
        />
      </fieldset>
    </div>
  );
}
