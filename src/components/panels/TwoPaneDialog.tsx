import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

export interface TwoPaneSection {
  id: string;
  label: string;
}

interface TwoPaneDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  sections: readonly TwoPaneSection[];
  activeSection: string;
  onSectionChange: (sectionId: string) => void;
  children: ReactNode;
  doneLabel?: string;
}

export function TwoPaneDialog({
  open,
  onClose,
  title,
  sections,
  activeSection,
  onSectionChange,
  children,
  doneLabel,
}: TwoPaneDialogProps) {
  const { t } = useTranslation();

  if (!open) return null;

  return (
    <div className="dialog-overlay dialog-overlay-two-pane" onClick={onClose}>
      <div
        className="dialog dialog-two-pane"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="two-pane-dialog-title"
      >
        <h2 id="two-pane-dialog-title">{title}</h2>

        <div className="two-pane">
          <nav className="two-pane-nav" aria-label={title}>
            {sections.map((section) => {
              const active = section.id === activeSection;
              return (
                <button
                  key={section.id}
                  type="button"
                  className={
                    active ? "two-pane-nav-item active" : "two-pane-nav-item"
                  }
                  aria-current={active ? "page" : undefined}
                  onClick={() => onSectionChange(section.id)}
                >
                  {section.label}
                </button>
              );
            })}
          </nav>
          <div className="two-pane-content">{children}</div>
        </div>

        <div className="dialog-actions">
          <button type="button" className="btn-primary" onClick={onClose}>
            {doneLabel ?? t("appSettings.done")}
          </button>
        </div>
      </div>
    </div>
  );
}
