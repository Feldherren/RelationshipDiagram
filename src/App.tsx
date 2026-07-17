import { useEffect, useRef, useState } from "react";
import type Konva from "konva";
import { useTranslation } from "react-i18next";
import { DiagramCanvas } from "./components/Canvas/DiagramCanvas";
import { SelectionFloat } from "./components/panels/SelectionFloat";
import { GroupsListPopup } from "./components/panels/GroupsListPopup";
import { ExportDialog } from "./components/panels/ExportDialog";
import { DiagramPropertiesDialog } from "./components/panels/DiagramPropertiesDialog";
import { SettingsDialog, type SettingsSectionId } from "./components/panels/SettingsDialog";
import { HelpControlsDialog } from "./components/panels/HelpControlsDialog";
import { Toolbar } from "./components/Toolbar";
import { ZoomIndicator } from "./components/panels/ZoomIndicator";
import { ViewportControls } from "./components/panels/ViewportControls";
import { AddObjectControls } from "./components/panels/AddObjectControls";
import { useAutosave } from "./hooks/useAutosave";
import { useUiAppearance } from "./hooks/useUiAppearance";
import { useDiagramStore } from "./store/diagramStore";
import { getAppPreferences } from "./utils/appPreferences";
import {
  loadDiagramFromFile,
  saveDiagramToFile,
} from "./utils/persistence";
import "./App.css";

function App() {
  const { t } = useTranslation();
  const stageRef = useRef<Konva.Stage | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [diagramPropertiesOpen, setDiagramPropertiesOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsSection, setSettingsSection] =
    useState<SettingsSectionId>("appearance");
  const [helpOpen, setHelpOpen] = useState(false);
  const getDiagram = useDiagramStore((s) => s.getDiagram);
  const loadDiagram = useDiagramStore((s) => s.loadDiagram);
  const bootstrapApp = useDiagramStore((s) => s.bootstrapApp);
  const newDiagram = useDiagramStore((s) => s.newDiagram);
  const setToolMode = useDiagramStore((s) => s.setToolMode);

  useAutosave();
  useUiAppearance();

  useEffect(() => {
    void bootstrapApp();
  }, [bootstrapApp]);

  const handleSave = async () => {
    try {
      await saveDiagramToFile(getDiagram());
    } catch (err) {
      console.error(err);
      alert(t("app.saveFailed"));
    }
  };

  const handleOpen = async () => {
    try {
      const diagram = await loadDiagramFromFile();
      await loadDiagram(diagram);
    } catch (err) {
      if ((err as Error).message === "cancelled") return;
      console.error(err);
      alert(t("app.openFailed"));
    }
  };

  const handleNew = async () => {
    const { confirmBeforeNewDiagram } = getAppPreferences();
    const { characters, lines, groups, boxes, floatingTexts } =
      useDiagramStore.getState();
    const hasContent =
      characters.length > 0 ||
      lines.length > 0 ||
      groups.length > 0 ||
      boxes.length > 0 ||
      floatingTexts.length > 0;
    if (
      confirmBeforeNewDiagram &&
      hasContent &&
      !window.confirm(t("app.newConfirm"))
    ) {
      return;
    }
    await newDiagram();
  };

  const handleExport = () => {
    setToolMode("select");
    setExportOpen(true);
  };

  const openSettings = (section: SettingsSectionId = "appearance") => {
    setSettingsSection(section);
    setSettingsOpen(true);
  };

  const openDiagramThemesFromProperties = () => {
    setDiagramPropertiesOpen(false);
    openSettings("diagramDefaults");
  };

  return (
    <div className="app">
      <Toolbar
        onNew={handleNew}
        onSave={handleSave}
        onOpen={handleOpen}
        onExport={handleExport}
        onDiagramProperties={() => setDiagramPropertiesOpen(true)}
        onHelp={() => setHelpOpen(true)}
        onSettings={() => openSettings()}
      />
      <main className="main">
        <div className="workspace">
          <DiagramCanvas stageRef={stageRef} />
          <SelectionFloat />
          <ViewportControls />
          <AddObjectControls />
          <GroupsListPopup />
          <ZoomIndicator />
        </div>
      </main>
      <ExportDialog
        open={exportOpen}
        stageRef={stageRef}
        onClose={() => setExportOpen(false)}
      />
      <DiagramPropertiesDialog
        open={diagramPropertiesOpen}
        onClose={() => setDiagramPropertiesOpen(false)}
        onManageThemes={openDiagramThemesFromProperties}
      />
      <HelpControlsDialog
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
      />
      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        initialSection={settingsSection}
      />
    </div>
  );
}

export default App;
