import { useEffect, useState } from "react";
import type Konva from "konva";
import { useDiagramStore } from "../../store/diagramStore";
import {
  exportStageToPng,
  formatBytes,
  getAutoExportBounds,
} from "../../utils/export";
import { downloadDataUrl, estimateDataUrlSize, getDefaultExportFilename } from "../../utils/persistence";
import { isDefaultDiagramFont } from "../../utils/diagramFont";
import type { Bounds } from "../../models/types";

interface ExportDialogProps {
  open: boolean;
  stageRef: React.RefObject<Konva.Stage | null>;
  onClose: () => void;
}

export function ExportDialog({ open, stageRef, onClose }: ExportDialogProps) {
  const characters = useDiagramStore((s) => s.characters);
  const lines = useDiagramStore((s) => s.lines);
  const groups = useDiagramStore((s) => s.groups);
  const diagramTitle = useDiagramStore((s) => s.diagramTitle);
  const diagramSubtitle = useDiagramStore((s) => s.diagramSubtitle);
  const showDiagramHeader = useDiagramStore((s) => s.showDiagramHeader);
  const diagramFontFamily = useDiagramStore((s) => s.diagramFontFamily);
  const diagram = {
    schemaVersion: 1 as const,
    title: diagramTitle || undefined,
    subtitle: diagramSubtitle || undefined,
    fontFamily: isDefaultDiagramFont(diagramFontFamily)
      ? undefined
      : diagramFontFamily,
    characters,
    lines,
    groups,
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
  const [previewSize, setPreviewSize] = useState<number | null>(null);
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

  useEffect(() => {
    if (!open) return;
    const stage = stageRef.current;
    if (!stage || !activeBounds) {
      setPreviewSize(null);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      void exportStageToPng(stage, {
        bounds: activeBounds,
        pixelRatio,
        backgroundColor: diagramBackgroundColor,
        showGrid,
        header: exportHeader,
        viewportScale,
      }).then((dataUrl) => {
        if (!cancelled) {
          estimateDataUrlSize(dataUrl).then(setPreviewSize);
        }
      });
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [
    open,
    stageRef,
    activeBounds,
    pixelRatio,
    mode,
    exportBounds,
    diagramBackgroundColor,
    showGrid,
    diagramTitle,
    diagramSubtitle,
    showDiagramHeader,
    diagramFontFamily,
    viewportScale,
    characters,
    lines,
    groups,
  ]);

  if (!open) return null;

  const width = activeBounds ? Math.round(activeBounds.width * pixelRatio) : 0;
  const height = activeBounds
    ? Math.round(activeBounds.height * pixelRatio)
    : 0;

  const handleExport = async () => {
    const stage = stageRef.current;
    if (!stage || !activeBounds) return;
    const dataUrl = await exportStageToPng(stage, {
      bounds: activeBounds,
      pixelRatio,
      backgroundColor: diagramBackgroundColor,
      showGrid,
      header: exportHeader,
      viewportScale,
    });
    downloadDataUrl(dataUrl, getDefaultExportFilename(diagramTitle));
    onClose();
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
        <h2>Export diagram</h2>

        <label className="field">
          <span>Bounds</span>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as "auto" | "custom")}
          >
            <option value="auto">Auto (content only)</option>
            <option value="custom">Custom region</option>
          </select>
        </label>

        {mode === "auto" && (
          <label className="field">
            <span>Padding (px)</span>
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
          <p className="hint">
            No custom region set. Click below to draw a region on the canvas.
          </p>
        )}

        {mode === "custom" && (
          <button type="button" className="btn-secondary" onClick={startCustomBounds}>
            Draw export region on canvas
          </button>
        )}

        <label className="field">
          <span>Resolution</span>
          <select
            value={pixelRatio}
            onChange={(e) => setPixelRatio(Number(e.target.value))}
          >
            <option value={1}>100% (1x)</option>
            <option value={2}>200% (2x)</option>
          </select>
        </label>

        {activeBounds ? (
          <div className="export-preview">
            <p>
              <strong>Dimensions:</strong> {width} × {height} px
            </p>
            <p>
              <strong>Estimated size:</strong>{" "}
              {previewSize !== null ? formatBytes(previewSize) : "…"}
            </p>
          </div>
        ) : (
          <p className="hint">Add content to the diagram before exporting.</p>
        )}

        <div className="dialog-actions">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={!activeBounds}
            onClick={handleExport}
          >
            Download PNG
          </button>
        </div>
      </div>
    </div>
  );
}
