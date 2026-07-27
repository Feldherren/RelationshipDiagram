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
  UI_THEME_FILE_EXTENSION,
  createThemeFromCurrentTokens,
  parseThemeDocument,
  slugifyThemeId,
  themeDocumentToJson,
  type ThemePreference,
  type UiScale,
} from "../../utils/uiTheme";
import {
  BUILT_IN_DIAGRAM_THEME_IDS,
  builtInDiagramThemeLabelKey,
  cloneDiagramAppearance,
  createDiagramThemeDocument,
  isBuiltInDiagramThemeId,
  patchDiagramAppearance,
  resolveDiagramThemeAppearance,
  uniqueDiagramThemeId,
  type DiagramThemePreference,
} from "../../utils/diagramAppearance";
import type { DiagramAppearance } from "../../models/types";
import {
  exportZoomPercentFromRatio,
  exportZoomRatioFromPercent,
} from "../../utils/exportZoom";
import { downloadJson } from "../../utils/downloadJson";
import { countRemappableElements } from "../../utils/remapDiagramThemeColors";
import { DiagramAppearancePanel } from "./DiagramAppearancePanel";
import { DiagramThemeLibraryControls } from "./DiagramThemeLibraryControls";
import { ApplyDiagramThemeDialog } from "./ApplyDiagramThemeDialog";
import { ForkDiagramThemeDialog } from "./ForkDiagramThemeDialog";
import { ExportZoomControls } from "./ExportZoomControls";
import { ThemeEditorPanel } from "./ThemeEditorPanel";
import { DefaultFolderField } from "./DefaultFolderField";
import { TwoPaneDialog } from "./TwoPaneDialog";

export type SettingsSectionId =
  | "appearance"
  | "themeEditor"
  | "diagramDefaults"
  | "general"
  | "accessibility"
  | "editing"
  | "export"
  | "data"
  | "about";

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
  /** Section to show when the dialog opens. Defaults to Appearance. */
  initialSection?: SettingsSectionId;
}

interface PendingThemeApply {
  appearance: DiagramAppearance;
  themeName: string;
  remappableCount: number;
}

