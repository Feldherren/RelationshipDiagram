import type { DiagramAppearance, LabelChrome, RGB } from "../models/types";
import {
  colorsEqual,
  DEFAULT_FLOATING_TEXT_COLOR,
  defaultRgb,
} from "../models/types";

export type { DiagramAppearance, LabelChrome };

const PILL_TEXT: RGB = { r: 31, g: 31, b: 31 };
const PILL_SUBTITLE_TEXT: RGB = { r: 92, g: 92, b: 92 };
const PILL_FILL: RGB = { r: 255, g: 255, b: 255 };
const PILL_BORDER: RGB = { r: 208, g: 208, b: 208 };

const DEFAULT_LINE_COLOR: RGB = { r: 60, g: 60, b: 60 };
const DEFAULT_BOX_BORDER: RGB = { r: 100, g: 140, b: 100 };

function cloneRgb(color: RGB): RGB {
  return { r: color.r, g: color.g, b: color.b };
}

function cloneChrome(chrome: LabelChrome): LabelChrome {
  return {
    textColor: cloneRgb(chrome.textColor),
    backgroundColor: cloneRgb(chrome.backgroundColor),
    borderColor: cloneRgb(chrome.borderColor),
  };
}

function defaultNameChrome(): LabelChrome {
  return {
    textColor: cloneRgb(PILL_TEXT),
    backgroundColor: cloneRgb(PILL_FILL),
    borderColor: cloneRgb(PILL_BORDER),
  };
}

function defaultSubtitleChrome(): LabelChrome {
  return {
    textColor: cloneRgb(PILL_SUBTITLE_TEXT),
    backgroundColor: cloneRgb(PILL_FILL),
    borderColor: cloneRgb(PILL_BORDER),
  };
}

export const DEFAULT_DIAGRAM_APPEARANCE: DiagramAppearance = {
  defaultLineColor: cloneRgb(DEFAULT_LINE_COLOR),
  defaultCharacterBorderColor: defaultRgb(),
  defaultBoxBorderColor: cloneRgb(DEFAULT_BOX_BORDER),
  defaultFloatingTextColor: cloneRgb(DEFAULT_FLOATING_TEXT_COLOR),
  characterNameLabel: defaultNameChrome(),
  characterSubtitleLabel: defaultSubtitleChrome(),
  lineLabel: defaultNameChrome(),
  boxNameLabel: defaultNameChrome(),
};

function isRgb(value: unknown): value is RGB {
  if (!value || typeof value !== "object") return false;
  const color = value as RGB;
  return (
    typeof color.r === "number" &&
    typeof color.g === "number" &&
    typeof color.b === "number" &&
    [color.r, color.g, color.b].every(
      (channel) => Number.isFinite(channel) && channel >= 0 && channel <= 255,
    )
  );
}

function resolveRgb(value: unknown, fallback: RGB): RGB {
  return isRgb(value) ? cloneRgb(value) : cloneRgb(fallback);
}

function resolveChrome(value: unknown, fallback: LabelChrome): LabelChrome {
  if (!value || typeof value !== "object") return cloneChrome(fallback);
  const partial = value as Partial<LabelChrome>;
  return {
    textColor: resolveRgb(partial.textColor, fallback.textColor),
    backgroundColor: resolveRgb(
      partial.backgroundColor,
      fallback.backgroundColor,
    ),
    borderColor: resolveRgb(partial.borderColor, fallback.borderColor),
  };
}

export function cloneDiagramAppearance(
  appearance: DiagramAppearance,
): DiagramAppearance {
  return {
    defaultLineColor: cloneRgb(appearance.defaultLineColor),
    defaultCharacterBorderColor: cloneRgb(
      appearance.defaultCharacterBorderColor,
    ),
    defaultBoxBorderColor: cloneRgb(appearance.defaultBoxBorderColor),
    defaultFloatingTextColor: cloneRgb(appearance.defaultFloatingTextColor),
    characterNameLabel: cloneChrome(appearance.characterNameLabel),
    characterSubtitleLabel: cloneChrome(appearance.characterSubtitleLabel),
    lineLabel: cloneChrome(appearance.lineLabel),
    boxNameLabel: cloneChrome(appearance.boxNameLabel),
  };
}

