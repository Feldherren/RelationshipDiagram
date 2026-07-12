import { useDiagramStore } from "../../store/diagramStore";
import { DIAGRAM_TITLE_FONT_SIZE } from "../../utils/diagramFont";
import { formatUiFontFamily } from "../../utils/systemFonts";

export function DiagramTitle() {
  const diagramTitle = useDiagramStore((s) => s.diagramTitle);
  const diagramFontFamily = useDiagramStore((s) => s.diagramFontFamily);

  if (!diagramTitle.trim()) return null;

  return (
    <div className="diagram-title-bar">
      <span
        className="diagram-title-pill"
        style={{
          fontFamily: formatUiFontFamily(diagramFontFamily),
          fontSize: DIAGRAM_TITLE_FONT_SIZE,
        }}
      >
        {diagramTitle.trim()}
      </span>
    </div>
  );
}
