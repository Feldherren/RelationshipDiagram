import { useEffect, useRef } from "react";

export interface CanvasContextMenuState {
  screenX: number;
  screenY: number;
  worldX: number;
  worldY: number;
}

interface CanvasContextMenuProps {
  menu: CanvasContextMenuState | null;
  onClose: () => void;
  onAddCharacter: (position: { x: number; y: number }) => void;
  onAddBox: (position: { x: number; y: number }) => void;
  onAddGroup: () => void;
  onAddFloatingText: (position: { x: number; y: number }) => void;
}

export function CanvasContextMenu({
  menu,
  onClose,
  onAddCharacter,
  onAddBox,
  onAddGroup,
  onAddFloatingText,
}: CanvasContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;

    const handlePointerDown = (e: MouseEvent) => {
      if (menuRef.current?.contains(e.target as Node)) return;
      onClose();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [menu, onClose]);

  if (!menu) return null;

  const position = { x: menu.worldX, y: menu.worldY };

  return (
    <div
      ref={menuRef}
      className="canvas-context-menu"
      style={{ left: menu.screenX, top: menu.screenY }}
      role="menu"
    >
      <button
        type="button"
        role="menuitem"
        onClick={() => {
          onAddCharacter(position);
          onClose();
        }}
      >
        Add character
      </button>
      <button
        type="button"
        role="menuitem"
        onClick={() => {
          onAddBox(position);
          onClose();
        }}
      >
        Add box
      </button>
      <button
        type="button"
        role="menuitem"
        onClick={() => {
          onAddGroup();
          onClose();
        }}
      >
        Add group
      </button>
      <button
        type="button"
        role="menuitem"
        onClick={() => {
          onAddFloatingText(position);
          onClose();
        }}
      >
        Add text
      </button>
    </div>
  );
}
