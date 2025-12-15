import * as React from "react"
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area"

import { cn } from "@/lib/utils"

// Define props interfaces
interface ScrollBarProps extends React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar> {}
interface ScrollAreaRootProps extends React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root> {}

// ScrollBar component
// Removendo *todos* os argumentos genéricos de React.forwardRef
const ScrollBar = React.forwardRef((
  { className, orientation = "vertical", ...props }: ScrollBarProps, // Props tipadas diretamente na função
  ref: React.Ref<React.ElementRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>> // Ref tipada diretamente na função
) => (
  <ScrollAreaPrimitive.ScrollAreaScrollbar
    ref={ref}
    orientation={orientation}
    className={cn(
      "flex touch-none select-none transition-colors",
      orientation === "vertical" &&
        "h-full w-2.5 border-l border-l-transparent p-[1px]",
      orientation === "horizontal" &&
        "h-2.5 flex-col border-t border-t-transparent p-[1px]",
      className
    )}
    {...props}
  >
    <ScrollAreaPrimitive.ScrollAreaThumb className="relative flex-1 rounded-full bg-gray-300 dark:bg-slate-600" />
  </ScrollAreaPrimitive.Scrollbar>
)) as React.ForwardRefExoticComponent<ScrollBarProps & React.RefAttributes<React.ElementRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>>>; // Asserção de tipo no resultado final

ScrollBar.displayName = ScrollAreaPrimitive.ScrollAreaScrollbar.displayName

// ScrollArea component
// Removendo *todos* os argumentos genéricos de React.forwardRef
const ScrollArea = React.forwardRef((
  { className, children, ...props }: ScrollAreaRootProps, // Props tipadas diretamente na função
  ref: React.Ref<React.ElementRef<typeof ScrollAreaPrimitive.Root>> // Ref tipada diretamente na função
) => (
  <ScrollAreaPrimitive.Root
    ref={ref}
    className={cn("relative overflow-hidden", className)}
    {...props}
  >
    <ScrollAreaPrimitive.Viewport className="h-full w-full rounded-[inherit]">
      {children}
    </ScrollAreaPrimitive.Viewport>
    <ScrollBar />
    <ScrollAreaPrimitive.Corner />
  </ScrollAreaPrimitive.Root>
)) as React.ForwardRefExoticComponent<ScrollAreaRootProps & React.RefAttributes<React.ElementRef<typeof ScrollAreaPrimitive.Root>>>; // Asserção de tipo no resultado final

ScrollArea.displayName = ScrollAreaPrimitive.Root.displayName

export { ScrollArea, ScrollBar }