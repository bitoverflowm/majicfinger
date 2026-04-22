"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const PIVOT_NONE = "__none__";

export function ReplaceOrNewSheetDialog({
  open,
  onOpenChange,
  onAddToCurrent,
  onReplace,
  onReplaceOne,
  onReplaceAll,
  onAddNewSheet,
  hasLiveConnection = false,
  replaceTargets = [],
  existingColumnNames = [],
}) {
  const [step, setStep] = useState(1);
  const [appendFlowOpen, setAppendFlowOpen] = useState(false);
  /** false = add as new rows; true = create new columns */
  const [columnsMode, setColumnsMode] = useState(false);
  const [pivotChoice, setPivotChoice] = useState(PIVOT_NONE);

  const hasMultipleConnections = replaceTargets?.length > 1;

  useEffect(() => {
    if (!open) {
      setStep(1);
      setAppendFlowOpen(false);
      setColumnsMode(false);
      setPivotChoice(PIVOT_NONE);
    }
  }, [open]);

  const handleReplace = () => {
    if (hasMultipleConnections) {
      setStep(2);
    } else {
      onReplace?.();
      onOpenChange?.(false);
    }
  };

  const handleReplaceOne = (sheetId) => {
    onReplaceOne?.(sheetId);
    onOpenChange?.(false);
  };

  const handleReplaceAll = () => {
    onReplaceAll?.();
    onOpenChange?.(false);
  };

  const handleAddNewSheet = () => {
    onAddNewSheet?.();
    onOpenChange?.(false);
  };

  const handleBack = () => setStep(1);

  const handleConfirmAppend = () => {
    const sameSheet = columnsMode
      ? {
          mode: "new_columns",
          pivotColumn: pivotChoice === PIVOT_NONE ? null : pivotChoice,
        }
      : { mode: "new_rows" };
    onAddToCurrent?.(sameSheet);
  };

  if (step === 2) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Which connection do you want to replace?</DialogTitle>
            <DialogDescription>
              <span className="mt-1 block font-medium text-destructive">
                Replacing a connection cannot be recovered. Data will be gone forever.
              </span>
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 py-2">
            {replaceTargets.map(({ sheetId, symbol, sheetName }) => (
              <Button
                key={sheetId}
                variant="outline"
                className="justify-start"
                onClick={() => handleReplaceOne(sheetId)}
              >
                {(symbol && typeof symbol === "string" ? symbol.replace("/", " / ").toUpperCase() : symbol) ?? "—"} —{" "}
                {sheetName ?? sheetId}
              </Button>
            ))}
            <Button variant="destructive" className="justify-start" onClick={handleReplaceAll}>
              Replace all connections
            </Button>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={handleBack}>
              Back
            </Button>
            <DialogClose asChild>
              <Button variant="ghost">Cancel</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Data already connected</DialogTitle>
          <DialogDescription>
            {hasLiveConnection
              ? "You already have a live connection or data in this sheet. Would you like to replace the current data (and stop the live connection) or create a new sheet?"
              : "You already have data in this sheet. Choose whether to add to the current sheet, replace it, or add a new sheet."}
          </DialogDescription>
        </DialogHeader>

        {appendFlowOpen && typeof onAddToCurrent === "function" ? (
          <div className="flex flex-col gap-4 py-1">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <span
                className={cn(
                  "cursor-pointer text-xs font-normal select-none",
                  !columnsMode ? "font-medium text-foreground" : "text-muted-foreground",
                )}
                onClick={() => setColumnsMode(false)}
                onKeyDown={(e) => e.key === "Enter" && setColumnsMode(false)}
                role="button"
                tabIndex={0}
              >
                Add as new rows
              </span>
              <Switch
                id="integration-append-mode"
                checked={columnsMode}
                onCheckedChange={setColumnsMode}
                className="origin-center scale-90"
                aria-label="Toggle between new rows and new columns"
              />
              <span
                className={cn(
                  "cursor-pointer text-xs font-normal select-none",
                  columnsMode ? "font-medium text-foreground" : "text-muted-foreground",
                )}
                onClick={() => setColumnsMode(true)}
                onKeyDown={(e) => e.key === "Enter" && setColumnsMode(true)}
                role="button"
                tabIndex={0}
              >
                Create new columns
              </span>
            </div>

            {columnsMode ? (
              <div className="space-y-2">
                <Label htmlFor="pivot-column-select" className="text-sm font-medium">
                  Is there a pivot column?
                </Label>
                <p id="pivot-column-hint" className="text-sm text-muted-foreground leading-snug">
                  This is a column like Time that your datasets may share—we merge rows on this key (like a group-by).
                  Choose &quot;No&quot; to align by row order instead.
                </p>
                <Select value={pivotChoice} onValueChange={setPivotChoice}>
                  <SelectTrigger id="pivot-column-select" className="w-full" aria-describedby="pivot-column-hint">
                    <SelectValue placeholder="Choose pivot or no pivot" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={PIVOT_NONE}>No — align by row index</SelectItem>
                    {existingColumnNames.map((col) => (
                      <SelectItem key={col} value={col}>
                        {col}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end pt-2">
              <Button type="button" variant="ghost" className="w-full sm:w-auto" onClick={() => setAppendFlowOpen(false)}>
                Back
              </Button>
              <DialogClose asChild>
                <Button type="button" variant="ghost" className="w-full sm:w-auto">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="button" className="w-full sm:w-auto" onClick={handleConfirmAppend}>
                Continue
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
            <DialogClose asChild>
              <Button variant="ghost" className="w-full sm:w-auto">
                Cancel
              </Button>
            </DialogClose>
            {typeof onAddToCurrent === "function" ? (
              <Button
                variant="secondary"
                className="w-full sm:w-auto"
                onClick={() => setAppendFlowOpen(true)}
              >
                Add to same sheet
              </Button>
            ) : null}
            <Button variant="outline" onClick={handleReplace} className="w-full sm:w-auto">
              Replace data
            </Button>
            <Button onClick={handleAddNewSheet} className="w-full sm:w-auto">
              Add new sheet
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
