import { useEffect, useRef, useState } from "react";
import { Arrow, Group } from "react-konva";
import type Konva from "konva";
import type { Diagram, Line, Point } from "../../models/types";
import { rgbToCss } from "../../models/types";
import {
  bendDeltaFromDrag,
  getLineAnchors,
  resolveLineBend,
  routeLine,
} from "../../utils/lineRouting";
import { useDiagramStore } from "../../store/diagramStore";
import { PillLabel } from "./PillLabel";
import { LineAura, shouldShowHoverAura } from "./HoverAura";

interface LineEdgeProps {
  line: Line;
  diagram: Diagram;
  selected: boolean;
  onSelect: () => void;
  onBendChange: (bend: number) => void;
}

interface BendDragStart {
  bend: number;
  world: Point;
  fromCenter: Point;
  toCenter: Point;
}

export function LineEdge({
  line,
  diagram,
  selected,
  onSelect,
  onBendChange,
}: LineEdgeProps) {
  const routed = routeLine(line, diagram);
  const color = rgbToCss(line.color);
  const dash = line.style === "dotted" ? [8, 6] : undefined;
  const screenToWorld = useDiagramStore((s) => s.screenToWorld);
  const [hovered, setHovered] = useState(false);
  const [bendDragging, setBendDragging] = useState(false);
  const stageRef = useRef<Konva.Stage | null>(null);
  const lineIdRef = useRef(line.id);
  const dragStartRef = useRef<BendDragStart | null>(null);

  useEffect(() => {
    lineIdRef.current = line.id;
  }, [line.id]);

  useEffect(() => {
    if (!bendDragging) return;

    const onMove = (e: MouseEvent) => {
      const stage = stageRef.current;
      const dragStart = dragStartRef.current;
      if (!stage || !dragStart) return;

      const rect = stage.container().getBoundingClientRect();
      const world = screenToWorld({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });

      const delta = bendDeltaFromDrag(
        dragStart.fromCenter,
        dragStart.toCenter,
        dragStart.world,
        world,
      );
      onBendChange(dragStart.bend + delta);
    };

    const onUp = () => {
      setBendDragging(false);
      dragStartRef.current = null;
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [bendDragging, onBendChange, screenToWorld]);

  const beginBendDrag = (e: Konva.KonvaEventObject<MouseEvent>) => {
    e.cancelBubble = true;
    stageRef.current = e.target.getStage() ?? null;
    const pointer = stageRef.current?.getPointerPosition();
    if (!pointer) return;

    const { start, end } = getLineAnchors(line, diagram);
    dragStartRef.current = {
      bend: resolveLineBend(line),
      world: screenToWorld(pointer),
      fromCenter: start,
      toCenter: end,
    };
    setBendDragging(true);
    onSelect();
  };

  return (
    <Group
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {shouldShowHoverAura(hovered, selected) && (
        <LineAura
          points={routed.points}
          color={line.color}
          dash={dash}
        />
      )}
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
        onClick={(e) => {
          e.cancelBubble = true;
          onSelect();
        }}
        onTap={(e) => {
          e.cancelBubble = true;
          onSelect();
        }}
        onMouseDown={(e) => {
          if (e.evt.button !== 0) return;
          beginBendDrag(e);
        }}
      />
      {line.label && (
        <PillLabel
          text={line.label}
          x={routed.labelPoint.x}
          y={routed.labelPoint.y}
          fontSize={12}
          fontStyle="bold"
          textFill={color}
          selected={selected}
          selectedStroke="#c62828"
          onClick={(e) => {
            e.cancelBubble = true;
            onSelect();
          }}
          onTap={(e) => {
            e.cancelBubble = true;
            onSelect();
          }}
          onMouseDown={(e) => {
            if (e.evt.button !== 0) return;
            beginBendDrag(e);
          }}
        />
      )}
    </Group>
  );
}
