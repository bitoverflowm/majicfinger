"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ChevronDown, History, Info } from "lucide-react";
import { IntegrationBuildGrid } from "@/components/dashboardComposer/integrationBuildGrid";
import { displayMatrix } from "@/components/dashboardComposer/integrationRunSheets";
import { rememberTradeSheet } from "@/components/dashboardComposer/fullTradeSheet";
import { FunctionExplainer, FunctionExplainerTabs } from "@/components/dashboardComposer/integrationFunctionExplainer";
import { SummarizeExplainer, SummarizeExplainerTabs } from "@/components/dashboardComposer/integrationSummarizeExplainer";
import { BucketExplainer, BucketExplainerTabs } from "@/components/dashboardComposer/integrationBucketExplainer";
import { SampleExplainer } from "@/components/dashboardComposer/integrationSampleExplainer";
import { BucketEnrichPanel, SampleEnrichPanel } from "@/components/dashboardComposer/integrationEnrichPanels";
import { JoinExplainer, JoinExplainerTabs } from "@/components/dashboardComposer/integrationJoinExplainer";
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
  loadKalshiLiveMarketsForScope,
  kalshiHistoricalMarketColumnList,
  loadAthenaComposeRows,
  peekBuildUniverseCount,
  usesExactUniverse,
} from "@/components/dashboardComposer/integrationBuildCatalog";
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
  buildAttributePredicates,
  rowMatchesAttributes,
  sortAttributeRows,
  sortSummary,
} from "@/components/dashboardComposer/integrationAttributes";
import { MarketScanSteps } from "@/components/dashboardComposer/liveFilterTape";
import { integrationProfile } from "@/components/dashboardComposer/integrationSource";
import { requestCardForSheet, stampRunSheets } from "@/components/dashboardComposer/integrationProvenance";
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
import { KalshiLiveMarketPicker, kalshiLiveMarketAttributeColumns } from "@/components/dashboardComposer/kalshiLiveMarketPicker";
import { KalshiLiveDirectQuery } from "@/components/dashboardComposer/kalshiLiveDirectQuery";
import {
  defaultKalshiLiveDirectQuery,
  directMarketTickers,
  directSeriesTickers,
  isKalshiLiveDirectTable,
  kalshiLiveDirectScopeError,
  kalshiLiveSeriesAttributeColumns,
  seriesDiscoveryCategories,
  seriesUpdatedAfter,
} from "@/components/dashboardComposer/kalshiLiveDirectScope";
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

const PREVIEW_JOIN_LOCK =
  "Preview shows the first market. Run the pull to build a sheet for every market in this join.";

function liveJoinSheetNote(marketCount, sourceCount) {
  const markets = Number(marketCount) || 0;
  const sources = Number(sourceCount) || 0;
  const sheets = markets * sources;
  if (!sheets) return PREVIEW_JOIN_LOCK;
  const sourceLabel = sources === 1 ? "1 source" : `${sources} sources`;
  const marketLabel = markets === 1 ? "1 market" : `${markets.toLocaleString()} markets`;
  return `${sheets.toLocaleString()} sheets: ${sourceLabel} for each of ${marketLabel}. Preview shows the first market. Run the pull to build the rest.`;
}

const FUNCTION_COLUMN_ID = "__function";

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

function sheetTabClass(selected) {
  return cn(
    "relative -ml-px max-w-[11rem] shrink-0 truncate border border-border/70 px-2 py-1 text-left text-[11px] font-medium leading-none first:ml-0",
    selected
      ? "z-10 border-[#0d99ff] bg-[#0d99ff]/10 text-[#0d99ff]"
      : "bg-background text-muted-foreground hover:text-foreground",
  );
}

