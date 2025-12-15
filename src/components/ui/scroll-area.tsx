import * as React from "react"
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area"

import { cn } from "@/lib/utils"

// Define props interfaces
interface ScrollBarProps extends React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar> {}
interface ScrollAreaRootProps extends React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root> {}

// ScrollBar component
// Define a função do componente separadamente, com tipagem nos parâmetros
const ScrollBarComponent = (
  { className, orientation = "vertical", ...props }: ScrollBarProps,
  ref: React.Ref<React.ElementRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>>
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
);

// Envolve a função com React.forwardRef e aplica a asserção de tipo no resultado
const ScrollBar = React.forwardRef(ScrollBarComponent) as React.ForwardRefExoticComponent<ScrollBarProps & React.RefAttributes<React.ElementRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>>>;

ScrollBar.displayName = ScrollAreaPrimitive.ScrollAreaScrollbar.displayName

// ScrollArea component
// Define a função do componente separadamente, com tipagem nos parâmetros
const ScrollAreaComponent = (
  { className, children, ...props }: ScrollAreaRootProps,
  ref: React.Ref<React.ElementRef<typeof ScrollAreaPrimitive.Root>>
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
);

// Envolve a função com React.forwardRef e aplica a asserção de tipo no resultado
const ScrollArea = React.forwardRef(ScrollAreaComponent) as React.ForwardRefExoticComponent<ScrollAreaRootProps & React.RefAttributes<React.ElementRef<typeof ScrollAreaPrimitive.Root>>>;

ScrollArea.displayName = ScrollAreaPrimitive.Root.displayName

export { ScrollArea, ScrollBar }