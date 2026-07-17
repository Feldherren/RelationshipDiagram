import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useDiagramStore } from "../../store/diagramStore";
import {
  BoxObjectIcon,
  CharacterObjectIcon,
  TextObjectIcon,
} from "../icons/AddObjectIcons";

export interface CanvasAddObjectMenuState {
  screenX: number;
  screenY: number;
  world: { x: number; y: number };
}

interface CanvasAddObjectMenuProps {
  menu: CanvasAddObjectMenuState | null;
  onClose: () => void;
}

// Fan above the click point: above-left, above, above-right (icons stay upright).
// Positive angles rotate clockwise (above-right), negative counter-clockwise (above-left).
const ARC_ANGLES = [-45, 0, 45] as const;

export function CanvasAddObjectMenu({ menu, onClose }: CanvasAddObjectMenuProps) {
  const { t } = useTranslation();
  const addCharacterAt = useDiagramStore((s) => s.addCharacterAt);
  const addBoxAt = useDiagramStore((s) => s.addBoxAt);
  const addFloatingTextAt = useDiagramStore((s) => s.addFloatingTextAt);

  useEffect(() => {
    if (!menu) return;

    const handlePointerDown = (e: MouseEvent) => {
      // Right-click dismiss is handled by the canvas contextmenu toggle.
      if (e.button === 2) return;
      const target = e.target as Node | null;
      if (
        target instanceof Element &&
        target.closest(".canvas-add-object-menu")
      ) {
        return;
      }
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

  const createWith = (add: (position: { x: number; y: number }) => void) => {
    add(menu.world);
    onClose();
  };

  const buttons = [
    {
      angle: ARC_ANGLES[0],
      label: t("context.addCharacter"),
      onClick: () => createWith(addCharacterAt),
      icon: <CharacterObjectIcon className="viewport-control-icon" size={20} />,
    },
    {
      angle: ARC_ANGLES[1],
      label: t("context.addBox"),
      onClick: () => createWith(addBoxAt),
      icon: <BoxObjectIcon className="viewport-control-icon" size={20} />,
    },
    {
      angle: ARC_ANGLES[2],
      label: t("context.addText"),
      onClick: () => createWith(addFloatingTextAt),
      icon: <TextObjectIcon className="viewport-control-icon" size={20} />,
    },
  ];

  return (
    <div
      className="canvas-add-object-menu"
      style={{ left: menu.screenX, top: menu.screenY }}
      role="toolbar"
      aria-label={t("context.addToolbar")}
    >
      <div className="canvas-add-object-menu-hub" aria-hidden="true">
        <span className="canvas-add-object-menu-hub-core" />
        <span className="canvas-add-object-menu-hub-pulse" />
      </div>
      {buttons.map((btn) => (
        <button
          key={btn.label}
          type="button"
          className="viewport-control-button canvas-add-object-menu-btn"
          style={{ "--arc-angle": `${btn.angle}deg` } as React.CSSProperties}
          title={btn.label}
          aria-label={btn.label}
          onClick={btn.onClick}
        >
          {btn.icon}
        </button>
      ))}
    </div>
  );
}
