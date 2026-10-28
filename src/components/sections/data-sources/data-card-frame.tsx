"use client";

import type { ReactNode, RefObject } from "react";

import { cn } from "@/lib/utils";
import { FeatureWindow } from "../features/feature-kit";

/** Window preview at the bottom of a data source card, cropped by the card's lower edge. */
export function DataCardFrame({
  title,
  frameRef,
  compact,
  onMouseEnter,
  onMouseLeave,
  children,
}: {
  title: string;
  frameRef?: RefObject<HTMLDivElement | null>;
  /** Shorter preview for the smaller coming-soon cards. */
  compact?: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  children: ReactNode;
}) {
  return (
    <div
      ref={frameRef}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={cn(
        "relative overflow-hidden rounded-lg bg-black/[0.04] dark:bg-white/[0.04]",
        compact ? "h-[16rem]" : "h-[21rem]",
      )}
    >
      <FeatureWindow
        title={title}
        className="absolute inset-x-4 -bottom-px top-6 rounded-b-none sm:inset-x-6 sm:top-7"
      >
        <div className="flex size-full min-w-0 flex-col">{children}</div>
      </FeatureWindow>
    </div>
  );
}
