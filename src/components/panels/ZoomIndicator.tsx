import { useTranslation } from "react-i18next";
import { useDiagramStore } from "../../store/diagramStore";

export function formatZoomPercent(scale: number): number {
  return Math.round(scale * 100);
}

export function ZoomIndicator() {
  const { t } = useTranslation();
  const scale = useDiagramStore((s) => s.viewport.scale);
  const percent = formatZoomPercent(scale);

  return (
    <div
      className="zoom-indicator"
      aria-live="polite"
      aria-label={t("canvas.zoomAria", { percent })}
      title={t("canvas.zoomTitle")}
    >
      {t("canvas.zoom", { percent })}
    </div>
  );
}
