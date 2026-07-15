import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();

  return (
    <div className="field color-picker">
      <span>{t("symbol.label")}</span>
      <div className="color-picker-row symbol-picker-row">
        {MEMBERSHIP_SYMBOLS.map((symbol) => {
          const selected = value === symbol;
          const label = t(`symbol.${symbol}`);
          return (
            <button
              key={symbol}
              type="button"
              className={`symbol-swatch${selected ? " selected" : ""}`}
              title={label}
              aria-label={label}
              aria-pressed={selected}
              onClick={() => onChange(symbol)}
            >
              <MembershipSymbolIcon symbol={symbol} label={label} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
