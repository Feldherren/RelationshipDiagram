import type {
  Box,
  Character,
  Diagram,
  FloatingText,
  Line,
  NodeRef,
} from "../models/types";
import {
  getCharacterById,
  isCharacterContainedInBox,
  isFloatingTextContainedInBox,
} from "./geometry";
import { DEFAULT_DIAGRAM_FONT } from "./diagramFont";

export interface ResolvedLineEndpoint {
  logical: NodeRef;
  anchorKind: "character" | "box";
  anchorId: string;
  hiddenCharacterId?: string;
  hiddenCharacterName?: string;
}

export function getCollapsedBoxForCharacter(
  characterId: string,
  boxes: Box[],
  characters: Character[],
  fontFamily: string = DEFAULT_DIAGRAM_FONT,
): Box | undefined {
  const character = characters.find((c) => c.id === characterId);
  if (!character) return undefined;
  return boxes.find(
    (b) =>
      b.collapsed && isCharacterContainedInBox(character, b, fontFamily),
  );
}

export function getCollapsedBoxForFloatingText(
  floatingTextId: string,
  boxes: Box[],
  floatingTexts: FloatingText[],
  fontFamily: string = DEFAULT_DIAGRAM_FONT,
): Box | undefined {
  const floatingText = floatingTexts.find((t) => t.id === floatingTextId);
  if (!floatingText) return undefined;
  return boxes.find(
    (b) =>
      b.collapsed &&
      isFloatingTextContainedInBox(floatingText, b, fontFamily),
  );
}

export function resolveLineEndpoint(
  ref: NodeRef,
  diagram: Pick<Diagram, "characters" | "boxes" | "fontFamily">,
): ResolvedLineEndpoint {
  if (ref.kind === "box") {
    return { logical: ref, anchorKind: "box", anchorId: ref.id };
  }

  const fontFamily = diagram.fontFamily ?? DEFAULT_DIAGRAM_FONT;
  const collapsedBox = getCollapsedBoxForCharacter(
    ref.id,
    diagram.boxes,
    diagram.characters,
    fontFamily,
  );
  if (collapsedBox) {
    const character = getCharacterById(diagram, ref.id);
    return {
      logical: ref,
      anchorKind: "box",
      anchorId: collapsedBox.id,
      hiddenCharacterId: ref.id,
      hiddenCharacterName: character?.name,
    };
  }

  return { logical: ref, anchorKind: "character", anchorId: ref.id };
}

export function isLineFullyInsideCollapsedBox(
  line: Line,
  boxes: Box[],
  characters: Character[],
  fontFamily: string = DEFAULT_DIAGRAM_FONT,
): boolean {
  if (line.from.kind !== "character" || line.to.kind !== "character") {
    return false;
  }
  const fromBox = getCollapsedBoxForCharacter(
    line.from.id,
    boxes,
    characters,
    fontFamily,
  );
  const toBox = getCollapsedBoxForCharacter(
    line.to.id,
    boxes,
    characters,
    fontFamily,
  );
  return fromBox != null && toBox?.id === fromBox.id;
}

export function shouldRenderLine(
  line: Line,
  diagram: Pick<Diagram, "characters" | "boxes" | "fontFamily">,
): boolean {
  const fontFamily = diagram.fontFamily ?? DEFAULT_DIAGRAM_FONT;
  if (
    isLineFullyInsideCollapsedBox(
      line,
      diagram.boxes,
      diagram.characters,
      fontFamily,
    )
  ) {
    return false;
  }

  const from = resolveLineEndpoint(line.from, diagram);
  const to = resolveLineEndpoint(line.to, diagram);
  if (
    from.anchorKind === "box" &&
    to.anchorKind === "box" &&
    from.anchorId === to.anchorId &&
    !(line.from.kind === line.to.kind && line.from.id === line.to.id)
  ) {
    return false;
  }

  return true;
}

export function getLineDisplayLabel(
  line: Line,
  diagram: Pick<Diagram, "characters" | "boxes">,
): string | null {
  const from = resolveLineEndpoint(line.from, diagram);
  const to = resolveLineEndpoint(line.to, diagram);
  const hiddenNames = new Set<string>();

  if (from.hiddenCharacterName?.trim()) {
    hiddenNames.add(from.hiddenCharacterName.trim());
  }
  if (to.hiddenCharacterName?.trim()) {
    hiddenNames.add(to.hiddenCharacterName.trim());
  }

  const parts: string[] = [];
  if (line.label?.trim()) {
    parts.push(line.label.trim());
  }
  if (hiddenNames.size > 0) {
    parts.push(`→ ${[...hiddenNames].join(", ")}`);
  }

  return parts.length > 0 ? parts.join(" ") : null;
}
