import { useMemo, useState } from "react";
import { DEFAULT_DIAGRAM_FONT, isDefaultDiagramFont } from "../../utils/diagramFont";
import {
  FONT_PREVIEW_TEXT,
  formatUiFontFamily,
  isSystemFontAccessSupported,
  queryInstalledFontFamilies,
  type SystemFontOption,
} from "../../utils/systemFonts";

interface FontPickerProps {
  value: string;
  loadedFontFamilies: string[];
  onChange: (fontFamily: string) => void;
  onLoadFontFile: (file: File) => Promise<void>;
}

export function FontPicker({
  value,
  loadedFontFamilies,
  onChange,
  onLoadFontFile,
}: FontPickerProps) {
  const [query, setQuery] = useState("");
  const [systemFonts, setSystemFonts] = useState<SystemFontOption[]>([]);
  const [systemFontsLoaded, setSystemFontsLoaded] = useState(false);
  const [systemFontsError, setSystemFontsError] = useState<string | null>(null);
  const [loadingSystemFonts, setLoadingSystemFonts] = useState(false);

  const systemFontAccess = isSystemFontAccessSupported();

  const uploadedFonts = useMemo(
    () =>
      loadedFontFamilies.filter(
        (family) =>
          !isDefaultDiagramFont(family) &&
          !systemFonts.some((font) => font.family === family),
      ),
    [loadedFontFamilies, systemFonts],
  );

  const extraFonts = useMemo(() => {
    const known = new Set([
      DEFAULT_DIAGRAM_FONT,
      ...systemFonts.map((font) => font.family),
      ...uploadedFonts,
    ]);
    return !isDefaultDiagramFont(value) && !known.has(value) ? [value] : [];
  }, [systemFonts, uploadedFonts, value]);

  const filteredSystemFonts = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return systemFonts;
    return systemFonts.filter((font) =>
      font.family.toLowerCase().includes(needle),
    );
  }, [query, systemFonts]);

  const filteredUploadedFonts = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return uploadedFonts;
    return uploadedFonts.filter((family) =>
      family.toLowerCase().includes(needle),
    );
  }, [query, uploadedFonts]);

  const loadSystemFonts = async () => {
    if (!systemFontAccess) return;
    setLoadingSystemFonts(true);
    setSystemFontsError(null);
    try {
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

  const handleFontFile = async (file: File | null) => {
    if (!file) return;
    try {
      await onLoadFontFile(file);
    } catch (err) {
      console.error(err);
      alert("Failed to load font file.");
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

        {filteredUploadedFonts.map((family) =>
          renderOption(family, family, "Loaded from file"),
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
          This browser cannot list installed fonts. Load a font file below, or use
          Chrome or Edge on desktop to browse installed fonts.
        </p>
      )}

      <label className="field">
        <span>Load font file</span>
        <input
          type="file"
          accept=".ttf,.otf,.woff,.woff2,font/*"
          onChange={(e) => {
            void handleFontFile(e.target.files?.[0] ?? null);
            e.target.value = "";
          }}
        />
      </label>
    </div>
  );
}
