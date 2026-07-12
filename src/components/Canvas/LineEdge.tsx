import { useEffect, useRef, useState } from "react";
import { Arrow, Circle, Group, Rect, Text } from "react-konva";
import type Konva from "konva";
import type { Diagram, Line } from "../../models/types";
import { rgbToCss } from "../../models/types";
import {
  bendFromWorldPoint,
  getLineAnchors,
  routeLine,
} from "../../utils/lineRouting";
import { useDiagramStore } from "../../store/diagramStore";

interface LineEdgeProps {
  line: Line;
  diagram: Diagram;
  selected: boolean;
  onSelect: () => void;
  onBendChange: (bend: number) => void;
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
  const labelHeight = 20;
  const labelWidth = line.label
    ? Math.max(line.label.length * 7, 24)
    : 0;
  const viewportScale = useDiagramStore((s) => s.viewport.scale);
  const screenToWorld = useDiagramStore((s) => s.screenToWorld);
  const handleRadius = 7 / viewportScale;
  const [bendDragging, setBendDragging] = useState(false);
  const stageRef = useRef<Konva.Stage | null>(null);
  const lineIdRef = useRef(line.id);
  const dragMoved = useRef(false);

  useEffect(() => {
    lineIdRef.current = line.id;
  }, [line.id]);

  useEffect(() => {
    if (!bendDragging) return;

    const onMove = (e: MouseEvent) => {
      const stage = stageRef.current;
      if (!stage) return;
      const rect = stage.container().getBoundingClientRect();
      const world = screenToWorld({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
      dragMoved.current = true;
      const state = useDiagramStore.getState();
      const currentLine = state.lines.find((l) => l.id === lineIdRef.current);
      if (!currentLine) return;
      const currentDiagram = {
        schemaVersion: 1 as const,
        characters: state.characters,
        lines: state.lines,
        groups: state.groups,
      };
      const { start, end } = getLineAnchors(currentLine, currentDiagram);
      onBendChange(bendFromWorldPoint(start, end, world));
    };

    const onUp = () => {
      setBendDragging(false);
      dragMoved.current = false;
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [bendDragging, onBendChange, screenToWorld]);

  const beginBendDrag = (
    e: Konva.KonvaEventObject<MouseEvent>,
    applyImmediately: boolean,
  ) => {
    e.cancelBubble = true;
    stageRef.current = e.target.getStage() ?? null;
    dragMoved.current = false;
    setBendDragging(true);
    onSelect();

    if (!applyImmediately) return;

    const pointer = stageRef.current?.getPointerPosition();
    if (!pointer) return;
    const world = screenToWorld(pointer);
    const { start, end } = getLineAnchors(line, diagram);
    onBendChange(bendFromWorldPoint(start, end, world));
  };

  return (
    <Group>
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
          beginBendDrag(e, false);
        }}
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
      {selected && (
        <Circle
          x={routed.bendHandlePoint.x}
          y={routed.bendHandlePoint.y}
          radius={handleRadius}
          fill="#ffffff"
          stroke="#4a90d9"
          strokeWidth={2 / viewportScale}
          onMouseDown={(e) => beginBendDrag(e, true)}
        />
      )}
    </Group>
  );
}
