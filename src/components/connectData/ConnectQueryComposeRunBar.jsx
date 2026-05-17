"use client";

import { Play } from "lucide-react";

import { ConnectHomeSheetPullFields } from "@/components/connectData/ConnectHomeSheetPullFields";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Run bar for Connect home query compose (API + live streams).
 * Data-lake integrations use ConnectComposeOperationPanel when refine ops are open.
 */
export function ConnectQueryComposeRunBar({
  selectedCount,
  onRun,
  runLabel = "Run",
  className,
}) {
  if (selectedCount < 1) return null;

  return (
    <div className={cn("mt-6 flex flex-wrap items-end gap-2 border-t border-border/40 pt-4", className)}>
      <ConnectHomeSheetPullFields
        sheetNameInputId="connect-home-sheet-name-api"
        className="flex-1 min-w-0"
      />
      <Button type="button" size="sm" className="h-8 gap-1 text-xs [&_svg]:!size-2" onClick={onRun}>
        {runLabel}
        <Play className="!size-2 shrink-0 fill-current" aria-hidden />
      </Button>
    </div>
  );
}
