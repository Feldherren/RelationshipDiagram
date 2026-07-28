import { useLayoutEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  DEFAULT_FLOATING_TEXT_ALIGN,
  DEFAULT_FLOATING_TEXT_COLOR,
  DEFAULT_FLOATING_TEXT_FONT_SIZE,
  rgbToCss,
} from "../../models/types";
import { useDiagramStore } from "../../store/diagramStore";
import { formatFontForCanvas } from "../../utils/diagramFont";
import {
  FLOATING_TEXT_LINE_HEIGHT,
  getFloatingTextPadding,
  getFloatingTextSize,
} from "../../utils/labelMetrics";
import { worldBoundsToScreen } from "../../utils/selectionAnchor";

/**
 * HTML textarea overlaid on the canvas for inline floating-text editing.
 * Konva Text cannot accept keyboard input, so this sits above the stage.
 */
export function FloatingTextEditor() {
  const { t } = useTranslation();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const editingId = useDiagramStore((s) => s.editingFloatingTextId);
  const floatingText = useDiagramStore((s) =>
    editingId ? s.floatingTexts.find((t) => t.id === editingId) : undefined,
  );
  const viewport = useDiagramStore((s) => s.viewport);
  const fontFamily = useDiagramStore((s) => s.diagramFontFamily);
  const updateFloatingText = useDiagramStore((s) => s.updateFloatingText);
  const endEditingFloatingText = useDiagramStore(
    (s) => s.endEditingFloatingText,
  );

  useLayoutEffect(() => {
    if (!editingId) return;
    const el = textareaRef.current;
    if (!el) return;
    const text =
      useDiagramStore
        .getState()
        .floatingTexts.find((t) => t.id === editingId)?.text ?? "";
    el.focus();
    if (!text) {
      el.select();
    } else {
      const len = el.value.length;
      el.setSelectionRange(len, len);
    }
  }, [editingId]);

  if (!editingId || !floatingText) return null;

  const fontSize = floatingText.fontSize || DEFAULT_FLOATING_TEXT_FONT_SIZE;
  const color = floatingText.color ?? DEFAULT_FLOATING_TEXT_COLOR;
  const textAlign = floatingText.textAlign ?? DEFAULT_FLOATING_TEXT_ALIGN;
  const hasExplicitWidth = floatingText.width != null;
  const measureText =
    floatingText.text.length > 0
      ? floatingText.text
      : t("defaults.floatingTextPlaceholder");
  const { width, height } = getFloatingTextSize(
    measureText,
    fontSize,
    fontFamily,
    { width: floatingText.width, height: floatingText.height },
  );
  const { paddingX, paddingY } = getFloatingTextPadding(fontSize);
  const scale = viewport.scale;
  const screen = worldBoundsToScreen(
    {
      x: floatingText.position.x - width / 2,
      y: floatingText.position.y - height / 2,
      width,
      height,
    },
    viewport,
  );

  return (
    <textarea
      ref={textareaRef}
      className="floating-text-editor"
      value={floatingText.text}
      placeholder={t("defaults.floatingTextPlaceholder")}
      spellCheck={false}
      aria-label={t("selection.text")}
      style={{
        left: screen.x,
        top: screen.y,
        width: Math.max(1, screen.width),
        height: Math.max(1, screen.height),
        fontFamily: formatFontForCanvas(fontFamily),
        fontSize: fontSize * scale,
        lineHeight: FLOATING_TEXT_LINE_HEIGHT,
        color: rgbToCss(color),
        textAlign,
        padding: `${paddingY * scale}px ${paddingX * scale}px`,
        whiteSpace: hasExplicitWidth ? "pre-wrap" : "pre",
        overflowWrap: hasExplicitWidth ? "break-word" : "normal",
      }}
      onChange={(e) => {
        updateFloatingText(
          floatingText.id,
          { text: e.target.value },
          { recordHistory: false },
        );
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          e.stopPropagation();
          endEditingFloatingText();
        }
      }}
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onBlur={() => {
        // Defer so selection changes from the same click can clear editing first.
        requestAnimationFrame(() => {
          const state = useDiagramStore.getState();
          if (state.editingFloatingTextId !== editingId) return;
          // Keep inline edit active while the details panel is open for this text
          // so colour / size / align controls do not dismiss the editor.
          if (
            state.selectionDetailsOpen &&
            state.selection?.type === "floatingText" &&
            state.selection.id === editingId
          ) {
            return;
          }
          endEditingFloatingText();
        });
      }}
    />
  );
}
