"use client";

import { useEffect, useMemo } from "react";

import { useMyStateV2 } from "@/context/stateContextV2";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  isPageFormatDockChartHeadingTarget,
  isPageFormatDockChartMicrotextTarget,
  isPageFormatDockChartSubheadingTarget,
} from "@/lib/chartCardTextTheme";
import { resolveFormatDockTarget } from "@/lib/formatDockResolve";
import { composerBottomDockChromeClass } from "@/lib/composerBottomDockChromeClass";
import { composerDockFixedZClass } from "@/lib/composerDockLayers";
import { TextFormatDockStrip } from "@/components/dashboardComposer/TextFormatDockStrip";
import { cn } from "@/lib/utils";

/**
 * Bottom format bar for **page** title / subheading only. Chart card text formatting
 * is rendered beside {@link ChartComposerDock}.
 * @param {{ editorInset: { left: number; width: number } | null }} props
 */
export function PageTitleFormatDock({ editorInset = null }) {
  const {
    chartDashboardDraft,
    setChartDashboardDraft,
    pageFormatDockTarget,
    setPageFormatDockTarget,
  } = useMyStateV2();

  const isChartTextTarget =
    isPageFormatDockChartHeadingTarget(pageFormatDockTarget) ||
    isPageFormatDockChartSubheadingTarget(pageFormatDockTarget) ||
    isPageFormatDockChartMicrotextTarget(pageFormatDockTarget);

  const resolved = useMemo(() => {
    if (isChartTextTarget) return null;
    return resolveFormatDockTarget(pageFormatDockTarget, chartDashboardDraft, setChartDashboardDraft);
  }, [isChartTextTarget, pageFormatDockTarget, chartDashboardDraft, setChartDashboardDraft]);

  const pt = resolved?.pt;
  const dockLabel = resolved?.dockLabel ?? "Title";
  const ariaLabel = resolved?.ariaLabel ?? "Title formatting";

  useEffect(() => {
    if (!pageFormatDockTarget || isChartTextTarget) return;
    const onKey = (e) => {
      if (e.key === "Escape") setPageFormatDockTarget?.(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [pageFormatDockTarget, isChartTextTarget, setPageFormatDockTarget]);

  if (isChartTextTarget || !pageFormatDockTarget || !chartDashboardDraft || !resolved || !pt) {
    return null;
  }

  const barPositionStyle = editorInset
    ? {
        position: "fixed",
        left: editorInset.left,
        width: editorInset.width,
        bottom: 24,
      }
    : { position: "fixed", left: 0, right: 0, bottom: 24 };

  return (
    <div
      className={cn("pointer-events-auto flex justify-center overflow-visible px-4", composerDockFixedZClass)}
      style={barPositionStyle}
      onMouseDown={(e) => e.preventDefault()}
      role="toolbar"
      aria-label={ariaLabel}
    >
      <div className="flex max-w-full justify-center overflow-visible">
        <div className="inline-flex max-w-full min-w-0 flex-nowrap items-center gap-2 overflow-x-auto overflow-y-visible overscroll-x-contain">
          <div className={composerBottomDockChromeClass}>
            <span className="shrink-0 select-none self-center text-sm font-medium text-muted-foreground">
              {dockLabel}
            </span>
            <TooltipProvider delayDuration={200}>
              <TextFormatDockStrip pt={pt} patchPartial={resolved.patchPartial} />
            </TooltipProvider>
          </div>
        </div>
      </div>
    </div>
  );
}
