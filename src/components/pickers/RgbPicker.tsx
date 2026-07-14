import { useEffect, useRef, useState } from "react";
import type { RGB } from "../../models/types";
import {
  colorsEqual,
  parseHexColor,
  rgbToHex,
} from "../../models/types";
import { useRafCoalescedCallback } from "../../hooks/useRafCoalescedCallback";

const PASTEL_PALETTE: { label: string; color: RGB }[] = [
  { label: "Pastel red", color: { r: 248, g: 155, b: 155 } },
  { label: "Pastel orange", color: { r: 250, g: 197, b: 149 } },
  { label: "Pastel yellow", color: { r: 245, g: 226, b: 145 } },
  { label: "Pastel green", color: { r: 166, g: 222, b: 173 } },
  { label: "Pastel blue", color: { r: 150, g: 199, b: 246 } },
  { label: "Pastel indigo", color: { r: 170, g: 176, b: 245 } },
  { label: "Pastel violet", color: { r: 207, g: 154, b: 245 } },
];

interface RgbPickerProps {
  label: string;
  value: RGB;
  onChange: (value: RGB) => void;
}

export function RgbPicker({ label, value, onChange }: RgbPickerProps) {
  const colorInputRef = useRef<HTMLInputElement>(null);
  const draftRef = useRef(value);
  const hasPendingCommitRef = useRef(false);
  const [draft, setDraft] = useState(value);
  const [hexDraft, setHexDraft] = useState(() => rgbToHex(value));
  const [isEditingHex, setIsEditingHex] = useState(false);

  const commit = useRafCoalescedCallback(onChange);

  useEffect(() => {
    if (hasPendingCommitRef.current) {
      if (colorsEqual(value, draftRef.current)) {
        hasPendingCommitRef.current = false;
      }
      return;
    }
    draftRef.current = value;
    setDraft(value);
    if (!isEditingHex) {
      setHexDraft(rgbToHex(value));
    }
  }, [value, isEditingHex]);

  const applyColor = (color: RGB) => {
    hasPendingCommitRef.current = true;
    draftRef.current = color;
    setDraft(color);
    if (!isEditingHex) {
      setHexDraft(rgbToHex(color));
    }
    commit(color);
  };

  const selectedPreset = PASTEL_PALETTE.find((entry) =>
    colorsEqual(entry.color, draft),
  );
  const isCustom = !selectedPreset;

  const commitHex = (text: string) => {
    const parsed = parseHexColor(text);
    if (parsed) {
      applyColor(parsed);
      setHexDraft(rgbToHex(parsed));
    } else {
      setHexDraft(rgbToHex(draft));
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
              onClick={() => applyColor(entry.color)}
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
            value={rgbToHex(draft)}
            onChange={(e) =>
              applyColor(parseHexColor(e.target.value) ?? draft)
            }
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
            if (parsed) applyColor(parsed);
          }}
          onBlur={() => commitHex(hexDraft)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commitHex(hexDraft);
              (e.target as HTMLInputElement).blur();
            }
            if (e.key === "Escape") {
              setHexDraft(rgbToHex(draft));
              setIsEditingHex(false);
              (e.target as HTMLInputElement).blur();
            }
          }}
        />
      </div>
    </div>
  );
}
