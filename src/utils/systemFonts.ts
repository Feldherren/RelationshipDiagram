export interface SystemFontOption {
  family: string;
  fullName: string;
  postscriptName: string;
}

export const FONT_PREVIEW_TEXT = "Aa Bb Character Names 123";

let cachedLocalFonts: FontData[] | null = null;

export function isSystemFontAccessSupported(): boolean {
  return typeof window.queryLocalFonts === "function";
}

function normalizeFamilyName(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "");
}

export function findMatchingLocalFont(
  fonts: FontData[],
  family: string,
): FontData | undefined {
  const exact = fonts.find((font) => font.family === family);
  if (exact) return exact;

  const lower = family.toLowerCase();
  const caseInsensitive = fonts.find(
    (font) => font.family.toLowerCase() === lower,
  );
  if (caseInsensitive) return caseInsensitive;

  const normalized = normalizeFamilyName(family);
  return fonts.find(
    (font) => normalizeFamilyName(font.family) === normalized,
  );
}

export async function getCachedLocalFonts(): Promise<FontData[]> {
  if (!window.queryLocalFonts) return [];
  if (!cachedLocalFonts) {
    cachedLocalFonts = await window.queryLocalFonts();
  }
  return cachedLocalFonts;
}

export function clearLocalFontCache(): void {
  cachedLocalFonts = null;
}

export async function queryInstalledFontFamilies(): Promise<SystemFontOption[]> {
  const fonts = await getCachedLocalFonts();
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

export function isDeprecatedFontFamily(fontFamily: string): boolean {
  return fontFamily.startsWith("font-probe-");
}
