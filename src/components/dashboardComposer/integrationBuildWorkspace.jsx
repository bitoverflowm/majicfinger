"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ChevronDown, History, Info } from "lucide-react";
import { IntegrationBuildGrid } from "@/components/dashboardComposer/integrationBuildGrid";
import { FunctionExplainer, FunctionExplainerTabs } from "@/components/dashboardComposer/integrationFunctionExplainer";
import { JoinExplainer, JoinExplainerTabs } from "@/components/dashboardComposer/integrationJoinExplainer";
import { SpectrumLoadingState } from "@/components/ui/spectrum-loading-state";
import {
  BUILD_SOURCES,
  buildKalshiHistoricalMarketsRequest,
  loadBuildPreview,
  loadBuildUniverseCount,
  loadKalshiHistoricalMarketsPreview,
  loadKalshiHistoricalTradesForTicker,
  peekBuildUniverseCount,
  appendQueryHistory,
  readSavedSearches,
  saveSearch,
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
import { listConnectHomeSheetHistory, requestCardSummaryLabel } from "@/lib/connectHomeRequestHistory";
import { useUser } from "@/lib/hooks";
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
import { useWorkspaceCanvas } from "@/components/dashboardComposer/workspaceCanvas";

function humanHistoryLabel(label) {
  return String(label || "")
    .replace(/\b(select|where|from|group by|order by)\b/gi, "")
    .replace(/\s+/g, " ")
    .replace(/\s·\s·/g, " · ")
    .trim();
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
  { id: "ifElse", title: "If else" },
  { id: "sample", title: "Random sample" },
  { id: "bucket", title: "Bucketing" },
  { id: "function", title: "Function" },
];

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
  onFunctionHelp,
  onSaveAndRun,
}) {
  const joinOpen = picked === "join";
  const functionOpen = picked === "function";
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
          return (
            <div
              key={option.id}
              onMouseEnter={isJoin ? () => onHoverJoin(true) : undefined}
              onMouseLeave={isJoin ? () => onHoverJoin(false) : undefined}
            >
              <div
                className="flex items-center gap-1.5"
                onMouseEnter={isFunction ? () => onHoverFunction(true) : undefined}
                onMouseLeave={isFunction ? () => onHoverFunction(false) : undefined}
              >
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
              {isFunction ? (
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
          onClick={onSaveAndRun}
          className="bg-[#0d99ff] text-white hover:bg-[#0d99ff]/90"
        >
          Save and run
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
  const [saved, setSaved] = useState(() => readSavedSearches());
  const [step, setStep] = useState("query");
  const [lockedQuery, setLockedQuery] = useState(null);
  const [justSaved, setJustSaved] = useState(false);
  const restoreRef = useRef(null);
  const [enrichPick, setEnrichPick] = useState("");
  const [hoverJoin, setHoverJoin] = useState(false);
  const [joinTarget, setJoinTarget] = useState("");
  const [joinTab, setJoinTab] = useState("markets");
  const [tradePreview, setTradePreview] = useState({ status: "idle", ticker: "", columns: [], rows: [], error: "" });
  const [hoverFunction, setHoverFunction] = useState(false);
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
  const guidedFilters = integrationId === "kalshiHistorical" && tableId === "markets";

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
          (column.id === "last_price" || column.id === "yes_bid" || column.id === "yes_price")
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
      loadKalshiHistoricalMarketsPreview(predicates, sortKeys)
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
  }, [guidedFilters, attributeFilters, pull?.columns, sortKeys]);

  const history = useMemo(() => {
    const entries = listConnectHomeSheetHistory(ctx?.dataSheets || {});
    const items = [];
    for (const entry of entries) {
      for (const card of entry.cards) {
        const raw = requestCardSummaryLabel(card, entry.sheet);
        const label = humanHistoryLabel(raw);
        if (!label) continue;
        items.push({ id: card.id, label });
      }
    }
    return items.slice(0, 12);
  }, [ctx?.dataSheets]);

  const savedForSource = saved.filter((item) => item.integrationId === integrationId);

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
    return buildKalshiHistoricalMarketsRequest({
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
    setSaved(saveSearch(entry));
    setJustSaved(true);
    window.setTimeout(() => setJustSaved(false), 1600);
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
  const joinCommitted = step === "enrich" && joinTarget === "kalshiHistoricalTrades";
  const showFunctionExplainer = step === "enrich" && hoverFunction;
  const showJoinExplainer = step === "enrich" && hoverJoin && !joinCommitted && !showFunctionExplainer;
  const showJoinSheets = joinCommitted && !showFunctionExplainer && !showJoinExplainer;
  const functionActive = step === "enrich" && enrichPick === "function" && Boolean(functionTarget) && !showFunctionExplainer;
  const functionOnMarkets = functionActive && (functionTarget === "markets" || functionTarget === "all");
  const functionOnTrades = functionActive && (functionTarget === "trades" || functionTarget === "trades-all" || functionTarget === "all");
  const functionOnNew = functionActive && functionTarget === "new";
  const sheetTitle = tableId === "markets" ? "Markets" : tables[tableId]?.label || "This sheet";
  const formulaSheets = useMemo(() => {
    const used = new Set();
    const list = [];
    const push = (sheet) => {
      const title = String(sheet.title || "Sheet");
      if (used.has(title.toLowerCase())) return;
      used.add(title.toLowerCase());
      list.push(sheet);
    };
    if (shownColumns.length) push({ id: "markets", title: sheetTitle, columns: shownColumns, rows: filteredRows });
    if (tradePreview.columns.length && previewTicker) {
      push({ id: "trades", title: previewTicker, columns: tradePreview.columns, rows: tradePreview.rows });
    }
    for (const sheet of sheetsFromBlocks(canvas?.blocks, used)) list.push(sheet);
    return list;
  }, [shownColumns, filteredRows, tradePreview.columns, tradePreview.rows, previewTicker, sheetTitle, canvas?.blocks]);
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
      : { columns: shownColumns, rows: filteredRows, sheetId: editSheetId === "new" ? "new" : "markets" };
  const marketsGrid = withFunctionColumn(
    shownColumns,
    filteredRows,
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
  const newTableGrid = withFunctionColumn(shownColumns, filteredRows, functionOnNew, functionFormula, formulaSheets, "new");
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
  const paneLine = (() => {
    if (showFunctionExplainer) return "Illustration. The column is added when you pick a sheet.";
    if (showJoinExplainer) return "Illustration. No trades are loaded until you run the pull.";
    if (functionOnNew && functionTab === "new") return "New table. This sheet is created when you run the pull.";
    if (!showJoinSheets || joinTab === "markets") return previewLineShown;
    if (joinTab !== previewTicker) return PREVIEW_TRADE_LOCK;
    if (tradePreview.status === "loading") return "Loading trades for the first market";
    if (tradePreview.status === "error") return tradePreview.error;
    const count = tradePreview.rows.length;
    return `Previewing ${count.toLocaleString()} ${count === 1 ? "trade" : "trades"} of ${previewTicker}`;
  })();

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
  }

  function insertReference(text) {
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

  function acceptFormulaPick(pick, sheetId) {
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

  function onSaveAndRun() {
    const sheets = [];
    if (marketsGrid.columns.length) {
      sheets.push({
        id: "run-markets",
        title: sheetTitle,
        columns: marketsGrid.columns,
        rows: marketsGrid.rows,
        span: "full",
        table: tableId || "markets",
        summary: lockedQuery?.label || describeSearch(),
      });
    }
    if (joinCommitted && tradePreview.columns.length) {
      const tickers = joinedMarkets.map((market) => market.ticker).filter(Boolean);
      const list = tickers.length ? tickers : previewTicker ? [previewTicker] : [];
      list.forEach((ticker) => {
        const own = ticker === previewTicker;
        const withFormula = functionOnTrades && (functionTarget !== "trades" || own);
        const columns = withFormula && tradesGrid.columns.length ? tradesGrid.columns : tradePreview.columns;
        const rows = own ? (withFormula && tradesGrid.rows.length ? tradesGrid.rows : tradePreview.rows) : [];
        if (!columns.length) return;
        sheets.push({
          id: `run-trades-${String(ticker).replace(/[^A-Za-z0-9]+/g, "-")}`,
          title: `Trades · ${ticker}`,
          columns,
          rows,
          span: "half",
          table: "trades",
          summary: `Kalshi Historical · trades · ${ticker}`,
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
    const historyId = `run-${Date.now().toString(36)}`;
    appendQueryHistory({
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
      join: joinCommitted
        ? {
            target: "kalshiHistoricalTrades",
            tickers: joinedMarkets.map((market) => market.ticker).filter(Boolean),
            previewTicker,
          }
        : null,
      formula: functionActive ? functionFormula : "",
    });
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
            onPick={setEnrichPick}
            joinTarget={joinTarget}
            onJoinTarget={setJoinTarget}
            onClear={() => {
              setHoverJoin(false);
              setEnrichPick("");
              setJoinTarget("");
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
            onFunctionHelp={() => setFunctionHelp(true)}
            onSaveAndRun={onSaveAndRun}
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
                {history.length ? (
                  history.map((entry) => (
                    <DropdownMenuItem key={entry.id} disabled>
                      {entry.label}
                    </DropdownMenuItem>
                  ))
                ) : (
                  <DropdownMenuItem disabled>No earlier pulls in this workspace</DropdownMenuItem>
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
            {typeof planLimit === "number" && !(showJoinSheets && joinTab !== "markets") && !(functionOnNew && functionTab === "new") ? (
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
            ) : null}
          </div>
        </div>
        <div className="h-1 w-full bg-black/5 dark:bg-white/10">
          <div
            className={cn("h-full bg-[#0d99ff] transition-[width] duration-300", loading || emptyRefresh ? "" : "opacity-0")}
            style={{ width: `${Math.min(100, progress)}%` }}
          />
        </div>
        {showFunctionExplainer ? (
          <FunctionExplainerTabs sheetTitle={sheetTitle} />
        ) : showJoinExplainer ? (
          <JoinExplainerTabs />
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
          {showFunctionExplainer ? (
            <FunctionExplainer />
          ) : showJoinExplainer ? (
            <JoinExplainer />
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
              highlightColumnId={marketsGrid.highlight}
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
