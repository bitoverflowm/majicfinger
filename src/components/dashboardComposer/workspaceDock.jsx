"use client";

import { useEffect, useRef, useState } from "react";
import { BarChart3, Database, MousePointer2, Table2, Type, Upload } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useMyStateV2 } from "@/context/stateContextV2";
import { useWorkspaceCanvas } from "@/components/dashboardComposer/workspaceCanvas";
import { useIntegrationConnect } from "@/components/dashboardComposer/integrationConnectDialog";
import { EXPORT_TIP_ID, HAND_TIP_ID, HandToolFeatureTip } from "@/components/dashboardComposer/buildFeatureTips";
import { HandToolIcon } from "@/components/dashboardComposer/handToolIcon";
import { useFeatureTipDismissal } from "@/components/ui/feature-tip";

const TOOLS = [
  { id: "select", label: "Selection tool", icon: MousePointer2, action: "tool", tool: "select" },
  { id: "hand", label: "Hand tool", action: "tool", tool: "hand" },
  { id: "sheet", label: "Add data sheet", icon: Table2, action: "add" },
  { id: "source", label: "Add data source", icon: Database, action: "add" },
  { id: "chart", label: "Add chart", icon: BarChart3, action: "add", comingSoon: true },
  { id: "text", label: "Add text", icon: Type, action: "add", comingSoon: true },
  { id: "export", label: "Export", icon: Upload, action: "export" },
];

export function WorkspaceDock() {
  const ctx = useMyStateV2();
  const canvas = useWorkspaceCanvas();
  const connect = useIntegrationConnect();
  const tool = canvas?.tool || "select";
  const handButtonRef = useRef(null);
  const exportTip = useFeatureTipDismissal(EXPORT_TIP_ID);
  const handTip = useFeatureTipDismissal(HAND_TIP_ID);
  const dismissHandTip = handTip.dismiss;
  const handTipDue =
    !!canvas?.ready &&
    !canvas?.readOnly &&
    !canvas?.runFeed &&
    (canvas?.blocks || []).some((block) => block.type === "sheet" || block.type === "chart") &&
    exportTip.dismissed === true &&
    handTip.dismissed === false;
  const [handTipOpen, setHandTipOpen] = useState(false);
  useEffect(() => {
    if (!handTipDue) {
      setHandTipOpen(false);
      return undefined;
    }
    if (tool === "hand") {
      dismissHandTip();
      return undefined;
    }
    const timer = window.setTimeout(() => setHandTipOpen(true), 600);
    return () => window.clearTimeout(timer);
  }, [handTipDue, tool, dismissHandTip]);

  if (ctx?.landingDemo && (!ctx?.landingDemoActive || connect?.inlineOpen)) return null;
  const sheetCount = (canvas?.blocks || []).filter((block) => block.type === "sheet").length;

  return (
    <div
      className={cn(
        "pointer-events-auto bottom-6 left-1/2 z-[500] -translate-x-1/2",
        // The landing demo is a frame inside a scrolling page, so the dock sits in that frame.
        ctx?.landingDemo ? "absolute" : "fixed",
      )}
      onMouseDown={(e) => {
        if (e.target instanceof Element && e.target.closest("[aria-haspopup='menu']")) return;
        e.preventDefault();
      }}
    >
      <TooltipProvider delayDuration={300}>
        <div
          role="toolbar"
          aria-label="Dashboard tools"
          className="flex items-center gap-0.5 rounded-[14px] bg-white p-1 text-neutral-800 shadow-[0_0_0.5px_rgba(0,0,0,0.18),0_1px_3px_rgba(0,0,0,0.08),0_12px_32px_rgba(0,0,0,0.12)] dark:bg-[#2c2c2c] dark:text-neutral-100"
        >
          {TOOLS.map((item) => {
            const Icon = item.icon;
            const selected = item.action === "tool" && tool === item.tool;
            return (
              <div key={item.id} className="flex items-center">
                {item.id === "sheet" || item.id === "export" ? (
                  <span className="mx-1 h-5 w-px bg-black/10 dark:bg-white/15" aria-hidden />
                ) : null}
                {item.id === "chart" && sheetCount > 0 && !item.comingSoon ? (
                  <ChartToolMenu canvas={canvas} />
                ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      ref={item.id === "hand" ? handButtonRef : undefined}
                      type="button"
                      aria-label={item.label}
                      aria-disabled={item.comingSoon || undefined}
                      aria-pressed={item.action === "tool" ? selected : undefined}
                      onClick={() => {
                        if (item.comingSoon) return;
                        if (item.action === "tool") canvas?.setTool?.(item.tool);
                        else if (item.id === "source") connect?.open?.();
                        else if (item.action === "add") canvas?.addBlock?.(item.id);
                        else canvas?.setTool?.("select");
                      }}
                      className={cn(
                        "inline-flex size-8 items-center justify-center rounded-[8px] text-neutral-700 transition-colors dark:text-neutral-200",
                        selected
                          ? "bg-[#0d99ff] text-white hover:bg-[#0b87e0] dark:text-white"
                          : item.comingSoon
                            ? "cursor-not-allowed opacity-40"
                            : "hover:bg-black/[0.05] dark:hover:bg-white/10",
                      )}
                    >
                      {item.id === "hand" ? (
                        <HandToolIcon closed={selected && !!canvas?.handDown} />
                      ) : (
                        <Icon className="size-[18px]" strokeWidth={1.75} aria-hidden />
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" sideOffset={8} className="!z-[520] text-xs">
                    {item.comingSoon ? "Coming soon" : item.label}
                  </TooltipContent>
                </Tooltip>
                )}
              </div>
            );
          })}
        </div>
      </TooltipProvider>
      {handTipDue ? <HandToolFeatureTip anchorRef={handButtonRef} open={handTipOpen} /> : null}
    </div>
  );
}

function ChartToolMenu({ canvas }) {
  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Add chart"
              className="inline-flex size-8 items-center justify-center rounded-[8px] text-neutral-700 transition-colors hover:bg-black/[0.05] dark:text-neutral-200 dark:hover:bg-white/10"
            >
              <BarChart3 className="size-[18px]" strokeWidth={1.75} aria-hidden />
            </button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="top" sideOffset={8} className="!z-[520] text-xs">
          Add chart
        </TooltipContent>
      </Tooltip>
      <DropdownMenuContent side="top" align="center" sideOffset={12} className="z-[520] min-w-64">
        <DropdownMenuItem onSelect={() => canvas?.addBlock?.("chart")}>Add chart</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => canvas?.generateChartsForSheets?.()}>
          Generate charts for all your data
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
