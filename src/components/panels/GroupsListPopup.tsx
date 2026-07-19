import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDiagramStore } from "../../store/diagramStore";
import { rgbToCss } from "../../models/types";
import {
  EyeOpenIcon,
  EyeHalfIcon,
  EyeClosedIcon,
} from "../icons/EyeIcon";
import { cycleGroupsCanvasMode } from "../../utils/groupHub";

export function GroupsListPopup() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selection = useDiagramStore((s) => s.selection);
  const groups = useDiagramStore((s) => s.groups);
  const groupsCanvasMode = useDiagramStore((s) => s.groupsCanvasMode);
  const setGroupsCanvasMode = useDiagramStore((s) => s.setGroupsCanvasMode);
  const addGroup = useDiagramStore((s) => s.addGroup);
  const setSelection = useDiagramStore((s) => s.setSelection);
  const setToolMode = useDiagramStore((s) => s.setToolMode);

  const selectedGroupId =
    selection?.type === "group" ? selection.id : null;

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (rootRef.current?.contains(target)) return;
      // Keep open while panning, zooming, or selecting on the canvas.
      if (
        target instanceof Element &&
        (target.closest(".canvas-container") ||
          target.closest(".selection-float"))
      ) {
        return;
      }
      setOpen(false);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const selectGroup = (groupId: string) => {
    setSelection({ type: "group", id: groupId });
    setOpen(false);
  };

  const editMembers = (groupId: string) => {
    setSelection({ type: "group", id: groupId });
    setToolMode("editGroupMembers");
    setOpen(false);
  };

  const modeLabel =
    groupsCanvasMode === "full"
      ? t("groups.canvasModeFull")
      : groupsCanvasMode === "connected"
        ? t("groups.canvasModeConnected")
        : t("groups.canvasModeHidden");

  return (
    <div className="groups-list-anchor" ref={rootRef}>
      {open && (
        <div
          className="groups-list-popup"
          role="dialog"
          aria-label={t("groups.title")}
        >
          <div className="groups-list-popup-header">
            <h2>{t("groups.title")}</h2>
          </div>
          <p className="hint">{t("groups.hint")}</p>
          <button
            type="button"
            className="btn-primary groups-list-add"
            onClick={() => {
              addGroup();
              setOpen(false);
            }}
          >
            {t("groups.add")}
          </button>
          {groups.length === 0 ? (
            <p className="hint">{t("groups.empty")}</p>
          ) : (
            <ul className="groups-list">
              {groups.map((group) => {
                const active = selectedGroupId === group.id;
                return (
                  <li key={group.id} className="groups-list-row">
                    <button
                      type="button"
                      className={
                        active
                          ? "groups-list-item active"
                          : "groups-list-item"
                      }
                      onClick={() => selectGroup(group.id)}
                    >
                      <span
                        className="membership-swatch"
                        style={{
                          background: rgbToCss(
                            group.appearance.backgroundColor,
                          ),
                        }}
                        aria-hidden
                      />
                      <span className="groups-list-name">{group.name}</span>
                      <span className="groups-list-count">
                        {group.memberCharacterIds.length}
                      </span>
                    </button>
                    <button
                      type="button"
                      className="groups-list-edit"
                      title={t("groups.editMembersTooltip")}
                      aria-label={t("groups.editMembersAria", {
                        name: group.name,
                      })}
                      onClick={() => editMembers(group.id)}
                    >
                      <span className="groups-list-edit-icon" aria-hidden>
                        ±
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
      <div className="groups-list-controls">
        <button
          type="button"
          className={
            open ? "groups-list-toggle active" : "groups-list-toggle"
          }
          aria-pressed={open}
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          {t("groups.title")}
        </button>
        <button
          type="button"
          className={
            groupsCanvasMode !== "hidden"
              ? "groups-visibility-toggle active"
              : "groups-visibility-toggle"
          }
          title={modeLabel}
          aria-label={modeLabel}
          onClick={() =>
            setGroupsCanvasMode(cycleGroupsCanvasMode(groupsCanvasMode))
          }
        >
          {groupsCanvasMode === "full" ? (
            <EyeOpenIcon className="groups-visibility-icon" size={18} />
          ) : groupsCanvasMode === "connected" ? (
            <EyeHalfIcon className="groups-visibility-icon" size={18} />
          ) : (
            <EyeClosedIcon className="groups-visibility-icon" size={18} />
          )}
        </button>
      </div>
    </div>
  );
}
