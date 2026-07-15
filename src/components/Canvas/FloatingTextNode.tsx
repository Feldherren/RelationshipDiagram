import { useRef } from "react";
import { Group, Rect, Text } from "react-konva";
import type { FloatingText } from "../../models/types";
import {
  DEFAULT_FLOATING_TEXT_COLOR,
  DEFAULT_FLOATING_TEXT_FONT_SIZE,
  rgbToCss,
} from "../../models/types";
import { useDiagramStore } from "../../store/diagramStore";
import { formatFontForCanvas } from "../../utils/diagramFont";
import { getFloatingTextSize } from "../../utils/labelMetrics";
import { SELECTION_PILL_NODE_NAME } from "../../utils/export";

interface FloatingTextNodeProps {
  floatingText: FloatingText;
  selected: boolean;
  draggable: boolean;
  onSelect: () => void;
  onDragMove: (pos: { x: number; y: number }) => void;
  onDragEnd: (pos: { x: number; y: number }) => void;
}

const PLACEHOLDER = "Text";
const SELECTION_STROKE = "#4a90d9";

export function FloatingTextNode({
  floatingText,
  selected,
  draggable,
  onSelect,
  onDragMove,
  onDragEnd,
}: FloatingTextNodeProps) {
  const allowDragRef = useRef(true);
  const setSelection = useDiagramStore((s) => s.setSelection);
  const fontFamily = useDiagramStore((s) => s.diagramFontFamily);
  const hasText = Boolean(floatingText.text.trim());
  const displayText = hasText ? floatingText.text : PLACEHOLDER;
  const fontSize = floatingText.fontSize || DEFAULT_FLOATING_TEXT_FONT_SIZE;
  const color = floatingText.color ?? DEFAULT_FLOATING_TEXT_COLOR;
  const { width, height } = getFloatingTextSize(
    displayText,
    fontSize,
    fontFamily,
  );
  const rectX = -width / 2;
  const rectY = -height / 2;

  return (
    <Group
      x={floatingText.position.x}
      y={floatingText.position.y}
      draggable={draggable}
      onMouseDown={(e) => {
        allowDragRef.current = e.evt.button === 0;
      }}
      onTouchStart={() => {
        allowDragRef.current = true;
      }}
      onClick={(e) => {
        e.cancelBubble = true;
        if (e.evt.button !== 0) return;
        onSelect();
      }}
      onTap={(e) => {
        e.cancelBubble = true;
        onSelect();
      }}
      onDragStart={(e) => {
        if (!allowDragRef.current) {
          e.target.stopDrag();
          return;
        }
        // Dragging is layout, not inspect — close any open float.
        setSelection(null);
      }}
      onDragMove={(e) => {
        onDragMove({ x: e.target.x(), y: e.target.y() });
      }}
      onDragEnd={(e) => {
        onDragEnd({ x: e.target.x(), y: e.target.y() });
      }}
    >
      <Rect
        name={selected ? SELECTION_PILL_NODE_NAME : undefined}
        exportUnselectedStroke="transparent"
        exportUnselectedStrokeWidth={0}
        x={rectX}
        y={rectY}
        width={width}
        height={height}
        fill="transparent"
        stroke={selected ? SELECTION_STROKE : "transparent"}
        strokeWidth={selected ? 1.5 : 0}
        dash={selected ? [5, 4] : undefined}
        listening
      />
      <Text
        text={displayText}
        fontFamily={formatFontForCanvas(fontFamily)}
        fontSize={fontSize}
        fill={rgbToCss(color)}
        x={rectX}
        y={rectY}
        width={width}
        height={height}
        align="center"
        verticalAlign="middle"
        listening={false}
      />
    </Group>
  );
}
