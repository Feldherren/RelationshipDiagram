import {
  listStoredFontFamilies,
  removeFontFromStorage,
} from "./fontStorage";
import {
  findMatchingLocalFont,
  getCachedLocalFonts,
} from "./systemFonts";

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

export async function registerSessionFont(
  family: string,
  data: ArrayBuffer,
): Promise<string> {
  const fontFace = new FontFace(family, data);
  await fontFace.load();
  document.fonts.add(fontFace);
  registeredFamilies.add(family);
  return family;
}

async function activateSystemFont(family: string): Promise<string | null> {
  const fonts = await getCachedLocalFonts();
  const fontData = findMatchingLocalFont(fonts, family);
  if (!fontData) return null;

  const data = await (await fontData.blob()).arrayBuffer();
  await registerSessionFont(fontData.family, data);
  return fontData.family;
}

export async function ensureFontLoaded(
  fontFamily: string,
): Promise<string | null> {
  if (isDefaultDiagramFont(fontFamily)) return DEFAULT_DIAGRAM_FONT;

  const activatedFamily = await activateSystemFont(fontFamily);
  const resolvedFamily = activatedFamily ?? fontFamily;
  const formatted = formatFontForCanvas(resolvedFamily);

  try {
    await document.fonts.load(`16px ${formatted}`);
    await document.fonts.ready;
  } catch {
    // Continue to availability check.
  }

  if (document.fonts.check(`16px ${formatted}`)) {
    return resolvedFamily;
  }

  return activatedFamily;
}

export async function cleanupDeprecatedFonts(): Promise<void> {
  const families = await listStoredFontFamilies();
  await Promise.all(
    families
      .filter((family) => family.startsWith("font-probe-"))
      .map((family) => removeFontFromStorage(family)),
  );
}

export function getRegisteredFontFamilies(): string[] {
  return [...registeredFamilies];
}
