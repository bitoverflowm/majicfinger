"use client";

import {
  athenaPingStateClassName,
  athenaPingStateLabel,
} from "@/lib/athenaLakePing";
import { cn } from "@/lib/utils";

/**
 * @param {{ state?: import("@/lib/athenaLakePing").AthenaPingState; className?: string; size?: "sm" | "md" }} props
 */
export function AthenaConnectionStatusDot({ state = "idle", className, size = "md" }) {
  const sizeClass = size === "sm" ? "h-2 w-2" : "h-2.5 w-2.5";
  const label = athenaPingStateLabel(state);

  return (
    <span
      className={cn("shrink-0 rounded-full", sizeClass, athenaPingStateClassName(state), className)}
      aria-label="Athena connection status"
      title={label}
      role="status"
    />
  );
}
