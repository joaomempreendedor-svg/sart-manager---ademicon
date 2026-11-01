"use client";

import * as React from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";

const normalize = (value: string) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

interface SearchableSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyLabel?: string;
  /** Permite digitar um nome que não está na lista. */
  allowCustomValue?: boolean;
  allowClear?: boolean;
  disabled?: boolean;
  /** Classe aplicada ao container (use para largura). */
  className?: string;
  invalid?: boolean;
  id?: string;
}

const SearchableSelect = ({
  value,
  onChange,
  options,
  placeholder = "Selecione ou pesquise",
  searchPlaceholder = "Pesquisar nome...",
  emptyLabel = "Nenhum nome encontrado.",
  allowCustomValue = true,
  allowClear = true,
  disabled = false,
  className,
  invalid = false,
  id,
}: SearchableSelectProps) => {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  React.useEffect(() => {
    if (!open) setSearch("");
  }, [open]);

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
    const term = normalize(search);
    if (!term) return uniqueOptions;
    return uniqueOptions.filter(option => normalize(option).includes(term));
  }, [uniqueOptions, search]);

  const trimmedSearch = search.trim();
  const canUseSearch =
    allowCustomValue &&
    trimmedSearch.length > 0 &&
    !uniqueOptions.some(option => normalize(option) === normalize(trimmedSearch)) &&
    normalize(trimmedSearch) !== normalize(value);

  const select = (next: string) => {
    onChange(next);
    setOpen(false);
    setSearch("");
  };

  return (
    <div className={cn("relative", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            id={id}
            type="button"
            role="combobox"
            aria-expanded={open}
            aria-invalid={invalid || undefined}
            disabled={disabled}
            className={cn(
              "flex h-8 w-full items-center justify-between gap-1 rounded-md border border-gray-300 bg-white pl-2 pr-6 text-left text-xs text-gray-900 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-900 dark:text-white",
              invalid && "border-amber-400 bg-amber-50 dark:border-amber-500 dark:bg-amber-900/20",
            )}
            title={value || placeholder}
          >
            <span className={cn("truncate", !value && "text-gray-400 dark:text-slate-500")}>
              {value || placeholder}
            </span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] min-w-[240px] p-0">
          <div className="border-b border-gray-100 p-2 dark:border-slate-700">
            <div className="relative">
              <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-gray-400" />
              <Input
                autoFocus
                value={search}
                onChange={event => setSearch(event.target.value)}
                onKeyDown={event => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    if (filteredOptions.length > 0) select(filteredOptions[0]);
                    else if (canUseSearch) select(trimmedSearch);
                  }
                }}
                placeholder={searchPlaceholder}
                className="h-8 pl-7 text-xs"
              />
            </div>
          </div>
          <ScrollArea className="h-52">
            <div className="flex flex-col p-1">
              {canUseSearch && (
                <button
                  type="button"
                  onClick={() => select(trimmedSearch)}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs font-medium text-brand-700 hover:bg-brand-50 dark:text-brand-300 dark:hover:bg-slate-700"
                >
                  <Search className="h-3 w-3 shrink-0" />
                  Usar "{trimmedSearch}"
                </button>
              )}
              {filteredOptions.length === 0 && !canUseSearch ? (
                <p className="px-2 py-3 text-center text-xs text-gray-500 dark:text-slate-400">{emptyLabel}</p>
              ) : (
                filteredOptions.map(option => {
                  const isSelected = normalize(option) === normalize(value);
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => select(option)}
                      className={cn(
                        "flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-gray-50 dark:hover:bg-slate-700",
                        isSelected && "bg-brand-50 font-semibold text-brand-800 dark:bg-slate-700 dark:text-brand-200",
                      )}
                      title={option}
                    >
                      <span className="truncate">{option}</span>
                      {isSelected && <Check className="h-3 w-3 shrink-0" />}
                    </button>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>
      {value && allowClear && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute right-5 top-1/2 -translate-y-1/2 rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-slate-700 dark:hover:text-slate-200"
          title="Limpar"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
};

export default SearchableSelect;
