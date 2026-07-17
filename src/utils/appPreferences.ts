import type { DiagramAppearance, RGB } from "../models/types";
import { DEFAULT_DIAGRAM_FONT } from "./diagramFont";
import {
  DEFAULT_DIAGRAM_BACKGROUND,
  type DiagramBackgroundMode,
} from "./diagramBackground";
import {
  cloneDiagramAppearance,
  DEFAULT_DIAGRAM_APPEARANCE,
  resolveDiagramAppearance,
  validateDiagramThemeDocument,
  type DiagramThemeDocument,
  type DiagramThemePreference,
} from "./diagramAppearance";
import {
  isUiScale,
  validateThemeDocument,
  type ThemeDocument,
  type ThemePreference,
  type UiScale,
} from "./uiTheme";
import { exportZoomRatioFromPercent } from "./exportZoom";

const STORAGE_KEY = "appPreferences";

export type ExportBoundsMode = "auto" | "custom";

export interface AppPreferences {
  autosaveEnabled: boolean;
  confirmBeforeNewDiagram: boolean;
  defaultBackgroundMode: DiagramBackgroundMode;
  defaultShowHeader: boolean;
  defaultBackgroundColor: RGB | null;
  defaultDiagramFont: string;
  diagramAppearance: DiagramAppearance;
  diagramThemePreference: DiagramThemePreference;
  customDiagramThemes: DiagramThemeDocument[];
  defaultExportPadding: number;
  /** Export scale multiplier (1 = 100%, 2 = 200%). */
  defaultExportPixelRatio: number;
  defaultExportBoundsMode: ExportBoundsMode;
  /** Folder for save/open dialogs; unset uses the OS default. */
  defaultDiagramDirectory: string | null;
  /** Folder for PNG export dialogs; unset uses the OS default. */
  defaultExportDirectory: string | null;
  themePreference: ThemePreference;
  uiScale: UiScale;
  customThemes: ThemeDocument[];
  /** Whether bookmark flags are shown on the canvas. */
  bookmarksVisible: boolean;
  /** Whether selected canvas items show a pulsing highlight. */
  selectionPulseEnabled: boolean;
  /**
   * When true, line label text uses high-contrast ink against the label
   * background. When false (default), label text matches the line colour.
   */
  lineLabelContrastWithBackground: boolean;
}

export const DEFAULT_APP_PREFERENCES: AppPreferences = {
  autosaveEnabled: true,
  confirmBeforeNewDiagram: true,
  defaultBackgroundMode: "grid",
  defaultShowHeader: true,
  defaultBackgroundColor: DEFAULT_DIAGRAM_BACKGROUND,
  defaultDiagramFont: DEFAULT_DIAGRAM_FONT,
  diagramAppearance: cloneDiagramAppearance(DEFAULT_DIAGRAM_APPEARANCE),
  diagramThemePreference: "default",
  customDiagramThemes: [],
  defaultExportPadding: 32,
  defaultExportPixelRatio: 1,
  defaultExportBoundsMode: "auto",
  defaultDiagramDirectory: null,
  defaultExportDirectory: null,
  themePreference: "system",
  uiScale: 1,
  customThemes: [],
  bookmarksVisible: true,
  selectionPulseEnabled: true,
  lineLabelContrastWithBackground: false,
};

function isBackgroundMode(value: unknown): value is DiagramBackgroundMode {
  return (
    value === "plain" ||
    value === "blank" ||
    value === "grid" ||
    value === "dots"
  );
}

function isExportBoundsMode(value: unknown): value is ExportBoundsMode {
  return value === "auto" || value === "custom";
}

function isRgb(value: unknown): value is RGB {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.r === "number" &&
    typeof v.g === "number" &&
    typeof v.b === "number"
  );
}

function isThemePreference(value: unknown): value is ThemePreference {
  return typeof value === "string" && value.trim().length > 0;
}

