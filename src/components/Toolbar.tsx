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
  return (
    <header className="toolbar">
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
