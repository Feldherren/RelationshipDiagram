import type {
  Box,
  Character,
  DiagramAppearance,
  FloatingText,
  Line,
  RGB,
} from "../models/types";
import { colorsEqual } from "../models/types";

export interface DiagramElementColors {
  characters: Character[];
  lines: Line[];
  boxes: Box[];
  floatingTexts: FloatingText[];
}

function cloneRgb(color: RGB): RGB {
  return { r: color.r, g: color.g, b: color.b };
}

/** Count diagram elements whose colours still match the current appearance defaults. */
export function countRemappableElements(
  diagram: DiagramElementColors,
  fromAppearance: DiagramAppearance,
): number {
  let count = 0;
  for (const character of diagram.characters) {
    if (
      colorsEqual(
        character.borderColor,
        fromAppearance.defaultCharacterBorderColor,
      )
    ) {
      count += 1;
    }
  }
  for (const line of diagram.lines) {
    if (colorsEqual(line.color, fromAppearance.defaultLineColor)) {
      count += 1;
    }
  }
  for (const box of diagram.boxes) {
    if (colorsEqual(box.borderColor, fromAppearance.defaultBoxBorderColor)) {
      count += 1;
    }
  }
  for (const floatingText of diagram.floatingTexts) {
    if (
      colorsEqual(floatingText.color, fromAppearance.defaultFloatingTextColor)
    ) {
      count += 1;
    }
  }
  return count;
}

/** Remap element colours that still match the previous appearance defaults. */
export function remapDiagramElementColors(
  diagram: DiagramElementColors,
  fromAppearance: DiagramAppearance,
  toAppearance: DiagramAppearance,
): DiagramElementColors {
  return {
    characters: diagram.characters.map((character) =>
      colorsEqual(
        character.borderColor,
        fromAppearance.defaultCharacterBorderColor,
      )
        ? {
            ...character,
            borderColor: cloneRgb(toAppearance.defaultCharacterBorderColor),
          }
        : character,
    ),
    lines: diagram.lines.map((line) =>
      colorsEqual(line.color, fromAppearance.defaultLineColor)
        ? { ...line, color: cloneRgb(toAppearance.defaultLineColor) }
        : line,
    ),
    boxes: diagram.boxes.map((box) =>
      colorsEqual(box.borderColor, fromAppearance.defaultBoxBorderColor)
        ? { ...box, borderColor: cloneRgb(toAppearance.defaultBoxBorderColor) }
        : box,
    ),
    floatingTexts: diagram.floatingTexts.map((floatingText) =>
      colorsEqual(floatingText.color, fromAppearance.defaultFloatingTextColor)
        ? {
            ...floatingText,
            color: cloneRgb(toAppearance.defaultFloatingTextColor),
          }
        : floatingText,
    ),
  };
}
