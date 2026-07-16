"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { parseKalshiLiveOrderbookTickerInput } from "@/lib/kalshiLive/orderbookColumns";
import { cn } from "@/lib/utils";

/**
 * Single market ticker for GET /markets/{ticker}/orderbook (required).
 *
 * @param {{
 *   value: string;
 *   onChange: (value: string) => void;
 *   className?: string;
 *   disabled?: boolean;
 * }} props
 */
export function KalshiLiveOrderbookTickerField({ value, onChange, className, disabled }) {
  const ticker = parseKalshiLiveOrderbookTickerInput(value);

  return (
    <div
      className={cn(
        "space-y-2 rounded-lg border border-border/50 bg-muted/10 p-3",
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label className="text-xs font-medium text-foreground">Market ticker</Label>
        <span className="text-[10px] text-muted-foreground">
          {ticker ? "Ready" : "Required"}
        </span>
      </div>
      <Input
        className="font-mono text-xs"
        placeholder="e.g. KXHIGHNY-26JUL14-T80"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
      />
      <p className="text-[10px] leading-snug text-muted-foreground">
        Loads yes and no bid levels for one market (asks are implied as 1 − opposite bid). Each
        price level becomes a sheet row.
      </p>
    </div>
  );
}
