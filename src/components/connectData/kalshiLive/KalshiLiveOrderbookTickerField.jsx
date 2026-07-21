"use client";

import { MarketTickerSearch } from "@/components/connectData/MarketTickerSearch";
import { useMyStateV2 } from "@/context/stateContextV2";
import { cn } from "@/lib/utils";

/**
 * Orderbook wrapper around the shared Market Ticker Search (same control as trades/candlesticks).
 *
 * @param {{
 *   value: string;
 *   onChange: (value: string) => void;
 *   className?: string;
 *   disabled?: boolean;
 * }} props
 */
export function KalshiLiveOrderbookTickerField({ value, onChange, className, disabled }) {
  const ctx = useMyStateV2() ?? {};
  const setMeta = ctx.setConnectKalshiLiveOrderbookTickerMeta;

  return (
    <div className={cn("space-y-2", className)}>
      <h2 className="text-xs font-semibold tracking-tight text-foreground">
        Add market tickers using the search below
      </h2>
      <p className="text-[11px] leading-snug text-muted-foreground">
        You can pull multiple market orderbooks at once (each will auto populate into its own
        sheet). Each price level becomes a sheet row; asks are implied as 1 − opposite bid.
      </p>
      <div className="space-y-2 rounded-lg bg-muted/10 p-3">
        <MarketTickerSearch
          value={value}
          onChange={onChange}
          disabled={disabled}
          dataSource="live"
          onSelectionsChange={(selections) => {
            const next = {};
            for (const s of selections || []) {
              const ticker = String(s?.ticker || "").trim().toUpperCase();
              if (!ticker) continue;
              next[ticker] = String(s?.title || ticker).trim() || ticker;
            }
            setMeta?.(next);
          }}
        />
      </div>
    </div>
  );
}
