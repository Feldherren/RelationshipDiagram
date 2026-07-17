import {
  isLightColor,
  parseHexColor,
  type RGB,
} from "../models/types";

export interface SymbolSwatchStyle {
  background: string;
  foreground: string;
}

/** Dark glyph on white — used when the UI surface is light. */
export const SYMBOL_SWATCH_ON_LIGHT: SymbolSwatchStyle = {
  background: "#ffffff",
  foreground: "#2f3a45",
};

/** Light glyph on dark — used when the UI surface is dark. */
export const SYMBOL_SWATCH_ON_DARK: SymbolSwatchStyle = {
  background: "#242830",
  foreground: "#eceff4",
};

function parseCssColor(value: string): RGB | null {
  const trimmed = value.trim();
  const hex = parseHexColor(trimmed);
  if (hex) return hex;

  const rgbMatch = trimmed.match(
    /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i,
  );
  if (!rgbMatch) return null;
  return {
    r: Number(rgbMatch[1]),
    g: Number(rgbMatch[2]),
    b: Number(rgbMatch[3]),
  };
}

export function readUiSurfaceColor(
  root: HTMLElement = document.documentElement,
): string {
  return (
    getComputedStyle(root).getPropertyValue("--ui-surface").trim() || "#ffffff"
  );
}

/** Pick light or dark swatch styling from the current UI surface luminance. */
export function resolveSymbolSwatchStyle(
  surfaceCss: string = readUiSurfaceColor(),
): SymbolSwatchStyle {
  const surface = parseCssColor(surfaceCss) ?? { r: 255, g: 255, b: 255 };
  return isLightColor(surface) ? SYMBOL_SWATCH_ON_LIGHT : SYMBOL_SWATCH_ON_DARK;
}

export function subscribeUiChrome(onStoreChange: () => void): () => void {
  const root = document.documentElement;
  const observer = new MutationObserver(onStoreChange);
  observer.observe(root, {
    attributes: true,
    attributeFilter: ["style", "data-ui-theme"],
  });
  return () => observer.disconnect();
}
