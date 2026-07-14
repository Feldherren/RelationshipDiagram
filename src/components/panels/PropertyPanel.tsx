import { useRef } from "react";
import { useDiagramStore } from "../../store/diagramStore";
import { RgbPicker } from "../pickers/RgbPicker";
import { ShapePicker } from "../pickers/ShapePicker";
import type { LineStyle } from "../../models/types";
import {
  getBoxById,
  getCharacterById,
  getCharactersContainedInBox,
  getGroupById,
} from "../../utils/geometry";
import { DEFAULT_IMAGE_FOCUS } from "../../utils/imageLayout";
import { ImageFocusControls } from "./ImageFocusControls";
import { rgbToCss } from "../../models/types";

const LINE_STYLES: { value: LineStyle; label: string }[] = [
  { value: "straight", label: "Straight" },
  { value: "wavy", label: "Wavy" },
  { value: "dotted", label: "Dotted" },
  { value: "jagged", label: "Jagged" },
];

export function PropertyPanel() {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const selection = useDiagramStore((s) => s.selection);
  const characters = useDiagramStore((s) => s.characters);
  const lines = useDiagramStore((s) => s.lines);
  const groups = useDiagramStore((s) => s.groups);
  const boxes = useDiagramStore((s) => s.boxes);
  const updateCharacter = useDiagramStore((s) => s.updateCharacter);
  const updateLine = useDiagramStore((s) => s.updateLine);
  const updateGroup = useDiagramStore((s) => s.updateGroup);
  const updateBox = useDiagramStore((s) => s.updateBox);
  const toggleBoxCollapse = useDiagramStore((s) => s.toggleBoxCollapse);
  const addCharacterToGroup = useDiagramStore((s) => s.addCharacterToGroup);
  const removeCharacterFromGroup = useDiagramStore(
    (s) => s.removeCharacterFromGroup,
  );
  const deleteSelected = useDiagramStore((s) => s.deleteSelected);

  if (!selection) {
    return null;
  }

  if (selection.type === "character") {
    const character = getCharacterById({ characters }, selection.id);
    if (!character) return null;

    const handleImage = (file: File | null) => {
      if (!file) {
        updateCharacter(character.id, { imageData: undefined });
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        updateCharacter(character.id, {
          imageData: reader.result as string,
          imageFocus: DEFAULT_IMAGE_FOCUS,
        });
      };
      reader.readAsDataURL(file);
    };

    const handleRemoveImage = () => {
      updateCharacter(character.id, {
        imageData: undefined,
        imageFocus: undefined,
      });
      if (imageInputRef.current) {
        imageInputRef.current.value = "";
      }
    };

    return (
      <aside className="property-panel">
        <h2>Character</h2>
        <label className="field">
          <span>Name</span>
          <input
            type="text"
            value={character.name}
            placeholder="Nameless"
            onChange={(e) =>
              updateCharacter(character.id, { name: e.target.value })
            }
          />
        </label>
        <label className="field">
          <span>Subtitle</span>
          <input
            type="text"
            value={character.subtitle ?? ""}
            onChange={(e) =>
              updateCharacter(character.id, {
                subtitle: e.target.value || undefined,
              })
            }
          />
        </label>
        <div className="field">
          <span>Image</span>
          <input
            key={character.id}
            ref={imageInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => handleImage(e.target.files?.[0] ?? null)}
          />
          {character.imageData && (
            <button
              type="button"
              className="btn-secondary"
              onClick={handleRemoveImage}
            >
              Remove image
            </button>
          )}
        </div>
        {character.imageData && <ImageFocusControls character={character} />}
        <ShapePicker
          value={character.borderShape}
          onChange={(borderShape) =>
            updateCharacter(character.id, { borderShape })
          }
        />
        <RgbPicker
          label="Border colour"
          value={character.borderColor}
          onChange={(borderColor) =>
            updateCharacter(character.id, { borderColor })
          }
        />
        <label className="field">
          <span>Size</span>
          <input
            type="range"
            min={24}
            max={80}
            value={character.size}
            onChange={(e) =>
              updateCharacter(character.id, {
                size: Number(e.target.value),
              })
            }
          />
        </label>
        <div className="field">
          <span>Groups</span>
          {groups.length === 0 ? (
            <p className="hint">No groups yet. Right-click the canvas to add one.</p>
          ) : (
            <div className="membership-checklist">
              {groups.map((group) => {
                const checked = group.memberCharacterIds.includes(character.id);
                return (
                  <label key={group.id} className="field checkbox membership-row">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        if (e.target.checked) {
                          addCharacterToGroup(character.id, group.id);
                        } else {
                          removeCharacterFromGroup(character.id, group.id);
                        }
                      }}
                    />
                    <span
                      className="membership-swatch"
                      style={{
                        background: rgbToCss(group.appearance.backgroundColor),
                      }}
                      aria-hidden
                    />
                    <span>{group.name}</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>
        <button type="button" className="btn-danger" onClick={deleteSelected}>
          Delete character
        </button>
      </aside>
    );
  }

  if (selection.type === "line") {
    const line = lines.find((l) => l.id === selection.id);
    if (!line) return null;

    return (
      <aside className="property-panel">
        <h2>Line</h2>
        <label className="field">
          <span>Label</span>
          <input
            type="text"
            value={line.label ?? ""}
            onChange={(e) =>
              updateLine(line.id, { label: e.target.value || undefined })
            }
          />
        </label>
        <label className="field">
          <span>Style</span>
          <select
            value={line.style}
            onChange={(e) =>
              updateLine(line.id, { style: e.target.value as LineStyle })
            }
          >
            {LINE_STYLES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <RgbPicker
          label="Line colour"
          value={line.color}
          onChange={(color) => updateLine(line.id, { color })}
        />
        <label className="field checkbox">
          <input
            type="checkbox"
            checked={line.startArrow}
            onChange={(e) =>
              updateLine(line.id, { startArrow: e.target.checked })
            }
          />
          <span>Arrow at start</span>
        </label>
        <label className="field checkbox">
          <input
            type="checkbox"
            checked={line.endArrow}
            onChange={(e) =>
              updateLine(line.id, { endArrow: e.target.checked })
            }
          />
          <span>Arrow at end</span>
        </label>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => updateLine(line.id, { bend: 0 })}
        >
          Reset curve
        </button>
        <button type="button" className="btn-danger" onClick={deleteSelected}>
          Delete line
        </button>
      </aside>
    );
  }

  if (selection.type === "box") {
    const box = getBoxById({ boxes }, selection.id);
    if (!box) return null;
    const contained = getCharactersContainedInBox(box, characters);

    return (
      <aside className="property-panel">
        <h2>Box</h2>
        <label className="field">
          <span>Name</span>
          <input
            type="text"
            value={box.name}
            onChange={(e) => updateBox(box.id, { name: e.target.value })}
          />
        </label>
        <RgbPicker
          label="Border colour"
          value={box.borderColor}
          onChange={(borderColor) => updateBox(box.id, { borderColor })}
        />
        <p className="hint">
          {contained.length} character(s) inside (by position)
        </p>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => toggleBoxCollapse(box.id)}
        >
          {box.collapsed ? "Expand box" : "Collapse box"}
        </button>
        <p className="hint">Double-click box on canvas to toggle collapse.</p>
        <button type="button" className="btn-danger" onClick={deleteSelected}>
          Delete box
        </button>
      </aside>
    );
  }

  if (selection.type === "group") {
    const group = getGroupById({ groups }, selection.id);
    if (!group) return null;

    return (
      <aside className="property-panel">
        <h2>Group</h2>
        <p className="hint">
          Membership chips appear on characters. Selecting a group highlights
          its members.
        </p>
        <label className="field">
          <span>Name</span>
          <input
            type="text"
            value={group.name}
            onChange={(e) => updateGroup(group.id, { name: e.target.value })}
          />
        </label>
        <RgbPicker
          label="Chip colour"
          value={group.appearance.backgroundColor}
          onChange={(backgroundColor) =>
            updateGroup(group.id, { appearance: { backgroundColor } })
          }
        />
        <div className="field">
          <span>Members ({group.memberCharacterIds.length})</span>
          {characters.length === 0 ? (
            <p className="hint">No characters to assign.</p>
          ) : (
            <div className="membership-checklist">
              {characters.map((character) => {
                const checked = group.memberCharacterIds.includes(character.id);
                const label = character.name.trim() || "Nameless";
                return (
                  <label
                    key={character.id}
                    className="field checkbox membership-row"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        if (e.target.checked) {
                          addCharacterToGroup(character.id, group.id);
                        } else {
                          removeCharacterFromGroup(character.id, group.id);
                        }
                      }}
                    />
                    <span>{label}</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>
        <button type="button" className="btn-danger" onClick={deleteSelected}>
          Delete group
        </button>
      </aside>
    );
  }

  return null;
}
