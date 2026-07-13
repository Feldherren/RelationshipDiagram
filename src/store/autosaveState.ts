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

export function hasPersistedStateChanged(
  state: PersistedDiagramState,
  prevState: PersistedDiagramState,
): boolean {
  return (
    JSON.stringify(pickPersistedState(state)) !==
    JSON.stringify(pickPersistedState(prevState))
  );
}

export const EMPTY_DIAGRAM: Diagram = {
  schemaVersion: 1,
  characters: [],
  lines: [],
  groups: [],
  viewport: { x: 0, y: 0, scale: 1 },
};
