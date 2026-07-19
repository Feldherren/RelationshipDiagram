import { useEffect, useRef, useState } from "react";
import { Group, Rect, Text } from "react-konva";
import type Konva from "konva";
import type {
  Bounds,
  Box as BoxType,
  BoxResizeEdge,
  Character,
} from "../../models/types";
import {
  COLLAPSED_BOX_SIZE,
  BOX_HEADER_HEIGHT,
  BOX_RESIZE_HANDLE_SCREEN_SIZE,
  rgbToCss,
} from "../../models/types";
import {
  cursorForBoxResizeEdge,
  getCharactersContainedInBox,
  getFloatingTextsContainedInBox,
  rgbaWithAlpha,
  resolveBoxBounds,
  resizeBoxBounds,
} from "../../utils/geometry";
import { getPillLabelHeight, PillLabel } from "./PillLabel";
import { formatFontForCanvas } from "../../utils/diagramFont";
import { useDiagramStore } from "../../store/diagramStore";
import { useClickWithoutDrag } from "../../hooks/useClickWithoutDrag";
import { isIdInMultiSelection } from "../../utils/selectionMulti";
import {
  getCollapsedBoxConnectHandlePosition,
  getCollapsedBoxCollapseControlPosition,
  getBoxConnectHandlePosition,
  getBoxCollapseControlPosition,
} from "../../utils/connection";
import { ConnectHandle } from "./ConnectHandle";
import { BoxCollapseControl } from "./BoxCollapseControl";
import {
  RoundedRectAura,
  RoundedRectSelectionPulse,
  shouldShowAura,
} from "./HoverAura";

interface BoxContainerProps {
  box: BoxType;
  characters: Character[];
  selected: boolean;
  isConnectSource: boolean;
  onSelect: () => void;
  onOpenDetails: () => void;
  onToggleCollapse: () => void;
  onBoundsChange: (bounds: Bounds) => void;
  onMoveByDelta: (
    delta: { dx: number; dy: number },
    contents: { characterIds: string[]; floatingTextIds: string[] },
  ) => void;
  onResizeStart: () => void;
  onResizeEnd: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onConnectHandleDown: (e: Konva.KonvaEventObject<MouseEvent>) => void;
  /** Split render: background below relationship lines, foreground above. */
  part?: "full" | "background" | "foreground";
}

interface ResizeDragStart {
  bounds: Bounds;
  pointer: { x: number; y: number };
  edge: BoxResizeEdge;
}

interface MoveDragStart {
  pointer: { x: number; y: number };
  origin: { x: number; y: number };
  characterIds: string[];
  floatingTextIds: string[];
}

