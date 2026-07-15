import { useEffect, useState } from "react";
import { Stage, Layer, Group as KonvaGroup } from "react-konva";
import { useDiagramStore } from "../../store/diagramStore";
import { MEMBERSHIP_CHIP_RADIUS, rgbToCss } from "../../models/types";
import { getGroupById } from "../../utils/geometry";
import { MembershipAppearanceDialog } from "./MembershipAppearanceDialog";
import { MembershipChip } from "../Canvas/MembershipChips";

interface GroupsPanelProps {
  open: boolean;
  onClose: () => void;
}

export function GroupsPanel({ open, onClose }: GroupsPanelProps) {
  const [chipAppearanceOpen, setChipAppearanceOpen] = useState(false);
  const selection = useDiagramStore((s) => s.selection);
  const characters = useDiagramStore((s) => s.characters);
  const groups = useDiagramStore((s) => s.groups);
  const addGroup = useDiagramStore((s) => s.addGroup);
  const updateGroup = useDiagramStore((s) => s.updateGroup);
  const setSelection = useDiagramStore((s) => s.setSelection);
  const toolMode = useDiagramStore((s) => s.toolMode);
  const setToolMode = useDiagramStore((s) => s.setToolMode);
  const deleteSelected = useDiagramStore((s) => s.deleteSelected);

  const selectedGroupId =
    selection?.type === "group" ? selection.id : null;
  const selectedGroup = selectedGroupId
    ? getGroupById({ groups }, selectedGroupId)
    : undefined;

  useEffect(() => {
    setChipAppearanceOpen(false);
  }, [selectedGroupId]);

  if (!open) return null;

  const previewSize = (MEMBERSHIP_CHIP_RADIUS + 4) * 2;

  return (
    <>
      <aside className="groups-panel" aria-label="Groups">
        <div className="groups-panel-header">
          <h2>Groups</h2>
          <button
            type="button"
            className="btn-secondary groups-panel-close"
            onClick={onClose}
            aria-label="Close groups panel"
          >
            Close
          </button>
        </div>

        <p className="hint">
          Membership chips appear on characters. Selecting a group highlights
          its members.
        </p>

        <button
          type="button"
          className="btn-primary groups-panel-add"
          onClick={() => addGroup()}
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
                <li key={group.id}>
                  <button
                    type="button"
                    className={
                      selected
                        ? "groups-list-item active"
                        : "groups-list-item"
                    }
                    onClick={() =>
                      setSelection({ type: "group", id: group.id })
                    }
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
                </li>
              );
            })}
          </ul>
        )}

        {selectedGroup && (
          <div className="groups-panel-detail">
            <label className="field">
              <span>Name</span>
              <input
                type="text"
                value={selectedGroup.name}
                onChange={(e) =>
                  updateGroup(selectedGroup.id, { name: e.target.value })
                }
              />
            </label>
            <div className="field">
              <span>Chip</span>
              <div className="membership-chip-summary">
                <div className="membership-chip-preview">
                  <Stage width={previewSize} height={previewSize}>
                    <Layer>
                      <KonvaGroup x={previewSize / 2} y={previewSize / 2}>
                        <MembershipChip appearance={selectedGroup.appearance} />
                      </KonvaGroup>
                    </Layer>
                  </Stage>
                </div>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setChipAppearanceOpen(true)}
                >
                  Customise chip…
                </button>
              </div>
            </div>
            <div className="field">
              <span>Members ({selectedGroup.memberCharacterIds.length})</span>
              {characters.length === 0 ? (
                <p className="hint">No characters to assign.</p>
              ) : (
                <>
                  <button
                    type="button"
                    className={
                      toolMode === "editGroupMembers"
                        ? "btn-primary"
                        : "btn-secondary"
                    }
                    onClick={() =>
                      setToolMode(
                        toolMode === "editGroupMembers"
                          ? "select"
                          : "editGroupMembers",
                      )
                    }
                  >
                    {toolMode === "editGroupMembers"
                      ? "Done editing members"
                      : "Edit members on canvas"}
                  </button>
                  <p className="hint">
                    {toolMode === "editGroupMembers"
                      ? "Click characters on the canvas to add or remove them."
                      : "Enter edit mode, then click characters on the canvas to toggle membership."}
                  </p>
                </>
              )}
            </div>
            <button
              type="button"
              className="btn-danger"
              onClick={deleteSelected}
              disabled={toolMode === "editGroupMembers"}
            >
              Delete group
            </button>
          </div>
        )}
      </aside>
      {selectedGroup && (
        <MembershipAppearanceDialog
          groupId={selectedGroup.id}
          open={chipAppearanceOpen}
          onClose={() => setChipAppearanceOpen(false)}
        />
      )}
    </>
  );
}
