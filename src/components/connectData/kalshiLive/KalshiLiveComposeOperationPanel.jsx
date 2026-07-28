"use client";

import { useCallback, useMemo } from "react";
import { flushSync } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Minus, Play, Plus } from "lucide-react";

import { KalshiLiveCategorySelect } from "@/components/connectData/kalshiLive/KalshiLiveCategorySelect";
import { KalshiLiveTimestampPicker } from "@/components/connectData/kalshiLive/KalshiLiveTimestampPicker";
import { ConnectHomeSheetPullFields } from "@/components/connectData/ConnectHomeSheetPullFields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMyStateV2 } from "@/context/stateContextV2";
import {
  KALSHI_LIVE_DEFAULT_LIMIT,
  getKalshiLiveComposeOperationIds,
} from "@/config/kalshiLiveConnect";
import { CONNECT_COMPOSE_OPERATIONS } from "@/lib/connectComposeOperations";
import { operatorSymbol } from "@/lib/dataLakeComposeHelpers";
import { validateKalshiLiveCandlestickPull } from "@/lib/kalshiLive/candlestickCompose";
import { validateKalshiLiveEventCandlesticksPull } from "@/lib/kalshiLive/eventCandlesticksCompose";
import { validateKalshiLiveEventForecastPull } from "@/lib/kalshiLive/eventForecastCompose";
import { KALSHI_LIVE_EVENT_FORECAST_PERIOD_OPTIONS } from "@/lib/kalshiLive/eventForecastColumns";
import {
  validateKalshiLiveLeaderboardPull,
} from "@/lib/kalshiLive/leaderboardCompose";
import { validateKalshiLiveHolderProfilePull } from "@/lib/kalshiLive/holderProfileCompose";
import { validateKalshiLiveHolderTradesPull } from "@/lib/kalshiLive/holderTradesCompose";
import { validateKalshiLiveSearchTradersPull } from "@/lib/kalshiLive/searchTradersCompose";
import {
  KALSHI_LIVE_LEADERBOARD_LIMIT_DEFAULT,
  KALSHI_LIVE_LEADERBOARD_LIMIT_MAX,
} from "@/lib/kalshiLive/leaderboardColumns";
import {
  KALSHI_LIVE_HOLDER_TRADES_LIMIT_DEFAULT,
  KALSHI_LIVE_HOLDER_TRADES_LIMIT_MAX,
} from "@/lib/kalshiLive/holderTradesColumns";
import {
  KALSHI_LIVE_SEARCH_TRADERS_LIMIT_DEFAULT,
  KALSHI_LIVE_SEARCH_TRADERS_LIMIT_MAX,
} from "@/lib/kalshiLive/searchTradersColumns";
import {
  KALSHI_LIVE_TRADES_DEFAULT_LIMIT,
  KALSHI_LIVE_TRADES_ROW_LIMIT_MAX,
  validateKalshiLiveTradesPull,
} from "@/lib/kalshiLive/tradeCompose";
import { validateKalshiLiveOrderbookPull } from "@/lib/kalshiLive/orderbookCompose";
import {
  KALSHI_LIVE_MARKETS_SHEET_MODE_COMBINED,
  KALSHI_LIVE_MARKETS_SHEET_MODE_PER_MARKET,
  normalizeKalshiLiveMarketsSheetMode,
  parseKalshiLiveMarketsTickersInput,
  validateKalshiLiveMarketsPull,
} from "@/lib/kalshiLive/marketCompose";
import {
  KALSHI_LIVE_MVE_FILTER_EXCLUDE,
  validateKalshiLiveMarketsDiscoveryPull,
} from "@/lib/kalshiLive/marketDiscovery";
import {
  KALSHI_LIVE_EVENTS_SHEET_MODE_COMBINED,
  KALSHI_LIVE_EVENTS_SHEET_MODE_PER_EVENT,
  normalizeKalshiLiveEventsSheetMode,
  parseKalshiLiveEventsTickersInput,
  validateKalshiLiveEventsPull,
} from "@/lib/kalshiLive/eventCompose";
import { validateKalshiLiveEventsDiscoveryPull } from "@/lib/kalshiLive/eventDiscovery";
import {
  KALSHI_LIVE_MULTIVARIATE_EVENTS_PAGE_LIMIT_DEFAULT,
  KALSHI_LIVE_MULTIVARIATE_EVENTS_PAGE_LIMIT_MAX,
  validateKalshiLiveMultivariateEventsDiscoveryPull,
} from "@/lib/kalshiLive/multivariateEventsDiscovery";
import {
  KALSHI_LIVE_SERIES_SHEET_MODE_COMBINED,
  KALSHI_LIVE_SERIES_SHEET_MODE_PER_SERIES,
  normalizeKalshiLiveSeriesSheetMode,
  parseKalshiLiveSeriesTickersInput,
  validateKalshiLiveSeriesDiscoveryPull,
  validateKalshiLiveSeriesPull,
} from "@/lib/kalshiLive/seriesCompose";
import { KALSHI_LIVE_CANDLESTICK_PERIOD_OPTIONS } from "@/lib/kalshiLive/candlesticksColumns";
import {
  getKalshiLiveAllColumnNames,
  getKalshiLiveColumnType,
  validateKalshiLiveWhereFilters,
} from "@/lib/kalshiLive/kalshiLiveCompose";
import { KALSHI_LIVE_MARKET_STATUS_OPTIONS } from "@/lib/kalshiLive/marketsColumns";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useDemoProGate } from "@/hooks/useDemoProGate";
import { cn } from "@/lib/utils";

function defaultRowLimit(endpointId) {
  if (endpointId === "trades") return KALSHI_LIVE_TRADES_DEFAULT_LIMIT;
  if (endpointId === "multivariate_events") return KALSHI_LIVE_MULTIVARIATE_EVENTS_PAGE_LIMIT_DEFAULT;
  if (endpointId === "leaderboard") return KALSHI_LIVE_LEADERBOARD_LIMIT_DEFAULT;
  if (endpointId === "trades_by_holder") return KALSHI_LIVE_HOLDER_TRADES_LIMIT_DEFAULT;
  if (endpointId === "search_traders") return KALSHI_LIVE_SEARCH_TRADERS_LIMIT_DEFAULT;
  return KALSHI_LIVE_DEFAULT_LIMIT;
}

