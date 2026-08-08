import type { Bounds, Diagram } from "../models/types";
import { DEFAULT_DIAGRAM_FONT } from "./diagramFont";
import {
  expandBounds,
  getCharacterBounds,
  getCollapsedBoxBounds,
  getFloatingTextBounds,
  isCharacterContainedInBox,
  isFloatingTextContainedInBox,
  resolveBoxBounds,
  mergeBounds,
} from "./geometry";
import { getLineBounds } from "./lineRouting";
import { shouldRenderLine } from "./lineEndpoints";
import { isLayerVisible } from "./layers";
import { labelFontSizesFromAppearance } from "./labelMetrics";

function isEntityLayerVisible(diagram: Diagram, layerId: string): boolean {
  return isLayerVisible(diagram.layers ?? [], layerId);
}

export function collectContentObstacles(
  diagram: Diagram,
  viewportScale = 1,
): Bounds[] {
  const fontFamily = diagram.fontFamily ?? DEFAULT_DIAGRAM_FONT;
  const labelFonts = labelFontSizesFromAppearance(diagram.appearance);
  const obstacles: Bounds[] = [];

  for (const character of diagram.characters) {
    if (!isEntityLayerVisible(diagram, character.layerId)) continue;
    const inCollapsedBox = diagram.boxes.some(
      (b) =>
        b.collapsed && isCharacterContainedInBox(character, b, fontFamily),
    );
    if (inCollapsedBox) continue;
    obstacles.push(
      getCharacterBounds(character, fontFamily, viewportScale, {
        nameFontSize: labelFonts.characterName,
        subtitleFontSize: labelFonts.characterSubtitle,
      }),
    );
  }

  for (const box of diagram.boxes) {
    if (!isEntityLayerVisible(diagram, box.layerId)) continue;
    if (box.collapsed) {
      obstacles.push(
        getCollapsedBoxBounds(box, fontFamily, labelFonts.boxName),
      );
    } else {
      const bounds = resolveBoxBounds(box);
      if (bounds) obstacles.push(bounds);
    }
  }

  for (const line of diagram.lines) {
    if (!isEntityLayerVisible(diagram, line.layerId)) continue;
    if (!shouldRenderLine(line, diagram)) continue;
    const bounds = getLineBounds(
      line,
      diagram,
      fontFamily,
      labelFonts.line,
    );
    if (bounds) obstacles.push(bounds);
  }

  for (const floatingText of diagram.floatingTexts ?? []) {
    if (!isEntityLayerVisible(diagram, floatingText.layerId)) continue;
    const inCollapsedBox = diagram.boxes.some(
      (b) =>
        b.collapsed &&
        isFloatingTextContainedInBox(floatingText, b, fontFamily),
    );
    if (inCollapsedBox) continue;
    obstacles.push(getFloatingTextBounds(floatingText, fontFamily));
  }

  return obstacles;
}

export function computeContentBounds(
  diagram: Diagram,
  viewportScale = 1,
): Bounds | null {
  const fontFamily = diagram.fontFamily ?? DEFAULT_DIAGRAM_FONT;
  const labelFonts = labelFontSizesFromAppearance(diagram.appearance);
  let result: Bounds | null = null;

  for (const character of diagram.characters) {
    if (!isEntityLayerVisible(diagram, character.layerId)) continue;
    const inCollapsedBox = diagram.boxes.some(
      (b) =>
        b.collapsed && isCharacterContainedInBox(character, b, fontFamily),
    );
    if (inCollapsedBox) continue;
    const bounds = getCharacterBounds(character, fontFamily, viewportScale, {
      nameFontSize: labelFonts.characterName,
      subtitleFontSize: labelFonts.characterSubtitle,
    });
    result = result ? mergeBounds(result, bounds) : bounds;
  }

  for (const box of diagram.boxes) {
    if (!isEntityLayerVisible(diagram, box.layerId)) continue;
    if (box.collapsed) {
      const bounds = getCollapsedBoxBounds(
        box,
        fontFamily,
        labelFonts.boxName,
      );
      result = result ? mergeBounds(result, bounds) : bounds;
    } else {
      const bounds = resolveBoxBounds(box);
      if (bounds) result = result ? mergeBounds(result, bounds) : bounds;
    }
  }

  for (const line of diagram.lines) {
    if (!isEntityLayerVisible(diagram, line.layerId)) continue;
    if (!shouldRenderLine(line, diagram)) continue;
    const bounds = getLineBounds(
      line,
      diagram,
      fontFamily,
      labelFonts.line,
    );
    if (bounds) result = result ? mergeBounds(result, bounds) : bounds;
  }

  for (const floatingText of diagram.floatingTexts ?? []) {
    if (!isEntityLayerVisible(diagram, floatingText.layerId)) continue;
    const inCollapsedBox = diagram.boxes.some(
      (b) =>
        b.collapsed &&
        isFloatingTextContainedInBox(floatingText, b, fontFamily),
    );
    if (inCollapsedBox) continue;
    const bounds = getFloatingTextBounds(floatingText, fontFamily);
    result = result ? mergeBounds(result, bounds) : bounds;
  }

  return result;
}

export function computeDiagramBounds(
  diagram: Diagram,
  padding = 32,
  viewportScale = 1,
): Bounds | null {
  const content = computeContentBounds(diagram, viewportScale);
  if (!content) return null;
  return expandBounds(content, padding);
}
