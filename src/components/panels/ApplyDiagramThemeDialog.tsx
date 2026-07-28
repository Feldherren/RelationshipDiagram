import { useEffect, useId, useState } from "react";
import { useTranslation } from "react-i18next";

interface ApplyDiagramThemeDialogProps {
  open: boolean;
  themeName: string;
  remappableCount: number;
  onCancel: () => void;
  onConfirm: (remapDefaultColors: boolean) => void;
}

export function ApplyDiagramThemeDialog({
  open,
  themeName,
  remappableCount,
  onCancel,
  onConfirm,
}: ApplyDiagramThemeDialogProps) {
  const { t } = useTranslation();
  const titleId = useId();
  const remapId = useId();
  const [remapDefaultColors, setRemapDefaultColors] = useState(true);

  useEffect(() => {
    if (!open) return;
    setRemapDefaultColors(true);
  }, [open, themeName]);

  if (!open) return null;

  const submit = () => {
    onConfirm(remappableCount > 0 && remapDefaultColors);
  };

  return (
    <div
      className="dialog-overlay dialog-overlay-nested"
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
        <h2 id={titleId}>
          {t("diagramProperties.applyThemeConfirmTitle", { name: themeName })}
        </h2>
        <p className="hint">{t("diagramProperties.applyThemeConfirmHint")}</p>

        {remappableCount > 0 && (
          <label className="field checkbox" htmlFor={remapId}>
            <input
              id={remapId}
              type="checkbox"
              checked={remapDefaultColors}
              onChange={(e) => setRemapDefaultColors(e.target.checked)}
            />
            <span>{t("diagramProperties.applyThemeRemapDefaults")}</span>
          </label>
        )}

        <div className="dialog-actions">
          <button type="button" className="btn-secondary" onClick={onCancel}>
            {t("diagramProperties.applyThemeConfirmCancel")}
          </button>
          <button type="button" className="btn-primary" onClick={submit}>
            {t("diagramProperties.applyThemeConfirmApply")}
          </button>
        </div>
      </div>
    </div>
  );
}
