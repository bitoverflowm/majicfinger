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
import { SheetBucketConfigForm } from "@/components/connectData/SheetBucketConfigForm";
import { createEmptyBucketTab } from "@/lib/bucketSheetTabs";

/**
 * Pop-out config for Bucketing research tool (same fields as sheet Stats → Bucket).
 *
 * @param {{
 *   open: boolean;
 *   onOpenChange: (open: boolean) => void;
 *   columnNames?: string[];
 *   bucketConfig?: object | null;
 *   onBucketConfigChange?: (next: object) => void;
 *   columnProfile?: object | null;
 *   fieldErrors?: Record<string, string>;
 *   onRemove?: () => void;
 *   error?: string | null;
 * }} props
 */
export function ConnectBucketDialog({
  open,
  onOpenChange,
  columnNames = [],
  bucketConfig = null,
  onBucketConfigChange,
  columnProfile = null,
  fieldErrors = {},
  onRemove,
  error = null,
}) {
  const tab = bucketConfig && typeof bucketConfig === "object" ? bucketConfig : createEmptyBucketTab();

  const handleTabChange = (patch) => {
    onBucketConfigChange?.({ ...tab, ...patch });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(90vh,52rem)] w-[calc(100%-2rem)] max-w-2xl flex-col gap-0 overflow-hidden p-0 text-foreground sm:max-w-2xl">
        <DialogHeader className="shrink-0 space-y-1.5 border-b border-border px-6 py-4 pr-12 text-left">
          <DialogTitle>Bucketing</DialogTitle>
          <DialogDescription className="text-muted-foreground dark:text-slate-400">
            Group query result rows into buckets and aggregate metrics. Creates a new sheet after
            your pull; the original result is unchanged.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          <SheetBucketConfigForm
            columnNames={columnNames}
            tab={tab}
            onTabChange={handleTabChange}
            fieldErrors={fieldErrors}
            columnProfile={columnProfile}
            showCreatesSheetAlert={false}
            showSheetName
          />
          {error ? <p className="mt-3 text-[11px] text-destructive">{error}</p> : null}
        </div>

        <DialogFooter className="shrink-0 flex flex-col-reverse gap-2 border-t border-border px-6 py-4 sm:flex-row sm:justify-between">
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
