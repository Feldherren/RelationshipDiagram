import { useRef, useState } from "react";
import type Konva from "konva";
import { DiagramCanvas } from "./components/Canvas/DiagramCanvas";
import { PropertyPanel } from "./components/panels/PropertyPanel";
import { ExportDialog } from "./components/panels/ExportDialog";
import { Toolbar } from "./components/Toolbar";
import { useDiagramStore } from "./store/diagramStore";
import {
  loadDiagramFromFile,
  saveDiagramToFile,
} from "./utils/persistence";
import "./App.css";

function App() {
  const stageRef = useRef<Konva.Stage>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const getDiagram = useDiagramStore((s) => s.getDiagram);
  const loadDiagram = useDiagramStore((s) => s.loadDiagram);
  const setToolMode = useDiagramStore((s) => s.setToolMode);

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
      loadDiagram(diagram);
    } catch (err) {
      if ((err as Error).message === "cancelled") return;
      console.error(err);
      alert("Failed to open diagram file.");
    }
  };

  const handleExport = () => {
    setToolMode("select");
    setExportOpen(true);
  };

  return (
    <div className="app">
      <Toolbar
        onSave={handleSave}
        onOpen={handleOpen}
        onExport={handleExport}
      />
      <main className="main">
        <DiagramCanvas stageRef={stageRef} />
        <PropertyPanel />
      </main>
      <ExportDialog
        open={exportOpen}
        stageRef={stageRef}
        onClose={() => setExportOpen(false)}
      />
    </div>
  );
}

export default App;
