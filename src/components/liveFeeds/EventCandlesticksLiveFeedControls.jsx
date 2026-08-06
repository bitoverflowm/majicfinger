"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Radio, Pause, Play, Square, CircleOff, RefreshCw, Archive, Activity } from "lucide-react";
import { toast } from "sonner";
import { useMyStateV2 } from "@/context/stateContextV2";
import {
  clampLiveFeedPollIntervalMs,
  describeCandlePeriod,
  filterLiveFeedPollOptionsForPeriod,
  getLiveFeedEndpointDef,
  LIVE_FEED_POLL_FREQUENCY_OPTIONS,
  pollIntervalMsForPeriod,
} from "@/lib/liveFeeds/registry";
import {
  closedMarketArchiveIntegrationLabel,
  evaluateTrackedMarketsClosure,
  latestCloseTimeAmongTickers,
  resolveClosedMarketArchiveIntegration,
} from "@/lib/liveFeeds/marketClosure";
import { sanitizeProjectLiveFeedSource } from "@/lib/liveFeeds/sanitizeProjectLiveFeedSource";
import { refreshEventCandlesticksSnapshotIntoSheets } from "@/lib/liveFeeds/refreshEventCandlesticksSnapshot";
import { useKalshiHistoricalCutoffDisplay } from "@/hooks/useKalshiHistoricalCutoffDisplay";
import { formatKalshiCutoffDisplay } from "@/lib/kalshiLive/marketTickerSearch";
import { startEventCandlesticksEditorLiveFeed } from "@/lib/liveFeeds/startEventCandlesticksEditorLiveFeed";
import { discoverEventCandlesticksFeedGroup } from "@/lib/liveFeeds/feedConfig";

/**
 * Conic ring that fills toward the next poll (same visual language as project rows ring).
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
      aria-label={
        paused
          ? "Live feed paused"
          : `Next live pull in about ${secsLeft ?? "—"} seconds`
      }
    >
      <span className="h-2.5 w-2.5 rounded-full bg-background" />
    </span>
  );
}

/**
 * Start / pause / stop live REST poll for Kalshi event candlesticks.
 * On reopen of a saved live-capable project: snapshot callout + one-shot refresh + re-enable.
 */
