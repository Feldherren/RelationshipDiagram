import { useEffect, useState } from "react";
import type Konva from "konva";
import { useTranslation } from "react-i18next";
import { useDiagramStore } from "../../store/diagramStore";
import { exportStageToPng, getAutoExportBounds } from "../../utils/export";
import { downloadDataUrl, getDefaultExportFilename } from "../../utils/persistence";
import { isDefaultDiagramFont } from "../../utils/diagramFont";
import { getAppPreferences } from "../../utils/appPreferences";
import {
  clampExportZoomPercent,
  exportZoomPercentFromRatio,
  exportZoomRatioFromPercent,
} from "../../utils/exportZoom";
import type { Bounds } from "../../models/types";
import { formatZoomPercent } from "./ZoomIndicator";
import { ExportZoomControls } from "./ExportZoomControls";

interface ExportDialogProps {
  open: boolean;
  stageRef: React.RefObject<Konva.Stage | null>;
  onClose: () => void;
}

export function ExportDialog({ open, stageRef, onClose }: ExportDialogProps) {
  const { t } = useTranslation();
  const characters = useDiagramStore((s) => s.characters);
  const lines = useDiagramStore((s) => s.lines);
  const groups = useDiagramStore((s) => s.groups);
  const boxes = useDiagramStore((s) => s.boxes);
  const floatingTexts = useDiagramStore((s) => s.floatingTexts);
  const diagramTitle = useDiagramStore((s) => s.diagramTitle);
  const diagramSubtitle = useDiagramStore((s) => s.diagramSubtitle);
  const diagramTitleColor = useDiagramStore((s) => s.diagramTitleColor);
  const diagramSubtitleColor = useDiagramStore((s) => s.diagramSubtitleColor);
  const showDiagramHeader = useDiagramStore((s) => s.showDiagramHeader);
  const diagramFontFamily = useDiagramStore((s) => s.diagramFontFamily);
  const diagram = {
    schemaVersion: 2 as const,
    title: diagramTitle || undefined,
    subtitle: diagramSubtitle || undefined,
    fontFamily: isDefaultDiagramFont(diagramFontFamily)
      ? undefined
      : diagramFontFamily,
    characters,
    lines,
    groups,
    boxes,
    floatingTexts,
  };
  const exportBounds = useDiagramStore((s) => s.exportBounds);
  const diagramBackgroundColor = useDiagramStore((s) => s.diagramBackgroundColor);
  const showGrid = useDiagramStore((s) => s.showGrid);
  const gridStyle = useDiagramStore((s) => s.gridStyle);
  const viewportScale = useDiagramStore((s) => s.viewport.scale);
  const setToolMode = useDiagramStore((s) => s.setToolMode);
  const setExportBounds = useDiagramStore((s) => s.setExportBounds);

  const exportPrefs = getAppPreferences();
  const [mode, setMode] = useState<"auto" | "custom">(
    exportPrefs.defaultExportBoundsMode,
  );
  const [zoomPercent, setZoomPercent] = useState(() =>
    exportZoomPercentFromRatio(exportPrefs.defaultExportPixelRatio),
  );
  const [padding, setPadding] = useState(exportPrefs.defaultExportPadding);
  const [autoBounds, setAutoBounds] = useState<Bounds | null>(null);

  useEffect(() => {
    if (!open) return;
    const prefs = getAppPreferences();
    setMode(prefs.defaultExportBoundsMode);
    setZoomPercent(exportZoomPercentFromRatio(prefs.defaultExportPixelRatio));
    setPadding(prefs.defaultExportPadding);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const updateBounds = () => {
      const stage = stageRef.current;
      setAutoBounds(
        getAutoExportBounds(diagram, padding, viewportScale, stage),
      );
    };

    requestAnimationFrame(updateBounds);
  }, [
    open,
    stageRef,
    padding,
    viewportScale,
    diagram,
    characters,
    lines,
    groups,
    boxes,
    diagramFontFamily,
  ]);

  const activeBounds: Bounds | null =
    mode === "custom" ? exportBounds : autoBounds;

  const exportHeader = {
    title: diagramTitle,
    subtitle: diagramSubtitle,
    showHeader: showDiagramHeader,
    fontFamily: diagramFontFamily,
    titleColor: diagramTitleColor,
    subtitleColor: diagramSubtitleColor,
    diagram,
  };

  if (!open) return null;

  const pixelRatio = exportZoomRatioFromPercent(zoomPercent);
  const width = activeBounds ? Math.round(activeBounds.width * pixelRatio) : 0;
  const height = activeBounds
    ? Math.round(activeBounds.height * pixelRatio)
    : 0;

  const handleExport = async () => {
    const stage = stageRef.current;
    if (!stage || !activeBounds) return;
    const exportZoom = clampExportZoomPercent(zoomPercent);
    setZoomPercent(exportZoom);
    try {
      const dataUrl = await exportStageToPng(stage, {
        bounds: activeBounds,
        pixelRatio: exportZoomRatioFromPercent(exportZoom),
        backgroundColor: diagramBackgroundColor,
        showGrid,
        gridStyle,
        header: exportHeader,
        viewportScale,
      });
      const saved = await downloadDataUrl(
        dataUrl,
        getDefaultExportFilename(diagramTitle),
      );
      if (saved) onClose();
    } catch (err) {
      console.error(err);
      alert(t("export.failed"));
    }
  };

  const startCustomBounds = () => {
    setMode("custom");
    setExportBounds(null);
    setToolMode("exportBounds");
    onClose();
  };

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <h2>{t("export.title")}</h2>

        <label className="field">
          <span>{t("export.bounds")}</span>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as "auto" | "custom")}
          >
            <option value="auto">{t("export.boundsAuto")}</option>
            <option value="custom">{t("export.boundsCustom")}</option>
          </select>
        </label>

        {mode === "auto" && (
          <label className="field">
            <span>{t("export.padding")}</span>
            <input
              type="number"
              min={0}
              max={200}
              value={padding}
              onChange={(e) => setPadding(Number(e.target.value))}
            />
          </label>
        )}

        {mode === "custom" && !exportBounds && (
          <p className="hint">{t("export.noCustomRegion")}</p>
        )}

        {mode === "custom" && (
          <button type="button" className="btn-secondary" onClick={startCustomBounds}>
            {t("export.drawRegion")}
          </button>
        )}

        <ExportZoomControls
          label={t("export.resolution")}
          value={zoomPercent}
          onChange={setZoomPercent}
          hint={
            <p className="hint">
              {t("export.currentZoom", {
                percent: formatZoomPercent(viewportScale),
              })}
            </p>
          }
        />

        {activeBounds ? (
          <div className="export-preview">
            <p>
              <strong>{t("export.dimensions")}</strong> {width} × {height} px
            </p>
          </div>
        ) : (
          <p className="hint">{t("export.empty")}</p>
        )}

        <div className="dialog-actions">
          <button type="button" className="btn-secondary" onClick={onClose}>
            {t("export.cancel")}
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={!activeBounds}
            onClick={handleExport}
          >
            {t("export.downloadPng")}
          </button>
        </div>
      </div>
    </div>
  );
}
