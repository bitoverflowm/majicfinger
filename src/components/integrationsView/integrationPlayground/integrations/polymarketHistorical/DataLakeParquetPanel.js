"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible as CollapsibleRoot, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Play, AlertCircle, HelpCircle, ChevronDown, Minus, Plus, Pencil, Trash2, Wrench, X } from "lucide-react";
import { getDataLakeDatasetConfig, ATHENA_SAMPLE_ROW_LIMIT } from "@/config/dataLakeParquetSamples";
import { fetchAthenaLakeSample } from "@/lib/dataLake/fetchAthenaSample";
import { ingestAthenaResultAsView, listBeckerParquetViews } from "@/lib/duckdb/duckdbWasmClient";
import { ConnectProgressWithLabel } from "./ConnectProgressWithLabel";
import { runParquetSheetLoadWithProgress, PARQUET_LOAD_PHASE_MESSAGES } from "./parquetSheetLoadProgress";
import { ReplaceOrNewSheetDialog } from "@/components/dataView/replaceOrNewSheetDialog";
import { MetaAddOperationDialog } from "./MetaAddOperationDialog";
import { useMyStateV2 } from "@/context/stateContextV2";

// Athena/Glue schema metadata for each Becker dataset/table.
// We store types for later use, but only display column names in the UI.
const POLYMARKET_MARKETS_COLUMNS = [
  { name: "id", type: "string" },
  { name: "condition_id", type: "string" },
  { name: "question", type: "string" },
  { name: "slug", type: "string" },
  { name: "outcomes", type: "string" },
  { name: "outcome_prices", type: "string" },
  { name: "clob_token_ids", type: "string" },
  { name: "volume", type: "double" },
  { name: "liquidity", type: "double" },
  { name: "active", type: "boolean" },
  { name: "closed", type: "boolean" },
  { name: "end_date", type: "bigint" },
  { name: "created_at", type: "bigint" },
  { name: "market_maker_address", type: "string" },
  { name: "_fetched_at", type: "bigint" },
];

const POLYMARKET_TRADES_COLUMNS = [
  { name: "block_number", type: "bigint" },
  { name: "transaction_hash", type: "string" },
  { name: "log_index", type: "bigint" },
  { name: "order_hash", type: "string" },
  { name: "maker", type: "string" },
  { name: "taker", type: "string" },
  { name: "maker_asset_id", type: "string" },
  { name: "taker_asset_id", type: "string" },
  { name: "maker_amount", type: "bigint" },
  { name: "taker_amount", type: "bigint" },
  { name: "fee", type: "bigint" },
  { name: "timestamp", type: "int" },
  { name: "_fetched_at", type: "bigint" },
  { name: "_contract", type: "string" },
];

const POLYMARKET_BLOCKS_COLUMNS = [
  { name: "block_number", type: "bigint" },
  { name: "timestamp", type: "string" },
];

const KALSHI_MARKETS_COLUMNS = [
  { name: "ticker", type: "string" },
  { name: "event_ticker", type: "string" },
  { name: "market_type", type: "string" },
  { name: "title", type: "string" },
  { name: "yes_sub_title", type: "string" },
  { name: "no_sub_title", type: "string" },
  { name: "status", type: "string" },
  { name: "yes_bid", type: "bigint" },
  { name: "yes_ask", type: "bigint" },
  { name: "no_bid", type: "bigint" },
  { name: "no_ask", type: "bigint" },
  { name: "last_price", type: "bigint" },
  { name: "volume", type: "bigint" },
  { name: "volume_24h", type: "bigint" },
  { name: "open_interest", type: "bigint" },
  { name: "result", type: "string" },
  { name: "created_time", type: "bigint" },
  { name: "open_time", type: "bigint" },
  { name: "close_time", type: "bigint" },
  { name: "_fetched_at", type: "bigint" },
];

const KALSHI_TRADES_COLUMNS = [
  { name: "trade_id", type: "string" },
  { name: "ticker", type: "string" },
  { name: "count", type: "bigint" },
  { name: "yes_price", type: "bigint" },
  { name: "no_price", type: "bigint" },
  { name: "taker_side", type: "string" },
  { name: "created_time", type: "bigint" },
  { name: "_fetched_at", type: "bigint" },
];

/**
 * @param {"polymarket" | "kalshi"} ds
 * @param {"markets" | "trades" | "blocks"} table
 * @returns {{name: string, type: string}[]}
 */
function getColumnMetaForTable(ds, table) {
  if (ds === "kalshi") {
    if (table === "markets") return KALSHI_MARKETS_COLUMNS;
    if (table === "trades") return KALSHI_TRADES_COLUMNS;
    return [];
  }
  if (table === "markets") return POLYMARKET_MARKETS_COLUMNS;
  if (table === "trades") return POLYMARKET_TRADES_COLUMNS;
  return POLYMARKET_BLOCKS_COLUMNS;
}

function operatorSymbol(op) {
  if (op === "gt") return ">";
  if (op === "lt") return "<";
  if (op === "eq" || op === "contains") return "=";
  if (op === "neq" || op === "not_contains") return "!=";
  return "=";
}

function genMetaOpId() {
  return `metaop-${Date.now().toString(36)}-${Math.random().toString(16).slice(2)}`;
}

function genComposeRowId() {
  return `cs-${Date.now().toString(36)}-${Math.random().toString(16).slice(2)}`;
}

/** @param {{ aggregate: null | string }} item */
function composeRollUpSelectValue(item) {
  if (item.aggregate === "sum") return "sum";
  if (item.aggregate === "count") return "count";
  return "none";
}

/** @param {{ dateBucket: null | string; dateFormat: null | string }} item */
function composeDateShapeSelectValue(item) {
  if (item.dateBucket) return `bucket:${item.dateBucket}`;
  if (item.dateFormat === "dmy") return "fmt:dmy";
  if (item.dateFormat === "ym") return "fmt:ym";
  if (item.dateFormat === "dm") return "fmt:dm";
  return "raw";
}

/** @param {string} shape */
function patchesForDateShape(shape) {
  if (shape === "raw") return { dateBucket: null, dateFormat: null };
  if (shape.startsWith("bucket:")) {
    return { dateBucket: shape.slice(7), dateFormat: null, treatAsDate: true };
  }
  if (shape.startsWith("fmt:")) {
    return { dateBucket: null, dateFormat: shape.slice(4), treatAsDate: true };
  }
  return {};
}

/**
 * @param {{ mode: string; filters?: { and: any[]; or: any[] }; merge?: { and: any[]; or: any[] } | null }} op
 * @returns {{ and: any[]; or: any[]; mergeAnd?: any[]; mergeOrBranch?: any[] } | null}
 */
function resolveFiltersForMetaSpec(op) {
  if (op.mode === "all") return null;
  const base = { and: [...(op.filters?.and || [])], or: [...(op.filters?.or || [])] };
  const mergeAnd = Array.isArray(op.merge?.and) ? op.merge.and : [];
  const mergeOrBranch = Array.isArray(op.merge?.or) ? op.merge.or : [];
  return {
    ...base,
    ...(mergeAnd.length ? { mergeAnd } : {}),
    ...(mergeOrBranch.length ? { mergeOrBranch } : {}),
  };
}

/**
 * @param {any} spec
 * @param {"AND" | "OR"} combinator
 * @param {any[]} predicates
 */
function applyMergeToSpec(spec, combinator, predicates) {
  const prevAnd = Array.isArray(spec?.merge?.and) ? spec.merge.and : [];
  const prevOr = Array.isArray(spec?.merge?.or) ? spec.merge.or : [];
  const nextMerge =
    combinator === "AND"
      ? { and: [...prevAnd, ...predicates], or: prevOr }
      : { and: prevAnd, or: [...prevOr, ...predicates] };
  return {
    ...spec,
    merge: nextMerge,
    label: metaOperationLabel(spec.kind, "filter", spec.aggregateColumn),
  };
}

function specHasIncompleteFilters(spec) {
  if (spec.mode !== "filter") return false;
  const all = [...(spec.filters?.and || []), ...(spec.filters?.or || [])];
  if (all.length === 0) return true;
  return all.some((f) => {
    if (!f?.column || !f?.op || !f?.kind) return true;
    if (f.kind === "string") return !String(f.value ?? "").trim();
    if (f.kind === "date") return !Number.isFinite(Number(f.value));
    return !Number.isFinite(Number(f.value));
  });
}

function metaOperationLabel(kind, mode, aggregateColumn) {
  const col = String(aggregateColumn || "").trim();
  if (kind === "count_distinct") {
    if (mode === "all") return col ? `Count unique ${col} (all rows)` : "Count unique (all rows)";
    return col ? `Count unique ${col} (filtered)` : "Count unique (filtered)";
  }
  if (kind === "sum") {
    if (mode === "all") return col ? `Sum ${col} (all rows)` : "Sum (all rows)";
    return col ? `Sum ${col} (filtered)` : "Sum (filtered)";
  }
  return mode === "all" ? "Count All Rows" : "Count (filtered)";
}

function metaOperationHeading(kind) {
  if (kind === "sum") return "Sum";
  return "Count";
}

function metaOperationDisplayName(op) {
  const custom = String(op?.label || "").trim();
  return custom || metaOperationHeading(op?.kind);
}

function areMetaRowsEqual(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const ar = a[i] || {};
    const br = b[i] || {};
    if (String(ar["meta query"] ?? "") !== String(br["meta query"] ?? "")) return false;
    if (String(ar.value ?? "") !== String(br.value ?? "")) return false;
  }
  return true;
}

/**
 * Becker / DuckDB-backed historical data: bounded Athena `SELECT <columns>` → JSON → DuckDB view → sheet.
 * Polymarket: markets, blocks, trades. Kalshi: markets, trades (no blocks in Glue).
 *
 * @param {{ setConnectedData?: (rows: Record<string, unknown>[]) => void; dataset?: "polymarket" | "kalshi" }} props
 */
