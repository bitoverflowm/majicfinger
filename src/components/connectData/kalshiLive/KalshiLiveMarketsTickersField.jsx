"use client";

import { MarketTickerSearch } from "@/components/connectData/MarketTickerSearch";
import { useMyStateV2 } from "@/context/stateContextV2";
import { cn } from "@/lib/utils";

/**
 * Markets wrapper around the shared Market Ticker Search (same control as trades/candlesticks).
 * Each selected ticker is fetched via GET /markets/{ticker}.
 *
 * @param {{
 *   value: string;
 *   onChange: (value: string) => void;
 *   className?: string;
 *   disabled?: boolean;
 * }} props
 */
export function KalshiLiveMarketsTickersField({ value, onChange, className, disabled }) {
  const ctx = useMyStateV2() ?? {};
  const setMeta = ctx.setConnectKalshiLiveMarketsTickerMeta;

  return (
    <div className={cn("space-y-2", className)}>
      <h2 className="text-xs font-semibold tracking-tight text-foreground">
        Add market tickers using the search below
      </h2>
      <p className="text-[11px] leading-snug text-muted-foreground">
        Search for markets (or open a series from semantic search to pick markets). You can pull
        multiple markets at once — choose one sheet or a sheet per market below.
      </p>
      <div className="space-y-2 rounded-lg bg-muted/10 p-3">
        <MarketTickerSearch
          value={value}
          onChange={onChange}
          disabled={disabled}
          dataSource="live"
          showCutoffNotes={false}
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
