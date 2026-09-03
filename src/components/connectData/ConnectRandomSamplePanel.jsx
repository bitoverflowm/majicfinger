"use client";

import { Info, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * Controls shown when Random Sample is enabled (hubs + Connect compose).
 * Helper content opens in a slide-out panel from the parent when the tool is selected.
 *
 * @param {{
 *   sampleSize: string | number;
 *   onSampleSizeChange: (value: string) => void;
 *   seeded?: boolean;
 *   onSeededChange?: (seeded: boolean) => void;
 *   onRemove?: () => void;
 *   disabled?: boolean;
 *   className?: string;
 *   error?: string | null;
 * }} props
 */
export function ConnectRandomSamplePanel({
  sampleSize,
  onSampleSizeChange,
  seeded = true,
  onSeededChange,
  onRemove,
  disabled = false,
  className,
  error = null,
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor="lychee-random-sample-size" className="text-xs text-muted-foreground">
          Sample size
        </Label>
        {typeof onRemove === "function" ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground"
            aria-label="Remove Random Sample"
            title="Remove Random Sample"
            disabled={disabled}
            onClick={onRemove}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        ) : null}
      </div>
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

      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Sample mode</span>
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="inline-flex h-4 w-4 items-center justify-center rounded-sm text-muted-foreground hover:text-foreground"
                  aria-label="About seeded and unseeded samples"
                >
                  <Info className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs text-xs leading-snug">
                Seeded keeps the same random rows on every future pull of this query (Lychee
                generates the seed for you). Unseeded draws a new random set each time.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Button
            type="button"
            size="sm"
            variant={seeded ? "default" : "outline"}
            className="h-7 text-xs"
            disabled={disabled}
            onClick={() => onSeededChange?.(true)}
          >
            Seeded
          </Button>
          <Button
            type="button"
            size="sm"
            variant={!seeded ? "default" : "outline"}
            className="h-7 text-xs"
            disabled={disabled}
            onClick={() => onSeededChange?.(false)}
          >
            Unseeded
          </Button>
        </div>
        <p className="text-[10px] leading-snug text-muted-foreground">
          {seeded
            ? "Consistent sample for analysis — seed is generated automatically."
            : "New random rows on every pull and project reload."}
        </p>
      </div>

      <p id="lychee-random-sample-size-help" className="text-[10px] leading-snug text-muted-foreground">
        Randomly select up to this many rows after your query criteria have been applied.
      </p>
      {error ? <p className="text-[10px] text-destructive">{error}</p> : null}
    </div>
  );
}
