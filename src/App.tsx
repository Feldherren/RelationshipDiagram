import { useEffect, useRef, useState } from "react";
import type Konva from "konva";
import { useTranslation } from "react-i18next";
import { DiagramCanvas } from "./components/Canvas/DiagramCanvas";
import { SelectionFloat } from "./components/panels/SelectionFloat";
import { GroupsListPopup } from "./components/panels/GroupsListPopup";
import { ExportDialog } from "./components/panels/ExportDialog";
import { SettingsDialog } from "./components/panels/SettingsDialog";
import { Toolbar } from "./components/Toolbar";
import { useAutosave } from "./hooks/useAutosave";
import { useDiagramStore } from "./store/diagramStore";
import {
  loadDiagramFromFile,
  saveDiagramToFile,
} from "./utils/persistence";
import "./App.css";

function App() {
  const { t } = useTranslation();
  const stageRef = useRef<Konva.Stage | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const getDiagram = useDiagramStore((s) => s.getDiagram);
  const loadDiagram = useDiagramStore((s) => s.loadDiagram);
  const bootstrapApp = useDiagramStore((s) => s.bootstrapApp);
  const newDiagram = useDiagramStore((s) => s.newDiagram);
  const setToolMode = useDiagramStore((s) => s.setToolMode);

  useAutosave();

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
    const { characters, lines, groups, boxes, floatingTexts } =
      useDiagramStore.getState();
    const hasContent =
      characters.length > 0 ||
      lines.length > 0 ||
      groups.length > 0 ||
      boxes.length > 0 ||
      floatingTexts.length > 0;
    if (hasContent && !window.confirm(t("app.newConfirm"))) {
      return;
    }
    await newDiagram();
  };

  const handleExport = () => {
    setToolMode("select");
    setExportOpen(true);
  };

  return (
    <div className="app">
      <Toolbar
        onNew={handleNew}
        onSave={handleSave}
        onOpen={handleOpen}
        onExport={handleExport}
        onSettings={() => setSettingsOpen(true)}
      />
      <main className="main">
        <div className="workspace">
          <DiagramCanvas stageRef={stageRef} />
          <SelectionFloat />
          <GroupsListPopup />
        </div>
      </main>
      <ExportDialog
        open={exportOpen}
        stageRef={stageRef}
        onClose={() => setExportOpen(false)}
      />
      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}

export default App;
