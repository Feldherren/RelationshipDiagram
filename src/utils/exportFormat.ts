export type ExportFormat = "png" | "webp" | "jpeg";

export const DEFAULT_EXPORT_FORMAT: ExportFormat = "png";

/** Default lossy quality (0–1). Shown as 92% in the UI. */
export const DEFAULT_EXPORT_QUALITY = 0.92;

const MIME_BY_FORMAT: Record<ExportFormat, string> = {
  png: "image/png",
  webp: "image/webp",
  jpeg: "image/jpeg",
};

const EXTENSION_BY_FORMAT: Record<ExportFormat, string> = {
  png: "png",
  webp: "webp",
  jpeg: "jpg",
};

export function isExportFormat(value: unknown): value is ExportFormat {
  return value === "png" || value === "webp" || value === "jpeg";
}

export function mimeTypeForFormat(format: ExportFormat): string {
  return MIME_BY_FORMAT[format];
}

export function extensionForFormat(format: ExportFormat): string {
  return EXTENSION_BY_FORMAT[format];
}

export function formatUsesQuality(format: ExportFormat): boolean {
  return format === "webp" || format === "jpeg";
}

/** Clamp quality to 0.01–1 (canvas quality argument). */
export function clampExportQuality(quality: number): number {
  if (!Number.isFinite(quality)) return DEFAULT_EXPORT_QUALITY;
  return Math.min(1, Math.max(0.01, quality));
}

/** Clamp UI percent 1–100 and convert to 0–1 quality. */
export function exportQualityFromPercent(percent: number): number {
  if (!Number.isFinite(percent)) return DEFAULT_EXPORT_QUALITY;
  const clamped = Math.min(100, Math.max(1, Math.round(percent)));
  return clamped / 100;
}

export function exportQualityPercentFromRatio(quality: number): number {
  return Math.round(clampExportQuality(quality) * 100);
}
