import { useEffect } from "react";
import { getAppPreferences } from "../utils/appPreferences";
import {
  applyAppearance,
  syncSystemThemeListener,
} from "../utils/uiTheme";

/** Apply stored appearance on mount and keep system theme in sync. */
export function useUiAppearance() {
  useEffect(() => {
    const applyFromPrefs = () => {
      const prefs = getAppPreferences();
      applyAppearance(
        prefs.themePreference,
        prefs.customThemes,
        prefs.uiScale,
      );
      syncSystemThemeListener(prefs.themePreference, applyFromPrefs);
    };

    applyFromPrefs();

    return () => {
      syncSystemThemeListener("light", () => undefined);
    };
  }, []);
}

/** Re-apply appearance after preferences change (call from Settings). */
export function reapplyUiAppearanceFromPrefs(): void {
  const prefs = getAppPreferences();
  applyAppearance(prefs.themePreference, prefs.customThemes, prefs.uiScale);
  syncSystemThemeListener(prefs.themePreference, () => {
    const latest = getAppPreferences();
    applyAppearance(
      latest.themePreference,
      latest.customThemes,
      latest.uiScale,
    );
  });
}
