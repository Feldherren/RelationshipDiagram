import type { BorderShape } from "../../models/types";

const SHAPES: { value: BorderShape; label: string }[] = [
  { value: "circle", label: "Circle" },
  { value: "square", label: "Square" },
  { value: "pentagon", label: "Pentagon" },
  { value: "hexagon", label: "Hexagon" },
];

interface ShapePickerProps {
  value: BorderShape;
  onChange: (value: BorderShape) => void;
}

export function ShapePicker({ value, onChange }: ShapePickerProps) {
  return (
    <label className="field">
      <span>Border shape</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as BorderShape)}
      >
        {SHAPES.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
    </label>
  );
}
