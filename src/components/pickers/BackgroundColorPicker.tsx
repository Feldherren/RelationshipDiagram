import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { RGB } from "../../models/types";
import { colorsEqual, parseHexColor } from "../../models/types";
import type { DiagramBackgroundColor } from "../../utils/diagramBackground";
import {
  BACKGROUND_PRESETS,
  backgroundColorForPicker,
  backgroundHexForPicker,
  findBackgroundPreset,
} from "../../utils/diagramBackground";
import { useRafCoalescedCallback } from "../../hooks/useRafCoalescedCallback";

interface BackgroundColorPickerProps {
  label: string;
  value: DiagramBackgroundColor;
  onChange: (value: DiagramBackgroundColor) => void;
}

function backgroundColorsEqual(
  a: DiagramBackgroundColor,
  b: DiagramBackgroundColor,
): boolean {
  if (a === null || b === null) return a === b;
  return colorsEqual(a, b);
}

export function BackgroundColorPicker({
  label,
  value,
  onChange,
}: BackgroundColorPickerProps) {
  const { t } = useTranslation();
  const colorInputRef = useRef<HTMLInputElement>(null);
  const draftRef = useRef(value);
  const hasPendingCommitRef = useRef(false);
  const [draft, setDraft] = useState(value);
  const [hexDraft, setHexDraft] = useState(() => backgroundHexForPicker(value));
  const [isEditingHex, setIsEditingHex] = useState(false);

  const commit = useRafCoalescedCallback(onChange);

  useEffect(() => {
    if (hasPendingCommitRef.current) {
      if (backgroundColorsEqual(value, draftRef.current)) {
        hasPendingCommitRef.current = false;
      }
      return;
    }
    draftRef.current = value;
    setDraft(value);
    if (!isEditingHex) {
      setHexDraft(backgroundHexForPicker(value));
    }
  }, [value, isEditingHex]);

  const applyColor = (color: DiagramBackgroundColor) => {
    hasPendingCommitRef.current = true;
    draftRef.current = color;
    setDraft(color);
    if (!isEditingHex) {
      setHexDraft(backgroundHexForPicker(color));
    }
    commit(color);
  };

  const selectedPreset = findBackgroundPreset(draft);
  const isCustom = !selectedPreset;

  const commitHex = (text: string) => {
    const parsed = parseHexColor(text);
    if (parsed) {
      applyColor(parsed);
      setHexDraft(backgroundHexForPicker(parsed));
    } else {
      setHexDraft(backgroundHexForPicker(draft));
    }
    setIsEditingHex(false);
  };

  const handleCustomColor = (color: RGB) => {
    applyColor(color);
  };

  return (
    <div className="field color-picker">
      <span>{label}</span>
      <div className="color-picker-row">
        {BACKGROUND_PRESETS.map((entry) => {
          const selected = selectedPreset?.id === entry.id;
          const swatchLabel = t(`background.${entry.id}`);
          return (
            <button
              key={entry.id}
              type="button"
              className={`color-swatch${
                entry.color === null ? " color-swatch-transparent" : ""
              }${selected ? " selected" : ""}`}
              title={swatchLabel}
              aria-label={swatchLabel}
              aria-pressed={selected}
              style={
                entry.color
                  ? { backgroundColor: backgroundHexForPicker(entry.color) }
                  : undefined
              }
              onClick={() => applyColor(entry.color)}
            />
          );
        })}
        <button
          type="button"
          className={`color-swatch color-swatch-custom${isCustom ? " selected" : ""}`}
          title={t("colour.custom")}
          aria-label={t("colour.custom")}
          aria-pressed={isCustom}
          onClick={() => colorInputRef.current?.click()}
        >
          <input
            ref={colorInputRef}
            type="color"
            className="color-input-hidden"
            value={backgroundHexForPicker(draft)}
            onChange={(e) =>
              handleCustomColor(
                parseHexColor(e.target.value) ??
                  backgroundColorForPicker(draft),
              )
            }
            tabIndex={-1}
            aria-hidden
          />
        </button>
        <input
          type="text"
          className="color-hex-input"
          value={draft === null ? "transparent" : hexDraft}
          readOnly={draft === null}
          spellCheck={false}
          aria-label={t("colour.hexAria", { label })}
          onFocus={() => {
            if (draft === null) return;
            setIsEditingHex(true);
          }}
          onChange={(e) => {
            if (draft === null) return;
            const next = e.target.value;
            setHexDraft(next);
            const parsed = parseHexColor(next);
            if (parsed) applyColor(parsed);
          }}
          onBlur={() => {
            if (draft === null) return;
            commitHex(hexDraft);
          }}
          onKeyDown={(e) => {
            if (draft === null) return;
            if (e.key === "Enter") {
              e.preventDefault();
              commitHex(hexDraft);
              (e.target as HTMLInputElement).blur();
            }
            if (e.key === "Escape") {
              setHexDraft(backgroundHexForPicker(draft));
              setIsEditingHex(false);
              (e.target as HTMLInputElement).blur();
            }
          }}
        />
      </div>
    </div>
  );
}
