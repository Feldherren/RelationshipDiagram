import { useEffect, useRef, useState } from "react";
import type { RGB } from "../../models/types";
import {
  colorsEqual,
  parseHexColor,
  rgbToHex,
} from "../../models/types";

const PASTEL_PALETTE: { label: string; color: RGB }[] = [
  { label: "Pastel red", color: { r: 255, g: 179, b: 179 } },
  { label: "Pastel orange", color: { r: 255, g: 217, b: 179 } },
  { label: "Pastel yellow", color: { r: 255, g: 245, b: 179 } },
  { label: "Pastel green", color: { r: 200, g: 240, b: 200 } },
  { label: "Pastel blue", color: { r: 179, g: 217, b: 255 } },
  { label: "Pastel indigo", color: { r: 196, g: 200, b: 255 } },
  { label: "Pastel violet", color: { r: 224, g: 179, b: 255 } },
];

interface RgbPickerProps {
  label: string;
  value: RGB;
  onChange: (value: RGB) => void;
}

export function RgbPicker({ label, value, onChange }: RgbPickerProps) {
  const colorInputRef = useRef<HTMLInputElement>(null);
  const [hexDraft, setHexDraft] = useState(() => rgbToHex(value));
  const [isEditingHex, setIsEditingHex] = useState(false);

  const selectedPreset = PASTEL_PALETTE.find((entry) =>
    colorsEqual(entry.color, value),
  );
  const isCustom = !selectedPreset;

  useEffect(() => {
    if (!isEditingHex) {
      setHexDraft(rgbToHex(value));
    }
  }, [value, isEditingHex]);

  const commitHex = (text: string) => {
    const parsed = parseHexColor(text);
    if (parsed) {
      onChange(parsed);
      setHexDraft(rgbToHex(parsed));
    } else {
      setHexDraft(rgbToHex(value));
    }
    setIsEditingHex(false);
  };

  return (
    <div className="field color-picker">
      <span>{label}</span>
      <div className="color-picker-row">
        {PASTEL_PALETTE.map((entry) => {
          const selected = selectedPreset?.label === entry.label;
          return (
            <button
              key={entry.label}
              type="button"
              className={`color-swatch${selected ? " selected" : ""}`}
              title={entry.label}
              aria-label={entry.label}
              aria-pressed={selected}
              style={{ backgroundColor: rgbToHex(entry.color) }}
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
            value={rgbToHex(value)}
            onChange={(e) => onChange(parseHexColor(e.target.value) ?? value)}
            tabIndex={-1}
            aria-hidden
          />
        </button>
        <input
          type="text"
          className="color-hex-input"
          value={hexDraft}
          spellCheck={false}
          aria-label={`${label} hex code`}
          onFocus={() => setIsEditingHex(true)}
          onChange={(e) => {
            const next = e.target.value;
            setHexDraft(next);
            const parsed = parseHexColor(next);
            if (parsed) onChange(parsed);
          }}
          onBlur={() => commitHex(hexDraft)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commitHex(hexDraft);
              (e.target as HTMLInputElement).blur();
            }
            if (e.key === "Escape") {
              setHexDraft(rgbToHex(value));
              setIsEditingHex(false);
              (e.target as HTMLInputElement).blur();
            }
          }}
        />
      </div>
    </div>
  );
}
