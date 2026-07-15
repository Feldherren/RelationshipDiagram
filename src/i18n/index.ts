import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import {
  SYSTEM_LANGUAGE,
  getStoredLanguagePreference,
  resolveEffectiveLocale,
  setStoredLanguagePreference,
  type LanguagePreference,
} from "./languagePreference";

export interface LocaleInfo {
  code: string;
  /** Language name in that language (shown in the dropdown). */
  nativeName: string;
}

/**
 * Register new locales here after adding a JSON file under `locales/`.
 * Contributors: copy `_template.json` → `xx.json`, translate, then add an entry.
 */
export const SUPPORTED_LOCALES: readonly LocaleInfo[] = [
  { code: "en", nativeName: "English" },
];

export const AVAILABLE_LOCALE_CODES = SUPPORTED_LOCALES.map((l) => l.code);

const resources = {
  en: { translation: en },
};

function applyDocumentLang(locale: string) {
  if (typeof document !== "undefined") {
    document.documentElement.lang = locale;
  }
}

export function getLanguagePreference(): LanguagePreference {
  return getStoredLanguagePreference();
}

export async function setLanguagePreference(
  preference: LanguagePreference,
): Promise<void> {
  setStoredLanguagePreference(preference);
  const effective = resolveEffectiveLocale(
    preference,
    AVAILABLE_LOCALE_CODES,
  );
  await i18n.changeLanguage(effective);
  applyDocumentLang(effective);
}

const initialLocale = resolveEffectiveLocale(
  getStoredLanguagePreference(),
  AVAILABLE_LOCALE_CODES,
);

void i18n.use(initReactI18next).init({
  resources,
  lng: initialLocale,
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

applyDocumentLang(initialLocale);

export { SYSTEM_LANGUAGE };
export default i18n;
