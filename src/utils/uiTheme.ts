/**
 * UI chrome theme tokens.
 *
 * Custom theme JSON uses the same keys under `tokens`. Unknown keys are ignored;
 * missing keys fall back to the light built-in map so partial themes still work.
 *
 * Example theme file:
 * {
 *   "id": "my-slate",
 *   "name": "Slate",
 *   "schemaVersion": 1,
 *   "tokens": {
 *     "--ui-bg": "#1a1d22",
 *     "--ui-surface": "#242830",
 *     "--ui-text": "#eceff4"
 *   }
 * }
 */

export const UI_TOKEN_KEYS = [
  "--ui-bg",
  "--ui-surface",
  "--ui-surface-hover",
  "--ui-surface-muted",
  "--ui-border",
  "--ui-border-strong",
  "--ui-text",
  "--ui-text-muted",
  "--ui-text-subtle",
  "--ui-accent",
  "--ui-accent-hover",
  "--ui-accent-text",
  "--ui-accent-soft",
  "--ui-danger",
  "--ui-overlay",
  "--ui-shadow",
  "--ui-check-a",
  "--ui-check-b",
  "--ui-swatch-ring",
  "--ui-swatch-ring-outer",
  "--ui-input-bg",
  "--ui-section-heading",
] as const;

export type UiTokenKey = (typeof UI_TOKEN_KEYS)[number];

export type UiTokenMap = Record<UiTokenKey, string>;

export type BuiltInThemeId = "light" | "dark";

/** Built-in theme ids, or a custom theme document id. */
export type ThemePreference = "system" | BuiltInThemeId | string;

export const UI_SCALE_OPTIONS = [0.9, 1, 1.1, 1.25] as const;
export type UiScale = (typeof UI_SCALE_OPTIONS)[number];

export const BASE_ROOT_FONT_SIZE_PX = 16;

export interface ThemeDocument {
  id: string;
  name: string;
  schemaVersion: 1;
  tokens: Partial<UiTokenMap>;
}

export const LIGHT_THEME_TOKENS: UiTokenMap = {
  "--ui-bg": "#f4f5f7",
  "--ui-surface": "#ffffff",
  "--ui-surface-hover": "#f0f2f5",
  "--ui-surface-muted": "#fafbfc",
  "--ui-border": "#c8cdd3",
  "--ui-border-strong": "#dde1e6",
  "--ui-text": "#1a1a1a",
  "--ui-text-muted": "#444444",
  "--ui-text-subtle": "#666666",
  "--ui-accent": "#4a90d9",
  "--ui-accent-hover": "#3a7bc8",
  "--ui-accent-text": "#ffffff",
  "--ui-accent-soft": "#e8f1fb",
  "--ui-danger": "#e74c3c",
  "--ui-overlay": "rgba(0, 0, 0, 0.4)",
  "--ui-shadow": "rgba(0, 0, 0, 0.12)",
  "--ui-check-a": "#ffffff",
  "--ui-check-b": "#e4e6ea",
  "--ui-swatch-ring": "#2f3a45",
  "--ui-swatch-ring-outer": "#ffffff",
  "--ui-input-bg": "#ffffff",
  "--ui-section-heading": "#5a6570",
};

export const DARK_THEME_TOKENS: UiTokenMap = {
  "--ui-bg": "#1a1d22",
  "--ui-surface": "#242830",
  "--ui-surface-hover": "#2e333c",
  "--ui-surface-muted": "#1f2329",
  "--ui-border": "#3d4450",
  "--ui-border-strong": "#4a5160",
  "--ui-text": "#eceff4",
  "--ui-text-muted": "#c0c5ce",
  "--ui-text-subtle": "#9aa3ad",
  "--ui-accent": "#5b9fd4",
  "--ui-accent-hover": "#4a90d9",
  "--ui-accent-text": "#ffffff",
  "--ui-accent-soft": "#2a3a4d",
  "--ui-danger": "#e57373",
  "--ui-overlay": "rgba(0, 0, 0, 0.55)",
  "--ui-shadow": "rgba(0, 0, 0, 0.35)",
  "--ui-check-a": "#2a2e36",
  "--ui-check-b": "#3d4450",
  "--ui-swatch-ring": "#eceff4",
  "--ui-swatch-ring-outer": "#242830",
  "--ui-input-bg": "#1f2329",
  "--ui-section-heading": "#9aa3ad",
};

export const BUILT_IN_THEMES: Record<BuiltInThemeId, UiTokenMap> = {
  light: LIGHT_THEME_TOKENS,
  dark: DARK_THEME_TOKENS,
};

