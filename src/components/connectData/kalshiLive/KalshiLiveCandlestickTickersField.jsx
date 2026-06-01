"use client";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { parseKalshiLiveMarketTickersInput } from "@/lib/kalshiLive/candlesticksColumns";
import { cn } from "@/lib/utils";

/**
 * Market ticker input for candlesticks (1–100). Comma, space, or newline separated.
 *
 * @param {{
 *   value: string;
 *   onChange: (value: string) => void;
 *   className?: string;
 *   disabled?: boolean;
 * }} props
 */
export function KalshiLiveCandlestickTickersField({ value, onChange, className, disabled }) {
  const parsed = parseKalshiLiveMarketTickersInput(value);
  const count = parsed.length;

  return (
    <div
      className={cn(
        "space-y-2 rounded-lg border border-border/50 bg-muted/10 p-3",
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label className="text-xs font-medium text-foreground">Market tickers</Label>
        <span className="text-[10px] text-muted-foreground">
          {count > 0 ? `${count} ticker${count === 1 ? "" : "s"}` : "Required · max 100"}
        </span>
      </div>
      <Textarea
        className="min-h-[4.5rem] font-mono text-xs leading-relaxed"
        placeholder={"One or more tickers, e.g.\nKXHIGHNY-25JAN01-T77\nor comma-separated: TICKER1, TICKER2"}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      />
      <p className="text-[10px] leading-snug text-muted-foreground">
        One ticker uses the single-market path when possible; multiple tickers use batch candlesticks
        (up to 100). Power search is not used for this endpoint yet.
      </p>
    </div>
  );
}
