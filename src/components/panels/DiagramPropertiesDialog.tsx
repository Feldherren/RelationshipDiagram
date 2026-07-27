import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDiagramStore } from "../../store/diagramStore";
import { getAppPreferences } from "../../utils/appPreferences";
import {
  BUILT_IN_DIAGRAM_THEME_IDS,
  builtInDiagramThemeLabelKey,
  isBuiltInDiagramThemeId,
  resolveDiagramThemeAppearance,
  type DiagramAppearance,
  type DiagramThemePreference,
} from "../../utils/diagramAppearance";
import { countRemappableElements } from "../../utils/remapDiagramThemeColors";
import { ApplyDiagramThemeDialog } from "./ApplyDiagramThemeDialog";
import { DiagramAppearancePanel } from "./DiagramAppearancePanel";
import { TwoPaneDialog } from "./TwoPaneDialog";

type PropertiesSectionId = "header" | "appearance";

interface PendingThemeApply {
  preference: DiagramThemePreference;
  appearance: DiagramAppearance;
  themeName: string;
  remappableCount: number;
}

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
  const [pendingThemeApply, setPendingThemeApply] =
    useState<PendingThemeApply | null>(null);
  const diagramTitle = useDiagramStore((s) => s.diagramTitle);
  const diagramSubtitle = useDiagramStore((s) => s.diagramSubtitle);
  const diagramFontFamily = useDiagramStore((s) => s.diagramFontFamily);
  const fontMissing = useDiagramStore((s) => s.fontMissing);
  const diagramAppearance = useDiagramStore((s) => s.diagramAppearance);
  const setDiagramTitle = useDiagramStore((s) => s.setDiagramTitle);
  const setDiagramSubtitle = useDiagramStore((s) => s.setDiagramSubtitle);
  const setDiagramFontFamily = useDiagramStore((s) => s.setDiagramFontFamily);
  const setDiagramAppearance = useDiagramStore((s) => s.setDiagramAppearance);
  const applyDiagramTheme = useDiagramStore((s) => s.applyDiagramTheme);
  const characters = useDiagramStore((s) => s.characters);
  const lines = useDiagramStore((s) => s.lines);
  const boxes = useDiagramStore((s) => s.boxes);
  const floatingTexts = useDiagramStore((s) => s.floatingTexts);

  useEffect(() => {
    if (!open) return;
    setActiveSection("header");
    setApplyThemeValue("");
    setPendingThemeApply(null);
  }, [open]);

  const prefs = getAppPreferences();

  const resolveThemeName = (preference: DiagramThemePreference): string => {
    if (isBuiltInDiagramThemeId(preference)) {
      return t(builtInDiagramThemeLabelKey(preference));
    }
    return (
      prefs.customDiagramThemes.find((theme) => theme.id === preference)
        ?.name ?? preference
    );
  };

  const handleApplyThemeSelect = (preference: DiagramThemePreference) => {
    const next = resolveDiagramThemeAppearance(
      preference,
      prefs.customDiagramThemes,
    );
    const remappableCount = countRemappableElements(
      { characters, lines, boxes, floatingTexts },
      diagramAppearance,
    );
    setPendingThemeApply({
      preference,
      appearance: next,
      themeName: resolveThemeName(preference),
      remappableCount,
    });
    setApplyThemeValue(preference);
  };

  const handleApplyThemeConfirm = (remapDefaultColors: boolean) => {
    if (!pendingThemeApply) return;
    applyDiagramTheme(pendingThemeApply.appearance, { remapDefaultColors });
    setPendingThemeApply(null);
  };

  const handleApplyThemeCancel = () => {
    setPendingThemeApply(null);
    setApplyThemeValue("");
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
                handleApplyThemeSelect(value as DiagramThemePreference);
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
    <>
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

      <ApplyDiagramThemeDialog
        open={pendingThemeApply !== null}
        themeName={pendingThemeApply?.themeName ?? ""}
        remappableCount={pendingThemeApply?.remappableCount ?? 0}
        onCancel={handleApplyThemeCancel}
        onConfirm={handleApplyThemeConfirm}
      />
    </>
  );
}
