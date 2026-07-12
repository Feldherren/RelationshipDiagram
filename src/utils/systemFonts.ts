export interface SystemFontOption {
  family: string;
  fullName: string;
  postscriptName: string;
}

export const FONT_PREVIEW_TEXT = "Aa Bb Character Names 123";

export function isSystemFontAccessSupported(): boolean {
  return typeof window.queryLocalFonts === "function";
}

export async function queryInstalledFontFamilies(): Promise<SystemFontOption[]> {
  if (!window.queryLocalFonts) return [];

  const fonts = await window.queryLocalFonts();
  const byFamily = new Map<string, SystemFontOption>();

  for (const font of fonts) {
    const family = font.family.trim();
    if (!family || byFamily.has(family)) continue;
    byFamily.set(family, {
      family,
      fullName: font.fullName,
      postscriptName: font.postscriptName,
    });
  }

  return [...byFamily.values()].sort((a, b) =>
    a.family.localeCompare(b.family, undefined, { sensitivity: "base" }),
  );
}

export function formatUiFontFamily(fontFamily: string): string {
  if (fontFamily.includes(",")) return fontFamily;
  return `"${fontFamily}", sans-serif`;
}
