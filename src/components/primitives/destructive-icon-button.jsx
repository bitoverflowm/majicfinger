"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Small solid destructive control — empty red circle (`h-2 w-2`).
 * No icon; pair with a tooltip (e.g. "clear sheet").
 */
export function DestructiveIconButton({ className, ariaLabel = "delete", ...props }) {
  return (
    <button
      type="button"
      data-destructive-dot=""
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full border-0 bg-red-500 p-0 shadow-none",
        "h-2 w-2 min-h-2 min-w-2 max-h-2 max-w-2",
        "hover:bg-red-500/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-500 focus-visible:ring-offset-1",
        "dark:bg-red-900 dark:hover:bg-red-900/90",
        className,
      )}
      aria-label={ariaLabel}
      {...props}
    />
  );
}

/** Amber cancel dot for in-flight Connect data-feed pulls (`h-3 w-3`, no icon). */
export function AmberCancelButton({ className, ariaLabel = "Cancel data pull", ...props }) {
  return (
    <button
      type="button"
      data-cancel-dot=""
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full border-0 bg-amber-500 p-0 shadow-none",
        "h-3 w-3 min-h-3 min-w-3 max-h-3 max-w-3",
        "hover:bg-amber-500/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-500 focus-visible:ring-offset-1",
        "dark:bg-amber-500 dark:hover:bg-amber-500/90",
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
