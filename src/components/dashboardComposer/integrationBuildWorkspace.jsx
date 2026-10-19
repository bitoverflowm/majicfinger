"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { columnMissingFromRows } from "@/lib/integrations/columnPayload";
import { LandingDemoMembersOnlyDialog } from "@/components/dashboardComposer/landingDemoMembersOnly";
import { FeatureTip } from "@/components/ui/feature-tip";
import { ArrowLeft, Check, ChevronDown, History, Info } from "lucide-react";
import { IntegrationBuildGrid } from "@/components/dashboardComposer/integrationBuildGrid";
import { claimSheetId, displayMatrix, recordsFromRows } from "@/components/dashboardComposer/integrationRunSheets";
import { chartSpecsForSheet } from "@/lib/visualizations/sheetCharts";
import {
  PRICE_STREAM_CAP,
  isPriceStreamIntegration,
  mergePriceRows,
  openPriceStream,
  priceStreamFeed,
  priceStreamPairTitle,
  priceStreamPairs,
  priceStreamProviderName,
} from "@/lib/priceStreams";
import { rememberTradeSheet } from "@/components/dashboardComposer/fullTradeSheet";
import { FunctionExplainer, FunctionExplainerTabs } from "@/components/dashboardComposer/integrationFunctionExplainer";
import { SummarizeExplainer, SummarizeExplainerTabs } from "@/components/dashboardComposer/integrationSummarizeExplainer";
import { BucketExplainer, BucketExplainerTabs } from "@/components/dashboardComposer/integrationBucketExplainer";
import { SampleExplainer } from "@/components/dashboardComposer/integrationSampleExplainer";
import { ClosedOrderbookExplainer } from "@/components/dashboardComposer/integrationClosedOrderbook";
import { BucketEnrichPanel, SampleEnrichPanel } from "@/components/dashboardComposer/integrationEnrichPanels";
import { FanoutJoinExplainer, FanoutJoinExplainerTabs, JoinExplainer, JoinExplainerTabs, LiveScopeJoinExplainer, LiveScopeJoinExplainerTabs, PolymarketFanoutJoinExplainer, PolymarketFanoutJoinExplainerTabs, PolymarketLiveJoinExplainer, PolymarketLiveJoinExplainerTabs, PolymarketTraderJoinExplainer, PolymarketTraderJoinExplainerTabs, TraderJoinExplainer, TraderJoinExplainerTabs } from "@/components/dashboardComposer/integrationJoinExplainer";
import { SpectrumLoadingState } from "@/components/ui/spectrum-loading-state";
import { TaskRows } from "@/components/spectrumui/blocks/ai-assistants/task-rows";
import {
  BUILD_SOURCES,
  PREVIEW_ROW_CAP,
  loadBuildPreview,
  loadBuildUniverseCount,
  KALSHI_LIVE_MARKET_JOINS,
  loadKalshiLiveDirect,
  loadKalshiLiveMarketByTicker,
  loadKalshiLiveMarketJoin,
  loadKalshiLiveParentContext,
  loadKalshiLiveMarketsForScope,
  loadKalshiLiveSeriesMarkets,
  loadKalshiLiveEventMarkets,
  loadKalshiLiveEventsByTickers,
  loadKalshiLiveEventForecast,
  loadKalshiLiveEventCandlesticks,
  kalshiHistoricalMarketColumnList,
  loadAthenaComposeRows,
  peekBuildUniverseCount,
  usesExactUniverse,
} from "@/components/dashboardComposer/integrationBuildCatalog";
import {
  ensurePolymarketMarketPick,
  loadPolymarketEventVolumeJoin,
  loadPolymarketLiveJoin,
  loadPolymarketLiveTable,
  loadPolymarketTraderJoin,
  mergePolymarketJoinRows,
  POLYMARKET_CLOSED_ORDERBOOK_MESSAGE,
  polymarketLiveBuildEndpoints,
  polymarketEventEntities,
  polymarketEventsFromSeriesRows,
  polymarketEventJoinChoices,
  polymarketSeriesEntities,
  polymarketSeriesJoinChoices,
  loadPolymarketSeriesEventsJoin,
  polymarketHolderTraderJoins,
  polymarketJoinChoices,
  polymarketJoinPlacement,
  polymarketJoinPickFromRow,
  polymarketMarketEntities,
  polymarketTraderEntities,
  polymarketTraderJoinChoices,
  polymarketDownstreamMarketJoins,
  polymarketMarketBearingJoin,
  polymarketTraderJoinSheetTitle,
  polymarketLiveBuildRequirement,
  polymarketLiveMarketJoins,
  polymarketLiveBuildSearch,
  polymarketMarketFanout,
  polymarketActivitySheetTitle,
  polymarketActivityTraderName,
  polymarketPickFromSuggestion,
  polymarketRowsForMarket,
} from "@/components/dashboardComposer/polymarketLiveBuild";
import { PolymarketLiveBuildSearch } from "@/components/dashboardComposer/polymarketLiveBuildSearch";
import {
  POLYMARKET_MARKET_SCAN_CAP,
  formatPolymarketMatchEstimate,
  polymarketMarketAttributeColumns,
  polymarketMarketFiltersActive,
  polymarketMatchEstimate,
  scanPolymarketMarkets,
} from "@/lib/polymarketLive/polymarketMarketScan";
import {
  POLYMARKET_SAMPLING_SCAN_CAP,
  samplingMarketAttributeColumns,
  samplingMarketFiltersActive,
  scanSamplingMarkets,
} from "@/lib/polymarketLive/polymarketSamplingScan";
import {
  defaultPolymarketQuoteFilters,
  exclusivePriceHistoryFilters,
  exclusiveTokenHistoryFilters,
  isPolymarketQuoteTable,
  POLYMARKET_MARKET_TRADES_MAX_AGE_SEC,
  polymarketQuoteAttributeColumns,
  polymarketQuoteRequestKey,
  polymarketTradeUser,
} from "@/lib/polymarketLive/polymarketQuoteQuery";
import {
  defaultPolymarketBiggestWinnersFilters,
  polymarketBiggestWinnersAttributeColumns,
  polymarketBiggestWinnersRequestKey,
} from "@/lib/polymarketLive/biggestWinnersCompose";
import {
  defaultPolymarketLeaderboardFilters,
  polymarketLeaderboardAttributeColumns,
  polymarketLeaderboardRequestKey,
} from "@/lib/polymarketLive/traderLeaderboardCompose";
import {
  defaultPolymarketPositionFilters,
  mergePolymarketPositionMarkets,
  polymarketPositionAttributeColumns,
  polymarketPositionRequestKey,
} from "@/lib/polymarketLive/traderPositionsCompose";
import {
  defaultPolymarketPnlFilters,
  polymarketPnlAttributeColumns,
  polymarketPnlRequestKey,
} from "@/lib/polymarketLive/traderPnlCompose";
import {
  defaultPolymarketActivityFilters,
  mergePolymarketActivityMarkets,
  polymarketActivityAttributeColumns,
  polymarketActivityRequestKey,
} from "@/lib/polymarketLive/traderActivityCompose";
import { defaultLifeRange, lifeOfMarket, lifePull, localDayKey } from "@/lib/markets/marketLife";
import { kalshiMarketLife, lifePullWindow, lifeWindowDays, mergeLives } from "@/lib/markets/lifeWindow";
import { Accordion, AccordionContent, AccordionItem } from "@/components/ui/accordion";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useMyStateV2 } from "@/context/stateContextV2";
import { pageIdForTab } from "@/lib/workspaceDashboardDocument";
import { newBlankTabName, newStartTabId, saveWorkspaceStartTabs } from "@/lib/workspaceStartTabs";
import { getHistoricalPullRowLimit, getJoinMarketCap } from "@/lib/athenaEntitlement";
import { evaluateColumnFormula, FORMULA_FUNCTIONS, FORMULA_REFERENCE_NOTES, formulaSuggestions } from "@/lib/columnFormula";
import { useUser } from "@/lib/hooks";
import {
  discardSharedQueryStorage,
  loadWorkspaceQueries,
  readUserQueryCache,
  saveWorkspaceQuery,
  writeUserQueryCache,
} from "@/lib/workspaceQueryClient";
import {
  attributeMismatchReason,
  attributeSummary,
  AttributeFilters,
  MarketWindowQueryFields,
  PriceHistoryQueryFields,
  TradeHistoryQueryFields,
  JoinSourceFields,
  buildAttributePredicates,
  rowMatchesAttributes,
  sortAttributeRows,
  sortSummary,
} from "@/components/dashboardComposer/integrationAttributes";
import { MarketScanSteps } from "@/components/dashboardComposer/liveFilterTape";
import { JoinTradeSteps } from "@/components/dashboardComposer/joinTradeSteps";
import { integrationProfile } from "@/components/dashboardComposer/integrationSource";
import { requestCardForSheet, stampRunSheets } from "@/components/dashboardComposer/integrationProvenance";
import { attachJoinRegistry } from "@/components/dashboardComposer/replayTabQueries";
import { cn } from "@/lib/utils";
import { useIntegrationConnect } from "@/components/dashboardComposer/integrationConnectDialog";
import { sheetRecords } from "@/components/dashboardComposer/integrationRunSheets";
import { assignSummaryInput, buildSummaryGrid, describeSummaryFormula, settleSummaryCells, SUMMARY_ROW_COUNT, summaryCellKey, summaryExamples } from "@/components/dashboardComposer/summarySheet";
import { buildBucketGrid, defaultBucketMode, suggestedNumericBucketSize } from "@/components/dashboardComposer/bucketSheet";
import { attachRandomSample, previewRandomSample } from "@/components/dashboardComposer/randomSampleRequest";
import { generateRandomSampleSeed, validateRandomSampleSizeInput } from "@/lib/dataLake/randomSample";
import { useWorkspaceCanvas } from "@/components/dashboardComposer/workspaceCanvas";
import { kalshiSourceCutoffCaption, useKalshiHistoricalCutoffDisplay } from "@/hooks/useKalshiHistoricalCutoffDisplay";
import { isRealtimeEnabled } from "@/lib/realtime/endpointRegistry";
import { Skeleton } from "@/components/ui/skeleton";
import { createRunReporter, describeComposePhase } from "@/components/dashboardComposer/integrationRunFeed";
import { createRunSheetStage } from "@/components/dashboardComposer/runSheetStage";
import { KalshiLiveMarketPicker, kalshiLiveMarketAttributeColumns } from "@/components/dashboardComposer/kalshiLiveMarketPicker";
import { KalshiLiveDirectQuery } from "@/components/dashboardComposer/kalshiLiveDirectQuery";
import {
  defaultKalshiLiveDirectQuery,
  directMarketTickers,
  directSeriesTickers,
  directEventTickers,
  isKalshiLiveDirectTable,
  kalshiLiveDirectScopeError,
  defaultDirectAttributeFilters,
  defaultJoinWindowFilters,
  directPullWindow,
  KALSHI_LIVE_CANDLE_QUERY_IDS,
  candleRangeMaxDays,
  fitCandleRange,
  kalshiLiveDirectAttributeColumns,
  kalshiLiveSeriesAttributeColumns,
  kalshiLiveEventAttributeColumns,
  seriesDiscoveryCategories,
  seriesUpdatedAfter,
  eventDiscoveryStatuses,
  eventSeriesTicker,
  eventSeriesTickers,
  eventClosesAfter,
  eventCandleSheetMarkets,
  eventForecastable,
  fitForecastWindow,
  isKalshiLiveTraderTable,
  kalshiLiveTraderAttributeColumns,
  leaderboardMetric,
  leaderboardTimePeriod,
  leaderboardCategories,
  traderSearchQuery,
  traderIncludeMetrics,
  traderIncludeHoldings,
  traderProfileNicknames,
  holderPositionNicknames,
  traderNicknamesFromRows,
  kalshiTraderJoinChoices,
  kalshiTraderJoinPullSpec,
  kalshiTraderJoinSheetTitle,
  kalshiTraderPullSpec,
  kalshiTraderTableNamesMarkets,
  traderMarketTickersFromRows,
  KALSHI_TRADER_JOIN_KINDS,
  kalshiLiveEventForecastAttributeColumns,
  forecastPercentileValues,
  forecastPullTargets,
  kalshiLiveMultivariateAttributeColumns,
  multivariateCollectionTicker,
} from "@/components/dashboardComposer/kalshiLiveDirectScope";
import { allowsMarketDownstreamJoin, pullKindFlags, withJoinFlags } from "@/components/dashboardComposer/pullKindFlags";
import { kalshiLiveEndpointHasRealtimeFeed } from "@/config/kalshiLiveConnect";
import { KALSHI_CANDLESTICK_MAX_CANDLES } from "@/lib/kalshiLive/candlestickCompose";
import { KALSHI_LIVE_EVENT_MARKET_ROLLUPS } from "@/lib/kalshiLive/eventsColumns";
import { fetchKalshiLiveTagsByCategories } from "@/lib/kalshiLive/seriesDiscovery";
import {
  describeKalshiLiveServerFilters,
  KALSHI_LIVE_QUERY_ATTRIBUTE_COLUMNS,
  kalshiLiveDiscoveryFromFilters,
  kalshiLiveDiscoveryIsNarrow,
  kalshiLiveFilterQueryError,
  KALSHI_LIVE_MARKET_SCAN_CAP,
  scanKalshiLiveMarkets,
} from "@/lib/kalshiLive/liveMarketAttributeQuery";

function liveScanStatusNote(info, discovery, localTitles) {
  if (info?.waiting) {
    const seconds = Math.max(1, Math.ceil((info.waitMs || 1000) / 1000));
    return `Slowing down. Continuing in ${seconds}s.`;
  }
  const server = describeKalshiLiveServerFilters(discovery);
  const titles = Array.isArray(localTitles) ? localTitles.filter(Boolean) : [];
  const bits = [`Read ${Number(info?.scanned || 0).toLocaleString()} markets`];
  if (server.length) bits.push(`request includes ${server.join(", ")}`);
  if (titles.length) bits.push(`${titles.join(", ")} checked on each market`);
  return `${bits.join(". ")}.`;
}

function rememberEntry(list, entry, limit, byFingerprint) {
  const previous = (list || []).filter(
    (item) => item.id !== entry.id && (!byFingerprint || !entry.fingerprint || item.fingerprint !== entry.fingerprint),
  );
  return [entry, ...previous].slice(0, limit);
}

function ColumnOption({ column, checked, onToggle }) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const description = column.description || "";

  useEffect(() => {
    if (!open || !description) return undefined;
    let index = 0;
    setTyped("");
    const timer = window.setInterval(() => {
      index += 1;
      setTyped(description.slice(0, index));
      if (index >= description.length) window.clearInterval(timer);
    }, 14);
    return () => window.clearInterval(timer);
  }, [open, description]);

  return (
    <div
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      className="rounded-lg px-1 py-0.5 transition-colors hover:bg-muted/60"
    >
      <label className="flex items-center gap-2 py-1 text-[13px]">
        <Checkbox checked={checked} onCheckedChange={onToggle} />
        <span className="min-w-0 flex-1 truncate text-foreground">{column.title}</span>
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{column.type}</span>
      </label>
      {description ? (
        <div
          className={cn(
            "grid transition-[grid-template-rows,opacity] duration-300 ease-out",
            open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
          )}
        >
          <p className="overflow-hidden pl-6 text-[11px] leading-relaxed text-muted-foreground">
            <span className="block pb-1">
              {typed}
              {open && typed.length < description.length ? (
                <span className="ml-px inline-block w-px animate-pulse bg-current align-[-1px]">&nbsp;</span>
              ) : null}
            </span>
          </p>
        </div>
      ) : null}
    </div>
  );
}

function WaitingToConnectTag() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2 py-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
      <span className="relative flex size-1.5" aria-hidden>
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-amber-500 opacity-75" />
        <span className="relative inline-flex size-1.5 rounded-full bg-amber-500" />
      </span>
      Waiting to connect to data source
    </span>
  );
}

const PREVIEW_TRADE_LOCK =
  "You can only view 1 market trade in preview mode; execute the query to run the full pipeline.";

const FUNCTION_COLUMN_ID = "__function";
/** Rows read to decide whether a staged sheet opens a chart. Full trade sheets can be 500,000 rows. */
const CHART_PROBE_ROWS = 200;

function createBucketItem() {
  return {
    id: `b-${Math.random().toString(36).slice(2, 8)}`,
    columnId: "",
    mode: "category",
    interval: "day",
    numericSize: "",
    groupBy: [],
    metric: "count",
    valueColumnId: "",
  };
}

function createFunctionItem() {
  return {
    id: `f-${Math.random().toString(36).slice(2, 8)}`,
    target: "",
    formula: "",
  };
}

function functionColumnId(index) {
  return index === 0 ? FUNCTION_COLUMN_ID : `${FUNCTION_COLUMN_ID}_${index + 1}`;
}

function functionColumnTitle(index) {
  return index === 0 ? "Column" : `Column ${index + 1}`;
}

function bucketSheetTitle(item, columns, index, total) {
  const column = (columns || []).find((entry) => entry.id === item.columnId);
  if (total <= 1) return "Buckets";
  return column ? `Buckets · ${column.title}` : `Buckets ${index + 1}`;
}

function bucketBlurb(item, columns) {
  const column = (columns || []).find((entry) => entry.id === item.columnId);
  if (!column) return "Choose a column";
  const how = item.mode === "time" ? item.interval : item.mode === "number" ? `ranges of ${item.numericSize || "…"}` : "exact values";
  const metric =
    item.metric === "count"
      ? "Count"
      : `${item.metric} of ${(columns || []).find((entry) => entry.id === item.valueColumnId)?.title || "…"}`;
  return `${column.title} · ${how} · ${metric}`;
}

function formulaExamples(columns) {
  const numbers = (columns || []).filter((column) => column.type === "number" && column.id !== FUNCTION_COLUMN_ID);
  const text = (columns || []).find((column) => column.type === "text" && column.id !== "ticker" && column.id !== "title");
  const first = numbers[0]?.title;
  const second = numbers[1]?.title;
  const examples = [];
  if (first && second) examples.push(`= ${first} + ${second}`);
  if (first) examples.push(`= ROUND(${first}, 0)`);
  if (first) examples.push(`= ABS(${first})`);
  if (text?.title && first) examples.push(`= IF(${text.title} = "finalized", ${first}, 0)`);
  if (!examples.length) examples.push("= Yes Price + No Price");
  return examples;
}

function referenceText({ column, row, sheetTitle, sameSheet }) {
  const cell = row == null ? column.title : `${column.title}[${row}]`;
  if (sameSheet) return cell;
  const quoted = /[^A-Za-z0-9_]/.test(sheetTitle || "");
  const sheet = quoted ? `'${sheetTitle}'` : sheetTitle;
  return `${sheet}!${cell}`;
}

function sheetsFromBlocks(blocks, used) {
  return (blocks || [])
    .filter((block) => block?.type === "sheet")
    .map((block) => {
      const sourceColumns =
        Array.isArray(block.columns) && block.columns.length
          ? block.columns
          : [{ title: "A" }, { title: "B" }, { title: "C" }, { title: "D" }];
      const columns = sourceColumns.map((column, index) => ({
        id: `col-${index}`,
        title: String(column?.title || "").trim() || `Column ${index + 1}`,
        type: "text",
      }));
      const cells = block.cells || {};
      let maxRow = -1;
      for (const key of Object.keys(cells)) {
        const row = Number(String(key).split(",")[1]);
        if (Number.isFinite(row)) maxRow = Math.max(maxRow, row);
      }
      const rows = Array.from({ length: Math.max(maxRow + 1, 0) }, (_, row) => {
        const record = {};
        columns.forEach((column, col) => {
          const value = cells[`${col},${row}`];
          if (value != null && value !== "") record[column.id] = value;
        });
        return record;
      });
      const base = String(block.title || "Data sheet").trim() || "Data sheet";
      let title = base;
      let n = 2;
      while (used.has(title.toLowerCase())) {
        title = `${base} ${n}`;
        n += 1;
      }
      used.add(title.toLowerCase());
      return { id: block.id, title, columns, rows };
    });
}

async function mapPool(items, limit, fn) {
  const out = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      out[index] = await fn(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return out;
}

function defaultMarketColumnHidden(columns) {
  return new Set((columns || []).filter((column) => !column.defaultOn).map((column) => column.id));
}

function attachMarketMetadata(tradeColumns, tradeRows, marketColumns, marketRows, match) {
  const byTicker = new Map();
  if (!match) {
    for (const row of marketRows || []) {
      const ticker = String(row?.ticker || "").trim();
      if (ticker && !byTicker.has(ticker)) byTicker.set(ticker, row);
    }
  }
  const taken = new Set((tradeColumns || []).map((column) => column.id));
  const added = [];
  for (const column of marketColumns || []) {
    if (column.id === "ticker" && taken.has("ticker")) continue;
    if (taken.has(column.id)) {
      added.push({
        ...column,
        id: `market_${column.id}`,
        title: `Market ${column.title}`,
        sourceId: column.id,
      });
      continue;
    }
    added.push({ ...column, sourceId: column.id });
  }
  const rows = (tradeRows || []).map((row) => {
    const market = match ? match(row, marketRows) : byTicker.get(String(row?.ticker || "").trim()) || {};
    const next = { ...row };
    for (const column of added) next[column.id] = market[column.sourceId] ?? "";
    return next;
  });
  return { columns: [...(tradeColumns || []), ...added], rows, highlightIds: added.map((column) => column.id) };
}

function withFunctionColumn(columns, rows, enabled, formula, sheets, sheetId, columnMeta) {
  if (!enabled) return { columns, rows, highlight: "", error: "", references: [] };
  const evaluated = evaluateColumnFormula(formula, columns, rows, { sheets, sheetId });
  const id = columnMeta?.id || FUNCTION_COLUMN_ID;
  const title = columnMeta?.title || "Column";
  return {
    columns: [...columns, { id, title, type: evaluated.type === "text" ? "text" : "number" }],
    rows: rows.map((row, index) => ({ ...row, [id]: evaluated.values[index] })),
    highlight: id,
    error: evaluated.error,
    references: evaluated.references || [],
  };
}

function applyFunctionColumns(columns, rows, items, sheets, sheetId, activeId) {
  let currentColumns = columns;
  let currentRows = rows;
  let active = { highlight: "", error: "", references: [] };
  items.forEach((item) => {
    const next = withFunctionColumn(currentColumns, currentRows, true, item.formula, sheets, sheetId, {
      id: item.columnId,
      title: item.columnTitle,
    });
    currentColumns = next.columns;
    currentRows = next.rows;
    if (!activeId || item.id === activeId) active = next;
  });
  return { columns: currentColumns, rows: currentRows, highlight: active.highlight, error: active.error, references: active.references };
}

function functionChoices({ joinActive, previewTicker, sheetTitle }) {
  const sheet = { id: "markets", title: sheetTitle, detail: "Add a column on this sheet." };
  const created = { id: "new", title: "New table", detail: "Create a tab and add the column there." };
  if (!joinActive) return [sheet, created];
  return [
    { ...sheet, detail: "Add a column on the markets sheet." },
    {
      id: "trades",
      title: previewTicker ? `Trades · ${previewTicker}` : "This trades table",
      detail: "Add a column on the trades sheet you can preview.",
    },
    { id: "trades-all", title: "All trades tables", detail: "Add the column on every trades sheet." },
    { id: "all", title: "All tables", detail: "Add the column on markets and every trades sheet." },
    created,
  ];
}

function EndpointLiveTag() {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
      <span className="relative flex size-1.5" aria-hidden>
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-75" />
        <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
      </span>
      Live
    </span>
  );
}

function sheetTabClass(selected) {
  return cn(
    "relative -ml-px max-w-[11rem] shrink-0 truncate border border-border/70 px-2 py-1 text-left text-[11px] font-medium leading-none first:ml-0",
    selected
      ? "z-10 border-[#0d99ff] bg-[#0d99ff]/10 text-[#0d99ff]"
      : "bg-background text-muted-foreground hover:text-foreground",
  );
}

function SheetTabButton({ tab, selected, measure = false, onClick }) {
  return (
    <button
      type="button"
      data-tab={measure ? "" : undefined}
      title={tab.queued ? "Viewable when you hit Save and run" : tab.title}
      onClick={onClick}
      className={cn(sheetTabClass(selected), tab.live && "inline-flex max-w-[14rem] items-center gap-1.5")}
    >
      <span className="min-w-0 truncate">{tab.title}</span>
      {tab.live ? (
        <span className="shrink-0 rounded-full bg-emerald-500/15 px-1.5 py-px text-[8px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
          Live
        </span>
      ) : null}
    </button>
  );
}

/** Tabs that fit, then +n. The rest open as a list. Queued tabs are sheets built on run, not previewed. */
function SheetTabBar({ tabs, active, onSelect }) {
  const frameRef = useRef(null);
  const measureRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState(tabs.length);
  const preview = tabs.filter((tab) => !tab.queued);
  const queued = tabs.filter((tab) => tab.queued);
  const tabKey = tabs.map((tab) => `${tab.id}:${tab.title}:${tab.queued ? 1 : 0}`).join("\n");

  useLayoutEffect(() => {
    const frame = frameRef.current;
    const measure = measureRef.current;
    if (!frame || !measure) return undefined;
    const fit = () => {
      const available = frame.clientWidth;
      const widths = [...measure.querySelectorAll("[data-tab]")].map((node) => node.offsetWidth);
      const plusWidth = measure.querySelector("[data-plus]")?.offsetWidth || 0;
      let best = 0;
      for (let count = 0; count <= widths.length; count += 1) {
        const hidden = widths.length - count + queued.length;
        const width = widths.slice(0, count).reduce((sum, value) => sum + value, 0) + (hidden > 0 ? plusWidth : 0);
        if (width <= available + 1) best = count;
        else break;
      }
      setShown(best);
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(frame);
    return () => observer.disconnect();
  }, [tabKey, queued.length]);

  let visible = preview.slice(0, shown);
  let overflow = preview.slice(shown);
  const activeHidden = overflow.find((tab) => tab.id === active);
  if (activeHidden) {
    overflow = overflow.filter((tab) => tab.id !== active);
    if (visible.length) visible = [...visible.slice(0, -1), activeHidden];
    else visible = [activeHidden];
  }
  const hidden = [...overflow, ...queued];
  useEffect(() => {
    if (!hidden.length) setOpen(false);
  }, [hidden.length]);
  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => {
      if (!frameRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  if (preview.length < 2 && !queued.length) return null;

  return (
    <div ref={frameRef} className="relative px-4 pb-1 pt-4">
      <div ref={measureRef} className="pointer-events-none invisible absolute left-0 top-0 flex h-0 overflow-hidden" aria-hidden>
        {preview.map((tab) => (
          <SheetTabButton key={tab.id} tab={tab} selected={false} measure />
        ))}
        <button type="button" data-plus className={sheetTabClass(false)}>
          +{Math.max(hidden.length, tabs.length)}
        </button>
      </div>
      <div className="flex">
        {visible.map((tab) => (
          <SheetTabButton key={tab.id} tab={tab} selected={active === tab.id} onClick={() => onSelect(tab.id)} />
        ))}
        {hidden.length ? (
          <button
            type="button"
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
            className={sheetTabClass(open)}
          >
            +{hidden.length}
          </button>
        ) : null}
      </div>
      {open && hidden.length ? (
        <div className="absolute right-4 top-full z-20 mt-1 max-h-72 w-72 overflow-y-auto rounded-lg border border-border/70 bg-background py-1 shadow-md">
          <p className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Other sheets</p>
          {hidden.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                if (tab.queued) return;
                onSelect(tab.id);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-[12px]",
                tab.queued ? "cursor-default text-muted-foreground" : "text-foreground hover:bg-muted/60",
              )}
            >
              <span className="min-w-0 flex-1 truncate">{tab.title}</span>
              {tab.queued ? <span className="shrink-0 text-[10px] uppercase tracking-wide">On run</span> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function JoinSheetTabs({ markets, active, previewTicker, onSelect, extras = [] }) {
  const preview = markets.find((market) => market.ticker === previewTicker) || markets[0];
  const tabs = [
    { id: "markets", title: "Markets" },
    ...extras.map((tab) => ({ id: tab.id, title: tab.title })),
    ...(preview ? [{ id: preview.ticker, title: `Trades · ${preview.label || preview.ticker}` }] : []),
    ...markets
      .filter((market) => market.ticker !== preview?.ticker)
      .map((market) => ({ id: market.ticker, title: `Trades · ${market.label || market.ticker}`, queued: true })),
  ];
  return <SheetTabBar tabs={tabs} active={active} onSelect={onSelect} />;
}

function joinTargetIsLive(target) {
  if (typeof target?.realtime === "boolean") return target.realtime;
  return isRealtimeEnabled("kalshiLive", target?.id);
}

function joinSourceTitle(id) {
  const kalshi = KALSHI_LIVE_MARKET_JOINS.find((item) => item.id === id);
  if (kalshi) return kalshi.title;
  if (id === "parent-market") return "Parent market";
  return (
    polymarketLiveMarketJoins().find((item) => item.id === id)?.title ||
    polymarketLiveBuildEndpoints().find((item) => item.id === id)?.title ||
    "this join"
  );
}

function liveJoinTaskTicker(target, { ticker, marketTicker, traderTicker, eventTicker }) {
  if (target?.anchor === "market" && marketTicker) return marketTicker;
  if (target?.anchor === "trader" && traderTicker) return traderTicker;
  if (target?.anchor === "event" && eventTicker) return eventTicker;
  return ticker;
}

function liveJoinTasks({ targets, preview, ticker, marketTicker = "", traderTicker = "", eventTicker = "", marketCount, noun = "market" }) {
  const count = Number(marketCount) || 0;
  const plural = noun === "market" ? "markets" : `${noun}s`;
  const tasks = [
    {
      id: "markets",
      title: count === 1 ? `1 ${noun} matched` : `${count.toLocaleString()} ${plural} matched`,
      detail: ticker,
      status: "completed",
      note: noun === "trader"
        ? `The preview joins the first trader, ${ticker}. The other traders are viewable when you hit Save and run.`
        : noun === "event"
          ? `The preview joins the first event, ${ticker}. The other events are viewable when you hit Save and run.`
          : `The preview joins the first market, ${ticker}. The other markets are attached when you run the pull.`,
    },
  ];
  for (const target of targets || []) {
    const state = preview?.[target.id];
    const status = state?.status === "ready" ? "completed" : state?.status === "error" ? "failed" : "running";
    const rows = Array.isArray(state?.rows) ? state.rows.length : 0;
    const live = joinTargetIsLive(target);
    const rowTicker = liveJoinTaskTicker(target, { ticker, marketTicker, traderTicker, eventTicker });
    tasks.push({
      id: target.id,
      title: `${target.title} for ${rowTicker}`,
      detail: status === "completed" ? `${rows.toLocaleString()} ${rows === 1 ? "row" : "rows"}` : live ? "Live" : "",
      status,
      note: [target.detail, live ? "This endpoint can keep updating on the dashboard after you run the pull. The preview stays a snapshot." : "", state?.error || ""]
        .filter(Boolean)
        .join("\n"),
    });
  }
  return tasks;
}

function liveJoinSheets(targets, markets, previewTicker) {
  const sheets = [];
  for (const market of markets || []) {
    const previewable = Boolean(previewTicker) && market.ticker === previewTicker;
    for (const target of targets || []) {
      sheets.push({
        key: `${target.id}:${market.ticker}`,
        selectId: previewable ? `live:${target.id}` : `live:locked:${target.id}:${market.ticker}`,
        title: `${target.title} · ${market.label || market.ticker}`,
        live: joinTargetIsLive(target),
        previewable,
      });
    }
  }
  return sheets;
}

function liveJoinFocus(previewSheet) {
  const value = String(previewSheet || "");
  if (!value.startsWith("live:locked:")) return { target: "", ticker: "" };
  const rest = value.slice("live:locked:".length);
  const splitAt = rest.indexOf(":");
  if (splitAt < 0) return { target: rest, ticker: "" };
  return { target: rest.slice(0, splitAt), ticker: rest.slice(splitAt + 1) };
}

function LiveJoinPlan({ markets, targets, previewTicker, focusTicker, focusTarget }) {
  const list = markets || [];
  const sources = targets || [];
  const sheetCount = list.length * sources.length;
  const preview = list.find((market) => market.ticker === previewTicker) || list[0];
  const later = list.filter((market) => market.ticker !== preview?.ticker);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-border/70 bg-background shadow-sm">
      <div className="border-b border-border/70 px-4 py-3">
        <p className="text-[13px] font-semibold text-foreground">
          {sheetCount.toLocaleString()} {sheetCount === 1 ? "sheet" : "sheets"} in this pull
        </p>
        <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">
          {sources.length.toLocaleString()} {sources.length === 1 ? "source" : "sources"} for each of {list.length.toLocaleString()}{" "}
          {list.length === 1 ? "market" : "markets"}. The tabs show the first market. The rest are built when you run the pull.
        </p>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <ol>
          {preview ? (
            <LiveJoinPlanMarket
              market={preview}
              targets={sources}
              index={0}
              mode="preview"
              focusTicker={focusTicker}
              focusTarget={focusTarget}
            />
          ) : null}
          {later.map((market, index) => (
            <LiveJoinPlanMarket
              key={market.ticker}
              market={market}
              targets={sources}
              index={index + 1}
              mode="run"
              last={index === later.length - 1}
              focusTicker={focusTicker}
              focusTarget={focusTarget}
            />
          ))}
        </ol>
      </div>
    </div>
  );
}

function LiveJoinPlanMarket({ market, targets, index, mode, last = false, focusTicker, focusTarget }) {
  const focusedMarket = focusTicker === market.ticker;
  return (
    <li
      className="relative pb-4 pl-6 last:pb-0"
      style={{ animation: `joinSheetIn 460ms ease-out ${index * 70}ms both` }}
    >
      <span
        className={cn(
          "absolute left-0 top-1.5 size-2.5 rounded-full ring-4",
          mode === "preview" ? "bg-[#0d99ff] ring-[#0d99ff]/15" : "bg-foreground/70 ring-foreground/10",
        )}
      />
      {last ? null : <span className="absolute left-[4px] top-4 h-[calc(100%-0.25rem)] w-px bg-border" />}
      <div className="flex min-w-0 items-baseline gap-2">
        <p className="min-w-0 truncate font-mono text-[12px] font-medium text-foreground">{market.ticker}</p>
        <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {mode === "preview" ? "In the tabs" : "On run"}
        </span>
      </div>
      {market.title && market.title !== market.ticker ? (
        <p className="mt-0.5 truncate text-[12px] text-muted-foreground">{market.title}</p>
      ) : null}
      <ul className="mt-2 flex flex-wrap gap-1.5">
        {(targets || []).map((target, sourceIndex) => {
          const live = joinTargetIsLive(target);
          const focused = focusedMarket && focusTarget === target.id;
          return (
            <li
              key={target.id}
              title={target.detail || target.title}
              style={{ animation: `fadeIn 380ms ease-out ${index * 70 + sourceIndex * 45 + 90}ms both` }}
              className={cn(
                "inline-flex max-w-full items-center gap-1.5 rounded-full border px-2 py-1 text-[11px]",
                focused ? "border-[#0d99ff] bg-[#0d99ff]/10 text-[#0d99ff]" : "border-border/70 bg-muted/30 text-foreground",
              )}
            >
              <span className={cn("size-1.5 shrink-0 rounded-full", live ? "bg-emerald-500" : "bg-muted-foreground/50")} />
              <span className="truncate">{target.title}</span>
              {live ? <span className="shrink-0 text-[9px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Live</span> : null}
            </li>
          );
        })}
      </ul>
    </li>
  );
}

function LiveJoinTabs({ targets, markets, active, previewTicker, onSelect, sampleTab = null }) {
  const sheets = liveJoinSheets(targets, markets, previewTicker);
  const tabs = [
    { id: "source", title: "Markets" },
    ...(sampleTab ? [{ id: sampleTab.id, title: sampleTab.title }] : []),
    ...sheets.map((sheet) => ({
      id: sheet.selectId,
      title: sheet.title,
      queued: !sheet.previewable,
      live: sheet.live,
    })),
  ];
  return <SheetTabBar tabs={tabs} active={active} onSelect={onSelect} />;
}

function SkeletonRows() {
  return (
    <div className="overflow-hidden rounded-xl border border-border/70 bg-background shadow-sm">
      {Array.from({ length: 10 }, (_, index) => (
        <div
          key={index}
          className="flex items-center gap-3 border-b border-border/40 px-3 py-3 last:border-0"
          style={{ animationDelay: `${index * 70}ms` }}
        >
          <span className="w-6 text-[12px] text-muted-foreground">{index + 1}</span>
          <span className="h-3 w-[38%] animate-pulse rounded bg-muted" style={{ animationDelay: `${index * 70}ms` }} />
          <span className="h-3 w-[18%] animate-pulse rounded bg-muted" style={{ animationDelay: `${index * 90}ms` }} />
          <span className="h-3 flex-1 animate-pulse rounded bg-muted" style={{ animationDelay: `${index * 110}ms` }} />
        </div>
      ))}
    </div>
  );
}

const ENRICH_OPTIONS = [
  { id: "join", title: "Join" },
  { id: "summarize", title: "Summarize" },
  { id: "ifElse", title: "If else", comingSoon: true },
  { id: "sample", title: "Random sample" },
  { id: "bucket", title: "Bucketing" },
  { id: "function", title: "Function" },
];

function ResultSheetTabs({ tabs, active, onSelect }) {
  return <SheetTabBar tabs={tabs} active={active} onSelect={onSelect} />;
}

function choiceClass(on) {
  return cn(
    "flex w-full flex-col rounded-lg border px-2.5 py-2 text-left transition-colors",
    on ? "border-[#0d99ff]/40 bg-[#0d99ff]/10" : "border-border/70 bg-background hover:bg-muted/50",
  );
}

/** Window for one joined market. Life choices are cut from that market's own open and close. */
/** Event volume, status, and life are summed from the markets, so they need the markets too. */
function eventsNeedMarkets(hidden) {
  return !hidden.has("markets") || KALSHI_LIVE_EVENT_MARKET_ROLLUPS.some((name) => !hidden.has(name));
}

function joinPullWindow(id, filters, market) {
  const chosen = filters || defaultJoinWindowFilters(id);
  return lifePullWindow(directPullWindow(id, chosen, {}), chosen.time_range, kalshiMarketLife(market));
}

function joinWindowSignature(id, filters) {
  const chosen = filters || defaultJoinWindowFilters(id);
  const spec = directPullWindow(id, chosen, {});
  return [chosen.time_range?.preset ?? "", spec.minTs ?? "", spec.maxTs ?? "", spec.period ?? "", spec.depth ?? ""].join(":");
}

/** Ticker, title, and the open, close, and status that place a market's life. */
function kalshiJoinMarket(row) {
  const ticker = String(row?.ticker || "").trim();
  return {
    ticker,
    label: ticker,
    title: String(row?.yes_sub_title || ticker),
    openTime: row?.open_time,
    closeTime: row?.close_time,
    status: row?.status,
  };
}

/** An event's candle window, cut from the lives of all its markets. */
function eventCandleSpan(base, range, marketRows) {
  return lifePullWindow(base, range, mergeLives((marketRows || []).map((row) => kalshiMarketLife(row))));
}

/** One event's forecast request, cut from its markets' lives. `skip` says why Kalshi has none. */
function eventForecastRequest(event, marketRows, filters) {
  const chosen = filters || defaultJoinWindowFilters("event_forecast");
  if (!eventForecastable(marketRows)) return { skip: "unsupported" };
  const span = fitForecastWindow(eventCandleSpan(directPullWindow("event_forecast", chosen, {}), chosen.time_range, marketRows));
  if (span.empty) return { skip: "window" };
  return {
    pull: {
      table: "event_forecast",
      events: [{ eventTicker: event.eventTicker, seriesTicker: event.seriesTicker }],
      minTs: span.minTs,
      maxTs: span.maxTs,
      period: Number.isFinite(Number(span.period)) ? Number(span.period) : 60,
      percentiles: forecastPercentileValues(chosen),
      previewFirst: true,
      skipMissing: true,
    },
  };
}

/** An event's forecast rows, or none when Kalshi has no forecast for it. */
async function loadEventForecastFor(event, marketRows, filters, limit) {
  const request = eventForecastRequest(event, marketRows, filters);
  if (request.skip) return { columns: [], rows: [], skip: request.skip };
  const result = await loadKalshiLiveEventForecast({ ...request.pull, limit });
  if (!result.rows?.length) return { columns: result.columns || [], rows: [], skip: result.missing?.length ? "missing" : "window" };
  return { ...result, pull: request.pull };
}

const EVENT_FORECAST_SKIP_NOTES = {
  unsupported: "Kalshi has no forecast for this event. Forecasts cover events with a numeric outcome, such as a temperature or a rate.",
  window: "None of this event's markets traded in this window.",
  missing: "Kalshi has no forecast history for this event in this window.",
};

/** Why the forecast preview is empty, from the events it checked. */
function eventForecastMissingNote(skipped) {
  if (!skipped?.length) return "No forecast rows in this window.";
  if (skipped.length === 1) return `${skipped[0].ticker}: ${EVENT_FORECAST_SKIP_NOTES[skipped[0].skip] || EVENT_FORECAST_SKIP_NOTES.missing}`;
  const unsupported = skipped.every((item) => item.skip === "unsupported");
  return unsupported
    ? `None of the first ${skipped.length.toLocaleString()} events have a forecast. Kalshi forecasts events with a numeric outcome, such as a temperature or a rate.`
    : `None of the first ${skipped.length.toLocaleString()} events have forecast history in this window. Try a longer window.`;
}

/** The event's market list. It is the first sheet of an event candlestick pull, plotted as the volume treemap. */
function eventMarketsSheet(event, markets, id) {
  const rows = markets?.rows || [];
  return {
    id,
    title: `Markets · ${event.eventTicker}`,
    columns: markets?.columns || [],
    rows,
    rowCount: rows.length,
    span: "full",
    table: "markets",
    summary: `Kalshi Live · Markets · ${event.eventTicker}`,
    pull: { table: "markets", eventTicker: event.eventTicker },
  };
}

/**
 * One `Candlesticks · <market>` sheet per market in an event, in the market list's order.
 * They are saved as market candlesticks, so each gets the candle chart, live updates, and market lookup.
 */
function eventCandleMarketSheets(event, marketRows, candles, columns, finish = (rows) => rows) {
  const rowByTicker = new Map();
  for (const row of marketRows || []) {
    const ticker = String(row?.ticker || "").trim();
    if (ticker && !rowByTicker.has(ticker)) rowByTicker.set(ticker, row);
  }
  const sheets = eventCandleSheetMarkets(candles?.byMarket, marketRows).map((market) => {
    const rows = finish(market.rows);
    return {
      id: `run-live-event-candles-${market.ticker.replace(/[^A-Za-z0-9]+/g, "-")}`,
      title: `Candlesticks · ${market.ticker}`,
      columns,
      rows,
      rowCount: rows.length,
      span: "half",
      table: "candlesticks",
      pull: { ticker: market.ticker, table: "candlesticks", ...lifePull(kalshiJoinMarket(rowByTicker.get(market.ticker) || { ticker: market.ticker })) },
      summary: `Kalshi Live · Candlesticks · ${market.ticker} · ${event.eventTicker}`,
      sourceRows: rows,
    };
  });
  if (sheets.length === 1) sheets[0].span = "full";
  return sheets;
}

function PolymarketJoinChoices({ choices, selected, onToggle }) {
  return (
    <div className="space-y-1.5">
      {choices.map((item) => {
        const on = selected.has(item.id);
        return (
          <button key={item.id} type="button" aria-pressed={on} onClick={() => onToggle?.(item.id)} className={choiceClass(on)}>
            <span className="text-[13px] font-semibold text-foreground">{item.title}</span>
            {item.detail ? <span className="text-[11px] font-normal text-muted-foreground">{item.detail}</span> : null}
            {item.note ? <span className="text-[11px] font-normal text-muted-foreground">{item.note}</span> : null}
          </button>
        );
      })}
    </div>
  );
}

function listPhrase(words) {
  const list = (words || []).filter(Boolean);
  if (list.length <= 1) return list[0] || "";
  return `${list.slice(0, -1).join(", ")} and ${list[list.length - 1]}`;
}

function LiveJoinList({ choices, selected, onToggle, windows, onWindow, life = null, perMarket = true }) {
  return (
    <div className="space-y-1.5">
      {choices.map((item) => {
        const on = selected.has(item.id);
        const filters = windows?.[item.id] || defaultJoinWindowFilters(item.id);
        return (
          <div key={item.id}>
            <button type="button" aria-pressed={on} onClick={() => onToggle?.(item.id)} className={choiceClass(on)}>
              <span className="text-[13px] font-semibold text-foreground">{item.title}</span>
              {item.detail ? <span className="text-[11px] font-normal text-muted-foreground">{item.detail}</span> : null}
            </button>
            {on ? (
              <div className="mt-1.5 rounded-lg border border-border/70 px-2 py-2">
                <JoinSourceFields
                  tableId={item.id}
                  filters={filters}
                  bounds={life}
                  perMarket={perMarket}
                  onChange={(next) => onWindow?.(item.id, next)}
                />
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function EnrichStep({
  onBack,
  picked,
  onPick,
  joinTarget,
  onJoinTarget,
  traderJoinIds,
  traderJoinChoices,
  onToggleTraderJoin,
  eventExtraJoinIds,
  onToggleEventExtraJoin,
  forecastJoinIds,
  onToggleForecastJoin,
  onClear,
  marketCap,
  queryRows,
  sheetCount,
  onHoverJoin,
  functionTables,
  functionTarget,
  onFunctionTarget,
  onClearFunction,
  functionScopeNote,
  onHoverFunction,
  onHoverSummarize,
  onClearSummary,
  summaryNote = "",
  showSummarizeBuilder = false,
  onFunctionHelp,
  onSaveAndRun,
  running,
  showJoinBuilder = true,
  showFunctionBuilder = true,
  joinMode = "markets",
  seriesMarketLayout = "sheet",
  onSeriesMarketLayout,
  traderMarketLayout = "sheet",
  onTraderMarketLayout,
  downstreamOpen = false,
  downstreamChoices = [],
  downstreamJoinIds,
  onToggleDownstreamJoin,
  onSelectAllDownstream,
  holderTraderOpen = false,
  holderTraderChoices = [],
  holderTraderJoinIds,
  onToggleHolderTrader,
  marketsDetected = false,
  liveJoinIds,
  liveJoinChoices,
  onToggleLiveJoin,
  onSelectAllLiveJoins,
  fanoutParents,
  onToggleFanoutParent,
  fanoutSeriesMarkets = false,
  onToggleFanoutSeriesMarkets,
  fanoutSeriesReady = false,
  fanoutSeriesMissing = false,
  fanoutMarketsDetected = false,
  detectedJoinIds,
  onToggleDetectedJoin,
  joinWindows,
  onJoinWindow,
  joinLife = null,
  joinPerMarket = true,
  joinLake = "kalshi",
  joinPlacement = "",
  onJoinPlacement,
  marketColumns = [],
  marketColumnHidden,
  onToggleMarketColumn,
  onMarketColumnsAll,
  onMarketColumnsNone,
  onHoverBucket,
  onHoverSample,
  bucketColumns = [],
  bucketColumnId = "",
  onBucketColumn,
  bucketMode = "category",
  onBucketMode,
  bucketInterval = "day",
  onBucketInterval,
  bucketNumericSize = "",
  onBucketNumericSize,
  bucketGroupBy = [],
  onToggleBucketGroup,
  bucketMetric = "count",
  onBucketMetric,
  bucketValueColumnId = "",
  onBucketValueColumn,
  onClearBucket,
  sampleSize = "",
  onSampleSize,
  sampleMode = "seeded",
  onSampleMode,
  sampleError = "",
  onClearSample,
  folded,
  onToggleFold,
  bucketItems = [],
  onAddBucket,
  onRemoveBucket,
  functionItems = [],
  onAddFunction,
  onRemoveFunction,
  onFocusFunction,
  summaryLines = [],
}) {
  const chosen = picked instanceof Set ? picked : new Set(picked ? [picked] : []);
  const foldedIds = folded instanceof Set ? folded : new Set();
  const joinOpen = showJoinBuilder && chosen.has("join") && !foldedIds.has("join");
  const functionOpen = showFunctionBuilder && chosen.has("function") && !foldedIds.has("function");
  const summarizeOpen = showSummarizeBuilder && chosen.has("summarize") && !foldedIds.has("summarize");
  const bucketOpen = chosen.has("bucket") && !foldedIds.has("bucket");
  const sampleOpen = chosen.has("sample") && !foldedIds.has("sample");
  const tradesJoin = joinMode === "trades";
  const liveJoin = joinMode === "live";
  const polymarketLiveJoin = joinMode === "polymarket-live";
  const polymarketFanoutJoin = joinMode === "polymarket-fanout";
  const fanoutJoin = joinMode === "fanout";
  const traderJoin = joinMode === "traders";
  const eventCandleJoin = joinMode === "event-candles";
  const traderPicked = traderJoinIds instanceof Set ? traderJoinIds : new Set();
  const traderChoices = Array.isArray(traderJoinChoices) && traderJoinChoices.length ? traderJoinChoices : KALSHI_TRADER_JOIN_KINDS;
  const traderKinds = traderChoices.map((item) => item.id).filter((id) => traderPicked.has(id));
  const traderKindTitles = traderChoices.filter((item) => traderPicked.has(item.id)).map((item) => item.title);
  const eventExtra = eventExtraJoinIds || new Set();
  const eventExtraOn = joinMode === "events" && (eventExtra.has("candlesticks") || eventExtra.has("forecast"));
  const forecastPicked = forecastJoinIds instanceof Set ? forecastJoinIds : new Set();
  const forecastJoin = joinMode === "forecast";
  const forecastJoinOn =
    forecastJoin && (forecastPicked.has("events") || forecastPicked.has("candlesticks") || forecastPicked.has("markets"));
  const seriesJoin = joinMode === "series" || joinMode === "events";
  const listNoun = joinMode === "events" ? "event" : "series";
  const listPlural = joinMode === "events" ? "events" : "series";
  const scopeJoinId = joinMode === "events" ? "kalshiLiveEventMarkets" : "kalshiLiveSeriesMarkets";
  const seriesMarketsOn = seriesJoin && joinTarget === scopeJoinId;
  const eventCandlesOn = joinMode === "events" && eventExtra.has("candlesticks");
  const eventForecastOn = joinMode === "events" && eventExtra.has("forecast");
  // Kalshi returns one candle series per market, so candles always land one tab per market.
  const layoutCombinable = seriesMarketsOn || eventForecastOn;
  const layoutSheetOn = seriesMarketLayout === "sheet" || !layoutCombinable;
  const layoutChoices =
    seriesMarketsOn || eventExtraOn ? (
      <>
        <button
          type="button"
          aria-pressed={layoutSheetOn}
          onClick={() => onSeriesMarketLayout?.("sheet")}
          className={choiceClass(layoutSheetOn)}
        >
          <span className="text-[13px] font-semibold text-foreground">
            {eventCandlesOn ? "Sheet per market" : `Sheet per ${listNoun}`}
          </span>
          <span className="text-[11px] font-normal text-muted-foreground">
            {eventCandlesOn
              ? `Each market gets its own Candlesticks tab${seriesMarketsOn ? ", after its event's Markets tab" : ""}.${
                  eventForecastOn ? " Each event gets its own forecast tab." : ""
                }`
              : eventExtraOn && !seriesMarketsOn
                ? `Each ${listNoun} gets its own tab.`
                : `Each ${listNoun} gets its own Markets tab.`}
          </span>
        </button>
        {layoutCombinable ? (
          <button
            type="button"
            aria-pressed={seriesMarketLayout === "combined"}
            onClick={() => onSeriesMarketLayout?.("combined")}
            className={choiceClass(seriesMarketLayout === "combined")}
          >
            <span className="text-[13px] font-semibold text-foreground">One sheet</span>
            <span className="text-[11px] font-normal text-muted-foreground">
              {seriesMarketsOn && eventForecastOn
                ? `Markets and forecasts from every ${listNoun} land on one tab each.`
                : seriesMarketsOn
                  ? `Markets from every ${listNoun} land on one tab.`
                  : `Every ${listNoun} lands on one tab.`}
              {eventCandlesOn ? " Candles stay one tab per market." : ""}
            </span>
          </button>
        ) : null}
      </>
    ) : null;
  const liveSelected = liveJoinIds instanceof Set ? liveJoinIds : new Set();
  const downstreamSelected = downstreamJoinIds instanceof Set ? downstreamJoinIds : new Set();
  const holderTraderSelected = holderTraderJoinIds instanceof Set ? holderTraderJoinIds : new Set();
  const downstreamList = Array.isArray(downstreamChoices) ? downstreamChoices : [];
  const joinChoices = Array.isArray(liveJoinChoices) && liveJoinChoices.length ? liveJoinChoices : KALSHI_LIVE_MARKET_JOINS;
  const liveJoinTitles = joinChoices.filter((item) => liveSelected.has(item.id)).map((item) => item.title);
  const parentPicks = fanoutParents instanceof Set ? fanoutParents : new Set();
  const detectedSelected = detectedJoinIds instanceof Set ? detectedJoinIds : new Set();
  const polymarketJoin = joinLake === "polymarket";
  const tradesTarget = polymarketJoin ? "polymarketHistoricalTrades" : "kalshiHistoricalTrades";
  const marketsTarget = polymarketJoin ? "polymarketHistoricalMarkets" : "kalshiHistoricalMarkets";
  const venueName = polymarketJoin ? "Polymarket" : "Kalshi";
  const rowNoun = polymarketJoin ? "market" : "ticker";
  const matchNoun = polymarketJoin ? "outcome token" : "ticker";
  const marketTargetOn = joinTarget === marketsTarget;
  const hiddenMarketColumns = marketColumnHidden || new Set();
  const selectedMarketCount = marketColumns.filter((column) => !hiddenMarketColumns.has(column.id)).length;
  const queryRowCount = typeof queryRows === "number" ? queryRows : sheetCount;
  return (
    <>
      <div className="px-4 pb-3 pt-4 pr-12">
        <h2 className="text-[15px] font-semibold text-foreground">Enrich your data</h2>
        <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
          Add steps on top of this pull. You can combine them. The preview stays on the rows you queried.
        </p>
      </div>
      <fieldset className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 pb-4">
        <legend className="sr-only">Enrichment</legend>
        {ENRICH_OPTIONS.map((option) => {
          const selected = chosen.has(option.id);
          const isJoin = option.id === "join";
          const isFunction = option.id === "function";
          const isSummarize = option.id === "summarize";
          const isBucket = option.id === "bucket";
          const isSample = option.id === "sample";
          if (option.comingSoon) {
            return (
              <div key={option.id} className="flex items-center gap-1.5">
                <div
                  aria-disabled="true"
                  className="flex min-w-0 flex-1 cursor-not-allowed items-center gap-2.5 rounded-lg border border-border/70 bg-background px-2.5 py-2 text-[13px] font-semibold text-muted-foreground"
                >
                  <span className="size-3.5 shrink-0 rounded-[3px] border border-border" />
                  <span className="min-w-0 flex-1">{option.title}</span>
                  <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">Coming soon</span>
                </div>
              </div>
            );
          }
          const hoverOn = selected
            ? undefined
            : isFunction
              ? () => onHoverFunction(true)
              : isSummarize
                ? () => onHoverSummarize(true)
                : isBucket
                  ? () => onHoverBucket(true)
                  : isSample
                    ? () => onHoverSample(true)
                    : undefined;
          const hoverOff = isFunction
            ? () => onHoverFunction(false)
            : isSummarize
              ? () => onHoverSummarize(false)
              : isBucket
                ? () => onHoverBucket(false)
                : isSample
                  ? () => onHoverSample(false)
                  : undefined;
          const folded = selected && foldedIds.has(option.id);
          const lines = isBucket
            ? bucketItems.map((item) => bucketBlurb(item, bucketColumns))
            : isFunction
              ? functionItems.map((item, index) => {
                  const where = functionTables.find((table) => table.id === item.target)?.title;
                  const equation = item.formula.trim() || "No equation yet";
                  return where ? `${functionColumnTitle(index)} · ${where} · ${equation}` : `${functionColumnTitle(index)} · Choose a sheet`;
                })
              : isSummarize
                ? summaryLines
                : isJoin
                  ? [
                      fanoutJoin
                        ? [
                            parentPicks.has("market") ? "Parent market" : "",
                            parentPicks.has("series") ? "Parent series" : "",
                            ...liveJoinTitles,
                          ].filter(Boolean).join(", ") || "Choose what to join"
                        : liveJoin || polymarketLiveJoin || polymarketFanoutJoin || eventCandleJoin
                        ? liveJoinTitles.length
                          ? liveJoinTitles.join(", ")
                          : "Choose a source to join"
                        : joinTarget
                          ? tradesJoin && marketTargetOn
                            ? `Markets · ${joinPlacement === "sheet" ? "separate sheet" : joinPlacement === "merge" ? "onto each trade" : "choose where columns go"} · ${selectedMarketCount} columns`
                            : `${venueName} Historical Trades`
                          : "Choose a table to join",
                    ]
                  : isSample
                    ? [`${sampleSize || "…"} ${sampleMode} rows`]
                    : [];
          return (
            <div
              key={option.id}
              onMouseEnter={!selected && isJoin ? () => onHoverJoin(true) : undefined}
              onMouseLeave={isJoin ? () => onHoverJoin(false) : undefined}
            >
              <div className="flex items-center gap-1.5" onMouseEnter={hoverOn} onMouseLeave={hoverOff}>
              <label
                className={cn(
                  "flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 rounded-lg border px-2.5 py-2 text-[13px] font-semibold transition-colors",
                  selected
                    ? "border-[#0d99ff]/40 bg-[#0d99ff]/10 text-[#0d99ff]"
                    : "border-border/70 bg-background text-foreground hover:bg-muted/50",
                )}
              >
                <span
                  className={cn(
                    "relative inline-flex size-3.5 shrink-0 items-center justify-center rounded-[3px] border",
                    selected ? "border-[#0d99ff] bg-[#0d99ff]" : "border-border bg-background",
                  )}
                >
                  <input
                    type="checkbox"
                    value={option.id}
                    checked={selected}
                    onChange={() => onPick(option.id)}
                    className="absolute inset-0 cursor-pointer opacity-0"
                  />
                  <Check className={cn("size-2.5 text-white", selected ? "opacity-100" : "opacity-0")} strokeWidth={3} />
                </span>
                {option.title}
              </label>
              {selected ? (
                <button
                  type="button"
                  aria-expanded={!folded}
                  aria-label={folded ? `Expand ${option.title}` : `Collapse ${option.title}`}
                  onClick={() => onToggleFold(option.id)}
                  className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-border/70 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                >
                  <ChevronDown className={cn("size-3.5 transition-transform", folded ? "-rotate-90" : "rotate-0")} />
                </button>
              ) : null}
              {isFunction || isSummarize ? (
                <button
                  type="button"
                  aria-label="Functions we support"
                  onClick={onFunctionHelp}
                  className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-border/70 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                >
                  <Info className="size-3.5" />
                </button>
              ) : null}
              </div>
              {folded && lines.length ? (
                <div className="mt-1 space-y-0.5 px-1">
                  {lines.map((line, index) => (
                    <p key={`${option.id}-${index}`} className="truncate text-[11px] leading-relaxed text-muted-foreground">
                      {line}
                    </p>
                  ))}
                </div>
              ) : null}
              {isJoin ? (
                <div
                  className={cn(
                    "grid transition-[grid-template-rows,opacity] duration-300 ease-out",
                    joinOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                  )}
                >
                  <div className={cn("overflow-hidden", joinOpen ? "" : "pointer-events-none")}>
                    <div className="mt-2 rounded-lg border border-border/70 px-2.5 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[11px] font-semibold text-foreground">Join to</p>
                        <button
                          type="button"
                          onClick={onClear}
                          className="text-[11px] font-medium text-muted-foreground hover:text-foreground"
                        >
                          Clear
                        </button>
                      </div>
                      {fanoutJoin ? (
                        <div className="mt-1.5 space-y-3">
                          <div className="space-y-1.5">
                            <button
                              type="button"
                              aria-pressed={parentPicks.has("market")}
                              onClick={() => onToggleFanoutParent?.("market")}
                              className={choiceClass(parentPicks.has("market"))}
                            >
                              <span className="text-[13px] font-semibold text-foreground">Parent market</span>
                              <span className="text-[11px] font-normal text-muted-foreground">Metadata for this market.</span>
                            </button>
                            <button
                              type="button"
                              aria-pressed={parentPicks.has("series")}
                              onClick={() => onToggleFanoutParent?.("series")}
                              className={choiceClass(parentPicks.has("series"))}
                            >
                              <span className="text-[13px] font-semibold text-foreground">Parent series</span>
                              <span className="text-[11px] font-normal text-muted-foreground">The series this market belongs to.</span>
                            </button>
                            {parentPicks.has("series") && fanoutSeriesMissing ? (
                              <p className="text-[11px] leading-relaxed text-muted-foreground">This market is not part of a series.</p>
                            ) : null}
                            {parentPicks.has("series") && !fanoutSeriesReady && !fanoutSeriesMissing ? (
                              <p className="text-[11px] leading-relaxed text-muted-foreground">Looking up this series.</p>
                            ) : null}
                            {parentPicks.has("series") && fanoutSeriesReady ? (
                              <button
                                type="button"
                                aria-pressed={fanoutSeriesMarkets}
                                onClick={() => onToggleFanoutSeriesMarkets?.()}
                                className={choiceClass(fanoutSeriesMarkets)}
                              >
                                <span className="text-[13px] font-semibold text-foreground">Markets in this series</span>
                                <span className="text-[11px] font-normal text-muted-foreground">Metadata for every market in this series.</span>
                              </button>
                            ) : null}
                          </div>
                          {fanoutMarketsDetected ? (
                            <div className="border-t border-border/70 pt-3">
                              <p className="text-[11px] font-semibold text-foreground">Market detected</p>
                              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                                Trades, order book, or candlesticks for the other markets in this series.
                              </p>
                              <div className="mt-1.5">
                                <LiveJoinList
                                  choices={KALSHI_LIVE_MARKET_JOINS}
                                  selected={detectedSelected}
                                  onToggle={onToggleDetectedJoin}
                                  windows={joinWindows}
                                  onWindow={onJoinWindow}
                                  life={joinLife}
                                  perMarket={joinPerMarket}
                                />
                              </div>
                            </div>
                          ) : null}
                          {joinChoices.length ? (
                            <div className="border-t border-border/70 pt-3">
                              <p className="text-[11px] font-semibold text-foreground">Also on this market</p>
                              <div className="mt-1.5">
                                <LiveJoinList
                                  choices={joinChoices}
                                  selected={liveSelected}
                                  onToggle={onToggleLiveJoin}
                                  windows={joinWindows}
                                  onWindow={onJoinWindow}
                                  life={joinLife}
                                  perMarket={joinPerMarket}
                                />
                              </div>
                            </div>
                          ) : null}
                        </div>
                      ) : traderJoin ? (
                        <div className="mt-1.5 space-y-1.5">
                          {traderChoices.map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              aria-pressed={traderPicked.has(item.id)}
                              onClick={() => onToggleTraderJoin?.(item.id)}
                              className={choiceClass(traderPicked.has(item.id))}
                            >
                              <span className="text-[13px] font-semibold text-foreground">{item.title}</span>
                              <span className="text-[11px] font-normal text-muted-foreground">{item.detail}</span>
                            </button>
                          ))}
                          {traderKinds.length ? (
                            <>
                              <button
                                type="button"
                                aria-pressed={seriesMarketLayout === "sheet"}
                                onClick={() => onSeriesMarketLayout?.("sheet")}
                                className={cn(
                                  "flex w-full flex-col rounded-lg border px-2.5 py-2 text-left transition-colors",
                                  seriesMarketLayout === "sheet"
                                    ? "border-[#0d99ff]/40 bg-[#0d99ff]/10"
                                    : "border-border/70 bg-background hover:bg-muted/50",
                                )}
                              >
                                <span className="text-[13px] font-semibold text-foreground">Sheet per trader</span>
                                <span className="text-[11px] font-normal text-muted-foreground">Each trader gets their own tab.</span>
                              </button>
                              <button
                                type="button"
                                aria-pressed={seriesMarketLayout === "combined"}
                                onClick={() => onSeriesMarketLayout?.("combined")}
                                className={cn(
                                  "flex w-full flex-col rounded-lg border px-2.5 py-2 text-left transition-colors",
                                  seriesMarketLayout === "combined"
                                    ? "border-[#0d99ff]/40 bg-[#0d99ff]/10"
                                    : "border-border/70 bg-background hover:bg-muted/50",
                                )}
                              >
                                <span className="text-[13px] font-semibold text-foreground">One sheet</span>
                                <span className="text-[11px] font-normal text-muted-foreground">Every trader lands on one tab.</span>
                              </button>
                            </>
                          ) : null}
                          <p className="pt-1 text-[11px] leading-relaxed text-muted-foreground">
                            {traderKinds.length
                              ? `${queryRowCount.toLocaleString()} ${queryRowCount === 1 ? "row" : "rows"} in this pull. ${
                                  seriesMarketLayout === "combined"
                                    ? traderKindTitles.length > 1
                                      ? `${listPhrase(traderKindTitles)} each land on their own sheet.`
                                      : `One ${traderKindTitles[0]} sheet.`
                                    : traderKindTitles.length > 1
                                      ? `Each trader gets ${listPhrase(traderKindTitles)} sheets.`
                                      : `Each trader gets a ${traderKindTitles[0]} sheet.`
                                } The preview shows the first trader.`
                              : `${listPhrase(traderChoices.map((item) => item.title))} can be joined together. Each one is its own sheet. Kalshi shares no PnL history or activity feed.`}
                            <span className="mt-2 block">
                              Your plan allows {marketCap.toLocaleString()} sheet pulls at once.
                            </span>
                          </p>
                          {marketsDetected ? (
                            <div className="border-t border-border/70 pt-3">
                              <p className="text-[11px] font-semibold text-foreground">Market Detected</p>
                              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                                Join the markets these traders hold or traded to their Trades, Orderbook, Candlesticks or Public traders.
                              </p>
                              <div className="mt-1.5 flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={onSelectAllLiveJoins}
                                  className="inline-flex rounded-full border border-border/70 bg-background px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted/50"
                                >
                                  {liveSelected.size === KALSHI_LIVE_MARKET_JOINS.length ? "Deselect all" : "Select all"}
                                </button>
                              </div>
                              <div className="mt-1.5">
                                <LiveJoinList
                                  choices={KALSHI_LIVE_MARKET_JOINS}
                                  selected={liveSelected}
                                  onToggle={onToggleLiveJoin}
                                  windows={joinWindows}
                                  onWindow={onJoinWindow}
                                  life={joinLife}
                                  perMarket={joinPerMarket}
                                />
                              </div>
                            </div>
                          ) : null}
                        </div>
                      ) : eventCandleJoin ? (
                        <div className="mt-1.5 space-y-1.5">
                          <p className="text-[11px] font-semibold text-foreground">Markets detected</p>
                          <p className="text-[11px] leading-relaxed text-muted-foreground">
                            {queryRowCount
                              ? `${queryRowCount.toLocaleString()} ${queryRowCount === 1 ? "market" : "markets"} in this pull. Join them to their Trades, Orderbook or Candlesticks. Each market gets its own sheet.`
                              : "Join the markets in each event to their Trades, Orderbook or Candlesticks. Each market gets its own sheet."}
                          </p>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={onSelectAllLiveJoins}
                              className="inline-flex rounded-full border border-border/70 bg-background px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted/50"
                            >
                              {liveSelected.size === KALSHI_LIVE_MARKET_JOINS.length ? "Deselect all" : "Select all"}
                            </button>
                          </div>
                          <LiveJoinList
                            choices={KALSHI_LIVE_MARKET_JOINS}
                            selected={liveSelected}
                            onToggle={onToggleLiveJoin}
                            windows={joinWindows}
                            onWindow={onJoinWindow}
                            life={joinLife}
                            perMarket={joinPerMarket}
                          />
                          {marketCap && queryRowCount > marketCap ? (
                            <p className="text-[11px] leading-relaxed text-muted-foreground">
                              Joins cover the first {marketCap.toLocaleString()} markets.
                            </p>
                          ) : null}
                        </div>
                      ) : forecastJoin ? (
                        <div className="mt-1.5 space-y-1.5">
                          {[
                            ["events", "Events", "The event record for each selected event."],
                            ["candlesticks", "Event candlesticks", "Candles for the markets inside each event."],
                            ["markets", "Markets", "Every market inside each selected event."],
                          ].map(([id, title, detail]) => (
                            <div key={id}>
                              <button
                                type="button"
                                aria-pressed={forecastPicked.has(id)}
                                onClick={() => onToggleForecastJoin?.(id)}
                                className={choiceClass(forecastPicked.has(id))}
                              >
                                <span className="text-[13px] font-semibold text-foreground">{title}</span>
                                <span className="text-[11px] font-normal text-muted-foreground">{detail}</span>
                              </button>
                              {id === "candlesticks" && forecastPicked.has("candlesticks") ? (
                                <div className="mt-1.5 rounded-lg border border-border/70 px-2 py-2">
                                  <JoinSourceFields
                                    tableId="event_candlesticks"
                                    filters={joinWindows?.event_candlesticks || defaultDirectAttributeFilters("candlesticks")}
                                    onChange={(next) => onJoinWindow?.("event_candlesticks", next)}
                                  />
                                </div>
                              ) : null}
                            </div>
                          ))}
                          {forecastJoinOn ? (
                            <>
                              <button
                                type="button"
                                aria-pressed={seriesMarketLayout === "sheet"}
                                onClick={() => onSeriesMarketLayout?.("sheet")}
                                className={choiceClass(seriesMarketLayout === "sheet")}
                              >
                                <span className="text-[13px] font-semibold text-foreground">Sheet per event</span>
                                <span className="text-[11px] font-normal text-muted-foreground">Each event gets its own tab.</span>
                              </button>
                              <button
                                type="button"
                                aria-pressed={seriesMarketLayout === "combined"}
                                onClick={() => onSeriesMarketLayout?.("combined")}
                                className={choiceClass(seriesMarketLayout === "combined")}
                              >
                                <span className="text-[13px] font-semibold text-foreground">One sheet</span>
                                <span className="text-[11px] font-normal text-muted-foreground">Every event lands on one tab for each join.</span>
                              </button>
                              <p className="text-[11px] leading-relaxed text-muted-foreground">
                                {queryRowCount.toLocaleString()} {queryRowCount === 1 ? "event" : "events"} in this pull. The preview shows the first event.
                              </p>
                              {forecastPicked.has("markets") && marketsDetected ? (
                                <div className="border-t border-border/70 pt-3">
                                  <p className="text-[11px] font-semibold text-foreground">Market Detected</p>
                                  <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                                    Join the markets you just pulled to their Trades, Orderbook or Candlesticks.
                                  </p>
                                  <div className="mt-1.5 flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={onSelectAllLiveJoins}
                                      className="inline-flex rounded-full border border-border/70 bg-background px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted/50"
                                    >
                                      {liveSelected.size === KALSHI_LIVE_MARKET_JOINS.length ? "Deselect all" : "Select all"}
                                    </button>
                                  </div>
                                  <div className="mt-1.5">
                                    <LiveJoinList
                                      choices={KALSHI_LIVE_MARKET_JOINS}
                                      selected={liveSelected}
                                      onToggle={onToggleLiveJoin}
                                      windows={joinWindows}
                                      onWindow={onJoinWindow}
                                  life={joinLife}
                                  perMarket={joinPerMarket}
                                    />
                                  </div>
                                </div>
                              ) : null}
                            </>
                          ) : (
                            <p className="text-[11px] leading-relaxed text-muted-foreground">
                              Join the selected events to their event record, candlesticks, or markets.
                            </p>
                          )}
                        </div>
                      ) : seriesJoin ? (
                        <div className="mt-1.5 space-y-1.5">
                          <button
                            type="button"
                            aria-pressed={seriesMarketsOn}
                            onClick={() => onJoinTarget(scopeJoinId)}
                            className={cn(
                              "flex w-full flex-col rounded-lg border px-2.5 py-2 text-left transition-colors",
                              seriesMarketsOn
                                ? "border-[#0d99ff]/40 bg-[#0d99ff]/10"
                                : "border-border/70 bg-background hover:bg-muted/50",
                            )}
                          >
                            <span className="text-[13px] font-semibold text-foreground">Markets</span>
                            <span className="text-[11px] font-normal text-muted-foreground">
                              Every market inside the {listPlural} in this pull.
                            </span>
                          </button>
                          {joinMode === "events" ? (
                            <>
                              <button
                                type="button"
                                aria-pressed={eventExtra.has("candlesticks")}
                                onClick={() => onToggleEventExtraJoin?.("candlesticks")}
                                className={choiceClass(eventExtra.has("candlesticks"))}
                              >
                                <span className="text-[13px] font-semibold text-foreground">Event candlesticks</span>
                                <span className="text-[11px] font-normal text-muted-foreground">
                                  Each event&apos;s markets first, then a candlestick sheet for every market in it.
                                </span>
                              </button>
                              {eventExtra.has("candlesticks") ? (
                                <div className="rounded-lg border border-border/70 px-2 py-2">
                                  <JoinSourceFields
                                    tableId="event_candlesticks"
                                    filters={joinWindows?.event_candlesticks || defaultDirectAttributeFilters("event_candlesticks")}
                                    onChange={(next) => onJoinWindow?.("event_candlesticks", next)}
                                  />
                                </div>
                              ) : null}
                              {eventCandlesOn ? layoutChoices : null}
                              <button
                                type="button"
                                aria-pressed={eventExtra.has("forecast")}
                                onClick={() => onToggleEventExtraJoin?.("forecast")}
                                className={choiceClass(eventExtra.has("forecast"))}
                              >
                                <span className="text-[13px] font-semibold text-foreground">Event forecasts</span>
                                <span className="text-[11px] font-normal text-muted-foreground">
                                  Forecast percentiles for each event with a numeric outcome, after that event&apos;s other sheets.
                                </span>
                              </button>
                              {eventExtra.has("forecast") ? (
                                <div className="rounded-lg border border-border/70 px-2 py-2">
                                  <JoinSourceFields
                                    tableId="event_forecast"
                                    filters={joinWindows?.event_forecast || defaultJoinWindowFilters("event_forecast")}
                                    onChange={(next) => onJoinWindow?.("event_forecast", next)}
                                    lifeWindows
                                  />
                                </div>
                              ) : null}
                            </>
                          ) : null}
                          {seriesMarketsOn || eventExtraOn ? (
                            <>
                              {eventCandlesOn ? null : layoutChoices}
                              <p className="text-[11px] leading-relaxed text-muted-foreground">
                                {queryRowCount.toLocaleString()} {queryRowCount === 1 ? listNoun : listPlural} in this pull.
                                {seriesMarketLayout === "combined" && (seriesMarketsOn || eventExtra.has("forecast"))
                                  ? seriesMarketsOn
                                    ? " One Markets sheet."
                                    : " One sheet for each join."
                                  : seriesMarketsOn
                                    ? ` ${sheetCount.toLocaleString()} Markets ${sheetCount === 1 ? "sheet" : "sheets"}.`
                                    : " The preview shows the first event."}
                                {eventExtra.has("forecast") ? " Events Kalshi has no forecast for are skipped." : ""}
                              </p>
                              {marketsDetected ? (
                              <div className="border-t border-border/70 pt-3">
                                <p className="text-[11px] font-semibold text-foreground">Market Detected</p>
                                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                                  Join the markets you just pulled to their Trades, Orderbook or Candlesticks.
                                </p>
                                <div className="mt-1.5 flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={onSelectAllLiveJoins}
                                    className="inline-flex rounded-full border border-border/70 bg-background px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted/50"
                                  >
                                    {liveSelected.size === KALSHI_LIVE_MARKET_JOINS.length ? "Deselect all" : "Select all"}
                                  </button>
                                </div>
                                <div className="mt-1.5">
                                  <LiveJoinList
                                    choices={KALSHI_LIVE_MARKET_JOINS}
                                    selected={liveSelected}
                                    onToggle={onToggleLiveJoin}
                                    windows={joinWindows}
                                    onWindow={onJoinWindow}
                                  life={joinLife}
                                  perMarket={joinPerMarket}
                                  />
                                </div>
                              </div>
                              ) : null}
                            </>
                          ) : (
                            <p className="text-[11px] leading-relaxed text-muted-foreground">
                              {joinMode === "events"
                                ? "Join these events to their markets, candlesticks, or forecasts."
                                : "Join these series to the markets inside them."}
                            </p>
                          )}
                        </div>
                      ) : polymarketFanoutJoin || polymarketLiveJoin ? (
                        <div className="mt-1.5 space-y-3">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={onSelectAllLiveJoins}
                              className="inline-flex rounded-full border border-border/70 bg-background px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted/50"
                            >
                              {joinChoices.length > 0 && joinChoices.every((item) => liveSelected.has(item.id)) ? "Deselect all" : "Select all"}
                            </button>
                          </div>
                          {polymarketFanoutJoin ? (
                            <PolymarketJoinChoices
                              choices={joinChoices.filter((item) => item.id === "parent-market")}
                              selected={liveSelected}
                              onToggle={onToggleLiveJoin}
                            />
                          ) : null}
                          {polymarketFanoutJoin && joinChoices.some((item) => item.id !== "parent-market") ? (
                            <div className="border-t border-border/70 pt-3">
                              <p className="text-[11px] font-semibold text-foreground">Also on this market</p>
                              <div className="mt-1.5">
                                <PolymarketJoinChoices
                                  choices={joinChoices.filter((item) => item.id !== "parent-market")}
                                  selected={liveSelected}
                                  onToggle={onToggleLiveJoin}
                                />
                              </div>
                            </div>
                          ) : null}
                          {polymarketLiveJoin ? (
                            <PolymarketJoinChoices choices={joinChoices} selected={liveSelected} onToggle={onToggleLiveJoin} />
                          ) : null}
                          {downstreamOpen && downstreamList.length ? (
                            <div className="border-t border-border/70 pt-3">
                              <p className="text-[11px] font-semibold text-foreground">Join these markets</p>
                              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                                {joinChoices.some((item) => item.anchor === "event")
                                  ? "Each event’s markets can join to market metadata, trades, the order book, prices, and top holders."
                                  : "Positions and activity name markets. Join them to market metadata, trades, the order book, prices, and top holders."}
                              </p>
                              <div className="mt-1.5 flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={onSelectAllDownstream}
                                  className="inline-flex rounded-full border border-border/70 bg-background px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted/50"
                                >
                                  {downstreamList.every((item) => downstreamSelected.has(item.id)) ? "Deselect all" : "Select all"}
                                </button>
                              </div>
                              <div className="mt-1.5">
                                <PolymarketJoinChoices
                                  choices={downstreamList}
                                  selected={downstreamSelected}
                                  onToggle={onToggleDownstreamJoin}
                                />
                              </div>
                            </div>
                          ) : null}
                          {holderTraderOpen && holderTraderChoices.length ? (
                            <div className="border-t border-border/70 pt-3">
                              <p className="text-[11px] font-semibold text-foreground">Join these holders</p>
                              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                                Top holders name traders. Join them to a profile, positions, PnL, and activity. Each trader gets a sheet. The preview shows the first.
                              </p>
                              <div className="mt-1.5">
                                <PolymarketJoinChoices
                                  choices={holderTraderChoices}
                                  selected={holderTraderSelected}
                                  onToggle={onToggleHolderTrader}
                                />
                              </div>
                            </div>
                          ) : null}
                          {joinChoices.some((item) => item.placement === "market-choice" && liveSelected.has(item.id)) ||
                          downstreamList.some((item) => item.placement === "market-choice" && downstreamSelected.has(item.id)) ? (
                            <div>
                              <p className="text-[11px] font-semibold text-foreground">Market metadata</p>
                              <button
                                type="button"
                                aria-pressed={traderMarketLayout === "merge"}
                                onClick={() => onTraderMarketLayout?.("merge")}
                                className={cn("mt-1.5", choiceClass(traderMarketLayout === "merge"))}
                              >
                                <span className="text-[13px] font-semibold text-foreground">
                                  {downstreamOpen ? "Onto the positions sheet" : "Onto this sheet"}
                                </span>
                                <span className="text-[11px] font-normal text-muted-foreground">
                                  {downstreamOpen
                                    ? "Market columns merge onto the positions and activity rows."
                                    : "Market columns merge onto the rows in this pull."}
                                </span>
                              </button>
                              <button
                                type="button"
                                aria-pressed={traderMarketLayout === "sheet"}
                                onClick={() => onTraderMarketLayout?.("sheet")}
                                className={cn("mt-1.5", choiceClass(traderMarketLayout === "sheet"))}
                              >
                                <span className="text-[13px] font-semibold text-foreground">Separate markets sheet</span>
                                <span className="text-[11px] font-normal text-muted-foreground">
                                  {downstreamOpen
                                    ? "One sheet per market. The preview shows the first."
                                    : "One Markets sheet. The preview shows the first market."}
                                </span>
                              </button>
                            </div>
                          ) : null}
                          <p className="text-[11px] leading-relaxed text-muted-foreground">
                              {joinChoices.some((item) => item.anchor === "trader")
                              ? "Profile columns merge onto this sheet. Positions, PnL, activity, and market sources each get their own sheet. The preview shows the first sheet, 50 rows. The other sheets are viewable when you hit Save and run. A limit on this pull only shortens this sheet. Each joined sheet uses your plan row limit."
                              : joinChoices.some((item) => item.anchor === "series")
                                ? "Each series gets its own events sheet. Those events can join onward to their markets and live volume, and those markets can join to trades, prices, and holders. The preview shows the first series."
                              : joinChoices.some((item) => item.anchor === "event")
                                ? "Live volume merges onto this sheet. Each event’s markets get their own sheet, and those markets can join onward to trades, prices, holders, and trader pulls. The preview shows the first event."
                              : queryRowCount
                                ? `You have ${queryRowCount.toLocaleString()} ${queryRowCount === 1 ? "market" : "markets"} in this pull. Each one gets its own sheet for every source you join. The preview shows the first market.`
                                : "Pull a market first. Each joined source becomes its own sheet for that market."}
                            <span className="mt-2 block">
                              {joinChoices.some((item) => item.anchor === "trader")
                                ? `Your plan builds ${marketCap.toLocaleString()} of these sheets at once.`
                                : `Your plan allows ${marketCap.toLocaleString()} sheet pulls at once.`}
                            </span>
                          </p>
                        </div>
                      ) : liveJoin ? (
                        <div className="mt-1.5 space-y-1.5">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={onSelectAllLiveJoins}
                              className="inline-flex rounded-full border border-border/70 bg-background px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted/50"
                            >
                              {liveSelected.size === KALSHI_LIVE_MARKET_JOINS.length ? "Deselect all" : "Select all"}
                            </button>
                          </div>
                          <LiveJoinList
                            choices={KALSHI_LIVE_MARKET_JOINS}
                            selected={liveSelected}
                            onToggle={onToggleLiveJoin}
                            windows={joinWindows}
                            onWindow={onJoinWindow}
                                  life={joinLife}
                                  perMarket={joinPerMarket}
                          />
                          <p className="pt-1 text-[11px] leading-relaxed text-muted-foreground">
                            You have {queryRowCount.toLocaleString()} {queryRowCount === 1 ? "market" : "markets"} in this pull. Your plan joins{" "}
                            {marketCap.toLocaleString()} at a time, and each one gets its own sheet for every source you pick. The preview shows the first market.
                            <span className="mt-2 block">Candlesticks stop at Kalshi&apos;s 5,000 one-minute candles per market.</span>
                          </p>
                        </div>
                      ) : tradesJoin ? (
                        <button
                          type="button"
                          aria-pressed={marketTargetOn}
                          onClick={() => onJoinTarget(marketsTarget)}
                          className={cn(
                            "mt-1.5 flex w-full flex-col rounded-lg border px-2.5 py-2 text-left transition-colors",
                            marketTargetOn
                              ? "border-[#0d99ff]/40 bg-[#0d99ff]/10"
                              : "border-border/70 bg-background hover:bg-muted/50",
                          )}
                        >
                          <span className="text-[13px] font-semibold text-foreground">{venueName} Historical Markets</span>
                          <span className="text-[11px] font-normal text-muted-foreground">
                            Market metadata for each {rowNoun} in this query.
                          </span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          aria-pressed={joinTarget === tradesTarget}
                          onClick={() => onJoinTarget(tradesTarget)}
                          className={cn(
                            "mt-1.5 flex w-full flex-col rounded-lg border px-2.5 py-2 text-left transition-colors",
                            joinTarget === tradesTarget
                              ? "border-[#0d99ff]/40 bg-[#0d99ff]/10"
                              : "border-border/70 bg-background hover:bg-muted/50",
                          )}
                        >
                          <span className="text-[13px] font-semibold text-foreground">{venueName} Historical Trades</span>
                          <span className="text-[11px] font-normal text-muted-foreground">Fills for each market in this query.</span>
                        </button>
                      )}
                      {tradesJoin && marketTargetOn ? (
                        <div className="mt-3 space-y-3">
                          <div>
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-[11px] font-semibold text-foreground">Market columns</p>
                              <span className="text-[11px] font-normal text-muted-foreground">
                                {selectedMarketCount} of {marketColumns.length}
                              </span>
                            </div>
                            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                              Choose the market attributes to bring in. Each trade matches a market on {matchNoun}.
                            </p>
                            <div className="mt-2 flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={onMarketColumnsAll}
                                className="inline-flex rounded-full border border-border/70 bg-background px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted/50"
                              >
                                Select all
                              </button>
                              <button
                                type="button"
                                onClick={onMarketColumnsNone}
                                className="inline-flex rounded-full border border-border/70 bg-background px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted/50"
                              >
                                Deselect all
                              </button>
                            </div>
                            <div className="mt-1.5 max-h-52 space-y-0.5 overflow-y-auto pr-1">
                              {marketColumns.map((column) => (
                                <ColumnOption
                                  key={column.id}
                                  column={column}
                                  checked={!hiddenMarketColumns.has(column.id)}
                                  onToggle={() => onToggleMarketColumn(column.id)}
                                />
                              ))}
                            </div>
                          </div>
                          <div>
                            <p className="text-[11px] font-semibold text-foreground">Add them as</p>
                            <button
                              type="button"
                              aria-pressed={joinPlacement === "sheet"}
                              onClick={() => onJoinPlacement("sheet")}
                              className={cn(
                                "mt-1.5 flex w-full flex-col rounded-lg border px-2.5 py-2 text-left transition-colors",
                                joinPlacement === "sheet"
                                  ? "border-[#0d99ff]/40 bg-[#0d99ff]/10"
                                  : "border-border/70 bg-background hover:bg-muted/50",
                              )}
                            >
                              <span className="text-[13px] font-semibold text-foreground">Separate sheet</span>
                              <span className="text-[11px] font-normal text-muted-foreground">
                                One new Markets tab, with one row for each {rowNoun}.
                              </span>
                            </button>
                            <button
                              type="button"
                              aria-pressed={joinPlacement === "merge"}
                              onClick={() => onJoinPlacement("merge")}
                              className={cn(
                                "mt-1.5 flex w-full flex-col rounded-lg border px-2.5 py-2 text-left transition-colors",
                                joinPlacement === "merge"
                                  ? "border-[#0d99ff]/40 bg-[#0d99ff]/10"
                                  : "border-border/70 bg-background hover:bg-muted/50",
                              )}
                            >
                              <span className="text-[13px] font-semibold text-foreground">Onto each trade</span>
                              <span className="text-[11px] font-normal text-muted-foreground">
                                Each fill picks up the market columns you selected.
                              </span>
                            </button>
                          </div>
                        </div>
                      ) : tradesJoin ? (
                        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                          You have {queryRowCount.toLocaleString()} {queryRowCount === 1 ? "row" : "rows"} in this trades query. Markets are matched by {matchNoun}.
                        </p>
                      ) : liveJoin || seriesJoin || fanoutJoin || traderJoin || forecastJoin || polymarketLiveJoin || polymarketFanoutJoin ? null : (
                        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                          You have {queryRowCount.toLocaleString()} {queryRowCount === 1 ? "row" : "rows"} in your markets query. So{" "}
                          {sheetCount.toLocaleString()} trade {sheetCount === 1 ? "sheet" : "sheets"} will be created for each market.
                          <span className="mt-2 block">
                            Your plan allows {marketCap.toLocaleString()} sheet pulls at once.
                          </span>
                          <a href="/checkout" className="mt-2 block font-medium text-[#0d99ff] underline-offset-2 hover:underline">
                            Upgrade to increase your limit.
                          </a>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ) : isFunction ? (
                <div
                  className={cn(
                    "grid transition-[grid-template-rows,opacity] duration-300 ease-out",
                    functionOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                  )}
                >
                  <div className={cn("overflow-hidden", functionOpen ? "" : "pointer-events-none")}>
                    {functionItems.map((item, index) => (
                      <div key={item.id} className="mt-2 rounded-lg border border-border/70 px-2.5 py-2" onClick={() => onFocusFunction(item.id)}>
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[11px] font-semibold text-foreground">{functionColumnTitle(index)}</p>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              if (functionItems.length > 1) onRemoveFunction(item.id);
                              else onClearFunction();
                            }}
                            className="text-[11px] font-medium text-muted-foreground hover:text-foreground"
                          >
                            {functionItems.length > 1 ? "Remove" : "Clear"}
                          </button>
                        </div>
                        <div className="mt-1.5 flex flex-col gap-1.5">
                          {functionTables.map((table) => (
                            <button
                              key={table.id}
                              type="button"
                              aria-pressed={item.target === table.id}
                              onClick={() => onFunctionTarget(item.id, table.id)}
                              className={cn(
                                "flex w-full flex-col rounded-lg border px-2.5 py-2 text-left transition-colors",
                                item.target === table.id
                                  ? "border-[#0d99ff]/40 bg-[#0d99ff]/10"
                                  : "border-border/70 bg-background hover:bg-muted/50",
                              )}
                            >
                              <span className="text-[13px] font-semibold text-foreground">{table.title}</span>
                              <span className="text-[11px] font-normal text-muted-foreground">{table.detail}</span>
                            </button>
                          ))}
                        </div>
                        {item.target ? (
                          <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                            {item.formula.trim() ? item.formula : "Type the equation in the column, like = Yes Price + No Price. Click a column or a cell to drop it in."}
                          </p>
                        ) : null}
                      </div>
                    ))}
                    <button type="button" onClick={onAddFunction} className="mt-2 text-[12px] font-medium text-[#0d99ff]">
                      Add another column
                    </button>
                    {functionScopeNote ? <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{functionScopeNote}</p> : null}
                  </div>
                </div>
              ) : isSummarize ? (
                <div
                  className={cn(
                    "grid transition-[grid-template-rows,opacity] duration-300 ease-out",
                    summarizeOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                  )}
                >
                  <div className={cn("overflow-hidden", summarizeOpen ? "" : "pointer-events-none")}>
                    <div className="mt-2 rounded-lg border border-border/70 px-2.5 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[11px] font-semibold text-foreground">Summary sheet</p>
                        <button
                          type="button"
                          onClick={onClearSummary}
                          className="text-[11px] font-medium text-muted-foreground hover:text-foreground"
                        >
                          Clear
                        </button>
                      </div>
                      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{summaryNote}</p>
                    </div>
                  </div>
                </div>
              ) : isBucket ? (
                <div
                  className={cn(
                    "grid transition-[grid-template-rows,opacity] duration-300 ease-out",
                    bucketOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                  )}
                >
                  <div className={cn("overflow-hidden", bucketOpen ? "" : "pointer-events-none")}>
                    {bucketItems.map((item, index) => (
                      <BucketEnrichPanel
                        key={item.id}
                        title={bucketItems.length > 1 ? `Bucket ${index + 1}` : "Bucket sheet"}
                        clearLabel={bucketItems.length > 1 ? "Remove" : "Clear"}
                        columns={bucketColumns}
                        bucketColumnId={item.columnId}
                        onBucketColumn={(columnId) => onBucketColumn(item.id, columnId)}
                        mode={item.mode}
                        onMode={(mode) => onBucketMode(item.id, mode)}
                        timeInterval={item.interval}
                        onTimeInterval={(interval) => onBucketInterval(item.id, interval)}
                        numericSize={item.numericSize}
                        onNumericSize={(size) => onBucketNumericSize(item.id, size)}
                        groupByIds={item.groupBy}
                        onToggleGroupBy={(columnId) => onToggleBucketGroup(item.id, columnId)}
                        metric={item.metric}
                        onMetric={(metric) => onBucketMetric(item.id, metric)}
                        valueColumnId={item.valueColumnId}
                        onValueColumn={(columnId) => onBucketValueColumn(item.id, columnId)}
                        onClear={() => (bucketItems.length > 1 ? onRemoveBucket(item.id) : onClearBucket())}
                      />
                    ))}
                    <button type="button" onClick={onAddBucket} className="mt-2 text-[12px] font-medium text-[#0d99ff]">
                      Add another bucket
                    </button>
                  </div>
                </div>
              ) : isSample ? (
                <div
                  className={cn(
                    "grid transition-[grid-template-rows,opacity] duration-300 ease-out",
                    sampleOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                  )}
                >
                  <div className={cn("overflow-hidden", sampleOpen ? "" : "pointer-events-none")}>
                    <SampleEnrichPanel
                      size={sampleSize}
                      onSize={onSampleSize}
                      mode={sampleMode}
                      onMode={onSampleMode}
                      error={sampleError}
                      onClear={onClearSample}
                    />
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </fieldset>
      <div className="flex items-center justify-between border-t border-border/70 px-4 py-3">
        <Button type="button" variant="outline" onClick={onBack}>
          Previous
        </Button>
        <Button
          type="button"
          disabled={running}
          onClick={onSaveAndRun}
          className="bg-[#0d99ff] text-white hover:bg-[#0d99ff]/90 disabled:opacity-60"
        >
          {running ? "Running…" : "Save and run"}
        </Button>
      </div>
    </>
  );
}

function formatSavedAt(savedAt) {
  const date = new Date(savedAt);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

/** Identity of the archive preview. Empty means the first unfiltered 50. */
function historicalPreviewRequestKey({ guidedFilters, columns, attributeFilters, sortKeys, integrationId, tableId }) {
  if (!guidedFilters || !columns?.length) return "";
  const predicates = buildAttributePredicates(columns, attributeFilters);
  if (!predicates.and.length && !predicates.or.length && !sortKeys.length) return "";
  return JSON.stringify({ integrationId, tableId, predicates, sortKeys });
}

function eventRelatedTitle(kind) {
  if (kind === "forecast") return "Event forecast";
  if (kind === "events") return "Events";
  if (kind === "markets") return "Markets";
  return "Event candlesticks";
}

function eventExtraSheetParts(previewSheet) {
  const sheet = String(previewSheet || "");
  if (!sheet.startsWith("event-extra:")) return null;
  const body = sheet.slice("event-extra:".length);
  const split = body.indexOf(":");
  const kind = split === -1 ? body : body.slice(0, split);
  const ticker = split === -1 ? "" : body.slice(split + 1);
  return { kind, ticker, key: `${kind}:${ticker || "combined"}` };
}

const KALSHI_TRADER_SOURCE_TITLES = {
  leaderboard: "Leaderboard",
  search_traders: "Traders",
  holder_profile: "Profile",
  holder_positions: "Positions",
  trades_by_holder: "Trades",
};

/** One trader join (profile, positions, or trades) for these nicknames, with the pull a replay needs. */
async function loadKalshiTraderJoin(kind, nicknames, limit) {
  const pull = { ...kalshiTraderJoinPullSpec(kind, ""), nicknames };
  const result = await loadKalshiLiveDirect(pull.table, { ...pull, limit });
  return { ...result, pull };
}

function traderJoinSheetParts(previewSheet) {
  const sheet = String(previewSheet || "");
  if (sheet !== "trader-join" && !sheet.startsWith("trader-join:")) return null;
  const body = sheet === "trader-join" ? "" : sheet.slice("trader-join:".length);
  const split = body.indexOf(":");
  const kind = !body ? "profile" : split === -1 ? body : body.slice(0, split);
  const name = split === -1 ? "" : body.slice(split + 1);
  return { kind, name, key: `${kind}:${name || "combined"}` };
}

/** Polymarket pulls whose request controls sit in their own section above Columns. */
const POLYMARKET_QUERY_SECTIONS = {
  getBatchPricesHistory: {
    value: "price-history",
    title: "Price history",
    ids: ["quote_outcome", "interval", "time_range", "fidelity"],
  },
  getTokenPriceHistory: {
    value: "token-history",
    title: "Token price history",
    ids: ["quote_outcome", "interval", "time_range", "as_of", "bucket_seconds"],
  },
  getTradesByMarket: {
    value: "trade-history",
    title: "Trade history",
    ids: ["quote_outcome", "time_range", "trade_user", "trade_side", "taker_only", "filter_type", "filter_amount"],
  },
};

const EVENT_MARKETS_PENDING = { status: "loading", columns: [], rows: [], error: "" };
/** Events the forecast preview checks before saying none of them have a forecast. */
const EVENT_FORECAST_PREVIEW_TRIES = 5;

/** Kalshi Live pulls whose request controls sit in their own section above Columns. */
const KALSHI_LIVE_QUERY_SECTIONS = {
  candlesticks: {
    value: "candle-window",
    title: "Candlesticks",
    ids: KALSHI_LIVE_CANDLE_QUERY_IDS,
  },
  event_candlesticks: {
    value: "candle-window",
    title: "Candlesticks",
    ids: KALSHI_LIVE_CANDLE_QUERY_IDS,
  },
  trades: {
    value: "trade-window",
    title: "Trade history",
    ids: ["time_range"],
  },
};

/**
 * One trading window across the picked Kalshi markets: the earliest open through the latest close.
 * A pasted ticker has no open or close yet, so its loaded market row fills them in.
 * @param {Array<Record<string, any>>} picks
 */
function kalshiPicksLife(picks) {
  const lives = (picks || [])
    .filter((pick) => pick?.kind === "market")
    .map((pick) => {
      const row = Array.isArray(pick.rows) ? pick.rows[0] : null;
      return lifeOfMarket({
        openTime: pick.openTime || row?.open_time,
        closeTime: pick.closeTime || row?.close_time,
        marketStatus: pick.marketStatus || row?.status,
      });
    })
    .filter(Boolean);
  if (!lives.length) return null;
  if (lives.length === 1) return lives[0];
  const days = (key) => lives.map((life) => life[key]).filter(Boolean).sort();
  const opens = lives.map((life) => life.openMs).filter(Number.isFinite);
  const closes = lives.map((life) => life.closeMs).filter(Number.isFinite);
  const stopped = lives.every((life) => life.stopped);
  return {
    openMs: opens.length ? Math.min(...opens) : null,
    closeMs: closes.length ? Math.max(...closes) : null,
    stopped,
    trading: lives.some((life) => life.trading),
    earliest: days("earliest")[0] || "",
    latest: days("latest").pop() || "",
    outcome: "",
    status: stopped ? lives[0].status : "",
  };
}

/**
 * Days a market's trade feed can serve. Without a wallet it reaches back three years.
 * @param {ReturnType<typeof lifeOfMarket>} life
 * @param {Record<string, any>} filters
 */
function tradeFeedLife(life, filters) {
  if (!life || polymarketTradeUser(filters)) return life;
  const floor = localDayKey(Date.now() - POLYMARKET_MARKET_TRADES_MAX_AGE_SEC * 1000);
  if (life.earliest && life.earliest >= floor) return life;
  if (life.latest && life.latest < floor) return life;
  return { ...life, earliest: floor };
}

/**
 * The next request filters for this table. Each history pull keeps one time window.
 * @param {string} tableId
 */
function settlePolymarketQueryFilters(tableId, current, next, market) {
  if (tableId === "getBatchPricesHistory") return exclusivePriceHistoryFilters(current, next);
  if (tableId === "getTokenPriceHistory") return exclusiveTokenHistoryFilters(current, next, market);
  return next;
}

function priceHistorySummary(columns, filters) {
  const byId = new Map((columns || []).map((column) => [column.id, column]));
  const rangeOn = Boolean(filters?.time_range?.from && filters?.time_range?.to);
  const asOfOn = byId.has("as_of") && Boolean(String(filters?.as_of?.value || "").trim());
  return ["quote_outcome", asOfOn ? "as_of" : rangeOn ? "time_range" : "interval", "trade_user", "fidelity", "bucket_seconds", "trade_side", "filter_amount"]
    .map((id) => {
      const column = byId.get(id);
      return column ? attributeSummary(column, filters) : "";
    })
    .filter(Boolean)
    .join(" · ");
}

/** Column attributes that narrow rows already in hand. Query controls are a separate request. */
function columnFilterKey(columns, filters, skipIds = []) {
  const skip = new Set(skipIds);
  return (columns || [])
    .filter((column) => !column.queryOnly && !skip.has(column.id) && attributeSummary(column, filters))
    .map((column) => `${column.id}\0${attributeSummary(column, filters)}`)
    .join("\n");
}

/** Downstream join markets, in the order of the market rows they come from. */
function polymarketListJoinMarkets(rows, cap) {
  const seen = new Set();
  const markets = [];
  for (const row of rows || []) {
    const pick = polymarketJoinPickFromRow(row);
    if (!pick || seen.has(pick.id)) continue;
    seen.add(pick.id);
    markets.push({
      ticker: pick.slug || pick.entityId || pick.id,
      label: pick.label,
      title: pick.title,
      pick,
    });
    if (markets.length >= cap) break;
  }
  return markets;
}

function withMarketLifeBounds(columns, life, lifeLabel = "") {
  if (!life || (!life.earliest && !life.latest)) return columns;
  const rangeBounds = lifeLabel ? { ...life, lifeLabel } : life;
  return columns.map((column) =>
    column?.id === "time_range" || column?.control === "query-range" || column?.control === "query-instant"
      ? { ...column, rangeAnchor: life.stopped ? life.latest : "", rangeBounds }
      : column,
  );
}

export function IntegrationBuildWorkspace({ integrationId, onBack }) {
  const source = BUILD_SOURCES[integrationId];
  const cutoff = useKalshiHistoricalCutoffDisplay();
  const cutoffCaption = kalshiSourceCutoffCaption(integrationId, cutoff.cutoffLabel);
  const cutoffPending = cutoff.loading && integrationId !== "kalshiHistorical" && Boolean(cutoffCaption);
  const tables = source?.tables || {};
  const tableIds = Object.keys(tables);
  const ctx = useMyStateV2?.() ?? {};
  const user = useUser();
  const canvas = useWorkspaceCanvas();
  const connect = useIntegrationConnect();
  const planLimit = user === undefined ? null : getHistoricalPullRowLimit(user);
  const [tableId, setTableId] = useState(source?.defaultTable || tableIds[0]);
  const [groupId, setGroupId] = useState(source?.defaultGroup || "");
  const [pull, setPull] = useState(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(8);
  const [error, setError] = useState("");
  const [priceWaiting, setPriceWaiting] = useState(false);
  const [hidden, setHidden] = useState(() => new Set());
  const [flashColumns, setFlashColumns] = useState([]);
  const [flashToken, setFlashToken] = useState(0);
  const [columnRefillNonce, setColumnRefillNonce] = useState(0);
  const knownAbsentRef = useRef(new Set());
  const refillLockRef = useRef(false);
  const flashTimerRef = useRef(0);
  const [filterColumn, setFilterColumn] = useState("");
  const [filterValue, setFilterValue] = useState("");
  const [attributeFilters, setAttributeFilters] = useState({});
  const [sortKeys, setSortKeys] = useState([]);
  const [rowLimit, setRowLimit] = useState("");
  const [previewRefreshing, setPreviewRefreshing] = useState(false);
  const [previewRefreshNonce, setPreviewRefreshNonce] = useState(0);
  const [settledPreviewKey, setSettledPreviewKey] = useState("");
  const [previewSearchError, setPreviewSearchError] = useState("");
  const [revealKey, setRevealKey] = useState(0);
  const baseRowsRef = useRef([]);
  const usingFilteredSample = useRef(false);
  const appliedPreviewNonce = useRef(0);
  const [saved, setSaved] = useState([]);
  const [pulls, setPulls] = useState([]);
  const [step, setStep] = useState("query");
  const [lockedQuery, setLockedQuery] = useState(null);
  const [justSaved, setJustSaved] = useState(false);
  const restoreRef = useRef(null);
  const [enrichPicks, setEnrichPicks] = useState(() => new Set());
  const [previewSheet, setPreviewSheet] = useState("source");
  const [formulaOwner, setFormulaOwner] = useState("");
  const [hoverJoin, setHoverJoin] = useState(false);
  const [joinTarget, setJoinTarget] = useState("");
  const [seriesMarketLayout, setSeriesMarketLayout] = useState("sheet");
  const [traderMarketLayout, setTraderMarketLayout] = useState("sheet");
  const [traderMergePreview, setTraderMergePreview] = useState({ status: "idle", parts: [] });
  const [seriesMarketPreview, setSeriesMarketPreview] = useState({ status: "idle", ticker: "", columns: [], rows: [], error: "" });
  const [traderJoinIds, setTraderJoinIds] = useState(() => new Set());
  const [eventExtraJoinIds, setEventExtraJoinIds] = useState(() => new Set());
  const [forecastJoinIds, setForecastJoinIds] = useState(() => new Set());
  const [eventExtraPreview, setEventExtraPreview] = useState({});
  const eventExtraPreviewRef = useRef({});
  eventExtraPreviewRef.current = eventExtraPreview;
  const [traderJoinPreview, setTraderJoinPreview] = useState({});
  const traderJoinPreviewRef = useRef({});
  traderJoinPreviewRef.current = traderJoinPreview;
  const [traderPreviewMarket, setTraderPreviewMarket] = useState(null);
  const seriesMarketCacheRef = useRef(new Map());
  const seriesMarketVisibleKey = useRef("");
  const liveJoinCacheRef = useRef(new Map());
  const liveJoinVisibleTicker = useRef("");
  const traderJoinVisible = useRef("");
  const downstreamJoinVisible = useRef("");
  const [liveJoinIds, setLiveJoinIds] = useState(() => new Set());
  const [downstreamJoinIds, setDownstreamJoinIds] = useState(() => new Set());
  const [holderTraderJoinIds, setHolderTraderJoinIds] = useState(() => new Set());
  const [downstreamJoinPreview, setDownstreamJoinPreview] = useState({});
  const [downstreamMergePreview, setDownstreamMergePreview] = useState({ status: "idle", columns: [], rows: [] });
  const [liveJoinPreview, setLiveJoinPreview] = useState({});
  const [fanoutParents, setFanoutParents] = useState(() => new Set());
  const [fanoutSeriesMarkets, setFanoutSeriesMarkets] = useState(false);
  const [detectedJoinIds, setDetectedJoinIds] = useState(() => new Set());
  const [joinWindows, setJoinWindows] = useState({});
  const [parentLink, setParentLink] = useState({
    status: "idle",
    ticker: "",
    market: null,
    marketColumns: [],
    series: null,
    seriesColumns: [],
    seriesTicker: "",
    error: "",
  });
  const [fanoutSeriesMarketPreview, setFanoutSeriesMarketPreview] = useState({
    status: "idle",
    seriesTicker: "",
    columns: [],
    rows: [],
    error: "",
  });
  const [detectedJoinPreview, setDetectedJoinPreview] = useState({});
  const [joinPlacement, setJoinPlacement] = useState("");
  const [metadataTab, setMetadataTab] = useState("trades");
  const [marketColumnHidden, setMarketColumnHidden] = useState(() => defaultMarketColumnHidden(kalshiHistoricalMarketColumnList()));
  const [marketPreview, setMarketPreview] = useState({ status: "idle", key: "", columns: [], rows: [], error: "" });
  const [joinTab, setJoinTab] = useState("markets");
  const [tradePreview, setTradePreview] = useState({ status: "idle", ticker: "", columns: [], rows: [], error: "" });
  const [running, setRunning] = useState(false);
  const [placementPrompt, setPlacementPrompt] = useState(false);
  const [seriesBrowsePrompt, setSeriesBrowsePrompt] = useState(false);
  const [sampleSavePrompt, setSampleSavePrompt] = useState(false);
  const placementRef = useRef({ pageId: "", append: false });
  const sampleKeepRef = useRef("both");
  const runLockRef = useRef(false);
  const [hoverFunction, setHoverFunction] = useState(false);
  const [hoverSummarize, setHoverSummarize] = useState(false);
  const [hoverBucket, setHoverBucket] = useState(false);
  const [hoverSample, setHoverSample] = useState(false);
  const [bucketItems, setBucketItems] = useState(() => [createBucketItem()]);
  const [activeBucketId, setActiveBucketId] = useState("");
  const [enrichFolded, setEnrichFolded] = useState(() => new Set());
  const [sampleSize, setSampleSize] = useState("100");
  const [sampleMode, setSampleMode] = useState("seeded");
  const [sampleSeed, setSampleSeed] = useState("");
  const [sampleShuffle, setSampleShuffle] = useState(0);
  const [summaryCells, setSummaryCells] = useState({});
  const [summaryFocus, setSummaryFocus] = useState({ columnId: "value", row: 0 });
  const [summaryTab, setSummaryTab] = useState("summary");
  const [functionItems, setFunctionItems] = useState(() => [createFunctionItem()]);
  const [activeFunctionId, setActiveFunctionId] = useState("");
  const [functionScrollKey, setFunctionScrollKey] = useState(0);
  const [formulaFocused, setFormulaFocused] = useState(false);
  const [formulaEditing, setFormulaEditing] = useState(false);
  const [formulaCaret, setFormulaCaret] = useState(0);
  const [formulaFocusToken, setFormulaFocusToken] = useState(0);
  const [functionHelp, setFunctionHelp] = useState(false);
  const [visibleCount, setVisibleCount] = useState(0);
  const [livePicks, setLivePicks] = useState([]);
  const [seriesCategoryState, setSeriesCategoryState] = useState({ status: "idle", categories: [] });
  const [directQuery, setDirectQuery] = useState(() => defaultKalshiLiveDirectQuery("trades"));
  const [directPreview, setDirectPreview] = useState({ status: "idle", rows: [], error: "", ticker: "" });
  /** Event candlesticks: each picked event's market list, keyed by event ticker. */
  const [eventCandleMarkets, setEventCandleMarkets] = useState({});
  const eventCandleLoadsRef = useRef(new Set());
  const [polymarketDirected, setPolymarketDirected] = useState({ status: "idle", rows: [], error: "" });
  const [polymarketScan, setPolymarketScan] = useState({ status: "idle", rows: [], error: "" });
  const [liveScan, setLiveScan] = useState({ status: "idle", rows: [], error: "", exhausted: true, truncated: false });
  const liveFetchRef = useRef(new Set());
  const [universe, setUniverse] = useState(null);
  const [counting, setCounting] = useState(false);
  const formulaCaretRef = useRef(0);
  const dataTypePickerRef = useRef(null);
  const blurToken = useRef(0);
  const activeBucket = bucketItems.find((item) => item.id === activeBucketId) || bucketItems[0];
  const bucketColumnId = activeBucket?.columnId || "";
  const bucketMode = activeBucket?.mode || "category";
  const bucketInterval = activeBucket?.interval || "day";
  const bucketNumericSize = activeBucket?.numericSize || "";
  const bucketGroupBy = activeBucket?.groupBy || [];
  const bucketMetric = activeBucket?.metric || "count";
  const bucketValueColumnId = activeBucket?.valueColumnId || "";
  const activeFunction = functionItems.find((item) => item.id === activeFunctionId) || functionItems[0];
  const functionTarget = activeFunction?.target || "";
  const functionFormula = activeFunction?.formula || "";
  const functionTab = previewSheet.startsWith("column:") ? "new" : "";

  function patchBucket(id, patch) {
    setBucketItems((list) => list.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function setFunctionFormula(value) {
    setFunctionItems((list) => {
      const id = list.some((item) => item.id === activeFunctionId) ? activeFunctionId : list[0]?.id;
      return list.map((item) => {
        if (item.id !== id) return item;
        const formula = typeof value === "function" ? value(item.formula) : value;
        return { ...item, formula };
      });
    });
  }

  function setFunctionTarget(value) {
    setFunctionItems((list) => {
      const id = list.some((item) => item.id === activeFunctionId) ? activeFunctionId : list[0]?.id;
      return list.map((item) => {
        if (item.id !== id) return item;
        const target = typeof value === "function" ? value(item.target) : value;
        return { ...item, target };
      });
    });
  }

  function setFunctionTab(value) {
    const next = typeof value === "function" ? value(functionTab) : value;
    if (next === "new") {
      const id = functionItems.some((item) => item.id === activeFunctionId) ? activeFunctionId : functionItems[0]?.id;
      if (id) setPreviewSheet(`column:${id}`);
      return;
    }
    setPreviewSheet((current) => (current.startsWith("column:") ? "source" : current));
  }

  function setBucketTab(value) {
    const next = typeof value === "function" ? value("buckets") : value;
    if (next === "buckets") {
      const id = bucketItems.some((item) => item.id === activeBucketId) ? activeBucketId : bucketItems[0]?.id;
      if (id) setPreviewSheet(`bucket:${id}`);
      return;
    }
    setPreviewSheet("source");
  }

  function toggleEnrichFold(id) {
    setEnrichFolded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const groups = source?.groups || null;
  const visibleTableIds = groups
    ? tableIds.filter((id) => tables[id].group === groupId)
    : tableIds;
  const table = tables[tableId];
  const exactUniverse = usesExactUniverse(integrationId);
  const profile = integrationProfile(integrationId);
  const join = profile.join;
  const polymarketHistorical = profile.venue === "polymarket";
  const historicalLake = profile.historical;
  const marketsQuery = historicalLake && tableId === "markets";
  const tradesQuery = historicalLake && tableId === "trades";
  const joinTradesTarget = join?.tradesTarget || "";
  const joinMarketsTarget = join?.marketsTarget || "";
  const venueLabel = profile.label || "Historical";
  const lakeId = profile.lakeId || "";
  const guidedFilters = profile.guidedTables.includes(tableId);
  const liveMarketSearch = integrationId === "kalshiLive" && tableId === "markets";
  const liveSeriesSearch = integrationId === "kalshiLive" && tableId === "series";
  const liveEventSearch = integrationId === "kalshiLive" && tableId === "events";
  const liveDirect = integrationId === "kalshiLive" && isKalshiLiveDirectTable(tableId);
  const liveTrader = integrationId === "kalshiLive" && isKalshiLiveTraderTable(tableId);
  const traderJoinChoiceList = liveTrader ? kalshiTraderJoinChoices(tableId) : [];
  const liveTraderList = liveTrader && traderJoinChoiceList.length > 0;
  const liveForecast = integrationId === "kalshiLive" && tableId === "event_forecast";
  const liveEventCandles = integrationId === "kalshiLive" && tableId === "event_candlesticks";
  const liveMultivariate = integrationId === "kalshiLive" && tableId === "multivariate_events";
  const liveMarketFanout = liveDirect && !liveSeriesSearch && !liveEventSearch && !liveTrader && !liveForecast && !liveEventCandles && !liveMultivariate;
  const polymarketLive = integrationId === "polymarket";
  const polymarketRequirement = polymarketLive ? polymarketLiveBuildRequirement(tableId) : null;
  const polymarketSearch = polymarketLive ? polymarketLiveBuildSearch(tableId) : null;
  const polymarketCenterSearch = Boolean(polymarketRequirement) && livePicks.length === 0;
  const polymarketFanoutOn = polymarketLive && polymarketMarketFanout(tableId) && livePicks.length > 1;
  const polymarketActivePick = polymarketFanoutOn
    ? livePicks.find((pick) => previewSheet === `polymarket:${pick.id}`) || livePicks[0]
    : null;
  const pairStreamOn = isPriceStreamIntegration(integrationId);
  const streamFeed = pairStreamOn ? priceStreamFeed(integrationId, tableId) : null;
  const streamProvider = priceStreamProviderName(integrationId);
  const streamPairTitle = (symbol) => priceStreamPairTitle(integrationId, symbol);
  const streamTopic = streamFeed?.topic || "";
  const [streamPairs, setStreamPairs] = useState([]);
  const [pairStreams, setPairStreams] = useState({});
  const pairSocketsRef = useRef(new Map());
  const pairPendingRef = useRef(new Map());
  const activeStreamPair = pairStreamOn
    ? streamPairs.find((symbol) => previewSheet === `stream:${symbol}`) || streamPairs[0] || ""
    : "";
  const pairSheetTitle = (symbol) => `${streamPairTitle(symbol)} · ${streamFeed?.label || streamProvider}`;
  const polymarketMarketColumns = useMemo(
    () => (polymarketLive && tableId === "getMarkets" ? polymarketMarketAttributeColumns(pull?.columns || []) : []),
    [polymarketLive, tableId, pull?.columns],
  );
  const polymarketSamplingColumns = useMemo(
    () => (polymarketLive && tableId === "getSamplingMarkets" ? samplingMarketAttributeColumns(pull?.columns || []) : []),
    [polymarketLive, tableId, pull?.columns],
  );
  const focusedMarket = polymarketLive
    ? polymarketActivePick || (livePicks.length === 1 ? livePicks[0] : null)
    : livePicks.length === 1
      ? livePicks[0]
      : null;
  const focusedLife = useMemo(() => lifeOfMarket(focusedMarket), [focusedMarket]);
  const focusedKey = focusedMarket?.id || focusedMarket?.ticker || "";
  const liveCandles = integrationId === "kalshiLive" && tableId === "candlesticks";
  const eventCandleEvents = useMemo(() => {
    if (!liveEventCandles) return [];
    return livePicks
      .filter((pick) => pick?.kind === "event" && String(pick.ticker || "").trim())
      .map((pick) => ({
        eventTicker: String(pick.ticker).trim(),
        seriesTicker: String(pick.seriesTicker || "").trim(),
        title: String(pick.title || pick.ticker || "").trim(),
      }));
  }, [liveEventCandles, livePicks]);
  const eventCandleEventKey = eventCandleEvents.map((event) => event.eventTicker).join(",");
  useEffect(() => {
    if (!liveEventCandles || !eventCandleEventKey) return;
    for (const ticker of eventCandleEventKey.split(",")) {
      if (eventCandleLoadsRef.current.has(ticker)) continue;
      const loads = eventCandleLoadsRef.current;
      loads.add(ticker);
      setEventCandleMarkets((current) => ({ ...current, [ticker]: { status: "loading", columns: [], rows: [], error: "" } }));
      const settle = (entry) => {
        if (eventCandleLoadsRef.current !== loads) return;
        setEventCandleMarkets((current) => ({ ...current, [ticker]: entry }));
      };
      loadKalshiLiveEventMarkets(ticker, PREVIEW_ROW_CAP)
        .then((result) => settle({ status: "ready", columns: result?.columns || [], rows: result?.rows || [], error: "" }))
        .catch((err) =>
          settle({ status: "error", columns: [], rows: [], error: err instanceof Error ? err.message : "Could not load the event's markets" }),
        );
    }
  }, [liveEventCandles, eventCandleEventKey]);
  const eventCandleMarketRows = useMemo(() => {
    const seen = new Set();
    const rows = [];
    for (const event of eventCandleEvents) {
      for (const row of eventCandleMarkets[event.eventTicker]?.rows || []) {
        const ticker = String(row?.ticker || "").trim();
        if (!ticker || seen.has(ticker)) continue;
        seen.add(ticker);
        rows.push(row);
      }
    }
    return rows;
  }, [eventCandleEvents, eventCandleMarkets]);
  const eventCandlePreviewMarkets = eventCandleMarkets[eventCandleEvents[0]?.eventTicker] || EVENT_MARKETS_PENDING;
  const eventCandleLife = useMemo(
    () => (liveEventCandles ? mergeLives(eventCandleMarketRows.map((row) => kalshiMarketLife(row))) : null),
    [liveEventCandles, eventCandleMarketRows],
  );
  const liveWindowed = integrationId === "kalshiLive" && (tableId === "candlesticks" || tableId === "trades" || tableId === "event_candlesticks");
  const picksLife = useMemo(
    () => (liveEventCandles ? eventCandleLife : liveWindowed ? kalshiPicksLife(livePicks) : null),
    [eventCandleLife, liveEventCandles, liveWindowed, livePicks],
  );
  const windowLife = liveWindowed ? picksLife : focusedLife;
  useEffect(() => {
    const datesFollowMarket =
      (polymarketLive && (tableId === "getBatchPricesHistory" || tableId === "getTokenPriceHistory")) ||
      (!polymarketLive &&
        ["trades", "candlesticks", "orderbook", "event_candlesticks", "event_forecast"].includes(tableId) &&
        !(integrationId === "kalshiLive" && tableId === "orderbook"));
    if (!datesFollowMarket || !windowLife) return undefined;
    if (!liveWindowed && livePicks.length !== 1) return undefined;
    if (liveWindowed) {
      const preset = windowLife.stopped ? "market-life" : "life-last-day";
      const days = lifeWindowDays(preset, windowLife);
      setAttributeFilters((current) => {
        const range = current?.time_range || {};
        const next = { from: days?.from || "", to: days?.to || "", preset };
        if (range.from === next.from && range.to === next.to && range.preset === next.preset) return current;
        return { ...(current || {}), time_range: next };
      });
      return undefined;
    }
    setAttributeFilters((current) => {
      const maxDays =
        tableId === "getTokenPriceHistory"
          ? 15
          : liveCandles
            ? candleRangeMaxDays(current?.period_interval?.value ?? "60")
            : undefined;
      const capped = defaultLifeRange(windowLife, { maxDays });
      const next = capped?.preset === "past-window" && capped.from === windowLife.earliest ? { ...capped, preset: "market-life" } : capped;
      if (!next?.from || !next.to) return current;
      const range = current?.time_range || {};
      if (range.from === next.from && range.to === next.to && range.preset === next.preset) return current;
      const patched = { ...(current || {}), time_range: next };
      return polymarketLive ? settlePolymarketQueryFilters(tableId, current, patched, focusedMarket) : patched;
    });
    return undefined;
  }, [focusedKey, windowLife, liveCandles, liveWindowed, livePicks.length, polymarketLive, integrationId, tableId]);
  const polymarketQuoteColumns = useMemo(() => {
    if (!polymarketLive || !isPolymarketQuoteTable(tableId)) return [];
    const columns = polymarketQuoteAttributeColumns(tableId, pull?.columns || [], attributeFilters, focusedMarket);
    const trades = tableId === "getTradesByMarket";
    const lifeLabel = tableId === "getBatchPricesHistory" || tableId === "getTokenPriceHistory" || trades ? "Full market history" : "";
    return withMarketLifeBounds(columns, trades ? tradeFeedLife(focusedLife, attributeFilters) : focusedLife, lifeLabel);
  }, [attributeFilters, focusedLife, focusedMarket, polymarketLive, pull?.columns, tableId]);
  const polymarketQuerySection = polymarketLive ? POLYMARKET_QUERY_SECTIONS[tableId] || null : null;
  const polymarketAttributeColumns = useMemo(() => {
    if (!polymarketQuerySection) return polymarketQuoteColumns;
    const skip = new Set(polymarketQuerySection.ids);
    return polymarketQuoteColumns.filter((column) => !skip.has(column.id));
  }, [polymarketQuerySection, polymarketQuoteColumns]);
  const polymarketQuoteKey = polymarketQuoteRequestKey(tableId, attributeFilters, rowLimit, planLimit);
  const polymarketLeaderboardColumns = useMemo(() => {
    if (!polymarketLive || tableId !== "getTraderLeaderboard") return [];
    return polymarketLeaderboardAttributeColumns(pull?.columns || []);
  }, [polymarketLive, pull?.columns, tableId]);
  const polymarketLeaderboardKey = tableId === "getTraderLeaderboard" ? polymarketLeaderboardRequestKey(attributeFilters) : "";
  const polymarketBiggestWinnersColumns = useMemo(() => {
    if (!polymarketLive || tableId !== "getBiggestWinners") return [];
    return polymarketBiggestWinnersAttributeColumns(pull?.columns || []);
  }, [polymarketLive, pull?.columns, tableId]);
  const polymarketBiggestWinnersKey = tableId === "getBiggestWinners" ? polymarketBiggestWinnersRequestKey(attributeFilters) : "";
  const polymarketBiggestWinnersFilterKey = tableId === "getBiggestWinners"
    ? columnFilterKey(polymarketBiggestWinnersColumns, attributeFilters)
    : "";
  const positionWalletKey = tableId === "getTraderPositions"
    ? livePicks.map((pick) => String(pick.address || "").trim().toLowerCase()).filter(Boolean).join(",")
    : "";
  const [positionMarkets, setPositionMarkets] = useState([]);
  useEffect(() => {
    setPositionMarkets([]);
  }, [positionWalletKey]);
  useEffect(() => {
    if (tableId !== "getTraderPositions" || polymarketDirected.status !== "ready") return;
    const addresses = positionWalletKey ? positionWalletKey.split(",") : [];
    setPositionMarkets((current) => mergePolymarketPositionMarkets(current, polymarketDirected.rows, addresses));
  }, [polymarketDirected.rows, polymarketDirected.status, positionWalletKey, tableId]);
  const polymarketPositionColumns = useMemo(() => {
    if (!polymarketLive || tableId !== "getTraderPositions") return [];
    return polymarketPositionAttributeColumns(pull?.columns || [], positionMarkets);
  }, [polymarketLive, positionMarkets, pull?.columns, tableId]);
  const polymarketPositionKey = tableId === "getTraderPositions" ? polymarketPositionRequestKey(attributeFilters, sortKeys) : "";
  const polymarketPnlColumns = useMemo(() => {
    if (!polymarketLive || tableId !== "getTraderPnlSeries") return [];
    return polymarketPnlAttributeColumns(pull?.columns || []);
  }, [polymarketLive, pull?.columns, tableId]);
  const polymarketPnlKey = tableId === "getTraderPnlSeries" ? polymarketPnlRequestKey(attributeFilters) : "";
  const activityWalletKey = tableId === "getTraderActivity"
    ? livePicks.map((pick) => String(pick.address || "").trim().toLowerCase()).filter(Boolean).join(",")
    : "";
  const [activityMarkets, setActivityMarkets] = useState([]);
  useEffect(() => {
    setActivityMarkets([]);
  }, [activityWalletKey]);
  useEffect(() => {
    if (tableId !== "getTraderActivity" || polymarketDirected.status !== "ready") return;
    const addresses = activityWalletKey ? activityWalletKey.split(",") : [];
    setActivityMarkets((current) => mergePolymarketActivityMarkets(current, polymarketDirected.rows, addresses));
  }, [activityWalletKey, polymarketDirected.rows, polymarketDirected.status, tableId]);
  const polymarketActivityColumns = useMemo(() => {
    if (!polymarketLive || tableId !== "getTraderActivity") return [];
    return polymarketActivityAttributeColumns(pull?.columns || [], activityMarkets);
  }, [activityMarkets, polymarketLive, pull?.columns, tableId]);
  const polymarketActivityKey = tableId === "getTraderActivity" ? polymarketActivityRequestKey(attributeFilters) : "";
  const polymarketSamplingLimit = Number(rowLimit);
  const polymarketExplore =
    polymarketLive &&
    ((tableId === "getMarkets" && polymarketMarketFiltersActive(polymarketMarketColumns, attributeFilters)) ||
      (tableId === "getSamplingMarkets" &&
        (samplingMarketFiltersActive(polymarketSamplingColumns, attributeFilters) ||
          (Number.isFinite(polymarketSamplingLimit) && polymarketSamplingLimit > PREVIEW_ROW_CAP))));

  useEffect(() => {
    if (!liveSeriesSearch) return undefined;
    const ac = new AbortController();
    setSeriesCategoryState({ status: "loading", categories: [] });
    fetchKalshiLiveTagsByCategories({ signal: ac.signal })
      .then((data) => {
        if (ac.signal.aborted) return;
        setSeriesCategoryState({ status: "ready", categories: data?.categories || [] });
      })
      .catch(() => {
        if (ac.signal.aborted) return;
        setSeriesCategoryState({ status: "error", categories: [] });
      });
    return () => ac.abort();
  }, [liveSeriesSearch]);

  useEffect(() => {
    const next = BUILD_SOURCES[integrationId];
    setGroupId(next?.defaultGroup || "");
    setTableId(next?.defaultTable || Object.keys(next?.tables || {})[0] || "");
  }, [integrationId]);

  useEffect(() => {
    if (!groups?.length || groups.some((group) => group.id === groupId)) return;
    const nextGroup = groups[0].id;
    setGroupId(nextGroup);
    const ids = tableIds.filter((id) => tables[id].group === nextGroup);
    setTableId((current) => (ids.includes(current) ? current : ids[0] || current));
  }, [groupId, groups, tableId, tableIds, tables]);

  function selectGroup(nextGroup) {
    setGroupId(nextGroup);
    const ids = tableIds.filter((id) => tables[id].group === nextGroup);
    if (!ids.includes(tableId)) setTableId(ids[0] || tableId);
  }

  useEffect(() => {
    let cancel = false;
    knownAbsentRef.current = new Set();
    setFlashColumns([]);
    setLoading(true);
    setError("");
    setPriceWaiting(false);
    setProgress(12);
    setPull(null);
    setVisibleCount(0);
    setFilterValue("");
    setAttributeFilters(
      integrationId === "polymarket" && isPolymarketQuoteTable(tableId)
        ? defaultPolymarketQuoteFilters(tableId)
        : integrationId === "polymarket" && tableId === "getTraderLeaderboard"
          ? defaultPolymarketLeaderboardFilters()
          : integrationId === "polymarket" && tableId === "getBiggestWinners"
            ? defaultPolymarketBiggestWinnersFilters()
            : integrationId === "polymarket" && tableId === "getTraderPositions"
              ? defaultPolymarketPositionFilters()
            : integrationId === "polymarket" && tableId === "getTraderPnlSeries"
              ? defaultPolymarketPnlFilters()
            : integrationId === "polymarket" && tableId === "getTraderActivity"
              ? defaultPolymarketActivityFilters()
            : defaultDirectAttributeFilters(tableId),
    );
    setSortKeys([]);
    setRowLimit("");
    setLivePicks([]);
    setDirectQuery(defaultKalshiLiveDirectQuery(tableId));
    setDirectPreview({ status: "idle", rows: [], error: "", ticker: "", events: [] });
    setPolymarketDirected({ status: "idle", rows: [], error: "" });
    setPolymarketScan({ status: "idle", rows: [], error: "" });
    setForecastJoinIds(new Set());
    setEventExtraPreview({});
    setEventCandleMarkets({});
    eventCandleLoadsRef.current = new Set();
    setLiveScan({ status: "idle", rows: [], error: "", exhausted: true, truncated: false });
    liveFetchRef.current = new Set();
    setPreviewRefreshing(false);
    usingFilteredSample.current = false;
    setUniverse(null);
    setCounting(usesExactUniverse(integrationId));
    const timer = window.setInterval(() => {
      setProgress((current) => (current >= 88 ? current : current + Math.random() * 8));
    }, 280);
    const skipIdleSample =
      tableId === "event_forecast" ||
      tableId === "event_candlesticks" ||
      tableId === "candlesticks" ||
      tableId === "trades" ||
      tableId === "orderbook";
    loadBuildPreview(
      integrationId,
      tableId,
      skipIdleSample || (integrationId === "polymarket" && (tableId === "getMarkets" || tableId === "getSamplingMarkets"))
        ? { fresh: true }
        : undefined,
    )
      .then((result) => {
        if (cancel) return;
        setProgress(100);
        baseRowsRef.current = result.rows;
        setPull(result);
        setRevealKey((key) => key + 1);
        const pending = restoreRef.current;
        const restoring = pending && pending.tableId === tableId && pending.integrationId === integrationId;
        if (restoring) restoreRef.current = null;
        setHidden(
          restoring
            ? new Set(pending.hidden || [])
            : new Set(result.columns.filter((column) => column.defaultOn === false).map((column) => column.id)),
        );
        const absentKey = `${integrationId}:${tableId}:`;
        for (const column of result.columns || []) {
          if (columnMissingFromRows(result.rows, column.id)) knownAbsentRef.current.add(absentKey + column.id);
        }
        setFilterColumn((restoring && pending.filterColumn) || result.columns[0]?.id || "");
        if (restoring) {
          setFilterValue(pending.filterValue || "");
          setAttributeFilters(pending.attributeFilters || {});
          setSortKeys(Array.isArray(pending.sortKeys) ? pending.sortKeys : []);
          setRowLimit(pending.rowLimit || "");
        }
      })
      .catch((err) => {
        if (cancel) return;
        const message = err instanceof Error ? err.message : "Pull failed";
        if (isPriceStreamIntegration(integrationId) && /live price/i.test(message)) {
          setPriceWaiting(true);
          return;
        }
        setError(message);
      })
      .finally(() => {
        window.clearInterval(timer);
        if (!cancel) setLoading(false);
      });
    return () => {
      cancel = true;
      window.clearInterval(timer);
    };
  }, [integrationId, tableId]);

  useEffect(() => {
    if (!polymarketLive) return undefined;
    const leaderboard = tableId === "getTraderLeaderboard";
    const biggestWinners = tableId === "getBiggestWinners";
    const traderPositions = tableId === "getTraderPositions";
    const traderActivity = tableId === "getTraderActivity";
    if (!livePicks.length && !leaderboard && !biggestWinners) {
      setPolymarketDirected({ status: "idle", rows: [], error: "" });
      return undefined;
    }
    let cancel = false;
    const startedAt = Date.now();
    let progress = { scanned: 0, removedCount: 0, removed: [], exhausted: false };
    const timer = window.setTimeout(() => {
      setPolymarketDirected({
        status: "loading",
        rows: [],
        error: "",
        scanned: 0,
        removedCount: 0,
        removed: [],
        startedAt: biggestWinners && polymarketBiggestWinnersFilterKey ? startedAt : 0,
        completedAt: 0,
        request: "GET /v2/biggest-winners",
      });
      loadPolymarketLiveTable(tableId, livePicks, {
        filters: attributeFilters,
        rowLimit: leaderboard ? PREVIEW_ROW_CAP : rowLimit,
        planLimit,
        sorts: sortKeys,
        preview: leaderboard || ((biggestWinners || traderPositions || traderActivity) && !(Number(rowLimit) > 0)),
        match: biggestWinners && polymarketBiggestWinnersFilterKey
          ? (row) => rowMatchesAttributes(row, polymarketBiggestWinnersColumns, attributeFilters)
          : undefined,
        explain: biggestWinners && polymarketBiggestWinnersFilterKey
          ? (row) => attributeMismatchReason(row, polymarketBiggestWinnersColumns, attributeFilters)
          : undefined,
        onProgress: biggestWinners && polymarketBiggestWinnersFilterKey
          ? (info) => {
              if (cancel) return;
              progress = info;
              setPolymarketDirected({
                status: "loading",
                rows: info.rows || [],
                error: "",
                scanned: info.scanned || 0,
                removedCount: info.removedCount || 0,
                removed: info.removed || [],
                exhausted: Boolean(info.exhausted),
                startedAt,
                completedAt: 0,
                request: "GET /v2/biggest-winners",
              });
            }
          : undefined,
      })
        .then((result) => {
          if (cancel) return;
          const rows = result.rows || [];
          const absentKey = `${integrationId}:${tableId}:`;
          for (const column of result.columns || pull?.columns || []) {
            if (columnMissingFromRows(rows, column.id)) knownAbsentRef.current.add(absentKey + column.id);
          }
          setPolymarketDirected({
            status: "ready",
            rows,
            error: "",
            scanned: progress.scanned || rows.length,
            removedCount: progress.removedCount || 0,
            removed: progress.removed || [],
            exhausted: Boolean(progress.exhausted),
            startedAt: biggestWinners && polymarketBiggestWinnersFilterKey ? startedAt : 0,
            completedAt: Date.now(),
            request: "GET /v2/biggest-winners",
          });
        })
        .catch((err) => {
          if (cancel) return;
          setPolymarketDirected({
            status: "error",
            rows: [],
            error: err instanceof Error ? err.message : "Pull failed",
          });
        });
    }, isPolymarketQuoteTable(tableId) ? 280 : 0);
    return () => {
      cancel = true;
      window.clearTimeout(timer);
    };
  }, [attributeFilters, livePicks, planLimit, polymarketActivityKey, polymarketBiggestWinnersColumns, polymarketBiggestWinnersFilterKey, polymarketBiggestWinnersKey, polymarketLeaderboardKey, polymarketLive, polymarketPnlKey, polymarketPositionKey, polymarketQuoteKey, rowLimit, tableId]);

  useEffect(() => {
    if (!previewSheet.startsWith("polymarket:")) return;
    const id = previewSheet.slice("polymarket:".length);
    if (!livePicks.some((pick) => pick.id === id)) setPreviewSheet("source");
  }, [livePicks, previewSheet]);

  useEffect(() => {
    if (!previewSheet.startsWith("stream:")) return;
    const symbol = previewSheet.slice("stream:".length);
    if (streamPairs.indexOf(symbol) < 1) setPreviewSheet("source");
  }, [streamPairs, previewSheet]);

  // A feed change closes every pair socket. The pairs stay picked and reopen on the new feed.
  useEffect(() => {
    const sockets = pairSocketsRef.current;
    const pending = pairPendingRef.current;
    return () => {
      for (const stop of sockets.values()) stop();
      sockets.clear();
      pending.clear();
      setPairStreams({});
    };
  }, [streamTopic]);

  useEffect(() => {
    const sockets = pairSocketsRef.current;
    const wanted = new Set(streamTopic ? streamPairs : []);
    for (const [symbol, stop] of sockets) {
      if (wanted.has(symbol)) continue;
      stop();
      sockets.delete(symbol);
      pairPendingRef.current.delete(symbol);
      setPairStreams((current) => {
        if (!(symbol in current)) return current;
        const next = { ...current };
        delete next[symbol];
        return next;
      });
    }
    const pending = pairPendingRef.current;
    for (const symbol of wanted) {
      if (sockets.has(symbol)) continue;
      const stop = openPriceStream({
        topic: streamTopic,
        symbol,
        onStatus: (status) =>
          setPairStreams((current) => ({
            ...current,
            [symbol]: { rows: current[symbol]?.rows || [], status },
          })),
        onPoints: (points) => pending.set(symbol, (pending.get(symbol) || []).concat(points)),
      });
      sockets.set(symbol, stop);
    }
  }, [streamPairs, streamTopic]);

  // Points land once a second, so several pairs streaming at once re-render the builder once.
  useEffect(() => {
    if (!streamTopic || !streamPairs.length) return undefined;
    const pending = pairPendingRef.current;
    const windowSeconds = streamFeed?.windowSeconds || null;
    const flush = () => {
      if (!pending.size) return;
      const batch = new Map(pending);
      pending.clear();
      setPairStreams((current) => {
        const next = { ...current };
        for (const [symbol, points] of batch) {
          if (!pairSocketsRef.current.has(symbol)) continue;
          const before = current[symbol]?.rows || [];
          const rows = mergePriceRows(before, points, { symbol, windowSeconds });
          if (rows === before) continue;
          const lastBefore = before.length ? before[before.length - 1].time : null;
          const fresh = lastBefore == null ? [] : rows.filter((row) => row.time > lastBefore).map((row) => row.time);
          next[symbol] = { status: "live", rows, fresh };
        }
        return next;
      });
    };
    const timer = window.setInterval(flush, 1000);
    return () => window.clearInterval(timer);
  }, [streamPairs.length, streamTopic, streamFeed?.windowSeconds]);

  useEffect(() => {
    setStreamPairs([]);
  }, [integrationId]);

  function toggleStreamPair(symbol) {
    setStreamPairs((current) => (current.includes(symbol) ? current.filter((item) => item !== symbol) : [...current, symbol]));
  }

  useEffect(() => {
    if (!polymarketExplore) {
      setPolymarketScan((current) => (current.status === "idle" ? current : { status: "idle", rows: [], error: "" }));
      return undefined;
    }
    const ac = new AbortController();
    const timer = window.setTimeout(() => {
      const samplingTable = tableId === "getSamplingMarkets";
      const requested = Number(rowLimit);
      const scanCap = samplingTable ? POLYMARKET_SAMPLING_SCAN_CAP : POLYMARKET_MARKET_SCAN_CAP;
      const plan = typeof planLimit === "number" && planLimit > 0 ? planLimit : scanCap;
      const target = Math.min(
        scanCap,
        plan,
        Number.isFinite(requested) && requested > 0 ? requested : PREVIEW_ROW_CAP,
      );
      const columns = samplingTable ? polymarketSamplingColumns : polymarketMarketColumns;
      const scan = samplingTable ? scanSamplingMarkets : scanPolymarketMarkets;
      const requirements = columns
        .filter((column) => attributeSummary(column, attributeFilters))
        .map((column) => column.title || column.id);
      setPolymarketScan({
        status: "loading",
        rows: [],
        error: "",
        scanned: 0,
        removed: [],
        removedCount: 0,
        waiting: false,
        startedAt: Date.now(),
        completedAt: 0,
        request: samplingTable ? "GET /sampling-markets" : "GET /markets/keyset",
        serverFilters: [],
        requirements,
      });
      scan({
        filters: attributeFilters,
        columns,
        target,
        signal: ac.signal,
        match: (row) => rowMatchesAttributes(row, columns, attributeFilters),
        explain: (row) => attributeMismatchReason(row, columns, attributeFilters),
        onProgress: (info) => {
          if (ac.signal.aborted) return;
          setPolymarketScan((current) => ({
            ...current,
            status: "loading",
            rows: info.rows || [],
            scanned: info.scanned || 0,
            removed: info.removed || [],
            removedCount: info.removedCount || 0,
            exhausted: Boolean(info.exhausted),
            waiting: Boolean(info.waiting),
            note: info.note || "",
            request: info.request || current.request,
            serverFilters: info.serverFilters || [],
            requirements,
          }));
        },
      })
        .then((result) => {
          if (ac.signal.aborted) return;
          setPolymarketScan((current) => ({
            ...current,
            status: "ready",
            rows: result.rows,
            error: "",
            scanned: result.scanned,
            removed: result.removed,
            removedCount: result.removedCount,
            exhausted: Boolean(result.exhausted),
            waiting: false,
            completedAt: Date.now(),
            truncated: result.truncated,
            request: result.request,
            serverFilters: result.serverFilters,
          }));
        })
        .catch((error) => {
          if (ac.signal.aborted || error?.name === "AbortError") return;
          setPolymarketScan((current) => ({
            ...current,
            status: "error",
            error: error instanceof Error ? error.message : "Pull failed",
            waiting: false,
            completedAt: Date.now(),
          }));
        });
    }, 400);
    return () => {
      ac.abort();
      window.clearTimeout(timer);
    };
  }, [attributeFilters, planLimit, polymarketExplore, polymarketMarketColumns, polymarketSamplingColumns, rowLimit, tableId]);

  useEffect(() => {
    if (loading || !pull?.rows) return undefined;
    setVisibleCount(0);
    const timer = window.setInterval(() => {
      setVisibleCount((current) => {
        const next = Math.min(pull.rows.length, current + 4);
        if (next >= pull.rows.length) window.clearInterval(timer);
        return next;
      });
    }, 45);
    return () => window.clearInterval(timer);
  }, [loading, revealKey]);

  useEffect(() => {
    if (!exactUniverse) {
      setUniverse(null);
      setCounting(false);
      return undefined;
    }
    const guided = guidedFilters
      ? buildAttributePredicates(pull?.columns || [], attributeFilters)
      : null;
    const query = filterValue.trim();
    const column = (pull?.columns || []).find((item) => item.id === filterColumn);
    if (!guidedFilters && query && !column) return undefined;
    const narrowed = guidedFilters
      ? { and: guided?.and || [], or: guided?.or || [] }
      : query && column?.type === "text"
        ? { column: filterColumn, value: query }
        : null;
    const known = peekBuildUniverseCount(integrationId, tableId, narrowed);
    if (typeof known === "number") {
      setUniverse(known);
      setCounting(false);
      return undefined;
    }
    let cancel = false;
    setUniverse(null);
    setCounting(true);
    const timer = window.setTimeout(() => {
      loadBuildUniverseCount(integrationId, tableId, narrowed)
        .then((total) => {
          if (!cancel) setUniverse(total);
        })
        .catch(() => {
          if (!cancel) setUniverse(null);
        })
        .finally(() => {
          if (!cancel) setCounting(false);
        });
    }, narrowed ? 350 : 0);
    return () => {
      cancel = true;
      window.clearTimeout(timer);
    };
  }, [exactUniverse, integrationId, tableId, filterColumn, filterValue, pull?.columns, guidedFilters, attributeFilters]);

  const shownColumns = useMemo(
    () =>
      (pull?.columns || [])
        .filter((column) => !hidden.has(column.id))
        .map((column) =>
          profile.priceColumns.includes(column.id) ? { ...column, scale: "cents" } : column,
        ),
    [pull, hidden, profile.priceColumns],
  );

  const livePickRows = useMemo(() => {
    const seen = new Set();
    const rows = [];
    for (const pick of livePicks) {
      for (const row of pick.rows || []) {
        const ticker = String(row?.ticker || "").trim();
        if (ticker && seen.has(ticker)) continue;
        if (ticker) seen.add(ticker);
        rows.push(row);
      }
    }
    return rows;
  }, [livePicks]);

  const liveAttributeColumns = useMemo(
    () => (liveMarketSearch ? kalshiLiveMarketAttributeColumns(pull?.columns || []) : []),
    [liveMarketSearch, pull?.columns, KALSHI_LIVE_QUERY_ATTRIBUTE_COLUMNS, kalshiLiveMarketAttributeColumns],
  );
  const pickedMarketCount = livePicks.filter((pick) => pick?.kind === "market").length;
  const directAttributeColumns = useMemo(() => {
    const columns = withMarketLifeBounds(
      (liveMarketFanout || liveEventCandles) ? kalshiLiveDirectAttributeColumns(tableId, pull?.columns || []) : [],
      windowLife,
      liveEventCandles ? "Full event history" : liveWindowed ? "Full market history" : "",
    );
    return columns.map((column) => (column.lifeWindows ? { ...column, perMarket: pickedMarketCount > 1 } : column));
  }, [windowLife, liveWindowed, liveEventCandles, liveMarketFanout, tableId, pull?.columns, pickedMarketCount]);
  const kalshiQuerySection = integrationId === "kalshiLive" ? KALSHI_LIVE_QUERY_SECTIONS[tableId] || null : null;
  const directListColumns = useMemo(() => {
    if (!kalshiQuerySection) return directAttributeColumns;
    const skip = new Set(kalshiQuerySection.ids);
    return directAttributeColumns.filter((column) => !skip.has(column.id));
  }, [directAttributeColumns, kalshiQuerySection]);
  const forecastAttributeColumns = useMemo(
    () => withMarketLifeBounds(liveForecast ? kalshiLiveEventForecastAttributeColumns(pull?.columns || []) : [], focusedLife),
    [focusedLife, liveForecast, pull?.columns],
  );
  const forecastRowColumns = useMemo(
    () => forecastAttributeColumns.filter((column) => !column.queryOnly),
    [forecastAttributeColumns],
  );
  const directRowColumns = useMemo(
    () => directAttributeColumns.filter((column) => !column.queryOnly),
    [directAttributeColumns],
  );
  const directWindow = useMemo(
    () => directPullWindow(tableId, attributeFilters, directQuery),
    [tableId, attributeFilters, directQuery],
  );
  const directRangePreset = String(attributeFilters?.time_range?.preset || "");
  /** Trades and candles cut the window from each picked market's own life. */
  const marketDirectWindow = (market) => {
    const base = {
      minTs: directWindow.minTs,
      maxTs: directWindow.maxTs,
      period: directWindow.period,
      depth: directWindow.depth,
      includeLatest: directWindow.includeLatest,
    };
    return liveWindowed ? lifePullWindow(base, attributeFilters?.time_range, kalshiMarketLife(market)) : base;
  };
  /** Event candlesticks pull one window for the whole event, cut from all its markets' lives. */
  const eventCandleWindow = useMemo(
    () =>
      liveEventCandles
        ? lifePullWindow(
            { minTs: directWindow.minTs, maxTs: directWindow.maxTs, period: directWindow.period || 60 },
            attributeFilters?.time_range,
            eventCandleLife,
          )
        : null,
    [liveEventCandles, directWindow.minTs, directWindow.maxTs, directWindow.period, attributeFilters?.time_range, eventCandleLife],
  );
  const seriesAttributeColumns = useMemo(
    () =>
      liveSeriesSearch
        ? kalshiLiveSeriesAttributeColumns(pull?.columns || [], seriesCategoryState.categories, {
            loading: seriesCategoryState.status === "loading",
          })
        : [],
    [liveSeriesSearch, pull?.columns, seriesCategoryState],
  );
  const eventAttributeColumns = useMemo(
    () => (liveEventSearch ? kalshiLiveEventAttributeColumns(pull?.columns || []) : []),
    [liveEventSearch, pull?.columns],
  );
  const multivariateAttributeColumns = useMemo(
    () => (liveMultivariate ? kalshiLiveMultivariateAttributeColumns(pull?.columns || []) : []),
    [liveMultivariate, pull?.columns],
  );
  const multivariateRowColumns = useMemo(
    () => multivariateAttributeColumns.filter((column) => !column.queryOnly),
    [multivariateAttributeColumns],
  );
  const traderAttributeColumns = useMemo(
    () => (liveTrader ? kalshiLiveTraderAttributeColumns(tableId, pull?.columns || []) : []),
    [liveTrader, tableId, pull?.columns],
  );
  const traderMetric = leaderboardMetric(attributeFilters);
  const traderPeriod = leaderboardTimePeriod(attributeFilters);
  const traderCategoryKey = leaderboardCategories(attributeFilters).join("\0");
  const traderQuery = traderSearchQuery(attributeFilters);
  const traderMetricsOn = traderIncludeMetrics(attributeFilters);
  const traderHoldingsOn = traderIncludeHoldings(attributeFilters);
  const traderProfileKey = traderProfileNicknames(attributeFilters).join("\0");
  const traderPositionsKey = holderPositionNicknames(attributeFilters).join("\0");
  const traderSpecKey = liveTrader ? JSON.stringify(kalshiTraderPullSpec(tableId, attributeFilters)) : "";
  const seriesCategories = seriesDiscoveryCategories(attributeFilters);
  const seriesCategoryKey = seriesCategories.join("\0");
  const seriesMinUpdatedTs = seriesUpdatedAfter(attributeFilters);
  const seriesProductMetadata = liveSeriesSearch && !hidden.has("product_metadata");
  const eventStatuses = eventDiscoveryStatuses(attributeFilters);
  const eventStatusKey = eventStatuses.join("\0");
  const eventSeries = eventSeriesTicker(attributeFilters);
  const eventSeriesKey = eventSeriesTickers(attributeFilters).join("\0");
  const eventMinCloseTs = eventClosesAfter(attributeFilters);
  const eventIncludeMarkets = (liveEventSearch || liveMultivariate) && eventsNeedMarkets(hidden);
  const eventIncludeMilestones = liveEventSearch && !hidden.has("milestones");
  const eventColumnFilterKey = columnFilterKey(eventAttributeColumns, attributeFilters, ["series_ticker", "last_updated_ts"]);
  const multivariateCollection = multivariateCollectionTicker(attributeFilters);
  const multivariateColumnFilterKey = columnFilterKey(multivariateAttributeColumns, attributeFilters, ["series_ticker", "collection_ticker"]);
  const seriesColumnFilterKey = columnFilterKey(seriesAttributeColumns, attributeFilters, ["category", "last_updated_ts"]);
  const liveClientColumns = useMemo(
    () => liveAttributeColumns.filter((column) => !column.queryOnly),
    [liveAttributeColumns],
  );
  const liveFiltersActive = liveAttributeColumns.some((column) => attributeSummary(column, attributeFilters));
  const liveNarrow = liveMarketSearch && kalshiLiveDiscoveryIsNarrow(attributeFilters);
  const liveBookScan =
    liveMarketSearch && !livePicks.length && (liveFiltersActive || sortKeys.length > 0 || String(rowLimit || "").trim() !== "");
  const liveScopeScan = liveMarketSearch && liveNarrow && livePicks.some((pick) => pick.kind === "series" || pick.kind === "event");

  useEffect(() => {
    if (!liveBookScan && !liveScopeScan) {
      setLiveScan((current) =>
        current.status === "idle"
          ? current
          : { status: "idle", rows: [], error: "", exhausted: true, truncated: false, note: "", dropped: [], droppedCount: 0, dropToken: 0 },
      );
      return undefined;
    }
    const ac = new AbortController();
    const timer = window.setTimeout(() => {
      const queryError = kalshiLiveFilterQueryError(attributeFilters);
      if (queryError) {
        setLiveScan({ status: "error", rows: [], error: queryError, exhausted: true, truncated: false, note: "", dropped: [], droppedCount: 0, dropToken: 0 });
        return;
      }
      const discovery = kalshiLiveDiscoveryFromFilters(attributeFilters);
      const requested = Number(rowLimit);
      const importCap = Math.min(
        KALSHI_LIVE_MARKET_SCAN_CAP,
        typeof planLimit === "number" && planLimit > 0 ? planLimit : KALSHI_LIVE_MARKET_SCAN_CAP,
        Number.isFinite(requested) && requested > 0 && !sortKeys.length ? requested : KALSHI_LIVE_MARKET_SCAN_CAP,
      );
      const explain = (row) => attributeMismatchReason(row, liveClientColumns, attributeFilters);
      const match = (row) => !explain(row);
      const localTitles = liveClientColumns
        .filter((column) => attributeSummary(column, attributeFilters))
        .map((column) => column.title || column.id);
      const server = describeKalshiLiveServerFilters(discovery);
      const request = discovery.ticker
        ? `GET /markets/${discovery.ticker}`
        : discovery.tickers
          ? `GET /markets?tickers=${discovery.tickers}`
          : "GET /markets";
      setLiveScan({
        status: "loading",
        rows: [],
        error: "",
        exhausted: false,
        truncated: false,
        note: `Querying markets directly from ${profile.label}.`,
        dropped: [],
        droppedCount: 0,
        dropToken: 0,
        scanned: 0,
        removed: [],
        removedCount: 0,
        waiting: false,
        startedAt: Date.now(),
        completedAt: 0,
        request,
        serverFilters: server,
        requirements: localTitles,
      });
      const scopes = livePicks.filter((pick) => pick.kind === "series" || pick.kind === "event");
      let carried = [];
      let dropSerial = 0;
      const publish = (info) => {
        if (ac.signal.aborted) return;
        if (!info.waiting) dropSerial += 1;
        setLiveScan((current) => ({
          status: "loading",
          rows: scopes.length ? [...carried, ...(info.rows || [])] : info.rows,
          error: "",
          exhausted: info.exhausted,
          truncated: info.truncated,
          note: liveScanStatusNote(info, discovery, localTitles),
          dropped: info.waiting ? current.dropped : info.dropped || [],
          droppedCount: info.waiting ? current.droppedCount : info.droppedCount || 0,
          dropToken: info.waiting ? current.dropToken : dropSerial,
          scanned: info.scanned || 0,
          removed: info.waiting ? current.removed || [] : [...(current.removed || []), ...(info.dropped || [])].slice(-40),
          removedCount: info.waiting ? current.removedCount || 0 : (current.removedCount || 0) + (info.droppedCount || 0),
          waiting: Boolean(info.waiting),
          startedAt: current.startedAt,
          completedAt: 0,
          request: current.request,
          serverFilters: current.serverFilters,
          requirements: current.requirements,
        }));
      };
      const run = async () => {
        if (!scopes.length) {
          return scanKalshiLiveMarkets({
            discovery,
            limit: importCap,
            signal: ac.signal,
            explain,
            onPage: publish,
          });
        }
        let exhausted = true;
        let scanned = 0;
        for (const pick of scopes) {
          const scoped = { ...discovery };
          if (pick.kind === "series" && !scoped.seriesTicker) scoped.seriesTicker = pick.ticker;
          if (pick.kind === "event" && !scoped.eventTicker) scoped.eventTicker = pick.ticker;
          const page = await scanKalshiLiveMarkets({
            discovery: scoped,
            limit: Math.max(1, importCap - carried.length),
            signal: ac.signal,
            explain,
            onPage: publish,
          });
          if (page.error) return page;
          carried = [...carried, ...page.rows];
          scanned += page.scanned || 0;
          if (!page.exhausted) exhausted = false;
          if (carried.length >= importCap) break;
        }
        const seen = new Set(carried.map((row) => String(row.ticker || "")));
        for (const pick of livePicks) {
          if (pick.kind !== "market") continue;
          for (const row of pick.rows || []) {
            const ticker = String(row?.ticker || "");
            if (!ticker || seen.has(ticker) || !match(row)) continue;
            seen.add(ticker);
            carried.push(row);
          }
        }
        return { rows: carried, exhausted, scanned, error: "" };
      };
      run()
        .then((result) => {
          if (ac.signal.aborted) return;
          setLiveScan((current) => ({
            status: result.error ? "error" : "ready",
            rows: result.rows || [],
            error: result.error || "",
            exhausted: result.exhausted !== false,
            truncated: Boolean(result.truncated),
            note: result.error ? current.note || "" : `Read ${Number(result.scanned || current.scanned || 0).toLocaleString()} markets.`,
            dropped: current.dropped || [],
            droppedCount: current.droppedCount || 0,
            dropToken: current.dropToken || 0,
            scanned: result.scanned || current.scanned || 0,
            removed: current.removed || [],
            removedCount: current.removedCount || 0,
            waiting: false,
            startedAt: current.startedAt,
            completedAt: Date.now(),
            request: current.request,
            serverFilters: current.serverFilters,
            requirements: current.requirements,
          }));
        })
        .catch((err) => {
          if (ac.signal.aborted || err?.name === "AbortError") return;
          setLiveScan((current) => ({
            status: "error",
            rows: current.rows || [],
            error: err instanceof Error ? err.message : "Market request failed",
            exhausted: true,
            truncated: false,
            note: current.note || "",
            dropped: current.dropped || [],
            droppedCount: current.droppedCount || 0,
            dropToken: current.dropToken || 0,
            scanned: current.scanned || 0,
            removed: current.removed || [],
            removedCount: current.removedCount || 0,
            waiting: false,
            startedAt: current.startedAt,
            completedAt: Date.now(),
            request: current.request,
            serverFilters: current.serverFilters,
            requirements: current.requirements,
          }));
        });
    }, 400);
    return () => {
      window.clearTimeout(timer);
      ac.abort();
    };
  }, [liveBookScan, liveScopeScan, attributeFilters, livePicks, liveClientColumns, rowLimit, sortKeys, planLimit, previewRefreshNonce]);

  const liveMatchedRows = useMemo(() => {
    if (!liveMarketSearch) return null;
    const fromScan = liveBookScan || liveScopeScan;
    const source = fromScan ? liveScan.rows : livePicks.length ? livePickRows : null;
    if (!source) return null;
    const matched = fromScan ? source : source.filter((row) => rowMatchesAttributes(row, liveClientColumns, attributeFilters));
    const sorted = sortAttributeRows(matched, liveClientColumns, sortKeys);
    const requested = Number(rowLimit);
    const caps = [KALSHI_LIVE_MARKET_SCAN_CAP];
    if (typeof planLimit === "number" && planLimit > 0) caps.push(planLimit);
    if (Number.isFinite(requested) && requested > 0) caps.push(requested);
    return sorted.slice(0, Math.min(...caps));
  }, [liveMarketSearch, liveBookScan, liveScopeScan, liveScan.rows, livePicks.length, livePickRows, liveClientColumns, attributeFilters, sortKeys, rowLimit, planLimit]);

  const livePreviewRows = useMemo(
    () => (liveMatchedRows ? liveMatchedRows.slice(0, PREVIEW_ROW_CAP) : null),
    [liveMatchedRows],
  );

  useEffect(() => {
    if (!livePreviewRows) return;
    setVisibleCount(livePreviewRows.length);
  }, [livePreviewRows]);

  const liveNarrowing = liveBookScan || liveScopeScan || livePicks.length > 0;
  const hadLiveNarrowing = useRef(false);
  const appliedLiveNonce = useRef(0);

  useEffect(() => {
    if (!liveMarketSearch) return undefined;
    const previousHad = hadLiveNarrowing.current;
    const previousNonce = appliedLiveNonce.current;
    const nonceBumped = previewRefreshNonce !== previousNonce;
    const leftNarrowing = previousHad && !liveNarrowing;
    hadLiveNarrowing.current = liveNarrowing;
    if (liveNarrowing) {
      if (nonceBumped) appliedLiveNonce.current = previewRefreshNonce;
      return undefined;
    }
    if (!leftNarrowing && !nonceBumped) return undefined;
    appliedLiveNonce.current = previewRefreshNonce;
    const cached = baseRowsRef.current;
    if (cached.length) setVisibleCount(cached.length);
    let cancel = false;
    let settled = false;
    setPreviewSearchError("");
    setPreviewRefreshing(true);
    loadBuildPreview(integrationId, tableId, { fresh: true })
      .then((result) => {
        if (cancel) return;
        const rows = Array.isArray(result?.rows) ? result.rows : [];
        baseRowsRef.current = rows;
        setPull((current) => (current ? { ...current, rows } : current));
        setVisibleCount(rows.length);
      })
      .catch((err) => {
        if (cancel) return;
        setPreviewSearchError(err instanceof Error ? err.message : "Could not load preview rows");
      })
      .finally(() => {
        settled = true;
        if (cancel) return;
        setPreviewRefreshing(false);
      });
    return () => {
      cancel = true;
      if (!settled) {
        hadLiveNarrowing.current = previousHad;
        appliedLiveNonce.current = previousNonce;
      }
    };
  }, [liveMarketSearch, liveNarrowing, previewRefreshNonce, integrationId, tableId]);

  function addLivePick(pick) {
    if (!pick?.id || liveFetchRef.current.has(pick.id)) return;
    liveFetchRef.current.add(pick.id);
    setLivePicks((prev) => (prev.some((item) => item.id === pick.id) ? prev : [...prev, { ...pick, status: "loading", rows: [], error: "" }]));
    const load =
      pick.kind === "market"
        ? loadKalshiLiveMarketByTicker(pick.ticker).then((row) => (row ? [row] : []))
        : loadKalshiLiveMarketsForScope({
            seriesTicker: pick.kind === "series" ? pick.ticker : "",
            eventTicker: pick.kind === "event" ? pick.ticker : "",
          });
    load
      .then((rows) => {
        const ready = Array.isArray(rows) ? rows : [];
        setLivePicks((list) =>
          list.map((item) =>
            item.id === pick.id
              ? {
                  ...item,
                  status: ready.length ? "ready" : "error",
                  rows: ready,
                  error: ready.length ? "" : "No markets returned",
                }
              : item,
          ),
        );
      })
      .catch((err) => {
        setLivePicks((list) =>
          list.map((item) =>
            item.id === pick.id
              ? { ...item, status: "error", rows: [], error: err instanceof Error ? err.message : "Market request failed" }
              : item,
          ),
        );
      });
  }

  function removeLivePick(id) {
    liveFetchRef.current.delete(id);
    setLivePicks((prev) => prev.filter((item) => item.id !== id));
  }

  function addPolymarketPick(suggestion) {
    const pick = polymarketPickFromSuggestion(suggestion);
    if (!pick) return;
    setLivePicks((prev) => (prev.some((item) => item.id === pick.id) ? prev : [...prev, pick]));
  }

  function addDirectPick(pick) {
    const forecastPick = tableId === "event_forecast" && (pick?.kind === "event" || pick?.kind === "series");
    const eventCandlePick = tableId === "event_candlesticks" && pick?.kind === "event";
    const multivariatePick = tableId === "multivariate_events" && pick?.kind === "series";
    if ((tableId === "series" && pick?.kind === "series") || (tableId === "events" && pick?.kind === "event") || forecastPick || eventCandlePick || multivariatePick) {
      setLivePicks((prev) => (prev.some((item) => item.id === pick.id) ? prev : [...prev, { ...pick, status: "ready", rows: [], error: "" }]));
      return;
    }
    addLivePick(pick);
  }

  const directMarkets = useMemo(
    () => (liveMarketFanout ? directMarketTickers(livePicks) : []),
    [liveMarketFanout, livePicks],
  );
  const directSeries = useMemo(
    () => (liveDirect && tableId === "series" ? directSeriesTickers(livePicks) : []),
    [liveDirect, livePicks, tableId],
  );
  const seriesBrowsing = liveSeriesSearch && !directSeries.length && !seriesDiscoveryCategories(attributeFilters).length;
  const directEvents = useMemo(
    () => (liveDirect && tableId === "events" ? directEventTickers(livePicks) : []),
    [liveDirect, livePicks, tableId],
  );
  const eventsBrowsing =
    liveEventSearch && !directEvents.length && !eventStatuses.length && !eventSeries && !eventMinCloseTs && !seriesMinUpdatedTs;
  const multivariateSeries = useMemo(
    () => (liveMultivariate ? directSeriesTickers(livePicks) : []),
    [liveMultivariate, livePicks],
  );
  const forecastTargets = useMemo(
    () => (liveForecast ? forecastPullTargets(livePicks) : { events: [], seriesTickers: [] }),
    [liveForecast, livePicks],
  );
  const forecastPercentileKey = liveForecast ? forecastPercentileValues(attributeFilters).join(",") : "";
  const sampleMarketTicker = useMemo(() => {
    if (!liveMarketFanout) return "";
    const row = pull?.rows?.[0];
    return String(row?.market_ticker || row?.ticker || "").trim();
  }, [liveMarketFanout, pull?.rows]);

  useEffect(() => {
    if (!liveDirect) return undefined;
    const ticker = directMarkets[0]?.ticker || sampleMarketTicker;
    if (tableId === "series") {
      if (!directSeries.length && !seriesCategories.length && !seriesColumnFilterKey) {
        setDirectPreview({ status: "idle", rows: [], error: "", ticker: "" });
        return undefined;
      }
    } else if (tableId === "events") {
      if (!directEvents.length && !eventStatuses.length && !eventSeries && !eventMinCloseTs && !seriesMinUpdatedTs && !eventColumnFilterKey) {
        setDirectPreview({ status: "idle", rows: [], error: "", ticker: "" });
        return undefined;
      }
    } else if (tableId === "event_forecast") {
      if (!forecastTargets.events.length && !forecastTargets.seriesTickers.length) {
        setDirectPreview({ status: "idle", rows: [], error: "", ticker: "" });
        return undefined;
      }
    } else if (tableId === "event_candlesticks") {
      if (!eventCandleEvents.length) {
        setDirectPreview({ status: "idle", rows: [], error: "", ticker: "" });
        return undefined;
      }
      if (eventCandlePreviewMarkets.status === "loading") {
        setDirectPreview({ status: "loading", rows: [], error: "", ticker: eventCandleEvents[0].eventTicker });
        return undefined;
      }
    } else if (tableId === "multivariate_events") {
      const seriesList = multivariateSeries.length ? multivariateSeries : eventSeriesTickers(attributeFilters);
      if (seriesList.length && multivariateCollection) {
        setDirectPreview({ status: "error", rows: [], error: "Use either a series or a collection ticker.", ticker: "" });
        return undefined;
      }
      if (!seriesList.length && !multivariateCollection && !multivariateColumnFilterKey) {
        setDirectPreview({ status: "idle", rows: [], error: "", ticker: "" });
        return undefined;
      }
    } else if (isKalshiLiveTraderTable(tableId)) {
      const directed =
        tableId === "leaderboard" ||
        tableId === "trades_by_holder" ||
        (tableId === "search_traders" && traderQuery.length >= 2) ||
        (tableId === "holder_profile" && Boolean(traderProfileKey)) ||
        (tableId === "holder_positions" && Boolean(traderPositionsKey));
      if (!directed) {
        setDirectPreview({ status: "idle", rows: [], error: "", ticker: "" });
        return undefined;
      }
    } else if (!ticker) {
      setDirectPreview({ status: "idle", rows: [], error: "", ticker: "" });
      return undefined;
    }
    let cancel = false;
    const traderTable = isKalshiLiveTraderTable(tableId);
    const seriesMatch = seriesColumnFilterKey
      ? (row) => rowMatchesAttributes(row, seriesAttributeColumns, attributeFilters)
      : null;
    const eventMatch = eventColumnFilterKey
      ? (row) => rowMatchesAttributes(row, eventAttributeColumns, attributeFilters)
      : null;
    const multivariateMatch = multivariateColumnFilterKey
      ? (row) => rowMatchesAttributes(row, multivariateRowColumns, attributeFilters)
      : null;
    // The series list is the whole result. The grid still shows PREVIEW_ROW_CAP.
    const seriesFetchCap = typeof planLimit === "number" && planLimit > 0 ? planLimit : PREVIEW_ROW_CAP;
    const askedRows = Number(rowLimit);
    const traderCap = (max) => Math.min(max, Number.isFinite(askedRows) && askedRows > 0 ? askedRows : max);
    const spec =
      tableId === "series"
        ? directSeries.length
          ? { mode: "tickers", tickers: directSeries, limit: seriesFetchCap }
          : {
              mode: "discover",
              categories: seriesCategories,
              unscoped: !seriesCategories.length,
              match: seriesMatch,
              includeProductMetadata: seriesProductMetadata,
              minUpdatedTs: seriesMinUpdatedTs,
              limit: seriesMatch ? traderCap(PREVIEW_ROW_CAP) : seriesFetchCap,
            }
        : tableId === "events"
          ? directEvents.length
            ? {
                mode: "tickers",
                tickers: directEvents,
                match: eventMatch,
                includeMarkets: eventIncludeMarkets,
                includeMilestones: eventIncludeMilestones,
                limit: seriesFetchCap,
              }
            : {
                mode: "discover",
                statuses: eventStatuses,
                seriesTickers: eventSeriesTickers(attributeFilters),
                minCloseTs: eventMinCloseTs,
                minUpdatedTs: seriesMinUpdatedTs,
                match: eventMatch,
                maxPages: eventMatch ? 10 : 25,
                includeMarkets: eventIncludeMarkets,
                includeMilestones: eventIncludeMilestones,
                limit: eventMatch ? traderCap(PREVIEW_ROW_CAP) : seriesFetchCap,
              }
          : traderTable
            ? { ...kalshiTraderPullSpec(tableId, attributeFilters), limit: traderCap(tableId === "leaderboard" ? 100 : 50) }
            : tableId === "event_forecast"
                    ? {
                        events: forecastTargets.events,
                        seriesTickers: forecastTargets.seriesTickers,
                        minTs: directWindow.minTs,
                        maxTs: directWindow.maxTs,
                        period: directWindow.period ?? 60,
                        percentiles: forecastPercentileValues(attributeFilters),
                        limit: PREVIEW_ROW_CAP,
                        previewFirst: true,
                      }
                    : tableId === "event_candlesticks"
                      ? {
                          eventTicker: eventCandleEvents[0]?.eventTicker || "",
                          seriesTicker: eventCandleEvents[0]?.seriesTicker || "",
                          minTs: eventCandleWindow?.minTs,
                          maxTs: eventCandleWindow?.maxTs,
                          period: eventCandleWindow?.period || 60,
                          limit: PREVIEW_ROW_CAP,
                          pages: 2,
                        }
                      : tableId === "multivariate_events"
                        ? {
                            seriesTickers: multivariateSeries.length ? multivariateSeries : eventSeriesTickers(attributeFilters),
                            collectionTicker: multivariateSeries.length || eventSeriesTickers(attributeFilters).length ? "" : multivariateCollection,
                            includeMarkets: eventIncludeMarkets,
                            match: multivariateMatch,
                            maxPages: multivariateMatch ? 10 : 2,
                            limit: multivariateMatch ? traderCap(PREVIEW_ROW_CAP) : seriesFetchCap,
                          }
                        : {
                      ticker,
                      ...marketDirectWindow(directMarkets.find((market) => market.ticker === ticker)),
                      limit: tableId === "candlesticks" ? KALSHI_CANDLESTICK_MAX_CANDLES : PREVIEW_ROW_CAP,
                    };
    const pause = seriesMatch || eventMatch ? 280 : 0;
    const timer = window.setTimeout(() => {
      if (cancel) return;
      setDirectPreview((current) =>
        traderTable && current.status === "ready"
          ? current
          : { status: "loading", rows: current.rows || [], error: "", ticker, events: current.events || [] },
      );
      loadKalshiLiveDirect(tableId, spec)
        .then((result) => {
          if (cancel) return;
          const candleMarkets =
            tableId === "event_candlesticks" ? eventCandleSheetMarkets(result?.byMarket, eventCandlePreviewMarkets.rows) : [];
          const rows = tableId === "event_candlesticks" ? candleMarkets[0]?.rows || [] : result?.rows || [];
          const absentKey = `${integrationId}:${tableId}:`;
          for (const column of result?.columns || []) {
            if (columnMissingFromRows(rows, column.id)) knownAbsentRef.current.add(absentKey + column.id);
          }
          setDirectPreview({
            status: "ready",
            rows,
            error: "",
            ticker: ticker || directSeries[0] || directEvents[0] || eventCandleEvents[0]?.eventTicker || multivariateSeries[0] || forecastTargets.events[0]?.eventTicker || forecastTargets.seriesTickers[0] || "",
            truncated: Boolean(result?.truncated),
            visibility: result?.visibility || "",
            events: Array.isArray(result?.events) ? result.events : [],
            candleMarkets: candleMarkets.map((market) => market.ticker),
          });
          setVisibleCount(Math.min(rows.length, PREVIEW_ROW_CAP));
        })
        .catch((err) => {
          if (cancel) return;
          setDirectPreview({
            status: "error",
            rows: [],
            error: err instanceof Error ? err.message : "The pull failed",
            ticker: "",
          });
        });
    }, pause);
    return () => {
      cancel = true;
      window.clearTimeout(timer);
    };
  }, [columnRefillNonce, directEvents, directMarkets, directRangePreset, directSeries, directWindow.depth, directWindow.includeLatest, directWindow.maxTs, directWindow.minTs, directWindow.period, eventAttributeColumns, eventCandleEvents, eventCandlePreviewMarkets, eventCandleWindow?.maxTs, eventCandleWindow?.minTs, eventCandleWindow?.period, eventColumnFilterKey, eventIncludeMarkets, eventIncludeMilestones, eventMinCloseTs, eventSeriesKey, eventStatusKey, forecastPercentileKey, forecastTargets, liveDirect, multivariateCollection, multivariateColumnFilterKey, multivariateRowColumns, multivariateSeries, planLimit, rowLimit, sampleMarketTicker, seriesAttributeColumns, seriesCategoryKey, seriesColumnFilterKey, seriesMinUpdatedTs, seriesProductMetadata, tableId, traderCategoryKey, traderHoldingsOn, traderMetric, traderMetricsOn, traderPeriod, traderPositionsKey, traderProfileKey, traderQuery, traderSpecKey]);

  const seriesImportRows = useMemo(() => {
    if (!(liveDirect && tableId === "series" && directPreview.status === "ready")) return null;
    const matched = (directPreview.rows || []).filter((row) =>
      rowMatchesAttributes(row, seriesAttributeColumns, attributeFilters),
    );
    return sortAttributeRows(matched, seriesAttributeColumns, sortKeys);
  }, [attributeFilters, directPreview.rows, directPreview.status, liveDirect, seriesAttributeColumns, sortKeys, tableId]);
  const eventImportRows = useMemo(() => {
    if (!(liveDirect && tableId === "events" && directPreview.status === "ready")) return null;
    const matched = (directPreview.rows || []).filter((row) =>
      rowMatchesAttributes(row, eventAttributeColumns, attributeFilters),
    );
    return sortAttributeRows(matched, eventAttributeColumns, sortKeys);
  }, [attributeFilters, directPreview.rows, directPreview.status, eventAttributeColumns, liveDirect, sortKeys, tableId]);
  const traderImportRows = useMemo(() => {
    if (!(liveTrader && directPreview.status === "ready")) return null;
    const matched = (directPreview.rows || []).filter((row) =>
      rowMatchesAttributes(row, traderAttributeColumns, attributeFilters),
    );
    return sortAttributeRows(matched, traderAttributeColumns, sortKeys);
  }, [attributeFilters, directPreview.rows, directPreview.status, liveTrader, sortKeys, traderAttributeColumns]);
  const listImportRows = tableId === "events" ? eventImportRows : liveTrader ? traderImportRows : seriesImportRows;
  // The catalog sample is on screen before a directed pull. Column attributes narrow it immediately.
  const idleAttributeRows = useMemo(() => {
    if (!liveDirect || directPreview.status !== "idle") return null;
    const columns = liveEventSearch
      ? eventAttributeColumns
      : liveSeriesSearch
        ? seriesAttributeColumns
        : liveTrader
          ? traderAttributeColumns
          : liveForecast
            ? forecastRowColumns
            : liveMultivariate
              ? multivariateRowColumns
              : liveMarketFanout || liveEventCandles
                ? directRowColumns
                : null;
    if (!columns?.length) return null;
    if (!columnFilterKey(columns, attributeFilters) && !sortKeys.length) return null;
    const matched = (pull?.rows || []).filter((row) => rowMatchesAttributes(row, columns, attributeFilters));
    return sortAttributeRows(matched, columns, sortKeys);
  }, [attributeFilters, directPreview.status, directRowColumns, eventAttributeColumns, forecastRowColumns, liveDirect, liveEventCandles, liveEventSearch, liveForecast, liveMarketFanout, liveMultivariate, liveSeriesSearch, liveTrader, multivariateRowColumns, pull?.rows, seriesAttributeColumns, sortKeys, traderAttributeColumns]);

  const polymarketSheetSource = useMemo(() => {
    if (!polymarketLive || polymarketDirected.status !== "ready") return null;
    const rows = polymarketDirected.rows || [];
    if (!polymarketFanoutOn || !polymarketActivePick) return rows;
    return polymarketRowsForMarket(rows, polymarketActivePick, livePicks);
  }, [livePicks, polymarketActivePick, polymarketDirected.rows, polymarketDirected.status, polymarketFanoutOn, polymarketLive]);

  const filteredRows = useMemo(() => {
    const requested = Number(rowLimit);
    const capPreview = (rows) => {
      const limited = Number.isFinite(requested) && requested > 0 ? rows.slice(0, requested) : rows;
      return limited;
    };
    if (pairStreamOn) return capPreview((pairStreams[activeStreamPair]?.rows || []).slice(-PREVIEW_ROW_CAP).reverse());
    if (polymarketLive) {
      const scanning = (tableId === "getMarkets" || tableId === "getSamplingMarkets") && polymarketScan.status !== "idle";
      const waiting = polymarketDirected.status === "loading" || (polymarketRequirement && polymarketDirected.status === "idle");
      const source = scanning
        ? polymarketScan.rows || []
        : tableId === "getBiggestWinners" && polymarketDirected.status === "loading"
          ? polymarketDirected.rows || []
          : polymarketDirected.status === "ready"
            ? polymarketSheetSource || []
            : waiting
              ? []
              : pull?.rows || [];
      const columns = scanning
        ? tableId === "getSamplingMarkets"
          ? polymarketSamplingColumns
          : polymarketMarketColumns
          : polymarketBiggestWinnersColumns.length
          ? polymarketBiggestWinnersColumns
          : polymarketLeaderboardColumns.length
            ? polymarketLeaderboardColumns
            : polymarketPositionColumns.length
              ? polymarketPositionColumns
            : polymarketPnlColumns.length
              ? polymarketPnlColumns
            : polymarketActivityColumns.length
              ? polymarketActivityColumns
            : polymarketQuoteColumns.length
              ? polymarketQuoteColumns
              : pull?.columns || [];
      const matched = scanning ? source : source.filter((row) => rowMatchesAttributes(row, columns, attributeFilters));
      const sorted = sortAttributeRows(matched, columns, sortKeys);
      return capPreview(sorted.slice(0, PREVIEW_ROW_CAP));
    }
    if (listImportRows) return capPreview(listImportRows.slice(0, Math.min(visibleCount, PREVIEW_ROW_CAP)));
    if ((liveMarketFanout || liveForecast || liveEventCandles || liveMultivariate) && directPreview.status !== "idle") {
      const columns = liveForecast ? forecastRowColumns : liveMultivariate ? multivariateRowColumns : directRowColumns;
      const matched = (directPreview.rows || []).filter((row) => rowMatchesAttributes(row, columns, attributeFilters));
      const sorted = sortAttributeRows(matched, columns, sortKeys);
      return capPreview(sorted.slice(0, visibleCount));
    }
    if (liveDirect && directPreview.status !== "idle") return capPreview((directPreview.rows || []).slice(0, visibleCount));
    if (livePreviewRows) return capPreview(livePreviewRows.slice(0, visibleCount));
    if (idleAttributeRows) return capPreview(idleAttributeRows.slice(0, Math.min(visibleCount, PREVIEW_ROW_CAP)));
    if (guidedFilters) {
      const key = historicalPreviewRequestKey({
        guidedFilters,
        columns: pull?.columns,
        attributeFilters,
        sortKeys,
        integrationId,
        tableId,
      });
      // A changed attribute, sort, or table waits for a new archive sample.
      // The rows already on screen are a different query.
      const waitingOnArchive = Boolean(key) && (key !== settledPreviewKey || Boolean(previewSearchError));
      const source = waitingOnArchive ? [] : pull?.rows || [];
      const limit = Number(rowLimit);
      const capped = Number.isFinite(limit) && limit > 0 ? source.slice(0, limit) : source;
      return capped.slice(0, visibleCount);
    }
    const rowsAll = pull?.rows || [];
    const revealCap =
      visibleCount === 0 && liveMarketSearch && !liveNarrowing && hadLiveNarrowing.current
        ? rowsAll.length
        : visibleCount;
    const rows = rowsAll.slice(0, revealCap);
    const query = filterValue.trim().toLowerCase();
    const matched = !query || !filterColumn ? rows : rows.filter((row) => String(row[filterColumn] ?? "").toLowerCase().includes(query));
    return capPreview(matched);
  }, [pairStreamOn, pairStreams, activeStreamPair, directPreview.rows, directPreview.status, directRowColumns, forecastRowColumns, pull, visibleCount, filterColumn, filterValue, guidedFilters, attributeFilters, sortKeys, rowLimit, integrationId, tableId, settledPreviewKey, previewSearchError, livePreviewRows, liveMarketSearch, liveDirect, liveEventCandles, liveForecast, liveMarketFanout, liveMultivariate, liveNarrowing, multivariateRowColumns, seriesAttributeColumns, listImportRows, idleAttributeRows, polymarketLive, polymarketDirected, polymarketRequirement, polymarketScan, polymarketMarketColumns, polymarketSamplingColumns, polymarketBiggestWinnersColumns, polymarketLeaderboardColumns, polymarketActivityColumns, polymarketPnlColumns, polymarketPositionColumns, polymarketQuoteColumns, polymarketSheetSource]);

  const queriedMarkets = useMemo(() => {
    if (!guidedFilters) return [];
    const key = historicalPreviewRequestKey({
      guidedFilters,
      columns: pull?.columns,
      attributeFilters,
      sortKeys,
      integrationId,
      tableId,
    });
    if (key && (key !== settledPreviewKey || previewSearchError)) return [];
    const limit = Number(rowLimit);
    const capped = Number.isFinite(limit) && limit > 0 ? (pull?.rows || []).slice(0, limit) : pull?.rows || [];
    return join ? join.marketsFromRows(capped, Number.MAX_SAFE_INTEGER) : [];
  }, [guidedFilters, pull, attributeFilters, sortKeys, rowLimit, join, integrationId, tableId, settledPreviewKey, previewSearchError]);

  const marketCap = getJoinMarketCap(user);
  const traderJoinNames = useMemo(() => {
    if (!liveTraderList) return [];
    const source = Array.isArray(traderImportRows) ? traderImportRows : filteredRows;
    return traderNicknamesFromRows(source, marketCap);
  }, [filteredRows, liveTraderList, marketCap, traderImportRows]);
  const requestedMarketLimit = Number(rowLimit);
  const hasRowLimit = Number.isFinite(requestedMarketLimit) && requestedMarketLimit > 0;
  const queryRows = hasRowLimit
    ? typeof universe === "number"
      ? Math.min(universe, requestedMarketLimit)
      : requestedMarketLimit
    : typeof universe === "number"
      ? universe
      : null;
  const sheetCount = Math.min(queryRows == null ? queriedMarkets.length : queryRows, marketCap);
  const joinedMarkets = queriedMarkets.slice(0, marketCap);
  const previewTicker = joinedMarkets[0]?.ticker || "";
  const previewLabel = joinedMarkets[0]?.label || previewTicker;
  const previewTokenKey = (joinedMarkets[0]?.tokens || []).join("|");
  const previewOutcomeKey = (joinedMarkets[0]?.outcomes || []).join("|");

  useEffect(() => {
    if (joinTarget !== joinTradesTarget || !previewTicker) {
      if (!previewTicker) setTradePreview({ status: "idle", ticker: "", columns: [], rows: [], error: "" });
      return undefined;
    }
    let cancel = false;
    const startedAt = Date.now();
    const onPhase = (info) => {
      if (cancel) return;
      setTradePreview((current) => {
        if (current.status !== "loading" || current.ticker !== previewTicker) return current;
        const progress = { ...(current.progress || {}) };
        if (info?.dataScannedBytes != null) progress.scannedBytes = info.dataScannedBytes;
        if (info?.phase === "athena_succeeded") progress.queryDoneAt = progress.queryDoneAt || Date.now();
        if (info?.phase === "downloading" || info?.phase === "downloading_page") {
          progress.queryDoneAt = progress.queryDoneAt || Date.now();
          progress.downloadAt = progress.downloadAt || Date.now();
          if (Number.isFinite(info?.processed)) progress.processed = info.processed;
        }
        return { ...current, progress };
      });
    };
    const load = join?.loadTrades(
      {
        ticker: previewTicker,
        tokens: previewTokenKey ? previewTokenKey.split("|") : [],
        outcomes: previewOutcomeKey ? previewOutcomeKey.split("|") : [],
      },
      undefined,
      { onPhase },
    );
    if (!load) return undefined;
    setJoinTab(previewTicker);
    setTradePreview({ status: "loading", ticker: previewTicker, columns: [], rows: [], error: "", progress: { startedAt } });
    load
      .then((result) => {
        if (cancel) return;
        setTradePreview({ status: "ready", ticker: previewTicker, columns: result.columns, rows: result.rows, error: "" });
      })
      .catch((err) => {
        if (cancel) return;
        setTradePreview((current) => ({
          status: "error",
          ticker: previewTicker,
          columns: [],
          rows: [],
          error: err instanceof Error ? err.message : "Trades preview failed",
          progress: { ...(current.progress || {}), startedAt, failedAt: Date.now() },
        }));
      });
    return () => {
      cancel = true;
    };
  }, [join, joinTarget, joinTradesTarget, previewOutcomeKey, previewTicker, previewTokenKey]);

  useEffect(() => {
    if (!tradesQuery || joinTarget !== joinMarketsTarget) {
      setMarketPreview((current) => (current.status === "idle" ? current : { status: "idle", key: "", columns: [], rows: [], error: "" }));
      return undefined;
    }
    const keys = join ? filteredRows.flatMap((row) => join.tradeKeys(row)) : [];
    const key = keys.join("\n");
    if (!key || !join) {
      setMarketPreview({ status: "ready", key: "", columns: [], rows: [], error: "" });
      return undefined;
    }
    let cancel = false;
    setMarketPreview({ status: "loading", key, columns: [], rows: [], error: "" });
    const load = join.loadMarkets(filteredRows);
    load
      .then((result) => {
        if (cancel) return;
        setMarketPreview({ status: "ready", key, columns: result.columns || [], rows: result.rows || [], error: "" });
      })
      .catch((err) => {
        if (cancel) return;
        setMarketPreview({
          status: "error",
          key,
          columns: [],
          rows: [],
          error: err instanceof Error ? err.message : "Market metadata preview failed",
        });
      });
    return () => {
      cancel = true;
    };
  }, [tradesQuery, join, joinTarget, joinMarketsTarget, filteredRows]);

  const previewRequestKey = useMemo(
    () =>
      historicalPreviewRequestKey({
        guidedFilters,
        columns: pull?.columns,
        attributeFilters,
        sortKeys,
        integrationId,
        tableId,
      }),
    [guidedFilters, pull?.columns, attributeFilters, sortKeys, integrationId, tableId],
  );

  useEffect(() => {
    if (!guidedFilters || !join) return undefined;
    const columns = pull?.columns;
    if (!columns?.length) return undefined;
    const predicates = buildAttributePredicates(columns, attributeFilters);
    if (!previewRequestKey) {
      const nonceBumped = previewRefreshNonce !== appliedPreviewNonce.current;
      const leaveFilter = usingFilteredSample.current;
      if (!nonceBumped && !leaveFilter) {
        setPreviewRefreshing(false);
        setPreviewSearchError("");
        setSettledPreviewKey("");
        return undefined;
      }
      appliedPreviewNonce.current = previewRefreshNonce;
      let cancel = false;
      setPreviewSearchError("");
      setSettledPreviewKey("");
      setPreviewRefreshing(true);
      loadBuildPreview(integrationId, tableId, { fresh: true })
        .then((result) => {
          if (cancel) return;
          const rows = Array.isArray(result?.rows) ? result.rows : [];
          usingFilteredSample.current = false;
          baseRowsRef.current = rows;
          setPull((current) => (current ? { ...current, rows } : current));
          setVisibleCount(rows.length);
        })
        .catch((err) => {
          if (cancel) return;
          setPreviewSearchError(err instanceof Error ? err.message : "Could not load preview rows");
        })
        .finally(() => {
          if (cancel) return;
          setPreviewRefreshing(false);
        });
      return () => {
        cancel = true;
      };
    }
    appliedPreviewNonce.current = previewRefreshNonce;
    let cancel = false;
    const key = previewRequestKey;
    setPreviewSearchError("");
    setPreviewRefreshing(true);
    const timer = window.setTimeout(() => {
      join.loadPreview(tableId, predicates, sortKeys)
        .then((result) => {
          if (cancel) return;
          const rows = Array.isArray(result?.rows) ? result.rows : [];
          usingFilteredSample.current = true;
          setPull((current) => (current ? { ...current, rows } : current));
          setVisibleCount(rows.length);
        })
        .catch((err) => {
          if (cancel) return;
          setPreviewSearchError(err instanceof Error ? err.message : "Could not search for matching rows");
        })
        .finally(() => {
          if (cancel) return;
          setSettledPreviewKey(key);
          setPreviewRefreshing(false);
        });
    }, 400);
    return () => {
      cancel = true;
      window.clearTimeout(timer);
    };
  }, [guidedFilters, join, attributeFilters, pull?.columns, sortKeys, tableId, previewRequestKey, previewRefreshNonce, integrationId]);

  useEffect(() => {
    if (!previewRefreshNonce || guidedFilters || liveMarketSearch) return undefined;
    let cancel = false;
    setPreviewSearchError("");
    setPreviewRefreshing(true);
    loadBuildPreview(integrationId, tableId, { fresh: true })
      .then((result) => {
        if (cancel) return;
        const rows = Array.isArray(result?.rows) ? result.rows : [];
        baseRowsRef.current = rows;
        setPull((current) => (current ? { ...current, rows, columns: result.columns || current.columns } : result));
        setVisibleCount(rows.length);
      })
      .catch((err) => {
        if (cancel) return;
        setPreviewSearchError(err instanceof Error ? err.message : "Could not load preview rows");
      })
      .finally(() => {
        if (cancel) return;
        setPreviewRefreshing(false);
      });
    return () => {
      cancel = true;
    };
  }, [previewRefreshNonce, guidedFilters, liveMarketSearch, integrationId, tableId]);

  const accountId = user?.userId || "";

  useEffect(() => {
    setSaved([]);
    setPulls([]);
    if (!accountId) return undefined;
    discardSharedQueryStorage();
    let cancel = false;
    loadWorkspaceQueries().then((result) => {
      if (cancel) return;
      const next = result.ok ? { saved: result.saved, pulls: result.pulls } : readUserQueryCache(accountId);
      setSaved(next.saved);
      setPulls(next.pulls);
      if (result.ok) writeUserQueryCache(accountId, next);
    });
    return () => {
      cancel = true;
    };
  }, [accountId]);

  const savedForSource = saved.filter((item) => item.integrationId === integrationId);
  const pullsForSource = pulls.filter((item) => item.integrationId === integrationId);

  function payloadRowsNow() {
    if (polymarketLive && polymarketDirected.status === "ready") return polymarketDirected.rows || [];
    if (
      polymarketLive &&
      (tableId === "getMarkets" || tableId === "getSamplingMarkets") &&
      polymarketScan.status !== "idle"
    ) {
      return polymarketScan.rows || [];
    }
    if (liveDirect && directPreview.status !== "idle") return directPreview.rows || [];
    return pull?.rows || [];
  }

  function rememberAbsentColumns(rows, columns) {
    const prefix = `${integrationId}:${tableId}:`;
    for (const column of columns || []) {
      const key = prefix + column.id;
      if (columnMissingFromRows(rows, column.id)) knownAbsentRef.current.add(key);
      else knownAbsentRef.current.delete(key);
    }
  }

  function revealColumns(ids) {
    const list = [...new Set((ids || []).filter(Boolean))];
    if (!list.length) return;
    setFlashColumns(list);
    setFlashToken((token) => token + 1);
    window.clearTimeout(flashTimerRef.current);
    flashTimerRef.current = window.setTimeout(() => setFlashColumns([]), 900);
    const rows = payloadRowsNow();
    const prefix = `${integrationId}:${tableId}:`;
    const missing = list.filter((id) => columnMissingFromRows(rows, id) && !knownAbsentRef.current.has(prefix + id));
    if (missing.length) void refillPayload();
  }

  async function refillPayload() {
    if (refillLockRef.current) return;
    refillLockRef.current = true;
    try {
      let rows = [];
      let columns = pull?.columns || [];
      if (polymarketLive && polymarketDirected.status === "ready") {
        const leaderboard = tableId === "getTraderLeaderboard";
        const biggestWinners = tableId === "getBiggestWinners";
        const traderPositions = tableId === "getTraderPositions";
        const traderActivity = tableId === "getTraderActivity";
        const result = await loadPolymarketLiveTable(tableId, livePicks, {
          filters: attributeFilters,
          rowLimit: leaderboard ? PREVIEW_ROW_CAP : rowLimit,
          planLimit,
          sorts: sortKeys,
          preview: leaderboard || ((biggestWinners || traderPositions || traderActivity) && !(Number(rowLimit) > 0)),
          match: biggestWinners && polymarketBiggestWinnersFilterKey
            ? (row) => rowMatchesAttributes(row, polymarketBiggestWinnersColumns, attributeFilters)
            : undefined,
        });
        rows = result.rows || [];
        if (result.columns?.length) columns = result.columns;
        setPolymarketDirected((current) => ({ ...current, rows }));
      } else if (liveDirect && directPreview.status !== "idle") {
        setColumnRefillNonce((nonce) => nonce + 1);
        return;
      } else {
        const result = await loadBuildPreview(integrationId, tableId, { fresh: true });
        rows = result.rows || [];
        if (result.columns?.length) columns = result.columns;
        baseRowsRef.current = rows;
        setPull((current) => (current ? { ...current, rows, columns } : result));
      }
      rememberAbsentColumns(rows, columns);
    } catch {
      // Keep the rows already on screen. A failed refill must not clear the sheet.
    } finally {
      refillLockRef.current = false;
    }
  }

  function toggleColumn(id) {
    const showing = hidden.has(id);
    setHidden((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    if (showing) revealColumns([id]);
  }

  function selectAllColumns() {
    const ids = (pull?.columns || []).filter((column) => hidden.has(column.id)).map((column) => column.id);
    setHidden(new Set());
    revealColumns(ids);
  }

  function deselectAllColumns() {
    setHidden(new Set((pull?.columns || []).map((column) => column.id)));
  }

  function describeSearch() {
    const columns = pull?.columns || [];
    const parts = [];
    for (const column of columns) {
      const summary = attributeSummary(column, attributeFilters);
      if (summary) parts.push(`${column.title} ${summary}`);
    }
    const sort = sortSummary(columns, sortKeys);
    if (sort) parts.push(sort);
    if (rowLimit) parts.push(`${Number(rowLimit).toLocaleString()} rows`);
    if (!parts.length) {
      const visible = columns.filter((column) => !hidden.has(column.id)).length;
      parts.push(`${visible} ${visible === 1 ? "column" : "columns"}`);
    }
    return `${table?.label || "Search"} · ${parts.join(" · ")}`;
  }

  function athenaRequest() {
    if (!guidedFilters || !join || !pull?.columns?.length) return null;
    const predicates = buildAttributePredicates(pull.columns, attributeFilters);
    const columnIds = pull.columns.filter((column) => !hidden.has(column.id)).map((column) => column.id);
    const requested = Number(rowLimit);
    const caps = [];
    if (typeof planLimit === "number" && planLimit > 0) caps.push(planLimit);
    if (Number.isFinite(requested) && requested > 0) caps.push(requested);
    const request = {
      table: tableId,
      predicates,
      sortKeys,
      columnIds,
      limit: caps.length ? Math.min(...caps) : undefined,
    };
    return join.buildRequest(request);
  }

  function querySnapshot() {
    const hiddenIds = [...hidden].sort();
    const fingerprint = JSON.stringify({
      integrationId,
      tableId,
      hidden: hiddenIds,
      filterColumn,
      filterValue,
      attributeFilters,
      sortKeys,
      rowLimit,
      joinTarget,
    });
    return {
      integrationId,
      tableId,
      label: describeSearch(),
      hidden: hiddenIds,
      filterColumn,
      filterValue,
      attributeFilters,
      sortKeys,
      rowLimit,
      athena: athenaRequest(),
      join:
        joinTarget === joinTradesTarget
          ? {
              target: joinTradesTarget,
              tickers: joinedMarkets.map((market) => market.ticker),
              previewTicker,
            }
          : null,
      fingerprint,
    };
  }

  function onSave() {
    const snapshot = querySnapshot();
    const entry = { ...snapshot, id: `${integrationId}:${tableId}:${Date.now()}`, savedAt: Date.now() };
    setSaved((current) => {
      const next = rememberEntry(current, entry, 40, true);
      if (accountId) writeUserQueryCache(accountId, { saved: next, pulls });
      return next;
    });
    setJustSaved(true);
    window.setTimeout(() => setJustSaved(false), 1600);
    if (!accountId) return;
    saveWorkspaceQuery("saved", entry).then((result) => {
      if (result.ok) return;
      setSaved((current) => current.filter((item) => item.id !== entry.id));
    });
  }

  function applySaved(entry) {
    setStep("query");
    if (!entry || entry.integrationId !== integrationId) return;
    if (entry.tableId && entry.tableId !== tableId) {
      restoreRef.current = entry;
      setTableId(entry.tableId);
      return;
    }
    setHidden(new Set(entry.hidden || []));
    setFilterColumn(entry.filterColumn || "");
    setFilterValue(entry.filterValue || "");
    setAttributeFilters(entry.attributeFilters || {});
    setSortKeys(Array.isArray(entry.sortKeys) ? entry.sortKeys : []);
    setRowLimit(entry.rowLimit || "");
  }

  function onNext() {
    setLockedQuery({ ...querySnapshot(), lockedAt: Date.now() });
    setEnrichPicks(new Set());
    setPreviewSheet("source");
    setFormulaOwner("");
    setHoverJoin(false);
    setHoverFunction(false);
    setJoinTarget("");
    setLiveJoinIds(new Set());
    setDownstreamJoinIds(new Set());
    setDownstreamJoinPreview({});
    setLiveJoinPreview({});
    setFanoutParents(new Set());
    setFanoutSeriesMarkets(false);
    setDetectedJoinIds(new Set());
    setDetectedJoinPreview({});
    setParentLink({
      status: "idle",
      ticker: "",
      market: null,
      marketColumns: [],
      series: null,
      seriesColumns: [],
      seriesTicker: "",
      error: "",
    });
    setJoinPlacement("");
    setMetadataTab("trades");
    setMarketColumnHidden(
      defaultMarketColumnHidden(join?.marketColumns?.() || []),
    );
    setJoinTab("markets");
    setFunctionItems([createFunctionItem()]);
    setActiveFunctionId("");
    setHoverSummarize(false);
    setHoverBucket(false);
    setHoverSample(false);
    setBucketItems([createBucketItem()]);
    setActiveBucketId("");
    setEnrichFolded(new Set());
    setSampleSize("100");
    setSampleMode("seeded");
    setSampleSeed("");
    setSampleShuffle(0);
    setSummaryCells({});
    setSummaryFocus({ columnId: "value", row: 0 });
    setSummaryTab("summary");
    setStep("enrich");
  }

  const shown = loading ? 0 : filteredRows.length;
  const searchingPreview = Boolean(previewRequestKey) && previewRequestKey !== settledPreviewKey;
  const reloadingUnfiltered = guidedFilters && !previewRequestKey && (previewRefreshing || usingFilteredSample.current);
  const settledRowCount = Array.isArray(pull?.rows) ? pull.rows.length : null;
  const noMatchingRows =
    !loading &&
    !searchingPreview &&
    !previewRefreshing &&
    !previewSearchError &&
    Boolean(previewRequestKey) &&
    settledRowCount === 0 &&
    shownColumns.length > 0;
  const unfilteredEmpty =
    !loading &&
    !searchingPreview &&
    !previewRefreshing &&
    !previewSearchError &&
    !reloadingUnfiltered &&
    !liveNarrowing &&
    !previewRequestKey &&
    settledRowCount === 0 &&
    shownColumns.length > 0;
  const previewSampleEmpty = noMatchingRows || unfilteredEmpty;
  // A changed filter hides the old rows until the archive answers, so it loads like an empty sheet.
  const emptyRefresh =
    !loading &&
    shownColumns.length > 0 &&
    (settledRowCount === 0 || (Boolean(guidedFilters) && searchingPreview && !previewSearchError)) &&
    (searchingPreview || reloadingUnfiltered || previewRefreshing);

  function refreshPreview() {
    setPreviewRefreshNonce((nonce) => nonce + 1);
  }
  const livePickAwaitingRows = liveMarketSearch && !loading && shown === 0 && livePicks.some((pick) => pick.status === "loading");
  const liveScanWaiting = liveMarketSearch && liveScan.status === "loading" && shown === 0;
  const columnScanPending =
    liveDirect &&
    directPreview.status === "idle" &&
    (Boolean(eventColumnFilterKey) || Boolean(seriesColumnFilterKey) || Boolean(multivariateColumnFilterKey));
  const directLoading =
    liveDirect &&
    (directPreview.status === "loading" || (columnScanPending && !idleAttributeRows?.length));
  const directExtra =
    liveMarketFanout && directPreview.status === "ready" && directMarkets.length > 1
      ? ` Each market gets its own sheet. The other ${directMarkets.length - 1} ${directMarkets.length === 2 ? "is" : "are"} created when you run.`
      : liveEventCandles && directPreview.status === "ready" && (directPreview.candleMarkets?.length > 1 || eventCandleEvents.length > 1)
        ? (() => {
            const markets = Math.max(0, (directPreview.candleMarkets?.length || 0) - 1);
            const events = eventCandleEvents.length - 1;
            const parts = [
              markets ? `${markets} more ${markets === 1 ? "market" : "markets"}` : "",
              events ? `${events} more ${events === 1 ? "event" : "events"}` : "",
            ].filter(Boolean);
            return ` Each market gets its own sheet. The ${parts.join(" and ")} ${markets + events === 1 ? "is" : "are"} created when you run.`;
          })()
      : tableId === "trades_by_holder" &&
          directPreview.status === "ready" &&
          !directPreview.rows.length &&
          directPreview.visibility &&
          !/^(public|visible)$/i.test(directPreview.visibility)
        ? " These trades are private."
        : polymarketFanoutOn && polymarketDirected.status === "ready"
          ? tableId === "getTraderPositions" || tableId === "getTraderPnlSeries" || tableId === "getTraderActivity"
            ? " Each trader gets its own sheet."
            : " Each market gets its own sheet."
        : "";

  useEffect(() => {
    if (!emptyRefresh && !livePickAwaitingRows && !liveScanWaiting && !directLoading) return undefined;
    setProgress(12);
    const timer = window.setInterval(() => {
      setProgress((current) => (current >= 88 ? current : current + Math.random() * 8));
    }, 280);
    return () => {
      window.clearInterval(timer);
      setProgress(100);
    };
  }, [directLoading, emptyRefresh, livePickAwaitingRows, liveScanWaiting]);
  const livePickLoading = livePicks.some((pick) => pick.status === "loading");
  const liveUpdating = liveScan.status === "loading" || livePickLoading;
  const liveScanNote =
    liveScan.status === "ready" && liveScan.truncated
      ? ` Scan stopped at ${KALSHI_LIVE_MARKET_SCAN_CAP.toLocaleString()} markets.`
      : "";
  const liveSettledEmpty =
    liveMarketSearch &&
    Array.isArray(livePreviewRows) &&
    livePreviewRows.length === 0 &&
    !loading &&
    !liveUpdating &&
    !previewRefreshing &&
    liveScan.status !== "error";
  const directedShown = liveDirect && directPreview.status === "ready" && shown > 0;
  const previewIsEmpty = !pairStreamOn && !directedShown && (previewSampleEmpty || liveSettledEmpty);
  const streamRowTotal = streamPairs.reduce((sum, symbol) => sum + (pairStreams[symbol]?.rows?.length || 0), 0);
  // The grid never shows more than 50. The import count is the known size of this pull
  // (the rows in hand, a counted match, or a historical universe), then capped by the plan and row limit.
  const previewShown = Math.min(shown, PREVIEW_ROW_CAP);
  const polymarketReadyCount =
    polymarketLive &&
    (tableId === "getMarkets" || tableId === "getSamplingMarkets") &&
    polymarketScan.status === "ready"
      ? (polymarketScan.rows || []).length
      : polymarketLive && polymarketDirected.status === "ready"
        ? (polymarketSheetSource || polymarketDirected.rows || []).length
        : null;
  const directReadyCount = (liveMarketFanout || liveForecast || liveEventCandles || liveMultivariate) && directPreview.status === "ready"
    ? (directPreview.rows || []).filter((row) =>
        rowMatchesAttributes(
          row,
          liveForecast ? forecastRowColumns : liveMultivariate ? multivariateRowColumns : directRowColumns,
          attributeFilters,
        ),
      ).length
    : null;
  const directCountOpen =
    directReadyCount != null &&
    ((tableId === "trades" && Boolean(directPreview.truncated)) ||
      (liveForecast && Boolean(directPreview.truncated) && !(Number(rowLimit) > 0)));
  const columnScanOpen =
    Boolean(directPreview.truncated) &&
    (Boolean(eventColumnFilterKey) || Boolean(seriesColumnFilterKey) || Boolean(multivariateColumnFilterKey)) &&
    !(Number(rowLimit) > 0);
  const pullTotal = pairStreamOn
    ? streamRowTotal
    : previewIsEmpty
    ? 0
    : Array.isArray(listImportRows)
      ? (liveTrader &&
          (tableId === "trades_by_holder" || tableId === "search_traders") &&
          directPreview.truncated &&
          !(Number(rowLimit) > 0)) ||
        columnScanOpen
        ? null
        : listImportRows.length
      : directCountOpen
        ? null
        : directReadyCount != null
          ? directReadyCount
          : Array.isArray(liveMatchedRows)
            ? liveMatchedRows.length
            : exactUniverse
              ? typeof universe === "number" && !counting
                ? universe
                : null
              : liveDirect && (directPreview.status === "loading" || directPreview.status === "error")
                ? null
                : polymarketLive && !(Number(rowLimit) > 0) && polymarketReadyCount != null && polymarketReadyCount >= PREVIEW_ROW_CAP
                  ? null
                : polymarketReadyCount != null
                  ? polymarketReadyCount
                : Array.isArray(idleAttributeRows)
                  ? idleAttributeRows.length
                  : settledRowCount;
  const pullTotalText = Number.isFinite(pullTotal)
    ? `${pullTotal.toLocaleString()}${Array.isArray(listImportRows) && directPreview.truncated ? "+" : ""}`
    : "";
  const polymarketMarketUniverse =
    polymarketLive &&
    tableId === "getMarkets" &&
    polymarketScan.status === "idle" &&
    polymarketDirected.status !== "ready" &&
    previewShown > 0;
  const polymarketMatchGuess =
    polymarketLive && tableId === "getMarkets" && polymarketScan.status !== "idle"
      ? polymarketMatchEstimate({
          scanned: polymarketScan.scanned,
          removedCount: polymarketScan.removedCount,
          exhausted: polymarketScan.exhausted,
        })
      : null;
  const polymarketMatchGuessText = formatPolymarketMatchEstimate(polymarketMatchGuess);
  const previewCountLine = (() => {
    const noun = previewShown === 1 ? "row" : "rows";
    const head = `Previewing ${previewShown.toLocaleString()} ${noun}`;
    if (polymarketMarketUniverse) return `${head} of 10M + rows`;
    if (polymarketMatchGuessText && previewShown > 0 && polymarketMatchGuess.total >= previewShown) {
      return `Previewing ${previewShown.toLocaleString()} of ${polymarketMatchGuessText} matching`;
    }
    if (pullTotal == null) return `${head} of …`;
    if (pullTotal > previewShown) {
      const totalNoun = pullTotal === 1 ? "row" : "rows";
      return `Previewing ${previewShown.toLocaleString()} of ${pullTotalText} ${totalNoun}.`;
    }
    return `${head}.`;
  })();
  const previewLine = loading
    ? "Loading the first 50 rows"
      : liveDirect && directPreview.status === "error"
      ? directPreview.error
      : directLoading
        ? "Loading this pull"
        : liveScan.status === "error" && !liveScan.rows?.length
          ? liveScan.error
          : liveMatchedRows
            ? livePickAwaitingRows
              ? "Loading data"
              : liveUpdating
                ? liveScan.waiting
                  ? liveScan.note || "Slowing down."
                  : shown
                    ? previewCountLine
                    : "Checking markets"
                : liveScan.status === "error"
                  ? `${liveScan.error} ${liveMatchedRows.length.toLocaleString()} matching ${liveMatchedRows.length === 1 ? "row" : "rows"} kept.`
                  : `${previewCountLine}${liveScanNote}`
            : `${previewCountLine}${directExtra}`;
  const polymarketScanWaiting = polymarketExplore && polymarketScan.status === "loading" && shown === 0;
  const polymarketRemovalTape = polymarketExplore ? (
    <MarketScanSteps
      source="Polymarket"
      status={polymarketScan.status}
      scanned={polymarketScan.scanned || 0}
      kept={Array.isArray(polymarketScan.rows) ? polymarketScan.rows.length : 0}
      removedCount={polymarketScan.removedCount || 0}
      removed={polymarketScan.removed || []}
      waiting={Boolean(polymarketScan.waiting)}
      note={polymarketScan.note || ""}
      error={polymarketScan.error || ""}
      startedAt={polymarketScan.startedAt || 0}
      completedAt={polymarketScan.completedAt || 0}
      request={polymarketScan.request || "GET /markets/keyset"}
      serverFilters={polymarketScan.serverFilters || []}
      requirements={polymarketScan.requirements || []}
    />
  ) : null;
  const biggestWinnersTape = tableId === "getBiggestWinners" && polymarketBiggestWinnersFilterKey && polymarketDirected.startedAt ? (
    <MarketScanSteps
      source="Polymarket"
      noun="win"
      status={polymarketDirected.status === "ready" || polymarketDirected.status === "error" ? polymarketDirected.status : "loading"}
      scanned={polymarketDirected.scanned || 0}
      kept={Array.isArray(polymarketDirected.rows) ? polymarketDirected.rows.length : 0}
      removedCount={polymarketDirected.removedCount || 0}
      removed={polymarketDirected.removed || []}
      error={polymarketDirected.error || ""}
      startedAt={polymarketDirected.startedAt}
      completedAt={polymarketDirected.completedAt || 0}
      request={polymarketDirected.request || "GET /v2/biggest-winners"}
      requirements={polymarketBiggestWinnersColumns
        .filter((column) => !column.queryOnly && attributeSummary(column, attributeFilters))
        .map((column) => column.title || column.id)}
    />
  ) : null;
  const liveRemovalTape = liveMarketSearch ? (
    <MarketScanSteps
      source={profile.label}
      status={liveScan.status}
      scanned={liveScan.scanned || 0}
      kept={Array.isArray(liveScan.rows) ? liveScan.rows.length : 0}
      removedCount={liveScan.removedCount || 0}
      removed={liveScan.removed || []}
      waiting={Boolean(liveScan.waiting)}
      note={liveScan.note || ""}
      error={liveScan.error || ""}
      startedAt={liveScan.startedAt || 0}
      completedAt={liveScan.completedAt || 0}
      request={liveScan.request || "GET /markets"}
      serverFilters={liveScan.serverFilters || []}
      requirements={liveScan.requirements || []}
    />
  ) : null;
  const marketTickerRequired = liveMarketFanout && (tableId === "trades" || tableId === "candlesticks" || tableId === "orderbook");
  const needsTickerSearch =
    (marketTickerRequired && !directMarkets.length) ||
    (liveEventCandles && !eventCandleEvents.length) ||
    (liveForecast && !forecastTargets.events.length && !forecastTargets.seriesTickers.length);
  const multivariateCenterSearch =
    liveMultivariate &&
    !loading &&
    directPreview.status !== "loading" &&
    !multivariateSeries.length &&
    !eventSeriesTickers(attributeFilters).length &&
    !multivariateCollection &&
    shown === 0 &&
    !error;
  const centerSearch = needsTickerSearch || multivariateCenterSearch;
  const tickerPrompt = marketTickerRequired && !directMarkets.length
    ? "Market ticker required"
    : liveEventCandles && !eventCandleEvents.length
      ? "Event and series required"
      : liveForecast && !forecastTargets.events.length && !forecastTargets.seriesTickers.length
        ? "Event or series required"
        : multivariateCenterSearch
          ? "Search for a series"
          : "";
  const polymarketClosedSheet =
    tableId === "getOrderbooks" &&
    polymarketActivePick?.closed === true &&
    polymarketDirected.status === "ready" &&
    shown === 0;
  const polymarketClosedBook =
    polymarketClosedSheet ||
    polymarketDirected.error === POLYMARKET_CLOSED_ORDERBOOK_MESSAGE ||
    error === POLYMARKET_CLOSED_ORDERBOOK_MESSAGE;
  const liveEmptyLine = polymarketClosedSheet
    ? POLYMARKET_CLOSED_ORDERBOOK_MESSAGE
    : polymarketCenterSearch
    ? polymarketRequirement.prompt
    : tickerPrompt
    ? tickerPrompt
    : liveMarketSearch && liveScan.truncated
      ? `No data found in the first ${KALSHI_LIVE_MARKET_SCAN_CAP.toLocaleString()} markets.`
      : "No data found";
  const previewLineShown = emptyRefresh
    ? "Searching for matching rows"
    : previewSearchError && settledRowCount === 0
      ? previewSearchError
      : previewIsEmpty
        ? liveEmptyLine
        : previewRefreshing && !loading
          ? `${previewLine} · updating`
          : previewLine;
  const availableRows = pullTotal;
  const requestedLimit = Number(rowLimit);
  const importedRows =
    typeof planLimit === "number" && availableRows != null
      ? Math.min(availableRows, planLimit, Number.isFinite(requestedLimit) && requestedLimit > 0 ? requestedLimit : Infinity)
      : null;
  const usesFullPlan = importedRows != null && planLimit > 0 && importedRows >= planLimit;
  const planFill = (() => {
    if (importedRows == null || !planLimit) return 0;
    const ratio = Math.min(100, (importedRows / planLimit) * 100);
    if (ratio <= 0 || ratio >= 100) return ratio;
    return Math.max(ratio, 8);
  })();

  const canProceed = Boolean(pull) && !loading && !error && shownColumns.length > 0;
  const joinOn = step === "enrich" && enrichPicks.has("join");
  const traderJoinKinds = traderJoinChoiceList.map((kind) => kind.id).filter((kind) => traderJoinIds.has(kind));
  const traderJoinOn = liveTraderList && joinOn && traderJoinKinds.length > 0;
  const eventExtraKinds = ["candlesticks", "forecast"].filter((kind) => eventExtraJoinIds.has(kind));
  const eventExtraOn = liveEventSearch && joinOn && eventExtraKinds.length > 0;
  const forecastJoinKinds = ["events", "candlesticks", "markets"].filter((kind) => forecastJoinIds.has(kind));
  const forecastJoinOn = liveForecast && joinOn && forecastJoinKinds.length > 0;
  const relatedExtraOn = eventExtraOn || forecastJoinOn;
  const joinCommitted = marketsQuery && joinOn && Boolean(join) && joinTarget === joinTradesTarget;
  const marketColumnList = useMemo(() => join?.marketColumns?.() || [], [join]);
  const selectedMarketColumns = useMemo(
    () => marketColumnList.filter((column) => !marketColumnHidden.has(column.id)),
    [marketColumnList, marketColumnHidden],
  );
  const tradesJoinPicked = tradesQuery && joinOn && Boolean(join) && joinTarget === joinMarketsTarget;
  const tradesJoinReady = tradesJoinPicked && Boolean(joinPlacement) && selectedMarketColumns.length > 0;
  const historicalEnrich = marketsQuery || tradesQuery;
  const liveJoinList = useMemo(() => {
    if (!liveMarketSearch) return [];
    const source = liveMatchedRows || filteredRows;
    const seen = new Set();
    const markets = [];
    for (const row of source || []) {
      const ticker = String(row?.ticker || "").trim();
      if (!ticker || seen.has(ticker)) continue;
      seen.add(ticker);
      markets.push(kalshiJoinMarket(row));
    }
    return markets;
  }, [liveMarketSearch, liveMatchedRows, filteredRows]);
  const liveJoinMarkets = liveJoinList.slice(0, marketCap);
  const seriesJoinTickers = useMemo(() => {
    if (!liveSeriesSearch && !liveEventSearch) return [];
    const requested = Number(rowLimit);
    // A directed search is the full set. Otherwise the rows already on the sheet are the pull.
    const source = Array.isArray(listImportRows)
      ? Number.isFinite(requested) && requested > 0
        ? listImportRows.slice(0, requested)
        : listImportRows
      : filteredRows;
    const field = liveEventSearch ? "event_ticker" : "ticker";
    const seen = new Set();
    const list = [];
    for (const row of source) {
      const ticker = String(row?.[field] || "").trim();
      if (!ticker || seen.has(ticker)) continue;
      seen.add(ticker);
      list.push({
        ticker,
        title: String(row?.title || ticker),
        seriesTicker: String(row?.series_ticker || "").trim(),
      });
      if (list.length >= marketCap) break;
    }
    return list;
  }, [liveSeriesSearch, liveEventSearch, listImportRows, filteredRows, rowLimit, marketCap]);
  const forecastJoinEvents = useMemo(() => {
    if (!liveForecast) return [];
    const resolved = Array.isArray(directPreview.events) ? directPreview.events : [];
    const source = resolved.length ? resolved : forecastTargets.events;
    const seen = new Set();
    const list = [];
    for (const event of source) {
      const ticker = String(event?.eventTicker || event?.ticker || "").trim();
      if (!ticker || seen.has(ticker)) continue;
      seen.add(ticker);
      list.push({
        ticker,
        title: String(event?.title || ticker),
        seriesTicker: String(event?.seriesTicker || event?.series_ticker || "").trim(),
      });
      if (list.length >= marketCap) break;
    }
    return list;
  }, [liveForecast, directPreview.events, forecastTargets, marketCap]);
  const seriesJoinKey = seriesJoinTickers.map((item) => item.ticker).join("\0");
  const polymarketJoinCatalog = useMemo(() => {
    if (!polymarketLive) return [];
    const series = polymarketSeriesJoinChoices(tableId);
    if (series.length) return [...series, ...polymarketEventJoinChoices("getEvents")];
    const events = polymarketEventJoinChoices(tableId);
    if (events.length) return events;
    const trader = polymarketTraderJoinChoices(tableId);
    if (trader.length) return trader;
    return polymarketJoinChoices(tableId);
  }, [polymarketLive, tableId]);
  const polymarketTraderCatalog = polymarketJoinCatalog.some((item) => item.anchor === "trader");
  const polymarketSeriesCatalog = polymarketJoinCatalog.some((item) => item.anchor === "series");
  const polymarketEventCatalog = !polymarketSeriesCatalog && polymarketJoinCatalog.some((item) => item.anchor === "event");
  const holderTraderChoices = useMemo(() => (polymarketLive ? polymarketHolderTraderJoins() : []), [polymarketLive]);
  const polymarketJoinFromList = polymarketJoinCatalog.length > 0 && polymarketJoinCatalog[0]?.id !== "parent-market";
  const polymarketJoinMarkets = useMemo(() => {
    if (!polymarketJoinCatalog.length || polymarketSeriesCatalog) return [];
    if (polymarketTraderCatalog) {
      const source = polymarketScan.status !== "idle" && polymarketScan.rows?.length ? polymarketScan.rows : filteredRows;
      return polymarketMarketEntities(source, marketCap);
    }
    if (!polymarketJoinFromList) {
      return livePicks
        .slice(0, marketCap)
        .map((pick) => ({
          ticker: String(pick.slug || pick.entityId || pick.id || ""),
          label: pick.label || pick.title || "Market",
          title: pick.title || pick.label || "Market",
          pick,
        }))
        .filter((market) => market.ticker && market.pick);
    }
    const source = polymarketScan.status !== "idle" && polymarketScan.rows?.length ? polymarketScan.rows : filteredRows;
    return polymarketListJoinMarkets(source, marketCap);
  }, [polymarketJoinCatalog, polymarketSeriesCatalog, polymarketTraderCatalog, polymarketJoinFromList, livePicks, marketCap, polymarketScan, filteredRows]);
  const polymarketTraderPeople = useMemo(() => {
    if (!polymarketTraderCatalog) return [];
    const source = polymarketScan.status !== "idle" && polymarketScan.rows?.length ? polymarketScan.rows : filteredRows;
    return polymarketTraderEntities(source, marketCap);
  }, [polymarketTraderCatalog, polymarketScan, filteredRows, marketCap]);
  const polymarketTraderPreviewPeople = useMemo(() => {
    if (!polymarketTraderCatalog) return [];
    const source = polymarketScan.status !== "idle" && polymarketScan.rows?.length ? polymarketScan.rows : filteredRows;
    return polymarketTraderEntities(source, PREVIEW_ROW_CAP);
  }, [polymarketTraderCatalog, polymarketScan, filteredRows]);
  const polymarketPreviewMarkets = useMemo(() => {
    if (!polymarketTraderCatalog) return [];
    const source = polymarketScan.status !== "idle" && polymarketScan.rows?.length ? polymarketScan.rows : filteredRows;
    return polymarketMarketEntities(source, PREVIEW_ROW_CAP);
  }, [polymarketTraderCatalog, polymarketScan, filteredRows]);
  const polymarketSeriesPeople = useMemo(() => {
    if (!polymarketSeriesCatalog) return [];
    const source = polymarketScan.status !== "idle" && polymarketScan.rows?.length ? polymarketScan.rows : filteredRows;
    return polymarketSeriesEntities(source, marketCap);
  }, [polymarketSeriesCatalog, polymarketScan, filteredRows, marketCap]);
  const polymarketSeriesEmbeddedEvents = useMemo(() => {
    if (!polymarketSeriesCatalog) return [];
    const source = polymarketScan.status !== "idle" && polymarketScan.rows?.length ? polymarketScan.rows : filteredRows;
    return polymarketEventsFromSeriesRows(source, marketCap);
  }, [polymarketSeriesCatalog, polymarketScan, filteredRows, marketCap]);
  const polymarketEventPeople = useMemo(() => {
    if (!polymarketEventCatalog) return [];
    const source = polymarketScan.status !== "idle" && polymarketScan.rows?.length ? polymarketScan.rows : filteredRows;
    return polymarketEventEntities(source, marketCap);
  }, [polymarketEventCatalog, polymarketScan, filteredRows, marketCap]);
  const polymarketPreviewEvents = useMemo(() => {
    if (!polymarketEventCatalog) return [];
    const source = polymarketScan.status !== "idle" && polymarketScan.rows?.length ? polymarketScan.rows : filteredRows;
    return polymarketEventEntities(source, PREVIEW_ROW_CAP);
  }, [polymarketEventCatalog, polymarketScan, filteredRows]);
  const liveJoinKey = [...liveJoinIds].sort().join(",");
  const liveJoinTargets = (polymarketJoinCatalog.length ? polymarketJoinCatalog : KALSHI_LIVE_MARKET_JOINS).filter((item) => liveJoinIds.has(item.id));
  const polymarketJoinActive = polymarketJoinCatalog.length > 0 && joinOn && liveJoinTargets.length > 0;
  const downstreamMarketChoices = useMemo(
    () => (polymarketLive ? polymarketDownstreamMarketJoins() : []),
    [polymarketLive],
  );
  const downstreamFromPositions =
    polymarketTraderCatalog &&
    polymarketJoinActive &&
    !polymarketJoinCatalog.some((item) => item.anchor === "market") &&
    liveJoinTargets.some((item) => polymarketMarketBearingJoin(item.id));
  const downstreamFromEvents = (polymarketEventCatalog || polymarketSeriesCatalog) && polymarketJoinActive && liveJoinIds.has("getMarketsByEvents");
  const downstreamTargets = downstreamFromPositions || downstreamFromEvents
    ? downstreamMarketChoices.filter((item) => downstreamJoinIds.has(item.id))
    : [];
  const downstreamSheetTargets = downstreamTargets.filter((item) => polymarketJoinPlacement(item, traderMarketLayout) === "sheet");
  const downstreamBearingId =
    liveJoinTargets.find((item) => item.id === "getTraderPositions")?.id ||
    liveJoinTargets.find((item) => polymarketMarketBearingJoin(item.id))?.id ||
    "";
  const downstreamPreviewMarkets = useMemo(() => {
    if (downstreamFromEvents) {
      const rows = liveJoinPreview.getMarketsByEvents?.rows || [];
      return polymarketMarketEntities(rows, marketCap);
    }
    if (!downstreamFromPositions) return [];
    const rows = liveJoinPreview[downstreamBearingId]?.rows || [];
    return polymarketMarketEntities(rows, marketCap);
  }, [downstreamFromEvents, downstreamFromPositions, downstreamBearingId, liveJoinPreview, marketCap]);
  const downstreamPreviewKey = downstreamPreviewMarkets.map((item) => item.ticker).join("\0");
  const downstreamSheetKey = downstreamSheetTargets.map((item) => item.id).join(",");
  const detectedJoinKey = [...detectedJoinIds].sort().join(",");
  const detectedTargets = KALSHI_LIVE_MARKET_JOINS.filter((item) => detectedJoinIds.has(item.id));
  const livePreviewTicker = liveJoinMarkets[0]?.ticker || "";
  const fanoutTicker = liveMarketFanout
    ? directMarkets[0]?.ticker || sampleMarketTicker || String(directPreview.ticker || "").trim()
    : "";
  const fanoutParentKey = [...fanoutParents].sort().join(",");
  const liveJoinWindowKey = liveJoinTargets.map((item) => `${item.id}:${joinWindowSignature(item.id, joinWindows[item.id])}`).join("|");
  const detectedWindowKey = detectedTargets.map((item) => `${item.id}:${joinWindowSignature(item.id, joinWindows[item.id])}`).join("|");

  const nativePullFlags = useMemo(
    () => pullKindFlags(tableId, { realtime: integrationId === "kalshiLive" && kalshiLiveEndpointHasRealtimeFeed(tableId) }),
    [integrationId, tableId],
  );

  const scopeJoinId = liveEventSearch ? "kalshiLiveEventMarkets" : "kalshiLiveSeriesMarkets";
  const listNoun = liveEventSearch ? "event" : "series";
  const listPlural = liveEventSearch ? "events" : "series";
  const seriesJoinOn = (liveSeriesSearch || liveEventSearch) && joinOn && joinTarget === scopeJoinId;
  const fanoutJoinOn = liveMarketFanout && joinOn;
  const eventCandleJoinOn = liveEventSearch && joinOn && eventExtraJoinIds.has("candlesticks");
  const eventCandleJoinPreview = eventCandleJoinOn ? eventExtraPreview[`candlesticks:${seriesJoinTickers[0]?.ticker || ""}`] : null;
  const eventCandleJoinMarketRows = useMemo(
    () => (eventCandleJoinPreview?.status === "ready" ? eventCandleJoinPreview.markets?.rows || [] : []),
    [eventCandleJoinPreview],
  );
  const traderMarketRows = useMemo(() => {
    if (!liveTrader || !joinOn) return [];
    const parentRows = kalshiTraderTableNamesMarkets(tableId) ? (Array.isArray(traderImportRows) ? traderImportRows : filteredRows) : [];
    const joinedRows = traderJoinOn
      ? Object.entries(traderJoinPreview)
          .filter(([key, preview]) => /^(positions|trades):/.test(key) && preview?.status === "ready")
          .flatMap(([, preview]) => preview.rows || [])
      : [];
    return traderMarketTickersFromRows([...parentRows, ...joinedRows], marketCap).map((ticker) => ({ ticker }));
  }, [filteredRows, joinOn, liveTrader, marketCap, tableId, traderImportRows, traderJoinOn, traderJoinPreview]);
  const traderMarketsOn = traderMarketRows.length > 0;
  const enrichmentFlags = useMemo(
    () =>
      withJoinFlags(nativePullFlags, {
        markets:
          traderMarketsOn ||
          seriesJoinOn ||
          forecastJoinIds.has("markets") ||
          (liveEventCandles && joinOn) ||
          eventCandleJoinOn ||
          (fanoutJoinOn && fanoutSeriesMarkets && Boolean(parentLink.seriesTicker)),
        series: fanoutJoinOn && fanoutParents.has("series") && Boolean(parentLink.seriesTicker),
      }),
    [nativePullFlags, seriesJoinOn, fanoutJoinOn, fanoutSeriesMarkets, fanoutParentKey, parentLink.seriesTicker, forecastJoinIds, liveEventCandles, joinOn, eventCandleJoinOn, traderMarketsOn],
  );
  const marketDownstream = allowsMarketDownstreamJoin(nativePullFlags, enrichmentFlags) && !liveMarketFanout;
  const seriesMarketSheet = previewSheet === "series-markets" || previewSheet.startsWith("series-market:");
  const seriesMarketRequestFor = (sheet) => {
    const liveFollowUp = sheet.startsWith("live:");
    const activeTicker = sheet.startsWith("series-market:")
      ? sheet.slice("series-market:".length)
      : liveFollowUp && seriesMarketLayout !== "combined"
        ? seriesJoinTickers[0]?.ticker || ""
        : "";
    const combined = sheet === "series-markets" || (liveFollowUp && seriesMarketLayout === "combined");
    if (!seriesJoinOn || (!activeTicker && !combined)) return null;
    return {
      key: combined ? `${liveEventSearch ? "event:" : ""}combined:${seriesJoinKey}` : `${liveEventSearch ? "event:" : ""}sheet:${seriesJoinKey}:${activeTicker}`,
      activeTicker,
      combined,
    };
  };
  const seriesMarketRequest = seriesMarketRequestFor(previewSheet);
  const cachedSeriesMarkets = seriesMarketRequest ? seriesMarketCacheRef.current.get(seriesMarketRequest.key) : null;
  const seriesMarketView = cachedSeriesMarkets || seriesMarketPreview;
  const seriesMarketsDetected = useMemo(() => {
    if (!seriesJoinOn || !seriesJoinKey) return false;
    const prefix = liveEventSearch ? "event:" : "";
    const keys = [`${prefix}combined:${seriesJoinKey}`, ...seriesJoinTickers.map((item) => `${prefix}sheet:${seriesJoinKey}:${item.ticker}`)];
    return keys.some((key) => {
      const hit = seriesMarketCacheRef.current.get(key);
      return hit?.status === "ready" && (hit.rows?.length || 0) > 0;
    });
  }, [seriesJoinOn, seriesJoinKey, seriesJoinTickers, seriesMarketPreview, liveEventSearch]);
  const marketsDetected = seriesMarketsDetected || eventCandleJoinMarketRows.length > 0 || traderMarketsOn;
  const downstreamMarketRows = liveEventCandles
    ? eventCandleMarketRows
    : seriesMarketView.rows?.length
      ? seriesMarketView.rows
      : eventCandleJoinMarketRows.length
        ? eventCandleJoinMarketRows
        : traderMarketRows;
  const downstreamPreviewTicker = String(downstreamMarketRows[0]?.ticker || "").trim();
  const forecastMarketPreview = eventExtraPreview[`markets:${forecastJoinEvents[0]?.ticker || ""}`];
  const forecastMarketsDetected =
    forecastJoinIds.has("markets") && forecastMarketPreview?.status === "ready" && (forecastMarketPreview.rows?.length || 0) > 0;
  const forecastDownstreamTicker = forecastMarketsDetected ? String(forecastMarketPreview.rows?.[0]?.ticker || "").trim() : "";
  const selectedLiveJoin = polymarketJoinCatalog.find((item) => previewSheet === `live:${item.id}`);
  const joinPreviewTicker = polymarketJoinCatalog.length
    ? selectedLiveJoin?.anchor === "trader"
      ? polymarketTraderPeople[0]?.label || ""
      : selectedLiveJoin?.anchor === "event"
        ? polymarketSeriesEmbeddedEvents[0]?.label || polymarketEventPeople[0]?.label || ""
        : polymarketJoinMarkets[0]?.label || polymarketEventPeople[0]?.label || ""
    : liveMarketSearch
      ? livePreviewTicker
      : (marketDownstream && downstreamPreviewTicker) || forecastDownstreamTicker || fanoutTicker;
  const fanoutMarketsDetected =
    fanoutJoinOn && fanoutSeriesMarkets && fanoutSeriesMarketPreview.status === "ready" && (fanoutSeriesMarketPreview.rows?.length || 0) > 0;
  const detectedPreviewTicker = String(fanoutSeriesMarketPreview.rows?.[0]?.ticker || "").trim();
  const knownJoinMarkets = useMemo(() => {
    const byTicker = new Map();
    const add = (market) => {
      if (market?.ticker && !byTicker.has(market.ticker) && kalshiMarketLife(market)) byTicker.set(market.ticker, market);
    };
    liveJoinList.forEach(add);
    (seriesMarketView.rows || []).forEach((row) => add(kalshiJoinMarket(row)));
    (fanoutSeriesMarketPreview.rows || []).forEach((row) => add(kalshiJoinMarket(row)));
    (forecastMarketPreview?.rows || []).forEach((row) => add(kalshiJoinMarket(row)));
    eventCandleMarketRows.forEach((row) => add(kalshiJoinMarket(row)));
    eventCandleJoinMarketRows.forEach((row) => add(kalshiJoinMarket(row)));
    directMarkets.forEach(add);
    add(traderPreviewMarket);
    return byTicker;
  }, [liveJoinList, seriesMarketView.rows, fanoutSeriesMarketPreview.rows, forecastMarketPreview?.rows, eventCandleMarketRows, eventCandleJoinMarketRows, directMarkets, traderPreviewMarket]);
  const traderPreviewTicker = traderMarketsOn && marketDownstream ? downstreamPreviewTicker : "";
  useEffect(() => {
    if (!traderPreviewTicker || traderPreviewMarket?.ticker === traderPreviewTicker) return undefined;
    let cancel = false;
    loadKalshiLiveMarketByTicker(traderPreviewTicker)
      .then((row) => {
        if (!cancel) setTraderPreviewMarket(row ? kalshiJoinMarket(row) : { ticker: traderPreviewTicker });
      })
      .catch(() => {
        if (!cancel) setTraderPreviewMarket({ ticker: traderPreviewTicker });
      });
    return () => {
      cancel = true;
    };
  }, [traderPreviewTicker, traderPreviewMarket?.ticker]);
  const joinMarketLives = useMemo(() => {
    const lives = [...knownJoinMarkets.values()].map((market) => kalshiMarketLife(market));
    return { life: mergeLives(lives), perMarket: lives.length !== 1 };
  }, [knownJoinMarkets]);
  const joinMarketFor = (market) => (kalshiMarketLife(market) ? market : knownJoinMarkets.get(market?.ticker) || market);
  const marketLifeKey = (market) => (market ? [market.openTime, market.closeTime, market.status].join("|") : "");
  const joinPreviewLifeKey = marketLifeKey(knownJoinMarkets.get(joinPreviewTicker));
  const detectedPreviewLifeKey = marketLifeKey(knownJoinMarkets.get(detectedPreviewTicker));

  useEffect(() => {
    if (polymarketLive || step !== "enrich" || !enrichPicks.has("join") || !liveJoinKey || !joinPreviewTicker) return undefined;
    const ids = liveJoinKey.split(",");
    const ticker = joinPreviewTicker;
    const previewMarket = knownJoinMarkets.get(ticker);
    const viewToken = `${ticker}|${liveJoinWindowKey}|${joinPreviewLifeKey}`;
    liveJoinVisibleTicker.current = viewToken;
    const next = {};
    const missing = [];
    for (const id of ids) {
      const cacheKey = `${ticker}:${id}:${joinWindowSignature(id, joinWindows[id])}:${joinPreviewLifeKey}`;
      const hit = liveJoinCacheRef.current.get(cacheKey);
      if (hit?.status === "ready" || hit?.status === "error" || hit?.status === "loading") {
        next[id] = hit;
      } else {
        const loading = { status: "loading", columns: [], rows: [], error: "" };
        liveJoinCacheRef.current.set(cacheKey, loading);
        next[id] = loading;
        missing.push(id);
      }
    }
    setLiveJoinPreview(next);
    missing.forEach((id) => {
      const cacheKey = `${ticker}:${id}:${joinWindowSignature(id, joinWindows[id])}:${joinPreviewLifeKey}`;
      loadKalshiLiveMarketJoin(id, ticker, PREVIEW_ROW_CAP, joinPullWindow(id, joinWindows[id], previewMarket))
        .then((result) => {
          const ready = { status: "ready", columns: result.columns || [], rows: result.rows || [], error: "" };
          liveJoinCacheRef.current.set(cacheKey, ready);
          if (liveJoinVisibleTicker.current === viewToken) setLiveJoinPreview((current) => ({ ...current, [id]: ready }));
        })
        .catch((err) => {
          const failed = {
            status: "error",
            columns: [],
            rows: [],
            error: err instanceof Error ? err.message : "Join preview failed",
          };
          liveJoinCacheRef.current.set(cacheKey, failed);
          if (liveJoinVisibleTicker.current === viewToken) setLiveJoinPreview((current) => ({ ...current, [id]: failed }));
        });
    });
    return undefined;
  }, [polymarketLive, step, enrichPicks, liveJoinKey, joinPreviewTicker, liveJoinWindowKey, joinWindows, joinPreviewLifeKey]);

  const polymarketJoinPickId = polymarketJoinMarkets[0]?.pick?.id || "";
  const polymarketSheetJoinIds = (anchor) =>
    liveJoinKey.split(",").filter((id) => {
      const spec = polymarketJoinCatalog.find((item) => item.id === id);
      if (!spec) return anchor === "market";
      if ((spec.anchor || "market") !== anchor) return false;
      return polymarketJoinPlacement(spec, traderMarketLayout) === "sheet";
    });
  useEffect(() => {
    if (!polymarketJoinActive || step !== "enrich" || !polymarketJoinPickId) return undefined;
    const pick = polymarketJoinMarkets[0]?.pick;
    if (!pick) return undefined;
    const ids = polymarketSheetJoinIds("market");
    if (!ids.length) return undefined;
    const viewToken = `polymarket:${pick.id}|${ids.join(",")}|${traderMarketLayout}`;
    liveJoinVisibleTicker.current = viewToken;
    const next = {};
    const missing = [];
    for (const id of ids) {
      const cacheKey = `polymarket:${pick.id}:${id}:${traderMarketLayout}`;
      const hit = liveJoinCacheRef.current.get(cacheKey);
      if (hit?.status === "ready" || hit?.status === "loading") {
        next[id] = hit;
      } else {
        const loading = { status: "loading", columns: [], rows: [], error: "" };
        liveJoinCacheRef.current.set(cacheKey, loading);
        next[id] = loading;
        missing.push(id);
      }
    }
    setLiveJoinPreview((current) => ({ ...current, ...next }));
    missing.forEach((id) => {
      const cacheKey = `polymarket:${pick.id}:${id}:${traderMarketLayout}`;
      const load = polymarketTraderCatalog && id !== "parent-market"
        ? ensurePolymarketMarketPick(pick).then((ready) => loadPolymarketLiveJoin(id, ready, { rowLimit: PREVIEW_ROW_CAP }))
        : loadPolymarketLiveJoin(id, pick, { rowLimit: PREVIEW_ROW_CAP });
      load
        .then((result) => {
          const ready = { status: "ready", columns: result.columns || [], rows: result.rows || [], error: "" };
          liveJoinCacheRef.current.set(cacheKey, ready);
          if (liveJoinVisibleTicker.current === viewToken) setLiveJoinPreview((current) => ({ ...current, [id]: ready }));
        })
        .catch((err) => {
          const failed = {
            status: "error",
            columns: [],
            rows: [],
            error: err instanceof Error ? err.message : "Join preview failed",
          };
          liveJoinCacheRef.current.set(cacheKey, failed);
          if (liveJoinVisibleTicker.current === viewToken) setLiveJoinPreview((current) => ({ ...current, [id]: failed }));
        });
    });
    return undefined;
  }, [polymarketJoinActive, step, polymarketJoinPickId, liveJoinKey, polymarketJoinMarkets, polymarketJoinCatalog, traderMarketLayout, polymarketTraderCatalog]);

  const polymarketTraderPreviewId = polymarketTraderPeople[0]?.id || "";
  useEffect(() => {
    if (!polymarketJoinActive || step !== "enrich" || !polymarketTraderPreviewId) return undefined;
    const person = polymarketTraderPeople[0];
    if (!person) return undefined;
    const ids = polymarketSheetJoinIds("trader");
    if (!ids.length) return undefined;
    const viewToken = `polymarket-trader:${person.id}|${ids.join(",")}`;
    traderJoinVisible.current = viewToken;
    const next = {};
    const missing = [];
    for (const id of ids) {
      const cacheKey = `polymarket:trader:${person.id}:${id}`;
      const hit = liveJoinCacheRef.current.get(cacheKey);
      if (hit?.status === "ready" || hit?.status === "loading") {
        next[id] = hit;
      } else {
        const loading = { status: "loading", columns: [], rows: [], error: "" };
        liveJoinCacheRef.current.set(cacheKey, loading);
        next[id] = loading;
        missing.push(id);
      }
    }
    setLiveJoinPreview((current) => ({ ...current, ...next }));
    missing.forEach((id) => {
      const cacheKey = `polymarket:trader:${person.id}:${id}`;
      loadPolymarketTraderJoin(id, person.pick, { rowLimit: PREVIEW_ROW_CAP })
        .then((result) => {
          const ready = { status: "ready", columns: result.columns || [], rows: result.rows || [], error: "" };
          liveJoinCacheRef.current.set(cacheKey, ready);
          if (traderJoinVisible.current === viewToken) setLiveJoinPreview((current) => ({ ...current, [id]: ready }));
        })
        .catch((err) => {
          const failed = {
            status: "error",
            columns: [],
            rows: [],
            error: err instanceof Error ? err.message : "Join preview failed",
          };
          liveJoinCacheRef.current.set(cacheKey, failed);
          if (traderJoinVisible.current === viewToken) setLiveJoinPreview((current) => ({ ...current, [id]: failed }));
        });
    });
    return undefined;
  }, [polymarketJoinActive, step, polymarketTraderPreviewId, liveJoinKey, polymarketTraderPeople, polymarketJoinCatalog, traderMarketLayout]);

  const polymarketEventPreviewId = polymarketEventPeople[0]?.id || "";
  useEffect(() => {
    if (!polymarketEventCatalog || !polymarketJoinActive || step !== "enrich" || !polymarketEventPreviewId) return undefined;
    const event = polymarketEventPeople[0];
    if (!event) return undefined;
    const ids = polymarketSheetJoinIds("event");
    if (!ids.length) return undefined;
    const viewToken = `polymarket-event:${event.id}|${ids.join(",")}`;
    liveJoinVisibleTicker.current = viewToken;
    const next = {};
    const missing = [];
    for (const id of ids) {
      const cacheKey = `polymarket:event:${event.id}:${id}`;
      const hit = liveJoinCacheRef.current.get(cacheKey);
      if (hit?.status === "ready" || hit?.status === "loading") next[id] = hit;
      else {
        const loading = { status: "loading", columns: [], rows: [], error: "" };
        liveJoinCacheRef.current.set(cacheKey, loading);
        next[id] = loading;
        missing.push(id);
      }
    }
    setLiveJoinPreview((current) => ({ ...current, ...next }));
    missing.forEach((id) => {
      const cacheKey = `polymarket:event:${event.id}:${id}`;
      loadPolymarketLiveTable(id, [event.pick], { rowLimit: PREVIEW_ROW_CAP })
        .then((result) => {
          const ready = { status: "ready", columns: result.columns || [], rows: result.rows || [], error: "" };
          liveJoinCacheRef.current.set(cacheKey, ready);
          if (liveJoinVisibleTicker.current === viewToken) setLiveJoinPreview((current) => ({ ...current, [id]: ready }));
        })
        .catch((err) => {
          const failed = {
            status: "error",
            columns: [],
            rows: [],
            error: err instanceof Error ? err.message : "Join preview failed",
          };
          liveJoinCacheRef.current.set(cacheKey, failed);
          if (liveJoinVisibleTicker.current === viewToken) setLiveJoinPreview((current) => ({ ...current, [id]: failed }));
        });
    });
    return undefined;
  }, [polymarketEventCatalog, polymarketJoinActive, step, polymarketEventPreviewId, liveJoinKey, polymarketEventPeople, polymarketJoinCatalog, traderMarketLayout]);

  const polymarketSeriesPreviewId = polymarketSeriesPeople[0]?.id || "";
  useEffect(() => {
    if (!polymarketSeriesCatalog || !polymarketJoinActive || step !== "enrich" || !polymarketSeriesPreviewId) return undefined;
    if (!liveJoinKey.split(",").includes("getEventsBySeries")) return undefined;
    const series = polymarketSeriesPeople[0];
    if (!series) return undefined;
    const viewToken = `polymarket-series:${series.id}|${liveJoinKey}`;
    liveJoinVisibleTicker.current = viewToken;
    const cacheKey = `polymarket:series:${series.id}:events`;
    const hit = liveJoinCacheRef.current.get(cacheKey);
    if (hit?.status === "ready" || hit?.status === "loading") {
      setLiveJoinPreview((current) => ({ ...current, getEventsBySeries: hit }));
    } else {
      const loading = { status: "loading", columns: [], rows: [], error: "" };
      liveJoinCacheRef.current.set(cacheKey, loading);
      setLiveJoinPreview((current) => ({ ...current, getEventsBySeries: loading }));
      loadPolymarketSeriesEventsJoin(series, { rowLimit: PREVIEW_ROW_CAP })
        .then((result) => {
          const ready = { status: "ready", columns: result.columns || [], rows: result.rows || [], error: "" };
          liveJoinCacheRef.current.set(cacheKey, ready);
          if (liveJoinVisibleTicker.current === viewToken) setLiveJoinPreview((current) => ({ ...current, getEventsBySeries: ready }));
        })
        .catch((err) => {
          const failed = {
            status: "error",
            columns: [],
            rows: [],
            error: err instanceof Error ? err.message : "Join preview failed",
          };
          liveJoinCacheRef.current.set(cacheKey, failed);
          if (liveJoinVisibleTicker.current === viewToken) setLiveJoinPreview((current) => ({ ...current, getEventsBySeries: failed }));
        });
    }
    return undefined;
  }, [polymarketSeriesCatalog, polymarketJoinActive, step, polymarketSeriesPreviewId, liveJoinKey, polymarketSeriesPeople, polymarketJoinCatalog]);

  const polymarketSeriesEventPreviewId = polymarketSeriesCatalog ? polymarketSeriesEmbeddedEvents[0]?.id || "" : "";
  useEffect(() => {
    if (!polymarketSeriesCatalog || !polymarketJoinActive || step !== "enrich" || !polymarketSeriesEventPreviewId) return undefined;
    if (!liveJoinKey.split(",").includes("getMarketsByEvents")) return undefined;
    const event = polymarketSeriesEmbeddedEvents.find((item) => item.id === polymarketSeriesEventPreviewId) || polymarketSeriesEmbeddedEvents[0];
    if (!event) return undefined;
    const viewToken = `polymarket-series-markets:${event.id}|${liveJoinKey}`;
    liveJoinVisibleTicker.current = viewToken;
    const cacheKey = `polymarket:event:${event.id}:getMarketsByEvents`;
    const hit = liveJoinCacheRef.current.get(cacheKey);
    if (hit?.status === "ready" || hit?.status === "loading") {
      setLiveJoinPreview((current) => ({ ...current, getMarketsByEvents: hit }));
      return undefined;
    }
    const loading = { status: "loading", columns: [], rows: [], error: "" };
    liveJoinCacheRef.current.set(cacheKey, loading);
    setLiveJoinPreview((current) => ({ ...current, getMarketsByEvents: loading }));
    loadPolymarketLiveTable("getMarketsByEvents", [event.pick], { rowLimit: PREVIEW_ROW_CAP })
      .then((result) => {
        const ready = { status: "ready", columns: result.columns || [], rows: result.rows || [], error: "" };
        liveJoinCacheRef.current.set(cacheKey, ready);
        if (liveJoinVisibleTicker.current === viewToken) setLiveJoinPreview((current) => ({ ...current, getMarketsByEvents: ready }));
      })
      .catch((err) => {
        const failed = {
          status: "error",
          columns: [],
          rows: [],
          error: err instanceof Error ? err.message : "Join preview failed",
        };
        liveJoinCacheRef.current.set(cacheKey, failed);
        if (liveJoinVisibleTicker.current === viewToken) setLiveJoinPreview((current) => ({ ...current, getMarketsByEvents: failed }));
      });
    return undefined;
  }, [polymarketSeriesCatalog, polymarketJoinActive, step, polymarketSeriesEventPreviewId, liveJoinKey, polymarketSeriesEmbeddedEvents]);

  const downstreamPreviewPickId = downstreamPreviewMarkets[0]?.pick?.id || "";
  useEffect(() => {
    if (!(downstreamFromPositions || downstreamFromEvents) || step !== "enrich" || !downstreamSheetKey || !downstreamPreviewPickId) return undefined;
    const pick = downstreamPreviewMarkets[0]?.pick;
    if (!pick) return undefined;
    const ids = downstreamSheetKey.split(",");
    const viewToken = `mjoin:${pick.id}|${downstreamSheetKey}`;
    downstreamJoinVisible.current = viewToken;
    const next = {};
    const missing = [];
    for (const id of ids) {
      const cacheKey = `mjoin:${pick.id}:${id}`;
      const hit = liveJoinCacheRef.current.get(cacheKey);
      if (hit?.status === "ready" || hit?.status === "loading") {
        next[id] = hit;
      } else {
        const loading = { status: "loading", columns: [], rows: [], error: "" };
        liveJoinCacheRef.current.set(cacheKey, loading);
        next[id] = loading;
        missing.push(id);
      }
    }
    setDownstreamJoinPreview(next);
    missing.forEach((id) => {
      const cacheKey = `mjoin:${pick.id}:${id}`;
      const load = id === "parent-market"
        ? loadPolymarketLiveJoin(id, pick, { rowLimit: PREVIEW_ROW_CAP })
        : ensurePolymarketMarketPick(pick).then((ready) => loadPolymarketLiveJoin(id, ready, { rowLimit: PREVIEW_ROW_CAP }));
      load
        .then((result) => {
          const ready = { status: "ready", columns: result.columns || [], rows: result.rows || [], error: "" };
          liveJoinCacheRef.current.set(cacheKey, ready);
          if (downstreamJoinVisible.current === viewToken) {
            setDownstreamJoinPreview((current) => (current[id] ? { ...current, [id]: ready } : current));
          }
        })
        .catch((err) => {
          const failed = {
            status: "error",
            columns: [],
            rows: [],
            error: err instanceof Error ? err.message : "Join preview failed",
          };
          liveJoinCacheRef.current.set(cacheKey, failed);
          if (downstreamJoinVisible.current === viewToken) {
            setDownstreamJoinPreview((current) => (current[id] ? { ...current, [id]: failed } : current));
          }
        });
    });
    return undefined;
  }, [downstreamFromPositions, downstreamFromEvents, step, downstreamSheetKey, downstreamPreviewPickId, downstreamPreviewMarkets]);

  const downstreamMergeOn = downstreamTargets.some((item) => polymarketJoinPlacement(item, traderMarketLayout) === "merge");
  useEffect(() => {
    if (!downstreamFromPositions || step !== "enrich" || !downstreamMergeOn) {
      setDownstreamMergePreview({ status: "idle", columns: [], rows: [] });
      return undefined;
    }
    const markets = downstreamPreviewMarkets;
    if (!markets.length) {
      setDownstreamMergePreview({ status: "loading", columns: [], rows: [] });
      return undefined;
    }
    let cancelled = false;
    setDownstreamMergePreview({ status: "loading", columns: [], rows: [] });
    mapPool(markets, 4, async (market) => {
      try {
        const result = await loadPolymarketLiveJoin("parent-market", market.pick, { rowLimit: 1 });
        const row = result.rows?.[0];
        if (!row) return null;
        return {
          columns: result.columns || [],
          row: {
            ...row,
            condition_id: row.condition_id || market.pick.conditionId,
            conditionId: row.conditionId || market.pick.conditionId,
            slug: row.slug || market.pick.slug,
          },
        };
      } catch {
        return null;
      }
    }).then((pulled) => {
      if (cancelled) return;
      let columns = [];
      const rows = [];
      for (const item of pulled) {
        if (!item) continue;
        if (!columns.length && item.columns.length) columns = item.columns;
        rows.push(item.row);
      }
      setDownstreamMergePreview(columns.length && rows.length ? { status: "ready", columns, rows } : { status: "error", columns: [], rows: [] });
    });
    return () => {
      cancelled = true;
    };
  }, [downstreamFromPositions, step, downstreamMergeOn, downstreamPreviewKey, downstreamPreviewMarkets]);

  const polymarketMergeKey = liveJoinTargets
    .filter((item) => polymarketJoinPlacement(item, traderMarketLayout) === "merge")
    .map((item) => item.id)
    .join(",");
  const polymarketMergePeopleKey = polymarketTraderPreviewPeople.map((item) => item.id).join(",");
  const polymarketMergeMarketKey = polymarketPreviewMarkets.map((item) => item.ticker).join(",");
  const polymarketMergeEventKey = polymarketPreviewEvents.map((item) => item.id).join(",");
  useEffect(() => {
    if (!(polymarketTraderCatalog || polymarketEventCatalog) || !polymarketJoinActive || step !== "enrich" || !polymarketMergeKey) {
      setTraderMergePreview({ status: "idle", parts: [] });
      return undefined;
    }
    let cancelled = false;
    setTraderMergePreview({ status: "loading", parts: [] });
    const targets = polymarketMergeKey.split(",").filter(Boolean);
    setLiveJoinPreview((current) => {
      const next = { ...current };
      for (const id of targets) next[id] = { status: "loading", columns: [], rows: [], error: "" };
      return next;
    });
    Promise.all(
      targets.map(async (id) => {
        const spec = polymarketJoinCatalog.find((item) => item.id === id);
        const anchor = spec?.anchor === "market" ? "market" : spec?.anchor === "event" ? "event" : "trader";
        const entities = anchor === "market"
          ? polymarketPreviewMarkets
          : anchor === "event"
            ? polymarketPreviewEvents
            : polymarketTraderPreviewPeople;
        let columns = [];
        const rows = [];
        const pulled = await mapPool(entities, 4, async (entity) => {
          try {
            const result = anchor === "trader"
              ? await loadPolymarketTraderJoin(id, entity.pick, { rowLimit: 1 })
              : id === "getLiveVolumeForEvent"
                ? await loadPolymarketEventVolumeJoin(entity.pick)
                : await loadPolymarketLiveJoin(id, entity.pick, { rowLimit: 1 });
            const row = result.rows?.[0];
            if (!row) return null;
            return {
              columns: result.columns || [],
              row: anchor === "market"
                ? {
                    ...row,
                    condition_id: row.condition_id || entity.pick.conditionId,
                    conditionId: row.conditionId || entity.pick.conditionId,
                    slug: row.slug || entity.pick.slug,
                  }
                : row,
            };
          } catch {
            return null;
          }
        });
        for (const item of pulled) {
          if (!item) continue;
          if (!columns.length && item.columns.length) columns = item.columns;
          rows.push(item.row);
        }
        if (!cancelled) {
          setLiveJoinPreview((current) => ({
            ...current,
            [id]: columns.length && rows.length
              ? { status: "ready", columns, rows, error: "" }
              : { status: "error", columns: [], rows: [], error: "No rows to merge onto this sheet." },
          }));
        }
        return { anchor, columns, rows };
      }),
    ).then((parts) => {
      if (!cancelled) setTraderMergePreview({ status: "ready", parts: parts.filter((part) => part.rows.length && part.columns.length) });
    }).catch(() => {
      if (!cancelled) setTraderMergePreview({ status: "error", parts: [] });
    });
    return () => {
      cancelled = true;
    };
  }, [polymarketTraderCatalog, polymarketEventCatalog, polymarketJoinActive, step, polymarketMergeKey, polymarketMergePeopleKey, polymarketMergeMarketKey, polymarketMergeEventKey, polymarketJoinCatalog, traderMarketLayout]);

  useEffect(() => {
    if (!fanoutJoinOn || (!fanoutParents.has("market") && !fanoutParents.has("series")) || !fanoutTicker) {
      setParentLink({
        status: "idle",
        ticker: "",
        market: null,
        marketColumns: [],
        series: null,
        seriesColumns: [],
        seriesTicker: "",
        error: "",
      });
      return undefined;
    }
    let cancelled = false;
    const ticker = fanoutTicker;
    const wantSeries = fanoutParents.has("series");
    setParentLink((current) => ({ ...current, status: "loading", ticker, error: "" }));
    loadKalshiLiveParentContext(ticker, { series: wantSeries })
      .then((result) => {
        if (cancelled) return;
        setParentLink({
          status: "ready",
          ticker,
          market: result.market || null,
          marketColumns: result.marketColumns || [],
          series: result.series || null,
          seriesColumns: result.seriesColumns || [],
          seriesTicker: result.seriesTicker || "",
          error: "",
        });
      })
      .catch((err) => {
        if (cancelled) return;
        setParentLink({
          status: "error",
          ticker,
          market: null,
          marketColumns: [],
          series: null,
          seriesColumns: [],
          seriesTicker: "",
          error: err instanceof Error ? err.message : "Parent lookup failed",
        });
      });
    return () => {
      cancelled = true;
    };
  }, [fanoutJoinOn, fanoutParentKey, fanoutTicker]);

  useEffect(() => {
    if (!fanoutJoinOn || !fanoutSeriesMarkets || parentLink.status !== "ready" || !parentLink.seriesTicker) return undefined;
    let cancelled = false;
    const seriesTicker = parentLink.seriesTicker;
    setFanoutSeriesMarketPreview({ status: "loading", seriesTicker, columns: [], rows: [], error: "" });
    loadKalshiLiveSeriesMarkets(seriesTicker, PREVIEW_ROW_CAP)
      .then((result) => {
        if (cancelled) return;
        setFanoutSeriesMarketPreview({
          status: "ready",
          seriesTicker,
          columns: result.columns || [],
          rows: result.rows || [],
          error: "",
        });
      })
      .catch((err) => {
        if (cancelled) return;
        setFanoutSeriesMarketPreview({
          status: "error",
          seriesTicker,
          columns: [],
          rows: [],
          error: err instanceof Error ? err.message : "Series markets failed",
        });
      });
    return () => {
      cancelled = true;
    };
  }, [fanoutJoinOn, fanoutSeriesMarkets, parentLink.status, parentLink.seriesTicker]);

  useEffect(() => {
    if (!fanoutMarketsDetected || !detectedJoinKey || !detectedPreviewTicker) return undefined;
    let cancelled = false;
    const ids = detectedJoinKey.split(",");
    const ticker = detectedPreviewTicker;
    const previewMarket = knownJoinMarkets.get(ticker);
    const next = {};
    const missing = [];
    for (const id of ids) {
      const cacheKey = `${ticker}:${id}:${joinWindowSignature(id, joinWindows[id])}:${detectedPreviewLifeKey}`;
      const hit = liveJoinCacheRef.current.get(cacheKey);
      if (hit?.status === "ready" || hit?.status === "error" || hit?.status === "loading") next[id] = hit;
      else {
        const loading = { status: "loading", columns: [], rows: [], error: "" };
        liveJoinCacheRef.current.set(cacheKey, loading);
        next[id] = loading;
        missing.push(id);
      }
    }
    setDetectedJoinPreview(next);
    missing.forEach((id) => {
      const cacheKey = `${ticker}:${id}:${joinWindowSignature(id, joinWindows[id])}:${detectedPreviewLifeKey}`;
      loadKalshiLiveMarketJoin(id, ticker, PREVIEW_ROW_CAP, joinPullWindow(id, joinWindows[id], previewMarket))
        .then((result) => {
          if (cancelled) return;
          const ready = { status: "ready", columns: result.columns || [], rows: result.rows || [], error: "" };
          liveJoinCacheRef.current.set(cacheKey, ready);
          setDetectedJoinPreview((current) => ({ ...current, [id]: ready }));
        })
        .catch((err) => {
          if (cancelled) return;
          const failed = {
            status: "error",
            columns: [],
            rows: [],
            error: err instanceof Error ? err.message : "Join preview failed",
          };
          liveJoinCacheRef.current.set(cacheKey, failed);
          setDetectedJoinPreview((current) => ({ ...current, [id]: failed }));
        });
    });
    return () => {
      cancelled = true;
    };
  }, [fanoutMarketsDetected, detectedJoinKey, detectedPreviewTicker, detectedWindowKey, joinWindows, detectedPreviewLifeKey]);

  useEffect(() => {
    if (!seriesJoinOn || !seriesJoinTickers.length) return;
    const firstId = seriesMarketLayout === "combined" ? "series-markets" : `series-market:${seriesJoinTickers[0].ticker}`;
    if (previewSheet === "series-markets" || previewSheet.startsWith("series-market:")) {
      if (previewSheet !== firstId) setPreviewSheet(firstId);
    }
  }, [seriesJoinOn, seriesJoinKey, seriesJoinTickers, seriesMarketLayout, previewSheet]);

  useEffect(() => {
    const request = seriesMarketRequestFor(previewSheet);
    const activeTicker = request?.activeTicker || "";
    const combined = Boolean(request?.combined);
    const key = request?.key || "";
    seriesMarketVisibleKey.current = key;
    if (!key) return undefined;
    const cached = seriesMarketCacheRef.current.get(key);
    if (cached?.status === "ready" || cached?.status === "error") {
      setSeriesMarketPreview(cached);
      return undefined;
    }
    if (cached?.status === "loading") {
      setSeriesMarketPreview(cached);
      return undefined;
    }
    const loading = { status: "loading", ticker: activeTicker || "combined", columns: [], rows: [], error: "" };
    seriesMarketCacheRef.current.set(key, loading);
    setSeriesMarketPreview(loading);
    const apply = (next) => {
      seriesMarketCacheRef.current.set(key, next);
      if (seriesMarketVisibleKey.current === key) setSeriesMarketPreview(next);
    };
    const loadScopeMarkets = liveEventSearch ? loadKalshiLiveEventMarkets : loadKalshiLiveSeriesMarkets;
    (async () => {
      try {
        if (combined) {
          const rows = [];
          let columns = [];
          for (const item of seriesJoinTickers) {
            if (rows.length >= PREVIEW_ROW_CAP) break;
            const result = await loadScopeMarkets(item.ticker, PREVIEW_ROW_CAP - rows.length);
            if (result.columns?.length) columns = result.columns;
            for (const row of result.rows || []) {
              rows.push(row);
              if (rows.length >= PREVIEW_ROW_CAP) break;
            }
          }
          apply({ status: "ready", ticker: "combined", columns, rows, error: "" });
          return;
        }
        const result = await loadScopeMarkets(activeTicker, PREVIEW_ROW_CAP);
        apply({
          status: "ready",
          ticker: activeTicker,
          columns: result.columns || [],
          rows: result.rows || [],
          error: "",
        });
      } catch (err) {
        apply({
          status: "error",
          ticker: activeTicker || "combined",
          columns: [],
          rows: [],
          error: err instanceof Error ? err.message : "Markets preview failed",
        });
      }
    })();
    return undefined;
  }, [seriesJoinOn, seriesJoinKey, previewSheet, seriesJoinTickers, seriesMarketLayout, liveEventSearch]);

  const traderJoinKey = `${traderJoinKinds.join("+")}:${seriesMarketLayout}:${traderJoinNames[0] || ""}`;
  useEffect(() => {
    if (!traderJoinOn || !traderJoinNames.length) {
      setTraderJoinPreview({});
      return undefined;
    }
    const nickname = traderJoinNames[0];
    const storeName = seriesMarketLayout === "combined" ? "combined" : nickname;
    const kinds = traderJoinKinds;
    let cancel = false;
    setTraderJoinPreview((current) => {
      const next = {};
      for (const kind of kinds) {
        const key = `${kind}:${storeName}`;
        const cached = current[key];
        next[key] =
          cached?.status === "ready" && cached.nickname === nickname
            ? cached
            : { status: "loading", nickname, columns: [], rows: [], error: "" };
      }
      return next;
    });
    kinds.forEach((kind) => {
      const key = `${kind}:${storeName}`;
      const cached = traderJoinPreviewRef.current[key];
      if (cached?.status === "ready" && cached.nickname === nickname) return;
      loadKalshiTraderJoin(kind, [nickname], PREVIEW_ROW_CAP)
        .then((result) => {
          if (cancel) return;
          setTraderJoinPreview((current) => ({
            ...current,
            [key]: {
              status: "ready",
              nickname,
              columns: result.columns || [],
              rows: result.rows || [],
              error: "",
            },
          }));
        })
        .catch((err) => {
          if (cancel) return;
          setTraderJoinPreview((current) => ({
            ...current,
            [key]: {
              status: "error",
              nickname,
              columns: [],
              rows: [],
              error: err instanceof Error ? err.message : "This trader did not load",
            },
          }));
        });
    });
    return () => {
      cancel = true;
    };
  }, [traderJoinOn, traderJoinKey, traderJoinNames, seriesMarketLayout]);

  const eventExtraKey = eventExtraKinds
    .map((kind) => {
      const table = kind === "forecast" ? "event_forecast" : "candlesticks";
      const filters = joinWindows[kind === "forecast" ? "event_forecast" : "event_candlesticks"];
      const percentiles = kind === "forecast" ? forecastPercentileValues(filters || defaultJoinWindowFilters("event_forecast")).join(",") : "";
      return `${kind}:${joinWindowSignature(table, filters)}:${percentiles}`;
    })
    .join("|");
  useEffect(() => {
    if (!eventExtraOn || !seriesJoinTickers.length) {
      if (!forecastJoinOn) setEventExtraPreview({});
      return undefined;
    }
    const first = seriesJoinTickers[0];
    const kinds = eventExtraKinds;
    let cancel = false;
    setEventExtraPreview((current) => {
      const next = {};
      for (const kind of kinds) {
        const key = `${kind}:${first.ticker}`;
        const cached = current[key];
        next[key] =
          cached?.status === "ready" && cached.ticker === first.ticker && cached.windowKey === eventExtraKey
            ? cached
            : { status: "loading", ticker: first.ticker, columns: cached?.columns || [], rows: cached?.rows || [], error: "" };
      }
      return next;
    });
    kinds.forEach((kind) => {
      const key = `${kind}:${first.ticker}`;
      const cached = eventExtraPreviewRef.current[key];
      if (cached?.status === "ready" && cached.ticker === first.ticker && cached.windowKey === eventExtraKey) return;
      const filters = joinWindows[kind === "forecast" ? "event_forecast" : "event_candlesticks"];
      const load =
        kind === "forecast"
          ? (async () => {
              const skipped = [];
              let last = null;
              for (const item of seriesJoinTickers.slice(0, EVENT_FORECAST_PREVIEW_TRIES)) {
                const markets = await loadKalshiLiveEventMarkets(item.ticker, PREVIEW_ROW_CAP);
                const result = await loadEventForecastFor(
                  { eventTicker: item.ticker, seriesTicker: item.seriesTicker },
                  markets.rows,
                  filters,
                  PREVIEW_ROW_CAP,
                );
                if (result.rows.length) return { ...result, shownEvent: item.ticker, skipped };
                skipped.push({ ticker: item.ticker, skip: result.skip });
                last = result;
              }
              return { columns: last?.columns || [], rows: [], skipped };
            })()
          : loadKalshiLiveEventMarkets(first.ticker, PREVIEW_ROW_CAP).then(async (markets) => {
              const chosen = filters || defaultDirectAttributeFilters("event_candlesticks");
              const span = eventCandleSpan(directPullWindow("event_candlesticks", chosen, {}), chosen.time_range, markets.rows);
              const candles = await loadKalshiLiveEventCandlesticks({
                eventTicker: first.ticker,
                seriesTicker: first.seriesTicker,
                minTs: span.minTs,
                maxTs: span.maxTs,
                period: span.period || 60,
                limit: PREVIEW_ROW_CAP,
                pages: 2,
              });
              const ordered = eventCandleSheetMarkets(candles.byMarket, markets.rows);
              return {
                columns: candles.columns,
                rows: ordered[0]?.rows || [],
                candleMarkets: ordered.map((market) => market.ticker),
                markets: { columns: markets.columns || [], rows: markets.rows || [] },
              };
            });
      load
        .then((result) => {
          if (cancel) return;
          setEventExtraPreview((current) => ({
            ...current,
            [key]: {
              status: "ready",
              ticker: first.ticker,
              windowKey: eventExtraKey,
              columns: result.columns || [],
              rows: result.rows || [],
              candleMarkets: result.candleMarkets || [],
              markets: result.markets || null,
              shownEvent: result.shownEvent || "",
              skipped: result.skipped || [],
              error: "",
            },
          }));
        })
        .catch((err) => {
          if (cancel) return;
          setEventExtraPreview((current) => ({
            ...current,
            [key]: {
              status: "error",
              ticker: first.ticker,
              windowKey: eventExtraKey,
              columns: [],
              rows: [],
              error: err instanceof Error ? err.message : "This event did not load",
            },
          }));
        });
    });
    return () => {
      cancel = true;
    };
  }, [eventExtraOn, eventExtraKey, seriesJoinTickers, forecastJoinOn]);

  const forecastJoinKey = forecastJoinKinds
    .map((kind) =>
      kind === "candlesticks"
        ? `candlesticks:${joinWindowSignature("candlesticks", joinWindows.event_candlesticks)}`
        : kind,
    )
    .join("|");
  useEffect(() => {
    if (!forecastJoinOn || !forecastJoinEvents.length) {
      if (!eventExtraOn) setEventExtraPreview({});
      return undefined;
    }
    const first = forecastJoinEvents[0];
    const kinds = forecastJoinKinds;
    let cancel = false;
    setEventExtraPreview((current) => {
      const next = {};
      for (const kind of kinds) {
        const key = `${kind}:${first.ticker}`;
        const cached = current[key];
        next[key] =
          cached?.status === "ready" && cached.ticker === first.ticker && cached.windowKey === forecastJoinKey
            ? cached
            : { status: "loading", ticker: first.ticker, columns: cached?.columns || [], rows: cached?.rows || [], error: "" };
      }
      return next;
    });
    kinds.forEach((kind) => {
      const key = `${kind}:${first.ticker}`;
      const cached = eventExtraPreviewRef.current[key];
      if (cached?.status === "ready" && cached.ticker === first.ticker && cached.windowKey === forecastJoinKey) return;
      const filters = joinWindows.event_candlesticks;
      const window = joinPullWindow("candlesticks", filters);
      const period = !window.period || window.period === 0 ? 60 : window.period;
      const load =
        kind === "events"
          ? loadKalshiLiveEventsByTickers([first.ticker])
          : kind === "markets"
            ? loadKalshiLiveEventMarkets(first.ticker, PREVIEW_ROW_CAP)
            : loadKalshiLiveEventCandlesticks({
                eventTicker: first.ticker,
                seriesTicker: first.seriesTicker,
                minTs: window.minTs,
                maxTs: window.maxTs,
                period,
                limit: PREVIEW_ROW_CAP,
                pages: 1,
              });
      load
        .then((result) => {
          if (cancel) return;
          setEventExtraPreview((current) => ({
            ...current,
            [key]: {
              status: "ready",
              ticker: first.ticker,
              windowKey: forecastJoinKey,
              columns: result.columns || [],
              rows: result.rows || [],
              error: "",
            },
          }));
        })
        .catch((err) => {
          if (cancel) return;
          setEventExtraPreview((current) => ({
            ...current,
            [key]: {
              status: "error",
              ticker: first.ticker,
              windowKey: forecastJoinKey,
              columns: [],
              rows: [],
              error: err instanceof Error ? err.message : "This event did not load",
            },
          }));
        });
    });
    return () => {
      cancel = true;
    };
  }, [forecastJoinOn, forecastJoinKey, forecastJoinEvents, eventExtraOn]);

  const showSampleExplainer = step === "enrich" && hoverSample && !enrichPicks.has("sample");
  const showBucketExplainer = step === "enrich" && hoverBucket && !enrichPicks.has("bucket") && !showSampleExplainer;
  const showSummarizeExplainer = step === "enrich" && hoverSummarize && !enrichPicks.has("summarize") && !showSampleExplainer && !showBucketExplainer;
  const showFunctionExplainer =
    step === "enrich" && hoverFunction && !enrichPicks.has("function") && !showSummarizeExplainer && !showSampleExplainer && !showBucketExplainer;
  const liveJoinReady = liveMarketSearch && joinOn && liveJoinTargets.length > 0;
  const showJoinExplainer =
    (historicalEnrich || liveMarketSearch || liveSeriesSearch || liveEventSearch || liveMarketFanout || liveTraderList || liveForecast || liveEventCandles || polymarketJoinCatalog.length > 0) &&
    step === "enrich" &&
    hoverJoin &&
    !enrichPicks.has("join") &&
    !joinCommitted &&
    !tradesJoinPicked &&
    !liveJoinReady &&
    !showFunctionExplainer &&
    !showSummarizeExplainer &&
    !showSampleExplainer &&
    !showBucketExplainer;
  const enrichExplainer = showSampleExplainer || showBucketExplainer || showSummarizeExplainer || showFunctionExplainer || showJoinExplainer;
  const summarizeOn = step === "enrich" && enrichPicks.has("summarize");
  const bucketOn = step === "enrich" && enrichPicks.has("bucket");
  const sampleOn = step === "enrich" && enrichPicks.has("sample");
  const summaryActive = summarizeOn && !enrichExplainer && previewSheet === "summary";
  const bucketPreviewId = previewSheet.startsWith("bucket:") ? previewSheet.slice("bucket:".length) : "";
  const bucketActive = bucketOn && !enrichExplainer && Boolean(bucketPreviewId);
  const sampleActive = sampleOn && !enrichExplainer && previewSheet === "sample";
  const showJoinSheets = joinCommitted && !showFunctionExplainer && !showJoinExplainer;
  const liveFunctions = step === "enrich" && enrichPicks.has("function") && !showFunctionExplainer ? functionItems.filter((item) => item.target) : [];
  const functionsForSheet = (kind, own = true) =>
    liveFunctions
      .map((item) => ({ ...item, index: functionItems.findIndex((entry) => entry.id === item.id) }))
      .filter((item) => {
        if (item.target === "all") return kind !== "new";
        if (kind === "markets") return item.target === "markets";
        if (kind === "trades") return item.target === "trades-all" || (item.target === "trades" && own);
        if (kind === "new") return item.target === "new";
        return false;
      })
      .map((item) => ({ ...item, columnId: functionColumnId(item.index), columnTitle: functionColumnTitle(item.index) }));
  const functionOnMarkets = functionsForSheet("markets").length > 0;
  const functionOnTrades = functionsForSheet("trades").length > 0;
  const functionOnNew = functionsForSheet("new").length > 0;
  const functionActive = liveFunctions.length > 0;
  const sheetTitle = tableId === "markets" ? "Markets" : tableId === "trades" ? "Trades" : tables[tableId]?.label || "This sheet";
  const activitySheetTitle = (pick, rows) => {
    if (tableId !== "getTraderActivity") return "";
    const scoped = pick ? polymarketRowsForMarket(rows, pick, livePicks) : rows;
    return polymarketActivitySheetTitle(polymarketActivityTraderName(scoped, pick));
  };
  const metadataRows = useMemo(() => {
    if (!join) return marketPreview.rows || [];
    const tickers = filteredRows.map((row) => join.marketKey(row)).filter(Boolean);
    return join.orderMarkets(marketPreview.rows, filteredRows, tickers);
  }, [filteredRows, join, marketPreview.rows]);
  const tradeJoinBase = useMemo(() => {
    if (
      !(
        tradesQuery &&
        joinPlacement === "merge" &&
        joinTarget === joinMarketsTarget &&
        selectedMarketColumns.length &&
        marketPreview.status === "ready"
      )
    ) {
      return { columns: shownColumns, rows: filteredRows, highlightIds: [] };
    }
    return attachMarketMetadata(
      shownColumns,
      filteredRows,
      selectedMarketColumns,
      marketPreview.rows,
      join?.matchTrade,
    );
  }, [
    tradesQuery,
    joinPlacement,
    joinTarget,
    joinMarketsTarget,
    selectedMarketColumns,
    marketPreview.status,
    marketPreview.rows,
    shownColumns,
    filteredRows,
    polymarketHistorical,
  ]);
  const formulaSheets = useMemo(() => {
    const used = new Set();
    const list = [];
    const push = (sheet) => {
      const title = String(sheet.title || "Sheet");
      if (used.has(title.toLowerCase())) return;
      used.add(title.toLowerCase());
      list.push(sheet);
    };
    if (tradeJoinBase.columns.length) {
      push({ id: "markets", title: sheetTitle, columns: tradeJoinBase.columns, rows: tradeJoinBase.rows });
    }
    if (tradePreview.columns.length && previewTicker) {
      push({ id: "trades", title: previewLabel || previewTicker, columns: tradePreview.columns, rows: tradePreview.rows });
    }
    if (tradesQuery && joinPlacement === "sheet" && selectedMarketColumns.length && marketPreview.status === "ready") {
      push({ id: "market-metadata", title: "Markets", columns: selectedMarketColumns, rows: metadataRows });
    }
    for (const sheet of sheetsFromBlocks(canvas?.blocks, used)) list.push(sheet);
    return list;
  }, [
    tradeJoinBase.columns,
    tradeJoinBase.rows,
    tradePreview.columns,
    tradePreview.rows,
    previewTicker,
    previewLabel,
    sheetTitle,
    canvas?.blocks,
    tradesQuery,
    joinPlacement,
    selectedMarketColumns,
    marketPreview.status,
    metadataRows,
  ]);
  const visibleSheetId =
    previewSheet.startsWith("column:") && functionOnNew ? "new" : showJoinSheets && previewSheet === previewTicker ? "trades" : "markets";
  const columnOnVisible =
    (visibleSheetId === "markets" && functionOnMarkets) ||
    (visibleSheetId === "trades" && functionOnTrades) ||
    (visibleSheetId === "new" && functionOnNew);
  const editSheetId = columnOnVisible ? visibleSheetId : functionOnNew ? "new" : functionOnTrades && !functionOnMarkets ? "trades" : "markets";
  const editBase =
    editSheetId === "trades"
      ? { columns: tradePreview.columns, rows: tradePreview.rows, sheetId: "trades" }
      : { columns: tradeJoinBase.columns, rows: tradeJoinBase.rows, sheetId: editSheetId === "new" ? "new" : "markets" };
  const traderMergedSource = useMemo(() => {
    if (!(polymarketTraderCatalog || polymarketEventCatalog) || traderMergePreview.status !== "ready" || !traderMergePreview.parts?.length) {
      return { ...tradeJoinBase, addedIds: [] };
    }
    const baseIds = new Set((tradeJoinBase.columns || []).map((column) => column.id));
    let columns = tradeJoinBase.columns;
    let rows = tradeJoinBase.rows;
    for (const part of traderMergePreview.parts) {
      const merged = mergePolymarketJoinRows(columns, rows, part.columns, part.rows, { anchor: part.anchor });
      columns = merged.columns;
      rows = merged.rows;
    }
    const addedIds = columns.filter((column) => column?.id && !baseIds.has(column.id)).map((column) => column.id);
    return { ...tradeJoinBase, columns, rows, addedIds };
  }, [polymarketTraderCatalog, polymarketEventCatalog, traderMergePreview, tradeJoinBase]);
  const marketsGrid = applyFunctionColumns(
    traderMergedSource.columns,
    traderMergedSource.rows,
    functionsForSheet("markets"),
    formulaSheets,
    "markets",
    activeFunction?.id,
  );
  const mergeAddedIds = marketsGrid.highlight ? [] : traderMergedSource.addedIds || [];
  const tradesGrid = applyFunctionColumns(
    tradePreview.columns,
    tradePreview.rows,
    functionsForSheet("trades"),
    formulaSheets,
    "trades",
    activeFunction?.id,
  );
  const newTableItem = functionsForSheet("new").find((item) => previewSheet === `column:${item.id}`) || functionsForSheet("new")[0];
  const newTableGrid = applyFunctionColumns(
    tradeJoinBase.columns,
    tradeJoinBase.rows,
    newTableItem ? [newTableItem] : [],
    formulaSheets,
    "new",
    newTableItem?.id,
  );
  const formulaView = functionOnNew
    ? newTableGrid
    : showJoinSheets && joinTab === previewTicker && functionOnTrades
      ? tradesGrid
      : functionOnMarkets
        ? marketsGrid
        : functionOnTrades
          ? tradesGrid
          : null;
  const formulaChecksTrades = formulaView === tradesGrid && functionOnTrades;
  const formulaReady = Boolean(formulaView) && (!formulaChecksTrades || tradePreview.status === "ready");
  const functionScopeNote =
    functionTarget === "trades-all"
      ? "Preview shows the column on the first trades sheet. The same column is added on every trades sheet when you run the pull."
      : functionTarget === "all"
        ? "Preview shows the column on the sheet you're looking at. The same column is added on every sheet when you run the pull."
        : "";
  const previewBaseColumns = tradeJoinBase.columns.length ? tradeJoinBase.columns : shownColumns;
  const previewBaseRows = tradeJoinBase.columns.length ? tradeJoinBase.rows : filteredRows;
  const sampleSizeError = validateRandomSampleSizeInput(sampleSize, {
    maxSize: typeof planLimit === "number" && planLimit > 0 ? planLimit : undefined,
    required: sampleOn,
  });
  const sampleSizeNumber = sampleSizeError ? 0 : Math.floor(Number(sampleSize));
  const samplePreviewRows = useMemo(() => {
    if (!sampleSizeNumber) return [];
    return previewRandomSample(previewBaseRows, {
      size: Math.min(sampleSizeNumber, previewBaseRows.length, PREVIEW_ROW_CAP),
      mode: sampleMode,
      seed: sampleMode === "seeded" ? sampleSeed : `draw-${sampleShuffle}`,
    });
  }, [sampleSizeNumber, previewBaseRows, sampleMode, sampleSeed, sampleShuffle]);
  const summarySourceGrid = applyFunctionColumns(
    previewBaseColumns,
    sampleOn && sampleSizeNumber > 0 && !sampleSizeError ? samplePreviewRows : previewBaseRows,
    functionsForSheet("markets"),
    formulaSheets,
    "markets",
    activeFunction?.id,
  );
  const summarySourceColumns = summarySourceGrid.columns;
  const summarySourceRows = summarySourceGrid.rows;
  const summaryMeasure = (() => {
    const preferred = tradesQuery ? ["Size", "Yes price", "No price"] : ["Volume", "Last price", "Yes bid"];
    for (const title of preferred) {
      if (summarySourceColumns.some((column) => column.title === title)) return title;
    }
    return summarySourceColumns.find((column) => column.type === "number" && column.id !== FUNCTION_COLUMN_ID)?.title || (tradesQuery ? "Size" : "Volume");
  })();
  const summaryFormula = summaryCells[summaryCellKey(summaryFocus.columnId, summaryFocus.row)] || "";
  useEffect(() => {
    const settled = settleSummaryCells(summaryCells);
    if (settled === summaryCells) return;
    const label = summaryCells[summaryCellKey("label", summaryFocus.row)] || "";
    if (summaryFocus.columnId === "label" && String(label).trim().startsWith("=")) {
      setSummaryFocus({ columnId: "value", row: summaryFocus.row });
      formulaCaretRef.current = String(settled[summaryCellKey("value", summaryFocus.row)] || "").length;
      setFormulaCaret(formulaCaretRef.current);
      setFormulaFocusToken((token) => token + 1);
    }
    setSummaryCells(settled);
  }, [summaryCells, summaryFocus]);
  const bucketViews = useMemo(
    () =>
      bucketItems.map((item, index) => {
        const built = buildBucketGrid({
          columns: summarySourceColumns,
          rows: summarySourceRows,
          bucketColumnId: item.columnId,
          mode: item.mode,
          timeInterval: item.interval,
          numericBucketSize: item.numericSize,
          groupByIds: item.groupBy,
          metric: item.metric,
          valueColumnId: item.valueColumnId,
        });
        return { ...built, id: item.id, title: bucketSheetTitle(item, summarySourceColumns, index, bucketItems.length) };
      }),
    [bucketItems, summarySourceColumns, summarySourceRows],
  );
  const visibleBucket = bucketViews.find((view) => view.id === bucketPreviewId) || null;
  const enrichmentSheets = useMemo(() => {
    const list = formulaSheets.map((sheet) =>
      sheet.id === "markets" && functionOnMarkets
        ? { ...sheet, columns: summarySourceColumns, rows: summarySourceRows }
        : sheet,
    );
    const titles = new Set(list.map((sheet) => String(sheet.title || "").toLowerCase()));
    const push = (sheet) => {
      const title = String(sheet.title || "").toLowerCase();
      if (!sheet.columns?.length || titles.has(title)) return;
      titles.add(title);
      list.push(sheet);
    };
    bucketViews.forEach((view) => {
      if (bucketOn && view.ready) push({ id: view.id, title: view.title, columns: view.columns, rows: view.rows });
    });
    functionsForSheet("new").forEach((item) => {
      const built = applyFunctionColumns(summarySourceColumns, summarySourceRows, [item], formulaSheets, "new", item.id);
      if (built.columns.length) push({ id: item.id, title: item.columnTitle, columns: built.columns, rows: built.rows });
    });
    return list;
  }, [
    formulaSheets,
    functionOnMarkets,
    summarySourceColumns,
    summarySourceRows,
    bucketOn,
    bucketViews,
    formulaSheets,
    summarySourceColumns,
    summarySourceRows,
    functionItems,
    activeFunctionId,
    previewSheet,
  ]);
  const summaryView = useMemo(
    () =>
      buildSummaryGrid({
        cells: summaryCells,
        columns: summarySourceColumns,
        rows: summarySourceRows,
        sheets: enrichmentSheets,
        focus: summaryFocus,
      }),
    [summaryCells, summarySourceColumns, summarySourceRows, enrichmentSheets, summaryFocus],
  );
  const paneLine = (() => {
    if (pairStreamOn && (previewSheet === "source" || previewSheet.startsWith("stream:"))) {
      if (!streamPairs.length) return "Pick a pair to start streaming. Each pair gets its own sheet.";
      const stream = pairStreams[activeStreamPair];
      const title = streamPairTitle(activeStreamPair);
      if (stream?.status === "closed") return `The ${title} stream closed. Pick the pair again to reconnect.`;
      const count = stream?.rows?.length || 0;
      if (!count) return `Connecting to ${title}`;
      const kept = count >= PRICE_STREAM_CAP ? ` Keeping the latest ${PRICE_STREAM_CAP.toLocaleString()}.` : "";
      return `Streaming ${title}. ${count.toLocaleString()} ${count === 1 ? "row" : "rows"} so far, newest shown first.${kept} Save and run places one sheet per pair, oldest row first.`;
    }
    if (polymarketClosedBook) return "Illustration. This market is closed, so there is no live orderbook.";
    if (showSampleExplainer) return "Illustration. A random subset of this query is drawn when you run the pull.";
    if (showBucketExplainer) return "Illustration. The bucket sheet is created when you run the pull.";
    if (sampleActive) {
      if (sampleSizeError) return sampleSizeError;
      const shown = samplePreviewRows.length;
      const draw = `${sampleSizeNumber.toLocaleString()} ${sampleMode === "seeded" ? "seeded" : "new"} rows`;
      return `Previewing ${shown.toLocaleString()} sampled ${shown === 1 ? "row" : "rows"}. The parent query is the first tab. Save and run draws ${draw}${historicalLake ? " in Athena" : " from the rows this query returns"}.`;
    }
    if (bucketActive) {
      if (!visibleBucket?.ready) return "Choose a column to bucket. The result is a new sheet.";
      if (summarizeOn && formulaOwner === "summary" && formulaEditing) return `Click a column on ${visibleBucket.title} to drop it into the summary.`;
      const count = visibleBucket.rows.length;
      return `Previewing ${count.toLocaleString()} ${count === 1 ? "bucket" : "buckets"} from the rows on screen. Save and run buckets the imported rows.`;
    }
    if (showSummarizeExplainer) return "Illustration. The summary sheet is created when you run the pull.";
    if (showFunctionExplainer) return "Illustration. The column is added when you pick a sheet.";
    if (summaryActive) return "Summary sheet. Totals here use the preview rows. Save and run totals the imported rows.";
    if (summarizeOn && !enrichExplainer && previewSheet === "source" && formulaOwner === "summary" && !sampleActive) {
      return "Click a column or a cell to drop it into the summary.";
    }
    if (showJoinExplainer) {
      if (polymarketTraderCatalog) {
        return `Illustration. From ${sheetTitle}, profile columns merge onto this sheet. The other joins each open their own sheet. The preview shows the first one. The rest are viewable when you hit Save and run.`;
      }
      if (polymarketJoinCatalog.some((item) => item.id === "parent-market")) {
        return `Illustration. From ${sheetTitle.toLowerCase()}, join the parent market and the other sources on that market. Each one is its own sheet.`;
      }
      if (polymarketJoinCatalog.length) {
        return "Illustration. Each market in this pull can open its own sheet for order book, prices, history, trades, spreads, and the other market sources.";
      }
      if (liveMarketFanout) {
        const here = tableId === "trades" ? "trades" : tableId === "orderbook" ? "the order book" : "candlesticks";
        return `Illustration. From ${here}, the route runs through the parent market, its series, and the trades, order book, and candlesticks on those markets.`;
      }
      if (liveSeriesSearch || liveEventSearch) return `Illustration. Markets inside these ${listPlural} load after you choose Join.`;
      if (liveTraderList) {
        return `Illustration. Each trader here can open their ${listPhrase(traderJoinChoiceList.map((item) => item.title.toLowerCase()))}.${kalshiTraderTableNamesMarkets(tableId) ? " The markets on these rows can join to their trades, order book, and candles." : ""}`;
      }
      return tradesQuery
        ? "Illustration. No market metadata is loaded until you run the pull."
        : "Illustration. No trades are loaded until you run the pull.";
    }
    if (previewSheet === "event-markets" && liveEventCandles) {
      const event = eventCandleEvents[0]?.eventTicker || "this event";
      if (eventCandlePreviewMarkets.status === "loading") return `Loading markets in ${event}`;
      if (eventCandlePreviewMarkets.status === "error") return eventCandlePreviewMarkets.error;
      const count = eventCandlePreviewMarkets.rows.length;
      return `Previewing ${count.toLocaleString()} ${count === 1 ? "market" : "markets"} in ${event}. Each market's candlesticks get their own sheet.`;
    }
    if (previewSheet === "parent-market" && fanoutJoinOn) {
      if (!fanoutTicker) return "This pull has no market ticker yet.";
      if (parentLink.status === "loading" || parentLink.status === "idle") return "Loading this market";
      if (parentLink.status === "error") return parentLink.error;
      return parentLink.market ? "Previewing 1 market." : "No market metadata for this ticker.";
    }
    if (previewSheet === "parent-series" && fanoutJoinOn) {
      if (!fanoutTicker) return "This pull has no market ticker yet.";
      if (parentLink.status === "loading" || parentLink.status === "idle") return "Loading this series";
      if (parentLink.status === "error") return parentLink.error;
      if (!parentLink.seriesTicker) return "This market is not part of a series.";
      return parentLink.series ? `Previewing 1 series, ${parentLink.seriesTicker}.` : "No series row for this market.";
    }
    if (previewSheet === "fanout-markets" && fanoutJoinOn) {
      if (fanoutSeriesMarketPreview.status === "loading" || fanoutSeriesMarketPreview.status === "idle") return "Loading markets in this series";
      if (fanoutSeriesMarketPreview.status === "error") return fanoutSeriesMarketPreview.error;
      const count = fanoutSeriesMarketPreview.rows.length;
      return `Previewing ${count.toLocaleString()} ${count === 1 ? "market" : "markets"} in ${parentLink.seriesTicker}. Save and run uses your plan limit.`;
    }
    if (previewSheet.startsWith("djoin:") && fanoutMarketsDetected) {
      const kind = previewSheet.slice("djoin:".length);
      const preview = detectedJoinPreview[kind];
      const title = KALSHI_LIVE_MARKET_JOINS.find((item) => item.id === kind)?.title || "this join";
      if (!detectedPreviewTicker) return `Loading the first market for ${title.toLowerCase()}`;
      if (!preview || preview.status === "loading") return `Loading ${title.toLowerCase()} for ${detectedPreviewTicker}`;
      if (preview.status === "error") return preview.error;
      const count = preview.rows?.length || 0;
      return `Previewing ${count.toLocaleString()} ${title.toLowerCase()} ${count === 1 ? "row" : "rows"} for ${detectedPreviewTicker}. Save and run covers the other markets in this series.`;
    }
    if (previewSheet.startsWith("mjoin:") && downstreamFromPositions) {
      const kind = previewSheet.slice("mjoin:".length);
      const preview = downstreamJoinPreview[kind];
      const title = joinSourceTitle(kind);
      const market = downstreamPreviewMarkets[0];
      const label = market?.label || market?.ticker || "";
      if (!downstreamBearingId) return "Select positions or activity to name the markets.";
      if (!market) {
        const bearing = liveJoinPreview[downstreamBearingId];
        if (!bearing || bearing.status === "loading") return "Loading the markets inside this positions pull.";
        return "These rows do not name a market yet.";
      }
      if (!preview || preview.status === "loading") return `Loading ${title.toLowerCase()} for ${label}`;
      if (preview.status === "error") return preview.error;
      const count = preview.rows?.length || 0;
      return `Previewing ${count.toLocaleString()} ${title.toLowerCase()} ${count === 1 ? "row" : "rows"} for ${label}. The other markets are viewable when you hit Save and run. Each saved sheet uses your plan row limit.`;
    }
    if (previewSheet.startsWith("live:") && (polymarketJoinActive || liveJoinReady || marketDownstream || (fanoutJoinOn && liveJoinTargets.length))) {
      const kind = previewSheet.slice("live:".length);
      const preview = liveJoinPreview[kind];
      const title = joinSourceTitle(kind);
      const ticker = joinPreviewTicker;
      if (!ticker) return `Loading the first market for ${title.toLowerCase()}`;
      if (!preview || preview.status === "loading") return `Loading ${title.toLowerCase()} for ${ticker}`;
      if (preview.status === "error") return preview.error;
      const count = preview.rows?.length || 0;
      const rest = polymarketTraderCatalog
        ? " The other sheets are viewable when you hit Save and run. Each saved sheet uses your plan row limit."
        : " Save and run joins the markets in this pull.";
      return `Previewing ${count.toLocaleString()} ${title.toLowerCase()} ${count === 1 ? "row" : "rows"} for ${ticker}.${rest}`;
    }
    if (polymarketTraderCatalog && polymarketJoinActive && previewSheet === "source" && polymarketMergeKey) {
      if (traderMergePreview.status === "loading") return "Merging the selected columns onto this sheet.";
      if (traderMergePreview.status === "error") return "Those columns could not be merged onto the preview.";
      return "These columns merge onto this sheet. Save and run fills them for the imported rows.";
    }
    if ((previewSheet === "trader-join" || previewSheet.startsWith("trader-join:")) && traderJoinOn) {
      if (!traderJoinNames.length) return "This list has no nicknames yet.";
      const parts = traderJoinSheetParts(previewSheet);
      const preview = parts ? traderJoinPreview[parts.key] : null;
      if (!preview || preview.status === "loading" || preview.status === "idle") return "Loading this trader";
      if (preview.status === "error") return preview.error;
      const count = preview.rows.length;
      const who = preview.nickname || traderJoinNames[0];
      if (parts?.kind === "positions" && preview.rows.every((row) => row?.visibility === "hidden")) {
        return `${who} keeps positions hidden. Save and run still checks the other traders.`;
      }
      const kind = parts?.kind === "trades" ? "trade" : parts?.kind === "positions" ? "position" : "profile";
      const noun = count === 1 ? kind : `${kind}s`;
      return `Previewing ${count.toLocaleString()} ${noun} for ${who}. Save and run covers the other traders.`;
    }
    if (previewSheet.startsWith("event-extra:") && relatedExtraOn) {
      const parts = eventExtraSheetParts(previewSheet);
      const events = forecastJoinOn ? forecastJoinEvents : seriesJoinTickers;
      const preview = parts ? eventExtraPreview[`${parts.kind}:${parts.ticker || events[0]?.ticker || ""}`] : null;
      const label = eventRelatedTitle(parts?.kind).toLowerCase();
      if (!events.length) return "Search for an event or a series. These joins use those events.";
      if (!preview || preview.status === "loading" || preview.status === "idle") return `Loading ${label}`;
      if (preview.status === "error") return preview.error;
      const count = preview.rows.length;
      const noun =
        parts?.kind === "events"
          ? count === 1
            ? "event"
            : "events"
          : parts?.kind === "markets"
            ? count === 1
              ? "market"
              : "markets"
            : `${label} ${count === 1 ? "row" : "rows"}`;
      if (parts?.kind === "candlesticks" && eventExtraOn) {
        const market = preview.candleMarkets?.[0];
        if (!market) return `No candles for ${preview.ticker} in this window.`;
        return `Previewing ${count.toLocaleString()} ${count === 1 ? "candle" : "candles"} for ${market}. Save and run gives every market in each event its own candlestick sheet.`;
      }
      if (parts?.kind === "forecast" && eventExtraOn) {
        const skipped = preview.skipped || [];
        if (!count) return eventForecastMissingNote(skipped);
        const passed = skipped.length
          ? ` ${skipped.length.toLocaleString()} ${skipped.length === 1 ? "event" : "events"} before it ${skipped.length === 1 ? "has" : "have"} no forecast.`
          : "";
        return `Previewing ${count.toLocaleString()} forecast ${count === 1 ? "row" : "rows"} for ${preview.shownEvent || preview.ticker}.${passed} Save and run skips events Kalshi has no forecast for.`;
      }
      return `Previewing ${count.toLocaleString()} ${noun} for ${preview.ticker}. Save and run covers the other events.`;
    }
    if (previewSheet === "event-candles-markets" && eventExtraOn) {
      const event = seriesJoinTickers[0]?.ticker || "this event";
      const preview = eventExtraPreview[`candlesticks:${event}`];
      if (!preview || preview.status === "loading" || preview.status === "idle") return `Loading markets in ${event}`;
      if (preview.status === "error") return preview.error;
      const count = preview.markets?.rows?.length || 0;
      return `Previewing ${count.toLocaleString()} ${count === 1 ? "market" : "markets"} in ${event}. Each market's candlesticks follow on their own sheet.`;
    }
    if (seriesMarketSheet && seriesJoinOn) {
      if (!seriesJoinTickers.length) {
        return liveEventSearch
          ? "Search for an event or select a status. Markets join uses those events."
          : "Search for a series or select a category. Markets join uses those series.";
      }
      if (seriesMarketView.status === "loading" || seriesMarketView.status === "idle") return `Loading markets for this ${listNoun}`;
      if (seriesMarketView.status === "error") return seriesMarketView.error;
      const count = seriesMarketView.rows.length;
      const scope = previewSheet === "series-markets" ? `these ${listPlural}` : seriesMarketView.ticker || `this ${listNoun}`;
      return `Previewing ${count.toLocaleString()} ${count === 1 ? "market" : "markets"} from ${scope}. Save and run uses your plan limit.`;
    }
    if (previewSheet.startsWith("column:") && functionOnNew) return "New table. This sheet is created when you run the pull.";
    if (previewSheet === "markets-meta" && tradesJoinReady && joinPlacement === "sheet") {
      if (marketPreview.status === "loading") return "Loading market metadata";
      if (marketPreview.status === "error") return marketPreview.error;
      const count = metadataRows.length;
      return `Previewing ${count.toLocaleString()} ${count === 1 ? "market" : "markets"}. Highlighted columns are added on a new Markets tab.`;
    }
    if (tradesJoinReady && joinPlacement === "merge") {
      if (marketPreview.status === "loading") return "Loading market metadata";
      if (marketPreview.status === "error") return marketPreview.error;
      return `Highlighted columns are market metadata joined by ${polymarketHistorical ? "outcome token" : "ticker"}.`;
    }
    if (tradesJoinPicked && !joinPlacement) return "Choose where the market columns go. The preview updates here.";
    if (tradesJoinPicked && !selectedMarketColumns.length) return "Choose at least one market column.";
    if (!showJoinSheets || joinTab === "markets") return previewLineShown;
    if (joinTab !== previewTicker) return PREVIEW_TRADE_LOCK;
    if (tradePreview.status === "loading") return "Loading trades for the first market";
    if (tradePreview.status === "error") return tradePreview.error;
    const count = tradePreview.rows.length;
    return `Previewing ${count.toLocaleString()} ${count === 1 ? "trade" : "trades"} of ${previewLabel}`;
  })();

  function chooseBucketColumn(bucketId, columnId) {
    setHoverBucket(false);
    setActiveBucketId(bucketId);
    const column = (summarySourceColumns.length ? summarySourceColumns : shownColumns).find((item) => item.id === columnId);
    const nextMode = defaultBucketMode(column);
    patchBucket(bucketId, {
      columnId,
      mode: nextMode,
      numericSize: nextMode === "number" ? String(suggestedNumericBucketSize(filteredRows, columnId)) : "",
      interval: nextMode === "time" ? "day" : "day",
      groupBy: (bucketItems.find((item) => item.id === bucketId)?.groupBy || []).filter((entry) => entry !== columnId),
    });
    setPreviewSheet(`bucket:${bucketId}`);
  }

  function chooseBucketMetric(bucketId, metricId) {
    const item = bucketItems.find((entry) => entry.id === bucketId);
    const patch = { metric: metricId };
    if (metricId !== "count" && item && !item.valueColumnId) {
      const next = shownColumns.find((column) => column.type === "number" && column.id !== item.columnId);
      if (next) patch.valueColumnId = next.id;
    }
    patchBucket(bucketId, patch);
    setActiveBucketId(bucketId);
  }

  function chooseSampleMode(mode) {
    setSampleMode(mode);
    if (mode === "seeded" && !sampleSeed) setSampleSeed(generateRandomSampleSeed());
    if (mode === "unseeded") setSampleShuffle((token) => token + 1);
  }

  function chooseFunctionTarget(itemId, targetId) {
    const target = targetId || itemId;
    const id = targetId ? itemId : activeFunction?.id || functionItems[0]?.id;
    setHoverFunction(false);
    setActiveFunctionId(id);
    setFunctionItems((list) => list.map((item) => (item.id === id ? { ...item, target } : item)));
    setFunctionScrollKey((key) => key + 1);
    setFormulaOwner("function");
    setFormulaFocused(false);
    setFormulaEditing(true);
    if (target === "new") {
      setPreviewSheet(`column:${id}`);
      return;
    }
    if (target === "trades" || target === "trades-all") {
      if (previewTicker) {
        setJoinTab(previewTicker);
        setPreviewSheet(previewTicker);
      } else setPreviewSheet("source");
      return;
    }
    setJoinTab("markets");
    setPreviewSheet("source");
    if (tradesQuery && joinPlacement === "sheet") setMetadataTab("trades");
  }

  function updateSummaryInput(value) {
    const row = summaryFocus.row;
    const columnId = summaryFocus.columnId;
    if (columnId === "label" && String(value).trim().startsWith("=")) {
      setSummaryFocus({ columnId: "value", row });
      formulaCaretRef.current = String(value).length;
      setFormulaCaret(formulaCaretRef.current);
      setFormulaFocusToken((token) => token + 1);
    }
    setSummaryCells((current) => assignSummaryInput(current, row, columnId, value).cells);
  }

  function insertSummaryReference(text) {
    const row = summaryFocus.row;
    setSummaryCells((current) => {
      const existing = current[summaryCellKey("value", row)] || "";
      let formula;
      if (!existing.trim()) {
        formula = `= SUM(${text})`;
        formulaCaretRef.current = formula.length;
      } else {
        const at =
          summaryFocus.columnId === "value" ? Math.max(0, Math.min(existing.length, formulaCaretRef.current)) : existing.length;
        const prefix = existing.slice(0, at);
        const suffix = existing.slice(at);
        const spacer = prefix && !/[\s(,+\-*/^=<>!]$/.test(prefix) ? " " : "";
        const chunk = `${spacer}${text}`;
        formula = `${prefix}${chunk}${suffix}`;
        formulaCaretRef.current = prefix.length + chunk.length;
      }
      setFormulaCaret(formulaCaretRef.current);
      return assignSummaryInput(current, row, "value", formula).cells;
    });
    setSummaryFocus({ columnId: "value", row });
    setFormulaFocused(true);
    setFormulaEditing(true);
    setFormulaFocusToken((token) => token + 1);
  }

  function insertReference(text) {
    if (summaryActive) {
      insertSummaryReference(text);
      return;
    }
    setFunctionFormula((current) => {
      const at = Math.max(0, Math.min(current.length, formulaCaretRef.current));
      const prefix = current.slice(0, at);
      const suffix = current.slice(at);
      const lead = current.trim() ? "" : "= ";
      const spacer = prefix && !lead && !/[\s(,+\-*/^=<>!]$/.test(prefix) ? " " : "";
      const chunk = `${lead}${spacer}${text}`;
      formulaCaretRef.current = prefix.length + chunk.length;
      setFormulaCaret(formulaCaretRef.current);
      return `${prefix}${chunk}${suffix}`;
    });
    setFormulaFocused(true);
    setFormulaFocusToken((token) => token + 1);
  }

  function focusSummaryCell(columnId, row) {
    setSummaryFocus({ columnId, row });
    setSummaryTab("summary");
    setPreviewSheet("summary");
    setFormulaOwner("summary");
    setFormulaEditing(true);
    setFormulaFocused(true);
    const key = summaryCellKey(columnId, row);
    formulaCaretRef.current = (summaryCells[key] || "").length;
    setFormulaCaret(formulaCaretRef.current);
    setFormulaFocusToken((token) => token + 1);
  }

  function acceptFormulaPick(pick, sheetId) {
    const summaryOwnsFormula = summarizeOn && !enrichExplainer && (previewSheet === "summary" || formulaOwner === "summary");
    if (summaryOwnsFormula) {
      if (sheetId === "summary") {
        focusSummaryCell(pick.column.id, Math.max(0, (pick.row || 1) - 1));
        return;
      }
      if (!formulaEditing && !summaryFormula) return;
      const sameSheet = sheetId === "markets" || (editSheetId === "new" && sheetId === "markets");
      const sheet = enrichmentSheets.find((item) => item.id === sheetId);
      insertSummaryReference(referenceText({ column: pick.column, row: pick.row, sheetTitle: sheet?.title || sheetTitle, sameSheet }));
      return;
    }
    if (!functionActive) return;
    if (pick.self || !formulaEditing) {
      if (!pick.self) return;
      setFormulaEditing(true);
      setFormulaFocused(true);
      setFormulaFocusToken((token) => token + 1);
      return;
    }
    const sameSheet = sheetId === editSheetId || (editSheetId === "new" && sheetId === "markets");
    const sheet = enrichmentSheets.find((item) => item.id === sheetId);
    insertReference(referenceText({ column: pick.column, row: pick.row, sheetTitle: sheet?.title || sheetTitle, sameSheet }));
  }

  function applySuggestion(item) {
    setFunctionFormula((current) => `${current.slice(0, item.from)}${item.name}(${current.slice(item.to)}`);
    formulaCaretRef.current = item.from + item.name.length + 1;
    setFormulaCaret(formulaCaretRef.current);
    setFormulaFocused(true);
    setFormulaFocusToken((token) => token + 1);
  }

  function commitFormula() {
    blurToken.current += 1;
    setFormulaFocused(false);
    setFormulaEditing(false);
  }

  const formulaEditorFor = (sheetId, bar) =>
    formulaEditing && functionActive && formulaOwner !== "summary" && (bar ? editSheetId !== sheetId : editSheetId === sheetId)
      ? {
          bar,
          value: functionFormula,
          error: formulaReady && editSheetId === (bar ? editSheetId : sheetId) ? formulaView?.error || "" : "",
          examples: formulaExamples(editBase.columns),
          suggestions: formulaSuggestions(functionFormula, formulaCaret),
          focusToken: formulaFocusToken,
          onChange: setFunctionFormula,
          onFocus: () => {
            blurToken.current += 1;
            setFormulaFocused(true);
          },
          onBlur: () => {
            const token = blurToken.current;
            window.setTimeout(() => {
              if (blurToken.current !== token) return;
              setFormulaFocused(false);
            }, 220);
          },
          onCaret: (caret) => {
            formulaCaretRef.current = caret;
            setFormulaCaret(caret);
          },
          onPickSuggestion: applySuggestion,
          onCommit: commitFormula,
        }
      : null;

  const referencesFor = (sheetId) => {
    if (!formulaFocused) return { referencedColumnIds: [], referencedCells: [] };
    const refs = (formulaView?.references || []).filter(
      (ref) => ref.sheetId === sheetId || (sheetId === "new" && ref.sheetId === "markets") || (sheetId === "markets" && ref.sheetId === "new"),
    );
    return {
      referencedColumnIds: refs.filter((ref) => ref.row == null).map((ref) => ref.column.id),
      referencedCells: refs.filter((ref) => ref.row != null).map((ref) => ({ columnId: ref.column.id, row: ref.row })),
    };
  };

  function marketsRequestForRun(withSample = false) {
    let request = lockedQuery?.athena || athenaRequest();
    if (withSample && enrichPicks.has("sample") && sampleSizeNumber > 0 && !sampleSizeError) {
      request = attachRandomSample(request, {
        size: sampleSizeNumber,
        mode: sampleMode,
        seed: sampleMode === "seeded" ? sampleSeed || generateRandomSampleSeed() : "",
      });
    }
    if (!request?.compose?.select || !joinCommitted) return request;
    const needed = join?.ensureColumns || ["ticker"];
    const select = request.compose.select;
    const missing = needed.filter((id) => !select.some((entry) => entry.column === id || entry.alias === id));
    if (!missing.length) return request;
    return {
      ...request,
      compose: {
        ...request.compose,
        select: [...missing.map((id) => ({ column: id, alias: id })), ...select],
      },
    };
  }

  function joinMarketsFromRows(rows, cap) {
    if (!join) return [];
    return join.marketsFromRows(rows, cap);
  }

  function openPullTab() {
    const tabs = Array.isArray(ctx?.workspaceStartTabs) ? ctx.workspaceStartTabs : [];
    const tab = {
      id: newStartTabId(),
      name: newBlankTabName(tabs.map((item) => item.name)),
      blank: true,
    };
    const nextTabs = [...tabs, tab];
    ctx?.setWorkspaceStartTabs?.(nextTabs);
    ctx?.setWelcomeTabRemoved?.(!!ctx?.welcomeTabRemoved);
    ctx?.setActiveWorkspaceStartTabId?.(tab.id);
    ctx?.setViewing?.("welcome");
    saveWorkspaceStartTabs(user?.userId || "local", {
      welcomeRemoved: !!ctx?.welcomeTabRemoved,
      tabs: nextTabs,
      activeId: tab.id,
    });
    return pageIdForTab(tab.id);
  }

  function beginPlacement() {
    if ((canvas?.blocks || []).length > 0) {
      setPlacementPrompt(true);
      return;
    }
    placementRef.current = { pageId: "", append: false };
    void onSaveAndRun();
  }

  function requestSaveAndRun() {
    if (running) return;
    if (seriesBrowsing && seriesJoinOn && seriesJoinTickers.length) {
      setSeriesBrowsePrompt(true);
      return;
    }
    continueSaveAndRun();
  }

  function confirmSeriesBrowse() {
    setSeriesBrowsePrompt(false);
    continueSaveAndRun();
  }

  function continueSaveAndRun() {
    if (enrichPicks.has("sample") && sampleSizeNumber > 0 && !sampleSizeError) {
      setSampleSavePrompt(true);
      return;
    }
    sampleKeepRef.current = "both";
    beginPlacement();
  }

  function confirmSampleSave(choice) {
    setSampleSavePrompt(false);
    if (choice !== "both" && choice !== "sample") return;
    sampleKeepRef.current = choice;
    beginPlacement();
  }

  function choosePlacement(choice) {
    if (choice === "new" && ctx?.landingDemo) {
      setPlacementPrompt("members");
      return;
    }
    confirmPlacement(choice);
  }

  function backFromMembersPrompt() {
    setPlacementPrompt(true);
  }

  function closePlacementPrompt() {
    setPlacementPrompt(false);
  }

  function confirmPlacement(choice) {
    setPlacementPrompt(false);
    if (choice === "new") {
      placementRef.current = { pageId: openPullTab(), append: false };
    } else {
      placementRef.current = { pageId: "", append: true };
    }
    void onSaveAndRun();
  }

  async function onSaveAndRun() {
    if (running || runLockRef.current) return;
    runLockRef.current = true;
    canvas?.armReplay?.(onSaveAndRun);
    setRunning(true);
    const reporter = createRunReporter((feed) => canvas?.reportRun?.(feed));
    try {
    const sheetCap = typeof planLimit === "number" && planLimit > 0 ? planLimit : getHistoricalPullRowLimit(user);
    const sampling = enrichPicks.has("sample") && sampleSizeNumber > 0 && !sampleSizeError;
    const keepParentDataset = !sampling || sampleKeepRef.current !== "sample";
    const sampleConfig = sampling
      ? {
          size: sampleSizeNumber,
          mode: sampleMode,
          seed: sampleMode === "seeded" ? sampleSeed || generateRandomSampleSeed() : "",
        }
      : null;
    const parentRequest = marketsRequestForRun(false);
    const sampledRequest = sampling ? marketsRequestForRun(true) : null;
    const marketsRequest = sampling && !keepParentDataset ? sampledRequest : parentRequest;
    const sourceTable = `${lakeId}.${tableId || "sheet"}`;
    const browserParentQuery = (extra = {}) => ({
      integrationId,
      tableId,
      label: lockedQuery?.label || describeSearch(),
      attributeFilters,
      sortKeys,
      rowLimit,
      engine: "browser",
      ...extra,
    });
    const drawSample = (rows) =>
      previewRandomSample(rows, {
        size: sampleConfig.size,
        mode: sampleConfig.mode,
        seed: sampleConfig.mode === "seeded" ? sampleConfig.seed : `draw-${Date.now()}`,
      });
    const planned = [
      {
        id: "source",
        name: `compose_${tableId || "sheet"}`,
        status: "pending",
        args: { lake: lakeId, table: tableId, limit: Number.isFinite(sheetCap) ? sheetCap : undefined },
      },
    ];
    if (tradesJoinReady) {
      planned.push({
        id: "join-markets",
        name: "compose_markets",
        status: "pending",
        args: { lake: lakeId, table: "markets", match: polymarketHistorical ? "outcome token" : "ticker" },
      });
    }
    if (joinCommitted) {
      planned.push({
        id: "join-trades",
        name: "compose_trades",
        status: "pending",
        args: { lake: lakeId, table: "trades", sheets: Math.min(joinedMarkets.length || marketCap, marketCap) },
      });
    }
    if (liveTraderList && enrichPicks.has("join") && traderJoinKinds.length) {
      planned.push({
        id: "join-traders",
        name: "compose_trader_join",
        status: "pending",
        args: { traders: traderJoinNames.length, targets: traderJoinKinds.join("+") },
      });
    }
    if ((liveSeriesSearch || liveEventSearch) && enrichPicks.has("join") && joinTarget === scopeJoinId && seriesJoinTickers.length) {
      planned.push({
        id: "join-series-markets",
        name: "compose_series_markets",
        status: "pending",
        args: { layout: seriesMarketLayout, series: seriesJoinTickers.length },
      });
    }
    if (liveEventSearch && enrichPicks.has("join") && eventExtraKinds.length && seriesJoinTickers.length) {
      planned.push({
        id: "join-event-extra",
        name: "compose_event_extra",
        status: "pending",
        args: { events: seriesJoinTickers.length, targets: eventExtraKinds.join("+") },
      });
    }
    if (liveForecast && enrichPicks.has("join") && forecastJoinKinds.length && forecastJoinEvents.length) {
      planned.push({
        id: "join-forecast-related",
        name: "compose_forecast_related",
        status: "pending",
        args: { events: forecastJoinEvents.length, targets: forecastJoinKinds.join("+") },
      });
    }
    if ((polymarketTraderCatalog || polymarketEventCatalog) && liveJoinTargets.some((item) => polymarketJoinPlacement(item, traderMarketLayout) === "merge")) {
      planned.push({ id: "join-merge", name: "merge_join_columns", status: "pending" });
    }
    if (polymarketJoinActive || liveJoinReady || (marketDownstream && liveJoinTargets.length)) {
      const sheetTargets = polymarketTraderCatalog || polymarketEventCatalog
        ? liveJoinTargets.filter((item) => polymarketJoinPlacement(item, traderMarketLayout) === "sheet")
        : liveJoinTargets;
      const eventSheets = sheetTargets.filter((item) => item.anchor === "event").length * polymarketEventPeople.length;
      const traderSheets = sheetTargets.filter((item) => item.anchor === "trader").length * polymarketTraderPeople.length;
      const marketSheets = sheetTargets.filter((item) => item.anchor !== "trader" && item.anchor !== "event").length * polymarketJoinMarkets.length;
      planned.push({
        id: "join-live",
        name: "compose_live_joins",
        status: "pending",
        args: {
          sheets: polymarketSeriesCatalog
            ? polymarketSeriesPeople.length
            : polymarketEventCatalog
              ? eventSheets
              : polymarketTraderCatalog
                ? traderSheets + marketSheets
                : (polymarketJoinActive ? polymarketJoinMarkets.length : liveJoinReady ? liveJoinMarkets.length : marketCap) * liveJoinTargets.length,
          sources: sheetTargets.map((item) => item.title).join(", "),
        },
      });
    }
    if (enrichPicks.has("bucket")) planned.push({ id: "buckets", name: "bucket_rows", status: "pending" });
    if (enrichPicks.has("summarize")) planned.push({ id: "summary", name: "summarize", status: "pending" });
    if (enrichPicks.has("function")) planned.push({ id: "functions", name: "function_columns", status: "pending" });
    planned.push({ id: "place", name: "place_sheets", status: "pending", args: { tab: sheetTitle } });
    reporter.plan(planned, { title: `${venueLabel} · ${sheetTitle}` });
    connect?.close?.();
    let marketRows = liveMatchedRows
      ? liveMatchedRows
      : polymarketScan.status !== "idle" && polymarketScan.rows?.length
        ? polymarketScan.rows
        : filteredRows;
    let sampledRows = null;
    reporter.start("source");
    if (polymarketLive) {
      const asked = Number(rowLimit);
      const importLimit =
        Number.isFinite(asked) && asked > 0 && Number.isFinite(sheetCap)
          ? Math.min(asked, sheetCap)
          : Number.isFinite(sheetCap)
            ? sheetCap
            : PREVIEW_ROW_CAP;
      try {
        const columnsFor = (rows) => {
          if (tableId === "getSamplingMarkets") return polymarketSamplingColumns;
          if (tableId === "getMarkets") return polymarketMarketColumns;
          if (polymarketBiggestWinnersColumns.length) return polymarketBiggestWinnersColumns;
          if (polymarketLeaderboardColumns.length) return polymarketLeaderboardColumns;
          if (polymarketPositionColumns.length) return polymarketPositionColumns;
          if (polymarketPnlColumns.length) return polymarketPnlColumns;
          if (polymarketActivityColumns.length) return polymarketActivityColumns;
          if (polymarketQuoteColumns.length) return polymarketQuoteColumns;
          return pull?.columns || [];
        };
        let pulled = [];
        const marketList = (tableId === "getMarkets" || tableId === "getSamplingMarkets") && !livePicks.length;
        // The preview sorted its first page. A limit inside that page is ranked from the same page, not from the first rows of a scan.
        const previewPool = marketList && !polymarketExplore && hasRowLimit ? Math.max(importLimit, pull?.rows?.length || PREVIEW_ROW_CAP) : 0;
        if (marketList && !previewPool) {
          const samplingTable = tableId === "getSamplingMarkets";
          const columns = samplingTable ? polymarketSamplingColumns : polymarketMarketColumns;
          const scanCap = samplingTable ? POLYMARKET_SAMPLING_SCAN_CAP : POLYMARKET_MARKET_SCAN_CAP;
          const scan = samplingTable ? scanSamplingMarkets : scanPolymarketMarkets;
          const result = await scan({
            filters: attributeFilters,
            columns,
            target: Math.min(scanCap, importLimit),
            match: (row) => rowMatchesAttributes(row, columns, attributeFilters),
            explain: (row) => attributeMismatchReason(row, columns, attributeFilters),
            onProgress: (info) => {
              const kept = Array.isArray(info?.rows) ? info.rows.length : 0;
              reporter.note("source", `Read ${Number(info?.scanned || 0).toLocaleString()} · kept ${kept.toLocaleString()}`);
            },
          });
          pulled = sortAttributeRows(result.rows || [], columns, sortKeys);
        } else {
          const result = await loadPolymarketLiveTable(tableId, livePicks, {
            filters: attributeFilters,
            sorts: sortKeys,
            rowLimit: previewPool || importLimit,
            planLimit: sheetCap,
            match: tableId === "getBiggestWinners" && polymarketBiggestWinnersFilterKey
              ? (row) => rowMatchesAttributes(row, polymarketBiggestWinnersColumns, attributeFilters)
              : undefined,
            explain: tableId === "getBiggestWinners" && polymarketBiggestWinnersFilterKey
              ? (row) => attributeMismatchReason(row, polymarketBiggestWinnersColumns, attributeFilters)
              : undefined,
            onProgress: tableId === "getBiggestWinners"
              ? (info) => {
                  const kept = Array.isArray(info?.rows) ? info.rows.length : 0;
                  reporter.note("source", `Read ${Number(info?.scanned || 0).toLocaleString()} · kept ${kept.toLocaleString()}`);
                }
              : undefined,
          });
          const columns = columnsFor(result.rows);
          const matched = (result.rows || []).filter((row) => rowMatchesAttributes(row, columns, attributeFilters));
          const ranked = sortAttributeRows(matched, columns, sortKeys);
          // Each trader already walked to this ceiling. A shared slice would cut the later sheets.
          pulled = (tableId === "getTraderPositions" || tableId === "getTraderPnlSeries" || tableId === "getTraderActivity") && livePicks.length > 1 ? ranked : ranked.slice(0, importLimit);
        }
        marketRows = pulled;
        reporter.succeed("source", {
          result: `${marketRows.length.toLocaleString()} rows from ${sourceTable}`,
        });
      } catch (err) {
        reporter.succeed("source", {
          result: `${marketRows.length.toLocaleString()} rows already on screen. ${err instanceof Error ? err.message : "The pull did not finish."}`,
        });
      }
    } else if (historicalLake && (parentRequest || sampledRequest)) {
      const pullCompose = async (request) => {
        const pulled = await loadAthenaComposeRows(request, {
          onPhase: (info) => reporter.note("source", describeComposePhase(info, { table: sourceTable, limit: sheetCap })),
        });
        return pulled.rows || [];
      };
      try {
        if (keepParentDataset && parentRequest) {
          const rows = await pullCompose(parentRequest);
          if (rows.length) marketRows = rows;
        }
        if (sampling && sampledRequest) {
          const rows = await pullCompose(sampledRequest);
          sampledRows = rows.length ? rows : drawSample(marketRows);
        }
        const parentCount = keepParentDataset ? marketRows.length : 0;
        const sampleCount = sampledRows?.length || 0;
        reporter.succeed("source", {
          result: sampling
            ? `${keepParentDataset ? `${parentCount.toLocaleString()} parent rows · ` : ""}${sampleCount.toLocaleString()} sampled rows from ${sourceTable}`
            : `${marketRows.length.toLocaleString()} rows from ${sourceTable}`,
        });
      } catch (err) {
        if (sampling) sampledRows = drawSample(marketRows);
        reporter.succeed("source", {
          result: `${(sampledRows || marketRows).length.toLocaleString()} rows already on screen. ${err instanceof Error ? err.message : "The compose did not finish."}`,
        });
      }
    } else if (pairStreamOn) {
      if (!streamPairs.length) {
        reporter.fail("source", "Pick at least one pair to stream.");
        return;
      }
      const streamed = streamPairs.reduce((sum, symbol) => sum + (pairStreams[symbol]?.rows?.length || 0), 0);
      reporter.succeed("source", {
        result: `${streamPairs.length.toLocaleString()} ${streamPairs.length === 1 ? "pair" : "pairs"} · ${streamed.toLocaleString()} rows streamed`,
      });
    } else if (!liveDirect) {
      if (sampling) sampledRows = drawSample(marketRows);
      reporter.succeed("source", {
        result: sampling
          ? `${keepParentDataset ? `${marketRows.length.toLocaleString()} parent rows · ` : ""}${(sampledRows || []).length.toLocaleString()} sampled rows from ${sourceTable}`
          : `${marketRows.length.toLocaleString()} rows from ${sourceTable}`,
      });
    }
    let primaryColumns = shownColumns;
    let primaryRows = marketRows;
    let metadataSheet = null;
    let joinedTickers = [];
    let joinedMarketRequest = null;
    if (tradesJoinReady && join) {
      reporter.start("join-markets");
      let joinedMarketRows = marketPreview.status === "ready" ? marketPreview.rows : [];
      const marketTable = `${lakeId}.markets`;
      try {
        const result = await join.loadMarkets(marketRows, {
          onPhase: (info) => reporter.note("join-markets", describeComposePhase(info, { table: marketTable })),
        });
        if (Array.isArray(result.rows)) joinedMarketRows = result.rows;
        if (result.request) joinedMarketRequest = result.request;
        reporter.succeed("join-markets", { result: `${joinedMarketRows.length.toLocaleString()} markets from ${marketTable}` });
      } catch (err) {
        joinedMarketRows = marketPreview.status === "ready" ? marketPreview.rows : [];
        reporter.succeed("join-markets", {
          result: `${joinedMarketRows.length.toLocaleString()} markets already loaded. ${err instanceof Error ? err.message : ""}`.trim(),
        });
      }
      joinedTickers = joinedMarketRows.map((row) => join.marketKey(row)).filter(Boolean);
      if (joinPlacement === "merge") {
        const merged = attachMarketMetadata(
          shownColumns,
          marketRows,
          selectedMarketColumns,
          joinedMarketRows,
          join?.matchTrade,
        );
        primaryColumns = merged.columns;
        primaryRows = merged.rows;
      } else {
        metadataSheet = {
          id: "run-market-metadata",
          title: "Markets",
          columns: selectedMarketColumns,
          rows: join.orderMarkets(joinedMarketRows, marketRows, joinedTickers),
          span: "full",
          table: "markets",
          summary: `${venueLabel} · markets · joined by ${join.matchNoun}`,
          composeRequest: joinedMarketRequest,
          joinMeta: { match: join.match, role: "markets" },
        };
      }
    }
    if (polymarketLive && (polymarketTraderCatalog || polymarketEventCatalog) && enrichPicks.has("join")) {
      const mergeTargets = liveJoinTargets.filter((item) => polymarketJoinPlacement(item, traderMarketLayout) === "merge");
      if (mergeTargets.length) {
        reporter.start("join-merge");
        try {
          const people = polymarketTraderEntities(marketRows, 500);
          const markets = polymarketMarketEntities(marketRows, 200);
          const events = polymarketEventEntities(marketRows, 200);
          for (const target of mergeTargets) {
            const anchor = target.anchor === "market" ? "market" : target.anchor === "event" ? "event" : "trader";
            const entities = anchor === "market" ? markets : anchor === "event" ? events : people;
            let columns = [];
            const rows = [];
            const pulled = await mapPool(entities, 4, async (entity) => {
              try {
                const result = anchor === "trader"
                  ? await loadPolymarketTraderJoin(target.id, entity.pick, { rowLimit: 1, planLimit: 1 })
                  : target.id === "getLiveVolumeForEvent"
                    ? await loadPolymarketEventVolumeJoin(entity.pick)
                    : await loadPolymarketLiveJoin(target.id, entity.pick, { rowLimit: 1, planLimit: 1 });
                const row = result.rows?.[0];
                if (!row) return null;
                return {
                  columns: result.columns || [],
                  row: anchor === "market"
                    ? {
                        ...row,
                        condition_id: row.condition_id || entity.pick.conditionId,
                        conditionId: row.conditionId || entity.pick.conditionId,
                        slug: row.slug || entity.pick.slug,
                      }
                    : row,
                };
              } catch {
                return null;
              }
            });
            for (const item of pulled) {
              if (!item) continue;
              if (!columns.length && item.columns.length) columns = item.columns;
              rows.push(item.row);
            }
            if (columns.length && rows.length) {
              const merged = mergePolymarketJoinRows(primaryColumns, primaryRows, columns, rows, { anchor });
              primaryColumns = merged.columns;
              primaryRows = merged.rows;
            }
          }
          reporter.succeed("join-merge", { result: "Columns merged onto this sheet" });
        } catch (err) {
          reporter.succeed("join-merge", {
            result: err instanceof Error ? err.message : "Merge did not finish",
          });
        }
      }
    }
    const runMarkets = applyFunctionColumns(
      primaryColumns,
      primaryRows,
      functionsForSheet("markets"),
      formulaSheets,
      "markets",
      activeFunction?.id,
    );
    const targetPage = placementRef.current?.pageId || canvas?.pageId || "";
    const occupiedSheetIds = new Set(
      ((canvas?.blocksByPage || {})[targetPage] || []).map((block) => block?.id).filter(Boolean),
    );
    const claimedSheetIds = new Map();
    const claimRunSheetId = (id) => claimSheetId(id, occupiedSheetIds, claimedSheetIds);
    const stage = createRunSheetStage({
      reveal: (list, extra) =>
        canvas?.revealRunSheets?.(list, {
          pageId: placementRef.current?.pageId || undefined,
          append: placementRef.current?.append !== false,
          ...extra,
          rewriteId: claimRunSheetId,
        }),
      opensChart: (sheet) =>
        chartSpecsForSheet({
          ...sheet,
          type: "sheet",
          records: recordsFromRows(sheet.columns, (sheet.rows || []).slice(0, CHART_PROBE_ROWS)),
        }).length > 0,
    });
    const sheets = stage.sheets;
    /** Every Save and run sheet goes through here, so it lands on the tab as soon as its rows are in. */
    const stageSheet = (sheet) => {
      if (sheet && !sheet.integrationId && integrationId) sheet.integrationId = integrationId;
      return stage.put(sheet);
    };
    const pushSampleSheet = ({ id, title, columns, rows, parentSheetId, parentQuery, composeRequest, table, span }) => {
      if (!sampling || !sampleConfig || !columns?.length) return;
      const drawn = Array.isArray(rows) ? rows : [];
      stageSheet({
        id,
        title,
        columns,
        rows: drawn,
        rowCount: drawn.length,
        keepAllRows: true,
        span: span || "full",
        table: table || tableId || "markets",
        summary: `Random sample · ${sampleConfig.size.toLocaleString()} ${sampleConfig.mode} rows`,
        ...(composeRequest ? { composeRequest } : {}),
        enrichment: {
          operation: "sample",
          parentSheetId: keepParentDataset ? parentSheetId || "" : "",
          detail: {
            size: sampleConfig.size,
            mode: sampleConfig.mode,
            seed: sampleConfig.mode === "seeded" ? sampleConfig.seed : "",
            engine: composeRequest ? "athena" : "browser",
            parentQuery: parentQuery || null,
          },
        },
      });
    };
    let runTickers = [];
    let downstreamJoinMarkets = [];
    if (liveDirect) {
      const browsedEvents = eventsBrowsing ? (Array.isArray(eventImportRows) ? eventImportRows : pull?.rows || []) : null;
      const scopeError = browsedEvents?.length ? "" : kalshiLiveDirectScopeError(tableId, livePicks, directQuery, attributeFilters);
      if (scopeError) {
        reporter.fail("source", scopeError);
        return;
      }
      if (livePicks.some((pick) => pick.status === "loading")) {
        reporter.fail("source", "Wait for the selected markets to finish loading.");
        return;
      }
      const limit = Number.isFinite(sheetCap) ? sheetCap : PREVIEW_ROW_CAP;
      const shape = (loaded) => {
        const available = loaded?.columns || [];
        const columns = shownColumns.filter((column) => available.some((item) => item.id === column.id));
        return { columns: columns.length ? columns : available, rows: loaded?.rows || [] };
      };
      const titleFor = { trades: "Trades", orderbook: "Order book", candlesticks: "Candlesticks", series: "Series", events: "Events" };
      const label = titleFor[tableId] || sheetTitle;
      let built = [];
      let forecastRunEvents = forecastJoinEvents;
      if (tableId === "series") {
        const tickers = directSeriesTickers(livePicks);
        const categories = seriesDiscoveryCategories(attributeFilters);
        const loaded = seriesBrowsing
          ? { columns: pull?.columns || [], rows: pull?.rows || [] }
          : await loadKalshiLiveDirect(
              "series",
              tickers.length
                ? { mode: "tickers", tickers, limit }
                : {
                    mode: "discover",
                    categories,
                    includeProductMetadata: !hidden.has("product_metadata"),
                    minUpdatedTs: seriesUpdatedAfter(attributeFilters),
                    limit,
                  },
            );
        const shaped = shape(loaded);
        const matched = shaped.rows.filter((row) => rowMatchesAttributes(row, seriesAttributeColumns, attributeFilters));
        const sorted = sortAttributeRows(matched, seriesAttributeColumns, sortKeys);
        const requested = Number(rowLimit);
        const rows = Number.isFinite(requested) && requested > 0 ? sorted.slice(0, Math.min(requested, limit)) : sorted;
        const attributeLines = seriesAttributeColumns.flatMap((column) => {
          const summary = attributeSummary(column, attributeFilters);
          return summary ? [`${column.title} ${summary}`] : [];
        });
        built = [
          {
            id: "run-live-series",
            title: "Series",
            columns: shaped.columns,
            rows,
            span: "full",
            table: "series",
            summary: tickers.length
              ? `Kalshi Live · Series · ${tickers.join(", ")}`
              : categories.length
                ? `Kalshi Live · Series · ${categories.join(", ")}`
                : `Kalshi Live · Series · ${rows.length.toLocaleString()} series`,
            attributeLines,
            sortLine: sortSummary(seriesAttributeColumns, sortKeys),
            sourceRows: rows,
          },
        ];
      } else if (tableId === "events") {
        const tickers = directEventTickers(livePicks);
        const statuses = eventDiscoveryStatuses(attributeFilters);
        const seriesTicker = eventSeriesTicker(attributeFilters);
        const loaded = browsedEvents
          ? { columns: pull?.columns || [], rows: browsedEvents }
          : await loadKalshiLiveDirect(
              "events",
              tickers.length
                ? {
                    mode: "tickers",
                    tickers,
                    includeMarkets: eventsNeedMarkets(hidden),
                    includeMilestones: !hidden.has("milestones"),
                    limit,
                  }
                : {
                    mode: "discover",
                    statuses,
                    seriesTickers: eventSeriesTickers(attributeFilters),
                    minCloseTs: eventClosesAfter(attributeFilters),
                    minUpdatedTs: seriesUpdatedAfter(attributeFilters),
                    includeMarkets: eventsNeedMarkets(hidden),
                    includeMilestones: !hidden.has("milestones"),
                    limit,
                  },
            );
        const shaped = shape(loaded);
        const matched = shaped.rows.filter((row) => rowMatchesAttributes(row, eventAttributeColumns, attributeFilters));
        const sorted = sortAttributeRows(matched, eventAttributeColumns, sortKeys);
        const requested = Number(rowLimit);
        const rows = Number.isFinite(requested) && requested > 0 ? sorted.slice(0, Math.min(requested, limit)) : sorted;
        const attributeLines = eventAttributeColumns.flatMap((column) => {
          const summary = attributeSummary(column, attributeFilters);
          return summary ? [`${column.title} ${summary}`] : [];
        });
        built = [
          {
            id: "run-live-events",
            title: "Events",
            columns: shaped.columns,
            rows,
            span: "full",
            table: "events",
            summary: tickers.length
              ? `Kalshi Live · Events · ${tickers.join(", ")}`
              : browsedEvents
                ? `Kalshi Live · Events · ${rows.length.toLocaleString()} events`
                : `Kalshi Live · Events · ${[...statuses, seriesTicker].filter(Boolean).join(", ") || "discovery"}`,
            attributeLines,
            sortLine: sortSummary(eventAttributeColumns, sortKeys),
            sourceRows: rows,
            ...(browsedEvents
              ? {
                  pull: {
                    table: "events",
                    mode: "tickers",
                    tickers: [...new Set(rows.map((row) => String(row?.event_ticker || "").trim()).filter(Boolean))],
                    includeMarkets: eventsNeedMarkets(hidden),
                    includeMilestones: !hidden.has("milestones"),
                  },
                }
              : {}),
          },
        ];
      } else if (isKalshiLiveTraderTable(tableId)) {
        const asked = Number(rowLimit);
        const userCap = Number.isFinite(asked) && asked > 0 ? asked : limit;
        const endpointCap = tableId === "leaderboard" ? 100 : tableId === "search_traders" ? 500 : tableId === "trades_by_holder" ? 5000 : userCap;
        const traderPull = kalshiTraderPullSpec(tableId, attributeFilters);
        const loaded = await loadKalshiLiveDirect(tableId, { ...traderPull, limit: Math.min(limit, userCap, endpointCap) });
        const shaped = shape(loaded);
        const matched = shaped.rows.filter((row) => rowMatchesAttributes(row, traderAttributeColumns, attributeFilters));
        const sorted = sortAttributeRows(matched, traderAttributeColumns, sortKeys);
        const requested = Number(rowLimit);
        const rows = Number.isFinite(requested) && requested > 0 ? sorted.slice(0, Math.min(requested, limit)) : sorted;
        const attributeLines = traderAttributeColumns.flatMap((column) => {
          const summary = attributeSummary(column, attributeFilters);
          return summary ? [`${column.title} ${summary}`] : [];
        });
        const titles = {
          leaderboard: "Leaderboard",
          search_traders: "Traders",
          holder_profile: "Profile",
          holder_positions: "Positions",
          trades_by_holder: "Trader trades",
        };
        const onlyName = traderPull.nicknames?.length === 1 ? traderPull.nicknames[0] : "";
        const traderTitle = onlyName && tableId === "holder_positions"
          ? kalshiTraderJoinSheetTitle("positions", onlyName)
          : onlyName && tableId === "trades_by_holder"
            ? kalshiTraderJoinSheetTitle("trades", onlyName)
            : titles[tableId] || sheetTitle;
        built = [
          {
            id: `run-live-${tableId}`,
            title: traderTitle,
            columns: shaped.columns,
            rows,
            span: "full",
            table: tableId,
            pull: traderPull,
            summary: `Kalshi Live · ${traderTitle}`,
            attributeLines,
            sortLine: sortSummary(traderAttributeColumns, sortKeys),
            sourceRows: rows,
          },
        ];
      } else if (tableId === "event_forecast") {
        const loaded = await loadKalshiLiveDirect("event_forecast", {
          events: forecastTargets.events,
          seriesTickers: forecastTargets.seriesTickers,
          minTs: directWindow.minTs,
          maxTs: directWindow.maxTs,
          period: directWindow.period ?? 60,
          percentiles: forecastPercentileValues(attributeFilters),
          limit,
          previewFirst: false,
          eventCap: 25,
        });
        if (Array.isArray(loaded.events) && loaded.events.length) {
          forecastRunEvents = loaded.events
            .map((event) => ({
              ticker: String(event.eventTicker || event.ticker || "").trim(),
              seriesTicker: String(event.seriesTicker || "").trim(),
              title: String(event.title || event.eventTicker || event.ticker || "").trim(),
            }))
            .filter((event) => event.ticker);
        }
        const shaped = shape(loaded);
        const matched = shaped.rows.filter((row) => rowMatchesAttributes(row, forecastRowColumns, attributeFilters));
        const sorted = sortAttributeRows(matched, forecastRowColumns, sortKeys);
        const groups = new Map();
        for (const row of sorted) {
          const ticker = String(row.event_ticker || "").trim() || "forecast";
          if (!groups.has(ticker)) groups.set(ticker, []);
          groups.get(ticker).push(row);
        }
        const entries = [...groups.entries()];
        built = entries.map(([ticker, rows]) => ({
          id: entries.length === 1 ? "run-live-event-forecast" : `run-live-event-forecast-${ticker.replace(/[^A-Za-z0-9]+/g, "-")}`,
          title: entries.length === 1 ? "Event forecast" : `Event forecast · ${ticker}`,
          columns: shaped.columns,
          rows: rows,
          rowCount: rows.length,
          span: entries.length > 1 ? "half" : "full",
          table: "event_forecast",
          summary: `Kalshi Live · Event forecast · ${ticker}`,
          sourceRows: rows,
        }));
      } else if (tableId === "event_candlesticks") {
        const pulled = await mapPool(eventCandleEvents, 2, async (event) => {
          const markets = await loadKalshiLiveEventMarkets(event.eventTicker, limit);
          const span = eventCandleSpan(
            { minTs: directWindow.minTs, maxTs: directWindow.maxTs, period: directWindow.period || 60 },
            attributeFilters?.time_range,
            markets.rows,
          );
          const candles = await loadKalshiLiveDirect("event_candlesticks", {
            eventTicker: event.eventTicker,
            seriesTicker: event.seriesTicker,
            minTs: span.minTs,
            maxTs: span.maxTs,
            period: span.period || 60,
            limit,
          });
          return { event, markets, candles };
        });
        const severalEvents = pulled.length > 1;
        const candleSheets = [];
        const joinMarkets = [];
        const finish = (rows) => {
          const matched = rows.filter((row) => rowMatchesAttributes(row, directRowColumns, attributeFilters));
          const sorted = sortAttributeRows(matched, directRowColumns, sortKeys);
          const requested = Number(rowLimit);
          return Number.isFinite(requested) && requested > 0 ? sorted.slice(0, Math.min(requested, limit)) : sorted;
        };
        for (const { event, markets, candles } of pulled) {
          const marketRows = markets.rows || [];
          if (markets.columns?.length) {
            const sheet = eventMarketsSheet(
              event,
              markets,
              severalEvents ? `run-live-event-markets-${event.eventTicker.replace(/[^A-Za-z0-9]+/g, "-")}` : "run-live-event-markets",
            );
            if (marketRows.length > PREVIEW_ROW_CAP) {
              rememberTradeSheet(sheet.id, event.eventTicker, sheet.columns, displayMatrix(sheet.columns, marketRows), limit, accountId);
            }
            stageSheet(sheet);
          }
          for (const row of marketRows) {
            const ticker = String(row?.ticker || "").trim();
            if (ticker && joinMarkets.length < marketCap && !joinMarkets.some((item) => item.ticker === ticker)) joinMarkets.push(kalshiJoinMarket(row));
          }
          const { columns } = shape(candles);
          if (!columns.length) continue;
          for (const sheet of eventCandleMarketSheets(event, marketRows, candles, columns, finish)) {
            if (sheet.rows.length > PREVIEW_ROW_CAP) {
              rememberTradeSheet(sheet.id, sheet.pull.ticker, columns, displayMatrix(columns, sheet.rows), limit, accountId);
            }
            // Each event's candles follow its own Markets sheet on the tab.
            if (keepParentDataset) {
              const { sourceRows, ...staged } = sheet;
              stageSheet(staged);
              sheet.staged = true;
            }
            candleSheets.push(sheet);
          }
        }
        built = candleSheets;
        downstreamJoinMarkets = joinMarkets;
      } else if (tableId === "multivariate_events") {
        const loaded = await loadKalshiLiveDirect("multivariate_events", {
          seriesTickers: multivariateSeries.length ? multivariateSeries : eventSeriesTickers(attributeFilters),
          collectionTicker: multivariateSeries.length || eventSeriesTickers(attributeFilters).length ? "" : multivariateCollection,
          includeMarkets: eventIncludeMarkets,
          match: multivariateColumnFilterKey
            ? (row) => rowMatchesAttributes(row, multivariateRowColumns, attributeFilters)
            : null,
          maxPages: 25,
          limit,
        });
        const shaped = shape(loaded);
        const matched = shaped.rows.filter((row) => rowMatchesAttributes(row, multivariateRowColumns, attributeFilters));
        const sorted = sortAttributeRows(matched, multivariateRowColumns, sortKeys);
        const requested = Number(rowLimit);
        const rows = Number.isFinite(requested) && requested > 0 ? sorted.slice(0, Math.min(requested, limit)) : sorted;
        const attributeLines = multivariateAttributeColumns.flatMap((column) => {
          const summary = attributeSummary(column, attributeFilters);
          return summary ? [`${column.title} ${summary}`] : [];
        });
        built = [
          {
            id: "run-live-multivariate-events",
            title: "Multivariate events",
            columns: shaped.columns,
            rows,
            span: "full",
            table: "multivariate_events",
            summary: `Kalshi Live · Multivariate events${multivariateSeries.length ? ` · ${multivariateSeries.join(", ")}` : multivariateCollection ? ` · ${multivariateCollection}` : ""}`,
            attributeLines,
            sortLine: sortSummary(multivariateAttributeColumns, sortKeys),
            sourceRows: rows,
          },
        ];
      } else {
        const markets = directMarketTickers(livePicks);
        const pulled = await mapPool(markets, 3, (market) =>
          loadKalshiLiveDirect(tableId, {
            ticker: market.ticker,
            limit,
            ...marketDirectWindow(market),
          }).then((result) => ({ market, ...shape(result) })),
        );
        built = pulled
          .filter((item) => item.columns.length)
          .map((item) => {
            const id = `run-live-${tableId}-${String(item.market.ticker).replace(/[^A-Za-z0-9]+/g, "-")}`;
            const matched = (item.rows || []).filter((row) => rowMatchesAttributes(row, directRowColumns, attributeFilters));
            const sorted = sortAttributeRows(matched, directRowColumns, sortKeys);
            const requested = Number(rowLimit);
            const fullRows = Number.isFinite(requested) && requested > 0 ? sorted.slice(0, Math.min(requested, limit)) : sorted;
            if ((tableId === "trades" || tableId === "candlesticks") && fullRows.length > PREVIEW_ROW_CAP) {
              rememberTradeSheet(id, item.market.ticker, item.columns, displayMatrix(item.columns, fullRows), limit, accountId);
            }
            return {
              id,
              title: `${label} · ${item.market.label || item.market.ticker}`,
              columns: item.columns,
              rows: fullRows,
              rowCount: fullRows.length,
              span: pulled.length > 1 ? "half" : "full",
              table: tableId,
              pull: { ticker: item.market.ticker, table: tableId, ...lifePull(item.market) },
              summary: `Kalshi Live · ${label} · ${item.market.ticker}`,
              sourceRows: fullRows,
            };
          });
      }
      const directParents = built.filter((sheet) => sheet.columns.length);
      const directRows = directParents.reduce((sum, sheet) => sum + (sheet.rowCount || sheet.rows.length), 0);
      const directSamples = sampling
        ? directParents.map((sheet) => ({
            id: `${sheet.id}-sample`,
            title: directParents.length > 1 ? `Random sample · ${sheet.title}` : "Random sample",
            columns: sheet.columns,
            rows: drawSample(sheet.sourceRows || sheet.rows),
            parentSheetId: sheet.id,
            parentQuery: browserParentQuery(
              sheet.table === "series"
                ? {
                    tickers: directSeriesTickers(livePicks),
                    categories: seriesDiscoveryCategories(attributeFilters),
                    minUpdatedTs: seriesUpdatedAfter(attributeFilters),
                  }
                : sheet.table === "events"
                  ? {
                      tickers: directEventTickers(livePicks),
                      statuses: eventDiscoveryStatuses(attributeFilters),
                      seriesTicker: eventSeriesTicker(attributeFilters),
                      minCloseTs: eventClosesAfter(attributeFilters),
                      minUpdatedTs: seriesUpdatedAfter(attributeFilters),
                    }
                  : { ticker: sheet.pull?.ticker || "", directQuery },
            ),
            table: sheet.table,
            span: sheet.span,
          }))
        : [];
      const sampleRows = directSamples.reduce((sum, sheet) => sum + sheet.rows.length, 0);
      reporter.succeed("source", {
        result: sampling
          ? `${keepParentDataset ? `${directRows.toLocaleString()} parent rows · ` : ""}${sampleRows.toLocaleString()} sampled rows`
          : `${directParents.length.toLocaleString()} ${directParents.length === 1 ? "sheet" : "sheets"} · ${directRows.toLocaleString()} rows`,
      });
      if (keepParentDataset) {
        directParents.forEach(({ sourceRows, staged, ...sheet }) => {
          if (!staged) stageSheet(sheet);
        });
      }
      directSamples.forEach((sheet) => pushSampleSheet(sheet));
      const eventExtraJoin = tableId === "events" && enrichPicks.has("join") && eventExtraKinds.length > 0 && seriesJoinTickers.length > 0;
      const eventCandlesJoin = eventExtraJoin && eventExtraKinds.includes("candlesticks");
      const eventMarketsJoin = (tableId === "series" || tableId === "events") && enrichPicks.has("join") && joinTarget === scopeJoinId && seriesJoinTickers.length > 0;
      /** Markets sheets held back so each lands just before its event's candles and forecast. */
      const heldEventMarkets = new Map();
      if (eventMarketsJoin) {
        const unique = seriesJoinTickers.map((item) => item.ticker);
        const loadScopeMarkets = tableId === "events" ? loadKalshiLiveEventMarkets : loadKalshiLiveSeriesMarkets;
        reporter.start("join-series-markets");
        const marketLimit = Number.isFinite(sheetCap) ? sheetCap : PREVIEW_ROW_CAP;
        const seenMarkets = [];
        const rememberMarkets = (rows) => {
          if (!liveJoinTargets.length) return;
          for (const row of rows || []) {
            const ticker = String(row?.ticker || "").trim();
            if (!ticker || seenMarkets.some((item) => item.ticker === ticker)) continue;
            seenMarkets.push(kalshiJoinMarket(row));
            if (seenMarkets.length >= marketCap) return;
          }
        };
        try {
          if (seriesMarketLayout === "combined") {
            const rows = [];
            let columns = [];
            for (const ticker of unique) {
              if (rows.length >= marketLimit) break;
              const result = await loadScopeMarkets(ticker, marketLimit - rows.length);
              if (result.columns?.length) columns = result.columns;
              rows.push(...(result.rows || []));
            }
            const fullRows = rows.slice(0, marketLimit);
            rememberMarkets(fullRows);
            const id = "run-series-markets";
            if (columns.length && fullRows.length > PREVIEW_ROW_CAP) {
              rememberTradeSheet(id, unique.join(","), columns, displayMatrix(columns, fullRows), marketLimit, accountId);
            }
            if (columns.length) {
              stageSheet({
                id,
                title: "Markets",
                columns,
                rows: fullRows,
                rowCount: fullRows.length,
                span: "full",
                table: "markets",
                summary: `Kalshi Live · Markets · ${unique.join(", ")}`,
                pull: tableId === "events" ? { table: "markets", eventTickers: unique } : { table: "markets", seriesTickers: unique },
              });
            }
          } else {
            const pulled = await mapPool(unique, 2, (ticker) =>
              loadScopeMarkets(ticker, marketLimit).then((result) => ({ ticker, ...result })),
            );
            for (const item of pulled) {
              if (!item.columns?.length) continue;
              const id = `run-series-markets-${String(item.ticker).replace(/[^A-Za-z0-9]+/g, "-")}`;
              const fullRows = item.rows || [];
              rememberMarkets(fullRows);
              if (fullRows.length > PREVIEW_ROW_CAP) {
                rememberTradeSheet(id, item.ticker, item.columns, displayMatrix(item.columns, fullRows), marketLimit, accountId);
              }
              const sheet = {
                id,
                title: `Markets · ${item.ticker}`,
                columns: item.columns,
                rows: fullRows,
                rowCount: fullRows.length,
                span: unique.length > 1 && !eventCandlesJoin ? "half" : "full",
                table: "markets",
                summary: `Kalshi Live · Markets · ${item.ticker}`,
                pull: tableId === "events" ? { table: "markets", eventTicker: item.ticker } : { table: "markets", seriesTicker: item.ticker },
              };
              if (eventExtraJoin) heldEventMarkets.set(item.ticker, { sheet, markets: item });
              else stageSheet(sheet);
            }
          }
          downstreamJoinMarkets = seenMarkets;
          reporter.succeed("join-series-markets", {
            result: `${unique.length.toLocaleString()} ${listPlural}`,
          });
        } catch (err) {
          reporter.fail("join-series-markets", err instanceof Error ? err.message : "Markets join failed");
          return;
        }
      }
      if (eventExtraJoin) {
        const marketLimit = Number.isFinite(sheetCap) ? sheetCap : PREVIEW_ROW_CAP;
        const candlesOn = eventExtraKinds.includes("candlesticks");
        const forecastOn = eventExtraKinds.includes("forecast");
        const forecastCombined = forecastOn && seriesMarketLayout === "combined";
        const eventNoun = (count) => `${count.toLocaleString()} ${count === 1 ? "event" : "events"}`;
        reporter.start("join-event-extra");
        try {
          const candleFilters = joinWindows.event_candlesticks || defaultDirectAttributeFilters("event_candlesticks");
          const candleBase = directPullWindow("event_candlesticks", candleFilters, {});
          const forecastFilters = joinWindows.event_forecast || defaultJoinWindowFilters("event_forecast");
          const pulled = await mapPool(seriesJoinTickers, 2, async (item) => {
            const event = { eventTicker: item.ticker, seriesTicker: item.seriesTicker };
            const held = heldEventMarkets.get(item.ticker);
            const markets = held?.markets || (await loadKalshiLiveEventMarkets(item.ticker, marketLimit));
            const marketRows = markets.rows || [];
            let candles = null;
            if (candlesOn) {
              const span = eventCandleSpan(candleBase, candleFilters.time_range, marketRows);
              candles = await loadKalshiLiveEventCandlesticks({
                eventTicker: event.eventTicker,
                seriesTicker: event.seriesTicker,
                minTs: span.minTs,
                maxTs: span.maxTs,
                period: span.period || 60,
                limit: marketLimit,
              });
            }
            const forecast = forecastOn ? await loadEventForecastFor(event, marketRows, forecastFilters, marketLimit) : null;
            return { event, held, markets, candles, forecast };
          });
          let candleSheets = 0;
          const forecastRows = [];
          let forecastColumns = [];
          const forecastEvents = [];
          for (const { event, held, markets, candles, forecast } of pulled) {
            const marketRows = markets.rows || [];
            const safe = event.eventTicker.replace(/[^A-Za-z0-9]+/g, "-");
            if (held) stageSheet(held.sheet);
            else if (candlesOn && !eventMarketsJoin && markets.columns?.length) {
              const sheet = eventMarketsSheet(event, markets, `run-event-candles-markets-${safe}`);
              if (marketRows.length > PREVIEW_ROW_CAP) {
                rememberTradeSheet(sheet.id, event.eventTicker, sheet.columns, displayMatrix(sheet.columns, marketRows), marketLimit, accountId);
              }
              stageSheet(sheet);
            }
            if (candlesOn && liveJoinTargets.length) {
              for (const row of marketRows) {
                const ticker = String(row?.ticker || "").trim();
                if (downstreamJoinMarkets.length >= marketCap) break;
                if (ticker && !downstreamJoinMarkets.some((item) => item.ticker === ticker)) {
                  downstreamJoinMarkets = [...downstreamJoinMarkets, kalshiJoinMarket(row)];
                }
              }
            }
            if (candles?.columns?.length) {
              for (const { sourceRows, ...sheet } of eventCandleMarketSheets(event, marketRows, candles, candles.columns)) {
                if (sheet.rows.length > PREVIEW_ROW_CAP) {
                  rememberTradeSheet(sheet.id, sheet.pull.ticker, sheet.columns, displayMatrix(sheet.columns, sheet.rows), marketLimit, accountId);
                }
                stageSheet(sheet);
                candleSheets += 1;
              }
            }
            if (!forecast?.rows?.length) continue;
            forecastEvents.push(event.eventTicker);
            if (forecastCombined) {
              forecastColumns = forecast.columns;
              forecastRows.push(...forecast.rows);
              continue;
            }
            stageSheet({
              id: `run-event-forecast-${safe}`,
              title: `Event forecast · ${event.eventTicker}`,
              columns: forecast.columns,
              rows: forecast.rows,
              rowCount: forecast.rows.length,
              span: candlesOn || seriesJoinTickers.length === 1 ? "full" : "half",
              table: "event_forecast",
              summary: `Kalshi Live · Event forecast · ${event.eventTicker}`,
              pull: forecast.pull,
            });
          }
          if (forecastCombined && forecastColumns.length) {
            const fullRows = forecastRows.slice(0, marketLimit);
            stageSheet({
              id: "run-event-forecast",
              title: "Event forecast",
              columns: forecastColumns,
              rows: fullRows,
              rowCount: fullRows.length,
              span: "full",
              table: "event_forecast",
              summary: `Kalshi Live · Event forecast · ${forecastEvents.join(", ")}`,
            });
          }
          const parts = [eventNoun(seriesJoinTickers.length)];
          if (candlesOn) parts.push(`${candleSheets.toLocaleString()} candlestick ${candleSheets === 1 ? "sheet" : "sheets"}`);
          if (forecastOn) {
            const skipped = seriesJoinTickers.length - forecastEvents.length;
            parts.push(`${eventNoun(forecastEvents.length)} with a forecast${skipped ? ` · ${skipped.toLocaleString()} without` : ""}`);
          }
          reporter.succeed("join-event-extra", { result: parts.join(" · ") });
        } catch (err) {
          reporter.fail("join-event-extra", err instanceof Error ? err.message : "Event join failed");
          return;
        }
      }
      if (tableId === "event_forecast" && enrichPicks.has("join") && forecastJoinKinds.length && forecastRunEvents.length) {
        const marketLimit = Number.isFinite(sheetCap) ? sheetCap : PREVIEW_ROW_CAP;
        reporter.start("join-forecast-related");
        try {
          const filters = joinWindows.event_candlesticks;
          const window = joinPullWindow("candlesticks", filters);
          const period = !window.period || window.period === 0 ? 60 : window.period;
          const loadOne = (kind, item) =>
            kind === "events"
              ? loadKalshiLiveEventsByTickers([item.ticker])
              : kind === "markets"
                ? loadKalshiLiveEventMarkets(item.ticker, marketLimit)
                : loadKalshiLiveEventCandlesticks({
                    eventTicker: item.ticker,
                    seriesTicker: item.seriesTicker,
                    minTs: window.minTs,
                    maxTs: window.maxTs,
                    period,
                    limit: marketLimit,
                  });
          for (const kind of forecastJoinKinds) {
            const title = eventRelatedTitle(kind);
            const table = kind === "events" ? "events" : kind === "markets" ? "markets" : "event_candlesticks";
            if (seriesMarketLayout === "combined") {
              const rows = [];
              let columns = [];
              for (const item of forecastRunEvents) {
                if (rows.length >= marketLimit) break;
                const result = await loadOne(kind, item);
                if (result.columns?.length) columns = result.columns;
                rows.push(...(result.rows || []));
              }
              const fullRows = rows.slice(0, marketLimit);
              if (columns.length) {
                stageSheet({
                  id: `run-forecast-${kind}`,
                  title,
                  columns,
                  rows: fullRows,
                  rowCount: fullRows.length,
                  span: "full",
                  table,
                  summary: `Kalshi Live · ${title}`,
                });
              }
            } else {
              for (const item of forecastRunEvents) {
                const result = await loadOne(kind, item);
                if (!result.columns?.length) continue;
                const fullRows = result.rows || [];
                const safe = String(item.ticker).replace(/[^A-Za-z0-9]+/g, "-");
                stageSheet({
                  id: `run-forecast-${kind}-${safe}`,
                  title: `${title} · ${item.ticker}`,
                  columns: result.columns,
                  rows: fullRows,
                  rowCount: fullRows.length,
                  span: forecastRunEvents.length > 1 ? "half" : "full",
                  table,
                  summary: `Kalshi Live · ${title} · ${item.ticker}`,
                });
              }
            }
          }
          reporter.succeed("join-forecast-related", { result: `${forecastRunEvents.length.toLocaleString()} events` });
        } catch (err) {
          reporter.fail("join-forecast-related", err instanceof Error ? err.message : "Event forecast join failed");
          return;
        }
      }
      const rememberTraderMarkets = (rows) => {
        if (!liveTrader || !marketDownstream || !liveJoinTargets.length) return;
        for (const ticker of traderMarketTickersFromRows(rows)) {
          if (downstreamJoinMarkets.length >= marketCap) return;
          if (!downstreamJoinMarkets.some((item) => item.ticker === ticker)) downstreamJoinMarkets = [...downstreamJoinMarkets, kalshiJoinMarket({ ticker })];
        }
      };
      if (liveTrader && kalshiTraderTableNamesMarkets(tableId)) rememberTraderMarkets(directParents[0]?.sourceRows || directParents[0]?.rows || []);
      if (liveTraderList && enrichPicks.has("join") && traderJoinKinds.length) {
        const names = traderNicknamesFromRows(directParents[0]?.sourceRows || directParents[0]?.rows || [], marketCap);
        reporter.start("join-traders");
        try {
          const marketLimit = Number.isFinite(sheetCap) ? sheetCap : PREVIEW_ROW_CAP;
          if (!names.length) {
            reporter.succeed("join-traders", { result: "No nicknames in this list" });
          } else {
            const kindInfo = (kind) => KALSHI_TRADER_JOIN_KINDS.find((item) => item.id === kind) || KALSHI_TRADER_JOIN_KINDS[0];
            if (seriesMarketLayout === "combined") {
              for (const kind of traderJoinKinds) {
                const info = kindInfo(kind);
                const loaded = await loadKalshiTraderJoin(kind, names, marketLimit);
                const fullRows = loaded.rows || [];
                rememberTraderMarkets(fullRows);
                if (loaded.columns?.length) {
                  stageSheet({
                    id: kind === "trades" ? "run-trader-trades" : kind === "positions" ? "run-trader-positions" : "run-trader-profiles",
                    title: names.length === 1 ? kalshiTraderJoinSheetTitle(kind, names[0]) : info.title,
                    columns: loaded.columns,
                    rows: fullRows,
                    rowCount: fullRows.length,
                    span: "full",
                    table: info.table,
                    pull: loaded.pull,
                    summary: `Kalshi Live · ${info.title} · ${names.join(", ")}`,
                  });
                }
              }
            } else {
              const jobs = traderJoinKinds.flatMap((kind) => names.map((nickname) => ({ nickname, kind })));
              const pulled = await mapPool(jobs, 3, (job) =>
                loadKalshiTraderJoin(job.kind, [job.nickname], marketLimit)
                  .then((result) => ({ ...job, ...result }))
                  .catch(() => ({ ...job, columns: [], rows: [] })),
              );
              for (const item of pulled) {
                rememberTraderMarkets(item.rows);
                if (!item.columns?.length) continue;
                const info = kindInfo(item.kind);
                const safe = String(item.nickname).replace(/[^A-Za-z0-9]+/g, "-");
                const fullRows = item.rows || [];
                stageSheet({
                  id: `run-trader-${item.kind}-${safe}`,
                  title: kalshiTraderJoinSheetTitle(item.kind, item.nickname),
                  columns: item.columns,
                  rows: fullRows,
                  rowCount: fullRows.length,
                  span: pulled.length > 1 ? "half" : "full",
                  table: info.table,
                  pull: item.pull,
                  summary: `Kalshi Live · ${info.title} · ${item.nickname}`,
                });
              }
            }
            reporter.succeed("join-traders", {
              result: `${names.length.toLocaleString()} ${names.length === 1 ? "trader" : "traders"}`,
            });
          }
        } catch (err) {
          reporter.fail("join-traders", err instanceof Error ? err.message : "Trader join failed");
          return;
        }
      }
      if (liveTrader && downstreamJoinMarkets.length) {
        downstreamJoinMarkets = await mapPool(downstreamJoinMarkets, 4, async (market) => {
          const row = await loadKalshiLiveMarketByTicker(market.ticker).catch(() => null);
          return row ? kalshiJoinMarket(row) : market;
        });
      }
    } else if (polymarketLive && polymarketMarketFanout(tableId) && livePicks.length > 1 && keepParentDataset && shownColumns.length) {
      const matchColumns = polymarketLeaderboardColumns.length
        ? polymarketLeaderboardColumns
        : polymarketQuoteColumns.length
          ? polymarketQuoteColumns
          : pull?.columns || [];
      const requested = Number(rowLimit);
      const limit = Number.isFinite(sheetCap) ? sheetCap : PREVIEW_ROW_CAP;
      for (const pick of livePicks) {
        const matched = polymarketRowsForMarket(marketRows, pick, livePicks).filter((row) =>
          rowMatchesAttributes(row, matchColumns, attributeFilters),
        );
        const sorted = sortAttributeRows(matched, matchColumns, sortKeys);
        const fullRows =
          Number.isFinite(requested) && requested > 0 ? sorted.slice(0, Math.min(requested, limit)) : sorted.slice(0, limit);
        if (!fullRows.length) return;
        const label = pick.label || pick.title || "Market";
        const safe = String(pick.id || label).replace(/[^A-Za-z0-9]+/g, "-");
        const built = applyFunctionColumns(
          shownColumns,
          fullRows,
          functionsForSheet("markets"),
          formulaSheets,
          "markets",
          activeFunction?.id,
        );
        await stageSheet({
          id: `run-polymarket-${tableId}-${safe}`,
          title: activitySheetTitle(pick, fullRows) || `${sheetTitle} · ${label}`,
          columns: built.columns.length ? built.columns : shownColumns,
          rows: built.rows,
          rowCount: fullRows.length,
          span: "half",
          table: tableId,
          pull: { table: tableId, ticker: pick.slug || pick.entityId || "", tokens: pick.tokenIds || [], ...lifePull(pick) },
          summary: `Polymarket Live · ${sheetTitle} · ${label}`,
        });
      }
    } else if (pairStreamOn) {
      for (const symbol of streamPairs) {
        const streamed = pairStreams[symbol]?.rows || [];
        const rows = Number.isFinite(sheetCap) && streamed.length > sheetCap ? streamed.slice(streamed.length - sheetCap) : streamed;
        await stageSheet({
          id: `run-${integrationId}-${tableId}-${symbol.replace(/[^A-Za-z0-9]+/g, "-")}`,
          title: pairSheetTitle(symbol),
          columns: shownColumns,
          rows,
          rowCount: rows.length,
          keepAllRows: true,
          span: streamPairs.length > 1 ? "half" : "full",
          table: tableId,
          pull: { table: tableId, symbol, mode: "stream" },
          summary: `${streamProvider} · ${streamFeed?.label || tableId} · ${streamPairTitle(symbol)}`,
        });
      }
    } else if (runMarkets.columns.length && keepParentDataset) {
      await stageSheet({
        id: tableId === "trades" ? "run-trades" : tableId && tableId !== "markets" ? `run-${tableId}` : "run-markets",
        title: activitySheetTitle(livePicks[0], runMarkets.rows) || sheetTitle,
        columns: runMarkets.columns,
        rows: runMarkets.rows,
        span: "full",
        table: tableId || "markets",
        pull: livePicks.length === 1 ? { table: tableId || "markets", ticker: livePicks[0].ticker || livePicks[0].slug || "", tokens: livePicks[0].tokenIds || [], ...lifePull(livePicks[0]) } : undefined,
        summary: lockedQuery?.label || describeSearch(),
        composeRequest: marketsRequest,
        keepAllRows: true,
        attributeLines: (liveMarketSearch ? liveAttributeColumns : pull?.columns || []).flatMap((column) => {
          const summary = attributeSummary(column, attributeFilters);
          return summary ? [`${column.title} ${summary}`] : [];
        }),
        sortLine: sortSummary(liveMarketSearch ? liveAttributeColumns : pull?.columns || [], sortKeys),
      });
    }
    if (!liveDirect && sampling) {
      const sampledGrid = applyFunctionColumns(
        primaryColumns,
        sampledRows || [],
        functionsForSheet("markets"),
        formulaSheets,
        "markets",
        activeFunction?.id,
      );
      pushSampleSheet({
        id: "run-sample",
        title: "Random sample",
        columns: sampledGrid.columns.length ? sampledGrid.columns : runMarkets.columns,
        rows: sampledGrid.rows,
        parentSheetId: tableId === "trades" ? "run-trades" : "run-markets",
        parentQuery: historicalLake && parentRequest ? parentRequest : browserParentQuery(),
        composeRequest: historicalLake ? sampledRequest : null,
        table: tableId || "markets",
      });
    }
    if (metadataSheet?.columns?.length) stageSheet(metadataSheet);
    const fanoutRunMarkets =
      liveMarketFanout && enrichPicks.has("join")
        ? directMarkets.length
          ? directMarkets
          : fanoutTicker
            ? [{ ticker: fanoutTicker, label: fanoutTicker, title: fanoutTicker }]
            : []
        : [];
    if (fanoutRunMarkets.length && (fanoutParents.has("market") || fanoutParents.has("series") || fanoutSeriesMarkets)) {
      reporter.start("join-parent");
      try {
        const contexts = await mapPool(fanoutRunMarkets, 3, (market) =>
          loadKalshiLiveParentContext(market.ticker, { series: fanoutParents.has("series") || fanoutSeriesMarkets }).then((result) => ({
            market,
            ...result,
          })),
        );
        if (fanoutParents.has("market")) {
          contexts.forEach((item) => {
            if (!item.market) return;
            const slug = String(item.market.ticker || item.ticker).replace(/[^A-Za-z0-9]+/g, "-");
            stageSheet({
              id: `run-parent-market-${slug}`,
              title: `Market · ${item.market.ticker || item.ticker}`,
              columns: item.marketColumns || [],
              rows: [item.market],
              rowCount: 1,
              span: "half",
              table: "markets",
              summary: `Kalshi Live · Market · ${item.market.ticker || item.ticker}`,
            });
          });
        }
        if (fanoutParents.has("series")) {
          const seen = new Set();
          contexts.forEach((item) => {
            const seriesTicker = String(item.seriesTicker || "").trim();
            if (!seriesTicker || seen.has(seriesTicker) || !item.series) return;
            seen.add(seriesTicker);
            stageSheet({
              id: `run-parent-series-${seriesTicker.replace(/[^A-Za-z0-9]+/g, "-")}`,
              title: `Series · ${seriesTicker}`,
              columns: item.seriesColumns || [],
              rows: [item.series],
              rowCount: 1,
              span: "half",
              table: "series",
              summary: `Kalshi Live · Series · ${seriesTicker}`,
            });
          });
        }
        if (fanoutSeriesMarkets) {
          const seriesTickers = [...new Set(contexts.map((item) => String(item.seriesTicker || "").trim()).filter(Boolean))];
          for (const seriesTicker of seriesTickers) {
            const result = await loadKalshiLiveSeriesMarkets(seriesTicker, Number.isFinite(sheetCap) ? sheetCap : PREVIEW_ROW_CAP);
            const fullRows = result.rows || [];
            if (result.columns?.length) {
              const id = `run-fanout-markets-${seriesTicker.replace(/[^A-Za-z0-9]+/g, "-")}`;
              if (fullRows.length > PREVIEW_ROW_CAP) {
                rememberTradeSheet(id, seriesTicker, result.columns, displayMatrix(result.columns, fullRows), sheetCap, accountId);
              }
              stageSheet({
                id,
                title: `Markets · ${seriesTicker}`,
                columns: result.columns,
                rows: fullRows,
                rowCount: fullRows.length,
                span: "full",
                table: "markets",
                pull: { table: "markets", seriesTicker },
                summary: `Kalshi Live · Markets · ${seriesTicker}`,
              });
            }
            if (detectedTargets.length && fullRows.length) {
              const scopeMarkets = [];
              for (const row of fullRows) {
                const ticker = String(row?.ticker || "").trim();
                if (!ticker || scopeMarkets.some((item) => item.ticker === ticker)) continue;
                scopeMarkets.push(kalshiJoinMarket(row));
                if (scopeMarkets.length >= marketCap) break;
              }
              const jobs = scopeMarkets.flatMap((market) => detectedTargets.map((target) => ({ market, target })));
              const pulled = await mapPool(jobs, 3, async (job) => {
                const resultJoin = await loadKalshiLiveMarketJoin(
                  job.target.id,
                  job.market.ticker,
                  sheetCap,
                  joinPullWindow(job.target.id, joinWindows[job.target.id], joinMarketFor(job.market)),
                );
                return { ...job, columns: resultJoin.columns || [], rows: resultJoin.rows || [] };
              });
              pulled.forEach((item) => {
                if (!item.columns.length) return;
                const slug = `${item.target.id}-${String(item.market.ticker).replace(/[^A-Za-z0-9]+/g, "-")}`;
                const id = `run-djoin-${slug}`;
                const rows = item.rows || [];
                if (rows.length > PREVIEW_ROW_CAP) {
                  rememberTradeSheet(id, item.market.ticker, item.columns, displayMatrix(item.columns, rows), sheetCap, accountId);
                }
                stageSheet({
                  id,
                  title: `${item.target.title} · ${item.market.label || item.market.ticker}`,
                  columns: item.columns,
                  rows: rows,
                  rowCount: rows.length,
                  span: "half",
                  table: item.target.id,
                  pull: { ticker: item.market.ticker, table: item.target.id, tokens: item.market.pick?.tokenIds || [], ...lifePull(item.market.pick || item.market) },
                  summary: `Kalshi Live · ${item.target.title} · ${item.market.label || item.market.ticker}`,
                });
              });
            }
          }
        }
        reporter.succeed("join-parent", { result: `${fanoutRunMarkets.length.toLocaleString()} ${fanoutRunMarkets.length === 1 ? "market" : "markets"}` });
      } catch (err) {
        reporter.fail("join-parent", err instanceof Error ? err.message : "Parent join failed");
        return;
      }
    }
    const fanoutAssociated = fanoutRunMarkets.length && liveJoinTargets.length ? fanoutRunMarkets : [];
    const joinMarketsForRun = polymarketJoinActive
      ? polymarketJoinFromList && !polymarketSeriesCatalog && !polymarketTraderCatalog
        ? polymarketListJoinMarkets(marketRows, marketCap)
        : polymarketJoinMarkets
      : liveJoinReady
        ? liveJoinMarkets
        : marketDownstream
          ? downstreamJoinMarkets
          : fanoutAssociated;
    const appendHolderTraderSheets = async (holderSheets, options = {}) => {
      const hosts = Array.isArray(holderSheets) ? holderSheets.filter((sheet) => sheet?.rows?.length) : [];
      const chosen = holderTraderChoices.filter((item) => holderTraderJoinIds.has(item.id));
      const people = polymarketTraderEntities(hosts.flatMap((sheet) => sheet.rows || []), marketCap);
      if (!chosen.length || !people.length) return;
      const childLimit = Number.isFinite(sheetCap) && sheetCap > 0 ? sheetCap : PREVIEW_ROW_CAP;
      const mergeTargets = chosen.filter((item) => polymarketJoinPlacement(item, "sheet") === "merge");
      const sheetTargets = chosen.filter((item) => polymarketJoinPlacement(item, "sheet") !== "merge");
      const jobs = chosen.flatMap((target) => people.map((entity) => ({ target, entity })));
      const traderPulled = await mapPool(jobs, 3, async (job) => {
        try {
          const result = await loadPolymarketTraderJoin(job.target.id, job.entity.pick, { rowLimit: childLimit, planLimit: childLimit });
          return { ...job, columns: result.columns || [], rows: result.rows || [] };
        } catch {
          return { ...job, columns: [], rows: [] };
        }
      });
      for (const sheet of hosts) {
        let changed = false;
        for (const target of mergeTargets) {
          const parts = traderPulled.filter((item) => item.target.id === target.id && item.columns.length);
          const columns = parts.find((item) => item.columns.length)?.columns || [];
          const rows = parts.flatMap((item) => item.rows || []);
          if (!columns.length || !rows.length) continue;
          const merged = mergePolymarketJoinRows(sheet.columns, sheet.rows, columns, rows, { anchor: "trader" });
          sheet.columns = merged.columns;
          sheet.rows = merged.rows;
          sheet.rowCount = merged.rows.length;
          changed = true;
        }
        if (changed) await stageSheet(sheet);
      }
      for (const item of traderPulled) {
        if (!sheetTargets.some((target) => target.id === item.target.id) || !item.columns.length) continue;
        const label = item.entity.label || item.entity.ticker;
        const named = polymarketTraderJoinSheetTitle(item.target.id, label);
        const slug = `${item.target.id}-${String(item.entity.id || item.entity.ticker).replace(/[^A-Za-z0-9]+/g, "-")}`;
        const fullRows = item.rows || [];
        await stageSheet({
          id: `run-live-${slug}`,
          title: named || `${item.target.title} · ${label}`,
          columns: item.columns,
          rows: fullRows,
          rowCount: fullRows.length,
          span: "half",
          ...(options.branch ? { branch: options.branch } : {}),
          table: item.target.id,
          pull: { table: item.target.id, address: item.entity.pick?.address, kind: "profile" },
          summary: `Polymarket Live · ${item.target.title} · ${label}`,
        });
      }
    };
    if (!polymarketTraderCatalog && !polymarketEventCatalog && liveJoinTargets.length && (polymarketJoinActive || liveJoinReady || marketDownstream || fanoutAssociated.length)) {
      reporter.start("join-live");
      if (!joinMarketsForRun.length) {
        reporter.succeed("join-live", { result: "0 sheets" });
      } else {
      const jobs = joinMarketsForRun.flatMap((market) => liveJoinTargets.map((target) => ({ market, target })));
      reporter.setChildren(
        "join-live",
        jobs.map((job) => ({
          id: `${job.target.id}:${job.market.ticker}`,
          name: `${job.target.title} · ${job.market.label || job.market.ticker}`,
          status: "pending",
          parallel: true,
        })),
      );
      const holderSheetStart = sheets.length;
      const pulled = await mapPool(jobs, 3, async (job) => {
        const childId = `${job.target.id}:${job.market.ticker}`;
        reporter.patchChild("join-live", childId, { status: "running", result: `Pulling ${job.target.title}` });
        try {
          const result = polymarketJoinActive
            ? await loadPolymarketLiveJoin(job.target.id, job.market.pick, { rowLimit: sheetCap, planLimit: sheetCap })
            : await loadKalshiLiveMarketJoin(
                job.target.id,
                job.market.ticker,
                sheetCap,
                joinPullWindow(job.target.id, joinWindows[job.target.id], joinMarketFor(job.market)),
              );
          const rows = result.rows || [];
          reporter.patchChild("join-live", childId, { status: "success", result: `${rows.length.toLocaleString()} rows` });
          const item = { ...job, columns: result.columns || [], rows };
          if (item.columns.length) {
            const slug = `${item.target.id}-${String(item.market.ticker).replace(/[^A-Za-z0-9]+/g, "-")}`;
            const id = `run-live-${slug}`;
            if (rows.length > PREVIEW_ROW_CAP) {
              rememberTradeSheet(id, item.market.ticker, item.columns, displayMatrix(item.columns, rows), sheetCap, accountId);
            }
            await stageSheet({
              id,
              title: `${item.target.title} · ${item.market.label || item.market.ticker}`,
              columns: item.columns,
              rows,
              rowCount: rows.length,
              span: "half",
              table: item.target.id,
              ...(result.query ? { query: result.query } : {}),
              pull: { ticker: item.market.ticker, table: item.target.id, tokens: item.market.pick?.tokenIds || [], ...lifePull(item.market.pick || item.market) },
              summary: `${polymarketJoinActive ? "Polymarket Live" : "Kalshi Live"} · ${item.target.title} · ${item.market.label || item.market.ticker}`,
            });
          }
          return item;
        } catch (err) {
          reporter.patchChild("join-live", childId, {
            status: "error",
            result: err instanceof Error ? err.message : "Join failed",
          });
          return { ...job, columns: [], rows: [] };
        }
      });
      await appendHolderTraderSheets(
        sheets.slice(holderSheetStart).filter((sheet) => sheet.table === "getHoldersByMarkets"),
      );
      const liveSheets = pulled.filter((item) => item.columns.length).length;
      const liveRows = pulled.reduce((sum, item) => sum + (item.rows?.length || 0), 0);
      reporter.succeed("join-live", {
        result: `${liveSheets.toLocaleString()} ${liveSheets === 1 ? "sheet" : "sheets"} · ${liveRows.toLocaleString()} rows`,
      });
      }
    }
    if (polymarketSeriesCatalog && polymarketJoinActive) {
      const seriesList = polymarketSeriesEntities(marketRows, marketCap);
      const childLimit = Number.isFinite(sheetCap) && sheetCap > 0 ? sheetCap : PREVIEW_ROW_CAP;
      const eventSheetTargets = liveJoinTargets.filter((item) => item.anchor === "event" && polymarketJoinPlacement(item, traderMarketLayout) === "sheet");
      const wantEventsSheet = liveJoinTargets.some((item) => item.id === "getEventsBySeries");
      const volumeOn = liveJoinTargets.some((item) => item.id === "getLiveVolumeForEvent");
      reporter.start("join-live");
      if (!seriesList.length) {
        reporter.succeed("join-live", { result: "0 series" });
      } else {
        let eventSheets = 0;
        let marketSheets = 0;
        let marketBudget = marketCap;
        for (const series of seriesList) {
          let columns = [];
          let rows = [];
          if (wantEventsSheet || volumeOn) {
            try {
              const pulled = await loadPolymarketSeriesEventsJoin(series, { rowLimit: childLimit, planLimit: childLimit });
              columns = pulled.columns || [];
              rows = pulled.rows || [];
            } catch {
              columns = [];
              rows = [];
            }
          }
          if (volumeOn && rows.length) {
            const named = polymarketEventEntities(rows, marketCap);
            const volumes = await mapPool(named, 4, async (event) => {
              try {
                return await loadPolymarketEventVolumeJoin(event.pick);
              } catch {
                return null;
              }
            });
            const volumeRows = [];
            let volumeColumns = [];
            for (const part of volumes) {
              if (!part?.columns?.length || !part.rows?.length) continue;
              if (!volumeColumns.length) volumeColumns = part.columns;
              volumeRows.push(...part.rows);
            }
            if (volumeColumns.length && volumeRows.length) {
              const merged = mergePolymarketJoinRows(columns, rows, volumeColumns, volumeRows, { anchor: "event" });
              columns = merged.columns;
              rows = merged.rows;
            }
          }
          if (columns.length) {
            const label = series.label || series.ticker;
            await stageSheet({
              id: `run-live-getEventsBySeries-${series.id}`,
              title: `Events · ${label}`,
              columns,
              rows,
              rowCount: rows.length,
              span: "full",
              branch: 1,
              table: "getEvents",
              pull: { table: "getEvents", seriesId: series.id, kind: "event" },
              summary: `Polymarket Live · Events · ${label}`,
            });
            eventSheets += 1;
          }
          const seriesRow = (marketRows || []).find((row) => String(row?.["series:id"] || row?.id || "") === series.id);
          const embeddedEvents = polymarketEventsFromSeriesRows(seriesRow ? [seriesRow] : [], marketBudget);
          const namedEvents = embeddedEvents.length ? embeddedEvents : polymarketEventEntities(rows, marketBudget);
          if (!namedEvents.length || (!eventSheetTargets.length && !downstreamSheetTargets.length)) continue;
          marketBudget = Math.max(0, marketBudget - namedEvents.length);
          for (const event of namedEvents) {
            const marketPulls = [];
            if (eventSheetTargets.length) {
              const pulledMarkets = await mapPool(eventSheetTargets, 3, async (target) => {
                try {
                  const result = await loadPolymarketLiveTable(target.id, [event.pick], { rowLimit: childLimit, planLimit: childLimit });
                  return { target, columns: result.columns || [], rows: result.rows || [] };
                } catch {
                  return { target, columns: [], rows: [] };
                }
              });
              for (const item of pulledMarkets) {
                if (!item.columns.length) continue;
                marketPulls.push(item);
                const label = event.label || event.ticker;
                const slug = `${item.target.id}-${String(event.id).replace(/[^A-Za-z0-9]+/g, "-")}`;
                await stageSheet({
                  id: `run-live-${slug}`,
                  title: `Markets · ${label}`,
                  columns: item.columns,
                  rows: item.rows || [],
                  rowCount: (item.rows || []).length,
                  span: "full",
                  branch: 2,
                  table: item.target.id,
                  pull: { table: item.target.id, eventId: event.id, seriesId: series.id },
                  summary: `Polymarket Live · ${item.target.title} · ${label}`,
                });
                marketSheets += 1;
              }
            }
            const marketRowsForEvent = marketPulls
              .filter((item) => item.target.id === "getMarketsByEvents")
              .flatMap((item) => item.rows || []);
            const namedMarkets = polymarketMarketEntities(marketRowsForEvent, marketCap);
            if (!downstreamSheetTargets.length || !namedMarkets.length) continue;
            const downJobs = namedMarkets.flatMap((entity) => downstreamSheetTargets.map((target) => ({ target, entity })));
            const holderSheetStart = sheets.length;
            await mapPool(downJobs, 3, async (job) => {
              try {
                const result = await loadPolymarketLiveJoin(
                  job.target.id,
                  job.target.id === "parent-market" ? job.entity.pick : await ensurePolymarketMarketPick(job.entity.pick),
                  { rowLimit: childLimit, planLimit: childLimit },
                );
                const item = { ...job, columns: result.columns || [], rows: result.rows || [] };
                if (item.columns.length) {
                  const label = item.entity.label || item.entity.ticker;
                  const slug = `${item.target.id}-${String(item.entity.ticker).replace(/[^A-Za-z0-9]+/g, "-")}`;
                  await stageSheet({
                    id: `run-mjoin-${slug}`,
                    title: `${item.target.title} · ${label}`,
                    columns: item.columns,
                    rows: item.rows || [],
                    rowCount: (item.rows || []).length,
                    span: "half",
                    branch: 3,
                    table: item.target.id,
                    ...(result.query ? { query: result.query } : {}),
                    pull: { ticker: item.entity.ticker, table: item.target.id, tokens: item.entity.pick?.tokenIds || [], ...lifePull(item.entity.pick || {}) },
                    summary: `Polymarket Live · ${item.target.title} · ${label}`,
                  });
                }
                return item;
              } catch {
                return { ...job, columns: [], rows: [] };
              }
            });
            await appendHolderTraderSheets(
              sheets.slice(holderSheetStart).filter((sheet) => sheet.table === "getHoldersByMarkets"),
              { branch: 3 },
            );
          }
        }
        reporter.succeed("join-live", {
          result: wantEventsSheet
            ? `${eventSheets.toLocaleString()} event ${eventSheets === 1 ? "sheet" : "sheets"}${marketSheets ? ` · ${marketSheets.toLocaleString()} market ${marketSheets === 1 ? "sheet" : "sheets"}` : ""}`
            : `${marketSheets.toLocaleString()} market ${marketSheets === 1 ? "sheet" : "sheets"}`,
        });
      }
    }
    if (polymarketEventCatalog && polymarketJoinActive) {
      const events = polymarketEventEntities(marketRows, marketCap);
      const sheetTargets = liveJoinTargets.filter((item) => polymarketJoinPlacement(item, traderMarketLayout) === "sheet");
      const childLimit = Number.isFinite(sheetCap) && sheetCap > 0 ? sheetCap : PREVIEW_ROW_CAP;
      reporter.start("join-live");
      const jobs = sheetTargets.flatMap((target) => events.map((entity) => ({ target, entity })));
      if (!jobs.length) {
        reporter.succeed("join-live", { result: "0 sheets" });
      } else {
        const pulled = await mapPool(jobs, 3, async (job) => {
          try {
            const result = await loadPolymarketLiveTable(job.target.id, [job.entity.pick], { rowLimit: childLimit, planLimit: childLimit });
            return { ...job, columns: result.columns || [], rows: result.rows || [] };
          } catch {
            return { ...job, columns: [], rows: [] };
          }
        });
        const pulledByEvent = new Map();
        for (const item of pulled) {
          const id = item.entity?.id;
          if (!id) continue;
          const list = pulledByEvent.get(id) || [];
          list.push(item);
          pulledByEvent.set(id, list);
        }
        let marketBudget = marketCap;
        for (const event of events) {
          const eventPulls = pulledByEvent.get(event.id) || [];
          for (const item of eventPulls) {
            if (!item.columns.length) continue;
            const label = item.entity.label || item.entity.ticker;
            const slug = `${item.target.id}-${String(item.entity.id).replace(/[^A-Za-z0-9]+/g, "-")}`;
            await stageSheet({
              id: `run-live-${slug}`,
              title: `Markets · ${label}`,
              columns: item.columns,
              rows: item.rows || [],
              rowCount: (item.rows || []).length,
              span: "full",
              branch: 1,
              table: item.target.id,
              pull: { table: item.target.id, eventId: item.entity.id },
              summary: `Polymarket Live · ${item.target.title} · ${label}`,
            });
          }
          const marketRowsForEvent = eventPulls
            .filter((item) => item.target.id === "getMarketsByEvents")
            .flatMap((item) => item.rows || []);
          const namedMarkets = polymarketMarketEntities(marketRowsForEvent, marketBudget);
          marketBudget = Math.max(0, marketBudget - namedMarkets.length);
          if (!downstreamSheetTargets.length || !namedMarkets.length) continue;
          const downJobs = namedMarkets.flatMap((entity) => downstreamSheetTargets.map((target) => ({ target, entity })));
          const holderSheetStart = sheets.length;
          await mapPool(downJobs, 3, async (job) => {
            try {
              const result = await loadPolymarketLiveJoin(
                job.target.id,
                job.target.id === "parent-market" ? job.entity.pick : await ensurePolymarketMarketPick(job.entity.pick),
                { rowLimit: childLimit, planLimit: childLimit },
              );
              const item = { ...job, columns: result.columns || [], rows: result.rows || [] };
              if (item.columns.length) {
                const label = item.entity.label || item.entity.ticker;
                const slug = `${item.target.id}-${String(item.entity.ticker).replace(/[^A-Za-z0-9]+/g, "-")}`;
                await stageSheet({
                  id: `run-mjoin-${slug}`,
                  title: `${item.target.title} · ${label}`,
                  columns: item.columns,
                  rows: item.rows || [],
                  rowCount: (item.rows || []).length,
                  span: "half",
                  branch: 2,
                  table: item.target.id,
                  ...(result.query ? { query: result.query } : {}),
                  pull: { ticker: item.entity.ticker, table: item.target.id, tokens: item.entity.pick?.tokenIds || [], ...lifePull(item.entity.pick || {}) },
                  summary: `Polymarket Live · ${item.target.title} · ${label}`,
                });
              }
              return item;
            } catch {
              return { ...job, columns: [], rows: [] };
            }
          });
          await appendHolderTraderSheets(
            sheets.slice(holderSheetStart).filter((sheet) => sheet.table === "getHoldersByMarkets"),
            { branch: 2 },
          );
        }
        reporter.succeed("join-live", {
          result: `${pulled.filter((item) => item.columns.length).length.toLocaleString()} event market sheets`,
        });
      }
    }
    if (polymarketTraderCatalog && polymarketJoinActive) {
      const sheetTargets = liveJoinTargets.filter((item) => polymarketJoinPlacement(item, traderMarketLayout) === "sheet");
      const people = polymarketTraderEntities(marketRows, marketCap);
      const markets = polymarketMarketEntities(marketRows, marketCap);
      const jobs = [
        ...sheetTargets
          .filter((target) => target.anchor === "trader")
          .flatMap((target) => people.map((entity) => ({ target, entity, anchor: "trader" }))),
        ...sheetTargets
          .filter((target) => target.anchor !== "trader")
          .flatMap((target) => markets.map((entity) => ({ target, entity, anchor: "market" }))),
      ];
      reporter.start("join-live");
      if (!jobs.length) {
        reporter.succeed("join-live", { result: "0 sheets" });
      } else {
        reporter.setChildren(
          "join-live",
          jobs.map((job) => ({
            id: `${job.target.id}:${job.entity.id || job.entity.ticker}`,
            name: `${job.target.title} · ${job.entity.label || job.entity.ticker}`,
            status: "pending",
            parallel: true,
          })),
        );
        const pulled = await mapPool(jobs, 3, async (job) => {
          const childId = `${job.target.id}:${job.entity.id || job.entity.ticker}`;
          reporter.patchChild("join-live", childId, { status: "running", result: `Pulling ${job.target.title}` });
          try {
            const childLimit = Number.isFinite(sheetCap) && sheetCap > 0 ? sheetCap : PREVIEW_ROW_CAP;
            const result = job.anchor === "trader"
              ? await loadPolymarketTraderJoin(job.target.id, job.entity.pick, { rowLimit: childLimit, planLimit: childLimit })
              : await loadPolymarketLiveJoin(
                  job.target.id,
                  job.target.id === "parent-market" ? job.entity.pick : await ensurePolymarketMarketPick(job.entity.pick),
                  { rowLimit: childLimit, planLimit: childLimit },
                );
            const rows = result.rows || [];
            reporter.patchChild("join-live", childId, { status: "success", result: `${rows.length.toLocaleString()} rows` });
            const item = { ...job, columns: result.columns || [], rows };
            if (item.columns.length) {
              const label = item.entity.label || item.entity.ticker;
              const named = item.anchor === "trader" ? polymarketTraderJoinSheetTitle(item.target.id, label) : "";
              const slug = `${item.target.id}-${String(item.entity.id || item.entity.ticker).replace(/[^A-Za-z0-9]+/g, "-")}`;
              const id = `run-live-${slug}`;
              if (rows.length > PREVIEW_ROW_CAP) {
                rememberTradeSheet(id, label, item.columns, displayMatrix(item.columns, rows), sheetCap, accountId);
              }
              const marketPick = item.entity.pick || {};
              await stageSheet({
                id,
                title: named || `${item.target.title} · ${label}`,
                columns: item.columns,
                rows,
                rowCount: rows.length,
                span: "half",
                table: item.target.id,
                ...(result.query ? { query: result.query } : {}),
                pull: item.anchor === "trader"
                  ? { table: item.target.id, address: marketPick.address, kind: "profile" }
                  : { ticker: item.entity.ticker, table: item.target.id, tokens: marketPick.tokenIds || [], ...lifePull(marketPick) },
                summary: `Polymarket Live · ${item.target.title} · ${label}`,
              });
            }
            return item;
          } catch (err) {
            reporter.patchChild("join-live", childId, {
              status: "error",
              result: err instanceof Error ? err.message : "Join failed",
            });
            return { ...job, columns: [], rows: [] };
          }
        });
        if (downstreamFromPositions && (downstreamSheetTargets.length || downstreamMergeOn)) {
          const bearingRows = pulled
            .filter((item) => polymarketMarketBearingJoin(item.target.id))
            .flatMap((item) => item.rows || []);
          const namedMarkets = polymarketMarketEntities(bearingRows, marketCap);
          const childLimit = Number.isFinite(sheetCap) && sheetCap > 0 ? sheetCap : PREVIEW_ROW_CAP;
          if (downstreamMergeOn && namedMarkets.length) {
            let metaColumns = [];
            const metaRows = [];
            const metaPulled = await mapPool(namedMarkets, 3, async (market) => {
              try {
                const result = await loadPolymarketLiveJoin("parent-market", market.pick, { rowLimit: 1 });
                const row = result.rows?.[0];
                if (!row) return null;
                return {
                  columns: result.columns || [],
                  row: {
                    ...row,
                    condition_id: row.condition_id || market.pick.conditionId,
                    conditionId: row.conditionId || market.pick.conditionId,
                    slug: row.slug || market.pick.slug,
                  },
                };
              } catch {
                return null;
              }
            });
            for (const item of metaPulled) {
              if (!item) continue;
              if (!metaColumns.length && item.columns.length) metaColumns = item.columns;
              metaRows.push(item.row);
            }
            if (metaColumns.length && metaRows.length) {
              for (const sheet of sheets) {
                if (!polymarketMarketBearingJoin(sheet.table)) continue;
                const merged = mergePolymarketJoinRows(sheet.columns, sheet.rows, metaColumns, metaRows, { anchor: "market" });
                sheet.columns = merged.columns;
                sheet.rows = merged.rows;
                sheet.rowCount = merged.rows.length;
                await stageSheet(sheet);
              }
            }
          }
          if (downstreamSheetTargets.length && namedMarkets.length) {
            const downJobs = namedMarkets.flatMap((entity) => downstreamSheetTargets.map((target) => ({ target, entity })));
            const holderSheetStart = sheets.length;
            const downPulled = await mapPool(downJobs, 3, async (job) => {
              try {
                const result = await loadPolymarketLiveJoin(
                  job.target.id,
                  job.target.id === "parent-market" ? job.entity.pick : await ensurePolymarketMarketPick(job.entity.pick),
                  { rowLimit: childLimit, planLimit: childLimit },
                );
                const item = { ...job, columns: result.columns || [], rows: result.rows || [] };
                if (item.columns.length) {
                  const label = item.entity.label || item.entity.ticker;
                  const slug = `${item.target.id}-${String(item.entity.ticker).replace(/[^A-Za-z0-9]+/g, "-")}`;
                  const id = `run-mjoin-${slug}`;
                  const fullRows = item.rows || [];
                  if (fullRows.length > PREVIEW_ROW_CAP) {
                    rememberTradeSheet(id, label, item.columns, displayMatrix(item.columns, fullRows), sheetCap, accountId);
                  }
                  const marketPick = item.entity.pick || {};
                  await stageSheet({
                    id,
                    title: `${item.target.title} · ${label}`,
                    columns: item.columns,
                    rows: fullRows,
                    rowCount: fullRows.length,
                    span: "half",
                    table: item.target.id,
                    ...(result.query ? { query: result.query } : {}),
                    pull: {
                      ticker: item.entity.ticker,
                      table: item.target.id,
                      tokens: marketPick.tokenIds || [],
                      ...lifePull(marketPick),
                    },
                    summary: `Polymarket Live · ${item.target.title} · ${label}`,
                  });
                }
                return item;
              } catch {
                return { ...job, columns: [], rows: [] };
              }
            });
            await appendHolderTraderSheets(
              sheets.slice(holderSheetStart).filter((sheet) => sheet.table === "getHoldersByMarkets"),
            );
            pulled.push(...downPulled);
          }
        }
        const liveSheets = pulled.filter((item) => item.columns.length).length;
        const liveRows = pulled.reduce((sum, item) => sum + (item.rows?.length || 0), 0);
        reporter.succeed("join-live", {
          result: `${liveSheets.toLocaleString()} ${liveSheets === 1 ? "sheet" : "sheets"} · ${liveRows.toLocaleString()} rows`,
        });
      }
    }
    const bucketBuilt = [];
    if (enrichPicks.has("bucket")) {
      reporter.start("buckets");
      bucketItems.forEach((item, index) => {
        const built = buildBucketGrid({
          columns: runMarkets.columns,
          rows: runMarkets.rows,
          bucketColumnId: item.columnId,
          mode: item.mode,
          timeInterval: item.interval,
          numericBucketSize: item.numericSize,
          groupByIds: item.groupBy,
          metric: item.metric,
          valueColumnId: item.valueColumnId,
        });
        if (!built.ready) return;
        const title = bucketSheetTitle(item, runMarkets.columns, index, bucketItems.length);
        bucketBuilt.push({ id: item.id, title, built });
        stageSheet({
          id: `run-buckets-${item.id}`,
          title,
          columns: built.columns,
          rows: built.rows,
          span: sheets.length ? "half" : "full",
          table: "buckets",
          summary: title,
          enrichment: { operation: "bucket", detail: { column: title } },
        });
      });
      reporter.succeed("buckets", {
        result: bucketBuilt.length
          ? `${bucketBuilt.length.toLocaleString()} bucket ${bucketBuilt.length === 1 ? "sheet" : "sheets"} from ${runMarkets.rows.length.toLocaleString()} rows`
          : "No buckets to build",
      });
    }
    const runColumns = functionsForSheet("new").map((item) => ({
      item,
      built: applyFunctionColumns(primaryColumns, primaryRows, [item], formulaSheets, "new", item.id),
    }));
    if (enrichPicks.has("summarize")) {
      reporter.start("summary");
      const runFormulaSheets = formulaSheets
        .filter((sheet) => sheet.id !== "buckets" && sheet.id !== "new" && sheet.id !== "market-metadata")
        .map((sheet) =>
          sheet.id === "markets" ? { ...sheet, title: sheetTitle, columns: runMarkets.columns, rows: runMarkets.rows } : sheet,
        );
      bucketBuilt.forEach((entry) => {
        runFormulaSheets.push({ id: entry.id, title: entry.title, columns: entry.built.columns, rows: entry.built.rows });
      });
      runColumns.forEach((entry) => {
        if (entry.built.columns.length) {
          runFormulaSheets.push({ id: entry.item.id, title: entry.item.columnTitle, columns: entry.built.columns, rows: entry.built.rows });
        }
      });
      if (metadataSheet?.columns?.length) {
        runFormulaSheets.push({
          id: "market-metadata",
          title: "Markets",
          columns: metadataSheet.columns,
          rows: metadataSheet.rows,
        });
      }
      const built = buildSummaryGrid({
        cells: summaryCells,
        columns: runMarkets.columns,
        rows: runMarkets.rows,
        sheets: runFormulaSheets,
        focus: summaryFocus,
      });
      stageSheet({
        id: "run-summary",
        title: "Summary",
        columns: built.columns,
        rows: built.rows,
        span: sheets.length ? "half" : "full",
        table: "summary",
        summary: "Summary",
        enrichment: { operation: "summary" },
      });
      reporter.succeed("summary", { result: `Summary over ${runMarkets.rows.length.toLocaleString()} rows` });
    }
    if (joinCommitted && tradePreview.columns.length) {
      reporter.start("join-trades");
      const fromRun = joinMarketsFromRows(marketRows, marketCap);
      const list = fromRun.length ? fromRun : joinedMarkets.slice(0, marketCap);
      runTickers = list.map((market) => market.ticker);
      const tradeTable = `${lakeId}.trades`;
      reporter.setChildren(
        "join-trades",
        list.map((market) => ({
          id: market.ticker,
          name: market.label || market.ticker,
          status: "pending",
          parallel: true,
          args: { table: tradeTable, limit: sheetCap },
        })),
      );
      reporter.note("join-trades", `Composing ${list.length.toLocaleString()} ${tradeTable} ${list.length === 1 ? "sheet" : "sheets"}`);
      const stageTrades = (item) => {
        const own = item.ticker === previewTicker;
        const tradeFunctions = functionsForSheet("trades", own);
        const shaped = tradeFunctions.length
          ? applyFunctionColumns(item.columns, item.rows, tradeFunctions, formulaSheets, "trades", activeFunction?.id)
          : { columns: item.columns, rows: item.rows };
        if (!shaped.columns.length) return;
        const id = `run-trades-${String(item.ticker).replace(/[^A-Za-z0-9]+/g, "-")}`;
        const fullRows = shaped.rows || [];
        const pull = { lake: lakeId, table: "trades", ticker: item.ticker, tokens: item.tokens, limit: sheetCap };
        if (fullRows.length > 50) {
          rememberTradeSheet(id, item.ticker, shaped.columns, displayMatrix(shaped.columns, fullRows), sheetCap, accountId);
        }
        stageSheet({
          id,
          title: `Trades · ${item.label || item.ticker}`,
          columns: shaped.columns,
          rows: fullRows,
          rowCount: fullRows.length,
          pull,
          span: "half",
          table: "trades",
          summary: `${venueLabel} · trades · ${item.label || item.ticker}`,
          composeRequest: item.request,
        });
      };
      const pulled = await mapPool(list, 4, async (market) => {
        const childName = market.label || market.ticker;
        reporter.patchChild("join-trades", market.ticker, { status: "running", result: `Composing ${tradeTable}` });
        let item;
        try {
          const onPhase = (info) =>
            reporter.patchChild("join-trades", market.ticker, {
              status: "running",
              result: describeComposePhase(info, { table: `${tradeTable} · ${childName}`, limit: sheetCap }),
            });
          const result = await join.loadTrades(market, sheetCap, { onPhase });
          const rows = result.rows || [];
          reporter.patchChild("join-trades", market.ticker, {
            status: "success",
            result: `${rows.length.toLocaleString()} rows`,
          });
          item = { ...market, columns: result.columns?.length ? result.columns : tradePreview.columns, rows, request: result.request };
        } catch (err) {
          reporter.patchChild("join-trades", market.ticker, {
            status: "error",
            result: err instanceof Error ? err.message : "Trades compose failed",
          });
          item = { ...market, columns: tradePreview.columns, rows: [] };
        }
        stageTrades(item);
        return item;
      });
      const tradeSheets = sheets.filter((sheet) => sheet.table === "trades").length;
      const tradeRows = pulled.reduce((sum, item) => sum + (item.rows?.length || 0), 0);
      reporter.succeed("join-trades", {
        result: `${tradeSheets.toLocaleString()} trade ${tradeSheets === 1 ? "sheet" : "sheets"} · ${tradeRows.toLocaleString()} rows from ${tradeTable}`,
      });
    } else if (joinCommitted) {
      reporter.succeed("join-trades", { result: "No trade preview to compose" });
    }
    if (enrichPicks.has("function")) reporter.start("functions");
    runColumns.forEach((entry) => {
      if (!entry.built.columns.length) return;
      stageSheet({
        id: `run-column-${entry.item.id}`,
        title: entry.item.columnTitle,
        columns: entry.built.columns,
        rows: entry.built.rows,
        span: sheets.some((sheet) => sheet.span !== "full") || sheets.length ? "half" : "full",
        table: tableId || "markets",
        summary: entry.item.formula.trim() ? `Function · ${entry.item.formula.trim()}` : "Function column",
        enrichment: { operation: "function", detail: entry.item.formula.trim() ? { formula: entry.item.formula.trim() } : {} },
      });
    });
    if (enrichPicks.has("function")) {
      reporter.succeed("functions", {
        result: runColumns.length
          ? `${runColumns.length.toLocaleString()} column ${runColumns.length === 1 ? "equation" : "equations"} on ${runMarkets.rows.length.toLocaleString()} rows`
          : "No function columns to add",
      });
    }
    if (!sheets.length) {
      reporter.fail("place", "Nothing to place on this tab");
      return;
    }

    reporter.start("place");
    await stage.settle();
    const placement = placementRef.current;
    const placedSheets = stampRunSheets(
      attachJoinRegistry(sheets.map((sheet) => {
        const rows = Array.isArray(sheet?.rows) ? sheet.rows : [];
        const rowCount = Math.max(rows.length, Math.floor(Number(sheet?.rowCount) || 0));
        const typed = Number(rowLimit);
        const parentLimit = Number.isFinite(typed) && typed > 0 ? Math.min(typed, sheetCap) : sheetCap;
        const pullAddress = String(sheet.pull?.address || sheet.query?.address || "").trim();
        const child = Boolean(pullAddress) || Boolean(sheet.pull && sheet.table && sheet.table !== tableId);
        const asked = Number(sheet.query?.rowLimit);
        const query = sheet.enrichment
          ? sheet.query
          : {
              ...(sheet.query && typeof sheet.query === "object" ? sheet.query : {}),
              rowLimit: Number.isFinite(asked) && asked > 0 ? asked : child ? sheetCap : parentLimit,
              ...(!child ? { filters: sheet.query?.filters || attributeFilters, sortKeys: sheet.query?.sortKeys || sortKeys } : {}),
              ...(pullAddress ? { address: pullAddress } : {}),
            };
        return { ...sheet, rows, rowCount, keepAllRows: true, ...(query ? { query } : {}) };
      }), tableId),
      { integrationId },
    );
    canvas?.revealRunSheets?.(placedSheets, {
      pageId: placement.pageId || undefined,
      append: placement.append !== false,
      rewriteId: claimRunSheetId,
    });
    const joinRecord = joinCommitted
      ? {
          target: joinTradesTarget,
          tickers: runTickers,
          previewTicker,
        }
      : tradesJoinReady
        ? {
            target: joinMarketsTarget,
            placement: joinPlacement,
            columns: selectedMarketColumns.map((column) => column.id),
            tickers: joinedTickers,
          }
        : null;
    canvas?.registerTables?.(
      placedSheets.map((sheet) => {
        const athena =
          sheet.composeRequest ||
          (sheet.enrichment?.operation === "sample" ? null : !sheet.pull ? lockedQuery?.athena || athenaRequest() : null);
        return {
          id: sheet.id,
          title: sheet.title,
          kind: "query",
          columns: (sheet.columns || []).map((column) => ({
            id: column.id,
            title: column.title,
            type: column.type,
            ...(column.scale ? { scale: column.scale } : {}),
          })),
          rows: sheet.rows || [],
          rowCount: sheet.rowCount || (sheet.rows || []).length,
          query: {
            summary: sheet.summary,
            integrationId,
            tableId: sheet.pull ? "trades" : sheet.table,
            formula: functionActive ? functionFormula : "",
            join: joinRecord,
            ...(sheet.pull ? { pull: sheet.pull } : {}),
            ...(athena ? { athena } : {}),
            ...(sheet.provenance ? { provenance: sheet.provenance } : {}),
          },
        };
      }),
    );
    const historyId = `run-${Date.now().toString(36)}`;
    const pullEntry = {
      id: historyId,
      savedAt: Date.now(),
      label: lockedQuery?.label || describeSearch(),
      fingerprint: lockedQuery?.fingerprint || "",
      integrationId,
      tableId,
      sheets: placedSheets.map((sheet) => ({
        id: sheet.id,
        title: sheet.title,
        table: sheet.table,
        rowCount: sheet.rowCount || sheet.rows.length,
        summary: sheet.summary,
      })),
      athena: lockedQuery?.athena || athenaRequest(),
      join: joinRecord,
      formula: functionActive ? functionFormula : "",
      rowLimit: String(rowLimit || ""),
      attributeFilters,
      sortKeys,
      summaryCells: enrichPicks.has("summarize") ? summaryCells : null,
      bucket: enrichPicks.has("bucket") ? bucketItems : null,
      functions: enrichPicks.has("function") ? functionItems : null,
      randomSample: sampleConfig,
      savedParent: keepParentDataset,
      parentQuery: sampling ? (historicalLake && parentRequest ? parentRequest : browserParentQuery()) : null,
    };
    const nextPulls = rememberEntry(pulls, pullEntry, 80, false);
    if (accountId) writeUserQueryCache(accountId, { saved, pulls: nextPulls });
    setPulls(nextPulls);
    if (accountId) saveWorkspaceQuery("pull", pullEntry);
    ctx?.setDataSheets?.((prev) => {
      const next = { ...(prev || {}) };
      for (const sheet of placedSheets) {
        const card = requestCardForSheet(sheet, historyId);
        const lakeBacked = sheet.provenance?.kind === "compose";
        next[sheet.id] = {
          name: sheet.title,
          data: sheetRecords(sheet.columns, sheet.rows),
          storageMode: lakeBacked ? "provenance" : "inline",
          previewRowCount: (sheet.rows || []).length,
          rowCount: sheet.rowCount || (sheet.rows || []).length,
          fullRowCount: sheet.rowCount || (sheet.rows || []).length,
          rehydrationStatus: lakeBacked ? "pending" : "complete",
          provenance: sheet.provenance,
          requestCards: card ? [card] : [],
        };
      }
      return next;
    });
    reporter.succeed("place", {
      result: placement.pageId
        ? `${placedSheets.length.toLocaleString()} ${placedSheets.length === 1 ? "sheet" : "sheets"} on a new tab`
        : placement.append
          ? `${placedSheets.length.toLocaleString()} ${placedSheets.length === 1 ? "sheet" : "sheets"} added on this tab`
          : `${placedSheets.length.toLocaleString()} ${placedSheets.length === 1 ? "sheet" : "sheets"} on this tab`,
    });
    reporter.finish();
    } catch (err) {
      reporter.fail(null, err instanceof Error ? err.message : "The pull failed");
    } finally {
      runLockRef.current = false;
      setRunning(false);
    }
  }

  function toggleFanoutParent(id) {
    setHoverJoin(false);
    const next = new Set(fanoutParents);
    const turningOn = !next.has(id);
    if (turningOn) next.add(id);
    else next.delete(id);
    setFanoutParents(next);
    if (!next.has("series")) setFanoutSeriesMarkets(false);
    if (turningOn) setPreviewSheet(id === "series" ? "parent-series" : "parent-market");
    else if ((id === "market" && previewSheet === "parent-market") || (id === "series" && (previewSheet === "parent-series" || previewSheet === "fanout-markets" || previewSheet.startsWith("djoin:")))) {
      setPreviewSheet("source");
    }
  }

  function toggleFanoutSeriesMarkets() {
    setHoverJoin(false);
    setFanoutSeriesMarkets((on) => {
      const next = !on;
      if (next) setPreviewSheet("fanout-markets");
      else if (previewSheet === "fanout-markets" || previewSheet.startsWith("djoin:")) setPreviewSheet("parent-series");
      return next;
    });
  }

  function toggleDetectedJoin(id) {
    setHoverJoin(false);
    setDetectedJoinIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      if (next.has(id)) setPreviewSheet(`djoin:${id}`);
      else if (previewSheet === `djoin:${id}`) setPreviewSheet("fanout-markets");
      return next;
    });
  }

  function toggleLiveJoin(id) {
    setHoverJoin(false);
    const catalog = polymarketJoinCatalog.length ? polymarketJoinCatalog : KALSHI_LIVE_MARKET_JOINS;
    const placementOf = (joinId) => polymarketJoinPlacement(catalog.find((item) => item.id === joinId), traderMarketLayout);
    const next = new Set(liveJoinIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setLiveJoinIds(next);
    if (![...next].some((item) => polymarketMarketBearingJoin(item) || item === "getMarketsByEvents")) {
      setDownstreamJoinIds(new Set());
      setDownstreamJoinPreview({});
    }
    if (!next.has("getHoldersByMarkets") && !downstreamJoinIds.has("getHoldersByMarkets")) {
      setHolderTraderJoinIds(new Set());
    }
    if (next.has(id)) setPreviewSheet(placementOf(id) === "merge" ? "source" : `live:${id}`);
    else if (previewSheet === `live:${id}` || previewSheet.startsWith("mjoin:")) {
      const rest = catalog.map((item) => item.id).filter((item) => next.has(item) && placementOf(item) !== "merge");
      setPreviewSheet(rest[0] ? `live:${rest[0]}` : "source");
    }
  }

  function toggleDownstreamJoin(id) {
    setHoverJoin(false);
    const spec = downstreamMarketChoices.find((item) => item.id === id);
    const placement = polymarketJoinPlacement(spec, traderMarketLayout);
    const next = new Set(downstreamJoinIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setDownstreamJoinIds(next);
    if (!next.has("getHoldersByMarkets") && !liveJoinIds.has("getHoldersByMarkets")) {
      setHolderTraderJoinIds(new Set());
    }
    if (next.has(id) && placement !== "merge") setPreviewSheet(`mjoin:${id}`);
    else if (next.has(id) && downstreamBearingId) setPreviewSheet(`live:${downstreamBearingId}`);
    else if (previewSheet === `mjoin:${id}`) {
      const rest = [...next].filter((item) => polymarketJoinPlacement(downstreamMarketChoices.find((choice) => choice.id === item), traderMarketLayout) !== "merge");
      setPreviewSheet(rest[0] ? `mjoin:${rest[0]}` : downstreamBearingId ? `live:${downstreamBearingId}` : "source");
    }
  }

  function selectAllDownstream() {
    setHoverJoin(false);
    const allOn = downstreamMarketChoices.length > 0 && downstreamMarketChoices.every((item) => downstreamJoinIds.has(item.id));
    if (allOn) {
      setDownstreamJoinIds(new Set());
      if (!liveJoinIds.has("getHoldersByMarkets")) setHolderTraderJoinIds(new Set());
      if (previewSheet.startsWith("mjoin:")) setPreviewSheet(downstreamBearingId ? `live:${downstreamBearingId}` : "source");
      return;
    }
    setDownstreamJoinIds(new Set(downstreamMarketChoices.map((item) => item.id)));
    const firstSheet = downstreamMarketChoices.find((item) => polymarketJoinPlacement(item, traderMarketLayout) !== "merge");
    if (firstSheet) setPreviewSheet(`mjoin:${firstSheet.id}`);
  }

  function toggleHolderTrader(id) {
    setHoverJoin(false);
    setHolderTraderJoinIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllLiveJoins() {
    setHoverJoin(false);
    const catalog = polymarketJoinCatalog.length ? polymarketJoinCatalog : KALSHI_LIVE_MARKET_JOINS;
    const allOn = catalog.length > 0 && catalog.every((item) => liveJoinIds.has(item.id));
    if (allOn) {
      setLiveJoinIds(new Set());
      setDownstreamJoinIds(new Set());
      setDownstreamJoinPreview({});
      setHolderTraderJoinIds(new Set());
      setPreviewSheet("source");
      return;
    }
    setLiveJoinIds(new Set(catalog.map((item) => item.id)));
    setPreviewSheet((current) => {
      const value = String(current);
      if (value.startsWith("live:") && value !== "live:more" && !value.startsWith("live:locked:")) return current;
      return catalog[0] ? `live:${catalog[0].id}` : "source";
    });
  }

  function dropEnrich(id) {
    setEnrichPicks((current) => {
      if (!current.has(id)) return current;
      const next = new Set(current);
      next.delete(id);
      return next;
    });
    setPreviewSheet((current) => {
      if (id === "summarize" && current === "summary") return "source";
      if (id === "sample" && current === "sample") return "source";
      if (id === "bucket" && current.startsWith("bucket:")) return "source";
      if (id === "function" && current.startsWith("column:")) return "source";
      if (id === "join" && (current.startsWith("series-market") || (current !== "summary" && !current.startsWith("bucket:") && !current.startsWith("column:")))) return "source";
      return current;
    });
    if (id === "summarize") setFormulaOwner((owner) => (owner === "summary" ? "" : owner));
    if (id === "function") setFormulaOwner((owner) => (owner === "function" ? "" : owner));
  }

  function showPreview(id) {
    setPreviewSheet(id);
    if (id === "summary") {
      setFormulaOwner("summary");
      setSummaryTab("summary");
    }
    if (id.startsWith("bucket:")) setActiveBucketId(id.slice("bucket:".length));
    if (id.startsWith("column:")) {
      setActiveFunctionId(id.slice("column:".length));
      setFormulaOwner("function");
    }
    if (id === "sample") return;
    if (id === "source") {
      setJoinTab("markets");
      if (tradesQuery && joinPlacement === "sheet") setMetadataTab("trades");
    } else if (id === "markets-meta") setMetadataTab("markets");
    else if (!id.startsWith("bucket:") && !id.startsWith("column:") && !id.startsWith("polymarket:") && !id.startsWith("stream:") && id !== "summary") setJoinTab(id);
    setFunctionScrollKey((key) => key + 1);
  }

  const previewTabs = [
    {
      id: "source",
      title:
        pairStreamOn && streamPairs[0]
          ? pairSheetTitle(streamPairs[0])
          : liveMarketFanout && directMarkets[0]
          ? `${sheetTitle} · ${directMarkets[0].ticker}`
          : liveEventCandles && directPreview.candleMarkets?.[0]
            ? `Candlesticks · ${directPreview.candleMarkets[0]}`
          : polymarketFanoutOn && livePicks[0]
            ? activitySheetTitle(livePicks[0], polymarketDirected.rows) || `${sheetTitle} · ${livePicks[0].label || livePicks[0].title || "Market"}`
            : activitySheetTitle(livePicks[0], polymarketDirected.rows) || sheetTitle,
    },
  ];
  if (pairStreamOn) {
    streamPairs.slice(1).forEach((symbol) => {
      previewTabs.push({ id: `stream:${symbol}`, title: pairSheetTitle(symbol) });
    });
  }
  if (polymarketFanoutOn) {
    livePicks.slice(1).forEach((pick) => {
      previewTabs.push({
        id: `polymarket:${pick.id}`,
        title: activitySheetTitle(pick, polymarketDirected.rows) || `${sheetTitle} · ${pick.label || pick.title || "Market"}`,
      });
    });
  }
  if (liveMarketFanout && directMarkets.length > 1) {
    directMarkets.slice(1).forEach((market) => {
      previewTabs.push({
        id: `run:direct:${market.ticker}`,
        title: `${sheetTitle} · ${market.ticker}`,
        queued: true,
      });
    });
  }
  if (liveEventCandles && eventCandleEvents.length) {
    previewTabs.unshift({ id: "event-markets", title: `Markets · ${eventCandleEvents[0].eventTicker}` });
    (directPreview.candleMarkets || []).slice(1).forEach((ticker) => {
      previewTabs.push({ id: `run:event-candles:${ticker}`, title: `Candlesticks · ${ticker}`, queued: true });
    });
    eventCandleEvents.slice(1).forEach((event) => {
      previewTabs.push({ id: `run:event-markets:${event.eventTicker}`, title: `Markets · ${event.eventTicker}`, queued: true });
    });
  }
  if (fanoutJoinOn && fanoutParents.has("market")) {
    previewTabs.push({ id: "parent-market", title: "Market" });
  }
  if (fanoutJoinOn && fanoutParents.has("series") && parentLink.seriesTicker) {
    previewTabs.push({ id: "parent-series", title: `Series · ${parentLink.seriesTicker}` });
  }
  if (fanoutJoinOn && fanoutSeriesMarkets && parentLink.seriesTicker) {
    previewTabs.push({ id: "fanout-markets", title: `Markets · ${parentLink.seriesTicker}` });
  }
  if (fanoutJoinOn && liveJoinTargets.length) {
    liveJoinTargets.forEach((item) => previewTabs.push({ id: `live:${item.id}`, title: item.title }));
  }
  if (fanoutMarketsDetected && detectedTargets.length) {
    detectedTargets.forEach((item) => previewTabs.push({ id: `djoin:${item.id}`, title: `${item.title} · series` }));
    const seen = new Set();
    const extra = [];
    for (const row of fanoutSeriesMarketPreview.rows || []) {
      const ticker = String(row?.ticker || "").trim();
      if (!ticker || ticker === detectedPreviewTicker || seen.has(ticker)) continue;
      seen.add(ticker);
      extra.push(ticker);
      if (extra.length >= Math.max(0, marketCap - 1)) break;
    }
    extra.forEach((ticker) => {
      detectedTargets.forEach((item) => {
        previewTabs.push({ id: `run:djoin:${item.id}:${ticker}`, title: `${item.title} · ${ticker}`, queued: true });
      });
    });
  }
  if (traderJoinOn) {
    const traderLabel = (kind) => KALSHI_TRADER_JOIN_KINDS.find((item) => item.id === kind)?.title || "Profile";
    if (traderJoinNames.length && seriesMarketLayout !== "combined") {
      const [first, ...rest] = traderJoinNames;
      traderJoinKinds.forEach((kind) => {
        previewTabs.push({ id: `trader-join:${kind}:${first}`, title: kalshiTraderJoinSheetTitle(kind, first) });
        rest.forEach((name) => {
          previewTabs.push({ id: `run:trader-join:${kind}:${name}`, title: kalshiTraderJoinSheetTitle(kind, name), queued: true });
        });
      });
    } else {
      traderJoinKinds.forEach((kind) => {
        previewTabs.push({ id: `trader-join:${kind}`, title: traderLabel(kind) });
      });
    }
  }
  if (seriesJoinOn && seriesJoinTickers.length) {
    if (seriesMarketLayout === "combined") {
      previewTabs.push({ id: "series-markets", title: "Markets" });
    } else {
      const [first, ...rest] = seriesJoinTickers;
      previewTabs.push({ id: `series-market:${first.ticker}`, title: `Markets · ${first.ticker}` });
      rest.forEach((item) => {
        previewTabs.push({ id: `run:series-market:${item.ticker}`, title: `Markets · ${item.ticker}`, queued: true });
      });
    }
  } else if (seriesJoinOn) {
    previewTabs.push({ id: "series-markets", title: "Markets" });
  }
  if (forecastJoinOn && forecastJoinEvents.length) {
    const [first, ...rest] = forecastJoinEvents;
    if (seriesMarketLayout === "combined") {
      forecastJoinKinds.forEach((kind) => {
        previewTabs.push({ id: `event-extra:${kind}`, title: eventRelatedTitle(kind) });
      });
    } else {
      forecastJoinKinds.forEach((kind) => {
        previewTabs.push({ id: `event-extra:${kind}:${first.ticker}`, title: `${eventRelatedTitle(kind)} · ${first.ticker}` });
      });
      rest.forEach((item) => {
        forecastJoinKinds.forEach((kind) => {
          previewTabs.push({
            id: `run:event-extra:${kind}:${item.ticker}`,
            title: `${eventRelatedTitle(kind)} · ${item.ticker}`,
            queued: true,
          });
        });
      });
    }
  }
  if (eventExtraOn && seriesJoinTickers.length) {
    const extraLabel = (kind) => eventRelatedTitle(kind);
    const [first, ...rest] = seriesJoinTickers;
    const forecastOn = eventExtraKinds.includes("forecast");
    const candlesOn = eventExtraKinds.includes("candlesticks");
    const forecastSheets = forecastOn && seriesMarketLayout !== "combined";
    const forecastPreview = eventExtraPreview[`forecast:${first.ticker}`];
    const forecastShown = forecastPreview?.shownEvent || first.ticker;
    const forecastSkipped = new Set((forecastPreview?.skipped || []).map((item) => item.ticker));
    const pushForecastTab = (item) => {
      if (!forecastSheets) return;
      if (item.ticker === forecastShown) {
        previewTabs.push({ id: `event-extra:forecast:${first.ticker}`, title: `${extraLabel("forecast")} · ${forecastShown}` });
      } else if (!forecastSkipped.has(item.ticker)) {
        previewTabs.push({ id: `run:event-extra:forecast:${item.ticker}`, title: `${extraLabel("forecast")} · ${item.ticker}`, queued: true });
      }
    };
    if (candlesOn) {
      const candlePreview = eventExtraPreview[`candlesticks:${first.ticker}`];
      const [firstMarket, ...otherMarkets] = candlePreview?.candleMarkets || [];
      if (!seriesJoinOn) previewTabs.push({ id: "event-candles-markets", title: `Markets · ${first.ticker}` });
      previewTabs.push({ id: `event-extra:candlesticks:${first.ticker}`, title: `Candlesticks · ${firstMarket || first.ticker}` });
      otherMarkets.forEach((ticker) => {
        previewTabs.push({ id: `run:event-candles:${ticker}`, title: `Candlesticks · ${ticker}`, queued: true });
      });
    }
    pushForecastTab(first);
    rest.forEach((item) => {
      if (candlesOn) {
        if (!seriesJoinOn) previewTabs.push({ id: `run:event-candles-markets:${item.ticker}`, title: `Markets · ${item.ticker}`, queued: true });
        previewTabs.push({ id: `run:event-candles:${item.ticker}`, title: `Candlesticks · ${item.ticker} markets`, queued: true });
      }
      pushForecastTab(item);
    });
    if (forecastOn && !forecastSheets) {
      previewTabs.push({ id: "event-extra:forecast", title: extraLabel("forecast") });
    }
  }
  if (polymarketJoinActive && polymarketTraderCatalog) {
    const sheetTargets = liveJoinTargets.filter((item) => polymarketJoinPlacement(item, traderMarketLayout) === "sheet");
    const traderTargets = sheetTargets.filter((item) => item.anchor === "trader");
    const marketTargets = sheetTargets.filter((item) => item.anchor !== "trader");
    if (traderTargets.length && polymarketTraderPeople.length) {
      const [first, ...rest] = polymarketTraderPeople;
      traderTargets.forEach((item) => {
        const named = polymarketTraderJoinSheetTitle(item.id, first.label);
        previewTabs.push({ id: `live:${item.id}`, title: named || `${item.title} · ${first.label}` });
      });
      rest.forEach((person) => {
        traderTargets.forEach((item) => {
          const named = polymarketTraderJoinSheetTitle(item.id, person.label);
          previewTabs.push({
            id: `run:${item.id}:${person.ticker}`,
            title: named || `${item.title} · ${person.label}`,
            queued: true,
          });
        });
      });
    }
    if (marketTargets.length && polymarketJoinMarkets.length) {
      const [first, ...rest] = polymarketJoinMarkets;
      marketTargets.forEach((item) => {
        previewTabs.push({
          id: `live:${item.id}`,
          title: `${item.title} · ${first.label || first.ticker}`,
          live: Boolean(item.realtime),
        });
      });
      rest.forEach((market) => {
        marketTargets.forEach((item) => {
          previewTabs.push({
            id: `run:${item.id}:${market.ticker}`,
            title: `${item.title} · ${market.label || market.ticker}`,
            queued: true,
            live: Boolean(item.realtime),
          });
        });
      });
    }
    if (downstreamSheetTargets.length && downstreamPreviewMarkets.length) {
      const [firstMarket, ...restMarkets] = downstreamPreviewMarkets;
      downstreamSheetTargets.forEach((item) => {
        previewTabs.push({
          id: `mjoin:${item.id}`,
          title: `${item.title} · ${firstMarket.label || firstMarket.ticker}`,
          live: Boolean(item.realtime),
        });
      });
      restMarkets.forEach((market) => {
        downstreamSheetTargets.forEach((item) => {
          previewTabs.push({
            id: `run:mjoin:${item.id}:${market.ticker}`,
            title: `${item.title} · ${market.label || market.ticker}`,
            queued: true,
            live: Boolean(item.realtime),
          });
        });
      });
    }
  } else if (polymarketJoinActive && polymarketSeriesCatalog && polymarketSeriesPeople.length) {
    const [first, ...rest] = polymarketSeriesPeople;
    if (liveJoinTargets.some((item) => item.id === "getEventsBySeries")) {
      previewTabs.push({ id: "live:getEventsBySeries", title: `Events · ${first.label || first.ticker}` });
      rest.forEach((series) => {
        previewTabs.push({
          id: `run:getEventsBySeries:${series.ticker}`,
          title: `Events · ${series.label || series.ticker}`,
          queued: true,
        });
      });
    }
    const eventSheets = liveJoinTargets.filter((item) => item.anchor === "event" && polymarketJoinPlacement(item, traderMarketLayout) === "sheet");
    const firstEvent = polymarketSeriesEmbeddedEvents[0];
    if (eventSheets.length && firstEvent) {
      eventSheets.forEach((item) => {
        previewTabs.push({ id: `live:${item.id}`, title: `Markets · ${firstEvent.label || firstEvent.ticker}` });
      });
    }
    if (downstreamSheetTargets.length && downstreamPreviewMarkets.length) {
      const [firstMarket, ...restMarkets] = downstreamPreviewMarkets;
      downstreamSheetTargets.forEach((item) => {
        previewTabs.push({
          id: `mjoin:${item.id}`,
          title: `${item.title} · ${firstMarket.label || firstMarket.ticker}`,
          live: Boolean(item.realtime),
        });
      });
      restMarkets.forEach((market) => {
        downstreamSheetTargets.forEach((item) => {
          previewTabs.push({
            id: `run:mjoin:${item.id}:${market.ticker}`,
            title: `${item.title} · ${market.label || market.ticker}`,
            queued: true,
            live: Boolean(item.realtime),
          });
        });
      });
    }
  } else if (polymarketJoinActive && polymarketEventCatalog && polymarketEventPeople.length) {
    const sheetTargets = liveJoinTargets.filter((item) => polymarketJoinPlacement(item, traderMarketLayout) === "sheet");
    const [first, ...rest] = polymarketEventPeople;
    sheetTargets.forEach((item) => {
      previewTabs.push({ id: `live:${item.id}`, title: `Markets · ${first.label || first.ticker}` });
    });
    rest.forEach((event) => {
      sheetTargets.forEach((item) => {
        previewTabs.push({
          id: `run:${item.id}:${event.ticker}`,
          title: `Markets · ${event.label || event.ticker}`,
          queued: true,
        });
      });
    });
    if (downstreamSheetTargets.length && downstreamPreviewMarkets.length) {
      const [firstMarket, ...restMarkets] = downstreamPreviewMarkets;
      downstreamSheetTargets.forEach((item) => {
        previewTabs.push({
          id: `mjoin:${item.id}`,
          title: `${item.title} · ${firstMarket.label || firstMarket.ticker}`,
          live: Boolean(item.realtime),
        });
      });
      restMarkets.forEach((market) => {
        downstreamSheetTargets.forEach((item) => {
          previewTabs.push({
            id: `run:mjoin:${item.id}:${market.ticker}`,
            title: `${item.title} · ${market.label || market.ticker}`,
            queued: true,
            live: Boolean(item.realtime),
          });
        });
      });
    }
  } else if (polymarketJoinActive && polymarketJoinMarkets.length) {
    const [first, ...rest] = polymarketJoinMarkets;
    liveJoinTargets.forEach((item) => {
      previewTabs.push({
        id: `live:${item.id}`,
        title: `${item.title} · ${first.label || first.ticker}`,
        live: Boolean(item.realtime),
      });
    });
    rest.forEach((market) => {
      liveJoinTargets.forEach((item) => {
        previewTabs.push({
          id: `run:${item.id}:${market.ticker}`,
          title: `${item.title} · ${market.label || market.ticker}`,
          queued: true,
          live: Boolean(item.realtime),
        });
      });
    });
  }
  if (marketDownstream) {
    liveJoinTargets.forEach((item) => previewTabs.push({ id: `live:${item.id}`, title: item.title }));
    const seen = new Set();
    const extraMarkets = [];
    for (const row of downstreamMarketRows) {
      const ticker = String(row?.ticker || "").trim();
      if (!ticker || ticker === joinPreviewTicker || seen.has(ticker)) continue;
      seen.add(ticker);
      extraMarkets.push(ticker);
      if (extraMarkets.length >= Math.max(0, marketCap - 1)) break;
    }
    for (const ticker of extraMarkets) {
      liveJoinTargets.forEach((item) => {
        previewTabs.push({ id: `run:${item.id}:${ticker}`, title: `${item.title} · ${ticker}`, queued: true });
      });
    }
  }
  if (sampleOn) previewTabs.push({ id: "sample", title: "Random sample" });
  if (summarizeOn) previewTabs.push({ id: "summary", title: "Summary" });
  if (bucketOn) bucketViews.forEach((view) => previewTabs.push({ id: `bucket:${view.id}`, title: view.title }));
  if (functionOnNew) {
    functionsForSheet("new").forEach((item) => previewTabs.push({ id: `column:${item.id}`, title: item.columnTitle }));
  }
  if (tradesJoinReady && joinPlacement === "sheet") previewTabs.push({ id: "markets-meta", title: "Markets" });
  const joinExtras = previewTabs.filter((tab) => tab.id !== "source");
  const summaryOnSource =
    formulaEditing && summarizeOn && !enrichExplainer && formulaOwner === "summary" && previewSheet !== "summary";
  const summarySourceEditor = summaryOnSource
    ? {
        bar: true,
        value: summaryFormula,
        error: summaryView.error,
        examples: summaryFocus.columnId === "value" ? summaryExamples(summarySourceColumns, summaryMeasure) : [],
        suggestions: summaryFocus.columnId === "value" ? formulaSuggestions(summaryFormula, formulaCaret) : [],
        placeholder: summaryFocus.columnId === "label" ? "Label" : undefined,
        focusToken: formulaFocusToken,
        onChange: updateSummaryInput,
        onFocus: () => {
          blurToken.current += 1;
          setFormulaFocused(true);
          setFormulaOwner("summary");
        },
        onBlur: () => {
          const token = blurToken.current;
          window.setTimeout(() => {
            if (blurToken.current !== token) return;
            setFormulaFocused(false);
          }, 220);
        },
        onCaret: (caret) => {
          formulaCaretRef.current = caret;
          setFormulaCaret(caret);
        },
        onPickSuggestion: (item) => {
          const row = summaryFocus.row;
          const columnId = summaryFocus.columnId === "label" ? "value" : summaryFocus.columnId;
          setSummaryCells((current) => {
            const key = summaryCellKey(columnId, row);
            const value = current[key] || "";
            const next = `${value.slice(0, item.from)}${item.name}(${value.slice(item.to)}`;
            formulaCaretRef.current = item.from + item.name.length + 1;
            setFormulaCaret(formulaCaretRef.current);
            return assignSummaryInput(current, row, columnId, next).cells;
          });
          if (summaryFocus.columnId === "label") setSummaryFocus({ columnId: "value", row });
          setFormulaFocused(true);
          setFormulaFocusToken((token) => token + 1);
        },
        onCommit: () => {
          setFormulaFocused(false);
          setFormulaEditing(false);
          setSummaryTab("summary");
          setPreviewSheet("summary");
        },
      }
    : null;

  if (!source) return null;

  return (
    <div className="relative flex min-h-0 flex-1 bg-background">
      {functionHelp ? (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 p-6" onClick={() => setFunctionHelp(false)}>
          <div
            role="dialog"
            aria-labelledby="function-help-title"
            className="max-h-full w-full max-w-lg overflow-auto rounded-xl border border-border/70 bg-background p-5 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <h2 id="function-help-title" className="text-[15px] font-semibold text-foreground">
                Functions
              </h2>
              <button type="button" onClick={() => setFunctionHelp(false)} className="text-[12px] font-medium text-muted-foreground hover:text-foreground">
                Close
              </button>
            </div>
            <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
              Type these in the new column. Use the column names you see, and click a column or cell to drop it into the equation.
            </p>
            <ul className="mt-4 space-y-3">
              {FORMULA_FUNCTIONS.map((item) => (
                <li key={item.name}>
                  <p className="font-mono text-[12px] font-semibold text-foreground">{item.format}</p>
                  <p className="text-[12px] leading-snug text-muted-foreground">{item.description}</p>
                </li>
              ))}
            </ul>
            <h3 className="mt-5 text-[13px] font-semibold text-foreground">References</h3>
            <ul className="mt-2 space-y-3">
              {FORMULA_REFERENCE_NOTES.map((item) => (
                <li key={item.format}>
                  <p className="font-mono text-[12px] font-semibold text-foreground">{item.format}</p>
                  <p className="text-[12px] leading-snug text-muted-foreground">{item.description}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
      <aside className="flex w-[340px] shrink-0 flex-col border-r border-border/70">
        {step === "enrich" && lockedQuery ? (
          <EnrichStep
            onBack={() => {
              setHoverJoin(false);
              setHoverFunction(false);
              setStep("query");
            }}
            picked={enrichPicks}
            onPick={(id) => {
              const turningOn = !enrichPicks.has(id);
              setEnrichPicks((current) => {
                const next = new Set(current);
                if (turningOn) next.add(id);
                else next.delete(id);
                return next;
              });
              if (!turningOn) {
                dropEnrich(id);
                return;
              }
              setEnrichFolded((current) => {
                const next = new Set(current);
                next.delete(id);
                return next;
              });
              if (id === "summarize") {
                setHoverSummarize(false);
                setSummaryTab("summary");
                setPreviewSheet("summary");
                setFormulaOwner("summary");
                setSummaryFocus({ columnId: "value", row: 0 });
                setFormulaEditing(true);
                setFormulaFocused(true);
                formulaCaretRef.current = (summaryCells[summaryCellKey("value", 0)] || "").length;
                setFormulaFocusToken((token) => token + 1);
              }
              if (id === "bucket") {
                setHoverBucket(false);
                const first = bucketItems[0]?.id;
                if (first) {
                  setActiveBucketId(first);
                  setPreviewSheet(`bucket:${first}`);
                }
              }
              if (id === "sample") {
                setHoverSample(false);
                setPreviewSheet("sample");
                setSampleMode((current) => current || "seeded");
                setSampleSeed((current) => current || generateRandomSampleSeed());
              }
              if (id === "function") setHoverFunction(false);
              if (id === "join") setHoverJoin(false);
            }}
            joinTarget={joinTarget}
            traderJoinIds={traderJoinIds}
            traderJoinChoices={traderJoinChoiceList}
            eventExtraJoinIds={eventExtraJoinIds}
            forecastJoinIds={forecastJoinIds}
            onToggleForecastJoin={(id) => {
              const next = new Set(forecastJoinIds);
              if (next.has(id)) next.delete(id);
              else next.add(id);
              setForecastJoinIds(next);
              const ticker = forecastJoinEvents[0]?.ticker || "";
              const sheetFor = (kind) =>
                !ticker || seriesMarketLayout === "combined" ? `event-extra:${kind}` : `event-extra:${kind}:${ticker}`;
              if (next.has(id)) {
                setPreviewSheet(sheetFor(id));
                return;
              }
              const remain = ["events", "candlesticks", "markets"].filter((kind) => next.has(kind));
              if (remain.length && previewSheet.startsWith(`event-extra:${id}`)) {
                setPreviewSheet(sheetFor(remain[0]));
                return;
              }
              if (!remain.length && previewSheet.startsWith("event-extra:")) setPreviewSheet("source");
            }}
            onToggleEventExtraJoin={(id) => {
              const next = new Set(eventExtraJoinIds);
              if (next.has(id)) next.delete(id);
              else next.add(id);
              setEventExtraJoinIds(next);
              if (id === "candlesticks" && !next.has(id) && joinTarget !== scopeJoinId && liveJoinIds.size) {
                setLiveJoinIds(new Set());
                if (previewSheet.startsWith("live:")) setPreviewSheet("source");
              }
              const ticker = seriesJoinTickers[0]?.ticker || "";
              const sheetFor = (kind) =>
                !ticker || (seriesMarketLayout === "combined" && kind !== "candlesticks") ? `event-extra:${kind}` : `event-extra:${kind}:${ticker}`;
              if (next.has(id)) {
                setPreviewSheet(sheetFor(id));
                return;
              }
              const remain = ["candlesticks", "forecast"].filter((kind) => next.has(kind));
              if (remain.length && previewSheet.startsWith(`event-extra:${id}`)) {
                setPreviewSheet(sheetFor(remain[0]));
                return;
              }
              if (!remain.length && previewSheet.startsWith("event-extra:")) {
                if (joinTarget === scopeJoinId && seriesJoinTickers.length) {
                  setPreviewSheet(seriesMarketLayout === "combined" ? "series-markets" : `series-market:${ticker}`);
                } else {
                  setPreviewSheet("source");
                }
              }
            }}
            onToggleTraderJoin={(id) => {
              const next = new Set(traderJoinIds);
              if (next.has(id)) next.delete(id);
              else next.add(id);
              setTraderJoinIds(next);
              const order = traderJoinChoiceList.map((item) => item.id).filter((kind) => next.has(kind));
              const marketsRemain = kalshiTraderTableNamesMarkets(tableId) || next.has("positions") || next.has("trades");
              if (!marketsRemain && liveJoinIds.size) {
                setLiveJoinIds(new Set());
                if (previewSheet.startsWith("live:") || previewSheet.startsWith("run:")) setPreviewSheet("source");
              }
              if (!order.length) {
                setPreviewSheet("source");
                return;
              }
              const currentKind = traderJoinSheetParts(previewSheet)?.kind;
              const kind = order.includes(currentKind) ? currentKind : order[order.length - 1];
              if (!traderJoinNames.length || seriesMarketLayout === "combined") {
                setPreviewSheet(`trader-join:${kind}`);
                return;
              }
              setPreviewSheet(`trader-join:${kind}:${traderJoinNames[0]}`);
            }}
            onJoinTarget={(id) => {
              setJoinTarget(id);
              if (id !== "kalshiLiveSeriesMarkets" && id !== "kalshiLiveEventMarkets") return;
              if (!seriesJoinTickers.length || seriesMarketLayout === "combined") {
                setPreviewSheet("series-markets");
                return;
              }
              setPreviewSheet(`series-market:${seriesJoinTickers[0].ticker}`);
            }}
            onClear={() => {
              setHoverJoin(false);
              dropEnrich("join");
              setJoinTarget("");
              setTraderJoinIds(new Set());
              setTraderJoinPreview({});
              setEventExtraJoinIds(new Set());
              setForecastJoinIds(new Set());
              setEventExtraPreview({});
              setLiveJoinIds(new Set());
              setDownstreamJoinIds(new Set());
              setDownstreamJoinPreview({});
              setHolderTraderJoinIds(new Set());
              setLiveJoinPreview({});
              setFanoutParents(new Set());
              setFanoutSeriesMarkets(false);
              setDetectedJoinIds(new Set());
              setDetectedJoinPreview({});
              setJoinPlacement("");
              setMetadataTab("trades");
              setMarketColumnHidden(defaultMarketColumnHidden(marketColumnList));
              setJoinTab("markets");
              setFunctionItems((list) =>
                list.map((item) =>
                  item.target === "trades" || item.target === "trades-all" || item.target === "all" ? { ...item, target: "" } : item,
                ),
              );
            }}
            marketCap={marketCap}
            queryRows={
              polymarketJoinCatalog.length
                ? polymarketJoinMarkets.length
                : liveTraderList
                ? traderJoinNames.length
                : liveForecast
                  ? forecastJoinEvents.length
                  : liveEventCandles
                  ? eventCandleMarketRows.length
                  : liveSeriesSearch || liveEventSearch
                  ? seriesJoinTickers.length
                  : liveMarketSearch
                    ? liveJoinList.length
                    : queryRows
            }
            sheetCount={
              polymarketJoinCatalog.length
                ? polymarketJoinMarkets.length
                : liveSeriesSearch || liveEventSearch
                ? seriesMarketLayout === "combined"
                  ? Math.min(1, seriesJoinTickers.length)
                  : seriesJoinTickers.length
                : liveEventCandles
                ? Math.min(eventCandleMarketRows.length, marketCap)
                : liveMarketSearch
                  ? liveJoinMarkets.length
                  : sheetCount
            }
            onHoverJoin={setHoverJoin}
            functionTables={functionChoices({ joinActive: joinCommitted, previewTicker: previewLabel, sheetTitle })}
            functionTarget={functionTarget}
            onFunctionTarget={chooseFunctionTarget}
            onClearFunction={() => {
              setHoverFunction(false);
              dropEnrich("function");
              setFunctionItems([createFunctionItem()]);
              setActiveFunctionId("");
              setFormulaFocused(false);
              setFormulaEditing(false);
            }}
            functionScopeNote={functionActive ? functionScopeNote : ""}
            onHoverFunction={setHoverFunction}
            onHoverSummarize={setHoverSummarize}
            onClearSummary={() => {
              setHoverSummarize(false);
              dropEnrich("summarize");
              setSummaryCells({});
              setSummaryFocus({ columnId: "value", row: 0 });
              setSummaryTab("summary");
              setFormulaEditing(false);
              setFormulaFocused(false);
            }}
            summaryNote={`New sheet. Write a name in Label, and an equation in Value, like = SUM(${summaryMeasure}). Click a column on ${sheetTitle}, Buckets, or any other sheet to drop it in.`}
            showSummarizeBuilder
            onFunctionHelp={() => setFunctionHelp(true)}
            onSaveAndRun={requestSaveAndRun}
            running={running}
            showJoinBuilder={marketsQuery || tradesQuery || liveMarketSearch || liveSeriesSearch || liveEventSearch || liveMarketFanout || liveTraderList || liveForecast || liveEventCandles || polymarketJoinCatalog.length > 0}
            showFunctionBuilder
            joinMode={
              polymarketTraderCatalog
                ? "polymarket-live"
                : polymarketJoinCatalog.some((item) => item.id === "parent-market")
                ? "polymarket-fanout"
                : polymarketJoinCatalog.length
                  ? "polymarket-live"
                  : liveForecast
                    ? "forecast"
                    : liveEventCandles
                    ? "event-candles"
                    : liveMarketFanout
                      ? "fanout"
                      : liveTraderList
                        ? "traders"
                        : liveEventSearch
                          ? "events"
                          : liveSeriesSearch
                            ? "series"
                            : liveMarketSearch
                              ? "live"
                              : tradesQuery
                                ? "trades"
                                : "markets"
            }
            seriesMarketLayout={seriesMarketLayout}
            traderMarketLayout={traderMarketLayout}
            downstreamOpen={downstreamFromPositions || downstreamFromEvents}
            downstreamChoices={downstreamMarketChoices}
            downstreamJoinIds={downstreamJoinIds}
            onToggleDownstreamJoin={toggleDownstreamJoin}
            onSelectAllDownstream={selectAllDownstream}
            holderTraderOpen={(liveJoinIds.has("getHoldersByMarkets") || downstreamJoinIds.has("getHoldersByMarkets")) && holderTraderChoices.length > 0}
            holderTraderChoices={holderTraderChoices}
            holderTraderJoinIds={holderTraderJoinIds}
            onToggleHolderTrader={toggleHolderTrader}
            onTraderMarketLayout={(layout) => {
              setTraderMarketLayout(layout);
              if (downstreamJoinIds.has("parent-market") && !liveJoinIds.has("parent-market")) {
                if (layout === "merge") setPreviewSheet(downstreamBearingId ? `live:${downstreamBearingId}` : "source");
                else setPreviewSheet("mjoin:parent-market");
                return;
              }
              if (!liveJoinIds.has("parent-market")) return;
              setPreviewSheet(layout === "merge" ? "source" : "live:parent-market");
            }}
            marketsDetected={marketsDetected || forecastMarketsDetected}
            onSeriesMarketLayout={(layout) => {
              setSeriesMarketLayout(layout);
              if (traderJoinKinds.length) {
                const currentKind = traderJoinSheetParts(previewSheet)?.kind;
                const kind = traderJoinKinds.includes(currentKind) ? currentKind : traderJoinKinds[0];
                if (!traderJoinNames.length || layout === "combined") {
                  setPreviewSheet(`trader-join:${kind}`);
                  return;
                }
                setPreviewSheet(`trader-join:${kind}:${traderJoinNames[0]}`);
                return;
              }
              const extra = eventExtraSheetParts(previewSheet);
              if (extra && (eventExtraKinds.includes(extra.kind) || forecastJoinKinds.includes(extra.kind))) {
                const forecastSide = forecastJoinKinds.includes(extra.kind);
                const ticker = (forecastSide ? forecastJoinEvents : seriesJoinTickers)[0]?.ticker || "";
                const perMarket = !forecastSide && extra.kind === "candlesticks";
                setPreviewSheet(!ticker || (layout === "combined" && !perMarket) ? `event-extra:${extra.kind}` : `event-extra:${extra.kind}:${ticker}`);
                return;
              }
              if (joinTarget !== "kalshiLiveSeriesMarkets" && joinTarget !== "kalshiLiveEventMarkets") return;
              if (!seriesJoinTickers.length || layout === "combined") {
                setPreviewSheet("series-markets");
                return;
              }
              setPreviewSheet(`series-market:${seriesJoinTickers[0].ticker}`);
            }}
            liveJoinIds={liveJoinIds}
            liveJoinChoices={
              polymarketJoinCatalog.length
                ? polymarketJoinCatalog
                : liveMarketFanout
                  ? KALSHI_LIVE_MARKET_JOINS.filter((item) => item.id !== tableId)
                  : undefined
            }
            onToggleLiveJoin={toggleLiveJoin}
            onSelectAllLiveJoins={selectAllLiveJoins}
            fanoutParents={fanoutParents}
            onToggleFanoutParent={toggleFanoutParent}
            fanoutSeriesMarkets={fanoutSeriesMarkets}
            onToggleFanoutSeriesMarkets={toggleFanoutSeriesMarkets}
            fanoutSeriesReady={Boolean(parentLink.seriesTicker) && parentLink.status !== "idle" && parentLink.status !== "error"}
            fanoutSeriesMissing={parentLink.status === "ready" && fanoutParents.has("series") && !parentLink.seriesTicker}
            fanoutMarketsDetected={fanoutMarketsDetected}
            detectedJoinIds={detectedJoinIds}
            onToggleDetectedJoin={toggleDetectedJoin}
            joinWindows={joinWindows}
            onJoinWindow={(id, filters) => setJoinWindows((current) => ({ ...current, [id]: filters }))}
            joinLife={joinMarketLives.life}
            joinPerMarket={joinMarketLives.perMarket}
            joinLake={polymarketHistorical ? "polymarket" : "kalshi"}
            joinPlacement={joinPlacement}
            onJoinPlacement={(placement) => {
              setHoverJoin(false);
              setJoinPlacement(placement);
              setMetadataTab(placement === "sheet" ? "markets" : "trades");
              setPreviewSheet(placement === "sheet" ? "markets-meta" : "source");
              setFunctionScrollKey((key) => key + 1);
            }}
            marketColumns={marketColumnList}
            marketColumnHidden={marketColumnHidden}
            onToggleMarketColumn={(id) => {
              setMarketColumnHidden((current) => {
                const next = new Set(current);
                if (next.has(id)) next.delete(id);
                else next.add(id);
                return next;
              });
              setFunctionScrollKey((key) => key + 1);
            }}
            onMarketColumnsAll={() => setMarketColumnHidden(new Set())}
            onMarketColumnsNone={() => setMarketColumnHidden(new Set(marketColumnList.map((column) => column.id)))}
            onHoverBucket={setHoverBucket}
            onHoverSample={setHoverSample}
            bucketColumns={summarySourceColumns}
            bucketItems={bucketItems}
            onBucketColumn={chooseBucketColumn}
            onBucketMode={(bucketId, mode) => {
              setActiveBucketId(bucketId);
              patchBucket(bucketId, { mode });
            }}
            onBucketInterval={(bucketId, interval) => patchBucket(bucketId, { interval })}
            onBucketNumericSize={(bucketId, numericSize) => patchBucket(bucketId, { numericSize })}
            onToggleBucketGroup={(bucketId, columnId) => {
              const item = bucketItems.find((entry) => entry.id === bucketId);
              const groupBy = item?.groupBy.includes(columnId)
                ? item.groupBy.filter((entry) => entry !== columnId)
                : [...(item?.groupBy || []), columnId];
              patchBucket(bucketId, { groupBy });
            }}
            onBucketMetric={chooseBucketMetric}
            onBucketValueColumn={(bucketId, valueColumnId) => patchBucket(bucketId, { valueColumnId })}
            onAddBucket={() => {
              const item = createBucketItem();
              setBucketItems((list) => [...list, item]);
              setActiveBucketId(item.id);
              setPreviewSheet(`bucket:${item.id}`);
              setEnrichFolded((current) => {
                const next = new Set(current);
                next.delete("bucket");
                return next;
              });
            }}
            onRemoveBucket={(bucketId) => {
              setBucketItems((list) => {
                const next = list.filter((item) => item.id !== bucketId);
                return next.length ? next : [createBucketItem()];
              });
              setPreviewSheet((current) => (current === `bucket:${bucketId}` ? "source" : current));
            }}
            onClearBucket={() => {
              setHoverBucket(false);
              dropEnrich("bucket");
              setBucketItems([createBucketItem()]);
              setActiveBucketId("");
            }}
            folded={enrichFolded}
            onToggleFold={toggleEnrichFold}
            functionItems={functionItems}
            onAddFunction={() => {
              const item = createFunctionItem();
              setFunctionItems((list) => [...list, item]);
              setActiveFunctionId(item.id);
              setFormulaOwner("function");
              setFormulaEditing(true);
              setEnrichFolded((current) => {
                const next = new Set(current);
                next.delete("function");
                return next;
              });
            }}
            onRemoveFunction={(functionId) => {
              setFunctionItems((list) => {
                const next = list.filter((item) => item.id !== functionId);
                return next.length ? next : [createFunctionItem()];
              });
              setPreviewSheet((current) => (current === `column:${functionId}` ? "source" : current));
            }}
            onFocusFunction={(functionId) => {
              setActiveFunctionId(functionId);
              setFormulaOwner("function");
              setFormulaEditing(true);
              const item = functionItems.find((entry) => entry.id === functionId);
              if (item?.target === "new") setPreviewSheet(`column:${functionId}`);
              setFunctionScrollKey((key) => key + 1);
            }}
            summaryLines={(() => {
              const lines = [];
              for (let row = 0; row < 8; row += 1) {
                const value = String(summaryCells[summaryCellKey("value", row)] || "").trim();
                const label = String(summaryCells[summaryCellKey("label", row)] || "").trim();
                if (value.startsWith("=")) lines.push(label || describeSummaryFormula(value) || value);
              }
              return lines.length ? lines : ["No equations yet"];
            })()}
            sampleSize={sampleSize}
            onSampleSize={setSampleSize}
            sampleMode={sampleMode}
            onSampleMode={chooseSampleMode}
            sampleError={sampleOn ? sampleSizeError : ""}
            onClearSample={() => {
              setHoverSample(false);
              dropEnrich("sample");
              setSampleSize("100");
              setSampleMode("seeded");
              setSampleSeed("");
              setSampleShuffle(0);
            }}
          />
        ) : (
        <>
        <div className="px-4 pb-3 pt-4 pr-12">
          <button
            type="button"
            onClick={onBack}
            className="mb-2 inline-flex size-8 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-muted"
            aria-label="Back to integrations"
          >
            <ArrowLeft className="size-4" />
          </button>
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            Pull {source.name} data based on your criteria.
          </p>
          {cutoffPending ? (
            <Skeleton className="mt-1.5 h-3.5 w-56 bg-muted-foreground/20" />
          ) : cutoffCaption ? (
            <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{cutoffCaption}</p>
          ) : null}
        </div>
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 pb-4">
          <div>
            <div ref={dataTypePickerRef}>
            {groups ? (
              <div className="mb-2 flex flex-wrap gap-1.5" role="tablist" aria-label={source?.name || "Integration"}>
                {groups.map((group) => {
                  const selected = groupId === group.id;
                  return (
                    <button
                      key={group.id}
                      type="button"
                      role="tab"
                      aria-selected={selected}
                      onClick={() => selectGroup(group.id)}
                      className={cn(
                        "inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                        selected
                          ? "border-[#0d99ff]/40 bg-[#0d99ff]/10 text-[#0d99ff]"
                          : "border-border/70 bg-background text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                      )}
                    >
                      {group.label}
                    </button>
                  );
                })}
              </div>
            ) : null}
            {visibleTableIds.length > 1 ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex w-full items-center justify-between rounded-xl border border-border/70 bg-background px-3 py-2.5 text-left shadow-sm transition-colors hover:bg-muted/50"
                >
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[13px] font-semibold text-foreground">{table?.label}</span>
                      {table?.realtime ? <EndpointLiveTag /> : null}
                    </span>
                    <span className="mt-0.5 block text-[12px] leading-relaxed text-muted-foreground">{table?.description}</span>
                  </span>
                  <ChevronDown className="ml-2 size-4 shrink-0 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="z-[580] max-h-[var(--radix-dropdown-menu-content-available-height)] w-[300px] overflow-y-auto">
                {visibleTableIds.map((id) => (
                  <DropdownMenuItem key={id} onSelect={() => setTableId(id)}>
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[13px] font-medium">{tables[id].label}</span>
                        {tables[id].realtime ? <EndpointLiveTag /> : null}
                      </span>
                      <span className="block text-[11px] text-muted-foreground">{tables[id].description}</span>
                    </span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            ) : null}
            </div>
            {groups || visibleTableIds.length > 1 ? (
              <FeatureTip
                id="integration-build-data-type"
                anchorRef={dataTypePickerRef}
                side="right"
                align="start"
                sideOffset={14}
                title="Select a Data Type"
                description="Start by selecting any tag option or pick from the dropdown, depending on what you are interested in, to start constructing your data. As you make selections the preview panel will update immediately."
                action={{ label: "Ok" }}
                closeOnAction
              />
            ) : null}
            {pairStreamOn ? (
              <div className="mt-3">
                <p className="text-[12px] font-medium text-foreground">Pairs</p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                  Each pair streams into its own sheet. Pick as many as you want.
                </p>
                <div className="mt-2 grid grid-cols-2 gap-1.5" role="group" aria-label={`${streamProvider} pairs`}>
                  {priceStreamPairs(integrationId).map((pair) => {
                    const selected = streamPairs.includes(pair.id);
                    const status = pairStreams[pair.id]?.status;
                    return (
                      <button
                        key={pair.id}
                        type="button"
                        aria-pressed={selected}
                        title={pair.name}
                        onClick={() => toggleStreamPair(pair.id)}
                        className={cn(
                          "flex items-center justify-between gap-1.5 rounded-lg border px-2.5 py-1.5 text-left text-[12px] font-medium transition-colors",
                          selected
                            ? "border-[#0d99ff]/40 bg-[#0d99ff]/10 text-[#0d99ff]"
                            : "border-border/70 bg-background text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                        )}
                      >
                        <span className="truncate">{pair.title}</span>
                        {selected ? (
                          <span
                            aria-label={status === "live" ? "Streaming" : status === "closed" ? "Stream closed" : "Connecting"}
                            className={cn(
                              "size-1.5 shrink-0 rounded-full",
                              status === "live" ? "bg-emerald-500" : status === "closed" ? "bg-muted-foreground/50" : "animate-pulse bg-[#0d99ff]",
                            )}
                          />
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-border/70 px-3 py-2 text-[12px] text-muted-foreground transition-colors hover:bg-muted/50"
                >
                  <History className="size-3.5" />
                  Browse past searches
                  <ChevronDown className="size-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="z-[580] w-[300px]">
                <DropdownMenuLabel>Saved searches</DropdownMenuLabel>
                {savedForSource.length ? (
                  savedForSource.map((entry) => (
                    <DropdownMenuItem key={entry.id} onSelect={() => applySaved(entry)} title={entry.label}>
                      <span className="min-w-0">
                        <span className="block truncate text-[13px]">{entry.label || "Saved search"}</span>
                        {entry.savedAt ? (
                          <span className="block text-[11px] text-muted-foreground">{formatSavedAt(entry.savedAt)}</span>
                        ) : null}
                      </span>
                    </DropdownMenuItem>
                  ))
                ) : (
                  <DropdownMenuItem disabled>No saved searches yet</DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Earlier pulls</DropdownMenuLabel>
                {pullsForSource.length ? (
                  pullsForSource.map((entry) => (
                    <DropdownMenuItem key={entry.id} disabled title={entry.label}>
                      <span className="min-w-0">
                        <span className="block truncate text-[13px]">{entry.label || "Earlier pull"}</span>
                        {entry.savedAt ? (
                          <span className="block text-[11px] text-muted-foreground">{formatSavedAt(entry.savedAt)}</span>
                        ) : null}
                      </span>
                    </DropdownMenuItem>
                  ))
                ) : (
                  <DropdownMenuItem disabled>No earlier pulls for this account</DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {liveMarketSearch ? (
            <KalshiLiveMarketPicker picks={livePicks} onAdd={addLivePick} onRemove={removeLivePick} />
          ) : null}
          {liveDirect && !centerSearch ? (
            <KalshiLiveDirectQuery
              tableId={tableId}
              picks={livePicks}
              onAdd={addDirectPick}
              onRemove={removeLivePick}
            />
          ) : null}
          {polymarketSearch && !polymarketCenterSearch ? (
            <PolymarketLiveBuildSearch
              picks={livePicks}
              onAdd={addPolymarketPick}
              onRemove={removeLivePick}
              entities={polymarketSearch.entities}
              placeholder={polymarketSearch.placeholder}
              acceptAddress={Boolean(polymarketSearch.acceptAddress)}
            />
          ) : null}

          <Accordion
            key={tableId}
            type="single"
            collapsible
            defaultValue={polymarketQuerySection?.value || kalshiQuerySection?.value || "columns"}
            className="space-y-2"
          >
            {kalshiQuerySection ? (
              <AccordionItem value={kalshiQuerySection.value} className="border-0">
                <AccordionPrimitive.Header className="flex">
                  <AccordionPrimitive.Trigger
                    className="flex w-full items-center gap-2 rounded-lg bg-zinc-200/80 px-2.5 py-1.5 text-left text-[12px] font-semibold text-foreground dark:bg-zinc-800 [&[data-state=open]>svg]:rotate-180"
                    aria-label={kalshiQuerySection.title}
                  >
                    <span className="shrink-0">{kalshiQuerySection.title}</span>
                    <span className="ml-auto max-w-[55%] truncate text-[11px] font-normal text-[#0d99ff]">
                      {directAttributeColumns
                        .filter((column) => kalshiQuerySection.ids.includes(column.id))
                        .map((column) => attributeSummary(column, attributeFilters))
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                    <ChevronDown className="size-4 shrink-0 transition-transform duration-200" />
                  </AccordionPrimitive.Trigger>
                </AccordionPrimitive.Header>
                <AccordionContent className="pb-0 pt-2">
                  <div className="rounded-lg border border-border/70 px-2 py-2">
                    <MarketWindowQueryFields columns={directAttributeColumns} filters={attributeFilters} onChange={setAttributeFilters} />
                  </div>
                </AccordionContent>
              </AccordionItem>
            ) : null}
            {polymarketQuerySection ? (
              <AccordionItem value={polymarketQuerySection.value} className="border-0">
                <AccordionPrimitive.Header className="flex">
                  <AccordionPrimitive.Trigger
                    className="flex w-full items-center gap-2 rounded-lg bg-zinc-200/80 px-2.5 py-1.5 text-left text-[12px] font-semibold text-foreground dark:bg-zinc-800 [&[data-state=open]>svg]:rotate-180"
                    aria-label={polymarketQuerySection.title}
                  >
                    <span className="shrink-0">{polymarketQuerySection.title}</span>
                    <span className="ml-auto max-w-[55%] truncate text-[11px] font-normal text-[#0d99ff]">
                      {priceHistorySummary(polymarketQuoteColumns, attributeFilters)}
                    </span>
                    <ChevronDown className="size-4 shrink-0 transition-transform duration-200" />
                  </AccordionPrimitive.Trigger>
                </AccordionPrimitive.Header>
                <AccordionContent className="pb-0 pt-2">
                  <div className="rounded-lg border border-border/70 px-2 py-2">
                    {tableId === "getTradesByMarket" ? (
                      <TradeHistoryQueryFields
                        columns={polymarketQuoteColumns}
                        filters={attributeFilters}
                        onChange={setAttributeFilters}
                      />
                    ) : (
                      <PriceHistoryQueryFields
                        columns={polymarketQuoteColumns}
                        filters={attributeFilters}
                        onChange={(next) =>
                          setAttributeFilters((current) => settlePolymarketQueryFilters(tableId, current, next, focusedMarket))
                        }
                      />
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ) : null}
            <AccordionItem value="columns" className="border-0">
              <AccordionPrimitive.Header className="flex">
                <AccordionPrimitive.Trigger
                  className="flex w-full items-center gap-2 rounded-lg bg-zinc-200/80 px-2.5 py-1.5 text-left text-[12px] font-semibold text-foreground dark:bg-zinc-800 [&[data-state=open]>svg]:rotate-180"
                  aria-label="Columns"
                >
                  <span>Columns</span>
                  <span className="ml-auto text-[11px] font-normal text-muted-foreground">
                    {Math.max(0, (pull?.columns.length || 0) - hidden.size)} selected
                  </span>
                  <ChevronDown className="size-4 shrink-0 transition-transform duration-200" />
                </AccordionPrimitive.Trigger>
              </AccordionPrimitive.Header>
              <AccordionContent className="pb-0 pt-2">
                <div className="rounded-lg border border-border/70 px-2 py-2">
                  <div className="mb-2 flex items-center gap-1.5">
                  <button
                    type="button"
                    aria-pressed={Boolean(pull?.columns.length) && hidden.size === 0}
                    onClick={selectAllColumns}
                    className={cn(
                      "inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors",
                      pull?.columns.length && hidden.size === 0
                        ? "border-[#0d99ff]/40 bg-[#0d99ff]/10 text-[#0d99ff]"
                        : "border-border/70 bg-background text-muted-foreground hover:bg-muted/50",
                    )}
                  >
                    Select all
                  </button>
                  <button
                    type="button"
                    aria-pressed={Boolean(pull?.columns.length) && hidden.size >= pull.columns.length}
                    onClick={deselectAllColumns}
                    className={cn(
                      "inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors",
                      pull?.columns.length && hidden.size >= pull.columns.length
                        ? "border-[#0d99ff]/40 bg-[#0d99ff]/10 text-[#0d99ff]"
                        : "border-border/70 bg-background text-muted-foreground hover:bg-muted/50",
                    )}
                  >
                    Deselect all
                  </button>
                </div>
                <div className="max-h-72 space-y-0.5 overflow-y-auto pr-1">
                  {(pull?.columns || []).map((column) => (
                    <ColumnOption
                      key={column.id}
                      column={column}
                      checked={!hidden.has(column.id)}
                      onToggle={() => toggleColumn(column.id)}
                    />
                  ))}
                </div>
                </div>
              </AccordionContent>
            </AccordionItem>
            {guidedFilters || liveMarketSearch || liveDirect || polymarketLive ? (
              <AttributeFilters
                columns={
                  liveSeriesSearch
                    ? seriesAttributeColumns
                    : liveEventSearch
                      ? eventAttributeColumns
                      : liveTrader
                        ? traderAttributeColumns
                        : liveForecast
                          ? forecastAttributeColumns
                          : liveMultivariate
                            ? multivariateAttributeColumns
                          : liveMarketSearch
                          ? liveAttributeColumns
                          : liveMarketFanout || liveEventCandles
                            ? directListColumns
                            : tableId === "getMarkets" && polymarketMarketColumns.length
                              ? polymarketMarketColumns
                              : tableId === "getSamplingMarkets" && polymarketSamplingColumns.length
                                ? polymarketSamplingColumns
                                : polymarketBiggestWinnersColumns.length
                                  ? polymarketBiggestWinnersColumns
                                  : polymarketLeaderboardColumns.length
                                    ? polymarketLeaderboardColumns
                                    : polymarketPositionColumns.length
                                      ? polymarketPositionColumns
                                    : polymarketPnlColumns.length
                                      ? polymarketPnlColumns
                                    : polymarketActivityColumns.length
                                      ? polymarketActivityColumns
                                  : polymarketAttributeColumns.length
                                    ? polymarketAttributeColumns
                                    : pull?.columns || []
                }
                filters={attributeFilters}
                onChange={(next) => {
                  if (!polymarketLive) {
                    setAttributeFilters(next);
                    return;
                  }
                  setAttributeFilters((current) => settlePolymarketQueryFilters(tableId, current, next, focusedMarket));
                }}
                sorts={sortKeys}
                onSorts={setSortKeys}
                rowLimit={rowLimit}
                onRowLimit={setRowLimit}
                sectionTitle={
                  liveSeriesSearch
                    ? "Series attributes"
                    : liveEventSearch
                      ? "Event attributes"
                      : tableId === "event_forecast"
                        ? "Forecast attributes"
                        : tableId === "event_candlesticks"
                          ? "Event candlestick attributes"
                          : tableId === "multivariate_events"
                            ? "Multivariate event attributes"
                        : tableId === "leaderboard"
                        ? "Leaderboard attributes"
                        : tableId === "search_traders"
                          ? "Trader attributes"
                          : tableId === "holder_profile"
                            ? "Profile attributes"
                            : tableId === "trades_by_holder"
                              ? "Trader trade attributes"
                      : tableId === "trades"
                      ? "Trade attributes"
                      : tableId === "candlesticks"
                        ? "Candlestick attributes"
                        : tableId === "orderbook"
                          ? "Orderbook attributes"
                          : tableId === "blocks"
                            ? "Block attributes"
                            : tableId === "getTraderByAddress"
                            ? "Trader attributes"
                            : tableId === "getTraderPositions"
                              ? "Position attributes"
                            : tableId === "getTraderPnlSeries"
                              ? "PnL attributes"
                            : tableId === "getTraderActivity"
                              ? "Activity attributes"
                          : polymarketLive
                              ? "Attributes"
                            : "Market attributes"
                }
              />
            ) : null}
          </Accordion>

          {guidedFilters || liveMarketSearch || liveDirect || polymarketLive ? null : (
            <section>
              <p className="mb-2 text-[12px] font-semibold text-foreground">Filters</p>
              <p className="mb-2 text-[12px] leading-relaxed text-muted-foreground">
                Keep rows whose column contains this text. This narrows the preview you are looking at.
              </p>
              <div className="space-y-2">
                <select
                  value={filterColumn}
                  onChange={(event) => setFilterColumn(event.target.value)}
                  className="h-9 w-full rounded-lg border border-border/70 bg-background px-2 text-[13px]"
                >
                  {(pull?.columns || []).map((column) => (
                    <option key={column.id} value={column.id}>
                      {column.title}
                    </option>
                  ))}
                </select>
                <Input
                  value={filterValue}
                  placeholder="Contains…"
                  onChange={(event) => setFilterValue(event.target.value)}
                  className="h-9"
                />
              </div>
            </section>
          )}
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-border/70 px-4 py-3">
          <Button type="button" variant="outline" onClick={onSave} disabled={!canProceed}>
            {justSaved ? "Saved" : "Save search"}
          </Button>
          <Button type="button" onClick={onNext} disabled={!canProceed}>
            Next
          </Button>
        </div>
        </>
        )}
      </aside>

      <section className="flex min-h-0 min-w-0 flex-1 flex-col bg-[#e6edf3] dark:bg-[#1c232b]">
        <div className="flex items-start justify-between gap-3 px-5 pb-2 pr-12 pt-5">
          <div className="min-w-0 pt-0.5">
            <h2 className="text-[15px] font-semibold text-foreground">Preview</h2>
            {pairStreamOn ? (
              <p className="mt-1 max-w-md text-[12px] leading-relaxed text-muted-foreground">
                This preview streams live. After you run it, start realtime from the sheet on the dashboard to keep each pair streaming.
              </p>
            ) : isRealtimeEnabled(integrationId, previewSheet.startsWith("live:") ? previewSheet.slice("live:".length) : tableId) ? (
              <p className="mt-1 max-w-md text-[12px] leading-relaxed text-muted-foreground">
                This endpoint qualifies for a realtime pull. Preview stays a snapshot. After you run it, start realtime from the sheet on the dashboard.
              </p>
            ) : null}
          </div>
          <div className="flex min-w-0 flex-col items-end">
            <p className="text-right text-[12px] text-muted-foreground">{paneLine}</p>
            {typeof planLimit === "number" &&
            !(showJoinSheets && joinTab !== "markets") &&
            !showSummarizeExplainer &&
            !showFunctionExplainer &&
            !showJoinExplainer &&
            !showBucketExplainer &&
            !showSampleExplainer &&
            !(functionOnNew && previewSheet.startsWith("column:")) &&
            !summaryActive &&
            !bucketActive &&
            !sampleActive &&
            !(seriesMarketSheet && seriesJoinOn) &&
            !(previewSheet.startsWith("event-extra:") && relatedExtraOn) &&
            !(previewSheet === "event-markets" && liveEventCandles) &&
            !(previewSheet === "event-candles-markets" && eventExtraOn) &&
            !(previewSheet === "trader-join" || previewSheet.startsWith("trader-join:")) &&
            !(fanoutJoinOn && (previewSheet === "parent-market" || previewSheet === "parent-series" || previewSheet === "fanout-markets" || previewSheet.startsWith("djoin:") || previewSheet.startsWith("live:"))) &&
            !(polymarketJoinActive && previewSheet.startsWith("live:")) &&
            !(previewSheet === "markets-meta" && tradesJoinReady && joinPlacement === "sheet") ? (
              <div className="mt-1.5 w-full max-w-[280px]">
                <p className="text-right text-[11px] text-muted-foreground">
                  {importedRows == null
                    ? `… / ${planLimit.toLocaleString()} plan limit`
                    : `${importedRows.toLocaleString()} ${importedRows === 1 ? "row" : "rows"} will be imported / ${planLimit.toLocaleString()} plan limit`}
                </p>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                  <div
                    className={cn(
                      "h-full rounded-full transition-[width] duration-500",
                      importedRows == null ? "bg-transparent" : usesFullPlan ? "bg-red-500/75" : "bg-emerald-500/80",
                    )}
                    style={{ width: `${planFill}%` }}
                  />
                </div>
              </div>
            ) : previewSheet.startsWith("event-extra:") && relatedExtraOn ? (
              <p className="mt-1 text-right text-[11px] text-muted-foreground">Preview only. Save and run covers the other events.</p>
            ) : previewSheet === "event-candles-markets" && eventExtraOn ? (
              <p className="mt-1 text-right text-[11px] text-muted-foreground">Preview only. Save and run places each event&apos;s markets before its candlestick sheets.</p>
            ) : previewSheet === "event-markets" && liveEventCandles ? (
              <p className="mt-1 text-right text-[11px] text-muted-foreground">Preview only. Save and run pulls every market in each event, up to your plan limit.</p>
            ) : seriesMarketSheet && seriesJoinOn ? (
              <p className="mt-1 text-right text-[11px] text-muted-foreground">Preview only. Save and run uses your plan limit on each Markets sheet.</p>
            ) : fanoutJoinOn && (previewSheet === "parent-market" || previewSheet === "parent-series" || previewSheet === "fanout-markets" || previewSheet.startsWith("djoin:") || previewSheet.startsWith("live:")) ? (
              <p className="mt-1 text-right text-[11px] text-muted-foreground">Preview only. Save and run creates this sheet.</p>
            ) : polymarketJoinActive && previewSheet.startsWith("live:") ? (
              <p className="mt-1 text-right text-[11px] text-muted-foreground">
                {polymarketTraderCatalog
                  ? "Preview only. The other sheets are viewable when you hit Save and run."
                  : "Preview only. Each market gets its own sheet when you run the pull."}
              </p>
            ) : showJoinSheets && joinTab === previewTicker ? (
              <p className="mt-1 text-right text-[11px] text-muted-foreground">Preview only. This sheet is created when you run the pull.</p>
            ) : previewSheet === "markets-meta" && tradesJoinReady && joinPlacement === "sheet" ? (
              <p className="mt-1 text-right text-[11px] text-muted-foreground">Preview only. This sheet is created when you run the pull.</p>
            ) : summaryActive ? (
              <p className="mt-1 text-right text-[11px] text-muted-foreground">Preview only. This sheet is created when you run the pull.</p>
            ) : bucketActive ? (
              <p className="mt-1 text-right text-[11px] text-muted-foreground">Preview only. This sheet is created when you run the pull.</p>
            ) : sampleActive ? (
              <p className="mt-1 text-right text-[11px] text-muted-foreground">
                This tab is the random sample. The first tab is the parent query.
              </p>
            ) : null}
          </div>
        </div>
        <div className="h-1 w-full bg-black/5 dark:bg-white/10">
          <div
            className={cn(
              "h-full bg-[#0d99ff] transition-[width] duration-300",
              loading || emptyRefresh || livePickAwaitingRows || liveScanWaiting || directLoading ? "" : "opacity-0",
            )}
            style={{ width: `${Math.min(100, progress)}%` }}
          />
        </div>
        {showSummarizeExplainer ? (
          <SummarizeExplainerTabs sheetTitle={sheetTitle} />
        ) : showBucketExplainer ? (
          <BucketExplainerTabs sheetTitle={sheetTitle} />
        ) : showFunctionExplainer ? (
          <FunctionExplainerTabs sheetTitle={sheetTitle} />
        ) : showJoinExplainer && liveTraderList ? (
          <TraderJoinExplainerTabs title={KALSHI_TRADER_SOURCE_TITLES[tableId] || "Leaderboard"} joins={traderJoinChoiceList} />
        ) : showJoinExplainer && liveForecast ? (
          <div className="overflow-hidden px-4 pb-1 pt-4">
            <div className="flex">
              <span className={sheetTabClass(true)}>Event forecast</span>
              <span className={sheetTabClass(false)}>Events</span>
              <span className={sheetTabClass(false)}>Event candlesticks</span>
              <span className={sheetTabClass(false)}>Markets</span>
            </div>
          </div>
        ) : showJoinExplainer && (liveSeriesSearch || liveEventSearch) ? (
          <LiveScopeJoinExplainerTabs source={liveEventSearch ? "events" : "series"} />
        ) : showJoinExplainer && polymarketTraderCatalog ? (
          <PolymarketTraderJoinExplainerTabs title={sheetTitle} joins={polymarketJoinCatalog} />
        ) : showJoinExplainer && polymarketJoinCatalog.some((item) => item.id === "parent-market") ? (
          <PolymarketFanoutJoinExplainerTabs title={sheetTitle} />
        ) : showJoinExplainer && polymarketJoinCatalog.length ? (
          <PolymarketLiveJoinExplainerTabs />
        ) : showJoinExplainer && liveMarketFanout ? (
          <FanoutJoinExplainerTabs tableId={tableId} />
        ) : showJoinExplainer ? (
          <JoinExplainerTabs source={tradesQuery ? "trades" : "markets"} live={liveMarketSearch} />
        ) : liveJoinReady ? (
          <LiveJoinTabs
            targets={liveJoinTargets}
            markets={liveJoinMarkets}
            active={previewSheet}
            previewTicker={livePreviewTicker}
            onSelect={showPreview}
            sampleTab={sampleOn ? { id: "sample", title: "Random sample" } : null}
          />
        ) : showJoinSheets ? (
          <JoinSheetTabs
            markets={joinedMarkets}
            extras={joinExtras}
            active={previewSheet === "source" ? "markets" : previewSheet}
            previewTicker={previewTicker}
            sheetCount={sheetCount}
            onSelect={(tab) => showPreview(tab === "markets" ? "source" : tab)}
          />
        ) : (
          <ResultSheetTabs tabs={previewTabs} active={previewSheet} onSelect={showPreview} />
        )}
        <div className="min-h-0 flex-1 p-4">
          {showSummarizeExplainer ? (
            <SummarizeExplainer measure={summaryMeasure} />
          ) : showBucketExplainer ? (
            <BucketExplainer measure={summaryMeasure} />
          ) : showSampleExplainer ? (
            <SampleExplainer />
          ) : showFunctionExplainer ? (
            <FunctionExplainer venue={polymarketHistorical ? "polymarket" : "kalshi"} />
          ) : bucketActive && visibleBucket ? (
            visibleBucket.ready ? (
              <IntegrationBuildGrid
                columns={visibleBucket.columns}
                rows={visibleBucket.rows}
                highlightColumnId={visibleBucket.metricId}
                highlightColumnIds={(summaryView.references || [])
                  .filter((ref) => ref.sheetId === visibleBucket.id && ref.row == null)
                  .map((ref) => ref.column.id)}
                referencedCells={(summaryView.references || [])
                  .filter((ref) => ref.sheetId === visibleBucket.id && ref.row != null)
                  .map((ref) => ({ columnId: ref.column.id, row: ref.row }))}
                scrollToken={functionScrollKey}
                formulaEditor={summarySourceEditor || formulaEditorFor(visibleBucket.id, true)}
                onFormulaPick={(pick) => acceptFormulaPick(pick, visibleBucket.id)}
              />
            ) : (
              <div className="flex h-full items-center justify-center rounded-xl border border-border/70 bg-background px-6 text-center text-[13px] leading-relaxed text-muted-foreground shadow-sm">
                Choose a column to bucket. Each group becomes a row on a new Buckets sheet.
              </div>
            )
          ) : sampleActive ? (
            sampleSizeError ? (
              <div className="flex h-full items-center justify-center rounded-xl border border-border/70 bg-background px-6 text-center text-[13px] leading-relaxed text-muted-foreground shadow-sm">
                {sampleSizeError}
              </div>
            ) : (
              <IntegrationBuildGrid
                columns={summarySourceColumns}
                rows={summarySourceRows}
                highlightColumnId={summarySourceGrid.highlight || ""}
                scrollToken={sampleShuffle}
                formulaEditor={summarySourceEditor}
                onFormulaPick={(pick) => acceptFormulaPick(pick, "markets")}
              />
            )
          ) : summaryActive ? (
            <IntegrationBuildGrid
              columns={summaryView.columns}
              rows={summaryView.rows}
              highlightColumnId={summaryFocus.columnId}
              activeCell={summaryFocus}
              scrollToken={functionScrollKey}
              formulaEditor={
                formulaEditing
                  ? {
                      value: summaryFormula,
                      error: summaryView.error,
                      examples: summaryFocus.columnId === "value" ? summaryExamples(summarySourceColumns, summaryMeasure) : [],
                      suggestions: summaryFocus.columnId === "value" ? formulaSuggestions(summaryFormula, formulaCaret) : [],
                      placeholder: summaryFocus.columnId === "label" ? "Label" : undefined,
                      focusToken: formulaFocusToken,
                      row: summaryFocus.row,
                      onChange: updateSummaryInput,
                      onFocus: () => {
                        blurToken.current += 1;
                        setFormulaFocused(true);
                      },
                      onBlur: () => {
                        const token = blurToken.current;
                        window.setTimeout(() => {
                          if (blurToken.current !== token) return;
                          setFormulaFocused(false);
                        }, 220);
                      },
                      onCaret: (caret) => {
                        formulaCaretRef.current = caret;
                        setFormulaCaret(caret);
                      },
                      onPickSuggestion: (item) => {
                        const row = summaryFocus.row;
                        const columnId = summaryFocus.columnId === "label" ? "value" : summaryFocus.columnId;
                        setSummaryCells((current) => {
                          const key = summaryCellKey(columnId, row);
                          const value = current[key] || "";
                          const next = `${value.slice(0, item.from)}${item.name}(${value.slice(item.to)}`;
                          formulaCaretRef.current = item.from + item.name.length + 1;
                          setFormulaCaret(formulaCaretRef.current);
                          return assignSummaryInput(current, row, columnId, next).cells;
                        });
                        if (summaryFocus.columnId === "label") setSummaryFocus({ columnId: "value", row });
                        setFormulaFocused(true);
                        setFormulaFocusToken((token) => token + 1);
                      },
                      onCommit: () => {
                        setFormulaFocused(false);
                        setSummaryFocus((focus) => ({
                          ...focus,
                          row: Math.min(SUMMARY_ROW_COUNT - 1, focus.row + 1),
                        }));
                        setFormulaEditing(true);
                        setFormulaFocusToken((token) => token + 1);
                      },
                    }
                  : null
              }
              onFormulaPick={(pick) => acceptFormulaPick(pick, "summary")}
            />
          ) : showJoinExplainer && liveTraderList ? (
            <TraderJoinExplainer title={KALSHI_TRADER_SOURCE_TITLES[tableId] || "Leaderboard"} joins={traderJoinChoiceList} />
          ) : showJoinExplainer && liveForecast ? (
            <div className="flex h-full items-center justify-center rounded-xl border border-border/70 bg-background px-6 text-center text-[13px] leading-relaxed text-muted-foreground shadow-sm">
              Join the selected events to their event record, candlesticks, or markets. Each join uses that event ticker.
            </div>
          ) : showJoinExplainer && liveEventCandles ? (
            <div className="flex h-full items-center justify-center rounded-xl border border-border/70 bg-background px-6 text-center text-[13px] leading-relaxed text-muted-foreground shadow-sm">
              Every market in these events can join its trades, order book, or candlesticks. Each market gets its own sheet.
            </div>
          ) : showJoinExplainer && (liveSeriesSearch || liveEventSearch) ? (
            <LiveScopeJoinExplainer source={liveEventSearch ? "events" : "series"} />
          ) : showJoinExplainer && polymarketTraderCatalog ? (
            <PolymarketTraderJoinExplainer title={sheetTitle} joins={polymarketJoinCatalog} />
          ) : showJoinExplainer && polymarketJoinCatalog.some((item) => item.id === "parent-market") ? (
            <PolymarketFanoutJoinExplainer title={sheetTitle} />
          ) : showJoinExplainer && polymarketJoinCatalog.length ? (
            <PolymarketLiveJoinExplainer />
          ) : showJoinExplainer && liveMarketFanout ? (
            <FanoutJoinExplainer tableId={tableId} />
          ) : showJoinExplainer ? (
            <JoinExplainer source={tradesQuery ? "trades" : "markets"} venue={polymarketHistorical ? "polymarket" : "kalshi"} live={liveMarketSearch} />
          ) : previewSheet === "event-markets" && liveEventCandles ? (
            eventCandlePreviewMarkets.status === "loading" ? (
              <div className="flex h-full items-center justify-center">
                <SpectrumLoadingState label="Loading markets" />
              </div>
            ) : eventCandlePreviewMarkets.status === "error" ? (
              <p className="text-[13px] text-muted-foreground">{eventCandlePreviewMarkets.error}</p>
            ) : eventCandlePreviewMarkets.rows.length ? (
              <IntegrationBuildGrid
                columns={eventCandlePreviewMarkets.columns}
                rows={eventCandlePreviewMarkets.rows.slice(0, PREVIEW_ROW_CAP)}
                highlightColumnId={eventCandlePreviewMarkets.columns[0]?.id || ""}
              />
            ) : (
              <div className="flex h-full items-center justify-center rounded-xl border border-border/70 bg-background px-6 text-center text-[13px] leading-relaxed text-muted-foreground shadow-sm">
                No markets in this event.
              </div>
            )
          ) : previewSheet === "parent-market" && fanoutJoinOn ? (
            !fanoutTicker ? (
              <div className="flex h-full items-center justify-center rounded-xl border border-border/70 bg-background px-6 text-center text-[13px] leading-relaxed text-muted-foreground shadow-sm">
                This pull has no market ticker yet.
              </div>
            ) : parentLink.status === "loading" || parentLink.status === "idle" ? (
              <div className="flex h-full items-center justify-center">
                <SpectrumLoadingState label="Loading this market" />
              </div>
            ) : parentLink.status === "error" ? (
              <p className="text-[13px] text-muted-foreground">{parentLink.error}</p>
            ) : parentLink.market ? (
              <IntegrationBuildGrid
                columns={parentLink.marketColumns}
                rows={[parentLink.market]}
                highlightColumnId={parentLink.marketColumns[0]?.id || ""}
              />
            ) : (
              <div className="flex h-full items-center justify-center rounded-xl border border-border/70 bg-background px-6 text-center text-[13px] leading-relaxed text-muted-foreground shadow-sm">
                No market metadata for this ticker.
              </div>
            )
          ) : previewSheet === "parent-series" && fanoutJoinOn ? (
            !fanoutTicker ? (
              <div className="flex h-full items-center justify-center rounded-xl border border-border/70 bg-background px-6 text-center text-[13px] leading-relaxed text-muted-foreground shadow-sm">
                This pull has no market ticker yet.
              </div>
            ) : parentLink.status === "loading" || parentLink.status === "idle" ? (
              <div className="flex h-full items-center justify-center">
                <SpectrumLoadingState label="Loading this series" />
              </div>
            ) : parentLink.status === "error" ? (
              <p className="text-[13px] text-muted-foreground">{parentLink.error}</p>
            ) : !parentLink.seriesTicker ? (
              <div className="flex h-full items-center justify-center rounded-xl border border-border/70 bg-background px-6 text-center text-[13px] leading-relaxed text-muted-foreground shadow-sm">
                This market is not part of a series.
              </div>
            ) : parentLink.series ? (
              <IntegrationBuildGrid
                columns={parentLink.seriesColumns}
                rows={[parentLink.series]}
                highlightColumnId={parentLink.seriesColumns[0]?.id || ""}
              />
            ) : (
              <div className="flex h-full items-center justify-center rounded-xl border border-border/70 bg-background px-6 text-center text-[13px] leading-relaxed text-muted-foreground shadow-sm">
                No series row for this market.
              </div>
            )
          ) : previewSheet === "fanout-markets" && fanoutJoinOn ? (
            fanoutSeriesMarketPreview.status === "loading" || fanoutSeriesMarketPreview.status === "idle" ? (
              <div className="flex h-full items-center justify-center">
                <SpectrumLoadingState label="Loading markets" />
              </div>
            ) : fanoutSeriesMarketPreview.status === "error" ? (
              <p className="text-[13px] text-muted-foreground">{fanoutSeriesMarketPreview.error}</p>
            ) : fanoutSeriesMarketPreview.rows.length ? (
              <IntegrationBuildGrid
                columns={fanoutSeriesMarketPreview.columns}
                rows={fanoutSeriesMarketPreview.rows.slice(0, PREVIEW_ROW_CAP)}
                highlightColumnId={fanoutSeriesMarketPreview.columns[0]?.id || ""}
              />
            ) : (
              <div className="flex h-full items-center justify-center rounded-xl border border-border/70 bg-background px-6 text-center text-[13px] leading-relaxed text-muted-foreground shadow-sm">
                No markets in this series.
              </div>
            )
          ) : previewSheet.startsWith("djoin:") ? (
            (() => {
              const kind = previewSheet.slice("djoin:".length);
              const preview = detectedJoinPreview[kind];
              const label = KALSHI_LIVE_MARKET_JOINS.find((item) => item.id === kind)?.title || "data";
              if (!detectedPreviewTicker) {
                return (
                  <div className="flex h-full items-center justify-center rounded-xl border border-border/70 bg-background px-6 text-center text-[13px] leading-relaxed text-muted-foreground shadow-sm">
                    This series has no markets to join.
                  </div>
                );
              }
              if (!preview || preview.status === "loading") {
                return (
                  <div className="flex h-full items-center justify-center">
                    <SpectrumLoadingState label={`Loading ${label.toLowerCase()}`} />
                  </div>
                );
              }
              if (preview.status === "error") return <p className="text-[13px] text-muted-foreground">{preview.error}</p>;
              if (!preview.rows?.length) {
                return (
                  <div className="flex h-full items-center justify-center rounded-xl border border-border/70 bg-background px-6 text-center text-[13px] leading-relaxed text-muted-foreground shadow-sm">
                    No {label.toLowerCase()} rows for {detectedPreviewTicker}.
                  </div>
                );
              }
              return (
                <IntegrationBuildGrid columns={preview.columns} rows={preview.rows} highlightColumnId={preview.columns[0]?.id || ""} />
              );
            })()
          ) : (previewSheet === "trader-join" || previewSheet.startsWith("trader-join:")) && traderJoinOn ? (
            (() => {
              const parts = traderJoinSheetParts(previewSheet);
              const preview = parts ? traderJoinPreview[parts.key] : null;
              if (!traderJoinNames.length) {
                return (
                  <div className="flex h-full items-center justify-center rounded-xl border border-border/70 bg-background px-6 text-center text-[13px] leading-relaxed text-muted-foreground shadow-sm">
                    This list has no nicknames yet.
                  </div>
                );
              }
              if (!preview || preview.status === "loading" || preview.status === "idle") {
                return (
                  <div className="flex h-full items-center justify-center">
                    <SpectrumLoadingState label="Loading this trader" />
                  </div>
                );
              }
              if (preview.status === "error") return <p className="text-[13px] text-muted-foreground">{preview.error}</p>;
              const hiddenPositions = parts?.kind === "positions" && preview.rows.length > 0 && preview.rows.every((row) => row?.visibility === "hidden");
              if (preview.rows.length && !hiddenPositions) {
                return (
                  <IntegrationBuildGrid
                    columns={preview.columns}
                    rows={preview.rows.slice(0, PREVIEW_ROW_CAP)}
                    highlightColumnId={preview.columns[0]?.id || ""}
                  />
                );
              }
              const who = preview.nickname || "this trader";
              return (
                <div className="flex h-full items-center justify-center rounded-xl border border-border/70 bg-background px-6 text-center text-[13px] leading-relaxed text-muted-foreground shadow-sm">
                  {hiddenPositions
                    ? `${who} keeps positions hidden on Kalshi.`
                    : parts?.kind === "trades"
                      ? `No public trades for ${who}.`
                      : parts?.kind === "positions"
                        ? `No positions for ${who}.`
                        : `No profile for ${who}.`}
                </div>
              );
            })()
          ) : previewSheet.startsWith("event-extra:") && relatedExtraOn ? (
            (() => {
              const parts = eventExtraSheetParts(previewSheet);
              const events = forecastJoinOn ? forecastJoinEvents : seriesJoinTickers;
              const ticker = parts?.ticker || events[0]?.ticker || "";
              const preview = parts ? eventExtraPreview[`${parts.kind}:${ticker}`] : null;
              const label = eventRelatedTitle(parts?.kind).toLowerCase();
              if (!events.length) {
                return (
                  <div className="flex h-full items-center justify-center rounded-xl border border-border/70 bg-background px-6 text-center text-[13px] leading-relaxed text-muted-foreground shadow-sm">
                    Search for an event or a series. These joins use those events.
                  </div>
                );
              }
              if (!preview || preview.status === "loading" || preview.status === "idle") {
                return (
                  <div className="flex h-full items-center justify-center">
                    <SpectrumLoadingState label={`Loading ${label}`} />
                  </div>
                );
              }
              if (preview.status === "error") return <p className="text-[13px] text-muted-foreground">{preview.error}</p>;
              if (preview.rows.length) {
                return (
                  <IntegrationBuildGrid
                    columns={preview.columns}
                    rows={preview.rows.slice(0, PREVIEW_ROW_CAP)}
                    highlightColumnId={preview.columns[0]?.id || ""}
                  />
                );
              }
              return (
                <div className="flex h-full items-center justify-center rounded-xl border border-border/70 bg-background px-6 text-center text-[13px] leading-relaxed text-muted-foreground shadow-sm">
                  {parts?.kind === "forecast" && eventExtraOn ? eventForecastMissingNote(preview.skipped) : `No ${label} rows for ${ticker}.`}
                </div>
              );
            })()
          ) : previewSheet === "event-candles-markets" && eventExtraOn ? (
            (() => {
              const preview = eventExtraPreview[`candlesticks:${seriesJoinTickers[0]?.ticker || ""}`];
              if (!preview || preview.status === "loading" || preview.status === "idle") {
                return (
                  <div className="flex h-full items-center justify-center">
                    <SpectrumLoadingState label="Loading markets" />
                  </div>
                );
              }
              if (preview.status === "error") return <p className="text-[13px] text-muted-foreground">{preview.error}</p>;
              const markets = preview.markets || { columns: [], rows: [] };
              if (!markets.rows.length) {
                return (
                  <div className="flex h-full items-center justify-center rounded-xl border border-border/70 bg-background px-6 text-center text-[13px] leading-relaxed text-muted-foreground shadow-sm">
                    No markets in this event.
                  </div>
                );
              }
              return (
                <IntegrationBuildGrid
                  columns={markets.columns}
                  rows={markets.rows.slice(0, PREVIEW_ROW_CAP)}
                  highlightColumnId={markets.columns[0]?.id || ""}
                />
              );
            })()
          ) : seriesMarketSheet && seriesJoinOn ? (
            !seriesJoinTickers.length ? (
              <div className="flex h-full items-center justify-center rounded-xl border border-border/70 bg-background px-6 text-center text-[13px] leading-relaxed text-muted-foreground shadow-sm">
                {liveEventSearch
                  ? "Search for an event or select a status. Markets join uses those events."
                  : "Search for a series or select a category. Markets join uses those series."}
              </div>
            ) : seriesMarketView.status === "loading" || seriesMarketView.status === "idle" ? (
              <div className="flex h-full items-center justify-center">
                <SpectrumLoadingState label="Loading markets" />
              </div>
            ) : seriesMarketView.status === "error" ? (
              <p className="text-[13px] text-muted-foreground">{seriesMarketView.error}</p>
            ) : seriesMarketView.rows.length ? (
              <IntegrationBuildGrid
                columns={seriesMarketView.columns}
                rows={seriesMarketView.rows}
                highlightColumnId={seriesMarketView.columns[0]?.id || ""}
              />
            ) : (
              <div className="flex h-full items-center justify-center rounded-xl border border-border/70 bg-background px-6 text-center text-[13px] leading-relaxed text-muted-foreground shadow-sm">
                No markets for {previewSheet === "series-markets" ? `these ${listPlural}` : seriesMarketView.ticker || `this ${listNoun}`}.
              </div>
            )
          ) : previewSheet === "live:more" || previewSheet.startsWith("live:locked:") ? (
            <LiveJoinPlan
              markets={liveJoinMarkets}
              targets={liveJoinTargets}
              previewTicker={livePreviewTicker}
              focusTicker={liveJoinFocus(previewSheet).ticker}
              focusTarget={liveJoinFocus(previewSheet).target}
            />
          ) : previewSheet.startsWith("mjoin:") && downstreamFromPositions ? (
            (() => {
              const kind = previewSheet.slice("mjoin:".length);
              const preview = downstreamJoinPreview[kind];
              const title = joinSourceTitle(kind);
              const market = downstreamPreviewMarkets[0];
              const label = market?.label || market?.ticker || "this market";
              if (!market) {
                const bearing = liveJoinPreview[downstreamBearingId];
                return (
                  <div className="flex h-full items-center justify-center rounded-xl border border-border/70 bg-background px-6 text-center text-[13px] leading-relaxed text-muted-foreground shadow-sm">
                    {!bearing || bearing.status === "loading"
                      ? "Loading the markets inside this positions pull."
                      : "These rows do not name a market yet."}
                  </div>
                );
              }
              if (!preview || preview.status === "loading") {
                return (
                  <div className="flex h-full items-center justify-center">
                    <SpectrumLoadingState label={`Loading ${title.toLowerCase()}`} />
                  </div>
                );
              }
              if (preview.status === "error") return <p className="text-[13px] text-muted-foreground">{preview.error}</p>;
              if (!preview.rows?.length) {
                return (
                  <div className="flex h-full items-center justify-center rounded-xl border border-border/70 bg-background px-6 text-center text-[13px] leading-relaxed text-muted-foreground shadow-sm">
                    No {title.toLowerCase()} rows for {label}.
                  </div>
                );
              }
              return (
                <IntegrationBuildGrid
                  columns={preview.columns}
                  rows={preview.rows.slice(0, PREVIEW_ROW_CAP)}
                  highlightColumnId={preview.columns[0]?.id || ""}
                />
              );
            })()
          ) : previewSheet.startsWith("live:") && (polymarketJoinActive || liveJoinReady || marketDownstream || (fanoutJoinOn && liveJoinTargets.length)) ? (
            (() => {
              const kind = previewSheet.slice("live:".length);
              const preview = liveJoinPreview[kind];
              const label = joinSourceTitle(kind);
              if (!joinPreviewTicker) {
                const spec = polymarketJoinCatalog.find((item) => item.id === kind);
                return (
                  <div className="flex h-full items-center justify-center rounded-xl border border-border/70 bg-background px-6 text-center text-[13px] leading-relaxed text-muted-foreground shadow-sm">
                    {spec?.anchor === "trader"
                      ? "This pull has no traders to join."
                      : polymarketSeriesCatalog && spec?.anchor === "event"
                        ? "This series pull has no events in the events column."
                        : polymarketJoinActive
                          ? "This pull has no markets to join."
                          : "This pull has no market tickers to join."}
                  </div>
                );
              }
              if (!preview || preview.status === "loading") {
                return (
                  <div className="flex h-full items-start justify-center pt-6">
                    <TaskRows
                      tasks={liveJoinTasks({
                        targets: liveJoinTargets,
                        preview: liveJoinPreview,
                        ticker: joinPreviewTicker,
                        marketTicker: polymarketJoinMarkets[0]?.label || "",
                        traderTicker: polymarketTraderPeople[0]?.label || "",
                        eventTicker: polymarketSeriesEmbeddedEvents[0]?.label || polymarketEventPeople[0]?.label || "",
                        noun: polymarketJoinCatalog.find((item) => item.id === kind)?.anchor === "trader"
                          ? "trader"
                          : polymarketJoinCatalog.find((item) => item.id === kind)?.anchor === "event"
                            ? "event"
                            : "market",
                        marketCount: polymarketJoinCatalog.find((item) => item.id === kind)?.anchor === "trader"
                          ? polymarketTraderPeople.length
                          : polymarketJoinCatalog.find((item) => item.id === kind)?.anchor === "event"
                            ? (polymarketSeriesCatalog ? polymarketSeriesEmbeddedEvents.length : polymarketEventPeople.length)
                            : polymarketJoinActive
                              ? polymarketJoinMarkets.length
                              : liveMarketSearch
                              ? liveJoinMarkets.length
                              : Math.max(seriesMarketView.rows?.length || 0, 1),
                      })}
                    />
                  </div>
                );
              }
              if (preview.status === "error") {
                return <p className="text-[13px] text-muted-foreground">{preview.error}</p>;
              }
              if (!preview.rows?.length) {
                return (
                  <div className="flex h-full items-center justify-center rounded-xl border border-border/70 bg-background px-6 text-center text-[13px] leading-relaxed text-muted-foreground shadow-sm">
                    No {label.toLowerCase()} rows for {joinPreviewTicker}.
                  </div>
                );
              }
              const bearingMerge = polymarketMarketBearingJoin(kind) && downstreamMergePreview.status === "ready" && downstreamMergePreview.columns.length
                ? mergePolymarketJoinRows(preview.columns, preview.rows, downstreamMergePreview.columns, downstreamMergePreview.rows, { anchor: "market" })
                : null;
              const columns = bearingMerge?.columns || preview.columns;
              const rows = bearingMerge?.rows || preview.rows;
              const addedIds = bearingMerge
                ? columns.filter((column) => !preview.columns.some((item) => item.id === column.id)).map((column) => column.id)
                : [];
              return (
                <IntegrationBuildGrid
                  columns={columns}
                  rows={rows}
                  highlightColumnId={addedIds[0] || preview.columns[0]?.id || ""}
                  highlightColumnIds={addedIds}
                  scrollToken={addedIds.join(",")}
                  scrollSmooth={addedIds.length > 0}
                  scrollAlign="start"
                />
              );
            })()
          ) : previewSheet.startsWith("column:") && functionOnNew && newTableGrid.columns.length ? (
            <IntegrationBuildGrid
              columns={newTableGrid.columns}
              rows={newTableGrid.rows}
              highlightColumnId={newTableGrid.highlight}
              scrollToken={functionScrollKey}
              {...referencesFor("new")}
              formulaEditor={summarySourceEditor || formulaEditorFor("new", false) || formulaEditorFor("new", true)}
              onFormulaPick={(pick) => acceptFormulaPick(pick, "new")}
            />
          ) : showJoinSheets && !previewTicker ? (
            <div className="flex h-full items-center justify-center rounded-xl border border-border/70 bg-background px-6 text-center text-[13px] leading-relaxed text-muted-foreground shadow-sm">
              {polymarketHistorical
                ? "This query has no markets with outcome tokens to attach trades to."
                : "This query has no market tickers to attach trades to."}
            </div>
          ) : showJoinSheets && joinTab !== "markets" && joinTab !== previewTicker ? (
            <div className="flex h-full items-center justify-center rounded-xl border border-border/70 bg-background px-6 text-center text-[13px] leading-relaxed text-muted-foreground shadow-sm">
              {PREVIEW_TRADE_LOCK}
            </div>
          ) : showJoinSheets && joinTab === previewTicker && (tradePreview.status === "loading" || tradePreview.status === "error") ? (
            <div className="flex h-full items-center justify-center">
              <JoinTradeSteps
                preview={tradePreview}
                markets={joinedMarkets}
                matchNoun={join?.matchNoun || "ticker"}
                table={`${lakeId}.trades`}
                priced={polymarketHistorical}
              />
            </div>
          ) : showJoinSheets && joinTab === previewTicker && tradesGrid.columns.length ? (
            <IntegrationBuildGrid
              columns={tradesGrid.columns}
              rows={tradesGrid.rows}
              highlightColumnId={tradesGrid.highlight}
              scrollToken={functionScrollKey}
              {...referencesFor("trades")}
              formulaEditor={summarySourceEditor || formulaEditorFor("trades", false) || formulaEditorFor("trades", true)}
              onFormulaPick={(pick) => acceptFormulaPick(pick, "trades")}
            />
          ) : previewSheet === "markets-meta" && tradesJoinReady && joinPlacement === "sheet" ? (
            marketPreview.status === "loading" ? (
              <div className="flex h-full items-center justify-center">
                <SpectrumLoadingState label="Loading market metadata" />
              </div>
            ) : marketPreview.status === "error" ? (
              <p className="text-[13px] text-muted-foreground">{marketPreview.error}</p>
            ) : selectedMarketColumns.length ? (
              <IntegrationBuildGrid
                columns={selectedMarketColumns}
                rows={metadataRows}
                highlightColumnId={selectedMarketColumns[0]?.id || ""}
                highlightColumnIds={
                  summaryOnSource
                    ? (summaryView.references || []).filter((ref) => ref.sheetId === "market-metadata" && ref.row == null).map((ref) => ref.column.id)
                    : selectedMarketColumns.map((column) => column.id)
                }
                scrollToken={functionScrollKey}
                formulaEditor={summarySourceEditor || formulaEditorFor("market-metadata", true)}
                onFormulaPick={(pick) => acceptFormulaPick(pick, "market-metadata")}
              />
            ) : (
              <div className="flex h-full items-center justify-center rounded-xl border border-border/70 bg-background px-6 text-center text-[13px] leading-relaxed text-muted-foreground shadow-sm">
                Choose at least one market column.
              </div>
            )
          ) : pairStreamOn && !streamPairs.length ? (
            <div className="flex h-full items-center justify-center rounded-xl border border-border/70 bg-background px-6 text-center text-[13px] leading-relaxed text-muted-foreground shadow-sm">
              Pick a pair on the left to start streaming. Each pair gets its own sheet.
            </div>
          ) : pairStreamOn && !filteredRows.length ? (
            <div className="flex h-full flex-col gap-3">
              <WaitingToConnectTag />
              <div className="min-h-0 flex-1">
                <SkeletonRows />
              </div>
            </div>
          ) : priceWaiting ? (
            <div className="flex h-full items-center justify-center">
              <WaitingToConnectTag />
            </div>
          ) : polymarketClosedBook ? (
            <ClosedOrderbookExplainer />
          ) : error || polymarketDirected.status === "error" ? (
            <p className="text-[13px] text-muted-foreground">{error || polymarketDirected.error}</p>
          ) : polymarketCenterSearch ? (
            <div className="flex h-full flex-col items-center justify-center rounded-xl border border-border/70 bg-background px-6 shadow-sm">
              <div className="flex w-full max-w-lg flex-col items-center gap-4 text-center">
                <p className="text-[15px] font-medium text-foreground">{polymarketRequirement.prompt}</p>
                <div className="w-full text-left">
                  <PolymarketLiveBuildSearch
                    picks={livePicks}
                    onAdd={addPolymarketPick}
                    onRemove={removeLivePick}
                    entities={polymarketSearch?.entities || ["market"]}
                    placeholder={polymarketSearch?.placeholder || "Search for a market"}
                    acceptAddress={Boolean(polymarketSearch?.acceptAddress)}
                    required
                    tipSide="bottom"
                  />
                </div>
              </div>
            </div>
          ) : centerSearch ? (
            <div data-search-frame="" className="flex h-full flex-col items-center justify-center rounded-xl border border-border/70 bg-background px-6 shadow-sm">
              <div className="flex w-full max-w-lg flex-col items-center gap-4 text-center">
                <p className="text-[15px] font-medium text-foreground">{tickerPrompt}</p>
                <div className="w-full text-left">
                  <KalshiLiveDirectQuery
                    tableId={tableId}
                    picks={livePicks}
                    onAdd={addDirectPick}
                    onRemove={removeLivePick}
                    required={needsTickerSearch}
                    tipSide="bottom"
                  />
                </div>
              </div>
            </div>
          ) : previewSearchError && settledRowCount === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 rounded-xl border border-border/70 bg-background px-6 text-center shadow-sm">
              <p className="text-[13px] leading-relaxed text-muted-foreground">{previewSearchError}</p>
              <Button type="button" variant="outline" onClick={refreshPreview}>
                Refresh
              </Button>
            </div>
          ) : loading || emptyRefresh || livePickAwaitingRows || liveScanWaiting || polymarketScanWaiting || directLoading || (polymarketDirected.status === "loading" && !(tableId === "getBiggestWinners" && (polymarketDirected.rows || []).length)) ? (
            <div className="flex h-full flex-col gap-3">
              {isPriceStreamIntegration(integrationId) ? <WaitingToConnectTag /> : null}
              {livePickAwaitingRows ? (
                <p className="text-[13px] text-muted-foreground">Loading data</p>
              ) : emptyRefresh ? (
                <p className="text-[13px] text-muted-foreground">Searching for matching rows</p>
              ) : null}
              {liveRemovalTape}
              {polymarketRemovalTape}
              {biggestWinnersTape}
              <div className="min-h-0 flex-1">
                <SkeletonRows />
              </div>
            </div>
          ) : previewIsEmpty ? (
            <div className="flex h-full flex-col">
              {liveRemovalTape}
              {polymarketRemovalTape}
              {biggestWinnersTape}
              <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-border/70 bg-background px-6 text-center shadow-sm">
                <p className="max-w-md text-[13px] leading-relaxed text-muted-foreground">{liveEmptyLine}</p>
                {tickerPrompt || polymarketClosedSheet ? null : (
                  <Button type="button" variant="outline" onClick={refreshPreview}>
                    Refresh
                  </Button>
                )}
              </div>
            </div>
          ) : marketsGrid.columns.length ? (
            <div className="flex h-full min-h-0 flex-col animate-in fade-in duration-300 ease-out motion-reduce:animate-none">
              {liveRemovalTape}
              {polymarketRemovalTape}
              {biggestWinnersTape}
              <div className="min-h-0 flex-1">
            <IntegrationBuildGrid
              columns={marketsGrid.columns}
              rows={marketsGrid.rows}
              flashColumnIds={flashColumns}
              flashRowKey={pairStreamOn ? "time" : ""}
              flashRowValues={pairStreamOn ? pairStreams[activeStreamPair]?.fresh || null : null}
              highlightColumnId={flashColumns[0] || marketsGrid.highlight || mergeAddedIds[0] || (tradesJoinReady && joinPlacement === "merge" ? tradeJoinBase.highlightIds[0] || "" : "")}
              highlightColumnIds={
                summaryOnSource
                  ? (summaryView.references || []).filter((ref) => ref.sheetId === "markets" && ref.row == null).map((ref) => ref.column.id)
                  : mergeAddedIds.length
                    ? mergeAddedIds
                    : tradesJoinReady && joinPlacement === "merge"
                      ? tradeJoinBase.highlightIds
                      : []
              }
              referencedCells={
                summaryOnSource
                  ? (summaryView.references || []).filter((ref) => ref.sheetId === "markets" && ref.row != null).map((ref) => ({ columnId: ref.column.id, row: ref.row }))
                  : referencesFor("markets").referencedCells
              }
              scrollToken={flashColumns.length ? `flash-${flashToken}` : mergeAddedIds.length ? mergeAddedIds.join(",") : functionScrollKey}
              scrollSmooth={flashColumns.length > 0 || mergeAddedIds.length > 0}
              scrollAlign={flashColumns.length || mergeAddedIds.length ? "start" : "end"}
              {...(summaryOnSource ? {} : referencesFor("markets"))}
              formulaEditor={summarySourceEditor || formulaEditorFor("markets", false) || formulaEditorFor("markets", true)}
              onFormulaPick={(pick) => acceptFormulaPick(pick, "markets")}
            />
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center rounded-xl border border-border/70 bg-background text-[13px] text-muted-foreground shadow-sm">
              Select at least one column to preview.
            </div>
          )}
        </div>
      </section>
      {seriesBrowsePrompt ? (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 p-6">
          <div
            role="dialog"
            aria-labelledby="series-browse-title"
            className="w-full max-w-md rounded-xl border border-border/70 bg-background p-6 shadow-sm"
          >
            <h2 id="series-browse-title" className="text-[15px] font-semibold text-foreground">
              Join markets for every series?
            </h2>
            <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
              You haven&apos;t selected a specific series yet. Would you like to join markets for all series in your sheet? Your plan
              limit allows for {marketCap.toLocaleString()} sheet joins at once.
            </p>
            <div className="mt-5 flex items-center justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setSeriesBrowsePrompt(false)}>
                Cancel
              </Button>
              <Button type="button" className="bg-[#0d99ff] text-white hover:bg-[#0d99ff]/90" onClick={confirmSeriesBrowse}>
                Join all series
              </Button>
            </div>
          </div>
        </div>
      ) : null}
      {sampleSavePrompt ? (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 p-6">
          <div
            role="dialog"
            aria-labelledby="sample-save-title"
            className="w-full max-w-md rounded-xl border border-border/70 bg-background p-6 shadow-sm"
          >
            <h2 id="sample-save-title" className="text-[15px] font-semibold text-foreground">
              Save the parent dataset too?
            </h2>
            <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
              The random sample is drawn from this query. Save both sheets, or save only the sample. The sample keeps the parent query, so a later seeded or unseeded pull can run on the same filters.
            </p>
            <div className="mt-5 flex items-center justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setSampleSavePrompt(false)}>
                Cancel
              </Button>
              <Button type="button" variant="outline" onClick={() => confirmSampleSave("sample")}>
                Sample only
              </Button>
              <Button type="button" className="bg-[#0d99ff] text-white hover:bg-[#0d99ff]/90" onClick={() => confirmSampleSave("both")}>
                Parent and sample
              </Button>
            </div>
          </div>
        </div>
      ) : null}
      {placementPrompt === "members" ? (
        <LandingDemoMembersOnlyDialog onBack={backFromMembersPrompt} onUpgrade={closePlacementPrompt} />
      ) : placementPrompt ? (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 p-6">
          <div
            role="dialog"
            aria-labelledby="pull-destination-title"
            className="w-full max-w-md rounded-xl border border-border/70 bg-background p-6 shadow-sm"
          >
            <h2 id="pull-destination-title" className="text-[15px] font-semibold text-foreground">
              This tab already has data
            </h2>
            <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
              Place this pull on the same tab, under what is already here, or start a new tab for it.
            </p>
            <div className="mt-5 flex items-center justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setPlacementPrompt(false)}>
                Cancel
              </Button>
              <Button type="button" variant="outline" onClick={() => choosePlacement("same")}>
                Same tab
              </Button>
              <Button type="button" className="bg-[#0d99ff] text-white hover:bg-[#0d99ff]/90" onClick={() => choosePlacement("new")}>
                New tab
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
