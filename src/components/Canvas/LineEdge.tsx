import { Arrow, Group, Rect, Text } from "react-konva";
import type { Line } from "../../models/types";
import { rgbToCss } from "../../models/types";
import type { Diagram } from "../../models/types";
import { routeLine } from "../../utils/lineRouting";

interface LineEdgeProps {
  line: Line;
  diagram: Diagram;
  selected: boolean;
  onSelect: () => void;
}

export function LineEdge({ line, diagram, selected, onSelect }: LineEdgeProps) {
  const routed = routeLine(line, diagram);
  const color = rgbToCss(line.color);
  const dash = line.style === "dotted" ? [8, 6] : undefined;
  const labelHeight = 20;
  const labelWidth = line.label
    ? Math.max(line.label.length * 7, 24)
    : 0;

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
    >
      <Arrow
        points={routed.points}
        stroke={color}
        fill={color}
        strokeWidth={selected ? 3 : 2}
        dash={dash}
        pointerLength={10}
        pointerWidth={8}
        pointerAtBeginning={line.startArrow}
        pointerAtEnding={line.endArrow}
        hitStrokeWidth={16}
        lineCap="round"
        lineJoin="round"
      />
      {line.label && (
        <Group
          x={routed.labelPoint.x}
          y={routed.labelPoint.y}
          listening={false}
        >
          <Rect
            x={-labelWidth / 2}
            y={-labelHeight / 2}
            width={labelWidth}
            height={labelHeight}
            fill="white"
            opacity={0.85}
            cornerRadius={4}
            listening={false}
          />
          <Text
            text={line.label}
            fontSize={12}
            fill="#333"
            x={-labelWidth / 2}
            y={-labelHeight / 2}
            width={labelWidth}
            height={labelHeight}
            align="center"
            verticalAlign="middle"
            listening={false}
          />
        </Group>
      )}
    </Group>
  );
}
