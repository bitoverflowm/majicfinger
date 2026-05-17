"use client";

import { motion } from "framer-motion";
import { Play } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMyStateV2 } from "@/context/stateContextV2";
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
  const {
    connectHomePendingSheetName,
    setConnectHomePendingSheetName,
    activeSheetId,
    dataSheets,
  } = useMyStateV2() ?? {};

  if (selectedCount < 1) return null;

  return (
    <div className={cn("mt-6 flex flex-wrap items-end gap-2 border-t border-border/40 pt-4", className)}>
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex min-w-[10rem] flex-col gap-1"
      >
        <Label htmlFor="connect-home-sheet-name-api" className="text-[11px] font-medium text-muted-foreground">
          Name your sheet
        </Label>
        <Input
          id="connect-home-sheet-name-api"
          value={connectHomePendingSheetName ?? ""}
          onChange={(e) => setConnectHomePendingSheetName?.(e.target.value)}
          placeholder={dataSheets?.[activeSheetId]?.name || "Sheet 1"}
          className="h-8 text-xs"
          maxLength={80}
        />
      </motion.div>
      <Button type="button" size="sm" className="h-8 gap-1 text-xs [&_svg]:!size-2" onClick={onRun}>
        {runLabel}
        <Play className="!size-2 shrink-0 fill-current" aria-hidden />
      </Button>
    </div>
  );
}
