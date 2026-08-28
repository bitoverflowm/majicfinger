"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Controls shown when Random Sample is enabled (hubs + Connect compose).
 * Helper content opens in a slide-out panel from the parent when the tool is selected.
 *
 * @param {{
 *   sampleSize: string | number;
 *   onSampleSizeChange: (value: string) => void;
 *   disabled?: boolean;
 *   className?: string;
 *   error?: string | null;
 * }} props
 */
export function ConnectRandomSamplePanel({
  sampleSize,
  onSampleSizeChange,
  disabled = false,
  className,
  error = null,
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor="lychee-random-sample-size" className="text-xs text-muted-foreground">
        Sample size
      </Label>
      <Input
        id="lychee-random-sample-size"
        type="number"
        min={1}
        step={1}
        inputMode="numeric"
        disabled={disabled}
        className="h-8 w-32 text-xs"
        value={sampleSize ?? ""}
        onChange={(e) => onSampleSizeChange?.(e.target.value)}
        placeholder="e.g. 100"
        aria-invalid={!!error}
        aria-describedby="lychee-random-sample-size-help"
      />
      <p id="lychee-random-sample-size-help" className="text-[10px] leading-snug text-muted-foreground">
        Randomly select up to this many rows after your query criteria have been applied.
      </p>
      {error ? <p className="text-[10px] text-destructive">{error}</p> : null}
    </div>
  );
}
