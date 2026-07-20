"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { parseKalshiLiveTradesTickerInput } from "@/lib/kalshiLive/tradesColumns";
import { cn } from "@/lib/utils";

/**
 * Single market ticker for GET /markets/trades (required).
 *
 * @param {{
 *   value: string;
 *   onChange: (value: string) => void;
 *   className?: string;
 *   disabled?: boolean;
 * }} props
 */
export function KalshiLiveTradesTickerField({ value, onChange, className, disabled }) {
  const ticker = parseKalshiLiveTradesTickerInput(value);

  return (
    <div
      className={cn(
        "space-y-2 rounded-lg border border-border/50 bg-muted/10 p-3",
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label className="text-xs font-medium text-foreground">
          Add market tickers using the search below
        </Label>
        <span className="text-[10px] text-muted-foreground">
          {ticker ? "Ready" : "Required"}
        </span>
      </div>
      <p className="text-[11px] leading-snug text-muted-foreground">
        You can pull multiple market trades at once (each will auto populate into its own sheet).
      </p>
      <Input
        className="font-mono text-xs"
        placeholder="e.g. KXELONMARS-99"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
      />
    </div>
  );
}
