import { useEffect, useRef, useState } from "react";
import { Group, Path } from "react-konva";
import type Konva from "konva";
import { useTranslation } from "react-i18next";
import type { Point } from "../../models/types";
import { useDiagramStore } from "../../store/diagramStore";
import { useClickWithoutDrag } from "../../hooks/useClickWithoutDrag";
import { requestSuppressStageClick } from "../../utils/suppressStageClick";
import { BACKGROUND_IMAGE_HANDLE_NODE_NAME } from "../../utils/export";
import { PillLabel, getPillLabelHeight } from "./PillLabel";
import { rgbToCss } from "../../models/types";

/** Filled image glyph (24×24 viewBox), matching bookmark-marker treatment. */
const IMAGE_PATH =
  "M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z";
const PATH_CENTER = 12;
const ICON_PX = 28;
const PATH_SIZE = 24;
const HANDLE_COLOR = "#4a90d9";
const DRAG_THRESHOLD = 3;
const LABEL_FONT_SIZE = 12;
const LABEL_GAP = 6;

/**
 * Filled, semi-transparent grab marker for repositioning the diagram wallpaper.
 * Shown with bookmark flags via `bookmarksVisible`.
 */
export function BackgroundImageHandle() {
  const { t } = useTranslation();
  const [hovered, setHovered] = useState(false);
  const [dragging, setDragging] = useState(false);
  const stageRef = useRef<Konva.Stage | null>(null);
  const dragStartRef = useRef<{
    pointer: Point;
    offset: Point;
  } | null>(null);
  const clickGuard = useClickWithoutDrag();
  const historyCapturedRef = useRef(false);
  const didDragRef = useRef(false);

  const scale = useDiagramStore((s) => s.viewport.scale);
  const offset = useDiagramStore(
    (s) => s.diagramAppearance.backgroundImageOffset,
  );
  const nameLabel = useDiagramStore(
    (s) => s.diagramAppearance.characterNameLabel,
  );
  const captureHistory = useDiagramStore((s) => s.captureHistory);
  const setDiagramAppearance = useDiagramStore((s) => s.setDiagramAppearance);
  const screenToWorld = useDiagramStore((s) => s.screenToWorld);

  const inv = 1 / Math.max(0.01, scale);
  const iconScale = (ICON_PX / PATH_SIZE) * inv;
  const stroke = 1 * inv;
  const fontSize = LABEL_FONT_SIZE * inv;
  const active = hovered || dragging;
  const showLabel = active;
  const labelY =
    -(ICON_PX / 2) * inv -
    getPillLabelHeight(fontSize) / 2 -
    LABEL_GAP * inv;

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
      setDiagramAppearance(
        {
          backgroundImageOffset: {
            x: start.offset.x + dx,
            y: start.offset.y + dy,
          },
        },
        { recordHistory: false },
      );
    };

    const onUp = () => {
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
    scale,
    screenToWorld,
    setDiagramAppearance,
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
      offset: { ...offset },
    };
    document.body.style.cursor = "grabbing";
    setDragging(true);
  };

  return (
    <Group
      name={BACKGROUND_IMAGE_HANDLE_NODE_NAME}
      x={offset.x}
      y={offset.y}
      onMouseDown={beginDrag}
      onMouseEnter={() => {
        setHovered(true);
        document.body.style.cursor = "grab";
      }}
      onMouseLeave={() => {
        setHovered(false);
        if (!dragging) document.body.style.cursor = "";
      }}
    >
      <Path
        data={IMAGE_PATH}
        fill={HANDLE_COLOR}
        stroke={active ? "rgba(0, 0, 0, 0.55)" : "rgba(0, 0, 0, 0.25)"}
        strokeWidth={active ? stroke * 1.5 : stroke}
        opacity={active ? 0.85 : 0.65}
        scaleX={iconScale}
        scaleY={iconScale}
        offsetX={PATH_CENTER}
        offsetY={PATH_CENTER}
        hitStrokeWidth={6 * inv}
      />
      {showLabel ? (
        <PillLabel
          text={t("canvas.backgroundImageHandle")}
          y={labelY}
          fontSize={fontSize}
          paddingX={6 * inv}
          paddingY={3 * inv}
          strokeWidth={1 * inv}
          textFill={rgbToCss(nameLabel.textColor)}
          fill={rgbToCss(nameLabel.backgroundColor)}
          unselectedStroke={rgbToCss(nameLabel.borderColor)}
          selected={false}
        />
      ) : null}
    </Group>
  );
}
