import { Circle, Group, Text } from "react-konva";
import type Konva from "konva";
import {
  CONNECT_HANDLE_FONT_SIZE,
  CONNECT_HANDLE_SCREEN_RADIUS,
} from "../../utils/connection";
import { EXPORT_CONNECT_HANDLE_NODE_NAME } from "../../utils/export";

interface ConnectHandleProps {
  x: number;
  y: number;
  viewportScale: number;
  isConnectSource: boolean;
  onMouseDown: (e: Konva.KonvaEventObject<MouseEvent>) => void;
}

export function ConnectHandle({
  x,
  y,
  viewportScale,
  isConnectSource,
  onMouseDown,
}: ConnectHandleProps) {
  const handleRadius = CONNECT_HANDLE_SCREEN_RADIUS / viewportScale;
  const handleFontSize = CONNECT_HANDLE_FONT_SIZE / viewportScale;

  return (
    <Group
      name={EXPORT_CONNECT_HANDLE_NODE_NAME}
      x={x}
      y={y}
      onMouseDown={(e) => {
        e.cancelBubble = true;
        onMouseDown(e);
      }}
      onClick={(e) => {
        e.cancelBubble = true;
      }}
      onTap={(e) => {
        e.cancelBubble = true;
      }}
    >
      <Circle
        radius={handleRadius}
        fill={isConnectSource ? "#2f6fb3" : "#4a90d9"}
        stroke="#ffffff"
        strokeWidth={2 / viewportScale}
        shadowColor="rgba(0,0,0,0.25)"
        shadowBlur={4 / viewportScale}
        shadowOffset={{ x: 0, y: 1 / viewportScale }}
      />
      <Text
        text="+"
        fontSize={handleFontSize}
        fontStyle="bold"
        fill="#ffffff"
        align="center"
        verticalAlign="middle"
        width={handleRadius * 2}
        height={handleRadius * 2}
        offsetX={handleRadius}
        offsetY={handleRadius}
        listening={false}
      />
    </Group>
  );
}
