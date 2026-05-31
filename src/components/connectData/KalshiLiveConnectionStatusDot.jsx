"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  kalshiLivePingStateClassName,
  kalshiLivePingStateLabel,
} from "@/lib/kalshiLive/kalshiLivePing";
import { cn } from "@/lib/utils";

/**
 * @param {{ state?: import("@/lib/kalshiLive/kalshiLivePing").KalshiLivePingState; className?: string; size?: "sm" | "md" }} props
 */
export function KalshiLiveConnectionStatusDot({ state = "idle", className, size = "md" }) {
  const sizeClass = size === "sm" ? "h-2 w-2" : "h-2.5 w-2.5";
  const label = kalshiLivePingStateLabel(state);

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              "shrink-0 rounded-full",
              sizeClass,
              kalshiLivePingStateClassName(state),
              className,
            )}
            aria-label={`Kalshi Live connection status: ${label}`}
            role="status"
          />
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {label}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