/** Merge partial / missing appearance with built-in defaults. */
export function resolveDiagramAppearance(
  value: unknown,
): DiagramAppearance {
  const defaults = DEFAULT_DIAGRAM_APPEARANCE;
  if (!value || typeof value !== "object") {
    return cloneDiagramAppearance(defaults);
  }
  const partial = value as Partial<DiagramAppearance>;
  return {
    defaultLineColor: resolveRgb(
      partial.defaultLineColor,
      defaults.defaultLineColor,
    ),
    defaultCharacterBorderColor: resolveRgb(
      partial.defaultCharacterBorderColor,
      defaults.defaultCharacterBorderColor,
    ),
    defaultBoxBorderColor: resolveRgb(
      partial.defaultBoxBorderColor,
      defaults.defaultBoxBorderColor,
    ),
    defaultFloatingTextColor: resolveRgb(
      partial.defaultFloatingTextColor,
      defaults.defaultFloatingTextColor,
    ),
    characterNameLabel: resolveChrome(
      partial.characterNameLabel,
      defaults.characterNameLabel,
    ),
    characterSubtitleLabel: resolveChrome(
      partial.characterSubtitleLabel,
      defaults.characterSubtitleLabel,
    ),
    lineLabel: resolveChrome(partial.lineLabel, defaults.lineLabel),
    boxNameLabel: resolveChrome(partial.boxNameLabel, defaults.boxNameLabel),
  };
}

function chromeEqual(a: LabelChrome, b: LabelChrome): boolean {
  return (
    colorsEqual(a.textColor, b.textColor) &&
    colorsEqual(a.backgroundColor, b.backgroundColor) &&
    colorsEqual(a.borderColor, b.borderColor)
  );
}

function serializeChrome(
  chrome: LabelChrome,
  defaults: LabelChrome,
): Partial<LabelChrome> | undefined {
  if (chromeEqual(chrome, defaults)) return undefined;
  const out: Partial<LabelChrome> = {};
  if (!colorsEqual(chrome.textColor, defaults.textColor)) {
    out.textColor = cloneRgb(chrome.textColor);
  }
  if (!colorsEqual(chrome.backgroundColor, defaults.backgroundColor)) {
    out.backgroundColor = cloneRgb(chrome.backgroundColor);
  }
  if (!colorsEqual(chrome.borderColor, defaults.borderColor)) {
    out.borderColor = cloneRgb(chrome.borderColor);
  }
  return out;
}

/**
 * Omit fields equal to built-ins. Returns undefined when everything matches defaults.
 */
export function serializeDiagramAppearance(
  appearance: DiagramAppearance,
): Partial<DiagramAppearance> | undefined {
  const defaults = DEFAULT_DIAGRAM_APPEARANCE;
  const out: Partial<DiagramAppearance> = {};

  if (!colorsEqual(appearance.defaultLineColor, defaults.defaultLineColor)) {
    out.defaultLineColor = cloneRgb(appearance.defaultLineColor);
  }
  if (
    !colorsEqual(
      appearance.defaultCharacterBorderColor,
      defaults.defaultCharacterBorderColor,
    )
  ) {
    out.defaultCharacterBorderColor = cloneRgb(
      appearance.defaultCharacterBorderColor,
    );
  }
  if (
    !colorsEqual(
      appearance.defaultBoxBorderColor,
      defaults.defaultBoxBorderColor,
    )
  ) {
    out.defaultBoxBorderColor = cloneRgb(appearance.defaultBoxBorderColor);
  }
  if (
    !colorsEqual(
      appearance.defaultFloatingTextColor,
      defaults.defaultFloatingTextColor,
    )
  ) {
    out.defaultFloatingTextColor = cloneRgb(
      appearance.defaultFloatingTextColor,
    );
  }

  const characterNameLabel = serializeChrome(
    appearance.characterNameLabel,
    defaults.characterNameLabel,
  );
  if (characterNameLabel) {
    out.characterNameLabel = characterNameLabel as LabelChrome;
  }

  const characterSubtitleLabel = serializeChrome(
    appearance.characterSubtitleLabel,
    defaults.characterSubtitleLabel,
  );
  if (characterSubtitleLabel) {
    out.characterSubtitleLabel = characterSubtitleLabel as LabelChrome;
  }

  const lineLabel = serializeChrome(appearance.lineLabel, defaults.lineLabel);
  if (lineLabel) out.lineLabel = lineLabel as LabelChrome;

  const boxNameLabel = serializeChrome(
    appearance.boxNameLabel,
    defaults.boxNameLabel,
  );
  if (boxNameLabel) out.boxNameLabel = boxNameLabel as LabelChrome;

  return Object.keys(out).length > 0 ? out : undefined;
}

