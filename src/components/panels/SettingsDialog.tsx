import { useState } from "react";
import { useTranslation } from "react-i18next";
import packageJson from "../../../package.json";
import {
  SUPPORTED_LOCALES,
  SYSTEM_LANGUAGE,
  getLanguagePreference,
  setLanguagePreference,
} from "../../i18n";
import { applyDiagramBackgroundMode } from "../../utils/diagramBackground";
import {
  getAppPreferences,
  setAppPreferences,
  type AppPreferences,
  type ExportBoundsMode,
} from "../../utils/appPreferences";
import { clearAutosave } from "../../utils/autosaveStorage";
import { useDiagramStore } from "../../store/diagramStore";
import { BackgroundModeControls } from "./BackgroundModeControls";
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
  const [prefs, setPrefsState] = useState<AppPreferences>(getAppPreferences);
  const setAutosaveEnabled = useDiagramStore((s) => s.setAutosaveEnabled);

  const updatePrefs = (patch: Partial<AppPreferences>) => {
    const next = setAppPreferences(patch);
    setPrefsState(next);
    if (patch.autosaveEnabled !== undefined) {
      setAutosaveEnabled(patch.autosaveEnabled);
    }
  };

  const handleClearRecovery = async () => {
    if (!window.confirm(t("appSettings.clearRecoveryConfirm"))) return;
    await clearAutosave();
    alert(t("appSettings.clearRecoveryDone"));
  };

  if (!open) return null;

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog dialog-scrollable" onClick={(e) => e.stopPropagation()}>
        <h2>{t("appSettings.title")}</h2>

        <section className="settings-section">
          <h3>{t("appSettings.generalSection")}</h3>
          <label className="field">
            <span>{t("appSettings.language")}</span>
            <select
              value={languagePreference}
              onChange={(e) => {
                const next = e.target.value;
                setLanguagePreferenceState(next);
                void setLanguagePreference(next);
              }}
            >
              <option value={SYSTEM_LANGUAGE}>
                {t("appSettings.languageSystem")}
              </option>
              {SUPPORTED_LOCALES.map((locale) => (
                <option key={locale.code} value={locale.code}>
                  {locale.nativeName}
                </option>
              ))}
            </select>
          </label>
          <p className="hint">{t("appSettings.languageHint")}</p>
        </section>

        <section className="settings-section">
          <h3>{t("appSettings.editingSection")}</h3>
          <label className="field checkbox">
            <input
              type="checkbox"
              checked={prefs.autosaveEnabled}
              onChange={(e) =>
                updatePrefs({ autosaveEnabled: e.target.checked })
              }
            />
            <span>{t("appSettings.autosaveEnabled")}</span>
          </label>
          <p className="hint">{t("appSettings.autosaveHint")}</p>

          <label className="field checkbox">
            <input
              type="checkbox"
              checked={prefs.confirmBeforeNewDiagram}
              onChange={(e) =>
                updatePrefs({ confirmBeforeNewDiagram: e.target.checked })
              }
            />
            <span>{t("appSettings.confirmBeforeNew")}</span>
          </label>
        </section>

        <section className="settings-section">
          <h3>{t("appSettings.newDiagramsSection")}</h3>
          <p className="hint">{t("appSettings.newDiagramsHint")}</p>

          <BackgroundModeControls
            mode={prefs.defaultBackgroundMode}
            backgroundColor={prefs.defaultBackgroundColor}
            onModeChange={(mode) => {
              const background = applyDiagramBackgroundMode(
                mode,
                prefs.defaultBackgroundColor,
              );
              updatePrefs({
                defaultBackgroundMode: mode,
                defaultBackgroundColor: background.backgroundColor,
              });
            }}
            onBackgroundColorChange={(color) =>
              updatePrefs({ defaultBackgroundColor: color })
            }
            colourLabel={t("appSettings.defaultBackgroundColour")}
          />

          <label className="field checkbox">
            <input
              type="checkbox"
              checked={prefs.defaultShowHeader}
              onChange={(e) =>
                updatePrefs({ defaultShowHeader: e.target.checked })
              }
            />
            <span>{t("appSettings.defaultShowHeader")}</span>
          </label>

          <div className="field">
            <span>{t("appSettings.defaultDiagramFont")}</span>
            <FontPicker
              value={prefs.defaultDiagramFont}
              onChange={(fontFamily) =>
                updatePrefs({ defaultDiagramFont: fontFamily })
              }
            />
          </div>
        </section>

        <section className="settings-section">
          <h3>{t("appSettings.exportSection")}</h3>
          <p className="hint">{t("appSettings.exportHint")}</p>

          <label className="field">
            <span>{t("appSettings.defaultExportPadding")}</span>
            <input
              type="number"
              min={0}
              max={200}
              value={prefs.defaultExportPadding}
              onChange={(e) =>
                updatePrefs({
                  defaultExportPadding: Number(e.target.value),
                })
              }
            />
          </label>

          <label className="field">
            <span>{t("appSettings.defaultExportResolution")}</span>
            <select
              value={prefs.defaultExportPixelRatio}
              onChange={(e) =>
                updatePrefs({
                  defaultExportPixelRatio: Number(e.target.value) as 1 | 2,
                })
              }
            >
              <option value={1}>{t("export.res1x")}</option>
              <option value={2}>{t("export.res2x")}</option>
            </select>
          </label>

          <label className="field">
            <span>{t("appSettings.defaultExportBounds")}</span>
            <select
              value={prefs.defaultExportBoundsMode}
              onChange={(e) =>
                updatePrefs({
                  defaultExportBoundsMode: e.target.value as ExportBoundsMode,
                })
              }
            >
              <option value="auto">{t("export.boundsAuto")}</option>
              <option value="custom">{t("export.boundsCustom")}</option>
            </select>
          </label>
        </section>

        <section className="settings-section">
          <h3>{t("appSettings.dataSection")}</h3>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => void handleClearRecovery()}
          >
            {t("appSettings.clearRecoveryData")}
          </button>
        </section>

        <section className="settings-section">
          <h3>{t("appSettings.aboutSection")}</h3>
          <p>{t("app.name")}</p>
          <p className="hint">
            {t("appSettings.version", { version: packageJson.version })}
          </p>
        </section>

        <div className="dialog-actions">
          <button type="button" className="btn-primary" onClick={onClose}>
            {t("appSettings.done")}
          </button>
        </div>
      </div>
    </div>
  );
}
