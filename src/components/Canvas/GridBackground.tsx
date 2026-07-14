import { useMemo } from "react";
import { Shape } from "react-konva";
import {
  computeViewportGridLineBounds,
  DIAGRAM_GRID_SIZE,
  DIAGRAM_GRID_STROKE,
} from "../../utils/gridBackground";
import { GRID_NODE_NAME } from "../../utils/export";
import { useDiagramStore } from "../../store/diagramStore";

interface GridBackgroundProps {
  stageWidth: number;
  stageHeight: number;
  gridSize?: number;
}

export function GridBackground({
  stageWidth,
  stageHeight,
  gridSize = DIAGRAM_GRID_SIZE,
}: GridBackgroundProps) {
  const viewport = useDiagramStore((s) => s.viewport);

  const bounds = useMemo(
    () =>
      computeViewportGridLineBounds(
        viewport,
        stageWidth,
        stageHeight,
        gridSize,
      ),
    [viewport.x, viewport.y, viewport.scale, stageWidth, stageHeight, gridSize],
  );

  const strokeWidth = 1 / viewport.scale;

  return (
    <Shape
      name={GRID_NODE_NAME}
      listening={false}
      stroke={DIAGRAM_GRID_STROKE}
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
