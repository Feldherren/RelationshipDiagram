import { useEffect, useRef, useState } from "react";
import { Arrow, Circle, Group } from "react-konva";
import type Konva from "konva";
import type { Diagram, Line, Point } from "../../models/types";
import { rgbToCss } from "../../models/types";
import {
  bendDeltaFromDrag,
  getLineAnchors,
  isSelfConnection,
  MIN_SELF_LOOP_BEND,
  resolveLineBend,
  routeLine,
} from "../../utils/lineRouting";
import {
  getLineDisplayLabel,
  resolveLineEndpoint,
} from "../../utils/lineEndpoints";
import { useDiagramStore } from "../../store/diagramStore";
import { useClickWithoutDrag } from "../../hooks/useClickWithoutDrag";
import { PillLabel } from "./PillLabel";
import { LineAura, shouldShowAura } from "./HoverAura";

interface LineEdgeProps {
  line: Line;
  diagram: Diagram;
  selected: boolean;
  onSelect: () => void;
  onBendChange: (bend: number) => void;
  part?: "full" | "stroke" | "label";
  /** Shared hover when stroke and label are rendered as separate instances. */
  hovered?: boolean;
  onHoverChange?: (hovered: boolean) => void;
}

interface BendDragStart {
  bend: number;
  world: Point;
  origin: Point;
  fromCenter: Point;
  toCenter: Point;
}

export function LineEdge({
  line,
  diagram,
  selected,
  onSelect,
  onBendChange,
  part = "full",
  hovered: hoveredProp,
  onHoverChange,
}: LineEdgeProps) {
  const routed = routeLine(line, diagram);
  const displayLabel = getLineDisplayLabel(line, diagram);
  const fromResolved = resolveLineEndpoint(line.from, diagram);
  const toResolved = resolveLineEndpoint(line.to, diagram);
  const color = rgbToCss(line.color);
  const dash = line.style === "dotted" ? [8, 6] : undefined;
  const viewportScale = useDiagramStore((s) => s.viewport.scale);
  const screenToWorld = useDiagramStore((s) => s.screenToWorld);
  const setSelection = useDiagramStore((s) => s.setSelection);
  const lineLabel = useDiagramStore((s) => s.diagramAppearance.lineLabel);
  const clickGuard = useClickWithoutDrag();
  const [localHovered, setLocalHovered] = useState(false);
  const hovered = hoveredProp ?? localHovered;
  const setHovered = (value: boolean) => {
    if (onHoverChange) onHoverChange(value);
    else setLocalHovered(value);
  };
  const [bendDragging, setBendDragging] = useState(false);
  const stageRef = useRef<Konva.Stage | null>(null);
  const lineIdRef = useRef(line.id);
  const dragStartRef = useRef<BendDragStart | null>(null);
  const gestureClearedSelectionRef = useRef(false);

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

      if (!gestureClearedSelectionRef.current) {
        const movedFarEnough =
          Math.hypot(world.x - dragStart.origin.x, world.y - dragStart.origin.y) >
          2;
        if (movedFarEnough) {
          gestureClearedSelectionRef.current = true;
          clickGuard.noticeDrag();
          setSelection(null);
        }
      }

      const delta = bendDeltaFromDrag(
        dragStart.fromCenter,
        dragStart.toCenter,
        dragStart.world,
        world,
        {
          selfLoop: isSelfConnection(line),
          bend: dragStart.bend,
          routeIndex: line.routeIndex,
        },
      );
      const nextBend = dragStart.bend + delta;
      onBendChange(
        isSelfConnection(line)
          ? Math.max(MIN_SELF_LOOP_BEND, nextBend)
          : nextBend,
      );
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
  }, [bendDragging, onBendChange, screenToWorld, clickGuard.noticeDrag, setSelection, line]);

  const beginBendDrag = (e: Konva.KonvaEventObject<MouseEvent>) => {
    e.cancelBubble = true;
    stageRef.current = e.target.getStage() ?? null;
    const pointer = stageRef.current?.getPointerPosition();
    if (!pointer) return;

    const { start, end } = getLineAnchors(line, diagram);
    const world = screenToWorld(pointer);
    gestureClearedSelectionRef.current = false;
    dragStartRef.current = {
      bend: resolveLineBend(line),
      world,
      origin: world,
      fromCenter: start,
      toCenter: end,
    };
    setBendDragging(true);
  };

  const handleSelectClick = (
    e: Konva.KonvaEventObject<MouseEvent | TouchEvent>,
  ) => {
    e.cancelBubble = true;
    if ("button" in e.evt && e.evt.button !== 0) return;
    if (clickGuard.consumeClickSuppression()) return;
    onSelect();
  };

  const showStroke = part === "full" || part === "stroke";
  const showLabel = (part === "full" || part === "label") && displayLabel;

  return (
    <Group
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {showStroke && shouldShowAura(hovered, selected) && (
        <LineAura
          points={routed.points}
          color={line.color}
          dash={dash}
        />
      )}
      {showStroke && (
      <Arrow
        points={routed.points}
        stroke={color}
        fill={color}
        strokeWidth={2}
        dash={dash}
        pointerLength={14}
        pointerWidth={11}
        pointerAtBeginning={line.startArrow}
        pointerAtEnding={line.endArrow}
        hitStrokeWidth={16}
        lineCap="round"
        lineJoin="round"
        onClick={handleSelectClick}
        onTap={handleSelectClick}
        onMouseDown={(e) => {
          if (e.evt.button !== 0) return;
          beginBendDrag(e);
        }}
      />
      )}
      {showStroke && fromResolved.hiddenCharacterId && routed.points.length >= 2 && (
        <Circle
          x={routed.points[0]}
          y={routed.points[1]}
          radius={4 / viewportScale}
          fill="#ffffff"
          stroke={color}
          strokeWidth={2 / viewportScale}
          listening={false}
        />
      )}
      {showStroke && toResolved.hiddenCharacterId && routed.points.length >= 2 && (
        <Circle
          x={routed.points[routed.points.length - 2]}
          y={routed.points[routed.points.length - 1]}
          radius={4 / viewportScale}
          fill="#ffffff"
          stroke={color}
          strokeWidth={2 / viewportScale}
          listening={false}
        />
      )}
      {showLabel && (
        <PillLabel
          text={displayLabel!}
          x={routed.labelPoint.x}
          y={routed.labelPoint.y}
          fontSize={12}
          textFill={rgbToCss(lineLabel.textColor)}
          fill={rgbToCss(lineLabel.backgroundColor)}
          unselectedStroke={rgbToCss(lineLabel.borderColor)}
          selected={selected}
          selectedStroke="#c62828"
          onClick={handleSelectClick}
          onTap={handleSelectClick}
          onMouseDown={(e) => {
            if (e.evt.button !== 0) return;
            beginBendDrag(e);
          }}
        />
      )}
    </Group>
  );
}
