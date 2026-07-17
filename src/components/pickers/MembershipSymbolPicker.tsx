import { useSyncExternalStore, type CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import type { MembershipSymbol } from "../../models/types";
import { MEMBERSHIP_SYMBOLS } from "../../models/types";
import {
  resolveSymbolSwatchStyle,
  subscribeUiChrome,
  SYMBOL_SWATCH_ON_LIGHT,
  type SymbolSwatchStyle,
} from "../../utils/symbolSwatchStyle";
import { MembershipSymbolIcon } from "./MembershipSymbolIcon";

interface MembershipSymbolPickerProps {
  value: MembershipSymbol;
  onChange: (value: MembershipSymbol) => void;
}

let cachedSwatchStyle: SymbolSwatchStyle = SYMBOL_SWATCH_ON_LIGHT;

function getSymbolSwatchStyleSnapshot(): SymbolSwatchStyle {
  const next = resolveSymbolSwatchStyle();
  if (
    next.background === cachedSwatchStyle.background &&
    next.foreground === cachedSwatchStyle.foreground
  ) {
    return cachedSwatchStyle;
  }
  cachedSwatchStyle = next;
  return cachedSwatchStyle;
}

export function MembershipSymbolPicker({
  value,
  onChange,
}: MembershipSymbolPickerProps) {
  const { t } = useTranslation();
  const swatchStyle = useSyncExternalStore(
    subscribeUiChrome,
    getSymbolSwatchStyleSnapshot,
    () => SYMBOL_SWATCH_ON_LIGHT,
  );

  return (
    <div className="field color-picker">
      <span>{t("symbol.label")}</span>
      <div
        className="color-picker-row symbol-picker-row"
        style={
          {
            "--symbol-swatch-bg": swatchStyle.background,
            "--symbol-swatch-fg": swatchStyle.foreground,
          } as CSSProperties
        }
      >
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
