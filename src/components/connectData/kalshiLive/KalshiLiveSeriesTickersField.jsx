"use client";

import { MarketTickerSearch } from "@/components/connectData/MarketTickerSearch";
import { useMyStateV2 } from "@/context/stateContextV2";
import { cn } from "@/lib/utils";

/**
 * Series wrapper around Market Ticker Search, scoped to series-only suggestions.
 *
 * @param {{
 *   value: string;
 *   onChange: (value: string) => void;
 *   className?: string;
 *   disabled?: boolean;
 * }} props
 */
export function KalshiLiveSeriesTickersField({ value, onChange, className, disabled }) {
  const ctx = useMyStateV2() ?? {};
  const setMeta = ctx.setConnectKalshiLiveSeriesTickerMeta;

  return (
    <div className={cn("space-y-2", className)}>
      <h2 className="text-xs font-semibold tracking-tight text-foreground">
        Add series tickers using the search below
      </h2>
      <p className="text-[11px] leading-snug text-muted-foreground">
        Search for series only (markets are hidden). You can pull multiple series at once —
        choose one sheet or a sheet per series below.
      </p>
      <div className="space-y-2 rounded-lg bg-muted/10 p-3">
        <MarketTickerSearch
          value={value}
          onChange={onChange}
          disabled={disabled}
          dataSource="live"
          searchScope="series"
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