function JoinSheetTabs({ markets, active, previewTicker, sheetCount, onSelect, extras = [] }) {
  const frameRef = useRef(null);
  const measureRef = useRef(null);
  const [shownTrades, setShownTrades] = useState(markets.length);
  const totalSheets = Math.max(Number(sheetCount) || 0, markets.length);
  const marketKey = markets.map((market) => market.ticker).join("\n");

  useLayoutEffect(() => {
    const frame = frameRef.current;
    const measure = measureRef.current;
    if (!frame || !measure) return undefined;
    const fit = () => {
      const available = frame.clientWidth;
      const nodes = [...measure.querySelectorAll("[data-tab]")];
      const plusWidth = measure.querySelector("[data-plus]")?.offsetWidth || 0;
      const extraWidth = [...measure.querySelectorAll("[data-extra]")].reduce((sum, node) => sum + node.offsetWidth, 0);
      const marketWidth = nodes[0]?.offsetWidth || 0;
      const tradeWidths = nodes.slice(1).map((node) => node.offsetWidth);
      let best = 0;
      for (let count = 0; count <= tradeWidths.length; count += 1) {
        const hidden = totalSheets - count;
        const width =
          marketWidth +
          extraWidth +
          tradeWidths.slice(0, count).reduce((sum, value) => sum + value, 0) +
          (hidden > 0 ? plusWidth : 0);
        if (width <= available + 1) best = count;
        else break;
      }
      setShownTrades(best);
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(frame);
    return () => observer.disconnect();
  }, [marketKey, totalSheets, extras.length]);

  const visible = markets.slice(0, shownTrades);
  const hidden = Math.max(0, totalSheets - visible.length);
  const extraIds = new Set(extras.map((tab) => tab.id));
  const plusSelected = hidden > 0 && active !== "markets" && !extraIds.has(active) && !visible.some((market) => market.ticker === active);

  return (
    <div ref={frameRef} className="relative overflow-hidden px-4 pb-1 pt-4">
      <div ref={measureRef} className="pointer-events-none invisible absolute left-0 top-0 flex" aria-hidden>
        <button type="button" data-tab className={sheetTabClass(false)}>
          Markets
        </button>
        {extras.map((tab) => (
          <button key={tab.id} type="button" data-extra className={sheetTabClass(false)}>
            {tab.title}
          </button>
        ))}
        {markets.map((market) => (
          <button key={market.ticker} type="button" data-tab className={sheetTabClass(false)}>
            Trades · {market.label || market.ticker}
          </button>
        ))}
        <button type="button" data-plus className={sheetTabClass(false)}>
          +{totalSheets}
        </button>
      </div>
      <div className="flex animate-[fadeIn_280ms_ease-out]">
        <button type="button" onClick={() => onSelect("markets")} className={sheetTabClass(active === "markets")}>
          Markets
        </button>
        {extras.map((tab) => (
          <button key={tab.id} type="button" onClick={() => onSelect(tab.id)} className={sheetTabClass(active === tab.id)}>
            {tab.title}
          </button>
        ))}
        {visible.map((market) => (
          <button
            key={market.ticker}
            type="button"
            title={market.ticker === previewTicker ? market.title : PREVIEW_TRADE_LOCK}
            onClick={() => onSelect(market.ticker)}
            className={sheetTabClass(active === market.ticker)}
          >
            Trades · {market.label || market.ticker}
          </button>
        ))}
        {hidden > 0 ? (
          <button type="button" title={PREVIEW_TRADE_LOCK} onClick={() => onSelect("more")} className={sheetTabClass(plusSelected || active === "more")}>
            +{hidden}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function liveJoinTasks({ targets, preview, ticker, marketCount }) {
  const count = Number(marketCount) || 0;
  const tasks = [
    {
      id: "markets",
      title: count === 1 ? "1 market matched" : `${count.toLocaleString()} markets matched`,
      detail: ticker,
      status: "completed",
      note: `The preview joins the first market, ${ticker}. The other markets are attached when you run the pull.`,
    },
  ];
  for (const target of targets || []) {
    const state = preview?.[target.id];
    const status = state?.status === "ready" ? "completed" : state?.status === "error" ? "failed" : "running";
    const rows = Array.isArray(state?.rows) ? state.rows.length : 0;
    const live = isRealtimeEnabled("kalshiLive", target.id);
    tasks.push({
      id: target.id,
      title: `${target.title} for ${ticker}`,
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
        live: isRealtimeEnabled("kalshiLive", target.id),
        previewable,
      });
    }
  }
  return sheets;
}

function LiveJoinTabButton({ sheet, selected, onClick, title, measure = false }) {
  return (
    <button
      type="button"
      data-tab={measure ? "" : undefined}
      title={title || sheet.title}
      onClick={onClick}
      className={cn(sheetTabClass(selected), "inline-flex max-w-[14rem] items-center gap-1.5")}
    >
      <span className="min-w-0 truncate">{sheet.title}</span>
      {sheet.live ? (
        <span className="shrink-0 rounded-full bg-emerald-500/15 px-1.5 py-px text-[8px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
          Live
        </span>
      ) : null}
    </button>
  );
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
          const live = isRealtimeEnabled("kalshiLive", target.id);
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

function LiveJoinTabs({ targets, markets, active, previewTicker, onSelect }) {
  const frameRef = useRef(null);
  const measureRef = useRef(null);
  const sheets = liveJoinSheets(targets, markets, previewTicker);
  const sheetKey = sheets.map((sheet) => sheet.key).join("\n");
  const [shown, setShown] = useState(sheets.length);
  const note = liveJoinSheetNote(markets?.length || 0, targets?.length || 0);

  useLayoutEffect(() => {
    const frame = frameRef.current;
    const measure = measureRef.current;
    if (!frame || !measure) return undefined;
    const fit = () => {
      const available = frame.clientWidth;
      const marketWidth = measure.querySelector("[data-markets]")?.offsetWidth || 0;
      const widths = [...measure.querySelectorAll("[data-tab]")].map((node) => node.offsetWidth);
      const plusWidth = measure.querySelector("[data-plus]")?.offsetWidth || 0;
      let best = 0;
      for (let count = 0; count <= widths.length; count += 1) {
        const hidden = widths.length - count;
        const width = marketWidth + widths.slice(0, count).reduce((sum, value) => sum + value, 0) + (hidden > 0 ? plusWidth : 0);
        if (width <= available + 1) best = count;
        else break;
      }
      setShown(best);
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(frame);
    return () => observer.disconnect();
  }, [sheetKey]);

  const visible = sheets.slice(0, shown);
  const hidden = Math.max(0, sheets.length - visible.length);
  const plusSelected = hidden > 0 && (active === "live:more" || String(active).startsWith("live:locked:")) && !visible.some((sheet) => sheet.selectId === active);

  return (
    <div ref={frameRef} className="relative overflow-hidden px-4 pb-1 pt-4">
      <div ref={measureRef} className="pointer-events-none invisible absolute left-0 top-0 flex" aria-hidden>
        <button type="button" data-markets className={sheetTabClass(false)}>
          Markets
        </button>
        {sheets.map((sheet) => (
          <LiveJoinTabButton key={sheet.key} sheet={sheet} selected={false} measure />
        ))}
        <button type="button" data-plus className={sheetTabClass(false)}>
          +{sheets.length}
        </button>
      </div>
      <div className="flex animate-[fadeIn_280ms_ease-out]">
        <button type="button" onClick={() => onSelect("source")} className={sheetTabClass(active === "source")}>
          Markets
        </button>
        {visible.map((sheet) => (
          <LiveJoinTabButton
            key={sheet.key}
            sheet={sheet}
            selected={active === sheet.selectId}
            title={sheet.previewable ? sheet.title : note}
            onClick={() => onSelect(sheet.selectId)}
          />
        ))}
        {hidden > 0 ? (
          <button
            type="button"
            title="Sheets created when you run the pull"
            onClick={() => onSelect("live:more")}
            className={sheetTabClass(plusSelected || active === "live:more")}
          >
            +{hidden}
          </button>
        ) : null}
      </div>
    </div>
  );
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
  if (tabs.length < 2) return null;
  return (
    <div className="overflow-hidden px-4 pb-1 pt-4">
      <div className="flex">
        {tabs.map((tab) => (
          <button key={tab.id} type="button" onClick={() => onSelect(tab.id)} className={sheetTabClass(active === tab.id)}>
            {tab.title}
          </button>
        ))}
      </div>
    </div>
  );
}

function EnrichStep({
  onBack,
  picked,
  onPick,
  joinTarget,
  onJoinTarget,
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
  liveJoinIds,
  onToggleLiveJoin,
  onSelectAllLiveJoins,
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
  const liveSelected = liveJoinIds instanceof Set ? liveJoinIds : new Set();
  const liveJoinTitles = KALSHI_LIVE_MARKET_JOINS.filter((item) => liveSelected.has(item.id)).map((item) => item.title);
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
                      liveJoin
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
                <input
                  type="checkbox"
                  value={option.id}
                  checked={selected}
                  onChange={() => onPick(option.id)}
                  className="size-3.5 accent-[#0d99ff]"
                />
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
                      {liveJoin ? (
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
                          {KALSHI_LIVE_MARKET_JOINS.map((item) => {
                            const on = liveSelected.has(item.id);
                            return (
                              <button
                                key={item.id}
                                type="button"
                                aria-pressed={on}
                                onClick={() => onToggleLiveJoin?.(item.id)}
                                className={cn(
                                  "flex w-full flex-col rounded-lg border px-2.5 py-2 text-left transition-colors",
                                  on
                                    ? "border-[#0d99ff]/40 bg-[#0d99ff]/10"
                                    : "border-border/70 bg-background hover:bg-muted/50",
                                )}
                              >
                                <span className="text-[13px] font-semibold text-foreground">{item.title}</span>
                                <span className="text-[11px] font-normal text-muted-foreground">{item.detail}</span>
                              </button>
                            );
                          })}
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
                      ) : liveJoin ? null : (
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
  const [liveJoinIds, setLiveJoinIds] = useState(() => new Set());
  const [liveJoinPreview, setLiveJoinPreview] = useState({});
  const [joinPlacement, setJoinPlacement] = useState("");
  const [metadataTab, setMetadataTab] = useState("trades");
  const [marketColumnHidden, setMarketColumnHidden] = useState(() => defaultMarketColumnHidden(kalshiHistoricalMarketColumnList()));
  const [marketPreview, setMarketPreview] = useState({ status: "idle", key: "", columns: [], rows: [], error: "" });
  const [joinTab, setJoinTab] = useState("markets");
  const [tradePreview, setTradePreview] = useState({ status: "idle", ticker: "", columns: [], rows: [], error: "" });
  const [running, setRunning] = useState(false);
  const [placementPrompt, setPlacementPrompt] = useState(false);
  const placementRef = useRef({ pageId: "", append: false });
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
  const [liveScan, setLiveScan] = useState({ status: "idle", rows: [], error: "", exhausted: true, truncated: false });
  const liveFetchRef = useRef(new Set());
  const [universe, setUniverse] = useState(null);
  const [counting, setCounting] = useState(false);
  const formulaCaretRef = useRef(0);
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
    ? tableIds.filter((id) => (groupId === "realtime" ? tables[id].realtime : tables[id].group === groupId))
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
  const venueLabel = profile.historical ? profile.label : "Historical";
  const lakeId = profile.lakeId || "";
  const guidedFilters = profile.guidedTables.includes(tableId);
  const liveMarketSearch = integrationId === "kalshiLive" && tableId === "markets";
  const liveSeriesSearch = integrationId === "kalshiLive" && tableId === "series";
  const liveDirect = integrationId === "kalshiLive" && isKalshiLiveDirectTable(tableId);

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

  function selectGroup(nextGroup) {
    setGroupId(nextGroup);
    const ids = tableIds.filter((id) =>
      nextGroup === "realtime" ? tables[id].realtime : tables[id].group === nextGroup,
    );
    if (!ids.includes(tableId)) setTableId(ids[0] || tableId);
  }

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    setError("");
    setPriceWaiting(false);
    setProgress(12);
    setPull(null);
    setVisibleCount(0);
    setFilterValue("");
    setAttributeFilters({});
    setSortKeys([]);
    setRowLimit("");
    setLivePicks([]);
    setDirectQuery(defaultKalshiLiveDirectQuery(tableId));
    setDirectPreview({ status: "idle", rows: [], error: "", ticker: "" });
    setLiveScan({ status: "idle", rows: [], error: "", exhausted: true, truncated: false });
    liveFetchRef.current = new Set();
    setPreviewRefreshing(false);
    usingFilteredSample.current = false;
    setUniverse(null);
    setCounting(usesExactUniverse(integrationId));
    const timer = window.setInterval(() => {
      setProgress((current) => (current >= 88 ? current : current + Math.random() * 8));
    }, 280);
    loadBuildPreview(integrationId, tableId)
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
        const priceFeed = integrationId === "chainlink" || integrationId === "binance";
        if (priceFeed && /live price/i.test(message)) {
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
  const seriesAttributeColumns = useMemo(
    () =>
      liveSeriesSearch
        ? kalshiLiveSeriesAttributeColumns(pull?.columns || [], seriesCategoryState.categories, {
            loading: seriesCategoryState.status === "loading",
          })
        : [],
    [liveSeriesSearch, pull?.columns, seriesCategoryState],
  );
  const seriesCategories = seriesDiscoveryCategories(attributeFilters);
  const seriesCategoryKey = seriesCategories.join("\0");
  const seriesMinUpdatedTs = seriesUpdatedAfter(attributeFilters);
  const seriesProductMetadata = liveSeriesSearch && !hidden.has("product_metadata");
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

  function addDirectPick(pick) {
    if (tableId === "series" && pick?.kind === "series") {
      setLivePicks((prev) => (prev.some((item) => item.id === pick.id) ? prev : [...prev, { ...pick, status: "ready", rows: [], error: "" }]));
      return;
    }
    addLivePick(pick);
  }

  const directMarkets = useMemo(
    () => (liveDirect && tableId !== "series" ? directMarketTickers(livePicks) : []),
    [liveDirect, livePicks, tableId],
  );
  const directSeries = useMemo(
    () => (liveDirect && tableId === "series" ? directSeriesTickers(livePicks) : []),
    [liveDirect, livePicks, tableId],
  );

  useEffect(() => {
    if (!liveDirect) return undefined;
    const ticker = directMarkets[0]?.ticker || "";
    if (tableId === "series") {
      if (!directSeries.length && !seriesCategories.length) {
        setDirectPreview({ status: "idle", rows: [], error: "", ticker: "" });
        return undefined;
      }
    } else if (!ticker) {
      setDirectPreview({ status: "idle", rows: [], error: "", ticker: "" });
      return undefined;
    }
    let cancel = false;
    setDirectPreview({ status: "loading", rows: [], error: "", ticker });
    const seriesPreviewCap = 500;
    const spec =
      tableId === "series"
        ? directSeries.length
          ? { mode: "tickers", tickers: directSeries, limit: seriesPreviewCap }
          : {
              mode: "discover",
              categories: seriesCategories,
              includeProductMetadata: seriesProductMetadata,
              minUpdatedTs: seriesMinUpdatedTs,
              limit: seriesPreviewCap,
            }
        : {
            ticker,
            minTs: directQuery.minTs,
            maxTs: directQuery.maxTs,
            period: directQuery.period,
            depth: Number(directQuery.depth),
            limit: PREVIEW_ROW_CAP,
          };
    loadKalshiLiveDirect(tableId, spec)
      .then((result) => {
        if (cancel) return;
        const rows = result?.rows || [];
        setDirectPreview({ status: "ready", rows, error: "", ticker: ticker || directSeries[0] || "" });
        setVisibleCount(rows.length);
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
    return () => {
      cancel = true;
    };
  }, [directMarkets, directQuery, directSeries, liveDirect, seriesCategoryKey, seriesMinUpdatedTs, seriesProductMetadata, tableId]);

  const filteredRows = useMemo(() => {
    if (liveDirect && tableId === "series" && directPreview.status === "ready") {
      const matched = (directPreview.rows || []).filter((row) =>
        rowMatchesAttributes(row, seriesAttributeColumns, attributeFilters),
      );
      const sorted = sortAttributeRows(matched, seriesAttributeColumns, sortKeys);
      const requested = Number(rowLimit);
      const capped = Number.isFinite(requested) && requested > 0 ? sorted.slice(0, requested) : sorted;
      return capped.slice(0, visibleCount);
    }
    if (liveDirect && directPreview.status !== "idle") return (directPreview.rows || []).slice(0, visibleCount);
    if (livePreviewRows) return livePreviewRows.slice(0, visibleCount);
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
    if (!query || !filterColumn) return rows;
    return rows.filter((row) => String(row[filterColumn] ?? "").toLowerCase().includes(query));
  }, [directPreview.rows, directPreview.status, pull, visibleCount, filterColumn, filterValue, guidedFilters, attributeFilters, sortKeys, rowLimit, integrationId, tableId, settledPreviewKey, previewSearchError, livePreviewRows, liveMarketSearch, liveDirect, liveNarrowing, seriesAttributeColumns]);

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

  useEffect(() => {
    if (joinTarget !== joinTradesTarget || !previewTicker) {
      if (!previewTicker) setTradePreview({ status: "idle", ticker: "", columns: [], rows: [], error: "" });
      return undefined;
    }
    const load = join?.loadTrades({ ticker: previewTicker, tokens: previewTokenKey ? previewTokenKey.split("|") : [] });
    if (!load) return undefined;
    let cancel = false;
    setJoinTab(previewTicker);
    setTradePreview({ status: "loading", ticker: previewTicker, columns: [], rows: [], error: "" });
    load
      .then((result) => {
        if (cancel) return;
        setTradePreview({ status: "ready", ticker: previewTicker, columns: result.columns, rows: result.rows, error: "" });
      })
      .catch((err) => {
        if (cancel) return;
        setTradePreview({
          status: "error",
          ticker: previewTicker,
          columns: [],
          rows: [],
          error: err instanceof Error ? err.message : "Trades preview failed",
        });
      });
    return () => {
      cancel = true;
    };
  }, [join, joinTarget, joinTradesTarget, previewTicker, previewTokenKey]);

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

  function toggleColumn(id) {
    setHidden((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllColumns() {
    setHidden(new Set());
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
    setLiveJoinPreview({});
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
  const emptyRefresh =
    !loading &&
    shownColumns.length > 0 &&
    settledRowCount === 0 &&
    (searchingPreview || reloadingUnfiltered || previewRefreshing);

  function refreshPreview() {
    setPreviewRefreshNonce((nonce) => nonce + 1);
  }
  const livePickAwaitingRows = liveMarketSearch && !loading && shown === 0 && livePicks.some((pick) => pick.status === "loading");
  const liveScanWaiting = liveMarketSearch && liveScan.status === "loading" && shown === 0;
  const directLoading = liveDirect && directPreview.status === "loading";
  const directExtra =
    liveDirect && directPreview.status === "ready" && tableId !== "series" && directMarkets.length > 1
      ? ` The other ${directMarkets.length - 1} ${directMarkets.length === 2 ? "market is" : "markets are"} pulled when you run.`
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
  const shownLabel = `Previewing ${shown.toLocaleString()} ${shown === 1 ? "row" : "rows"}`;
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
  const previewIsEmpty = previewSampleEmpty || liveSettledEmpty;
  const previewLine = loading
    ? "Loading the first 50 rows"
    : liveDirect && directPreview.status === "error"
      ? directPreview.error
      : liveDirect && directPreview.status === "loading"
        ? "Loading this pull"
        : liveDirect && directPreview.status === "ready"
          ? `Previewing ${shown.toLocaleString()} ${shown === 1 ? "row" : "rows"}.${directExtra}`
    : liveScan.status === "error" && !liveScan.rows?.length
      ? liveScan.error
      : liveMatchedRows
        ? livePickAwaitingRows
          ? "Loading data"
          : liveUpdating
            ? liveScan.waiting
              ? liveScan.note || "Slowing down."
              : shown
                ? `${shownLabel} of ${liveMatchedRows.length.toLocaleString()} matching`
                : "Checking markets"
            : liveScan.status === "error"
              ? `${liveScan.error} ${liveMatchedRows.length.toLocaleString()} matching ${liveMatchedRows.length === 1 ? "row" : "rows"} kept.`
              : `Previewing ${shown.toLocaleString()} of ${liveMatchedRows.length.toLocaleString()} matching ${liveMatchedRows.length === 1 ? "row" : "rows"}.${liveScanNote}`
        : !exactUniverse
      ? `${shownLabel} of 1,000,000+ rows available`
      : typeof universe === "number" && !counting
        ? `${shownLabel} of ${universe.toLocaleString()}`
        : counting
          ? `${shownLabel} of …`
          : `${shownLabel}. More rows are available.`;
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
  const liveEmptyLine =
    liveMarketSearch && liveScan.truncated
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
  const availableRows = previewIsEmpty
    ? 0
    : liveMatchedRows
      ? liveMatchedRows.length
      : !exactUniverse
        ? Number.POSITIVE_INFINITY
        : typeof universe === "number" && !counting
          ? universe
          : null;
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
      markets.push({
        ticker,
        label: ticker,
        title: String(row?.yes_sub_title || ticker),
      });
    }
    return markets;
  }, [liveMarketSearch, liveMatchedRows, filteredRows]);
  const liveJoinMarkets = liveJoinList.slice(0, marketCap);
  const liveJoinKey = [...liveJoinIds].sort().join(",");
  const liveJoinTargets = KALSHI_LIVE_MARKET_JOINS.filter((item) => liveJoinIds.has(item.id));
  const livePreviewTicker = liveJoinMarkets[0]?.ticker || "";

  useEffect(() => {
    if (!liveMarketSearch || step !== "enrich" || !enrichPicks.has("join") || !liveJoinKey || !livePreviewTicker) {
      setLiveJoinPreview((current) => (Object.keys(current).length ? {} : current));
      return undefined;
    }
    let cancel = false;
    const ids = liveJoinKey.split(",");
    setLiveJoinPreview(() => {
      const next = {};
      for (const id of ids) next[id] = { status: "loading", columns: [], rows: [], error: "" };
      return next;
    });
    Promise.all(
      ids.map(async (id) => {
        try {
          const result = await loadKalshiLiveMarketJoin(id, livePreviewTicker, PREVIEW_ROW_CAP);
          if (cancel) return;
          setLiveJoinPreview((current) => ({
            ...current,
            [id]: { status: "ready", columns: result.columns || [], rows: result.rows || [], error: "" },
          }));
        } catch (err) {
          if (cancel) return;
          setLiveJoinPreview((current) => ({
            ...current,
            [id]: {
              status: "error",
              columns: [],
              rows: [],
              error: err instanceof Error ? err.message : "Join preview failed",
            },
          }));
        }
      }),
    );
    return () => {
      cancel = true;
    };
  }, [liveMarketSearch, step, enrichPicks, liveJoinKey, livePreviewTicker]);

  const showSampleExplainer = step === "enrich" && hoverSample && !enrichPicks.has("sample");
  const showBucketExplainer = step === "enrich" && hoverBucket && !enrichPicks.has("bucket") && !showSampleExplainer;
  const showSummarizeExplainer = step === "enrich" && hoverSummarize && !enrichPicks.has("summarize") && !showSampleExplainer && !showBucketExplainer;
  const showFunctionExplainer =
    step === "enrich" && hoverFunction && !enrichPicks.has("function") && !showSummarizeExplainer && !showSampleExplainer && !showBucketExplainer;
  const liveJoinReady = liveMarketSearch && joinOn && liveJoinTargets.length > 0;
  const showJoinExplainer =
    (historicalEnrich || liveMarketSearch) &&
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
  const sampleActive = sampleOn && !enrichExplainer && previewSheet === "source";
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
  const marketsGrid = applyFunctionColumns(
    tradeJoinBase.columns,
    tradeJoinBase.rows,
    functionsForSheet("markets"),
    formulaSheets,
    "markets",
    activeFunction?.id,
  );
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
    if (showSampleExplainer) return "Illustration. A random subset of this query is drawn when you run the pull.";
    if (showBucketExplainer) return "Illustration. The bucket sheet is created when you run the pull.";
    if (sampleActive) {
      if (sampleSizeError) return sampleSizeError;
      const shown = samplePreviewRows.length;
      return `Previewing ${shown.toLocaleString()} of the rows on screen. Save and run draws ${sampleSizeNumber.toLocaleString()} ${sampleMode === "seeded" ? "seeded" : "new"} rows from ${historicalLake ? "the full query" : "the imported rows"}.`;
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
      return tradesQuery
        ? "Illustration. No market metadata is loaded until you run the pull."
        : "Illustration. No trades are loaded until you run the pull.";
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

  function marketsRequestForRun() {
    let request = lockedQuery?.athena || athenaRequest();
    if (enrichPicks.has("sample") && sampleSizeNumber > 0 && !sampleSizeError) {
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

  function requestSaveAndRun() {
    if (running) return;
    if ((canvas?.blocks || []).length > 0) {
      setPlacementPrompt(true);
      return;
    }
    placementRef.current = { pageId: "", append: false };
    void onSaveAndRun();
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
    if (running) return;
    setRunning(true);
    const reporter = createRunReporter((feed) => canvas?.reportRun?.(feed));
    try {
    const sheetCap = typeof planLimit === "number" && planLimit > 0 ? planLimit : getHistoricalPullRowLimit(user);
    const marketsRequest = marketsRequestForRun();
    const sourceTable = `${lakeId}.${tableId || "sheet"}`;
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
    if (liveJoinReady) {
      planned.push({
        id: "join-live",
        name: "compose_live_joins",
        status: "pending",
        args: {
          sheets: liveJoinMarkets.length * liveJoinTargets.length,
          sources: liveJoinTargets.map((item) => item.title).join(", "),
        },
      });
    }
    if (enrichPicks.has("bucket")) planned.push({ id: "buckets", name: "bucket_rows", status: "pending" });
    if (enrichPicks.has("summarize")) planned.push({ id: "summary", name: "summarize", status: "pending" });
    if (enrichPicks.has("function")) planned.push({ id: "functions", name: "function_columns", status: "pending" });
    planned.push({ id: "place", name: "place_sheets", status: "pending", args: { tab: sheetTitle } });
    reporter.plan(planned, { title: `${venueLabel} · ${sheetTitle}` });
    connect?.close?.();
    let marketRows = liveMatchedRows ? liveMatchedRows : filteredRows;
    reporter.start("source");
    if (marketsRequest && historicalLake) {
      try {
        const pulledMarkets = await loadAthenaComposeRows(marketsRequest, {
          onPhase: (info) => reporter.note("source", describeComposePhase(info, { table: sourceTable, limit: sheetCap })),
        });
        if (pulledMarkets.rows?.length) marketRows = pulledMarkets.rows;
        reporter.succeed("source", { result: `${marketRows.length.toLocaleString()} rows from ${sourceTable}` });
      } catch (err) {
        marketRows = filteredRows;
        reporter.succeed("source", {
          result: `${filteredRows.length.toLocaleString()} rows already on screen. ${err instanceof Error ? err.message : "The compose did not finish."}`,
        });
      }
    } else if (!liveDirect) {
      if (enrichPicks.has("sample") && sampleSizeNumber > 0 && !sampleSizeError) {
        marketRows = previewRandomSample(marketRows, {
          size: sampleSizeNumber,
          mode: sampleMode,
          seed: sampleMode === "seeded" ? sampleSeed || generateRandomSampleSeed() : `draw-${Date.now()}`,
        });
      }
      reporter.succeed("source", { result: `${marketRows.length.toLocaleString()} rows from ${sourceTable}` });
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
    const runMarkets = applyFunctionColumns(
      primaryColumns,
      primaryRows,
      functionsForSheet("markets"),
      formulaSheets,
      "markets",
      activeFunction?.id,
    );
    const sheets = [];
    let runTickers = [];
    if (liveDirect) {
      const scopeError = kalshiLiveDirectScopeError(tableId, livePicks, directQuery, attributeFilters);
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
      const titleFor = { trades: "Trades", orderbook: "Order book", candlesticks: "Candlesticks", series: "Series" };
      const label = titleFor[tableId] || sheetTitle;
      let built = [];
      if (tableId === "series") {
        const tickers = directSeriesTickers(livePicks);
        const categories = seriesDiscoveryCategories(attributeFilters);
        const loaded = await loadKalshiLiveDirect(
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
            summary: tickers.length ? `Kalshi Live · Series · ${tickers.join(", ")}` : `Kalshi Live · Series · ${categories.join(", ")}`,
            attributeLines,
            sortLine: sortSummary(seriesAttributeColumns, sortKeys),
          },
        ];
      } else {
        const markets = directMarketTickers(livePicks);
        const pulled = await mapPool(markets, 3, (market) =>
          loadKalshiLiveDirect(tableId, {
            ticker: market.ticker,
            limit,
            minTs: directQuery.minTs,
            maxTs: directQuery.maxTs,
            period: directQuery.period,
            depth: Number(directQuery.depth),
          }).then((result) => ({ market, ...shape(result) })),
        );
        built = pulled
          .filter((item) => item.columns.length)
          .map((item) => {
            const id = `run-live-${tableId}-${String(item.market.ticker).replace(/[^A-Za-z0-9]+/g, "-")}`;
            const fullRows = item.rows || [];
            if ((tableId === "trades" || tableId === "candlesticks") && fullRows.length > PREVIEW_ROW_CAP) {
              rememberTradeSheet(id, item.market.ticker, item.columns, displayMatrix(item.columns, fullRows), limit, accountId);
            }
            return {
              id,
              title: `${label} · ${item.market.label || item.market.ticker}`,
              columns: item.columns,
              rows: fullRows.slice(0, PREVIEW_ROW_CAP),
              rowCount: fullRows.length,
              span: pulled.length > 1 ? "half" : "full",
              table: tableId,
              pull: { ticker: item.market.ticker, table: tableId },
              summary: `Kalshi Live · ${label} · ${item.market.ticker}`,
            };
          });
      }
      const directRows = built.reduce((sum, sheet) => sum + (sheet.rowCount || sheet.rows.length), 0);
      reporter.succeed("source", {
        result: `${built.length.toLocaleString()} ${built.length === 1 ? "sheet" : "sheets"} · ${directRows.toLocaleString()} rows`,
      });
      sheets.push(...built.filter((sheet) => sheet.columns.length));
    } else if (runMarkets.columns.length) {
      sheets.push({
        id: tableId === "trades" ? "run-trades" : "run-markets",
        title: sheetTitle,
        columns: runMarkets.columns,
        rows: runMarkets.rows,
        span: "full",
        table: tableId || "markets",
        summary: lockedQuery?.label || describeSearch(),
        composeRequest: marketsRequest,
        keepAllRows: Boolean(liveMatchedRows),
        attributeLines: (liveMarketSearch ? liveAttributeColumns : pull?.columns || []).flatMap((column) => {
          const summary = attributeSummary(column, attributeFilters);
          return summary ? [`${column.title} ${summary}`] : [];
        }),
        sortLine: sortSummary(liveMarketSearch ? liveAttributeColumns : pull?.columns || [], sortKeys),
      });
    }
    if (metadataSheet?.columns?.length) sheets.push(metadataSheet);
    if (liveJoinReady && liveJoinMarkets.length) {
      reporter.start("join-live");
      const jobs = liveJoinMarkets.flatMap((market) => liveJoinTargets.map((target) => ({ market, target })));
      reporter.setChildren(
        "join-live",
        jobs.map((job) => ({
          id: `${job.target.id}:${job.market.ticker}`,
          name: `${job.target.title} · ${job.market.label || job.market.ticker}`,
          status: "pending",
          parallel: true,
        })),
      );
      const pulled = await mapPool(jobs, 3, async (job) => {
        const childId = `${job.target.id}:${job.market.ticker}`;
        reporter.patchChild("join-live", childId, { status: "running", result: `Pulling ${job.target.title}` });
        try {
          const result = await loadKalshiLiveMarketJoin(job.target.id, job.market.ticker, sheetCap);
          const rows = result.rows || [];
          reporter.patchChild("join-live", childId, { status: "success", result: `${rows.length.toLocaleString()} rows` });
          return { ...job, columns: result.columns || [], rows };
        } catch (err) {
          reporter.patchChild("join-live", childId, {
            status: "error",
            result: err instanceof Error ? err.message : "Join failed",
          });
          return { ...job, columns: [], rows: [] };
        }
      });
      pulled.forEach((item) => {
        if (!item.columns.length) return;
        const slug = `${item.target.id}-${String(item.market.ticker).replace(/[^A-Za-z0-9]+/g, "-")}`;
        const id = `run-live-${slug}`;
        const fullRows = item.rows || [];
        if (fullRows.length > PREVIEW_ROW_CAP) {
          rememberTradeSheet(id, item.market.ticker, item.columns, displayMatrix(item.columns, fullRows), sheetCap, accountId);
        }
        sheets.push({
          id,
          title: `${item.target.title} · ${item.market.label || item.market.ticker}`,
          columns: item.columns,
          rows: fullRows.slice(0, PREVIEW_ROW_CAP),
          rowCount: fullRows.length,
          span: "half",
          table: item.target.id,
          pull: { ticker: item.market.ticker, table: item.target.id },
          summary: `Kalshi Live · ${item.target.title} · ${item.market.label || item.market.ticker}`,
        });
      });
      const liveSheets = pulled.filter((item) => item.columns.length).length;
      const liveRows = pulled.reduce((sum, item) => sum + (item.rows?.length || 0), 0);
      reporter.succeed("join-live", {
        result: `${liveSheets.toLocaleString()} ${liveSheets === 1 ? "sheet" : "sheets"} · ${liveRows.toLocaleString()} rows`,
      });
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
        sheets.push({
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
      sheets.push({
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
      const pulled = await mapPool(list, 4, async (market) => {
        const childName = market.label || market.ticker;
        reporter.patchChild("join-trades", market.ticker, { status: "running", result: `Composing ${tradeTable}` });
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
          return { ...market, columns: result.columns?.length ? result.columns : tradePreview.columns, rows, request: result.request };
        } catch (err) {
          reporter.patchChild("join-trades", market.ticker, {
            status: "error",
            result: err instanceof Error ? err.message : "Trades compose failed",
          });
          return { ...market, columns: tradePreview.columns, rows: [] };
        }
      });
      pulled.forEach((item) => {
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
        sheets.push({
          id,
          title: `Trades · ${item.label || item.ticker}`,
          columns: shaped.columns,
          rows: fullRows.slice(0, 50),
          rowCount: fullRows.length,
          pull,
          span: "half",
          table: "trades",
          summary: `${venueLabel} · trades · ${item.label || item.ticker}`,
          composeRequest: item.request,
        });
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
      sheets.push({
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
    const placement = placementRef.current;
    const placedSheets = stampRunSheets(sheets, { integrationId });
    canvas?.placeIntegrationSheets?.(placedSheets, {
      pageId: placement.pageId || undefined,
      append: placement.append,
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
        const athena = sheet.composeRequest || (!sheet.pull ? lockedQuery?.athena || athenaRequest() : null);
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
      summaryCells: enrichPicks.has("summarize") ? summaryCells : null,
      bucket: enrichPicks.has("bucket") ? bucketItems : null,
      functions: enrichPicks.has("function") ? functionItems : null,
      randomSample:
        enrichPicks.has("sample") && sampleSizeNumber > 0
          ? { size: sampleSizeNumber, mode: sampleMode, seed: sampleMode === "seeded" ? sampleSeed : "" }
          : null,
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
      setRunning(false);
    }
  }

  function toggleLiveJoin(id) {
    setHoverJoin(false);
    const next = new Set(liveJoinIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setLiveJoinIds(next);
    if (next.has(id)) setPreviewSheet(`live:${id}`);
    else if (previewSheet === `live:${id}`) {
      const rest = KALSHI_LIVE_MARKET_JOINS.map((item) => item.id).filter((item) => next.has(item));
      setPreviewSheet(rest[0] ? `live:${rest[0]}` : "source");
    }
  }

  function selectAllLiveJoins() {
    setHoverJoin(false);
    if (liveJoinIds.size === KALSHI_LIVE_MARKET_JOINS.length) {
      setLiveJoinIds(new Set());
      setPreviewSheet("source");
      return;
    }
    setLiveJoinIds(new Set(KALSHI_LIVE_MARKET_JOINS.map((item) => item.id)));
    setPreviewSheet((current) => {
      const value = String(current);
      if (value.startsWith("live:") && value !== "live:more" && !value.startsWith("live:locked:")) return current;
      return "live:trades";
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
      if (id === "bucket" && current.startsWith("bucket:")) return "source";
      if (id === "function" && current.startsWith("column:")) return "source";
      if (id === "join" && current !== "summary" && !current.startsWith("bucket:") && !current.startsWith("column:")) return "source";
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
    if (id === "source") {
      setJoinTab("markets");
      if (tradesQuery && joinPlacement === "sheet") setMetadataTab("trades");
    } else if (id === "markets-meta") setMetadataTab("markets");
    else if (!id.startsWith("bucket:") && !id.startsWith("column:") && id !== "summary") setJoinTab(id);
    setFunctionScrollKey((key) => key + 1);
  }

  const previewTabs = [{ id: "source", title: sheetTitle }];
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
                setPreviewSheet("source");
                setSampleMode((current) => current || "seeded");
                setSampleSeed((current) => current || generateRandomSampleSeed());
              }
              if (id === "function") setHoverFunction(false);
              if (id === "join") setHoverJoin(false);
            }}
            joinTarget={joinTarget}
            onJoinTarget={setJoinTarget}
            onClear={() => {
              setHoverJoin(false);
              dropEnrich("join");
              setJoinTarget("");
              setLiveJoinIds(new Set());
              setLiveJoinPreview({});
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
            queryRows={liveMarketSearch ? liveJoinList.length : queryRows}
            sheetCount={liveMarketSearch ? liveJoinMarkets.length : sheetCount}
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
            showJoinBuilder={marketsQuery || tradesQuery || liveMarketSearch}
            showFunctionBuilder
            joinMode={liveMarketSearch ? "live" : tradesQuery ? "trades" : "markets"}
            liveJoinIds={liveJoinIds}
            onToggleLiveJoin={toggleLiveJoin}
            onSelectAllLiveJoins={selectAllLiveJoins}
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
            {groups ? (
              <div className="mb-2 flex flex-wrap gap-1.5" role="tablist" aria-label="Kalshi Live">
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
                  <span>
                    <span className="block text-[13px] font-semibold text-foreground">{table?.label}</span>
                    <span className="mt-0.5 block text-[12px] leading-relaxed text-muted-foreground">{table?.description}</span>
                  </span>
                  <ChevronDown className="ml-2 size-4 shrink-0 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="z-[580] w-[300px]">
                {visibleTableIds.map((id) => (
                  <DropdownMenuItem key={id} onSelect={() => setTableId(id)}>
                    <span>
                      <span className="block text-[13px] font-medium">{tables[id].label}</span>
                      <span className="block text-[11px] text-muted-foreground">{tables[id].description}</span>
                    </span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
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
          {liveDirect ? (
            <KalshiLiveDirectQuery
              tableId={tableId}
              picks={livePicks}
              onAdd={addDirectPick}
              onRemove={removeLivePick}
              query={directQuery}
              onChange={setDirectQuery}
            />
          ) : null}

          <Accordion type="single" collapsible defaultValue="columns" className="space-y-2">
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
            {guidedFilters || liveMarketSearch || liveSeriesSearch ? (
              <AttributeFilters
                columns={liveSeriesSearch ? seriesAttributeColumns : liveMarketSearch ? liveAttributeColumns : pull?.columns || []}
                filters={attributeFilters}
                onChange={setAttributeFilters}
                sorts={sortKeys}
                onSorts={setSortKeys}
                rowLimit={rowLimit}
                onRowLimit={setRowLimit}
                sectionTitle={
                  liveSeriesSearch
                    ? "Series attributes"
                    : tableId === "trades"
                      ? "Trade attributes"
                      : tableId === "blocks"
                        ? "Block attributes"
                        : "Market attributes"
                }
              />
            ) : null}
          </Accordion>

          {guidedFilters || liveMarketSearch || liveDirect ? null : (
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
            {isRealtimeEnabled(integrationId, previewSheet.startsWith("live:") ? previewSheet.slice("live:".length) : tableId) ? (
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
            !(previewSheet === "markets-meta" && tradesJoinReady && joinPlacement === "sheet") ? (
              <div className="mt-1.5 w-full max-w-[280px]">
                <p className="text-right text-[11px] text-muted-foreground">
                  {importedRows == null
                    ? `… / ${planLimit.toLocaleString()} plan limit`
                    : `${importedRows.toLocaleString()} rows will be imported / ${planLimit.toLocaleString()} plan limit`}
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
            ) : showJoinSheets && joinTab === previewTicker ? (
              <p className="mt-1 text-right text-[11px] text-muted-foreground">Preview only. This sheet is created when you run the pull.</p>
            ) : previewSheet === "markets-meta" && tradesJoinReady && joinPlacement === "sheet" ? (
              <p className="mt-1 text-right text-[11px] text-muted-foreground">Preview only. This sheet is created when you run the pull.</p>
            ) : summaryActive ? (
              <p className="mt-1 text-right text-[11px] text-muted-foreground">Preview only. This sheet is created when you run the pull.</p>
            ) : bucketActive ? (
              <p className="mt-1 text-right text-[11px] text-muted-foreground">Preview only. This sheet is created when you run the pull.</p>
            ) : sampleActive ? (
              <p className="mt-1 text-right text-[11px] text-muted-foreground">Preview shuffles the rows on screen. The full sample is drawn when you run the pull.</p>
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
        ) : showJoinExplainer ? (
          <JoinExplainerTabs source={tradesQuery ? "trades" : "markets"} live={liveMarketSearch} />
        ) : liveJoinReady ? (
          <LiveJoinTabs
            targets={liveJoinTargets}
            markets={liveJoinMarkets}
            active={previewSheet}
            previewTicker={livePreviewTicker}
            onSelect={showPreview}
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
          ) : showJoinExplainer ? (
            <JoinExplainer source={tradesQuery ? "trades" : "markets"} venue={polymarketHistorical ? "polymarket" : "kalshi"} live={liveMarketSearch} />
          ) : previewSheet === "live:more" || previewSheet.startsWith("live:locked:") ? (
            <LiveJoinPlan
              markets={liveJoinMarkets}
              targets={liveJoinTargets}
              previewTicker={livePreviewTicker}
              focusTicker={liveJoinFocus(previewSheet).ticker}
              focusTarget={liveJoinFocus(previewSheet).target}
            />
          ) : previewSheet.startsWith("live:") ? (
            (() => {
              const kind = previewSheet.slice("live:".length);
              const preview = liveJoinPreview[kind];
              const label = KALSHI_LIVE_MARKET_JOINS.find((item) => item.id === kind)?.title || "data";
              if (!livePreviewTicker) {
                return (
                  <div className="flex h-full items-center justify-center rounded-xl border border-border/70 bg-background px-6 text-center text-[13px] leading-relaxed text-muted-foreground shadow-sm">
                    This pull has no market tickers to join.
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
                        ticker: livePreviewTicker,
                        marketCount: liveJoinMarkets.length,
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
                    No {label.toLowerCase()} rows for {livePreviewTicker}.
                  </div>
                );
              }
              return (
                <IntegrationBuildGrid
                  columns={preview.columns}
                  rows={preview.rows}
                  highlightColumnId={preview.columns[0]?.id || ""}
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
          ) : showJoinSheets && joinTab === previewTicker && tradePreview.status === "loading" ? (
            <div className="flex h-full items-center justify-center">
              <SpectrumLoadingState label="Loading trades" />
            </div>
          ) : showJoinSheets && joinTab === previewTicker && tradePreview.status === "error" ? (
            <p className="text-[13px] text-muted-foreground">{tradePreview.error}</p>
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
          ) : priceWaiting ? (
            <div className="flex h-full items-center justify-center">
              <WaitingToConnectTag />
            </div>
          ) : error ? (
            <p className="text-[13px] text-muted-foreground">{error}</p>
          ) : previewSearchError && settledRowCount === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 rounded-xl border border-border/70 bg-background px-6 text-center shadow-sm">
              <p className="text-[13px] leading-relaxed text-muted-foreground">{previewSearchError}</p>
              <Button type="button" variant="outline" onClick={refreshPreview}>
                Refresh
              </Button>
            </div>
          ) : loading || emptyRefresh || livePickAwaitingRows || liveScanWaiting || directLoading ? (
            <div className="flex h-full flex-col gap-3">
              {integrationId === "chainlink" || integrationId === "binance" ? <WaitingToConnectTag /> : null}
              {livePickAwaitingRows ? (
                <p className="text-[13px] text-muted-foreground">Loading data</p>
              ) : emptyRefresh ? (
                <p className="text-[13px] text-muted-foreground">Searching for matching rows</p>
              ) : null}
              {liveRemovalTape}
              <div className="min-h-0 flex-1">
                <SkeletonRows />
              </div>
            </div>
          ) : previewIsEmpty ? (
            <div className="flex h-full flex-col">
              {liveRemovalTape}
              <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-border/70 bg-background px-6 text-center shadow-sm">
                <p className="text-[13px] leading-relaxed text-muted-foreground">{liveEmptyLine}</p>
                <Button type="button" variant="outline" onClick={refreshPreview}>
                  Refresh
                </Button>
              </div>
            </div>
          ) : marketsGrid.columns.length ? (
            <div className="flex h-full min-h-0 flex-col">
              {liveRemovalTape}
              <div className="min-h-0 flex-1">
            <IntegrationBuildGrid
              columns={marketsGrid.columns}
              rows={marketsGrid.rows}
              highlightColumnId={marketsGrid.highlight || (tradesJoinReady && joinPlacement === "merge" ? tradeJoinBase.highlightIds[0] || "" : "")}
              highlightColumnIds={
                summaryOnSource
                  ? (summaryView.references || []).filter((ref) => ref.sheetId === "markets" && ref.row == null).map((ref) => ref.column.id)
                  : tradesJoinReady && joinPlacement === "merge"
                    ? tradeJoinBase.highlightIds
                    : []
              }
              referencedCells={
                summaryOnSource
                  ? (summaryView.references || []).filter((ref) => ref.sheetId === "markets" && ref.row != null).map((ref) => ({ columnId: ref.column.id, row: ref.row }))
                  : referencesFor("markets").referencedCells
              }
              scrollToken={functionScrollKey}
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
      {placementPrompt ? (
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
              <Button type="button" variant="outline" onClick={() => confirmPlacement("same")}>
                Same tab
              </Button>
              <Button type="button" className="bg-[#0d99ff] text-white hover:bg-[#0d99ff]/90" onClick={() => confirmPlacement("new")}>
                New tab
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
