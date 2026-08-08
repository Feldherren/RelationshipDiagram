import { Circle, Group, Path } from "react-konva";
import type Konva from "konva";
import { BOX_COLLAPSE_CONTROL_RADIUS } from "../../utils/connection";
import { EXPORT_BOX_COLLAPSE_CONTROL_NODE_NAME } from "../../utils/export";

interface BoxCollapseControlProps {
  x: number;
  y: number;
  collapsed: boolean;
  onToggle: () => void;
}

/** Chevron path in a 12×12 viewBox, pointing up (collapse). */
const CHEVRON_UP =
  "M2.5 8.25 L6 4.75 L9.5 8.25 L8.35 9.4 L6 7.05 L3.65 9.4 Z";

const GLYPH_SCALE = (BOX_COLLAPSE_CONTROL_RADIUS * 1.35) / 6;

export function BoxCollapseControl({
  x,
  y,
  collapsed,
  onToggle,
}: BoxCollapseControlProps) {
  const stopGesture = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    e.cancelBubble = true;
    e.evt.preventDefault();
  };

  const handleToggle = (
    e: Konva.KonvaEventObject<MouseEvent | TouchEvent>,
  ) => {
    stopGesture(e);
    if ("button" in e.evt && e.evt.button !== 0) return;
    onToggle();
  };

  return (
    <Group
      name={EXPORT_BOX_COLLAPSE_CONTROL_NODE_NAME}
      x={x}
      y={y}
      onMouseEnter={() => {
        document.body.style.cursor = "pointer";
      }}
      onMouseLeave={() => {
        document.body.style.cursor = "";
      }}
      onMouseDown={stopGesture}
      onTouchStart={stopGesture}
      onClick={handleToggle}
      onTap={handleToggle}
      onDblClick={stopGesture}
      onDblTap={stopGesture}
    >
      <Circle
        radius={BOX_COLLAPSE_CONTROL_RADIUS}
        fill="#4a90d9"
        stroke="#ffffff"
        strokeWidth={2}
        shadowColor="rgba(0,0,0,0.25)"
        shadowBlur={4}
        shadowOffset={{ x: 0, y: 1 }}
      />
      <Path
        data={CHEVRON_UP}
        fill="#ffffff"
        scaleX={GLYPH_SCALE}
        scaleY={collapsed ? -GLYPH_SCALE : GLYPH_SCALE}
        offsetX={6}
        offsetY={6}
        listening={false}
      />
    </Group>
  );
}
