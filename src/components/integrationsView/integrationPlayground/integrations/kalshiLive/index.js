"use client";

import { useCallback, useEffect, useRef } from "react";
import { flushSync } from "react-dom";

import { useMyStateV2 } from "@/context/stateContextV2";
import { applyAthenaPullToSheetPatch } from "@/lib/dataLake/applyAthenaPullToSheet";
import { fetchKalshiLiveMarketsTickerPull } from "@/lib/kalshiLive/fetchKalshiLiveMarketsTickerPull";
import { fetchKalshiLiveMarketsDiscoveryPull } from "@/lib/kalshiLive/fetchKalshiLiveMarketsDiscoveryPull";
import { fetchKalshiLiveEventsTickerPull } from "@/lib/kalshiLive/fetchKalshiLiveEventsTickerPull";
import { fetchKalshiLiveEventsDiscoveryPull } from "@/lib/kalshiLive/fetchKalshiLiveEventsDiscoveryPull";
import { fetchKalshiLiveMultivariateEventsPull } from "@/lib/kalshiLive/fetchKalshiLiveMultivariateEventsPull";
import { fetchKalshiLiveSeriesPull } from "@/lib/kalshiLive/fetchKalshiLiveSeriesPull";
import { fetchKalshiLiveSeriesDiscoveryPull } from "@/lib/kalshiLive/fetchKalshiLiveSeriesDiscoveryPull";
import {
  KALSHI_LIVE_MARKETS_SHEET_MODE_COMBINED,
  normalizeKalshiLiveMarketsSheetMode,
  summarizeKalshiLiveMarketsTickerPullRequest,
} from "@/lib/kalshiLive/marketCompose";
import {
  KALSHI_LIVE_MVE_FILTER_EXCLUDE,
  summarizeKalshiLiveMarketsDiscoveryRequest,
} from "@/lib/kalshiLive/marketDiscovery";
import {
  KALSHI_LIVE_EVENTS_SHEET_MODE_COMBINED,
  normalizeKalshiLiveEventsRowMode,
  normalizeKalshiLiveEventsSheetMode,
  summarizeKalshiLiveEventsTickerPullRequest,
} from "@/lib/kalshiLive/eventCompose";
import { summarizeKalshiLiveEventsDiscoveryRequest } from "@/lib/kalshiLive/eventDiscovery";
import { summarizeKalshiLiveMultivariateEventsDiscoveryRequest } from "@/lib/kalshiLive/multivariateEventsDiscovery";
import {
  KALSHI_LIVE_SERIES_SHEET_MODE_COMBINED,
  normalizeKalshiLiveSeriesSheetMode,
  summarizeKalshiLiveSeriesDiscoveryRequest,
  summarizeKalshiLiveSeriesPullRequest,
} from "@/lib/kalshiLive/seriesCompose";
import { ingestKalshiLiveAsView } from "@/lib/kalshiLive/ingestKalshiLiveAsView";
import { kalshiLiveSeriesWantsIncludeVolume } from "@/lib/kalshiLive/seriesColumns";
import { fetchKalshiLiveCandlesticksPull } from "@/lib/kalshiLive/fetchKalshiLiveCandlesticksPull";
import { fetchKalshiLiveEventCandlesticksPull } from "@/lib/kalshiLive/fetchKalshiLiveEventCandlesticksPull";
import { fetchKalshiLiveEventForecastPull } from "@/lib/kalshiLive/fetchKalshiLiveEventForecastPull";
import { fetchKalshiLiveLeaderboardPull } from "@/lib/kalshiLive/fetchKalshiLiveLeaderboardPull";
import { fetchKalshiLiveHolderProfilePull } from "@/lib/kalshiLive/fetchKalshiLiveHolderProfilePull";
import { fetchKalshiLiveHolderTradesPull } from "@/lib/kalshiLive/fetchKalshiLiveHolderTradesPull";
import { fetchKalshiLiveSearchTradersPull } from "@/lib/kalshiLive/fetchKalshiLiveSearchTradersPull";
import {
  partitionEventForecastApiParams,
  parseKalshiLiveEventForecastTicker,
  resolveForecastApiPercentilesFromDisplay,
  summarizeKalshiLiveEventForecastRequest,
} from "@/lib/kalshiLive/eventForecastCompose";
import {
  resolveKalshiLiveLeaderboardCategory,
  summarizeKalshiLiveLeaderboardRequest,
} from "@/lib/kalshiLive/leaderboardCompose";
import { summarizeKalshiLiveHolderProfileRequest } from "@/lib/kalshiLive/holderProfileCompose";
import { summarizeKalshiLiveHolderTradesRequest } from "@/lib/kalshiLive/holderTradesCompose";
import { summarizeKalshiLiveSearchTradersRequest } from "@/lib/kalshiLive/searchTradersCompose";
import { inferSeriesTickerFromEvent } from "@/lib/kalshiLive/eventCandlesticksCompose";
import { fetchKalshiLiveTradesPull } from "@/lib/kalshiLive/fetchKalshiLiveTradesPull";
import { fetchKalshiLiveOrderbookPull } from "@/lib/kalshiLive/fetchKalshiLiveOrderbookPull";
import { applyConnectHomePullData } from "@/lib/connectHomePullDestination";
import { trackDataPullComplete, trackDataPullError, trackDataPullStart } from "@/lib/analytics/trackDataPull";

