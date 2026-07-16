import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDiagramStore } from "../../store/diagramStore";
import { getDiagramBackgroundMode } from "../../utils/diagramBackground";
import { DiagramAppearancePanel } from "./DiagramAppearancePanel";
import { DiagramThemeLibraryControls } from "./DiagramThemeLibraryControls";
import { TwoPaneDialog } from "./TwoPaneDialog";

type PropertiesSectionId = "header" | "appearance";

interface DiagramPropertiesDialogProps {
  open: boolean;
  onClose: () => void;
}

export function DiagramPropertiesDialog({
  open,
  onClose,
}: DiagramPropertiesDialogProps) {
  const { t } = useTranslation();
  const [activeSection, setActiveSection] =
    useState<PropertiesSectionId>("header");
  const diagramTitle = useDiagramStore((s) => s.diagramTitle);
  const diagramSubtitle = useDiagramStore((s) => s.diagramSubtitle);
  const diagramTitleColor = useDiagramStore((s) => s.diagramTitleColor);
  const diagramSubtitleColor = useDiagramStore((s) => s.diagramSubtitleColor);
  const showDiagramHeader = useDiagramStore((s) => s.showDiagramHeader);
  const diagramFontFamily = useDiagramStore((s) => s.diagramFontFamily);
  const fontMissing = useDiagramStore((s) => s.fontMissing);
  const showGrid = useDiagramStore((s) => s.showGrid);
  const gridStyle = useDiagramStore((s) => s.gridStyle);
  const diagramBackgroundColor = useDiagramStore((s) => s.diagramBackgroundColor);
  const diagramAppearance = useDiagramStore((s) => s.diagramAppearance);
  const setDiagramTitle = useDiagramStore((s) => s.setDiagramTitle);
  const setDiagramSubtitle = useDiagramStore((s) => s.setDiagramSubtitle);
  const setDiagramTitleColor = useDiagramStore((s) => s.setDiagramTitleColor);
  const setDiagramSubtitleColor = useDiagramStore(
    (s) => s.setDiagramSubtitleColor,
  );
  const setShowDiagramHeader = useDiagramStore((s) => s.setShowDiagramHeader);
  const setDiagramBackgroundMode = useDiagramStore(
    (s) => s.setDiagramBackgroundMode,
  );
  const setDiagramBackgroundColor = useDiagramStore(
    (s) => s.setDiagramBackgroundColor,
  );
  const setDiagramFontFamily = useDiagramStore((s) => s.setDiagramFontFamily);
  const setDiagramAppearance = useDiagramStore((s) => s.setDiagramAppearance);
  const replaceDiagramAppearance = useDiagramStore(
    (s) => s.replaceDiagramAppearance,
  );

  const backgroundMode = getDiagramBackgroundMode(
    showGrid,
    gridStyle,
    diagramBackgroundColor,
  );

  useEffect(() => {
    if (!open) return;
    setActiveSection("header");
  }, [open]);

  const sections = [
    { id: "header", label: t("diagramProperties.sectionHeader") },
    { id: "appearance", label: t("diagramProperties.sectionAppearance") },
  ] as const;

  let content = null;
  switch (activeSection) {
    case "header":
      content = (
        <>
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
        </>
      );
      break;
    case "appearance":
      content = (
        <>
          <DiagramThemeLibraryControls
            appearance={diagramAppearance}
            onApplyAppearance={replaceDiagramAppearance}
            hintKey="diagramProperties.appearanceThemesHint"
          />

          <hr className="theme-editor-divider" />

          <DiagramAppearancePanel
            value={diagramAppearance}
            onChange={setDiagramAppearance}
            headerColors={{
              titleColor: diagramTitleColor,
              subtitleColor: diagramSubtitleColor,
              onTitleColorChange: setDiagramTitleColor,
              onSubtitleColorChange: setDiagramSubtitleColor,
            }}
            canvasSetup={{
              backgroundMode,
              backgroundColor: diagramBackgroundColor,
              diagramFont: diagramFontFamily,
              onBackgroundModeChange: setDiagramBackgroundMode,
              onBackgroundColorChange: setDiagramBackgroundColor,
              onDiagramFontChange: (fontFamily) =>
                void setDiagramFontFamily(fontFamily),
              fontMissing,
              showFontHints: true,
            }}
          />
        </>
      );
      break;
  }

  return (
    <TwoPaneDialog
      open={open}
      onClose={onClose}
      title={t("diagramProperties.title")}
      sections={sections}
      activeSection={activeSection}
      onSectionChange={(id) => setActiveSection(id as PropertiesSectionId)}
      doneLabel={t("diagramProperties.done")}
    >
      {content}
    </TwoPaneDialog>
  );
}
