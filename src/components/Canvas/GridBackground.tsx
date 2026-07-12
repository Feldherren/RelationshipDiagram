import { useMemo } from "react";
import { Shape } from "react-konva";
import type { Viewport } from "../../models/types";

interface GridBackgroundProps {
  viewport: Viewport;
  stageWidth: number;
  stageHeight: number;
  gridSize?: number;
}

export function GridBackground({
  viewport,
  stageWidth,
  stageHeight,
  gridSize = 40,
}: GridBackgroundProps) {
  const bounds = useMemo(() => {
    const startX =
      Math.floor(-viewport.x / viewport.scale / gridSize) * gridSize;
    const endX =
      startX +
      Math.ceil(stageWidth / viewport.scale / gridSize + 2) * gridSize;
    const startY =
      Math.floor(-viewport.y / viewport.scale / gridSize) * gridSize;
    const endY =
      startY +
      Math.ceil(stageHeight / viewport.scale / gridSize + 2) * gridSize;
    return { startX, endX, startY, endY };
  }, [viewport.x, viewport.y, viewport.scale, stageWidth, stageHeight, gridSize]);

  const strokeWidth = 1 / viewport.scale;

  return (
    <Shape
      listening={false}
      stroke="#e0e0e0"
      strokeWidth={strokeWidth}
      sceneFunc={(ctx, shape) => {
        const { startX, endX, startY, endY } = bounds;
        ctx.beginPath();
        for (let x = startX; x <= endX; x += gridSize) {
          ctx.moveTo(x, startY);
          ctx.lineTo(x, endY);
        }
        for (let y = startY; y <= endY; y += gridSize) {
          ctx.moveTo(startX, y);
          ctx.lineTo(endX, y);
        }
        ctx.strokeShape(shape);
      }}
    />
  );
}
