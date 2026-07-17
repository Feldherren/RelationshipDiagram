import { useEffect, useRef, useState } from "react";
import { Group, Path } from "react-konva";
import type Konva from "konva";
import {
  rgbToCss,
  type Point,
  type ViewBookmark,
  type Viewport,
} from "../../models/types";
import { useDiagramStore } from "../../store/diagramStore";
import { useClickWithoutDrag } from "../../hooks/useClickWithoutDrag";
import { translateViewport } from "../../utils/viewportFit";
import { requestSuppressStageClick } from "../../utils/suppressStageClick";
import { PillLabel, getPillLabelHeight } from "./PillLabel";

interface BookmarkFlagProps {
  bookmark: ViewBookmark;
  selected: boolean;
}

/** Filled ribbon bookmark glyph, matching the UI icon. */
const BOOKMARK_PATH =
  "M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2z";
/** Path bounds within the 24x24 viewBox. */
const PATH_CENTER_X = 12;
const PATH_BOTTOM_Y = 21;
const RIBBON_PX = 30;
const PATH_HEIGHT = 18;
const LABEL_FONT_SIZE = 12;
const LABEL_GAP = 6;
const DRAG_THRESHOLD = 3;

export function BookmarkFlag({ bookmark, selected }: BookmarkFlagProps) {
  const [hovered, setHovered] = useState(false);
  const [dragging, setDragging] = useState(false);
  const stageRef = useRef<Konva.Stage | null>(null);
  const dragStartRef = useRef<{
    pointer: Point;
    anchor: Point;
    viewport: Viewport;
  } | null>(null);
  const clickGuard = useClickWithoutDrag();

  const scale = useDiagramStore((s) => s.viewport.scale);
  const setSelection = useDiagramStore((s) => s.setSelection);
  const openBookmarkEdit = useDiagramStore((s) => s.openBookmarkEdit);
  const captureHistory = useDiagramStore((s) => s.captureHistory);
  const updateBookmarkFrame = useDiagramStore((s) => s.updateBookmarkFrame);
  const screenToWorld = useDiagramStore((s) => s.screenToWorld);
  const nameLabel = useDiagramStore(
    (s) => s.diagramAppearance.characterNameLabel,
  );
  const historyCapturedRef = useRef(false);
  const didDragRef = useRef(false);
  const inv = 1 / Math.max(0.01, scale);
  const color = rgbToCss(bookmark.color);

  const iconScale = (RIBBON_PX / PATH_HEIGHT) * inv;
  const stroke = 1 * inv;
  const fontSize = LABEL_FONT_SIZE * inv;
  const label = bookmark.name.trim();
  const showLabel = (hovered || selected || dragging) && label.length > 0;
  const labelY =
    -RIBBON_PX * inv - getPillLabelHeight(fontSize) / 2 - LABEL_GAP * inv;

  useEffect(() => {
    if (!dragging) return;

    const onMove = (e: MouseEvent) => {
      const start = dragStartRef.current;
      const stage = stageRef.current;
      if (!start || !stage) return;
      const rect = stage.container().getBoundingClientRect();
      const world = screenToWorld({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
      const dx = world.x - start.pointer.x;
      const dy = world.y - start.pointer.y;
      if (
        Math.abs(dx) > DRAG_THRESHOLD / scale ||
        Math.abs(dy) > DRAG_THRESHOLD / scale
      ) {
        didDragRef.current = true;
        clickGuard.noticeDrag();
      }
      if (!historyCapturedRef.current) {
        historyCapturedRef.current = true;
        captureHistory();
      }
      updateBookmarkFrame(bookmark.id, {
        anchor: { x: start.anchor.x + dx, y: start.anchor.y + dy },
        viewport: translateViewport(start.viewport, dx, dy),
      }, { recordHistory: false });
    };

    const onUp = () => {
      // Only suppress a trailing stage click after a real drag; a plain
      // click-to-select must not eat the next empty-space deselect.
      if (didDragRef.current) {
        requestSuppressStageClick();
      }
      dragStartRef.current = null;
      stageRef.current = null;
      setDragging(false);
      document.body.style.cursor = "";
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp, true);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp, true);
    };
  }, [
    dragging,
    bookmark.id,
    scale,
    screenToWorld,
    updateBookmarkFrame,
    captureHistory,
    clickGuard.noticeDrag,
  ]);

  const beginDrag = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (e.evt.button !== 0) return;
    e.cancelBubble = true;
    const stage = e.target.getStage();
    const pointer = stage?.getPointerPosition();
    if (!stage || !pointer) return;
    stageRef.current = stage;
    historyCapturedRef.current = false;
    didDragRef.current = false;
    const world = screenToWorld(pointer);
    dragStartRef.current = {
      pointer: world,
      anchor: { ...bookmark.anchor },
      viewport: { ...bookmark.viewport },
    };
    setSelection({ type: "bookmark", id: bookmark.id });
    document.body.style.cursor = "grabbing";
    setDragging(true);
  };

  const select = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    e.cancelBubble = true;
    if ("button" in e.evt && e.evt.button !== 0) return;
    if (clickGuard.consumeClickSuppression()) return;
    setSelection({ type: "bookmark", id: bookmark.id });
  };

  const handleOpenEdit = (e: Konva.KonvaEventObject<PointerEvent>) => {
    e.cancelBubble = true;
    e.evt.preventDefault();
    openBookmarkEdit(bookmark.id);
  };

  return (
    <Group
      x={bookmark.anchor.x}
      y={bookmark.anchor.y}
      onMouseDown={beginDrag}
      onClick={select}
      onTap={select}
      onContextMenu={handleOpenEdit}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Path
        data={BOOKMARK_PATH}
        fill={color}
        stroke={selected ? "rgba(0, 0, 0, 0.55)" : "rgba(0, 0, 0, 0.25)"}
        strokeWidth={selected ? stroke * 1.5 : stroke}
        opacity={selected ? 0.85 : 0.65}
        scaleX={iconScale}
        scaleY={iconScale}
        offsetX={PATH_CENTER_X}
        offsetY={PATH_BOTTOM_Y}
        hitStrokeWidth={6 * inv}
      />
      {showLabel ? (
        <PillLabel
          text={label}
          y={labelY}
          fontSize={fontSize}
          paddingX={6 * inv}
          paddingY={3 * inv}
          strokeWidth={1 * inv}
          textFill={rgbToCss(nameLabel.textColor)}
          fill={rgbToCss(nameLabel.backgroundColor)}
          unselectedStroke={rgbToCss(nameLabel.borderColor)}
          selected={selected}
        />
      ) : null}
    </Group>
  );
}
