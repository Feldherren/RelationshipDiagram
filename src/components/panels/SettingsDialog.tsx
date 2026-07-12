import { useDiagramStore } from "../../store/diagramStore";
import { isDefaultDiagramFont } from "../../utils/diagramFont";
import { FontPicker } from "./FontPicker";

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsDialog({ open, onClose }: SettingsDialogProps) {
  const diagramTitle = useDiagramStore((s) => s.diagramTitle);
  const diagramFontFamily = useDiagramStore((s) => s.diagramFontFamily);
  const fontMissing = useDiagramStore((s) => s.fontMissing);
  const showGrid = useDiagramStore((s) => s.showGrid);
  const setDiagramTitle = useDiagramStore((s) => s.setDiagramTitle);
  const setShowGrid = useDiagramStore((s) => s.setShowGrid);
  const setDiagramFontFamily = useDiagramStore((s) => s.setDiagramFontFamily);

  if (!open) return null;

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

        <label className="field checkbox">
          <input
            type="checkbox"
            checked={showGrid}
            onChange={(e) => setShowGrid(e.target.checked)}
          />
          <span>Show background grid</span>
        </label>

        <div className="field">
          <span>Diagram font</span>
          <FontPicker
            value={diagramFontFamily}
            onChange={(fontFamily) => void setDiagramFontFamily(fontFamily)}
          />
        </div>

        {fontMissing && (
          <p className="hint">
            The font &ldquo;{diagramFontFamily}&rdquo; is not available on this
            device. Choose it from installed fonts above. Diagram files only
            store the font name, not the font file itself.
          </p>
        )}

        {!fontMissing && !isDefaultDiagramFont(diagramFontFamily) && (
          <p className="hint">
            Custom fonts must be installed on this device. They are not saved
            inside diagram files.
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
