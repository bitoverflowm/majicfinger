"use client";

import { useCallback, useEffect, useRef } from "react";

import { useMyStateV2 } from "@/context/stateContextV2";
import { applyAthenaPullToSheetPatch } from "@/lib/dataLake/applyAthenaPullToSheet";
import { fetchAllKalshiLiveMarketsPages } from "@/lib/kalshiLive/fetchKalshiLiveMarkets";
import { ingestKalshiLiveAsView } from "@/lib/kalshiLive/ingestKalshiLiveAsView";
import { projectKalshiLiveMarketRows } from "@/lib/kalshiLive/normalizeMarketRow";
import { summarizeKalshiLiveMarketsRequest } from "@/lib/kalshiLive/marketFilterRules";
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
    setConnectDataLakePullState,
    setDataSheets,
    activeSheetId,
    setConnectedData: setConnectedFromCtx,
  } = ctx;

  const setRows = setConnectedData || setConnectedFromCtx;

  const runPull = useCallback(async () => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    const endpointId = String(connectKalshiLiveEndpointId || "").trim();
    if (endpointId !== "markets") {
      setConnectDataLakePullState?.({
        loading: false,
        error: "Select the Markets endpoint first.",
        label: "",
        progress: 0,
      });
      return;
    }

    const cols = connectKalshiLiveColumnSelections?.[endpointId] || [];
    if (!cols.length) {
      setConnectDataLakePullState?.({
        loading: false,
        error: "Select at least one column.",
        label: "",
        progress: 0,
      });
      return;
    }

    const filters = Array.isArray(connectKalshiLiveFilters) ? connectKalshiLiveFilters : [];
    const limit = Number(connectKalshiLiveLimit) || 100;
    const tickers = String(connectKalshiLiveTickers || "").trim();
    const querySummary = summarizeKalshiLiveMarketsRequest(filters, { limit, tickers });
    const requestStartMs =
      typeof performance !== "undefined" && performance?.now ? performance.now() : Date.now();

    setConnectDataLakePullState?.({
      loading: true,
      error: null,
      label: "Fetching Kalshi Live markets…",
      progress: 5,
    });

    const sheetId = activeSheetId;

    try {
      /** @type {Record<string, unknown>[]} */
      let accumulated = [];
      /** @type {unknown[]} */
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
        endpointId,
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
    connectKalshiLiveFilters,
    connectKalshiLiveLimit,
    connectKalshiLiveTickers,
    setConnectDataLakePullState,
    setDataSheets,
    activeSheetId,
    setRows,
    ctx,
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
