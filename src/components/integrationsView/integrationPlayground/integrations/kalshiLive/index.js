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
import { summarizeKalshiLiveMarketsRequest } from "@/lib/kalshiLive/marketFilterRules";
import { projectKalshiLiveMarketRows } from "@/lib/kalshiLive/normalizeMarketRow";
import { kalshiLiveSeriesWantsIncludeVolume } from "@/lib/kalshiLive/seriesColumns";
import { applyConnectHomePullData } from "@/lib/connectHomePullDestination";

function genRequestCardId() {
  return `kl-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
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
  const abortRef = useRef(null);

  const {
    connectKalshiLiveEndpointId,
    connectKalshiLiveColumnSelections,
    connectKalshiLiveFilters,
    connectKalshiLiveLimit,
    connectKalshiLiveTickers,
    connectKalshiLiveSeriesTicker,
    setConnectDataLakePullState,
    setDataSheets,
    activeSheetId,
    setConnectedData: setConnectedFromCtx,
  } = ctx;

  const setRows = setConnectedData || setConnectedFromCtx;

  const runMarketsPull = useCallback(
    async (ac, sheetId, cols) => {
      const filters = Array.isArray(connectKalshiLiveFilters) ? connectKalshiLiveFilters : [];
      const limit = Number(connectKalshiLiveLimit) || 100;
      const tickers = String(connectKalshiLiveTickers || "").trim();
      const querySummary = summarizeKalshiLiveMarketsRequest(filters, { limit, tickers });
      const requestStartMs =
        typeof performance !== "undefined" && performance?.now ? performance.now() : Date.now();

      let accumulated = [];
      let rawMarkets = [];

      await fetchAllKalshiLiveMarketsPages({
        filters,
        limit,
        tickers,
        signal: ac.signal,
        onPage: async ({ page, rows }) => {
          const batch = Array.isArray(rows) ? rows : [];
          rawMarkets = rawMarkets.concat(batch);
          const pageRows = projectKalshiLiveMarketRows(batch, cols);
          accumulated = accumulated.concat(pageRows);
          if (setRows) setRows([...accumulated]);
          if (sheetId && setDataSheets) {
            setDataSheets((prev) =>
              applyAthenaPullToSheetPatch(prev, sheetId, [...accumulated], {
                provenance: {
                  source: "kalshi-live",
                  endpoint: "markets",
                  filters,
                  limit,
                  tickers: tickers || undefined,
                  querySummary,
                },
              }),
            );
          }
          const pct = Math.min(92, 8 + page * 12);
          setConnectDataLakePullState?.((prev) => ({
            ...prev,
            loading: true,
            label: `Loaded ${accumulated.length} markets (page ${page})…`,
            progress: pct,
            error: null,
          }));
        },
      });

      await ingestKalshiLiveAsView({
        endpointId: "markets",
        markets: rawMarkets,
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
              filters,
              limit,
              tickers: tickers || undefined,
              querySummary,
            },
            requestCards: [requestCard],
          }),
        );
      }

      applyConnectHomePullData(ctx, accumulated);
    },
    [
      connectKalshiLiveFilters,
      connectKalshiLiveLimit,
      connectKalshiLiveTickers,
      setConnectDataLakePullState,
      setDataSheets,
      setRows,
      ctx,
    ],
  );

  const runSeriesPull = useCallback(
    async (ac, sheetId, cols) => {
      const seriesTicker = String(connectKalshiLiveSeriesTicker || "").trim();
      const includeVolume = kalshiLiveSeriesWantsIncludeVolume(cols);
      const querySummary = summarizeKalshiLiveSeriesRequest({
        seriesTicker,
        includeVolume,
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
    [connectKalshiLiveSeriesTicker, setConnectDataLakePullState, setDataSheets, setRows, ctx],
  );

  const runPull = useCallback(async () => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    const endpointId = String(connectKalshiLiveEndpointId || "").trim();
    const cols = connectKalshiLiveColumnSelections?.[endpointId] || [];

    if (!endpointId) {
      setConnectDataLakePullState?.({
        loading: false,
        error: "Select Markets or Series first.",
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

    if (endpointId === "series") {
      const seriesTicker = String(connectKalshiLiveSeriesTicker || "").trim();
      if (!seriesTicker) {
        setConnectDataLakePullState?.({
          loading: false,
          error: "Series ticker is required.",
          label: "",
          progress: 0,
        });
        return;
      }
    }

    const sheetId = activeSheetId;

    setConnectDataLakePullState?.({
      loading: true,
      error: null,
      label:
        endpointId === "series" ? "Fetching Kalshi Live series…" : "Fetching Kalshi Live markets…",
      progress: 5,
    });

    try {
      if (endpointId === "series") {
        await runSeriesPull(ac, sheetId, cols);
      } else if (endpointId === "markets") {
        await runMarketsPull(ac, sheetId, cols);
      } else {
        throw new Error(`Unknown Kalshi Live endpoint: ${endpointId}`);
      }

      setConnectDataLakePullState?.({
        loading: false,
        error: null,
        label: "",
        progress: 100,
      });
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      const msg = e instanceof Error ? e.message : "Kalshi Live pull failed";
      setConnectDataLakePullState?.({
        loading: false,
        error: msg,
        label: "",
        progress: 0,
      });
    }
  }, [
    connectKalshiLiveEndpointId,
    connectKalshiLiveColumnSelections,
    connectKalshiLiveSeriesTicker,
    activeSheetId,
    runMarketsPull,
    runSeriesPull,
    setConnectDataLakePullState,
  ]);

  useEffect(() => {
    if (!connectHomeActive || !connectIntegrationPullTick) return;
    if (lastTickRef.current === connectIntegrationPullTick) return;
    lastTickRef.current = connectIntegrationPullTick;
    void runPull();
  }, [connectHomeActive, connectIntegrationPullTick, runPull]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  return null;
}
