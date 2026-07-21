import type { DiagramAppearance, RGB } from "../models/types";
import { DEFAULT_DIAGRAM_FONT } from "./diagramFont";
import {
  DEFAULT_DIAGRAM_BACKGROUND,
  type DiagramBackgroundMode,
} from "./diagramBackground";
import {
  BUILT_IN_DIAGRAM_THEMES,
  cloneDiagramAppearance,
  DEFAULT_DIAGRAM_APPEARANCE,
  isBuiltInDiagramThemeId,
  resolveDiagramAppearance,
  validateDiagramThemeDocument,
  type BuiltInDiagramThemeId,
  type DiagramThemeDocument,
  type DiagramThemePreference,
} from "./diagramAppearance";
import {
  getSystemColorScheme,
  isUiScale,
  validateThemeDocument,
  type ThemeDocument,
  type ThemePreference,
  type UiScale,
} from "./uiTheme";
import { exportZoomRatioFromPercent } from "./exportZoom";
import {
  parseGroupsCanvasMode,
  type GroupsCanvasMode,
} from "./groupHub";
import {
  APPEARANCE_WALLPAPER_KEY,
  loadAllWallpapers,
  syncWallpapers,
  themeWallpaperKey,
} from "./wallpaperImageStorage";

const STORAGE_KEY = "appPreferences";

