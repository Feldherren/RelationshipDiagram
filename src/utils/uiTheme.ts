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
 *   "kind": "uiTheme",
 *   "tokens": {
 *     "--ui-bg": "#1a1d22",
 *     "--ui-surface": "#242830",
 *     "--ui-text": "#eceff4"
 *   }
 * }
 *
 * Export extension: `.rd-ui-theme` (legacy `.json` still accepted on import).
 */

export const UI_THEME_KIND = "uiTheme" as const;
export const UI_THEME_FILE_EXTENSION = ".rd-ui-theme";
export type UiThemeKind = typeof UI_THEME_KIND;

/** Default chrome font stack (matches previous App.css). */
export const DEFAULT_UI_FONT =
  'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

/** Appended when a custom UI font is chosen and may be missing. */
export const UI_FONT_FALLBACK = "Arial, sans-serif";

export const UI_TOKEN_KEYS = [
  "--ui-font-family",
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
  kind: UiThemeKind;
  tokens: Partial<UiTokenMap>;
}

export type ThemeDocumentParseResult =
  | { ok: true; theme: ThemeDocument }
  | { ok: false; reason: "invalid" | "wrongKind" };

export const LIGHT_THEME_TOKENS: UiTokenMap = {
  "--ui-font-family": DEFAULT_UI_FONT,
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
  "--ui-font-family": DEFAULT_UI_FONT,
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

export function parseThemeDocument(raw: unknown): ThemeDocumentParseResult {
  if (typeof raw !== "object" || raw === null) {
    return { ok: false, reason: "invalid" };
  }
  const record = raw as Record<string, unknown>;
  if (record.schemaVersion !== 1) {
    return { ok: false, reason: "invalid" };
  }

  const kind = record.kind;
  if (kind === "diagramTheme") {
    return { ok: false, reason: "wrongKind" };
  }
  if (kind !== undefined && kind !== UI_THEME_KIND) {
    return { ok: false, reason: "invalid" };
  }

  const hasAppearance =
    typeof record.appearance === "object" && record.appearance !== null;
  const hasTokensObject =
    typeof record.tokens === "object" && record.tokens !== null;

  // Legacy files omit kind; reject dual-payload and treat appearance-only as wrong kind.
  if (kind === undefined) {
    if (hasAppearance && hasTokensObject) {
      return { ok: false, reason: "invalid" };
    }
    if (hasAppearance && !hasTokensObject) {
      return { ok: false, reason: "wrongKind" };
    }
  } else if (hasAppearance) {
    return { ok: false, reason: "invalid" };
  }

  if (typeof record.id !== "string" || !record.id.trim()) {
    return { ok: false, reason: "invalid" };
  }
  if (typeof record.name !== "string" || !record.name.trim()) {
    return { ok: false, reason: "invalid" };
  }
  if (!hasTokensObject) {
    return { ok: false, reason: "invalid" };
  }

  const tokens = normalizeTokenPartial(
    record.tokens as Partial<UiTokenMap>,
  );
  if (Object.keys(tokens).length === 0) {
    return { ok: false, reason: "invalid" };
  }

  return {
    ok: true,
    theme: {
      id: record.id.trim(),
      name: record.name.trim(),
      schemaVersion: 1,
      kind: UI_THEME_KIND,
      tokens,
    },
  };
}

export function validateThemeDocument(raw: unknown): ThemeDocument | null {
  const result = parseThemeDocument(raw);
  return result.ok ? result.theme : null;
}

export function themeDocumentToJson(theme: ThemeDocument): string {
  return JSON.stringify(
    {
      id: theme.id,
      name: theme.name,
      schemaVersion: 1,
      kind: UI_THEME_KIND,
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
    kind: UI_THEME_KIND,
    tokens: { ...tokens },
  };
}

/** Groups for the visual theme editor (label keys under appSettings.token*). */
export function isDefaultUiFont(fontFamily: string): boolean {
  return fontFamily.trim() === DEFAULT_UI_FONT;
}

/** CSS font-family value with Arial fallback for custom families. */
export function toUiFontFamilyCss(fontFamily: string): string {
  const trimmed = fontFamily.trim();
  if (!trimmed || isDefaultUiFont(trimmed)) return DEFAULT_UI_FONT;
  if (trimmed === UI_FONT_FALLBACK || trimmed === "Arial") {
    return UI_FONT_FALLBACK;
  }
  if (trimmed.includes(",")) {
    // Already a stack; ensure Arial appears before generic sans-serif if missing.
    if (/\barial\b/i.test(trimmed)) return trimmed;
    return trimmed.replace(/\bsans-serif\s*$/i, "Arial, sans-serif");
  }
  const family = trimmed.replace(/^["']|["']$/g, "");
  return `"${family}", ${UI_FONT_FALLBACK}`;
}

/** Value for FontPicker selection (default sentinel or bare family name). */
export function uiFontPickerValue(cssFontFamily: string): string {
  const trimmed = cssFontFamily.trim();
  if (!trimmed || isDefaultUiFont(trimmed)) return DEFAULT_UI_FONT;
  if (trimmed === UI_FONT_FALLBACK || /^arial\b/i.test(trimmed)) return "Arial";
  const primary = trimmed.match(/^"([^"]+)"|^'([^']+)'|^([^,]+)/);
  const name = (primary?.[1] ?? primary?.[2] ?? primary?.[3] ?? trimmed).trim();
  return name;
}

export const UI_TOKEN_GROUPS: readonly {
  id: string;
  labelKey: string;
  keys: readonly UiTokenKey[];
}[] = [
  {
    id: "surfaces",
    labelKey: "tokenGroupSurfaces",
    keys: [
      "--ui-bg",
      "--ui-surface",
      "--ui-surface-hover",
      "--ui-surface-muted",
      "--ui-input-bg",
    ],
  },
  {
    id: "borders",
    labelKey: "tokenGroupBorders",
    keys: ["--ui-border", "--ui-border-strong"],
  },
  {
    id: "text",
    labelKey: "tokenGroupText",
    keys: [
      "--ui-text",
      "--ui-text-muted",
      "--ui-text-subtle",
      "--ui-section-heading",
    ],
  },
  {
    id: "accent",
    labelKey: "tokenGroupAccent",
    keys: [
      "--ui-accent",
      "--ui-accent-hover",
      "--ui-accent-text",
      "--ui-accent-soft",
      "--ui-danger",
    ],
  },
  {
    id: "effects",
    labelKey: "tokenGroupEffects",
    keys: ["--ui-overlay", "--ui-shadow"],
  },
  {
    id: "checker",
    labelKey: "tokenGroupChecker",
    keys: ["--ui-check-a", "--ui-check-b"],
  },
  {
    id: "swatches",
    labelKey: "tokenGroupSwatches",
    keys: ["--ui-swatch-ring", "--ui-swatch-ring-outer"],
  },
];

export const UI_TOKEN_LABEL_KEYS: Record<UiTokenKey, string> = {
  "--ui-font-family": "tokenFontFamily",
  "--ui-bg": "tokenBg",
  "--ui-surface": "tokenSurface",
  "--ui-surface-hover": "tokenSurfaceHover",
  "--ui-surface-muted": "tokenSurfaceMuted",
  "--ui-border": "tokenBorder",
  "--ui-border-strong": "tokenBorderStrong",
  "--ui-text": "tokenText",
  "--ui-text-muted": "tokenTextMuted",
  "--ui-text-subtle": "tokenTextSubtle",
  "--ui-accent": "tokenAccent",
  "--ui-accent-hover": "tokenAccentHover",
  "--ui-accent-text": "tokenAccentText",
  "--ui-accent-soft": "tokenAccentSoft",
  "--ui-danger": "tokenDanger",
  "--ui-overlay": "tokenOverlay",
  "--ui-shadow": "tokenShadow",
  "--ui-check-a": "tokenCheckA",
  "--ui-check-b": "tokenCheckB",
  "--ui-swatch-ring": "tokenSwatchRing",
  "--ui-swatch-ring-outer": "tokenSwatchRingOuter",
  "--ui-input-bg": "tokenInputBg",
  "--ui-section-heading": "tokenSectionHeading",
};

export function expandThemeTokens(
  tokens: Partial<UiTokenMap> | undefined,
): UiTokenMap {
  return { ...LIGHT_THEME_TOKENS, ...normalizeTokenPartial(tokens) };
}

export function slugifyThemeId(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "theme";
}

export function uniqueThemeId(
  name: string,
  existing: readonly ThemeDocument[],
): string {
  const base = slugifyThemeId(name);
  const used = new Set(existing.map((theme) => theme.id));
  if (!used.has(base)) return base;
  let n = 2;
  while (used.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

/** Hex suitable for `<input type="color">`, or null if not a solid hex/rgb colour. */
export function cssColorToHexInput(value: string): string | null {
  const trimmed = value.trim();
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(trimmed);
  if (hex) {
    const raw = hex[1]!;
    if (raw.length === 3) {
      return `#${raw[0]}${raw[0]}${raw[1]}${raw[1]}${raw[2]}${raw[2]}`.toLowerCase();
    }
    return `#${raw.toLowerCase()}`;
  }
  const rgb =
    /^rgba\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i.exec(trimmed);
  if (rgb) {
    const r = Math.min(255, Number(rgb[1]));
    const g = Math.min(255, Number(rgb[2]));
    const b = Math.min(255, Number(rgb[3]));
    return (
      "#" +
      [r, g, b]
        .map((c) => c.toString(16).padStart(2, "0"))
        .join("")
        .toLowerCase()
    );
  }
  return null;
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
