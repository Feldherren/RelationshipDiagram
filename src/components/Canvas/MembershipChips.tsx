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
import {
  getMembershipChipTooltip,
  setMembershipChipTooltip,
} from "../../utils/membershipChipTooltip";
import { MembershipChipSymbol } from "./MembershipChipSymbol";

export interface MembershipChipItem {
  id: string;
  name: string;
  appearance: MembershipAppearance;
}

interface MembershipChipsProps {
  groups: MembershipChipItem[];
  characterSize: number;
  borderShape: BorderShape;
  /** Character centre in world space — used to place the hover name overlay. */
  characterX: number;
  characterY: number;
  highlightedGroupId?: string | null;
  onChipClick?: (groupId: string) => void;
}

function chipPositionOnBorder(
  index: number,
  size: number,
  shape: BorderShape,
): Point {
  // First chip at upper-left; each next chip is one step counter-clockwise.
  // Konva y is down, so visual CCW decreases angle.
  const startAngle = (-3 * Math.PI) / 4;
  const spacing =
    MEMBERSHIP_CHIP_RADIUS * 2 + Math.max(2, MEMBERSHIP_CHIP_RADIUS * 0.25);
  const angleStep = spacing / Math.max(size, 1);
  const angle = startAngle - index * angleStep;

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

/** Matches relationship-line stroke; reads closer to character borders on small chips. */
const MEMBERSHIP_CHIP_BORDER_STROKE_WIDTH = 2;

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
  const border = rgbToCss(appearance.borderColor);

  return (
    <Group>
      <Circle
        radius={radius}
        fill={fill}
        stroke={border}
        strokeWidth={
          emphasized
            ? MEMBERSHIP_CHIP_BORDER_STROKE_WIDTH + 0.5
            : MEMBERSHIP_CHIP_BORDER_STROKE_WIDTH
        }
        shadowColor="rgba(0,0,0,0.35)"
        shadowBlur={emphasized ? 4 : 3}
        shadowOpacity={1}
        shadowEnabled
        // Avoid Konva buffer canvas so fill/stroke survive cropped PNG export.
        perfectDrawEnabled={false}
        shadowForStrokeEnabled={false}
      />
      <MembershipChipSymbol
        symbol={appearance.symbol}
        color={appearance.symbolColor}
        chipRadius={radius}
      />
    </Group>
  );
}

function MembershipChipHitTarget({
  group,
  x,
  y,
  characterX,
  characterY,
  emphasized,
  onChipClick,
}: {
  group: MembershipChipItem;
  x: number;
  y: number;
  characterX: number;
  characterY: number;
  emphasized: boolean;
  onChipClick?: (groupId: string) => void;
}) {
  const label = group.name.trim();

  return (
    <Group
      x={x}
      y={y}
      onMouseEnter={() => {
        if (!label) return;
        setMembershipChipTooltip({
          id: group.id,
          text: label,
          chipX: characterX + x,
          chipY: characterY + y,
        });
      }}
      onMouseLeave={() => {
        if (getMembershipChipTooltip()?.id === group.id) {
          setMembershipChipTooltip(null);
        }
      }}
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
      <MembershipChip appearance={group.appearance} emphasized={emphasized} />
    </Group>
  );
}

export function MembershipChips({
  groups,
  characterSize,
  borderShape,
  characterX,
  characterY,
  highlightedGroupId,
  onChipClick,
}: MembershipChipsProps) {
  const diagramFontFamily = useDiagramStore((s) => s.diagramFontFamily);
  if (groups.length === 0) return null;

  const visible = groups.slice(0, MEMBERSHIP_CHIP_MAX_VISIBLE);
  const overflow = groups.length - visible.length;

  return (
    <Group listening>
      {visible.map((group, index) => {
        const pos = chipPositionOnBorder(index, characterSize, borderShape);
        return (
          <MembershipChipHitTarget
            key={group.id}
            group={group}
            x={pos.x}
            y={pos.y}
            characterX={characterX}
            characterY={characterY}
            emphasized={highlightedGroupId === group.id}
            onChipClick={onChipClick}
          />
        );
      })}
      {overflow > 0 && (
        <Group
          x={
            chipPositionOnBorder(visible.length, characterSize, borderShape).x
          }
          y={
            chipPositionOnBorder(visible.length, characterSize, borderShape).y
          }
          listening={false}
        >
          <Circle
            radius={MEMBERSHIP_CHIP_RADIUS}
            fill="#e8e8e8"
            stroke="#333"
            strokeWidth={MEMBERSHIP_CHIP_BORDER_STROKE_WIDTH}
            perfectDrawEnabled={false}
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
