import { useTranslation } from "react-i18next";
import { getAppPreferences } from "../../utils/appPreferences";

interface HelpControlsDialogProps {
  open: boolean;
  onClose: () => void;
}

type HelpRow = { keys: string; detail: string };

function HelpSection({
  title,
  rows,
}: {
  title: string;
  rows: HelpRow[];
}) {
  return (
    <section className="help-section">
      <h3>{title}</h3>
      <dl className="help-shortcut-list">
        {rows.map((row) => (
          <div key={row.keys} className="help-shortcut-row">
            <dt>{row.keys}</dt>
            <dd>{row.detail}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function HelpControlsDialog({ open, onClose }: HelpControlsDialogProps) {
  const { t } = useTranslation();

  if (!open) return null;

  const swapBookmarkClicks =
    getAppPreferences().swapBookmarkClickBehaviour;
  const bookmarkGoDetail = t("help.bookmarkDetail");
  const bookmarkCentreDetail = t("help.bookmarkCentreDetail");

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div
        className="dialog dialog-help"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-controls-title"
      >
        <h2 id="help-controls-title">{t("help.title")}</h2>
        <p className="hint">{t("help.intro")}</p>

        <HelpSection
          title={t("help.navigate")}
          rows={[
            {
              keys: t("help.panKeys"),
              detail: t("help.panDetail"),
            },
            {
              keys: t("help.middlePanKeys"),
              detail: t("help.middlePanDetail"),
            },
            {
              keys: t("help.zoomKeys"),
              detail: t("help.zoomDetail"),
            },
            {
              keys: t("help.zoomPresetKeys"),
              detail: t("help.zoomPresetDetail"),
            },
            {
              keys: t("help.fitKeys"),
              detail: t("help.fitDetail"),
            },
            {
              keys: t("help.bookmarkKeys"),
              detail: swapBookmarkClicks
                ? bookmarkCentreDetail
                : bookmarkGoDetail,
            },
            {
              keys: t("help.bookmarkCentreKeys"),
              detail: swapBookmarkClicks
                ? bookmarkGoDetail
                : bookmarkCentreDetail,
            },
            {
              keys: t("help.findKeys"),
              detail: t("help.findDetail"),
            },
          ]}
        />

        <HelpSection
          title={t("help.select")}
          rows={[
            {
              keys: t("help.clickSelectKeys"),
              detail: t("help.clickSelectDetail"),
            },
            {
              keys: t("help.marqueeKeys"),
              detail: t("help.marqueeDetail"),
            },
            {
              keys: t("help.clearSelectKeys"),
              detail: t("help.clearSelectDetail"),
            },
          ]}
        />

        <HelpSection
          title={t("help.create")}
          rows={[
            {
              keys: t("help.addObjectRmbKeys"),
              detail: t("help.addObjectRmbDetail"),
            },
            {
              keys: t("help.addObjectDblClickKeys"),
              detail: t("help.addObjectDblClickDetail"),
            },
          ]}
        />

        <HelpSection
          title={t("help.move")}
          rows={[
            {
              keys: t("help.dragKeys"),
              detail: t("help.dragDetail"),
            },
            {
              keys: t("help.multiMoveKeys"),
              detail: t("help.multiMoveDetail"),
            },
          ]}
        />

        <HelpSection
          title={t("help.edit")}
          rows={[
            {
              keys: t("help.deleteKeys"),
              detail: t("help.deleteDetail"),
            },
            {
              keys: t("help.editTextKeys"),
              detail: t("help.editTextDetail"),
            },
            {
              keys: t("help.propertiesKeys"),
              detail: t("help.propertiesDetail"),
            },
            {
              keys: t("help.escapeKeys"),
              detail: t("help.escapeDetail"),
            },
            {
              keys: t("help.undoKeys"),
              detail: t("help.undoDetail"),
            },
          ]}
        />

        <HelpSection
          title={t("help.connectGroups")}
          rows={[
            {
              keys: t("help.connectKeys"),
              detail: t("help.connectDetail"),
            },
            {
              keys: t("help.groupsKeys"),
              detail: t("help.groupsDetail"),
            },
          ]}
        />

        <div className="dialog-actions">
          <button type="button" className="btn-primary" onClick={onClose}>
            {t("help.close")}
          </button>
        </div>
      </div>
    </div>
  );
}
