import { Stage, Layer, Group as KonvaGroup } from "react-konva";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  const groups = useDiagramStore((s) => s.groups);
  const updateGroup = useDiagramStore((s) => s.updateGroup);
  const group = getGroupById({ groups }, groupId);

  if (!open || !group) return null;

  const previewSize = (MEMBERSHIP_CHIP_RADIUS + 4) * 2;
  const opacityPercent = Math.round(group.appearance.corridorOpacity * 100);

  const setCorridorOpacity = (rawPercent: number) => {
    const clamped = Math.min(100, Math.max(0, Math.round(rawPercent)));
    updateGroup(group.id, {
      appearance: { corridorOpacity: clamped / 100 },
    });
  };

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <h2>{t("chipAppearance.title")}</h2>
        <p className="hint">{t("chipAppearance.hint")}</p>

        <div className="field">
          <span>{t("chipAppearance.preview")}</span>
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
          label={t("chipAppearance.backgroundColour")}
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
          label={t("chipAppearance.symbolColour")}
          value={group.appearance.symbolColor}
          onChange={(symbolColor) =>
            updateGroup(group.id, { appearance: { symbolColor } })
          }
        />
        <RgbPicker
          label={t("chipAppearance.borderColour")}
          value={group.appearance.borderColor}
          onChange={(borderColor) =>
            updateGroup(group.id, { appearance: { borderColor } })
          }
        />

        <p className="hint">{t("chipAppearance.corridorHint")}</p>
        <RgbPicker
          label={t("chipAppearance.corridorColour")}
          value={group.appearance.corridorColor}
          onChange={(corridorColor) =>
            updateGroup(group.id, { appearance: { corridorColor } })
          }
        />
        <label className="field">
          <span>{t("chipAppearance.corridorOpacity")}</span>
          <div className="range-row">
            <input
              type="number"
              min={0}
              max={100}
              step={1}
              value={opacityPercent}
              aria-label={t("chipAppearance.corridorOpacity")}
              onChange={(e) => {
                if (e.target.value.trim() === "") return;
                const parsed = Number(e.target.value);
                if (!Number.isFinite(parsed)) return;
                setCorridorOpacity(parsed);
              }}
            />
            <span aria-hidden>%</span>
            <input
              type="range"
              min={0}
              max={100}
              value={opacityPercent}
              onChange={(e) => setCorridorOpacity(Number(e.target.value))}
            />
          </div>
        </label>

        <div className="dialog-actions">
          <button type="button" className="btn-primary" onClick={onClose}>
            {t("chipAppearance.done")}
          </button>
        </div>
      </div>
    </div>
  );
}
