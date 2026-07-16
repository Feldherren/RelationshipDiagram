import { useEffect, useState } from "react";
import type Konva from "konva";
import { useTranslation } from "react-i18next";
import { useDiagramStore } from "../../store/diagramStore";
import { exportStageToPng, getAutoExportBounds } from "../../utils/export";
import { downloadDataUrl, getDefaultExportFilename } from "../../utils/persistence";
import { isDefaultDiagramFont } from "../../utils/diagramFont";
import { getAppPreferences } from "../../utils/appPreferences";
import type { Bounds } from "../../models/types";
import { formatZoomPercent } from "./ZoomIndicator";

const EXPORT_ZOOM_PRESETS = [100, 200] as const;
const MIN_EXPORT_ZOOM_PERCENT = 15;
const MAX_EXPORT_ZOOM_PERCENT = 400;

function clampExportZoomPercent(value: number): number {
  if (!Number.isFinite(value)) return 100;
  return Math.min(
    MAX_EXPORT_ZOOM_PERCENT,
    Math.max(MIN_EXPORT_ZOOM_PERCENT, Math.round(value)),
  );
}

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
  const [zoomPercent, setZoomPercent] = useState(
    () => exportPrefs.defaultExportPixelRatio * 100,
  );
  const [zoomDraft, setZoomDraft] = useState(() =>
    String(exportPrefs.defaultExportPixelRatio * 100),
  );
  const [padding, setPadding] = useState(exportPrefs.defaultExportPadding);
  const [autoBounds, setAutoBounds] = useState<Bounds | null>(null);

  const applyZoomPercent = (next: number) => {
    const clamped = clampExportZoomPercent(next);
    setZoomPercent(clamped);
    setZoomDraft(String(clamped));
  };

  useEffect(() => {
    if (!open) return;
    const prefs = getAppPreferences();
    const initialZoom = prefs.defaultExportPixelRatio * 100;
    setMode(prefs.defaultExportBoundsMode);
    setZoomPercent(initialZoom);
    setZoomDraft(String(initialZoom));
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

  const pixelRatio = zoomPercent / 100;
  const width = activeBounds ? Math.round(activeBounds.width * pixelRatio) : 0;
  const height = activeBounds
    ? Math.round(activeBounds.height * pixelRatio)
    : 0;

  const commitZoomDraft = () => {
    applyZoomPercent(Number(zoomDraft));
  };

  const handleExport = async () => {
    const stage = stageRef.current;
    if (!stage || !activeBounds) return;
    const exportZoom = clampExportZoomPercent(Number(zoomDraft));
    applyZoomPercent(exportZoom);
    try {
      const dataUrl = await exportStageToPng(stage, {
        bounds: activeBounds,
        pixelRatio: exportZoom / 100,
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

        <div className="field">
          <span>{t("export.resolution")}</span>
          <div className="export-zoom-row" role="group" aria-label={t("export.resolution")}>
            {EXPORT_ZOOM_PRESETS.map((preset) => {
              const selected = zoomPercent === preset;
              return (
                <button
                  key={preset}
                  type="button"
                  className={`export-zoom-preset${selected ? " selected" : ""}`}
                  aria-pressed={selected}
                  onClick={() => applyZoomPercent(preset)}
                >
                  {t(preset === 100 ? "export.res1x" : "export.res2x")}
                </button>
              );
            })}
            <label className="export-zoom-custom">
              <span className="sr-only">{t("export.customZoom")}</span>
              <input
                type="number"
                min={MIN_EXPORT_ZOOM_PERCENT}
                max={MAX_EXPORT_ZOOM_PERCENT}
                step={1}
                value={zoomDraft}
                aria-label={t("export.customZoom")}
                onChange={(e) => {
                  const next = e.target.value;
                  setZoomDraft(next);
                  if (next.trim() === "") return;
                  const parsed = Number(next);
                  if (
                    !Number.isFinite(parsed) ||
                    parsed < MIN_EXPORT_ZOOM_PERCENT ||
                    parsed > MAX_EXPORT_ZOOM_PERCENT
                  ) {
                    return;
                  }
                  setZoomPercent(Math.round(parsed));
                }}
                onBlur={commitZoomDraft}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    commitZoomDraft();
                    (e.target as HTMLInputElement).blur();
                  }
                }}
              />
              <span aria-hidden="true">{t("export.customZoomSuffix")}</span>
            </label>
          </div>
          <p className="hint">
            {t("export.currentZoom", {
              percent: formatZoomPercent(viewportScale),
            })}
          </p>
        </div>

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
