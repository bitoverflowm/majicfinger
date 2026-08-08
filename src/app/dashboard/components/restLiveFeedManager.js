"use client";

import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { useMyStateV2 } from "@/context/stateContextV2";
import { createLiveFeedConfig, resolveEventCandlesticksSheetsMap, resolveMarketCandlesticksSheetsMap, resolveTradesSheetsMap } from "@/lib/liveFeeds/feedConfig";
import { getLiveFeedEndpointDef, liveFeedRegistryKey } from "@/lib/liveFeeds/registry";
import { fetchKalshiLiveEventCandlesticksIncremental } from "@/lib/liveFeeds/fetchEventCandlesticksIncremental";
import { fetchKalshiLiveMarketCandlesticksIncremental } from "@/lib/liveFeeds/fetchMarketCandlesticksIncremental";
import { fetchKalshiLiveTradesIncremental } from "@/lib/liveFeeds/fetchTradesIncremental";
import { applyKalshiCandlestickUpsertToSheets } from "@/lib/liveFeeds/merge/kalshiCandlestickUpsert";
import { applyKalshiTradesUpsertToSheets } from "@/lib/liveFeeds/merge/kalshiTradesUpsert";
import { resolveCandlestickBackfillStartTs } from "@/lib/liveFeeds/candlestickBackfill";
import {
  buildLiveFeedEndedStamp,
  clearLiveFeedEndedOnSheets,
  evaluateTrackedMarketsClosure,
  mergeMarketMetaRowsForClosure,
  stampLiveFeedEndedOnSheets,
} from "@/lib/liveFeeds/marketClosure";

const noop = () => {};

/**
 * Markets metadata rows already on the workbook (used when the tick meta refresh fails).
 * @param {Record<string, object> | null | undefined} dataSheets
 * @param {import("@/lib/liveFeeds/feedConfig").LiveFeedConfig} feed
 */
function sheetMetaRowsForFeed(dataSheets, feed) {
  const metaId = String(feed?.sheets?.marketsMetadataSheetId || "").trim();
  if (!metaId) return [];
  const rows = dataSheets?.[metaId]?.data;
  return Array.isArray(rows) ? rows : [];
}

/**
 * Browser REST live-feed poller (sibling to LiveStreamManager for WebSockets).
 * Ephemeral until Save — timers die on leave/stop with no server work.
 */
