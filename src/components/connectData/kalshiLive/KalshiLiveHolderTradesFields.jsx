"use client";

import { MarketTickerSearch } from "@/components/connectData/MarketTickerSearch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMyStateV2 } from "@/context/stateContextV2";
import { cn } from "@/lib/utils";

/**
 * Trades by holder: optional nickname / series / event / min amount filters.
 *
 * @param {{ className?: string; disabled?: boolean }} props
 */
export function KalshiLiveHolderTradesFields({ className, disabled = false }) {
  const ctx = useMyStateV2() ?? {};
  const {
    connectKalshiLiveHolderTradesNickname = "",
    setConnectKalshiLiveHolderTradesNickname,
    connectKalshiLiveHolderTradesSeriesTicker = "",
    setConnectKalshiLiveHolderTradesSeriesTicker,
    connectKalshiLiveHolderTradesEventTicker = "",
    setConnectKalshiLiveHolderTradesEventTicker,
    connectKalshiLiveHolderTradesMinAmount = "",
    setConnectKalshiLiveHolderTradesMinAmount,
  } = ctx;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="space-y-2">
        <h2 className="text-xs font-semibold tracking-tight text-foreground">Trades by trader</h2>
        <p className="text-[11px] leading-snug text-muted-foreground">
          Public social trade feed from Kalshi. All filters are optional — leave them blank for the
          latest public trades, or narrow by nickname, series, event, or minimum notional. Row
          limit (cursor pagination) is under Refine your query. Some nicknames return hidden
          activity.
        </p>
        <p className="text-[11px] font-medium leading-snug text-amber-700 dark:text-amber-400">
          Many traders have trades locked behind membership subscription. This data pull will not
          work for these traders.
        </p>
      </div>

      <div className="space-y-4 rounded-lg bg-muted/10 p-3">
        <div className="space-y-1.5">
          <Label className="text-[11px] font-medium text-muted-foreground">
            Nickname <span className="font-normal">(optional)</span>
          </Label>
          <Input
            className="h-9 max-w-md text-xs"
            disabled={disabled}
            placeholder="e.g. RNOne"
            value={connectKalshiLiveHolderTradesNickname}
            onChange={(e) => setConnectKalshiLiveHolderTradesNickname?.(e.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-[11px] font-medium text-foreground">
              Series ticker <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <p className="text-[10px] leading-snug text-muted-foreground">
              Semantic search or type a known series ticker.
            </p>
            <MarketTickerSearch
              value={connectKalshiLiveHolderTradesSeriesTicker}
              onChange={(v) => setConnectKalshiLiveHolderTradesSeriesTicker?.(v)}
              disabled={disabled}
              dataSource="live"
              searchScope="series"
              showCutoffNotes={false}
              maxTickers={1}
              required={false}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px] font-medium text-foreground">
              Event ticker <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <p className="text-[10px] leading-snug text-muted-foreground">
              Same event semantic search used elsewhere — resolves to one event ticker.
            </p>
            <MarketTickerSearch
              value={connectKalshiLiveHolderTradesEventTicker}
              onChange={(v) => setConnectKalshiLiveHolderTradesEventTicker?.(v)}
              disabled={disabled}
              dataSource="live"
              searchScope="events_semantic"
              showCutoffNotes={false}
              maxTickers={1}
              required={false}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-[11px] font-medium text-muted-foreground">
            Minimum amount <span className="font-normal">(optional)</span>
          </Label>
          <Input
            type="number"
            min={0}
            step="any"
            className="h-9 w-40 text-xs"
            disabled={disabled}
            placeholder="e.g. 100"
            value={connectKalshiLiveHolderTradesMinAmount}
            onChange={(e) => setConnectKalshiLiveHolderTradesMinAmount?.(e.target.value)}
          />
          <p className="text-[10px] leading-snug text-muted-foreground">
            Sent as <span className="font-mono text-[10px]">min_amount</span> (approximate notional
            filter on Kalshi&apos;s side).
          </p>
        </div>
      </div>
    </div>
  );
}
