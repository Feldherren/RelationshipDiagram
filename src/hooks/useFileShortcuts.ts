import { useEffect } from "react";

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT" ||
    target.isContentEditable
  );
}

interface UseFileShortcutsOptions {
  onSave: () => void;
  onSaveAs: () => void;
}

export function useFileShortcuts({
  onSave,
  onSaveAs,
}: UseFileShortcutsOptions): void {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const hasShortcutModifier = event.ctrlKey || event.metaKey;
      if (!hasShortcutModifier || key !== "s") return;
      if (isEditableTarget(event.target)) return;

      event.preventDefault();
      if (event.shiftKey) {
        onSaveAs();
      } else {
        onSave();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onSave, onSaveAs]);
}
