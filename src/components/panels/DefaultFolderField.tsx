import { useTranslation } from "react-i18next";
import { pickDirectory } from "../../utils/fileDialogPaths";
import { isTauriApp } from "../../utils/tauri";

interface DefaultFolderFieldProps {
  label: string;
  hint: string;
  value: string | null;
  onChange: (directory: string | null) => void;
}

export function DefaultFolderField({
  label,
  hint,
  value,
  onChange,
}: DefaultFolderFieldProps) {
  const { t } = useTranslation();
  const desktopOnly = !isTauriApp();

  const handleChoose = async () => {
    if (desktopOnly) return;
    const selected = await pickDirectory(value);
    if (selected) onChange(selected);
  };

  return (
    <div className="default-folder-field">
      <label className="field">
        <span>{label}</span>
        <input
          type="text"
          readOnly
          value={value ?? ""}
          placeholder={t("appSettings.defaultFolderUnset")}
        />
      </label>
      <div className="default-folder-actions">
        <button
          type="button"
          className="btn-secondary"
          disabled={desktopOnly}
          onClick={() => void handleChoose()}
        >
          {t("appSettings.defaultFolderChoose")}
        </button>
        <button
          type="button"
          className="btn-secondary"
          disabled={desktopOnly || !value}
          onClick={() => onChange(null)}
        >
          {t("appSettings.defaultFolderClear")}
        </button>
      </div>
      <p className="hint">
        {desktopOnly ? t("appSettings.defaultFolderDesktopOnly") : hint}
      </p>
    </div>
  );
}
