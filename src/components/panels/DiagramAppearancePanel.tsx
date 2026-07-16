import { useTranslation } from "react-i18next";
import type { DiagramAppearance, LabelChrome, RGB } from "../../models/types";
import {
  applyDiagramBackgroundMode,
  type DiagramBackgroundMode,
} from "../../utils/diagramBackground";
import { isDefaultDiagramFont } from "../../utils/diagramFont";
import { RgbPicker } from "../pickers/RgbPicker";
import { BackgroundModeControls } from "./BackgroundModeControls";
import { FontPicker } from "./FontPicker";

interface CanvasSetupProps {
  backgroundMode: DiagramBackgroundMode;
  backgroundColor: RGB | null;
  diagramFont: string;
  onBackgroundModeChange: (mode: DiagramBackgroundMode) => void;
  onBackgroundColorChange: (color: RGB | null) => void;
  onDiagramFontChange: (fontFamily: string) => void;
  showHeader?: boolean;
  onShowHeaderChange?: (show: boolean) => void;
  /** Use Settings labels for defaults vs Diagram properties labels. */
  settingsLabels?: boolean;
  fontMissing?: boolean;
  showFontHints?: boolean;
}

interface HeaderColorsProps {
  titleColor: RGB;
  subtitleColor: RGB;
  onTitleColorChange: (color: RGB) => void;
  onSubtitleColorChange: (color: RGB) => void;
}

interface DiagramAppearancePanelProps {
  value: DiagramAppearance;
  onChange: (patch: Partial<DiagramAppearance>) => void;
  /** Background / font / optional show-header controls. */
  canvasSetup?: CanvasSetupProps;
  /** Diagram title/subtitle text colours. */
  headerColors?: HeaderColorsProps;
  /** When false, hide creation-default and label-chrome colour editors. */
  showAppearanceColours?: boolean;
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
  headerColors,
  showAppearanceColours = true,
}: DiagramAppearancePanelProps) {
  const { t } = useTranslation();
  const settingsLabels = canvasSetup?.settingsLabels ?? false;

  return (
    <div className="diagram-appearance-panel">
      {headerColors && (
        <fieldset className="theme-editor-group">
          <legend>{t("diagramAppearance.groupHeaderColours")}</legend>
          <RgbPicker
            label={t("diagramProperties.titleColour")}
            value={headerColors.titleColor}
            onChange={headerColors.onTitleColorChange}
          />
          <RgbPicker
            label={t("diagramProperties.subtitleColour")}
            value={headerColors.subtitleColor}
            onChange={headerColors.onSubtitleColorChange}
          />
        </fieldset>
      )}

      {canvasSetup && (
        <>
          {settingsLabels && (
            <p className="hint">{t("diagramAppearance.canvasSetupHint")}</p>
          )}

          <fieldset className="theme-editor-group">
            <legend>{t("diagramAppearance.groupBackground")}</legend>
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
              colourLabel={
                settingsLabels
                  ? t("appSettings.defaultBackgroundColour")
                  : t("diagramProperties.backgroundColour")
              }
            />
          </fieldset>

          {canvasSetup.onShowHeaderChange != null &&
            canvasSetup.showHeader !== undefined && (
              <label className="field checkbox">
                <input
                  type="checkbox"
                  checked={canvasSetup.showHeader}
                  onChange={(e) =>
                    canvasSetup.onShowHeaderChange?.(e.target.checked)
                  }
                />
                <span>
                  {settingsLabels
                    ? t("appSettings.defaultShowHeader")
                    : t("diagramProperties.showHeader")}
                </span>
              </label>
            )}

          <fieldset className="theme-editor-group">
            <legend>{t("diagramAppearance.groupFont")}</legend>
            <div className="field">
              <span>
                {settingsLabels
                  ? t("appSettings.defaultDiagramFont")
                  : t("diagramProperties.diagramFont")}
              </span>
              <FontPicker
                value={canvasSetup.diagramFont}
                onChange={canvasSetup.onDiagramFontChange}
              />
            </div>
            {canvasSetup.fontMissing && (
              <p className="hint">
                {t("diagramProperties.fontMissing", {
                  font: canvasSetup.diagramFont,
                })}
              </p>
            )}
            {canvasSetup.showFontHints &&
              !canvasSetup.fontMissing &&
              !isDefaultDiagramFont(canvasSetup.diagramFont) && (
                <p className="hint">{t("diagramProperties.customFontHint")}</p>
              )}
            {canvasSetup.showFontHints && (
              <p className="hint">{t("diagramProperties.uiFontHint")}</p>
            )}
          </fieldset>
        </>
      )}

      {showAppearanceColours && (
        <>
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
        </>
      )}
    </div>
  );
}
