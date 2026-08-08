import { useTranslation } from "react-i18next";
import type { LabelChrome, RGB } from "../../models/types";
import { contrastingInk, rgbToCss } from "../../models/types";
import { rgbaWithAlpha } from "../../utils/geometry";
import { DEFAULT_DIAGRAM_FONT } from "../../utils/diagramFont";
import { formatUiFontFamily } from "../../utils/systemFonts";
import type { DiagramBackgroundColor } from "../../utils/diagramBackground";
import { useDiagramStore } from "../../store/diagramStore";

function previewSurfaceStyle(canvasBackground: DiagramBackgroundColor) {
  if (canvasBackground === null) {
    return undefined;
  }
  return { backgroundColor: rgbToCss(canvasBackground) };
}

function previewSurfaceClass(canvasBackground: DiagramBackgroundColor) {
  return canvasBackground === null
    ? "diagram-appearance-preview diagram-appearance-preview-transparent"
    : "diagram-appearance-preview";
}

function PreviewPill({
  text,
  chrome,
  fontFamily,
  fontSize,
  textColor,
}: {
  text: string;
  chrome: LabelChrome;
  fontFamily: string;
  fontSize?: number;
  /** Overrides chrome.textColor when set (e.g. line labels). */
  textColor?: RGB;
}) {
  const size = fontSize ?? chrome.fontSize;
  const paddingY = Math.max(2, Math.round(size * 0.25));
  const paddingX = Math.max(6, Math.round(size * 0.55));
  return (
    <span
      className="diagram-appearance-preview-pill"
      style={{
        color: rgbToCss(textColor ?? chrome.textColor),
        backgroundColor: rgbToCss(chrome.backgroundColor),
        borderColor: rgbToCss(chrome.borderColor),
        fontFamily: formatUiFontFamily(fontFamily),
        fontSize: `${size}px`,
        padding: `${paddingY}px ${paddingX}px`,
      }}
    >
      {text}
    </span>
  );
}

export function CharacterAppearancePreview({
  borderColor,
  nameLabel,
  subtitleLabel,
  placeholderFill,
  initialsColor,
  fontFamily = DEFAULT_DIAGRAM_FONT,
  canvasBackground = null,
}: {
  borderColor: RGB;
  nameLabel: LabelChrome;
  subtitleLabel: LabelChrome;
  placeholderFill: RGB;
  initialsColor: RGB;
  fontFamily?: string;
  canvasBackground?: DiagramBackgroundColor;
}) {
  const { t } = useTranslation();
  return (
    <div
      className={`${previewSurfaceClass(canvasBackground)} diagram-appearance-preview-character`}
      style={previewSurfaceStyle(canvasBackground)}
      aria-label={t("diagramAppearance.previewCharacterAria")}
    >
      <div
        className="diagram-appearance-preview-avatar"
        style={{
          borderColor: rgbToCss(borderColor),
          backgroundColor: rgbToCss(placeholderFill),
        }}
      >
        <span
          className="diagram-appearance-preview-initials"
          style={{
            color: rgbToCss(initialsColor),
            fontFamily: formatUiFontFamily(fontFamily),
          }}
        >
          AB
        </span>
      </div>
      <div className="diagram-appearance-preview-pills">
        <PreviewPill
          text={t("diagramAppearance.previewCharacterName")}
          chrome={nameLabel}
          fontFamily={fontFamily}
        />
        <PreviewPill
          text={t("diagramAppearance.previewCharacterSubtitle")}
          chrome={subtitleLabel}
          fontFamily={fontFamily}
        />
      </div>
    </div>
  );
}

export function LineAppearancePreview({
  lineColor,
  labelChrome,
  fontFamily = DEFAULT_DIAGRAM_FONT,
  canvasBackground = null,
}: {
  lineColor: RGB;
  labelChrome: LabelChrome;
  fontFamily?: string;
  canvasBackground?: DiagramBackgroundColor;
}) {
  const { t } = useTranslation();
  const lineLabelContrastWithBackground = useDiagramStore(
    (s) => s.lineLabelContrastWithBackground,
  );
  const labelTextColor = lineLabelContrastWithBackground
    ? contrastingInk(labelChrome.backgroundColor)
    : lineColor;
  return (
    <div
      className={`${previewSurfaceClass(canvasBackground)} diagram-appearance-preview-line`}
      style={previewSurfaceStyle(canvasBackground)}
      aria-label={t("diagramAppearance.previewLineAria")}
    >
      <div
        className="diagram-appearance-preview-stroke"
        style={{ backgroundColor: rgbToCss(lineColor) }}
      />
      <PreviewPill
        text={t("diagramAppearance.previewLineLabel")}
        chrome={labelChrome}
        textColor={labelTextColor}
        fontFamily={fontFamily}
      />
    </div>
  );
}

export function BoxAppearancePreview({
  borderColor,
  nameLabel,
  fontFamily = DEFAULT_DIAGRAM_FONT,
  canvasBackground = null,
}: {
  borderColor: RGB;
  nameLabel: LabelChrome;
  fontFamily?: string;
  canvasBackground?: DiagramBackgroundColor;
}) {
  const { t } = useTranslation();
  return (
    <div
      className={`${previewSurfaceClass(canvasBackground)} diagram-appearance-preview-box`}
      style={previewSurfaceStyle(canvasBackground)}
      aria-label={t("diagramAppearance.previewBoxAria")}
    >
      <div
        className="diagram-appearance-preview-box-frame"
        style={{
          borderColor: rgbToCss(borderColor),
          backgroundColor: rgbaWithAlpha(borderColor, 0.15),
        }}
      >
        <PreviewPill
          text={t("diagramAppearance.previewBoxName")}
          chrome={nameLabel}
          fontFamily={fontFamily}
        />
      </div>
    </div>
  );
}

export function FloatingTextAppearancePreview({
  color,
  fontFamily = DEFAULT_DIAGRAM_FONT,
  canvasBackground = null,
}: {
  color: RGB;
  fontFamily?: string;
  canvasBackground?: DiagramBackgroundColor;
}) {
  const { t } = useTranslation();
  return (
    <div
      className={`${previewSurfaceClass(canvasBackground)} diagram-appearance-preview-text`}
      style={previewSurfaceStyle(canvasBackground)}
      aria-label={t("diagramAppearance.previewFloatingTextAria")}
    >
      <span
        className="diagram-appearance-preview-floating"
        style={{
          color: rgbToCss(color),
          fontFamily: formatUiFontFamily(fontFamily),
        }}
      >
        {t("diagramAppearance.previewFloatingText")}
      </span>
    </div>
  );
}

export function HeaderAppearancePreview({
  titleLabel,
  subtitleLabel,
  fontFamily = DEFAULT_DIAGRAM_FONT,
  canvasBackground = null,
}: {
  titleLabel: LabelChrome;
  subtitleLabel: LabelChrome;
  fontFamily?: string;
  canvasBackground?: DiagramBackgroundColor;
}) {
  const { t } = useTranslation();
  return (
    <div
      className={`${previewSurfaceClass(canvasBackground)} diagram-appearance-preview-header`}
      style={previewSurfaceStyle(canvasBackground)}
      aria-label={t("diagramAppearance.previewHeaderAria")}
    >
      <div className="diagram-appearance-preview-pills">
        <PreviewPill
          text={t("diagramAppearance.previewHeaderTitle")}
          chrome={titleLabel}
          fontFamily={fontFamily}
        />
        <PreviewPill
          text={t("diagramAppearance.previewHeaderSubtitle")}
          chrome={subtitleLabel}
          fontFamily={fontFamily}
        />
      </div>
    </div>
  );
}
