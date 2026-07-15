import { useEffect, useState } from "react";
import type Konva from "konva";
import { useTranslation } from "react-i18next";
import { useDiagramStore } from "../../store/diagramStore";
import { exportStageToPng, getAutoExportBounds } from "../../utils/export";
import { downloadDataUrl, getDefaultExportFilename } from "../../utils/persistence";
import { isDefaultDiagramFont } from "../../utils/diagramFont";
import type { Bounds } from "../../models/types";

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
  const viewportScale = useDiagramStore((s) => s.viewport.scale);
  const setToolMode = useDiagramStore((s) => s.setToolMode);
  const setExportBounds = useDiagramStore((s) => s.setExportBounds);

  const [mode, setMode] = useState<"auto" | "custom">("auto");
  const [pixelRatio, setPixelRatio] = useState(1);
  const [padding, setPadding] = useState(32);
  const [autoBounds, setAutoBounds] = useState<Bounds | null>(null);

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
    diagram,
  };

  if (!open) return null;

  const width = activeBounds ? Math.round(activeBounds.width * pixelRatio) : 0;
  const height = activeBounds
    ? Math.round(activeBounds.height * pixelRatio)
    : 0;

  const handleExport = async () => {
    const stage = stageRef.current;
    if (!stage || !activeBounds) return;
    try {
      const dataUrl = await exportStageToPng(stage, {
        bounds: activeBounds,
        pixelRatio,
        backgroundColor: diagramBackgroundColor,
        showGrid,
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

        <label className="field">
          <span>{t("export.resolution")}</span>
          <select
            value={pixelRatio}
            onChange={(e) => setPixelRatio(Number(e.target.value))}
          >
            <option value={1}>{t("export.res1x")}</option>
            <option value={2}>{t("export.res2x")}</option>
          </select>
        </label>

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
