const STORAGE_KEY = "uiLanguage";

/** Sentinel for “follow browser/OS”; stored preference is cleared. */
export const SYSTEM_LANGUAGE = "system";

export type LanguagePreference = typeof SYSTEM_LANGUAGE | string;

export function getStoredLanguagePreference(): LanguagePreference {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (value && value !== SYSTEM_LANGUAGE) return value;
  } catch {
    // localStorage may be unavailable
  }
  return SYSTEM_LANGUAGE;
}

export function setStoredLanguagePreference(preference: LanguagePreference): void {
  try {
    if (preference === SYSTEM_LANGUAGE) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, preference);
    }
  } catch {
    // localStorage may be unavailable
  }
}

/**
 * Match navigator languages against available locale codes.
 * Exact match first, then language prefix (e.g. en-GB → en).
 */
export function matchNavigatorLocale(
  available: readonly string[],
  languages: readonly string[] = typeof navigator !== "undefined"
    ? navigator.languages?.length
      ? navigator.languages
      : [navigator.language]
    : ["en"],
): string | undefined {
  const availableSet = new Set(available.map((code) => code.toLowerCase()));
  const byPrefix = new Map<string, string>();
  for (const code of available) {
    const prefix = code.split("-")[0]!.toLowerCase();
    if (!byPrefix.has(prefix)) byPrefix.set(prefix, code);
  }

  for (const raw of languages) {
    if (!raw) continue;
    const normalized = raw.toLowerCase();
    if (availableSet.has(normalized)) {
      return available.find((c) => c.toLowerCase() === normalized);
    }
    const prefix = normalized.split("-")[0]!;
    const matched = byPrefix.get(prefix);
    if (matched) return matched;
  }
  return undefined;
}

export function resolveEffectiveLocale(
  preference: LanguagePreference,
  available: readonly string[],
  fallback = "en",
): string {
  if (preference !== SYSTEM_LANGUAGE && available.includes(preference)) {
    return preference;
  }
  return matchNavigatorLocale(available) ?? fallback;
}
