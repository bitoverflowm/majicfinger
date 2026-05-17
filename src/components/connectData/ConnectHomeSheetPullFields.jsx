"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMyStateV2 } from "@/context/stateContextV2";
import {
  connectHomeAnySheetHasData,
  normalizeConnectHomePullDestination,
} from "@/lib/connectHomePullDestination";
import { cn } from "@/lib/utils";

/**
 * Sheet name + replace/new sheet choice for Connect home integration pulls.
 *
 * @param {{
 *   sheetNameInputId?: string;
 *   className?: string;
 *   nameFieldClassName?: string;
 * }} props
 */
export function ConnectHomeSheetPullFields({
  sheetNameInputId = "connect-home-sheet-name",
  className,
  nameFieldClassName,
}) {
  const ctx = useMyStateV2() ?? {};
  const {
    connectHomePendingSheetName,
    setConnectHomePendingSheetName,
    connectHomePullDestination,
    setConnectHomePullDestination,
    activeSheetId,
    dataSheets,
    connectedData,
  } = ctx;

  const hasExistingData = connectHomeAnySheetHasData(dataSheets, connectedData);
  const activeSheetName =
    (activeSheetId && dataSheets?.[activeSheetId]?.name) || activeSheetId || "current sheet";
  const destination = normalizeConnectHomePullDestination(connectHomePullDestination);

  const setDestination = (next) => {
    setConnectHomePullDestination?.(normalizeConnectHomePullDestination(next));
  };

  return (
    <div className={cn("flex flex-wrap items-end gap-x-4 gap-y-3", className)}>
      <div className={cn("flex min-w-[10rem] flex-col gap-1", nameFieldClassName)}>
        <Label htmlFor={sheetNameInputId} className="text-[11px] font-medium text-muted-foreground">
          {destination === "new_sheet" ? "Name your new sheet" : "Name your sheet"}
        </Label>
        <Input
          id={sheetNameInputId}
          value={connectHomePendingSheetName ?? ""}
          onChange={(e) => setConnectHomePendingSheetName?.(e.target.value)}
          placeholder={activeSheetName}
          className="h-8 text-xs"
          maxLength={80}
        />
      </div>

      {hasExistingData ? (
        <fieldset className="flex min-w-0 flex-col gap-1.5 pb-0.5">
          <legend className="text-[11px] font-medium text-muted-foreground">Add data to</legend>
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Add data to">
            <button
              type="button"
              role="radio"
              aria-checked={destination === "replace"}
              onClick={() => setDestination("replace")}
              className={cn(
                "rounded-md border px-2.5 py-1.5 text-[11px] font-medium transition-colors",
                destination === "replace"
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border/60 bg-card text-muted-foreground hover:border-border hover:bg-muted/20",
              )}
            >
              Replace {activeSheetName}
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={destination === "new_sheet"}
              onClick={() => setDestination("new_sheet")}
              className={cn(
                "rounded-md border px-2.5 py-1.5 text-[11px] font-medium transition-colors",
                destination === "new_sheet"
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border/60 bg-card text-muted-foreground hover:border-border hover:bg-muted/20",
              )}
            >
              New sheet
            </button>
          </div>
        </fieldset>
      ) : null}
    </div>
  );
}
