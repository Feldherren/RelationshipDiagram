import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDiagramStore } from "../../store/diagramStore";
import { getAppPreferences } from "../../utils/appPreferences";
import {
  BUILT_IN_DIAGRAM_THEME_IDS,
  builtInDiagramThemeLabelKey,
  resolveDiagramThemeAppearance,
  type DiagramThemePreference,
} from "../../utils/diagramAppearance";
import { DiagramAppearancePanel } from "./DiagramAppearancePanel";
import { TwoPaneDialog } from "./TwoPaneDialog";

type PropertiesSectionId = "header" | "appearance";

interface DiagramPropertiesDialogProps {
  open: boolean;
  onClose: () => void;
  /** Opens Settings → Diagram Themes (closes this dialog). */
  onManageThemes?: () => void;
}

export function DiagramPropertiesDialog({
  open,
  onClose,
  onManageThemes,
}: DiagramPropertiesDialogProps) {
  const { t } = useTranslation();
  const [activeSection, setActiveSection] =
    useState<PropertiesSectionId>("header");
  const [applyThemeValue, setApplyThemeValue] = useState("");
  const diagramTitle = useDiagramStore((s) => s.diagramTitle);
  const diagramSubtitle = useDiagramStore((s) => s.diagramSubtitle);
  const diagramFontFamily = useDiagramStore((s) => s.diagramFontFamily);
  const fontMissing = useDiagramStore((s) => s.fontMissing);
  const diagramAppearance = useDiagramStore((s) => s.diagramAppearance);
  const setDiagramTitle = useDiagramStore((s) => s.setDiagramTitle);
  const setDiagramSubtitle = useDiagramStore((s) => s.setDiagramSubtitle);
  const setDiagramFontFamily = useDiagramStore((s) => s.setDiagramFontFamily);
  const setDiagramAppearance = useDiagramStore((s) => s.setDiagramAppearance);
  const replaceDiagramAppearance = useDiagramStore(
    (s) => s.replaceDiagramAppearance,
  );

  useEffect(() => {
    if (!open) return;
    setActiveSection("header");
    setApplyThemeValue("");
  }, [open]);

  const prefs = getAppPreferences();

  const handleApplyTheme = (preference: DiagramThemePreference) => {
    const next = resolveDiagramThemeAppearance(
      preference,
      prefs.customDiagramThemes,
    );
    replaceDiagramAppearance(next);
    setApplyThemeValue(preference);
  };

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
        </>
      );
      break;
    case "appearance":
      content = (
        <>
          <p className="hint">{t("diagramProperties.appearanceThemesHint")}</p>

          <label className="field">
            <span>{t("diagramProperties.applyTheme")}</span>
            <select
              value={applyThemeValue}
              onChange={(e) => {
                const value = e.target.value;
                if (!value) return;
                handleApplyTheme(value as DiagramThemePreference);
              }}
            >
              <option value="" disabled>
                {t("diagramProperties.applyThemePlaceholder")}
              </option>
              {BUILT_IN_DIAGRAM_THEME_IDS.map((id) => (
                <option key={id} value={id}>
                  {t(builtInDiagramThemeLabelKey(id))}
                </option>
              ))}
              {prefs.customDiagramThemes.map((theme) => (
                <option key={theme.id} value={theme.id}>
                  {theme.name}
                </option>
              ))}
            </select>
          </label>

          {onManageThemes && (
            <button
              type="button"
              className="btn-secondary"
              onClick={onManageThemes}
            >
              {t("diagramProperties.manageThemes")}
            </button>
          )}

          <hr className="theme-editor-divider" />

          <DiagramAppearancePanel
            value={diagramAppearance}
            onChange={setDiagramAppearance}
            canvasSetup={{
              diagramFont: diagramFontFamily,
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
