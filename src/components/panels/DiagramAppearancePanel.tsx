import { useTranslation } from "react-i18next";
import type { DiagramAppearance, LabelChrome } from "../../models/types";
import {
  applyDiagramBackgroundMode,
  type DiagramBackgroundMode,
} from "../../utils/diagramBackground";
import { isDefaultDiagramFont } from "../../utils/diagramFont";
import { RgbPicker } from "../pickers/RgbPicker";
import { BackgroundModeControls } from "./BackgroundModeControls";
import {
  BoxAppearancePreview,
  CharacterAppearancePreview,
  FloatingTextAppearancePreview,
  HeaderAppearancePreview,
  LineAppearancePreview,
} from "./DiagramAppearancePreviews";
import { FontPicker } from "./FontPicker";

interface CanvasSetupProps {
  diagramFont: string;
  onDiagramFontChange: (fontFamily: string) => void;
  showHeader?: boolean;
  onShowHeaderChange?: (show: boolean) => void;
  /** Use Settings labels for defaults vs Diagram properties labels. */
  settingsLabels?: boolean;
  fontMissing?: boolean;
  showFontHints?: boolean;
}

interface DiagramAppearancePanelProps {
  value: DiagramAppearance;
  onChange: (patch: Partial<DiagramAppearance>) => void;
  /** Font / optional show-header controls. Font is part of the theme; header default is not. */
  canvasSetup?: CanvasSetupProps;
  /** When false, hide colour pickers but keep element previews. */
  showAppearanceColours?: boolean;
}