function genId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

/** @param {string} endpointId @param {string} column */
function operatorsForColumn(endpointId, column) {
  if (
    (endpointId === "candlesticks" || endpointId === "event_candlesticks") &&
    column === "period_interval"
  ) {
    return [{ id: "eq", label: "is equal to" }];
  }
  if (endpointId === "event_forecast" && column === "period_interval") {
    return [{ id: "eq", label: "is equal to" }];
  }
  if (
    (endpointId === "candlesticks" || endpointId === "event_candlesticks") &&
    column === "include_latest_before_start"
  ) {
    return [{ id: "eq", label: "is equal to" }];
  }
  if (column === "category") return [{ id: "eq", label: "is equal to" }];
  if (column === "status") return [{ id: "eq", label: "is equal to" }];
  const type = getKalshiLiveColumnType(endpointId, column);
  if (type === "boolean") return [{ id: "eq", label: "is equal to" }];
  if (type === "number") {
    return [
      { id: "eq", label: "is equal to" },
      { id: "gt", label: "greater than" },
      { id: "lt", label: "less than" },
      { id: "neq", label: "not equal to" },
    ];
  }
  if (type === "timestamp" || column.endsWith("_ts") || column.endsWith("_time")) {
    return [
      { id: "gt", label: "after" },
      { id: "lt", label: "before" },
    ];
  }
  return [
    { id: "eq", label: "is equal to" },
    { id: "neq", label: "not equal to" },
    { id: "contains", label: "contains" },
  ];
}

/** @param {string} endpointId @param {string} column */
function defaultWhereValue(endpointId, column) {
  if (endpointId === "candlesticks" || endpointId === "event_candlesticks") {
    const now = Math.floor(Date.now() / 1000);
    if (column === "start_ts") return now - 24 * 60 * 60;
    if (column === "end_ts") return now;
    if (column === "period_interval") return 60;
    if (column === "include_latest_before_start") return false;
  }
  if (endpointId === "event_forecast") {
    const now = Math.floor(Date.now() / 1000);
    if (column === "start_ts") return now - 24 * 60 * 60;
    if (column === "end_ts") return now;
    if (column === "period_interval") return 60;
  }
  if (endpointId === "trades") {
    const now = Math.floor(Date.now() / 1000);
    if (column === "min_ts") return now - 24 * 60 * 60;
    if (column === "max_ts") return now;
  }
  if (endpointId === "orderbook" && column === "depth") return 0;
  if (column === "category") return "Economics";
  if (column === "status") return "open";
  const type = getKalshiLiveColumnType(endpointId, column);
  if (type === "timestamp" || column.endsWith("_ts") || column.endsWith("_time")) {
    return Math.floor(Date.now() / 1000);
  }
  if (type === "number") return 0;
  return "";
}

const CANDLESTICK_ROW_LIMIT_MAX = 10_000;

/**
 * @param {{
 *   endpointId: string;
 *   onRunPull: () => void;
 *   filterError?: string | null;
 *   setFilterError?: (msg: string | null) => void;
 *   className?: string;
 * }} props
 */
