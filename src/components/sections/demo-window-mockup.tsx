"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type DemoWindowMockupProps = {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  id?: string;
  "data-demo-mockup"?: boolean;
};

/**
 * Landing-page style product window frame (rounded card, border, shadow).
 * Used for the homepage Connect demo and embedded hub/guide query builders.
 */
export function DemoWindowMockup({
  children,
  className,
  contentClassName,
  id,
  "data-demo-mockup": dataDemoMockup,
}: DemoWindowMockupProps) {
  return (
    <div
      id={id}
      data-demo-mockup={dataDemoMockup}
      className={cn(
        "relative isolate w-full overflow-hidden overscroll-none rounded-2xl border border-border bg-background shadow-xl ring-1 ring-border/60",
        className,
      )}
    >
      <div className={cn("flex w-full min-w-0 flex-col", contentClassName)}>{children}</div>
    </div>
  );
}
