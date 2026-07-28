import { useEffect, useRef, useState } from "react";
import { Group, Rect, Text } from "react-konva";
import type Konva from "konva";
import { useTranslation } from "react-i18next";
import type {
  Bounds,
  BoxResizeEdge,
  FloatingText,
  Point,
} from "../../models/types";
import {
  BOX_RESIZE_HANDLE_SCREEN_SIZE,
  DEFAULT_FLOATING_TEXT_ALIGN,
  DEFAULT_FLOATING_TEXT_COLOR,
  DEFAULT_FLOATING_TEXT_FONT_SIZE,
  MIN_FLOATING_TEXT_HEIGHT,
  MIN_FLOATING_TEXT_WIDTH,
  rgbToCss,
} from "../../models/types";
import { useDiagramStore } from "../../store/diagramStore";
import { formatFontForCanvas } from "../../utils/diagramFont";
import {
  cursorForBoxResizeEdge,
  getCharactersContainedInBox,
  getFloatingTextsContainedInBox,
  resizeBoxBounds,
} from "../../utils/geometry";
import {
  FLOATING_TEXT_LINE_HEIGHT,
  getFloatingTextSize,
} from "../../utils/labelMetrics";
import { SELECTION_PILL_NODE_NAME } from "../../utils/export";
import { isIdInMultiSelection } from "../../utils/selectionMulti";
import { requestSuppressStageClick } from "../../utils/suppressStageClick";
import {
  captureMultiDragSnapshot,
  snapPointToGrid,
  type MultiDragSnapshot,
} from "../../utils/snapToGrid";

interface FloatingTextNodeProps {
  floatingText: FloatingText;
  selected: boolean;
  editing: boolean;
  draggable: boolean;
  onSelect: () => void;
  onStartEdit: () => void;
  onOpenDetails: () => void;
  onDragMove: (pos: { x: number; y: number }) => void;
  onDragEnd: (pos: { x: number; y: number }) => void;
}

