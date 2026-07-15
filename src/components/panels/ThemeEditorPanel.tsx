import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { reapplyUiAppearanceFromPrefs } from "../../hooks/useUiAppearance";
import type { ThemeDocument, UiTokenKey, UiTokenMap } from "../../utils/uiTheme";
import {
  BUILT_IN_THEMES,
  DEFAULT_UI_FONT,
  UI_TOKEN_GROUPS,
  UI_TOKEN_LABEL_KEYS,
  applyThemeTokens,
  cssColorToHexInput,
  expandThemeTokens,
  toUiFontFamilyCss,
  uiFontPickerValue,
  uniqueThemeId,
} from "../../utils/uiTheme";
import { FontPicker } from "./FontPicker";

interface ThemeEditorPanelProps {
  customThemes: ThemeDocument[];
  onThemesChange: (themes: ThemeDocument[], activateId?: string) => void;
}

function resolveCreateBaseTokens(
  baseId: string,
  customThemes: readonly ThemeDocument[],
): UiTokenMap {
  if (baseId === "light" || baseId === "dark") {
    return { ...BUILT_IN_THEMES[baseId] };
  }
  const custom = customThemes.find((theme) => theme.id === baseId);
  if (custom) return expandThemeTokens(custom.tokens);
  return { ...BUILT_IN_THEMES.light };
}