export function isBuiltInThemeId(value: string): value is BuiltInThemeId {
  return value === "light" || value === "dark";
}

export function isUiScale(value: unknown): value is UiScale {
  return (
    typeof value === "number" &&
    (UI_SCALE_OPTIONS as readonly number[]).includes(value)
  );
}

export function getSystemColorScheme(): BuiltInThemeId {
  if (typeof window === "undefined" || !window.matchMedia) return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function resolveThemeTokens(
  preference: ThemePreference,
  customThemes: readonly ThemeDocument[],
): { tokens: UiTokenMap; resolvedId: string } {
  if (preference === "system") {
    const id = getSystemColorScheme();
    return { tokens: BUILT_IN_THEMES[id], resolvedId: id };
  }
  if (isBuiltInThemeId(preference)) {
    return { tokens: BUILT_IN_THEMES[preference], resolvedId: preference };
  }
  const custom = customThemes.find((theme) => theme.id === preference);
  if (custom) {
    return {
      tokens: { ...LIGHT_THEME_TOKENS, ...normalizeTokenPartial(custom.tokens) },
      resolvedId: custom.id,
    };
  }
  return { tokens: LIGHT_THEME_TOKENS, resolvedId: "light" };
}

function normalizeTokenPartial(
  tokens: Partial<UiTokenMap> | undefined,
): Partial<UiTokenMap> {
  if (!tokens || typeof tokens !== "object") return {};
  const result: Partial<UiTokenMap> = {};
  for (const key of UI_TOKEN_KEYS) {
    const value = tokens[key];
    if (typeof value === "string" && value.trim()) {
      result[key] = value.trim();
    }
  }
  return result;
}

export function applyThemeTokens(
  tokens: UiTokenMap,
  root: HTMLElement = document.documentElement,
): void {
  for (const key of UI_TOKEN_KEYS) {
    root.style.setProperty(key, tokens[key]);
  }
}

export function applyUiScale(
  scale: UiScale,
  root: HTMLElement = document.documentElement,
): void {
  root.style.setProperty("--ui-scale", String(scale));
  root.style.fontSize = `${BASE_ROOT_FONT_SIZE_PX * scale}px`;
}

export function applyAppearance(
  preference: ThemePreference,
  customThemes: readonly ThemeDocument[],
  uiScale: UiScale,
  root: HTMLElement = document.documentElement,
): void {
  const { tokens, resolvedId } = resolveThemeTokens(preference, customThemes);
  applyThemeTokens(tokens, root);
  applyUiScale(uiScale, root);
  root.dataset.uiTheme = resolvedId;
  root.dataset.uiThemePreference = preference;
}

export function validateThemeDocument(raw: unknown): ThemeDocument | null {
  if (typeof raw !== "object" || raw === null) return null;
  const record = raw as Record<string, unknown>;
  if (record.schemaVersion !== 1) return null;
  if (typeof record.id !== "string" || !record.id.trim()) return null;
  if (typeof record.name !== "string" || !record.name.trim()) return null;
  if (typeof record.tokens !== "object" || record.tokens === null) return null;

  const tokens = normalizeTokenPartial(
    record.tokens as Partial<UiTokenMap>,
  );
  if (Object.keys(tokens).length === 0) return null;

  return {
    id: record.id.trim(),
    name: record.name.trim(),
    schemaVersion: 1,
    tokens,
  };
}

export function themeDocumentToJson(theme: ThemeDocument): string {
  return JSON.stringify(
    {
      id: theme.id,
      name: theme.name,
      schemaVersion: 1,
      tokens: theme.tokens,
    },
    null,
    2,
  );
}

export function createThemeFromCurrentTokens(
  id: string,
  name: string,
  preference: ThemePreference,
  customThemes: readonly ThemeDocument[],
): ThemeDocument {
  const { tokens } = resolveThemeTokens(preference, customThemes);
  return {
    id,
    name,
    schemaVersion: 1,
    tokens: { ...tokens },
  };
}

let systemThemeListener: ((event: MediaQueryListEvent) => void) | null = null;
let systemMediaQuery: MediaQueryList | null = null;

export function syncSystemThemeListener(
  preference: ThemePreference,
  onChange: () => void,
): void {
  if (typeof window === "undefined" || !window.matchMedia) return;

  if (systemMediaQuery && systemThemeListener) {
    systemMediaQuery.removeEventListener("change", systemThemeListener);
  }
  systemMediaQuery = null;
  systemThemeListener = null;

  if (preference !== "system") return;

  systemMediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  systemThemeListener = () => onChange();
  systemMediaQuery.addEventListener("change", systemThemeListener);
}
