"use client";

import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";

import { cn } from "@/lib/utils";

export type ProgressProps = React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> & {
  indicatorClassName?: string;
  /** When true, shows an animated segment (ignores `value`). */
  indeterminate?: boolean;
};

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  ProgressProps
>(({ className, value, indicatorClassName, indeterminate, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn(
      "relative h-4 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800",
      className,
    )}
    {...props}
  >
    {indeterminate ? (
      <div
        className={cn(
          "h-full w-[35%] rounded-full bg-slate-900 dark:bg-slate-50",
          "[animation:mf-progress-indeterminate_1.25s_ease-in-out_infinite]",
          indicatorClassName,
        )}
        aria-hidden
      />
    ) : (
      <ProgressPrimitive.Indicator
        className={cn(
          "h-full w-full flex-1 bg-slate-900 transition-all dark:bg-slate-50",
          indicatorClassName,
        )}
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    )}
  </ProgressPrimitive.Root>
));
Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress };
