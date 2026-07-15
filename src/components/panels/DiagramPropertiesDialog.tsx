import { useTranslation } from "react-i18next";
import { useDiagramStore } from "../../store/diagramStore";
import { isDefaultDiagramFont } from "../../utils/diagramFont";
import { getDiagramBackgroundMode } from "../../utils/diagramBackground";
import { BackgroundModeControls } from "./BackgroundModeControls";
import { FontPicker } from "./FontPicker";

interface DiagramPropertiesDialogProps {
  open: boolean;
  onClose: () => void;
}

export function DiagramPropertiesDialog({
  open,
  onClose,
}: DiagramPropertiesDialogProps) {
  const { t } = useTranslation();
  const diagramTitle = useDiagramStore((s) => s.diagramTitle);
  const diagramSubtitle = useDiagramStore((s) => s.diagramSubtitle);
  const showDiagramHeader = useDiagramStore((s) => s.showDiagramHeader);
  const diagramFontFamily = useDiagramStore((s) => s.diagramFontFamily);
  const fontMissing = useDiagramStore((s) => s.fontMissing);
  const showGrid = useDiagramStore((s) => s.showGrid);
  const gridStyle = useDiagramStore((s) => s.gridStyle);
  const diagramBackgroundColor = useDiagramStore((s) => s.diagramBackgroundColor);
  const setDiagramTitle = useDiagramStore((s) => s.setDiagramTitle);
  const setDiagramSubtitle = useDiagramStore((s) => s.setDiagramSubtitle);
  const setShowDiagramHeader = useDiagramStore((s) => s.setShowDiagramHeader);
  const setDiagramBackgroundMode = useDiagramStore(
    (s) => s.setDiagramBackgroundMode,
  );
  const setDiagramBackgroundColor = useDiagramStore(
    (s) => s.setDiagramBackgroundColor,
  );
  const setDiagramFontFamily = useDiagramStore((s) => s.setDiagramFontFamily);

  const backgroundMode = getDiagramBackgroundMode(
    showGrid,
    gridStyle,
    diagramBackgroundColor,
  );

  if (!open) return null;

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <h2>{t("diagramProperties.title")}</h2>

        <label className="field">
          <span>{t("diagramProperties.diagramTitle")}</span>
          <input
            type="text"
            value={diagramTitle}
            placeholder={t("diagramProperties.titlePlaceholder")}
            onChange={(e) => setDiagramTitle(e.target.value)}
          />
        </label>

        <label className="field">
          <span>{t("diagramProperties.diagramSubtitle")}</span>
          <input
            type="text"
            value={diagramSubtitle}
            placeholder={t("diagramProperties.subtitlePlaceholder")}
            onChange={(e) => setDiagramSubtitle(e.target.value)}
          />
        </label>

        <label className="field checkbox">
          <input
            type="checkbox"
            checked={showDiagramHeader}
            onChange={(e) => setShowDiagramHeader(e.target.checked)}
          />
          <span>{t("diagramProperties.showHeader")}</span>
        </label>

        <BackgroundModeControls
          mode={backgroundMode}
          backgroundColor={diagramBackgroundColor}
          onModeChange={setDiagramBackgroundMode}
          onBackgroundColorChange={setDiagramBackgroundColor}
        />

        <div className="field">
          <span>{t("diagramProperties.diagramFont")}</span>
          <FontPicker
            value={diagramFontFamily}
            onChange={(fontFamily) => void setDiagramFontFamily(fontFamily)}
          />
        </div>

        {fontMissing && (
          <p className="hint">
            {t("diagramProperties.fontMissing", { font: diagramFontFamily })}
          </p>
        )}

        {!fontMissing && !isDefaultDiagramFont(diagramFontFamily) && (
          <p className="hint">{t("diagramProperties.customFontHint")}</p>
        )}

        <p className="hint">{t("diagramProperties.uiFontHint")}</p>

        <div className="dialog-actions">
          <button type="button" className="btn-primary" onClick={onClose}>
            {t("diagramProperties.done")}
          </button>
        </div>
      </div>
    </div>
  );
}
