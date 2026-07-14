import { useEffect } from "react";
import { useDiagramStore } from "../store/diagramStore";
import {
  pickPersistedState,
  persistedStatesEqual,
} from "../store/autosaveState";
import {
  flushAutosaveNow,
  scheduleAutosave,
} from "../store/autosaveScheduler";

export function useAutosave() {
  useEffect(() => {
    const flush = () => useDiagramStore.getState().flushAutosave();

    const unsubscribe = useDiagramStore.subscribe(
      (state) => pickPersistedState(state),
      () => {
        if (!useDiagramStore.getState().autosaveEnabled) return;
        scheduleAutosave(flush);
      },
      { equalityFn: persistedStatesEqual },
    );

    const flushOnHide = () => {
      if (document.visibilityState !== "hidden") return;
      if (!useDiagramStore.getState().autosaveEnabled) return;
      void flushAutosaveNow(flush);
    };

    document.addEventListener("visibilitychange", flushOnHide);
    window.addEventListener("pagehide", flushOnHide);

    return () => {
      unsubscribe();
      document.removeEventListener("visibilitychange", flushOnHide);
      window.removeEventListener("pagehide", flushOnHide);
    };
  }, []);
}
