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
    <div className={cn("space-y-2", className)}>
      <h2 className="text-xs font-semibold tracking-tight text-foreground">
        Which market or markets are you looking for?
      </h2>
      <p className="text-[11px] leading-snug text-muted-foreground">
        You can search up to 100 markets at once, capped to 10,000 rows of data in one go.
      </p>
      <div className="space-y-2 rounded-lg bg-muted/10 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label className="text-xs font-medium text-foreground">Market tickers</Label>
          <span className="text-[10px] text-muted-foreground">
            {count > 0 ? `${count} ticker${count === 1 ? "" : "s"}` : "Required · max 100"}
          </span>
        </div>
        <Textarea
          className="min-h-[4.5rem] font-mono text-xs leading-relaxed"
          placeholder={
            "Add one or more tickers here, e.g. KXHIGHNY-25JAN01-T77; multiple tickers separated by commas: TICKER1, TICKER2"
          }
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
        <p className="text-[10px] leading-snug text-muted-foreground">
          If you don&apos;t know your ticker, search anything and suggestions will populate.
        </p>
      </div>
    </div>
  );
}