/** In-memory wallpaper data URLs; localStorage keeps prefs without image payloads. */
const wallpaperCache = new Map<string, string>();
let wallpaperPersistChain: Promise<void> = Promise.resolve();
let wallpaperHydratePromise: Promise<void> | null = null;
let wallpapersHydrated = false;

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
  /**
   * Group hub canvas eye: all hubs+corridors, connected badges only, or none.
   * Legacy prefs may still store `groupsVisible` boolean (migrated on load).
   */
  groupsCanvasMode: GroupsCanvasMode;
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
  groupsCanvasMode: "full",
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
    if (!theme || isBuiltInDiagramThemeId(theme.id) || seen.has(theme.id)) continue;
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
    !isBuiltInDiagramThemeId(diagramThemePreference) &&
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

  const appearanceHadFont =
    storedAppearance !== null &&
    typeof storedAppearance.fontFamily === "string" &&
    storedAppearance.fontFamily.trim().length > 0;
  const legacyDefaultFont =
    typeof stored.defaultDiagramFont === "string" &&
    stored.defaultDiagramFont.trim()
      ? stored.defaultDiagramFont.trim()
      : null;
  // Themes that predate fontFamily inherit the legacy defaultDiagramFont pref.
  if (!appearanceHadFont && legacyDefaultFont) {
    diagramAppearance = {
      ...diagramAppearance,
      fontFamily: legacyDefaultFont,
    };
  }

  const appearanceHadShowHeader =
    storedAppearance !== null &&
    typeof storedAppearance.showHeader === "boolean";
  const legacyShowHeader =
    typeof stored.defaultShowHeader === "boolean"
      ? stored.defaultShowHeader
      : null;
  if (!appearanceHadShowHeader && legacyShowHeader !== null) {
    diagramAppearance = {
      ...diagramAppearance,
      showHeader: legacyShowHeader,
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
    defaultShowHeader: diagramAppearance.showHeader,
    defaultBackgroundColor: diagramAppearance.backgroundColor,
    defaultDiagramFont: diagramAppearance.fontFamily,
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
    groupsCanvasMode: parseGroupsCanvasMode(
      stored.groupsCanvasMode,
      stored.groupsVisible,
    ),
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

function collectWallpaperMap(
  prefs: AppPreferences,
): Map<string, string | null> {
  const desired = new Map<string, string | null>();
  desired.set(
    APPEARANCE_WALLPAPER_KEY,
    prefs.diagramAppearance.backgroundImageData,
  );
  for (const theme of prefs.customDiagramThemes) {
    desired.set(
      themeWallpaperKey(theme.id),
      theme.appearance.backgroundImageData,
    );
  }
  return desired;
}

function updateWallpaperCache(prefs: AppPreferences): void {
  const desired = collectWallpaperMap(prefs);
  const keep = new Set<string>();
  for (const [key, dataUrl] of desired) {
    if (dataUrl) {
      wallpaperCache.set(key, dataUrl);
      keep.add(key);
    } else {
      wallpaperCache.delete(key);
    }
  }
  for (const key of [...wallpaperCache.keys()]) {
    if (!keep.has(key)) {
      wallpaperCache.delete(key);
    }
  }
}

function stripWallpapersForStorage(prefs: AppPreferences): AppPreferences {
  return {
    ...prefs,
    diagramAppearance: {
      ...cloneDiagramAppearance(prefs.diagramAppearance),
      backgroundImageData: null,
    },
    customDiagramThemes: prefs.customDiagramThemes.map((theme) => ({
      ...theme,
      appearance: {
        ...cloneDiagramAppearance(theme.appearance),
        backgroundImageData: null,
      },
    })),
  };
}

function applyWallpaperCache(prefs: AppPreferences): AppPreferences {
  // After hydrate, IndexedDB/cache is authoritative (localStorage is stripped).
  // Before hydrate, fall back to any legacy inline data URLs still in localStorage.
  if (wallpapersHydrated) {
    return {
      ...prefs,
      diagramAppearance: {
        ...prefs.diagramAppearance,
        backgroundImageData:
          wallpaperCache.get(APPEARANCE_WALLPAPER_KEY) ?? null,
      },
      customDiagramThemes: prefs.customDiagramThemes.map((theme) => ({
        ...theme,
        appearance: {
          ...theme.appearance,
          backgroundImageData:
            wallpaperCache.get(themeWallpaperKey(theme.id)) ?? null,
        },
      })),
    };
  }

  const appearanceFromCache = wallpaperCache.get(APPEARANCE_WALLPAPER_KEY);
  return {
    ...prefs,
    diagramAppearance: {
      ...prefs.diagramAppearance,
      backgroundImageData:
        appearanceFromCache ?? prefs.diagramAppearance.backgroundImageData,
    },
    customDiagramThemes: prefs.customDiagramThemes.map((theme) => {
      const fromCache = wallpaperCache.get(themeWallpaperKey(theme.id));
      return {
        ...theme,
        appearance: {
          ...theme.appearance,
          backgroundImageData:
            fromCache ?? theme.appearance.backgroundImageData,
        },
      };
    }),
  };
}

function prefsHaveInlineWallpapers(prefs: AppPreferences): boolean {
  if (prefs.diagramAppearance.backgroundImageData) return true;
  return prefs.customDiagramThemes.some(
    (theme) => Boolean(theme.appearance.backgroundImageData),
  );
}

/** First-launch defaults: diagram theme matches current system light/dark once. */
function createFirstLaunchPreferences(): AppPreferences {
  const builtInId: BuiltInDiagramThemeId =
    getSystemColorScheme() === "dark" ? "default-dark" : "default";
  const diagramAppearance = cloneDiagramAppearance(
    BUILT_IN_DIAGRAM_THEMES[builtInId],
  );
  return {
    ...DEFAULT_APP_PREFERENCES,
    customThemes: [],
    customDiagramThemes: [],
    diagramThemePreference: builtInId,
    diagramAppearance,
    defaultBackgroundMode: diagramAppearance.backgroundMode,
    defaultBackgroundColor: diagramAppearance.backgroundColor,
  };
}

function readStoredPreferences(): AppPreferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const prefs = createFirstLaunchPreferences();
      writeStoredPreferences(prefs);
      return prefs;
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

function writeStoredPreferences(prefs: AppPreferences): void {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(stripWallpapersForStorage(prefs)),
    );
  } catch {
    // localStorage may be unavailable or over quota
  }
}

