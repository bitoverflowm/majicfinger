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
import {
  BUILD_SOURCES,
  PREVIEW_ROW_CAP,
  buildKalshiHistoricalRequest,
  loadBuildPreview,
  loadBuildUniverseCount,
  kalshiHistoricalMarketColumnList,
  loadKalshiHistoricalPreview,
  loadAthenaComposeRows,
  loadKalshiHistoricalMarketsForTickers,
  loadKalshiHistoricalTradesForTicker,
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
  attributeSummary,
  buildKalshiHistoricalFilterPredicates,
  KalshiHistoricalAttributeFilters,
  rowMatchesKalshiHistoricalFilters,
  sortKalshiHistoricalRows,
  sortSummary,
} from "@/components/dashboardComposer/kalshiHistoricalAttributes";
import { cn } from "@/lib/utils";
import { useIntegrationConnect } from "@/components/dashboardComposer/integrationConnectDialog";
import { sheetRecords } from "@/components/dashboardComposer/integrationRunSheets";
import { buildSummaryGrid, SUMMARY_ROW_COUNT, summaryCellKey, summaryExamples } from "@/components/dashboardComposer/summarySheet";
import { buildBucketGrid, defaultBucketMode, suggestedNumericBucketSize } from "@/components/dashboardComposer/bucketSheet";
import { attachRandomSample, previewRandomSample } from "@/components/dashboardComposer/randomSampleRequest";
import { generateRandomSampleSeed, validateRandomSampleSizeInput } from "@/lib/dataLake/randomSample";
import { useWorkspaceCanvas } from "@/components/dashboardComposer/workspaceCanvas";

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

function orderMarketsByTickers(rows, tickers) {
  const byTicker = new Map();
  for (const row of rows || []) {
    const ticker = String(row?.ticker || "").trim();
    if (ticker && !byTicker.has(ticker)) byTicker.set(ticker, row);
  }
  const ordered = [];
  const used = new Set();
  for (const ticker of tickers || []) {
    const row = byTicker.get(ticker);
    if (!row || used.has(ticker)) continue;
    used.add(ticker);
    ordered.push(row);
  }
  for (const [ticker, row] of byTicker) {
    if (used.has(ticker)) continue;
    ordered.push(row);
  }
  return ordered;
}

function attachMarketMetadata(tradeColumns, tradeRows, marketColumns, marketRows) {
  const byTicker = new Map();
  for (const row of marketRows || []) {
    const ticker = String(row?.ticker || "").trim();
    if (ticker && !byTicker.has(ticker)) byTicker.set(ticker, row);
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
    const market = byTicker.get(String(row?.ticker || "").trim()) || {};
    const next = { ...row };
    for (const column of added) next[column.id] = market[column.sourceId] ?? "";
    return next;
  });
  return { columns: [...(tradeColumns || []), ...added], rows, highlightIds: added.map((column) => column.id) };
}