export function SettingsDialog({
  open,
  onClose,
  initialSection = "appearance",
}: SettingsDialogProps) {
  const { t } = useTranslation();
  const [languagePreference, setLanguagePreferenceState] = useState(
    getLanguagePreference,
  );
  const [prefs, setPrefsState] = useState<AppPreferences>(getAppPreferences);
  const [activeSection, setActiveSection] =
    useState<SettingsSectionId>("appearance");
  const [forkDialogOpen, setForkDialogOpen] = useState(false);
  const [forkPendingAppearance, setForkPendingAppearance] =
    useState<DiagramAppearance | null>(null);
  const [pendingThemeApply, setPendingThemeApply] =
    useState<PendingThemeApply | null>(null);
  const setAutosaveEnabled = useDiagramStore((s) => s.setAutosaveEnabled);
  const setSelectionPulseEnabled = useDiagramStore(
    (s) => s.setSelectionPulseEnabled,
  );
  const setLineLabelContrastWithBackground = useDiagramStore(
    (s) => s.setLineLabelContrastWithBackground,
  );
  const applyDiagramTheme = useDiagramStore((s) => s.applyDiagramTheme);
  const diagramAppearance = useDiagramStore((s) => s.diagramAppearance);
  const characters = useDiagramStore((s) => s.characters);
  const lines = useDiagramStore((s) => s.lines);
  const boxes = useDiagramStore((s) => s.boxes);
  const floatingTexts = useDiagramStore((s) => s.floatingTexts);

  useEffect(() => {
    if (!open) {
      setForkDialogOpen(false);
      setForkPendingAppearance(null);
      setPendingThemeApply(null);
      return;
    }
    setPrefsState(getAppPreferences());
    setLanguagePreferenceState(getLanguagePreference());
    setActiveSection(initialSection);
  }, [open, initialSection]);

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

  const handleClearAutosave = async () => {
    if (!window.confirm(t("appSettings.clearAutosaveConfirm"))) return;
    await clearAutosave();
    alert(t("appSettings.clearAutosaveDone"));
  };

  const handleImportTheme = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as unknown;
      const result = parseThemeDocument(parsed);
      if (!result.ok) {
        alert(
          t(
            result.reason === "wrongKind"
              ? "appSettings.themeImportWrongKind"
              : "appSettings.themeImportInvalid",
          ),
        );
        return;
      }
      const theme = result.theme;
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
    downloadJson(
      `${slugifyThemeId(theme.name)}${UI_THEME_FILE_EXTENSION}`,
      themeDocumentToJson(theme),
    );
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
    const remappableCount = countRemappableElements(
      { characters, lines, boxes, floatingTexts },
      diagramAppearance,
    );
    const preference = prefs.diagramThemePreference;
    const themeName = isBuiltInDiagramThemeId(preference)
      ? t(builtInDiagramThemeLabelKey(preference))
      : (prefs.customDiagramThemes.find((theme) => theme.id === preference)
          ?.name ?? preference);
    setPendingThemeApply({
      appearance: cloneDiagramAppearance(prefs.diagramAppearance),
      themeName,
      remappableCount,
    });
  };

  const handleApplyThemeConfirm = (remapDefaultColors: boolean) => {
    if (!pendingThemeApply) return;
    applyDiagramTheme(pendingThemeApply.appearance, { remapDefaultColors });
    setPendingThemeApply(null);
  };

  const handleApplyThemeCancel = () => {
    setPendingThemeApply(null);
  };

  const handleDiagramAppearanceChange = (
    patch: Partial<DiagramAppearance>,
  ) => {
    // Read storage so rapid picker updates after a fork don't re-prompt.
    const current = getAppPreferences();
    const diagramAppearance = patchDiagramAppearance(
      forkPendingAppearance ?? current.diagramAppearance,
      patch,
    );
    const backgroundPatch =
      patch.backgroundMode !== undefined || patch.backgroundColor !== undefined
        ? {
            defaultBackgroundMode: diagramAppearance.backgroundMode,
            defaultBackgroundColor: diagramAppearance.backgroundColor,
          }
        : {};

    if (isBuiltInDiagramThemeId(current.diagramThemePreference)) {
      setForkPendingAppearance(diagramAppearance);
      setForkDialogOpen(true);
      return;
    }

    updatePrefs({
      diagramAppearance,
      ...backgroundPatch,
    });
  };

  const handleForkDialogCancel = () => {
    setForkDialogOpen(false);
    setForkPendingAppearance(null);
  };

  const handleForkDialogConfirm = (name: string) => {
    if (!forkPendingAppearance) {
      handleForkDialogCancel();
      return;
    }
    const current = getAppPreferences();
    const id = uniqueDiagramThemeId(name, current.customDiagramThemes);
    const theme = createDiagramThemeDocument(
      id,
      name,
      forkPendingAppearance,
    );
    updatePrefs({
      customDiagramThemes: [...current.customDiagramThemes, theme],
      diagramThemePreference: theme.id,
      diagramAppearance: forkPendingAppearance,
      defaultBackgroundMode: forkPendingAppearance.backgroundMode,
      defaultBackgroundColor: forkPendingAppearance.backgroundColor,
    });
    setForkDialogOpen(false);
    setForkPendingAppearance(null);
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
    { id: "accessibility", label: t("appSettings.accessibilitySection") },
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

          <hr className="theme-editor-divider" />

          <label className="field">
            <span>{t("appSettings.diagramTheme")}</span>
            <select
              value={prefs.diagramThemePreference}
              onChange={(e) =>
                selectDiagramTheme(e.target.value as DiagramThemePreference)
              }
            >
              {BUILT_IN_DIAGRAM_THEME_IDS.map((id) => (
                <option key={id} value={id}>
                  {t(builtInDiagramThemeLabelKey(id))}
                </option>
              ))}
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
            onApplyAppearance={applyDiagramTheme}
            hintKey="appSettings.diagramThemesLibraryHint"
          />

          <hr className="theme-editor-divider" />

          <DiagramAppearancePanel
            value={forkPendingAppearance ?? prefs.diagramAppearance}
            onChange={handleDiagramAppearanceChange}
            canvasSetup={{
              diagramFont:
                (forkPendingAppearance ?? prefs.diagramAppearance).fontFamily,
              settingsLabels: true,
              onDiagramFontChange: (fontFamily) =>
                handleDiagramAppearanceChange({ fontFamily }),
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

          <hr className="theme-editor-divider" />

          <label className="field checkbox">
            <input
              type="checkbox"
              checked={prefs.swapBookmarkClickBehaviour}
              onChange={(e) =>
                updatePrefs({
                  swapBookmarkClickBehaviour: e.target.checked,
                })
              }
            />
            <span>{t("appSettings.swapBookmarkClickBehaviour")}</span>
          </label>
          <p className="hint">
            {t("appSettings.swapBookmarkClickBehaviourHint")}
          </p>
        </>
      );
      break;
    case "accessibility":
      content = (
        <>
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

          <label className="field checkbox">
            <input
              type="checkbox"
              checked={prefs.selectionPulseEnabled}
              onChange={(e) => {
                setSelectionPulseEnabled(e.target.checked);
                setPrefsState(getAppPreferences());
              }}
            />
            <span>{t("appSettings.selectionPulseEnabled")}</span>
          </label>
          <p className="hint">{t("appSettings.selectionPulseEnabledHint")}</p>

          <label className="field checkbox">
            <input
              type="checkbox"
              checked={prefs.lineLabelContrastWithBackground}
              onChange={(e) => {
                setLineLabelContrastWithBackground(e.target.checked);
                setPrefsState(getAppPreferences());
              }}
            />
            <span>{t("appSettings.lineLabelContrastWithBackground")}</span>
          </label>
          <p className="hint">
            {t("appSettings.lineLabelContrastWithBackgroundHint")}
          </p>
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

          <label className="field checkbox">
            <input
              type="checkbox"
              checked={prefs.confirmBeforeOpenExternalLink}
              onChange={(e) =>
                updatePrefs({
                  confirmBeforeOpenExternalLink: e.target.checked,
                })
              }
            />
            <span>{t("appSettings.confirmBeforeOpenExternalLink")}</span>
          </label>
          <p className="hint">
            {t("appSettings.confirmBeforeOpenExternalLinkHint")}
          </p>
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

          <DefaultFolderField
            label={t("appSettings.defaultExportDirectory")}
            hint={t("appSettings.defaultExportDirectoryHint")}
            value={prefs.defaultExportDirectory}
            onChange={(defaultExportDirectory) =>
              updatePrefs({ defaultExportDirectory })
            }
          />
        </>
      );
      break;
    case "data":
      content = (
        <>
          <DefaultFolderField
            label={t("appSettings.defaultDiagramDirectory")}
            hint={t("appSettings.defaultDiagramDirectoryHint")}
            value={prefs.defaultDiagramDirectory}
            onChange={(defaultDiagramDirectory) =>
              updatePrefs({ defaultDiagramDirectory })
            }
          />

          <hr className="theme-editor-divider" />

          <p className="hint">{t("appSettings.clearAutosaveHint")}</p>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => void handleClearAutosave()}
          >
            {t("appSettings.clearAutosaveData")}
          </button>
        </>
      );
      break;
    case "about":
      content = (
        <>
          <p>{t("app.name")}</p>
          <p className="hint">
            {t("appSettings.version", { version: packageJson.version })}
          </p>
          <p>
            <a
              className="text-link"
              href="https://github.com/Feldherren/RelationshipDiagram"
              target="_blank"
              rel="noopener noreferrer"
            >
              {t("appSettings.githubRepo")}
            </a>
          </p>
        </>
      );
      break;
  }

  return (
    <>
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
      <ForkDiagramThemeDialog
        open={forkDialogOpen}
        onCancel={handleForkDialogCancel}
        onConfirm={handleForkDialogConfirm}
      />
      <ApplyDiagramThemeDialog
        open={pendingThemeApply !== null}
        themeName={pendingThemeApply?.themeName ?? ""}
        remappableCount={pendingThemeApply?.remappableCount ?? 0}
        onCancel={handleApplyThemeCancel}
        onConfirm={handleApplyThemeConfirm}
      />
    </>
  );
}
