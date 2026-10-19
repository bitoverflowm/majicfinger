"use client";

import { BarChart3, Database, LayoutGrid, Table2, Type } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useMyStateV2 } from "@/context/stateContextV2";
import { connectHomeAnySheetHasData } from "@/lib/connectHomePullDestination";
import { cn } from "@/lib/utils";
import { useWorkspaceCanvas } from "@/components/dashboardComposer/workspaceCanvas";
import { useIntegrationConnect } from "@/components/dashboardComposer/integrationConnectDialog";
import { WorkspaceStartTabs } from "@/components/checkout/CheckoutWelcome";

const CHART_LOCKED_TIP = "Upload or connect data before adding a chart.";

function ActionButton({ icon: Icon, label, onClick, filled, disabled, tip }) {
  const button = (
    <button
      type="button"
      aria-disabled={disabled || undefined}
      onClick={disabled ? undefined : onClick}
      className={cn(
        "inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-medium shadow-sm transition-colors",
        filled
          ? "bg-foreground text-background hover:bg-foreground/90"
          : "border border-border/70 bg-background text-foreground hover:bg-muted",
        disabled && "pointer-events-none opacity-50",
      )}
    >
      <Icon className="size-4" strokeWidth={1.75} aria-hidden />
      {label}
    </button>
  );

  if (!tip) return button;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex cursor-not-allowed">{button}</span>
      </TooltipTrigger>
      <TooltipContent side="bottom" sideOffset={8} className="max-w-56 text-xs">
        {tip}
      </TooltipContent>
    </Tooltip>
  );
}

/** Empty state for a blank dashboard tab. Hidden while a saved dashboard is loading or already has blocks. */
export function BlankDashboardEmpty() {
  const canvas = useWorkspaceCanvas();
  const connect = useIntegrationConnect();
  const ctx = useMyStateV2();
  const canChart = connectHomeAnySheetHasData(ctx?.dataSheets, ctx?.connectedData);

  if (!canvas?.ready || canvas?.runFeed || (canvas?.blocks || []).length > 0) return null;

  return (
    <div className="pointer-events-auto flex min-h-0 flex-1 items-center justify-center px-6 pb-24">
      <div className="flex w-full max-w-xl flex-col items-center rounded-xl border border-border/70 bg-background px-8 py-10 text-center shadow-sm">
        <div className="mb-5 flex size-14 items-center justify-center rounded-full bg-muted/70 text-muted-foreground">
          <LayoutGrid className="size-6" strokeWidth={1.75} aria-hidden />
        </div>
        <p className="text-balance text-lg font-semibold tracking-tight text-foreground">
          Add a chart, blank table or start a new data pull right here
        </p>
        <TooltipProvider delayDuration={200}>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <ActionButton
              icon={Table2}
              label="Add data sheet"
              filled
              onClick={() => canvas?.addBlock?.("sheet")}
            />
            <ActionButton
              icon={Database}
              label="Integration"
              onClick={() => connect?.open?.()}
            />
            <ActionButton
              icon={Type}
              label="Text"
              onClick={() => canvas?.addBlock?.("text")}
            />
            <ActionButton
              icon={BarChart3}
              label="Chart"
              disabled={!canChart}
              tip={canChart ? undefined : CHART_LOCKED_TIP}
              onClick={() => canvas?.addBlock?.("chart")}
            />
          </div>
        </TooltipProvider>
      </div>
    </div>
  );
}

/**
 * Tab bar over the canvas. A saved dashboard stays visible while it loads.
 * The empty card appears only after we know this tab has no blocks.
 */
export function WorkspaceWelcomeLayer({ viewing, navChromeExpanded, checkout, connectHome }) {
  const canvas = useWorkspaceCanvas();
  const connect = useIntegrationConnect();
  const ctx = useMyStateV2();
  const landingDemo = !!ctx?.landingDemo;
  const active = (ctx?.workspaceStartTabs || []).find((tab) => tab.id === ctx?.activeWorkspaceStartTabId);
  // Landing demo: once the inline connect flow closes, its home view is the canvas.
  const landingConnect = landingDemo && viewing === "connectDataHome" && !!connect?.inlineOpen;
  const landingCanvas = landingDemo && viewing === "connectDataHome" && !connect?.inlineOpen;
  const blankTab = (viewing === "welcome" && !!active?.blank) || landingCanvas;
  const showEmpty = blankTab && !!canvas?.ready && !(canvas?.blocks || []).length && !canvas?.runFeed;
  const cover = !blankTab;

  return (
    <div
      className={cn(
        "flex min-h-0 -my-1 flex-col",
        cover
          ? cn(
              "bg-background",
              landingDemo ? "flex-1" : navChromeExpanded ? "h-svh" : "h-[calc(100svh-3.5rem)]",
            )
          : "pointer-events-none absolute inset-0 z-30",
      )}
    >
      {landingConnect ? null : (
        <div className={cover ? undefined : "pointer-events-auto"}>
          <WorkspaceStartTabs welcomeActive={viewing === "welcome"} onOpenWelcome={() => ctx?.setViewing?.("welcome")} />
        </div>
      )}
      {blankTab ? showEmpty ? <BlankDashboardEmpty /> : null : viewing === "welcome" ? checkout : connectHome}
    </div>
  );
}
