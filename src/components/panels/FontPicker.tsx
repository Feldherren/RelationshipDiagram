import { useMemo, useState } from "react";
import {
  DEFAULT_DIAGRAM_FONT,
  isDefaultDiagramFont,
} from "../../utils/diagramFont";
import {
  FONT_PREVIEW_TEXT,
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
  const [query, setQuery] = useState("");
  const [systemFonts, setSystemFonts] = useState<SystemFontOption[]>([]);
  const [systemFontsLoaded, setSystemFontsLoaded] = useState(false);
  const [systemFontsError, setSystemFontsError] = useState<string | null>(null);
  const [loadingSystemFonts, setLoadingSystemFonts] = useState(false);

  const systemFontAccess = isSystemFontAccessSupported();

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
        setSystemFontsError("Permission to access local fonts was denied.");
      } else {
        setSystemFontsError("Could not read installed fonts.");
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
          {FONT_PREVIEW_TEXT}
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
        <span>Search fonts</span>
        <input
          type="search"
          value={query}
          placeholder="Filter by name"
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>

      <div className="font-picker-list" role="listbox" aria-label="Diagram font">
        {renderOption(DEFAULT_DIAGRAM_FONT, "Default (Arial)")}

        {extraFonts.map((family) =>
          renderOption(family, family, "Saved in diagram"),
        )}

        {systemFontAccess && !systemFontsLoaded && (
          <div className="font-picker-empty">
            <p className="hint">
              Installed fonts can be listed with your permission. The browser
              will ask before sharing them with this app.
            </p>
            <button
              type="button"
              className="btn-secondary"
              disabled={loadingSystemFonts}
              onClick={() => void loadSystemFonts()}
            >
              {loadingSystemFonts ? "Loading fonts…" : "Show installed fonts"}
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
        <p className="hint">
          This browser cannot list installed fonts. Use Chrome or Edge on desktop
          to choose fonts installed on your system.
        </p>
      )}
    </div>
  );
}
