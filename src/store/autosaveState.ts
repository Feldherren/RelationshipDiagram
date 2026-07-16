import type {
  Diagram,
  DiagramAppearance,
  FloatingText,
  GridStyle,
  RGB,
} from "../models/types";

export interface PersistedDiagramState {
  characters: Diagram["characters"];
  lines: Diagram["lines"];
  groups: Diagram["groups"];
  boxes: Diagram["boxes"];
  floatingTexts: FloatingText[];
  viewport: Diagram["viewport"];
  diagramTitle: string;
  diagramSubtitle: string;
  showDiagramHeader: boolean;
  diagramFontFamily: string;
  diagramBackgroundColor: RGB | null;
  diagramAppearance: DiagramAppearance;
  showGrid: boolean;
  gridStyle: GridStyle;
}

export function pickPersistedState(
  state: PersistedDiagramState,
): PersistedDiagramState {
  return {
    characters: state.characters,
    lines: state.lines,
    groups: state.groups,
    boxes: state.boxes,
    floatingTexts: state.floatingTexts,
    viewport: state.viewport,
    diagramTitle: state.diagramTitle,
    diagramSubtitle: state.diagramSubtitle,
    showDiagramHeader: state.showDiagramHeader,
    diagramFontFamily: state.diagramFontFamily,
    diagramBackgroundColor: state.diagramBackgroundColor,
    diagramAppearance: state.diagramAppearance,
    showGrid: state.showGrid,
    gridStyle: state.gridStyle,
  };
}

/** Cheap equality for store subscribers — avoids JSON.stringify of image payloads on every pan tick. */
export function persistedStatesEqual(
  a: PersistedDiagramState,
  b: PersistedDiagramState,
): boolean {
  const av = a.viewport;
  const bv = b.viewport;
  return (
    a.characters === b.characters &&
    a.lines === b.lines &&
    a.groups === b.groups &&
    a.boxes === b.boxes &&
    a.floatingTexts === b.floatingTexts &&
    a.diagramTitle === b.diagramTitle &&
    a.diagramSubtitle === b.diagramSubtitle &&
    a.showDiagramHeader === b.showDiagramHeader &&
    a.diagramFontFamily === b.diagramFontFamily &&
    a.showGrid === b.showGrid &&
    a.gridStyle === b.gridStyle &&
    a.diagramBackgroundColor === b.diagramBackgroundColor &&
    a.diagramAppearance === b.diagramAppearance &&
    av?.x === bv?.x &&
    av?.y === bv?.y &&
    av?.scale === bv?.scale
  );
}

export function hasPersistedStateChanged(
  state: PersistedDiagramState,
  prevState: PersistedDiagramState,
): boolean {
  return !persistedStatesEqual(
    pickPersistedState(state),
    pickPersistedState(prevState),
  );
}

export const EMPTY_DIAGRAM: Diagram = {
  schemaVersion: 2,
  characters: [],
  lines: [],
  groups: [],
  boxes: [],
  floatingTexts: [],
  viewport: { x: 0, y: 0, scale: 1 },
};
