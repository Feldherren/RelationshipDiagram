/** Local-only preferences keyed by diagram.id (never written into .rdiagram). */

const STORAGE_KEY = "diagramLocalPreferences";

export interface DiagramLocalPreferences {
  /** When true, confirm before opening character external links. Default true. */
  confirmBeforeOpenExternalLink: boolean;
}

export const DEFAULT_DIAGRAM_LOCAL_PREFERENCES: DiagramLocalPreferences = {
  confirmBeforeOpenExternalLink: true,
};

type DiagramLocalPreferencesStore = Record<
  string,
  Partial<DiagramLocalPreferences>
>;

const listeners = new Set<() => void>();
let storeVersion = 0;

function notify(): void {
  storeVersion += 1;
  for (const listener of listeners) listener();
}

export function getDiagramLocalPreferencesVersion(): number {
  return storeVersion;
}

function loadStore(): DiagramLocalPreferencesStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    return parsed as DiagramLocalPreferencesStore;
  } catch {
    return {};
  }
}

function saveStore(store: DiagramLocalPreferencesStore): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // localStorage may be unavailable or over quota
  }
  notify();
}

export function getDiagramLocalPreferences(
  diagramId: string,
): DiagramLocalPreferences {
  const entry = loadStore()[diagramId] ?? {};
  return {
    confirmBeforeOpenExternalLink:
      typeof entry.confirmBeforeOpenExternalLink === "boolean"
        ? entry.confirmBeforeOpenExternalLink
        : DEFAULT_DIAGRAM_LOCAL_PREFERENCES.confirmBeforeOpenExternalLink,
  };
}

export function setDiagramLocalPreferences(
  diagramId: string,
  patch: Partial<DiagramLocalPreferences>,
): void {
  if (!diagramId.trim()) return;
  const store = loadStore();
  store[diagramId] = { ...store[diagramId], ...patch };
  saveStore(store);
}

export function subscribeDiagramLocalPreferences(
  onStoreChange: () => void,
): () => void {
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
  };
}
