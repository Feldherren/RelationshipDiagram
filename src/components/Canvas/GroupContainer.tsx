import { useEffect, useRef, useState } from "react";
import { Group, Rect, Text } from "react-konva";
import type Konva from "konva";
import type {
  Bounds,
  Group as GroupType,
  GroupResizeEdge,
} from "../../models/types";
import type { Character } from "../../models/types";
import {
  COLLAPSED_GROUP_SIZE,
  GROUP_HEADER_HEIGHT,
  GROUP_RESIZE_HANDLE_SCREEN_SIZE,
  rgbToCss,
} from "../../models/types";
import {
  cursorForGroupResizeEdge,
  rgbaWithAlpha,
  resolveGroupBounds,
  resizeGroupBounds,
} from "../../utils/geometry";
import { getPillLabelHeight, PillLabel } from "./PillLabel";
import { formatFontForCanvas } from "../../utils/diagramFont";
import { useDiagramStore } from "../../store/diagramStore";
import {
  getCollapsedGroupConnectHandlePosition,
  getGroupConnectHandlePosition,
} from "../../utils/connection";
import { ConnectHandle } from "./ConnectHandle";
import {
  RoundedRectAura,
  shouldShowAura,
} from "./HoverAura";

interface GroupContainerProps {
  group: GroupType;
  characters: Character[];
  selected: boolean;
  isConnectSource: boolean;
  onSelect: () => void;
  onToggleCollapse: () => void;
  onBoundsChange: (bounds: Bounds) => void;
  onMoveByDelta: (delta: { dx: number; dy: number }) => void;
  onResizeStart: () => void;
  onResizeEnd: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onConnectHandleDown: (e: Konva.KonvaEventObject<MouseEvent>) => void;
}

interface ResizeDragStart {
  bounds: Bounds;
  pointer: { x: number; y: number };
  edge: GroupResizeEdge;
}

interface MoveDragStart {
  pointer: { x: number; y: number };
}

const RESIZE_EDGES: GroupResizeEdge[] = [
  "n",
  "e",
  "s",
  "w",
  "ne",
  "nw",
  "se",
  "sw",
];

function getResizeHandleLayout(
  bounds: Bounds,
  edge: GroupResizeEdge,
  handleSize: number,
): { x: number; y: number; width: number; height: number } {
  const { x, y, width, height } = bounds;
  const half = handleSize / 2;

  switch (edge) {
    case "n":
      return {
        x,
        y: y + GROUP_HEADER_HEIGHT - half,
        width,
        height: handleSize,
      };
    case "s":
      return { x, y: y + height - half, width, height: handleSize };
    case "e":
      return { x: x + width - half, y, width: handleSize, height };
    case "w":
      return { x: x - half, y, width: handleSize, height };
    case "ne":
      return {
        x: x + width - half,
        y: y + GROUP_HEADER_HEIGHT - half,
        width: handleSize,
        height: handleSize,
      };
    case "nw":
      return {
        x: x - half,
        y: y + GROUP_HEADER_HEIGHT - half,
        width: handleSize,
        height: handleSize,
      };
    case "se":
      return {
        x: x + width - half,
        y: y + height - half,
        width: handleSize,
        height: handleSize,
      };
    case "sw":
      return {
        x: x - half,
        y: y + height - half,
        width: handleSize,
        height: handleSize,
      };
  }
}

