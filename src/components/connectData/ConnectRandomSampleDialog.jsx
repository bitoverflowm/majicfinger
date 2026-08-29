"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DIALOG_BESIDE_HELPER_CONTENT_CLASS,
  DIALOG_BESIDE_HELPER_OVERLAY_CLASS,
} from "@/components/shared/FeatureHelper";
import { cn } from "@/lib/utils";

/**
 * Pop-out config for Random Sample research tool.
 *
 * @param {{
 *   open: boolean;
 *   onOpenChange: (open: boolean) => void;
 *   sampleSize: string | number;
 *   onSampleSizeChange: (value: string) => void;
 *   onRemove?: () => void;
 *   error?: string | null;
 *   besideHelper?: boolean;
 * }} props
 */
export function ConnectRandomSampleDialog({
  open,
  onOpenChange,
  sampleSize,
  onSampleSizeChange,
  onRemove,
  error = null,
  besideHelper = false,
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal={!besideHelper}>
      <DialogContent
        overlayClassName={besideHelper ? DIALOG_BESIDE_HELPER_OVERLAY_CLASS : undefined}
        className={cn(
          "w-[calc(100%-2rem)] max-w-md gap-4 text-foreground sm:max-w-md",
          besideHelper && DIALOG_BESIDE_HELPER_CONTENT_CLASS,
        )}
      >
        <DialogHeader>
          <DialogTitle>Random Sample</DialogTitle>
          <DialogDescription className="text-muted-foreground dark:text-slate-400">
            Randomly select up to this many rows after your query criteria have been applied.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label
            htmlFor="lychee-random-sample-size-dialog"
            className="text-xs font-medium text-foreground"
          >
            Sample size
          </Label>
          <Input
            id="lychee-random-sample-size-dialog"
            type="number"
            min={1}
            step={1}
            inputMode="numeric"
            className="h-9 w-full max-w-[10rem] text-xs text-foreground"
            value={sampleSize ?? ""}
            onChange={(e) => onSampleSizeChange?.(e.target.value)}
            placeholder="e.g. 100"
            aria-invalid={!!error}
          />
          {error ? <p className="text-[11px] text-destructive">{error}</p> : null}
        </div>

        <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
          {typeof onRemove === "function" ? (
            <Button
              type="button"
              variant="ghost"
              className="text-muted-foreground hover:text-destructive dark:text-slate-400"
              onClick={() => {
                onRemove();
                onOpenChange?.(false);
              }}
            >
              Remove
            </Button>
          ) : (
            <span />
          )}
          <Button type="button" onClick={() => onOpenChange?.(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
