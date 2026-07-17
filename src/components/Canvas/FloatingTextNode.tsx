import { useRef } from "react";
import { Group, Rect, Text } from "react-konva";
import { useTranslation } from "react-i18next";
import type { FloatingText } from "../../models/types";
import {
  DEFAULT_FLOATING_TEXT_COLOR,
  DEFAULT_FLOATING_TEXT_FONT_SIZE,
  rgbToCss,
} from "../../models/types";
import { useDiagramStore } from "../../store/diagramStore";
import { formatFontForCanvas } from "../../utils/diagramFont";
import {
  FLOATING_TEXT_LINE_HEIGHT,
  getFloatingTextSize,
} from "../../utils/labelMetrics";
import { SELECTION_PILL_NODE_NAME } from "../../utils/export";
import { isIdInMultiSelection } from "../../utils/selectionMulti";

interface FloatingTextNodeProps {
  floatingText: FloatingText;
  selected: boolean;
  draggable: boolean;
  onSelect: () => void;
  onOpenDetails: () => void;
  onDragMove: (pos: { x: number; y: number }) => void;
  onDragEnd: (pos: { x: number; y: number }) => void;
}

const SELECTION_STROKE = "#4a90d9";

export function FloatingTextNode({
  floatingText,
  selected,
  draggable,
  onSelect,
  onOpenDetails,
  onDragMove,
  onDragEnd,
}: FloatingTextNodeProps) {
  const { t } = useTranslation();
  const allowDragRef = useRef(true);
  const multiDragLastPosRef = useRef<{ x: number; y: number } | null>(null);
  const selection = useDiagramStore((s) => s.selection);
  const captureHistory = useDiagramStore((s) => s.captureHistory);
  const moveMultiSelectionByDelta = useDiagramStore(
    (s) => s.moveMultiSelectionByDelta,
  );
  const fontFamily = useDiagramStore((s) => s.diagramFontFamily);
  const hasText = Boolean(floatingText.text.trim());
  const displayText = hasText
    ? floatingText.text
    : t("defaults.floatingTextPlaceholder");
  const fontSize = floatingText.fontSize || DEFAULT_FLOATING_TEXT_FONT_SIZE;
  const color = floatingText.color ?? DEFAULT_FLOATING_TEXT_COLOR;
  const { width, height } = getFloatingTextSize(
    displayText,
    fontSize,
    fontFamily,
  );
  const rectX = -width / 2;
  const rectY = -height / 2;

  return (
    <Group
      x={floatingText.position.x}
      y={floatingText.position.y}
      draggable={draggable}
      onMouseDown={(e) => {
        allowDragRef.current = e.evt.button === 0;
      }}
      onTouchStart={() => {
        allowDragRef.current = true;
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
        onOpenDetails();
      }}
      onDblTap={(e) => {
        e.cancelBubble = true;
        e.evt.preventDefault();
        onOpenDetails();
      }}
      onContextMenu={(e) => {
        e.cancelBubble = true;
        e.evt.preventDefault();
        onOpenDetails();
      }}
      onDragStart={(e) => {
        if (!allowDragRef.current) {
          e.target.stopDrag();
          return;
        }
        // Dragging is layout, not inspect — keep selection, close the float.
        captureHistory();
        useDiagramStore.setState({ selectionDetailsOpen: false });
        multiDragLastPosRef.current = {
          x: floatingText.position.x,
          y: floatingText.position.y,
        };
      }}
      onDragMove={(e) => {
        const pos = { x: e.target.x(), y: e.target.y() };
        if (
          isIdInMultiSelection(selection, "floatingText", floatingText.id)
        ) {
          const last = multiDragLastPosRef.current ?? pos;
          const dx = pos.x - last.x;
          const dy = pos.y - last.y;
          multiDragLastPosRef.current = pos;
          if (dx !== 0 || dy !== 0) {
            moveMultiSelectionByDelta({ dx, dy }, { recordHistory: false });
          }
          return;
        }
        onDragMove(pos);
      }}
      onDragEnd={(e) => {
        const pos = { x: e.target.x(), y: e.target.y() };
        multiDragLastPosRef.current = null;
        if (
          isIdInMultiSelection(selection, "floatingText", floatingText.id)
        ) {
          return;
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
        stroke={selected ? SELECTION_STROKE : "transparent"}
        strokeWidth={selected ? 1.5 : 0}
        dash={selected ? [5, 4] : undefined}
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
        align="center"
        verticalAlign="middle"
        wrap="none"
        listening={false}
      />
    </Group>
  );
}
