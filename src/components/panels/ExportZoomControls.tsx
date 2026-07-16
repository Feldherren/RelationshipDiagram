import { useEffect, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  EXPORT_ZOOM_PRESETS,
  MAX_EXPORT_ZOOM_PERCENT,
  MIN_EXPORT_ZOOM_PERCENT,
  clampExportZoomPercent,
} from "../../utils/exportZoom";

interface ExportZoomControlsProps {
  label: string;
  /** Export zoom as a percent (100 = 1×). */
  value: number;
  onChange: (percent: number) => void;
  hint?: ReactNode;
}

function isExportZoomPreset(percent: number): boolean {
  return (EXPORT_ZOOM_PRESETS as readonly number[]).includes(percent);
}

export function ExportZoomControls({
  label,
  value,
  onChange,
  hint,
}: ExportZoomControlsProps) {
  const { t } = useTranslation();
  const zoomPercent = clampExportZoomPercent(value);
  const [zoomDraft, setZoomDraft] = useState(() => String(zoomPercent));
  const isCustom = !isExportZoomPreset(zoomPercent);

  useEffect(() => {
    setZoomDraft(String(zoomPercent));
  }, [zoomPercent]);

  const applyZoomPercent = (next: number) => {
    const clamped = clampExportZoomPercent(next);
    setZoomDraft(String(clamped));
    onChange(clamped);
  };

  const commitZoomDraft = () => {
    applyZoomPercent(Number(zoomDraft));
  };

  return (
    <div className="field">
      <span>{label}</span>
      <div className="export-zoom-row" role="group" aria-label={label}>
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
        <label
          className={`export-zoom-custom${isCustom ? " selected" : ""}`}
          title={t("export.customZoomTitle")}
        >
          <span className="export-zoom-custom-label">{t("export.customZoom")}</span>
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
              onChange(Math.round(parsed));
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
      {hint}
    </div>
  );
}
