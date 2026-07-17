import type { ReactNode } from "react";
import { Stage } from "react-konva";
import type Konva from "konva";
import { useDiagramStore } from "../../store/diagramStore";

interface ViewportStageProps {
  stageRef: React.RefObject<Konva.Stage | null>;
  width: number;
  height: number;
  children: ReactNode;
  onMouseDown?: (e: Konva.KonvaEventObject<MouseEvent>) => void;
  onMouseMove?: (e: Konva.KonvaEventObject<MouseEvent>) => void;
  onMouseUp?: (e: Konva.KonvaEventObject<MouseEvent>) => void;
  onClick?: (e: Konva.KonvaEventObject<MouseEvent>) => void;
  onContextMenu?: (e: Konva.KonvaEventObject<PointerEvent>) => void;
  onDblClick?: (e: Konva.KonvaEventObject<MouseEvent>) => void;
  onDblTap?: (e: Konva.KonvaEventObject<Event>) => void;
}

/**
 * Owns the viewport subscription so Stage x/y/scale update without
 * re-rendering diagram content passed as children from the parent.
 */
export function ViewportStage({
  stageRef,
  width,
  height,
  children,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onClick,
  onContextMenu,
  onDblClick,
  onDblTap,
}: ViewportStageProps) {
  const viewport = useDiagramStore((s) => s.viewport);

  return (
    <Stage
      ref={stageRef}
      width={width}
      height={height}
      x={viewport.x}
      y={viewport.y}
      scaleX={viewport.scale}
      scaleY={viewport.scale}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onClick={onClick}
      onContextMenu={onContextMenu}
      onDblClick={onDblClick}
      onDblTap={onDblTap}
    >
      {children}
    </Stage>
  );
}
