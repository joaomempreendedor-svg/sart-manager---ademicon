"use client";

import * as React from "react";
import { CalendarDays, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface DatePickerProps {
  /** Data no formato ISO (yyyy-mm-dd). */
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  /** Classe aplicada ao container (use para largura). */
  className?: string;
  id?: string;
}

const parseIsoDate = (value: string): Date | undefined => {
  const match = String(value ?? "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return undefined;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? undefined : date;
};

const toIsoDate = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const formatDisplay = (value: string) => {
  const date = parseIsoDate(value);
  if (!date) return "";
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
};

const POPOVER_HEIGHT = 332;

const DatePicker = ({
  value,
  onChange,
  placeholder = "dd/mm/aaaa",
  disabled = false,
  invalid = false,
  className,
  id,
}: DatePickerProps) => {
  const [open, setOpen] = React.useState(false);
  const [side, setSide] = React.useState<"top" | "bottom">("bottom");
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const selected = parseIsoDate(value);
  const display = formatDisplay(value);

  const handleOpenChange = (next: boolean) => {
    if (next) {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (rect) {
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        const fitsBelow = spaceBelow >= POPOVER_HEIGHT + 16;
        const fitsAbove = spaceAbove >= POPOVER_HEIGHT + 16;
        setSide(fitsBelow || (!fitsAbove && spaceBelow >= spaceAbove) ? "bottom" : "top");
      }
    }
    setOpen(next);
  };

  return (
    <div className={cn("relative", className)}>
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <button
            ref={triggerRef}
            id={id}
            type="button"
            disabled={disabled}
            aria-invalid={invalid || undefined}
            title={display || placeholder}
            className={cn(
              "flex h-8 w-full items-center gap-1 rounded-md border border-gray-300 bg-white pl-2 pr-6 text-left text-xs text-gray-900 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-900 dark:text-white",
              invalid && "border-amber-400 bg-amber-50 dark:border-amber-500 dark:bg-amber-900/20",
            )}
          >
            <span className={cn("truncate", !display && "text-gray-400 dark:text-slate-500")}>{display || placeholder}</span>
            <CalendarDays className="absolute right-2 h-3.5 w-3.5 opacity-60" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          side={side}
          sideOffset={6}
          avoidCollisions={false}
          className="flex h-[332px] max-h-[var(--radix-popover-content-available-height)] w-auto flex-col overflow-y-auto p-0"
        >
          <Calendar
            mode="single"
            selected={selected}
            defaultMonth={selected}
            onSelect={date => {
              if (!date) return;
              onChange(toIsoDate(date));
              setOpen(false);
            }}
            autoFocus
            className="p-2"
            classNames={{
              months: "flex flex-col",
              month: "space-y-2",
              month_caption: "flex justify-center pt-1 relative items-center h-8",
              weekdays: "flex",
              weekday: "w-8 rounded-md font-normal text-[0.7rem] text-gray-500 dark:text-gray-400",
              week: "flex w-full mt-1",
              day: "h-8 w-8 p-0 text-center text-xs relative",
              day_button:
                "h-8 w-8 p-0 text-xs font-normal rounded-md hover:bg-gray-100 dark:hover:bg-slate-700 aria-selected:opacity-100",
              nav: "flex items-center gap-1",
              button_previous: "absolute left-1 h-7 w-7 bg-transparent p-0 opacity-60 hover:opacity-100 flex items-center justify-center",
              button_next: "absolute right-1 h-7 w-7 bg-transparent p-0 opacity-60 hover:opacity-100 flex items-center justify-center",
            }}
          />
          <div className="mt-auto flex items-center justify-between gap-2 border-t border-gray-100 p-2 dark:border-slate-700">
            <button
              type="button"
              onClick={() => {
                onChange(toIsoDate(new Date()));
                setOpen(false);
              }}
              className="rounded px-2 py-1 text-xs font-medium text-brand-700 hover:bg-brand-50 dark:text-brand-300 dark:hover:bg-slate-700"
            >
              Hoje
            </button>
            <button
              type="button"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              className="rounded px-2 py-1 text-xs font-medium text-gray-500 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-700"
            >
              Limpar
            </button>
          </div>
        </PopoverContent>
      </Popover>
      {display && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute right-6 top-1/2 -translate-y-1/2 rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-slate-700 dark:hover:text-slate-200"
          title="Limpar data"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
};

export default DatePicker;
