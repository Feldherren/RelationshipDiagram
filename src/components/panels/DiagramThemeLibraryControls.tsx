import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { DiagramAppearance } from "../../models/types";
import {
  getAppPreferences,
  setAppPreferences,
  type AppPreferences,
} from "../../utils/appPreferences";
import { downloadJson } from "../../utils/downloadJson";
import {
  BUILT_IN_DIAGRAM_THEME_IDS,
  DIAGRAM_THEME_FILE_EXTENSION,
  builtInDiagramThemeLabelKey,
  cloneDiagramAppearance,
  createDiagramThemeDocument,
  diagramThemeDocumentToJson,
  isBuiltInDiagramThemeId,
  parseDiagramThemeDocument,
  resolveDiagramThemeAppearance,
  slugifyDiagramThemeId,
  uniqueDiagramThemeId,
  type BuiltInDiagramThemeId,
  type DiagramThemeDocument,
  type DiagramThemePreference,
} from "../../utils/diagramAppearance";

function resolveThemeName(
  preference: DiagramThemePreference,
  customThemes: readonly DiagramThemeDocument[],
  builtInLabel: (id: BuiltInDiagramThemeId) => string,
  fallback: string,
): string {
  if (isBuiltInDiagramThemeId(preference)) return builtInLabel(preference);
  return (
    customThemes.find((theme) => theme.id === preference)?.name ?? fallback
  );
}

export interface DiagramThemeLibraryControlsProps {
  appearance: DiagramAppearance;
  /** Prefs snapshot; when omitted, reads from storage on each action. */
  prefs?: AppPreferences;
  onPrefsChange?: (prefs: AppPreferences) => void;
  /** When set, shows Apply and confirms before writing to the open diagram. */
  onApplyAppearance?: (appearance: DiagramAppearance) => void;
  hintKey?: string;
}

