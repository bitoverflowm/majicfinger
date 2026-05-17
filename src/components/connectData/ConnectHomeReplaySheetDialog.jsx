"use client";

import { useEffect, useState } from "react";

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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConnectProgressWithLabel } from "@/components/integrationsView/integrationPlayground/integrations/polymarketHistorical/ConnectProgressWithLabel";

export function ConnectHomeReplaySheetDialog({
  open,
  onOpenChange,
  onReplaceCurrent,
  onCreateNewSheet,
  queryLabel,
  loading = false,
  pullLabel = "Loading data…",
  pullProgress = 0,
}) {
  const [step, setStep] = useState("choose");
  const [sheetName, setSheetName] = useState("");

  useEffect(() => {
    if (!open) {
      setStep("choose");
      setSheetName("");
      return;
    }
    if (loading) {
      setStep("loading");
    } else if (step === "loading") {
      setStep(sheetName.trim() ? "name" : "choose");
    }
  }, [open, loading, sheetName, step]);

  const handleOpenChange = (next) => {
    if (loading) return;
    onOpenChange?.(next);
  };

  const handleCreateNewSheet = async () => {
    const name = String(sheetName || "").trim();
    if (!name) return;
    setStep("loading");
    await onCreateNewSheet?.(name);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-lg gap-4 sm:max-w-lg">
        {step === "loading" ? (
          <>
            <DialogHeader>
              <DialogTitle>Loading query</DialogTitle>
              <DialogDescription>
                {queryLabel
                  ? `Running “${queryLabel}” and building your sheet.`
                  : "Running your saved query and building your sheet."}
              </DialogDescription>
            </DialogHeader>
            <ConnectProgressWithLabel
              label={pullLabel || "Loading data…"}
              progress={pullProgress ?? 0}
              className="py-2"
            />
          </>
        ) : step === "name" ? (
          <>
            <DialogHeader>
              <DialogTitle>Name your sheet</DialogTitle>
              <DialogDescription>
                Choose a name for the new sheet. We&apos;ll run the query and load the data when you
                continue.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 py-1">
              <Label htmlFor="replay-new-sheet-name" className="text-sm font-medium">
                Sheet name
              </Label>
              <Input
                id="replay-new-sheet-name"
                value={sheetName}
                onChange={(e) => setSheetName(e.target.value)}
                placeholder="e.g. Kalshi markets replay"
                className="w-full"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter" && sheetName.trim()) {
                    e.preventDefault();
                    void handleCreateNewSheet();
                  }
                }}
              />
            </div>
            <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
              <Button
                type="button"
                variant="ghost"
                className="w-full sm:w-auto"
                onClick={() => setStep("choose")}
              >
                Back
              </Button>
              <DialogClose asChild>
                <Button type="button" variant="ghost" className="w-full sm:w-auto">
                  Cancel
                </Button>
              </DialogClose>
              <Button
                type="button"
                className="w-full sm:w-auto"
                disabled={!String(sheetName || "").trim()}
                onClick={() => void handleCreateNewSheet()}
              >
                Run query
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Replay query</DialogTitle>
              <DialogDescription className="text-pretty">
                {queryLabel
                  ? `Run “${queryLabel}” again. Replace the current sheet or create a new sheet with a fresh name.`
                  : "Run this query again. Replace the current sheet or create a new sheet with a fresh name."}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
              <DialogClose asChild>
                <Button type="button" variant="ghost" className="w-full sm:w-auto">
                  Cancel
                </Button>
              </DialogClose>
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto shrink-0"
                onClick={onReplaceCurrent}
              >
                Replace current sheet
              </Button>
              <Button
                type="button"
                className="w-full sm:w-auto shrink-0"
                onClick={() => {
                  setSheetName(
                    queryLabel ? queryLabel.replace(/[^\w\s·-]/g, "").slice(0, 48) : "",
                  );
                  setStep("name");
                }}
              >
                Create new sheet
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
