import type { AutosaveSnapshot } from "../utils/autosaveStorage";

export const AUTOSAVE_DEBOUNCE_MS = 800;

let autosaveTimer: ReturnType<typeof setTimeout> | undefined;
let flushInFlight = false;
let flushQueued = false;

export function cancelScheduledAutosave(): void {
  if (autosaveTimer) {
    clearTimeout(autosaveTimer);
    autosaveTimer = undefined;
  }
}

export function scheduleAutosave(flush: () => Promise<void>): void {
  cancelScheduledAutosave();
  autosaveTimer = setTimeout(() => {
    autosaveTimer = undefined;
    void flush();
  }, AUTOSAVE_DEBOUNCE_MS);
}

export async function performAutosave(
  getSnapshot: () => AutosaveSnapshot,
  save: (snapshot: AutosaveSnapshot) => Promise<void>,
): Promise<void> {
  if (flushInFlight) {
    flushQueued = true;
    return;
  }

  flushInFlight = true;
  try {
    do {
      flushQueued = false;
      await save(getSnapshot());
    } while (flushQueued);
  } finally {
    flushInFlight = false;
  }
}

export async function flushAutosaveNow(flush: () => Promise<void>): Promise<void> {
  cancelScheduledAutosave();
  await flush();
}
