import { useEffect, type RefObject } from "react";
import { isFindShortcutBlocked } from "../components/panels/FindBar";
import type { FindBarActions } from "../components/panels/FindBar";

interface UseFindShortcutsOptions {
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  actionsRef: RefObject<FindBarActions | null>;
}

export function useFindShortcuts({
  open,
  onToggle,
  onClose,
  actionsRef,
}: UseFindShortcutsOptions): void {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const hasShortcutModifier = event.ctrlKey || event.metaKey;

      if (hasShortcutModifier && key === "f") {
        if (isFindShortcutBlocked(event.target)) {
          return;
        }
        event.preventDefault();
        onToggle();
        return;
      }

      if (!open) return;

      if (event.key === "F3") {
        event.preventDefault();
        if (event.shiftKey) {
          actionsRef.current?.previous();
        } else {
          actionsRef.current?.next();
        }
        return;
      }

      if (event.key === "Escape" && event.target instanceof HTMLElement) {
        if (event.target.closest(".find-bar")) {
          return;
        }
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onToggle, onClose, actionsRef]);
}
