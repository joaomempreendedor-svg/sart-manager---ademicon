"use client";

import * as React from "react";

import { Input } from "@/components/ui/input";
import { formatCurrencyBRL, parseImportMoney } from "@/lib/commissionImport";

interface CurrencyInputProps extends Omit<React.ComponentProps<typeof Input>, "value" | "onChange" | "type"> {
  value: number;
  onValueChange: (value: number) => void;
}

/**
 * Input de moeda em reais: mostra o valor formatado (R$ 1.234,56) e,
 * ao focar, libera a digitação livre ("1234,56" ou "1234.56").
 */
const CurrencyInput = ({ value, onValueChange, className, onFocus, onBlur, onKeyDown, ...props }: CurrencyInputProps) => {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState("");

  const displayValue = editing ? draft : formatCurrencyBRL(value);

  return (
    <Input
      {...props}
      type="text"
      inputMode="decimal"
      value={displayValue}
      onFocus={event => {
        const target = event.currentTarget;
        setDraft(Number.isFinite(value) && value !== 0 ? String(value).replace(".", ",") : "");
        setEditing(true);
        requestAnimationFrame(() => target.select());
        onFocus?.(event);
      }}
      onChange={event => setDraft(event.target.value)}
      onBlur={event => {
        onValueChange(parseImportMoney(draft));
        setEditing(false);
        onBlur?.(event);
      }}
      onKeyDown={event => {
        if (event.key === "Enter") event.currentTarget.blur();
        onKeyDown?.(event);
      }}
      className={className}
    />
  );
};

export default CurrencyInput;
