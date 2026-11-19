"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";

const normalize = (value: string) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

interface SearchableTextInputProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  title?: string;
  /** Classe aplicada ao container (use para largura). */
  className?: string;
  invalid?: boolean;
}

/**
 * Campo de texto que abre a lista de opções ao receber foco.
 * Permite selecionar um item existente ou digitar um valor livre.
 */
const SearchableTextInput = ({
  value,
  onChange,
  options,
  placeholder = "Selecione ou digite",
  title,
  className,
  invalid = false,
}: SearchableTextInputProps) => {
  const [open, setOpen] = React.useState(false);
  const [filter, setFilter] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  const uniqueOptions = React.useMemo(() => {
    const seen = new Set<string>();
    return options
      .map(option => String(option ?? "").trim())
      .filter(option => {
        if (!option) return false;
        const key = normalize(option);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [options]);

  const filteredOptions = React.useMemo(() => {
    const term = normalize(filter);
    const list = term ? uniqueOptions.filter(option => normalize(option).includes(term)) : uniqueOptions;
    return list.slice(0, 80);
  }, [uniqueOptions, filter]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div className={cn("relative", className)}>
          <Input
            ref={inputRef}
            value={value}
            placeholder={placeholder}
            title={title}
            aria-invalid={invalid || undefined}
            onFocus={() => {
              setFilter("");
              setOpen(true);
            }}
            onChange={event => {
              onChange(event.target.value);
              setFilter(event.target.value);
              setOpen(true);
            }}
            className={cn(
              "h-8 w-full text-xs",
              invalid && "border-amber-400 bg-amber-50 dark:border-amber-500 dark:bg-amber-900/20",
            )}
          />
        </div>
      </PopoverAnchor>
      <PopoverContent
        align="start"
        sideOffset={4}
        onOpenAutoFocus={event => event.preventDefault()}
        onInteractOutside={event => {
          if (inputRef.current?.contains(event.target as Node)) event.preventDefault();
        }}
        onFocusOutside={event => {
          if (inputRef.current?.contains(event.target as Node)) event.preventDefault();
        }}
        onPointerDownOutside={event => {
          if (inputRef.current?.contains(event.target as Node)) event.preventDefault();
        }}
        className="max-h-56 w-[var(--radix-popover-trigger-width)] min-w-[220px] overflow-y-auto p-1"
      >
        {filteredOptions.length === 0 ? (
          <p className="px-2 py-2 text-center text-xs text-gray-500 dark:text-slate-400">
            Nenhum membro encontrado. Você pode digitar o nome.
          </p>
        ) : (
          filteredOptions.map(option => (
            <button
              key={option}
              type="button"
              onClick={() => {
                onChange(option);
                setFilter("");
                setOpen(false);
              }}
              className="block w-full truncate rounded-md px-2 py-1.5 text-left text-xs text-gray-900 hover:bg-brand-50 dark:text-white dark:hover:bg-slate-700"
              title={option}
            >
              {option}
            </button>
          ))
        )}
      </PopoverContent>
    </Popover>
  );
};

export default SearchableTextInput;
