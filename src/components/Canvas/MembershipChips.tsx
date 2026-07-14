import { Circle, Group, Text } from "react-konva";
import type {
  BorderShape,
  Group as MembershipGroup,
  MembershipAppearance,
  Point,
} from "../../models/types";
import {
  MEMBERSHIP_CHIP_MAX_VISIBLE,
  MEMBERSHIP_CHIP_RADIUS,
  rgbToCss,
} from "../../models/types";
import { formatFontForCanvas } from "../../utils/diagramFont";
import { useDiagramStore } from "../../store/diagramStore";

export interface MembershipChipItem {
  id: string;
  name: string;
  appearance: MembershipAppearance;
}

interface MembershipChipsProps {
  groups: MembershipChipItem[];
  characterSize: number;
  borderShape: BorderShape;
  highlightedGroupId?: string | null;
  onChipClick?: (groupId: string) => void;
}

function chipPositionOnBorder(
  index: number,
  count: number,
  size: number,
  shape: BorderShape,
): Point {
  // Fan chips along the lower-left arc, away from the connect handle (top-right).
  const startAngle = (Math.PI * 2) / 3; // 120°
  const endAngle = (Math.PI * 11) / 8; // 247.5°
  const t = count === 1 ? 0.5 : index / (count - 1);
  const angle = startAngle + (endAngle - startAngle) * t;

  let radius = size;
  if (shape === "square") {
    const c = Math.max(Math.abs(Math.cos(angle)), Math.abs(Math.sin(angle)));
    radius = size / (c || 1);
  } else if (shape === "pentagon" || shape === "hexagon") {
    const sides = shape === "pentagon" ? 5 : 6;
    const step = (2 * Math.PI) / sides;
    const start = -Math.PI / 2;
    let rel = angle - start;
    rel = ((rel % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    const sectorMid = start + Math.floor(rel / step) * step + step / 2;
    const alpha = angle - sectorMid;
    radius = (size * Math.cos(Math.PI / sides)) / Math.cos(alpha);
  }

  return {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius,
  };
}

/**
 * Renders a membership chip. Uses `appearance.backgroundColor` today;
 * `symbol` / `symbolColor` are reserved for a future icon overlay.
 */
export function MembershipChip({
  appearance,
  radius = MEMBERSHIP_CHIP_RADIUS,
  emphasized = false,
}: {
  appearance: MembershipAppearance;
  radius?: number;
  emphasized?: boolean;
}) {
  const fill = rgbToCss(appearance.backgroundColor);
  // Future: if appearance.symbol, draw glyph with appearance.symbolColor over fill.
  void appearance.symbol;
  void appearance.symbolColor;

  return (
    <Circle
      radius={radius}
      fill={fill}
      stroke={emphasized ? "#111" : "#333"}
      strokeWidth={emphasized ? 2.5 : 2}
      shadowColor="rgba(0,0,0,0.35)"
      shadowBlur={emphasized ? 4 : 3}
      shadowOpacity={1}
      shadowEnabled
    />
  );
}

export function MembershipChips({
  groups,
  characterSize,
  borderShape,
  highlightedGroupId,
  onChipClick,
}: MembershipChipsProps) {
  const diagramFontFamily = useDiagramStore((s) => s.diagramFontFamily);
  if (groups.length === 0) return null;

  const visible = groups.slice(0, MEMBERSHIP_CHIP_MAX_VISIBLE);
  const overflow = groups.length - visible.length;
  const chipCount = visible.length + (overflow > 0 ? 1 : 0);

  return (
    <Group listening={!!onChipClick}>
      {visible.map((group, index) => {
        const pos = chipPositionOnBorder(
          index,
          chipCount,
          characterSize,
          borderShape,
        );
        return (
          <Group
            key={group.id}
            x={pos.x}
            y={pos.y}
            onClick={(e) => {
              if (!onChipClick) return;
              e.cancelBubble = true;
              if (e.evt.button !== 0) return;
              onChipClick(group.id);
            }}
            onTap={(e) => {
              if (!onChipClick) return;
              e.cancelBubble = true;
              onChipClick(group.id);
            }}
          >
            <MembershipChip
              appearance={group.appearance}
              emphasized={highlightedGroupId === group.id}
            />
          </Group>
        );
      })}
      {overflow > 0 && (
        <Group
          x={
            chipPositionOnBorder(
              visible.length,
              chipCount,
              characterSize,
              borderShape,
            ).x
          }
          y={
            chipPositionOnBorder(
              visible.length,
              chipCount,
              characterSize,
              borderShape,
            ).y
          }
          listening={false}
        >
          <Circle
            radius={MEMBERSHIP_CHIP_RADIUS}
            fill="#e8e8e8"
            stroke="#333"
            strokeWidth={2}
          />
          <Text
            text={`+${overflow}`}
            fontFamily={formatFontForCanvas(diagramFontFamily)}
            fontSize={11}
            fill="#333"
            align="center"
            verticalAlign="middle"
            width={MEMBERSHIP_CHIP_RADIUS * 2}
            height={MEMBERSHIP_CHIP_RADIUS * 2}
            offsetX={MEMBERSHIP_CHIP_RADIUS}
            offsetY={MEMBERSHIP_CHIP_RADIUS}
            listening={false}
          />
        </Group>
      )}
    </Group>
  );
}

export function toChipItems(groups: MembershipGroup[]): MembershipChipItem[] {
  return groups.map((g) => ({
    id: g.id,
    name: g.name,
    appearance: g.appearance,
  }));
}
