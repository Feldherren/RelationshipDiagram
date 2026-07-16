import { useEffect, useRef, useState } from "react";
import { Group, Rect } from "react-konva";
import type Konva from "konva";
import {
  rgbToCss,
  type Point,
  type ViewBookmark,
} from "../../models/types";
import { useDiagramStore } from "../../store/diagramStore";
import {
  viewportFromCenterAndPointer,
  viewportToWorldBounds,
} from "../../utils/viewportFit";
import { requestSuppressStageClick } from "../../utils/suppressStageClick";

type ResizeCorner = "nw" | "ne" | "sw" | "se";

const CORNERS: ResizeCorner[] = ["nw", "ne", "sw", "se"];

function cornerPosition(
  bounds: { x: number; y: number; width: number; height: number },
  corner: ResizeCorner,
): Point {
  switch (corner) {
    case "nw":
      return { x: bounds.x, y: bounds.y };
    case "ne":
      return { x: bounds.x + bounds.width, y: bounds.y };
    case "sw":
      return { x: bounds.x, y: bounds.y + bounds.height };
    case "se":
      return { x: bounds.x + bounds.width, y: bounds.y + bounds.height };
  }
}

function cursorForCorner(corner: ResizeCorner): string {
  return corner === "nw" || corner === "se" ? "nwse-resize" : "nesw-resize";
}

interface BookmarkViewportFrameProps {
  bookmark: ViewBookmark;
}

export function BookmarkViewportFrame({ bookmark }: BookmarkViewportFrameProps) {
  const [resizing, setResizing] = useState(false);
  const stageRef = useRef<Konva.Stage | null>(null);
  const resizeCenterRef = useRef<Point | null>(null);
  const resizingRef = useRef(false);

  const scale = useDiagramStore((s) => s.viewport.scale);
  const stageSize = useDiagramStore((s) => s.stageSize);
  const screenToWorld = useDiagramStore((s) => s.screenToWorld);
  const updateBookmarkFrame = useDiagramStore((s) => s.updateBookmarkFrame);

  const bounds = viewportToWorldBounds(bookmark.viewport, stageSize);
  const center = {
    x: bounds.x + bounds.width / 2,
    y: bounds.y + bounds.height / 2,
  };
  const color = rgbToCss(bookmark.color);
  const handleSize = 10 / scale;
  const strokeW = 2 / scale;

  const clearResizeCursor = (stage: Konva.Stage | null) => {
    document.body.style.cursor = "";
    const container = stage?.container();
    if (container) container.style.cursor = "";
  };

  useEffect(() => {
    if (!resizing) return;

    const onMove = (e: MouseEvent) => {
      const centerPoint = resizeCenterRef.current;
      const stage = stageRef.current;
      if (!centerPoint || !stage) return;
      const rect = stage.container().getBoundingClientRect();
      const world = screenToWorld({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
      const nextViewport = viewportFromCenterAndPointer(
        centerPoint,
        world,
        stageSize,
      );
      updateBookmarkFrame(bookmark.id, {
        viewport: nextViewport,
        // Keep the marker at the frame centre while resizing.
        anchor: { ...centerPoint },
      });
    };

    const onUp = () => {
      // Capture-phase: must run before Konva synthesises stage click on mouseup.
      requestSuppressStageClick();
      const stage = stageRef.current;
      resizeCenterRef.current = null;
      resizingRef.current = false;
      stageRef.current = null;
      setResizing(false);
      clearResizeCursor(stage);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp, true);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp, true);
      // If the effect tears down mid-gesture, still restore the cursor.
      clearResizeCursor(stageRef.current);
      resizingRef.current = false;
    };
  }, [
    resizing,
    bookmark.id,
    screenToWorld,
    stageSize,
    updateBookmarkFrame,
  ]);

  const beginResize = (
    e: Konva.KonvaEventObject<MouseEvent>,
    corner: ResizeCorner,
  ) => {
    if (e.evt.button !== 0) return;
    e.cancelBubble = true;
    const stage = e.target.getStage();
    if (!stage) return;
    stageRef.current = stage;
    resizeCenterRef.current = { ...center };
    resizingRef.current = true;
    const cursor = cursorForCorner(corner);
    document.body.style.cursor = cursor;
    stage.container().style.cursor = cursor;
    setResizing(true);
  };

  return (
    <Group listening>
      <Rect
        x={bounds.x}
        y={bounds.y}
        width={bounds.width}
        height={bounds.height}
        stroke={color}
        strokeWidth={strokeW}
        dash={[8 / scale, 6 / scale]}
        opacity={0.45}
        fillEnabled={false}
        listening={false}
      />
      {CORNERS.map((corner) => {
        const pos = cornerPosition(bounds, corner);
        return (
          <Rect
            key={corner}
            x={pos.x - handleSize / 2}
            y={pos.y - handleSize / 2}
            width={handleSize}
            height={handleSize}
            fill={color}
            opacity={0.85}
            stroke="rgba(255, 255, 255, 0.9)"
            strokeWidth={1 / scale}
            onMouseDown={(e) => beginResize(e, corner)}
            onMouseEnter={(e) => {
              if (resizingRef.current) return;
              const container = e.target.getStage()?.container();
              if (container) container.style.cursor = cursorForCorner(corner);
            }}
            onMouseLeave={(e) => {
              if (resizingRef.current) return;
              const container = e.target.getStage()?.container();
              if (container) container.style.cursor = "";
            }}
          />
        );
      })}
    </Group>
  );
}
