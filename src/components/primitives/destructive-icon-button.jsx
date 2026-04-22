"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Canonical destructive icon control for compact delete actions.
 * Reuse this primitive anywhere you need the small red delete circle.
 */
export function DestructiveIconButton({
  className,
  icon: Icon,
  ariaLabel = "Delete",
  size = "compact",
  ...props
}) {
  const sizing = size === "compact" ? "h-6 w-6" : "h-7 w-7";
  return (
    <Button
      type="button"
      size="icon"
      variant="destructive"
      className={cn("rounded-full p-0 [&_svg]:size-3.5", sizing, className)}
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
