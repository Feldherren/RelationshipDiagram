import type {
  Bounds,
  Box,
  Character,
  FloatingText,
  MultiSelectableItem,
  Selection,
} from "../models/types";
import { DEFAULT_DIAGRAM_FONT } from "./diagramFont";
import {
  boundsIntersect,
  getCharacterBounds,
  getCollapsedBoxBounds,
  getFloatingTextBounds,
  resolveBoxBounds,
} from "./geometry";
import {
  getCollapsedBoxForCharacter,
  getCollapsedBoxForFloatingText,
} from "./lineEndpoints";

export function isItemSelected(
  selection: Selection,
  type: MultiSelectableItem["type"],
  id: string,
): boolean {
  if (!selection) return false;
  if (selection.type === "multi") {
    return selection.items.some((item) => item.type === type && item.id === id);
  }
  return selection.type === type && selection.id === id;
}

export function isIdInMultiSelection(
  selection: Selection,
  type: MultiSelectableItem["type"],
  id: string,
): boolean {
  return (
    selection?.type === "multi" &&
    selection.items.some((item) => item.type === type && item.id === id)
  );
}

/** Drop a deleted entity from selection; promote 1-item multi to single. */
export function selectionAfterRemovingItem(
  selection: Selection,
  type: MultiSelectableItem["type"],
  id: string,
): Selection {
  if (!selection) return null;
  if (selection.type === type && "id" in selection && selection.id === id) {
    return null;
  }
  if (selection.type !== "multi") return selection;

  const items = selection.items.filter(
    (item) => !(item.type === type && item.id === id),
  );
  if (items.length === 0) return null;
  if (items.length === 1) return items[0];
  return { type: "multi", items };
}

export function hitTestMarqueeSelection(
  marquee: Bounds,
  args: {
    characters: Character[];
    boxes: Box[];
    floatingTexts: FloatingText[];
    fontFamily?: string;
  },
): MultiSelectableItem[] {
  const fontFamily = args.fontFamily ?? DEFAULT_DIAGRAM_FONT;
  const items: MultiSelectableItem[] = [];

  for (const box of args.boxes) {
    const bounds = box.collapsed
      ? getCollapsedBoxBounds(box, fontFamily)
      : resolveBoxBounds(box);
    if (bounds && boundsIntersect(marquee, bounds)) {
      items.push({ type: "box", id: box.id });
    }
  }

  for (const character of args.characters) {
    if (
      getCollapsedBoxForCharacter(
        character.id,
        args.boxes,
        args.characters,
        fontFamily,
      ) != null
    ) {
      continue;
    }
    const bounds = getCharacterBounds(character, fontFamily, 1, {
      includeConnectHandle: false,
    });
    if (boundsIntersect(marquee, bounds)) {
      items.push({ type: "character", id: character.id });
    }
  }

  for (const floatingText of args.floatingTexts) {
    if (
      getCollapsedBoxForFloatingText(
        floatingText.id,
        args.boxes,
        args.floatingTexts,
        fontFamily,
      ) != null
    ) {
      continue;
    }
    const bounds = getFloatingTextBounds(floatingText, fontFamily);
    if (boundsIntersect(marquee, bounds)) {
      items.push({ type: "floatingText", id: floatingText.id });
    }
  }

  return items;
}

export function selectionFromMarqueeHits(
  items: MultiSelectableItem[],
): Selection {
  if (items.length === 0) return null;
  if (items.length === 1) return items[0];
  return { type: "multi", items };
}
