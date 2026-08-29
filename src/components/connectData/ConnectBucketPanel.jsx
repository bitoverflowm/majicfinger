"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

import { SheetBucketConfigForm } from "@/components/connectData/SheetBucketConfigForm";
import { Button } from "@/components/ui/button";
import { createEmptyBucketTab } from "@/lib/bucketSheetTabs";
import { cn } from "@/lib/utils";

/**
 * Research-tool panel for Bucketing (same config as sheet Stats → Bucket).
 *
 * @param {{
 *   columnNames?: string[];
 *   bucketConfig?: object | null;
 *   onBucketConfigChange?: (next: object) => void;
 *   columnProfile?: object | null;
 *   fieldErrors?: Record<string, string>;
 *   onRemove?: () => void;
 *   className?: string;
 *   error?: string | null;
 * }} props
 */
export function ConnectBucketPanel({
  columnNames = [],
  bucketConfig = null,
  onBucketConfigChange,
  columnProfile = null,
  fieldErrors = {},
  onRemove,
  className,
  error = null,
}) {
  const tab = bucketConfig && typeof bucketConfig === "object" ? bucketConfig : createEmptyBucketTab();

  const handleTabChange = (patch) => {
    onBucketConfigChange?.({ ...tab, ...patch });
  };

  // Mirror sheet workspace: auto-pick bucket style from column profile.
  useEffect(() => {
    const col = String(tab.bucketColumn || "").trim();
    if (!col || !columnProfile) return;
    if (columnProfile.isTemporal && tab.bucketMode !== "time") {
      onBucketConfigChange?.({ ...tab, bucketMode: "time" });
      return;
    }
    if (columnProfile.isNumeric && !columnProfile.isTemporal && tab.bucketMode !== "number") {
      onBucketConfigChange?.({
        ...tab,
        bucketMode: "number",
        numericBucketSize:
          String(tab.numericBucketSize || "").trim() ||
          String(columnProfile.suggestedSize || 1),
      });
      return;
    }
    if (
      !columnProfile.isNumeric &&
      !columnProfile.isTemporal &&
      tab.bucketMode !== "category"
    ) {
      onBucketConfigChange?.({ ...tab, bucketMode: "category" });
    }
    // Only react to column / profile changes — not every tab edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab.bucketColumn, columnProfile?.isNumeric, columnProfile?.isTemporal, columnProfile?.suggestedSize]);

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-foreground">Bucketing</p>
        {typeof onRemove === "function" ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground"
            aria-label="Remove Bucketing"
            title="Remove Bucketing"
            onClick={onRemove}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        ) : null}
      </div>
      <SheetBucketConfigForm
        columnNames={columnNames}
        tab={tab}
        onTabChange={handleTabChange}
        fieldErrors={fieldErrors}
        columnProfile={columnProfile}
        showCreatesSheetAlert
        showSheetName
      />
      {error ? <p className="text-[10px] text-destructive">{error}</p> : null}
    </div>
  );
}
