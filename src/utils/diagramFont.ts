import {
  listStoredFontFamilies,
  loadFontFromStorage,
  saveFontToStorage,
} from "./fontStorage";

export const DEFAULT_DIAGRAM_FONT = "Arial, sans-serif";
export const DIAGRAM_TITLE_FONT_SIZE = 20;
export const DIAGRAM_TITLE_MARGIN = 24;

const registeredFamilies = new Set<string>();

export function isDefaultDiagramFont(fontFamily: string): boolean {
  return fontFamily === DEFAULT_DIAGRAM_FONT;
}

export function formatFontForCanvas(fontFamily: string): string {
  if (fontFamily.includes(",")) return fontFamily;
  return `"${fontFamily}", sans-serif`;
}

export function isFontAvailable(fontFamily: string): boolean {
  if (isDefaultDiagramFont(fontFamily)) return true;
  const formatted = formatFontForCanvas(fontFamily);
  return document.fonts.check(`16px ${formatted}`);
}

export async function registerFontData(
  family: string,
  data: ArrayBuffer,
  persist = true,
): Promise<string> {
  const fontFace = new FontFace(family, data);
  await fontFace.load();
  document.fonts.add(fontFace);
  registeredFamilies.add(family);
  if (persist) {
    await saveFontToStorage(family, data);
  }
  return family;
}

export async function loadFontFromFile(file: File): Promise<string> {
  const data = await file.arrayBuffer();
  const probe = new FontFace(`font-probe-${crypto.randomUUID()}`, data);
  await probe.load();
  const family =
    probe.family.trim() ||
    file.name.replace(/\.[^.]+$/i, "").trim() ||
    "Custom Font";
  return registerFontData(family, data);
}

export async function ensureFontLoaded(fontFamily: string): Promise<boolean> {
  if (isDefaultDiagramFont(fontFamily)) return true;

  const formatted = formatFontForCanvas(fontFamily);
  try {
    await document.fonts.load(`16px ${formatted}`);
  } catch {
    // Fall through to cached font lookup.
  }
  if (document.fonts.check(`16px ${formatted}`)) return true;

  const data = await loadFontFromStorage(fontFamily);
  if (!data) return false;

  await registerFontData(fontFamily, data, false);
  return document.fonts.check(`16px ${formatted}`);
}

export async function restoreCachedFonts(): Promise<string[]> {
  const families = await listStoredFontFamilies();
  const loaded: string[] = [];

  for (const family of families) {
    try {
      const ok = await ensureFontLoaded(family);
      if (ok) loaded.push(family);
    } catch {
      // Skip fonts that fail to load.
    }
  }

  return loaded;
}

export function getRegisteredFontFamilies(): string[] {
  return [...registeredFamilies];
}