export default function RestLiveFeedManager() {
  const ctx = useMyStateV2();
  const setDataSheets = ctx?.setDataSheets;
  const dataSheets = ctx?.dataSheets;
  const setLiveFeedState = ctx?.setLiveFeedState;
  const setLiveFeedActions = ctx?.setLiveFeedActions;

  const timersByFeedIdRef = useRef(/** @type {Record<string, ReturnType<typeof setInterval>>} */ ({}));
  const abortByFeedIdRef = useRef(/** @type {Record<string, AbortController>} */ ({}));
  const configByFeedIdRef = useRef(/** @type {Record<string, import("@/lib/liveFeeds/feedConfig").LiveFeedConfig>} */ ({}));
  const pausedByFeedIdRef = useRef(/** @type {Record<string, boolean>} */ ({}));
  const inFlightByFeedIdRef = useRef(/** @type {Record<string, boolean>} */ ({}));
  const dataSheetsRef = useRef(dataSheets);
  dataSheetsRef.current = dataSheets;

  const clearTimer = useCallback((feedId) => {
    const t = timersByFeedIdRef.current[feedId];
    if (t) {
      clearInterval(t);
      delete timersByFeedIdRef.current[feedId];
    }
    const ac = abortByFeedIdRef.current[feedId];
    if (ac) {
      try {
        ac.abort();
      } catch (_) {}
    }
    delete abortByFeedIdRef.current[feedId];
  }, []);

  const patchFeedState = useCallback(
    (feedId, patch) => {
      setLiveFeedState?.((s) => {
        const feedsById = { ...(s?.feedsById || {}) };
        const prev = feedsById[feedId];
        if (!prev) return s;
        feedsById[feedId] = { ...prev, ...patch };
        return { ...s, feedsById };
      });
    },
    [setLiveFeedState],
  );

  const stop = useCallback(
    (feedId) => {
      if (feedId != null) {
        clearTimer(feedId);
        delete configByFeedIdRef.current[feedId];
        delete pausedByFeedIdRef.current[feedId];
        delete inFlightByFeedIdRef.current[feedId];
        setLiveFeedState?.((s) => {
          const feedsById = { ...(s?.feedsById || {}) };
          delete feedsById[feedId];
          return { ...s, feedsById };
        });
      } else {
        Object.keys(configByFeedIdRef.current).forEach((id) => stop(id));
      }
    },
    [clearTimer, setLiveFeedState],
  );

  /**
   * Stop polling after markets close; stamp sheets so UI can show closed state.
   * @param {string} feedId
   * @param {import("@/lib/liveFeeds/feedConfig").LiveFeedConfig} feed
   * @param {ReturnType<typeof evaluateTrackedMarketsClosure>} closure
   */
  const endFeedMarketsClosed = useCallback(
    (feedId, feed, closure) => {
      const ended = buildLiveFeedEndedStamp(feed, {
        reason: "markets_closed",
        closedTickers: closure.closedTickers,
      });
      setDataSheets?.((prev) => stampLiveFeedEndedOnSheets(prev, feed, ended));
      clearTimer(feedId);
      delete configByFeedIdRef.current[feedId];
      delete pausedByFeedIdRef.current[feedId];
      delete inFlightByFeedIdRef.current[feedId];
      setLiveFeedState?.((s) => {
        const feedsById = { ...(s?.feedsById || {}) };
        delete feedsById[feedId];
        return { ...s, feedsById };
      });
      toast.message(ended.message);
      return { ended: true, reason: "markets_closed", statusMessage: ended.message };
    },
    [setDataSheets, clearTimer, setLiveFeedState],
  );

  const runTick = useCallback(
    async (feedId) => {
      const feed = configByFeedIdRef.current[feedId];
      if (!feed || !setDataSheets) return { ended: false };
      if (pausedByFeedIdRef.current[feedId]) return { ended: false };
      if (inFlightByFeedIdRef.current[feedId]) return { ended: false };

      inFlightByFeedIdRef.current[feedId] = true;
      const ac = new AbortController();
      abortByFeedIdRef.current[feedId] = ac;
      const now = Date.now();
      patchFeedState(feedId, { lastPolledAt: now, lastError: null });

      try {
        const def = getLiveFeedEndpointDef(feed.integration, feed.endpoint);
        const softRowCap = def?.softRowCapPerSheet ?? 50_000;
        const lookbackPeriods = def?.lookbackPeriods ?? 3;
        const registryKey = liveFeedRegistryKey(feed.integration, feed.endpoint);

        const isEventCandles = registryKey === "kalshi-live:event_candlesticks";
        const isMarketCandles = registryKey === "kalshi-live:candlesticks";
        const isTrades = registryKey === "kalshi-live:trades";
        if (!isEventCandles && !isMarketCandles && !isTrades) {
          return { ended: false };
        }

        if (isTrades) {
          const resolveSheets = resolveTradesSheetsMap;
          const sheetsNow = dataSheetsRef.current || {};
          const resolvedForFetch = resolveSheets(sheetsNow, feed) || feed.sheets;
          const marketTickers = Array.isArray(feed.params.marketTickers)
            ? feed.params.marketTickers
            : Object.keys(resolvedForFetch?.marketSheetIdsByTicker || {});

          // Stop immediately when workbook meta already shows all markets closed
          // (avoids 1s poll spam + UI freeze after an esports market ends).
          const preClosure = evaluateTrackedMarketsClosure(
            sheetMetaRowsForFeed(sheetsNow, { ...feed, sheets: resolvedForFetch }),
            marketTickers,
            Date.now(),
          );
          if (preClosure.allClosed) {
            return endFeedMarketsClosed(feedId, { ...feed, sheets: resolvedForFetch }, preClosure);
          }

          const needsGapBackfill =
            !!feed.needsGapBackfill || (Number(feed.tickCount) || 0) === 0;
          if (needsGapBackfill) {
            patchFeedState(feedId, { statusMessage: "Backfilling trades since last stop…" });
          }

          const tick = await fetchKalshiLiveTradesIncremental({
            marketTickers,
            lookbackSec: lookbackPeriods,
            dataSheets: sheetsNow,
            marketSheetIdsByTicker: resolvedForFetch?.marketSheetIdsByTicker,
            forceLookback: needsGapBackfill && !(Number(feed.tickCount) > 0),
            signal: ac.signal,
          });

          if (!configByFeedIdRef.current[feedId]) return { ended: true };

          let tickStats = null;
          setDataSheets((prev) => {
            const resolvedSheets = resolveSheets(prev, feed) || feed.sheets;
            const feedForTick = { ...feed, sheets: resolvedSheets };
            configByFeedIdRef.current[feedId] = {
              ...(configByFeedIdRef.current[feedId] || feed),
              sheets: resolvedSheets,
            };
            const result = applyKalshiTradesUpsertToSheets(prev, feedForTick, tick, {
              softRowCap,
            });
            tickStats = result.stats;
            return result.dataSheets;
          });

          const tracked = Object.keys(
            (configByFeedIdRef.current[feedId] || feed).sheets?.marketSheetIdsByTicker || {},
          );
          const sheetsAfter = dataSheetsRef.current || {};
          const prevMeta = Array.isArray(configByFeedIdRef.current[feedId]?.lastMetaRows)
            ? configByFeedIdRef.current[feedId].lastMetaRows
            : [];
          const mergedMeta = mergeMarketMetaRowsForClosure(
            mergeMarketMetaRowsForClosure(tick.metaRows, prevMeta),
            sheetMetaRowsForFeed(sheetsAfter, configByFeedIdRef.current[feedId] || feed),
          );
          if (Array.isArray(tick.metaRows) && tick.metaRows.length) {
            configByFeedIdRef.current[feedId] = {
              ...(configByFeedIdRef.current[feedId] || feed),
              lastMetaRows: tick.metaRows,
            };
          }
          const closure = evaluateTrackedMarketsClosure(mergedMeta, tracked, Date.now());
          if (closure.allClosed) {
            return endFeedMarketsClosed(feedId, feed, closure);
          }

          const successAt = Date.now();
          const prevTickCount = Number(configByFeedIdRef.current[feedId]?.tickCount) || 0;
          const tickCount = prevTickCount + 1;
          let statusMessage = "Receiving live trades…";
          if (tick.usedBackfillWindow && tickStats?.tradesAdded > 0) {
            statusMessage = `Backfilled · +${tickStats.tradesAdded} trades`;
          } else if (tickStats?.tradesReceived === 0) {
            statusMessage = "Pull ok · no new trades";
          } else if (tickStats?.marketsMatched === 0) {
            statusMessage = "Pull ok · no matching sheets";
          } else if (tickStats?.tradesAdded > 0) {
            statusMessage = `Receiving live trades · +${tickStats.tradesAdded} new`;
          } else if (tickStats?.tradesUpdated > 0) {
            statusMessage = `Receiving live trades · ${tickStats.tradesUpdated} updated`;
          }
          if (closure.anyClosed && closure.openTickers.length > 0) {
            const n = closure.closedTickers.length;
            statusMessage = `${statusMessage.replace(/…$/, "")} · ${n} market${n === 1 ? "" : "s"} closed`;
          }

          const nextCfg = {
            ...(configByFeedIdRef.current[feedId] || feed),
            lastPolledAt: now,
            lastSuccessAt: successAt,
            lastError: null,
            tickCount,
            lastTickStats: tickStats,
            needsGapBackfill: false,
          };
          configByFeedIdRef.current[feedId] = nextCfg;
          patchFeedState(feedId, {
            lastPolledAt: now,
            lastSuccessAt: successAt,
            lastError: null,
            tickCount,
            lastTickStats: tickStats,
            statusMessage,
            needsGapBackfill: false,
          });
          return { ended: false };
        }

        const resolveSheets = isEventCandles
          ? resolveEventCandlesticksSheetsMap
          : resolveMarketCandlesticksSheetsMap;

        const endTs = Math.floor(Date.now() / 1000);
        const needsGapBackfill =
          !!feed.needsGapBackfill || (Number(feed.tickCount) || 0) === 0;
        let backfillStartTs = null;
        if (needsGapBackfill) {
          const sheetsNow = dataSheetsRef.current || {};
          const resolvedForCutoff = resolveSheets(sheetsNow, feed) || feed.sheets;
          backfillStartTs = resolveCandlestickBackfillStartTs({
            dataSheets: sheetsNow,
            feed: { ...feed, sheets: resolvedForCutoff },
            endTs,
            softRowCap,
          });
          if (backfillStartTs != null) {
            patchFeedState(feedId, { statusMessage: "Backfilling gap since last stop…" });
          }
        }

        const tick = isEventCandles
          ? await fetchKalshiLiveEventCandlesticksIncremental({
              eventTicker: String(feed.params.eventTicker || ""),
              seriesTicker: String(feed.params.seriesTicker || ""),
              periodInterval: Number(feed.params.periodInterval) || feed.periodInterval,
              lookbackPeriods,
              ...(backfillStartTs != null ? { startTs: backfillStartTs, endTs } : {}),
              signal: ac.signal,
            })
          : await fetchKalshiLiveMarketCandlesticksIncremental({
              marketTickers: Array.isArray(feed.params.marketTickers)
                ? feed.params.marketTickers
                : Object.keys(feed.sheets?.marketSheetIdsByTicker || {}),
              periodInterval: Number(feed.params.periodInterval) || feed.periodInterval,
              lookbackPeriods,
              ...(backfillStartTs != null ? { startTs: backfillStartTs, endTs } : {}),
              signal: ac.signal,
            });

        // Feed may have been stopped while the request was in flight.
        if (!configByFeedIdRef.current[feedId]) return { ended: true };

        let tickStats = null;
        setDataSheets((prev) => {
          const resolvedSheets = resolveSheets(prev, feed) || feed.sheets;
          const feedForTick = { ...feed, sheets: resolvedSheets };
          configByFeedIdRef.current[feedId] = {
            ...(configByFeedIdRef.current[feedId] || feed),
            sheets: resolvedSheets,
          };
          const result = applyKalshiCandlestickUpsertToSheets(prev, feedForTick, tick, {
            softRowCap,
          });
          tickStats = result.stats;
          return result.dataSheets;
        });

        const tracked = Object.keys(
          (configByFeedIdRef.current[feedId] || feed).sheets?.marketSheetIdsByTicker || {},
        );
        const sheetsAfter = dataSheetsRef.current || {};
        const mergedMeta = mergeMarketMetaRowsForClosure(
          tick.metaRows,
          sheetMetaRowsForFeed(sheetsAfter, configByFeedIdRef.current[feedId] || feed),
        );
        const closure = evaluateTrackedMarketsClosure(mergedMeta, tracked, Date.now());
        if (closure.allClosed) {
          return endFeedMarketsClosed(feedId, feed, closure);
        }

        const successAt = Date.now();
        const prevTickCount = Number(configByFeedIdRef.current[feedId]?.tickCount) || 0;
        const tickCount = prevTickCount + 1;
        let statusMessage = "Receiving live data…";
        if (tick.usedBackfillWindow && (tickStats?.candlesAdded > 0 || tickStats?.candlesUpdated > 0)) {
          statusMessage =
            tickStats?.candlesAdded > 0
              ? `Backfilled · +${tickStats.candlesAdded} bars`
              : `Backfilled · ${tickStats.candlesUpdated} updated`;
        } else if (tickStats?.candlesReceived === 0) {
          statusMessage = "Pull ok · empty candle window";
        } else if (tickStats?.marketsMatched === 0) {
          statusMessage = "Pull ok · no matching sheets";
        } else if (tickStats?.candlesAdded > 0) {
          statusMessage = `Receiving live data · +${tickStats.candlesAdded} new`;
        } else if (tickStats?.candlesUpdated > 0) {
          statusMessage = `Receiving live data · ${tickStats.candlesUpdated} updated`;
        }
        if (closure.anyClosed && closure.openTickers.length > 0) {
          const n = closure.closedTickers.length;
          statusMessage = `${statusMessage.replace(/…$/, "")} · ${n} market${n === 1 ? "" : "s"} closed`;
        }

        const nextCfg = {
          ...(configByFeedIdRef.current[feedId] || feed),
          lastPolledAt: now,
          lastSuccessAt: successAt,
          lastError: null,
          tickCount,
          lastTickStats: tickStats,
          needsGapBackfill: false,
        };
        configByFeedIdRef.current[feedId] = nextCfg;
        patchFeedState(feedId, {
          lastPolledAt: now,
          lastSuccessAt: successAt,
          lastError: null,
          tickCount,
          lastTickStats: tickStats,
          statusMessage,
          needsGapBackfill: false,
        });
        return { ended: false, statusMessage };
      } catch (e) {
        if (e?.name === "AbortError") return { ended: false };
        const msg = e instanceof Error ? e.message : "Live feed poll failed";
        if (!configByFeedIdRef.current[feedId]) return { ended: true };
        configByFeedIdRef.current[feedId] = {
          ...feed,
          lastPolledAt: now,
          lastError: msg,
        };
        patchFeedState(feedId, { lastPolledAt: now, lastError: msg });
        return { ended: false, error: msg };
      } finally {
        inFlightByFeedIdRef.current[feedId] = false;
      }
    },
    [setDataSheets, patchFeedState, endFeedMarketsClosed],
  );

  const start = useCallback(
    (configInput) => {
      const cfg = createLiveFeedConfig({
        ...configInput,
        status: configInput?.status === "persisted" ? "persisted" : "ephemeral",
        isRunning: true,
        isPaused: false,
      });
      if (!cfg) {
        toast.error("This endpoint does not support live feeds yet.");
        return null;
      }

      const def = getLiveFeedEndpointDef(cfg.integration, cfg.endpoint);
      const maxEphemeral = def?.maxConcurrentEphemeralPerTab ?? 2;
      const runningEphemeral = Object.values(configByFeedIdRef.current).filter(
        (f) => f.status === "ephemeral",
      ).length;
      if (cfg.status === "ephemeral" && runningEphemeral >= maxEphemeral && !configByFeedIdRef.current[cfg.id]) {
        toast.error(`At most ${maxEphemeral} live feeds at a time. Stop one first.`);
        return null;
      }

      // Replace same feed id if restarting
      clearTimer(cfg.id);
      pausedByFeedIdRef.current[cfg.id] = false;
      configByFeedIdRef.current[cfg.id] = {
        ...cfg,
        tickCount: 0,
        needsGapBackfill: true,
      };

      // Clear any prior "markets closed" stamp from a previous run.
      setDataSheets?.((prev) => clearLiveFeedEndedOnSheets(prev, cfg));

      setLiveFeedState?.((s) => ({
        ...s,
        feedsById: {
          ...(s?.feedsById || {}),
          [cfg.id]: {
            ...cfg,
            isRunning: true,
            isPaused: false,
            connecting: true,
            tickCount: 0,
            needsGapBackfill: true,
            statusMessage: "Starting live feed…",
          },
        },
      }));

      // Immediate first tick, then interval only if the feed is still running
      // (markets may already be closed on the first pull).
      void runTick(cfg.id).then((result) => {
        if (!configByFeedIdRef.current[cfg.id] || result?.ended) {
          clearTimer(cfg.id);
          return;
        }
        patchFeedState(cfg.id, {
          connecting: false,
          statusMessage: result?.statusMessage || "Receiving live data…",
          isRunning: true,
        });
        if (!timersByFeedIdRef.current[cfg.id]) {
          timersByFeedIdRef.current[cfg.id] = setInterval(() => {
            void runTick(cfg.id);
          }, cfg.pollIntervalMs);
        }
      });

      return cfg.id;
    },
    [clearTimer, setLiveFeedState, setDataSheets, runTick, patchFeedState],
  );

  const pause = useCallback(
    (feedId) => {
      if (!feedId) return;
      pausedByFeedIdRef.current[feedId] = true;
      patchFeedState(feedId, { isPaused: true, statusMessage: "Paused" });
    },
    [patchFeedState],
  );

  const resume = useCallback(
    (feedId) => {
      if (!feedId) return;
      pausedByFeedIdRef.current[feedId] = false;
      const prev = configByFeedIdRef.current[feedId];
      if (prev) {
        configByFeedIdRef.current[feedId] = { ...prev, needsGapBackfill: true };
      }
      patchFeedState(feedId, {
        isPaused: false,
        needsGapBackfill: true,
        statusMessage: "Resuming · backfilling gap…",
      });
      void runTick(feedId);
    },
    [patchFeedState, runTick],
  );

  const restart = useCallback(
    (feedId, patch = null) => {
      const cfg = configByFeedIdRef.current[feedId];
      if (!cfg) return;
      const next =
        patch && typeof patch === "object"
          ? {
              ...cfg,
              ...(Number.isFinite(Number(patch.pollIntervalMs))
                ? { pollIntervalMs: Math.floor(Number(patch.pollIntervalMs)) }
                : {}),
            }
          : cfg;
      stop(feedId);
      start(next);
    },
    [stop, start],
  );

  useEffect(() => {
    if (typeof setLiveFeedActions !== "function") return undefined;
    setLiveFeedActions({
      start,
      stop,
      pause,
      resume,
      restart,
    });
    return () => {
      stop();
      if (typeof setLiveFeedActions === "function") {
        setLiveFeedActions({
          start: noop,
          stop: noop,
          pause: noop,
          resume: noop,
          restart: noop,
        });
      }
    };
  }, [start, stop, pause, resume, restart, setLiveFeedActions]);

  useEffect(() => {
    const onUnload = () => {
      stop();
    };
    window.addEventListener("beforeunload", onUnload);
    window.addEventListener("pagehide", onUnload);
    return () => {
      window.removeEventListener("beforeunload", onUnload);
      window.removeEventListener("pagehide", onUnload);
      stop();
    };
  }, [stop]);

  return null;
}
