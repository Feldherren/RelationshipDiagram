export const EXPORT_ZOOM_PRESETS = [100, 200] as const;

export const MIN_EXPORT_ZOOM_PERCENT = 15;
export const MAX_EXPORT_ZOOM_PERCENT = 400;

export function clampExportZoomPercent(value: number): number {
  if (!Number.isFinite(value)) return 100;
  return Math.min(
    MAX_EXPORT_ZOOM_PERCENT,
    Math.max(MIN_EXPORT_ZOOM_PERCENT, Math.round(value)),
  );
}

export function exportZoomPercentFromRatio(ratio: number): number {
  return clampExportZoomPercent(ratio * 100);
}

export function exportZoomRatioFromPercent(percent: number): number {
  return clampExportZoomPercent(percent) / 100;
}