function parseCustomThemes(value: unknown): ThemeDocument[] {
  if (!Array.isArray(value)) return [];
  const themes: ThemeDocument[] = [];
  const seen = new Set<string>();
  for (const entry of value) {
    const theme = validateThemeDocument(entry);
    if (!theme || seen.has(theme.id)) continue;
    seen.add(theme.id);
    themes.push(theme);
  }
  return themes;
}

function parseCustomDiagramThemes(value: unknown): DiagramThemeDocument[] {
  if (!Array.isArray(value)) return [];
  const themes: DiagramThemeDocument[] = [];
  const seen = new Set<string>();
  for (const entry of value) {
    const theme = validateDiagramThemeDocument(entry);
    if (!theme || theme.id === "default" || seen.has(theme.id)) continue;
    seen.add(theme.id);
    themes.push(theme);
  }
  return themes;
}

function isDiagramThemePreference(
  value: unknown,
): value is DiagramThemePreference {
  return typeof value === "string" && value.trim().length > 0;
}

function parseOptionalDirectory(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function migrateLegacyBackgroundMode(
  stored: Record<string, unknown>,
  defaultBackgroundColor: RGB | null,
): DiagramBackgroundMode {
  if (defaultBackgroundColor === null) return "blank";
  if (stored.defaultShowGrid === false) return "plain";
  if (stored.defaultGridStyle === "dots") return "dots";
  return "grid";
}

function parseStoredPreferences(raw: unknown): AppPreferences {
  if (typeof raw !== "object" || raw === null) {
    return { ...DEFAULT_APP_PREFERENCES };
  }

  const stored = raw as Record<string, unknown>;
  const defaults = DEFAULT_APP_PREFERENCES;

  const defaultBackgroundColor =
    stored.defaultBackgroundColor === null
      ? null
      : isRgb(stored.defaultBackgroundColor)
        ? { ...(stored.defaultBackgroundColor as RGB) }
        : defaults.defaultBackgroundColor;

  const defaultBackgroundMode = isBackgroundMode(stored.defaultBackgroundMode)
    ? stored.defaultBackgroundMode
    : migrateLegacyBackgroundMode(stored, defaultBackgroundColor);

  const customThemes = parseCustomThemes(stored.customThemes);
  let themePreference: ThemePreference = isThemePreference(stored.themePreference)
    ? stored.themePreference.trim()
    : defaults.themePreference;

  if (
    themePreference !== "system" &&
    themePreference !== "light" &&
    themePreference !== "dark" &&
    !customThemes.some((theme) => theme.id === themePreference)
  ) {
    themePreference = defaults.themePreference;
  }

  const customDiagramThemes = parseCustomDiagramThemes(
    stored.customDiagramThemes,
  );
  let diagramThemePreference: DiagramThemePreference =
    isDiagramThemePreference(stored.diagramThemePreference)
      ? stored.diagramThemePreference.trim()
      : defaults.diagramThemePreference;

  if (
    diagramThemePreference !== "default" &&
    !customDiagramThemes.some((theme) => theme.id === diagramThemePreference)
  ) {
    diagramThemePreference = defaults.diagramThemePreference;
  }

  const storedAppearance =
    stored.diagramAppearance && typeof stored.diagramAppearance === "object"
      ? (stored.diagramAppearance as Record<string, unknown>)
      : null;
  const appearanceMissingBackground =
    !storedAppearance ||
    (!("backgroundMode" in storedAppearance) &&
      !("backgroundColor" in storedAppearance));

  let diagramAppearance = resolveDiagramAppearance(stored.diagramAppearance);
  if (appearanceMissingBackground) {
    // Prefer legacy new-diagram background prefs when themes predate background fields.
    diagramAppearance = {
      ...diagramAppearance,
      backgroundMode: defaultBackgroundMode,
      backgroundColor: defaultBackgroundColor,
    };
  }

  return {
    autosaveEnabled:
      typeof stored.autosaveEnabled === "boolean"
        ? stored.autosaveEnabled
        : defaults.autosaveEnabled,
    confirmBeforeNewDiagram:
      typeof stored.confirmBeforeNewDiagram === "boolean"
        ? stored.confirmBeforeNewDiagram
        : defaults.confirmBeforeNewDiagram,
    defaultBackgroundMode: diagramAppearance.backgroundMode,
    defaultShowHeader:
      typeof stored.defaultShowHeader === "boolean"
        ? stored.defaultShowHeader
        : defaults.defaultShowHeader,
    defaultBackgroundColor: diagramAppearance.backgroundColor,
    defaultDiagramFont:
      typeof stored.defaultDiagramFont === "string" &&
      stored.defaultDiagramFont.trim()
        ? stored.defaultDiagramFont
        : defaults.defaultDiagramFont,
    diagramAppearance,
    diagramThemePreference,
    customDiagramThemes,
    defaultExportPadding:
      typeof stored.defaultExportPadding === "number" &&
      Number.isFinite(stored.defaultExportPadding)
        ? Math.max(0, Math.min(200, Math.round(stored.defaultExportPadding)))
        : defaults.defaultExportPadding,
    defaultExportPixelRatio:
      typeof stored.defaultExportPixelRatio === "number" &&
      Number.isFinite(stored.defaultExportPixelRatio)
        ? exportZoomRatioFromPercent(stored.defaultExportPixelRatio * 100)
        : defaults.defaultExportPixelRatio,
    defaultExportBoundsMode: isExportBoundsMode(stored.defaultExportBoundsMode)
      ? stored.defaultExportBoundsMode
      : defaults.defaultExportBoundsMode,
    defaultDiagramDirectory: parseOptionalDirectory(
      stored.defaultDiagramDirectory,
    ),
    defaultExportDirectory: parseOptionalDirectory(stored.defaultExportDirectory),
    themePreference,
    uiScale: isUiScale(stored.uiScale) ? stored.uiScale : defaults.uiScale,
    customThemes,
    bookmarksVisible:
      typeof stored.bookmarksVisible === "boolean"
        ? stored.bookmarksVisible
        : defaults.bookmarksVisible,
    selectionPulseEnabled:
      typeof stored.selectionPulseEnabled === "boolean"
        ? stored.selectionPulseEnabled
        : defaults.selectionPulseEnabled,
    lineLabelContrastWithBackground:
      typeof stored.lineLabelContrastWithBackground === "boolean"
        ? stored.lineLabelContrastWithBackground
        : defaults.lineLabelContrastWithBackground,
  };
}

export function getAppPreferences(): AppPreferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        ...DEFAULT_APP_PREFERENCES,
        customThemes: [],
        customDiagramThemes: [],
        diagramAppearance: cloneDiagramAppearance(DEFAULT_DIAGRAM_APPEARANCE),
      };
    }
    return parseStoredPreferences(JSON.parse(raw));
  } catch {
    return {
      ...DEFAULT_APP_PREFERENCES,
      customThemes: [],
      customDiagramThemes: [],
      diagramAppearance: cloneDiagramAppearance(DEFAULT_DIAGRAM_APPEARANCE),
    };
  }
}

export function setAppPreferences(patch: Partial<AppPreferences>): AppPreferences {
  const current = getAppPreferences();
  const next: AppPreferences = {
    ...current,
    ...patch,
    diagramAppearance: patch.diagramAppearance
      ? cloneDiagramAppearance(patch.diagramAppearance)
      : current.diagramAppearance,
    customDiagramThemes: patch.customDiagramThemes
      ? patch.customDiagramThemes.map((theme) => ({
          ...theme,
          appearance: cloneDiagramAppearance(theme.appearance),
        }))
      : current.customDiagramThemes,
    defaultExportPixelRatio:
      patch.defaultExportPixelRatio !== undefined
        ? exportZoomRatioFromPercent(patch.defaultExportPixelRatio * 100)
        : current.defaultExportPixelRatio,
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // localStorage may be unavailable
  }
  return next;
}
