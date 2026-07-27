import { useId } from "react";
import { useTranslation } from "react-i18next";
import { getUriScheme } from "../../utils/uri";

interface OpenExternalLinkDialogProps {
  open: boolean;
  uri: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export function OpenExternalLinkDialog({
  open,
  uri,
  onCancel,
  onConfirm,
}: OpenExternalLinkDialogProps) {
  const { t } = useTranslation();
  const titleId = useId();
  const uriId = useId();
  const scheme = getUriScheme(uri) ?? "";

  if (!open) return null;

  return (
    <div
      className="dialog-overlay"
      onClick={onCancel}
      role="presentation"
    >
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id={titleId}>{t("selection.openLinkConfirmTitle")}</h2>
        <p className="hint">
          {t("selection.openLinkConfirmScheme", { scheme })}
        </p>

        <div className="field">
          <span id={uriId}>{t("selection.openLinkConfirmUriLabel")}</span>
          <p
            className="external-link-confirm-uri"
            aria-labelledby={uriId}
          >
            {uri}
          </p>
        </div>

        <p className="hint">{t("selection.openLinkConfirmHint")}</p>

        <div className="dialog-actions">
          <button type="button" className="btn-secondary" onClick={onCancel}>
            {t("selection.openLinkConfirmCancel")}
          </button>
          <button type="button" className="btn-primary" onClick={onConfirm}>
            {t("selection.openLinkConfirmOpen")}
          </button>
        </div>
      </div>
    </div>
  );
}
