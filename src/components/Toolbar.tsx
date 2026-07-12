import { useDiagramStore } from "../store/diagramStore";

interface ToolbarProps {
  onSave: () => void;
  onOpen: () => void;
  onExport: () => void;
}

export function Toolbar({ onSave, onOpen, onExport }: ToolbarProps) {
  const toolMode = useDiagramStore((s) => s.toolMode);
  const showGrid = useDiagramStore((s) => s.showGrid);
  const setToolMode = useDiagramStore((s) => s.setToolMode);
  const setShowGrid = useDiagramStore((s) => s.setShowGrid);
  const addCharacterAt = useDiagramStore((s) => s.addCharacterAt);
  const getViewportCenter = useDiagramStore((s) => s.getViewportCenter);
  const addGroupFromSelection = useDiagramStore((s) => s.addGroupFromSelection);
  const selection = useDiagramStore((s) => s.selection);
  const connectFrom = useDiagramStore((s) => s.connectFrom);

  return (
    <header className="toolbar">
      <div className="toolbar-group">
        <button
          type="button"
          className={toolMode === "connect" ? "active" : ""}
          onClick={() => setToolMode("connect")}
          title="Connect two nodes"
        >
          {connectFrom ? "Connect…" : "Connect"}
        </button>
      </div>

      <div className="toolbar-group">
        <button
          type="button"
          onClick={() => addCharacterAt(getViewportCenter())}
        >
          + Character
        </button>
        <button
          type="button"
          disabled={selection?.type !== "character"}
          onClick={addGroupFromSelection}
          title="Group selected character"
        >
          + Group
        </button>
      </div>

      <div className="toolbar-group">
        <button type="button" onClick={onOpen}>
          Open
        </button>
        <button type="button" onClick={onSave}>
          Save
        </button>
        <button type="button" onClick={onExport}>
          Export
        </button>
      </div>

      <div className="toolbar-group toolbar-right">
        <label className="toolbar-checkbox">
          <input
            type="checkbox"
            checked={showGrid}
            onChange={(e) => setShowGrid(e.target.checked)}
          />
          Grid
        </label>
      </div>
    </header>
  );
}
