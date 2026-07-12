import type { Bounds, Diagram } from "../models/types";
import { DEFAULT_DIAGRAM_FONT } from "./diagramFont";
import {
  expandBounds,
  getCharacterBounds,
  getCollapsedGroupBounds,
  getGroupMemberBounds,
  mergeBounds,
} from "./geometry";
import { getLineBounds } from "./lineRouting";

export function computeContentBounds(
  diagram: Diagram,
  viewportScale = 1,
): Bounds | null {
  const fontFamily = diagram.fontFamily ?? DEFAULT_DIAGRAM_FONT;
  let result: Bounds | null = null;

  for (const character of diagram.characters) {
    const inCollapsedGroup = diagram.groups.some(
      (g) => g.collapsed && g.memberCharacterIds.includes(character.id),
    );
    if (inCollapsedGroup) continue;
    const bounds = getCharacterBounds(character, fontFamily, viewportScale);
    result = result ? mergeBounds(result, bounds) : bounds;
  }

  for (const group of diagram.groups) {
    if (group.collapsed) {
      const bounds = getCollapsedGroupBounds(group, fontFamily);
      result = result ? mergeBounds(result, bounds) : bounds;
    } else {
      const bounds = getGroupMemberBounds(
        group,
        diagram.characters,
        fontFamily,
        viewportScale,
      );
      if (bounds) result = result ? mergeBounds(result, bounds) : bounds;
    }
  }

  for (const line of diagram.lines) {
    const bounds = getLineBounds(line, diagram, fontFamily);
    if (bounds) result = result ? mergeBounds(result, bounds) : bounds;
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
