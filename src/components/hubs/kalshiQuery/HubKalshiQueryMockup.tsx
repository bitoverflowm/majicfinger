"use client";

import type { ReactNode } from "react";

import { DemoWindowMockup } from "@/components/sections/demo-window-mockup";
import { cn } from "@/lib/utils";

type HubKalshiQueryMockupProps = {
  children: ReactNode;
  className?: string;
};

/**
 * Demo window frame sized for the Kalshi historical query builder.
 * Grows with content so guided workflows and column pickers are never clipped.
 */
export function HubKalshiQueryMockup({ children, className }: HubKalshiQueryMockupProps) {
  return (
    <DemoWindowMockup
      className={className}
      contentClassName={cn("min-h-[28rem] sm:min-h-[32rem] lg:min-h-[36rem]")}
    >
      {children}
    </DemoWindowMockup>
  );
}
