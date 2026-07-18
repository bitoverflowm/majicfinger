"use client";

import { MarketTickerSearch } from "@/components/connectData/MarketTickerSearch";
import { cn } from "@/lib/utils";

/**
 * Candlesticks wrapper around Market Ticker Search (headings + shared search control).
 *
 * @param {{
 *   value: string;
 *   onChange: (value: string) => void;
 *   className?: string;
 *   disabled?: boolean;
 * }} props
 */
export function KalshiLiveCandlestickTickersField({ value, onChange, className, disabled }) {
  return (
    <div className={cn("space-y-2", className)}>
      <h2 className="text-xs font-semibold tracking-tight text-foreground">
        Which market or markets are you looking for?
      </h2>
      <p className="text-[11px] leading-snug text-muted-foreground">
        You can search up to 100 markets at once — each market is capped to 10,000 rows per pull.
      </p>
      <div className="space-y-2 rounded-lg bg-muted/10 p-3">
        <MarketTickerSearch value={value} onChange={onChange} disabled={disabled} />
      </div>
    </div>
  );
}
