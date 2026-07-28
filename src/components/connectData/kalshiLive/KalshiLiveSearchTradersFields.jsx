"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMyStateV2 } from "@/context/stateContextV2";
import { cn } from "@/lib/utils";

/**
 * Search traders by nickname prefix, with optional metrics / holdings enrichment.
 *
 * @param {{ className?: string; disabled?: boolean }} props
 */
export function KalshiLiveSearchTradersFields({ className, disabled = false }) {
  const ctx = useMyStateV2() ?? {};
  const {
    connectKalshiLiveSearchTradersQuery = "",
    setConnectKalshiLiveSearchTradersQuery,
    connectKalshiLiveSearchTradersIncludeMetrics = false,
    setConnectKalshiLiveSearchTradersIncludeMetrics,
    connectKalshiLiveSearchTradersIncludeHoldings = false,
    setConnectKalshiLiveSearchTradersIncludeHoldings,
    connectKalshiLiveEndpointId,
    setConnectKalshiLiveColumnSelections,
  } = ctx;

  const clearColumns = () => {
    const id = connectKalshiLiveEndpointId || "search_traders";
    setConnectKalshiLiveColumnSelections?.((prev) => {
      const next = { ...(prev || {}) };
      delete next[id];
      return next;
    });
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="space-y-2">
        <h2 className="text-xs font-semibold tracking-tight text-foreground">
          Search by trader nickname
        </h2>
        <p className="text-[11px] leading-snug text-muted-foreground">
          Find public trader profiles by nickname prefix. Optionally attach shared metrics and
          holdings when those are public.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label className="text-[11px] font-medium text-muted-foreground">
          Search by trader nickname
        </Label>
        <Input
          className="h-9 max-w-md text-xs"
          disabled={disabled}
          placeholder="e.g. citadel"
          value={connectKalshiLiveSearchTradersQuery}
          onChange={(e) => setConnectKalshiLiveSearchTradersQuery?.(e.target.value)}
          autoComplete="off"
          spellCheck={false}
        />
        <p className="text-[10px] leading-snug text-muted-foreground">
          Nickname prefix search (case-insensitive). Use at least 2 characters, no spaces.
        </p>
      </div>

      <div className="space-y-2.5">
        <div className="flex items-start gap-2">
          <Checkbox
            id="search-traders-include-metrics"
            checked={!!connectKalshiLiveSearchTradersIncludeMetrics}
            disabled={disabled}
            onCheckedChange={(checked) => {
              setConnectKalshiLiveSearchTradersIncludeMetrics?.(!!checked);
              clearColumns();
            }}
          />
          <div className="min-w-0 space-y-0.5">
            <Label
              htmlFor="search-traders-include-metrics"
              className="text-[11px] font-medium leading-snug text-foreground"
            >
              Add trader metrics?
            </Label>
            <p className="text-[10px] leading-snug text-muted-foreground">
              Pulls PnL, volume, and related metrics when the trader shares them publicly.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2">
          <Checkbox
            id="search-traders-include-holdings"
            checked={!!connectKalshiLiveSearchTradersIncludeHoldings}
            disabled={disabled}
            onCheckedChange={(checked) => {
              setConnectKalshiLiveSearchTradersIncludeHoldings?.(!!checked);
              clearColumns();
            }}
          />
          <div className="min-w-0 space-y-0.5">
            <Label
              htmlFor="search-traders-include-holdings"
              className="text-[11px] font-medium leading-snug text-foreground"
            >
              Add trader holdings?
            </Label>
            <p className="text-[10px] leading-snug text-muted-foreground">
              Expands each trader into position rows when holdings are visible. Many profiles keep
              holdings hidden.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
