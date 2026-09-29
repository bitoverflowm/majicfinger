"use client";

import { BarChart3, Database, MousePointer2, Table2, Type, Upload } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useWorkspaceCanvas } from "@/components/dashboardComposer/workspaceCanvas";

const TOOLS = [
  { id: "select", label: "Selection tool", icon: MousePointer2, action: "select" },
  { id: "sheet", label: "Add data sheet", icon: Table2, action: "add" },
  { id: "source", label: "Add data source", icon: Database, action: "add" },
  { id: "chart", label: "Add chart", icon: BarChart3, action: "add" },
  { id: "text", label: "Add text", icon: Type, action: "add" },
  { id: "export", label: "Export", icon: Upload, action: "export" },
];

export function WorkspaceDock() {
  const canvas = useWorkspaceCanvas();
  const tool = canvas?.tool || "select";

  return (
    <div
      className="pointer-events-auto fixed bottom-6 left-1/2 z-[500] -translate-x-1/2"
      onMouseDown={(e) => e.preventDefault()}
    >
      <TooltipProvider delayDuration={300}>
        <div
          role="toolbar"
          aria-label="Dashboard tools"
          className="flex items-center gap-0.5 rounded-[14px] bg-white p-1 text-neutral-800 shadow-[0_0_0.5px_rgba(0,0,0,0.18),0_1px_3px_rgba(0,0,0,0.08),0_12px_32px_rgba(0,0,0,0.12)] dark:bg-[#2c2c2c] dark:text-neutral-100"
        >
          {TOOLS.map((item) => {
            const Icon = item.icon;
            const selected = item.action === "select" && tool === "select";
            return (
              <div key={item.id} className="flex items-center">
                {item.id === "export" ? (
                  <span className="mx-1 h-5 w-px bg-black/10 dark:bg-white/15" aria-hidden />
                ) : null}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      aria-label={item.label}
                      aria-pressed={item.action === "select" ? selected : undefined}
                      onClick={() => {
                        if (item.action === "select") canvas?.setTool?.("select");
                        else if (item.action === "add") canvas?.addBlock?.(item.id);
                        else canvas?.setTool?.("select");
                      }}
                      className={cn(
                        "inline-flex size-8 items-center justify-center rounded-[8px] text-neutral-700 transition-colors dark:text-neutral-200",
                        selected
                          ? "bg-[#0d99ff] text-white hover:bg-[#0b87e0] dark:text-white"
                          : "hover:bg-black/[0.05] dark:hover:bg-white/10",
                      )}
                    >
                      <Icon className="size-[18px]" strokeWidth={1.75} aria-hidden />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" sideOffset={8} className="!z-[520] text-xs">
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              </div>
            );
          })}
        </div>
      </TooltipProvider>
    </div>
  );
}
