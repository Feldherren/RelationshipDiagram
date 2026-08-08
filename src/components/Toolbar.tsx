import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDiagramStore } from "../store/diagramStore";

interface ToolbarProps {
  onNew: () => void;
  onSave: () => void;
  onSaveAs: () => void;
  onOpen: () => void;
  onExport: () => void;
  onDiagramProperties: () => void;
  onControls: () => void;
  onAbout: () => void;
  onSettings: () => void;
  onFind: () => void;
}

function SearchIcon() {
  return (
    <svg
      className="toolbar-icon"
      viewBox="0 0 24 24"
      width="16"
      height="16"
      aria-hidden="true"
    >
      <path
        fill="currentColor"
        d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"
      />
    </svg>
  );
}

function FitToContentIcon() {
  return (
    <svg
      className="toolbar-icon"
      viewBox="0 0 24 24"
      width="16"
      height="16"
      aria-hidden="true"
    >
      <path
        fill="currentColor"
        d="M3 5v4h2V7h2V5H3zm14 0v2h2v2h2V5h-4zM5 15H3v4h4v-2H5v-2zm16 0h-2v2h-2v2h4v-4zM7 9h10v6H7V9z"
      />
    </svg>
  );
}

function UndoIcon() {
  return (
    <svg
      className="toolbar-icon"
      viewBox="0 0 24 24"
      width="16"
      height="16"
      aria-hidden="true"
    >
      <path
        fill="currentColor"
        d="M12 5c-3.2 0-5.9 1.9-7.1 4.6L2 7v7h7l-2.7-2.7C7 9 9.2 7.5 12 7.5c3.1 0 5.6 2.2 6.3 5.1.1.6.7.9 1.3.8.6-.1.9-.7.8-1.3C19.5 8 16 5 12 5z"
      />
    </svg>
  );
}

function RedoIcon() {
  return (
    <svg
      className="toolbar-icon"
      viewBox="0 0 24 24"
      width="16"
      height="16"
      aria-hidden="true"
    >
      <path
        fill="currentColor"
        d="M12 5c3.2 0 5.9 1.9 7.1 4.6L22 7v7h-7l2.7-2.7C17 9 14.8 7.5 12 7.5c-3.1 0-5.6 2.2-6.3 5.1-.1.6-.7.9-1.3.8-.6-.1-.9-.7-.8-1.3C4.5 8 8 5 12 5z"
      />
    </svg>
  );
}

function SnapToGridIcon() {
  // Integer 16×16 geometry keeps fills sharp at the toolbar's 16px size.
  return (
    <svg
      className="toolbar-icon"
      viewBox="0 0 16 16"
      width="16"
      height="16"
      aria-hidden="true"
    >
      {/* Hash grid */}
      <path
        fill="currentColor"
        d="M2 0h1v16H2V0zm4 0h1v16H6V0zM0 2h9v1H0V2zm0 4h9v1H0V6zm0 4h9v1H0v-1zm0 4h9v1H0v-1z"
      />
      {/* Magnet: pole tips + horseshoe arms + base */}
      <path
        fill="currentColor"
        d="M10 3h1v1h-1zm3 0h1v1h-1zM9 5h2v6H9V5zm4 0h2v6h-2zM9 10h6v1.5c0 1.4-1.1 2.5-3 2.5s-3-1.1-3-2.5V10z"
      />
    </svg>
  );
}

