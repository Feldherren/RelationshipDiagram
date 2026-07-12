import useImage from "use-image";
import type { Character } from "../../models/types";
import {
  getCoverImageExcess,
  resolveImageFocus,
} from "../../utils/imageLayout";
import { useDiagramStore } from "../../store/diagramStore";

interface ImageFocusControlsProps {
  character: Character;
}

export function ImageFocusControls({ character }: ImageFocusControlsProps) {
  const updateCharacter = useDiagramStore((s) => s.updateCharacter);
  const [image] = useImage(character.imageData ?? "", "anonymous");
  const focus = resolveImageFocus(character.imageFocus);
  const excess = image
    ? getCoverImageExcess(image, character.size)
    : { excessX: 0, excessY: 0 };

  const updateFocus = (patch: Partial<{ x: number; y: number }>) => {
    const current = useDiagramStore
      .getState()
      .characters.find((c) => c.id === character.id);
    const nextFocus = resolveImageFocus(current?.imageFocus);
    updateCharacter(character.id, {
      imageFocus: { ...nextFocus, ...patch },
    });
  };

  return (
    <>
      <label className="field">
        <span>Image vertical position</span>
        <div className="range-row">
          <span className="range-end">Top</span>
          <input
            type="range"
            min={0}
            max={100}
            disabled={excess.excessY < 1}
            value={Math.round(focus.y * 100)}
            onChange={(e) => updateFocus({ y: Number(e.target.value) / 100 })}
          />
          <span className="range-end">Bottom</span>
        </div>
        {excess.excessY < 1 && (
          <span className="hint-inline">No vertical crop room for this image.</span>
        )}
      </label>
      <label className="field">
        <span>Image horizontal position</span>
        <div className="range-row">
          <span className="range-end">Left</span>
          <input
            type="range"
            min={0}
            max={100}
            disabled={excess.excessX < 1}
            value={Math.round(focus.x * 100)}
            onChange={(e) => updateFocus({ x: Number(e.target.value) / 100 })}
          />
          <span className="range-end">Right</span>
        </div>
        {excess.excessX < 1 && (
          <span className="hint-inline">No horizontal crop room for this image.</span>
        )}
      </label>
    </>
  );
}
