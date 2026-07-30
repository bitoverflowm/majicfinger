"use client";

import { useCallback, useEffect, useRef } from "react";

import { useMyStateV2 } from "@/context/stateContextV2";
import { applyAthenaPullToSheetPatch } from "@/lib/dataLake/applyAthenaPullToSheet";
import { applyConnectHomePullData } from "@/lib/connectHomePullDestination";
import { ingestKalshiLiveAsView } from "@/lib/kalshiLive/ingestKalshiLiveAsView";
import { KALSHI_LIVE_MVE_FILTER_EXCLUDE } from "@/lib/kalshiLive/marketDiscovery";
import { fetchKalshiHistoricalV2MarketsDiscoveryPull } from "@/lib/kalshiHistoricalV2/fetchKalshiHistoricalV2MarketsDiscoveryPull";

function genRequestCardId() {
  return `khv2-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function isAbortError(err) {
  return (
    (err instanceof DOMException && err.name === "AbortError") ||
    (err instanceof Error && err.name === "AbortError")
  );
}

/**
 * Hidden bridge: runs Kalshi Historical v2 pulls when Connect home requests integration pull.
 * Markets is discovery-only for now (semantic ticker search deferred).
 */
export default function KalshiHistoricalV2({
  setConnectedData,
  connectHomePullBridge = false,
}) {
  const ctx = useMyStateV2() ?? {};
  const connectHomeActive = connectHomePullBridge && ctx.connectWorkspace === "kalshiHistoricalV2";
  const connectIntegrationPullTick = ctx.connectIntegrationPullTick ?? 0;
  const lastTickRef = useRef(0);
  const abortRef = useRef(/** @type {AbortController | null} */ (null));
  const pullGenerationRef = useRef(0);
  const runPullRef = useRef(/** @type {() => Promise<void>} */ (async () => {}));

  const {
    connectKalshiLiveEndpointId,
    connectKalshiLiveColumnSelections,
    connectKalshiLiveMarketsDiscoveryMveFilter,
    connectKalshiLiveMarketsDiscoveryEventTicker,
    connectKalshiLiveMarketsDiscoverySeriesTicker,
    connectKalshiLiveMarketsDiscoveryTickers,
    connectKalshiHistoricalV2MarketsDiscoveryScope,
    setConnectDataLakePullState,
    setDataSheets,
    activeSheetId,
    setConnectedData: setConnectedFromCtx,
  } = ctx;

  const setRows = setConnectedData || setConnectedFromCtx;

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

  const runMarketsPull = useCallback(
    async (ac, sheetId, cols) => {
      setConnectDataLakePullState?.((prev) => ({
        ...prev,
        loading: true,
        label: "Discovering Kalshi Historical v2 markets…",
        progress: 8,
        error: null,
      }));

      const discoveryParams = {
        tickerScope: connectKalshiHistoricalV2MarketsDiscoveryScope || "event",
        mveFilter: connectKalshiLiveMarketsDiscoveryMveFilter ?? KALSHI_LIVE_MVE_FILTER_EXCLUDE,
        eventTicker: connectKalshiLiveMarketsDiscoveryEventTicker,
        seriesTicker: connectKalshiLiveMarketsDiscoverySeriesTicker,
        tickers: connectKalshiLiveMarketsDiscoveryTickers,
      };

      const { raw, rows: accumulated, querySummary } = await fetchKalshiHistoricalV2MarketsDiscoveryPull({
        params: discoveryParams,
        selectedColumns: cols,
        signal: ac.signal,
        onPage: ({ page, totalLoaded }) => {
          const pct = Math.min(92, 8 + page * 6);
          setConnectDataLakePullState?.((prev) => ({
            ...prev,
            loading: true,
            label: `Loaded ${totalLoaded} historical markets (page ${page})…`,
            progress: pct,
            error: null,
          }));
        },
      });

      if (setRows) setRows(accumulated);

      await ingestKalshiLiveAsView({
        endpointId: "historical_v2_markets",
        markets: raw,
        selectedColumns: cols,
      });

      const requestCard = {
        id: genRequestCardId(),
        createdAt: Date.now(),
        elapsedMs: 0,
        lake: "kalshi-historical-v2",
        table: "markets",
        sheetId: sheetId || null,
        querySummary,
        loadedRowCount: accumulated.length,
      };

      if (sheetId && setDataSheets) {
        setDataSheets((prev) =>
          applyAthenaPullToSheetPatch(prev, sheetId, accumulated, {
            provenance: {
              source: "kalshi-historical-v2",
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
    },
    [
      connectKalshiLiveMarketsDiscoveryMveFilter,
      connectKalshiLiveMarketsDiscoveryEventTicker,
      connectKalshiLiveMarketsDiscoverySeriesTicker,
      connectKalshiLiveMarketsDiscoveryTickers,
      connectKalshiHistoricalV2MarketsDiscoveryScope,
      setConnectDataLakePullState,
      setDataSheets,
      setRows,
      ctx,
    ],
  );

  const runPull = useCallback(async () => {
    abortRef.current?.abort();
    const generation = (pullGenerationRef.current += 1);
    const ac = new AbortController();
    abortRef.current = ac;
    const isStale = () => generation !== pullGenerationRef.current;

    const endpointId = String(connectKalshiLiveEndpointId || "").trim();
    const cols = connectKalshiLiveColumnSelections?.[endpointId] || [];

    if (endpointId !== "markets") {
      finishPullUi({
        loading: false,
        error: "Select the Markets endpoint first.",
        progress: 0,
      });
      return;
    }

    if (!cols.length) {
      finishPullUi({
        loading: false,
        error: "Select at least one column.",
        progress: 0,
      });
      return;
    }

    const sheetId = activeSheetId;

    try {
      await runMarketsPull(ac, sheetId, cols);
      if (isStale() || ac.signal.aborted) return;
      finishPullUi({ error: null, label: "", progress: 100 });
    } catch (e) {
      if (isStale() || isAbortError(e) || ac.signal.aborted) {
        finishPullUi({ error: null });
        return;
      }
      const msg = e instanceof Error ? e.message : "Kalshi Historical v2 pull failed";
      finishPullUi({ error: msg });
    }
  }, [
    connectKalshiLiveEndpointId,
    connectKalshiLiveColumnSelections,
    activeSheetId,
    finishPullUi,
    runMarketsPull,
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

  return null;
}
