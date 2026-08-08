import { Circle, Group, Text } from "react-konva";
import type Konva from "konva";
import {
  CONNECT_HANDLE_FONT_SIZE,
  CONNECT_HANDLE_RADIUS,
} from "../../utils/connection";
import { EXPORT_CONNECT_HANDLE_NODE_NAME } from "../../utils/export";

interface ConnectHandleProps {
  x: number;
  y: number;
  isConnectSource: boolean;
  onMouseDown: (e: Konva.KonvaEventObject<MouseEvent>) => void;
}

export function ConnectHandle({
  x,
  y,
  isConnectSource,
  onMouseDown,
}: ConnectHandleProps) {
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
        radius={CONNECT_HANDLE_RADIUS}
        fill={isConnectSource ? "#2f6fb3" : "#4a90d9"}
        stroke="#ffffff"
        strokeWidth={2}
        shadowColor="rgba(0,0,0,0.25)"
        shadowBlur={4}
        shadowOffset={{ x: 0, y: 1 }}
      />
      <Text
        text="+"
        fontSize={CONNECT_HANDLE_FONT_SIZE}
        fontStyle="bold"
        fill="#ffffff"
        align="center"
        verticalAlign="middle"
        width={CONNECT_HANDLE_RADIUS * 2}
        height={CONNECT_HANDLE_RADIUS * 2}
        offsetX={CONNECT_HANDLE_RADIUS}
        offsetY={CONNECT_HANDLE_RADIUS}
        listening={false}
      />
    </Group>
  );
}
