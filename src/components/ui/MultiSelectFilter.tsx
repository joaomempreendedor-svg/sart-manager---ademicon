"use client"

import * as React from "react"
import { Check, ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"

interface MultiSelectFilterProps {
  options: { value: string; label: string; }[];
  selected: string[];
  onSelectionChange: (newSelection: string[]) => void;
  placeholder?: string;
  className?: string;
}

export const MultiSelectFilter: React.FC<MultiSelectFilterProps> = ({
  options,
  selected,
  onSelectionChange,
  placeholder = "Selecionar...",
  className,
}) => {
  const [open, setOpen] = React.useState(false)

  const handleCheckedChange = (value: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selected, value])
    } else {
      onSelectionChange(selected.filter((item) => item !== value))
    }
  }

  const displayValue = selected.length > 0
    ? selected.map(val => options.find(opt => opt.value === val)?.label || val).join(", ")
    : placeholder;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between dark:bg-slate-700 dark:text-white dark:border-slate-600",
            className
          )}
        >
          <span className="truncate">{displayValue}</span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
        <ScrollArea className="h-48">
          <div className="flex flex-col p-2">
            {options.length === 0 ? (
              <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-2">Nenhuma opção disponível.</p>
            ) : (
              options.map((option) => (
                <div key={option.value} className="flex items-center space-x-2 p-1.5 hover:bg-gray-50 dark:hover:bg-slate-700 rounded-md cursor-pointer">
                  <Checkbox
                    id={`multiselect-${option.value}`}
                    checked={selected.includes(option.value)}
                    onCheckedChange={(checked) => handleCheckedChange(option.value, checked as boolean)}
                    className="dark:border-slate-600 data-[state=checked]:bg-brand-600 data-[state=checked]:text-white"
                  />
                  <Label
                    htmlFor={`multiselect-${option.value}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {option.label}
                  </Label>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}