import type { Diagram, RGB } from "../models/types";

export interface PersistedDiagramState {
  characters: Diagram["characters"];
  lines: Diagram["lines"];
  groups: Diagram["groups"];
  viewport: Diagram["viewport"];
  diagramTitle: string;
  diagramSubtitle: string;
  showDiagramHeader: boolean;
  diagramFontFamily: string;
  diagramBackgroundColor: RGB | null;
  showGrid: boolean;
}

export function pickPersistedState(
  state: PersistedDiagramState,
): PersistedDiagramState {
  return {
    characters: state.characters,
    lines: state.lines,
    groups: state.groups,
    viewport: state.viewport,
    diagramTitle: state.diagramTitle,
    diagramSubtitle: state.diagramSubtitle,
    showDiagramHeader: state.showDiagramHeader,
    diagramFontFamily: state.diagramFontFamily,
    diagramBackgroundColor: state.diagramBackgroundColor,
    showGrid: state.showGrid,
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
    a.diagramTitle === b.diagramTitle &&
    a.diagramSubtitle === b.diagramSubtitle &&
    a.showDiagramHeader === b.showDiagramHeader &&
    a.diagramFontFamily === b.diagramFontFamily &&
    a.showGrid === b.showGrid &&
    a.diagramBackgroundColor === b.diagramBackgroundColor &&
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
  schemaVersion: 1,
  characters: [],
  lines: [],
  groups: [],
  viewport: { x: 0, y: 0, scale: 1 },
};
