import type {
  Diagram,
  NodeRef,
  Selection,
  ToolMode,
} from "../models/types";
import type { PersistedDiagramState } from "./autosaveState";

/** In-memory editor buffer for one open diagram (active or stashed). */
export interface DiagramEditorSessionState {
  document: PersistedDiagramState;
  diagramId: string;
  dirty: boolean;
  undoStack: PersistedDiagramState[];
  redoStack: PersistedDiagramState[];
  selection: Selection;
  selectionDetailsOpen: boolean;
  editingFloatingTextId: string | null;
  toolMode: ToolMode;
  connectFrom: NodeRef | null;
}

export interface OpenDiagramSession extends DiagramEditorSessionState {
  sessionId: string;
  /** Display title; empty string means untitled. */
  title: string;
  filePath?: string;
  fileHandle?: FileSystemFileHandle;
  /** Diagram serialization for autosaving inactive tabs. */
  savedDiagram: Diagram;
}

export function sessionDisplayTitle(
  title: string,
  untitledLabel: string,
): string {
  const trimmed = title.trim();
  return trimmed.length > 0 ? trimmed : untitledLabel;
}

export function basenameFromPath(path: string | undefined): string | undefined {
  if (!path) return undefined;
  const normalized = path.replace(/\\/g, "/");
  const parts = normalized.split("/");
  return parts[parts.length - 1] || path;
}

export type DiagramFileAssociation = {
  filePath?: string;
  fileHandle?: FileSystemFileHandle;
};
