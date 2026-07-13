import { useEffect, useRef, useState } from "react";
import type { RGB } from "../../models/types";
import { parseHexColor } from "../../models/types";
import type { DiagramBackgroundColor } from "../../utils/diagramBackground";
import {
  BACKGROUND_PRESETS,
  backgroundColorForPicker,
  backgroundHexForPicker,
  findBackgroundPreset,
} from "../../utils/diagramBackground";

interface BackgroundColorPickerProps {
  label: string;
  value: DiagramBackgroundColor;
  onChange: (value: DiagramBackgroundColor) => void;
}

export function BackgroundColorPicker({
  label,
  value,
  onChange,
}: BackgroundColorPickerProps) {
  const colorInputRef = useRef<HTMLInputElement>(null);
  const [hexDraft, setHexDraft] = useState(() => backgroundHexForPicker(value));
  const [isEditingHex, setIsEditingHex] = useState(false);

  const selectedPreset = findBackgroundPreset(value);
  const isCustom = !selectedPreset;

  useEffect(() => {
    if (!isEditingHex) {
      setHexDraft(backgroundHexForPicker(value));
    }
  }, [value, isEditingHex]);

  const commitHex = (text: string) => {
    const parsed = parseHexColor(text);
    if (parsed) {
      onChange(parsed);
      setHexDraft(backgroundHexForPicker(parsed));
    } else {
      setHexDraft(backgroundHexForPicker(value));
    }
    setIsEditingHex(false);
  };

  const handleCustomColor = (color: RGB) => {
    onChange(color);
  };

  return (
    <div className="field color-picker">
      <span>{label}</span>
      <div className="color-picker-row">
        {BACKGROUND_PRESETS.map((entry) => {
          const selected = selectedPreset?.label === entry.label;
          return (
            <button
              key={entry.label}
              type="button"
              className={`color-swatch${
                entry.color === null ? " color-swatch-transparent" : ""
              }${selected ? " selected" : ""}`}
              title={entry.label}
              aria-label={entry.label}
              aria-pressed={selected}
              style={
                entry.color
                  ? { backgroundColor: backgroundHexForPicker(entry.color) }
                  : undefined
              }
              onClick={() => onChange(entry.color)}
            />
          );
        })}
        <button
          type="button"
          className={`color-swatch color-swatch-custom${isCustom ? " selected" : ""}`}
          title="Custom colour"
          aria-label="Custom colour"
          aria-pressed={isCustom}
          onClick={() => colorInputRef.current?.click()}
        >
          <input
            ref={colorInputRef}
            type="color"
            className="color-input-hidden"
            value={backgroundHexForPicker(value)}
            onChange={(e) =>
              handleCustomColor(
                parseHexColor(e.target.value) ?? backgroundColorForPicker(value),
              )
            }
            tabIndex={-1}
            aria-hidden
          />
        </button>
        <input
          type="text"
          className="color-hex-input"
          value={value === null ? "transparent" : hexDraft}
          readOnly={value === null}
          spellCheck={false}
          aria-label={`${label} hex code`}
          onFocus={() => {
            if (value === null) return;
            setIsEditingHex(true);
          }}
          onChange={(e) => {
            if (value === null) return;
            const next = e.target.value;
            setHexDraft(next);
            const parsed = parseHexColor(next);
            if (parsed) onChange(parsed);
          }}
          onBlur={() => {
            if (value === null) return;
            commitHex(hexDraft);
          }}
          onKeyDown={(e) => {
            if (value === null) return;
            if (e.key === "Enter") {
              e.preventDefault();
              commitHex(hexDraft);
              (e.target as HTMLInputElement).blur();
            }
            if (e.key === "Escape") {
              setHexDraft(backgroundHexForPicker(value));
              setIsEditingHex(false);
              (e.target as HTMLInputElement).blur();
            }
          }}
        />
      </div>
    </div>
  );
}
