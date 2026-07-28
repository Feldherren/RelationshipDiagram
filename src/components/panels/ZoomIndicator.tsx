import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDiagramStore } from "../../store/diagramStore";
import {
  MAX_VIEWPORT_SCALE,
  MIN_VIEWPORT_SCALE,
} from "../../utils/viewportFit";

export const VIEWPORT_ZOOM_PRESETS = [50, 100, 150] as const;

export function formatZoomPercent(scale: number): number {
  return Math.round(scale * 100);
}

function clampViewportScale(scale: number): number {
  return Math.min(MAX_VIEWPORT_SCALE, Math.max(MIN_VIEWPORT_SCALE, scale));
}

export function ZoomIndicator() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const scale = useDiagramStore((s) => s.viewport.scale);
  const setViewport = useDiagramStore((s) => s.setViewport);
  const percent = formatZoomPercent(scale);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (rootRef.current?.contains(target)) return;
      setOpen(false);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const applyPreset = (presetPercent: number) => {
    const { viewport, stageSize } = useDiagramStore.getState();
    const cx = stageSize.width / 2;
    const cy = stageSize.height / 2;
    const worldX = (cx - viewport.x) / viewport.scale;
    const worldY = (cy - viewport.y) / viewport.scale;
    const next = clampViewportScale(presetPercent / 100);
    setViewport({
      scale: next,
      x: cx - worldX * next,
      y: cy - worldY * next,
    });
    setOpen(false);
  };

  return (
    <div className="zoom-indicator-anchor" ref={rootRef}>
      {open && (
        <div
          className="zoom-preset-menu"
          role="menu"
          aria-label={t("canvas.zoomMenuAria")}
        >
          {VIEWPORT_ZOOM_PRESETS.map((preset) => {
            const selected = percent === preset;
            return (
              <button
                key={preset}
                type="button"
                role="menuitemradio"
                className={`zoom-preset-option${selected ? " selected" : ""}`}
                aria-checked={selected}
                onClick={() => applyPreset(preset)}
              >
                {t("canvas.zoom", { percent: preset })}
              </button>
            );
          })}
        </div>
      )}
      <button
        type="button"
        className={`zoom-indicator${open ? " active" : ""}`}
        aria-live="polite"
        aria-label={t("canvas.zoomAria", { percent })}
        aria-expanded={open}
        aria-haspopup="menu"
        title={t("canvas.zoomTitle")}
        onClick={() => setOpen((value) => !value)}
      >
        {t("canvas.zoom", { percent })}
      </button>
    </div>
  );
}
