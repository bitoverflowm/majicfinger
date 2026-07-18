"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
 *   autoNamedSheets?: { name: string; title?: string }[] | null;
 *   autoNamedSheetsMessage?: string;
 * }} props
 */
export function ConnectHomeSheetPullFields({
  sheetNameInputId = "connect-home-sheet-name",
  className,
  nameFieldClassName,
  autoNamedSheets = null,
  autoNamedSheetsMessage,
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
  const useAutoNames = Array.isArray(autoNamedSheets);

  const setDestination = (next) => {
    setConnectHomePullDestination?.(normalizeConnectHomePullDestination(next));
  };

  return (
    <div className={cn("flex flex-wrap items-end gap-x-4 gap-y-3", className)}>
      {useAutoNames ? (
        <div className={cn("flex min-w-[12rem] max-w-full flex-1 flex-col gap-1.5", nameFieldClassName)}>
          {autoNamedSheetsMessage ? (
            <p className="text-[11px] leading-snug text-muted-foreground">{autoNamedSheetsMessage}</p>
          ) : (
            <Label className="text-[11px] font-medium text-muted-foreground">Sheet names</Label>
          )}
          {autoNamedSheets.length === 0 ? (
            <p className="text-[11px] text-muted-foreground">Add market tickers above to see sheet names.</p>
          ) : (
            <TooltipProvider delayDuration={200}>
              <ul className="flex flex-wrap gap-1.5">
                {autoNamedSheets.map((sheet) => (
                  <li key={sheet.name}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="inline-flex max-w-full cursor-default items-center rounded-md border border-border/60 bg-muted/30 px-2 py-1 font-mono text-[11px] font-medium text-foreground">
                          <span className="truncate">{sheet.name}</span>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs text-pretty">
                        {sheet.title || sheet.name}
                      </TooltipContent>
                    </Tooltip>
                  </li>
                ))}
              </ul>
            </TooltipProvider>
          )}
        </div>
      ) : (
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
      )}

      {hasExistingData ? (
        <fieldset className="flex min-w-0 flex-col gap-1.5 pb-0.5">
          <legend className="text-[11px] font-medium text-muted-foreground">Add data to</legend>
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            value={destination}
            onValueChange={(value) => {
              if (value) setDestination(value);
            }}
            className="h-8 flex-wrap justify-start"
            aria-label="Add data to"
          >
            <ToggleGroupItem value="new_sheet" className="h-8 px-2.5 text-[11px]">
              New sheet
            </ToggleGroupItem>
            <ToggleGroupItem value="replace" className="h-8 max-w-[14rem] truncate px-2.5 text-[11px]">
              Replace {activeSheetName}
            </ToggleGroupItem>
          </ToggleGroup>
        </fieldset>
      ) : null}
    </div>
  );
}
