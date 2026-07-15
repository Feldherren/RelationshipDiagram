import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  DEFAULT_DIAGRAM_FONT,
  isDefaultDiagramFont,
} from "../../utils/diagramFont";
import {
  clearLocalFontCache,
  formatUiFontFamily,
  isDeprecatedFontFamily,
  isSystemFontAccessSupported,
  queryInstalledFontFamilies,
  type SystemFontOption,
} from "../../utils/systemFonts";

interface FontPickerProps {
  value: string;
  onChange: (fontFamily: string) => void;
}

export function FontPicker({ value, onChange }: FontPickerProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [systemFonts, setSystemFonts] = useState<SystemFontOption[]>([]);
  const [systemFontsLoaded, setSystemFontsLoaded] = useState(false);
  const [systemFontsError, setSystemFontsError] = useState<string | null>(null);
  const [loadingSystemFonts, setLoadingSystemFonts] = useState(false);

  const systemFontAccess = isSystemFontAccessSupported();
  const previewText = t("font.previewSample");

  const extraFonts = useMemo(() => {
    if (isDefaultDiagramFont(value) || isDeprecatedFontFamily(value)) return [];
    const known = new Set([
      DEFAULT_DIAGRAM_FONT,
      ...systemFonts.map((font) => font.family),
    ]);
    return known.has(value) ? [] : [value];
  }, [systemFonts, value]);

  const filteredSystemFonts = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return systemFonts;
    return systemFonts.filter((font) =>
      font.family.toLowerCase().includes(needle),
    );
  }, [query, systemFonts]);

  const loadSystemFonts = async () => {
    if (!systemFontAccess) return;
    setLoadingSystemFonts(true);
    setSystemFontsError(null);
    try {
      clearLocalFontCache();
      const fonts = await queryInstalledFontFamilies();
      setSystemFonts(fonts);
      setSystemFontsLoaded(true);
    } catch (err) {
      if ((err as DOMException).name === "NotAllowedError") {
        setSystemFontsError(t("font.permissionDenied"));
      } else {
        setSystemFontsError(t("font.readFailed"));
        console.error(err);
      }
    } finally {
      setLoadingSystemFonts(false);
    }
  };

  const renderOption = (family: string, label: string, subtitle?: string) => {
    const selected = value === family;
    return (
      <button
        key={family}
        type="button"
        className={`font-picker-option${selected ? " selected" : ""}`}
        onClick={() => onChange(family)}
      >
        <span
          className="font-picker-preview"
          style={{ fontFamily: formatUiFontFamily(family) }}
        >
          {previewText}
        </span>
        <span className="font-picker-meta">
          <span className="font-picker-name">{label}</span>
          {subtitle && <span className="font-picker-subtitle">{subtitle}</span>}
        </span>
      </button>
    );
  };

  return (
    <div className="font-picker">
      <label className="field">
        <span>{t("font.search")}</span>
        <input
          type="search"
          value={query}
          placeholder={t("font.filterPlaceholder")}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>

      <div
        className="font-picker-list"
        role="listbox"
        aria-label={t("font.listAria")}
      >
        {renderOption(DEFAULT_DIAGRAM_FONT, t("font.defaultArial"))}

        {extraFonts.map((family) =>
          renderOption(family, family, t("font.savedInDiagram")),
        )}

        {systemFontAccess && !systemFontsLoaded && (
          <div className="font-picker-empty">
            <p className="hint">{t("font.permissionHint")}</p>
            <button
              type="button"
              className="btn-secondary"
              disabled={loadingSystemFonts}
              onClick={() => void loadSystemFonts()}
            >
              {loadingSystemFonts
                ? t("font.loading")
                : t("font.showInstalled")}
            </button>
          </div>
        )}

        {systemFontsError && <p className="hint">{systemFontsError}</p>}

        {systemFontsLoaded &&
          filteredSystemFonts.map((font) =>
            renderOption(font.family, font.family, font.fullName),
          )}
      </div>

      {!systemFontAccess && (
        <p className="hint">{t("font.unsupportedBrowser")}</p>
      )}
    </div>
  );
}
