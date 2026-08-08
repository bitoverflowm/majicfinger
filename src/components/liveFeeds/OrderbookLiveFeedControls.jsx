"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Radio, Pause, Play, Square } from "lucide-react";
import { toast } from "sonner";
import { useMyStateV2 } from "@/context/stateContextV2";
import {
  clampLiveFeedPollIntervalMsForEndpoint,
  filterLiveFeedPollOptionsForEndpoint,
  LIVE_FEED_POLL_FREQUENCY_OPTIONS,
} from "@/lib/liveFeeds/registry";
import { sanitizeProjectLiveFeedSource } from "@/lib/liveFeeds/sanitizeProjectLiveFeedSource";
import { startOrderbookEditorLiveFeed } from "@/lib/liveFeeds/startEventCandlesticksEditorLiveFeed";
import { discoverOrderbookFeedGroup } from "@/lib/liveFeeds/feedConfig";

/**
 * @param {{
 *   lastPolledAt?: number | null;
 *   pollIntervalMs?: number;
 *   paused?: boolean;
 * }} props
 */
function LiveFeedNextPullRing({ lastPolledAt, pollIntervalMs, paused }) {
  const intervalMs = Math.max(1000, Math.floor(Number(pollIntervalMs)) || 60_000);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (paused) return undefined;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [paused, lastPolledAt, intervalMs]);

  const anchor = Number(lastPolledAt);
  const hasAnchor = Number.isFinite(anchor) && anchor > 0;
  const elapsed = hasAnchor ? Math.max(0, now - anchor) : 0;
  const pct = paused
    ? 0
    : hasAnchor
      ? Math.max(0, Math.min(100, (elapsed / intervalMs) * 100))
      : 0;
  const secsLeft = paused
    ? null
    : hasAnchor
      ? Math.max(0, Math.ceil((intervalMs - elapsed) / 1000))
      : Math.ceil(intervalMs / 1000);

  const color = paused ? "rgb(148 163 184)" : "rgb(16 185 129)";
  const track = "rgb(226 232 240)";

  return (
    <span
      className="relative inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full"
      style={{ background: `conic-gradient(${color} ${pct}%, ${track} ${pct}% 100%)` }}
      title={
        paused
          ? "Live feed paused"
          : secsLeft != null
            ? `Next pull in ~${secsLeft}s`
            : "Waiting for next pull"
      }
    >
      <span className="h-2.5 w-2.5 rounded-full bg-background" />
    </span>
  );
}

/**
 * Start / pause / stop live REST poll for Kalshi market orderbook.
 */
