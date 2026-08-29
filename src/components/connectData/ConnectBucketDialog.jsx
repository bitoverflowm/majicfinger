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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SheetBandsConfigForm } from "@/components/connectData/SheetBandsConfigForm";
import { SheetBucketConfigForm } from "@/components/connectData/SheetBucketConfigForm";
import {
  DIALOG_BESIDE_HELPER_CONTENT_CLASS,
  DIALOG_BESIDE_HELPER_OVERLAY_CLASS,
} from "@/components/shared/FeatureHelper";
import { createEmptyBucketTab } from "@/lib/bucketSheetTabs";
import {
  createEmptyBandsConfig,
  normalizeBandsConfig,
} from "@/lib/sheetOperations/bandsConfig";
import { cn } from "@/lib/utils";

/**
 * Pop-out config for Bucketing research tool — Buckets (auto bins) and Bands (custom ranges).
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
 *   besideHelper?: boolean;
 *   onBucketingModeChange?: (mode: 'buckets' | 'bands') => void;
 *   composeDraft?: object | null;
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
  besideHelper = false,
  onBucketingModeChange,
  composeDraft = null,
}) {
  const tab = bucketConfig && typeof bucketConfig === "object" ? bucketConfig : createEmptyBucketTab();
  const activeMode = tab.activeMode === "bands" ? "bands" : "buckets";
  const bandsConfig = normalizeBandsConfig(
    tab.bandsConfig || createEmptyBandsConfig(tab.sheetName || "Banded sheet"),
  );

  const handleTabChange = (patch) => {
    onBucketConfigChange?.({ ...tab, ...patch });
  };

  const handleModeChange = (mode) => {
    const nextMode = mode === "bands" ? "bands" : "buckets";
    const next = {
      ...tab,
      activeMode: nextMode,
      bandsConfig:
        nextMode === "bands"
          ? normalizeBandsConfig(tab.bandsConfig || createEmptyBandsConfig(tab.sheetName || "Banded sheet"))
          : tab.bandsConfig,
    };
    onBucketConfigChange?.(next);
    onBucketingModeChange?.(nextMode);
  };

  const handleBandsChange = (nextBands) => {
    onBucketConfigChange?.({
      ...tab,
      activeMode: "bands",
      bandsConfig: nextBands,
      // Keep top-level sheet name in sync when editing bands sheet name
      sheetName: nextBands?.sheetName != null ? nextBands.sheetName : tab.sheetName,
    });
  };

  const description =
    activeMode === "bands"
      ? "Define custom mutually exclusive ranges, then aggregate inside each band. Creates a new sheet after your pull."
      : "Group query result rows into automatic buckets and aggregate metrics. Creates a new sheet after your pull.";

  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal={!besideHelper}>
      <DialogContent
        overlayClassName={besideHelper ? DIALOG_BESIDE_HELPER_OVERLAY_CLASS : undefined}
        className={cn(
          "flex max-h-[min(90vh,52rem)] w-[calc(100%-2rem)] max-w-2xl flex-col gap-0 overflow-hidden p-0 text-foreground sm:max-w-2xl",
          besideHelper && DIALOG_BESIDE_HELPER_CONTENT_CLASS,
        )}
      >
        <DialogHeader className="shrink-0 space-y-1.5 border-b border-border px-6 py-4 pr-12 text-left">
          <DialogTitle>Bucketing</DialogTitle>
          <DialogDescription className="text-muted-foreground dark:text-slate-400">
            {description}
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeMode}
          onValueChange={handleModeChange}
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <div className="shrink-0 px-6 pt-3">
            <TabsList className="grid h-9 w-full grid-cols-2 sm:inline-flex sm:w-auto">
              <TabsTrigger value="buckets" className="text-xs">
                Buckets
              </TabsTrigger>
              <TabsTrigger value="bands" className="text-xs">
                Bands
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
            <TabsContent value="buckets" className="mt-0 focus-visible:ring-0">
              <SheetBucketConfigForm
                columnNames={columnNames}
                tab={tab}
                onTabChange={handleTabChange}
                fieldErrors={fieldErrors}
                columnProfile={columnProfile}
                showCreatesSheetAlert={false}
                showSheetName
              />
            </TabsContent>
            <TabsContent value="bands" className="mt-0 focus-visible:ring-0">
              <SheetBandsConfigForm
                columnNames={columnNames}
                config={bandsConfig}
                onConfigChange={handleBandsChange}
                fieldErrors={fieldErrors}
                composeDraft={composeDraft}
              />
            </TabsContent>
            {error ? <p className="mt-3 text-[11px] text-destructive">{error}</p> : null}
          </div>
        </Tabs>

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
