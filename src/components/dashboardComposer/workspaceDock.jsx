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
import { useIntegrationConnect } from "@/components/dashboardComposer/integrationConnectDialog";

const TOOLS = [
  { id: "select", label: "Selection tool", icon: MousePointer2, action: "tool", tool: "select" },
  { id: "hand", label: "Hand tool", action: "tool", tool: "hand" },
  { id: "sheet", label: "Add data sheet", icon: Table2, action: "add" },
  { id: "source", label: "Add data source", icon: Database, action: "add" },
  { id: "chart", label: "Add chart", icon: BarChart3, action: "add" },
  { id: "text", label: "Add text", icon: Type, action: "add" },
  { id: "export", label: "Export", icon: Upload, action: "export" },
];

function HandToolIcon({ closed }) {
  const curl = (degrees) => ({
    transformBox: "fill-box",
    transformOrigin: "50% 100%",
    transform: closed ? `translateY(1.5px) rotate(${degrees}deg) scaleY(0.72)` : "none",
    transition: "transform 150ms cubic-bezier(0.22, 1, 0.36, 1)",
  });
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn("size-[18px] origin-center transition-transform duration-150 ease-out", closed && "scale-[0.9]")}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M8.2 11.4V7a1.35 1.35 0 0 1 2.7 0v4.4" style={curl(18)} />
      <path d="M10.9 10.8V4.8a1.35 1.35 0 0 1 2.7 0V11" style={curl(6)} />
      <path d="M13.6 11V6.2a1.35 1.35 0 0 1 2.7 0V11.3" style={curl(-8)} />
      <path d="M16.3 12.2V8.4a1.3 1.3 0 0 1 2.6 0v3.8c0 3.6-2.1 6.6-5.8 6.6h-1.4c-2.2 0-3.5-.8-4.7-2.2L5.2 14.2a1.45 1.45 0 0 1 2.15-1.95L9.2 14" />
    </svg>
  );
}

export function WorkspaceDock() {
  const canvas = useWorkspaceCanvas();
  const connect = useIntegrationConnect();
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
            const selected = item.action === "tool" && tool === item.tool;
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
                      aria-pressed={item.action === "tool" ? selected : undefined}
                      onClick={() => {
                        if (item.action === "tool") canvas?.setTool?.(item.tool);
                        else if (item.id === "source") connect?.open?.();
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
                      {item.id === "hand" ? (
                        <HandToolIcon closed={selected && !!canvas?.handDown} />
                      ) : (
                        <Icon className="size-[18px]" strokeWidth={1.75} aria-hidden />
                      )}
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
