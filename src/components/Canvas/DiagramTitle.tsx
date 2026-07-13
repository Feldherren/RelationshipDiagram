import { useDiagramStore } from "../../store/diagramStore";
import {
  getDiagramHeaderPillClassName,
  getDiagramHeaderPillFontSize,
} from "../../utils/diagramHeaderPill";
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
          className={getDiagramHeaderPillClassName("title")}
          style={{
            fontFamily,
            fontSize: getDiagramHeaderPillFontSize("title"),
          }}
        >
          {title}
        </span>
      )}
      {subtitle && (
        <span
          className={getDiagramHeaderPillClassName("subtitle")}
          style={{
            fontFamily,
            fontSize: getDiagramHeaderPillFontSize("subtitle"),
          }}
        >
          {subtitle}
        </span>
      )}
    </div>
  );
}
