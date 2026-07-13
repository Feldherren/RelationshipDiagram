import { useState } from "react";
import { Circle, Group, Rect, Text } from "react-konva";
import type { Group as GroupType } from "../../models/types";
import type { Character } from "../../models/types";
import { COLLAPSED_GROUP_SIZE, rgbToCss } from "../../models/types";
import { rgbaWithAlpha, getGroupMemberBounds } from "../../utils/geometry";
import { getPillLabelHeight, PillLabel } from "./PillLabel";
import { formatFontForCanvas } from "../../utils/diagramFont";
import { useDiagramStore } from "../../store/diagramStore";
import {
  RadialAuraCircle,
  RoundedRectAura,
  shouldShowAura,
} from "./HoverAura";

interface GroupContainerProps {
  group: GroupType;
  characters: Character[];
  selected: boolean;
  onSelect: () => void;
  onToggleCollapse: () => void;
}

export function GroupContainer({
  group,
  characters,
  selected,
  onSelect,
  onToggleCollapse,
}: GroupContainerProps) {
  const diagramFontFamily = useDiagramStore((s) => s.diagramFontFamily);
  const [hovered, setHovered] = useState(false);
  const showAura = shouldShowAura(hovered, selected);

  if (group.collapsed) {
    const pos = group.collapsedPosition ?? { x: 0, y: 0 };
    const color = rgbToCss(group.borderColor);
    const size = COLLAPSED_GROUP_SIZE;

    return (
      <Group
        x={pos.x}
        y={pos.y}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={(e) => {
          e.cancelBubble = true;
          onSelect();
        }}
        onTap={(e) => {
          e.cancelBubble = true;
          onSelect();
        }}
        onDblClick={(e) => {
          e.cancelBubble = true;
          onToggleCollapse();
        }}
        onDblTap={(e) => {
          e.cancelBubble = true;
          onToggleCollapse();
        }}
      >
        {showAura && (
          <RadialAuraCircle innerRadius={size} color={group.borderColor} />
        )}
        <Circle
          radius={size}
          stroke={color}
          strokeWidth={3}
          fill={rgbaWithAlpha(group.borderColor, 0.15)}
        />
        <PillLabel
          text={group.name}
          y={-(size + getPillLabelHeight(12) / 2 + 6)}
          fontSize={12}
          fontStyle="bold"
          selected={selected}
        />
        <Text
          text={`${group.memberCharacterIds.length}`}
          fontFamily={formatFontForCanvas(diagramFontFamily)}
          fontSize={11}
          fill="#555"
          align="center"
          width={size * 2}
          offsetX={size}
          offsetY={5}
          listening={false}
        />
      </Group>
    );
  }

  const bounds = getGroupMemberBounds(group, characters);
  if (!bounds) return null;

  const color = rgbToCss(group.borderColor);

  return (
    <Group
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={(e) => {
        e.cancelBubble = true;
        onSelect();
      }}
      onTap={(e) => {
        e.cancelBubble = true;
        onSelect();
      }}
      onDblClick={(e) => {
        e.cancelBubble = true;
        onToggleCollapse();
      }}
      onDblTap={(e) => {
        e.cancelBubble = true;
        onToggleCollapse();
      }}
    >
      {showAura && (
        <RoundedRectAura
          x={bounds.x}
          y={bounds.y}
          width={bounds.width}
          height={bounds.height}
          color={group.borderColor}
        />
      )}
      <Rect
        x={bounds.x}
        y={bounds.y}
        width={bounds.width}
        height={bounds.height}
        stroke={color}
        strokeWidth={2}
        fill={rgbaWithAlpha(group.borderColor, 0.08)}
        cornerRadius={12}
      />
      <Rect
        x={bounds.x}
        y={bounds.y}
        width={bounds.width}
        height={28}
        fill={rgbaWithAlpha(group.borderColor, 0.2)}
        cornerRadius={[12, 12, 0, 0]}
        listening={false}
      />
      <PillLabel
        text={group.name}
        x={bounds.x + bounds.width / 2}
        y={bounds.y + 14}
        fontSize={12}
        fontStyle="bold"
        selected={selected}
      />
    </Group>
  );
}