export default function DataLakeParquetPanel({ setConnectedData: setConnectedDataFromProp, dataset = "polymarket" }) {
  const ctx = useMyStateV2();
  const connectedData = ctx?.connectedData ?? [];
  const replaceCurrentSheetData = ctx?.replaceCurrentSheetData;
  const setConnectedData = ctx?.setConnectedData ?? setConnectedDataFromProp;
  const addNewSheetAndActivate = ctx?.addNewSheetAndActivate;
  const setSheetData = ctx?.setSheetData;
  const setDataSheets = ctx?.setDataSheets;
  const liveStreamState = ctx?.liveStreamState;
  const activeSheetId = ctx?.activeSheetId;

  const streamsBySheetId = liveStreamState?.streamsBySheetId || {};
  const hasLiveConnection =
    !!activeSheetId &&
    !!streamsBySheetId[activeSheetId]?.isRunning;

  const { sampleOptions, lake } = useMemo(() => getDataLakeDatasetConfig(dataset), [dataset]);

  const canUseSamples = true;
  const [sampleId, setSampleId] = useState(sampleOptions[0]?.id || "");
  /** @type {Array<{ id: string; column: string; alias: string; aggregate: null | "sum" | "count"; dateBucket: null | string; dateFormat: null | string; numberScale: string; decimals: null | number; treatAsDate: boolean }>} */
  const [columnComposeItems, setColumnComposeItems] = useState([]);
  /** @type {Array<{ alias: string; direction: "asc" | "desc" }>} */
  const [columnComposeOrderBy, setColumnComposeOrderBy] = useState([]);
  const [selectionTab, setSelectionTab] = useState("columns"); // "columns" | "meta"
  const [metaQueryMode, setMetaQueryMode] = useState("all"); // "all" | "filter"
  const [metaOperationKind, setMetaOperationKind] = useState("count"); // "count" | "count_distinct" | "sum"
  const [metaOperationColumn, setMetaOperationColumn] = useState(""); // for SUM
  const [metaAndFilters, setMetaAndFilters] = useState([]); // advanced tags (AND)
  const [metaOrFilters, setMetaOrFilters] = useState([]); // advanced tags (OR)
  const [metaAdvancedOpen, setMetaAdvancedOpen] = useState(false);
  /** @type {Array<{ id: string; kind: string; mode: string; label: string; filters: { and: any[]; or: any[] }; merge: null | { targetId: string; combinator: string; extraPredicates: any[] } }>} */
  const [metaPriorOperations, setMetaPriorOperations] = useState([]);
  const [metaOperationAllSelected, setMetaOperationAllSelected] = useState(false);
  const [metaOperationsMenuOpen, setMetaOperationsMenuOpen] = useState(false);
  const [metaAddOperationDialogOpen, setMetaAddOperationDialogOpen] = useState(false);
  const [editingMetaOpId, setEditingMetaOpId] = useState(null);
  const [editingMetaOpName, setEditingMetaOpName] = useState("");
  const [editingDraftMetaName, setEditingDraftMetaName] = useState(false);
  const [draftMetaOpName, setDraftMetaOpName] = useState("");
  const [editingOperationTargetId, setEditingOperationTargetId] = useState(null);
  const [forceMetaOperationsMenuOpen, setForceMetaOperationsMenuOpen] = useState(false);
  /** @type {"default" | "new_sheet" | "append_row"} */
  const [metaRunDisposition, setMetaRunDisposition] = useState("default");
  const [loading, setLoading] = useState(false);
  const [loadLabel, setLoadLabel] = useState(PARQUET_LOAD_PHASE_MESSAGES[0].text);
  const [loadProgress, setLoadProgress] = useState(0);
  const [error, setError] = useState(null);
  const [lastRowCount, setLastRowCount] = useState(null);
  const [sheetDialogOpen, setSheetDialogOpen] = useState(false);
  const [beckerViews, setBeckerViews] = useState(() => listBeckerParquetViews());

  /** @type {React.MutableRefObject<null | { mode: "columns" | "meta"; lake: string; table: string; sampleId: string; composeSpec?: object; metaOpSpecs?: any[]; metaRunDisposition?: string; metaAppendTargetIndex?: number }>} */
  const pendingIngestRef = useRef(null);

  useEffect(() => {
    const first = sampleOptions[0]?.id || "";
    setSampleId((prev) => (sampleOptions.some((s) => s.id === prev) ? prev : first));
  }, [dataset, sampleOptions]);

  const selected = sampleOptions.find((s) => s.id === sampleId);
  const availableColumnMeta = useMemo(() => {
    if (!selected?.table) return [];
    return getColumnMetaForTable(dataset, selected.table);
  }, [dataset, selected?.table]);
  const availableColumns = useMemo(() => availableColumnMeta.map((c) => c.name), [availableColumnMeta]);
  const availableColumnTypesByName = useMemo(() => {
    const map = {};
    for (const c of availableColumnMeta) map[c.name] = c.type;
    return map;
  }, [availableColumnMeta]);

  const isDateLikeName = useCallback((name) => {
    return /(^timestamp$)|(_at$)|(_time$)|(^created_)|(_date$)|date|time/i.test(String(name || ""));
  }, []);

  const kindForColumn = useCallback((columnName) => {
    const t = availableColumnTypesByName[columnName];
    if (!t) return "string";
    const typeNorm = String(t).toLowerCase();
    if ((typeNorm === "bigint" || typeNorm === "int") && isDateLikeName(columnName)) return "date";
    if (typeNorm === "double" || typeNorm === "bigint" || typeNorm === "int") return "number";
    if (typeNorm === "string") return "string";
    return "string";
  }, [availableColumnTypesByName, isDateLikeName]);

  const hasComposeAggregates = useMemo(
    () => columnComposeItems.some((i) => i.aggregate === "sum" || i.aggregate === "count"),
    [columnComposeItems],
  );

  /** Date bucket / string format on a non-aggregated field — usually paired with Sum/Count for one row per bucket. */
  const hasComposeBucketOrDateFormat = useMemo(
    () =>
      columnComposeItems.some(
        (i) =>
          !i.aggregate &&
          ((i.dateBucket != null && String(i.dateBucket).trim() !== "") ||
            (i.dateFormat != null && String(i.dateFormat).trim() !== "")),
      ),
    [columnComposeItems],
  );

  const showComposeGroupingSection = hasComposeAggregates || hasComposeBucketOrDateFormat;

  /** Non-aggregate SELECT aliases — these are the GROUP BY keys when Sum/Count is used (e.g. one row per quarter). */
  const composeDimensionAliases = useMemo(
    () =>
      columnComposeItems
        .filter((i) => i.aggregate !== "sum" && i.aggregate !== "count")
        .map((i) => String(i.alias || i.column).trim()),
    [columnComposeItems],
  );

  const composeSelectAliasChoices = useMemo(() => {
    return columnComposeItems.map((i) => ({
      alias: i.alias,
      column: i.column,
      label: i.alias === i.column ? i.alias : `${i.alias} (${i.column})`,
    }));
  }, [columnComposeItems]);

  const buildServerComposePayload = useCallback(() => {
    return {
      select: columnComposeItems.map((i) => ({
        column: i.column,
        alias: String(i.alias || i.column).trim(),
        aggregate: i.aggregate || null,
        dateBucket: i.dateBucket || null,
        dateFormat: i.dateFormat || null,
        numberScale: i.numberScale || "none",
        decimals: i.decimals != null ? Number(i.decimals) : null,
        treatAsDate: i.treatAsDate === true,
      })),
      // Server normalizes too: with Sum/Count, GROUP BY is every non-aggregate field (e.g. quarter) so many trades in Q1 2024 become one row.
      groupByAliases: hasComposeAggregates ? composeDimensionAliases : [],
      orderBy: columnComposeOrderBy,
    };
  }, [columnComposeItems, columnComposeOrderBy, hasComposeAggregates, composeDimensionAliases]);

  const composeFriendlySummary = useMemo(() => {
    const tableName = selected?.label || "this table";
    if (!columnComposeItems.length) {
      return `Pick fields from ${tableName} below. Nothing will load until you add at least one field.`;
    }
    const bits = columnComposeItems.map((it) => {
      const title = String(it.alias || it.column).trim();
      if (it.aggregate === "sum") {
        return `“${title}” = sum of ${it.column}`;
      }
      if (it.aggregate === "count") {
        return `“${title}” = count of ${it.column}`;
      }
      if (it.dateBucket === "quarter") {
        return `“${title}” = ${it.column} by calendar quarter`;
      }
      if (it.dateBucket) {
        return `“${title}” = ${it.column} by ${it.dateBucket}`;
      }
      if (it.dateFormat === "dmy") {
        return `“${title}” = ${it.column} as day-month-year text`;
      }
      if (it.dateFormat === "ym") {
        return `“${title}” = ${it.column} as year-month text`;
      }
      if (it.dateFormat === "dm") {
        return `“${title}” = ${it.column} as day-month text`;
      }
      return `“${title}” = values from ${it.column}`;
    });
    let tail = "";
    if (hasComposeAggregates && composeDimensionAliases.length) {
      tail += ` All raw rows that share the same ${composeDimensionAliases.join(", ")} are rolled into one sheet row (like SQL GROUP BY).`;
    } else if (hasComposeAggregates && !composeDimensionAliases.length) {
      tail += " Result is a single totals row.";
    } else if (!hasComposeAggregates) {
      tail += " Each matching row in the table is loaded into the sheet.";
    }
    if (columnComposeOrderBy.length) {
      const ord = columnComposeOrderBy
        .map((o) => `“${o.alias}” (${o.direction === "desc" ? "high first" : "low first"})`)
        .join(", then ");
      tail += ` Sorted by ${ord}.`;
    }
    return `${bits.join("; ")}.${tail}`;
  }, [
    selected?.label,
    columnComposeItems,
    hasComposeAggregates,
    composeDimensionAliases,
    columnComposeOrderBy,
  ]);

  // When the table changes, reset meta editor and start with an empty column list (user adds fields explicitly).
  useEffect(() => {
    if (!selected?.table) return;
    setColumnComposeItems([]);
    setColumnComposeOrderBy([]);
    setMetaQueryMode("all");
    setMetaOperationKind("count");
    setMetaOperationColumn("");
    setMetaAndFilters([]);
    setMetaOrFilters([]);
    setMetaAdvancedOpen(false);
    setMetaPriorOperations([]);
    setMetaOperationAllSelected(false);
    setMetaRunDisposition("default");
    setMetaOperationsMenuOpen(false);
  }, [selected?.table]);

  const refreshBeckerViews = useCallback(() => {
    setBeckerViews(listBeckerParquetViews());
  }, []);

  const applyRowsToActiveSheet = useCallback(
    (rows) => {
      replaceCurrentSheetData?.(rows);
      setConnectedData?.(rows);
    },
    [replaceCurrentSheetData, setConnectedData],
  );

  const runIngestWithProgress = useCallback(
    async (lakeVal, table, sid, mode, composeSpec, metaQueryMode, metaFilters, metaOpSpecs) => {
      return runParquetSheetLoadWithProgress({
        onLabel: setLoadLabel,
        onProgress: setLoadProgress,
        loadFn: async () => {
          if (mode === "meta") {
            if (Array.isArray(metaOpSpecs) && metaOpSpecs.length > 0) {
              /** @type {string[][]} */
              const tableRows = [];
              for (let i = 0; i < metaOpSpecs.length; i++) {
                const op = metaOpSpecs[i];
                const filters = resolveFiltersForMetaSpec(op);
                const { columns: resultColumns, rows } = await fetchAthenaLakeSample({
                  lake: lakeVal,
                  table,
                  limit: ATHENA_SAMPLE_ROW_LIMIT,
                  queryType: op.kind === "sum" ? "sum" : "count",
                  countAlias: "count",
                  countDistinctColumn: op.kind === "count_distinct" ? op.aggregateColumn : null,
                  sumColumn: op.kind === "sum" ? op.aggregateColumn : null,
                  sumAlias: "sum",
                  caseSensitive: true,
                  filters,
                });
                const resultKey = op.kind === "sum" ? "sum" : "count";
                const valueIdx = resultColumns.indexOf(resultKey);
                const val = rows[0]?.[valueIdx >= 0 ? valueIdx : 0] ?? "";
                tableRows.push([metaOperationDisplayName(op), String(val)]);
              }
              return ingestAthenaResultAsView({
                dataset,
                sampleId: `${sid}-meta-multi`,
                columns: ["meta query", "value"],
                rows: tableRows,
                limit: ATHENA_SAMPLE_ROW_LIMIT,
              });
            }
            // Meta table (count): a single-cell COUNT(*) result (optionally with filters).
            const isFilterMode = metaQueryMode === "filter";
            const { columns: resultColumns, rows } = await fetchAthenaLakeSample({
              lake: lakeVal,
              table,
              limit: ATHENA_SAMPLE_ROW_LIMIT,
              queryType: metaOperationKind === "sum" ? "sum" : "count",
              countAlias: "count",
              countDistinctColumn: metaOperationKind === "count_distinct" ? metaOperationColumn : null,
              sumColumn: metaOperationKind === "sum" ? metaOperationColumn : null,
              sumAlias: "sum",
              caseSensitive: true,
              filters: isFilterMode ? metaFilters : null,
            });
            return ingestAthenaResultAsView({
              dataset,
              sampleId: `${sid}-meta-count`,
              columns: resultColumns,
              rows,
              limit: ATHENA_SAMPLE_ROW_LIMIT,
            });
          }

          // Data table: composed Athena SELECT (GROUP BY / ORDER BY) → JSON → DuckDB view → sheet.
          if (!composeSpec || typeof composeSpec !== "object") {
            throw new Error("Missing compose query spec.");
          }
          const { columns: resultColumns, rows } = await fetchAthenaLakeSample(
            {
              lake: lakeVal,
              table,
              queryType: "compose",
              compose: composeSpec,
            },
            { maxWaitMs: 900000 },
          );

          return ingestAthenaResultAsView({
            dataset,
            sampleId: `${sid}-compose`,
            columns: resultColumns,
            rows,
            ingestFullResult: true,
          });
        },
      });
    },
    [dataset, metaOperationColumn, metaOperationKind],
  );

  const executeIngestReplace = useCallback(async () => {
    const pending = pendingIngestRef.current;
    if (!pending) return;
    const { mode, lake: lk, table, sampleId: sid, composeSpec, metaQueryMode, metaFilters, metaOpSpecs } = pending;
    pendingIngestRef.current = null;
    setSheetDialogOpen(false);
    setError(null);
    setLastRowCount(null);
    setLoading(true);
    setLoadLabel(PARQUET_LOAD_PHASE_MESSAGES[0].text);
    setLoadProgress(5);
    try {
      const { rows, rowCount } = await runIngestWithProgress(
        lk,
        table,
        sid,
        mode,
        composeSpec,
        metaQueryMode,
        metaFilters,
        metaOpSpecs,
      );
      applyRowsToActiveSheet(rows);
      setLastRowCount(rowCount);
      refreshBeckerViews();
    } catch (e) {
      const msg = e?.message || String(e);
      setError(msg);
    } finally {
      setLoading(false);
      setLoadProgress(0);
    }
  }, [applyRowsToActiveSheet, refreshBeckerViews, runIngestWithProgress]);

  const executeIngestAppend = useCallback(async () => {
    const pending = pendingIngestRef.current;
    if (!pending) return;
    const { mode, lake: lk, table, sampleId: sid, composeSpec, metaQueryMode, metaFilters, metaOpSpecs, metaAppendTargetIndex } = pending;
    pendingIngestRef.current = null;
    setSheetDialogOpen(false);
    setError(null);
    setLastRowCount(null);
    setLoading(true);
    setLoadLabel(PARQUET_LOAD_PHASE_MESSAGES[0].text);
    setLoadProgress(5);
    try {
      const { rows, rowCount } = await runIngestWithProgress(
        lk,
        table,
        sid,
        mode,
        composeSpec,
        metaQueryMode,
        metaFilters,
        metaOpSpecs,
      );
      if (mode === "meta") {
        // Replace only the template row that was appended in preview.
        const patchRow = rows[0];
        if (patchRow && Number.isInteger(metaAppendTargetIndex)) {
          setConnectedData?.((prev) => {
            const list = Array.isArray(prev) ? [...prev] : [];
            const idx = Math.max(0, Math.min(metaAppendTargetIndex, list.length));
            if (idx < list.length) list[idx] = patchRow;
            else list.push(patchRow);
            return list;
          });
        } else {
          applyRowsToActiveSheet(rows);
        }
      } else {
        setConnectedData?.((prev) => [...(Array.isArray(prev) ? prev : []), ...rows]);
      }
      setLastRowCount(rowCount);
      refreshBeckerViews();
    } catch (e) {
      const msg = e?.message || String(e);
      setError(msg);
    } finally {
      setLoading(false);
      setLoadProgress(0);
    }
  }, [applyRowsToActiveSheet, refreshBeckerViews, runIngestWithProgress, setConnectedData]);

  const executeIngestNewSheet = useCallback(async () => {
    const pending = pendingIngestRef.current;
    if (!pending) return;
    const { mode, lake: lk, table, sampleId: sid, composeSpec, metaQueryMode, metaFilters, metaOpSpecs } = pending;
    pendingIngestRef.current = null;
    setSheetDialogOpen(false);
    setError(null);
    setLastRowCount(null);
    setLoading(true);
    setLoadLabel(PARQUET_LOAD_PHASE_MESSAGES[0].text);
    setLoadProgress(5);

    const sampleLabel = sampleOptions.find((s) => s.id === sid)?.label || sid;
    const prefix = dataset === "kalshi" ? "Kalshi" : "Polymarket";

    try {
      const { rows, rowCount } = await runIngestWithProgress(
        lk,
        table,
        sid,
        mode,
        composeSpec,
        metaQueryMode,
        metaFilters,
        metaOpSpecs,
      );

      addNewSheetAndActivate?.((newId) => {
        setSheetData?.(newId, rows);
        setDataSheets?.((prev) => {
          const sheet = prev[newId];
          if (!sheet) return prev;
          return {
            ...prev,
            [newId]: {
              ...sheet,
              name: `${prefix} · ${sampleLabel}${mode === "meta" ? " · Count" : mode === "columns" ? " · Query" : ""}`.slice(
                0,
                80,
              ),
            },
          };
        });
      });

      setLastRowCount(rowCount);
      refreshBeckerViews();
    } catch (e) {
      const msg = e?.message || String(e);
      setError(msg);
    } finally {
      setLoading(false);
      setLoadProgress(0);
    }
  }, [
    addNewSheetAndActivate,
    dataset,
    refreshBeckerViews,
    runIngestWithProgress,
    sampleOptions,
    setDataSheets,
    setSheetData,
  ]);

  const hasIncompleteMetaFilters = useMemo(() => {
    const all = [...metaAndFilters, ...metaOrFilters];
    return all.some((f) => {
      if (!f?.column || !f?.op || !f?.kind) return true;
      if (f.kind === "string") return !String(f.value ?? "").trim();
      if (f.kind === "date") return !Number.isFinite(Number(f.value));
      return !Number.isFinite(Number(f.value));
    });
  }, [metaAndFilters, metaOrFilters]);

  const snapshotEditorToSpec = useCallback(() => {
    const customName = String(draftMetaOpName || "").trim();
    if (metaOperationAllSelected) {
      return {
        id: genMetaOpId(),
        kind: metaOperationKind,
        aggregateColumn: metaOperationKind === "sum" || metaOperationKind === "count_distinct" ? metaOperationColumn : null,
        mode: "all",
        filters: { and: [], or: [] },
        label: customName,
        merge: null,
      };
    }
    if (metaQueryMode === "filter" && metaAndFilters.length + metaOrFilters.length > 0) {
      if (hasIncompleteMetaFilters) return null;
      if ((metaOperationKind === "sum" || metaOperationKind === "count_distinct") && !metaOperationColumn) return null;
      return {
        id: genMetaOpId(),
        kind: metaOperationKind,
        aggregateColumn: metaOperationKind === "sum" || metaOperationKind === "count_distinct" ? metaOperationColumn : null,
        mode: "filter",
        filters: {
          and: JSON.parse(JSON.stringify(metaAndFilters)),
          or: JSON.parse(JSON.stringify(metaOrFilters)),
        },
        label: customName,
        merge: null,
      };
    }
    return null;
  }, [
    hasIncompleteMetaFilters,
    metaAndFilters,
    draftMetaOpName,
    metaOperationAllSelected,
    metaOperationColumn,
    metaOperationKind,
    metaOrFilters,
    metaQueryMode,
  ]);

  const buildAllMetaOpSpecsForRun = useCallback(() => {
    const list = [...metaPriorOperations];
    const draft = snapshotEditorToSpec();
    if (draft) list.push(draft);
    return list;
  }, [metaPriorOperations, snapshotEditorToSpec]);

  const applySpecToMetaEditor = useCallback((spec) => {
    if (!spec) return;
    setMetaOperationKind(spec.kind === "sum" ? "sum" : spec.kind === "count_distinct" ? "count_distinct" : "count");
    setMetaOperationColumn(
      spec.kind === "sum" || spec.kind === "count_distinct" ? String(spec.aggregateColumn || "") : "",
    );
    setDraftMetaOpName(String(spec.label || ""));
    setEditingDraftMetaName(false);

    if (spec.mode === "all") {
      setMetaQueryMode("all");
      setMetaAndFilters([]);
      setMetaOrFilters([]);
      setMetaOperationAllSelected(true);
      return;
    }

    const baseAnd = Array.isArray(spec.filters?.and) ? spec.filters.and : [];
    const baseOr = Array.isArray(spec.filters?.or) ? spec.filters.or : [];
    const mergeAnd = Array.isArray(spec.merge?.and) ? spec.merge.and : [];
    const mergeOr = Array.isArray(spec.merge?.or) ? spec.merge.or : [];

    setMetaQueryMode("filter");
    setMetaAndFilters(JSON.parse(JSON.stringify([...baseAnd, ...mergeAnd])));
    setMetaOrFilters(JSON.parse(JSON.stringify([...baseOr, ...mergeOr])));
    setMetaOperationAllSelected(false);
  }, []);

  const handleEditPriorOperation = useCallback(
    (opId) => {
      const chosen = metaPriorOperations.find((op) => op.id === opId);
      if (!chosen) return;
      setEditingOperationTargetId(opId);
      applySpecToMetaEditor(chosen);
    },
    [applySpecToMetaEditor, metaPriorOperations],
  );

  const handleRemovePriorOperation = useCallback((opId) => {
    setMetaPriorOperations((prev) => prev.filter((op) => op.id !== opId));
  }, []);

  const beginEditPriorOperationLabel = useCallback((op) => {
    setEditingMetaOpId(op?.id || null);
    setEditingMetaOpName(String(op?.label || ""));
  }, []);

  const commitEditPriorOperationLabel = useCallback(() => {
    const id = editingMetaOpId;
    if (!id) return;
    const nextLabel = String(editingMetaOpName || "").trim();
    setMetaPriorOperations((prev) =>
      prev.map((op) => (op.id === id ? { ...op, label: nextLabel } : op)),
    );
    setEditingMetaOpId(null);
    setEditingMetaOpName("");
  }, [editingMetaOpId, editingMetaOpName]);

  const resetMetaEditor = useCallback(() => {
    setMetaQueryMode("all");
    setMetaAndFilters([]);
    setMetaOrFilters([]);
    setMetaOperationKind("count");
    setMetaOperationColumn("");
    setMetaOperationAllSelected(false);
    setEditingDraftMetaName(false);
    setDraftMetaOpName("");
    setEditingOperationTargetId(null);
  }, []);

  const metaCanAddAnotherIntercept = useMemo(() => {
    return (
      metaPriorOperations.length > 0 ||
      metaOperationAllSelected ||
      (metaAndFilters.length + metaOrFilters.length > 0 && !hasIncompleteMetaFilters)
    );
  }, [metaPriorOperations.length, metaOperationAllSelected, metaAndFilters.length, metaOrFilters.length, hasIncompleteMetaFilters]);

  const commitCurrentEditorAsOperation = useCallback(() => {
    const spec = snapshotEditorToSpec();
    if (!spec) return null;
    if (editingOperationTargetId) {
      setMetaPriorOperations((prev) =>
        prev.map((op) => (op.id === editingOperationTargetId ? { ...spec, id: op.id } : op)),
      );
      setEditingOperationTargetId(null);
      resetMetaEditor();
      return editingOperationTargetId;
    }
    setMetaPriorOperations((p) => [...p, spec]);
    resetMetaEditor();
    return spec.id;
  }, [editingOperationTargetId, snapshotEditorToSpec, resetMetaEditor]);

  const handleMetaAddOperationComplete = useCallback(
    (result) => {
      if (result.intent === "new_sheet" || result.intent === "append_row") {
        const id = commitCurrentEditorAsOperation();
        if (!id) {
          setError("Finish configuring the current operation first.");
          return;
        }
        setMetaRunDisposition(result.intent);
        setMetaAddOperationDialogOpen(false);
        setMetaOperationsMenuOpen(true);
        return;
      }

      if (result.intent === "merge_and" || result.intent === "merge_or") {
        const m = result.merge;
        if (!m?.targetId || !m.predicates?.length) return;
        const combinator = result.intent === "merge_and" ? "AND" : "OR";

        if (m.targetId === "__draft__") {
          const snap = snapshotEditorToSpec();
          if (!snap) {
            setError("Configure the current operation before merging.");
            return;
          }
          const mergedDraft = applyMergeToSpec(snap, combinator, m.predicates);
          setMetaPriorOperations((prev) => [...prev, mergedDraft]);
          resetMetaEditor();
          setMetaAddOperationDialogOpen(false);
          return;
        }

        setMetaPriorOperations((prev) =>
          prev.map((op) => (op.id === m.targetId ? applyMergeToSpec(op, combinator, m.predicates) : op)),
        );
        resetMetaEditor();
        setMetaAddOperationDialogOpen(false);
      }
    },
    [commitCurrentEditorAsOperation, resetMetaEditor, setError, snapshotEditorToSpec],
  );

  const onMetaOperationsMenuOpenChange = useCallback(
    (open) => {
      if (open && !forceMetaOperationsMenuOpen && selectionTab === "meta" && metaCanAddAnotherIntercept) {
        setMetaAddOperationDialogOpen(true);
        setMetaOperationsMenuOpen(false);
        return;
      }
      setMetaOperationsMenuOpen(open);
      if (!open || forceMetaOperationsMenuOpen) {
        setForceMetaOperationsMenuOpen(false);
      }
    },
    [forceMetaOperationsMenuOpen, selectionTab, metaCanAddAnotherIntercept],
  );

  const metaPreviewRows = useMemo(() => {
    const existingRows = Array.isArray(connectedData) ? connectedData : [];

    const rows = metaPriorOperations.map((op, i) => {
      const q = metaOperationDisplayName(op);
      const existing = existingRows[i]?.value;
      const fallback = `operation ${i + 1}`;
      const isTemplate = typeof existing === "string" && /^operation\s+\d+$/i.test(existing);
      return {
        "meta query": q,
        value: existing != null && !isTemplate ? existing : fallback,
      };
    });
    const draft = snapshotEditorToSpec();
    if (draft) {
      const q = metaOperationDisplayName(draft);
      const existing = existingRows[rows.length]?.value;
      const fallback = `operation ${rows.length + 1}`;
      const isTemplate = typeof existing === "string" && /^operation\s+\d+$/i.test(existing);
      rows.push({
        "meta query": q,
        value: existing != null && !isTemplate ? existing : fallback,
      });
    }
    return rows;
  }, [connectedData, metaPriorOperations, snapshotEditorToSpec]);

  // Push placeholder rows while composing meta ops. Do not depend on `loading` — when a run
  // finishes, `loading` flipping false would re-apply preview and wipe real counts.
  useEffect(() => {
    if (selectionTab !== "meta") return;
    if (areMetaRowsEqual(metaPreviewRows, connectedData)) return;
    applyRowsToActiveSheet(metaPreviewRows);
  }, [selectionTab, metaPreviewRows, connectedData, applyRowsToActiveSheet]);

  const handleLoad = () => {
    setError(null);
    setLastRowCount(null);
    if (!selected?.table) {
      setError("Choose a table below.");
      return;
    }
    if (selectionTab === "columns") {
      if (columnComposeItems.length === 0) {
        setError("Add at least one column to SELECT.");
        return;
      }
      const safeAlias = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
      const seen = new Set();
      for (const i of columnComposeItems) {
        const a = String(i.alias || "").trim();
        if (!safeAlias.test(a)) {
          setError(`Invalid alias "${a}" — use letters, numbers, underscore (start with letter or _).`);
          return;
        }
        if (seen.has(a)) {
          setError(`Duplicate alias "${a}".`);
          return;
        }
        seen.add(a);
      }
    }
    if (selectionTab === "meta") {
      const allSpecs = buildAllMetaOpSpecsForRun();
      if (allSpecs.length === 0) {
        setError("Select Count → All or add at least one filter before running.");
        return;
      }
      for (const spec of allSpecs) {
        if (specHasIncompleteFilters(spec)) {
          setError("Enter a value for each operation before running request.");
          return;
        }
      }
    }

    let disposition = "default";
    if (selectionTab === "meta") {
      disposition = metaRunDisposition;
      if (disposition !== "default") {
        setMetaRunDisposition("default");
      }
    }

    const allMetaSpecs = selectionTab === "meta" ? buildAllMetaOpSpecsForRun() : [];
    const templateRowCount =
      selectionTab === "meta"
        ? (Array.isArray(connectedData) ? connectedData : []).filter((r) => {
            const v = r?.value;
            return typeof v === "string" && /^operation\s+\d+$/i.test(v);
          }).length
        : 0;
    const shouldRunSingleMetaAppend =
      selectionTab === "meta" &&
      disposition === "append_row" &&
      allMetaSpecs.length > 0 &&
      templateRowCount <= 1;

    pendingIngestRef.current = {
      mode: selectionTab,
      lake,
      table: selected.table,
      sampleId: selected.id,
      composeSpec: selectionTab === "columns" ? buildServerComposePayload() : undefined,
      metaQueryMode,
      metaFilters: {
        and: metaAndFilters,
        or: metaOrFilters,
      },
      metaOpSpecs:
        selectionTab === "meta"
          ? shouldRunSingleMetaAppend
            ? (() => {
                const all = allMetaSpecs;
                return all.length ? [all[all.length - 1]] : [];
              })()
            : allMetaSpecs
          : undefined,
      metaAppendTargetIndex:
        selectionTab === "meta" && shouldRunSingleMetaAppend ? Math.max(0, metaPreviewRows.length - 1) : undefined,
    };

    if (disposition === "new_sheet") {
      void executeIngestNewSheet();
      return;
    }
    if (disposition === "append_row" && shouldRunSingleMetaAppend) {
      void executeIngestAppend();
      return;
    }

    const hasOnlyMetaPreviewRows =
      selectionTab === "meta" &&
      connectedData.length > 0 &&
      connectedData.every((row) => {
        if (!row || typeof row !== "object") return false;
        const keys = Object.keys(row);
        if (keys.length === 0) return false;
        return (
          keys.includes("Operation name") ||
          keys.includes("Op ref") ||
          keys.includes("meta query") ||
          keys.includes("value")
        );
      });

    if (connectedData.length > 0 && !hasOnlyMetaPreviewRows) {
      setSheetDialogOpen(true);
      return;
    }

    void executeIngestReplace();
  };

  const onDialogReplace = () => {
    void executeIngestReplace();
  };

  const onDialogAddNewSheet = () => {
    void executeIngestNewSheet();
  };

  const onDialogOpenChange = (open) => {
    setSheetDialogOpen(open);
    if (!open) pendingIngestRef.current = null;
  };

  const runRequestReasons = useMemo(() => {
    const reasons = [];
    if (!selected?.table) reasons.push("Choose a table below.");
    if (selectionTab === "columns" && columnComposeItems.length === 0) {
      reasons.push("Add at least one column to SELECT.");
    }
    if (selectionTab === "meta") {
      const allSpecs = buildAllMetaOpSpecsForRun();
      if (allSpecs.length === 0) reasons.push("Select Count → All or add filters.");
      else {
        for (const spec of allSpecs) {
          if (specHasIncompleteFilters(spec)) {
            reasons.push("Enter a value for each operation.");
            break;
          }
        }
      }
    }
    return reasons;
  }, [selected?.table, selectionTab, columnComposeItems.length, buildAllMetaOpSpecsForRun]);

  const canRunRequest = runRequestReasons.length === 0;

  const addComposeColumn = useCallback(
    (col) => {
      setError(null);
      const t = availableColumnTypesByName[col];
      const typeNorm = String(t || "").toLowerCase();
      const isDate = (typeNorm === "bigint" || typeNorm === "int") && isDateLikeName(col);
      setColumnComposeItems((prev) => [
        ...prev,
        {
          id: genComposeRowId(),
          column: col,
          alias: col,
          aggregate: null,
          dateBucket: null,
          dateFormat: null,
          numberScale: "none",
          decimals: null,
          treatAsDate: isDate,
        },
      ]);
    },
    [availableColumnTypesByName, isDateLikeName],
  );

  const resetComposeToAllColumns = useCallback(() => {
    setError(null);
    setColumnComposeItems(
      availableColumns.map((col) => {
        const t = availableColumnTypesByName[col];
        const typeNorm = String(t || "").toLowerCase();
        const isDate = (typeNorm === "bigint" || typeNorm === "int") && isDateLikeName(col);
        return {
          id: genComposeRowId(),
          column: col,
          alias: col,
          aggregate: null,
          dateBucket: null,
          dateFormat: null,
          numberScale: "none",
          decimals: null,
          treatAsDate: isDate,
        };
      }),
    );
    setColumnComposeOrderBy([]);
  }, [availableColumns, availableColumnTypesByName, isDateLikeName]);

  const updateComposeItem = useCallback((id, patch) => {
    if (Object.prototype.hasOwnProperty.call(patch, "alias")) {
      const newAlias = String(patch.alias ?? "");
      let oldAlias = null;
      setColumnComposeItems((prev) => {
        const row = prev.find((r) => r.id === id);
        oldAlias = row?.alias ?? null;
        return prev.map((r) => (r.id === id ? { ...r, ...patch } : r));
      });
      if (oldAlias != null && oldAlias !== newAlias) {
        setColumnComposeOrderBy((o) => o.map((x) => (x.alias === oldAlias ? { ...x, alias: newAlias } : x)));
      }
      return;
    }
    setColumnComposeItems((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }, []);

  const removeComposeItem = useCallback(
    (id) => {
      const victim = columnComposeItems.find((r) => r.id === id);
      const al = victim?.alias;
      setColumnComposeItems((prev) => prev.filter((row) => row.id !== id));
      if (al) {
        setColumnComposeOrderBy((o) => o.filter((x) => x.alias !== al));
      }
    },
    [columnComposeItems],
  );

  const moveComposeItem = useCallback((id, dir) => {
    setColumnComposeItems((prev) => {
      const i = prev.findIndex((r) => r.id === id);
      if (i < 0) return prev;
      const j = dir === "up" ? i - 1 : i + 1;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }, []);

  const addComposeOrderByClause = useCallback(() => {
    const first = composeSelectAliasChoices[0];
    if (!first) return;
    setColumnComposeOrderBy((prev) => [...prev, { alias: first.alias, direction: "asc" }]);
  }, [composeSelectAliasChoices]);

  const addMetaFilterPreset = useCallback(
    (column, op) => {
      setError(null);
      setMetaOperationAllSelected(false);
      const kind = kindForColumn(column);
      const id = `f-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const defaultValue = kind === "date" ? Date.now() : kind === "number" ? 0 : "";
      const predicate = { id, column, kind, op, value: defaultValue };
      setMetaAndFilters((prev) => [...prev, predicate]);
    },
    [kindForColumn],
  );

  const updateMetaFilter = useCallback((id, patch) => {
    const update = (list) => list.map((f) => (f.id === id ? { ...f, ...patch } : f));
    setMetaAndFilters((prev) => update(prev));
    setMetaOrFilters((prev) => update(prev));
  }, []);

  const removeMetaFilter = useCallback((id) => {
    setMetaAndFilters((prev) => prev.filter((f) => f.id !== id));
    setMetaOrFilters((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const onMetaDragEnd = useCallback(
    (result) => {
      const { destination, source } = result;
      if (!destination) return;
      if (destination.droppableId === source.droppableId && destination.index === source.index) return;

      const sourceId = source.droppableId;
      const destId = destination.droppableId;

      if (sourceId === destId) {
        const list = sourceId === "and" ? metaAndFilters : metaOrFilters;
        const next = [...list];
        const [moved] = next.splice(source.index, 1);
        next.splice(destination.index, 0, moved);
        if (sourceId === "and") setMetaAndFilters(next);
        else setMetaOrFilters(next);
        return;
      }

      const sourceList = sourceId === "and" ? metaAndFilters : metaOrFilters;
      const destList = destId === "and" ? metaAndFilters : metaOrFilters;

      const moved = sourceList[source.index];
      if (!moved) return;

      const nextSource = [...sourceList];
      nextSource.splice(source.index, 1);

      const nextDest = [...destList];
      nextDest.splice(destination.index, 0, moved);

      if (sourceId === "and") setMetaAndFilters(nextSource);
      else setMetaOrFilters(nextSource);

      if (destId === "and") setMetaAndFilters(nextDest);
      else setMetaOrFilters(nextDest);
    },
    [metaAndFilters, metaOrFilters],
  );

  return (
    <div className="rounded-lg border border-dashed border-primary/30 bg-muted/30 p-3 space-y-3 min-w-0 max-w-full overflow-hidden">
      <ReplaceOrNewSheetDialog
        open={sheetDialogOpen}
        onOpenChange={onDialogOpenChange}
        hasLiveConnection={hasLiveConnection}
        onReplace={onDialogReplace}
        onAddNewSheet={onDialogAddNewSheet}
      />

      <MetaAddOperationDialog
        open={metaAddOperationDialogOpen}
        onOpenChange={setMetaAddOperationDialogOpen}
        existingOperations={metaPriorOperations.map((o) => ({ id: o.id, label: o.label }))}
        hasDraftOperation={
          metaOperationAllSelected ||
          (metaQueryMode === "filter" && metaAndFilters.length + metaOrFilters.length > 0 && !hasIncompleteMetaFilters)
        }
        draftLabel={
          metaOperationAllSelected
            ? metaOperationLabel(metaOperationKind, "all", metaOperationColumn)
            : metaQueryMode === "filter" && metaAndFilters.length + metaOrFilters.length > 0
              ? metaOperationLabel(metaOperationKind, "filter", metaOperationColumn)
              : "Current operation"
        }
        availableColumns={availableColumns}
        columnTypeByName={availableColumnTypesByName}
        isDateLikeName={isDateLikeName}
        onComplete={handleMetaAddOperationComplete}
      />

      <div className="space-y-1 min-w-0 max-w-full">
        <Label className="text-xs">Data Source</Label>
        <Select value={sampleId} onValueChange={setSampleId} disabled={!canUseSamples || loading}>
          <SelectTrigger className="h-8 text-xs min-w-0 w-full max-w-full">
            <SelectValue placeholder="Choose table" />
          </SelectTrigger>
          <SelectContent>
            {sampleOptions.map((s) => (
              <SelectItem key={s.id} value={s.id} className="text-xs">
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selected?.table && availableColumns.length > 0 && (
        <div className="min-w-0 max-w-full">
          <Tabs value={selectionTab} onValueChange={setSelectionTab} className="w-full">
            <TabsList className="w-fit p-0.5 h-auto bg-slate-100 dark:bg-slate-800">
              <TabsTrigger value="columns" className="h-7 px-2 text-xs">
                Columns
              </TabsTrigger>
              <TabsTrigger value="meta" className="h-7 px-2 text-xs">
                Meta Table
              </TabsTrigger>
            </TabsList>

            <TabsContent value="columns" className="space-y-4 min-w-0">
              <div className="space-y-2 min-w-0">
                <div className="flex place-items-center gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="h-8 text-xs" type="button">
                        Add Column
                        <ChevronDown className="h-3 w-3 ml-1 opacity-60" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="max-h-56 overflow-y-auto" align="start">
                      <DropdownMenuLabel className="text-xs">Choose a column</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-xs font-medium" onSelect={resetComposeToAllColumns}>
                        Add all
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {availableColumns.filter((c) => !columnComposeItems.some((i) => i.column === c)).length === 0 ? (
                        <DropdownMenuItem disabled className="text-xs">
                          Every column is already in the list
                        </DropdownMenuItem>
                      ) : (
                        availableColumns
                          .filter((c) => !columnComposeItems.some((i) => i.column === c))
                          .map((col) => (
                            <DropdownMenuItem key={col} className="text-xs" onSelect={() => addComposeColumn(col)}>
                              {col}
                            </DropdownMenuItem>
                          ))
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <TooltipProvider delayDuration={0}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="group h-4 w-4 rounded-full bg-red-300/35 text-red-900/70 hover:bg-red-400/80 focus-visible:ring-1 focus-visible:ring-red-300"
                          type="button"
                          aria-label="clear all selections"
                          onClick={() => {
                            setColumnComposeItems([]);
                            setColumnComposeOrderBy([]);
                          }}
                        >
                          <X className="h-2.5 w-2.5 opacity-0 transition-opacity group-hover:opacity-80 group-focus-visible:opacity-80" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        clear all selections
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>

                {columnComposeItems.length !== 0 && (
                  <div className="space-y-3">
                    {columnComposeItems.map((item, idx) => {
                      const k = kindForColumn(item.column);
                      const isDateCol = k === "date";
                      const isNumericCol = k === "number";
                      const canNumberFormat = isNumericCol && item.aggregate !== "count";
                      const clearFormatPatch = {
                        dateBucket: null,
                        dateFormat: null,
                        numberScale: "none",
                        decimals: null,
                      };
                      const rollVal = composeRollUpSelectValue(item);
                      const dateShapeVal = composeDateShapeSelectValue(item);
                      const scaleVal = item.numberScale || "none";
                      const decVal = item.decimals == null ? "default" : String(item.decimals);
                      return (
                        <div
                          key={item.id}
                          className="rounded-lg border border-border/80 bg-card text-card-foreground shadow-sm p-3 space-y-3 min-w-0"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Source column</p>
                              <p className="font-mono text-sm font-semibold truncate" title={item.column}>
                                {item.column}
                              </p>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 shrink-0 text-muted-foreground"
                              onClick={() => removeComposeItem(item.id)}
                              aria-label={`Remove ${item.column}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>

                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="space-y-1 min-w-0">
                              <Label className="text-xs">Header name in sheet</Label>
                              <Input
                                className="h-8 text-xs"
                                value={item.alias}
                                onChange={(e) => updateComposeItem(item.id, { alias: e.target.value })}
                                spellCheck={false}
                              />
                            </div>
                            <div className="space-y-1 min-w-0">
                              <Label className="text-xs">Summarize</Label>
                              <Select
                                value={rollVal}
                                onValueChange={(v) => {
                                  if (v === "none") {
                                    updateComposeItem(item.id, { aggregate: null });
                                  } else if (v === "sum") {
                                    updateComposeItem(item.id, {
                                      aggregate: "sum",
                                      dateBucket: null,
                                      dateFormat: null,
                                    });
                                  } else if (v === "count") {
                                    updateComposeItem(item.id, {
                                      aggregate: "count",
                                      dateBucket: null,
                                      dateFormat: null,
                                    });
                                  }
                                }}
                              >
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none" className="text-xs">
                                    Show values (no total)
                                  </SelectItem>
                                  <SelectItem value="sum" className="text-xs" disabled={!isNumericCol}>
                                    Sum numbers
                                  </SelectItem>
                                  <SelectItem value="count" className="text-xs">
                                    Count (non-empty)
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          {isDateCol && !item.aggregate ? (
                            <div className="space-y-1 min-w-0">
                              <Label className="text-xs">Date / time shape</Label>
                              <Select
                                value={dateShapeVal}
                                onValueChange={(shape) => {
                                  updateComposeItem(item.id, {
                                    aggregate: null,
                                    ...patchesForDateShape(shape),
                                  });
                                }}
                              >
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="raw" className="text-xs">
                                    Keep as stored (epoch number)
                                  </SelectItem>
                                  <SelectItem value="bucket:day" className="text-xs">
                                    Bucket by day
                                  </SelectItem>
                                  <SelectItem value="bucket:week" className="text-xs">
                                    Bucket by week
                                  </SelectItem>
                                  <SelectItem value="bucket:month" className="text-xs">
                                    Bucket by month
                                  </SelectItem>
                                  <SelectItem value="bucket:quarter" className="text-xs">
                                    Bucket by quarter
                                  </SelectItem>
                                  <SelectItem value="bucket:year" className="text-xs">
                                    Bucket by year
                                  </SelectItem>
                                  <SelectItem value="fmt:dmy" className="text-xs">
                                    Text: day-month-year
                                  </SelectItem>
                                  <SelectItem value="fmt:ym" className="text-xs">
                                    Text: year-month
                                  </SelectItem>
                                  <SelectItem value="fmt:dm" className="text-xs">
                                    Text: day-month
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          ) : null}

                          {canNumberFormat ? (
                            <div className="grid gap-3 sm:grid-cols-2">
                              <div className="space-y-1 min-w-0">
                                <Label className="text-xs">Number scale</Label>
                                <Select
                                  value={scaleVal}
                                  onValueChange={(v) => updateComposeItem(item.id, { numberScale: v })}
                                >
                                  <SelectTrigger className="h-8 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none" className="text-xs">
                                      No scaling
                                    </SelectItem>
                                    <SelectItem value="thousand" className="text-xs">
                                      Divide by 1,000
                                    </SelectItem>
                                    <SelectItem value="million" className="text-xs">
                                      Divide by 1,000,000
                                    </SelectItem>
                                    <SelectItem value="billion" className="text-xs">
                                      Divide by 1,000,000,000
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-1 min-w-0">
                                <Label className="text-xs">Decimal places</Label>
                                <Select
                                  value={decVal}
                                  onValueChange={(v) =>
                                    updateComposeItem(item.id, {
                                      decimals: v === "default" ? null : Number(v),
                                    })
                                  }
                                >
                                  <SelectTrigger className="h-8 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="default" className="text-xs">
                                      Default
                                    </SelectItem>
                                    {[0, 1, 2, 3, 4].map((d) => (
                                      <SelectItem key={d} value={String(d)} className="text-xs">
                                        {d} decimal{d === 1 ? "" : "s"}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          ) : null}

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-2 border-t border-border/50">
                            <Button
                              type="button"
                              variant="link"
                              size="sm"
                              className="h-auto p-0 text-xs"
                              disabled={idx === 0}
                              onClick={() => moveComposeItem(item.id, "up")}
                            >
                              Move up
                            </Button>
                            <Button
                              type="button"
                              variant="link"
                              size="sm"
                              className="h-auto p-0 text-xs"
                              disabled={idx === columnComposeItems.length - 1}
                              onClick={() => moveComposeItem(item.id, "down")}
                            >
                              Move down
                            </Button>
                            <Button
                              type="button"
                              variant="link"
                              size="sm"
                              className="h-auto p-0 text-xs text-muted-foreground"
                              onClick={() => updateComposeItem(item.id, clearFormatPatch)}
                            >
                              Reset formatting
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {showComposeGroupingSection ? (
                <div className="rounded-md border border-border/70 bg-muted/25 px-3 py-2 space-y-1.5">
                  <p className="text-xs font-medium text-foreground">Grouping (GROUP BY)</p>
                  {hasComposeAggregates ? (
                    <p className="text-xs text-muted-foreground leading-snug">
                      With <span className="font-medium text-foreground">Sum</span> or{" "}
                      <span className="font-medium text-foreground">Count</span>, Athena uses{" "}
                      <span className="font-medium text-foreground">GROUP BY</span> on every non-aggregated field (for example
                      your quarter column). Many trades in the same calendar quarter are not separate rows — they collapse into{" "}
                      <span className="font-medium text-foreground">one row per quarter</span> with volume summed.{" "}
                      <span className="font-medium text-foreground">Group keys:</span>{" "}
                      {composeDimensionAliases.length ? composeDimensionAliases.join(", ") : "— (add a bucket or dimension)"}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground leading-snug">
                      You’re using a <span className="font-medium text-foreground">date bucket</span> or{" "}
                      <span className="font-medium text-foreground">date text</span> shape. That alone still returns{" "}
                      <span className="font-medium text-foreground">one sheet row per table row</span> (the bucket is just an
                      extra column). To get <span className="font-medium text-foreground">one row per quarter</span> (or per
                      month, etc.), add <span className="font-medium text-foreground">Sum</span> or{" "}
                      <span className="font-medium text-foreground">Count</span> on a numeric field — then all rows sharing the
                      same quarter combine into one row, like{" "}
                      <span className="font-medium text-foreground">GROUP BY quarter</span> in SQL.
                    </p>
                  )}
                </div>
              ) : null}

              <div className="space-y-2 min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Sort rows</h3>
                    <p className="text-xs text-muted-foreground">Optional. Order the result by a column header.</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs shrink-0"
                    disabled={composeSelectAliasChoices.length === 0}
                    onClick={addComposeOrderByClause}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add sort rule
                  </Button>
                </div>
                {columnComposeOrderBy.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No sorting — Athena’s default order for all matching rows.</p>
                ) : (
                  <div className="space-y-2">
                    {columnComposeOrderBy.map((ob, obIdx) => (
                      <div
                        key={`${ob.alias}-${obIdx}`}
                        className="flex flex-wrap items-center gap-2 rounded-md border border-border/60 bg-background/80 p-2"
                      >
                        <Select
                          value={ob.alias}
                          onValueChange={(v) => {
                            setColumnComposeOrderBy((prev) =>
                              prev.map((r, j) => (j === obIdx ? { ...r, alias: v } : r)),
                            );
                          }}
                        >
                          <SelectTrigger className="h-8 text-xs w-[min(100%,14rem)] min-w-0">
                            <SelectValue placeholder="Column" />
                          </SelectTrigger>
                          <SelectContent>
                            {composeSelectAliasChoices.map((c) => (
                              <SelectItem key={c.alias} value={c.alias} className="text-xs">
                                {c.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select
                          value={ob.direction}
                          onValueChange={(v) => {
                            setColumnComposeOrderBy((prev) =>
                              prev.map((r, j) => (j === obIdx ? { ...r, direction: v } : r)),
                            );
                          }}
                        >
                          <SelectTrigger className="h-8 text-xs w-[11rem] min-w-0">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="asc" className="text-xs">
                              Ascending (A→Z, low→high)
                            </SelectItem>
                            <SelectItem value="desc" className="text-xs">
                              Descending (Z→A, high→low)
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          onClick={() =>
                            setColumnComposeOrderBy((prev) => prev.filter((_, j) => j !== obIdx))
                          }
                          aria-label="Remove sort"
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="meta" className="space-y-2">
              <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">
                        {`Compose your summary for ${selected?.label || "selected"} data`}
                      </Label>
                      <DropdownMenu open={metaOperationsMenuOpen} onOpenChange={onMetaOperationsMenuOpenChange}>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="h-8 text-xs min-w-0 w-full justify-between">
                            {metaCanAddAnotherIntercept ? (
                              <span className="inline-flex items-center gap-1.5">
                                <Plus className="h-3 w-3" />
                                add another operation
                              </span>
                            ) : metaAndFilters.length + metaOrFilters.length > 0 && hasIncompleteMetaFilters ? (
                              "Complete filter values"
                            ) : (
                              "Select an operation"
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-56">
                          <DropdownMenuGroup>
                            <DropdownMenuLabel className="text-xs">Operations</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuSub>
                              <DropdownMenuSubTrigger className="text-xs">
                                count
                              </DropdownMenuSubTrigger>
                              <DropdownMenuPortal>
                                <DropdownMenuSubContent className="w-56">
                                  <DropdownMenuItem
                                    className="text-xs"
                                    onSelect={() => {
                                      setMetaOperationKind("count");
                                      setMetaOperationColumn("");
                                      setMetaQueryMode("all");
                                      setMetaAndFilters([]);
                                      setMetaOrFilters([]);
                                      setMetaOperationAllSelected(true);
                                    }}
                                  >
                                    All
                                  </DropdownMenuItem>
                                  <DropdownMenuSub>
                                    <DropdownMenuSubTrigger className="text-xs">
                                      Filter
                                    </DropdownMenuSubTrigger>
                                    <DropdownMenuPortal>
                                      <DropdownMenuSubContent className="w-60 max-h-[280px] overflow-y-auto">
                                        <DropdownMenuLabel className="text-xs">Columns</DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        {availableColumns.map((col) => (
                                          <DropdownMenuSub key={col}>
                                            <DropdownMenuSubTrigger className="text-xs">
                                              {col}
                                            </DropdownMenuSubTrigger>
                                            <DropdownMenuPortal>
                                              <DropdownMenuSubContent className="w-44">
                                                <DropdownMenuLabel className="text-xs">Operator</DropdownMenuLabel>
                                                <DropdownMenuSeparator />
                                                {(String(availableColumnTypesByName[col]).toLowerCase() === "string"
                                                  ? [
                                                      { id: "unique", label: "UNIQUE" },
                                                      { id: "contains", label: "===" },
                                                      { id: "not_contains", label: "!==" },
                                                    ]
                                                  : [
                                                      { id: "unique", label: "UNIQUE" },
                                                      { id: "gt", label: ">" },
                                                      { id: "lt", label: "<" },
                                                      { id: "eq", label: "===" },
                                                      { id: "neq", label: "!==" },
                                                    ]
                                                ).map((op) => (
                                                  <DropdownMenuItem
                                                    key={op.id}
                                                    className="text-xs"
                                                    onSelect={() => {
                                                      if (op.id === "unique") {
                                                        setMetaOperationKind("count_distinct");
                                                        setMetaOperationColumn(col);
                                                        setMetaQueryMode("all");
                                                        setMetaAndFilters([]);
                                                        setMetaOrFilters([]);
                                                        setMetaOperationAllSelected(true);
                                                      } else {
                                                        setMetaOperationKind("count");
                                                        setMetaOperationColumn("");
                                                        setMetaQueryMode("filter");
                                                        setMetaOperationAllSelected(false);
                                                        addMetaFilterPreset(col, op.id);
                                                      }
                                                    }}
                                                  >
                                                    <span className="inline-flex items-center gap-2">
                                                      <span className="inline-flex min-w-6 justify-center rounded border border-border/60 px-1 font-mono text-[10px]">
                                                        {op.id === "unique" ? "*" : operatorSymbol(op.id)}
                                                      </span>
                                                      {op.id === "unique" ? (
                                                        <span>
                                                          count <strong>unique</strong> values
                                                        </span>
                                                      ) : op.id === "eq" || op.id === "contains" ? (
                                                        <span>
                                                          is <strong>equal</strong> to
                                                        </span>
                                                      ) : op.id === "neq" || op.id === "not_contains" ? (
                                                        <span>
                                                          <strong>not</strong> equal to
                                                        </span>
                                                      ) : op.id === "lt" ? (
                                                        <span>
                                                          <strong>less</strong> than
                                                        </span>
                                                      ) : (
                                                        <span>
                                                          <strong>greater</strong> than
                                                        </span>
                                                      )}
                                                    </span>
                                                  </DropdownMenuItem>
                                                ))}
                                              </DropdownMenuSubContent>
                                            </DropdownMenuPortal>
                                          </DropdownMenuSub>
                                        ))}
                                      </DropdownMenuSubContent>
                                    </DropdownMenuPortal>
                                  </DropdownMenuSub>
                                </DropdownMenuSubContent>
                              </DropdownMenuPortal>
                            </DropdownMenuSub>
                            <DropdownMenuSub>
                              <DropdownMenuSubTrigger className="text-xs">
                                sum
                              </DropdownMenuSubTrigger>
                              <DropdownMenuPortal>
                                <DropdownMenuSubContent className="w-60 max-h-[280px] overflow-y-auto">
                                  <DropdownMenuLabel className="text-xs">Column to sum</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  {availableColumns.map((sumCol) => (
                                    <DropdownMenuSub key={`sum-${sumCol}`}>
                                      <DropdownMenuSubTrigger className="text-xs">
                                        {sumCol}
                                      </DropdownMenuSubTrigger>
                                      <DropdownMenuPortal>
                                        <DropdownMenuSubContent className="w-56">
                                          <DropdownMenuItem
                                            className="text-xs"
                                            onSelect={() => {
                                              setMetaOperationKind("sum");
                                              setMetaOperationColumn(sumCol);
                                              setMetaQueryMode("all");
                                              setMetaAndFilters([]);
                                              setMetaOrFilters([]);
                                              setMetaOperationAllSelected(true);
                                            }}
                                          >
                                            All
                                          </DropdownMenuItem>
                                          <DropdownMenuSub>
                                            <DropdownMenuSubTrigger className="text-xs">
                                              Filter
                                            </DropdownMenuSubTrigger>
                                            <DropdownMenuPortal>
                                              <DropdownMenuSubContent className="w-60 max-h-[280px] overflow-y-auto">
                                                <DropdownMenuLabel className="text-xs">Columns</DropdownMenuLabel>
                                                <DropdownMenuSeparator />
                                                {availableColumns.map((filterCol) => (
                                                  <DropdownMenuSub key={`sum-filter-${sumCol}-${filterCol}`}>
                                                    <DropdownMenuSubTrigger className="text-xs">
                                                      {filterCol}
                                                    </DropdownMenuSubTrigger>
                                                    <DropdownMenuPortal>
                                                      <DropdownMenuSubContent className="w-44">
                                                        <DropdownMenuLabel className="text-xs">Operator</DropdownMenuLabel>
                                                        <DropdownMenuSeparator />
                                                        {(String(availableColumnTypesByName[filterCol]).toLowerCase() === "string"
                                                          ? [
                                                              { id: "contains", label: "===" },
                                                              { id: "not_contains", label: "!==" },
                                                            ]
                                                          : [
                                                              { id: "gt", label: ">" },
                                                              { id: "lt", label: "<" },
                                                              { id: "eq", label: "===" },
                                                              { id: "neq", label: "!==" },
                                                            ]
                                                        ).map((op) => (
                                                          <DropdownMenuItem
                                                            key={`sum-op-${sumCol}-${filterCol}-${op.id}`}
                                                            className="text-xs"
                                                            onSelect={() => {
                                                              setMetaOperationKind("sum");
                                                              setMetaOperationColumn(sumCol);
                                                              setMetaQueryMode("filter");
                                                              setMetaOperationAllSelected(false);
                                                              addMetaFilterPreset(filterCol, op.id);
                                                            }}
                                                          >
                                                            <span className="inline-flex items-center gap-2">
                                                              <span className="inline-flex min-w-6 justify-center rounded border border-border/60 px-1 font-mono text-[10px]">
                                                                {operatorSymbol(op.id)}
                                                              </span>
                                                              {op.id === "eq" || op.id === "contains" ? (
                                                                <span>
                                                                  is <strong>equal</strong> to
                                                                </span>
                                                              ) : op.id === "neq" || op.id === "not_contains" ? (
                                                                <span>
                                                                  <strong>not</strong> equal to
                                                                </span>
                                                              ) : op.id === "lt" ? (
                                                                <span>
                                                                  <strong>less</strong> than
                                                                </span>
                                                              ) : (
                                                                <span>
                                                                  <strong>greater</strong> than
                                                                </span>
                                                              )}
                                                            </span>
                                                          </DropdownMenuItem>
                                                        ))}
                                                      </DropdownMenuSubContent>
                                                    </DropdownMenuPortal>
                                                  </DropdownMenuSub>
                                                ))}
                                              </DropdownMenuSubContent>
                                            </DropdownMenuPortal>
                                          </DropdownMenuSub>
                                        </DropdownMenuSubContent>
                                      </DropdownMenuPortal>
                                    </DropdownMenuSub>
                                  ))}
                                </DropdownMenuSubContent>
                              </DropdownMenuPortal>
                            </DropdownMenuSub>
                          </DropdownMenuGroup>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {metaPriorOperations.length > 0 && (
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-semibold tracking-wide text-muted-foreground">
                          Configured operations
                        </Label>
                        <div className="space-y-1.5">
                          {metaPriorOperations.map((op, idx) => (
                            <div
                              key={op.id}
                              className="rounded-md border border-border/60 bg-background/50 px-2 py-1.5"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <div className="text-[10px] text-muted-foreground">{`${idx + 1}: ${metaOperationHeading(op.kind)}`}</div>
                                  {editingMetaOpId === op.id ? (
                                    <input
                                      type="text"
                                      className="mt-0.5 h-6 w-full min-w-[140px] rounded border border-border/60 bg-background px-1.5 text-[11px]"
                                      value={editingMetaOpName}
                                      onChange={(e) => setEditingMetaOpName(e.target.value)}
                                      onBlur={commitEditPriorOperationLabel}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") commitEditPriorOperationLabel();
                                        if (e.key === "Escape") {
                                          setEditingMetaOpId(null);
                                          setEditingMetaOpName("");
                                        }
                                      }}
                                      autoFocus
                                    />
                                  ) : (
                                    <div
                                      className="mt-0.5 text-[11px] truncate text-left"
                                      title="Operation display label"
                                    >
                                      {metaOperationDisplayName(op)}
                                    </div>
                                  )}
                                </div>
                                <div className="flex shrink-0 items-center gap-1">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-muted-foreground hover:text-foreground"
                                    onClick={() => beginEditPriorOperationLabel(op)}
                                    aria-label="rename operation label"
                                    title="Rename label"
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-muted-foreground hover:text-foreground"
                                    onClick={() => {
                                      setEditingMetaOpId(null);
                                      setEditingMetaOpName("");
                                      handleEditPriorOperation(op.id);
                                      setForceMetaOperationsMenuOpen(true);
                                      setMetaOperationsMenuOpen(true);
                                    }}
                                    aria-label="edit operation filters"
                                    title="Edit operation"
                                  >
                                    <Wrench className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-destructive/80 hover:text-destructive"
                                    onClick={() => handleRemovePriorOperation(op.id)}
                                    aria-label="remove operation"
                                    title="Remove operation"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {(metaOperationAllSelected || metaQueryMode === "filter") && (
                      <div className="space-y-1 rounded-md border border-border/60 bg-background/50 px-2 py-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1">
                            <Label className="text-[10px] font-semibold tracking-wide text-muted-foreground">
                              {metaOperationKind === "sum" ? "SUM" : metaOperationKind === "count_distinct" ? "COUNT UNIQUE" : "COUNT"}
                            </Label>
                            {editingDraftMetaName ? (
                              <input
                                type="text"
                                className="h-6 w-full min-w-[140px] rounded border border-border/60 bg-background px-1.5 text-[11px]"
                                value={draftMetaOpName}
                                onChange={(e) => setDraftMetaOpName(e.target.value)}
                                onBlur={() => setEditingDraftMetaName(false)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") setEditingDraftMetaName(false);
                                  if (e.key === "Escape") {
                                    setEditingDraftMetaName(false);
                                    setDraftMetaOpName("");
                                  }
                                }}
                                autoFocus
                              />
                            ) : (
                              <button
                                type="button"
                                className="text-[11px] text-foreground/90 text-left hover:underline"
                                onClick={() => setEditingDraftMetaName(true)}
                                title="Rename current operation label"
                              >
                                {String(draftMetaOpName || "").trim() ||
                                  metaOperationLabel(
                                    metaOperationKind,
                                    metaQueryMode === "filter" ? "filter" : "all",
                                    metaOperationColumn,
                                  )}
                              </button>
                            )}
                            <div className="text-[11px] text-muted-foreground">
                              {metaOperationKind === "sum" || metaOperationKind === "count_distinct"
                                ? (metaOperationColumn || "Select column")
                                : "All Rows"}
                              , {metaQueryMode === "filter" ? "FILTER" : "ALL"}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-muted-foreground hover:text-foreground"
                              onClick={() => {
                                setForceMetaOperationsMenuOpen(true);
                                setMetaOperationsMenuOpen(true);
                              }}
                              aria-label="edit current operation logic"
                              title="Edit operation"
                            >
                              <Wrench className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-muted-foreground hover:text-foreground"
                              onClick={() => setEditingDraftMetaName((v) => !v)}
                              aria-label="rename current operation"
                              title="Rename current operation"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            {metaQueryMode !== "filter" && (
                              <button
                                type="button"
                                className="inline-flex h-6 w-6 items-center justify-center rounded text-destructive/80 hover:bg-muted/60 hover:text-destructive"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                }}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  resetMetaEditor();
                                }}
                                aria-label="remove operation"
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {metaQueryMode === "filter" && (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          {[...metaAndFilters, ...metaOrFilters].map((f) => (
                            <div key={f.id} className="flex items-center gap-1">
                              <Select
                                value={f.column}
                                onValueChange={(val) => {
                                  const kind = kindForColumn(val);
                                  const defaultValue = kind === "date" ? Date.now() : kind === "number" ? 0 : "";
                                  const nextOp =
                                    kind === "string" ? (f.op === "not_contains" ? "not_contains" : "contains") : ["gt", "lt", "eq", "neq"].includes(f.op) ? f.op : "gt";
                                  updateMetaFilter(f.id, { column: val, kind, op: nextOp, value: defaultValue });
                                }}
                              >
                                <SelectTrigger className="h-7 text-[11px] min-w-0 w-16">
                                  <SelectValue placeholder="Column" />
                                </SelectTrigger>
                                <SelectContent>
                                  {availableColumns.map((col) => (
                                    <SelectItem key={col} value={col} className="text-[13px]">
                                      {col}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>

                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="outline" size="sm" className="h-7 px-2 text-[11px] min-w-8">
                                    {operatorSymbol(f.op)}
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="w-44">
                                  {(f.kind === "string"
                                    ? [
                                        { id: "contains", label: "is equal to" },
                                        { id: "not_contains", label: "not equal to" },
                                      ]
                                    : [
                                        { id: "gt", label: "greater than" },
                                        { id: "lt", label: "less than" },
                                        { id: "eq", label: "is equal to" },
                                        { id: "neq", label: "not equal to" },
                                      ]
                                  ).map((op) => (
                                    <DropdownMenuItem key={op.id} className="text-[13px]" onSelect={() => updateMetaFilter(f.id, { op: op.id })}>
                                      <span className="inline-flex items-center gap-2">
                                        <span className="inline-flex min-w-6 justify-center rounded border border-border/60 px-1 font-mono text-[10px]">
                                          {operatorSymbol(op.id)}
                                        </span>
                                        {op.label}
                                      </span>
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuContent>
                              </DropdownMenu>

                              {f.kind === "date" ? (
                                <Input
                                  type="datetime-local"
                                  className={`h-7 text-[11px] min-w-0 flex-[2] placeholder:text-[11px] ${!Number.isFinite(Number(f.value)) ? "border-destructive focus-visible:ring-destructive" : ""}`}
                                  value={Number.isFinite(Number(f.value)) ? new Date(Number(f.value)).toISOString().slice(0, 16) : ""}
                                  onChange={(e) => {
                                    const ms = new Date(String(e.target.value)).getTime();
                                    updateMetaFilter(f.id, { value: Number.isFinite(ms) ? ms : "" });
                                  }}
                                  placeholder="Value"
                                />
                              ) : f.kind === "number" ? (
                                <Input
                                  type="number"
                                  step="1"
                                  className={`h-7 text-[11px] min-w-0 flex-[2] placeholder:text-[11px] ${f.value === "" ? "border-destructive focus-visible:ring-destructive" : ""}`}
                                  value={f.value}
                                  onChange={(e) => updateMetaFilter(f.id, { value: e.target.value === "" ? "" : Number(e.target.value) })}
                                  placeholder="Value"
                                />
                              ) : (
                                <Input
                                  type="text"
                                  className={`h-7 text-[11px] min-w-0 flex-[2] placeholder:text-[11px] ${!String(f.value ?? "").trim() ? "border-destructive focus-visible:ring-destructive" : ""}`}
                                  value={String(f.value ?? "")}
                                  onChange={(e) => updateMetaFilter(f.id, { value: e.target.value })}
                                  placeholder="Value"
                                />
                              )}

                              <TooltipProvider delayDuration={250}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      type="button"
                                      className="inline-flex h-4 w-4 items-center justify-center rounded text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                                      onClick={() => removeMetaFilter(f.id)}
                                    >
                                      <Minus className="h-2 w-2" />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="text-xs">
                                    remove operation
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          ))}
                        </div>

                      <CollapsibleRoot open={metaAdvancedOpen} onOpenChange={setMetaAdvancedOpen}>
                        <CollapsibleTrigger asChild>
                          <button type="button" className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground">
                            <ChevronDown className={`h-3 w-3 transition-transform ${metaAdvancedOpen ? "rotate-180" : ""}`} />
                            Advanced
                          </button>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="rounded-md border border-border/60 bg-background/50 p-2 space-y-2">
                            <DragDropContext onDragEnd={onMetaDragEnd}>
                              <div className="grid grid-cols-2 gap-2">
                                <Droppable droppableId="and">
                                  {(provided, snapshot) => (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.droppableProps}
                                      className="min-h-[90px] rounded-md border border-border/60 bg-background/60 p-2"
                                    >
                                      <div className="flex items-center justify-between mb-1">
                                        <div className="text-[11px] font-medium">AND</div>
                                        <div className="text-[10px] text-muted-foreground">
                                          {metaAndFilters.length}
                                        </div>
                                      </div>
                                      {metaAndFilters.length === 0 && (
                                        <div className="text-[10px] text-muted-foreground">Drag filters here</div>
                                      )}
                                      {metaAndFilters.map((f, idx) => (
                                        <Draggable key={f.id} draggableId={f.id} index={idx}>
                                          {(dragProvided) => (
                                            <div
                                              ref={dragProvided.innerRef}
                                              {...dragProvided.draggableProps}
                                              {...dragProvided.dragHandleProps}
                                              className="mb-2 last:mb-0 cursor-grab"
                                            >
                                              <div className="rounded-md border border-border/60 bg-background px-2 py-1 text-[11px]">
                                                <span className="font-mono">{f.column}</span>{" "}
                                                <span className="inline-flex items-center gap-1 text-muted-foreground">
                                                  <span className="inline-flex min-w-5 justify-center rounded border border-border/60 px-1 font-mono text-[10px]">
                                                    {operatorSymbol(f.op)}
                                                  </span>
                                                  {f.op === "eq" || f.op === "contains" ? (
                                                    <span>
                                                      is <strong>equal</strong> to
                                                    </span>
                                                  ) : f.op === "neq" || f.op === "not_contains" ? (
                                                    <span>
                                                      <strong>not</strong> equal to
                                                    </span>
                                                  ) : f.op === "lt" ? (
                                                    <span>
                                                      <strong>less</strong> than
                                                    </span>
                                                  ) : (
                                                    <span>
                                                      <strong>greater</strong> than
                                                    </span>
                                                  )}
                                                </span>{" "}
                                                <span className="break-all">
                                                  {f.kind === "date"
                                                    ? new Date(Number(f.value)).toLocaleString()
                                                    : String(f.value)}
                                                </span>
                                              </div>
                                            </div>
                                          )}
                                        </Draggable>
                                      ))}
                                      {provided.placeholder}
                                    </div>
                                  )}
                                </Droppable>

                                <Droppable droppableId="or">
                                  {(provided) => (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.droppableProps}
                                      className="min-h-[90px] rounded-md border border-border/60 bg-background/60 p-2"
                                    >
                                      <div className="flex items-center justify-between mb-1">
                                        <div className="text-[11px] font-medium">OR</div>
                                        <div className="text-[10px] text-muted-foreground">
                                          {metaOrFilters.length}
                                        </div>
                                      </div>
                                      {metaOrFilters.length === 0 && (
                                        <div className="text-[10px] text-muted-foreground">Drag filters here</div>
                                      )}
                                      {metaOrFilters.map((f, idx) => (
                                        <Draggable key={f.id} draggableId={f.id} index={idx}>
                                          {(dragProvided) => (
                                            <div
                                              ref={dragProvided.innerRef}
                                              {...dragProvided.draggableProps}
                                              {...dragProvided.dragHandleProps}
                                              className="mb-2 last:mb-0 cursor-grab"
                                            >
                                              <div className="rounded-md border border-border/60 bg-background px-2 py-1 text-[11px]">
                                                <span className="font-mono">{f.column}</span>{" "}
                                                <span className="inline-flex items-center gap-1 text-muted-foreground">
                                                  <span className="inline-flex min-w-5 justify-center rounded border border-border/60 px-1 font-mono text-[10px]">
                                                    {operatorSymbol(f.op)}
                                                  </span>
                                                  {f.op === "eq" || f.op === "contains" ? (
                                                    <span>
                                                      is <strong>equal</strong> to
                                                    </span>
                                                  ) : f.op === "neq" || f.op === "not_contains" ? (
                                                    <span>
                                                      <strong>not</strong> equal to
                                                    </span>
                                                  ) : f.op === "lt" ? (
                                                    <span>
                                                      <strong>less</strong> than
                                                    </span>
                                                  ) : (
                                                    <span>
                                                      <strong>greater</strong> than
                                                    </span>
                                                  )}
                                                </span>{" "}
                                                <span className="break-all">
                                                  {f.kind === "date"
                                                    ? new Date(Number(f.value)).toLocaleString()
                                                    : String(f.value)}
                                                </span>
                                              </div>
                                            </div>
                                          )}
                                        </Draggable>
                                      ))}
                                      {provided.placeholder}
                                    </div>
                                  )}
                                </Droppable>
                              </div>
                            </DragDropContext>

                            <div className="text-[10px] text-muted-foreground">
                              Logic: (AND tags) AND (OR tags)
                            </div>
                          </div>
                        </CollapsibleContent>
                      </CollapsibleRoot>
                      </div>
                    )}
                  </div>
            </TabsContent>
          </Tabs>
        </div>
      )}

      {loading ? (
        <ConnectProgressWithLabel label={loadLabel} progress={loadProgress} className="pt-0.5" />
      ) : (
        <div className="flex gap-2 items-end flex-wrap min-w-0 max-w-full">
          <div className="flex gap-2 items-center">
            <Button
              type="button"
              size="sm"
              className="h-8 text-xs shrink-0"
              onClick={handleLoad}
              disabled={!canRunRequest}
            >
              <Play className="h-3.5 w-3.5 shrink-0" />
              <span className="ml-1.5">Run request</span>
            </Button>

            {!canRunRequest && (
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span
                      className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-border/60 bg-background/60 text-muted-foreground cursor-help select-none"
                      aria-label="Run request disabled reasons"
                    >
                      <HelpCircle className="h-3.5 w-3.5" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[260px]">
                    <div className="space-y-1">
                      {runRequestReasons.map((r) => (
                        <div key={r} className="text-xs">
                          {r}
                        </div>
                      ))}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>
      )}

      {error && (
        <p className="text-destructive text-[10px] flex gap-1.5 items-start min-w-0 max-w-full">
          <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span className="min-w-0 break-words">{error}</span>
        </p>
      )}

      {lastRowCount != null && !error && (
        <p className="text-[10px] text-muted-foreground">
          Loaded <strong>{lastRowCount}</strong> rows into the sheet.
        </p>
      )}
    </div>
  );
}
