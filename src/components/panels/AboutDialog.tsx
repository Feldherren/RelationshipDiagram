import { useTranslation } from "react-i18next";
import packageJson from "../../../package.json";

interface AboutDialogProps {
  open: boolean;
  onClose: () => void;
}

export function AboutDialog({ open, onClose }: AboutDialogProps) {
  const { t } = useTranslation();

  if (!open) return null;

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div
        className="dialog dialog-about"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="about-dialog-title"
      >
        <h2 id="about-dialog-title">{t("about.title")}</h2>
        <p>{t("app.name")}</p>
        <p className="hint">
          {t("appSettings.version", { version: packageJson.version })}
        </p>
        <p>
          <a
            className="text-link"
            href="https://github.com/Feldherren/RelationshipDiagram"
            target="_blank"
            rel="noopener noreferrer"
          >
            {t("appSettings.githubRepo")}
          </a>
        </p>
        <div className="dialog-actions">
          <button type="button" className="btn-primary" onClick={onClose}>
            {t("about.close")}
          </button>
        </div>
      </div>
    </div>
  );
}
