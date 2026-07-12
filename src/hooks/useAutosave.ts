import { useEffect } from "react";
import { useDiagramStore } from "../store/diagramStore";
import {
  hasPersistedStateChanged,
  pickPersistedState,
} from "../store/autosaveState";

const AUTOSAVE_DEBOUNCE_MS = 800;

export function useAutosave() {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let previous = pickPersistedState(useDiagramStore.getState());

    const unsubscribe = useDiagramStore.subscribe((state) => {
      if (!state.autosaveEnabled) {
        previous = pickPersistedState(state);
        return;
      }

      if (!hasPersistedStateChanged(state, previous)) return;
      previous = pickPersistedState(state);

      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        void useDiagramStore.getState().flushAutosave();
      }, AUTOSAVE_DEBOUNCE_MS);
    });

    return () => {
      unsubscribe();
      if (timer) clearTimeout(timer);
    };
  }, []);
}