function patchChrome(
  current: LabelChrome,
  patch: Partial<LabelChrome>,
): LabelChrome {
  return {
    textColor: patch.textColor
      ? cloneRgb(patch.textColor)
      : cloneRgb(current.textColor),
    backgroundColor: patch.backgroundColor
      ? cloneRgb(patch.backgroundColor)
      : cloneRgb(current.backgroundColor),
    borderColor: patch.borderColor
      ? cloneRgb(patch.borderColor)
      : cloneRgb(current.borderColor),
  };
}

export function patchDiagramAppearance(
  current: DiagramAppearance,
  patch: Partial<DiagramAppearance>,
): DiagramAppearance {
  const next = cloneDiagramAppearance(current);
  if (patch.defaultLineColor) {
    next.defaultLineColor = cloneRgb(patch.defaultLineColor);
  }
  if (patch.defaultCharacterBorderColor) {
    next.defaultCharacterBorderColor = cloneRgb(
      patch.defaultCharacterBorderColor,
    );
  }
  if (patch.defaultBoxBorderColor) {
    next.defaultBoxBorderColor = cloneRgb(patch.defaultBoxBorderColor);
  }
  if (patch.defaultFloatingTextColor) {
    next.defaultFloatingTextColor = cloneRgb(patch.defaultFloatingTextColor);
  }
  if (patch.characterNameLabel) {
    next.characterNameLabel = patchChrome(
      next.characterNameLabel,
      patch.characterNameLabel,
    );
  }
  if (patch.characterSubtitleLabel) {
    next.characterSubtitleLabel = patchChrome(
      next.characterSubtitleLabel,
      patch.characterSubtitleLabel,
    );
  }
  if (patch.lineLabel) {
    next.lineLabel = patchChrome(next.lineLabel, patch.lineLabel);
  }
  if (patch.boxNameLabel) {
    next.boxNameLabel = patchChrome(next.boxNameLabel, patch.boxNameLabel);
  }
  return next;
}

/** Named diagram appearance theme (prefs / import-export JSON). */
export interface DiagramThemeDocument {
  id: string;
  name: string;
  schemaVersion: 1;
  appearance: DiagramAppearance;
}

/** Built-in default, or a custom theme id. */
export type DiagramThemePreference = "default" | string;

export function validateDiagramThemeDocument(
  raw: unknown,
): DiagramThemeDocument | null {
  if (typeof raw !== "object" || raw === null) return null;
  const record = raw as Record<string, unknown>;
  if (record.schemaVersion !== 1) return null;
  if (typeof record.id !== "string" || !record.id.trim()) return null;
  if (typeof record.name !== "string" || !record.name.trim()) return null;
  if (typeof record.appearance !== "object" || record.appearance === null) {
    return null;
  }
  return {
    id: record.id.trim(),
    name: record.name.trim(),
    schemaVersion: 1,
    appearance: resolveDiagramAppearance(record.appearance),
  };
}

export function diagramThemeDocumentToJson(
  theme: DiagramThemeDocument,
): string {
  return JSON.stringify(
    {
      id: theme.id,
      name: theme.name,
      schemaVersion: 1,
      appearance: cloneDiagramAppearance(theme.appearance),
    },
    null,
    2,
  );
}

export function createDiagramThemeDocument(
  id: string,
  name: string,
  appearance: DiagramAppearance,
): DiagramThemeDocument {
  return {
    id,
    name,
    schemaVersion: 1,
    appearance: cloneDiagramAppearance(appearance),
  };
}

export function resolveDiagramThemeAppearance(
  preference: DiagramThemePreference,
  customThemes: readonly DiagramThemeDocument[],
): DiagramAppearance {
  if (preference === "default") {
    return cloneDiagramAppearance(DEFAULT_DIAGRAM_APPEARANCE);
  }
  const custom = customThemes.find((theme) => theme.id === preference);
  if (custom) return cloneDiagramAppearance(custom.appearance);
  return cloneDiagramAppearance(DEFAULT_DIAGRAM_APPEARANCE);
}

function slugifyDiagramThemeId(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "diagram-theme";
}

export function uniqueDiagramThemeId(
  name: string,
  existing: readonly { id: string }[],
): string {
  const base = slugifyDiagramThemeId(name);
  const used = new Set(existing.map((theme) => theme.id));
  if (!used.has(base) && base !== "default") return base;
  let n = 2;
  while (used.has(`${base}-${n}`) || `${base}-${n}` === "default") n += 1;
  return `${base}-${n}`;
}

