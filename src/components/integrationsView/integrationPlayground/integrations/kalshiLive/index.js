"use client";

import { useCallback, useEffect, useRef } from "react";

import { useMyStateV2 } from "@/context/stateContextV2";
import { applyAthenaPullToSheetPatch } from "@/lib/dataLake/applyAthenaPullToSheet";
import { fetchAllKalshiLiveMarketsPages } from "@/lib/kalshiLive/fetchKalshiLiveMarkets";
import {
  fetchKalshiLiveSeries,
  summarizeKalshiLiveSeriesRequest,
} from "@/lib/kalshiLive/fetchKalshiLiveSeries";
import { ingestKalshiLiveAsView } from "@/lib/kalshiLive/ingestKalshiLiveAsView";
import { fetchKalshiLiveCandlesticksPull } from "@/lib/kalshiLive/fetchKalshiLiveCandlesticksPull";
import { fetchKalshiLiveTradesPull } from "@/lib/kalshiLive/fetchKalshiLiveTradesPull";
import { fetchKalshiLiveSeriesListPull } from "@/lib/kalshiLive/fetchKalshiLiveSeriesListPull";
import {
  applyKalshiLiveClientSort,
  applyKalshiLiveClientWhere,
  partitionKalshiLiveCompose,
  summarizeKalshiLiveComposeRequest,
} from "@/lib/kalshiLive/kalshiLiveCompose";
import { projectKalshiLiveMarketRows } from "@/lib/kalshiLive/normalizeMarketRow";
import { kalshiLiveSeriesWantsIncludeVolume } from "@/lib/kalshiLive/seriesColumns";
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
    connectKalshiLiveCandlestickTickers,
    connectKalshiLiveTradesTicker,
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
      const limit = Number(connectKalshiLiveLimit) || 100;
      const { marketApiFilters, marketTickers, clientWhere } = partitionKalshiLiveCompose(
        "markets",
        whereFilters,
      );
      const hasClient = clientWhere.length > 0 || sortClauses.length > 0;
      const fetchLimit = hasClient ? 1000 : limit;
      const querySummary = summarizeKalshiLiveComposeRequest(
        "markets",
        whereFilters,
        sortClauses,
        { limit },
      );
      const requestStartMs =
        typeof performance !== "undefined" && performance?.now ? performance.now() : Date.now();

      let rawMarkets = [];

      await fetchAllKalshiLiveMarketsPages({
        filters: marketApiFilters,
        limit: fetchLimit,
        tickers: marketTickers,
        signal: ac.signal,
        onPage: async ({ page, rows }) => {
          const batch = Array.isArray(rows) ? rows : [];
          rawMarkets = rawMarkets.concat(batch);
          const pct = Math.min(92, 8 + page * 12);
          setConnectDataLakePullState?.((prev) => ({
            ...prev,
            loading: true,
            label: `Loaded ${rawMarkets.length} markets (page ${page})…`,
            progress: pct,
            error: null,
          }));
        },
      });

      const filtered = applyKalshiLiveClientWhere(rawMarkets, clientWhere);
      const sorted = applyKalshiLiveClientSort(filtered, sortClauses, "markets");
      const sliced = sorted.slice(0, limit);
      const accumulated = projectKalshiLiveMarketRows(sliced, cols);

      if (setRows) setRows(accumulated);

      await ingestKalshiLiveAsView({
        endpointId: "markets",
        markets: sliced,
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
              whereFilters,
              sortClauses,
              limit,
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
      connectKalshiLiveWhereFilters,
      connectKalshiLiveSortClauses,
      connectKalshiLiveLimit,
      setConnectDataLakePullState,
      setDataSheets,
      setRows,
      ctx,
    ],
  );

  const runSeriesPull = useCallback(
    async (ac, sheetId, cols) => {
      const whereFilters = Array.isArray(connectKalshiLiveWhereFilters)
        ? connectKalshiLiveWhereFilters
        : [];
      const { seriesTicker } = partitionKalshiLiveCompose("series", whereFilters);
      const includeVolume = kalshiLiveSeriesWantsIncludeVolume(cols);
      const querySummary = summarizeKalshiLiveComposeRequest("series", whereFilters, [], {
        limit: 1,
      });
      const requestStartMs =
        typeof performance !== "undefined" && performance?.now ? performance.now() : Date.now();

      const series = await fetchKalshiLiveSeries({
        seriesTicker,
        includeVolume,
        signal: ac.signal,
      });

      const { rows: accumulated } = await ingestKalshiLiveAsView({
        endpointId: "series",
        series,
        selectedColumns: cols,
      });

      if (setRows) setRows(accumulated);

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
              seriesTicker,
              includeVolume,
              querySummary,
            },
            requestCards: [requestCard],
          }),
        );
      }

      applyConnectHomePullData(ctx, accumulated);
      return accumulated.length;
    },
    [connectKalshiLiveWhereFilters, setConnectDataLakePullState, setDataSheets, setRows, ctx],
  );

  const runSeriesListPull = useCallback(
    async (ac, sheetId, cols) => {
      const whereFilters = Array.isArray(connectKalshiLiveWhereFilters)
        ? connectKalshiLiveWhereFilters
        : [];
      const sortClauses = Array.isArray(connectKalshiLiveSortClauses)
        ? connectKalshiLiveSortClauses
        : [];
      const limit = Number(connectKalshiLiveLimit) || 100;
      const querySummary = summarizeKalshiLiveComposeRequest(
        "seriesList",
        whereFilters,
        sortClauses,
        { limit },
      );
      const requestStartMs =
        typeof performance !== "undefined" && performance?.now ? performance.now() : Date.now();

      setConnectDataLakePullState?.((prev) => ({
        ...prev,
        loading: true,
        label: "Fetching Kalshi Live series list…",
        progress: 20,
        error: null,
      }));

      const { raw, rows: accumulated } = await fetchKalshiLiveSeriesListPull({
        whereFilters,
        sortClauses,
        limit,
        selectedColumns: cols,
        signal: ac.signal,
      });

      if (setRows) setRows(accumulated);

      await ingestKalshiLiveAsView({
        endpointId: "seriesList",
        seriesList: raw,
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
        table: "seriesList",
        sheetId: sheetId || null,
        querySummary,
        loadedRowCount: accumulated.length,
      };

      if (sheetId && setDataSheets) {
        setDataSheets((prev) =>
          applyAthenaPullToSheetPatch(prev, sheetId, accumulated, {
            provenance: {
              source: "kalshi-live",
              endpoint: "seriesList",
              whereFilters,
              sortClauses,
              limit,
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
      connectKalshiLiveWhereFilters,
      connectKalshiLiveSortClauses,
      connectKalshiLiveLimit,
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
        progress: 20,
        error: null,
      }));

      const { raw, rows: accumulated, querySummary } = await fetchKalshiLiveCandlesticksPull({
        marketTickers,
        whereFilters,
        sortClauses,
        limit,
        selectedColumns: cols,
        signal: ac.signal,
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

      const requestCard = {
        id: genRequestCardId(),
        createdAt: Date.now(),
        elapsedMs,
        lake: "kalshi-live",
        table: "candlesticks",
        sheetId: sheetId || null,
        querySummary,
        loadedRowCount: accumulated.length,
      };

      if (sheetId && setDataSheets) {
        setDataSheets((prev) =>
          applyAthenaPullToSheetPatch(prev, sheetId, accumulated, {
            provenance: {
              source: "kalshi-live",
              endpoint: "candlesticks",
              marketTickers,
              whereFilters,
              sortClauses,
              limit,
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
      const limit = Number(connectKalshiLiveLimit) || 100;
      const marketTicker = String(connectKalshiLiveTradesTicker || "").trim();
      const requestStartMs =
        typeof performance !== "undefined" && performance?.now ? performance.now() : Date.now();

      let totalLoaded = 0;

      const { raw, rows: accumulated, querySummary } = await fetchKalshiLiveTradesPull({
        marketTicker,
        whereFilters,
        sortClauses,
        limit,
        selectedColumns: cols,
        signal: ac.signal,
        onPage: async ({ page, totalLoaded: loaded }) => {
          totalLoaded = loaded;
          const pct = Math.min(92, 8 + page * 10);
          setConnectDataLakePullState?.((prev) => ({
            ...prev,
            loading: true,
            label: `Loaded ${loaded} trades (page ${page})…`,
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

      const requestCard = {
        id: genRequestCardId(),
        createdAt: Date.now(),
        elapsedMs,
        lake: "kalshi-live",
        table: "trades",
        sheetId: sheetId || null,
        querySummary,
        loadedRowCount: accumulated.length,
      };

      if (sheetId && setDataSheets) {
        setDataSheets((prev) =>
          applyAthenaPullToSheetPatch(prev, sheetId, accumulated, {
            provenance: {
              source: "kalshi-live",
              endpoint: "trades",
              marketTicker,
              whereFilters,
              sortClauses,
              limit,
              querySummary,
              totalLoaded,
            },
            requestCards: [requestCard],
          }),
        );
      }

      applyConnectHomePullData(ctx, accumulated);
      return accumulated.length;
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
          ? summarizeKalshiLiveComposeRequest("series", connectKalshiLiveWhereFilters || [], [], { limit: 1 })
          : endpointId === "markets"
            ? summarizeKalshiLiveComposeRequest(
                "markets",
                connectKalshiLiveWhereFilters || [],
                connectKalshiLiveSortClauses || [],
                { limit: Number(connectKalshiLiveLimit) || 100 },
              )
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
          : endpointId === "seriesList"
            ? "Fetching Kalshi Live series list…"
            : endpointId === "candlesticks"
              ? "Fetching Kalshi Live candlesticks…"
              : endpointId === "trades"
                ? "Fetching Kalshi Live trades…"
                : "Fetching Kalshi Live markets…",
      progress: 5,
    });

    try {
      let rowCount = 0;
      if (endpointId === "series") {
        rowCount = (await runSeriesPull(ac, sheetId, cols)) || 0;
      } else if (endpointId === "seriesList") {
        rowCount = (await runSeriesListPull(ac, sheetId, cols)) || 0;
      } else if (endpointId === "markets") {
        rowCount = (await runMarketsPull(ac, sheetId, cols)) || 0;
      } else if (endpointId === "candlesticks") {
        rowCount = (await runCandlesticksPull(ac, sheetId, cols)) || 0;
      } else if (endpointId === "trades") {
        rowCount = (await runTradesPull(ac, sheetId, cols)) || 0;
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
    activeSheetId,
    runMarketsPull,
    runSeriesPull,
    runSeriesListPull,
    runCandlesticksPull,
    runTradesPull,
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
