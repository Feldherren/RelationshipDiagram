import { useTranslation } from "react-i18next";
import {
  BoxObjectIcon,
  CharacterObjectIcon,
  TextObjectIcon,
} from "../icons/AddObjectIcons";

interface AddObjectButtonRowProps {
  className?: string;
  onAddCharacter: () => void;
  onAddBox: () => void;
  onAddText: () => void;
}

export function AddObjectButtonRow({
  className,
  onAddCharacter,
  onAddBox,
  onAddText,
}: AddObjectButtonRowProps) {
  const { t } = useTranslation();

  return (
    <div
      className={className ?? "add-object-controls-row"}
      role="toolbar"
      aria-label={t("context.addToolbar")}
    >
      <button
        type="button"
        className="viewport-control-button"
        title={t("context.addCharacter")}
        aria-label={t("context.addCharacter")}
        onClick={onAddCharacter}
      >
        <CharacterObjectIcon className="viewport-control-icon" size={20} />
      </button>
      <button
        type="button"
        className="viewport-control-button"
        title={t("context.addBox")}
        aria-label={t("context.addBox")}
        onClick={onAddBox}
      >
        <BoxObjectIcon className="viewport-control-icon" size={20} />
      </button>
      <button
        type="button"
        className="viewport-control-button"
        title={t("context.addText")}
        aria-label={t("context.addText")}
        onClick={onAddText}
      >
        <TextObjectIcon className="viewport-control-icon" size={20} />
      </button>
    </div>
  );
}
