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
}) {
  const [step, setStep] = useState(1);
  const hasMultipleConnections = replaceTargets?.length > 1;

  useEffect(() => {
    if (!open) setStep(1);
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

  if (step === 2) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Which connection do you want to replace?</DialogTitle>
            <DialogDescription>
              <span className="block text-destructive font-medium mt-1">
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
                {(symbol && typeof symbol === "string" ? symbol.replace("/", " / ").toUpperCase() : symbol) ?? "—"} — {sheetName ?? sheetId}
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
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Data already connected</DialogTitle>
          <DialogDescription>
            {hasLiveConnection
              ? "You already have a live connection or data in this sheet. Would you like to replace the current data (and stop the live connection) or create a new sheet?"
              : "You already have data in this sheet. Choose whether to add to the current sheet, replace it, or add a new sheet."}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <DialogClose asChild>
            <Button variant="ghost">Cancel</Button>
          </DialogClose>
          {typeof onAddToCurrent === "function" ? (
            <Button variant="secondary" onClick={onAddToCurrent}>
              Add to current sheet
            </Button>
          ) : null}
          <Button variant="outline" onClick={handleReplace}>
            Replace data
          </Button>
          <Button onClick={handleAddNewSheet}>Add new sheet</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
