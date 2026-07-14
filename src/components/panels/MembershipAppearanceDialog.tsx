import { Stage, Layer, Group as KonvaGroup } from "react-konva";
import { useDiagramStore } from "../../store/diagramStore";
import { RgbPicker } from "../pickers/RgbPicker";
import { MembershipSymbolPicker } from "../pickers/MembershipSymbolPicker";
import { MEMBERSHIP_CHIP_RADIUS } from "../../models/types";
import { getGroupById } from "../../utils/geometry";
import { MembershipChip } from "../Canvas/MembershipChips";

interface MembershipAppearanceDialogProps {
  groupId: string;
  open: boolean;
  onClose: () => void;
}

export function MembershipAppearanceDialog({
  groupId,
  open,
  onClose,
}: MembershipAppearanceDialogProps) {
  const groups = useDiagramStore((s) => s.groups);
  const updateGroup = useDiagramStore((s) => s.updateGroup);
  const group = getGroupById({ groups }, groupId);

  if (!open || !group) return null;

  const previewSize = (MEMBERSHIP_CHIP_RADIUS + 4) * 2;

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <h2>Chip appearance</h2>
        <p className="hint">
          How this group looks on member characters.
        </p>

        <div className="field">
          <span>Preview</span>
          <div className="membership-chip-preview">
            <Stage width={previewSize} height={previewSize}>
              <Layer>
                <KonvaGroup x={previewSize / 2} y={previewSize / 2}>
                  <MembershipChip appearance={group.appearance} />
                </KonvaGroup>
              </Layer>
            </Stage>
          </div>
        </div>

        <RgbPicker
          label="Background colour"
          value={group.appearance.backgroundColor}
          onChange={(backgroundColor) =>
            updateGroup(group.id, { appearance: { backgroundColor } })
          }
        />
        <MembershipSymbolPicker
          value={group.appearance.symbol}
          onChange={(symbol) =>
            updateGroup(group.id, { appearance: { symbol } })
          }
        />
        <RgbPicker
          label="Symbol colour"
          value={group.appearance.symbolColor}
          onChange={(symbolColor) =>
            updateGroup(group.id, { appearance: { symbolColor } })
          }
        />
        <RgbPicker
          label="Border colour"
          value={group.appearance.borderColor}
          onChange={(borderColor) =>
            updateGroup(group.id, { appearance: { borderColor } })
          }
        />

        <div className="dialog-actions">
          <button type="button" className="btn-primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
