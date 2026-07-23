"use client";

import { useCallback, useEffect, useRef } from "react";
import { flushSync } from "react-dom";

import { useMyStateV2 } from "@/context/stateContextV2";
import { applyAthenaPullToSheetPatch } from "@/lib/dataLake/applyAthenaPullToSheet";
import { fetchKalshiLiveMarketsTickerPull } from "@/lib/kalshiLive/fetchKalshiLiveMarketsTickerPull";
import { fetchKalshiLiveSeriesPull } from "@/lib/kalshiLive/fetchKalshiLiveSeriesPull";
import { fetchKalshiLiveSeriesDiscoveryPull } from "@/lib/kalshiLive/fetchKalshiLiveSeriesDiscoveryPull";
import {
  KALSHI_LIVE_MARKETS_SHEET_MODE_COMBINED,
  normalizeKalshiLiveMarketsSheetMode,
  summarizeKalshiLiveMarketsTickerPullRequest,
} from "@/lib/kalshiLive/marketCompose";
import {
  KALSHI_LIVE_SERIES_SHEET_MODE_COMBINED,
  normalizeKalshiLiveSeriesSheetMode,
  summarizeKalshiLiveSeriesDiscoveryRequest,
  summarizeKalshiLiveSeriesPullRequest,
} from "@/lib/kalshiLive/seriesCompose";
import { ingestKalshiLiveAsView } from "@/lib/kalshiLive/ingestKalshiLiveAsView";
import { kalshiLiveSeriesWantsIncludeVolume } from "@/lib/kalshiLive/seriesColumns";
import { fetchKalshiLiveCandlesticksPull } from "@/lib/kalshiLive/fetchKalshiLiveCandlesticksPull";
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
    connectKalshiLiveCandlestickTickers,
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
      const whereFilters = Array.isArray(connectKalshiLiveWhereFilters)
        ? connectKalshiLiveWhereFilters
        : [];
      const sortClauses = Array.isArray(connectKalshiLiveSortClauses)
        ? connectKalshiLiveSortClauses
        : [];
      const marketTickers = String(connectKalshiLiveTickers || "").trim();
      const sheetMode = normalizeKalshiLiveMarketsSheetMode(connectKalshiLiveMarketsSheetMode);
      const requestStartMs =
        typeof performance !== "undefined" && performance?.now ? performance.now() : Date.now();

      setConnectDataLakePullState?.((prev) => ({
        ...prev,
        loading: true,
        label: "Fetching Kalshi Live markets…",
        progress: 8,
        error: null,
      }));

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
            ? summarizeKalshiLiveMarketsTickerPullRequest(connectKalshiLiveTickers || "", {
                sheetMode: normalizeKalshiLiveMarketsSheetMode(connectKalshiLiveMarketsSheetMode),
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
          : endpointId === "candlesticks"
            ? "Fetching Kalshi Live candlesticks…"
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
      } else if (endpointId === "markets") {
        rowCount = (await runMarketsPull(ac, sheetId, cols)) || 0;
      } else if (endpointId === "candlesticks") {
        rowCount = (await runCandlesticksPull(ac, sheetId, cols)) || 0;
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
    connectKalshiLiveSeriesTicker,
    connectKalshiLiveSeriesSheetMode,
    connectKalshiLiveSeriesDiscoveryMode,
    connectKalshiLiveSeriesDiscoveryCategory,
    connectKalshiLiveSeriesDiscoveryTag,
    connectKalshiLiveSeriesDiscoveryIncludeProductMetadata,
    connectKalshiLiveSeriesDiscoveryMinUpdatedTs,
    activeSheetId,
    runMarketsPull,
    runSeriesPull,
    runCandlesticksPull,
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
