import { cn } from "@/lib/utils";

/** Shared Connect hub page padding (shell + standalone step 1). */
export function connectHubPageClass(embeddedInShell = false) {
  return cn(
    "mx-auto w-full max-w-7xl pb-20 pt-12 sm:pb-24 sm:pt-16 md:pt-20",
    embeddedInShell
      ? "pl-4 pr-6 sm:pl-5 sm:pr-8 md:pl-6 md:pr-12 lg:pl-8 lg:pr-16 xl:pl-10 xl:pr-20 2xl:pl-12 2xl:pr-28"
      : "px-6 sm:px-10 md:px-16 lg:px-24 xl:px-32 2xl:px-40",
  );
}

/**
 * Hub layout: two-column grid (inline rail) or single column with left pad (fixed rail).
 * @param {{ includeStepRail?: boolean; fixedRail?: boolean }} opts
 */
export function connectHubLayoutClass({ includeStepRail = true, fixedRail = false } = {}) {
  if (fixedRail) {
    return cn(
      "w-full min-w-0",
      "md:pl-[9.5rem] lg:pl-[12rem] xl:pl-[13.5rem]",
    );
  }
  if (!includeStepRail) return "w-full min-w-0";
  return cn(
    "grid w-full grid-cols-1",
    "md:grid-cols-[8.5rem_minmax(0,1fr)] md:gap-x-6",
    "lg:grid-cols-[10rem_minmax(0,1fr)] lg:gap-x-8",
    "xl:grid-cols-[11rem_minmax(0,1fr)] xl:gap-x-10",
  );
}

export const connectHubMainClass =
  "min-w-0 md:col-start-2 md:mx-auto md:w-full md:max-w-3xl lg:max-w-4xl xl:max-w-5xl";

/**
 * Top offset for fixed step rail — must match sticky nav (4.5rem) + dashBody py-1 + connectHubPageClass pt-*.
 * @see connectHubPageClass embedded padding (pt-12 / sm:pt-16 / md:pt-20)
 */
export const connectHubFlowStepsTopClass = cn(
  "top-[calc(4.5rem+0.25rem+3rem)]",
  "sm:top-[calc(4.5rem+0.25rem+4rem)]",
  "md:top-[calc(4.5rem+0.25rem+5rem)]",
);

/**
 * Fixed step rail — pinned to viewport (sticky failed: grid item was only ~240px tall via self-start).
 * Left edge tracks the centered max-w-7xl column + page padding.
 */
export const connectHubFlowStepsClass = cn(
  "hidden md:block",
  "fixed z-30 w-[8.5rem] lg:w-[10rem] xl:w-[11rem]",
  connectHubFlowStepsTopClass,
  "bg-white dark:bg-slate-950",
  "left-[max(1rem,calc((100vw-min(100vw,80rem))/2+1rem))]",
  "sm:left-[max(1.25rem,calc((100vw-min(100vw,80rem))/2+1.25rem))]",
  "md:left-[max(1.5rem,calc((100vw-min(100vw,80rem))/2+1.5rem))]",
  "lg:left-[max(2rem,calc((100vw-min(100vw,80rem))/2+2rem))]",
  "xl:left-[max(2.5rem,calc((100vw-min(100vw,80rem))/2+2.5rem))]",
  "2xl:left-[max(3rem,calc((100vw-min(100vw,80rem))/2+3rem))]",
);