function genRequestCardId() {
  return `kl-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function isAbortError(err) {
  return (
    (err instanceof DOMException && err.name === "AbortError") ||
    (err instanceof Error && err.name === "AbortError")
  );
}

/** Next `sheet-N` id that does not collide with keys in `sheets`. */
function allocateNextSheetId(sheets) {
  const keys = Object.keys(sheets || {});
  const nextNum =
    keys.reduce((max, k) => {
      const n = parseInt(String(k).replace(/\D/g, ""), 10) || 0;
      return Math.max(max, n);
    }, 0) + 1;
  return `sheet-${nextNum}`;
}

/**
 * Hidden bridge: runs Kalshi Live pulls when Connect home requests integration pull.
 */
export default function KalshiLive({ setConnectedData, connectHomePullBridge = false }) {
  const ctx = useMyStateV2() ?? {};
  const connectHomeActive =
    connectHomePullBridge && ctx.connectWorkspace === "kalshiLive";
  const connectIntegrationPullTick = ctx.connectIntegrationPullTick ?? 0;
  const lastTickRef = useRef(0);
  const abortRef = useRef(/** @type {AbortController | null} */ (null));
  const pullGenerationRef = useRef(0);
  const runPullRef = useRef(/** @type {() => Promise<void>} */ (async () => {}));

  const {
    connectKalshiLiveEndpointId,
    connectKalshiLiveColumnSelections,
    connectKalshiLiveLimit,
    connectKalshiLiveWhereFilters,
    connectKalshiLiveSortClauses,
    connectKalshiLiveTickers,
    connectKalshiLiveMarketsSheetMode,
    connectKalshiLiveMarketsDiscoveryMode,
    connectKalshiLiveMarketsDiscoveryStatus,
    connectKalshiLiveMarketsDiscoveryMveFilter,
    connectKalshiLiveMarketsDiscoveryEventTicker,
    connectKalshiLiveMarketsDiscoverySeriesTicker,
    connectKalshiLiveMarketsDiscoveryTickers,
    connectKalshiLiveMarketsDiscoveryMinCreatedTs,
    connectKalshiLiveMarketsDiscoveryMaxCreatedTs,
    connectKalshiLiveMarketsDiscoveryMinUpdatedTs,
    connectKalshiLiveMarketsDiscoveryMinCloseTs,
    connectKalshiLiveMarketsDiscoveryMaxCloseTs,
    connectKalshiLiveMarketsDiscoveryMinSettledTs,
    connectKalshiLiveMarketsDiscoveryMaxSettledTs,
    connectKalshiLiveEventsTickers,
    connectKalshiLiveEventsSheetMode,
    connectKalshiLiveEventsIncludeMarkets,
    connectKalshiLiveEventsRowMode,
    connectKalshiLiveEventsDiscoveryMode,
    connectKalshiLiveEventsDiscoveryStatus,
    connectKalshiLiveEventsDiscoverySeriesTicker,
    connectKalshiLiveEventsDiscoveryTickers,
    connectKalshiLiveEventsDiscoveryMinCloseTs,
    connectKalshiLiveEventsDiscoveryMinUpdatedTs,
    connectKalshiLiveMultivariateEventsSeriesTicker,
    connectKalshiLiveMultivariateEventsCollectionTicker,
    connectKalshiLiveMultivariateEventsIncludeMarkets,
    connectKalshiLiveMultivariateEventsRowMode,
    connectKalshiLiveCandlestickTickers,
    connectKalshiLiveEventCandlesticksEventTicker,
    connectKalshiLiveEventCandlesticksSeriesTicker,
    connectKalshiLiveEventForecastEventTicker,
    connectKalshiLiveEventForecastSeriesTicker,
    connectKalshiLiveEventForecastPercentilePcts,
    connectKalshiLiveLeaderboardMetricName,
    connectKalshiLiveLeaderboardTimePeriod,
    connectKalshiLiveLeaderboardCategory,
    connectKalshiLiveLeaderboardCategoryOther,
    connectKalshiLiveHolderProfileNickname,
    connectKalshiLiveHolderTradesNickname,
    connectKalshiLiveHolderTradesSeriesTicker,
    connectKalshiLiveHolderTradesEventTicker,
    connectKalshiLiveHolderTradesMinAmount,
    connectKalshiLiveSearchTradersQuery,
    connectKalshiLiveSearchTradersSelectedNickname,
    connectKalshiLiveSearchTradersIncludeMetrics,
    connectKalshiLiveSearchTradersIncludeHoldings,
    connectKalshiLiveTradesTicker,
    connectKalshiLiveOrderbookTicker,
    connectKalshiLiveSeriesTicker,
    connectKalshiLiveSeriesSheetMode,
    connectKalshiLiveSeriesDiscoveryMode,
    connectKalshiLiveSeriesDiscoveryCategory,
    connectKalshiLiveSeriesDiscoveryTag,
    connectKalshiLiveSeriesDiscoveryIncludeProductMetadata,
    connectKalshiLiveSeriesDiscoveryMinUpdatedTs,
    setConnectDataLakePullState,
    setDataSheets,
    activeSheetId,
    setConnectedData: setConnectedFromCtx,
  } = ctx;

  const setRows = setConnectedData || setConnectedFromCtx;

  const runMarketsPull = useCallback(
    async (ac, sheetId, cols) => {
      const discoveryMode = !!connectKalshiLiveMarketsDiscoveryMode;
      const requestStartMs =
        typeof performance !== "undefined" && performance?.now ? performance.now() : Date.now();

      setConnectDataLakePullState?.((prev) => ({
        ...prev,
        loading: true,
        label: discoveryMode
          ? "Discovering Kalshi Live markets…"
          : "Fetching Kalshi Live markets…",
        progress: 8,
        error: null,
      }));

      if (discoveryMode) {
        const discoveryParams = {
          status: connectKalshiLiveMarketsDiscoveryStatus,
          mveFilter: connectKalshiLiveMarketsDiscoveryMveFilter || KALSHI_LIVE_MVE_FILTER_EXCLUDE,
          eventTicker: connectKalshiLiveMarketsDiscoveryEventTicker,
          seriesTicker: connectKalshiLiveMarketsDiscoverySeriesTicker,
          tickers: connectKalshiLiveMarketsDiscoveryTickers,
          minCreatedTs: connectKalshiLiveMarketsDiscoveryMinCreatedTs,
          maxCreatedTs: connectKalshiLiveMarketsDiscoveryMaxCreatedTs,
          minUpdatedTs: connectKalshiLiveMarketsDiscoveryMinUpdatedTs,
          minCloseTs: connectKalshiLiveMarketsDiscoveryMinCloseTs,
          maxCloseTs: connectKalshiLiveMarketsDiscoveryMaxCloseTs,
          minSettledTs: connectKalshiLiveMarketsDiscoveryMinSettledTs,
          maxSettledTs: connectKalshiLiveMarketsDiscoveryMaxSettledTs,
        };

        const { raw, rows: accumulated, querySummary } = await fetchKalshiLiveMarketsDiscoveryPull({
          params: discoveryParams,
          selectedColumns: cols,
          signal: ac.signal,
          onPage: ({ page, totalLoaded }) => {
            const pct = Math.min(92, 8 + page * 6);
            setConnectDataLakePullState?.((prev) => ({
              ...prev,
              loading: true,
              label: `Loaded ${totalLoaded} markets (page ${page})…`,
              progress: pct,
              error: null,
            }));
          },
        });

        if (setRows) setRows(accumulated);

        await ingestKalshiLiveAsView({
          endpointId: "markets",
          markets: raw,
          selectedColumns: cols,
        });

        const elapsedMs =
          (typeof performance !== "undefined" && performance?.now
            ? performance.now()
            : Date.now()) - requestStartMs;

        const requestCard = {
          id: genRequestCardId(),
          createdAt: Date.now(),
          elapsedMs,
          lake: "kalshi-live",
          table: "markets",
          sheetId: sheetId || null,
          querySummary,
          loadedRowCount: accumulated.length,
        };

        if (sheetId && setDataSheets) {
          setDataSheets((prev) =>
            applyAthenaPullToSheetPatch(prev, sheetId, accumulated, {
              provenance: {
                source: "kalshi-live",
                endpoint: "markets",
                discovery: true,
                ...discoveryParams,
                querySummary,
              },
              requestCards: [requestCard],
            }),
          );
        }

        applyConnectHomePullData(ctx, accumulated);
        if (ctx?.requestConnectAnalyzeScroll) ctx.requestConnectAnalyzeScroll();
        return accumulated.length;
      }

      const whereFilters = Array.isArray(connectKalshiLiveWhereFilters)
        ? connectKalshiLiveWhereFilters
        : [];
      const sortClauses = Array.isArray(connectKalshiLiveSortClauses)
        ? connectKalshiLiveSortClauses
        : [];
      const marketTickers = String(connectKalshiLiveTickers || "").trim();
      const sheetMode = normalizeKalshiLiveMarketsSheetMode(connectKalshiLiveMarketsSheetMode);

      const {
        byTicker,
        raw,
        rows: accumulated,
        querySummary,
      } = await fetchKalshiLiveMarketsTickerPull({
        marketTickers,
        selectedColumns: cols,
        whereFilters,
        sortClauses,
        sheetMode,
        signal: ac.signal,
        onTickerProgress: ({ ticker, index, total }) => {
          const pct = Math.min(90, 8 + Math.round(((index + 1) / Math.max(1, total)) * 80));
          setConnectDataLakePullState?.((prev) => ({
            ...prev,
            loading: true,
            label: `Fetching ${ticker} (${index + 1}/${total})…`,
            progress: pct,
            error: null,
          }));
        },
      });

      if (setRows) setRows(accumulated);

      await ingestKalshiLiveAsView({
        endpointId: "markets",
        markets: raw,
        selectedColumns: cols,
      });

      const elapsedMs =
        (typeof performance !== "undefined" && performance?.now
          ? performance.now()
          : Date.now()) - requestStartMs;

      const useSeparateSheets =
        sheetMode !== KALSHI_LIVE_MARKETS_SHEET_MODE_COMBINED && byTicker.length > 1;

      if (useSeparateSheets && setDataSheets) {
        let firstSheetId = sheetId || ctx?.activeSheetId || null;
        const totalRows = byTicker.reduce(
          (sum, g) => sum + (Array.isArray(g.rows) ? g.rows.length : 0),
          0,
        );

        flushSync(() => {
          setDataSheets((prev) => {
            let next = { ...(prev || {}) };
            /** @type {string[]} */
            const writtenIds = [];

            for (let i = 0; i < byTicker.length; i++) {
              const group = byTicker[i];
              const tickerName = String(group.ticker || `market-${i + 1}`).trim().slice(0, 80);
              const rows = Array.isArray(group.rows) ? group.rows : [];

              let targetSheetId;
              if (i === 0 && firstSheetId) {
                targetSheetId = firstSheetId;
              } else {
                targetSheetId = allocateNextSheetId(next);
              }
              writtenIds.push(targetSheetId);

              const requestCard = {
                id: genRequestCardId(),
                createdAt: Date.now(),
                elapsedMs,
                lake: "kalshi-live",
                table: "markets",
                sheetId: targetSheetId,
                querySummary,
                loadedRowCount: rows.length,
              };

              next = applyAthenaPullToSheetPatch(next, targetSheetId, rows, {
                name: tickerName,
                provenance: {
                  source: "kalshi-live",
                  endpoint: "markets",
                  marketTicker: tickerName,
                  sheetMode,
                  querySummary,
                },
                requestCards: [requestCard],
              });
            }

            firstSheetId = writtenIds[0] || firstSheetId;
            return next;
          });

          if (firstSheetId && ctx?.setActiveSheetId) {
            ctx.setActiveSheetId(firstSheetId);
          }
          const firstRows = Array.isArray(byTicker[0]?.rows) ? byTicker[0].rows : [];
          if (setRows) setRows(firstRows);
          ctx?.setConnectHomeAnalyzeActive?.(true);
        });

        if (ctx?.requestConnectAnalyzeScroll) {
          ctx.requestConnectAnalyzeScroll();
        }

        return totalRows;
      }

      const requestCard = {
        id: genRequestCardId(),
        createdAt: Date.now(),
        elapsedMs,
        lake: "kalshi-live",
        table: "markets",
        sheetId: sheetId || null,
        querySummary,
        loadedRowCount: accumulated.length,
      };

      if (sheetId && setDataSheets) {
        setDataSheets((prev) =>
          applyAthenaPullToSheetPatch(prev, sheetId, accumulated, {
            provenance: {
              source: "kalshi-live",
              endpoint: "markets",
              whereFilters,
              sortClauses,
              sheetMode,
              querySummary,
            },
            requestCards: [requestCard],
          }),
        );
      }

      applyConnectHomePullData(ctx, accumulated);
      if (ctx?.requestConnectAnalyzeScroll) ctx.requestConnectAnalyzeScroll();
      return accumulated.length;
    },
    [
      connectKalshiLiveWhereFilters,
      connectKalshiLiveSortClauses,
      connectKalshiLiveTickers,
      connectKalshiLiveMarketsSheetMode,
      connectKalshiLiveMarketsDiscoveryMode,
      connectKalshiLiveMarketsDiscoveryStatus,
      connectKalshiLiveMarketsDiscoveryMveFilter,
      connectKalshiLiveMarketsDiscoveryEventTicker,
      connectKalshiLiveMarketsDiscoverySeriesTicker,
      connectKalshiLiveMarketsDiscoveryTickers,
      connectKalshiLiveMarketsDiscoveryMinCreatedTs,
      connectKalshiLiveMarketsDiscoveryMaxCreatedTs,
      connectKalshiLiveMarketsDiscoveryMinUpdatedTs,
      connectKalshiLiveMarketsDiscoveryMinCloseTs,
      connectKalshiLiveMarketsDiscoveryMaxCloseTs,
      connectKalshiLiveMarketsDiscoveryMinSettledTs,
      connectKalshiLiveMarketsDiscoveryMaxSettledTs,
      setConnectDataLakePullState,
      setDataSheets,
      setRows,
      ctx,
    ],
  );

  const runEventsPull = useCallback(
    async (ac, sheetId, cols) => {
      const discoveryMode = !!connectKalshiLiveEventsDiscoveryMode;
      const includeMarkets = !!connectKalshiLiveEventsIncludeMarkets;
      const rowMode = normalizeKalshiLiveEventsRowMode(connectKalshiLiveEventsRowMode);
      const requestStartMs =
        typeof performance !== "undefined" && performance?.now ? performance.now() : Date.now();

      setConnectDataLakePullState?.((prev) => ({
        ...prev,
        loading: true,
        label: discoveryMode
          ? "Discovering Kalshi Live events…"
          : "Fetching Kalshi Live events…",
        progress: 8,
        error: null,
      }));

      if (discoveryMode) {
        const discoveryParams = {
          status: connectKalshiLiveEventsDiscoveryStatus,
          seriesTicker: connectKalshiLiveEventsDiscoverySeriesTicker,
          tickers: connectKalshiLiveEventsDiscoveryTickers,
          minCloseTs: connectKalshiLiveEventsDiscoveryMinCloseTs,
          minUpdatedTs: connectKalshiLiveEventsDiscoveryMinUpdatedTs,
        };

        const { raw, rows: accumulated, querySummary } = await fetchKalshiLiveEventsDiscoveryPull({
          params: discoveryParams,
          selectedColumns: cols,
          includeMarkets,
          rowMode,
          signal: ac.signal,
          onPage: ({ page, totalLoaded }) => {
            const pct = Math.min(92, 8 + page * 6);
            setConnectDataLakePullState?.((prev) => ({
              ...prev,
              loading: true,
              label: `Loaded ${totalLoaded} event rows (page ${page})…`,
              progress: pct,
              error: null,
            }));
          },
        });

        if (setRows) setRows(accumulated);

        await ingestKalshiLiveAsView({
          endpointId: "events",
          events: raw,
          selectedColumns: cols,
          includeMarkets,
          rowMode,
        });

        const elapsedMs =
          (typeof performance !== "undefined" && performance?.now
            ? performance.now()
            : Date.now()) - requestStartMs;

        const requestCard = {
          id: genRequestCardId(),
          createdAt: Date.now(),
          elapsedMs,
          lake: "kalshi-live",
          table: "events",
          sheetId: sheetId || null,
          querySummary,
          loadedRowCount: accumulated.length,
        };

        if (sheetId && setDataSheets) {
          setDataSheets((prev) =>
            applyAthenaPullToSheetPatch(prev, sheetId, accumulated, {
              provenance: {
                source: "kalshi-live",
                endpoint: "events",
                discovery: true,
                includeMarkets,
                rowMode,
                ...discoveryParams,
                querySummary,
              },
              requestCards: [requestCard],
            }),
          );
        }

        applyConnectHomePullData(ctx, accumulated);
        if (ctx?.requestConnectAnalyzeScroll) ctx.requestConnectAnalyzeScroll();
        return accumulated.length;
      }

      const eventTickers = String(connectKalshiLiveEventsTickers || "").trim();
      const sheetMode = normalizeKalshiLiveEventsSheetMode(connectKalshiLiveEventsSheetMode);

      const {
        byTicker,
        raw,
        rows: accumulated,
        querySummary,
      } = await fetchKalshiLiveEventsTickerPull({
        eventTickers,
        selectedColumns: cols,
        includeMarkets,
        rowMode,
        sheetMode,
        signal: ac.signal,
        onTickerProgress: ({ ticker, index, total }) => {
          const pct = Math.min(90, 8 + Math.round(((index + 1) / Math.max(1, total)) * 80));
          setConnectDataLakePullState?.((prev) => ({
            ...prev,
            loading: true,
            label: `Fetching ${ticker} (${index + 1}/${total})…`,
            progress: pct,
            error: null,
          }));
        },
      });

      if (setRows) setRows(accumulated);

      await ingestKalshiLiveAsView({
        endpointId: "events",
        events: raw,
        selectedColumns: cols,
        includeMarkets,
        rowMode,
      });

      const elapsedMs =
        (typeof performance !== "undefined" && performance?.now
          ? performance.now()
          : Date.now()) - requestStartMs;

      const useSeparateSheets =
        sheetMode !== KALSHI_LIVE_EVENTS_SHEET_MODE_COMBINED && byTicker.length > 1;

      if (useSeparateSheets && setDataSheets) {
        let firstSheetId = sheetId || ctx?.activeSheetId || null;
        const totalRows = byTicker.reduce(
          (sum, g) => sum + (Array.isArray(g.rows) ? g.rows.length : 0),
          0,
        );

        flushSync(() => {
          setDataSheets((prev) => {
            let next = { ...(prev || {}) };
            /** @type {string[]} */
            const writtenIds = [];

            for (let i = 0; i < byTicker.length; i++) {
              const group = byTicker[i];
              const tickerName = String(group.ticker || `event-${i + 1}`).trim().slice(0, 80);
              const rows = Array.isArray(group.rows) ? group.rows : [];

              let targetSheetId;
              if (i === 0 && firstSheetId) {
                targetSheetId = firstSheetId;
              } else {
                targetSheetId = allocateNextSheetId(next);
              }
              writtenIds.push(targetSheetId);

              const requestCard = {
                id: genRequestCardId(),
                createdAt: Date.now(),
                elapsedMs,
                lake: "kalshi-live",
                table: "events",
                sheetId: targetSheetId,
                querySummary,
                loadedRowCount: rows.length,
              };

              next = applyAthenaPullToSheetPatch(next, targetSheetId, rows, {
                name: tickerName,
                provenance: {
                  source: "kalshi-live",
                  endpoint: "events",
                  eventTicker: tickerName,
                  sheetMode,
                  includeMarkets,
                  rowMode,
                  querySummary,
                },
                requestCards: [requestCard],
              });
            }

            firstSheetId = writtenIds[0] || firstSheetId;
            return next;
          });

          if (firstSheetId && ctx?.setActiveSheetId) {
            ctx.setActiveSheetId(firstSheetId);
          }
          const firstRows = Array.isArray(byTicker[0]?.rows) ? byTicker[0].rows : [];
          if (setRows) setRows(firstRows);
          ctx?.setConnectHomeAnalyzeActive?.(true);
        });

        if (ctx?.requestConnectAnalyzeScroll) {
          ctx.requestConnectAnalyzeScroll();
        }

        return totalRows;
      }

      const requestCard = {
        id: genRequestCardId(),
        createdAt: Date.now(),
        elapsedMs,
        lake: "kalshi-live",
        table: "events",
        sheetId: sheetId || null,
        querySummary,
        loadedRowCount: accumulated.length,
      };

      if (sheetId && setDataSheets) {
        setDataSheets((prev) =>
          applyAthenaPullToSheetPatch(prev, sheetId, accumulated, {
            provenance: {
              source: "kalshi-live",
              endpoint: "events",
              sheetMode,
              includeMarkets,
              rowMode,
              querySummary,
            },
            requestCards: [requestCard],
          }),
        );
      }

      applyConnectHomePullData(ctx, accumulated);
      if (ctx?.requestConnectAnalyzeScroll) ctx.requestConnectAnalyzeScroll();
      return accumulated.length;
    },
    [
      connectKalshiLiveEventsTickers,
      connectKalshiLiveEventsSheetMode,
      connectKalshiLiveEventsIncludeMarkets,
      connectKalshiLiveEventsRowMode,
      connectKalshiLiveEventsDiscoveryMode,
      connectKalshiLiveEventsDiscoveryStatus,
      connectKalshiLiveEventsDiscoverySeriesTicker,
      connectKalshiLiveEventsDiscoveryTickers,
      connectKalshiLiveEventsDiscoveryMinCloseTs,
      connectKalshiLiveEventsDiscoveryMinUpdatedTs,
      setConnectDataLakePullState,
      setDataSheets,
      setRows,
      ctx,
    ],
  );

  const runMultivariateEventsPull = useCallback(
    async (ac, sheetId, cols) => {
      const includeMarkets = !!connectKalshiLiveMultivariateEventsIncludeMarkets;
      const rowMode = normalizeKalshiLiveEventsRowMode(
        connectKalshiLiveMultivariateEventsRowMode,
      );
      const requestStartMs =
        typeof performance !== "undefined" && performance?.now ? performance.now() : Date.now();

      const discoveryParams = {
        seriesTicker: connectKalshiLiveMultivariateEventsSeriesTicker,
        collectionTicker: connectKalshiLiveMultivariateEventsCollectionTicker,
      };

      setConnectDataLakePullState?.((prev) => ({
        ...prev,
        loading: true,
        label: "Discovering Kalshi Live multivariate events…",
        progress: 8,
        error: null,
      }));

      const { raw, rows: accumulated, querySummary } = await fetchKalshiLiveMultivariateEventsPull({
        params: discoveryParams,
        selectedColumns: cols,
        includeMarkets,
        rowMode,
        pageLimit: connectKalshiLiveLimit,
        signal: ac.signal,
        onPage: ({ page, totalLoaded }) => {
          const pct = Math.min(92, 8 + page * 6);
          setConnectDataLakePullState?.((prev) => ({
            ...prev,
            loading: true,
            label: `Loaded ${totalLoaded} multivariate event rows (page ${page})…`,
            progress: pct,
            error: null,
          }));
        },
      });

      if (setRows) setRows(accumulated);

      await ingestKalshiLiveAsView({
        endpointId: "multivariate_events",
        events: raw,
        selectedColumns: cols,
        includeMarkets,
        rowMode,
      });

      const elapsedMs =
        (typeof performance !== "undefined" && performance?.now
          ? performance.now()
          : Date.now()) - requestStartMs;

      const requestCard = {
        id: genRequestCardId(),
        createdAt: Date.now(),
        elapsedMs,
        lake: "kalshi-live",
        table: "multivariate_events",
        sheetId: sheetId || null,
        querySummary,
        loadedRowCount: accumulated.length,
      };

      if (sheetId && setDataSheets) {
        setDataSheets((prev) =>
          applyAthenaPullToSheetPatch(prev, sheetId, accumulated, {
            provenance: {
              source: "kalshi-live",
              endpoint: "multivariate_events",
              discovery: true,
              includeMarkets,
              rowMode,
              ...discoveryParams,
              querySummary,
            },
            requestCards: [requestCard],
          }),
        );
      }

      applyConnectHomePullData(ctx, accumulated);
      if (ctx?.requestConnectAnalyzeScroll) ctx.requestConnectAnalyzeScroll();
      return accumulated.length;
    },
    [
      connectKalshiLiveMultivariateEventsSeriesTicker,
      connectKalshiLiveMultivariateEventsCollectionTicker,
      connectKalshiLiveMultivariateEventsIncludeMarkets,
      connectKalshiLiveMultivariateEventsRowMode,
      connectKalshiLiveLimit,
      setConnectDataLakePullState,
      setDataSheets,
      setRows,
      ctx,
    ],
  );

  const runSeriesPull = useCallback(
    async (ac, sheetId, cols) => {
      const discoveryMode = !!connectKalshiLiveSeriesDiscoveryMode;
      const requestStartMs =
        typeof performance !== "undefined" && performance?.now ? performance.now() : Date.now();

      setConnectDataLakePullState?.((prev) => ({
        ...prev,
        loading: true,
        label: discoveryMode
          ? "Discovering Kalshi Live series…"
          : "Fetching Kalshi Live series…",
        progress: 8,
        error: null,
      }));

      if (discoveryMode) {
        const { raw, rows: accumulated, querySummary, includeVolume, includeProductMetadata } =
          await fetchKalshiLiveSeriesDiscoveryPull({
            category: connectKalshiLiveSeriesDiscoveryCategory,
            tag: connectKalshiLiveSeriesDiscoveryTag,
            includeProductMetadata: !!connectKalshiLiveSeriesDiscoveryIncludeProductMetadata,
            minUpdatedTs: connectKalshiLiveSeriesDiscoveryMinUpdatedTs,
            selectedColumns: cols,
            signal: ac.signal,
          });

        if (setRows) setRows(accumulated);

        await ingestKalshiLiveAsView({
          endpointId: "series",
          series: raw,
          selectedColumns: cols,
        });

        const elapsedMs =
          (typeof performance !== "undefined" && performance?.now
            ? performance.now()
            : Date.now()) - requestStartMs;

        const requestCard = {
          id: genRequestCardId(),
          createdAt: Date.now(),
          elapsedMs,
          lake: "kalshi-live",
          table: "series",
          sheetId: sheetId || null,
          querySummary,
          loadedRowCount: accumulated.length,
        };

        if (sheetId && setDataSheets) {
          setDataSheets((prev) =>
            applyAthenaPullToSheetPatch(prev, sheetId, accumulated, {
              provenance: {
                source: "kalshi-live",
                endpoint: "series",
                discovery: true,
                category: connectKalshiLiveSeriesDiscoveryCategory,
                tag: connectKalshiLiveSeriesDiscoveryTag,
                includeVolume,
                includeProductMetadata,
                minUpdatedTs: connectKalshiLiveSeriesDiscoveryMinUpdatedTs,
                querySummary,
              },
              requestCards: [requestCard],
            }),
          );
        }

        applyConnectHomePullData(ctx, accumulated);
        if (ctx?.requestConnectAnalyzeScroll) ctx.requestConnectAnalyzeScroll();
        return accumulated.length;
      }

      const seriesTickers = String(connectKalshiLiveSeriesTicker || "").trim();
      const sheetMode = normalizeKalshiLiveSeriesSheetMode(connectKalshiLiveSeriesSheetMode);

      const {
        byTicker,
        raw,
        rows: accumulated,
        querySummary,
        includeVolume,
      } = await fetchKalshiLiveSeriesPull({
        seriesTickers,
        selectedColumns: cols,
        sheetMode,
        signal: ac.signal,
        onTickerProgress: ({ ticker, index, total }) => {
          const pct = Math.min(90, 8 + Math.round(((index + 1) / Math.max(1, total)) * 80));
          setConnectDataLakePullState?.((prev) => ({
            ...prev,
            loading: true,
            label: `Fetching ${ticker} (${index + 1}/${total})…`,
            progress: pct,
            error: null,
          }));
        },
      });

      if (setRows) setRows(accumulated);

      await ingestKalshiLiveAsView({
        endpointId: "series",
        series: raw,
        selectedColumns: cols,
      });

      const elapsedMs =
        (typeof performance !== "undefined" && performance?.now
          ? performance.now()
          : Date.now()) - requestStartMs;

      const useSeparateSheets =
        sheetMode !== KALSHI_LIVE_SERIES_SHEET_MODE_COMBINED && byTicker.length > 1;

      if (useSeparateSheets && setDataSheets) {
        let firstSheetId = sheetId || ctx?.activeSheetId || null;
        const totalRows = byTicker.reduce(
          (sum, g) => sum + (Array.isArray(g.rows) ? g.rows.length : 0),
          0,
        );

        flushSync(() => {
          setDataSheets((prev) => {
            let next = { ...(prev || {}) };
            /** @type {string[]} */
            const writtenIds = [];

            for (let i = 0; i < byTicker.length; i++) {
              const group = byTicker[i];
              const tickerName = String(group.ticker || `series-${i + 1}`).trim().slice(0, 80);
              const rows = Array.isArray(group.rows) ? group.rows : [];

              let targetSheetId;
              if (i === 0 && firstSheetId) {
                targetSheetId = firstSheetId;
              } else {
                targetSheetId = allocateNextSheetId(next);
              }
              writtenIds.push(targetSheetId);

              const requestCard = {
                id: genRequestCardId(),
                createdAt: Date.now(),
                elapsedMs,
                lake: "kalshi-live",
                table: "series",
                sheetId: targetSheetId,
                querySummary,
                loadedRowCount: rows.length,
              };

              next = applyAthenaPullToSheetPatch(next, targetSheetId, rows, {
                name: tickerName,
                provenance: {
                  source: "kalshi-live",
                  endpoint: "series",
                  seriesTicker: tickerName,
                  includeVolume,
                  sheetMode,
                  querySummary,
                },
                requestCards: [requestCard],
              });
            }

            firstSheetId = writtenIds[0] || firstSheetId;
            return next;
          });

          if (firstSheetId && ctx?.setActiveSheetId) {
            ctx.setActiveSheetId(firstSheetId);
          }
          const firstRows = Array.isArray(byTicker[0]?.rows) ? byTicker[0].rows : [];
          if (setRows) setRows(firstRows);
          ctx?.setConnectHomeAnalyzeActive?.(true);
        });

        if (ctx?.requestConnectAnalyzeScroll) {
          ctx.requestConnectAnalyzeScroll();
        }

        return totalRows;
      }

      const requestCard = {
        id: genRequestCardId(),
        createdAt: Date.now(),
        elapsedMs,
        lake: "kalshi-live",
        table: "series",
        sheetId: sheetId || null,
        querySummary,
        loadedRowCount: accumulated.length,
      };

      if (sheetId && setDataSheets) {
        setDataSheets((prev) =>
          applyAthenaPullToSheetPatch(prev, sheetId, accumulated, {
            provenance: {
              source: "kalshi-live",
              endpoint: "series",
              seriesTickers,
              includeVolume,
              sheetMode,
              querySummary,
            },
            requestCards: [requestCard],
          }),
        );
      }

      applyConnectHomePullData(ctx, accumulated);
      return accumulated.length;
    },
    [
      connectKalshiLiveSeriesTicker,
      connectKalshiLiveSeriesSheetMode,
      connectKalshiLiveSeriesDiscoveryMode,
      connectKalshiLiveSeriesDiscoveryCategory,
      connectKalshiLiveSeriesDiscoveryTag,
      connectKalshiLiveSeriesDiscoveryIncludeProductMetadata,
      connectKalshiLiveSeriesDiscoveryMinUpdatedTs,
      setConnectDataLakePullState,
      setDataSheets,
      setRows,
      ctx,
    ],
  );

  const runCandlesticksPull = useCallback(
    async (ac, sheetId, cols) => {
      const whereFilters = Array.isArray(connectKalshiLiveWhereFilters)
        ? connectKalshiLiveWhereFilters
        : [];
      const sortClauses = Array.isArray(connectKalshiLiveSortClauses)
        ? connectKalshiLiveSortClauses
        : [];
      const limit = Number(connectKalshiLiveLimit) || 1000;
      const marketTickers = String(connectKalshiLiveCandlestickTickers || "").trim();
      const requestStartMs =
        typeof performance !== "undefined" && performance?.now ? performance.now() : Date.now();

      setConnectDataLakePullState?.((prev) => ({
        ...prev,
        loading: true,
        label: "Fetching Kalshi Live candlesticks…",
        progress: 8,
        error: null,
      }));

      const { byTicker, raw, rows: accumulated, querySummary } =
        await fetchKalshiLiveCandlesticksPull({
          marketTickers,
          whereFilters,
          sortClauses,
          limit,
          selectedColumns: cols,
          signal: ac.signal,
          onTickerProgress: ({ ticker, index, total }) => {
            const pct = Math.min(90, 8 + Math.round(((index + 1) / Math.max(1, total)) * 80));
            setConnectDataLakePullState?.((prev) => ({
              ...prev,
              loading: true,
              label: `Fetching ${ticker} (${index + 1}/${total})…`,
              progress: pct,
              error: null,
            }));
          },
        });

      if (setRows) setRows(accumulated);

      await ingestKalshiLiveAsView({
        endpointId: "candlesticks",
        candlesticks: raw,
        selectedColumns: cols,
      });

      const elapsedMs =
        (typeof performance !== "undefined" && performance?.now
          ? performance.now()
          : Date.now()) - requestStartMs;

      const groups =
        Array.isArray(byTicker) && byTicker.length
          ? byTicker
          : [{ ticker: marketTickers || "candlesticks", raw, rows: accumulated }];

      // One atomic setDataSheets write for every ticker. Creating empty sheets then
      // patching in a loop races React state updates and leaves ~half the sheets empty.
      let firstSheetId = sheetId || ctx?.activeSheetId || null;
      const totalRows = groups.reduce(
        (sum, g) => sum + (Array.isArray(g.rows) ? g.rows.length : 0),
        0,
      );

      if (setDataSheets) {
        flushSync(() => {
          setDataSheets((prev) => {
            let next = { ...(prev || {}) };
            /** @type {string[]} */
            const writtenIds = [];

            for (let i = 0; i < groups.length; i++) {
              const group = groups[i];
              const tickerName = String(group.ticker || `market-${i + 1}`).trim().slice(0, 80);
              const rows = Array.isArray(group.rows) ? group.rows : [];

              let targetSheetId;
              if (i === 0 && firstSheetId) {
                targetSheetId = firstSheetId;
              } else {
                targetSheetId = allocateNextSheetId(next);
              }
              writtenIds.push(targetSheetId);

              const requestCard = {
                id: genRequestCardId(),
                createdAt: Date.now(),
                elapsedMs,
                lake: "kalshi-live",
                table: "candlesticks",
                sheetId: targetSheetId,
                querySummary,
                loadedRowCount: rows.length,
              };

              next = applyAthenaPullToSheetPatch(next, targetSheetId, rows, {
                name: tickerName,
                provenance: {
                  source: "kalshi-live",
                  endpoint: "candlesticks",
                  marketTickers: tickerName,
                  whereFilters,
                  sortClauses,
                  limit,
                  querySummary,
                },
                requestCards: [requestCard],
              });
            }

            firstSheetId = writtenIds[0] || firstSheetId;
            return next;
          });

          if (firstSheetId && ctx?.setActiveSheetId) {
            ctx.setActiveSheetId(firstSheetId);
          }
          ctx?.setConnectHomeAnalyzeActive?.(true);
        });
      } else {
        applyConnectHomePullData(ctx, accumulated);
      }

      if (ctx?.requestConnectAnalyzeScroll) {
        ctx.requestConnectAnalyzeScroll();
      }

      return totalRows;
    },
    [
      connectKalshiLiveWhereFilters,
      connectKalshiLiveSortClauses,
      connectKalshiLiveLimit,
      connectKalshiLiveCandlestickTickers,
      setConnectDataLakePullState,
      setDataSheets,
      setRows,
      ctx,
    ],
  );

  const runEventCandlesticksPull = useCallback(
    async (ac, sheetId, cols) => {
      const whereFilters = Array.isArray(connectKalshiLiveWhereFilters)
        ? connectKalshiLiveWhereFilters
        : [];
      const eventTicker = String(connectKalshiLiveEventCandlesticksEventTicker || "").trim();
      const seriesTicker = String(connectKalshiLiveEventCandlesticksSeriesTicker || "").trim();
      const requestStartMs =
        typeof performance !== "undefined" && performance?.now ? performance.now() : Date.now();

      setConnectDataLakePullState?.((prev) => ({
        ...prev,
        loading: true,
        label: "Fetching Kalshi Live event candlesticks…",
        progress: 8,
        error: null,
      }));

      const { metaRows, byMarket, querySummary, eventMeta } = await fetchKalshiLiveEventCandlesticksPull({
        eventTicker,
        seriesTicker,
        whereFilters,
        selectedColumns: cols,
        signal: ac.signal,
        onProgress: ({ label, progress }) => {
          setConnectDataLakePullState?.((prev) => ({
            ...prev,
            loading: true,
            label,
            progress,
            error: null,
          }));
        },
      });

      const resolvedEventTitle =
        String(eventMeta?.title || "").trim() ||
        String(ctx?.connectKalshiLiveEventCandlesticksTickerMeta?.[eventTicker] || "").trim() ||
        eventTicker;
      const resolvedSeriesTicker =
        String(eventMeta?.seriesTicker || seriesTicker || "").trim();
      const resolvedSubTitle = String(eventMeta?.subTitle || "").trim();

      const elapsedMs =
        (typeof performance !== "undefined" && performance?.now
          ? performance.now()
          : Date.now()) - requestStartMs;

      // Sheet 1 = market metadata; sheets 2..N = one market's candlesticks each.
      const metaSheetName = `${eventTicker || "event"} · markets`.slice(0, 80);
      const groups = [
        { ticker: metaSheetName, rows: Array.isArray(metaRows) ? metaRows : [], isMeta: true },
        ...byMarket.map((m) => ({ ticker: m.ticker, rows: m.rows, isMeta: false })),
      ];

      let firstSheetId = sheetId || ctx?.activeSheetId || null;
      const totalRows = groups.reduce(
        (sum, g) => sum + (Array.isArray(g.rows) ? g.rows.length : 0),
        0,
      );

      if (setDataSheets) {
        flushSync(() => {
          setDataSheets((prev) => {
            let next = { ...(prev || {}) };
            /** @type {string[]} */
            const writtenIds = [];

            for (let i = 0; i < groups.length; i++) {
              const group = groups[i];
              const sheetName = String(group.ticker || `market-${i + 1}`).trim().slice(0, 80);
              const rows = Array.isArray(group.rows) ? group.rows : [];

              let targetSheetId;
              if (i === 0 && firstSheetId) {
                targetSheetId = firstSheetId;
              } else {
                targetSheetId = allocateNextSheetId(next);
              }
              writtenIds.push(targetSheetId);

              const requestCard = {
                id: genRequestCardId(),
                createdAt: Date.now(),
                elapsedMs,
                lake: "kalshi-live",
                table: "event_candlesticks",
                sheetId: targetSheetId,
                querySummary,
                loadedRowCount: rows.length,
              };

              next = applyAthenaPullToSheetPatch(next, targetSheetId, rows, {
                name: sheetName,
                provenance: {
                  source: "kalshi-live",
                  endpoint: "event_candlesticks",
                  eventTicker,
                  seriesTicker: resolvedSeriesTicker || seriesTicker,
                  eventTitle: resolvedEventTitle,
                  eventSubTitle: resolvedSubTitle || undefined,
                  sheetKind: group.isMeta ? "markets_metadata" : "market_candlesticks",
                  marketTicker: group.isMeta ? undefined : sheetName,
                  whereFilters,
                  querySummary,
                },
                requestCards: [requestCard],
              });
            }

            firstSheetId = writtenIds[0] || firstSheetId;
            return next;
          });

          if (firstSheetId && ctx?.setActiveSheetId) {
            ctx.setActiveSheetId(firstSheetId);
          }
          const firstRows = Array.isArray(groups[0]?.rows) ? groups[0].rows : [];
          if (setRows) setRows(firstRows);
          ctx?.setConnectHomeAnalyzeActive?.(true);
        });
      } else {
        applyConnectHomePullData(ctx, Array.isArray(metaRows) ? metaRows : []);
      }

      if (ctx?.requestConnectAnalyzeScroll) {
        ctx.requestConnectAnalyzeScroll();
      }

      return totalRows;
    },
    [
      connectKalshiLiveWhereFilters,
      connectKalshiLiveEventCandlesticksEventTicker,
      connectKalshiLiveEventCandlesticksSeriesTicker,
      setConnectDataLakePullState,
      setDataSheets,
      setRows,
      ctx,
    ],
  );

  const runEventForecastPull = useCallback(
    async (ac, sheetId, cols) => {
      const whereFilters = Array.isArray(connectKalshiLiveWhereFilters)
        ? connectKalshiLiveWhereFilters
        : [];
      const eventTicker = String(connectKalshiLiveEventForecastEventTicker || "").trim();
      const seriesTicker = String(connectKalshiLiveEventForecastSeriesTicker || "").trim();
      const percentilePcts = connectKalshiLiveEventForecastPercentilePcts;
      const requestStartMs =
        typeof performance !== "undefined" && performance?.now ? performance.now() : Date.now();

      setConnectDataLakePullState?.((prev) => ({
        ...prev,
        loading: true,
        label: "Fetching Kalshi Live event forecast…",
        progress: 8,
        error: null,
      }));

      const { raw, rows, querySummary, eventTicker: resolvedEvent, seriesTicker: resolvedSeries } =
        await fetchKalshiLiveEventForecastPull({
          eventTicker,
          seriesTicker,
          whereFilters,
          percentilePcts,
          selectedColumns: cols,
          signal: ac.signal,
          onProgress: ({ label, progress }) => {
            setConnectDataLakePullState?.((prev) => ({
              ...prev,
              loading: true,
              label,
              progress,
              error: null,
            }));
          },
        });

      if (setRows) setRows(rows);

      await ingestKalshiLiveAsView({
        endpointId: "event_forecast",
        forecastHistory: raw,
        selectedColumns: cols,
      });

      const elapsedMs =
        (typeof performance !== "undefined" && performance?.now
          ? performance.now()
          : Date.now()) - requestStartMs;

      const sheetName = `${resolvedEvent || eventTicker || "event"} · forecast`.slice(0, 80);
      const title =
        String(ctx?.connectKalshiLiveEventForecastTickerMeta?.[resolvedEvent] || "").trim() ||
        sheetName;

      let firstSheetId = sheetId || ctx?.activeSheetId || null;
      const totalRows = Array.isArray(rows) ? rows.length : 0;

      if (setDataSheets) {
        flushSync(() => {
          setDataSheets((prev) => {
            let next = { ...(prev || {}) };
            const targetSheetId = firstSheetId || allocateNextSheetId(next);
            firstSheetId = targetSheetId;

            const requestCard = {
              id: genRequestCardId(),
              createdAt: Date.now(),
              elapsedMs,
              lake: "kalshi-live",
              table: "event_forecast",
              sheetId: targetSheetId,
              querySummary,
              loadedRowCount: totalRows,
            };

            next = applyAthenaPullToSheetPatch(next, targetSheetId, rows, {
              name: sheetName,
              provenance: {
                source: "kalshi-live",
                endpoint: "event_forecast",
                eventTicker: resolvedEvent || eventTicker,
                seriesTicker: resolvedSeries || seriesTicker,
                eventTitle: title,
                whereFilters,
                percentilePcts,
                querySummary,
              },
              requestCards: [requestCard],
            });

            return next;
          });

          if (firstSheetId && ctx?.setActiveSheetId) {
            ctx.setActiveSheetId(firstSheetId);
          }
          ctx?.setConnectHomeAnalyzeActive?.(true);
        });
      } else {
        applyConnectHomePullData(ctx, rows);
      }

      if (ctx?.requestConnectAnalyzeScroll) {
        ctx.requestConnectAnalyzeScroll();
      }

      return totalRows;
    },
    [
      connectKalshiLiveWhereFilters,
      connectKalshiLiveEventForecastEventTicker,
      connectKalshiLiveEventForecastSeriesTicker,
      connectKalshiLiveEventForecastPercentilePcts,
      setConnectDataLakePullState,
      setDataSheets,
      setRows,
      ctx,
    ],
  );

  const runLeaderboardPull = useCallback(
    async (ac, sheetId, cols) => {
      const metricName = connectKalshiLiveLeaderboardMetricName;
      const timePeriod = connectKalshiLiveLeaderboardTimePeriod;
      const category = connectKalshiLiveLeaderboardCategory;
      const categoryOther = connectKalshiLiveLeaderboardCategoryOther;
      const limit = Number(connectKalshiLiveLimit) || 25;
      const requestStartMs =
        typeof performance !== "undefined" && performance?.now ? performance.now() : Date.now();

      setConnectDataLakePullState?.((prev) => ({
        ...prev,
        loading: true,
        label: "Fetching Kalshi Live leaderboard…",
        progress: 8,
        error: null,
      }));

      const { raw, rows, querySummary, metricName: resolvedMetric, timePeriod: resolvedPeriod, category: resolvedCategory, limit: resolvedLimit } =
        await fetchKalshiLiveLeaderboardPull({
          metricName,
          timePeriod,
          category,
          categoryOther,
          limit,
          selectedColumns: cols,
          signal: ac.signal,
          onProgress: ({ label, progress }) => {
            setConnectDataLakePullState?.((prev) => ({
              ...prev,
              loading: true,
              label,
              progress,
              error: null,
            }));
          },
        });

      if (setRows) setRows(rows);

      await ingestKalshiLiveAsView({
        endpointId: "leaderboard",
        rankList: raw,
        leaderboardContext: {
          metricName: resolvedMetric,
          timePeriod: resolvedPeriod,
          category: resolvedCategory,
        },
        selectedColumns: cols,
      });

      const elapsedMs =
        (typeof performance !== "undefined" && performance?.now
          ? performance.now()
          : Date.now()) - requestStartMs;

      const sheetName = `leaderboard · ${resolvedMetric}`.slice(0, 80);
      let firstSheetId = sheetId || ctx?.activeSheetId || null;
      const totalRows = Array.isArray(rows) ? rows.length : 0;

      if (setDataSheets) {
        flushSync(() => {
          setDataSheets((prev) => {
            let next = { ...(prev || {}) };
            const targetSheetId = firstSheetId || allocateNextSheetId(next);
            firstSheetId = targetSheetId;

            const requestCard = {
              id: genRequestCardId(),
              createdAt: Date.now(),
              elapsedMs,
              lake: "kalshi-live",
              table: "leaderboard",
              sheetId: targetSheetId,
              querySummary,
              loadedRowCount: totalRows,
            };

            next = applyAthenaPullToSheetPatch(next, targetSheetId, rows, {
              name: sheetName,
              provenance: {
                source: "kalshi-live",
                endpoint: "leaderboard",
                metricName: resolvedMetric,
                timePeriod: resolvedPeriod,
                category: resolvedCategory || undefined,
                limit: resolvedLimit,
                querySummary,
              },
              requestCards: [requestCard],
            });

            return next;
          });

          if (firstSheetId && ctx?.setActiveSheetId) {
            ctx.setActiveSheetId(firstSheetId);
          }
          ctx?.setConnectHomeAnalyzeActive?.(true);
        });
      } else {
        applyConnectHomePullData(ctx, rows);
      }

      if (ctx?.requestConnectAnalyzeScroll) {
        ctx.requestConnectAnalyzeScroll();
      }

      return totalRows;
    },
    [
    connectKalshiLiveLeaderboardMetricName,
    connectKalshiLiveLeaderboardTimePeriod,
    connectKalshiLiveLeaderboardCategory,
    connectKalshiLiveLeaderboardCategoryOther,
    connectKalshiLiveHolderProfileNickname,
    connectKalshiLiveLimit,
      setConnectDataLakePullState,
      setDataSheets,
      setRows,
      ctx,
    ],
  );

  const runHolderProfilePull = useCallback(
    async (ac, sheetId, cols) => {
      const nickname = connectKalshiLiveHolderProfileNickname;
      const requestStartMs =
        typeof performance !== "undefined" && performance?.now ? performance.now() : Date.now();

      setConnectDataLakePullState?.((prev) => ({
        ...prev,
        loading: true,
        label: "Fetching Kalshi Live trader profile…",
        progress: 8,
        error: null,
      }));

      const { raw, rows, querySummary, nickname: resolvedNickname } =
        await fetchKalshiLiveHolderProfilePull({
          nickname,
          selectedColumns: cols,
          signal: ac.signal,
          onProgress: ({ label, progress }) => {
            setConnectDataLakePullState?.((prev) => ({
              ...prev,
              loading: true,
              label,
              progress,
              error: null,
            }));
          },
        });

      if (setRows) setRows(rows);

      await ingestKalshiLiveAsView({
        endpointId: "holder_profile",
        holderProfile: raw,
        selectedColumns: cols,
      });

      const elapsedMs =
        (typeof performance !== "undefined" && performance?.now
          ? performance.now()
          : Date.now()) - requestStartMs;

      const sheetName = `trader profile · ${resolvedNickname}`.slice(0, 80);
      let firstSheetId = sheetId || ctx?.activeSheetId || null;
      const totalRows = Array.isArray(rows) ? rows.length : 0;

      if (setDataSheets) {
        flushSync(() => {
          setDataSheets((prev) => {
            let next = { ...(prev || {}) };
            const targetSheetId = firstSheetId || allocateNextSheetId(next);
            firstSheetId = targetSheetId;

            const requestCard = {
              id: genRequestCardId(),
              createdAt: Date.now(),
              elapsedMs,
              lake: "kalshi-live",
              table: "holder_profile",
              sheetId: targetSheetId,
              querySummary,
              loadedRowCount: totalRows,
            };

            next = applyAthenaPullToSheetPatch(next, targetSheetId, rows, {
              name: sheetName,
              provenance: {
                source: "kalshi-live",
                endpoint: "holder_profile",
                nickname: resolvedNickname,
                querySummary,
              },
              requestCards: [requestCard],
            });

            return next;
          });

          if (firstSheetId && ctx?.setActiveSheetId) {
            ctx.setActiveSheetId(firstSheetId);
          }
          ctx?.setConnectHomeAnalyzeActive?.(true);
        });
      } else {
        applyConnectHomePullData(ctx, rows);
      }

      if (ctx?.requestConnectAnalyzeScroll) {
        ctx.requestConnectAnalyzeScroll();
      }

      return totalRows;
    },
    [
      connectKalshiLiveHolderProfileNickname,
      setConnectDataLakePullState,
      setDataSheets,
      setRows,
      ctx,
    ],
  );

  const runHolderTradesPull = useCallback(
    async (ac, sheetId, cols) => {
      const nickname = connectKalshiLiveHolderTradesNickname;
      const seriesTicker = connectKalshiLiveHolderTradesSeriesTicker;
      const eventTicker = connectKalshiLiveHolderTradesEventTicker;
      const minAmount = connectKalshiLiveHolderTradesMinAmount;
      const limit = Number(connectKalshiLiveLimit) || 100;
      const whereFilters = Array.isArray(connectKalshiLiveWhereFilters)
        ? connectKalshiLiveWhereFilters
        : [];
      const sortClauses = Array.isArray(connectKalshiLiveSortClauses)
        ? connectKalshiLiveSortClauses
        : [];
      const requestStartMs =
        typeof performance !== "undefined" && performance?.now ? performance.now() : Date.now();

      setConnectDataLakePullState?.((prev) => ({
        ...prev,
        loading: true,
        label: "Fetching Kalshi Live trades by trader…",
        progress: 8,
        error: null,
      }));

      const {
        raw,
        rows,
        querySummary,
        nickname: resolvedNickname,
        seriesTicker: resolvedSeries,
        eventTicker: resolvedEvent,
        minAmount: resolvedMinAmount,
        limit: resolvedLimit,
      } = await fetchKalshiLiveHolderTradesPull({
        nickname,
        seriesTicker,
        eventTicker,
        minAmount,
        limit,
        whereFilters,
        sortClauses,
        selectedColumns: cols,
        signal: ac.signal,
        onProgress: ({ label, progress }) => {
          setConnectDataLakePullState?.((prev) => ({
            ...prev,
            loading: true,
            label,
            progress,
            error: null,
          }));
        },
      });

      if (setRows) setRows(rows);

      await ingestKalshiLiveAsView({
        endpointId: "trades_by_holder",
        holderTrades: raw,
        selectedColumns: cols,
      });

      const elapsedMs =
        (typeof performance !== "undefined" && performance?.now
          ? performance.now()
          : Date.now()) - requestStartMs;

      const sheetLabel =
        resolvedNickname ||
        resolvedSeries ||
        resolvedEvent ||
        (resolvedMinAmount != null ? `min ${resolvedMinAmount}` : "public");
      const sheetName = `trader trades · ${sheetLabel}`.slice(0, 80);
      let firstSheetId = sheetId || ctx?.activeSheetId || null;
      const totalRows = Array.isArray(rows) ? rows.length : 0;

      if (setDataSheets) {
        flushSync(() => {
          setDataSheets((prev) => {
            let next = { ...(prev || {}) };
            const targetSheetId = firstSheetId || allocateNextSheetId(next);
            firstSheetId = targetSheetId;

            const requestCard = {
              id: genRequestCardId(),
              createdAt: Date.now(),
              elapsedMs,
              lake: "kalshi-live",
              table: "trades_by_holder",
              sheetId: targetSheetId,
              querySummary,
              loadedRowCount: totalRows,
            };

            next = applyAthenaPullToSheetPatch(next, targetSheetId, rows, {
              name: sheetName,
              provenance: {
                source: "kalshi-live",
                endpoint: "trades_by_holder",
                nickname: resolvedNickname || undefined,
                seriesTicker: resolvedSeries || undefined,
                eventTicker: resolvedEvent || undefined,
                minAmount: resolvedMinAmount ?? undefined,
                limit: resolvedLimit,
                querySummary,
              },
              requestCards: [requestCard],
            });

            return next;
          });

          if (firstSheetId && ctx?.setActiveSheetId) {
            ctx.setActiveSheetId(firstSheetId);
          }
          ctx?.setConnectHomeAnalyzeActive?.(true);
        });
      } else {
        applyConnectHomePullData(ctx, rows);
      }

      if (ctx?.requestConnectAnalyzeScroll) {
        ctx.requestConnectAnalyzeScroll();
      }

      return totalRows;
    },
    [
      connectKalshiLiveHolderTradesNickname,
      connectKalshiLiveHolderTradesSeriesTicker,
      connectKalshiLiveHolderTradesEventTicker,
      connectKalshiLiveHolderTradesMinAmount,
      connectKalshiLiveLimit,
      connectKalshiLiveWhereFilters,
      connectKalshiLiveSortClauses,
      setConnectDataLakePullState,
      setDataSheets,
      setRows,
      ctx,
    ],
  );

  const runSearchTradersPull = useCallback(
    async (ac, sheetId, cols) => {
      const query = connectKalshiLiveSearchTradersQuery;
      const selectedNickname = connectKalshiLiveSearchTradersSelectedNickname;
      const includeMetrics = !!connectKalshiLiveSearchTradersIncludeMetrics;
      const includeHoldings = !!connectKalshiLiveSearchTradersIncludeHoldings;
      const limit = Number(connectKalshiLiveLimit) || 25;
      const whereFilters = Array.isArray(connectKalshiLiveWhereFilters)
        ? connectKalshiLiveWhereFilters
        : [];
      const sortClauses = Array.isArray(connectKalshiLiveSortClauses)
        ? connectKalshiLiveSortClauses
        : [];
      const requestStartMs =
        typeof performance !== "undefined" && performance?.now ? performance.now() : Date.now();

      setConnectDataLakePullState?.((prev) => ({
        ...prev,
        loading: true,
        label: "Searching Kalshi Live traders…",
        progress: 8,
        error: null,
      }));

      const {
        raw,
        rows,
        byNickname,
        querySummary,
        query: resolvedQuery,
        limit: resolvedLimit,
        includeMetrics: resolvedMetrics,
        includeHoldings: resolvedHoldings,
        profileCount,
        selectedNickname: resolvedSelected,
      } = await fetchKalshiLiveSearchTradersPull({
        query,
        selectedNickname,
        limit,
        includeMetrics,
        includeHoldings,
        whereFilters,
        sortClauses,
        selectedColumns: cols,
        signal: ac.signal,
        onProgress: ({ label, progress }) => {
          setConnectDataLakePullState?.((prev) => ({
            ...prev,
            loading: true,
            label,
            progress,
            error: null,
          }));
        },
      });

      if (setRows) setRows(rows);

      await ingestKalshiLiveAsView({
        endpointId: "search_traders",
        searchTraders: raw,
        searchTradersOpts: {
          includeMetrics: resolvedMetrics,
          includeHoldings: resolvedHoldings,
          closedPositions: true,
        },
        selectedColumns: cols,
      });

      const elapsedMs =
        (typeof performance !== "undefined" && performance?.now
          ? performance.now()
          : Date.now()) - requestStartMs;

      const groups = Array.isArray(byNickname) ? byNickname : [];
      const useSeparateSheets = !resolvedSelected && groups.length > 1;
      const totalRows = Array.isArray(rows) ? rows.length : 0;

      if (useSeparateSheets && setDataSheets) {
        let firstSheetId = sheetId || ctx?.activeSheetId || null;

        flushSync(() => {
          setDataSheets((prev) => {
            let next = { ...(prev || {}) };
            /** @type {string[]} */
            const writtenIds = [];

            for (let i = 0; i < groups.length; i++) {
              const group = groups[i];
              const nickName = String(group.nickname || `trader-${i + 1}`).trim().slice(0, 80);
              const groupRows = Array.isArray(group.rows) ? group.rows : [];

              let targetSheetId;
              if (i === 0 && firstSheetId) {
                targetSheetId = firstSheetId;
              } else {
                targetSheetId = allocateNextSheetId(next);
              }
              writtenIds.push(targetSheetId);

              const requestCard = {
                id: genRequestCardId(),
                createdAt: Date.now(),
                elapsedMs,
                lake: "kalshi-live",
                table: "search_traders",
                sheetId: targetSheetId,
                querySummary,
                loadedRowCount: groupRows.length,
              };

              next = applyAthenaPullToSheetPatch(next, targetSheetId, groupRows, {
                name: nickName,
                provenance: {
                  source: "kalshi-live",
                  endpoint: "search_traders",
                  query: resolvedQuery,
                  nickname: nickName,
                  limit: resolvedLimit,
                  includeMetrics: resolvedMetrics,
                  includeHoldings: resolvedHoldings,
                  profileCount,
                  querySummary,
                },
                requestCards: [requestCard],
              });
            }

            firstSheetId = writtenIds[0] || firstSheetId;
            return next;
          });

          if (firstSheetId && ctx?.setActiveSheetId) {
            ctx.setActiveSheetId(firstSheetId);
          }
          ctx?.setConnectHomeAnalyzeActive?.(true);
        });
      } else if (setDataSheets) {
        const sheetLabel = resolvedSelected || resolvedQuery || "traders";
        const sheetName = `trader · ${sheetLabel}`.slice(0, 80);
        let firstSheetId = sheetId || ctx?.activeSheetId || null;

        flushSync(() => {
          setDataSheets((prev) => {
            let next = { ...(prev || {}) };
            const targetSheetId = firstSheetId || allocateNextSheetId(next);
            firstSheetId = targetSheetId;

            const requestCard = {
              id: genRequestCardId(),
              createdAt: Date.now(),
              elapsedMs,
              lake: "kalshi-live",
              table: "search_traders",
              sheetId: targetSheetId,
              querySummary,
              loadedRowCount: totalRows,
            };

            next = applyAthenaPullToSheetPatch(next, targetSheetId, rows, {
              name: sheetName,
              provenance: {
                source: "kalshi-live",
                endpoint: "search_traders",
                query: resolvedQuery,
                nickname: resolvedSelected || undefined,
                limit: resolvedLimit,
                includeMetrics: resolvedMetrics,
                includeHoldings: resolvedHoldings,
                profileCount,
                querySummary,
              },
              requestCards: [requestCard],
            });

            return next;
          });

          if (firstSheetId && ctx?.setActiveSheetId) {
            ctx.setActiveSheetId(firstSheetId);
          }
          ctx?.setConnectHomeAnalyzeActive?.(true);
        });
      } else {
        applyConnectHomePullData(ctx, rows);
      }

      if (ctx?.requestConnectAnalyzeScroll) {
        ctx.requestConnectAnalyzeScroll();
      }

      return totalRows;
    },
    [
      connectKalshiLiveSearchTradersQuery,
      connectKalshiLiveSearchTradersSelectedNickname,
      connectKalshiLiveSearchTradersIncludeMetrics,
      connectKalshiLiveSearchTradersIncludeHoldings,
      connectKalshiLiveLimit,
      connectKalshiLiveWhereFilters,
      connectKalshiLiveSortClauses,
      setConnectDataLakePullState,
      setDataSheets,
      setRows,
      ctx,
    ],
  );

  const runTradesPull = useCallback(
    async (ac, sheetId, cols) => {
      const whereFilters = Array.isArray(connectKalshiLiveWhereFilters)
        ? connectKalshiLiveWhereFilters
        : [];
      const sortClauses = Array.isArray(connectKalshiLiveSortClauses)
        ? connectKalshiLiveSortClauses
        : [];
      const limit = Number(connectKalshiLiveLimit) || 1000;
      const marketTickers = String(connectKalshiLiveTradesTicker || "").trim();
      const requestStartMs =
        typeof performance !== "undefined" && performance?.now ? performance.now() : Date.now();

      setConnectDataLakePullState?.((prev) => ({
        ...prev,
        loading: true,
        label: "Fetching Kalshi Live trades…",
        progress: 8,
        error: null,
      }));

      const { byTicker, raw, rows: accumulated, querySummary } = await fetchKalshiLiveTradesPull({
        marketTickers,
        whereFilters,
        sortClauses,
        limit,
        selectedColumns: cols,
        signal: ac.signal,
        onTickerProgress: ({ ticker, index, total }) => {
          const pct = Math.min(90, 8 + Math.round(((index + 1) / Math.max(1, total)) * 80));
          setConnectDataLakePullState?.((prev) => ({
            ...prev,
            loading: true,
            label: `Fetching ${ticker} (${index + 1}/${total})…`,
            progress: pct,
            error: null,
          }));
        },
      });

      if (setRows) setRows(accumulated);

      await ingestKalshiLiveAsView({
        endpointId: "trades",
        trades: raw,
        selectedColumns: cols,
      });

      const elapsedMs =
        (typeof performance !== "undefined" && performance?.now
          ? performance.now()
          : Date.now()) - requestStartMs;

      const groups =
        Array.isArray(byTicker) && byTicker.length
          ? byTicker
          : [{ ticker: marketTickers || "trades", raw, rows: accumulated }];

      let firstSheetId = sheetId || ctx?.activeSheetId || null;
      const totalRows = groups.reduce(
        (sum, g) => sum + (Array.isArray(g.rows) ? g.rows.length : 0),
        0,
      );

      if (setDataSheets) {
        flushSync(() => {
          setDataSheets((prev) => {
            let next = { ...(prev || {}) };
            /** @type {string[]} */
            const writtenIds = [];

            for (let i = 0; i < groups.length; i++) {
              const group = groups[i];
              const tickerName = String(group.ticker || `market-${i + 1}`).trim().slice(0, 80);
              const rows = Array.isArray(group.rows) ? group.rows : [];

              let targetSheetId;
              if (i === 0 && firstSheetId) {
                targetSheetId = firstSheetId;
              } else {
                targetSheetId = allocateNextSheetId(next);
              }
              writtenIds.push(targetSheetId);

              const requestCard = {
                id: genRequestCardId(),
                createdAt: Date.now(),
                elapsedMs,
                lake: "kalshi-live",
                table: "trades",
                sheetId: targetSheetId,
                querySummary,
                loadedRowCount: rows.length,
              };

              next = applyAthenaPullToSheetPatch(next, targetSheetId, rows, {
                name: tickerName,
                provenance: {
                  source: "kalshi-live",
                  endpoint: "trades",
                  marketTickers: tickerName,
                  whereFilters,
                  sortClauses,
                  limit,
                  querySummary,
                },
                requestCards: [requestCard],
              });
            }

            firstSheetId = writtenIds[0] || firstSheetId;
            return next;
          });

          if (firstSheetId && ctx?.setActiveSheetId) {
            ctx.setActiveSheetId(firstSheetId);
          }
          ctx?.setConnectHomeAnalyzeActive?.(true);
        });
      } else {
        applyConnectHomePullData(ctx, accumulated);
      }

      if (ctx?.requestConnectAnalyzeScroll) {
        ctx.requestConnectAnalyzeScroll();
      }

      return totalRows;
    },
    [
      connectKalshiLiveWhereFilters,
      connectKalshiLiveSortClauses,
      connectKalshiLiveLimit,
      connectKalshiLiveTradesTicker,
      setConnectDataLakePullState,
      setDataSheets,
      setRows,
      ctx,
    ],
  );

  const runOrderbookPull = useCallback(
    async (ac, sheetId, cols) => {
      const whereFilters = Array.isArray(connectKalshiLiveWhereFilters)
        ? connectKalshiLiveWhereFilters
        : [];
      const sortClauses = Array.isArray(connectKalshiLiveSortClauses)
        ? connectKalshiLiveSortClauses
        : [];
      const marketTickers = String(connectKalshiLiveOrderbookTicker || "").trim();
      const requestStartMs =
        typeof performance !== "undefined" && performance?.now ? performance.now() : Date.now();

      setConnectDataLakePullState?.((prev) => ({
        ...prev,
        loading: true,
        label: "Fetching Kalshi Live orderbook…",
        progress: 8,
        error: null,
      }));

      const { byTicker, raw, rows: accumulated, querySummary } =
        await fetchKalshiLiveOrderbookPull({
          marketTickers,
          whereFilters,
          sortClauses,
          selectedColumns: cols,
          signal: ac.signal,
          onTickerProgress: ({ ticker, index, total }) => {
            const pct = Math.min(90, 8 + Math.round(((index + 1) / Math.max(1, total)) * 80));
            setConnectDataLakePullState?.((prev) => ({
              ...prev,
              loading: true,
              label: `Fetching ${ticker} (${index + 1}/${total})…`,
              progress: pct,
              error: null,
            }));
          },
        });

      if (setRows) setRows(accumulated);

      await ingestKalshiLiveAsView({
        endpointId: "orderbook",
        orderbook: raw,
        selectedColumns: cols,
      });

      const elapsedMs =
        (typeof performance !== "undefined" && performance?.now
          ? performance.now()
          : Date.now()) - requestStartMs;

      const groups =
        Array.isArray(byTicker) && byTicker.length
          ? byTicker
          : [{ ticker: marketTickers || "orderbook", raw, rows: accumulated }];

      let firstSheetId = sheetId || ctx?.activeSheetId || null;
      const totalRows = groups.reduce(
        (sum, g) => sum + (Array.isArray(g.rows) ? g.rows.length : 0),
        0,
      );

      if (setDataSheets) {
        flushSync(() => {
          setDataSheets((prev) => {
            let next = { ...(prev || {}) };
            /** @type {string[]} */
            const writtenIds = [];

            for (let i = 0; i < groups.length; i++) {
              const group = groups[i];
              const tickerName = String(group.ticker || `market-${i + 1}`).trim().slice(0, 80);
              const rows = Array.isArray(group.rows) ? group.rows : [];

              let targetSheetId;
              if (i === 0 && firstSheetId) {
                targetSheetId = firstSheetId;
              } else {
                targetSheetId = allocateNextSheetId(next);
              }
              writtenIds.push(targetSheetId);

              const requestCard = {
                id: genRequestCardId(),
                createdAt: Date.now(),
                elapsedMs,
                lake: "kalshi-live",
                table: "orderbook",
                sheetId: targetSheetId,
                querySummary,
                loadedRowCount: rows.length,
              };

              next = applyAthenaPullToSheetPatch(next, targetSheetId, rows, {
                name: tickerName,
                provenance: {
                  source: "kalshi-live",
                  endpoint: "orderbook",
                  marketTickers: tickerName,
                  whereFilters,
                  sortClauses,
                  querySummary,
                },
                requestCards: [requestCard],
              });
            }

            firstSheetId = writtenIds[0] || firstSheetId;
            return next;
          });

          if (firstSheetId && ctx?.setActiveSheetId) {
            ctx.setActiveSheetId(firstSheetId);
          }
          ctx?.setConnectHomeAnalyzeActive?.(true);
        });
      } else {
        applyConnectHomePullData(ctx, accumulated);
      }

      if (ctx?.requestConnectAnalyzeScroll) {
        ctx.requestConnectAnalyzeScroll();
      }

      return totalRows;
    },
    [
      connectKalshiLiveWhereFilters,
      connectKalshiLiveSortClauses,
      connectKalshiLiveOrderbookTicker,
      setConnectDataLakePullState,
      setDataSheets,
      setRows,
      ctx,
    ],
  );

  const finishPullUi = useCallback(
    (patch) => {
      setConnectDataLakePullState?.((prev) => ({
        ...prev,
        loading: false,
        label: patch?.label ?? "",
        progress: patch?.progress ?? 0,
        error: patch?.error ?? null,
      }));
    },
    [setConnectDataLakePullState],
  );

  const runPull = useCallback(async () => {
    abortRef.current?.abort();
    const generation = (pullGenerationRef.current += 1);
    const ac = new AbortController();
    abortRef.current = ac;
    const isStale = () => generation !== pullGenerationRef.current;

    const endpointId = String(connectKalshiLiveEndpointId || "").trim();
    const cols = connectKalshiLiveColumnSelections?.[endpointId] || [];

    if (!endpointId) {
      setConnectDataLakePullState?.({
        loading: false,
        error: "Select a Kalshi Live endpoint first.",
        label: "",
        progress: 0,
      });
      return;
    }

    if (!cols.length) {
      setConnectDataLakePullState?.({
        loading: false,
        error: "Select at least one column.",
        label: "",
        progress: 0,
      });
      return;
    }

    // Clear any stale power move; it is re-granted only on a clean qualifying pull.
    ctx?.setConnectPowerMove?.(null);

    const sheetId = activeSheetId;

    trackDataPullStart({
      integration: "kalshiLive",
      endpoint: endpointId,
      querySummary:
        endpointId === "series"
          ? connectKalshiLiveSeriesDiscoveryMode
            ? summarizeKalshiLiveSeriesDiscoveryRequest({
                category: connectKalshiLiveSeriesDiscoveryCategory,
                tag: connectKalshiLiveSeriesDiscoveryTag,
                includeVolume: kalshiLiveSeriesWantsIncludeVolume(cols),
                includeProductMetadata: !!connectKalshiLiveSeriesDiscoveryIncludeProductMetadata,
                minUpdatedTs:
                  connectKalshiLiveSeriesDiscoveryMinUpdatedTs === ""
                    ? null
                    : Number(connectKalshiLiveSeriesDiscoveryMinUpdatedTs),
              })
            : summarizeKalshiLiveSeriesPullRequest(connectKalshiLiveSeriesTicker || "", {
                sheetMode: normalizeKalshiLiveSeriesSheetMode(connectKalshiLiveSeriesSheetMode),
                includeVolume: kalshiLiveSeriesWantsIncludeVolume(cols),
              })
          : endpointId === "markets"
            ? connectKalshiLiveMarketsDiscoveryMode
              ? summarizeKalshiLiveMarketsDiscoveryRequest({
                  status: connectKalshiLiveMarketsDiscoveryStatus,
                  mveFilter:
                    connectKalshiLiveMarketsDiscoveryMveFilter || KALSHI_LIVE_MVE_FILTER_EXCLUDE,
                  eventTicker: connectKalshiLiveMarketsDiscoveryEventTicker,
                  seriesTicker: connectKalshiLiveMarketsDiscoverySeriesTicker,
                  tickers: connectKalshiLiveMarketsDiscoveryTickers,
                  minCreatedTs: connectKalshiLiveMarketsDiscoveryMinCreatedTs,
                  maxCreatedTs: connectKalshiLiveMarketsDiscoveryMaxCreatedTs,
                  minUpdatedTs: connectKalshiLiveMarketsDiscoveryMinUpdatedTs,
                  minCloseTs: connectKalshiLiveMarketsDiscoveryMinCloseTs,
                  maxCloseTs: connectKalshiLiveMarketsDiscoveryMaxCloseTs,
                  minSettledTs: connectKalshiLiveMarketsDiscoveryMinSettledTs,
                  maxSettledTs: connectKalshiLiveMarketsDiscoveryMaxSettledTs,
                })
              : summarizeKalshiLiveMarketsTickerPullRequest(connectKalshiLiveTickers || "", {
                  sheetMode: normalizeKalshiLiveMarketsSheetMode(connectKalshiLiveMarketsSheetMode),
                })
            : endpointId === "events"
              ? connectKalshiLiveEventsDiscoveryMode
                ? summarizeKalshiLiveEventsDiscoveryRequest({
                    status: connectKalshiLiveEventsDiscoveryStatus,
                    seriesTicker: connectKalshiLiveEventsDiscoverySeriesTicker,
                    tickers: connectKalshiLiveEventsDiscoveryTickers,
                    minCloseTs: connectKalshiLiveEventsDiscoveryMinCloseTs,
                    minUpdatedTs: connectKalshiLiveEventsDiscoveryMinUpdatedTs,
                  }, {
                    includeMarkets: !!connectKalshiLiveEventsIncludeMarkets,
                    rowMode: normalizeKalshiLiveEventsRowMode(connectKalshiLiveEventsRowMode),
                  })
                : summarizeKalshiLiveEventsTickerPullRequest(connectKalshiLiveEventsTickers || "", {
                    sheetMode: normalizeKalshiLiveEventsSheetMode(connectKalshiLiveEventsSheetMode),
                    includeMarkets: !!connectKalshiLiveEventsIncludeMarkets,
                    rowMode: normalizeKalshiLiveEventsRowMode(connectKalshiLiveEventsRowMode),
                  })
              : endpointId === "multivariate_events"
                ? summarizeKalshiLiveMultivariateEventsDiscoveryRequest(
                    {
                      seriesTicker: connectKalshiLiveMultivariateEventsSeriesTicker,
                      collectionTicker: connectKalshiLiveMultivariateEventsCollectionTicker,
                    },
                    {
                      includeMarkets: !!connectKalshiLiveMultivariateEventsIncludeMarkets,
                      rowMode: normalizeKalshiLiveEventsRowMode(
                        connectKalshiLiveMultivariateEventsRowMode,
                      ),
                      pageLimit: connectKalshiLiveLimit,
                    },
                  )
                : endpointId === "event_forecast"
                  ? (() => {
                      const eventTicker = parseKalshiLiveEventForecastTicker(
                        connectKalshiLiveEventForecastEventTicker || "",
                      );
                      const seriesTicker =
                        parseKalshiLiveEventForecastTicker(
                          connectKalshiLiveEventForecastSeriesTicker || "",
                        ) || inferSeriesTickerFromEvent(eventTicker);
                      const whereFilters = Array.isArray(connectKalshiLiveWhereFilters)
                        ? connectKalshiLiveWhereFilters
                        : [];
                      const { apiParams } = partitionEventForecastApiParams(whereFilters);
                      const percentiles = resolveForecastApiPercentilesFromDisplay(
                        connectKalshiLiveEventForecastPercentilePcts,
                      );
                      return summarizeKalshiLiveEventForecastRequest(
                        eventTicker || "?",
                        seriesTicker || "?",
                        apiParams,
                        percentiles,
                      );
                    })()
                : endpointId === "leaderboard"
                  ? summarizeKalshiLiveLeaderboardRequest({
                      metricName: connectKalshiLiveLeaderboardMetricName,
                      timePeriod: connectKalshiLiveLeaderboardTimePeriod,
                      category: resolveKalshiLiveLeaderboardCategory(
                        connectKalshiLiveLeaderboardCategory,
                        connectKalshiLiveLeaderboardCategoryOther,
                      ),
                      limit: connectKalshiLiveLimit,
                    })
                : endpointId === "holder_profile"
                  ? summarizeKalshiLiveHolderProfileRequest({
                      nickname: connectKalshiLiveHolderProfileNickname,
                    })
                : endpointId === "trades_by_holder"
                  ? summarizeKalshiLiveHolderTradesRequest({
                      nickname: connectKalshiLiveHolderTradesNickname,
                      seriesTicker: connectKalshiLiveHolderTradesSeriesTicker,
                      eventTicker: connectKalshiLiveHolderTradesEventTicker,
                      minAmount: connectKalshiLiveHolderTradesMinAmount,
                      limit: connectKalshiLiveLimit,
                    })
                : endpointId === "search_traders"
                  ? summarizeKalshiLiveSearchTradersRequest({
                      query:
                        connectKalshiLiveSearchTradersSelectedNickname ||
                        connectKalshiLiveSearchTradersQuery,
                      limit: connectKalshiLiveLimit,
                      includeMetrics: connectKalshiLiveSearchTradersIncludeMetrics,
                      includeHoldings: connectKalshiLiveSearchTradersIncludeHoldings,
                    })
                : endpointId,
    });

    const pullStartMs =
      typeof performance !== "undefined" && performance?.now ? performance.now() : Date.now();

    setConnectDataLakePullState?.({
      loading: true,
      error: null,
      label:
        endpointId === "series"
          ? "Fetching Kalshi Live series…"
          : endpointId === "events"
            ? "Fetching Kalshi Live events…"
            : endpointId === "multivariate_events"
              ? "Discovering Kalshi Live multivariate events…"
            : endpointId === "candlesticks"
              ? "Fetching Kalshi Live candlesticks…"
              : endpointId === "event_candlesticks"
                ? "Fetching Kalshi Live event candlesticks…"
                : endpointId === "event_forecast"
                  ? "Fetching Kalshi Live event forecast…"
                : endpointId === "leaderboard"
                  ? "Fetching Kalshi Live leaderboard…"
                : endpointId === "holder_profile"
                  ? "Fetching Kalshi Live trader profile…"
                : endpointId === "trades_by_holder"
                  ? "Fetching Kalshi Live trades by trader…"
                : endpointId === "search_traders"
                  ? "Searching Kalshi Live traders…"
                : endpointId === "trades"
                ? "Fetching Kalshi Live trades…"
                : endpointId === "orderbook"
                  ? "Fetching Kalshi Live orderbook…"
                  : "Fetching Kalshi Live markets…",
      progress: 5,
    });

    try {
      let rowCount = 0;
      if (endpointId === "series") {
        rowCount = (await runSeriesPull(ac, sheetId, cols)) || 0;
      } else if (endpointId === "events") {
        rowCount = (await runEventsPull(ac, sheetId, cols)) || 0;
      } else if (endpointId === "multivariate_events") {
        rowCount = (await runMultivariateEventsPull(ac, sheetId, cols)) || 0;
      } else if (endpointId === "markets") {
        rowCount = (await runMarketsPull(ac, sheetId, cols)) || 0;
      } else if (endpointId === "candlesticks") {
        rowCount = (await runCandlesticksPull(ac, sheetId, cols)) || 0;
      } else if (endpointId === "event_candlesticks") {
        rowCount = (await runEventCandlesticksPull(ac, sheetId, cols)) || 0;
      } else if (endpointId === "event_forecast") {
        rowCount = (await runEventForecastPull(ac, sheetId, cols)) || 0;
      } else if (endpointId === "leaderboard") {
        rowCount = (await runLeaderboardPull(ac, sheetId, cols)) || 0;
      } else if (endpointId === "holder_profile") {
        rowCount = (await runHolderProfilePull(ac, sheetId, cols)) || 0;
      } else if (endpointId === "trades_by_holder") {
        rowCount = (await runHolderTradesPull(ac, sheetId, cols)) || 0;
      } else if (endpointId === "search_traders") {
        rowCount = (await runSearchTradersPull(ac, sheetId, cols)) || 0;
      } else if (endpointId === "trades") {
        rowCount = (await runTradesPull(ac, sheetId, cols)) || 0;
      } else if (endpointId === "orderbook") {
        rowCount = (await runOrderbookPull(ac, sheetId, cols)) || 0;
      } else {
        throw new Error(`Unknown Kalshi Live endpoint: ${endpointId}`);
      }

      if (isStale() || ac.signal.aborted) return;

      const elapsedMs =
        (typeof performance !== "undefined" && performance?.now ? performance.now() : Date.now()) -
        pullStartMs;

      trackDataPullComplete({
        integration: "kalshiLive",
        endpoint: endpointId,
        rowCount,
        elapsedMs,
      });

      // Power moves are only offered after a clean Event Candlesticks pull for now.
      ctx?.setConnectPowerMove?.(
        endpointId === "event_candlesticks" && rowCount > 0 ? "event_candlesticks" : null,
      );

      setConnectDataLakePullState?.({
        loading: false,
        error: null,
        label: "",
        progress: 100,
      });
    } catch (e) {
      if (isStale() || isAbortError(e) || ac.signal.aborted) {
        finishPullUi({ error: null });
        return;
      }
      const msg = e instanceof Error ? e.message : "Kalshi Live pull failed";
      trackDataPullError({
        message: msg,
        integration: "kalshiLive",
        source: "kalshiLive.runPull",
        meta: { endpoint: endpointId },
      });
      finishPullUi({ error: msg });
    }
  }, [
    connectKalshiLiveEndpointId,
    connectKalshiLiveColumnSelections,
    connectKalshiLiveWhereFilters,
    connectKalshiLiveSortClauses,
    connectKalshiLiveLimit,
    connectKalshiLiveTickers,
    connectKalshiLiveMarketsSheetMode,
    connectKalshiLiveMarketsDiscoveryMode,
    connectKalshiLiveMarketsDiscoveryStatus,
    connectKalshiLiveMarketsDiscoveryMveFilter,
    connectKalshiLiveMarketsDiscoveryEventTicker,
    connectKalshiLiveMarketsDiscoverySeriesTicker,
    connectKalshiLiveMarketsDiscoveryTickers,
    connectKalshiLiveMarketsDiscoveryMinCreatedTs,
    connectKalshiLiveMarketsDiscoveryMaxCreatedTs,
    connectKalshiLiveMarketsDiscoveryMinUpdatedTs,
    connectKalshiLiveMarketsDiscoveryMinCloseTs,
    connectKalshiLiveMarketsDiscoveryMaxCloseTs,
    connectKalshiLiveMarketsDiscoveryMinSettledTs,
    connectKalshiLiveMarketsDiscoveryMaxSettledTs,
    connectKalshiLiveSeriesTicker,
    connectKalshiLiveSeriesSheetMode,
    connectKalshiLiveSeriesDiscoveryMode,
    connectKalshiLiveSeriesDiscoveryCategory,
    connectKalshiLiveSeriesDiscoveryTag,
    connectKalshiLiveSeriesDiscoveryIncludeProductMetadata,
    connectKalshiLiveSeriesDiscoveryMinUpdatedTs,
    connectKalshiLiveEventCandlesticksEventTicker,
    connectKalshiLiveEventCandlesticksSeriesTicker,
    connectKalshiLiveEventForecastEventTicker,
    connectKalshiLiveEventForecastSeriesTicker,
    connectKalshiLiveEventForecastPercentilePcts,
    connectKalshiLiveLeaderboardMetricName,
    connectKalshiLiveLeaderboardTimePeriod,
    connectKalshiLiveLeaderboardCategory,
    connectKalshiLiveLeaderboardCategoryOther,
    connectKalshiLiveHolderProfileNickname,
    connectKalshiLiveHolderTradesNickname,
    connectKalshiLiveHolderTradesSeriesTicker,
    connectKalshiLiveHolderTradesEventTicker,
    connectKalshiLiveHolderTradesMinAmount,
    connectKalshiLiveSearchTradersQuery,
    connectKalshiLiveSearchTradersSelectedNickname,
    connectKalshiLiveSearchTradersIncludeMetrics,
    connectKalshiLiveSearchTradersIncludeHoldings,
    activeSheetId,
    runMarketsPull,
    runEventsPull,
    runMultivariateEventsPull,
    runSeriesPull,
    runCandlesticksPull,
    runEventCandlesticksPull,
    runEventForecastPull,
    runLeaderboardPull,
    runHolderProfilePull,
    runHolderTradesPull,
    runSearchTradersPull,
    runTradesPull,
    runOrderbookPull,
    setConnectDataLakePullState,
    finishPullUi,
  ]);

  runPullRef.current = runPull;

  useEffect(() => {
    if (!connectHomeActive || !connectIntegrationPullTick) return;
    if (lastTickRef.current === connectIntegrationPullTick) return;
    lastTickRef.current = connectIntegrationPullTick;
    void runPullRef.current();
  }, [connectHomeActive, connectIntegrationPullTick]);

  const connectDataLakePullAbortRef = ctx.connectDataLakePullAbortRef;
  useEffect(() => {
    if (!connectHomeActive || !connectDataLakePullAbortRef) return;
    connectDataLakePullAbortRef.current = () => {
      pullGenerationRef.current += 1;
      abortRef.current?.abort();
    };
    return () => {
      connectDataLakePullAbortRef.current = null;
    };
  }, [connectHomeActive, connectDataLakePullAbortRef]);

  useEffect(() => {
    return () => {
      pullGenerationRef.current += 1;
      abortRef.current?.abort();
      setConnectDataLakePullState?.((prev) =>
        prev?.loading ? { ...prev, loading: false, label: "", progress: 0 } : prev,
      );
    };
  }, [setConnectDataLakePullState]);

  return null;
}