export function DiagramThemeLibraryControls({
  appearance,
  prefs: prefsProp,
  onPrefsChange,
  onApplyAppearance,
  hintKey = "appSettings.diagramThemesLibraryHint",
}: DiagramThemeLibraryControlsProps) {
  const { t } = useTranslation();
  const importInputRef = useRef<HTMLInputElement>(null);
  const defaultName = t("diagramAppearance.themeDefaultName");
  const builtInLabel = (id: BuiltInDiagramThemeId) =>
    t(builtInDiagramThemeLabelKey(id));

  const readPrefs = () => prefsProp ?? getAppPreferences();

  const [themeName, setThemeName] = useState(() => {
    const prefs = readPrefs();
    return resolveThemeName(
      prefs.diagramThemePreference,
      prefs.customDiagramThemes,
      builtInLabel,
      defaultName,
    );
  });
  const [newName, setNewName] = useState("");
  const [createBase, setCreateBase] =
    useState<DiagramThemePreference>("default");
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    const prefs = readPrefs();
    setThemeName(
      resolveThemeName(
        prefs.diagramThemePreference,
        prefs.customDiagramThemes,
        builtInLabel,
        defaultName,
      ),
    );
    if (
      !isBuiltInDiagramThemeId(createBase) &&
      !prefs.customDiagramThemes.some((theme) => theme.id === createBase)
    ) {
      setCreateBase("default");
    }
  }, [
    prefsProp?.diagramThemePreference,
    prefsProp?.customDiagramThemes,
    defaultName,
  ]);

  useEffect(() => {
    if (!status) return;
    const timer = window.setTimeout(() => setStatus(null), 4000);
    return () => window.clearTimeout(timer);
  }, [status]);

  const commitPrefs = (patch: Partial<AppPreferences>) => {
    const next = setAppPreferences({
      ...patch,
      ...(patch.diagramAppearance
        ? {
            defaultBackgroundMode: patch.diagramAppearance.backgroundMode,
            defaultBackgroundColor: patch.diagramAppearance.backgroundColor,
          }
        : {}),
    });
    onPrefsChange?.(next);
    return next;
  };

  const handleSelectTheme = (preference: DiagramThemePreference) => {
    const prefs = readPrefs();
    const nextAppearance = resolveDiagramThemeAppearance(
      preference,
      prefs.customDiagramThemes,
    );
    commitPrefs({
      diagramThemePreference: preference,
      diagramAppearance: nextAppearance,
    });
    setThemeName(
      resolveThemeName(
        preference,
        prefs.customDiagramThemes,
        builtInLabel,
        defaultName,
      ),
    );
    setStatus(null);
  };

  const handleCreate = () => {
    const prefs = readPrefs();
    const name = newName.trim() || defaultName;
    const id = uniqueDiagramThemeId(name, prefs.customDiagramThemes);
    const baseAppearance = resolveDiagramThemeAppearance(
      createBase,
      prefs.customDiagramThemes,
    );
    const theme = createDiagramThemeDocument(id, name, baseAppearance);
    commitPrefs({
      customDiagramThemes: [...prefs.customDiagramThemes, theme],
      diagramThemePreference: theme.id,
      diagramAppearance: theme.appearance,
    });
    setNewName("");
    setThemeName(theme.name);
    setStatus(t("diagramAppearance.themeCreatedFeedback", { name: theme.name }));
  };

  const handleSave = () => {
    const prefs = readPrefs();
    if (isBuiltInDiagramThemeId(prefs.diagramThemePreference)) {
      return;
    }
    const name = themeName.trim() || defaultName;
    const editing = prefs.customDiagramThemes.find(
      (theme) => theme.id === prefs.diagramThemePreference,
    );
    if (!editing) return;

    const updated: DiagramThemeDocument = {
      ...editing,
      name,
      appearance: cloneDiagramAppearance(appearance),
    };
    const customDiagramThemes = prefs.customDiagramThemes.map((theme) =>
      theme.id === editing.id ? updated : theme,
    );
    commitPrefs({
      customDiagramThemes,
      diagramThemePreference: updated.id,
      diagramAppearance: updated.appearance,
    });
    setThemeName(updated.name);
    setStatus(
      t("diagramAppearance.themeUpdatedFeedback", { name: updated.name }),
    );
  };

  const handleApplyToDiagram = () => {
    if (!onApplyAppearance) return;
    if (!window.confirm(t("appSettings.diagramThemeApplyConfirm"))) return;
    onApplyAppearance(cloneDiagramAppearance(appearance));
    setStatus(t("diagramAppearance.themeAppliedFeedback"));
  };

  const handleExport = () => {
    const prefs = readPrefs();
    const preference = prefs.diagramThemePreference;
    const custom = !isBuiltInDiagramThemeId(preference)
      ? prefs.customDiagramThemes.find((theme) => theme.id === preference)
      : undefined;
    const name = isBuiltInDiagramThemeId(preference)
      ? builtInLabel(preference)
      : themeName.trim() || custom?.name || defaultName;
    const theme =
      custom ??
      createDiagramThemeDocument(preference, name, appearance);
    downloadJson(
      `${slugifyDiagramThemeId(name)}${DIAGRAM_THEME_FILE_EXTENSION}`,
      diagramThemeDocumentToJson({
        ...theme,
        name,
        appearance: cloneDiagramAppearance(appearance),
      }),
    );
  };

  const handleImport = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as unknown;
      const result = parseDiagramThemeDocument(parsed);
      if (!result.ok) {
        setStatus(
          t(
            result.reason === "wrongKind"
              ? "diagramAppearance.themeImportWrongKind"
              : "diagramAppearance.themeImportInvalid",
          ),
        );
        return;
      }
      const parsedTheme = result.theme;
      const prefs = readPrefs();
      const theme = isBuiltInDiagramThemeId(parsedTheme.id)
        ? {
            ...parsedTheme,
            id: uniqueDiagramThemeId(
              parsedTheme.name,
              prefs.customDiagramThemes,
            ),
          }
        : parsedTheme;
      const existing = prefs.customDiagramThemes.filter(
        (entry) => entry.id !== theme.id,
      );
      commitPrefs({
        customDiagramThemes: [...existing, theme],
        diagramThemePreference: theme.id,
        diagramAppearance: theme.appearance,
      });
      setThemeName(theme.name);
      setStatus(
        t("diagramAppearance.themeImportedFeedback", { name: theme.name }),
      );
    } catch {
      setStatus(t("diagramAppearance.themeImportInvalid"));
    }
  };

  const handleRemove = (themeId: string, name: string) => {
    if (
      !window.confirm(t("appSettings.diagramThemeRemoveConfirm", { name }))
    ) {
      return;
    }
    const prefs = readPrefs();
    const customDiagramThemes = prefs.customDiagramThemes.filter(
      (theme) => theme.id !== themeId,
    );
    const wasActive = prefs.diagramThemePreference === themeId;
    const next = commitPrefs({
      customDiagramThemes,
      diagramThemePreference: wasActive
        ? "default"
        : prefs.diagramThemePreference,
      ...(wasActive
        ? {
            diagramAppearance: resolveDiagramThemeAppearance(
              "default",
              customDiagramThemes,
            ),
          }
        : {}),
    });
    setThemeName(
      resolveThemeName(
        next.diagramThemePreference,
        next.customDiagramThemes,
        builtInLabel,
        defaultName,
      ),
    );
    if (createBase === themeId) setCreateBase("default");
    setStatus(t("diagramAppearance.themeRemovedFeedback", { name }));
  };

  const handleExportListed = (themeId: string) => {
    const prefs = readPrefs();
    const theme = prefs.customDiagramThemes.find(
      (entry) => entry.id === themeId,
    );
    if (!theme) return;
    downloadJson(
      `${slugifyDiagramThemeId(theme.name)}${DIAGRAM_THEME_FILE_EXTENSION}`,
      diagramThemeDocumentToJson(theme),
    );
  };

  const prefs = readPrefs();
  const isBuiltInSelected = isBuiltInDiagramThemeId(
    prefs.diagramThemePreference,
  );
  const editingCustom =
    !isBuiltInSelected &&
    prefs.customDiagramThemes.some(
      (theme) => theme.id === prefs.diagramThemePreference,
    );

  const renderBuiltInOptions = () =>
    BUILT_IN_DIAGRAM_THEME_IDS.map((id) => (
      <option key={id} value={id}>
        {builtInLabel(id)}
      </option>
    ));

  const createBaseOptions = (
    <>
      {renderBuiltInOptions()}
      {prefs.customDiagramThemes.map((theme) => (
        <option key={theme.id} value={theme.id}>
          {theme.name}
        </option>
      ))}
    </>
  );

  return (
    <div className="diagram-theme-library">
      <p className="hint">{t(hintKey)}</p>

      {prefs.customDiagramThemes.length > 0 && (
        <ul className="custom-theme-list">
          {prefs.customDiagramThemes.map((theme) => {
            const selected = prefs.diagramThemePreference === theme.id;
            return (
              <li
                key={theme.id}
                className={`custom-theme-row${selected ? " selected" : ""}`}
              >
                <button
                  type="button"
                  className="custom-theme-select"
                  onClick={() => handleSelectTheme(theme.id)}
                >
                  <span style={{ flex: 1 }}>{theme.name}</span>
                  {selected && (
                    <span className="custom-theme-editing-badge">
                      {t("diagramAppearance.themeSelectedBadge")}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => handleExportListed(theme.id)}
                >
                  {t("appSettings.themeExport")}
                </button>
                <button
                  type="button"
                  className="btn-danger"
                  onClick={() => handleRemove(theme.id, theme.name)}
                >
                  {t("appSettings.themeRemove")}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="custom-theme-actions">
        <button
          type="button"
          className="btn-secondary"
          onClick={() => importInputRef.current?.click()}
        >
          {t("diagramAppearance.themeImport")}
        </button>
        <button type="button" className="btn-secondary" onClick={handleExport}>
          {t("appSettings.themeExportActive")}
        </button>
        <input
          ref={importInputRef}
          type="file"
          accept={`application/json,.json,${DIAGRAM_THEME_FILE_EXTENSION}`}
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) void handleImport(file);
          }}
        />
      </div>

      <hr className="theme-editor-divider" />

      <div className="theme-editor-create-row">
        <label className="field theme-editor-create-name">
          <span>{t("diagramAppearance.themeNewName")}</span>
          <input
            type="text"
            value={newName}
            placeholder={defaultName}
            onChange={(e) => setNewName(e.target.value)}
          />
        </label>
        <label className="field">
          <span>{t("diagramAppearance.themeCreateBase")}</span>
          <select
            value={createBase}
            onChange={(e) =>
              setCreateBase(e.target.value as DiagramThemePreference)
            }
          >
            {createBaseOptions}
          </select>
        </label>
        <button type="button" className="btn-secondary" onClick={handleCreate}>
          {t("diagramAppearance.themeCreate")}
        </button>
      </div>

      <hr className="theme-editor-divider" />

      <label className="field">
        <span>{t("diagramAppearance.themeSelected")}</span>
        <select
          value={prefs.diagramThemePreference}
          onChange={(e) =>
            handleSelectTheme(e.target.value as DiagramThemePreference)
          }
        >
          {renderBuiltInOptions()}
          {prefs.customDiagramThemes.map((theme) => (
            <option key={theme.id} value={theme.id}>
              {theme.name}
            </option>
          ))}
        </select>
      </label>
      <p className="hint">
        {isBuiltInSelected
          ? t("diagramAppearance.themeSelectedDefaultHint")
          : t("diagramAppearance.themeSelectedCustomHint", {
              name: themeName,
            })}
      </p>

      {editingCustom && (
        <label className="field">
          <span>{t("diagramAppearance.themeName")}</span>
          <input
            type="text"
            value={themeName}
            placeholder={defaultName}
            onChange={(e) => {
              setThemeName(e.target.value);
              setStatus(null);
            }}
          />
        </label>
      )}

      <div className="custom-theme-actions">
        {editingCustom && (
          <button type="button" className="btn-primary" onClick={handleSave}>
            {t("diagramAppearance.themeSave")}
          </button>
        )}
        {onApplyAppearance && (
          <button
            type="button"
            className="btn-secondary"
            onClick={handleApplyToDiagram}
          >
            {t("appSettings.diagramThemeApply")}
          </button>
        )}
      </div>

      {status && <p className="hint diagram-theme-status">{status}</p>}
    </div>
  );
}
