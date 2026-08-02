"use client";

import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { useMyStateV2 } from "@/context/stateContextV2";
import { createLiveFeedConfig } from "@/lib/liveFeeds/feedConfig";
import { getLiveFeedEndpointDef } from "@/lib/liveFeeds/registry";
import { fetchKalshiLiveEventCandlesticksIncremental } from "@/lib/liveFeeds/fetchEventCandlesticksIncremental";
import { applyKalshiCandlestickUpsertToSheets } from "@/lib/liveFeeds/merge/kalshiCandlestickUpsert";

const noop = () => {};

/**
 * Browser REST live-feed poller (sibling to LiveStreamManager for WebSockets).
 * Ephemeral until Save — timers die on leave/stop with no server work.
 */
export default function RestLiveFeedManager() {
  const ctx = useMyStateV2();
  const setDataSheets = ctx?.setDataSheets;
  const setLiveFeedState = ctx?.setLiveFeedState;
  const setLiveFeedActions = ctx?.setLiveFeedActions;

  const timersByFeedIdRef = useRef(/** @type {Record<string, ReturnType<typeof setInterval>>} */ ({}));
  const abortByFeedIdRef = useRef(/** @type {Record<string, AbortController>} */ ({}));
  const configByFeedIdRef = useRef(/** @type {Record<string, import("@/lib/liveFeeds/feedConfig").LiveFeedConfig>} */ ({}));
  const pausedByFeedIdRef = useRef(/** @type {Record<string, boolean>} */ ({}));
  const inFlightByFeedIdRef = useRef(/** @type {Record<string, boolean>} */ ({}));

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
      delete abortByFeedIdRef.current[feedId];
    }
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

  const runTick = useCallback(
    async (feedId) => {
      const feed = configByFeedIdRef.current[feedId];
      if (!feed || !setDataSheets) return;
      if (pausedByFeedIdRef.current[feedId]) return;
      if (inFlightByFeedIdRef.current[feedId]) return;

      inFlightByFeedIdRef.current[feedId] = true;
      const ac = new AbortController();
      abortByFeedIdRef.current[feedId] = ac;
      const now = Date.now();
      patchFeedState(feedId, { lastPolledAt: now, lastError: null });

      try {
        const def = getLiveFeedEndpointDef(feed.integration, feed.endpoint);
        const softRowCap = def?.softRowCapPerSheet ?? 2000;
        const lookbackPeriods = def?.lookbackPeriods ?? 3;

        if (feed.integration === "kalshi-live" && feed.endpoint === "event_candlesticks") {
          const tick = await fetchKalshiLiveEventCandlesticksIncremental({
            eventTicker: feed.params.eventTicker,
            seriesTicker: feed.params.seriesTicker,
            periodInterval: feed.params.periodInterval,
            lookbackPeriods,
            signal: ac.signal,
          });

          let tickStats = null;
          setDataSheets((prev) => {
            const result = applyKalshiCandlestickUpsertToSheets(prev, feed, tick, { softRowCap });
            tickStats = result.stats;
            return result.dataSheets;
          });

          const successAt = Date.now();
          const prevTickCount = Number(configByFeedIdRef.current[feedId]?.tickCount) || 0;
          const tickCount = prevTickCount + 1;
          let statusMessage = "Receiving live data…";
          if (tickStats?.candlesReceived === 0) {
            statusMessage = "Pull ok · empty candle window";
          } else if (tickStats?.marketsMatched === 0) {
            statusMessage = "Pull ok · no matching sheets";
          } else if (tickStats?.candlesAdded > 0) {
            statusMessage = `Receiving live data · +${tickStats.candlesAdded} new`;
          } else if (tickStats?.candlesUpdated > 0) {
            statusMessage = `Receiving live data · ${tickStats.candlesUpdated} updated`;
          }

          const nextCfg = {
            ...feed,
            lastPolledAt: now,
            lastSuccessAt: successAt,
            lastError: null,
            tickCount,
            lastTickStats: tickStats,
          };
          configByFeedIdRef.current[feedId] = nextCfg;
          patchFeedState(feedId, {
            lastPolledAt: now,
            lastSuccessAt: successAt,
            lastError: null,
            tickCount,
            lastTickStats: tickStats,
            statusMessage,
          });
        }
      } catch (e) {
        if (e?.name === "AbortError") return;
        const msg = e instanceof Error ? e.message : "Live feed poll failed";
        configByFeedIdRef.current[feedId] = {
          ...feed,
          lastPolledAt: now,
          lastError: msg,
        };
        patchFeedState(feedId, { lastPolledAt: now, lastError: msg });
      } finally {
        inFlightByFeedIdRef.current[feedId] = false;
      }
    },
    [setDataSheets, patchFeedState],
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
      configByFeedIdRef.current[cfg.id] = cfg;

      setLiveFeedState?.((s) => ({
        ...s,
        feedsById: {
          ...(s?.feedsById || {}),
          [cfg.id]: {
            ...cfg,
            isRunning: true,
            isPaused: false,
            connecting: true,
            statusMessage: "Starting live feed…",
          },
        },
      }));

      // Immediate first tick, then interval
      void runTick(cfg.id).then(() => {
        patchFeedState(cfg.id, {
          connecting: false,
          statusMessage: "Receiving live data…",
          isRunning: true,
        });
      });

      timersByFeedIdRef.current[cfg.id] = setInterval(() => {
        void runTick(cfg.id);
      }, cfg.pollIntervalMs);

      return cfg.id;
    },
    [clearTimer, setLiveFeedState, runTick, patchFeedState],
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
      patchFeedState(feedId, { isPaused: false, statusMessage: "Receiving live data…" });
      void runTick(feedId);
    },
    [patchFeedState, runTick],
  );

  const restart = useCallback(
    (feedId) => {
      const cfg = configByFeedIdRef.current[feedId];
      if (!cfg) return;
      stop(feedId);
      start(cfg);
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
