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

/** Two-column hub grid: step rail + main (omit rail column when shell owns the rail). */
export function connectHubLayoutClass({ includeStepRail = true } = {}) {
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

/** Sticky step rail — stays visible while hub + workspace scroll. */
export const connectHubFlowStepsClass = cn(
  "hidden shrink-0 self-start md:-ml-0.5 md:block",
  "sticky top-[4.5rem] z-10",
);
