import { useDiagramStore } from "../../store/diagramStore";
import {
  getDiagramHeaderPillClassName,
  getDiagramHeaderPillFontSize,
} from "../../utils/diagramHeaderPill";
import { rgbToCss } from "../../models/types";
import { formatUiFontFamily } from "../../utils/systemFonts";

export function DiagramTitle() {
  const diagramTitle = useDiagramStore((s) => s.diagramTitle);
  const diagramSubtitle = useDiagramStore((s) => s.diagramSubtitle);
  const showDiagramHeader = useDiagramStore((s) => s.showDiagramHeader);
  const diagramFontFamily = useDiagramStore((s) => s.diagramFontFamily);
  const titleLabel = useDiagramStore(
    (s) => s.diagramAppearance.diagramTitleLabel,
  );
  const subtitleLabel = useDiagramStore(
    (s) => s.diagramAppearance.diagramSubtitleLabel,
  );

  const title = diagramTitle.trim();
  const subtitle = diagramSubtitle.trim();

  if (!showDiagramHeader || (!title && !subtitle)) return null;

  const fontFamily = formatUiFontFamily(diagramFontFamily);

  const pillStyle = (chrome: typeof titleLabel, variant: "title" | "subtitle") => ({
    fontFamily,
    fontSize: getDiagramHeaderPillFontSize(variant),
    color: rgbToCss(chrome.textColor),
    backgroundColor: rgbToCss(chrome.backgroundColor),
    borderColor: rgbToCss(chrome.borderColor),
  });

  return (
    <div className="diagram-title-bar">
      {title && (
        <span
          className={getDiagramHeaderPillClassName("title")}
          style={pillStyle(titleLabel, "title")}
        >
          {title}
        </span>
      )}
      {subtitle && (
        <span
          className={getDiagramHeaderPillClassName("subtitle")}
          style={pillStyle(subtitleLabel, "subtitle")}
        >
          {subtitle}
        </span>
      )}
    </div>
  );
}
