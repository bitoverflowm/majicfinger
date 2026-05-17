import { cn } from "@/lib/utils";

/** Shared Connect hub page padding (shell + standalone step 1). */
export function connectHubPageClass(embeddedInShell = false, { embeddedDemo = false } = {}) {
  if (embeddedDemo) {
    return cn(
      "mx-auto w-full max-w-none pb-10 sm:pb-12 md:pb-14",
      "pt-4 sm:pt-5 md:pt-6",
    );
  }
  return cn(
    "mx-auto w-full max-w-7xl pb-20 sm:pb-24",
    embeddedInShell ? "pt-2 sm:pt-3 md:pt-4" : "pt-12 sm:pt-16 md:pt-20",
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

/** Step 2 anchor — same inset as workspace scroll; used by #connect-home-analyze-anchor. */
export const connectAnalyzeAnchorClass = connectWorkspaceScrollInsetClass;

/** Applied on the Connect home scroll container for consistent snap padding. */
export const connectHubScrollPaddingClass =
  "scroll-pt-20 sm:scroll-pt-24 md:scroll-pt-32";

/** Pixels to leave above #connect-home-workspace when requestConnectWorkspace scrolls. */
export const CONNECT_WORKSPACE_SCROLL_OFFSET_PX = 96;

/** Step 2 analyze — full-viewport dashboard (below sticky nav ~4.5rem). */
export const CONNECT_ANALYZE_DASHBOARD_MIN_H = "min-h-[calc(100dvh-4.5rem)]";

/** Step 2 sheet block — fixed viewport height so toolbar + grid + pagination fit without page scroll. */
export const connectAnalyzeSectionFitClass = cn(
  "flex flex-col overflow-hidden",
  "h-[calc(100dvh-5.25rem)] max-h-[calc(100dvh-5.25rem)]",
);

/** Stable Step 2 workspace shell (sheet / chart / dashboard); never shrinks below viewport. */
export const CONNECT_HOME_WORKSPACE_MIN_H = CONNECT_ANALYZE_DASHBOARD_MIN_H;

export const connectHomeWorkspaceRowClass = cn(
  "flex min-h-0 w-full max-w-full min-w-0 flex-1 flex-row gap-4 transition-[gap] duration-300 ease-out sm:w-full sm:gap-6",
  CONNECT_HOME_WORKSPACE_MIN_H,
);

export const connectHomeAnalyzeMainClass = cn(
  CONNECT_HOME_WORKSPACE_MIN_H,
  "relative flex min-h-0 w-0 min-w-0 flex-1 flex-col overflow-hidden",
);

/** Horizontal inset inside the landing demo card. */
export const connectHubDemoInsetClass = "px-4 sm:px-5 md:px-6 lg:px-8";

/** OpenApiPanelTab — flush to demo card right edge (cancels grid horizontal inset). */
export const connectHubDemoPanelTabFlushRightClass =
  "-right-4 sm:-right-5 md:-right-6 lg:-right-8";

/** Vertical inset inside the landing demo card (shrinks sheet/chart area). */
export const connectHubDemoVerticalInsetClass = "py-4 sm:py-5 md:py-6 lg:py-8";

/** Landing-page demo embed — heights relative to the demo card, not the viewport. */
export const connectDemoAnalyzeFitClass = cn(
  "flex min-h-0 flex-1 flex-col overflow-hidden",
  "min-h-[24rem]",
  connectHubDemoVerticalInsetClass,
);

export const connectDemoAnalyzeMainClass = cn(
  "relative flex min-h-0 w-0 min-w-0 flex-1 flex-col overflow-hidden",
  "min-h-[24rem]",
);

export const connectDemoWorkspaceSectionClass = cn(
  "relative mt-8 min-h-0 flex-1 snap-start snap-always sm:mt-10",
);

/** Demo + analyze scroll container — mandatory snap between hub and workspace. */
export const connectHubScrollSnapClass = "snap-y snap-mandatory";

/** Landing demo — scroll chaining stays inside #connect-home-scroll. */
export const connectHubDemoScrollContainClass = "overscroll-y-contain touch-pan-y";

export const connectHubHubSnapClass = "snap-start snap-always";

/** Fixed Step 2 shell — fills Connect home / demo card without document scroll. */
export const connectHubAnalyzeViewportClass =
  "relative flex min-h-0 flex-1 flex-col overflow-hidden bg-white dark:bg-slate-950";

/** Analyze row: sheet + drawer inside the fixed viewport (no dvh stack). */
export const connectHomeAnalyzeRowClass = cn(
  "relative min-h-0 w-full min-w-0 flex-1 overflow-hidden",
  "flex flex-row gap-4 transition-[gap] duration-300 ease-out sm:gap-6",
);

/** Demo / connect-home drawer — overlay on the spacer column (not in-flow beside it). */
export const connectHomeDrawerAsideDemoClass = cn(
  "absolute inset-y-0 right-0 z-20 flex h-full min-h-0 flex-col gap-4 sm:gap-6",
  "transition-[transform,width,min-width,max-width] duration-300 ease-out",
);

/** Landing demo — in-card step rail + hub (same proportions as Connect home shell). */
export const connectHubDemoLayoutClass = cn(
  "grid w-full min-w-0 items-start",
  "grid-cols-[8.5rem_minmax(0,1fr)] gap-x-6",
  "lg:grid-cols-[10rem_minmax(0,1fr)] lg:gap-x-8",
  connectHubDemoInsetClass,
);

/** Demo hub — Import + Integrations only (two columns at sm+, stack on mobile). */
export const connectHubDemoColumnGridClass = cn(
  "grid w-full min-w-0 grid-cols-1 gap-y-1",
  "sm:grid-cols-2 sm:gap-x-6 lg:gap-x-8",
  "max-sm:gap-y-3",
);

/** Step 2 section: whitespace above + viewport fill + scroll snap. */
export const connectAnalyzeDashboardSectionClass = cn(
  "mt-24 snap-start sm:mt-28 md:mt-32 lg:mt-40",
  CONNECT_ANALYZE_DASHBOARD_MIN_H,
  "flex flex-col",
  connectWorkspaceScrollInsetClass,
);

/** Connect home right drawer: sticky in scroll flow (scrolls away with workspace when scrolling up). */
export const connectHomeDrawerAsideClass =
  "sticky top-4 z-20 flex max-h-[calc(100dvh-2rem)] self-start flex-col gap-4 transition-[transform,width,min-width,max-width,left,right] duration-300 ease-out sm:gap-6";

/** Connect home right drawer — viewport-fixed (default app / non–connect-home paths). */
export const connectHomeDrawerAsideFixedClass =
  "fixed top-4 bottom-4 z-20 flex h-auto max-h-[calc(100dvh-2rem)] flex-col gap-4 transition-[transform,width,min-width,max-width,left,right] duration-300 ease-out sm:gap-6";

/**
 * Top offset for viewport-fixed step rail — sits just below the fixed app nav (~4.5rem).
 * Shell page uses small pt-*; dashBody already reserves nav height via a spacer.
 */
export const connectHubFlowStepsTopClass = cn(
  "top-[calc(4.5rem+0.5rem)]",
  "sm:top-[calc(4.5rem+0.5rem)]",
  "md:top-[calc(4.5rem+0.75rem)]",
);

/**
 * Step rail — scrolls with hub content (use on Connect analyze layout; Step 1 uses fixedRail grid).
 * Left inset optional when app SideNav icon rail is visible.
 */
const connectHubFlowStepsStickyCore = cn(
  "hidden md:block",
  "sticky z-30 w-[8.5rem] self-start lg:w-[10rem] xl:w-[11rem]",
  connectHubFlowStepsTopClass,
  "bg-white dark:bg-slate-950",
);

/** Sticky step rail — in-flow on analyze layout; scrolls away with workspace block. */
export const connectHubFlowStepsStickyClass = connectHubFlowStepsStickyCore;

/** Viewport-fixed step rail — out of flow (Step 1 hub; does not push main content down). */
export const connectHubFlowStepsViewportFixedClass = cn(
  "hidden md:block",
  "fixed z-30",
  connectHubFlowStepsTopClass,
  "bg-white dark:bg-slate-950",
  "left-[max(1rem,calc((100vw-min(100vw,80rem))/2+1rem))] sm:left-[max(1.25rem,calc((100vw-min(100vw,80rem))/2+1.25rem))] md:left-[max(1.5rem,calc((100vw-min(100vw,80rem))/2+1.5rem))] lg:left-[max(2rem,calc((100vw-min(100vw,80rem))/2+2rem))] xl:left-[max(2.5rem,calc((100vw-min(100vw,80rem))/2+2.5rem))] 2xl:left-[max(3rem,calc((100vw-min(100vw,80rem))/2+3rem))]",
);

/** Collapsed viewport-fixed rail — anchor at screen edge (peek tab flush left). */
export const connectHubFlowStepsViewportCollapsedClass = "left-0";

/** Collapsed peek tab — fixed to viewport left, below app nav. */
export const connectHubFlowStepsCollapsedPeekClass = cn(
  "fixed left-0 z-40",
  connectHubFlowStepsTopClass,
);

/** @deprecated Use connectHubFlowStepsViewportFixedClass */
export const connectHubFlowStepsClass = connectHubFlowStepsViewportFixedClass;

/** When app SideNav icon rail is visible — fixed rail left offset. */
export const connectHubFlowStepsSidebarOffsetClass = cn(
  "left-[max(calc(var(--sidebar-width-icon,3rem)+1.25rem),calc((100vw-min(100vw,80rem))/2+var(--sidebar-width-icon,3rem)+1.25rem))]",
  "sm:left-[max(calc(var(--sidebar-width-icon,3rem)+1.5rem),calc((100vw-min(100vw,80rem))/2+var(--sidebar-width-icon,3rem)+1.5rem))]",
  "md:left-[max(calc(var(--sidebar-width-icon,3rem)+1.75rem),calc((100vw-min(100vw,80rem))/2+var(--sidebar-width-icon,3rem)+1.75rem))]",
  "lg:left-[max(calc(var(--sidebar-width-icon,3rem)+2rem),calc((100vw-min(100vw,80rem))/2+var(--sidebar-width-icon,3rem)+2rem))]",
  "xl:left-[max(calc(var(--sidebar-width-icon,3rem)+2.25rem),calc((100vw-min(100vw,80rem))/2+var(--sidebar-width-icon,3rem)+2.25rem))]",
  "2xl:left-[max(calc(var(--sidebar-width-icon,3rem)+2.5rem),calc((100vw-min(100vw,80rem))/2+var(--sidebar-width-icon,3rem)+2.5rem))]",
);

/** When app SideNav icon rail is visible — sticky rail margin (analyze layout). */
export const connectHubFlowStepsStickySidebarOffsetClass = cn(
  "md:ml-[var(--sidebar-width-icon,3rem)]",
);

/** Step 2 dashboard — full width, minimal horizontal gutter (step rail stays viewport-fixed). */
export function connectHubAnalyzePageClass() {
  return cn(
    "mx-auto w-full max-w-none pb-16 pt-2 sm:pb-20 sm:pt-3 md:pb-20 md:pt-4",
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
  flowStepsExpanded = true,
} = {}) {
  if (fixedRail) {
    return cn(
      "w-full min-w-0 transition-[padding] duration-300 ease-in-out",
      flowStepsExpanded && "md:pl-[9.5rem] lg:pl-[12rem] xl:pl-[13.5rem]",
      flowStepsExpanded &&
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
