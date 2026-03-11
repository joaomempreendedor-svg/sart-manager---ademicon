import { cn } from "@/lib/utils";
import React from "react";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("relative overflow-hidden rounded-md bg-gray-200 dark:bg-slate-700", className)}
      {...props}
    >
      <div className="absolute inset-0 animate-shimmer">
        <div className="h-full w-full bg-gradient-to-r from-transparent via-white/30 to-transparent dark:via-white/10"></div>
      </div>
    </div>
  );
}

export { Skeleton };