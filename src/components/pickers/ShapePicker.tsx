import { useTranslation } from "react-i18next";
import type { BorderShape } from "../../models/types";

const SHAPES: BorderShape[] = ["circle", "square", "pentagon", "hexagon"];

interface ShapePickerProps {
  value: BorderShape;
  onChange: (value: BorderShape) => void;
}

export function ShapePicker({ value, onChange }: ShapePickerProps) {
  const { t } = useTranslation();

  return (
    <label className="field">
      <span>{t("shape.borderShape")}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as BorderShape)}
      >
        {SHAPES.map((shape) => (
          <option key={shape} value={shape}>
            {t(`shape.${shape}`)}
          </option>
        ))}
      </select>
    </label>
  );
}
