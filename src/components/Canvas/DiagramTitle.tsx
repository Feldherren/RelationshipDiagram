import { useMemo } from "react";
import { useDiagramStore } from "../../store/diagramStore";
import type { Diagram } from "../../models/types";
import { DIAGRAM_TITLE_FONT_SIZE } from "../../utils/diagramFont";
import {
  computeContentBounds,
  getDiagramTitlePosition,
} from "../../utils/geometry";
import { PillLabel } from "./PillLabel";

export function DiagramTitle() {
  const diagramTitle = useDiagramStore((s) => s.diagramTitle);
  const characters = useDiagramStore((s) => s.characters);
  const lines = useDiagramStore((s) => s.lines);
  const groups = useDiagramStore((s) => s.groups);
  const diagramFontFamily = useDiagramStore((s) => s.diagramFontFamily);

  const position = useMemo(() => {
    if (!diagramTitle.trim()) return null;

    const diagram: Diagram = {
      schemaVersion: 1,
      title: diagramTitle,
      fontFamily: diagramFontFamily,
      characters,
      lines,
      groups,
    };
    const contentBounds = computeContentBounds(diagram);
    return getDiagramTitlePosition(diagram, contentBounds);
  }, [diagramTitle, diagramFontFamily, characters, lines, groups]);

  if (!position || !diagramTitle.trim()) return null;

  return (
    <PillLabel
      text={diagramTitle.trim()}
      x={position.x}
      y={position.y}
      fontSize={DIAGRAM_TITLE_FONT_SIZE}
      fontStyle="bold"
      unselectedStroke="#c8c8c8"
    />
  );
}
