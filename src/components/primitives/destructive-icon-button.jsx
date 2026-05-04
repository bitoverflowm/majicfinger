"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Small solid destructive control — empty red circle, same visual weight as the
 * DataLakeParquetPanel Athena / sample connection status dots (`h-2.5 w-2.5`).
 * No icon; pair with a tooltip (e.g. "delete").
 */
export function DestructiveIconButton({ className, ariaLabel = "delete", ...props }) {
  return (
    <Button
      type="button"
      variant="destructive"
      className={cn(
        "h-2.5 w-2.5 min-h-2.5 min-w-2.5 shrink-0 rounded-full border-0 p-0 shadow-none",
        "focus-visible:ring-1 focus-visible:ring-red-500 focus-visible:ring-offset-1",
        className,
      )}
      aria-label={ariaLabel}
      {...props}
    />
  );
}

/** Compact yellow circle control for secondary navigation. */
export function YellowIconButton({
  className,
  icon: Icon,
  ariaLabel = "Back",
  size = "compact",
  ...props
}) {
  const sizing = size === "compact" ? "h-6 w-6" : "h-7 w-7";
  return (
    <Button
      type="button"
      size="icon"
      variant="secondary"
      className={cn(
        "rounded-full border-0 bg-yellow-400 p-0 text-slate-900 shadow-none hover:bg-yellow-500/90 focus-visible:ring-yellow-600 dark:bg-yellow-400 dark:text-slate-950 dark:hover:bg-yellow-500/90 dark:focus-visible:ring-yellow-500 [&_svg]:size-3.5",
        sizing,
        className,
      )}
      aria-label={ariaLabel}
      {...props}
    >
      {Icon ? <Icon /> : null}
    </Button>
  );
}

export function DestructiveActionButton({
  className,
  children,
  size = "compact",
  ...props
}) {
  const sizing = size === "compact" ? "h-7 px-2 text-xs" : "h-8 px-3 text-xs";
  return (
    <Button
      type="button"
      variant="destructive"
      className={cn("font-medium", sizing, className)}
      {...props}
    >
      {children}
    </Button>
  );
}