function LabelChromeEditors({
  labelPrefix,
  chrome,
  onChange,
  includeTextColor = true,
}: {
  labelPrefix: string;
  chrome: LabelChrome;
  onChange: (patch: Partial<LabelChrome>) => void;
  /** When false, only background and border are editable (e.g. line labels). */
  includeTextColor?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <>
      {includeTextColor && (
        <RgbPicker
          label={t(`${labelPrefix}Text`)}
          value={chrome.textColor}
          onChange={(textColor) => onChange({ textColor })}
        />
      )}
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
  showAppearanceColours = true,
}: DiagramAppearancePanelProps) {
  const { t } = useTranslation();
  const settingsLabels = canvasSetup?.settingsLabels ?? false;
  const fontFamily = canvasSetup?.diagramFont;
  const canvasBackground = value.backgroundColor;

  const setBackgroundMode = (mode: DiagramBackgroundMode) => {
    const background = applyDiagramBackgroundMode(mode, value.backgroundColor);
    onChange({
      backgroundMode: mode,
      backgroundColor: background.backgroundColor,
    });
  };

  return (
    <div className="diagram-appearance-panel">
      {canvasSetup && settingsLabels && (
        <p className="hint">{t("diagramAppearance.canvasSetupHint")}</p>
      )}

      {showAppearanceColours && (
        <fieldset className="theme-editor-group">
          <legend>{t("diagramAppearance.groupBackground")}</legend>
          <BackgroundModeControls
            mode={value.backgroundMode}
            backgroundColor={value.backgroundColor}
            gridColor={value.backgroundGridColor}
            backgroundImageData={value.backgroundImageData}
            backgroundImagePlacement={value.backgroundImagePlacement}
            backgroundImageScale={value.backgroundImageScale}
            onModeChange={setBackgroundMode}
            onBackgroundColorChange={(backgroundColor) =>
              onChange({ backgroundColor })
            }
            onGridColorChange={(backgroundGridColor) =>
              onChange({ backgroundGridColor })
            }
            onBackgroundImageDataChange={(backgroundImageData) =>
              onChange({ backgroundImageData })
            }
            onBackgroundImagePlacementChange={(backgroundImagePlacement) =>
              onChange({ backgroundImagePlacement })
            }
            onBackgroundImageScaleChange={(backgroundImageScale) =>
              onChange({ backgroundImageScale })
            }
            colourLabel={
              settingsLabels
                ? t("appSettings.defaultBackgroundColour")
                : t("diagramProperties.backgroundColour")
            }
          />
        </fieldset>
      )}

      {canvasSetup && (
        <>
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
                  ? t("diagramAppearance.groupFont")
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

      <fieldset className="theme-editor-group">
        <legend>{t("diagramAppearance.groupHeader")}</legend>
        <div className="diagram-appearance-element">
          <HeaderAppearancePreview
            titleLabel={value.diagramTitleLabel}
            subtitleLabel={value.diagramSubtitleLabel}
            fontFamily={fontFamily}
            canvasBackground={canvasBackground}
          />
          {showAppearanceColours && (
            <div className="diagram-appearance-element-controls">
              <p className="hint">{t("diagramAppearance.headerChromeHint")}</p>
              <p className="diagram-appearance-subgroup">
                {t("diagramAppearance.headerTitleLabel")}
              </p>
              <LabelChromeEditors
                labelPrefix="diagramAppearance.label"
                chrome={value.diagramTitleLabel}
                onChange={(patch) =>
                  onChange({
                    diagramTitleLabel: {
                      ...value.diagramTitleLabel,
                      ...patch,
                    },
                  })
                }
              />
              <p className="diagram-appearance-subgroup">
                {t("diagramAppearance.headerSubtitleLabel")}
              </p>
              <LabelChromeEditors
                labelPrefix="diagramAppearance.label"
                chrome={value.diagramSubtitleLabel}
                onChange={(patch) =>
                  onChange({
                    diagramSubtitleLabel: {
                      ...value.diagramSubtitleLabel,
                      ...patch,
                    },
                  })
                }
              />
            </div>
          )}
        </div>
      </fieldset>

      <fieldset className="theme-editor-group">
        <legend>{t("diagramAppearance.groupCharacters")}</legend>
        <div className="diagram-appearance-element">
          <CharacterAppearancePreview
            borderColor={value.defaultCharacterBorderColor}
            nameLabel={value.characterNameLabel}
            subtitleLabel={value.characterSubtitleLabel}
            placeholderFill={value.characterPlaceholderFill}
            initialsColor={value.characterInitialsColor}
            fontFamily={fontFamily}
            canvasBackground={canvasBackground}
          />
          {showAppearanceColours && (
            <div className="diagram-appearance-element-controls">
              <p className="hint">{t("diagramAppearance.characterNewHint")}</p>
              <RgbPicker
                label={t("diagramAppearance.defaultCharacterBorder")}
                value={value.defaultCharacterBorderColor}
                onChange={(defaultCharacterBorderColor) =>
                  onChange({ defaultCharacterBorderColor })
                }
              />
              <p className="hint">
                {t("diagramAppearance.characterPlaceholderHint")}
              </p>
              <RgbPicker
                label={t("diagramAppearance.characterPlaceholderFill")}
                value={value.characterPlaceholderFill}
                onChange={(characterPlaceholderFill) =>
                  onChange({ characterPlaceholderFill })
                }
              />
              <RgbPicker
                label={t("diagramAppearance.characterInitialsColor")}
                value={value.characterInitialsColor}
                onChange={(characterInitialsColor) =>
                  onChange({ characterInitialsColor })
                }
              />
              <p className="hint">{t("diagramAppearance.labelChromeHint")}</p>
              <p className="diagram-appearance-subgroup">
                {t("diagramAppearance.characterNameLabel")}
              </p>
              <LabelChromeEditors
                labelPrefix="diagramAppearance.label"
                chrome={value.characterNameLabel}
                onChange={(patch) =>
                  onChange({
                    characterNameLabel: {
                      ...value.characterNameLabel,
                      ...patch,
                    },
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
            </div>
          )}
        </div>
      </fieldset>

      <fieldset className="theme-editor-group">
        <legend>{t("diagramAppearance.groupLines")}</legend>
        <div className="diagram-appearance-element">
          <LineAppearancePreview
            lineColor={value.defaultLineColor}
            labelChrome={value.lineLabel}
            fontFamily={fontFamily}
            canvasBackground={canvasBackground}
          />
          {showAppearanceColours && (
            <div className="diagram-appearance-element-controls">
              <p className="hint">{t("diagramAppearance.lineNewHint")}</p>
              <RgbPicker
                label={t("diagramAppearance.defaultLineColour")}
                value={value.defaultLineColor}
                onChange={(defaultLineColor) => onChange({ defaultLineColor })}
              />
              <p className="hint">{t("diagramAppearance.labelChromeHint")}</p>
              <p className="diagram-appearance-subgroup">
                {t("diagramAppearance.lineLabel")}
              </p>
              <p className="hint">{t("diagramAppearance.lineLabelTextHint")}</p>
              <LabelChromeEditors
                labelPrefix="diagramAppearance.label"
                chrome={value.lineLabel}
                includeTextColor={false}
                onChange={(patch) =>
                  onChange({
                    lineLabel: { ...value.lineLabel, ...patch },
                  })
                }
              />
            </div>
          )}
        </div>
      </fieldset>

      <fieldset className="theme-editor-group">
        <legend>{t("diagramAppearance.groupBoxes")}</legend>
        <div className="diagram-appearance-element">
          <BoxAppearancePreview
            borderColor={value.defaultBoxBorderColor}
            nameLabel={value.boxNameLabel}
            fontFamily={fontFamily}
            canvasBackground={canvasBackground}
          />
          {showAppearanceColours && (
            <div className="diagram-appearance-element-controls">
              <p className="hint">{t("diagramAppearance.boxNewHint")}</p>
              <RgbPicker
                label={t("diagramAppearance.defaultBoxBorder")}
                value={value.defaultBoxBorderColor}
                onChange={(defaultBoxBorderColor) =>
                  onChange({ defaultBoxBorderColor })
                }
              />
              <p className="hint">{t("diagramAppearance.labelChromeHint")}</p>
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
            </div>
          )}
        </div>
      </fieldset>

      <fieldset className="theme-editor-group">
        <legend>{t("diagramAppearance.groupText")}</legend>
        <div className="diagram-appearance-element">
          <FloatingTextAppearancePreview
            color={value.defaultFloatingTextColor}
            fontFamily={fontFamily}
            canvasBackground={canvasBackground}
          />
          {showAppearanceColours && (
            <div className="diagram-appearance-element-controls">
              <p className="hint">{t("diagramAppearance.textNewHint")}</p>
              <RgbPicker
                label={t("diagramAppearance.defaultFloatingText")}
                value={value.defaultFloatingTextColor}
                onChange={(defaultFloatingTextColor) =>
                  onChange({ defaultFloatingTextColor })
                }
              />
            </div>
          )}
        </div>
      </fieldset>
    </div>
  );
}
