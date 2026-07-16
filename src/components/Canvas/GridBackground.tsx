import { useMemo } from "react";
import { Shape } from "react-konva";
import {
  computeViewportGridLineBounds,
  DIAGRAM_GRID_SIZE,
  drawGrid,
} from "../../utils/gridBackground";
import { GRID_NODE_NAME } from "../../utils/export";
import { useDiagramStore } from "../../store/diagramStore";
import { rgbToCss } from "../../models/types";

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
  const gridStyle = useDiagramStore((s) => s.gridStyle);
  const gridColor = useDiagramStore(
    (s) => s.diagramAppearance.backgroundGridColor,
  );
  const gridCss = rgbToCss(gridColor);

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
  const isDots = gridStyle === "dots";

  return (
    <Shape
      name={GRID_NODE_NAME}
      listening={false}
      stroke={isDots ? undefined : gridCss}
      fill={isDots ? gridCss : undefined}
      strokeWidth={isDots ? undefined : strokeWidth}
      sceneFunc={(ctx, shape) => {
        drawGrid(ctx, bounds, gridStyle, gridSize);
        if (isDots) {
          ctx.fillShape(shape);
        } else {
          ctx.strokeShape(shape);
        }
      }}
    />
  );
}
