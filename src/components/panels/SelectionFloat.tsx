import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { useDiagramStore } from "../../store/diagramStore";
import { RgbPicker } from "../pickers/RgbPicker";
import { ShapePicker } from "../pickers/ShapePicker";
import type { LineStyle } from "../../models/types";
import {
  DEFAULT_FLOATING_TEXT_COLOR,
  DEFAULT_FLOATING_TEXT_FONT_SIZE,
  MIN_FLOATING_TEXT_FONT_SIZE,
  rgbToCss,
} from "../../models/types";
import {
  getBoxById,
  getCharacterById,
  getCharactersContainedInBox,
  getFloatingTextById,
} from "../../utils/geometry";
import { DEFAULT_IMAGE_FOCUS } from "../../utils/imageLayout";
import { ImageFocusControls } from "./ImageFocusControls";
import {
  getSelectionAnchorWorld,
  placeSelectionFloat,
  SELECTION_FLOAT_WIDTH,
  worldToScreen,
} from "../../utils/selectionAnchor";

const LINE_STYLES: { value: LineStyle; label: string }[] = [
  { value: "straight", label: "Straight" },
  { value: "wavy", label: "Wavy" },
  { value: "dotted", label: "Dotted" },
  { value: "jagged", label: "Jagged" },
];

const ESTIMATED_FLOAT_HEIGHT = 280;

export function SelectionFloat() {
  const panelRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [panelHeight, setPanelHeight] = useState(ESTIMATED_FLOAT_HEIGHT);

  const selection = useDiagramStore((s) => s.selection);
  const characters = useDiagramStore((s) => s.characters);
  const lines = useDiagramStore((s) => s.lines);
  const groups = useDiagramStore((s) => s.groups);
  const boxes = useDiagramStore((s) => s.boxes);
  const floatingTexts = useDiagramStore((s) => s.floatingTexts);
  const viewport = useDiagramStore((s) => s.viewport);
  const stageSize = useDiagramStore((s) => s.stageSize);
  const getDiagram = useDiagramStore((s) => s.getDiagram);
  const updateCharacter = useDiagramStore((s) => s.updateCharacter);
  const updateLine = useDiagramStore((s) => s.updateLine);
  const updateBox = useDiagramStore((s) => s.updateBox);
  const updateFloatingText = useDiagramStore((s) => s.updateFloatingText);
  const toggleBoxCollapse = useDiagramStore((s) => s.toggleBoxCollapse);
  const addCharacterToGroup = useDiagramStore((s) => s.addCharacterToGroup);
  const removeCharacterFromGroup = useDiagramStore(
    (s) => s.removeCharacterFromGroup,
  );
  const deleteSelected = useDiagramStore((s) => s.deleteSelected);

  useLayoutEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    const height = el.offsetHeight;
    if (height > 0 && Math.abs(height - panelHeight) > 1) {
      setPanelHeight(height);
    }
  }, [selection, characters, lines, groups, boxes, floatingTexts, panelHeight]);

  if (!selection || selection.type === "group") {
    return null;
  }

  const diagram = getDiagram();
  const anchorWorld = getSelectionAnchorWorld(selection, diagram);
  if (!anchorWorld) return null;

  const anchorScreen = worldToScreen(anchorWorld, viewport);
  const { left, top } = placeSelectionFloat({
    anchorScreen,
    stageWidth: stageSize.width,
    stageHeight: stageSize.height,
    panelWidth: SELECTION_FLOAT_WIDTH,
    panelHeight,
  });

  let body: ReactNode = null;

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

    body = (
      <>
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
        {character.imageData && (
          <details className="float-details">
            <summary>Adjust image crop</summary>
            <ImageFocusControls character={character} />
          </details>
        )}
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
            <p className="hint">
              No groups yet. Use the Groups toolbar button to add one.
            </p>
          ) : (
            <div className="membership-checklist">
              {groups.map((group) => {
                const checked = group.memberCharacterIds.includes(character.id);
                return (
                  <label
                    key={group.id}
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
      </>
    );
  } else if (selection.type === "line") {
    const line = lines.find((l) => l.id === selection.id);
    if (!line) return null;

    body = (
      <>
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
      </>
    );
  } else if (selection.type === "box") {
    const box = getBoxById({ boxes }, selection.id);
    if (!box) return null;
    const contained = getCharactersContainedInBox(box, characters);

    body = (
      <>
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
      </>
    );
  } else if (selection.type === "floatingText") {
    const floatingText = getFloatingTextById(
      { floatingTexts },
      selection.id,
    );
    if (!floatingText) return null;

    const color = floatingText.color ?? DEFAULT_FLOATING_TEXT_COLOR;
    const fontSize =
      floatingText.fontSize || DEFAULT_FLOATING_TEXT_FONT_SIZE;

    const commitFontSize = (raw: string) => {
      const parsed = Number(raw);
      if (!Number.isFinite(parsed)) {
        updateFloatingText(floatingText.id, { fontSize });
        return;
      }
      updateFloatingText(floatingText.id, {
        fontSize: Math.max(MIN_FLOATING_TEXT_FONT_SIZE, Math.round(parsed)),
      });
    };

    body = (
      <>
        <h2>Text</h2>
        <label className="field">
          <span>Text</span>
          <input
            type="text"
            value={floatingText.text}
            placeholder="Text"
            onChange={(e) =>
              updateFloatingText(floatingText.id, { text: e.target.value })
            }
          />
        </label>
        <RgbPicker
          label="Colour"
          value={color}
          onChange={(nextColor) =>
            updateFloatingText(floatingText.id, { color: nextColor })
          }
        />
        <label className="field">
          <span>Font size</span>
          <input
            type="number"
            min={MIN_FLOATING_TEXT_FONT_SIZE}
            step={1}
            value={fontSize}
            onChange={(e) => {
              if (e.target.value.trim() === "") return;
              const parsed = Number(e.target.value);
              if (!Number.isFinite(parsed)) return;
              updateFloatingText(floatingText.id, {
                fontSize: Math.round(parsed),
              });
            }}
            onBlur={(e) => commitFontSize(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commitFontSize((e.target as HTMLInputElement).value);
                (e.target as HTMLInputElement).blur();
              }
            }}
          />
        </label>
        <button type="button" className="btn-danger" onClick={deleteSelected}>
          Delete text
        </button>
      </>
    );
  }

  if (!body) return null;

  return (
    <aside
      ref={panelRef}
      className="selection-float"
      style={{ left, top, width: SELECTION_FLOAT_WIDTH }}
      onMouseDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {body}
    </aside>
  );
}
