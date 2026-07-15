import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useDiagramStore } from "../../store/diagramStore";
import { isDefaultDiagramFont } from "../../utils/diagramFont";
import {
  SUPPORTED_LOCALES,
  SYSTEM_LANGUAGE,
  getLanguagePreference,
  setLanguagePreference,
} from "../../i18n";
import { BackgroundColorPicker } from "../pickers/BackgroundColorPicker";
import { FontPicker } from "./FontPicker";

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsDialog({ open, onClose }: SettingsDialogProps) {
  const { t } = useTranslation();
  const [languagePreference, setLanguagePreferenceState] = useState(
    getLanguagePreference,
  );
  const diagramTitle = useDiagramStore((s) => s.diagramTitle);
  const diagramSubtitle = useDiagramStore((s) => s.diagramSubtitle);
  const showDiagramHeader = useDiagramStore((s) => s.showDiagramHeader);
  const diagramFontFamily = useDiagramStore((s) => s.diagramFontFamily);
  const fontMissing = useDiagramStore((s) => s.fontMissing);
  const showGrid = useDiagramStore((s) => s.showGrid);
  const diagramBackgroundColor = useDiagramStore((s) => s.diagramBackgroundColor);
  const setDiagramTitle = useDiagramStore((s) => s.setDiagramTitle);
  const setDiagramSubtitle = useDiagramStore((s) => s.setDiagramSubtitle);
  const setShowDiagramHeader = useDiagramStore((s) => s.setShowDiagramHeader);
  const setShowGrid = useDiagramStore((s) => s.setShowGrid);
  const setDiagramBackgroundColor = useDiagramStore(
    (s) => s.setDiagramBackgroundColor,
  );
  const setDiagramFontFamily = useDiagramStore((s) => s.setDiagramFontFamily);

  if (!open) return null;

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <h2>{t("settings.title")}</h2>

        <section className="settings-section">
          <h3>{t("settings.applicationSection")}</h3>
          <label className="field">
            <span>{t("settings.language")}</span>
            <select
              value={languagePreference}
              onChange={(e) => {
                const next = e.target.value;
                setLanguagePreferenceState(next);
                void setLanguagePreference(next);
              }}
            >
              <option value={SYSTEM_LANGUAGE}>
                {t("settings.languageSystem")}
              </option>
              {SUPPORTED_LOCALES.map((locale) => (
                <option key={locale.code} value={locale.code}>
                  {locale.nativeName}
                </option>
              ))}
            </select>
          </label>
          <p className="hint">{t("settings.languageHint")}</p>
        </section>

        <section className="settings-section">
          <h3>{t("settings.diagramSection")}</h3>

          <label className="field">
            <span>{t("settings.diagramTitle")}</span>
            <input
              type="text"
              value={diagramTitle}
              placeholder={t("settings.titlePlaceholder")}
              onChange={(e) => setDiagramTitle(e.target.value)}
            />
          </label>

          <label className="field">
            <span>{t("settings.diagramSubtitle")}</span>
            <input
              type="text"
              value={diagramSubtitle}
              placeholder={t("settings.subtitlePlaceholder")}
              onChange={(e) => setDiagramSubtitle(e.target.value)}
            />
          </label>

          <label className="field checkbox">
            <input
              type="checkbox"
              checked={showDiagramHeader}
              onChange={(e) => setShowDiagramHeader(e.target.checked)}
            />
            <span>{t("settings.showHeader")}</span>
          </label>

          <label className="field checkbox">
            <input
              type="checkbox"
              checked={showGrid}
              onChange={(e) => setShowGrid(e.target.checked)}
            />
            <span>{t("settings.showGrid")}</span>
          </label>

          <BackgroundColorPicker
            label={t("settings.backgroundColour")}
            value={diagramBackgroundColor}
            onChange={setDiagramBackgroundColor}
          />

          <div className="field">
            <span>{t("settings.diagramFont")}</span>
            <FontPicker
              value={diagramFontFamily}
              onChange={(fontFamily) => void setDiagramFontFamily(fontFamily)}
            />
          </div>

          {fontMissing && (
            <p className="hint">
              {t("settings.fontMissing", { font: diagramFontFamily })}
            </p>
          )}

          {!fontMissing && !isDefaultDiagramFont(diagramFontFamily) && (
            <p className="hint">{t("settings.customFontHint")}</p>
          )}

          <p className="hint">{t("settings.uiFontHint")}</p>
        </section>

        <div className="dialog-actions">
          <button type="button" className="btn-primary" onClick={onClose}>
            {t("settings.done")}
          </button>
        </div>
      </div>
    </div>
  );
}