export function GroupContainer({
  group,
  characters,
  selected,
  isConnectSource,
  onSelect,
  onToggleCollapse,
  onBoundsChange,
  onMoveByDelta,
  onResizeStart,
  onResizeEnd,
  onDragStart,
  onDragEnd,
  onConnectHandleDown,
}: GroupContainerProps) {
  const diagramFontFamily = useDiagramStore((s) => s.diagramFontFamily);
  const viewportScale = useDiagramStore((s) => s.viewport.scale);
  const screenToWorld = useDiagramStore((s) => s.screenToWorld);
  const [hovered, setHovered] = useState(false);
  const [resizing, setResizing] = useState(false);
  const [dragging, setDragging] = useState(false);
  const stageRef = useRef<Konva.Stage | null>(null);
  const resizeStartRef = useRef<ResizeDragStart | null>(null);
  const moveStartRef = useRef<MoveDragStart | null>(null);
  const onBoundsChangeRef = useRef(onBoundsChange);
  const onMoveByDeltaRef = useRef(onMoveByDelta);
  const onResizeEndRef = useRef(onResizeEnd);
  const onDragEndRef = useRef(onDragEnd);
  onBoundsChangeRef.current = onBoundsChange;
  onMoveByDeltaRef.current = onMoveByDelta;
  onResizeEndRef.current = onResizeEnd;
  onDragEndRef.current = onDragEnd;
  const showAura = shouldShowAura(hovered, selected);
  const showConnectHandle = selected || hovered || isConnectSource;
  const handleSize = GROUP_RESIZE_HANDLE_SCREEN_SIZE / viewportScale;

  useEffect(() => {
    if (!resizing) return;

    const onMove = (e: MouseEvent) => {
      const stage = stageRef.current;
      const dragStart = resizeStartRef.current;
      if (!stage || !dragStart) return;

      const rect = stage.container().getBoundingClientRect();
      const pointer = screenToWorld({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });

      const newBounds = resizeGroupBounds(
        dragStart.bounds,
        dragStart.edge,
        pointer,
        dragStart.pointer,
      );
      onBoundsChangeRef.current(newBounds);
    };

    const onUp = () => {
      setResizing(false);
      resizeStartRef.current = null;
      document.body.style.cursor = "";
      onResizeEndRef.current();
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [resizing, screenToWorld]);

  useEffect(() => {
    if (!dragging) return;

    const onMove = (e: MouseEvent) => {
      const stage = stageRef.current;
      const dragStart = moveStartRef.current;
      if (!stage || !dragStart) return;

      const rect = stage.container().getBoundingClientRect();
      const pointer = screenToWorld({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });

      onMoveByDeltaRef.current({
        dx: pointer.x - dragStart.pointer.x,
        dy: pointer.y - dragStart.pointer.y,
      });
      dragStart.pointer = pointer;
    };

    const onUp = () => {
      setDragging(false);
      moveStartRef.current = null;
      document.body.style.cursor = "";
      onDragEndRef.current();
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dragging, screenToWorld]);

  const beginResize = (
    e: Konva.KonvaEventObject<MouseEvent>,
    edge: GroupResizeEdge,
    bounds: Bounds,
  ) => {
    if (e.evt.button !== 0) return;
    e.cancelBubble = true;
    stageRef.current = e.target.getStage() ?? null;
    const pointer = stageRef.current?.getPointerPosition();
    if (!pointer) return;

    resizeStartRef.current = {
      bounds,
      pointer: screenToWorld(pointer),
      edge,
    };
    document.body.style.cursor = cursorForGroupResizeEdge(edge);
    setResizing(true);
    onResizeStart();
    onSelect();
  };

  const beginMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (e.evt.button !== 0) return;
    e.cancelBubble = true;
    stageRef.current = e.target.getStage() ?? null;
    const pointer = stageRef.current?.getPointerPosition();
    if (!pointer) return;

    moveStartRef.current = {
      pointer: screenToWorld(pointer),
    };
    document.body.style.cursor = "grabbing";
    setDragging(true);
    onDragStart();
    onSelect();
  };

  if (group.collapsed) {
    const pos = group.collapsedPosition ?? { x: 0, y: 0 };
    const color = rgbToCss(group.borderColor);
    const size = COLLAPSED_GROUP_SIZE;
    const connectHandlePos = getCollapsedGroupConnectHandlePosition(size);

    return (
      <Group
        x={pos.x}
        y={pos.y}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={(e) => {
          e.cancelBubble = true;
          onSelect();
        }}
        onTap={(e) => {
          e.cancelBubble = true;
          onSelect();
        }}
        onDblClick={(e) => {
          e.cancelBubble = true;
          onToggleCollapse();
        }}
        onDblTap={(e) => {
          e.cancelBubble = true;
          onToggleCollapse();
        }}
        onMouseDown={(e) => beginMove(e)}
      >
        {showAura && (
          <RoundedRectAura
            x={-size}
            y={-size}
            width={size * 2}
            height={size * 2}
            cornerRadius={4}
            color={group.borderColor}
          />
        )}
        <Rect
          x={-size}
          y={-size}
          width={size * 2}
          height={size * 2}
          stroke={color}
          strokeWidth={3}
          fill={rgbaWithAlpha(group.borderColor, 0.15)}
          cornerRadius={4}
        />
        <PillLabel
          text={group.name}
          y={-(size + getPillLabelHeight(12) / 2 + 6)}
          fontSize={12}
          selected={selected}
        />
        <Text
          text={`${group.memberCharacterIds.length}`}
          fontFamily={formatFontForCanvas(diagramFontFamily)}
          fontSize={22}
          fill="#555"
          align="center"
          width={size * 2}
          offsetX={size}
          offsetY={11}
          listening={false}
        />
        {showConnectHandle && (
          <ConnectHandle
            x={connectHandlePos.x}
            y={connectHandlePos.y}
            viewportScale={viewportScale}
            isConnectSource={isConnectSource}
            onMouseDown={onConnectHandleDown}
          />
        )}
      </Group>
    );
  }

  const bounds = resolveGroupBounds(group, characters);
  if (!bounds) return null;

  const color = rgbToCss(group.borderColor);
  const connectHandlePos = getGroupConnectHandlePosition(bounds);

  return (
    <Group
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={(e) => {
        e.cancelBubble = true;
        onSelect();
      }}
      onTap={(e) => {
        e.cancelBubble = true;
        onSelect();
      }}
      onDblClick={(e) => {
        e.cancelBubble = true;
        onToggleCollapse();
      }}
      onDblTap={(e) => {
        e.cancelBubble = true;
        onToggleCollapse();
      }}
    >
      {showAura && (
        <RoundedRectAura
          x={bounds.x}
          y={bounds.y}
          width={bounds.width}
          height={bounds.height}
          color={group.borderColor}
        />
      )}
      <Rect
        x={bounds.x}
        y={bounds.y}
        width={bounds.width}
        height={bounds.height}
        stroke={color}
        strokeWidth={2}
        fill={rgbaWithAlpha(group.borderColor, 0.08)}
        cornerRadius={12}
        listening={false}
      />
      {RESIZE_EDGES.map((edge) => {
          const layout = getResizeHandleLayout(bounds, edge, handleSize);
          return (
            <Rect
              key={edge}
              x={layout.x}
              y={layout.y}
              width={layout.width}
              height={layout.height}
              fill="transparent"
              onMouseEnter={() => {
                if (!resizing && !dragging) {
                  document.body.style.cursor = cursorForGroupResizeEdge(edge);
                }
              }}
              onMouseLeave={() => {
                if (!resizing && !dragging) {
                  document.body.style.cursor = "";
                }
              }}
              onMouseDown={(e) => beginResize(e, edge, bounds)}
            />
          );
        })}
      <Rect
        x={bounds.x}
        y={bounds.y}
        width={bounds.width}
        height={GROUP_HEADER_HEIGHT}
        fill={rgbaWithAlpha(group.borderColor, 0.2)}
        cornerRadius={[12, 12, 0, 0]}
        onMouseEnter={() => {
          if (!resizing && !dragging) {
            document.body.style.cursor = "grab";
          }
        }}
        onMouseLeave={() => {
          if (!resizing && !dragging) {
            document.body.style.cursor = "";
          }
        }}
        onMouseDown={beginMove}
        onDblClick={(e) => {
          e.cancelBubble = true;
          onToggleCollapse();
        }}
        onDblTap={(e) => {
          e.cancelBubble = true;
          onToggleCollapse();
        }}
      />
      <PillLabel
        text={group.name}
        x={bounds.x + bounds.width / 2}
        y={bounds.y + 14}
        fontSize={12}
        selected={selected}
      />
      {showConnectHandle && (
        <ConnectHandle
          x={connectHandlePos.x}
          y={connectHandlePos.y}
          viewportScale={viewportScale}
          isConnectSource={isConnectSource}
          onMouseDown={onConnectHandleDown}
        />
      )}
    </Group>
  );
}
