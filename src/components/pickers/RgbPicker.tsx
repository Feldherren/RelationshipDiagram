import type { RGB } from "../../models/types";
import { rgbToCss } from "../../models/types";

interface RgbPickerProps {
  label: string;
  value: RGB;
  onChange: (value: RGB) => void;
}

export function RgbPicker({ label, value, onChange }: RgbPickerProps) {
  const hex =
    "#" +
    [value.r, value.g, value.b]
      .map((c) => c.toString(16).padStart(2, "0"))
      .join("");

  const handleHex = (hexValue: string) => {
    const parsed = hexValue.replace("#", "");
    if (parsed.length !== 6) return;
    const r = parseInt(parsed.slice(0, 2), 16);
    const g = parseInt(parsed.slice(2, 4), 16);
    const b = parseInt(parsed.slice(4, 6), 16);
    if ([r, g, b].some((n) => Number.isNaN(n))) return;
    onChange({ r, g, b });
  };

  return (
    <label className="field">
      <span>{label}</span>
      <div className="rgb-row">
        <input
          type="color"
          value={hex}
          onChange={(e) => handleHex(e.target.value)}
        />
        <input
          type="text"
          value={`${value.r}, ${value.g}, ${value.b}`}
          readOnly
          className="rgb-readout"
          style={{ borderColor: rgbToCss(value) }}
        />
      </div>
    </label>
  );
}
