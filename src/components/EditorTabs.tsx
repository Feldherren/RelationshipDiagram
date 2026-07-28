import type { MouseEvent } from "react";
import { useTranslation } from "react-i18next";
import { useDiagramStore } from "../store/diagramStore";
import {
  basenameFromPath,
  sessionDisplayTitle,
} from "../store/diagramSession";
import { useOpenDocumentsStore } from "../store/openDocumentsStore";
import { confirmDialog } from "../utils/confirmDialog";

export function EditorTabs() {
  const { t } = useTranslation();
  const order = useOpenDocumentsStore((s) => s.order);
  const activeSessionId = useOpenDocumentsStore((s) => s.activeSessionId);
  const stashed = useOpenDocumentsStore((s) => s.stashed);
  const activeFilePath = useOpenDocumentsStore((s) => s.activeFilePath);
  const switchTab = useOpenDocumentsStore((s) => s.switchTab);
  const closeTab = useOpenDocumentsStore((s) => s.closeTab);
  const openNewTab = useOpenDocumentsStore((s) => s.openNewTab);
  const ready = useOpenDocumentsStore((s) => s.ready);

  const diagramTitle = useDiagramStore((s) => s.diagramTitle);
  const dirty = useDiagramStore((s) => s.dirty);

  if (!ready || order.length === 0) return null;

  const untitled = t("tabs.untitled");

  const handleClose = async (event: MouseEvent, sessionId: string) => {
    event.stopPropagation();
    const isActive = sessionId === activeSessionId;
    const tabDirty = isActive
      ? dirty
      : (stashed[sessionId]?.dirty ?? false);
    if (tabDirty) {
      const confirmed = await confirmDialog(t("tabs.closeDirtyConfirm"), {
        title: t("app.name"),
      });
      if (!confirmed) return;
    }
    await closeTab(sessionId);
  };

  return (
    <div className="editor-tabs" role="tablist" aria-label={t("tabs.listAria")}>
      <div className="editor-tabs-scroll">
        {order.map((sessionId) => {
          const active = sessionId === activeSessionId;
          const title = active
            ? diagramTitle
            : (stashed[sessionId]?.title ?? "");
          const tabDirty = active
            ? dirty
            : (stashed[sessionId]?.dirty ?? false);
          const filePath = active
            ? activeFilePath
            : stashed[sessionId]?.filePath;
          const label = sessionDisplayTitle(title, untitled);
          const tipParts = [label];
          const base = basenameFromPath(filePath);
          if (base && base !== label) tipParts.push(base);
          else if (filePath) tipParts.push(filePath);
          if (tabDirty) tipParts.push(t("tabs.unsaved"));

          return (
            <div
              key={sessionId}
              className={`editor-tab${active ? " active" : ""}`}
              role="tab"
              aria-selected={active}
              title={tipParts.join(" — ")}
              onClick={() => {
                void switchTab(sessionId);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  void switchTab(sessionId);
                }
              }}
              tabIndex={active ? 0 : -1}
            >
              <span className="editor-tab-label">
                {tabDirty ? (
                  <span className="editor-tab-dirty" aria-hidden="true">
                    •
                  </span>
                ) : null}
                {label}
              </span>
              <button
                type="button"
                className="editor-tab-close"
                aria-label={t("tabs.closeAria", { title: label })}
                title={t("tabs.close")}
                onClick={(e) => {
                  void handleClose(e, sessionId);
                }}
              >
                ×
              </button>
            </div>
          );
        })}
      </div>
      <button
        type="button"
        className="editor-tab-new"
        aria-label={t("tabs.newAria")}
        title={t("tabs.new")}
        onClick={() => {
          void openNewTab();
        }}
      >
        +
      </button>
    </div>
  );
}
