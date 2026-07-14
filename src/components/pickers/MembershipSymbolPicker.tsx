import type { MembershipSymbol } from "../../models/types";
import { MEMBERSHIP_SYMBOLS } from "../../models/types";
import { MembershipSymbolIcon } from "./MembershipSymbolIcon";

interface MembershipSymbolPickerProps {
  value: MembershipSymbol;
  onChange: (value: MembershipSymbol) => void;
}

export function MembershipSymbolPicker({
  value,
  onChange,
}: MembershipSymbolPickerProps) {
  return (
    <div className="field color-picker">
      <span>Symbol</span>
      <div className="color-picker-row symbol-picker-row">
        {MEMBERSHIP_SYMBOLS.map((entry) => {
          const selected = value === entry.value;
          return (
            <button
              key={entry.value}
              type="button"
              className={`symbol-swatch${selected ? " selected" : ""}`}
              title={entry.label}
              aria-label={entry.label}
              aria-pressed={selected}
              onClick={() => onChange(entry.value)}
            >
              <MembershipSymbolIcon
                symbol={entry.value}
                label={entry.label}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
