import { useSyncExternalStore } from "react";
import { Layer } from "react-konva";
import {
  MEMBERSHIP_CHIP_RADIUS,
  rgbToCss,
} from "../../models/types";
import { getPillLabelSize } from "../../utils/labelMetrics";
import {
  getMembershipChipTooltip,
  subscribeMembershipChipTooltip,
  type MembershipChipTooltip,
} from "../../utils/membershipChipTooltip";
import { useDiagramStore } from "../../store/diagramStore";
import { PillLabel } from "./PillLabel";

const CHIP_NAME_FONT_SIZE = 12;
const CHIP_NAME_LABEL_GAP = 6;

function MembershipChipNameLabel({
  tooltip,
}: {
  tooltip: MembershipChipTooltip;
}) {
  const scale = useDiagramStore((s) => s.viewport.scale);
  const diagramFontFamily = useDiagramStore((s) => s.diagramFontFamily);
  const nameLabel = useDiagramStore(
    (s) => s.diagramAppearance.characterNameLabel,
  );

  const inv = 1 / Math.max(0.01, scale);
  const fontSize = CHIP_NAME_FONT_SIZE * inv;
  const paddingX = 6 * inv;
  const paddingY = 3 * inv;
  const labelWidth = getPillLabelSize(
    tooltip.text,
    fontSize,
    "normal",
    diagramFontFamily,
    paddingX,
    paddingY,
  ).width;
  const x =
    tooltip.chipX -
    MEMBERSHIP_CHIP_RADIUS -
    CHIP_NAME_LABEL_GAP * inv -
    labelWidth / 2;

  return (
    <Layer listening={false}>
      <PillLabel
        text={tooltip.text}
        x={x}
        y={tooltip.chipY}
        fontSize={fontSize}
        paddingX={paddingX}
        paddingY={paddingY}
        strokeWidth={1 * inv}
        textFill={rgbToCss(nameLabel.textColor)}
        fill={rgbToCss(nameLabel.backgroundColor)}
        unselectedStroke={rgbToCss(nameLabel.borderColor)}
      />
    </Layer>
  );
}

/** Renders the hovered membership chip name above diagram content. */
export function MembershipChipNameOverlay() {
  const tooltip = useSyncExternalStore(
    subscribeMembershipChipTooltip,
    getMembershipChipTooltip,
    () => null,
  );
  if (!tooltip) return null;
  return <MembershipChipNameLabel tooltip={tooltip} />;
}
