import { useTranslation } from "react-i18next";

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
        <button type="button" onClick={onSettings}>
          {t("toolbar.settings")}
        </button>
      </div>
    </header>
  );
}
