import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import packageJson from "../../../package.json";
import {
  SUPPORTED_LOCALES,
  SYSTEM_LANGUAGE,
  getLanguagePreference,
  setLanguagePreference,
} from "../../i18n";
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
import {
  patchDiagramAppearance,
  resolveDiagramThemeAppearance,
  type DiagramThemePreference,
} from "../../utils/diagramAppearance";
import {
  exportZoomPercentFromRatio,
  exportZoomRatioFromPercent,
} from "../../utils/exportZoom";
import { DiagramAppearancePanel } from "./DiagramAppearancePanel";
import { DiagramThemeLibraryControls } from "./DiagramThemeLibraryControls";
import { ExportZoomControls } from "./ExportZoomControls";
import { ThemeEditorPanel } from "./ThemeEditorPanel";
import { TwoPaneDialog } from "./TwoPaneDialog";

type SettingsSectionId =
  | "appearance"
  | "themeEditor"
  | "diagramDefaults"
  | "general"
  | "editing"
  | "export"
  | "data"
  | "about";

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

function downloadJson(filename: string, contents: string) {
  const blob = new Blob([contents], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function SettingsDialog({ open, onClose }: SettingsDialogProps) {
  const { t } = useTranslation();
  const [languagePreference, setLanguagePreferenceState] = useState(
    getLanguagePreference,
  );
  const [prefs, setPrefsState] = useState<AppPreferences>(getAppPreferences);
  const [activeSection, setActiveSection] =
    useState<SettingsSectionId>("appearance");
  const setAutosaveEnabled = useDiagramStore((s) => s.setAutosaveEnabled);
  const replaceDiagramAppearance = useDiagramStore(
    (s) => s.replaceDiagramAppearance,
  );

  useEffect(() => {
    if (!open) return;
    setPrefsState(getAppPreferences());
    setLanguagePreferenceState(getLanguagePreference());
    setActiveSection("appearance");
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
    downloadJson(`${theme.id}.json`, themeDocumentToJson(theme));
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

  const handleThemesChange = (
    customThemes: AppPreferences["customThemes"],
    activateId?: string,
  ) => {
    updatePrefs({
      customThemes,
      ...(activateId ? { themePreference: activateId } : {}),
    });
  };

  const selectDiagramTheme = (preference: DiagramThemePreference) => {
    const diagramAppearance = resolveDiagramThemeAppearance(
      preference,
      prefs.customDiagramThemes,
    );
    updatePrefs({
      diagramThemePreference: preference,
      diagramAppearance,
      defaultBackgroundMode: diagramAppearance.backgroundMode,
      defaultBackgroundColor: diagramAppearance.backgroundColor,
    });
  };

  const handleApplyDiagramThemeToCurrent = () => {
    if (!window.confirm(t("appSettings.diagramThemeApplyConfirm"))) return;
    replaceDiagramAppearance(prefs.diagramAppearance);
  };

  const sections = [
    { id: "appearance", label: t("appSettings.appearanceSection") },
    {
      id: "themeEditor",
      label: t("appSettings.themeEditorSection"),
      nested: true,
    },
    {
      id: "diagramDefaults",
      label: t("appSettings.diagramDefaultsSection"),
      nested: true,
    },
    { id: "general", label: t("appSettings.generalSection") },
    { id: "editing", label: t("appSettings.editingSection") },
    { id: "export", label: t("appSettings.exportSection") },
    { id: "data", label: t("appSettings.dataSection") },
    { id: "about", label: t("appSettings.aboutSection") },
  ] as const;

  let content = null;
  switch (activeSection) {
    case "appearance":
      content = (
        <>
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

          <hr className="theme-editor-divider" />

          <label className="field">
            <span>{t("appSettings.diagramTheme")}</span>
            <select
              value={prefs.diagramThemePreference}
              onChange={(e) =>
                selectDiagramTheme(e.target.value as DiagramThemePreference)
              }
            >
              <option value="default">
                {t("appSettings.diagramThemeDefault")}
              </option>
              {prefs.customDiagramThemes.map((theme) => (
                <option key={theme.id} value={theme.id}>
                  {theme.name}
                </option>
              ))}
            </select>
          </label>
          <p className="hint">{t("appSettings.diagramThemeHint")}</p>

          <button
            type="button"
            className="btn-secondary"
            onClick={handleApplyDiagramThemeToCurrent}
          >
            {t("appSettings.diagramThemeApply")}
          </button>
        </>
      );
      break;
    case "themeEditor":
      content = (
        <ThemeEditorPanel
          customThemes={prefs.customThemes}
          themePreference={prefs.themePreference}
          onThemesChange={handleThemesChange}
          onImportTheme={(file) => void handleImportTheme(file)}
          onExportTheme={handleExportTheme}
          onRemoveTheme={handleRemoveTheme}
        />
      );
      break;
    case "diagramDefaults":
      content = (
        <>
          <DiagramThemeLibraryControls
            appearance={prefs.diagramAppearance}
            prefs={prefs}
            onPrefsChange={setPrefsState}
            editorMode
            onApplyAppearance={replaceDiagramAppearance}
            hintKey="appSettings.diagramThemesLibraryHint"
          />

          <hr className="theme-editor-divider" />

          <DiagramAppearancePanel
            value={prefs.diagramAppearance}
            onChange={(patch) => {
              const diagramAppearance = patchDiagramAppearance(
                prefs.diagramAppearance,
                patch,
              );
              updatePrefs({
                diagramAppearance,
                ...(patch.backgroundMode !== undefined ||
                patch.backgroundColor !== undefined
                  ? {
                      defaultBackgroundMode: diagramAppearance.backgroundMode,
                      defaultBackgroundColor: diagramAppearance.backgroundColor,
                    }
                  : {}),
              });
            }}
            showAppearanceColours={prefs.diagramThemePreference !== "default"}
            canvasSetup={{
              diagramFont: prefs.defaultDiagramFont,
              showHeader: prefs.defaultShowHeader,
              settingsLabels: true,
              onShowHeaderChange: (show) =>
                updatePrefs({ defaultShowHeader: show }),
              onDiagramFontChange: (fontFamily) =>
                updatePrefs({ defaultDiagramFont: fontFamily }),
            }}
          />
        </>
      );
      break;
    case "general":
      content = (
        <>
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
        </>
      );
      break;
    case "editing":
      content = (
        <>
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
        </>
      );
      break;
    case "export":
      content = (
        <>
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

          <ExportZoomControls
            label={t("appSettings.defaultExportResolution")}
            value={exportZoomPercentFromRatio(prefs.defaultExportPixelRatio)}
            onChange={(percent) =>
              updatePrefs({
                defaultExportPixelRatio: exportZoomRatioFromPercent(percent),
              })
            }
          />

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
        </>
      );
      break;
    case "data":
      content = (
        <button
          type="button"
          className="btn-secondary"
          onClick={() => void handleClearRecovery()}
        >
          {t("appSettings.clearRecoveryData")}
        </button>
      );
      break;
    case "about":
      content = (
        <>
          <p>{t("app.name")}</p>
          <p className="hint">
            {t("appSettings.version", { version: packageJson.version })}
          </p>
        </>
      );
      break;
  }

  return (
    <TwoPaneDialog
      open={open}
      onClose={onClose}
      title={t("appSettings.title")}
      sections={sections}
      activeSection={activeSection}
      onSectionChange={(id) => setActiveSection(id as SettingsSectionId)}
      doneLabel={t("appSettings.done")}
    >
      {content}
    </TwoPaneDialog>
  );
}
