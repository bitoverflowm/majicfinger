"use client";

import type { ReactNode } from "react";

import { DemoWindowMockup } from "@/components/sections/demo-window-mockup";
import { cn } from "@/lib/utils";

type HubKalshiLiveDemoMockupProps = {
  children: ReactNode;
  className?: string;
};

/** Demo window frame for the Kalshi Live hub search → metadata playground. */
export function HubKalshiLiveDemoMockup({
  children,
  className,
}: HubKalshiLiveDemoMockupProps) {
  return (
    <DemoWindowMockup
      className={className}
      contentClassName={cn("min-h-[40rem] sm:min-h-[44rem]")}
      data-demo-mockup
    >
      {children}
    </DemoWindowMockup>
  );
}
