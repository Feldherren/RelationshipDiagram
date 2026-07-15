import { useEffect, useRef, useState } from "react";
import type Konva from "konva";
import { DiagramCanvas } from "./components/Canvas/DiagramCanvas";
import { SelectionFloat } from "./components/panels/SelectionFloat";
import { GroupsPanel } from "./components/panels/GroupsPanel";
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
  const stageRef = useRef<Konva.Stage | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [groupsOpen, setGroupsOpen] = useState(false);
  const getDiagram = useDiagramStore((s) => s.getDiagram);
  const loadDiagram = useDiagramStore((s) => s.loadDiagram);
  const bootstrapApp = useDiagramStore((s) => s.bootstrapApp);
  const newDiagram = useDiagramStore((s) => s.newDiagram);
  const setToolMode = useDiagramStore((s) => s.setToolMode);
  const selection = useDiagramStore((s) => s.selection);

  useAutosave();

  useEffect(() => {
    void bootstrapApp();
  }, [bootstrapApp]);

  useEffect(() => {
    if (selection?.type === "group") {
      setGroupsOpen(true);
    }
  }, [selection]);

  const handleSave = async () => {
    try {
      await saveDiagramToFile(getDiagram());
    } catch (err) {
      console.error(err);
      alert("Failed to save diagram.");
    }
  };

  const handleOpen = async () => {
    try {
      const diagram = await loadDiagramFromFile();
      await loadDiagram(diagram);
    } catch (err) {
      if ((err as Error).message === "cancelled") return;
      console.error(err);
      alert("Failed to open diagram file.");
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
    if (
      hasContent &&
      !window.confirm(
        "Start a new diagram? Your current diagram will be replaced.",
      )
    ) {
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
        groupsOpen={groupsOpen}
        onToggleGroups={() => setGroupsOpen((open) => !open)}
      />
      <main className="main">
        <div className="workspace">
          <DiagramCanvas stageRef={stageRef} />
          <SelectionFloat />
          <GroupsPanel
            open={groupsOpen}
            onClose={() => setGroupsOpen(false)}
          />
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