function withFunctionColumn(columns, rows, enabled, formula, sheets, sheetId) {
  if (!enabled) return { columns, rows, highlight: "", error: "", references: [] };
  const evaluated = evaluateColumnFormula(formula, columns, rows, { sheets, sheetId });
  return {
    columns: [...columns, { id: FUNCTION_COLUMN_ID, title: "Column", type: evaluated.type === "text" ? "text" : "number" }],
    rows: rows.map((row, index) => ({ ...row, [FUNCTION_COLUMN_ID]: evaluated.values[index] })),
    highlight: FUNCTION_COLUMN_ID,
    error: evaluated.error,
    references: evaluated.references || [],
  };
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

function JoinSheetTabs({ markets, active, previewTicker, sheetCount, onSelect }) {
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
      const marketWidth = nodes[0]?.offsetWidth || 0;
      const tradeWidths = nodes.slice(1).map((node) => node.offsetWidth);
      let best = 0;
      for (let count = 0; count <= tradeWidths.length; count += 1) {
        const hidden = totalSheets - count;
        const width =
          marketWidth +
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
  }, [marketKey, totalSheets]);

  const visible = markets.slice(0, shownTrades);
  const hidden = Math.max(0, totalSheets - visible.length);
  const plusSelected = hidden > 0 && active !== "markets" && !visible.some((market) => market.ticker === active);

  return (
    <div ref={frameRef} className="relative overflow-hidden px-4 pb-1 pt-4">
      <div ref={measureRef} className="pointer-events-none invisible absolute left-0 top-0 flex" aria-hidden>
        <button type="button" data-tab className={sheetTabClass(false)}>
          Markets
        </button>
        {markets.map((market) => (
          <button key={market.ticker} type="button" data-tab className={sheetTabClass(false)}>
            Trades · {market.ticker}
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
        {visible.map((market) => (
          <button
            key={market.ticker}
            type="button"
            title={market.ticker === previewTicker ? market.title : PREVIEW_TRADE_LOCK}
            onClick={() => onSelect(market.ticker)}
            className={sheetTabClass(active === market.ticker)}
          >
            Trades · {market.ticker}
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

function SummaryPreviewTabs({ sheetTitle, active, onSummary, onSource, resultTitle = "Summary" }) {
  return (
    <div className="overflow-hidden px-4 pb-1 pt-4">
      <div className="flex">
        <button type="button" onClick={onSource} className={sheetTabClass(active === "source")}>
          {sheetTitle}
        </button>
        <button type="button" onClick={onSummary} className={sheetTabClass(active === "summary")}>
          {resultTitle}
        </button>
      </div>
    </div>
  );
}

function TradesJoinPreviewTabs({ active, onSelect }) {
  return (
    <div className="overflow-hidden px-4 pb-1 pt-4">
      <div className="flex animate-[fadeIn_280ms_ease-out]">
        <button type="button" onClick={() => onSelect("trades")} className={sheetTabClass(active === "trades")}>
          Trades
        </button>
        <button type="button" onClick={() => onSelect("markets")} className={sheetTabClass(active === "markets")}>
          Markets
        </button>
      </div>
    </div>
  );
}

function FunctionDestinationTabs({ sheetTitle, joinCommitted, previewTicker, functionTab, joinTab, onMarkets, onTrades, onNew }) {
  return (
    <div className="overflow-hidden px-4 pb-1 pt-4">
      <div className="flex">
        <button type="button" onClick={onMarkets} className={sheetTabClass(functionTab !== "new" && joinTab === "markets")}>
          {sheetTitle}
        </button>
        {joinCommitted && previewTicker ? (
          <button type="button" onClick={onTrades} className={sheetTabClass(functionTab !== "new" && joinTab === previewTicker)}>
            {previewTicker}
          </button>
        ) : null}
        <button type="button" onClick={onNew} className={sheetTabClass(functionTab === "new")}>
          Column
        </button>
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
}) {
  const joinOpen = showJoinBuilder && picked === "join";
  const functionOpen = showFunctionBuilder && picked === "function";
  const summarizeOpen = showSummarizeBuilder && picked === "summarize";
  const bucketOpen = picked === "bucket";
  const sampleOpen = picked === "sample";
  const tradesJoin = joinMode === "trades";
  const marketTargetOn = joinTarget === "kalshiHistoricalMarkets";
  const hiddenMarketColumns = marketColumnHidden || new Set();
  const selectedMarketCount = marketColumns.filter((column) => !hiddenMarketColumns.has(column.id)).length;
  const queryRowCount = typeof queryRows === "number" ? queryRows : sheetCount;
  return (
    <>
      <div className="px-4 pb-3 pt-4 pr-12">
        <h2 className="text-[15px] font-semibold text-foreground">Enrich your data</h2>
        <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
          Add a step on top of this pull. The preview stays on the rows you queried.
        </p>
      </div>
      <fieldset className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 pb-4">
        <legend className="sr-only">Enrichment</legend>
        {ENRICH_OPTIONS.map((option) => {
          const selected = picked === option.id;
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
                  <span className="size-3.5 shrink-0 rounded-full border border-border" />
                  <span className="min-w-0 flex-1">{option.title}</span>
                  <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">Coming soon</span>
                </div>
              </div>
            );
          }
          const hoverOn = isFunction
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
          return (
            <div
              key={option.id}
              onMouseEnter={isJoin ? () => onHoverJoin(true) : undefined}
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
                  type="radio"
                  name="enrichment"
                  value={option.id}
                  checked={selected}
                  onChange={() => onPick(option.id)}
                  className="size-3.5 accent-[#0d99ff]"
                />
                {option.title}
              </label>
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
                      {tradesJoin ? (
                        <button
                          type="button"
                          aria-pressed={marketTargetOn}
                          onClick={() => onJoinTarget("kalshiHistoricalMarkets")}
                          className={cn(
                            "mt-1.5 flex w-full flex-col rounded-lg border px-2.5 py-2 text-left transition-colors",
                            marketTargetOn
                              ? "border-[#0d99ff]/40 bg-[#0d99ff]/10"
                              : "border-border/70 bg-background hover:bg-muted/50",
                          )}
                        >
                          <span className="text-[13px] font-semibold text-foreground">Kalshi Historical Markets</span>
                          <span className="text-[11px] font-normal text-muted-foreground">Market metadata for each ticker in this query.</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          aria-pressed={joinTarget === "kalshiHistoricalTrades"}
                          onClick={() => onJoinTarget("kalshiHistoricalTrades")}
                          className={cn(
                            "mt-1.5 flex w-full flex-col rounded-lg border px-2.5 py-2 text-left transition-colors",
                            joinTarget === "kalshiHistoricalTrades"
                              ? "border-[#0d99ff]/40 bg-[#0d99ff]/10"
                              : "border-border/70 bg-background hover:bg-muted/50",
                          )}
                        >
                          <span className="text-[13px] font-semibold text-foreground">Kalshi Historical Trades</span>
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
                              Choose the market attributes to bring in. Each trade matches a market on ticker.
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
                                One new Markets tab, with one row for each ticker.
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
                          You have {queryRowCount.toLocaleString()} {queryRowCount === 1 ? "row" : "rows"} in this trades query. Markets are matched by ticker.
                        </p>
                      ) : (
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
                    <div className="mt-2 rounded-lg border border-border/70 px-2.5 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[11px] font-semibold text-foreground">Add column to</p>
                        <button
                          type="button"
                          onClick={onClearFunction}
                          className="text-[11px] font-medium text-muted-foreground hover:text-foreground"
                        >
                          Clear
                        </button>
                      </div>
                      <div className="mt-1.5 flex flex-col gap-1.5">
                        {functionTables.map((table) => (
                          <button
                            key={table.id}
                            type="button"
                            aria-pressed={functionTarget === table.id}
                            onClick={() => onFunctionTarget(table.id)}
                            className={cn(
                              "flex w-full flex-col rounded-lg border px-2.5 py-2 text-left transition-colors",
                              functionTarget === table.id
                                ? "border-[#0d99ff]/40 bg-[#0d99ff]/10"
                                : "border-border/70 bg-background hover:bg-muted/50",
                            )}
                          >
                            <span className="text-[13px] font-semibold text-foreground">{table.title}</span>
                            <span className="text-[11px] font-normal text-muted-foreground">{table.detail}</span>
                          </button>
                        ))}
                      </div>
                      {functionTarget ? (
                        <div className="mt-2 space-y-2">
                          <p className="text-[11px] leading-relaxed text-muted-foreground">
                            Type the equation in the new column, like = Yes Price + No Price. Click a column or a cell to drop it in.
                          </p>
                          {functionScopeNote ? <p className="text-[11px] leading-relaxed text-muted-foreground">{functionScopeNote}</p> : null}
                        </div>
                      ) : null}
                    </div>
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
                    <BucketEnrichPanel
                      columns={bucketColumns}
                      bucketColumnId={bucketColumnId}
                      onBucketColumn={onBucketColumn}
                      mode={bucketMode}
                      onMode={onBucketMode}
                      timeInterval={bucketInterval}
                      onTimeInterval={onBucketInterval}
                      numericSize={bucketNumericSize}
                      onNumericSize={onBucketNumericSize}
                      groupByIds={bucketGroupBy}
                      onToggleGroupBy={onToggleBucketGroup}
                      metric={bucketMetric}
                      onMetric={onBucketMetric}
                      valueColumnId={bucketValueColumnId}
                      onValueColumn={onBucketValueColumn}
                      onClear={onClearBucket}
                    />
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

export function IntegrationBuildWorkspace({ integrationId, onBack }) {
  const source = BUILD_SOURCES[integrationId];
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
  const [revealKey, setRevealKey] = useState(0);
  const baseRowsRef = useRef([]);
  const usingFilteredSample = useRef(false);
  const [saved, setSaved] = useState([]);
  const [pulls, setPulls] = useState([]);
  const [step, setStep] = useState("query");
  const [lockedQuery, setLockedQuery] = useState(null);
  const [justSaved, setJustSaved] = useState(false);
  const restoreRef = useRef(null);
  const [enrichPick, setEnrichPick] = useState("");
  const [hoverJoin, setHoverJoin] = useState(false);
  const [joinTarget, setJoinTarget] = useState("");
  const [joinPlacement, setJoinPlacement] = useState("");
  const [metadataTab, setMetadataTab] = useState("trades");
  const [marketColumnHidden, setMarketColumnHidden] = useState(() => defaultMarketColumnHidden(kalshiHistoricalMarketColumnList()));
  const [marketPreview, setMarketPreview] = useState({ status: "idle", key: "", columns: [], rows: [], error: "" });
  const [joinTab, setJoinTab] = useState("markets");
  const [tradePreview, setTradePreview] = useState({ status: "idle", ticker: "", columns: [], rows: [], error: "" });
  const [running, setRunning] = useState(false);
  const [hoverFunction, setHoverFunction] = useState(false);
  const [hoverSummarize, setHoverSummarize] = useState(false);
  const [hoverBucket, setHoverBucket] = useState(false);
  const [hoverSample, setHoverSample] = useState(false);
  const [bucketColumnId, setBucketColumnId] = useState("");
  const [bucketMode, setBucketMode] = useState("category");
  const [bucketInterval, setBucketInterval] = useState("day");
  const [bucketNumericSize, setBucketNumericSize] = useState("");
  const [bucketGroupBy, setBucketGroupBy] = useState([]);
  const [bucketMetric, setBucketMetric] = useState("count");
  const [bucketValueColumnId, setBucketValueColumnId] = useState("");
  const [bucketTab, setBucketTab] = useState("buckets");
  const [sampleSize, setSampleSize] = useState("100");
  const [sampleMode, setSampleMode] = useState("seeded");
  const [sampleSeed, setSampleSeed] = useState("");
  const [sampleShuffle, setSampleShuffle] = useState(0);
  const [summaryCells, setSummaryCells] = useState({});
  const [summaryFocus, setSummaryFocus] = useState({ columnId: "label", row: 0 });
  const [summaryTab, setSummaryTab] = useState("summary");
  const [functionTarget, setFunctionTarget] = useState("");
  const [functionFormula, setFunctionFormula] = useState("");
  const [functionTab, setFunctionTab] = useState("");
  const [functionScrollKey, setFunctionScrollKey] = useState(0);
  const [formulaFocused, setFormulaFocused] = useState(false);
  const [formulaEditing, setFormulaEditing] = useState(false);
  const [formulaCaret, setFormulaCaret] = useState(0);
  const [formulaFocusToken, setFormulaFocusToken] = useState(0);
  const [functionHelp, setFunctionHelp] = useState(false);
  const formulaCaretRef = useRef(0);
  const blurToken = useRef(0);
  const [visibleCount, setVisibleCount] = useState(0);
  const [universe, setUniverse] = useState(null);
  const [counting, setCounting] = useState(false);

  const groups = source?.groups || null;
  const visibleTableIds = groups
    ? tableIds.filter((id) => (groupId === "realtime" ? tables[id].realtime : tables[id].group === groupId))
    : tableIds;
  const table = tables[tableId];
  const exactUniverse = usesExactUniverse(integrationId);
  const marketsQuery = integrationId === "kalshiHistorical" && tableId === "markets";
  const guidedFilters = integrationId === "kalshiHistorical" && (tableId === "markets" || tableId === "trades");

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
      ? buildKalshiHistoricalFilterPredicates(pull?.columns || [], attributeFilters)
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
          integrationId === "kalshiHistorical" &&
          (column.id === "last_price" || column.id === "yes_bid" || column.id === "yes_price" || column.id === "no_price")
            ? { ...column, scale: "cents" }
            : column,
        ),
    [pull, hidden, integrationId],
  );

  const filteredRows = useMemo(() => {
    if (guidedFilters) {
      const matched = (pull?.rows || []).filter((row) => rowMatchesKalshiHistoricalFilters(row, pull?.columns, attributeFilters));
      const sorted = sortKalshiHistoricalRows(matched, pull?.columns, sortKeys);
      const limit = Number(rowLimit);
      const capped = Number.isFinite(limit) && limit > 0 ? sorted.slice(0, limit) : sorted;
      return capped.slice(0, visibleCount);
    }
    const rows = (pull?.rows || []).slice(0, visibleCount);
    const query = filterValue.trim().toLowerCase();
    if (!query || !filterColumn) return rows;
    return rows.filter((row) => String(row[filterColumn] ?? "").toLowerCase().includes(query));
  }, [pull, visibleCount, filterColumn, filterValue, guidedFilters, attributeFilters, sortKeys, rowLimit]);

  const queriedMarkets = useMemo(() => {
    if (!guidedFilters) return [];
    const matched = (pull?.rows || []).filter((row) => rowMatchesKalshiHistoricalFilters(row, pull?.columns, attributeFilters));
    const sorted = sortKalshiHistoricalRows(matched, pull?.columns, sortKeys);
    const limit = Number(rowLimit);
    const capped = Number.isFinite(limit) && limit > 0 ? sorted.slice(0, limit) : sorted;
    const seen = new Set();
    const markets = [];
    for (const row of capped) {
      const ticker = String(row?.ticker || "").trim();
      if (!ticker || seen.has(ticker)) continue;
      seen.add(ticker);
      markets.push({ ticker, title: String(row?.title || ticker) });
    }
    return markets;
  }, [guidedFilters, pull, attributeFilters, sortKeys, rowLimit]);

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

  useEffect(() => {
    if (joinTarget !== "kalshiHistoricalTrades" || !previewTicker) {
      if (!previewTicker) setTradePreview({ status: "idle", ticker: "", columns: [], rows: [], error: "" });
      return undefined;
    }
    let cancel = false;
    setJoinTab(previewTicker);
    setTradePreview({ status: "loading", ticker: previewTicker, columns: [], rows: [], error: "" });
    loadKalshiHistoricalTradesForTicker(previewTicker)
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
  }, [joinTarget, previewTicker]);

  useEffect(() => {
    if (integrationId !== "kalshiHistorical" || tableId !== "trades" || joinTarget !== "kalshiHistoricalMarkets") {
      setMarketPreview((current) => (current.status === "idle" ? current : { status: "idle", key: "", columns: [], rows: [], error: "" }));
      return undefined;
    }
    const tickers = [];
    const seen = new Set();
    for (const row of filteredRows) {
      const ticker = String(row?.ticker || "").trim();
      if (!ticker || seen.has(ticker)) continue;
      seen.add(ticker);
      tickers.push(ticker);
    }
    const key = tickers.join("\n");
    if (!key) {
      setMarketPreview({ status: "ready", key: "", columns: [], rows: [], error: "" });
      return undefined;
    }
    let cancel = false;
    setMarketPreview({ status: "loading", key, columns: [], rows: [], error: "" });
    loadKalshiHistoricalMarketsForTickers(tickers)
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
  }, [integrationId, tableId, joinTarget, filteredRows]);

  useEffect(() => {
    if (!guidedFilters) return undefined;
    const columns = pull?.columns;
    if (!columns?.length) return undefined;
    const predicates = buildKalshiHistoricalFilterPredicates(columns, attributeFilters);
    if (!predicates.and.length && !predicates.or.length && !sortKeys.length) {
      setPreviewRefreshing(false);
      if (usingFilteredSample.current) {
        usingFilteredSample.current = false;
        setPull((current) => (current ? { ...current, rows: baseRowsRef.current } : current));
      }
      return undefined;
    }
    let cancel = false;
    setPreviewRefreshing(true);
    const timer = window.setTimeout(() => {
      loadKalshiHistoricalPreview(tableId === "trades" ? "trades" : "markets", predicates, sortKeys)
        .then((result) => {
          if (cancel) return;
          usingFilteredSample.current = true;
          setPull((current) => (current ? { ...current, rows: result.rows } : current));
          setVisibleCount(result.rows.length);
        })
        .catch(() => {})
        .finally(() => {
          if (!cancel) setPreviewRefreshing(false);
        });
    }, 400);
    return () => {
      cancel = true;
      window.clearTimeout(timer);
    };
  }, [guidedFilters, attributeFilters, pull?.columns, sortKeys, tableId]);

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
    if (!guidedFilters || !pull?.columns?.length) return null;
    const predicates = buildKalshiHistoricalFilterPredicates(pull.columns, attributeFilters);
    const columnIds = pull.columns.filter((column) => !hidden.has(column.id)).map((column) => column.id);
    const requested = Number(rowLimit);
    const caps = [];
    if (typeof planLimit === "number" && planLimit > 0) caps.push(planLimit);
    if (Number.isFinite(requested) && requested > 0) caps.push(requested);
    return buildKalshiHistoricalRequest({
      table: tableId === "trades" ? "trades" : "markets",
      predicates,
      sortKeys,
      columnIds,
      limit: caps.length ? Math.min(...caps) : undefined,
    });
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
        joinTarget === "kalshiHistoricalTrades"
          ? {
              target: "kalshiHistoricalTrades",
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
    setEnrichPick("");
    setHoverJoin(false);
    setHoverFunction(false);
    setJoinTarget("");
    setJoinPlacement("");
    setMetadataTab("trades");
    setMarketColumnHidden(defaultMarketColumnHidden(kalshiHistoricalMarketColumnList()));
    setJoinTab("markets");
    setFunctionTarget("");
    setFunctionFormula("");
    setFunctionTab("");
    setHoverSummarize(false);
    setHoverBucket(false);
    setHoverSample(false);
    setBucketColumnId("");
    setBucketMode("category");
    setBucketInterval("day");
    setBucketNumericSize("");
    setBucketGroupBy([]);
    setBucketMetric("count");
    setBucketValueColumnId("");
    setBucketTab("buckets");
    setSampleSize("100");
    setSampleMode("seeded");
    setSampleSeed("");
    setSampleShuffle(0);
    setSummaryCells({});
    setSummaryFocus({ columnId: "label", row: 0 });
    setSummaryTab("summary");
    setStep("enrich");
  }

  const shown = loading ? 0 : filteredRows.length;
  const emptyRefresh = previewRefreshing && !loading && shownColumns.length > 0 && filteredRows.length === 0;

  useEffect(() => {
    if (!emptyRefresh) return undefined;
    setProgress(12);
    const timer = window.setInterval(() => {
      setProgress((current) => (current >= 88 ? current : current + Math.random() * 8));
    }, 280);
    return () => {
      window.clearInterval(timer);
      setProgress(100);
    };
  }, [emptyRefresh]);
  const shownLabel = `Previewing ${shown.toLocaleString()} ${shown === 1 ? "row" : "rows"}`;
  const previewLine = loading
    ? "Loading the first 50 rows"
    : !exactUniverse
      ? `${shownLabel} of 1,000,000+ rows available`
      : typeof universe === "number" && !counting
        ? `${shownLabel} of ${universe.toLocaleString()}`
        : counting
          ? `${shownLabel} of …`
          : `${shownLabel}. More rows are available.`;
  const previewLineShown = emptyRefresh
    ? "Loading the first 50 rows"
    : previewRefreshing && !loading
      ? `${previewLine} · updating`
      : previewLine;
  const availableRows = !exactUniverse
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
  const joinCommitted = marketsQuery && step === "enrich" && joinTarget === "kalshiHistoricalTrades";
  const tradesQuery = integrationId === "kalshiHistorical" && tableId === "trades";
  const marketColumnList = useMemo(() => kalshiHistoricalMarketColumnList(), []);
  const selectedMarketColumns = useMemo(
    () => marketColumnList.filter((column) => !marketColumnHidden.has(column.id)),
    [marketColumnList, marketColumnHidden],
  );
  const tradesJoinPicked = tradesQuery && step === "enrich" && joinTarget === "kalshiHistoricalMarkets";
  const tradesJoinReady = tradesJoinPicked && Boolean(joinPlacement) && selectedMarketColumns.length > 0;
  const kalshiEnrich = marketsQuery || tradesQuery;
  const showSampleExplainer = kalshiEnrich && step === "enrich" && hoverSample;
  const showBucketExplainer = kalshiEnrich && step === "enrich" && hoverBucket && !showSampleExplainer;
  const showSummarizeExplainer = kalshiEnrich && step === "enrich" && hoverSummarize && !showSampleExplainer && !showBucketExplainer;
  const showFunctionExplainer =
    kalshiEnrich && step === "enrich" && hoverFunction && !showSummarizeExplainer && !showSampleExplainer && !showBucketExplainer;
  const showJoinExplainer =
    kalshiEnrich &&
    step === "enrich" &&
    hoverJoin &&
    !joinCommitted &&
    !tradesJoinPicked &&
    !showFunctionExplainer &&
    !showSummarizeExplainer &&
    !showSampleExplainer &&
    !showBucketExplainer;
  const enrichExplainer = showSampleExplainer || showBucketExplainer || showSummarizeExplainer || showFunctionExplainer || showJoinExplainer;
  const summaryActive = kalshiEnrich && step === "enrich" && enrichPick === "summarize" && !enrichExplainer;
  const bucketActive = kalshiEnrich && step === "enrich" && enrichPick === "bucket" && !enrichExplainer;
  const sampleActive = kalshiEnrich && step === "enrich" && enrichPick === "sample" && !enrichExplainer;
  const showJoinSheets = joinCommitted && !showFunctionExplainer && !showJoinExplainer;
  const functionActive = step === "enrich" && enrichPick === "function" && Boolean(functionTarget) && !showFunctionExplainer;
  const functionOnMarkets = functionActive && (functionTarget === "markets" || functionTarget === "all");
  const functionOnTrades = functionActive && (functionTarget === "trades" || functionTarget === "trades-all" || functionTarget === "all");
  const functionOnNew = functionActive && functionTarget === "new";
  const sheetTitle = tableId === "markets" ? "Markets" : tableId === "trades" ? "Trades" : tables[tableId]?.label || "This sheet";
  const metadataRows = useMemo(() => {
    const tickers = [];
    const seen = new Set();
    for (const row of filteredRows) {
      const ticker = String(row?.ticker || "").trim();
      if (!ticker || seen.has(ticker)) continue;
      seen.add(ticker);
      tickers.push(ticker);
    }
    return orderMarketsByTickers(marketPreview.rows, tickers);
  }, [filteredRows, marketPreview.rows]);
  const tradeJoinBase = useMemo(() => {
    if (
      !(
        tradesQuery &&
        joinPlacement === "merge" &&
        joinTarget === "kalshiHistoricalMarkets" &&
        selectedMarketColumns.length &&
        marketPreview.status === "ready"
      )
    ) {
      return { columns: shownColumns, rows: filteredRows, highlightIds: [] };
    }
    return attachMarketMetadata(shownColumns, filteredRows, selectedMarketColumns, marketPreview.rows);
  }, [
    tradesQuery,
    joinPlacement,
    joinTarget,
    selectedMarketColumns,
    marketPreview.status,
    marketPreview.rows,
    shownColumns,
    filteredRows,
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
      push({ id: "trades", title: previewTicker, columns: tradePreview.columns, rows: tradePreview.rows });
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
    sheetTitle,
    canvas?.blocks,
    tradesQuery,
    joinPlacement,
    selectedMarketColumns,
    marketPreview.status,
    metadataRows,
  ]);
  const visibleSheetId =
    functionOnNew && functionTab === "new" ? "new" : showJoinSheets && joinTab === previewTicker ? "trades" : "markets";
  const columnOnVisible =
    (visibleSheetId === "markets" && functionOnMarkets) ||
    (visibleSheetId === "trades" && functionOnTrades) ||
    (visibleSheetId === "new" && functionOnNew);
  const editSheetId = columnOnVisible ? visibleSheetId : functionOnNew ? "new" : functionOnTrades && !functionOnMarkets ? "trades" : "markets";
  const editBase =
    editSheetId === "trades"
      ? { columns: tradePreview.columns, rows: tradePreview.rows, sheetId: "trades" }
      : { columns: tradeJoinBase.columns, rows: tradeJoinBase.rows, sheetId: editSheetId === "new" ? "new" : "markets" };
  const marketsGrid = withFunctionColumn(
    tradeJoinBase.columns,
    tradeJoinBase.rows,
    functionOnMarkets,
    functionFormula,
    formulaSheets,
    "markets",
  );
  const tradesGrid = withFunctionColumn(
    tradePreview.columns,
    tradePreview.rows,
    functionOnTrades,
    functionFormula,
    formulaSheets,
    "trades",
  );
  const newTableGrid = withFunctionColumn(
    tradeJoinBase.columns,
    tradeJoinBase.rows,
    functionOnNew,
    functionFormula,
    formulaSheets,
    "new",
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
  const summarySourceColumns = tradeJoinBase.columns.length ? tradeJoinBase.columns : shownColumns;
  const summarySourceRows = tradeJoinBase.columns.length ? tradeJoinBase.rows : filteredRows;
  const summaryMeasure = (() => {
    const preferred = tradesQuery ? ["Size", "Yes price", "No price"] : ["Volume", "Last price", "Yes bid"];
    for (const title of preferred) {
      if (summarySourceColumns.some((column) => column.title === title)) return title;
    }
    return summarySourceColumns.find((column) => column.type === "number" && column.id !== FUNCTION_COLUMN_ID)?.title || (tradesQuery ? "Size" : "Volume");
  })();
  const summaryView = useMemo(
    () =>
      buildSummaryGrid({
        cells: summaryCells,
        columns: summarySourceColumns,
        rows: summarySourceRows,
        sheets: formulaSheets,
        focus: summaryFocus,
      }),
    [summaryCells, summarySourceColumns, summarySourceRows, formulaSheets, summaryFocus],
  );
  const summaryFormula = summaryCells[summaryCellKey(summaryFocus.columnId, summaryFocus.row)] || "";
  const bucketView = useMemo(
    () =>
      buildBucketGrid({
        columns: summarySourceColumns,
        rows: summarySourceRows,
        bucketColumnId,
        mode: bucketMode,
        timeInterval: bucketInterval,
        numericBucketSize: bucketNumericSize,
        groupByIds: bucketGroupBy,
        metric: bucketMetric,
        valueColumnId: bucketValueColumnId,
      }),
    [
      summarySourceColumns,
      summarySourceRows,
      bucketColumnId,
      bucketMode,
      bucketInterval,
      bucketNumericSize,
      bucketGroupBy,
      bucketMetric,
      bucketValueColumnId,
    ],
  );
  const sampleSizeError = validateRandomSampleSizeInput(sampleSize, {
    maxSize: typeof planLimit === "number" && planLimit > 0 ? planLimit : undefined,
    required: enrichPick === "sample",
  });
  const sampleSizeNumber = sampleSizeError ? 0 : Math.floor(Number(sampleSize));
  const samplePreviewRows = useMemo(() => {
    if (!sampleSizeNumber) return [];
    return previewRandomSample(summarySourceRows, {
      size: Math.min(sampleSizeNumber, summarySourceRows.length, PREVIEW_ROW_CAP),
      mode: sampleMode,
      seed: sampleMode === "seeded" ? sampleSeed : `draw-${sampleShuffle}`,
    });
  }, [sampleSizeNumber, summarySourceRows, sampleMode, sampleSeed, sampleShuffle]);
  const paneLine = (() => {
    if (showSampleExplainer) return "Illustration. Athena draws the sample when you run the pull.";
    if (showBucketExplainer) return "Illustration. The bucket sheet is created when you run the pull.";
    if (sampleActive) {
      if (sampleSizeError) return sampleSizeError;
      const shown = samplePreviewRows.length;
      return `Previewing ${shown.toLocaleString()} of the rows on screen. Save and run asks Athena for ${sampleSizeNumber.toLocaleString()} ${sampleMode === "seeded" ? "seeded" : "new"} rows.`;
    }
    if (bucketActive && bucketTab === "buckets") {
      if (!bucketView.ready) return "Choose a column to bucket. The result is a new sheet.";
      const count = bucketView.rows.length;
      return `Previewing ${count.toLocaleString()} ${count === 1 ? "bucket" : "buckets"} from the rows on screen. Save and run buckets the imported rows.`;
    }
    if (showSummarizeExplainer) return "Illustration. The summary sheet is created when you run the pull.";
    if (showFunctionExplainer) return "Illustration. The column is added when you pick a sheet.";
    if (summaryActive && summaryTab === "summary") return "Summary sheet. Totals here use the preview rows. Save and run totals the imported rows.";
    if (summaryActive) return "Click a column or a cell to drop it into the summary.";
    if (showJoinExplainer) {
      return tradesQuery
        ? "Illustration. No market metadata is loaded until you run the pull."
        : "Illustration. No trades are loaded until you run the pull.";
    }
    if (functionOnNew && functionTab === "new") return "New table. This sheet is created when you run the pull.";
    if (tradesJoinReady && joinPlacement === "sheet" && metadataTab === "markets") {
      if (marketPreview.status === "loading") return "Loading market metadata";
      if (marketPreview.status === "error") return marketPreview.error;
      const count = metadataRows.length;
      return `Previewing ${count.toLocaleString()} ${count === 1 ? "market" : "markets"}. Highlighted columns are added on a new Markets tab.`;
    }
    if (tradesJoinReady && joinPlacement === "merge") {
      if (marketPreview.status === "loading") return "Loading market metadata";
      if (marketPreview.status === "error") return marketPreview.error;
      return "Highlighted columns are market metadata joined by ticker.";
    }
    if (tradesJoinPicked && !joinPlacement) return "Choose where the market columns go. The preview updates here.";
    if (tradesJoinPicked && !selectedMarketColumns.length) return "Choose at least one market column.";
    if (!showJoinSheets || joinTab === "markets") return previewLineShown;
    if (joinTab !== previewTicker) return PREVIEW_TRADE_LOCK;
    if (tradePreview.status === "loading") return "Loading trades for the first market";
    if (tradePreview.status === "error") return tradePreview.error;
    const count = tradePreview.rows.length;
    return `Previewing ${count.toLocaleString()} ${count === 1 ? "trade" : "trades"} of ${previewTicker}`;
  })();

  function chooseBucketColumn(id) {
    setHoverBucket(false);
    setBucketColumnId(id);
    const column = shownColumns.find((item) => item.id === id);
    const nextMode = defaultBucketMode(column);
    setBucketMode(nextMode);
    if (nextMode === "number") setBucketNumericSize(String(suggestedNumericBucketSize(filteredRows, id)));
    if (nextMode === "time") setBucketInterval("day");
    setBucketGroupBy((current) => current.filter((item) => item !== id));
    setBucketTab("buckets");
  }

  function chooseBucketMetric(id) {
    setBucketMetric(id);
    if (id === "count" || bucketValueColumnId) return;
    const next = shownColumns.find((column) => column.type === "number" && column.id !== bucketColumnId);
    if (next) setBucketValueColumnId(next.id);
  }

  function chooseSampleMode(mode) {
    setSampleMode(mode);
    if (mode === "seeded" && !sampleSeed) setSampleSeed(generateRandomSampleSeed());
    if (mode === "unseeded") setSampleShuffle((token) => token + 1);
  }

  function chooseFunctionTarget(id) {
    setHoverFunction(false);
    setFunctionTarget(id);
    setFunctionScrollKey((key) => key + 1);
    setFormulaFocused(false);
    setFormulaEditing(true);
    if (id === "new") {
      setFunctionTab("new");
      return;
    }
    setFunctionTab("");
    if (id === "trades" || id === "trades-all") {
      if (previewTicker) setJoinTab(previewTicker);
      return;
    }
    setJoinTab("markets");
    if (tradesQuery && joinPlacement === "sheet") setMetadataTab("trades");
  }

  function insertSummaryReference(text) {
    const key = summaryCellKey(summaryFocus.columnId, summaryFocus.row);
    setSummaryCells((current) => {
      const value = current[key] || "";
      if (!value.trim()) {
        formulaCaretRef.current = `= SUM(${text})`.length;
        setFormulaCaret(formulaCaretRef.current);
        return { ...current, [key]: `= SUM(${text})` };
      }
      const at = Math.max(0, Math.min(value.length, formulaCaretRef.current));
      const prefix = value.slice(0, at);
      const suffix = value.slice(at);
      const spacer = prefix && !/[\s(,+\-*/^=<>!]$/.test(prefix) ? " " : "";
      const chunk = `${spacer}${text}`;
      formulaCaretRef.current = prefix.length + chunk.length;
      setFormulaCaret(formulaCaretRef.current);
      return { ...current, [key]: `${prefix}${chunk}${suffix}` };
    });
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
    setFormulaEditing(true);
    setFormulaFocused(true);
    const key = summaryCellKey(columnId, row);
    formulaCaretRef.current = (summaryCells[key] || "").length;
    setFormulaCaret(formulaCaretRef.current);
    setFormulaFocusToken((token) => token + 1);
  }

  function acceptFormulaPick(pick, sheetId) {
    if (summaryActive) {
      if (sheetId === "summary") {
        focusSummaryCell(pick.column.id, Math.max(0, (pick.row || 1) - 1));
        return;
      }
      if (!formulaEditing && !summaryFormula) return;
      const sameSheet = sheetId === "markets" || (editSheetId === "new" && sheetId === "markets");
      const sheet = formulaSheets.find((item) => item.id === sheetId);
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
    const sheet = formulaSheets.find((item) => item.id === sheetId);
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
    formulaEditing && functionActive && (bar ? editSheetId !== sheetId && visibleSheetId === sheetId : editSheetId === sheetId)
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

  function tickersFromRows(rows, cap) {
    const seen = new Set();
    const tickers = [];
    for (const row of rows || []) {
      const ticker = String(row?.ticker || "").trim();
      if (!ticker || seen.has(ticker)) continue;
      seen.add(ticker);
      tickers.push(ticker);
      if (tickers.length >= cap) break;
    }
    return tickers;
  }

  function marketsRequestForRun() {
    let request = lockedQuery?.athena || athenaRequest();
    if (enrichPick === "sample" && sampleSizeNumber > 0 && !sampleSizeError) {
      request = attachRandomSample(request, {
        size: sampleSizeNumber,
        mode: sampleMode,
        seed: sampleMode === "seeded" ? sampleSeed || generateRandomSampleSeed() : "",
      });
    }
    if (!request?.compose?.select || !joinCommitted) return request;
    const select = request.compose.select;
    if (select.some((entry) => entry.column === "ticker" || entry.alias === "ticker")) return request;
    return {
      ...request,
      compose: {
        ...request.compose,
        select: [{ column: "ticker", alias: "ticker" }, ...select],
      },
    };
  }

  async function onSaveAndRun() {
    if (running) return;
    setRunning(true);
    try {
    const sheetCap = typeof planLimit === "number" && planLimit > 0 ? planLimit : getHistoricalPullRowLimit(user);
    const marketsRequest = marketsRequestForRun();
    let marketRows = filteredRows;
    if (marketsRequest && integrationId === "kalshiHistorical") {
      try {
        const pulledMarkets = await loadAthenaComposeRows(marketsRequest);
        if (pulledMarkets.rows?.length) marketRows = pulledMarkets.rows;
      } catch {
        marketRows = filteredRows;
      }
    }
    let primaryColumns = shownColumns;
    let primaryRows = marketRows;
    let metadataSheet = null;
    let joinedTickers = [];
    if (tradesJoinReady) {
      joinedTickers = tickersFromRows(marketRows, Number.MAX_SAFE_INTEGER);
      let joinedMarketRows = marketPreview.status === "ready" ? marketPreview.rows : [];
      try {
        const result = await loadKalshiHistoricalMarketsForTickers(joinedTickers);
        if (Array.isArray(result.rows)) joinedMarketRows = result.rows;
      } catch {
        joinedMarketRows = marketPreview.status === "ready" ? marketPreview.rows : [];
      }
      if (joinPlacement === "merge") {
        const merged = attachMarketMetadata(shownColumns, marketRows, selectedMarketColumns, joinedMarketRows);
        primaryColumns = merged.columns;
        primaryRows = merged.rows;
      } else {
        metadataSheet = {
          id: "run-market-metadata",
          title: "Markets",
          columns: selectedMarketColumns,
          rows: orderMarketsByTickers(joinedMarketRows, joinedTickers),
          span: "full",
          table: "markets",
          summary: "Kalshi Historical · markets · joined by ticker",
        };
      }
    }
    const runMarkets = withFunctionColumn(
      primaryColumns,
      primaryRows,
      functionOnMarkets,
      functionFormula,
      formulaSheets,
      "markets",
    );
    const sheets = [];
    let runTickers = [];
    if (runMarkets.columns.length) {
      sheets.push({
        id: tableId === "trades" ? "run-trades" : "run-markets",
        title: sheetTitle,
        columns: runMarkets.columns,
        rows: runMarkets.rows,
        span: "full",
        table: tableId || "markets",
        summary: lockedQuery?.label || describeSearch(),
      });
    }
    if (metadataSheet?.columns?.length) sheets.push(metadataSheet);
    if (enrichPick === "summarize") {
      const built = buildSummaryGrid({
        cells: summaryCells,
        columns: primaryColumns,
        rows: primaryRows,
        sheets: formulaSheets,
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
      });
    }
    if (enrichPick === "bucket") {
      const built = buildBucketGrid({
        columns: primaryColumns,
        rows: primaryRows,
        bucketColumnId,
        mode: bucketMode,
        timeInterval: bucketInterval,
        numericBucketSize: bucketNumericSize,
        groupByIds: bucketGroupBy,
        metric: bucketMetric,
        valueColumnId: bucketValueColumnId,
      });
      if (built.ready) {
        sheets.push({
          id: "run-buckets",
          title: "Buckets",
          columns: built.columns,
          rows: built.rows,
          span: sheets.length ? "half" : "full",
          table: "buckets",
          summary: "Buckets",
        });
      }
    }
    if (joinCommitted && tradePreview.columns.length) {
      const fromRun = tickersFromRows(marketRows, marketCap);
      const fallback = joinedMarkets.map((market) => market.ticker).filter(Boolean);
      const list = fromRun.length ? fromRun : fallback.length ? fallback : previewTicker ? [previewTicker] : [];
      runTickers = list;
      const pulled = await mapPool(list, 4, async (ticker) => {
        try {
          const result = await loadKalshiHistoricalTradesForTicker(ticker, sheetCap);
          return { ticker, columns: result.columns?.length ? result.columns : tradePreview.columns, rows: result.rows || [] };
        } catch {
          return { ticker, columns: tradePreview.columns, rows: [] };
        }
      });
      pulled.forEach((item) => {
        const own = item.ticker === previewTicker;
        const withFormula = functionOnTrades && (functionTarget !== "trades" || own);
        const shaped = withFormula
          ? withFunctionColumn(item.columns, item.rows, true, functionFormula, formulaSheets, "trades")
          : { columns: item.columns, rows: item.rows };
        if (!shaped.columns.length) return;
        const id = `run-trades-${String(item.ticker).replace(/[^A-Za-z0-9]+/g, "-")}`;
        const fullRows = shaped.rows || [];
        const pull = { lake: "kalshi", table: "trades", ticker: item.ticker, limit: sheetCap };
        if (fullRows.length > 50) {
          rememberTradeSheet(id, item.ticker, shaped.columns, displayMatrix(shaped.columns, fullRows), sheetCap, accountId);
        }
        sheets.push({
          id,
          title: `Trades · ${item.ticker}`,
          columns: shaped.columns,
          rows: fullRows.slice(0, 50),
          rowCount: fullRows.length,
          pull,
          span: "half",
          table: "trades",
          summary: `Kalshi Historical · trades · ${item.ticker}`,
        });
      });
    }
    if (functionOnNew && newTableGrid.columns.length) {
      sheets.push({
        id: "run-column",
        title: "Column",
        columns: newTableGrid.columns,
        rows: newTableGrid.rows,
        span: sheets.some((sheet) => sheet.span !== "full") || sheets.length ? "half" : "full",
        table: tableId || "markets",
        summary: functionFormula.trim() ? `Function · ${functionFormula.trim()}` : "Function column",
      });
    }
    if (!sheets.length) return;

    canvas?.placeIntegrationSheets?.(sheets);
    const joinRecord = joinCommitted
      ? {
          target: "kalshiHistoricalTrades",
          tickers: runTickers,
          previewTicker,
        }
      : tradesJoinReady
        ? {
            target: "kalshiHistoricalMarkets",
            placement: joinPlacement,
            columns: selectedMarketColumns.map((column) => column.id),
            tickers: joinedTickers,
          }
        : null;
    canvas?.registerTables?.(
      sheets.map((sheet) => ({
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
        query: sheet.pull
          ? {
              summary: sheet.summary,
              integrationId,
              tableId: "trades",
              formula: functionActive ? functionFormula : "",
              join: joinRecord,
              pull: sheet.pull,
            }
          : {
              summary: sheet.summary,
              integrationId,
              tableId: sheet.table,
              formula: functionActive ? functionFormula : "",
              join: joinRecord,
              athena: lockedQuery?.athena || athenaRequest(),
            },
      })),
    );
    const historyId = `run-${Date.now().toString(36)}`;
    const pullEntry = {
      id: historyId,
      savedAt: Date.now(),
      label: lockedQuery?.label || describeSearch(),
      fingerprint: lockedQuery?.fingerprint || "",
      integrationId,
      tableId,
      sheets: sheets.map((sheet) => ({
        id: sheet.id,
        title: sheet.title,
        table: sheet.table,
        rowCount: sheet.rows.length,
        summary: sheet.summary,
      })),
      athena: lockedQuery?.athena || athenaRequest(),
      join: joinRecord,
      formula: functionActive ? functionFormula : "",
      summaryCells: enrichPick === "summarize" ? summaryCells : null,
      bucket:
        enrichPick === "bucket"
          ? {
              bucketColumnId,
              mode: bucketMode,
              timeInterval: bucketInterval,
              numericBucketSize: bucketNumericSize,
              groupByIds: bucketGroupBy,
              metric: bucketMetric,
              valueColumnId: bucketValueColumnId,
            }
          : null,
      randomSample:
        enrichPick === "sample" && sampleSizeNumber > 0
          ? { size: sampleSizeNumber, mode: sampleMode, seed: sampleMode === "seeded" ? sampleSeed : "" }
          : null,
    };
    setPulls((current) => {
      const next = rememberEntry(current, pullEntry, 80, false);
      if (accountId) writeUserQueryCache(accountId, { saved, pulls: next });
      return next;
    });
    if (accountId) saveWorkspaceQuery("pull", pullEntry);
    ctx?.setDataSheets?.((prev) => {
      const next = { ...(prev || {}) };
      for (const sheet of sheets) {
        next[sheet.id] = {
          name: sheet.title,
          data: sheetRecords(sheet.columns, sheet.rows),
          storageMode: "inline",
          provenance: { lake: "kalshi", table: sheet.table, querySummary: sheet.summary },
          requestCards: [
            {
              id: `${historyId}:${sheet.id}`,
              lake: "kalshi",
              table: sheet.table,
              querySummary: sheet.summary,
            },
          ],
        };
      }
      return next;
    });
    connect?.close?.();
    } finally {
      setRunning(false);
    }
  }

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
            picked={enrichPick}
            onPick={(id) => {
              if (id === "summarize") {
                setHoverSummarize(false);
                setSummaryTab("summary");
                setSummaryFocus({ columnId: "label", row: 0 });
                setFormulaEditing(true);
                setFormulaFocused(true);
                formulaCaretRef.current = (summaryCells[summaryCellKey("label", 0)] || "").length;
                setFormulaFocusToken((token) => token + 1);
              }
              if (id === "bucket") {
                setHoverBucket(false);
                setBucketTab("buckets");
              }
              if (id === "sample") {
                setHoverSample(false);
                setSampleMode((current) => current || "seeded");
                setSampleSeed((current) => current || generateRandomSampleSeed());
              }
              setEnrichPick(id);
            }}
            joinTarget={joinTarget}
            onJoinTarget={setJoinTarget}
            onClear={() => {
              setHoverJoin(false);
              setEnrichPick("");
              setJoinTarget("");
              setJoinPlacement("");
              setMetadataTab("trades");
              setMarketColumnHidden(defaultMarketColumnHidden(kalshiHistoricalMarketColumnList()));
              setJoinTab("markets");
              setFunctionTab("");
              setFunctionTarget((current) => (current === "trades" || current === "trades-all" || current === "all" ? "" : current));
            }}
            marketCap={marketCap}
            queryRows={queryRows}
            sheetCount={sheetCount}
            onHoverJoin={setHoverJoin}
            functionTables={functionChoices({ joinActive: joinCommitted, previewTicker, sheetTitle })}
            functionTarget={functionTarget}
            onFunctionTarget={chooseFunctionTarget}
            onClearFunction={() => {
              setHoverFunction(false);
              setEnrichPick("");
              setFunctionTarget("");
              setFunctionFormula("");
              setFunctionTab("");
              setFormulaFocused(false);
              setFormulaEditing(false);
            }}
            functionScopeNote={functionActive ? functionScopeNote : ""}
            onHoverFunction={setHoverFunction}
            onHoverSummarize={setHoverSummarize}
            onClearSummary={() => {
              setHoverSummarize(false);
              setEnrichPick("");
              setSummaryCells({});
              setSummaryFocus({ columnId: "label", row: 0 });
              setSummaryTab("summary");
              setFormulaEditing(false);
              setFormulaFocused(false);
            }}
            summaryNote={`New sheet. Click a cell and type an equation, like = SUM(${summaryMeasure}). Click a column on ${sheetTitle} to drop it in.`}
            showSummarizeBuilder={kalshiEnrich}
            onFunctionHelp={() => setFunctionHelp(true)}
            onSaveAndRun={onSaveAndRun}
            running={running}
            showJoinBuilder={marketsQuery || tradesQuery}
            showFunctionBuilder={marketsQuery || tradesQuery}
            joinMode={tradesQuery ? "trades" : "markets"}
            joinPlacement={joinPlacement}
            onJoinPlacement={(placement) => {
              setHoverJoin(false);
              setJoinPlacement(placement);
              setMetadataTab(placement === "sheet" ? "markets" : "trades");
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
            bucketColumns={shownColumns}
            bucketColumnId={bucketColumnId}
            onBucketColumn={chooseBucketColumn}
            bucketMode={bucketMode}
            onBucketMode={setBucketMode}
            bucketInterval={bucketInterval}
            onBucketInterval={setBucketInterval}
            bucketNumericSize={bucketNumericSize}
            onBucketNumericSize={setBucketNumericSize}
            bucketGroupBy={bucketGroupBy}
            onToggleBucketGroup={(id) =>
              setBucketGroupBy((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]))
            }
            bucketMetric={bucketMetric}
            onBucketMetric={chooseBucketMetric}
            bucketValueColumnId={bucketValueColumnId}
            onBucketValueColumn={setBucketValueColumnId}
            onClearBucket={() => {
              setHoverBucket(false);
              setEnrichPick("");
              setBucketColumnId("");
              setBucketMode("category");
              setBucketInterval("day");
              setBucketNumericSize("");
              setBucketGroupBy([]);
              setBucketMetric("count");
              setBucketValueColumnId("");
              setBucketTab("buckets");
            }}
            sampleSize={sampleSize}
            onSampleSize={setSampleSize}
            sampleMode={sampleMode}
            onSampleMode={chooseSampleMode}
            sampleError={enrichPick === "sample" ? sampleSizeError : ""}
            onClearSample={() => {
              setHoverSample(false);
              setEnrichPick("");
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
            {guidedFilters ? (
              <KalshiHistoricalAttributeFilters
                columns={pull?.columns || []}
                filters={attributeFilters}
                onChange={setAttributeFilters}
                sorts={sortKeys}
                onSorts={setSortKeys}
                rowLimit={rowLimit}
                onRowLimit={setRowLimit}
                sectionTitle={tableId === "trades" ? "Trade attributes" : "Market attributes"}
              />
            ) : null}
          </Accordion>

          {guidedFilters ? null : (
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
          <h2 className="pt-0.5 text-[15px] font-semibold text-foreground">Preview</h2>
          <div className="flex min-w-0 flex-col items-end">
            <p className="text-right text-[12px] text-muted-foreground">{paneLine}</p>
            {typeof planLimit === "number" &&
            !(showJoinSheets && joinTab !== "markets") &&
            !showSummarizeExplainer &&
            !showFunctionExplainer &&
            !showJoinExplainer &&
            !showBucketExplainer &&
            !showSampleExplainer &&
            !(functionOnNew && functionTab === "new") &&
            !(summaryActive && summaryTab === "summary") &&
            !(bucketActive && bucketTab === "buckets") &&
            !sampleActive &&
            !(tradesJoinReady && joinPlacement === "sheet" && metadataTab === "markets") ? (
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
            ) : tradesJoinReady && joinPlacement === "sheet" && metadataTab === "markets" ? (
              <p className="mt-1 text-right text-[11px] text-muted-foreground">Preview only. This sheet is created when you run the pull.</p>
            ) : summaryActive && summaryTab === "summary" ? (
              <p className="mt-1 text-right text-[11px] text-muted-foreground">Preview only. This sheet is created when you run the pull.</p>
            ) : bucketActive && bucketTab === "buckets" ? (
              <p className="mt-1 text-right text-[11px] text-muted-foreground">Preview only. This sheet is created when you run the pull.</p>
            ) : sampleActive ? (
              <p className="mt-1 text-right text-[11px] text-muted-foreground">Preview shuffles the rows on screen. Athena draws the full sample when you run the pull.</p>
            ) : null}
          </div>
        </div>
        <div className="h-1 w-full bg-black/5 dark:bg-white/10">
          <div
            className={cn("h-full bg-[#0d99ff] transition-[width] duration-300", loading || emptyRefresh ? "" : "opacity-0")}
            style={{ width: `${Math.min(100, progress)}%` }}
          />
        </div>
        {showSummarizeExplainer ? (
          <SummarizeExplainerTabs sheetTitle={sheetTitle} />
        ) : showBucketExplainer ? (
          <BucketExplainerTabs sheetTitle={sheetTitle} />
        ) : showFunctionExplainer ? (
          <FunctionExplainerTabs sheetTitle={sheetTitle} />
        ) : summaryActive ? (
          <SummaryPreviewTabs
            sheetTitle={sheetTitle}
            active={summaryTab}
            onSummary={() => setSummaryTab("summary")}
            onSource={() => setSummaryTab("source")}
          />
        ) : bucketActive ? (
          <SummaryPreviewTabs
            sheetTitle={sheetTitle}
            resultTitle="Buckets"
            active={bucketTab === "buckets" ? "summary" : "source"}
            onSummary={() => setBucketTab("buckets")}
            onSource={() => setBucketTab("source")}
          />
        ) : showJoinExplainer ? (
          <JoinExplainerTabs source={tradesQuery ? "trades" : "markets"} />
        ) : functionOnNew ? (
          <FunctionDestinationTabs
            sheetTitle={sheetTitle}
            joinCommitted={joinCommitted}
            previewTicker={previewTicker}
            functionTab={functionTab}
            joinTab={joinTab}
            onMarkets={() => {
              setFunctionTab("");
              setJoinTab("markets");
              if (tradesQuery && joinPlacement === "sheet") setMetadataTab("trades");
            }}
            onTrades={() => {
              setFunctionTab("");
              if (previewTicker) setJoinTab(previewTicker);
            }}
            onNew={() => {
              setFunctionTab("new");
              setFunctionScrollKey((key) => key + 1);
            }}
          />
        ) : tradesJoinReady && joinPlacement === "sheet" ? (
          <TradesJoinPreviewTabs
            active={metadataTab}
            onSelect={(tab) => {
              setMetadataTab(tab);
              setFunctionScrollKey((key) => key + 1);
            }}
          />
        ) : showJoinSheets ? (
          <JoinSheetTabs
            markets={joinedMarkets}
            active={joinTab}
            previewTicker={previewTicker}
            sheetCount={sheetCount}
            onSelect={(tab) => {
              setJoinTab(tab);
              if ((tab === "markets" && functionOnMarkets) || (tab === previewTicker && functionOnTrades)) {
                setFunctionScrollKey((key) => key + 1);
              }
            }}
          />
        ) : null}
        <div className="min-h-0 flex-1 p-4">
          {showSummarizeExplainer ? (
            <SummarizeExplainer measure={summaryMeasure} />
          ) : showBucketExplainer ? (
            <BucketExplainer measure={summaryMeasure} />
          ) : showSampleExplainer ? (
            <SampleExplainer />
          ) : showFunctionExplainer ? (
            <FunctionExplainer />
          ) : bucketActive && bucketTab === "buckets" ? (
            bucketView.ready ? (
              <IntegrationBuildGrid
                columns={bucketView.columns}
                rows={bucketView.rows}
                highlightColumnId={bucketView.metricId}
                scrollToken={functionScrollKey}
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
              <IntegrationBuildGrid columns={shownColumns} rows={samplePreviewRows} scrollToken={sampleShuffle} />
            )
          ) : summaryActive && summaryTab === "summary" ? (
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
                      examples: summaryExamples(summarySourceColumns, summaryMeasure),
                      suggestions: formulaSuggestions(summaryFormula, formulaCaret),
                      focusToken: formulaFocusToken,
                      row: summaryFocus.row,
                      onChange: (value) => {
                        const key = summaryCellKey(summaryFocus.columnId, summaryFocus.row);
                        setSummaryCells((current) => ({ ...current, [key]: value }));
                      },
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
                        const key = summaryCellKey(summaryFocus.columnId, summaryFocus.row);
                        setSummaryCells((current) => {
                          const value = current[key] || "";
                          formulaCaretRef.current = item.from + item.name.length + 1;
                          setFormulaCaret(formulaCaretRef.current);
                          return { ...current, [key]: `${value.slice(0, item.from)}${item.name}(${value.slice(item.to)}` };
                        });
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
          ) : summaryActive ? (
            <IntegrationBuildGrid
              columns={marketsGrid.columns}
              rows={marketsGrid.rows}
              highlightColumnIds={(summaryView.references || []).filter((ref) => ref.row == null).map((ref) => ref.column.id)}
              referencedCells={(summaryView.references || [])
                .filter((ref) => ref.row != null)
                .map((ref) => ({ columnId: ref.column.id, row: ref.row }))}
              scrollToken={functionScrollKey}
              formulaEditor={
                formulaEditing
                  ? {
                      bar: true,
                      value: summaryFormula,
                      error: summaryView.error,
                      examples: summaryExamples(summarySourceColumns, summaryMeasure),
                      suggestions: formulaSuggestions(summaryFormula, formulaCaret),
                      focusToken: formulaFocusToken,
                      onChange: (value) => {
                        const key = summaryCellKey(summaryFocus.columnId, summaryFocus.row);
                        setSummaryCells((current) => ({ ...current, [key]: value }));
                      },
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
                        const key = summaryCellKey(summaryFocus.columnId, summaryFocus.row);
                        setSummaryCells((current) => {
                          const value = current[key] || "";
                          formulaCaretRef.current = item.from + item.name.length + 1;
                          setFormulaCaret(formulaCaretRef.current);
                          return { ...current, [key]: `${value.slice(0, item.from)}${item.name}(${value.slice(item.to)}` };
                        });
                        setFormulaFocused(true);
                        setFormulaFocusToken((token) => token + 1);
                      },
                      onCommit: () => setFormulaFocused(false),
                    }
                  : null
              }
              onFormulaPick={(pick) => acceptFormulaPick(pick, "markets")}
            />
          ) : showJoinExplainer ? (
            <JoinExplainer source={tradesQuery ? "trades" : "markets"} />
          ) : functionOnNew && functionTab === "new" && newTableGrid.columns.length ? (
            <IntegrationBuildGrid
              columns={newTableGrid.columns}
              rows={newTableGrid.rows}
              highlightColumnId={newTableGrid.highlight}
              scrollToken={functionScrollKey}
              {...referencesFor("new")}
              formulaEditor={formulaEditorFor("new", false)}
              onFormulaPick={(pick) => acceptFormulaPick(pick, "new")}
            />
          ) : showJoinSheets && !previewTicker ? (
            <div className="flex h-full items-center justify-center rounded-xl border border-border/70 bg-background px-6 text-center text-[13px] leading-relaxed text-muted-foreground shadow-sm">
              This query has no market tickers to attach trades to.
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
              formulaEditor={formulaEditorFor("trades", false) || formulaEditorFor("trades", true)}
              onFormulaPick={(pick) => acceptFormulaPick(pick, "trades")}
            />
          ) : tradesJoinReady && joinPlacement === "sheet" && metadataTab === "markets" ? (
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
                highlightColumnIds={selectedMarketColumns.map((column) => column.id)}
                scrollToken={functionScrollKey}
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
          ) : loading || emptyRefresh ? (
            <div className="flex h-full flex-col gap-3">
              {integrationId === "chainlink" || integrationId === "binance" ? <WaitingToConnectTag /> : null}
              <div className="min-h-0 flex-1">
                <SkeletonRows />
              </div>
            </div>
          ) : marketsGrid.columns.length ? (
            <IntegrationBuildGrid
              columns={marketsGrid.columns}
              rows={marketsGrid.rows}
              highlightColumnId={marketsGrid.highlight || (tradesJoinReady && joinPlacement === "merge" ? tradeJoinBase.highlightIds[0] || "" : "")}
              highlightColumnIds={tradesJoinReady && joinPlacement === "merge" ? tradeJoinBase.highlightIds : []}
              scrollToken={functionScrollKey}
              {...referencesFor("markets")}
              formulaEditor={formulaEditorFor("markets", false) || formulaEditorFor("markets", true)}
              onFormulaPick={(pick) => acceptFormulaPick(pick, "markets")}
            />
          ) : (
            <div className="flex h-full items-center justify-center rounded-xl border border-border/70 bg-background text-[13px] text-muted-foreground shadow-sm">
              Select at least one column to preview.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
