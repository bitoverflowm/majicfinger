"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type SafariBrowserFrameProps = {
  url: string;
  children: ReactNode;
  className?: string;
  /** Max height of the scrollable page area inside the chrome. */
  bodyClassName?: string;
};

/**
 * HTML Safari-style browser chrome (Magic UI inspired) that can host live React
 * children — unlike the SVG-only `safari.jsx` image mock.
 */
export function SafariBrowserFrame({
  url,
  children,
  className,
  bodyClassName,
}: SafariBrowserFrameProps) {
  return (
    <div
      className={cn(
        "flex w-full flex-col overflow-hidden rounded-xl border border-border bg-[#E5E5E5] shadow-2xl dark:bg-[#404040]",
        className,
      )}
    >
      <div className="relative flex h-[52px] shrink-0 items-center bg-white px-4 dark:bg-[#262626]">
        <div className="absolute left-4 flex items-center gap-2">
          <span className="size-3 rounded-full bg-[#E5E5E5] dark:bg-[#404040]" />
          <span className="size-3 rounded-full bg-[#E5E5E5] dark:bg-[#404040]" />
          <span className="size-3 rounded-full bg-[#E5E5E5] dark:bg-[#404040]" />
        </div>
        <div className="mx-auto flex h-7 w-full max-w-[min(100%,42rem)] items-center justify-center rounded-md bg-[#F5F5F5] px-3 dark:bg-[#171717]">
          <p className="truncate text-center text-xs text-neutral-400 mix-blend-luminosity">
            {url}
          </p>
        </div>
      </div>
      <div
        className={cn(
          "min-h-0 flex-1 overflow-y-auto overscroll-contain bg-background",
          bodyClassName,
        )}
      >
        {children}
      </div>
    </div>
  );
}
