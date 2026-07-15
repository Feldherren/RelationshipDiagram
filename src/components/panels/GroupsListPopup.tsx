import { useEffect, useRef, useState } from "react";
import { useDiagramStore } from "../../store/diagramStore";
import { rgbToCss } from "../../models/types";

export function GroupsListPopup() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selection = useDiagramStore((s) => s.selection);
  const groups = useDiagramStore((s) => s.groups);
  const addGroup = useDiagramStore((s) => s.addGroup);
  const setSelection = useDiagramStore((s) => s.setSelection);
  const setToolMode = useDiagramStore((s) => s.setToolMode);

  const selectedGroupId =
    selection?.type === "group" ? selection.id : null;

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (e: MouseEvent) => {
      if (rootRef.current?.contains(e.target as Node)) return;
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

  return (
    <div className="groups-list-anchor" ref={rootRef}>
      {open && (
        <div className="groups-list-popup" role="dialog" aria-label="Groups">
          <div className="groups-list-popup-header">
            <h2>Groups</h2>
          </div>
          <p className="hint">
            Select a group to highlight members and edit it.
          </p>
          <button
            type="button"
            className="btn-primary groups-list-add"
            onClick={() => {
              addGroup();
              setOpen(false);
            }}
          >
            Add group
          </button>
          {groups.length === 0 ? (
            <p className="hint">No groups yet.</p>
          ) : (
            <ul className="groups-list">
              {groups.map((group) => {
                const selected = selectedGroupId === group.id;
                return (
                  <li key={group.id} className="groups-list-row">
                    <button
                      type="button"
                      className={
                        selected
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
                      title="Edit members on canvas"
                      aria-label={`Edit members of ${group.name}`}
                      onClick={() => editMembers(group.id)}
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 16 16"
                        aria-hidden
                      >
                        <path
                          fill="currentColor"
                          d="M11.6 1.4a1.4 1.4 0 0 1 2 2L5.2 11.8 2 12.8l1-3.2 8.6-8.2Zm1 1-8.5 8.2-.4 1.3 1.3-.4 8.5-8.2-.9-.9Z"
                        />
                      </svg>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
      <button
        type="button"
        className={
          open ? "groups-list-toggle active" : "groups-list-toggle"
        }
        aria-pressed={open}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        Groups
      </button>
    </div>
  );
}
