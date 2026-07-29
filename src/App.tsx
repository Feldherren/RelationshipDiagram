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
import { ExternalLinkConfirmHost } from "./components/panels/ExternalLinkConfirmHost";
import { FindBar, type FindBarActions } from "./components/panels/FindBar";
import { Toolbar } from "./components/Toolbar";
import { EditorTabs } from "./components/EditorTabs";
import { ZoomIndicator } from "./components/panels/ZoomIndicator";
import { ViewportControls } from "./components/panels/ViewportControls";
import { AddObjectControls } from "./components/panels/AddObjectControls";
import { useAutosave } from "./hooks/useAutosave";
import { useUiAppearance } from "./hooks/useUiAppearance";
import { useFindShortcuts } from "./hooks/useFindShortcuts";
import { useDiagramStore } from "./store/diagramStore";
import { useOpenDocumentsStore } from "./store/openDocumentsStore";
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
  const [findOpen, setFindOpen] = useState(false);
  const findActionsRef = useRef<FindBarActions | null>(null);
  const bootstrapApp = useDiagramStore((s) => s.bootstrapApp);
  const setToolMode = useDiagramStore((s) => s.setToolMode);
  const bootstrapDocuments = useOpenDocumentsStore((s) => s.bootstrap);
  const openNewTab = useOpenDocumentsStore((s) => s.openNewTab);
  const openDiagramInTab = useOpenDocumentsStore((s) => s.openDiagramInTab);
  const markActiveSaved = useOpenDocumentsStore((s) => s.markActiveSaved);
  const activeFilePath = useOpenDocumentsStore((s) => s.activeFilePath);
  const activeFileHandle = useOpenDocumentsStore((s) => s.activeFileHandle);
  const activePathScopeGranted = useOpenDocumentsStore(
    (s) => s.activePathScopeGranted,
  );
  const documentsReady = useOpenDocumentsStore((s) => s.ready);

  useAutosave();
  useUiAppearance();
  useFindShortcuts({
    open: findOpen,
    onToggle: () => setFindOpen((open) => !open),
    onClose: () => setFindOpen(false),
    actionsRef: findActionsRef,
  });

  useEffect(() => {
    void (async () => {
      await bootstrapApp();
      await bootstrapDocuments();
    })();
  }, [bootstrapApp, bootstrapDocuments]);

  // Close find / export UI when switching tabs so they don't target stale state.
  const activeSessionId = useOpenDocumentsStore((s) => s.activeSessionId);
  useEffect(() => {
    setFindOpen(false);
    setExportOpen(false);
    setDiagramPropertiesOpen(false);
  }, [activeSessionId]);

  const handleSave = async () => {
    try {
      const result = await saveDiagramToFile(
        useDiagramStore.getState().getDiagram(),
        {
          filePath: activeFilePath,
          fileHandle: activeFileHandle,
          pathScopeGranted: activePathScopeGranted,
        },
      );
      if (result.cancelled) return;
      useDiagramStore.getState().markClean();
      markActiveSaved({
        filePath: result.filePath,
        fileHandle: result.fileHandle,
        pathScopeGranted: result.pathScopeGranted,
      });
      if (useDiagramStore.getState().autosaveEnabled) {
        await useDiagramStore.getState().flushAutosave();
      }
    } catch (err) {
      console.error(err);
      alert(t("app.saveFailed"));
    }
  };

  const handleOpen = async () => {
    try {
      const loaded = await loadDiagramFromFile();
      await openDiagramInTab(loaded.diagram, {
        filePath: loaded.filePath,
        fileHandle: loaded.fileHandle,
        pathScopeGranted: loaded.pathScopeGranted,
      });
    } catch (err) {
      if ((err as Error).message === "cancelled") return;
      console.error(err);
      alert(t("app.openFailed"));
    }
  };

  const handleNew = async () => {
    await openNewTab();
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
        onFind={() => setFindOpen(true)}
      />
      <EditorTabs />
      <main className="main">
        <div className="workspace">
          {documentsReady ? (
            <>
              <DiagramCanvas stageRef={stageRef} />
              <SelectionFloat />
              <ViewportControls />
              <AddObjectControls />
              <GroupsListPopup />
              <ZoomIndicator />
              <FindBar
                open={findOpen}
                onClose={() => setFindOpen(false)}
                actionsRef={findActionsRef}
              />
            </>
          ) : null}
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
      <ExternalLinkConfirmHost />
    </div>
  );
}

export default App;