export function ThemeEditorPanel({
  customThemes,
  onThemesChange,
}: ThemeEditorPanelProps) {
  const { t } = useTranslation();
  const [editingId, setEditingId] = useState<string | null>(
    customThemes[0]?.id ?? null,
  );
  const [draftName, setDraftName] = useState("");
  const [draftTokens, setDraftTokens] = useState<UiTokenMap>(
    () => BUILT_IN_THEMES.light,
  );
  const [dirty, setDirty] = useState(false);
  const [newName, setNewName] = useState("");
  const [createBase, setCreateBase] = useState("light");

  const editingTheme = customThemes.find((theme) => theme.id === editingId);

  const createBaseOptions = (
    <>
      <option value="light">{t("appSettings.themeLight")}</option>
      <option value="dark">{t("appSettings.themeDark")}</option>
      {customThemes.map((theme) => (
        <option key={theme.id} value={theme.id}>
          {theme.name}
        </option>
      ))}
    </>
  );

  useEffect(() => {
    if (createBase === "light" || createBase === "dark") return;
    if (!customThemes.some((theme) => theme.id === createBase)) {
      setCreateBase("light");
    }
  }, [createBase, customThemes]);

  useEffect(() => {
    if (!editingId) return;
    const theme = customThemes.find((entry) => entry.id === editingId);
    if (!theme) {
      setEditingId(customThemes[0]?.id ?? null);
      return;
    }
    if (dirty) return;
    setDraftName(theme.name);
    setDraftTokens(expandThemeTokens(theme.tokens));
  }, [editingId, customThemes, dirty]);

  useEffect(() => {
    if (!editingId) {
      reapplyUiAppearanceFromPrefs();
      return;
    }
    applyThemeTokens(draftTokens);
  }, [draftTokens, editingId]);

  useEffect(() => {
    return () => {
      reapplyUiAppearanceFromPrefs();
    };
  }, []);

  const updateToken = (key: UiTokenKey, value: string) => {
    setDirty(true);
    setDraftTokens((prev) => ({ ...prev, [key]: value }));
  };

  const handleSelectTheme = (id: string) => {
    if (dirty && !window.confirm(t("appSettings.themeEditorDiscardConfirm"))) {
      return;
    }
    setDirty(false);
    setEditingId(id);
    const theme = customThemes.find((entry) => entry.id === id);
    if (theme) {
      setDraftName(theme.name);
      setDraftTokens(expandThemeTokens(theme.tokens));
    }
  };

  const handleCreate = () => {
    const name = newName.trim() || t("appSettings.themeEditorDefaultName");
    if (dirty && !window.confirm(t("appSettings.themeEditorDiscardConfirm"))) {
      return;
    }
    const id = uniqueThemeId(name, customThemes);
    const theme: ThemeDocument = {
      id,
      name,
      schemaVersion: 1,
      tokens: resolveCreateBaseTokens(createBase, customThemes),
    };
    onThemesChange([...customThemes, theme], id);
    setNewName("");
    setDirty(false);
    setEditingId(id);
    setDraftName(theme.name);
    setDraftTokens(expandThemeTokens(theme.tokens));
  };

  const handleSave = () => {
    if (!editingId) return;
    const name = draftName.trim() || t("appSettings.themeEditorDefaultName");
    const nextThemes = customThemes.map((theme) =>
      theme.id === editingId
        ? {
            ...theme,
            name,
            tokens: { ...draftTokens },
          }
        : theme,
    );
    onThemesChange(nextThemes, editingId);
    setDirty(false);
    setDraftName(name);
  };

  const handleRevert = () => {
    if (!editingTheme) return;
    setDraftName(editingTheme.name);
    setDraftTokens(expandThemeTokens(editingTheme.tokens));
    setDirty(false);
  };

  if (customThemes.length === 0 || !editingId) {
    return (
      <div className="theme-editor">
        <p className="hint">{t("appSettings.themeEditorEmptyHint")}</p>
        <label className="field">
          <span>{t("appSettings.themeEditorNewName")}</span>
          <input
            type="text"
            value={newName}
            placeholder={t("appSettings.themeEditorDefaultName")}
            onChange={(e) => setNewName(e.target.value)}
          />
        </label>
        <label className="field">
          <span>{t("appSettings.themeEditorBase")}</span>
          <select
            value={createBase}
            onChange={(e) => setCreateBase(e.target.value)}
          >
            {createBaseOptions}
          </select>
        </label>
        <button type="button" className="btn-primary" onClick={handleCreate}>
          {t("appSettings.themeEditorCreate")}
        </button>
      </div>
    );
  }

  return (
    <div className="theme-editor">
      <p className="hint">{t("appSettings.themeEditorHint")}</p>

      <div className="theme-editor-create-row">
        <label className="field theme-editor-create-name">
          <span>{t("appSettings.themeEditorNewName")}</span>
          <input
            type="text"
            value={newName}
            placeholder={t("appSettings.themeEditorDefaultName")}
            onChange={(e) => setNewName(e.target.value)}
          />
        </label>
        <label className="field">
          <span>{t("appSettings.themeEditorBase")}</span>
          <select
            value={createBase}
            onChange={(e) => setCreateBase(e.target.value)}
          >
            {createBaseOptions}
          </select>
        </label>
        <button type="button" className="btn-secondary" onClick={handleCreate}>
          {t("appSettings.themeEditorCreate")}
        </button>
      </div>

      <hr className="theme-editor-divider" />

      <label className="field">
        <span>{t("appSettings.themeEditorEditing")}</span>
        <select
          value={editingId}
          onChange={(e) => handleSelectTheme(e.target.value)}
        >
          {customThemes.map((theme) => (
            <option key={theme.id} value={theme.id}>
              {theme.name}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span>{t("appSettings.themeEditorName")}</span>
        <input
          type="text"
          value={draftName}
          onChange={(e) => {
            setDirty(true);
            setDraftName(e.target.value);
          }}
        />
      </label>

      <fieldset className="theme-editor-group">
        <legend>{t("appSettings.tokenGroupTypography")}</legend>
        <div className="field">
          <span>{t("appSettings.tokenFontFamily")}</span>
          <FontPicker
            value={uiFontPickerValue(draftTokens["--ui-font-family"])}
            defaultValue={DEFAULT_UI_FONT}
            defaultLabel={t("appSettings.themeEditorFontDefault")}
            onChange={(family) =>
              updateToken("--ui-font-family", toUiFontFamilyCss(family))
            }
          />
        </div>
        <p className="hint">{t("appSettings.themeEditorFontHint")}</p>
      </fieldset>

      {UI_TOKEN_GROUPS.map((group) => (
        <fieldset key={group.id} className="theme-editor-group">
          <legend>{t(`appSettings.${group.labelKey}`)}</legend>
          <div className="theme-editor-swatches">
            {group.keys.map((key) => {
              const value = draftTokens[key];
              const hex = cssColorToHexInput(value);
              const label = t(`appSettings.${UI_TOKEN_LABEL_KEYS[key]}`);
              return (
                <label key={key} className="theme-editor-swatch">
                  <span className="theme-editor-swatch-label">{label}</span>
                  <div className="theme-editor-swatch-controls">
                    {hex ? (
                      <input
                        type="color"
                        className="theme-editor-color"
                        value={hex}
                        aria-label={label}
                        onChange={(e) => updateToken(key, e.target.value)}
                      />
                    ) : (
                      <span
                        className="theme-editor-color-fallback"
                        style={{ background: value }}
                        title={value}
                        aria-hidden
                      />
                    )}
                    <input
                      type="text"
                      className="theme-editor-value"
                      value={value}
                      spellCheck={false}
                      aria-label={`${label} CSS`}
                      onChange={(e) => updateToken(key, e.target.value)}
                    />
                  </div>
                </label>
              );
            })}
          </div>
        </fieldset>
      ))}

      <div className="theme-editor-actions">
        <button
          type="button"
          className="btn-primary"
          disabled={!dirty}
          onClick={handleSave}
        >
          {t("appSettings.themeEditorSave")}
        </button>
        <button
          type="button"
          className="btn-secondary"
          disabled={!dirty}
          onClick={handleRevert}
        >
          {t("appSettings.themeEditorRevert")}
        </button>
      </div>
      {dirty && <p className="hint">{t("appSettings.themeEditorUnsaved")}</p>}
    </div>
  );
}