export function KalshiLiveComposeOperationPanel({
  endpointId,
  onRunPull,
  filterError,
  setFilterError,
  className,
}) {
  const ctx = useMyStateV2() ?? {};
  const { workspaceWriteLocked, requestProUpgrade, dialog: demoProDialog } = useDemoProGate();
  const {
    connectActiveComposeOps = [],
    setConnectActiveComposeOps,
    connectKalshiLiveWhereFilters = [],
    setConnectKalshiLiveWhereFilters,
    connectKalshiLiveSortClauses = [],
    setConnectKalshiLiveSortClauses,
    connectKalshiLiveLimit = KALSHI_LIVE_DEFAULT_LIMIT,
    setConnectKalshiLiveLimit,
    connectKalshiLiveColumnSelections = {},
    connectKalshiLiveCandlestickTickers = "",
    connectKalshiLiveCandlestickTickerMeta = {},
    connectKalshiLiveEventCandlesticksEventTicker = "",
    connectKalshiLiveEventCandlesticksSeriesTicker = "",
    connectKalshiLiveEventForecastEventTicker = "",
    connectKalshiLiveEventForecastSeriesTicker = "",
    connectKalshiLiveEventForecastPercentilePcts,
    connectKalshiLiveLeaderboardMetricName = "projected_pnl",
    connectKalshiLiveLeaderboardTimePeriod = "weekly",
    connectKalshiLiveLeaderboardCategory = "",
    connectKalshiLiveLeaderboardCategoryOther = "",
    connectKalshiLiveHolderProfileNickname = "",
    connectKalshiLiveHolderTradesNickname = "",
    connectKalshiLiveHolderTradesSeriesTicker = "",
    connectKalshiLiveHolderTradesEventTicker = "",
    connectKalshiLiveHolderTradesMinAmount = "",
    connectKalshiLiveSearchTradersQuery = "",
    connectKalshiLiveSearchTradersIncludeMetrics = false,
    connectKalshiLiveSearchTradersIncludeHoldings = false,
    connectKalshiLiveTickers = "",
    connectKalshiLiveMarketsTickerMeta = {},
    connectKalshiLiveMarketsSheetMode = KALSHI_LIVE_MARKETS_SHEET_MODE_PER_MARKET,
    setConnectKalshiLiveMarketsSheetMode,
    connectKalshiLiveMarketsDiscoveryMode = false,
    connectKalshiLiveMarketsDiscoveryStatus = "",
    connectKalshiLiveMarketsDiscoveryMveFilter = KALSHI_LIVE_MVE_FILTER_EXCLUDE,
    connectKalshiLiveMarketsDiscoveryEventTicker = "",
    connectKalshiLiveMarketsDiscoverySeriesTicker = "",
    connectKalshiLiveMarketsDiscoveryTickers = "",
    connectKalshiLiveMarketsDiscoveryMinCreatedTs = "",
    connectKalshiLiveMarketsDiscoveryMaxCreatedTs = "",
    connectKalshiLiveMarketsDiscoveryMinUpdatedTs = "",
    connectKalshiLiveMarketsDiscoveryMinCloseTs = "",
    connectKalshiLiveMarketsDiscoveryMaxCloseTs = "",
    connectKalshiLiveMarketsDiscoveryMinSettledTs = "",
    connectKalshiLiveMarketsDiscoveryMaxSettledTs = "",
    connectKalshiLiveEventsTickers = "",
    connectKalshiLiveEventsTickerMeta = {},
    connectKalshiLiveEventsSheetMode = KALSHI_LIVE_EVENTS_SHEET_MODE_PER_EVENT,
    setConnectKalshiLiveEventsSheetMode,
    connectKalshiLiveEventsDiscoveryMode = false,
    connectKalshiLiveEventsDiscoveryStatus = "",
    connectKalshiLiveEventsDiscoverySeriesTicker = "",
    connectKalshiLiveEventsDiscoveryTickers = "",
    connectKalshiLiveEventsDiscoveryMinCloseTs = "",
    connectKalshiLiveEventsDiscoveryMinUpdatedTs = "",
    connectKalshiLiveMultivariateEventsSeriesTicker = "",
    connectKalshiLiveMultivariateEventsCollectionTicker = "",
    connectKalshiLiveTradesTicker = "",
    connectKalshiLiveTradesTickerMeta = {},
    connectKalshiLiveOrderbookTicker = "",
    connectKalshiLiveOrderbookTickerMeta = {},
    connectKalshiLiveSeriesTicker = "",
    connectKalshiLiveSeriesTickerMeta = {},
    connectKalshiLiveSeriesSheetMode = KALSHI_LIVE_SERIES_SHEET_MODE_PER_SERIES,
    setConnectKalshiLiveSeriesSheetMode,
    connectKalshiLiveSeriesDiscoveryMode = false,
    connectKalshiLiveSeriesDiscoveryCategory = "",
    connectKalshiLiveSeriesDiscoveryTag = "",
  } = ctx;

  const candlestickAutoSheets = useMemo(() => {
    if (endpointId !== "candlesticks") return null;
    const tickers = String(connectKalshiLiveCandlestickTickers || "")
      .split(/[\s,]+/)
      .map((t) => t.trim().toUpperCase())
      .filter(Boolean);
    const unique = [...new Set(tickers)];
    return unique.map((ticker) => ({
      name: ticker,
      title: connectKalshiLiveCandlestickTickerMeta?.[ticker] || ticker,
    }));
  }, [
    endpointId,
    connectKalshiLiveCandlestickTickers,
    connectKalshiLiveCandlestickTickerMeta,
  ]);

  const tradesAutoSheets = useMemo(() => {
    if (endpointId !== "trades") return null;
    const tickers = String(connectKalshiLiveTradesTicker || "")
      .split(/[\s,]+/)
      .map((t) => t.trim().toUpperCase())
      .filter(Boolean);
    const unique = [...new Set(tickers)];
    return unique.map((ticker) => ({
      name: ticker,
      title: connectKalshiLiveTradesTickerMeta?.[ticker] || ticker,
    }));
  }, [endpointId, connectKalshiLiveTradesTicker, connectKalshiLiveTradesTickerMeta]);

  const orderbookAutoSheets = useMemo(() => {
    if (endpointId !== "orderbook") return null;
    const tickers = String(connectKalshiLiveOrderbookTicker || "")
      .split(/[\s,]+/)
      .map((t) => t.trim().toUpperCase())
      .filter(Boolean);
    const unique = [...new Set(tickers)];
    return unique.map((ticker) => ({
      name: ticker,
      title: connectKalshiLiveOrderbookTickerMeta?.[ticker] || ticker,
    }));
  }, [endpointId, connectKalshiLiveOrderbookTicker, connectKalshiLiveOrderbookTickerMeta]);

  const marketsSheetMode = normalizeKalshiLiveMarketsSheetMode(connectKalshiLiveMarketsSheetMode);
  const marketsTickerList = useMemo(
    () =>
      endpointId === "markets" ? parseKalshiLiveMarketsTickersInput(connectKalshiLiveTickers) : [],
    [endpointId, connectKalshiLiveTickers],
  );

  const marketsAutoSheets = useMemo(() => {
    if (endpointId !== "markets") return null;
    if (connectKalshiLiveMarketsDiscoveryMode) return null;
    if (marketsSheetMode !== KALSHI_LIVE_MARKETS_SHEET_MODE_PER_MARKET) return null;
    if (marketsTickerList.length < 2) return null;
    return marketsTickerList.map((ticker) => ({
      name: ticker,
      title: connectKalshiLiveMarketsTickerMeta?.[ticker] || ticker,
    }));
  }, [
    endpointId,
    connectKalshiLiveMarketsDiscoveryMode,
    marketsSheetMode,
    marketsTickerList,
    connectKalshiLiveMarketsTickerMeta,
  ]);

  const eventsSheetMode = normalizeKalshiLiveEventsSheetMode(connectKalshiLiveEventsSheetMode);
  const eventsTickerList = useMemo(
    () =>
      endpointId === "events" ? parseKalshiLiveEventsTickersInput(connectKalshiLiveEventsTickers) : [],
    [endpointId, connectKalshiLiveEventsTickers],
  );

  const eventsAutoSheets = useMemo(() => {
    if (endpointId !== "events") return null;
    if (connectKalshiLiveEventsDiscoveryMode) return null;
    if (eventsSheetMode !== KALSHI_LIVE_EVENTS_SHEET_MODE_PER_EVENT) return null;
    if (eventsTickerList.length < 2) return null;
    return eventsTickerList.map((ticker) => ({
      name: ticker,
      title: connectKalshiLiveEventsTickerMeta?.[ticker] || ticker,
    }));
  }, [
    endpointId,
    connectKalshiLiveEventsDiscoveryMode,
    eventsSheetMode,
    eventsTickerList,
    connectKalshiLiveEventsTickerMeta,
  ]);

  const seriesSheetMode = normalizeKalshiLiveSeriesSheetMode(connectKalshiLiveSeriesSheetMode);
  const seriesTickerList = useMemo(
    () =>
      endpointId === "series" ? parseKalshiLiveSeriesTickersInput(connectKalshiLiveSeriesTicker) : [],
    [endpointId, connectKalshiLiveSeriesTicker],
  );

  const seriesAutoSheets = useMemo(() => {
    if (endpointId !== "series") return null;
    if (connectKalshiLiveSeriesDiscoveryMode) return null;
    if (seriesSheetMode !== KALSHI_LIVE_SERIES_SHEET_MODE_PER_SERIES) return null;
    if (seriesTickerList.length < 2) return null;
    return seriesTickerList.map((ticker) => ({
      name: ticker,
      title: connectKalshiLiveSeriesTickerMeta?.[ticker] || ticker,
    }));
  }, [
    endpointId,
    connectKalshiLiveSeriesDiscoveryMode,
    seriesSheetMode,
    seriesTickerList,
    connectKalshiLiveSeriesTickerMeta,
  ]);

  const autoNamedSheets =
    candlestickAutoSheets ||
    tradesAutoSheets ||
    orderbookAutoSheets ||
    marketsAutoSheets ||
    eventsAutoSheets ||
    seriesAutoSheets;

  const allColumns = useMemo(() => getKalshiLiveAllColumnNames(endpointId), [endpointId]);

  const openComposeOps = useMemo(() => {
    const allowed = new Set(getKalshiLiveComposeOperationIds(endpointId));
    const open = new Set(Array.isArray(connectActiveComposeOps) ? connectActiveComposeOps : []);
    return CONNECT_COMPOSE_OPERATIONS.filter((o) => allowed.has(o.id) && open.has(o.id));
  }, [connectActiveComposeOps, endpointId]);

  const addWhereFilter = useCallback(
    (column) => {
      const ops = operatorsForColumn(endpointId, column);
      setConnectKalshiLiveWhereFilters?.((prev) => [
        ...(prev || []),
        {
          id: genId("klw"),
          column,
          op: ops[0]?.id || "eq",
          value: defaultWhereValue(endpointId, column),
          categoryOtherText: "",
        },
      ]);
    },
    [endpointId, setConnectKalshiLiveWhereFilters],
  );

  const updateWhereFilter = useCallback(
    (id, patch) => {
      setConnectKalshiLiveWhereFilters?.((prev) =>
        (prev || []).map((f) => (f.id === id ? { ...f, ...patch } : f)),
      );
    },
    [setConnectKalshiLiveWhereFilters],
  );

  const removeWhereFilter = useCallback(
    (id) => {
      setConnectKalshiLiveWhereFilters?.((prev) => (prev || []).filter((f) => f.id !== id));
    },
    [setConnectKalshiLiveWhereFilters],
  );

  const addSortClause = useCallback(() => {
    const col = allColumns[0] || "volume_fp";
    setConnectKalshiLiveSortClauses?.((prev) => [
      ...(prev || []),
      { id: genId("kls"), column: col, direction: "desc" },
    ]);
  }, [allColumns, setConnectKalshiLiveSortClauses]);

  const updateSortClause = useCallback(
    (id, patch) => {
      setConnectKalshiLiveSortClauses?.((prev) =>
        (prev || []).map((s) => (s.id === id ? { ...s, ...patch } : s)),
      );
    },
    [setConnectKalshiLiveSortClauses],
  );

  const removeSortClause = useCallback(
    (id) => {
      setConnectKalshiLiveSortClauses?.((prev) => (prev || []).filter((s) => s.id !== id));
    },
    [setConnectKalshiLiveSortClauses],
  );

  const handleRestart = useCallback(() => {
    setConnectKalshiLiveWhereFilters?.([]);
    setConnectKalshiLiveSortClauses?.([]);
    setConnectKalshiLiveLimit?.(defaultRowLimit(endpointId));
    setConnectActiveComposeOps?.([]);
    setFilterError?.(null);
  }, [
    endpointId,
    setConnectKalshiLiveWhereFilters,
    setConnectKalshiLiveSortClauses,
    setConnectKalshiLiveLimit,
    setConnectActiveComposeOps,
    setFilterError,
  ]);

  const handleRunPull = useCallback(() => {
    if (workspaceWriteLocked) {
      requestProUpgrade("Kalshi Live", {
        title: "Upgrade to unlock",
        description:
          "Saving, data pulls, uploads, and integrations require an active paid plan (or lifetime access).",
      });
      return;
    }

    const cols = connectKalshiLiveColumnSelections?.[endpointId] || [];
    if (!cols.length) {
      setFilterError?.("Select at least one column.");
      return;
    }

    const validation = validateKalshiLiveWhereFilters(endpointId, connectKalshiLiveWhereFilters);
    if (validation) {
      setFilterError?.(validation);
      return;
    }

    if (endpointId === "candlesticks") {
      const candleErr = validateKalshiLiveCandlestickPull(
        connectKalshiLiveCandlestickTickers,
        connectKalshiLiveWhereFilters,
      );
      if (candleErr) {
        setFilterError?.(candleErr);
        return;
      }
    }

    if (endpointId === "event_candlesticks") {
      const eventCandleErr = validateKalshiLiveEventCandlesticksPull(
        connectKalshiLiveEventCandlesticksEventTicker,
        connectKalshiLiveEventCandlesticksSeriesTicker,
        connectKalshiLiveWhereFilters,
      );
      if (eventCandleErr) {
        setFilterError?.(eventCandleErr);
        return;
      }
    }

    if (endpointId === "event_forecast") {
      const forecastErr = validateKalshiLiveEventForecastPull(
        connectKalshiLiveEventForecastEventTicker,
        connectKalshiLiveEventForecastSeriesTicker,
        connectKalshiLiveWhereFilters,
        connectKalshiLiveEventForecastPercentilePcts,
      );
      if (forecastErr) {
        setFilterError?.(forecastErr);
        return;
      }
    }

    if (endpointId === "leaderboard") {
      const leaderboardErr = validateKalshiLiveLeaderboardPull({
        metricName: connectKalshiLiveLeaderboardMetricName,
        timePeriod: connectKalshiLiveLeaderboardTimePeriod,
        category: connectKalshiLiveLeaderboardCategory,
        categoryOther: connectKalshiLiveLeaderboardCategoryOther,
        limit: connectKalshiLiveLimit,
      });
      if (leaderboardErr) {
        setFilterError?.(leaderboardErr);
        return;
      }
    }

    if (endpointId === "holder_profile") {
      const profileErr = validateKalshiLiveHolderProfilePull({
        nickname: connectKalshiLiveHolderProfileNickname,
      });
      if (profileErr) {
        setFilterError?.(profileErr);
        return;
      }
    }

    if (endpointId === "trades_by_holder") {
      const holderTradesErr = validateKalshiLiveHolderTradesPull({
        nickname: connectKalshiLiveHolderTradesNickname,
        seriesTicker: connectKalshiLiveHolderTradesSeriesTicker,
        eventTicker: connectKalshiLiveHolderTradesEventTicker,
        minAmount: connectKalshiLiveHolderTradesMinAmount,
        limit: connectKalshiLiveLimit,
      });
      if (holderTradesErr) {
        setFilterError?.(holderTradesErr);
        return;
      }
    }

    if (endpointId === "search_traders") {
      const searchErr = validateKalshiLiveSearchTradersPull({
        query: connectKalshiLiveSearchTradersQuery,
        limit: connectKalshiLiveLimit,
        includeMetrics: connectKalshiLiveSearchTradersIncludeMetrics,
        includeHoldings: connectKalshiLiveSearchTradersIncludeHoldings,
      });
      if (searchErr) {
        setFilterError?.(searchErr);
        return;
      }
    }

    if (endpointId === "trades") {
      const tradesErr = validateKalshiLiveTradesPull(
        connectKalshiLiveTradesTicker,
        connectKalshiLiveWhereFilters,
      );
      if (tradesErr) {
        setFilterError?.(tradesErr);
        return;
      }
    }

    if (endpointId === "orderbook") {
      const orderbookErr = validateKalshiLiveOrderbookPull(connectKalshiLiveOrderbookTicker);
      if (orderbookErr) {
        setFilterError?.(orderbookErr);
        return;
      }
    }

    if (endpointId === "markets") {
      const marketsErr = connectKalshiLiveMarketsDiscoveryMode
        ? validateKalshiLiveMarketsDiscoveryPull({
            status: connectKalshiLiveMarketsDiscoveryStatus,
            mveFilter: connectKalshiLiveMarketsDiscoveryMveFilter,
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
        : validateKalshiLiveMarketsPull(connectKalshiLiveTickers);
      if (marketsErr) {
        setFilterError?.(marketsErr);
        return;
      }
    }

    if (endpointId === "events") {
      const eventsErr = connectKalshiLiveEventsDiscoveryMode
        ? validateKalshiLiveEventsDiscoveryPull({
            status: connectKalshiLiveEventsDiscoveryStatus,
            seriesTicker: connectKalshiLiveEventsDiscoverySeriesTicker,
            tickers: connectKalshiLiveEventsDiscoveryTickers,
            minCloseTs: connectKalshiLiveEventsDiscoveryMinCloseTs,
            minUpdatedTs: connectKalshiLiveEventsDiscoveryMinUpdatedTs,
          })
        : validateKalshiLiveEventsPull(connectKalshiLiveEventsTickers);
      if (eventsErr) {
        setFilterError?.(eventsErr);
        return;
      }
    }

    if (endpointId === "multivariate_events") {
      const mveErr = validateKalshiLiveMultivariateEventsDiscoveryPull({
        seriesTicker: connectKalshiLiveMultivariateEventsSeriesTicker,
        collectionTicker: connectKalshiLiveMultivariateEventsCollectionTicker,
      });
      if (mveErr) {
        setFilterError?.(mveErr);
        return;
      }
    }

    if (endpointId === "series") {
      const seriesErr = connectKalshiLiveSeriesDiscoveryMode
        ? validateKalshiLiveSeriesDiscoveryPull({
            category: connectKalshiLiveSeriesDiscoveryCategory,
            tag: connectKalshiLiveSeriesDiscoveryTag,
          })
        : validateKalshiLiveSeriesPull(connectKalshiLiveSeriesTicker);
      if (seriesErr) {
        setFilterError?.(seriesErr);
        return;
      }
    }

    setFilterError?.(null);
    flushSync(() => {
      onRunPull?.();
    });
  }, [
    workspaceWriteLocked,
    requestProUpgrade,
    connectKalshiLiveColumnSelections,
    endpointId,
    connectKalshiLiveWhereFilters,
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
    connectKalshiLiveSearchTradersIncludeMetrics,
    connectKalshiLiveSearchTradersIncludeHoldings,
    connectKalshiLiveLimit,
    connectKalshiLiveTickers,
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
    connectKalshiLiveEventsDiscoveryMode,
    connectKalshiLiveEventsDiscoveryStatus,
    connectKalshiLiveEventsDiscoverySeriesTicker,
    connectKalshiLiveEventsDiscoveryTickers,
    connectKalshiLiveEventsDiscoveryMinCloseTs,
    connectKalshiLiveEventsDiscoveryMinUpdatedTs,
    connectKalshiLiveMultivariateEventsSeriesTicker,
    connectKalshiLiveMultivariateEventsCollectionTicker,
    connectKalshiLiveTradesTicker,
    connectKalshiLiveOrderbookTicker,
    setFilterError,
    onRunPull,
    connectKalshiLiveSeriesTicker,
    connectKalshiLiveSeriesDiscoveryMode,
    connectKalshiLiveSeriesDiscoveryCategory,
    connectKalshiLiveSeriesDiscoveryTag,
  ]);

  const rowLimitMax =
    endpointId === "candlesticks"
      ? CANDLESTICK_ROW_LIMIT_MAX
      : endpointId === "trades"
        ? KALSHI_LIVE_TRADES_ROW_LIMIT_MAX
        : endpointId === "multivariate_events"
          ? KALSHI_LIVE_MULTIVARIATE_EVENTS_PAGE_LIMIT_MAX
          : endpointId === "leaderboard"
            ? KALSHI_LIVE_LEADERBOARD_LIMIT_MAX
            : endpointId === "trades_by_holder"
              ? KALSHI_LIVE_HOLDER_TRADES_LIMIT_MAX
              : endpointId === "search_traders"
                ? KALSHI_LIVE_SEARCH_TRADERS_LIMIT_MAX
              : 1000;

  const rowLimitDefault = defaultRowLimit(endpointId);

  const renderWhereValueInput = (f) => {
    if (
      (endpointId === "candlesticks" || endpointId === "event_candlesticks") &&
      f.column === "period_interval"
    ) {
      return (
        <Select
          value={String(f.value ?? 60)}
          onValueChange={(v) => updateWhereFilter(f.id, { value: Number(v) })}
        >
          <SelectTrigger className="h-7 min-w-[6rem] flex-1 text-[11px]">
            <SelectValue placeholder="Interval" />
          </SelectTrigger>
          <SelectContent>
            {KALSHI_LIVE_CANDLESTICK_PERIOD_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={String(opt.value)} className="text-xs">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }
    if (endpointId === "event_forecast" && f.column === "period_interval") {
      return (
        <Select
          value={String(f.value ?? 60)}
          onValueChange={(v) => updateWhereFilter(f.id, { value: Number(v) })}
        >
          <SelectTrigger className="h-7 min-w-[6rem] flex-1 text-[11px]">
            <SelectValue placeholder="Interval" />
          </SelectTrigger>
          <SelectContent>
            {KALSHI_LIVE_EVENT_FORECAST_PERIOD_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={String(opt.value)} className="text-xs">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }
    if (f.column === "category") {
      return (
        <KalshiLiveCategorySelect
          className="min-w-0 flex-1"
          value={String(f.value ?? "")}
          categoryOtherText={String(f.categoryOtherText ?? "")}
          onChange={(patch) => updateWhereFilter(f.id, patch)}
        />
      );
    }
    if (f.column === "status") {
      return (
        <Select
          value={String(f.value || "__any__")}
          onValueChange={(v) => updateWhereFilter(f.id, { value: v === "__any__" ? "" : v })}
        >
          <SelectTrigger className="h-7 min-w-[5rem] flex-1 text-[11px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {KALSHI_LIVE_MARKET_STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s} className="text-xs">
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }
    if (getKalshiLiveColumnType(endpointId, f.column) === "boolean") {
      return (
        <Select
          value={String(f.value === true || f.value === "true" ? "true" : "false")}
          onValueChange={(v) => updateWhereFilter(f.id, { value: v === "true" })}
        >
          <SelectTrigger className="h-7 min-w-[5rem] flex-1 text-[11px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="true" className="text-xs">
              true
            </SelectItem>
            <SelectItem value="false" className="text-xs">
              false
            </SelectItem>
          </SelectContent>
        </Select>
      );
    }
    const type = getKalshiLiveColumnType(endpointId, f.column);
    if (type === "timestamp" || f.column.endsWith("_ts") || f.column.endsWith("_time")) {
      return (
        <KalshiLiveTimestampPicker
          value={f.value}
          onChange={(unix) => updateWhereFilter(f.id, { value: unix })}
          className="min-w-0 flex-1"
        />
      );
    }
    return (
      <Input
        className="h-7 min-w-[3rem] flex-1 text-[11px]"
        type={type === "number" ? "number" : "text"}
        value={String(f.value ?? "")}
        onChange={(e) =>
          updateWhereFilter(f.id, {
            value: type === "number" ? Number(e.target.value) : e.target.value,
          })
        }
      />
    );
  };

  const renderComposeOpBody = (opId) => {
    if (opId === "where") {
      return (
        <div className="space-y-2">
          {connectKalshiLiveWhereFilters.map((f) => (
            <div key={f.id} className="flex w-full flex-nowrap items-center gap-1.5">
              <Select
                value={f.column}
                onValueChange={(col) => {
                  const ops = operatorsForColumn(endpointId, col);
                  updateWhereFilter(f.id, {
                    column: col,
                    op: ops[0]?.id || "eq",
                    value: defaultWhereValue(endpointId, col),
                    categoryOtherText: "",
                  });
                }}
              >
                <SelectTrigger className="h-7 w-auto min-w-[5.5rem] max-w-[10rem] shrink-0 text-[11px]">
                  <SelectValue placeholder="Column" />
                </SelectTrigger>
                <SelectContent className="max-h-[280px]">
                  {allColumns.map((c) => (
                    <SelectItem key={c} value={c} className="text-[13px]">
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-7 shrink-0 px-2 text-[11px] min-w-8">
                    {operatorSymbol(f.op)}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-44">
                  {operatorsForColumn(endpointId, f.column).map((op) => (
                    <DropdownMenuItem key={op.id} onSelect={() => updateWhereFilter(f.id, { op: op.id })}>
                      {op.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              {renderWhereValueInput(f)}
              <button
                type="button"
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted/60"
                onClick={() => removeWhereFilter(f.id)}
                aria-label="Remove filter"
              >
                <Minus className="h-2.5 w-2.5" />
              </button>
            </div>
          ))}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" size="sm" className="h-7 text-[11px] gap-1">
                <Plus className="h-3 w-3" />
                {connectKalshiLiveWhereFilters.length > 0
                  ? "Add another filter"
                  : "Select column you want to filter"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 max-h-[280px] overflow-y-auto">
              {allColumns.map((col) => (
                <DropdownMenuItem key={col} onSelect={() => addWhereFilter(col)}>
                  {col}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <p className="text-[10px] leading-snug text-muted-foreground">
            {endpointId === "candlesticks" || endpointId === "event_candlesticks"
              ? "start_ts, end_ts, and period_interval are sent to Kalshi. Other columns filter on our side after the pull."
              : endpointId === "event_forecast"
                ? "Date range, period interval, and percentiles are set above. Other columns filter on our side after the pull."
              : endpointId === "leaderboard"
                ? "Rank order, time period, and category are set above. Limit is below. Other columns filter on our side after the pull."
              : endpointId === "holder_profile"
                ? "Nickname is set above. Other columns filter on our side after the pull."
              : endpointId === "trades_by_holder"
                ? "Nickname, series, event, and min amount are set above. Limit (cursor pages) is below. Other columns filter on our side after the pull."
              : endpointId === "search_traders"
                ? "Nickname search and optional metrics/holdings are set above. Limit is max traders from search. Other columns filter on our side after the pull."
              : endpointId === "trades"
                ? "Date range is set in Common queries above. Other columns filter on our side after the pull."
                : endpointId === "orderbook"
                  ? "Optional depth (0–100) is sent to Kalshi. Other columns filter on our side after the pull."
                  : endpointId === "series"
                    ? connectKalshiLiveSeriesDiscoveryMode
                      ? "Discovery uses category / tag filters on GET /series. Volume is controlled by the Volume column."
                      : "Series tickers are set in the search above. Optional Where filters run on our side after the pull."
                    : "status and time bounds use Kalshi API params when possible. Other columns filter on our side after the pull."}
          </p>
        </div>
      );
    }

    if (opId === "sort") {
      return (
        <div className="space-y-2">
          {connectKalshiLiveSortClauses.map((s) => (
            <div key={s.id} className="flex w-full flex-nowrap items-center gap-1.5">
              <Select value={s.column} onValueChange={(col) => updateSortClause(s.id, { column: col })}>
                <SelectTrigger className="h-7 min-w-[5.5rem] flex-1 text-[11px]">
                  <SelectValue placeholder="Column" />
                </SelectTrigger>
                <SelectContent className="max-h-[280px]">
                  {allColumns.map((c) => (
                    <SelectItem key={c} value={c} className="text-xs">
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={s.direction}
                onValueChange={(d) =>
                  updateSortClause(s.id, { direction: d === "desc" ? "desc" : "asc" })
                }
              >
                <SelectTrigger className="h-7 w-24 text-[11px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asc" className="text-xs">
                    Ascending
                  </SelectItem>
                  <SelectItem value="desc" className="text-xs">
                    Descending
                  </SelectItem>
                </SelectContent>
              </Select>
              <button
                type="button"
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted/60"
                onClick={() => removeSortClause(s.id)}
                aria-label="Remove sort"
              >
                <Minus className="h-2.5 w-2.5" />
              </button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            disabled={!allColumns.length}
            onClick={addSortClause}
          >
            {connectKalshiLiveSortClauses.length > 0 ? "Add another sort" : "Add sort"}
          </Button>
          <p className="text-[10px] leading-snug text-muted-foreground">
            Sort runs on our side after data is loaded (all columns available).
          </p>
        </div>
      );
    }

    if (opId === "row_limit") {
      return (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Maximum rows</Label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={1}
              max={rowLimitMax}
              className="h-8 w-32 text-xs"
              value={connectKalshiLiveLimit}
              onChange={(e) => {
                const n = Math.floor(Number(e.target.value));
                setConnectKalshiLiveLimit?.(
                  Number.isFinite(n)
                    ? Math.min(rowLimitMax, Math.max(1, n))
                    : rowLimitDefault,
                );
              }}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 text-[11px]"
              onClick={() => setConnectKalshiLiveLimit?.(rowLimitDefault)}
            >
              Reset to {rowLimitDefault}
            </Button>
          </div>
          <p className="text-[10px] leading-snug text-muted-foreground">
            {endpointId === "candlesticks"
              ? "Max 10,000 candle rows total across all tickers (Kalshi batch cap). Applied after fetch, filters, and sort."
              : endpointId === "trades"
                ? "Max 10,000 trades per market. Each API page requests up to 1,000; we follow the cursor until your row limit is reached or the market is exhausted."
                : endpointId === "trades_by_holder"
                  ? "Max 5,000 rows. Each API page requests up to 200 (page_size); we follow the cursor until your row limit is reached or results are exhausted."
                : endpointId === "search_traders"
                  ? "Max 500 traders from nickname search (pages of up to 100). Optional metrics/holdings are fetched per trader afterward."
                : endpointId === "multivariate_events"
                  ? "Page size for each multivariate events request (max 100). We follow the cursor across pages until results are exhausted or 20,000 rows are loaded."
                  : "Applied after API fetch, client filters, and sort."}
          </p>
        </div>
      );
    }

    return null;
  };

  const selectedColumnCount =
    (connectKalshiLiveColumnSelections?.[endpointId] || []).length;

  return (
    <motion.div className={cn("mt-4 space-y-3", className)}>
      <AnimatePresence initial={false}>
        {openComposeOps.map((op) => (
          <motion.div
            key={op.id}
            id={`connect-compose-${op.id}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-4 rounded-lg border border-border/60 bg-muted/15 p-4"
          >
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            >
              <h3 className="text-xs font-semibold tracking-tight text-foreground">{op.title}</h3>
              <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{op.description}</p>
            </motion.div>
            {renderComposeOpBody(op.id)}
          </motion.div>
        ))}
      </AnimatePresence>

      {!openComposeOps.length && endpointId === "trades" ? (
        <p className="text-[10px] leading-snug text-muted-foreground">
          Refine is optional — Run pull uses your row limit (per market). Date range is set in
          Common queries.
        </p>
      ) : null}

      {filterError ? (
        <p className="text-[11px] text-destructive" role="alert">
          {filterError}
        </p>
      ) : null}

      {endpointId === "markets" &&
      !connectKalshiLiveMarketsDiscoveryMode &&
      marketsTickerList.length >= 2 ? (
        <div className="space-y-1.5">
          <Label className="text-[11px] font-medium text-muted-foreground">
            How should we organize sheets?
          </Label>
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            value={marketsSheetMode}
            onValueChange={(value) => {
              if (!value) return;
              setConnectKalshiLiveMarketsSheetMode?.(normalizeKalshiLiveMarketsSheetMode(value));
            }}
            className="h-8 flex-wrap justify-start"
            aria-label="Markets sheet organization"
          >
            <ToggleGroupItem
              value={KALSHI_LIVE_MARKETS_SHEET_MODE_COMBINED}
              className="h-8 px-2.5 text-[11px]"
            >
              All markets in one sheet
            </ToggleGroupItem>
            <ToggleGroupItem
              value={KALSHI_LIVE_MARKETS_SHEET_MODE_PER_MARKET}
              className="h-8 px-2.5 text-[11px]"
            >
              Separate sheet per market
            </ToggleGroupItem>
          </ToggleGroup>
          <p className="text-[10px] leading-snug text-muted-foreground">
            Each market pull returns one metadata row. Separate sheets keep each ticker isolated;
            one sheet is better for side-by-side comparison.
          </p>
        </div>
      ) : null}

      {endpointId === "events" &&
      !connectKalshiLiveEventsDiscoveryMode &&
      eventsTickerList.length >= 2 ? (
        <div className="space-y-1.5">
          <Label className="text-[11px] font-medium text-muted-foreground">
            How should we organize sheets?
          </Label>
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            value={eventsSheetMode}
            onValueChange={(value) => {
              if (!value) return;
              setConnectKalshiLiveEventsSheetMode?.(normalizeKalshiLiveEventsSheetMode(value));
            }}
            className="h-8 flex-wrap justify-start"
            aria-label="Events sheet organization"
          >
            <ToggleGroupItem
              value={KALSHI_LIVE_EVENTS_SHEET_MODE_COMBINED}
              className="h-8 px-2.5 text-[11px]"
            >
              All events in one sheet
            </ToggleGroupItem>
            <ToggleGroupItem
              value={KALSHI_LIVE_EVENTS_SHEET_MODE_PER_EVENT}
              className="h-8 px-2.5 text-[11px]"
            >
              Separate sheet per event
            </ToggleGroupItem>
          </ToggleGroup>
          <p className="text-[10px] leading-snug text-muted-foreground">
            Separate sheets are named by event ticker; one sheet is better for side-by-side
            comparison.
          </p>
        </div>
      ) : null}

      {endpointId === "series" &&
      !connectKalshiLiveSeriesDiscoveryMode &&
      seriesTickerList.length >= 2 ? (
        <div className="space-y-1.5">
          <Label className="text-[11px] font-medium text-muted-foreground">
            How should we organize sheets?
          </Label>
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            value={seriesSheetMode}
            onValueChange={(value) => {
              if (!value) return;
              setConnectKalshiLiveSeriesSheetMode?.(normalizeKalshiLiveSeriesSheetMode(value));
            }}
            className="h-8 flex-wrap justify-start"
            aria-label="Series sheet organization"
          >
            <ToggleGroupItem
              value={KALSHI_LIVE_SERIES_SHEET_MODE_COMBINED}
              className="h-8 px-2.5 text-[11px]"
            >
              All series in one sheet
            </ToggleGroupItem>
            <ToggleGroupItem
              value={KALSHI_LIVE_SERIES_SHEET_MODE_PER_SERIES}
              className="h-8 px-2.5 text-[11px]"
            >
              Separate sheet per series
            </ToggleGroupItem>
          </ToggleGroup>
          <p className="text-[10px] leading-snug text-muted-foreground">
            Series pulls return metadata (one row per series). Separate sheets keep each ticker
            isolated; one sheet is better for side-by-side comparison.
          </p>
        </div>
      ) : null}

      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.06, duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-wrap items-end gap-2"
      >
        <ConnectHomeSheetPullFields
          sheetNameInputId="connect-home-kalshi-live-sheet-name"
          className={autoNamedSheets ? "w-full" : "flex-1 min-w-0"}
          autoNamedSheets={autoNamedSheets}
          autoNamedSheetsMessage={
            candlestickAutoSheets
              ? "For convenience each market candlestick data will be filled into a separate sheet. Each sheet is named by the ticker; you can change this later."
              : tradesAutoSheets
                ? "For convenience each market's trades will be filled into a separate sheet. Each sheet is named by the ticker; you can change this later."
                : orderbookAutoSheets
                  ? "For convenience each market's orderbook will be filled into a separate sheet. Each sheet is named by the ticker; you can change this later."
                  : marketsAutoSheets
                    ? "For convenience each market will be filled into a separate sheet. Each sheet is named by the ticker; you can change this later."
                    : seriesAutoSheets
                      ? "For convenience each series will be filled into a separate sheet. Each sheet is named by the series ticker; you can change this later."
                      : undefined
          }
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="ml-auto h-8 shrink-0 border-border bg-card text-xs text-foreground"
          onClick={handleRestart}
        >
          Start Over
        </Button>
        <Button
          type="button"
          size="sm"
          className="h-8 gap-1 text-xs [&_svg]:!size-2"
          disabled={!selectedColumnCount}
          onClick={handleRunPull}
        >
          Run pull
          <Play className="!size-2 shrink-0 fill-current" aria-hidden />
        </Button>
      </motion.div>
      {demoProDialog}
    </motion.div>
  );
}
