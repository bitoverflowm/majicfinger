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

/** Empty state for a blank dashboard tab. Hidden once the page has canvas blocks. */
export function BlankDashboardEmpty() {
  const canvas = useWorkspaceCanvas();
  const ctx = useMyStateV2();
  const canChart = connectHomeAnySheetHasData(ctx?.dataSheets, ctx?.connectedData);

  if ((canvas?.blocks || []).length > 0) return null;

  return (
    <div className="flex min-h-0 flex-1 items-center justify-center bg-background px-6 pb-24">
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
              onClick={() => canvas?.addBlock?.("source")}
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
