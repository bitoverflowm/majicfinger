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

export const connectHubMainClass =
  "min-w-0 md:col-start-2 md:mx-auto md:w-full md:max-w-3xl lg:max-w-4xl xl:max-w-5xl";

/** Extra inset when the Connect workspace scrolls into view (programmatic + anchor scroll). */
export const connectWorkspaceScrollInsetClass =
  "scroll-mt-20 sm:scroll-mt-24 md:scroll-mt-32";

/** Applied on the Connect home scroll container for consistent snap padding. */
export const connectHubScrollPaddingClass =
  "scroll-pt-20 sm:scroll-pt-24 md:scroll-pt-32";

/** Pixels to leave above #connect-home-workspace when requestConnectWorkspace scrolls. */
export const CONNECT_WORKSPACE_SCROLL_OFFSET_PX = 96;

/** Step 2 analyze — full-viewport dashboard (below sticky nav ~4.5rem). */
export const CONNECT_ANALYZE_DASHBOARD_MIN_H = "min-h-[calc(100dvh-4.5rem)]";

/** Step 2 section: whitespace above + viewport fill + scroll snap. */
export const connectAnalyzeDashboardSectionClass = cn(
  "mt-24 snap-start sm:mt-28 md:mt-32 lg:mt-40",
  CONNECT_ANALYZE_DASHBOARD_MIN_H,
  "flex flex-col",
  connectWorkspaceScrollInsetClass,
);

/** Connect home right drawer: ~1rem inset from viewport top/bottom. */
export const connectHomeDrawerAsideClass =
  "fixed top-4 bottom-4 z-20 flex h-auto max-h-[calc(100dvh-2rem)] flex-col gap-4 transition-[transform,width,min-width,max-width,left,right] duration-300 ease-out sm:gap-6";

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
const connectHubFlowStepsLeftBase =
  "left-[max(1rem,calc((100vw-min(100vw,80rem))/2+1rem))] sm:left-[max(1.25rem,calc((100vw-min(100vw,80rem))/2+1.25rem))] md:left-[max(1.5rem,calc((100vw-min(100vw,80rem))/2+1.5rem))] lg:left-[max(2rem,calc((100vw-min(100vw,80rem))/2+2rem))] xl:left-[max(2.5rem,calc((100vw-min(100vw,80rem))/2+2.5rem))] 2xl:left-[max(3rem,calc((100vw-min(100vw,80rem))/2+3rem))]";

/** When app SideNav icon rail is visible — clear gap between sidebar and step menu. */
export const connectHubFlowStepsSidebarOffsetClass = cn(
  "left-[max(calc(var(--sidebar-width-icon,3rem)+1.25rem),calc((100vw-min(100vw,80rem))/2+var(--sidebar-width-icon,3rem)+1.25rem))]",
  "sm:left-[max(calc(var(--sidebar-width-icon,3rem)+1.5rem),calc((100vw-min(100vw,80rem))/2+var(--sidebar-width-icon,3rem)+1.5rem))]",
  "md:left-[max(calc(var(--sidebar-width-icon,3rem)+1.75rem),calc((100vw-min(100vw,80rem))/2+var(--sidebar-width-icon,3rem)+1.75rem))]",
  "lg:left-[max(calc(var(--sidebar-width-icon,3rem)+2rem),calc((100vw-min(100vw,80rem))/2+var(--sidebar-width-icon,3rem)+2rem))]",
  "xl:left-[max(calc(var(--sidebar-width-icon,3rem)+2.25rem),calc((100vw-min(100vw,80rem))/2+var(--sidebar-width-icon,3rem)+2.25rem))]",
  "2xl:left-[max(calc(var(--sidebar-width-icon,3rem)+2.5rem),calc((100vw-min(100vw,80rem))/2+var(--sidebar-width-icon,3rem)+2.5rem))]",
);

export const connectHubFlowStepsClass = cn(
  "hidden md:block",
  "fixed z-30 w-[8.5rem] lg:w-[10rem] xl:w-[11rem]",
  connectHubFlowStepsTopClass,
  "bg-white dark:bg-slate-950",
  connectHubFlowStepsLeftBase,
);

/** Step 2 dashboard — full width, minimal horizontal gutter (step rail stays fixed). */
export function connectHubAnalyzePageClass() {
  return cn(
    "mx-auto w-full max-w-none pb-16 pt-12 sm:pb-20 sm:pt-16 md:pb-20 md:pt-20",
    "px-1 pr-1 sm:px-2 sm:pr-2 md:px-3 md:pr-3",
  );
}

/** Content inset: sidebar icon rail + fixed step rail only (no duplicate 9.5rem pad). */
export function connectHubAnalyzeLayoutClass(withAppSidebar = false) {
  return cn(
    "w-full min-w-0 max-w-none",
    withAppSidebar
      ? "md:pl-[calc(var(--sidebar-width-icon,3rem)+8.75rem+0.25rem)] lg:pl-[calc(var(--sidebar-width-icon,3rem)+10.25rem+0.25rem)] xl:pl-[calc(var(--sidebar-width-icon,3rem)+11.25rem+0.25rem)]"
      : "md:pl-[calc(8.75rem+0.25rem)] lg:pl-[calc(10.25rem+0.25rem)] xl:pl-[calc(11.25rem+0.25rem)]",
  );
}

/** Main column pad when fixed step rail + optional app sidebar. */
export function connectHubLayoutClass({
  includeStepRail = true,
  fixedRail = false,
  withAppSidebar = false,
} = {}) {
  if (fixedRail) {
    return cn(
      "w-full min-w-0",
      "md:pl-[9.5rem] lg:pl-[12rem] xl:pl-[13.5rem]",
      withAppSidebar &&
        "md:pl-[calc(9.5rem+var(--sidebar-width-icon,3rem)+1rem)] lg:pl-[calc(12rem+var(--sidebar-width-icon,3rem)+1rem)] xl:pl-[calc(13.5rem+var(--sidebar-width-icon,3rem)+1rem)]",
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