function enqueueWallpaperPersist(prefs: AppPreferences): void {
  const desired = collectWallpaperMap(prefs);
  wallpaperPersistChain = wallpaperPersistChain
    .then(() => syncWallpapers(desired))
    .catch((err) => {
      console.error("Failed to persist wallpaper images:", err);
    });
}

/**
 * Load wallpaper payloads from IndexedDB (and migrate any still embedded in
 * localStorage). Safe to call multiple times; subsequent calls are no-ops.
 */
export async function hydrateAppPreferenceWallpapers(): Promise<void> {
  if (wallpapersHydrated) return;
  if (wallpaperHydratePromise) {
    await wallpaperHydratePromise;
    return;
  }

  wallpaperHydratePromise = (async () => {
    try {
      // Finish any early preference writes before reading IndexedDB.
      await wallpaperPersistChain;

      const stored = await loadAllWallpapers();
      for (const [key, dataUrl] of stored) {
        // IndexedDB wins on key conflicts; keep any cache entries not yet saved.
        wallpaperCache.set(key, dataUrl);
      }

      const fromLocal = readStoredPreferences();
      if (prefsHaveInlineWallpapers(fromLocal)) {
        // Fill gaps only — do not overwrite cache/IDB entries.
        if (
          fromLocal.diagramAppearance.backgroundImageData &&
          !wallpaperCache.has(APPEARANCE_WALLPAPER_KEY)
        ) {
          wallpaperCache.set(
            APPEARANCE_WALLPAPER_KEY,
            fromLocal.diagramAppearance.backgroundImageData,
          );
        }
        for (const theme of fromLocal.customDiagramThemes) {
          const key = themeWallpaperKey(theme.id);
          if (
            theme.appearance.backgroundImageData &&
            !wallpaperCache.has(key)
          ) {
            wallpaperCache.set(key, theme.appearance.backgroundImageData);
          }
        }
        const merged: AppPreferences = {
          ...fromLocal,
          diagramAppearance: {
            ...fromLocal.diagramAppearance,
            backgroundImageData:
              wallpaperCache.get(APPEARANCE_WALLPAPER_KEY) ?? null,
          },
          customDiagramThemes: fromLocal.customDiagramThemes.map((theme) => ({
            ...theme,
            appearance: {
              ...theme.appearance,
              backgroundImageData:
                wallpaperCache.get(themeWallpaperKey(theme.id)) ?? null,
            },
          })),
        };
        // Drop inline payloads from localStorage now that IndexedDB holds them.
        writeStoredPreferences(merged);
        await syncWallpapers(collectWallpaperMap(merged));
      }
    } catch (err) {
      console.error("Failed to hydrate wallpaper images:", err);
    } finally {
      wallpapersHydrated = true;
    }
  })();

  await wallpaperHydratePromise;
}

export function getAppPreferences(): AppPreferences {
  return applyWallpaperCache(readStoredPreferences());
}

export function setAppPreferences(patch: Partial<AppPreferences>): AppPreferences {
  const current = getAppPreferences();
  let diagramAppearance = patch.diagramAppearance
    ? cloneDiagramAppearance(patch.diagramAppearance)
    : current.diagramAppearance;

  // Keep legacy prefs in sync with theme appearance.
  if (!patch.diagramAppearance) {
    if (patch.defaultDiagramFont !== undefined) {
      diagramAppearance = {
        ...diagramAppearance,
        fontFamily: patch.defaultDiagramFont.trim() || DEFAULT_DIAGRAM_FONT,
      };
    }
    if (patch.defaultShowHeader !== undefined) {
      diagramAppearance = {
        ...diagramAppearance,
        showHeader: patch.defaultShowHeader,
      };
    }
  }

  const next: AppPreferences = {
    ...current,
    ...patch,
    diagramAppearance,
    defaultDiagramFont: diagramAppearance.fontFamily,
    defaultShowHeader: diagramAppearance.showHeader,
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
  updateWallpaperCache(next);
  writeStoredPreferences(next);
  enqueueWallpaperPersist(next);
  return next;
}