const RESIZE_EDGES: BoxResizeEdge[] = [
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
  edge: BoxResizeEdge,
  handleSize: number,
): { x: number; y: number; width: number; height: number } {
  const { x, y, width, height } = bounds;
  const half = handleSize / 2;

  switch (edge) {
    case "n":
      return {
        x,
        y: y + BOX_HEADER_HEIGHT - half,
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
        y: y + BOX_HEADER_HEIGHT - half,
        width: handleSize,
        height: handleSize,
      };
    case "nw":
      return {
        x: x - half,
        y: y + BOX_HEADER_HEIGHT - half,
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

export function BoxContainer({
  box,
  characters,
  selected,
  isConnectSource,
  onSelect,
  onOpenDetails,
  onToggleCollapse,
  onBoundsChange,
  onMoveByDelta,
  onResizeStart,
  onResizeEnd,
  onDragStart,
  onDragEnd,
  onConnectHandleDown,
  part = "full",
}: BoxContainerProps) {
  const diagramFontFamily = useDiagramStore((s) => s.diagramFontFamily);
  const floatingTexts = useDiagramStore((s) => s.floatingTexts);
  const setSelection = useDiagramStore((s) => s.setSelection);
  const captureHistory = useDiagramStore((s) => s.captureHistory);
  const moveMultiSelectionByDelta = useDiagramStore(
    (s) => s.moveMultiSelectionByDelta,
  );
  const viewportScale = useDiagramStore((s) => s.viewport.scale);
  const screenToWorld = useDiagramStore((s) => s.screenToWorld);
  const boxNameLabel = useDiagramStore(
    (s) => s.diagramAppearance.boxNameLabel,
  );
  const selectionPulseEnabled = useDiagramStore((s) => s.selectionPulseEnabled);
  const clickGuard = useClickWithoutDrag();
  const gestureClearedSelectionRef = useRef(false);
  const [hovered, setHovered] = useState(false);
  const [resizing, setResizing] = useState(false);
  const [dragging, setDragging] = useState(false);
  const stageRef = useRef<Konva.Stage | null>(null);
  const resizeStartRef = useRef<ResizeDragStart | null>(null);
  const moveStartRef = useRef<MoveDragStart | null>(null);
  const resizeHistoryCapturedRef = useRef(false);
  const moveHistoryCapturedRef = useRef(false);
  const onBoundsChangeRef = useRef(onBoundsChange);
  const onMoveByDeltaRef = useRef(onMoveByDelta);
  const onResizeEndRef = useRef(onResizeEnd);
  const onDragEndRef = useRef(onDragEnd);
  onBoundsChangeRef.current = onBoundsChange;
  onMoveByDeltaRef.current = onMoveByDelta;
  onResizeEndRef.current = onResizeEnd;
  onDragEndRef.current = onDragEnd;
  const showAura = shouldShowAura(hovered, selected);
  const showPulse = selected && selectionPulseEnabled;
  const showConnectHandle = selected || hovered || isConnectSource;
  const showCollapseControl = selected || hovered;
  const handleSize = BOX_RESIZE_HANDLE_SCREEN_SIZE / viewportScale;
  const containedCount = getCharactersContainedInBox(
    box,
    characters,
    diagramFontFamily,
  ).length;

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

      const movedFarEnough =
        Math.hypot(
          pointer.x - dragStart.pointer.x,
          pointer.y - dragStart.pointer.y,
        ) > 2;

      if (movedFarEnough && !gestureClearedSelectionRef.current) {
        gestureClearedSelectionRef.current = true;
        clickGuard.noticeDrag();
        setSelection(null);
      }

      if (!resizeHistoryCapturedRef.current) {
        resizeHistoryCapturedRef.current = true;
        captureHistory();
      }
      const newBounds = resizeBoxBounds(
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
  }, [resizing, screenToWorld, clickGuard.noticeDrag, setSelection, captureHistory]);

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

      const movedFarEnough =
        Math.hypot(
          pointer.x - dragStart.origin.x,
          pointer.y - dragStart.origin.y,
        ) > 2;

      if (movedFarEnough && !gestureClearedSelectionRef.current) {
        gestureClearedSelectionRef.current = true;
        clickGuard.noticeDrag();
        useDiagramStore.setState({ selectionDetailsOpen: false });
      }

      if (!moveHistoryCapturedRef.current) {
        moveHistoryCapturedRef.current = true;
        captureHistory();
      }
      const delta = {
        dx: pointer.x - dragStart.pointer.x,
        dy: pointer.y - dragStart.pointer.y,
      };
      const selection = useDiagramStore.getState().selection;
      if (isIdInMultiSelection(selection, "box", box.id)) {
        moveMultiSelectionByDelta(delta, { recordHistory: false });
      } else {
        onMoveByDeltaRef.current(delta, {
          characterIds: dragStart.characterIds,
          floatingTextIds: dragStart.floatingTextIds,
        });
      }
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
  }, [
    dragging,
    box.id,
    screenToWorld,
    clickGuard.noticeDrag,
    captureHistory,
    moveMultiSelectionByDelta,
  ]);

  const beginResize = (
    e: Konva.KonvaEventObject<MouseEvent>,
    edge: BoxResizeEdge,
    bounds: Bounds,
  ) => {
    if (e.evt.button !== 0) return;
    e.cancelBubble = true;
    stageRef.current = e.target.getStage() ?? null;
    const pointer = stageRef.current?.getPointerPosition();
    if (!pointer) return;

    gestureClearedSelectionRef.current = false;
    resizeHistoryCapturedRef.current = false;
    resizeStartRef.current = {
      bounds,
      pointer: screenToWorld(pointer),
      edge,
    };
    document.body.style.cursor = cursorForBoxResizeEdge(edge);
    setResizing(true);
    onResizeStart();
  };

  const beginMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (e.evt.button !== 0) return;
    e.cancelBubble = true;
    stageRef.current = e.target.getStage() ?? null;
    const pointer = stageRef.current?.getPointerPosition();
    if (!pointer) return;

    const world = screenToWorld(pointer);
    gestureClearedSelectionRef.current = false;
    moveHistoryCapturedRef.current = false;
    moveStartRef.current = {
      pointer: world,
      origin: world,
      characterIds: getCharactersContainedInBox(
        box,
        characters,
        diagramFontFamily,
      ).map((c) => c.id),
      floatingTextIds: getFloatingTextsContainedInBox(
        box,
        floatingTexts,
        diagramFontFamily,
      ).map((t) => t.id),
    };
    document.body.style.cursor = "grabbing";
    setDragging(true);
    onDragStart();
  };

  const handleSelectClick = (
    e: Konva.KonvaEventObject<MouseEvent | TouchEvent>,
  ) => {
    e.cancelBubble = true;
    if ("button" in e.evt && e.evt.button !== 0) return;
    if (clickGuard.consumeClickSuppression()) return;
    onSelect();
  };

  const handleOpenDetails = (
    e: Konva.KonvaEventObject<MouseEvent | TouchEvent>,
  ) => {
    e.cancelBubble = true;
    e.evt.preventDefault();
    onOpenDetails();
  };

  if (box.collapsed) {
    const pos = box.collapsedPosition ?? { x: 0, y: 0 };
    const color = rgbToCss(box.borderColor);
    const size = COLLAPSED_BOX_SIZE;
    const connectHandlePos = getCollapsedBoxConnectHandlePosition(size);
    const collapseControlPos = getCollapsedBoxCollapseControlPosition(size);

    return (
      <Group
        x={pos.x}
        y={pos.y}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={handleSelectClick}
        onTap={handleSelectClick}
        onDblClick={handleOpenDetails}
        onDblTap={handleOpenDetails}
        onContextMenu={handleOpenDetails}
        onMouseDown={(e) => beginMove(e)}
      >
        {showAura && (
          <RoundedRectAura
            x={-size}
            y={-size}
            width={size * 2}
            height={size * 2}
            cornerRadius={4}
            color={box.borderColor}
          />
        )}
        {showPulse && (
          <RoundedRectSelectionPulse
            x={-size}
            y={-size}
            width={size * 2}
            height={size * 2}
            cornerRadius={4}
            color={box.borderColor}
            active
          />
        )}
        <Rect
          x={-size}
          y={-size}
          width={size * 2}
          height={size * 2}
          stroke={color}
          strokeWidth={3}
          fill={rgbaWithAlpha(box.borderColor, 0.15)}
          cornerRadius={4}
        />
        <PillLabel
          text={box.name}
          y={-(size + getPillLabelHeight(12) / 2 + 6)}
          fontSize={12}
          textFill={rgbToCss(boxNameLabel.textColor)}
          fill={rgbToCss(boxNameLabel.backgroundColor)}
          unselectedStroke={rgbToCss(boxNameLabel.borderColor)}
          selected={selected}
        />
        <Text
          text={`${containedCount}`}
          fontFamily={formatFontForCanvas(diagramFontFamily)}
          fontSize={22}
          fill="#555"
          align="center"
          width={size * 2}
          offsetX={size}
          offsetY={11}
          listening={false}
        />
        {showCollapseControl && (
          <BoxCollapseControl
            x={collapseControlPos.x}
            y={collapseControlPos.y}
            collapsed
            viewportScale={viewportScale}
            onToggle={onToggleCollapse}
          />
        )}
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

  const bounds = resolveBoxBounds(box);
  if (!bounds) return null;

  const color = rgbToCss(box.borderColor);
  const connectHandlePos = getBoxConnectHandlePosition(bounds);
  const collapseControlPos = getBoxCollapseControlPosition(bounds);
  const showBackground = part === "full" || part === "background";
  const showForeground = part === "full" || part === "foreground";

  return (
    <Group
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={handleSelectClick}
      onTap={handleSelectClick}
      onDblClick={handleOpenDetails}
      onDblTap={handleOpenDetails}
      onContextMenu={handleOpenDetails}
    >
      {showBackground && showAura && (
        <RoundedRectAura
          x={bounds.x}
          y={bounds.y}
          width={bounds.width}
          height={bounds.height}
          color={box.borderColor}
        />
      )}
      {showBackground && showPulse && (
        <RoundedRectSelectionPulse
          x={bounds.x}
          y={bounds.y}
          width={bounds.width}
          height={bounds.height}
          color={box.borderColor}
          active
        />
      )}
      {showBackground && (
        <Rect
          x={bounds.x}
          y={bounds.y}
          width={bounds.width}
          height={bounds.height}
          stroke={color}
          strokeWidth={2}
          fill={rgbaWithAlpha(box.borderColor, 0.08)}
          cornerRadius={12}
          listening={false}
        />
      )}
      {showForeground &&
        RESIZE_EDGES.map((edge) => {
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
                  document.body.style.cursor = cursorForBoxResizeEdge(edge);
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
      {showForeground && (
        <Rect
          x={bounds.x}
          y={bounds.y}
          width={bounds.width}
          height={BOX_HEADER_HEIGHT}
          fill={rgbaWithAlpha(box.borderColor, 0.2)}
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
          onDblClick={handleOpenDetails}
          onDblTap={handleOpenDetails}
        />
      )}
      {showForeground && (
        <PillLabel
          text={box.name}
          x={bounds.x + bounds.width / 2}
          y={bounds.y + 14}
          fontSize={12}
          textFill={rgbToCss(boxNameLabel.textColor)}
          fill={rgbToCss(boxNameLabel.backgroundColor)}
          unselectedStroke={rgbToCss(boxNameLabel.borderColor)}
          selected={selected}
        />
      )}
      {showForeground && showCollapseControl && (
        <BoxCollapseControl
          x={collapseControlPos.x}
          y={collapseControlPos.y}
          collapsed={false}
          viewportScale={viewportScale}
          onToggle={onToggleCollapse}
        />
      )}
      {showForeground && showConnectHandle && (
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
