import { useTranslation } from "react-i18next";

interface ToolbarProps {
  onNew: () => void;
  onSave: () => void;
  onOpen: () => void;
  onExport: () => void;
  onDiagramProperties: () => void;
  onSettings: () => void;
}

function SettingsGearIcon() {
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
        d="M12 15.5A3.5 3.5 0 0 1 8.5 12 3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5 3.5 3.5 0 0 1-3.5 3.5m7.43-2.53c.04-.32.07-.64.07-.97 0-.33-.03-.66-.07-1l2.11-1.63c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.31-.61-.22l-2.49 1c-.52-.39-1.06-.73-1.69-.98l-.37-2.65A.506.506 0 0 0 14 2h-4c-.25 0-.46.18-.5.42l-.37 2.65c-.63.25-1.17.59-1.69.98l-2.49-1c-.22-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64L4.57 11c-.04.34-.07.67-.07 1 0 .33.03.65.07.97l-2.11 1.66c-.19.15-.25.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1.01c.52.4 1.06.74 1.69.99l.37 2.65c.04.24.25.42.5.42h4c.25 0 .46-.18.5-.42l.37-2.65c.63-.26 1.17-.59 1.69-.99l2.49 1.01c.22.08.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.66Z"
      />
    </svg>
  );
}

export function Toolbar({
  onNew,
  onSave,
  onOpen,
  onExport,
  onDiagramProperties,
  onSettings,
}: ToolbarProps) {
  const { t } = useTranslation();

  return (
    <header className="toolbar">
      <div className="toolbar-group">
        <button type="button" onClick={onNew}>
          {t("toolbar.new")}
        </button>
        <button type="button" onClick={onOpen}>
          {t("toolbar.open")}
        </button>
        <button type="button" onClick={onSave}>
          {t("toolbar.save")}
        </button>
        <button type="button" onClick={onExport}>
          {t("toolbar.export")}
        </button>
      </div>

      <div className="toolbar-group toolbar-right">
        <button type="button" onClick={onDiagramProperties}>
          {t("toolbar.diagramProperties")}
        </button>
        <button
          type="button"
          className="toolbar-icon-button"
          onClick={onSettings}
          aria-label={t("toolbar.settingsAria")}
          title={t("toolbar.settings")}
        >
          <SettingsGearIcon />
        </button>
      </div>
    </header>
  );
}
