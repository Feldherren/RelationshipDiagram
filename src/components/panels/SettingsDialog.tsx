import { useDiagramStore } from "../../store/diagramStore";
import {
  DEFAULT_DIAGRAM_FONT,
  isDefaultDiagramFont,
} from "../../utils/diagramFont";

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsDialog({ open, onClose }: SettingsDialogProps) {
  const diagramTitle = useDiagramStore((s) => s.diagramTitle);
  const diagramFontFamily = useDiagramStore((s) => s.diagramFontFamily);
  const loadedFontFamilies = useDiagramStore((s) => s.loadedFontFamilies);
  const fontMissing = useDiagramStore((s) => s.fontMissing);
  const setDiagramTitle = useDiagramStore((s) => s.setDiagramTitle);
  const setDiagramFontFamily = useDiagramStore((s) => s.setDiagramFontFamily);
  const loadDiagramFontFromFile = useDiagramStore((s) => s.loadDiagramFontFromFile);

  if (!open) return null;

  const fontOptions = [
    DEFAULT_DIAGRAM_FONT,
    ...loadedFontFamilies.filter((f) => f !== DEFAULT_DIAGRAM_FONT),
  ];
  if (
    diagramFontFamily !== DEFAULT_DIAGRAM_FONT &&
    !fontOptions.includes(diagramFontFamily)
  ) {
    fontOptions.push(diagramFontFamily);
  }

  const handleFontFile = async (file: File | null) => {
    if (!file) return;
    try {
      await loadDiagramFontFromFile(file);
    } catch (err) {
      console.error(err);
      alert("Failed to load font file.");
    }
  };

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <h2>Diagram settings</h2>

        <label className="field">
          <span>Diagram title</span>
          <input
            type="text"
            value={diagramTitle}
            placeholder="Untitled diagram"
            onChange={(e) => setDiagramTitle(e.target.value)}
          />
        </label>

        <label className="field">
          <span>Diagram font</span>
          <select
            value={diagramFontFamily}
            onChange={(e) => void setDiagramFontFamily(e.target.value)}
          >
            <option value={DEFAULT_DIAGRAM_FONT}>Default (Arial)</option>
            {fontOptions
              .filter((family) => family !== DEFAULT_DIAGRAM_FONT)
              .map((family) => (
                <option key={family} value={family}>
                  {family}
                </option>
              ))}
          </select>
        </label>

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

        {fontMissing && (
          <p className="hint">
            The font &ldquo;{diagramFontFamily}&rdquo; is not available on this
            device. Load the font file above to use it. Diagram files only store
            the font name, not the font file itself.
          </p>
        )}

        {!fontMissing &&
          !isDefaultDiagramFont(diagramFontFamily) && (
            <p className="hint">
              Custom fonts must be loaded on each device. They are cached in
              this browser but are not saved inside diagram files.
            </p>
          )}

        <p className="hint">
          Diagram font applies to canvas labels only. The application interface
          keeps its default font.
        </p>

        <div className="dialog-actions">
          <button type="button" className="btn-primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