export function OrderbookLiveFeedControls() {
  const ctx = useMyStateV2();
  const dataSheets = ctx?.dataSheets || {};
  const liveFeedState = ctx?.liveFeedState;
  const liveFeedActions = ctx?.liveFeedActions;
  const loadedDataMeta = ctx?.loadedDataMeta;

  const group = useMemo(() => discoverOrderbookFeedGroup(dataSheets), [dataSheets]);

  const savedLiveSource = useMemo(
    () => sanitizeProjectLiveFeedSource(loadedDataMeta?.live_feed_source),
    [loadedDataMeta?.live_feed_source],
  );

  const isSavedSnapshot = !!loadedDataMeta?._id && (!!savedLiveSource || !!group);

  const allGroupTickers = useMemo(
    () => Object.keys(group?.sheets?.marketSheetIdsByTicker || {}),
    [group?.sheets?.marketSheetIdsByTicker],
  );

  const [selectedMarketTickers, setSelectedMarketTickers] = useState(() => allGroupTickers);

  useEffect(() => {
    setSelectedMarketTickers((prev) => {
      const next = (Array.isArray(prev) ? prev : []).filter((t) => allGroupTickers.includes(t));
      if (next.length) return next;
      return allGroupTickers;
    });
  }, [allGroupTickers]);

  const activeFeed = useMemo(() => {
    const feeds = Object.values(liveFeedState?.feedsById || {});
    const want = new Set(allGroupTickers.map((t) => String(t || "").toUpperCase()));
    return (
      feeds.find((f) => {
        if (f?.integration !== "kalshi-live" || f?.endpoint !== "orderbook") return false;
        const running = Array.isArray(f?.params?.marketTickers) ? f.params.marketTickers : [];
        return running.some((t) => want.has(String(t || "").toUpperCase()));
      }) || null
    );
  }, [liveFeedState?.feedsById, allGroupTickers]);

  const isRunning = !!activeFeed?.isRunning;
  const isPaused = !!activeFeed?.isPaused;

  const pollOptions = useMemo(
    () => filterLiveFeedPollOptionsForEndpoint("kalshi-live", "orderbook"),
    [],
  );

  const [pollDraftMs, setPollDraftMs] = useState(60_000);

  useEffect(() => {
    setPollDraftMs(
      clampLiveFeedPollIntervalMsForEndpoint(
        activeFeed?.pollIntervalMs ??
          (savedLiveSource?.endpoint === "orderbook" ? savedLiveSource.pollIntervalMs : null) ??
          60_000,
        "kalshi-live",
        "orderbook",
      ),
    );
  }, [activeFeed?.pollIntervalMs, savedLiveSource]);

  const pollValueMs = useMemo(() => {
    if (isRunning && activeFeed?.pollIntervalMs) {
      return clampLiveFeedPollIntervalMsForEndpoint(
        activeFeed.pollIntervalMs,
        "kalshi-live",
        "orderbook",
      );
    }
    return clampLiveFeedPollIntervalMsForEndpoint(pollDraftMs, "kalshi-live", "orderbook");
  }, [isRunning, activeFeed?.pollIntervalMs, pollDraftMs]);

  const handleStart = useCallback(() => {
    const result = startOrderbookEditorLiveFeed({
      dataSheets,
      liveFeedActions,
      liveFeedState,
      marketTickers: selectedMarketTickers.length ? selectedMarketTickers : undefined,
      pollIntervalMs: pollValueMs,
      reason: "manual",
      toastOnStart: true,
    });
    if (!result.started && result.skipped && result.skipped !== "already_running") {
      toast.message(
        result.skipped === "markets_closed"
          ? "Markets are closed — live orderbook feed unavailable"
          : "Could not start orderbook live feed",
      );
    }
  }, [
    dataSheets,
    liveFeedActions,
    liveFeedState,
    selectedMarketTickers,
    pollValueMs,
  ]);

  const handlePause = useCallback(() => {
    if (!activeFeed?.id) return;
    liveFeedActions?.pause?.(activeFeed.id);
    toast.message("Live orderbook feed paused");
  }, [activeFeed?.id, liveFeedActions]);

  const handleResume = useCallback(() => {
    if (!activeFeed?.id) return;
    liveFeedActions?.resume?.(activeFeed.id);
    toast.success("Live orderbook feed resumed");
  }, [activeFeed?.id, liveFeedActions]);

  const handleStop = useCallback(() => {
    if (!activeFeed?.id) return;
    liveFeedActions?.stop?.(activeFeed.id);
    toast.message("Live orderbook feed stopped");
  }, [activeFeed?.id, liveFeedActions]);

  const handlePollChange = useCallback(
    (raw) => {
      const next = clampLiveFeedPollIntervalMsForEndpoint(
        Number(raw),
        "kalshi-live",
        "orderbook",
      );
      setPollDraftMs(next);
      if (activeFeed?.id && typeof liveFeedActions?.restart === "function") {
        liveFeedActions.restart(activeFeed.id, { pollIntervalMs: next });
      }
    },
    [activeFeed?.id, liveFeedActions],
  );

  if (!group) return null;

  const freqLabel =
    LIVE_FEED_POLL_FREQUENCY_OPTIONS.find((o) => o.valueMs === pollValueMs)?.label ||
    `every ${Math.round(pollValueMs / 1000)}s`;

  return (
    <div className="space-y-2 rounded-md border border-border/60 bg-muted/20 p-2">
      <div className="flex items-center gap-1.5">
        {isRunning && !isPaused ? (
          <LiveFeedNextPullRing
            lastPolledAt={activeFeed?.lastPolledAt}
            pollIntervalMs={pollValueMs}
            paused={false}
          />
        ) : (
          <Radio
            className={`h-3.5 w-3.5 shrink-0 ${isRunning ? "text-amber-500" : "text-muted-foreground"}`}
            aria-hidden
          />
        )}
        <p className="text-xs font-semibold text-foreground">Live orderbook feed</p>
      </div>

      <p className="text-[10px] leading-snug text-muted-foreground">
        {allGroupTickers.length} market{allGroupTickers.length === 1 ? "" : "s"} · {freqLabel}
        {isPaused ? " · paused" : isRunning ? " · live" : ""}
      </p>

      {isSavedSnapshot && !isRunning ? (
        <p className="text-[10px] leading-snug text-muted-foreground">
          Snapshot from your last save. Re-enabling live only updates this editor session until you
          save and republish.
        </p>
      ) : null}

      {isRunning && activeFeed?.lastTickStats ? (
        <p className="text-[10px] leading-snug text-muted-foreground tabular-nums">
          Pull #{Number(activeFeed.tickCount) || 1}
          {" · "}
          {activeFeed.lastTickStats.marketsMatched}/{activeFeed.lastTickStats.marketsInTick} markets
          {" · "}
          {activeFeed.lastTickStats.levelsReceived} levels
          {activeFeed.lastTickStats.levelsAdded > 0 || activeFeed.lastTickStats.levelsRemoved > 0
            ? ` · +${activeFeed.lastTickStats.levelsAdded || 0}/−${activeFeed.lastTickStats.levelsRemoved || 0}`
            : ""}
        </p>
      ) : null}

      {!isRunning ? (
        <>
          {allGroupTickers.length > 1 ? (
            <div className="space-y-1.5 px-0.5">
              <Label className="text-[11px] text-muted-foreground">Markets to stream</Label>
              <div className="max-h-36 space-y-1 overflow-y-auto">
                {allGroupTickers.map((ticker) => {
                  const checked = selectedMarketTickers.includes(ticker);
                  return (
                    <label
                      key={ticker}
                      className="flex cursor-pointer items-center gap-2 text-[11px] text-foreground"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(next) => {
                          const on = !!next;
                          setSelectedMarketTickers((prev) => {
                            const list = Array.isArray(prev) ? [...prev] : [];
                            if (on) {
                              if (!list.includes(ticker)) list.push(ticker);
                              return list;
                            }
                            return list.filter((t) => t !== ticker);
                          });
                        }}
                      />
                      <span className="font-mono text-[10px]">{ticker}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div className="space-y-1.5">
            <Label className="text-[11px] text-muted-foreground">Feed refresh rate</Label>
            <Select value={String(pollValueMs)} onValueChange={handlePollChange}>
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
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!selectedMarketTickers.length}
            className="h-auto w-full justify-start gap-2 whitespace-normal px-2.5 py-2 text-left text-xs"
            onClick={handleStart}
          >
            <Play className="h-3.5 w-3.5 shrink-0 text-emerald-500" aria-hidden />
            <span className="min-w-0">Enable live orderbook feed</span>
          </Button>
        </>
      ) : (
        <div className="flex flex-wrap gap-1">
          {isPaused ? (
            <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={handleResume}>
              <Play className="mr-1 h-3.5 w-3.5" aria-hidden />
              Resume
            </Button>
          ) : (
            <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={handlePause}>
              <Pause className="mr-1 h-3.5 w-3.5" aria-hidden />
              Pause
            </Button>
          )}
          <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={handleStop}>
            <Square className="mr-1 h-3.5 w-3.5" aria-hidden />
            Stop
          </Button>
          <Select value={String(pollValueMs)} onValueChange={handlePollChange}>
            <SelectTrigger className="h-8 w-[9.5rem] text-[10px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pollOptions.map((opt) => (
                <SelectItem key={opt.valueMs} value={String(opt.valueMs)} className="text-xs">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
