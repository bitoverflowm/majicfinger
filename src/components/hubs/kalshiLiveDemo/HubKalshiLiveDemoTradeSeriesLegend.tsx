"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

import {
  DEMO_CHART_COLOR_TOKENS,
  type DemoChartColorTokenId,
  demoChartCssVar,
} from "@/components/hubs/kalshiLiveDemo/demoChartColors";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type TradeSeriesLegendItem = {
  id: string;
  label: string;
  color: string;
  colorToken?: DemoChartColorTokenId;
};

type HubKalshiLiveDemoTradeSeriesLegendProps = {
  items: TradeSeriesLegendItem[];
  hiddenIds: ReadonlySet<string>;
  onToggle: (id: string) => void;
  onChangeColor?: (id: string, tokenId: DemoChartColorTokenId) => void;
  className?: string;
};

function SeriesColorPicker({
  seriesId,
  label,
  tokenId,
  onChangeColor,
}: {
  seriesId: string;
  label: string;
  tokenId: DemoChartColorTokenId;
  onChangeColor: (id: string, tokenId: DemoChartColorTokenId) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Change color for ${label}`}
          title="Change color"
          className={cn(
            "inline-flex h-5 items-center gap-0.5 rounded-md border border-transparent px-1 text-muted-foreground transition-colors",
            "hover:border-border/70 hover:bg-muted/40 hover:text-foreground",
            "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
            open && "border-border/70 bg-muted/40 text-foreground",
          )}
        >
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-sm border border-border/60"
            style={{ backgroundColor: demoChartCssVar(tokenId) }}
            aria-hidden
          />
          <ChevronDown className="h-3 w-3 opacity-60" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent align="center" sideOffset={6} className="w-auto p-2">
        <p className="mb-1.5 px-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Color
        </p>
        <div className="flex items-center gap-1.5" role="listbox">
          {DEMO_CHART_COLOR_TOKENS.map((token) => {
            const selected = token.id === tokenId;
            return (
              <button
                key={token.id}
                type="button"
                role="option"
                aria-selected={selected}
                aria-label={token.label}
                title={token.label}
                onClick={() => {
                  onChangeColor(seriesId, token.id);
                  setOpen(false);
                }}
                className={cn(
                  "h-6 w-6 rounded-md border transition-shadow",
                  selected
                    ? "border-foreground/80 ring-2 ring-ring/40"
                    : "border-border/60 hover:border-foreground/40",
                )}
                style={{
                  backgroundColor: demoChartCssVar(token.id),
                }}
              />
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function HubKalshiLiveDemoTradeSeriesLegend({
  items,
  hiddenIds,
  onToggle,
  onChangeColor,
  className,
}: HubKalshiLiveDemoTradeSeriesLegendProps) {
  if (!items.length) return null;

  return (
    <ul
      className={cn(
        "flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 px-2 py-2",
        className,
      )}
      aria-label="Chart series"
    >
      {items.map((item) => {
        const hidden = hiddenIds.has(item.id);
        const tokenId = item.colorToken;
        const swatchColor = tokenId
          ? demoChartCssVar(tokenId)
          : item.color;

        return (
          <li key={item.id} className="inline-flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => onToggle(item.id)}
              aria-pressed={!hidden}
              title={hidden ? `Show ${item.label}` : `Hide ${item.label}`}
              className={cn(
                "inline-flex max-w-[14rem] items-center gap-1.5 rounded-md px-1.5 py-0.5 text-left text-[11px] font-medium transition-all",
                hidden
                  ? "text-muted-foreground opacity-55"
                  : "text-foreground hover:bg-muted/50",
              )}
            >
              <span
                className="inline-flex h-2 w-5 shrink-0 items-center"
                aria-hidden
              >
                <span
                  className="h-0.5 w-full rounded-full"
                  style={{
                    backgroundColor: hidden ? "#9CA3AF" : swatchColor,
                  }}
                />
              </span>
              <span
                className="truncate"
                style={
                  hidden
                    ? undefined
                    : { color: tokenId ? demoChartCssVar(tokenId) : item.color }
                }
              >
                {item.label}
              </span>
            </button>

            {onChangeColor && tokenId ? (
              <SeriesColorPicker
                seriesId={item.id}
                label={item.label}
                tokenId={tokenId}
                onChangeColor={onChangeColor}
              />
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