function FileMenu({
  onNew,
  onOpen,
  onSave,
  onSaveAs,
  onExport,
  onSettings,
}: {
  onNew: () => void;
  onOpen: () => void;
  onSave: () => void;
  onSaveAs: () => void;
  onExport: () => void;
  onSettings: () => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (rootRef.current?.contains(target)) return;
      setOpen(false);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const run = (action: () => void) => {
    setOpen(false);
    action();
  };

  return (
    <div className="toolbar-menu-anchor" ref={rootRef}>
      <button
        type="button"
        className={open ? "active" : undefined}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={t("toolbar.fileMenuAria")}
        title={t("toolbar.file")}
        onClick={() => setOpen((value) => !value)}
      >
        {t("toolbar.file")}
      </button>
      {open && (
        <div
          className="toolbar-menu"
          role="menu"
          aria-label={t("toolbar.fileMenuAria")}
        >
          <button
            type="button"
            role="menuitem"
            className="toolbar-menu-item"
            onClick={() => run(onNew)}
          >
            {t("toolbar.new")}
          </button>
          <button
            type="button"
            role="menuitem"
            className="toolbar-menu-item"
            onClick={() => run(onOpen)}
          >
            {t("toolbar.open")}
          </button>
          <button
            type="button"
            role="menuitem"
            className="toolbar-menu-item"
            title={t("toolbar.saveTitle")}
            onClick={() => run(onSave)}
          >
            {t("toolbar.save")}
          </button>
          <button
            type="button"
            role="menuitem"
            className="toolbar-menu-item"
            title={t("toolbar.saveAsTitle")}
            onClick={() => run(onSaveAs)}
          >
            {t("toolbar.saveAs")}
          </button>
          <div className="toolbar-menu-separator" role="separator" />
          <button
            type="button"
            role="menuitem"
            className="toolbar-menu-item"
            onClick={() => run(onExport)}
          >
            {t("toolbar.export")}
          </button>
          <div className="toolbar-menu-separator" role="separator" />
          <button
            type="button"
            role="menuitem"
            className="toolbar-menu-item"
            onClick={() => run(onSettings)}
          >
            {t("toolbar.settings")}
          </button>
        </div>
      )}
    </div>
  );
}

function HelpMenu({
  onControls,
  onAbout,
}: {
  onControls: () => void;
  onAbout: () => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (rootRef.current?.contains(target)) return;
      setOpen(false);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const run = (action: () => void) => {
    setOpen(false);
    action();
  };

  return (
    <div className="toolbar-menu-anchor" ref={rootRef}>
      <button
        type="button"
        className={open ? "active" : undefined}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={t("toolbar.helpMenuAria")}
        title={t("toolbar.helpMenu")}
        onClick={() => setOpen((value) => !value)}
      >
        {t("toolbar.helpMenu")}
      </button>
      {open && (
        <div
          className="toolbar-menu"
          role="menu"
          aria-label={t("toolbar.helpMenuAria")}
        >
          <button
            type="button"
            role="menuitem"
            className="toolbar-menu-item"
            onClick={() => run(onControls)}
          >
            {t("toolbar.help")}
          </button>
          <button
            type="button"
            role="menuitem"
            className="toolbar-menu-item"
            onClick={() => run(onAbout)}
          >
            {t("toolbar.about")}
          </button>
        </div>
      )}
    </div>
  );
}

export function Toolbar({
  onNew,
  onSave,
  onSaveAs,
  onOpen,
  onExport,
  onDiagramProperties,
  onControls,
  onAbout,
  onSettings,
  onFind,
}: ToolbarProps) {
  const { t } = useTranslation();
  const fitViewportToContent = useDiagramStore((s) => s.fitViewportToContent);
  const undo = useDiagramStore((s) => s.undo);
  const redo = useDiagramStore((s) => s.redo);
  const canUndo = useDiagramStore((s) => s.undoStack.length > 0);
  const canRedo = useDiagramStore((s) => s.redoStack.length > 0);
  const snapToGridEnabled = useDiagramStore((s) => s.snapToGridEnabled);
  const setSnapToGridEnabled = useDiagramStore((s) => s.setSnapToGridEnabled);

  return (
    <header className="toolbar">
      <div className="toolbar-group">
        <FileMenu
          onNew={onNew}
          onOpen={onOpen}
          onSave={onSave}
          onSaveAs={onSaveAs}
          onExport={onExport}
          onSettings={onSettings}
        />
        <HelpMenu onControls={onControls} onAbout={onAbout} />
      </div>

      <div
        className="toolbar-group toolbar-group-separated"
        role="group"
        aria-label={t("toolbar.history")}
      >
        <button
          type="button"
          className="toolbar-icon-button"
          onClick={() => undo()}
          disabled={!canUndo}
          aria-label={t("toolbar.undo")}
          title={t("toolbar.undoTitle")}
        >
          <UndoIcon />
        </button>
        <button
          type="button"
          className="toolbar-icon-button"
          onClick={() => redo()}
          disabled={!canRedo}
          aria-label={t("toolbar.redo")}
          title={t("toolbar.redoTitle")}
        >
          <RedoIcon />
        </button>
      </div>

      <div
        className="toolbar-group toolbar-group-separated"
        role="group"
        aria-label={t("canvas.fitToContent")}
      >
        <button
          type="button"
          className="toolbar-icon-button fit-to-content-button"
          onClick={() => fitViewportToContent()}
          aria-label={t("canvas.fitToContent")}
          title={t("canvas.fitToContentTitle")}
        >
          <FitToContentIcon />
        </button>
      </div>

      <div
        className="toolbar-group toolbar-group-separated"
        role="group"
        aria-label={t("toolbar.snapToGrid")}
      >
        <button
          type="button"
          className={
            snapToGridEnabled
              ? "toolbar-icon-button active"
              : "toolbar-icon-button"
          }
          aria-pressed={snapToGridEnabled}
          aria-label={t("toolbar.snapToGrid")}
          title={t("toolbar.snapToGridTitle")}
          onClick={() => setSnapToGridEnabled(!snapToGridEnabled)}
        >
          <SnapToGridIcon />
        </button>
      </div>

      <div className="toolbar-group toolbar-right">
        <button
          type="button"
          className="toolbar-icon-button"
          onClick={onFind}
          aria-label={t("toolbar.findAria")}
          title={t("toolbar.find")}
        >
          <SearchIcon />
        </button>
        <button type="button" onClick={onDiagramProperties}>
          {t("toolbar.diagramProperties")}
        </button>
      </div>
    </header>
  );
}
