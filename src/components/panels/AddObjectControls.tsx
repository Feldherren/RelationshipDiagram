import { useDiagramStore } from "../../store/diagramStore";
import { AddObjectButtonRow } from "./AddObjectButtonRow";

export function AddObjectControls() {
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
      <AddObjectButtonRow
        onAddCharacter={() => addAtCenter(addCharacterAt)}
        onAddBox={() => addAtCenter(addBoxAt)}
        onAddText={() => addAtCenter(addFloatingTextAt)}
      />
    </div>
  );
}
