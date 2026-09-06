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

/**
 * Choose replace vs new sheet for Replay (run now) or Edit (open compose).
 * Seeded random-sample replays also choose reuse-seed vs new-seed.
 *
 * @param {{
 *   open: boolean;
 *   onOpenChange: (open: boolean) => void;
 *   onReplaceCurrent: (opts?: { seedMode?: "reuse" | "fresh" }) => void | Promise<void>;
 *   onCreateNewSheet: (name: string, opts?: { seedMode?: "reuse" | "fresh" }) => void | Promise<void>;
 *   queryLabel?: string;
 *   sourceSheetName?: string;
 *   loading?: boolean;
 *   pullLabel?: string;
 *   pullProgress?: number;
 *   intent?: "replay" | "edit";
 *   onCancel?: () => void;
 *   askSeedChoice?: boolean;
 *   currentSeed?: string;
 * }} props
 */
export function ConnectHomeReplaySheetDialog({
  open,
  onOpenChange,
  onReplaceCurrent,
  onCreateNewSheet,
  queryLabel,
  sourceSheetName,
  loading = false,
  pullLabel = "Loading data…",
  pullProgress = 0,
  intent = "replay",
  onCancel,
  askSeedChoice = false,
  currentSeed = "",
}) {
  const isEdit = intent === "edit";
  const [step, setStep] = useState("choose");
  const [sheetName, setSheetName] = useState("");
  /** @type {[{ type: "replace" } | { type: "new_sheet"; name: string } | null, Function]} */
  const [pendingAction, setPendingAction] = useState(null);

  useEffect(() => {
    if (!open) {
      setStep("choose");
      setSheetName("");
      setPendingAction(null);
      return;
    }
    if (loading) {
      setStep("loading");
    } else if (step === "loading") {
      setStep(sheetName.trim() ? "name" : "choose");
    }
  }, [open, loading, sheetName, step]);

  const handleOpenChange = (next) => {
    if (loading && next === false) {
      onCancel?.();
      return;
    }
    if (loading) return;
    onOpenChange?.(next);
  };

  const goToSeedOrRun = (action) => {
    if (!isEdit && askSeedChoice) {
      setPendingAction(action);
      setStep("seed");
      return;
    }
    if (action.type === "new_sheet") {
      void onCreateNewSheet?.(action.name, { seedMode: "reuse" });
      return;
    }
    void onReplaceCurrent?.({ seedMode: "reuse" });
  };

  const handleCreateNewSheet = async () => {
    const name = String(sheetName || "").trim();
    if (!name) return;
    if (!isEdit && askSeedChoice) {
      goToSeedOrRun({ type: "new_sheet", name });
      return;
    }
    if (!isEdit) setStep("loading");
    await onCreateNewSheet?.(name, { seedMode: "reuse" });
  };

  const handleReplace = async () => {
    if (!isEdit && askSeedChoice) {
      goToSeedOrRun({ type: "replace" });
      return;
    }
    if (!isEdit) setStep("loading");
    await onReplaceCurrent?.({ seedMode: "reuse" });
  };

  const handleSeedChoice = async (seedMode) => {
    const action = pendingAction;
    if (!isEdit) setStep("loading");
    if (action?.type === "new_sheet") {
      await onCreateNewSheet?.(action.name, { seedMode });
      return;
    }
    await onReplaceCurrent?.({ seedMode });
  };

  const seedLabel = String(currentSeed || "").trim();

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
                  : "Running your query and building your sheet."}
              </DialogDescription>
            </DialogHeader>
            <ConnectProgressWithLabel
              label={pullLabel || "Loading data…"}
              progress={pullProgress ?? 0}
              className="py-2"
            />
            <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="ghost" className="w-full sm:w-auto" onClick={() => onCancel?.()}>
                Cancel
              </Button>
            </DialogFooter>
          </>
        ) : step === "seed" ? (
          <>
            <DialogHeader>
              <DialogTitle>Random sample seed</DialogTitle>
              <DialogDescription className="text-pretty">
                This query used a seeded random sample
                {seedLabel ? (
                  <>
                    {" "}
                    (<span className="break-all font-mono text-[11px]">{seedLabel}</span>)
                  </>
                ) : null}
                . Reuse the current seed to regenerate the same rows, or use a new seed for an entirely
                new sample.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
              <Button
                type="button"
                variant="ghost"
                className="w-full sm:w-auto"
                onClick={() => {
                  setStep(pendingAction?.type === "new_sheet" ? "name" : "choose");
                }}
              >
                Back
              </Button>
              <Button
                type="button"
                className="w-full sm:w-auto shrink-0"
                onClick={() => void handleSeedChoice("reuse")}
              >
                Reuse current seed
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto shrink-0"
                onClick={() => void handleSeedChoice("fresh")}
              >
                Use a new seed
              </Button>
            </DialogFooter>
          </>
        ) : step === "name" ? (
          <>
            <DialogHeader>
              <DialogTitle>Name your sheet</DialogTitle>
              <DialogDescription>
                {isEdit
                  ? "Choose a name for the new sheet. We’ll open compose with this query so you can edit and run."
                  : "Choose a name for the new sheet. We’ll run the query and load the data when you continue."}
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
                placeholder={isEdit ? "e.g. closed markets summary" : "e.g. Kalshi markets replay"}
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
                {isEdit ? "Open in compose" : askSeedChoice ? "Continue" : "Run query"}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{isEdit ? "Edit query" : "Replay query"}</DialogTitle>
              <DialogDescription className="text-pretty">
                {isEdit
                  ? queryLabel
                    ? `Edit “${queryLabel}” in compose. Replace this sheet when you run, or create a new sheet.`
                    : "Edit this query in compose. Replace this sheet when you run, or create a new sheet."
                  : queryLabel
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
                onClick={() => void handleReplace()}
              >
                Replace current sheet
              </Button>
              <Button
                type="button"
                className="w-full sm:w-auto shrink-0"
                onClick={() => {
                  const fromSheet = String(sourceSheetName || "").trim();
                  setSheetName(fromSheet.slice(0, 80));
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
