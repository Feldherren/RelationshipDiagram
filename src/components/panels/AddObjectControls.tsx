import { useTranslation } from "react-i18next";
import { useDiagramStore } from "../../store/diagramStore";
import {
  BoxObjectIcon,
  CharacterObjectIcon,
  TextObjectIcon,
} from "../icons/AddObjectIcons";

export function AddObjectControls() {
  const { t } = useTranslation();
  const addCharacterAt = useDiagramStore((s) => s.addCharacterAt);
  const addBoxAt = useDiagramStore((s) => s.addBoxAt);
  const addFloatingTextAt = useDiagramStore((s) => s.addFloatingTextAt);
  const getViewportCenter = useDiagramStore((s) => s.getViewportCenter);

  const addAtCenter = (
    add: (position: { x: number; y: number }) => void,
  ) => {
    add(getViewportCenter());
  };

  return (
    <div className="add-object-controls-anchor">
      <div className="add-object-controls-row" role="toolbar" aria-label={t("context.addToolbar")}>
        <button
          type="button"
          className="viewport-control-button"
          title={t("context.addCharacter")}
          aria-label={t("context.addCharacter")}
          onClick={() => addAtCenter(addCharacterAt)}
        >
          <CharacterObjectIcon className="viewport-control-icon" size={20} />
        </button>
        <button
          type="button"
          className="viewport-control-button"
          title={t("context.addBox")}
          aria-label={t("context.addBox")}
          onClick={() => addAtCenter(addBoxAt)}
        >
          <BoxObjectIcon className="viewport-control-icon" size={20} />
        </button>
        <button
          type="button"
          className="viewport-control-button"
          title={t("context.addText")}
          aria-label={t("context.addText")}
          onClick={() => addAtCenter(addFloatingTextAt)}
        >
          <TextObjectIcon className="viewport-control-icon" size={20} />
        </button>
      </div>
    </div>
  );
}
