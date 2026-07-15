import { useEffect, useRef, useState } from "react";
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
import { reapplyUiAppearanceFromPrefs } from "../../hooks/useUiAppearance";
import {
  UI_SCALE_OPTIONS,
  createThemeFromCurrentTokens,
  themeDocumentToJson,
  validateThemeDocument,
  type ThemePreference,
  type UiScale,
} from "../../utils/uiTheme";
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
  const importInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setPrefsState(getAppPreferences());
    setLanguagePreferenceState(getLanguagePreference());
  }, [open]);

  const updatePrefs = (patch: Partial<AppPreferences>) => {
    const next = setAppPreferences(patch);
    setPrefsState(next);
    if (patch.autosaveEnabled !== undefined) {
      setAutosaveEnabled(patch.autosaveEnabled);
    }
    if (
      patch.themePreference !== undefined ||
      patch.uiScale !== undefined ||
      patch.customThemes !== undefined
    ) {
      reapplyUiAppearanceFromPrefs();
    }
  };

  const handleClearRecovery = async () => {
    if (!window.confirm(t("appSettings.clearRecoveryConfirm"))) return;
    await clearAutosave();
    alert(t("appSettings.clearRecoveryDone"));
  };

  const handleImportTheme = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as unknown;
      const theme = validateThemeDocument(parsed);
      if (!theme) {
        alert(t("appSettings.themeImportInvalid"));
        return;
      }
      const existing = prefs.customThemes.filter((entry) => entry.id !== theme.id);
      const customThemes = [...existing, theme];
      updatePrefs({
        customThemes,
        themePreference: theme.id,
      });
    } catch {
      alert(t("appSettings.themeImportInvalid"));
    }
  };

  const handleExportTheme = (themeId: string) => {
    const custom = prefs.customThemes.find((theme) => theme.id === themeId);
    const theme =
      custom ??
      createThemeFromCurrentTokens(
        themeId === "light" || themeId === "dark" ? themeId : "active-theme",
        themeId === "light" || themeId === "dark"
          ? themeId
          : t("appSettings.themeExportActiveName"),
        prefs.themePreference,
        prefs.customThemes,
      );
    const blob = new Blob([themeDocumentToJson(theme)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${theme.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRemoveTheme = (themeId: string, themeName: string) => {
    if (!window.confirm(t("appSettings.themeRemoveConfirm", { name: themeName }))) {
      return;
    }
    const customThemes = prefs.customThemes.filter((theme) => theme.id !== themeId);
    const themePreference =
      prefs.themePreference === themeId ? "system" : prefs.themePreference;
    updatePrefs({ customThemes, themePreference });
  };

  if (!open) return null;

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog dialog-scrollable" onClick={(e) => e.stopPropagation()}>
        <h2>{t("appSettings.title")}</h2>

        <section className="settings-section">
          <h3>{t("appSettings.appearanceSection")}</h3>
          <label className="field">
            <span>{t("appSettings.theme")}</span>
            <select
              value={prefs.themePreference}
              onChange={(e) =>
                updatePrefs({
                  themePreference: e.target.value as ThemePreference,
                })
              }
            >
              <option value="system">{t("appSettings.themeSystem")}</option>
              <option value="light">{t("appSettings.themeLight")}</option>
              <option value="dark">{t("appSettings.themeDark")}</option>
              {prefs.customThemes.map((theme) => (
                <option key={theme.id} value={theme.id}>
                  {theme.name}
                </option>
              ))}
            </select>
          </label>
          <p className="hint">{t("appSettings.themeHint")}</p>

          <label className="field">
            <span>{t("appSettings.uiScale")}</span>
            <select
              value={prefs.uiScale}
              onChange={(e) =>
                updatePrefs({
                  uiScale: Number(e.target.value) as UiScale,
                })
              }
            >
              {UI_SCALE_OPTIONS.map((scale) => (
                <option key={scale} value={scale}>
                  {t("appSettings.uiScaleOption", {
                    percent: Math.round(scale * 100),
                  })}
                </option>
              ))}
            </select>
          </label>

          <p className="hint">{t("appSettings.customThemesHint")}</p>
          {prefs.customThemes.length > 0 && (
            <ul className="custom-theme-list">
              {prefs.customThemes.map((theme) => (
                <li key={theme.id} className="custom-theme-row">
                  <span style={{ flex: 1 }}>{theme.name}</span>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => handleExportTheme(theme.id)}
                  >
                    {t("appSettings.themeExport")}
                  </button>
                  <button
                    type="button"
                    className="btn-danger"
                    onClick={() => handleRemoveTheme(theme.id, theme.name)}
                  >
                    {t("appSettings.themeRemove")}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="custom-theme-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => importInputRef.current?.click()}
            >
              {t("appSettings.themeImport")}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => handleExportTheme(prefs.themePreference)}
            >
              {t("appSettings.themeExportActive")}
            </button>
            <input
              ref={importInputRef}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) void handleImportTheme(file);
              }}
            />
          </div>
        </section>

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
