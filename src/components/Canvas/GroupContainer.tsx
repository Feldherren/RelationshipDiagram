import { Circle, Group, Rect, Text } from "react-konva";
import type { Group as GroupType } from "../../models/types";
import type { Character } from "../../models/types";
import { COLLAPSED_GROUP_SIZE, rgbToCss } from "../../models/types";
import { rgbaWithAlpha, getGroupMemberBounds } from "../../utils/geometry";

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
  if (group.collapsed) {
    const pos = group.collapsedPosition ?? { x: 0, y: 0 };
    const color = rgbToCss(group.borderColor);
    const size = COLLAPSED_GROUP_SIZE;

    return (
      <Group
        x={pos.x}
        y={pos.y}
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
        {selected && (
          <Circle
            radius={size + 6}
            stroke="#4a90d9"
            strokeWidth={2}
            dash={[6, 4]}
            listening={false}
          />
        )}
        <Circle
          radius={size}
          stroke={color}
          strokeWidth={3}
          fill={rgbaWithAlpha(group.borderColor, 0.15)}
        />
        <Text
          text={group.name}
          fontSize={12}
          fontStyle="bold"
          fill="#222"
          align="center"
          width={size * 2.5}
          offsetX={(size * 2.5) / 2}
          y={-8}
          listening={false}
        />
        <Text
          text={`${group.memberCharacterIds.length}`}
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
      <Rect
        x={bounds.x}
        y={bounds.y}
        width={bounds.width}
        height={bounds.height}
        stroke={selected ? "#4a90d9" : color}
        strokeWidth={selected ? 3 : 2}
        dash={selected ? [6, 4] : undefined}
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
      <Text
        x={bounds.x + 12}
        y={bounds.y + 6}
        text={group.name}
        fontSize={13}
        fontStyle="bold"
        fill="#333"
        listening={false}
      />
    </Group>
  );
}
