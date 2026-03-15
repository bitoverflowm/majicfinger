"use client";

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
  onReplace,
  onAddNewSheet,
  hasLiveConnection = false,
}) {
  const handleReplace = () => {
    onReplace?.();
    onOpenChange?.(false);
  };

  const handleAddNewSheet = () => {
    onAddNewSheet?.();
    onOpenChange?.(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Data already connected</DialogTitle>
          <DialogDescription>
            {hasLiveConnection
              ? "You already have a live connection or data in this sheet. Would you like to replace the current data (and stop the live connection) or create a new sheet?"
              : "You already have data in this sheet. Would you like to replace the current data or create a new sheet?"}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <DialogClose asChild>
            <Button variant="ghost">Cancel</Button>
          </DialogClose>
          <Button variant="outline" onClick={handleReplace}>
            Replace data
          </Button>
          <Button onClick={handleAddNewSheet}>Add new sheet</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