const SELECTION_STROKE = "#4a90d9";

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
      return { x, y: y - half, width, height: handleSize };
    case "s":
      return { x, y: y + height - half, width, height: handleSize };
    case "e":
      return { x: x + width - half, y, width: handleSize, height };
    case "w":
      return { x: x - half, y, width: handleSize, height };
    case "ne":
      return {
        x: x + width - half,
        y: y - half,
        width: handleSize,
        height: handleSize,
      };
    case "nw":
      return {
        x: x - half,
        y: y - half,
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

export function FloatingTextNode({
  floatingText,
  selected,
  editing,
  draggable,
  onSelect,
  onStartEdit,
  onOpenDetails,
  onDragMove,
  onDragEnd,
}: FloatingTextNodeProps) {
  const { t } = useTranslation();
  const allowDragRef = useRef(true);
  const multiDragOriginRef = useRef<{ x: number; y: number } | null>(null);
  const multiDragSnapshotRef = useRef<MultiDragSnapshot | null>(null);
  /**
   * While dragging, drive Group x/y from this local position so React props
   * never fight Konva's drag tracker (which caused snap points to be skipped).
   */
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const stageRef = useRef<Konva.Stage | null>(null);
  const resizeStartRef = useRef<{
    bounds: Bounds;
    pointer: Point;
    edge: BoxResizeEdge;
  } | null>(null);
  const historyCapturedRef = useRef(false);
  const [resizing, setResizing] = useState(false);

  const selection = useDiagramStore((s) => s.selection);
  const captureHistory = useDiagramStore((s) => s.captureHistory);
  const moveMultiSelectionByDelta = useDiagramStore(
    (s) => s.moveMultiSelectionByDelta,
  );
  const snapToGridEnabled = useDiagramStore((s) => s.snapToGridEnabled);
  const updateFloatingText = useDiagramStore((s) => s.updateFloatingText);
  const screenToWorld = useDiagramStore((s) => s.screenToWorld);
  const viewportScale = useDiagramStore((s) => s.viewport.scale);
  const fontFamily = useDiagramStore((s) => s.diagramFontFamily);
  const inMulti = isIdInMultiSelection(
    selection,
    "floatingText",
    floatingText.id,
  );

  const hasText = Boolean(floatingText.text.trim());
  const displayText = hasText
    ? floatingText.text
    : t("defaults.floatingTextPlaceholder");
  const fontSize = floatingText.fontSize || DEFAULT_FLOATING_TEXT_FONT_SIZE;
  const color = floatingText.color ?? DEFAULT_FLOATING_TEXT_COLOR;
  const textAlign = floatingText.textAlign ?? DEFAULT_FLOATING_TEXT_ALIGN;
  const hasExplicitWidth = floatingText.width != null;
  const sizeSource =
    editing && floatingText.text.length === 0
      ? t("defaults.floatingTextPlaceholder")
      : editing
        ? floatingText.text
        : displayText;
  const { width, height } = getFloatingTextSize(
    sizeSource,
    fontSize,
    fontFamily,
    { width: floatingText.width, height: floatingText.height },
  );
  const rectX = -width / 2;
  const rectY = -height / 2;
  const localBounds: Bounds = {
    x: rectX,
    y: rectY,
    width,
    height,
  };
  const canResize =
    selected &&
    !editing &&
    selection?.type === "floatingText" &&
    selection.id === floatingText.id;
  const handleSize = BOX_RESIZE_HANDLE_SCREEN_SIZE / viewportScale;

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
      if (!historyCapturedRef.current) {
        historyCapturedRef.current = true;
        captureHistory();
        useDiagramStore.setState({ selectionDetailsOpen: false });
      }
      const newBounds = resizeBoxBounds(
        dragStart.bounds,
        dragStart.edge,
        pointer,
        dragStart.pointer,
        MIN_FLOATING_TEXT_WIDTH,
        MIN_FLOATING_TEXT_HEIGHT,
      );
      updateFloatingText(
        floatingText.id,
        {
          position: {
            x: newBounds.x + newBounds.width / 2,
            y: newBounds.y + newBounds.height / 2,
          },
          width: Math.round(newBounds.width),
          height: Math.round(newBounds.height),
        },
        { recordHistory: false },
      );
    };

    const onUp = () => {
      requestSuppressStageClick();
      const stage = stageRef.current;
      resizeStartRef.current = null;
      stageRef.current = null;
      setResizing(false);
      document.body.style.cursor = "";
      const container = stage?.container();
      if (container) container.style.cursor = "";
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp, true);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp, true);
      document.body.style.cursor = "";
      const container = stageRef.current?.container();
      if (container) container.style.cursor = "";
    };
  }, [
    resizing,
    floatingText.id,
    screenToWorld,
    captureHistory,
    updateFloatingText,
  ]);

  const beginResize = (
    e: Konva.KonvaEventObject<MouseEvent>,
    edge: BoxResizeEdge,
  ) => {
    if (e.evt.button !== 0) return;
    e.cancelBubble = true;
    const stage = e.target.getStage();
    if (!stage) return;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    stageRef.current = stage;
    historyCapturedRef.current = false;
    resizeStartRef.current = {
      bounds: {
        x: floatingText.position.x + localBounds.x,
        y: floatingText.position.y + localBounds.y,
        width: localBounds.width,
        height: localBounds.height,
      },
      pointer: screenToWorld(pointer),
      edge,
    };
    const cursor = cursorForBoxResizeEdge(edge);
    document.body.style.cursor = cursor;
    stage.container().style.cursor = cursor;
    setResizing(true);
  };

  return (
    <Group
      x={dragPos?.x ?? floatingText.position.x}
      y={dragPos?.y ?? floatingText.position.y}
      draggable={draggable && !resizing && !editing}
      onMouseDown={(e) => {
        allowDragRef.current = e.evt.button === 0 && !editing;
      }}
      onTouchStart={() => {
        allowDragRef.current = !editing;
      }}
      onClick={(e) => {
        e.cancelBubble = true;
        if (e.evt.button !== 0) return;
        onSelect();
      }}
      onTap={(e) => {
        e.cancelBubble = true;
        onSelect();
      }}
      onDblClick={(e) => {
        e.cancelBubble = true;
        e.evt.preventDefault();
        onStartEdit();
      }}
      onDblTap={(e) => {
        e.cancelBubble = true;
        e.evt.preventDefault();
        onStartEdit();
      }}
      onContextMenu={(e) => {
        e.cancelBubble = true;
        e.evt.preventDefault();
        onOpenDetails();
      }}
      onDragStart={(e) => {
        if (!allowDragRef.current || resizing || editing) {
          e.target.stopDrag();
          return;
        }
        // Dragging is layout, not inspect — keep selection, close the float.
        captureHistory();
        useDiagramStore.setState({
          selectionDetailsOpen: false,
          editingFloatingTextId: null,
        });
        const start = {
          x: floatingText.position.x,
          y: floatingText.position.y,
        };
        multiDragOriginRef.current = start;
        setDragPos(start);
        if (inMulti) {
          const state = useDiagramStore.getState();
          multiDragSnapshotRef.current = captureMultiDragSnapshot(
            state.selection,
            state.characters,
            state.boxes,
            state.floatingTexts,
            state.diagramFontFamily,
            (b) => ({
              characterIds: getCharactersContainedInBox(
                b,
                state.characters,
                state.diagramFontFamily,
              ).map((c) => c.id),
              floatingTextIds: getFloatingTextsContainedInBox(
                b,
                state.floatingTexts,
                state.diagramFontFamily,
              ).map((t) => t.id),
            }),
          );
        } else {
          multiDragSnapshotRef.current = null;
        }
      }}
      onDragMove={(e) => {
        let pos = { x: e.target.x(), y: e.target.y() };
        if (inMulti) {
          const origin = multiDragOriginRef.current ?? pos;
          const totalDelta = {
            dx: pos.x - origin.x,
            dy: pos.y - origin.y,
          };
          const snapshot = multiDragSnapshotRef.current;
          if (snapshot) {
            moveMultiSelectionByDelta(totalDelta, {
              recordHistory: false,
              initialSnapshot: snapshot,
              totalDelta,
            });
          } else if (totalDelta.dx !== 0 || totalDelta.dy !== 0) {
            moveMultiSelectionByDelta(totalDelta, { recordHistory: false });
          }
          setDragPos(pos);
          return;
        }
        if (snapToGridEnabled) {
          pos = snapPointToGrid(pos);
          e.target.position(pos);
        }
        setDragPos((prev) =>
          prev && prev.x === pos.x && prev.y === pos.y ? prev : pos,
        );
        onDragMove(pos);
      }}
      onDragEnd={(e) => {
        let pos = { x: e.target.x(), y: e.target.y() };
        multiDragOriginRef.current = null;
        multiDragSnapshotRef.current = null;
        setDragPos(null);
        if (inMulti) {
          return;
        }
        if (snapToGridEnabled) {
          pos = snapPointToGrid(pos);
          e.target.position(pos);
        }
        onDragEnd(pos);
      }}
    >
      <Rect
        name={selected ? SELECTION_PILL_NODE_NAME : undefined}
        exportUnselectedStroke="transparent"
        exportUnselectedStrokeWidth={0}
        x={rectX}
        y={rectY}
        width={width}
        height={height}
        fill="transparent"
        stroke={selected && !editing ? SELECTION_STROKE : "transparent"}
        strokeWidth={selected && !editing ? 1.5 : 0}
        dash={selected && !editing ? [5, 4] : undefined}
        listening
      />
      <Text
        text={displayText}
        fontFamily={formatFontForCanvas(fontFamily)}
        fontSize={fontSize}
        lineHeight={FLOATING_TEXT_LINE_HEIGHT}
        fill={rgbToCss(color)}
        x={rectX}
        y={rectY}
        width={width}
        height={height}
        align={textAlign}
        verticalAlign="middle"
        wrap={hasExplicitWidth ? "word" : "none"}
        listening={false}
        visible={!editing}
      />
      {canResize &&
        RESIZE_EDGES.map((edge) => {
          const layout = getResizeHandleLayout(localBounds, edge, handleSize);
          return (
            <Rect
              key={edge}
              x={layout.x}
              y={layout.y}
              width={layout.width}
              height={layout.height}
              fill="transparent"
              onMouseEnter={() => {
                if (!resizing) {
                  document.body.style.cursor = cursorForBoxResizeEdge(edge);
                }
              }}
              onMouseLeave={() => {
                if (!resizing) {
                  document.body.style.cursor = "";
                }
              }}
              onMouseDown={(e) => beginResize(e, edge)}
            />
          );
        })}
    </Group>
  );
}
