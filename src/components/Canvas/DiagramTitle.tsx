import { useDiagramStore } from "../../store/diagramStore";
import {
  DIAGRAM_SUBTITLE_FONT_SIZE,
  DIAGRAM_TITLE_FONT_SIZE,
} from "../../utils/diagramFont";
import { formatUiFontFamily } from "../../utils/systemFonts";

export function DiagramTitle() {
  const diagramTitle = useDiagramStore((s) => s.diagramTitle);
  const diagramSubtitle = useDiagramStore((s) => s.diagramSubtitle);
  const showDiagramHeader = useDiagramStore((s) => s.showDiagramHeader);
  const diagramFontFamily = useDiagramStore((s) => s.diagramFontFamily);

  const title = diagramTitle.trim();
  const subtitle = diagramSubtitle.trim();

  if (!showDiagramHeader || (!title && !subtitle)) return null;

  const fontFamily = formatUiFontFamily(diagramFontFamily);

  return (
    <div className="diagram-title-bar">
      {title && (
        <span
          className="diagram-title-pill"
          style={{
            fontFamily,
            fontSize: DIAGRAM_TITLE_FONT_SIZE,
          }}
        >
          {title}
        </span>
      )}
      {subtitle && (
        <span
          className="diagram-subtitle-pill"
          style={{
            fontFamily,
            fontSize: DIAGRAM_SUBTITLE_FONT_SIZE,
          }}
        >
          {subtitle}
        </span>
      )}
    </div>
  );
}
