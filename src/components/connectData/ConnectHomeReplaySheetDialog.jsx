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

export function ConnectHomeReplaySheetDialog({
  open,
  onOpenChange,
  onReplaceCurrent,
  onNewSheet,
  queryLabel,
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Replay query</DialogTitle>
          <DialogDescription>
            {queryLabel
              ? `Run “${queryLabel}” again. Choose whether to replace the current sheet or load into a new sheet.`
              : "Run this query again. Choose whether to replace the current sheet or load into a new sheet."}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <DialogClose asChild>
            <Button type="button" variant="ghost" className="w-full sm:w-auto">
              Cancel
            </Button>
          </DialogClose>
          <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={onReplaceCurrent}>
            Replace current sheet
          </Button>
          <Button type="button" className="w-full sm:w-auto" onClick={onNewSheet}>
            Run to new sheet
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
