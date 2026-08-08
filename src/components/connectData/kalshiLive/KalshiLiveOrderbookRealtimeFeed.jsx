"use client";

import { useEffect, useMemo } from "react";
import { Radio } from "lucide-react";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useMyStateV2 } from "@/context/stateContextV2";
import { parseKalshiLiveOrderbookTickersInput } from "@/lib/kalshiLive/orderbookColumns";
import {
  clampLiveFeedPollIntervalMsForEndpoint,
  filterLiveFeedPollOptionsForEndpoint,
} from "@/lib/liveFeeds/registry";
import { cn } from "@/lib/utils";

/**
 * Compose-time Real Time Feed for Market Orderbook.
 *
 * @param {{ className?: string; disabled?: boolean }} props
 */
export function KalshiLiveOrderbookRealtimeFeed({ className, disabled = false }) {
  const ctx = useMyStateV2() ?? {};
  const {
    connectKalshiLiveOrderbookTicker = "",
    connectKalshiLiveRealtimeFeedEnabled = false,
    setConnectKalshiLiveRealtimeFeedEnabled,
    connectKalshiLiveRealtimePollIntervalMs,
    setConnectKalshiLiveRealtimePollIntervalMs,
    connectKalshiLiveRealtimeMarketTickers = [],
    setConnectKalshiLiveRealtimeMarketTickers,
  } = ctx;

  const tickers = useMemo(
    () => parseKalshiLiveOrderbookTickersInput(connectKalshiLiveOrderbookTicker),
    [connectKalshiLiveOrderbookTicker],
  );
  const noTickers = tickers.length === 0;

  const pollOptions = useMemo(
    () => filterLiveFeedPollOptionsForEndpoint("kalshi-live", "orderbook"),
    [],
  );

  const pollValueMs = useMemo(() => {
    return clampLiveFeedPollIntervalMsForEndpoint(
      connectKalshiLiveRealtimePollIntervalMs ?? 60_000,
      "kalshi-live",
      "orderbook",
    );
  }, [connectKalshiLiveRealtimePollIntervalMs]);

  useEffect(() => {
    if (!setConnectKalshiLiveRealtimePollIntervalMs) return;
    const next = clampLiveFeedPollIntervalMsForEndpoint(
      connectKalshiLiveRealtimePollIntervalMs ?? 60_000,
      "kalshi-live",
      "orderbook",
    );
    if (next !== Number(connectKalshiLiveRealtimePollIntervalMs)) {
      setConnectKalshiLiveRealtimePollIntervalMs(next);
    }
  }, [connectKalshiLiveRealtimePollIntervalMs, setConnectKalshiLiveRealtimePollIntervalMs]);

  useEffect(() => {
    if (!setConnectKalshiLiveRealtimeMarketTickers) return;
    const next = [...tickers];
    const prev = Array.isArray(connectKalshiLiveRealtimeMarketTickers)
      ? connectKalshiLiveRealtimeMarketTickers
      : [];
    const same =
      next.length === prev.length &&
      next.every((t, i) => t === String(prev[i] || "").toUpperCase());
    if (!same) setConnectKalshiLiveRealtimeMarketTickers(next);
  }, [tickers, connectKalshiLiveRealtimeMarketTickers, setConnectKalshiLiveRealtimeMarketTickers]);

  useEffect(() => {
    if (noTickers) setConnectKalshiLiveRealtimeFeedEnabled?.(false);
  }, [noTickers, setConnectKalshiLiveRealtimeFeedEnabled]);

  const enabled = !!connectKalshiLiveRealtimeFeedEnabled && !noTickers;
  const controlsDisabled = disabled || noTickers;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-1.5">
        <Radio
          className={cn(
            "h-3.5 w-3.5 shrink-0",
            enabled ? "text-emerald-500" : "text-muted-foreground",
          )}
          aria-hidden
        />
        <h2 className="text-xs font-semibold tracking-tight text-foreground">Real Time Feed</h2>
      </div>

      <p className="text-[11px] leading-snug text-muted-foreground">
        Optionally start a live REST poll when you submit this pull. Each market keeps its own sheet;
        every tick replaces the book snapshot. You can change the feed later from Power moves.
      </p>
      <p className="text-[10px] leading-snug text-muted-foreground">
        Live polls use the live Markets Orderbook API. Prefer 1 minute+ in normal use to stay within
        rate limits.
      </p>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Switch
            id="market-orderbook-realtime-enable"
            checked={!!connectKalshiLiveRealtimeFeedEnabled && !noTickers}
            disabled={controlsDisabled}
            className="h-4 w-7 shrink-0 [&>span]:h-3 [&>span]:w-3 [&>span]:data-[state=checked]:translate-x-3"
            onCheckedChange={(checked) => {
              setConnectKalshiLiveRealtimeFeedEnabled?.(!!checked);
            }}
          />
          <Label
            htmlFor="market-orderbook-realtime-enable"
            className="cursor-pointer text-[11px] font-medium text-foreground"
          >
            Enable real time feed
          </Label>
        </div>

        {connectKalshiLiveRealtimeFeedEnabled && !noTickers ? (
          <div className="space-y-1.5">
            <Label className="text-[11px] font-medium text-muted-foreground">
              Feed refresh rate
            </Label>
            <Select
              value={String(pollValueMs)}
              disabled={controlsDisabled}
              onValueChange={(raw) => {
                const next = clampLiveFeedPollIntervalMsForEndpoint(
                  Number(raw),
                  "kalshi-live",
                  "orderbook",
                );
                setConnectKalshiLiveRealtimePollIntervalMs?.(next);
              }}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Refresh rate" />
              </SelectTrigger>
              <SelectContent>
                {pollOptions.map((opt) => (
                  <SelectItem key={opt.valueMs} value={String(opt.valueMs)} className="text-xs">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[10px] leading-snug text-muted-foreground">
              One Kalshi request per market per tick (plus a metadata check for market close). Use 1
              second only for short tests.
            </p>
            {tickers.length > 1 ? (
              <p className="text-[10px] leading-snug text-muted-foreground">
                Streaming {tickers.length} markets: {tickers.join(", ")}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
