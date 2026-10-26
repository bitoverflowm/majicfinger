"use client";

import type { CSSProperties, ReactNode } from "react";
import { Lock } from "lucide-react";

import { cn } from "@/lib/utils";

type DemoWindowMockupProps = {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  id?: string;
  style?: CSSProperties;
  /** Shows a browser title bar with this address. */
  browserUrl?: string;
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
  style,
  browserUrl,
  "data-demo-mockup": dataDemoMockup,
}: DemoWindowMockupProps) {
  return (
    <div
      id={id}
      style={style}
      data-demo-mockup={dataDemoMockup}
      className={cn(
        "relative isolate w-full overflow-hidden overscroll-none rounded-2xl border border-border bg-background shadow-xl ring-1 ring-border/60",
        className,
      )}
    >
      {browserUrl ? (
        <div className="relative flex h-10 shrink-0 items-center border-b border-border bg-muted/50 px-4">
          <div className="flex gap-1.5" aria-hidden>
            <span className="size-2.5 rounded-full bg-neutral-300 dark:bg-neutral-600" />
            <span className="size-2.5 rounded-full bg-neutral-300 dark:bg-neutral-600" />
            <span className="size-2.5 rounded-full bg-neutral-300 dark:bg-neutral-600" />
          </div>
          <div className="absolute left-1/2 flex h-6 w-[min(22rem,55%)] -translate-x-1/2 items-center justify-center gap-1.5 rounded-md bg-background px-3 text-xs text-muted-foreground ring-1 ring-border/70">
            <Lock className="size-3" aria-hidden />
            <span className="truncate">{browserUrl}</span>
          </div>
        </div>
      ) : null}
      <div className={cn("relative flex w-full min-w-0 flex-col", contentClassName)}>{children}</div>
    </div>
  );
}
