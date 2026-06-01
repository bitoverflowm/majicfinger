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
        error: "Select Markets, Series, or Series List first.",
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

    setConnectDataLakePullState?.({
      loading: true,
      error: null,
      label:
        endpointId === "series"
          ? "Fetching Kalshi Live series…"
          : endpointId === "seriesList"
            ? "Fetching Kalshi Live series list…"
            : "Fetching Kalshi Live markets…",
      progress: 5,
    });

    try {
      if (endpointId === "series") {
        await runSeriesPull(ac, sheetId, cols);
      } else if (endpointId === "seriesList") {
        await runSeriesListPull(ac, sheetId, cols);
      } else if (endpointId === "markets") {
        await runMarketsPull(ac, sheetId, cols);
      } else {
        throw new Error(`Unknown Kalshi Live endpoint: ${endpointId}`);
      }

      if (isStale() || ac.signal.aborted) return;

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
      finishPullUi({ error: msg });
    }
  }, [
    connectKalshiLiveEndpointId,
    connectKalshiLiveColumnSelections,
    activeSheetId,
    runMarketsPull,
    runSeriesPull,
    runSeriesListPull,
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
