"use client";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { getGroupedShadcnPaletteSwatches } from "@/components/chartView/panels/shadcnChartPalettes";

const grouped = getGroupedShadcnPaletteSwatches();

/** Always-available neutrals (not part of Tailwind base ramps). */
const BLACK_WHITE_SWATCHES = [
  { label: "Black", color: "#000000" },
  { label: "White", color: "#ffffff" },
];

/**
 * Unified color picker: every Tailwind shade for every Shadcn chart base (same data as legacy palette UI).
 */
export function ChartColorPalettePopover({
  value,
  /** When set, used for the trigger swatch (e.g. series default) while `value` stays null until user picks. */
  swatchColor,
  onChange,
  ariaLabel,
  onClear,
  align = "start",
  contentClassName,
  triggerClassName,
}) {
  const triggerFill = swatchColor ?? value;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border",
            !triggerFill && "bg-muted",
            triggerClassName,
          )}
          style={triggerFill ? { backgroundColor: triggerFill } : undefined}
          aria-label={ariaLabel}
        />
      </PopoverTrigger>
      <PopoverContent
        align={align}
        className={cn("max-h-[min(72vh,480px)] w-[min(100vw-2rem,20rem)] overflow-y-auto p-2", contentClassName)}
      >
        <div className="space-y-3">
          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Black & white</p>
            <div className="flex flex-wrap gap-1">
              {BLACK_WHITE_SWATCHES.map(({ label, color }) => (
                <button
                  key={label}
                  type="button"
                  className={cn(
                    "h-7 w-7 shrink-0 rounded-sm border",
                    label === "White" ? "border-border" : "border-border/80",
                  )}
                  style={{ backgroundColor: color }}
                  title={label}
                  aria-label={label}
                  onClick={() => onChange(color)}
                />
              ))}
            </div>
          </div>
          {grouped.map(({ baseId, shades }) => (
            <div key={baseId}>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{baseId}</p>
              <div className="flex flex-wrap gap-0.5">
                {shades.map(({ shade, color }) => (
                  <button
                    key={`${baseId}-${shade}`}
                    type="button"
                    className="h-6 w-6 shrink-0 rounded-sm border border-border/70"
                    style={{ backgroundColor: color }}
                    title={`${baseId} ${shade}`}
                    onClick={() => onChange(color)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
        {onClear ? (
          <button
            type="button"
            className="mt-2 w-full pt-1 text-center text-[10px] text-muted-foreground underline-offset-2 hover:underline"
            onClick={() => onClear()}
          >
            Reset to default
          </button>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
