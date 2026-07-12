import { useDiagramStore } from "../store/diagramStore";

interface ToolbarProps {
  onNew: () => void;
  onSave: () => void;
  onOpen: () => void;
  onExport: () => void;
  onSettings: () => void;
}

export function Toolbar({
  onNew,
  onSave,
  onOpen,
  onExport,
  onSettings,
}: ToolbarProps) {
  const addCharacterAt = useDiagramStore((s) => s.addCharacterAt);
  const getViewportCenter = useDiagramStore((s) => s.getViewportCenter);
  const addGroupFromSelection = useDiagramStore((s) => s.addGroupFromSelection);
  const selection = useDiagramStore((s) => s.selection);

  return (
    <header className="toolbar">
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
        <button type="button" onClick={onNew}>
          New
        </button>
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
        <button type="button" onClick={onSettings}>
          Settings
        </button>
      </div>
    </header>
  );
}