export function EventCandlesticksLiveFeedControls() {
  const ctx = useMyStateV2();
  const dataSheets = ctx?.dataSheets || {};
  const setDataSheets = ctx?.setDataSheets;
  const liveFeedState = ctx?.liveFeedState;
  const liveFeedActions = ctx?.liveFeedActions;
  const loadedDataMeta = ctx?.loadedDataMeta;
  const requestConnectWorkspace = ctx?.requestConnectWorkspace;
  const setIntegrationSidebar = ctx?.setIntegrationSidebar;
  const setRightPanelTab = ctx?.setRightPanelTab;
  const softRowCap =
    getLiveFeedEndpointDef("kalshi-live", "event_candlesticks")?.softRowCapPerSheet ?? 50_000;

  const { cutoffMs, cutoffLabelWithTime, loading: cutoffLoading } =
    useKalshiHistoricalCutoffDisplay();

  const group = useMemo(
    () => discoverEventCandlesticksFeedGroup(dataSheets),
    [dataSheets],
  );

  const savedLiveSource = useMemo(
    () => sanitizeProjectLiveFeedSource(loadedDataMeta?.live_feed_source),
    [loadedDataMeta?.live_feed_source],
  );

  const isSavedSnapshot = !!loadedDataMeta?._id && (!!savedLiveSource || !!group);

  const activeFeed = useMemo(() => {
    const feeds = Object.values(liveFeedState?.feedsById || {});
    return (
      feeds.find(
        (f) =>
          f?.integration === "kalshi-live" &&
          f?.endpoint === "event_candlesticks" &&
          String(f?.params?.eventTicker || "").toUpperCase() ===
            String(group?.eventTicker || "").toUpperCase(),
      ) || null
    );
  }, [liveFeedState?.feedsById, group?.eventTicker]);

  const marketsClosedInfo = useMemo(() => {
    if (!group) return null;
    const metaId = group.sheets?.marketsMetadataSheetId;
    const metaSheet = metaId ? dataSheets?.[metaId] : null;
    const metaRows = Array.isArray(metaSheet?.data) ? metaSheet.data : [];
    const tracked = Object.keys(group.sheets?.marketSheetIdsByTicker || {});
    const ended = metaSheet?.liveFeedEnded;
    const closure =
      ended?.reason === "markets_closed"
        ? {
            allClosed: true,
            closedTickers: Array.isArray(ended.closedTickers) ? ended.closedTickers : tracked,
          }
        : evaluateTrackedMarketsClosure(metaRows, tracked);
    if (!closure.allClosed && ended?.reason !== "markets_closed") return null;

    const closedTickers = Array.isArray(closure.closedTickers) ? closure.closedTickers : tracked;
    const closeInfo = latestCloseTimeAmongTickers(metaRows, closedTickers);
    let closeDateLabel = closeInfo.closeDateLabel;
    if (!closeDateLabel && ended?.endedAt) {
      closeDateLabel =
        formatKalshiCutoffDisplay(new Date(Number(ended.endedAt)).toISOString(), {
          withTime: false,
        }) || "";
    }
    const archiveTarget = resolveClosedMarketArchiveIntegration(
      metaRows,
      closedTickers.length ? closedTickers : tracked,
      cutoffMs,
    );
    const isSingle = closedTickers.length === 1;
    const subject = isSingle ? "market" : "event";

    return {
      closed: true,
      subject,
      headline: `This ${subject} is closed — no live feed available`,
      closeDateLabel,
      archiveTarget,
      archiveLabel: closedMarketArchiveIntegrationLabel(archiveTarget),
      closedTickers,
      message: String(
        ended?.message ||
          (isSingle ? `Market ${closedTickers[0]} closed` : "Markets closed"),
      ),
    };
  }, [group, dataSheets, cutoffMs]);

  const goToArchiveIntegration = useCallback(
    (target) => {
      setRightPanelTab?.("integrations");
      if (target === "historical_v2") {
        setIntegrationSidebar?.("kalshiHistoricalV2");
        requestConnectWorkspace?.("kalshiHistoricalV2");
        return;
      }
      setIntegrationSidebar?.("kalshiLive");
      requestConnectWorkspace?.("kalshiLive");
    },
    [requestConnectWorkspace, setIntegrationSidebar, setRightPanelTab],
  );

  const candlePeriod = Math.floor(Number(group?.periodInterval)) || 1;
  const defaultPollMs =
    savedLiveSource?.pollIntervalMs || pollIntervalMsForPeriod(candlePeriod);
  const pollFrequencyOptions = useMemo(
    () => filterLiveFeedPollOptionsForPeriod(candlePeriod),
    [candlePeriod],
  );

  const [pollIntervalMs, setPollIntervalMs] = useState(() => String(defaultPollMs));
  const [refreshBusy, setRefreshBusy] = useState(false);
  const refreshAbortRef = useRef(/** @type {AbortController | null} */ (null));

  useEffect(() => {
    setPollIntervalMs(
      String(clampLiveFeedPollIntervalMs(defaultPollMs, candlePeriod)),
    );
  }, [defaultPollMs, candlePeriod]);

  useEffect(() => {
    return () => {
      refreshAbortRef.current?.abort();
    };
  }, []);

  if (!group) return null;

  const isRunning = !!activeFeed?.isRunning;
  const isPaused = !!activeFeed?.isPaused;
  const candleLabel = describeCandlePeriod(candlePeriod);
  const marketsClosed = !isRunning && !!marketsClosedInfo?.closed;
  const marketCount = Object.keys(group.sheets?.marketSheetIdsByTicker || {}).length;

  const handleStart = () => {
    if (marketsClosedInfo?.closed) {
      toast.message(
        marketsClosedInfo.headline ||
          "This market is closed — no live feed available.",
      );
      return;
    }
    const pollMs = Math.floor(Number(pollIntervalMs)) || defaultPollMs;
    const result = startEventCandlesticksEditorLiveFeed({
      dataSheets,
      liveFeedActions,
      liveFeedState,
      pollIntervalMs: pollMs,
      reason: "manual",
      toastOnStart: false,
    });
    if (result.skipped === "invalid_config" || result.skipped === "start_failed") {
      toast.error("Could not start live feed for this pull.");
      return;
    }
    if (result.started) {
      const freq =
        LIVE_FEED_POLL_FREQUENCY_OPTIONS.find((o) => o.valueMs === pollMs)?.label ||
        `every ${Math.round(pollMs / 60_000)}m`;
      toast.success(
        isSavedSnapshot
          ? `Live feed re-enabled · ${candleLabel} candles · ${freq.toLowerCase()}`
          : `Live feed started · ${candleLabel} candles · ${freq.toLowerCase()}`,
      );
    }
  };

  const handleRefreshOnce = async () => {
    if (refreshBusy || !setDataSheets) return;
    refreshAbortRef.current?.abort();
    const ac = new AbortController();
    refreshAbortRef.current = ac;
    setRefreshBusy(true);
    try {
      const result = await refreshEventCandlesticksSnapshotIntoSheets(dataSheets, {
        signal: ac.signal,
      });
      setDataSheets(result.dataSheets);
      const stats = result.stats;
      const added = Number(stats?.candlesAdded) || 0;
      const updated = Number(stats?.candlesUpdated) || 0;
      toast.success(
        added || updated
          ? `Snapshot refreshed · +${added} new · ${updated} updated across markets`
          : "Snapshot refresh ok · no new candle bars in the lookback window",
      );
    } catch (e) {
      if (e?.name === "AbortError") return;
      toast.error(e instanceof Error ? e.message : "Could not refresh snapshot");
    } finally {
      setRefreshBusy(false);
    }
  };

  return (
    <div className="space-y-2 rounded-md border border-border/60 bg-muted/10 p-2">
      <div className="flex items-center gap-1.5 px-0.5">
        {marketsClosed ? (
          <CircleOff className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
        ) : (
          <Radio
            className={`h-3.5 w-3.5 shrink-0 ${isRunning && !isPaused ? "text-emerald-500" : "text-muted-foreground"}`}
            aria-hidden
          />
        )}
        <span className="text-xs font-medium text-foreground">Live feed</span>
        {isRunning ? (
          <span className="ml-auto flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <LiveFeedNextPullRing
              lastPolledAt={activeFeed?.lastPolledAt ?? activeFeed?.lastSuccessAt}
              pollIntervalMs={activeFeed?.pollIntervalMs}
              paused={isPaused}
            />
            <span>{isPaused ? "Paused" : activeFeed?.statusMessage || "Live"}</span>
          </span>
        ) : marketsClosed ? (
          <span className="ml-auto text-[10px] font-medium text-amber-700 dark:text-amber-300">
            Closed · no live
          </span>
        ) : null}
      </div>

      <p className="px-0.5 text-[10px] leading-snug text-muted-foreground">
        <span className="font-medium text-foreground">Kalshi Live</span>
        {" · "}
        event candlesticks
        {" · "}
        {group.eventTicker}
        {marketCount ? ` · ${marketCount} markets` : ""}
        {" · "}
        {candleLabel}
      </p>

      {marketsClosed ? (
        <div
          role="status"
          className="space-y-1.5 rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-2"
        >
          <p className="text-[11px] font-semibold leading-snug text-amber-950 dark:text-amber-100">
            {marketsClosedInfo.headline}
          </p>
          {marketsClosedInfo.closeDateLabel ? (
            <p className="text-[10px] leading-snug text-amber-950/90 dark:text-amber-100/90">
              This {marketsClosedInfo.subject} closed on{" "}
              <span className="font-medium">{marketsClosedInfo.closeDateLabel}</span>.
            </p>
          ) : (
            <p className="text-[10px] leading-snug text-amber-950/90 dark:text-amber-100/90">
              Trading has ended for the markets in this pull.
            </p>
          )}
          <p className="text-[10px] leading-snug text-amber-950/90 dark:text-amber-100/90">
            The full data archive is available on{" "}
            {marketsClosedInfo.archiveTarget === "both" ? (
              <>
                <button
                  type="button"
                  className="font-medium underline underline-offset-2 hover:opacity-80"
                  onClick={() => goToArchiveIntegration("live")}
                >
                  Kalshi Live
                </button>
                {" and "}
                <button
                  type="button"
                  className="font-medium underline underline-offset-2 hover:opacity-80"
                  onClick={() => goToArchiveIntegration("historical_v2")}
                >
                  Kalshi Historical v2
                </button>
              </>
            ) : marketsClosedInfo.archiveTarget === "historical_v2" ? (
              <button
                type="button"
                className="font-medium underline underline-offset-2 hover:opacity-80"
                onClick={() => goToArchiveIntegration("historical_v2")}
              >
                Kalshi Historical v2
              </button>
            ) : marketsClosedInfo.archiveTarget === "live" ? (
              <button
                type="button"
                className="font-medium underline underline-offset-2 hover:opacity-80"
                onClick={() => goToArchiveIntegration("live")}
              >
                Kalshi Live
              </button>
            ) : (
              <span className="font-medium">{marketsClosedInfo.archiveLabel}</span>
            )}
            {cutoffLabelWithTime && !cutoffLoading ? (
              <>
                {" "}
                (historical cutoff {cutoffLabelWithTime}).
              </>
            ) : (
              "."
            )}
          </p>
        </div>
      ) : null}

      {isSavedSnapshot && !isRunning && !marketsClosed ? (
        <div className="space-y-1.5 rounded-md border border-border/50 bg-background/60 px-2 py-1.5">
          <p className="text-[11px] leading-snug text-foreground">
            This is a snapshot of your data when you last saved your work.
          </p>
          <p className="text-[10px] leading-snug text-muted-foreground">
            Sheets still hold the rows from that save. Re-enabling live only updates{" "}
            <span className="font-medium text-foreground">this editor session</span> — it does not
            change a published dashboard until you save and republish.
          </p>
        </div>
      ) : null}

      {isRunning && activeFeed?.lastTickStats ? (
        <p className="px-0.5 text-[10px] leading-snug text-muted-foreground tabular-nums">
          Pull #{Number(activeFeed.tickCount) || 1}
          {" · "}
          {activeFeed.lastTickStats.marketsMatched}/{activeFeed.lastTickStats.marketsInTick} markets
          {" · "}
          {activeFeed.lastTickStats.candlesReceived} candles
          {activeFeed.lastTickStats.candlesAdded > 0
            ? ` · +${activeFeed.lastTickStats.candlesAdded} new`
            : ""}
          {activeFeed.lastTickStats.candlesUpdated > 0
            ? ` · ${activeFeed.lastTickStats.candlesUpdated} upserted`
            : ""}
          {activeFeed.lastTickStats.metaUpdated ? " · markets sheet updated" : ""}
          {activeFeed.lastTickStats.marketsUnmatched > 0
            ? ` · ${activeFeed.lastTickStats.marketsUnmatched} unmatched`
            : ""}
          {activeFeed.lastTickStats.latestEndPeriodTs
            ? ` · latest ${new Date(activeFeed.lastTickStats.latestEndPeriodTs * 1000).toLocaleTimeString()}`
            : ""}
        </p>
      ) : null}

      {!isRunning && !marketsClosed ? (
        <>
          {isSavedSnapshot ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={refreshBusy}
              className="h-auto w-full justify-start gap-2 whitespace-normal px-2.5 py-2 text-left text-xs"
              onClick={handleRefreshOnce}
            >
              <RefreshCw
                className={`h-3.5 w-3.5 shrink-0 text-sky-500 ${refreshBusy ? "animate-spin" : ""}`}
                aria-hidden
              />
              <span className="min-w-0">
                {refreshBusy ? "Refreshing markets…" : "Refresh once (append latest candles)"}
              </span>
            </Button>
          ) : null}

          <p className="px-0.5 text-[11px] leading-snug text-muted-foreground">
            {isSavedSnapshot ? "Re-enable" : "Start"}{" "}
            <span className="font-medium text-foreground">{candleLabel}</span> live polls from this
            pull. Candle size stays fixed.
          </p>
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">Pull frequency</Label>
            <Select value={pollIntervalMs} onValueChange={setPollIntervalMs}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pollFrequencyOptions.map((o) => (
                  <SelectItem key={o.valueMs} value={String(o.valueMs)} className="text-xs">
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-auto w-full justify-start gap-2 whitespace-normal px-2.5 py-2 text-left text-xs"
            onClick={handleStart}
          >
            <Play className="h-3.5 w-3.5 shrink-0 text-emerald-500" aria-hidden />
            <span className="min-w-0">{isSavedSnapshot ? "Re-enable live feed" : "Start live"}</span>
          </Button>
        </>
      ) : null}

      {isRunning ? (
        <div className="flex flex-wrap gap-1.5">
          {isPaused ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={() => liveFeedActions?.resume?.(activeFeed.id)}
            >
              <Play className="h-3.5 w-3.5" aria-hidden />
              Resume
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={() => liveFeedActions?.pause?.(activeFeed.id)}
            >
              <Pause className="h-3.5 w-3.5" aria-hidden />
              Pause
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={() => {
              liveFeedActions?.stop?.(activeFeed.id);
              toast.message("Live feed stopped");
            }}
          >
            <Square className="h-3.5 w-3.5" aria-hidden />
            Stop
          </Button>
        </div>
      ) : null}

      {activeFeed?.lastError ? (
        <p className="px-1 text-[11px] text-destructive">{activeFeed.lastError}</p>
      ) : null}

      <div className="space-y-1.5 border-t border-border/40 pt-2">
        <div className="flex gap-1.5 px-0.5">
          <Archive className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />
          <p className="text-[10px] leading-snug text-muted-foreground">
            <span className="font-medium text-foreground">Archive / analysis</span>
            {" — "}
            {marketsClosed ? (
              <>
                Pull the full history from{" "}
                <span className="font-medium text-foreground">
                  {marketsClosedInfo.archiveLabel}
                </span>
                {marketsClosedInfo.archiveTarget === "historical_v2"
                  ? " (settled before the live/historical cutoff)."
                  : marketsClosedInfo.archiveTarget === "live"
                    ? " (settled after the live/historical cutoff)."
                    : marketsClosedInfo.archiveTarget === "both"
                      ? " — history before the cutoff is on Historical v2; after the cutoff use Live."
                      : "."}
              </>
            ) : (
              <>
                For a complete history of this event, pull Kalshi Historical v2 or a wide Live window
                and save. Live refresh only merges recent bars into your existing sheets.
              </>
            )}
          </p>
        </div>
        {!marketsClosed ? (
          <div className="flex gap-1.5 px-0.5">
            <Activity className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />
            <p className="text-[10px] leading-snug text-muted-foreground">
              <span className="font-medium text-foreground">Interactive live</span>
              {" — "}
              Browser polls while this tab is open. Sheets keep a working window (~
              {softRowCap.toLocaleString()} bars/market): on restart we backfill from the last
              stored candle, then drop the oldest bars if the window would overflow. Published
              dashboards use on-demand live separately when visitors open them.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
