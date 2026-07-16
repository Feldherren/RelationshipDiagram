import { useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

interface ForkDiagramThemeDialogProps {
  open: boolean;
  onCancel: () => void;
  onConfirm: (name: string) => void;
}

export function ForkDiagramThemeDialog({
  open,
  onCancel,
  onConfirm,
}: ForkDiagramThemeDialogProps) {
  const { t } = useTranslation();
  const nameId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const defaultName = t("diagramAppearance.themeDefaultName");
  const [name, setName] = useState(defaultName);

  useEffect(() => {
    if (!open) return;
    setName(defaultName);
    const frame = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open, defaultName]);

  if (!open) return null;

  const submit = () => {
    onConfirm(name.trim() || defaultName);
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
        aria-labelledby={`${nameId}-title`}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id={`${nameId}-title`}>
          {t("diagramAppearance.themeForkFromDefaultTitle")}
        </h2>
        <p className="hint">{t("diagramAppearance.themeForkFromDefaultHint")}</p>

        <label className="field" htmlFor={nameId}>
          <span>{t("diagramAppearance.themeName")}</span>
          <input
            ref={inputRef}
            id={nameId}
            type="text"
            value={name}
            placeholder={defaultName}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submit();
              }
              if (e.key === "Escape") {
                e.preventDefault();
                onCancel();
              }
            }}
          />
        </label>

        <div className="dialog-actions">
          <button type="button" className="btn-secondary" onClick={onCancel}>
            {t("diagramAppearance.themeForkFromDefaultCancel")}
          </button>
          <button type="button" className="btn-primary" onClick={submit}>
            {t("diagramAppearance.themeForkFromDefaultCreate")}
          </button>
        </div>
      </div>
    </div>
  );
}
