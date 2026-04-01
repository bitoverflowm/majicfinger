"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { flushSync } from "react-dom";
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
import { Toggle } from "@/components/ui/toggle";
import { Play, AlertCircle, HelpCircle, ChevronDown, Minus, Plus, Pencil, Trash2, Wrench, X } from "lucide-react";
import { getDataLakeDatasetConfig, glueTableNamesForDataset, ATHENA_SAMPLE_ROW_LIMIT } from "@/config/dataLakeParquetSamples";
import { fetchAthenaLakeSample } from "@/lib/dataLake/fetchAthenaSample";
import { filterRowsWithoutNullishInColumns, scanNullishColumnsInSheetRows } from "@/lib/dataLake/sheetNullishScan";
import { athenaRowsToObjects, ingestAthenaResultAsView, listBeckerParquetViews } from "@/lib/duckdb/duckdbWasmClient";
import { ConnectProgressWithLabel } from "./ConnectProgressWithLabel";
import { runParquetSheetLoadWithProgress, PARQUET_LOAD_PHASE_MESSAGES } from "./parquetSheetLoadProgress";
import EquationExprBuilder from "./EquationExprBuilder";
import { ReplaceOrNewSheetDialog } from "@/components/dataView/replaceOrNewSheetDialog";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MetaAddOperationDialog } from "./MetaAddOperationDialog";
import { useMyStateV2 } from "@/context/stateContextV2";
import { rollupKalshiPrefixRowsByTaxonomyGroup } from "@/lib/kalshi/kalshiCategoryTaxonomy";
import {
  KALSHI_TRADES_RESOLVED_MARKETS_JOIN_PRESET,
  KALSHI_TRADES_RESOLVED_MARKETS_JOIN_PRESET_CENT,
  KALSHI_TRADES_RESOLVED_MARKETS_JOIN_META,
} from "@/lib/dataLake/lakeTableColumns";
import { toast } from "sonner";

/** Shown in the column picker / compose cards for server-computed Kalshi fields. */
const KALSHI_VIRTUAL_COMPOSE_LABELS = {
  kalshi_event_ticker_category: "event ticker simplified",
  kalshi_resolved_centile_bin: "Price bucket index (1–10, equal-width on trade price ¢)",
  kalshi_resolved_centile_label: "Price bucket label (centile band, e.g. 1–10 pct)",
  kalshi_resolved_taker_notional: "Taker notional (count × taker price / 100)",
  kalshi_resolved_maker_notional: "Maker notional (count × maker side price / 100)",
  kalshi_resolved_contract_count: "Contract count (trade count)",
};

const KALSHI_TRADES_JOIN_PRESETS = new Set([
  KALSHI_TRADES_RESOLVED_MARKETS_JOIN_PRESET,
  KALSHI_TRADES_RESOLVED_MARKETS_JOIN_PRESET_CENT,
]);

/** Server compose payload: Kalshi markets category + volume (matches applyKalshiCategoryVolumePreset). */
const KALSHI_MARKETS_CATEGORY_VOLUME_COMPOSE_SPEC = {
  select: [
    {
      column: "kalshi_event_ticker_category",
      alias: "category",
      aggregate: null,
      dateBucket: null,
      dateFormat: null,
      numberScale: "none",
      decimals: null,
      treatAsDate: false,
    },
    {
      column: "volume",
      alias: "total_volume",
      aggregate: "sum",
      dateBucket: null,
      dateFormat: null,
      numberScale: "none",
      decimals: null,
      treatAsDate: false,
    },
    {
      column: "ticker",
      alias: "market_count",
      aggregate: "count",
      dateBucket: null,
      dateFormat: null,
      numberScale: "none",
      decimals: null,
      treatAsDate: false,
    },
  ],
  groupByAliases: ["category"],
  orderBy: [{ alias: "total_volume", direction: "desc" }],
};

/**
 * @param {string} joinPreset
 * @returns {object}
 */
function buildKalshiTradesBucketComposeSpec(joinPreset) {
  return {
    select: [
      {
        column: "kalshi_resolved_centile_bin",
        alias: "price_decile",
        aggregate: null,
        dateBucket: null,
        dateFormat: null,
        numberScale: "none",
        decimals: null,
        treatAsDate: false,
      },
      {
        column: "kalshi_resolved_centile_label",
        alias: "price_bucket",
        aggregate: null,
        dateBucket: null,
        dateFormat: null,
        numberScale: "none",
        decimals: null,
        treatAsDate: false,
      },
      {
        column: "kalshi_resolved_taker_notional",
        alias: "sum_taker_notional",
        aggregate: "sum",
        dateBucket: null,
        dateFormat: null,
        numberScale: "none",
        decimals: null,
        treatAsDate: false,
      },
      {
        column: "kalshi_resolved_maker_notional",
        alias: "sum_maker_notional",
        aggregate: "sum",
        dateBucket: null,
        dateFormat: null,
        numberScale: "none",
        decimals: null,
        treatAsDate: false,
      },
      {
        column: "kalshi_resolved_contract_count",
        alias: "volume_contracts",
        aggregate: "sum",
        dateBucket: null,
        dateFormat: null,
        numberScale: "none",
        decimals: null,
        treatAsDate: false,
      },
    ],
    groupByAliases: ["price_decile", "price_bucket"],
    orderBy: [{ alias: "price_decile", direction: "asc" }],
    join: { preset: joinPreset },
  };
}

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
  { name: "kalshi_event_ticker_category", type: "string" },
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
  if (op === "in") return "IN";
  if (op === "not_in") return "NOT IN";
  return "=";
}

function genMetaOpId() {
  return `metaop-${Date.now().toString(36)}-${Math.random().toString(16).slice(2)}`;
}

function genComposeRowId() {
  return `cs-${Date.now().toString(36)}-${Math.random().toString(16).slice(2)}`;
}

function genComposeJoinId() {
  return `cj-${Date.now().toString(36)}-${Math.random().toString(16).slice(2)}`;
}

function genRequestCardId() {
  return `req-${Date.now().toString(36)}-${Math.random().toString(16).slice(2)}`;
}

function fmtSeconds(ms) {
  const n = Number(ms);
  if (!Number.isFinite(n) || n < 0) return "—";
  return `${(n / 1000).toFixed(2)}s`;
}

function summarizeWhereFilters(filters) {
  const and = Array.isArray(filters?.and) ? filters.and : [];
  if (!and.length) return { hasWhere: false, text: "" };
  const parts = and
    .map((f) => {
      const c = String(f?.column || "").trim();
      const op = String(f?.op || "").trim();
      const v = f?.value;
      if (!c || !op) return "";
      if (op === "in" || op === "not_in") return `${c} ${op} (…)`;
      if (typeof v === "string") return `${c} ${op} "${v}"`;
      if (typeof v === "number" && Number.isFinite(v)) return `${c} ${op} ${v}`;
      return `${c} ${op}`;
    })
    .filter(Boolean);
  return { hasWhere: true, text: parts.join(" AND ") };
}

/** @param {string} col */
function composeSourceColumnLabel(col) {
  return KALSHI_VIRTUAL_COMPOSE_LABELS[col] || col;
}

/** @param {{ aggregate: null | string }} item */
function composeRollUpSelectValue(item) {
  if (item.aggregate === "sum" && item.equation?.enabled) return "equation";
  return item.aggregate || "none";
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

/** Row shape used for meta-operation placeholders on the sheet (not Athena compose / lake rows). */
function rowLooksLikeMetaPreviewRow(row) {
  if (!row || typeof row !== "object") return false;
  const keys = Object.keys(row);
  if (keys.length === 0) return false;
  return (
    keys.includes("Operation name") ||
    keys.includes("Op ref") ||
    keys.includes("meta query") ||
    keys.includes("value")
  );
}

/** Empty sheet or only meta-placeholder rows — safe to replace with meta preview. */
function connectedDataIsEmptyOrMetaPreviewOnly(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return true;
  return rows.every(rowLooksLikeMetaPreviewRow);
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
  const dataSheets = ctx?.dataSheets || {};
  const liveStreamState = ctx?.liveStreamState;
  const activeSheetId = ctx?.activeSheetId;

  const streamsBySheetId = liveStreamState?.streamsBySheetId || {};
  const hasLiveConnection =
    !!activeSheetId &&
    !!streamsBySheetId[activeSheetId]?.isRunning;

  const { sampleOptions, lake } = useMemo(() => getDataLakeDatasetConfig(dataset), [dataset]);
  const glueJoinTableOptions = useMemo(() => glueTableNamesForDataset(dataset), [dataset]);

  const canUseSamples = true;
  const [sampleId, setSampleId] = useState("");
  const [athenaPingBySampleId, setAthenaPingBySampleId] = useState({}); // { [sampleId]: "idle" | "loading" | "ok" | "error" }
  /** @type {Array<{ id: string; column: string; alias: string; aggregate: null | "sum" | "count"; dateBucket: null | string; dateFormat: null | string; numberScale: string; decimals: null | number; treatAsDate: boolean; sumCase?: any; equation?: any }>} */
  const [columnComposeItems, setColumnComposeItems] = useState([]);
  /** @type {Array<{ alias: string; direction: "asc" | "desc" }>} */
  const [columnComposeOrderBy, setColumnComposeOrderBy] = useState([]);
  /** @type {Array<{ id: string; column: string; kind: "date" | "string" | "number"; op: string; value: any }>} */
  const [composeWhereFilters, setComposeWhereFilters] = useState([]);
  /** @type {Array<{ id: string; havingAlias: string; op: string; value: any }>} */
  const [composeHavingFilters, setComposeHavingFilters] = useState([]);
  /** @type {Array<{ id: string; targetKind: "table" | "sheet"; targetTable: string; targetSheetId: string; joinType: "inner" | "left"; mergeStrategy?: "browser" | "server"; leftColumn: string; rightColumn: string }>} */
  const [composeJoins, setComposeJoins] = useState([]);
  const [sheetJoinDialogOpen, setSheetJoinDialogOpen] = useState(false);
  const [sheetJoinMode, setSheetJoinMode] = useState("sheet"); // "sheet" | "source"
  const [sheetJoinLeftId, setSheetJoinLeftId] = useState("");
  const [sheetJoinRightId, setSheetJoinRightId] = useState("");
  const [sheetJoinType, setSheetJoinType] = useState("inner"); // "inner" | "left"
  const [sheetJoinLeftColumn, setSheetJoinLeftColumn] = useState("");
  const [sheetJoinRightColumn, setSheetJoinRightColumn] = useState("");
  /** After Athena returns rows grouped by event-ticker prefix, merge into Sports / Politics / … (client-side, matches pandas get_group). */
  const [kalshiTaxonomyRollup, setKalshiTaxonomyRollup] = useState(false);
  /** Kalshi trades compose: optional INNER JOIN to finalized yes/no markets (Athena subquery). */
  const [kalshiTradesJoinPreset, setKalshiTradesJoinPreset] = useState("");
  const [selectionTab, setSelectionTab] = useState("columns"); // "columns" | "meta" | "recipes"
  const [showRequestComposer, setShowRequestComposer] = useState(true);
  const [expandedRequestCardId, setExpandedRequestCardId] = useState(null);
  const [nullishAlertOpen, setNullishAlertOpen] = useState(false);
  const [nullishColumnList, setNullishColumnList] = useState([]);
  const nullishPendingRowsRef = useRef(null);
  const postNullishContinueRef = useRef(null);
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

  /** @type {React.MutableRefObject<null | { mode: "columns" | "meta"; lake: string; table: string; sampleId: string; composeSpec?: object; composeFilters?: any; sheetJoinSpec?: any; sheetProvenance?: any; requestCard?: any; kalshiIngestExtras?: { taxonomyRollup: boolean; composeItemsSnapshot: { column: string; alias: string; aggregate: null | string }[] } | null; metaOpSpecs?: any[]; metaRunDisposition?: string; metaAppendTargetIndex?: number }>} */
  const pendingIngestRef = useRef(null);

  useEffect(() => {
    setSampleId((prev) => (prev && sampleOptions.some((s) => s.id === prev) ? prev : ""));
  }, [dataset, sampleOptions]);

  const selected = sampleOptions.find((s) => s.id === sampleId);
  const pingState = sampleId ? athenaPingBySampleId?.[sampleId] || "idle" : "idle";

  const pingAthenaForSource = useCallback(
    async (nextSampleId) => {
      const id = String(nextSampleId || "").trim();
      const snap = sampleOptions.find((s) => s.id === id);
      const table = snap?.table;
      if (!id || !table) return;
      setAthenaPingBySampleId((prev) => ({ ...(prev || {}), [id]: "loading" }));
      try {
        const res = await fetch("/api/data-lake/athena-query/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({
            lake,
            table,
            queryType: "count",
            countAlias: "count",
            limit: 1,
            caseSensitive: true,
            filters: null,
          }),
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(j.error || res.statusText || `Ping ${res.status}`);
        setAthenaPingBySampleId((prev) => ({ ...(prev || {}), [id]: "ok" }));
      } catch (e) {
        setAthenaPingBySampleId((prev) => ({ ...(prev || {}), [id]: "error" }));
      }
    },
    [lake, sampleOptions],
  );
  const availableColumnMeta = useMemo(() => {
    if (!selected?.table) return [];
    if (dataset === "kalshi" && selected.table === "trades" && KALSHI_TRADES_JOIN_PRESETS.has(kalshiTradesJoinPreset)) {
      return [...KALSHI_TRADES_RESOLVED_MARKETS_JOIN_META];
    }
    return getColumnMetaForTable(dataset, selected.table);
  }, [dataset, selected?.table, kalshiTradesJoinPreset]);
  const availableColumns = useMemo(() => availableColumnMeta.map((c) => c.name), [availableColumnMeta]);
  const availableColumnTypesByName = useMemo(() => {
    const map = {};
    for (const c of availableColumnMeta) map[c.name] = c.type;
    return map;
  }, [availableColumnMeta]);
  const numericColumns = useMemo(() => {
    return availableColumns.filter((c) => {
      const t = String(availableColumnTypesByName[c] || "").toLowerCase();
      return t === "double" || t === "bigint" || t === "int";
    });
  }, [availableColumns, availableColumnTypesByName]);

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
    () => columnComposeItems.some((i) => i.aggregate != null),
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

  const sheetJoinCandidates = useMemo(() => {
    const entries = Object.entries(dataSheets || {});
    return entries.map(([id, sheet]) => ({
      id,
      name: String(sheet?.name || id),
      rowCount: Array.isArray(sheet?.data) ? sheet.data.length : 0,
    }));
  }, [dataSheets]);

  const sheetsCount = sheetJoinCandidates.length;

  const openSheetJoinDialog = useCallback(() => {
    const candidates = sheetJoinCandidates.filter((s) => s.rowCount > 0);
    const left = candidates[0]?.id || sheetJoinCandidates[0]?.id || "";
    const right = candidates.find((s) => s.id !== left)?.id || "";

    setSheetJoinMode("sheet");
    setSheetJoinLeftId(left);
    setSheetJoinRightId(right);
    setSheetJoinType("inner");

    const leftCols = left ? Object.keys((dataSheets?.[left]?.data || [])[0] || {}) : [];
    const rightCols = right ? Object.keys((dataSheets?.[right]?.data || [])[0] || {}) : [];
    setSheetJoinLeftColumn(leftCols[0] || "");
    setSheetJoinRightColumn(rightCols[0] || "");

    setSheetJoinDialogOpen(true);
  }, [sheetJoinCandidates, dataSheets]);

  const runSheetJoinIntoNewSheet = useCallback(async () => {
    const leftId = String(sheetJoinLeftId || "").trim();
    const rightId = String(sheetJoinRightId || "").trim();
    if (!leftId || !rightId || leftId === rightId) {
      toast.error("Pick two different sheets to join.");
      return;
    }
    const leftSheet = dataSheets?.[leftId];
    const rightSheet = dataSheets?.[rightId];
    const leftRows = Array.isArray(leftSheet?.data) ? leftSheet.data : [];
    const rightRows = Array.isArray(rightSheet?.data) ? rightSheet.data : [];
    if (!leftRows.length || !rightRows.length) {
      toast.error("Both sheets must have rows.");
      return;
    }

    const joinType = sheetJoinType === "left" ? "left" : "inner";
    const leftKey = String(sheetJoinLeftColumn || "").trim();
    const rightKey = String(sheetJoinRightColumn || "").trim();
    if (!leftKey || !rightKey) {
      toast.error("Pick join columns.");
      return;
    }

    if (sheetJoinMode === "sheet") {
      // Browser join (preview rows only).
      const rightByKey = new Map();
      for (const r of rightRows) {
        const k = r?.[rightKey];
        const kk = k == null ? "" : String(k);
        if (!kk) continue;
        if (!rightByKey.has(kk)) rightByKey.set(kk, r);
      }
      const out = [];
      for (const l of leftRows) {
        const lk = l?.[leftKey];
        const lks = lk == null ? "" : String(lk);
        const r = lks ? rightByKey.get(lks) : null;
        if (!r && joinType === "inner") continue;
        const row = { ...(l || {}) };
        if (r) {
          for (const [k, v] of Object.entries(r)) {
            const outKey = Object.prototype.hasOwnProperty.call(row, k) ? `${String(rightSheet?.name || rightId)}_${k}` : k;
            row[outKey] = v;
          }
        }
        out.push(row);
        if (out.length >= ATHENA_SAMPLE_ROW_LIMIT) break;
      }

      addNewSheetAndActivate?.((newId) => {
        setSheetData?.(newId, out);
        setDataSheets?.((prev) => {
          const p = prev || {};
          const sheet = p[newId];
          if (!sheet) return prev;
          return {
            ...p,
            [newId]: {
              ...sheet,
              name: `Join · ${String(leftSheet?.name || leftId)} ⟕ ${String(rightSheet?.name || rightId)}`.slice(0, 80),
              provenance: null,
            },
          };
        });
      });

      setSheetJoinDialogOpen(false);
      toast.success("Joined sheets into a new sheet.");
      return;
    }

    // Source join (Athena/CTE): use left sheet provenance as the base query and join to right sheet CTE.
    const leftProv = leftSheet?.provenance;
    const rightProv = rightSheet?.provenance;
    if (!leftProv || !rightProv || leftProv.kind !== "compose" || rightProv.kind !== "compose") {
      toast.error("Both sheets must be CTE-rebuildable (provenance kind: compose).");
      return;
    }
    if (String(leftProv.lake || "") !== String(rightProv.lake || "")) {
      toast.error("Sheets must be from the same lake to join in the original data source.");
      return;
    }

    try {
      setLoading(true);
      setLoadLabel("Joining in the data source…");
      setLoadProgress(10);

      const sheetGraph = {};
      const collect = (id) => {
        const s = dataSheets?.[id];
        const prov = s?.provenance;
        if (!s || !prov || prov.kind !== "compose") return;
        if (sheetGraph[id]) return;
        sheetGraph[id] = { name: String(s?.name || id), provenance: prov };
        const deps = Array.isArray(prov.serverSheetJoins) ? prov.serverSheetJoins : [];
        deps.forEach((d) => d?.targetSheetId && collect(d.targetSheetId));
      };
      collect(leftId);
      collect(rightId);

      const res = await fetch("/api/data-lake/join-sheets-cte", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          lake: leftProv.lake,
          table: leftProv.table,
          compose: leftProv.composeSpec,
          filters: leftProv.composeFilters || null,
          joins: [
            {
              targetSheetId: rightId,
              joinType,
              leftColumn: leftKey, // must be a base-table column name
              rightColumn: rightKey, // must be a column produced by the right CTE
            },
          ],
          sheetGraph,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || res.statusText || `Join ${res.status}`);

      const outRows = Array.isArray(j.rows) ? j.rows.slice(0, ATHENA_SAMPLE_ROW_LIMIT) : [];

      const newProv = {
        kind: "compose",
        lake: leftProv.lake,
        table: leftProv.table,
        composeSpec: leftProv.composeSpec,
        composeFilters: leftProv.composeFilters || null,
        serverSheetJoins: [
          ...(Array.isArray(leftProv.serverSheetJoins) ? leftProv.serverSheetJoins : []),
          { targetSheetId: rightId, joinType, leftColumn: leftKey, rightColumn: rightKey },
        ],
        browserSheetJoins: [],
      };

      addNewSheetAndActivate?.((newId) => {
        setSheetData?.(newId, outRows);
        setDataSheets?.((prev) => {
          const p = prev || {};
          const sheet = p[newId];
          if (!sheet) return prev;
          return {
            ...p,
            [newId]: {
              ...sheet,
              name: `Join · ${String(leftSheet?.name || leftId)} ⟕ ${String(rightSheet?.name || rightId)} (lake)`.slice(0, 80),
              provenance: newProv,
            },
          };
        });
      });

      setSheetJoinDialogOpen(false);
      toast.success("Joined via Athena into a new sheet.");
    } catch (e) {
      toast.error(e?.message || String(e));
    } finally {
      setLoading(false);
      setLoadProgress(0);
    }
  }, [
    sheetJoinLeftId,
    sheetJoinRightId,
    sheetJoinMode,
    sheetJoinType,
    sheetJoinLeftColumn,
    sheetJoinRightColumn,
    dataSheets,
    addNewSheetAndActivate,
    setSheetData,
    setDataSheets,
  ]);

  const addComposeJoinRule = useCallback(() => {
    setComposeJoins((prev) => {
      const list = Array.isArray(prev) ? prev : [];
      const baseLeft = availableColumns?.[0] || "";
      const defaultTargetTable = selected?.table === "markets" ? "trades" : "markets";
      return [
        ...list,
        {
          id: genComposeJoinId(),
          targetKind: "table",
          targetTable: defaultTargetTable,
          targetSheetId: "",
          joinType: "inner",
          mergeStrategy: "server",
          leftColumn: baseLeft,
          rightColumn: "",
        },
      ];
    });
  }, [availableColumns, selected?.table]);

  /** Non-aggregate SELECT aliases — these are the GROUP BY keys when Sum/Count is used (e.g. one row per quarter). */
  const composeDimensionAliases = useMemo(
    () =>
      columnComposeItems
        .filter((i) => i.aggregate == null)
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

  const composeAggregateAliasChoices = useMemo(() => {
    return columnComposeItems
      .filter((i) => i.aggregate != null)
      .map((i) => ({
        alias: String(i.alias || i.column).trim(),
        label: i.aggregate ? `${String(i.alias)} = ${i.aggregate.toUpperCase()}` : String(i.alias),
      }));
  }, [columnComposeItems]);

  const buildServerComposePayload = useCallback(() => {
    const payload = {
      select: columnComposeItems.map((i) => ({
        column: i.column,
        alias: String(i.alias || i.column).trim(),
        aggregate: i.aggregate || null,
        dateBucket: i.dateBucket || null,
        dateFormat: i.dateFormat || null,
        numberScale: i.numberScale || "none",
        decimals: i.decimals != null ? Number(i.decimals) : null,
        treatAsDate: i.treatAsDate === true,
        ...(i.aggregate === "sum" && i.sumCase && i.sumCase.enabled ? { sumCase: i.sumCase } : {}),
        ...(i.aggregate === "sum" && i.equation && i.equation.enabled ? { equation: i.equation } : {}),
      })),
      // Server normalizes too: with Sum/Count, GROUP BY is every non-aggregate field (e.g. quarter) so many trades in Q1 2024 become one row.
      groupByAliases: hasComposeAggregates ? composeDimensionAliases : [],
      orderBy: columnComposeOrderBy,
    };

    if (composeHavingFilters.length > 0) {
      payload.having = {
        and: composeHavingFilters.map((f) => ({
          alias: f.havingAlias,
          op: f.op,
          value: Number(f.value),
        })),
      };
    }

    if (dataset === "kalshi" && selected?.table === "trades" && KALSHI_TRADES_JOIN_PRESETS.has(kalshiTradesJoinPreset)) {
      payload.join = { preset: kalshiTradesJoinPreset };
    }

    const tableJoins = (composeJoins || [])
      .filter((j) => j && j.targetKind === "table")
      .map((j) => ({
        joinType: j.joinType || "inner",
        table: String(j.targetTable || "").trim().toLowerCase(),
        on: { leftColumn: String(j.leftColumn || "").trim(), rightColumn: String(j.rightColumn || "").trim() },
      }))
      .filter((j) => j.table && j.on.leftColumn && j.on.rightColumn);
    if (tableJoins.length) payload.joins = tableJoins;
    return payload;
  }, [
    columnComposeItems,
    columnComposeOrderBy,
    composeHavingFilters,
    hasComposeAggregates,
    composeDimensionAliases,
    dataset,
    selected?.table,
    kalshiTradesJoinPreset,
    composeJoins,
  ]);

  const composeFriendlySummary = useMemo(() => {
    const tableName = selected?.label || "this table";
    if (!columnComposeItems.length) {
      return `Pick fields from ${tableName} below. Nothing will load until you add at least one field.`;
    }
    const bits = columnComposeItems.map((it) => {
      const title = String(it.alias || it.column).trim();
      if (it.aggregate === "sum") {
        if (it.equation?.enabled) {
          return `“${title}” = SUM( custom expression )`;
        }
        return `“${title}” = sum of ${it.column}`;
      }
      if (it.aggregate === "count") {
        return `“${title}” = count of ${it.column}`;
      }
      if (it.aggregate === "count_distinct") {
        return `“${title}” = count distinct of ${it.column}`;
      }
      if (it.aggregate === "avg") {
        return `“${title}” = average of ${it.column}`;
      }
      if (it.aggregate === "min") {
        return `“${title}” = min of ${it.column}`;
      }
      if (it.aggregate === "max") {
        return `“${title}” = max of ${it.column}`;
      }
      if (it.aggregate === "median") {
        return `“${title}” = median (approx) of ${it.column}`;
      }
      if (it.aggregate === "stddev") {
        return `“${title}” = stddev (volatility) of ${it.column}`;
      }
      if (it.aggregate === "variance") {
        return `“${title}” = variance of ${it.column}`;
      }
      if (it.column === "kalshi_event_ticker_category") {
        return `“${title}” = leading A–Z/0–9 token from event_ticker (Athena regexp_extract)`;
      }
      if (String(it.column || "").startsWith("kalshi_resolved_")) {
        return `“${title}” = ${KALSHI_VIRTUAL_COMPOSE_LABELS[it.column] || it.column} (trades ⟕ resolved markets join)`;
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
    setComposeWhereFilters([]);
    setComposeHavingFilters([]);
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
    setKalshiTaxonomyRollup(false);
    setKalshiTradesJoinPreset("");
  }, [selected?.table]);

  useEffect(() => {
    if (KALSHI_TRADES_JOIN_PRESETS.has(kalshiTradesJoinPreset)) {
      setColumnComposeItems((items) =>
        items.filter((i) => KALSHI_TRADES_RESOLVED_MARKETS_JOIN_META.some((c) => c.name === i.column)),
      );
      return;
    }
    setColumnComposeItems((items) => items.filter((i) => !String(i.column || "").startsWith("kalshi_resolved_")));
  }, [kalshiTradesJoinPreset]);

  const refreshBeckerViews = useCallback(() => {
    setBeckerViews(listBeckerParquetViews());
  }, []);

  const applyRowsToActiveSheet = useCallback(
    (rows, provenance) => {
      replaceCurrentSheetData?.(rows);
      setConnectedData?.(rows);
      if (provenance && setDataSheets && activeSheetId) {
        setDataSheets((prev) => {
          const cur = prev?.[activeSheetId];
          return {
            ...(prev || {}),
            [activeSheetId]: {
              ...(cur || { name: `Sheet`, data: [] }),
              provenance,
            },
          };
        });
      }
    },
    [replaceCurrentSheetData, setConnectedData, setDataSheets, activeSheetId],
  );

  const finalizeIngestSheetRows = useCallback((rows, rowCountHint, applyWithCount) => {
    const { columns: badCols } = scanNullishColumnsInSheetRows(rows);
    if (!badCols.length) {
      applyWithCount(rows, rowCountHint ?? rows.length);
      return;
    }
    postNullishContinueRef.current = (finalRows) => {
      applyWithCount(finalRows, finalRows.length);
      postNullishContinueRef.current = null;
    };
    setNullishColumnList(badCols);
    nullishPendingRowsRef.current = rows;
    setNullishAlertOpen(true);
  }, []);

  const applyKalshiCategoryVolumePreset = useCallback(() => {
    setError(null);
    setColumnComposeItems([
      {
        id: genComposeRowId(),
        column: "kalshi_event_ticker_category",
        alias: "category",
        aggregate: null,
        dateBucket: null,
        dateFormat: null,
        numberScale: "none",
        decimals: null,
        treatAsDate: false,
      },
      {
        id: genComposeRowId(),
        column: "volume",
        alias: "total_volume",
        aggregate: "sum",
        dateBucket: null,
        dateFormat: null,
        numberScale: "none",
        decimals: null,
        treatAsDate: false,
      },
      {
        id: genComposeRowId(),
        column: "ticker",
        alias: "market_count",
        aggregate: "count",
        dateBucket: null,
        dateFormat: null,
        numberScale: "none",
        decimals: null,
        treatAsDate: false,
      },
    ]);
    setColumnComposeOrderBy([{ alias: "total_volume", direction: "desc" }]);
  }, []);

  /** Fills compose for trades join: bucket dimensions + summed notionals + contract volume (for bar charts). */
  const applyKalshiTradesBucketComposeUI = useCallback((joinPreset) => {
    setError(null);
    setKalshiTradesJoinPreset(joinPreset);
    setColumnComposeItems([
      {
        id: genComposeRowId(),
        column: "kalshi_resolved_centile_bin",
        alias: "price_decile",
        aggregate: null,
        dateBucket: null,
        dateFormat: null,
        numberScale: "none",
        decimals: null,
        treatAsDate: false,
      },
      {
        id: genComposeRowId(),
        column: "kalshi_resolved_centile_label",
        alias: "price_bucket",
        aggregate: null,
        dateBucket: null,
        dateFormat: null,
        numberScale: "none",
        decimals: null,
        treatAsDate: false,
      },
      {
        id: genComposeRowId(),
        column: "kalshi_resolved_taker_notional",
        alias: "sum_taker_notional",
        aggregate: "sum",
        dateBucket: null,
        dateFormat: null,
        numberScale: "none",
        decimals: null,
        treatAsDate: false,
      },
      {
        id: genComposeRowId(),
        column: "kalshi_resolved_maker_notional",
        alias: "sum_maker_notional",
        aggregate: "sum",
        dateBucket: null,
        dateFormat: null,
        numberScale: "none",
        decimals: null,
        treatAsDate: false,
      },
      {
        id: genComposeRowId(),
        column: "kalshi_resolved_contract_count",
        alias: "volume_contracts",
        aggregate: "sum",
        dateBucket: null,
        dateFormat: null,
        numberScale: "none",
        decimals: null,
        treatAsDate: false,
      },
    ]);
    setColumnComposeOrderBy([{ alias: "price_decile", direction: "asc" }]);
  }, []);

  const runIngestWithProgress = useCallback(
    async (
      lakeVal,
      table,
      sid,
      mode,
      composeSpec,
      composeFilters,
      metaQueryMode,
      metaFilters,
      metaOpSpecs,
      kalshiIngestExtras = null,
      sheetJoinSpec = null,
    ) => {
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
          const sheetJoin = sheetJoinSpec && typeof sheetJoinSpec === "object" ? sheetJoinSpec : null;

          const { columns: resultColumns, rows } = sheetJoin
            ? await (async () => {
                if (sheetJoin.error) throw new Error(sheetJoin.error);

                if (sheetJoin.mode === "browser") {
                  const joinEnabled =
                    Array.isArray(sheetJoin.sheetRows) &&
                    sheetJoin.sheetRows.length > 0 &&
                    sheetJoin.join &&
                    typeof sheetJoin.join === "object";
                  if (!joinEnabled) {
                    throw new Error("Browser join selected, but target sheet has no preview rows.");
                  }

                  const res = await fetch("/api/data-lake/join-sheet", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "same-origin",
                    body: JSON.stringify({
                      lake: lakeVal,
                      table,
                      compose: composeSpec,
                      filters: composeFilters || null,
                      sheetRows: sheetJoin.sheetRows,
                      join: sheetJoin.join,
                    }),
                  });
                  let j = {};
                  try {
                    j = await res.json();
                  } catch {
                    /* ignore */
                  }
                  if (!res.ok) throw new Error(j.error || res.statusText || `Join ${res.status}`);
                  return { columns: j.columns || [], rows: j.rows || [] };
                }

                if (sheetJoin.mode === "server") {
                  const res = await fetch("/api/data-lake/join-sheets-cte", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "same-origin",
                    body: JSON.stringify({
                      lake: lakeVal,
                      table,
                      compose: composeSpec,
                      filters: composeFilters || null,
                      joins: sheetJoin.joins || [],
                      sheetGraph: sheetJoin.sheetGraph || {},
                    }),
                  });
                  let j = {};
                  try {
                    j = await res.json();
                  } catch {
                    /* ignore */
                  }
                  if (!res.ok) throw new Error(j.error || res.statusText || `Server join ${res.status}`);
                  return { columns: j.columns || [], rows: j.rows || [] };
                }

                throw new Error(`Unknown join mode: ${String(sheetJoin.mode || "")}`);
              })()
            : await fetchAthenaLakeSample(
                {
                  lake: lakeVal,
                  table,
                  queryType: "compose",
                  compose: composeSpec,
                  filters: composeFilters || null,
                  caseSensitive: true,
                },
                { maxWaitMs: 900000 },
              );

          let outRows = rows;
          const kr = kalshiIngestExtras?.taxonomyRollup;
          const snap = kalshiIngestExtras?.composeItemsSnapshot;
          if (
            kr &&
            dataset === "kalshi" &&
            table === "markets" &&
            Array.isArray(snap) &&
            Array.isArray(outRows) &&
            outRows.length > 0
          ) {
            const catItem = snap.find((i) => i.column === "kalshi_event_ticker_category");
            const sumItem = snap.find((i) => i.aggregate === "sum");
            const cntItem = snap.find((i) => i.aggregate === "count");
            if (catItem && sumItem && cntItem) {
              const ca = String(catItem.alias || "").trim();
              const va = String(sumItem.alias || "").trim();
              const na = String(cntItem.alias || "").trim();
              if (ca && va && na) {
                const asObjects = athenaRowsToObjects(resultColumns, outRows);
                outRows = rollupKalshiPrefixRowsByTaxonomyGroup(asObjects, ca, va, na);
              }
            }
          }

          const cappedColumns = Array.isArray(resultColumns) ? resultColumns : [];
          const cappedRows = Array.isArray(outRows) ? outRows.slice(0, ATHENA_SAMPLE_ROW_LIMIT) : [];
          return ingestAthenaResultAsView({
            dataset,
            sampleId: `${sid}-compose`,
            columns: cappedColumns,
            rows: cappedRows,
            limit: ATHENA_SAMPLE_ROW_LIMIT,
            ingestFullResult: false,
          });
        },
      });
    },
    [dataset, metaOperationColumn, metaOperationKind],
  );

  const executeIngestReplace = useCallback(async () => {
    const pending = pendingIngestRef.current;
    if (!pending) return;
    const {
      mode,
      lake: lk,
      table,
      sampleId: sid,
      composeSpec,
      composeFilters,
      metaQueryMode,
      metaFilters,
      metaOpSpecs,
      kalshiIngestExtras,
      sheetJoinSpec,
      sheetProvenance,
      requestStartMs,
      requestCard,
    } =
      pending;
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
        composeFilters,
        metaQueryMode,
        metaFilters,
        metaOpSpecs,
        kalshiIngestExtras,
        sheetJoinSpec,
      );
      finalizeIngestSheetRows(rows, rowCount, (finalRows, n) => {
        applyRowsToActiveSheet(finalRows, sheetProvenance);
        if (mode === "columns" && requestCard && activeSheetId && setDataSheets) {
          const endMs = typeof performance !== "undefined" && performance?.now ? performance.now() : Date.now();
          const elapsedMs = Math.max(0, Number(endMs) - Number(requestStartMs || endMs));
          const card = { ...requestCard, sheetId: activeSheetId, elapsedMs };
          setDataSheets((prev) => {
            const p = prev || {};
            const sheet = p[activeSheetId];
            if (!sheet) return prev;
            return {
              ...p,
              [activeSheetId]: {
                ...sheet,
                requestCards: [card],
              },
            };
          });
          setExpandedRequestCardId(card.id);
          setShowRequestComposer(false);
        }
        setLastRowCount(n);
        refreshBeckerViews();
      });
    } catch (e) {
      const msg = e?.message || String(e);
      setError(msg);
    } finally {
      setLoading(false);
      setLoadProgress(0);
    }
  }, [applyRowsToActiveSheet, finalizeIngestSheetRows, refreshBeckerViews, runIngestWithProgress]);

  const executeIngestAppend = useCallback(async () => {
    const pending = pendingIngestRef.current;
    if (!pending) return;
    const {
      mode,
      lake: lk,
      table,
      sampleId: sid,
      composeSpec,
      composeFilters,
      metaQueryMode,
      metaFilters,
      metaOpSpecs,
      metaAppendTargetIndex,
      kalshiIngestExtras,
      sheetJoinSpec,
    } = pending;
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
        composeFilters,
        metaQueryMode,
        metaFilters,
        metaOpSpecs,
        kalshiIngestExtras,
        sheetJoinSpec,
      );
      finalizeIngestSheetRows(rows, rowCount, (finalRows, n) => {
        if (mode === "meta") {
          const patchRow = finalRows[0];
          if (patchRow && Number.isInteger(metaAppendTargetIndex)) {
            setConnectedData?.((prev) => {
              const list = Array.isArray(prev) ? [...prev] : [];
              const idx = Math.max(0, Math.min(metaAppendTargetIndex, list.length));
              if (idx < list.length) list[idx] = patchRow;
              else list.push(patchRow);
              return list;
            });
          } else {
            applyRowsToActiveSheet(finalRows);
          }
        } else {
          setConnectedData?.((prev) => [...(Array.isArray(prev) ? prev : []), ...finalRows]);
        }
        setLastRowCount(n);
        refreshBeckerViews();
      });
    } catch (e) {
      const msg = e?.message || String(e);
      setError(msg);
    } finally {
      setLoading(false);
      setLoadProgress(0);
    }
  }, [
    applyRowsToActiveSheet,
    finalizeIngestSheetRows,
    refreshBeckerViews,
    runIngestWithProgress,
    setConnectedData,
  ]);

  const executeIngestNewSheet = useCallback(async () => {
    const pending = pendingIngestRef.current;
    if (!pending) return;
    const {
      mode,
      lake: lk,
      table,
      sampleId: sid,
      composeSpec,
      composeFilters,
      sheetProvenance,
      sheetJoinSpec,
      requestStartMs,
      requestCard,
      metaQueryMode,
      metaFilters,
      metaOpSpecs,
      kalshiIngestExtras,
    } = pending;
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
        composeFilters,
        metaQueryMode,
        metaFilters,
        metaOpSpecs,
        kalshiIngestExtras,
        sheetJoinSpec,
      );

      finalizeIngestSheetRows(rows, rowCount, (finalRows, n) => {
        const newCardId = requestCard ? genRequestCardId() : null;
        addNewSheetAndActivate?.((newId) => {
          setSheetData?.(newId, finalRows);
          setDataSheets?.((prev) => {
            const sheet = prev[newId];
            if (!sheet) return prev;
            const endMs = typeof performance !== "undefined" && performance?.now ? performance.now() : Date.now();
            const elapsedMs = Math.max(0, Number(endMs) - Number(requestStartMs || endMs));
            const card = requestCard && newCardId ? { ...requestCard, id: newCardId, sheetId: newId, elapsedMs } : null;
            return {
              ...prev,
              [newId]: {
                ...sheet,
                name: `${prefix} · ${sampleLabel}${mode === "meta" ? " · Count" : mode === "columns" ? " · Query" : ""}`.slice(
                  0,
                  80,
                ),
                ...(sheetProvenance ? { provenance: sheetProvenance } : {}),
                ...(card && mode === "columns" ? { requestCards: [card] } : {}),
              },
            };
          });
        });
        if (mode === "columns" && requestCard) {
          if (newCardId) setExpandedRequestCardId(newCardId);
          setShowRequestComposer(false);
        }
        setLastRowCount(n);
        refreshBeckerViews();
      });
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
    finalizeIngestSheetRows,
    refreshBeckerViews,
    runIngestWithProgress,
    sampleOptions,
    setDataSheets,
    setSheetData,
  ]);

  const onNullishDialogRemoveRows = useCallback(() => {
    const rows = nullishPendingRowsRef.current;
    const cols = nullishColumnList;
    const fn = postNullishContinueRef.current;
    postNullishContinueRef.current = null;
    nullishPendingRowsRef.current = null;
    setNullishAlertOpen(false);
    setNullishColumnList([]);
    if (fn && rows && cols.length) {
      fn(filterRowsWithoutNullishInColumns(rows, cols));
    }
  }, [nullishColumnList]);

  const onNullishDialogKeep = useCallback(() => {
    const rows = nullishPendingRowsRef.current;
    const fn = postNullishContinueRef.current;
    postNullishContinueRef.current = null;
    nullishPendingRowsRef.current = null;
    setNullishAlertOpen(false);
    setNullishColumnList([]);
    if (fn && rows) fn(rows);
  }, []);

  const onNullishAlertOpenChange = useCallback((open) => {
    setNullishAlertOpen(open);
    if (open) return;
    if (!postNullishContinueRef.current) return;
    const fn = postNullishContinueRef.current;
    const rows = nullishPendingRowsRef.current;
    postNullishContinueRef.current = null;
    nullishPendingRowsRef.current = null;
    setNullishColumnList([]);
    if (fn && rows != null) fn(rows);
  }, []);

  /** True when the active sheet only shows meta-operation placeholders (not "real" loaded data). */
  const connectedDataIsMetaPreviewOnly = useMemo(() => {
    if (selectionTab !== "meta") return false;
    if (!connectedData.length) return false;
    return connectedData.every((row) => {
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
  }, [selectionTab, connectedData]);

  const promptReplaceOrNewSheetIfNeeded = useCallback(() => {
    if (connectedData.length > 0 && !connectedDataIsMetaPreviewOnly) {
      setSheetDialogOpen(true);
      return true;
    }
    return false;
  }, [connectedData, connectedDataIsMetaPreviewOnly]);

  const runRecipeKalshiMarketsCategoryVolume = useCallback(() => {
    if (dataset !== "kalshi" || selected?.table !== "markets" || !selected?.id) return;
    setError(null);
    flushSync(() => {
      applyKalshiCategoryVolumePreset();
      setSelectionTab("recipes");
    });
  }, [applyKalshiCategoryVolumePreset, dataset, selected?.id, selected?.table]);

  const runRecipeKalshiTradesVolumeByBucket = useCallback(
    (joinPreset) => {
      if (dataset !== "kalshi" || selected?.table !== "trades" || !selected?.id) return;
      if (!KALSHI_TRADES_JOIN_PRESETS.has(joinPreset)) return;
      setError(null);
      flushSync(() => {
        applyKalshiTradesBucketComposeUI(joinPreset);
        setSelectionTab("recipes");
      });
    },
    [applyKalshiTradesBucketComposeUI, dataset, selected?.id, selected?.table],
  );

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
  // Do not replace lake / compose query results when switching from Columns or Recipes — only
  // overwrite when the sheet is empty or already showing meta placeholders.
  useEffect(() => {
    if (selectionTab !== "meta") return;
    if (!connectedDataIsEmptyOrMetaPreviewOnly(connectedData)) return;
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
    const isComposeTab = selectionTab === "columns" || selectionTab === "recipes";
    if (isComposeTab) {
      if (columnComposeItems.length === 0) {
        setError("Add at least one column to SELECT.");
        return;
      }
      const hasIncompleteComposeWhereFilters =
        Array.isArray(composeWhereFilters) &&
        composeWhereFilters.length > 0 &&
        composeWhereFilters.some((f) => {
          if (!f?.column || !f?.op || !f?.kind) return true;
          if (f.op === "in" || f.op === "not_in") return !String(f.value ?? "").trim();
          if (f.kind === "string") return !String(f.value ?? "").trim();
          return !Number.isFinite(Number(f.value));
        });
      if (hasIncompleteComposeWhereFilters) {
        setError("Enter a value for each WHERE filter before running.");
        return;
      }

      const hasIncompleteComposeHavingFilters =
        Array.isArray(composeHavingFilters) &&
        composeHavingFilters.length > 0 &&
        composeHavingFilters.some((f) => {
          if (!f?.havingAlias || !f?.op) return true;
          if (f.value === "" || f.value == null) return true;
          return !Number.isFinite(Number(f.value));
        });

      if (hasIncompleteComposeHavingFilters) {
        setError("Enter a value for each HAVING filter before running.");
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

    const effectiveIngestMode = selectionTab === "meta" ? "meta" : "columns";
    const composeSpecForRun = isComposeTab ? buildServerComposePayload() : undefined;
    const composeFiltersForRun = isComposeTab
      ? composeWhereFilters.length
        ? { and: composeWhereFilters, or: [] }
        : null
      : undefined;

    const requestStartMs = typeof performance !== "undefined" && performance?.now ? performance.now() : Date.now();
    const whereSummary = summarizeWhereFilters(composeFiltersForRun);
    const requestCard =
      effectiveIngestMode === "columns" && isComposeTab
        ? {
            id: genRequestCardId(),
            createdAt: Date.now(),
            elapsedMs: null,
            lake,
            table: selected.table,
            sheetId: activeSheetId || null,
            sheetLabel: activeSheetId ? String(dataSheets?.[activeSheetId]?.name || activeSheetId) : "",
            selectAliases: Array.isArray(columnComposeItems)
              ? columnComposeItems.map((i) => String(i.alias || i.column).trim()).filter(Boolean)
              : [],
            selectColumns: Array.isArray(columnComposeItems)
              ? columnComposeItems.map((i) => String(i.column || "").trim()).filter(Boolean)
              : [],
            hasWhere: whereSummary.hasWhere,
            whereText: whereSummary.text,
          }
        : null;
    pendingIngestRef.current = {
      mode: effectiveIngestMode,
      lake,
      table: selected.table,
      sampleId: selected.id,
      composeSpec: composeSpecForRun,
      composeFilters: composeFiltersForRun,
      requestStartMs,
      requestCard,
      sheetJoinSpec: (() => {
        const joins = Array.isArray(composeJoins) ? composeJoins : [];
        const sheetJoins = joins.filter((j) => j && j.targetKind === "sheet" && j.targetSheetId && j.leftColumn && j.rightColumn);

        const browserJoins = sheetJoins.filter((j) => String(j.mergeStrategy || "server") !== "server");
        const serverJoins = sheetJoins.filter((j) => String(j.mergeStrategy || "server") === "server");

        // Browser merge: use preview rows from the target sheet.
        if (browserJoins.length > 0) {
          const j = browserJoins[0];
          const sheet = dataSheets?.[j.targetSheetId];
          const sheetRows = Array.isArray(sheet?.data) ? sheet.data : [];
          if (!sheetRows.length) return null;
          return {
            mode: "browser",
            sheetRows,
            join: {
              sheetColumn: j.rightColumn,
              pullColumn: j.leftColumn,
              joinType: j.joinType || "left",
            },
          };
        }

        // Server merge: recompute using CTEs from stored sheet provenance.
        if (serverJoins.length > 0) {
          const targetIds = Array.from(new Set(serverJoins.map((j) => j.targetSheetId).filter(Boolean)));
          const sheetGraph = {};
          const seen = new Set();
          const stack = [...targetIds];
          while (stack.length > 0) {
            const id = stack.pop();
            if (!id || seen.has(id)) continue;
            seen.add(id);

            const s = dataSheets?.[id];
            const prov = s?.provenance;
            if (!prov) {
              return {
                mode: "server",
                error: `Missing provenance for sheet ${id}. Create the sheet via a server merge or a compose pull first.`,
              };
            }
            if (prov.kind !== "compose") {
              return {
                mode: "server",
                error: `Sheet ${id} cannot be used as a CTE input (kind: ${prov.kind}). Re-create it using a server merge or a plain compose pull.`,
              };
            }

            sheetGraph[id] = { name: String(s?.name || id), provenance: prov };

            const deps = Array.isArray(prov?.serverSheetJoins) ? prov.serverSheetJoins : [];
            for (const d of deps) {
              if (d?.targetSheetId) stack.push(d.targetSheetId);
            }
          }
          return {
            mode: "server",
            joins: serverJoins.map((j) => ({
              targetSheetId: j.targetSheetId,
              joinType: j.joinType || "left",
              leftColumn: j.leftColumn,
              rightColumn: j.rightColumn,
            })),
            sheetGraph,
          };
        }

        return null;
      })(),
      sheetProvenance:
        effectiveIngestMode === "columns" && isComposeTab
          ? (() => {
              const joins = Array.isArray(composeJoins) ? composeJoins : [];
              const sheetJoins = joins.filter((j) => j && j.targetKind === "sheet" && j.targetSheetId && j.leftColumn && j.rightColumn);
              const serverSheetJoins = sheetJoins
                .filter((j) => String(j.mergeStrategy || "server") === "server")
                .map((j) => ({
                  targetSheetId: j.targetSheetId,
                  joinType: j.joinType || "left",
                  leftColumn: j.leftColumn,
                  rightColumn: j.rightColumn,
                }));
              const browserSheetJoins = sheetJoins
                .filter((j) => String(j.mergeStrategy || "server") !== "server")
                .map((j) => ({
                  targetSheetId: j.targetSheetId,
                  joinType: j.joinType || "left",
                  leftColumn: j.leftColumn,
                  rightColumn: j.rightColumn,
                }));

              const hasBrowser = browserSheetJoins.length > 0;
              if (hasBrowser) {
                return {
                  kind: "compose_browser_join",
                  lake,
                  table: selected.table,
                  composeSpec: composeSpecForRun,
                  composeFilters: composeFiltersForRun,
                  serverSheetJoins,
                  browserSheetJoins,
                };
              }

              // Default: server join / compose only (CTE rebuildable).
              return {
                kind: "compose",
                lake,
                table: selected.table,
                composeSpec: composeSpecForRun,
                composeFilters: composeFiltersForRun,
                serverSheetJoins,
                browserSheetJoins,
              };
            })()
          : null,
      kalshiIngestExtras:
        isComposeTab && dataset === "kalshi" && selected.table === "markets"
          ? {
              taxonomyRollup: kalshiTaxonomyRollup,
              composeItemsSnapshot: columnComposeItems.map((i) => ({
                column: i.column,
                alias: i.alias,
                aggregate: i.aggregate,
              })),
            }
          : null,
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

    if (promptReplaceOrNewSheetIfNeeded()) return;

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
    if ((selectionTab === "columns" || selectionTab === "recipes") && columnComposeItems.length === 0) {
      reasons.push("Add at least one column to SELECT.");
    }
    const hasIncompleteComposeWhereFilters =
      Array.isArray(composeWhereFilters) &&
      composeWhereFilters.length > 0 &&
      composeWhereFilters.some((f) => {
        if (!f?.column || !f?.op || !f?.kind) return true;
        if (f.op === "in" || f.op === "not_in") return !String(f.value ?? "").trim();
        if (f.kind === "string") return !String(f.value ?? "").trim();
        return !Number.isFinite(Number(f.value));
      });
    if ((selectionTab === "columns" || selectionTab === "recipes") && hasIncompleteComposeWhereFilters) {
      reasons.push("Enter a value for each WHERE filter.");
    }

    const hasIncompleteComposeHavingFilters =
      Array.isArray(composeHavingFilters) &&
      composeHavingFilters.length > 0 &&
      composeHavingFilters.some((f) => {
        if (!f?.havingAlias || !f?.op) return true;
        if (f.value === "" || f.value == null) return true;
        return !Number.isFinite(Number(f.value));
      });

    if (
      (selectionTab === "columns" || selectionTab === "recipes") &&
      hasIncompleteComposeHavingFilters
    ) {
      reasons.push("Enter a value for each HAVING filter.");
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
  }, [
    selected?.table,
    selectionTab,
    columnComposeItems.length,
    composeWhereFilters,
    composeHavingFilters,
    buildAllMetaOpSpecsForRun,
  ]);

  const canRunRequest = runRequestReasons.length === 0;

  const activeSheetRequestCards = useMemo(() => {
    if (!activeSheetId) return [];
    const cards = dataSheets?.[activeSheetId]?.requestCards;
    return Array.isArray(cards) ? cards : [];
  }, [dataSheets, activeSheetId]);

  useEffect(() => {
    // Collapse composer after a request exists for this sheet.
    if (!activeSheetId) return;
    if (activeSheetRequestCards.length > 0) {
      setShowRequestComposer(false);
      if (!expandedRequestCardId) {
        setExpandedRequestCardId(activeSheetRequestCards[0]?.id || null);
      }
    }
  }, [activeSheetId, activeSheetRequestCards, expandedRequestCardId]);

  const deleteRequestCardAndClearSheet = useCallback(
    (sheetId, cardId) => {
      if (!sheetId) return;
      setSheetData?.(sheetId, []);
      setConnectedData?.([]);
      setDataSheets?.((prev) => {
        const p = prev || {};
        const sheet = p[sheetId];
        if (!sheet) return prev;
        const list = Array.isArray(sheet.requestCards) ? sheet.requestCards : [];
        const next = list.filter((c) => c?.id !== cardId);
        const out = {
          ...p,
          [sheetId]: {
            ...sheet,
            requestCards: next,
            provenance: null,
          },
        };
        return out;
      });
      setExpandedRequestCardId(null);
      setShowRequestComposer(true);
    },
    [setSheetData, setConnectedData, setDataSheets],
  );

  const startNewRequestDraft = useCallback(() => {
    setShowRequestComposer(true);
    setExpandedRequestCardId(null);
    // We keep the previous card; we just reset the draft editor state.
    setError(null);
    // Keep the sheet data intact; only reset the draft builder controls.
    setColumnComposeItems([]);
    setColumnComposeOrderBy([]);
    setComposeWhereFilters([]);
    setComposeHavingFilters([]);
    setComposeJoins([]);
    setSelectionTab("columns");
  }, []);

  const addComposeColumn = useCallback(
    (col) => {
      setError(null);
      const t = availableColumnTypesByName[col];
      const typeNorm = String(t || "").toLowerCase();
      const isDate = (typeNorm === "bigint" || typeNorm === "int") && isDateLikeName(col);
      setColumnComposeItems((prev) => {
        if (prev.some((i) => i.column === col)) return prev;
        return [
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
            sumCase: { enabled: false, branches: [], elseColumn: "" },
            equation: { enabled: false },
          },
        ];
      });
    },
    [availableColumnTypesByName, isDateLikeName],
  );

  const removeComposeColumnByName = useCallback(
    (col) => {
      setError(null);
      const victim = columnComposeItems.find((i) => i.column === col);
      if (!victim) return;
      setColumnComposeItems((prev) => prev.filter((i) => i.column !== col));
      if (victim.alias) {
        setColumnComposeOrderBy((prev) => prev.filter((o) => o.alias !== victim.alias));
      }
    },
    [columnComposeItems],
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
          sumCase: { enabled: false, branches: [], elseColumn: "" },
          equation: { enabled: false },
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

  const addComposeOrderByClause = useCallback(() => {
    const first = composeSelectAliasChoices[0];
    if (!first) return;
    setColumnComposeOrderBy((prev) => [...prev, { alias: first.alias, direction: "asc" }]);
  }, [composeSelectAliasChoices]);

  const addComposeWhereFilterPreset = useCallback(
    (column, op) => {
      setError(null);
      const kind = kindForColumn(column);
      const id = `w-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const defaultValue =
        op === "in" || op === "not_in"
          ? kind === "number"
            ? "1, 2, 3"
            : kind === "string"
              ? '"yes", "no"'
              : String(Date.now())
          : kind === "date"
            ? Date.now()
            : kind === "number"
              ? 0
              : "";
      const predicate = { id, column, kind, op, value: defaultValue };
      setComposeWhereFilters((prev) => [...prev, predicate]);
    },
    [kindForColumn],
  );

  const updateComposeWhereFilter = useCallback((id, patch) => {
    setComposeWhereFilters((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  }, []);

  const removeComposeWhereFilter = useCallback((id) => {
    setComposeWhereFilters((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const addComposeHavingFilter = useCallback((havingAlias) => {
    setError(null);
    const id = `h-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const predicate = { id, havingAlias, op: "gt", value: 0 };
    setComposeHavingFilters((prev) => [...prev, predicate]);
  }, []);

  const updateComposeHavingFilter = useCallback((id, patch) => {
    setComposeHavingFilters((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  }, []);

  const removeComposeHavingFilter = useCallback((id) => {
    setComposeHavingFilters((prev) => prev.filter((f) => f.id !== id));
  }, []);

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

  const renderColumnsComposeSection = () => (
    <>
              <div className="space-y-2 min-w-0">
                <div className="flex w-full min-w-0 items-center justify-between gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs flex-1 min-w-0 justify-between"
                        type="button"
                      >
                        Select
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-[30rem] p-0 overflow-hidden" align="start">
                      {(() => {
                        const selectedSet = new Set(columnComposeItems.map((i) => i.column));
                        const selectedCount = selectedSet.size;
                        const composeCols = Object.keys(KALSHI_VIRTUAL_COMPOSE_LABELS).filter((c) => availableColumns.includes(c));
                        const restCols = availableColumns.filter((c) => !Object.prototype.hasOwnProperty.call(KALSHI_VIRTUAL_COMPOSE_LABELS, c));
                        // WHERE filters are statement-level: you can filter on any column,
                        // including columns that are also selected in the output.
                        const filterCandidates = availableColumns;
                        return (
                          <div className="flex max-h-96">
                            <div className="flex-1 min-w-0 overflow-y-auto p-1">
                              <DropdownMenuLabel className="text-xs">Select</DropdownMenuLabel>
                              <DropdownMenuSeparator />

                              <DropdownMenuItem
                                className="text-xs font-medium"
                                onSelect={(e) => {
                                  e.preventDefault();
                                  resetComposeToAllColumns();
                                  setComposeWhereFilters([]);
                                    setComposeHavingFilters([]);
                                }}
                              >
                                * all
                              </DropdownMenuItem>

                              <DropdownMenuSeparator />

                              {composeCols.length > 0 ? (
                                <>
                                  <DropdownMenuLabel className="text-[10px] font-thin">Lychee Custom</DropdownMenuLabel>
                                  {composeCols.map((col) => (
                                    <DropdownMenuCheckboxItem
                                      key={col}
                                      className="text-xs"
                                      checked={selectedSet.has(col)}
                                      onSelect={(e) => {
                                        e.preventDefault();
                                        if (!selectedSet.has(col)) addComposeColumn(col);
                                        else removeComposeColumnByName(col);
                                      }}
                                    >
                                      {composeSourceColumnLabel(col)}
                                    </DropdownMenuCheckboxItem>
                                  ))}
                                  {restCols.length > 0 ? <DropdownMenuSeparator /> : null}
                                </>
                              ) : null}

                              {restCols.map((col) => (
                                <DropdownMenuCheckboxItem
                                  key={col}
                                  className="text-xs"
                                  checked={selectedSet.has(col)}
                                  onSelect={(e) => {
                                    e.preventDefault();
                                    if (!selectedSet.has(col)) addComposeColumn(col);
                                    else removeComposeColumnByName(col);
                                  }}
                                >
                                  {composeSourceColumnLabel(col)}
                                </DropdownMenuCheckboxItem>
                              ))}
                            </div>

                            {selectedCount > 0 ? (
                              <div className="w-64 min-w-64 overflow-y-auto p-1 border-l border-border/60">
                                <DropdownMenuLabel className="text-xs">Where (filter)</DropdownMenuLabel>
                                <DropdownMenuSeparator />

                                {filterCandidates.length === 0 ? (
                                  <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                                    No other columns available
                                  </DropdownMenuItem>
                                ) : (
                                  filterCandidates.map((filterCol) => {
                                    const filterKind = kindForColumn(filterCol);
                                    const ops =
                                      filterKind === "string"
                                        ? [
                                            { id: "contains", label: "contains" },
                                            { id: "not_contains", label: "not contains" },
                                            { id: "in", label: "in set" },
                                            { id: "not_in", label: "not in set" },
                                          ]
                                        : [
                                            { id: "gt", label: "greater than" },
                                            { id: "lt", label: "less than" },
                                            { id: "eq", label: "is equal to" },
                                            { id: "neq", label: "not equal to" },
                                            { id: "in", label: "in set" },
                                            { id: "not_in", label: "not in set" },
                                          ];

                                    return (
                                      <DropdownMenuSub key={filterCol}>
                                        <DropdownMenuSubTrigger className="text-xs">
                                          {composeSourceColumnLabel(filterCol)}
                                        </DropdownMenuSubTrigger>
                                        <DropdownMenuPortal>
                                          <DropdownMenuSubContent className="w-56 max-h-[280px] overflow-y-auto">
                                            <DropdownMenuLabel className="text-xs">Operator</DropdownMenuLabel>
                                            <DropdownMenuSeparator />
                                            {ops.map((op) => (
                                              <DropdownMenuItem
                                                key={op.id}
                                                className="text-[13px]"
                                                onSelect={(e) => {
                                                  e.preventDefault();
                                                  addComposeWhereFilterPreset(filterCol, op.id);
                                                }}
                                              >
                                                <span className="inline-flex items-center gap-2">
                                                  <span className="inline-flex min-w-6 justify-center rounded border border-border/60 px-1 font-mono text-[10px]">
                                                    {operatorSymbol(op.id)}
                                                  </span>
                                                  <span>{op.label}</span>
                                                </span>
                                              </DropdownMenuItem>
                                            ))}
                                          </DropdownMenuSubContent>
                                        </DropdownMenuPortal>
                                      </DropdownMenuSub>
                                    );
                                  })
                                )}
                              </div>
                            ) : null}
                          </div>
                        );
                      })()}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  {columnComposeItems.length > 0 ? (
                    <TooltipProvider delayDuration={0}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="group h-3 w-3 shrink-0 rounded-full bg-red-300/35 text-red-900/70 hover:bg-red-400/80 focus-visible:ring-1 focus-visible:ring-red-300"
                            type="button"
                            aria-label="clear all selections"
                            onClick={() => {
                              setColumnComposeItems([]);
                              setColumnComposeOrderBy([]);
                              setComposeWhereFilters([]);
                              setComposeHavingFilters([]);
                            }}
                          >
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                          clear all selections
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : null}
                </div>

                {columnComposeItems.length !== 0 && (
                  <div className="space-y-3">
                    {columnComposeItems.map((item) => {
                      const k = kindForColumn(item.column);
                      const isDateCol = k === "date";
                      const isNumericCol = k === "number";
                      const canNumberFormat = isNumericCol && !["count", "count_distinct"].includes(String(item.aggregate || ""));
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
                              <p className="font-mono text-sm font-semibold truncate" title={item.column}>
                                {composeSourceColumnLabel(item.column)}
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
                              <Label className="text-xs">Col Name</Label>
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
                                    updateComposeItem(item.id, {
                                      aggregate: null,
                                      sumCase: { enabled: false, branches: [], elseColumn: "" },
                                      equation: { enabled: false },
                                    });
                                  } else if (v === "equation") {
                                    const base = String(item.column || "").trim();
                                    updateComposeItem(item.id, {
                                      aggregate: "sum",
                                      dateBucket: null,
                                      dateFormat: null,
                                      sumCase: { enabled: false, branches: [], elseColumn: "" },
                                      equation: {
                                        enabled: true,
                                        agg: "sum",
                                        root: { type: "col", name: base || numericColumns[0] || "" },
                                      },
                                    });
                                  } else {
                                    updateComposeItem(item.id, {
                                      aggregate: v,
                                      dateBucket: null,
                                      dateFormat: null,
                                      ...(v !== "sum" ? { sumCase: { enabled: false, branches: [], elseColumn: "" } } : {}),
                                      equation: { enabled: false },
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
                                <SelectItem value="equation" className="text-xs" disabled={!isNumericCol}>
                                  Equation (SUM of expression)
                                </SelectItem>
                                  <SelectItem value="avg" className="text-xs" disabled={!isNumericCol}>
                                    Average
                                  </SelectItem>
                                  <SelectItem value="min" className="text-xs" disabled={!isNumericCol}>
                                    Min
                                  </SelectItem>
                                  <SelectItem value="max" className="text-xs" disabled={!isNumericCol}>
                                    Max
                                  </SelectItem>
                                  <SelectItem value="median" className="text-xs" disabled={!isNumericCol}>
                                    Median (approx)
                                  </SelectItem>
                                  <SelectItem value="stddev" className="text-xs" disabled={!isNumericCol}>
                                    Stddev (volatility)
                                  </SelectItem>
                                  <SelectItem value="variance" className="text-xs" disabled={!isNumericCol}>
                                    Variance
                                  </SelectItem>
                                  <SelectItem value="count" className="text-xs">
                                    Count (non-empty)
                                  </SelectItem>
                                  <SelectItem value="count_distinct" className="text-xs">
                                    Count distinct
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          {item.aggregate === "sum" ? (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Toggle
                                  variant="outline"
                                  size="sm"
                                  pressed={!!item.sumCase?.enabled}
                                  onPressedChange={(pressed) => {
                                    const enabled = !!pressed;
                                    const current = item.sumCase && typeof item.sumCase === "object" ? item.sumCase : null;
                                    const hasBranch = Array.isArray(current?.branches) && current.branches.length > 0;
                                    const defaultBranch = {
                                      when: {
                                        column: availableColumns[0] || "",
                                        op: "eq",
                                        value: "",
                                      },
                                      thenColumn: numericColumns[0] || "",
                                    };
                                    updateComposeItem(item.id, {
                                      sumCase: enabled
                                        ? {
                                            enabled: true,
                                            branches: hasBranch ? current.branches : [defaultBranch],
                                            elseColumn: typeof current?.elseColumn === "string" ? current.elseColumn : "",
                                          }
                                        : { enabled: false, branches: [], elseColumn: "" },
                                      equation: { enabled: false },
                                    });
                                  }}
                                >
                                  if else
                                </Toggle>
                                <p className="text-[11px] text-muted-foreground">
                                  Use <span className="font-medium">Equation</span> in Summarize for a full expression tree; use{" "}
                                  <span className="font-medium">if else</span> for the simpler SUM×CASE shortcut.
                                </p>
                              </div>

                              {item.equation?.enabled ? (
                                <EquationExprBuilder
                                  baseColumn={String(item.column || "").trim()}
                                  equation={item.equation}
                                  onEquationChange={(next) => updateComposeItem(item.id, { equation: next })}
                                  availableColumns={availableColumns}
                                  numericColumns={numericColumns}
                                  kindForColumn={kindForColumn}
                                  composeSourceColumnLabel={composeSourceColumnLabel}
                                />
                              ) : null}

                              {item.sumCase?.enabled ? (
                                <div className="space-y-2 rounded-md border border-border/60 bg-muted/20 p-2">
                                  {(item.sumCase?.branches || []).map((b, idx) => {
                                    const whenCol = String(b?.when?.column || "");
                                    const whenKind = kindForColumn(whenCol);
                                    const whenOp = String(b?.when?.op || "eq");
                                    const whenVal = b?.when?.value ?? "";
                                    const thenCol = String(b?.thenColumn || "");
                                    const ops =
                                      whenKind === "string"
                                        ? [
                                            { id: "eq", label: "=" },
                                            { id: "neq", label: "!=" },
                                          ]
                                        : [
                                            { id: "gt", label: ">" },
                                            { id: "lt", label: "<" },
                                            { id: "eq", label: "=" },
                                            { id: "neq", label: "!=" },
                                          ];

                                    return (
                                      <div key={`sumcase-${item.id}-${idx}`} className="flex flex-wrap items-center gap-1">
                                        <span className="text-[11px] font-medium text-muted-foreground min-w-8">
                                          {idx === 0 ? "if" : "else if"}
                                        </span>
                                        <Select
                                          value={whenCol}
                                          onValueChange={(v) => {
                                            const next = (item.sumCase?.branches || []).map((x, j) =>
                                              j === idx ? { ...x, when: { ...(x.when || {}), column: v } } : x,
                                            );
                                            updateComposeItem(item.id, { sumCase: { ...item.sumCase, branches: next } });
                                          }}
                                        >
                                          <SelectTrigger className="h-7 text-[11px] w-28">
                                            <SelectValue placeholder="Column" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {availableColumns.map((c) => (
                                              <SelectItem key={`sumcase-when-${idx}-${c}`} value={c} className="text-[13px]">
                                                {composeSourceColumnLabel(c)}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>

                                        <Select
                                          value={whenOp}
                                          onValueChange={(v) => {
                                            const next = (item.sumCase?.branches || []).map((x, j) =>
                                              j === idx ? { ...x, when: { ...(x.when || {}), op: v } } : x,
                                            );
                                            updateComposeItem(item.id, { sumCase: { ...item.sumCase, branches: next } });
                                          }}
                                        >
                                          <SelectTrigger className="h-7 text-[11px] w-16">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {ops.map((o) => (
                                              <SelectItem key={`sumcase-op-${idx}-${o.id}`} value={o.id} className="text-[13px]">
                                                {o.label}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>

                                        <Input
                                          type={whenKind === "number" ? "number" : "text"}
                                          className="h-7 text-[11px] w-24"
                                          value={String(whenVal)}
                                          onChange={(e) => {
                                            const raw = e.target.value;
                                            const nextVal = whenKind === "number" ? (raw === "" ? "" : Number(raw)) : raw;
                                            const next = (item.sumCase?.branches || []).map((x, j) =>
                                              j === idx ? { ...x, when: { ...(x.when || {}), value: nextVal } } : x,
                                            );
                                            updateComposeItem(item.id, { sumCase: { ...item.sumCase, branches: next } });
                                          }}
                                          placeholder="value"
                                        />

                                        <span className="text-[11px] text-muted-foreground">then</span>
                                        <Select
                                          value={thenCol}
                                          onValueChange={(v) => {
                                            const next = (item.sumCase?.branches || []).map((x, j) =>
                                              j === idx ? { ...x, thenColumn: v } : x,
                                            );
                                            updateComposeItem(item.id, { sumCase: { ...item.sumCase, branches: next } });
                                          }}
                                        >
                                          <SelectTrigger className="h-7 text-[11px] w-28">
                                            <SelectValue placeholder="Column" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {numericColumns.map((c) => (
                                              <SelectItem key={`sumcase-then-${idx}-${c}`} value={c} className="text-[13px]">
                                                {composeSourceColumnLabel(c)}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>

                                        {idx > 0 ? (
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7"
                                            onClick={() => {
                                              const next = (item.sumCase?.branches || []).filter((_, j) => j !== idx);
                                              updateComposeItem(item.id, { sumCase: { ...item.sumCase, branches: next } });
                                            }}
                                            aria-label="remove else if"
                                          >
                                            <X className="h-3 w-3" />
                                          </Button>
                                        ) : null}
                                      </div>
                                    );
                                  })}

                                  <div className="flex flex-wrap items-center gap-2">
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button type="button" variant="outline" size="sm" className="h-7 text-[11px]">
                                          <Plus className="h-3 w-3 mr-1" />
                                          add else
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="start" className="w-44">
                                        <DropdownMenuItem
                                          className="text-[13px]"
                                          disabled={!!item.sumCase?.elseColumn}
                                          onSelect={() => {
                                            const nextElse = numericColumns[0] || "";
                                            updateComposeItem(item.id, { sumCase: { ...item.sumCase, elseColumn: nextElse } });
                                          }}
                                        >
                                          else
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          className="text-[13px]"
                                          onSelect={() => {
                                            const next = [
                                              ...(item.sumCase?.branches || []),
                                              {
                                                when: { column: availableColumns[0] || "", op: "eq", value: "" },
                                                thenColumn: numericColumns[0] || "",
                                              },
                                            ];
                                            updateComposeItem(item.id, { sumCase: { ...item.sumCase, branches: next } });
                                          }}
                                        >
                                          else if
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>

                                    {item.sumCase?.elseColumn ? (
                                      <div className="flex items-center gap-1">
                                        <span className="text-[11px] font-medium text-muted-foreground min-w-8">else</span>
                                        <Select
                                          value={String(item.sumCase.elseColumn || "")}
                                          onValueChange={(v) => updateComposeItem(item.id, { sumCase: { ...item.sumCase, elseColumn: v } })}
                                        >
                                          <SelectTrigger className="h-7 text-[11px] w-28">
                                            <SelectValue placeholder="Column" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {numericColumns.map((c) => (
                                              <SelectItem key={`sumcase-else-${item.id}-${c}`} value={c} className="text-[13px]">
                                                {composeSourceColumnLabel(c)}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          className="h-7 w-7"
                                          onClick={() => updateComposeItem(item.id, { sumCase: { ...item.sumCase, elseColumn: "" } })}
                                          aria-label="remove else"
                                        >
                                          <X className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    ) : (
                                      <p className="text-[11px] text-muted-foreground">
                                        Add an <span className="font-medium">else</span> branch to avoid nulls.
                                      </p>
                                    )}
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          ) : null}

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
                                    <SelectItem value="ten" className="text-xs">
                                      Divide by 10
                                    </SelectItem>
                                    <SelectItem value="hundred" className="text-xs">
                                      Divide by 100
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
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {composeWhereFilters.length > 0 && (
                <div className="space-y-2 min-w-0">
                  <Label className="text-xs text-muted-foreground">Where (filter)</Label>
                  <div className="space-y-2">
                    {composeWhereFilters.map((f) => (
                      <div key={f.id} className="flex items-center gap-1">
                        <Select
                          value={f.column}
                          onValueChange={(val) => {
                            const kind = kindForColumn(val);
                            const isInListOp = f.op === "in" || f.op === "not_in";
                            const defaultValue = isInListOp
                              ? kind === "number"
                                ? "1, 2, 3"
                                : kind === "string"
                                  ? '"yes", "no"'
                                  : String(Date.now())
                              : kind === "date"
                                ? Date.now()
                                : kind === "number"
                                  ? 0
                                  : "";

                            const nextOp =
                              kind === "string"
                                ? isInListOp
                                  ? f.op
                                  : f.op === "neq"
                                    ? "neq"
                                    : "eq"
                                : kind === "number"
                                  ? ["gt", "lt", "eq", "neq", "in", "not_in"].includes(f.op)
                                    ? f.op
                                    : "gt"
                                  : // date (epoch ms): keep scalar ops; map IN list to eq
                                    ["gt", "lt", "eq", "neq"].includes(f.op) ? f.op : "eq";

                            updateComposeWhereFilter(f.id, { column: val, kind, op: nextOp, value: defaultValue });
                          }}
                        >
                          <SelectTrigger className="h-7 text-[11px] min-w-0 w-16">
                            <SelectValue placeholder="Column" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableColumns.map((c) => (
                              <SelectItem key={c} value={c} className="text-[13px]">
                                {composeSourceColumnLabel(c)}
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
                            {(
                              f.kind === "string"
                                ? [
                                    { id: "eq", label: "is equal to" },
                                    { id: "neq", label: "not equal to" },
                                    { id: "in", label: "in set" },
                                    { id: "not_in", label: "not in set" },
                                  ]
                                : [
                                    { id: "gt", label: "greater than" },
                                    { id: "lt", label: "less than" },
                                    { id: "eq", label: "is equal to" },
                                    { id: "neq", label: "not equal to" },
                                    { id: "in", label: "in set" },
                                    { id: "not_in", label: "not in set" },
                                  ]
                            ).map((op) => (
                              <DropdownMenuItem
                                key={op.id}
                                className="text-[13px]"
                                onSelect={() => updateComposeWhereFilter(f.id, { op: op.id })}
                              >
                                <span className="inline-flex items-center gap-2">
                                  <span className="inline-flex min-w-6 justify-center rounded border border-border/60 px-1 font-mono text-[10px]">
                                    {operatorSymbol(op.id)}
                                  </span>
                                  <span>{op.label}</span>
                                </span>
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>

                        {f.kind === "date" ? (
                          <Input
                            type="datetime-local"
                            className={`h-7 text-[11px] min-w-0 flex-[2] placeholder:text-[11px] ${
                              !Number.isFinite(Number(f.value)) ? "border-destructive focus-visible:ring-destructive" : ""
                            }`}
                            value={
                              Number.isFinite(Number(f.value))
                                ? new Date(Number(f.value)).toISOString().slice(0, 16)
                                : ""
                            }
                            onChange={(e) => {
                              const ms = new Date(String(e.target.value)).getTime();
                              updateComposeWhereFilter(f.id, { value: Number.isFinite(ms) ? ms : "" });
                            }}
                            placeholder="Value"
                          />
                        ) : f.op === "in" || f.op === "not_in" ? (
                          <Input
                            type="text"
                            className={`h-7 text-[11px] min-w-0 flex-[2] placeholder:text-[11px] ${
                              !String(f.value ?? "").trim() ? "border-destructive focus-visible:ring-destructive" : ""
                            }`}
                            value={String(f.value ?? "")}
                            onClick={() => {
                              if (f.kind === "string") {
                                toast(
                                  'Strings: use double quotes, e.g. "yes", "no" (comma-separated).'
                                );
                              } else {
                                toast('Numbers: use raw numbers (no quotes), e.g. 1, 2, 3 (comma-separated).');
                              }
                            }}
                            onChange={(e) => updateComposeWhereFilter(f.id, { value: e.target.value })}
                            placeholder={f.kind === "string" ? '"yes", "no"' : "1, 2, 3"}
                          />
                        ) : f.kind === "number" ? (
                          <Input
                            type="number"
                            step="1"
                            className={`h-7 text-[11px] min-w-0 flex-[2] placeholder:text-[11px] ${
                              f.value === "" ? "border-destructive focus-visible:ring-destructive" : ""
                            }`}
                            value={f.value}
                            onChange={(e) =>
                              updateComposeWhereFilter(f.id, { value: e.target.value === "" ? "" : Number(e.target.value) })
                            }
                            placeholder="Value"
                          />
                        ) : (
                          <Input
                            type="text"
                            className={`h-7 text-[11px] min-w-0 flex-[2] placeholder:text-[11px] ${
                              !String(f.value ?? "").trim() ? "border-destructive focus-visible:ring-destructive" : ""
                            }`}
                            value={String(f.value ?? "")}
                            onChange={(e) => updateComposeWhereFilter(f.id, { value: e.target.value })}
                            placeholder="Value"
                          />
                        )}

                        <TooltipProvider delayDuration={250}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                className="inline-flex h-4 w-4 items-center justify-center rounded text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                                onClick={() => removeComposeWhereFilter(f.id)}
                              >
                                <Minus className="h-2 w-2" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs">
                              remove filter
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {composeAggregateAliasChoices.length > 0 && (
                <div className="space-y-2 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <Label className="text-xs text-muted-foreground">Having (filter aggregated results)</Label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs gap-1"
                          disabled={composeAggregateAliasChoices.length === 0}
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Add
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-56">
                        {composeAggregateAliasChoices.map((a) => (
                          <DropdownMenuItem
                            key={a.alias}
                            className="text-xs"
                            onSelect={(e) => {
                              e.preventDefault();
                              addComposeHavingFilter(a.alias);
                            }}
                          >
                            {a.label}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {composeHavingFilters.length > 0 ? (
                    <div className="space-y-2">
                      {composeHavingFilters.map((f) => (
                        <div key={f.id} className="flex items-center gap-1 min-w-0">
                          <Select
                            value={f.havingAlias}
                            onValueChange={(val) => updateComposeHavingFilter(f.id, { havingAlias: val })}
                          >
                            <SelectTrigger className="h-7 text-[11px] min-w-0 w-24">
                              <SelectValue placeholder="Alias" />
                            </SelectTrigger>
                            <SelectContent>
                              {composeAggregateAliasChoices.map((a) => (
                                <SelectItem key={a.alias} value={a.alias} className="text-[13px]">
                                  {a.alias}
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
                              {[
                                { id: "gt", label: "greater than" },
                                { id: "lt", label: "less than" },
                                { id: "eq", label: "is equal to" },
                                { id: "neq", label: "not equal to" },
                              ].map((op) => (
                                <DropdownMenuItem
                                  key={op.id}
                                  className="text-[13px]"
                                  onSelect={() => updateComposeHavingFilter(f.id, { op: op.id })}
                                >
                                  <span className="inline-flex items-center gap-2">
                                    <span className="inline-flex min-w-6 justify-center rounded border border-border/60 px-1 font-mono text-[10px]">
                                      {operatorSymbol(op.id)}
                                    </span>
                                    <span>{op.label}</span>
                                  </span>
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>

                          <Input
                            type="number"
                            step="1"
                            className="h-7 text-[11px] min-w-0 flex-[2] placeholder:text-[11px]"
                            value={f.value}
                            onChange={(e) =>
                              updateComposeHavingFilter(f.id, {
                                value: e.target.value === "" ? "" : Number(e.target.value),
                              })
                            }
                            placeholder="Value"
                          />

                          <TooltipProvider delayDuration={250}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  className="inline-flex h-4 w-4 items-center justify-center rounded text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                                  onClick={() => removeComposeHavingFilter(f.id)}
                                >
                                  <Minus className="h-2 w-2" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="text-xs">
                                remove filter
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Add one or more HAVING filters to keep only matching aggregated rows.</p>
                  )}
                </div>
              )}

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
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs shrink-0"
                    disabled={!selected?.table || availableColumns.length === 0}
                    onClick={addComposeJoinRule}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Join
                  </Button>
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
                {composeJoins.length > 0 && (
                  <div className="space-y-2">
                    {composeJoins.map((jr, idx) => {
                      const targetIsSheet = jr.targetKind === "sheet";
                      const targetTable = String(jr.targetTable || "").trim().toLowerCase();
                      const rightCols = targetIsSheet
                        ? (() => {
                            const sheet = dataSheets?.[jr.targetSheetId];
                            const row0 = Array.isArray(sheet?.data) ? sheet.data[0] : null;
                            return row0 && typeof row0 === "object" ? Object.keys(row0) : [];
                          })()
                        : getColumnMetaForTable(dataset, targetTable || "markets").map((c) => c.name);

                      return (
                        <div
                          key={jr.id}
                          className="flex flex-wrap items-center gap-2 rounded-md border border-border/60 bg-background/80 p-2"
                        >
                          <Select
                            value={jr.targetKind}
                            onValueChange={(v) => {
                              const kind = v === "sheet" ? "sheet" : "table";
                              setComposeJoins((prev) =>
                                (prev || []).map((r) =>
                                  r.id === jr.id
                                    ? {
                                        ...r,
                                        targetKind: kind,
                                        targetTable: kind === "table" ? (r.targetTable || "markets") : "",
                                        targetSheetId: kind === "sheet" ? (r.targetSheetId || activeSheetId || "") : "",
                                        rightColumn: "",
                                      }
                                    : r,
                                ),
                              );
                            }}
                          >
                            <SelectTrigger className="h-8 text-xs w-[9rem] min-w-0">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="table" className="text-xs">
                                Glue table
                              </SelectItem>
                              <SelectItem value="sheet" className="text-xs">
                                Sheet
                              </SelectItem>
                            </SelectContent>
                          </Select>

                          {jr.targetKind === "table" ? (
                            <Select
                              value={jr.targetTable || ""}
                              onValueChange={(v) =>
                                setComposeJoins((prev) =>
                                  (prev || []).map((r) => (r.id === jr.id ? { ...r, targetTable: v, rightColumn: "" } : r)),
                                )
                              }
                            >
                              <SelectTrigger className="h-8 text-xs w-[10rem] min-w-0">
                                <SelectValue placeholder="Table" />
                              </SelectTrigger>
                              <SelectContent>
                                {glueJoinTableOptions.map((t) => (
                                  <SelectItem key={t} value={t} className="text-xs">
                                    {t}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Select
                              value={jr.targetSheetId || ""}
                              onValueChange={(v) =>
                                setComposeJoins((prev) =>
                                  (prev || []).map((r) => (r.id === jr.id ? { ...r, targetSheetId: v, rightColumn: "" } : r)),
                                )
                              }
                            >
                              <SelectTrigger className="h-8 text-xs w-[min(100%,14rem)] min-w-0">
                                <SelectValue placeholder="Pick sheet" />
                              </SelectTrigger>
                              <SelectContent>
                                {sheetJoinCandidates.map((s) => (
                                  <SelectItem key={s.id} value={s.id} className="text-xs">
                                    {s.name} ({s.rowCount})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}

                          <Select
                            value={jr.joinType}
                            onValueChange={(v) => {
                              const jt = v === "left" ? "left" : "inner";
                              setComposeJoins((prev) =>
                                (prev || []).map((r) => (r.id === jr.id ? { ...r, joinType: jt } : r)),
                              );
                            }}
                          >
                            <SelectTrigger className="h-8 text-xs w-[7rem] min-w-0">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="inner" className="text-xs">
                                Inner
                              </SelectItem>
                              <SelectItem value="left" className="text-xs">
                                Left
                              </SelectItem>
                            </SelectContent>
                          </Select>

                          {targetIsSheet && (
                            <>
                              <span className="text-xs text-muted-foreground">merge</span>
                              <Select
                                value={jr.mergeStrategy || "server"}
                                onValueChange={(v) => {
                                  const ms = v === "server" ? "server" : "browser";
                                  setComposeJoins((prev) =>
                                    (prev || []).map((r) => (r.id === jr.id ? { ...r, mergeStrategy: ms } : r)),
                                  );
                                }}
                              >
                                <SelectTrigger className="h-8 text-xs w-[11rem] min-w-0">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="browser" className="text-xs">
                                    Browser (100-row preview)
                                  </SelectItem>
                                  <SelectItem value="server" className="text-xs">
                                    Server (full dataset via CTE)
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </>
                          )}

                          <span className="text-xs text-muted-foreground">on</span>

                          <Select
                            value={jr.leftColumn || ""}
                            onValueChange={(v) =>
                              setComposeJoins((prev) =>
                                (prev || []).map((r) => (r.id === jr.id ? { ...r, leftColumn: v } : r)),
                              )
                            }
                          >
                            <SelectTrigger className="h-8 text-xs w-[min(100%,14rem)] min-w-0">
                              <SelectValue placeholder="Left column" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableColumns.map((c) => (
                                <SelectItem key={c} value={c} className="text-xs">
                                  {c}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          <span className="text-xs text-muted-foreground">=</span>

                          <Select
                            value={jr.rightColumn || ""}
                            onValueChange={(v) =>
                              setComposeJoins((prev) =>
                                (prev || []).map((r) => (r.id === jr.id ? { ...r, rightColumn: v } : r)),
                              )
                            }
                          >
                            <SelectTrigger className="h-8 text-xs w-[min(100%,14rem)] min-w-0">
                              <SelectValue placeholder="Right column" />
                            </SelectTrigger>
                            <SelectContent>
                              {(rightCols || []).map((c) => (
                                <SelectItem key={c} value={c} className="text-xs">
                                  {c}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0"
                            onClick={() => setComposeJoins((prev) => (prev || []).filter((r) => r.id !== jr.id))}
                            aria-label="Remove join"
                          >
                            <Minus className="h-4 w-4" />
                          </Button>

                          {targetIsSheet && (
                            <p className="w-full text-[11px] text-muted-foreground leading-snug">
                              Browser merges your current sheet preview rows; Server recomputes the join on the full dataset using Athena/Glue (CTE).
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
                {columnComposeOrderBy.length !== 0 && (
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
    </>
  );

  return (
    <div className="space-y-3 min-w-0 max-w-full overflow-hidden">
      <ReplaceOrNewSheetDialog
        open={sheetDialogOpen}
        onOpenChange={onDialogOpenChange}
        hasLiveConnection={hasLiveConnection}
        onReplace={onDialogReplace}
        onAddNewSheet={onDialogAddNewSheet}
      />

      <Dialog
        open={sheetJoinDialogOpen}
        onOpenChange={(open) => {
          setSheetJoinDialogOpen(open);
          if (!open) return;
        }}
      >
        <DialogContent className="max-w-[min(760px,calc(100vw-2rem))]">
          <DialogHeader>
            <DialogTitle>Join sheets</DialogTitle>
            <DialogDescription>
              Choose whether to join the current <span className="font-medium">sheet previews</span> in the browser, or re-run a{" "}
              <span className="font-medium">full lake join</span> in Athena and write results into a new sheet (capped to{" "}
              {ATHENA_SAMPLE_ROW_LIMIT} rows).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Join mode</Label>
              <Select value={sheetJoinMode} onValueChange={(v) => setSheetJoinMode(v === "source" ? "source" : "sheet")}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sheet" className="text-xs">
                    Join between these sheets (browser)
                  </SelectItem>
                  <SelectItem value="source" className="text-xs">
                    Join in original data source (Athena)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs">Left sheet</Label>
                <Select value={sheetJoinLeftId} onValueChange={setSheetJoinLeftId}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Pick sheet" />
                  </SelectTrigger>
                  <SelectContent>
                    {sheetJoinCandidates.map((s) => (
                      <SelectItem key={`sj-left-${s.id}`} value={s.id} className="text-xs">
                        {s.name} ({s.rowCount})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Right sheet</Label>
                <Select value={sheetJoinRightId} onValueChange={setSheetJoinRightId}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Pick sheet" />
                  </SelectTrigger>
                  <SelectContent>
                    {sheetJoinCandidates
                      .filter((s) => s.id !== sheetJoinLeftId)
                      .map((s) => (
                        <SelectItem key={`sj-right-${s.id}`} value={s.id} className="text-xs">
                          {s.name} ({s.rowCount})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <Label className="text-xs">Join type</Label>
                <Select value={sheetJoinType} onValueChange={(v) => setSheetJoinType(v === "left" ? "left" : "inner")}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inner" className="text-xs">
                      Inner
                    </SelectItem>
                    <SelectItem value="left" className="text-xs">
                      Left
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">{sheetJoinMode === "source" ? "Left key (base column)" : "Left key (sheet column)"}</Label>
                {sheetJoinMode === "source" ? (
                  <Select
                    value={sheetJoinLeftColumn}
                    onValueChange={setSheetJoinLeftColumn}
                    disabled={!sheetJoinLeftId || !dataSheets?.[sheetJoinLeftId]?.provenance?.table}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Pick column" />
                    </SelectTrigger>
                    <SelectContent className="max-h-64 overflow-y-auto">
                      {(() => {
                        const prov = dataSheets?.[sheetJoinLeftId]?.provenance;
                        const t = String(prov?.table || "").trim();
                        if (!t) return null;
                        const cols = getColumnMetaForTable(dataset, t).map((c) => c.name);
                        return cols.map((c) => (
                          <SelectItem key={`sj-src-left-${c}`} value={c} className="text-xs">
                            {c}
                          </SelectItem>
                        ));
                      })()}
                    </SelectContent>
                  </Select>
                ) : (
                  <Select
                    value={sheetJoinLeftColumn}
                    onValueChange={setSheetJoinLeftColumn}
                    disabled={!sheetJoinLeftId || !Array.isArray(dataSheets?.[sheetJoinLeftId]?.data) || !dataSheets?.[sheetJoinLeftId]?.data?.length}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Pick column" />
                    </SelectTrigger>
                    <SelectContent className="max-h-64 overflow-y-auto">
                      {Object.keys((dataSheets?.[sheetJoinLeftId]?.data || [])[0] || {}).map((c) => (
                        <SelectItem key={`sj-sheet-left-${c}`} value={c} className="text-xs">
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Right key (sheet column)</Label>
                <Select
                  value={sheetJoinRightColumn}
                  onValueChange={setSheetJoinRightColumn}
                  disabled={!sheetJoinRightId || !Array.isArray(dataSheets?.[sheetJoinRightId]?.data) || !dataSheets?.[sheetJoinRightId]?.data?.length}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Pick column" />
                  </SelectTrigger>
                  <SelectContent className="max-h-64 overflow-y-auto">
                    {Object.keys((dataSheets?.[sheetJoinRightId]?.data || [])[0] || {}).map((c) => (
                      <SelectItem key={`sj-right-${c}`} value={c} className="text-xs">
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {sheetJoinMode === "source" ? (
              <p className="text-[11px] text-muted-foreground leading-snug">
                Data-source joins require both sheets to have <span className="font-medium text-foreground">provenance</span> (created via
                compose pulls / server joins). The left join key must be a <span className="font-medium text-foreground">base table</span>{" "}
                column; the right key is a column produced by the right sheet’s CTE.
              </p>
            ) : (
              <p className="text-[11px] text-muted-foreground leading-snug">
                Sheet joins happen entirely in the browser using the currently loaded sheet rows (usually 100-row previews).
              </p>
            )}
          </div>

          <DialogFooter className="gap-2">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="button" onClick={runSheetJoinIntoNewSheet} disabled={loading}>
              Create joined sheet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={nullishAlertOpen} onOpenChange={onNullishAlertOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Null or NaN values detected</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                <p>
                  We detected null or NaN values in the following columns from this pull:{" "}
                  <span className="font-mono font-medium text-foreground">{nullishColumnList.join(", ")}</span>. Would
                  you like to remove rows that have a missing value in any of these columns?
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={onNullishDialogKeep}>Keep all rows</AlertDialogCancel>
            <AlertDialogAction onClick={onNullishDialogRemoveRows}>Remove those rows</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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

      <div className="px-2 pb-2 space-y-2 min-w-0 max-w-full border-b border-gray-100 dark:border-gray-800">
        <div className="pt-2 flex items-end gap-2 min-w-0">
          {!!activeSheetId ? (
            <div className="flex-1 space-y-1">
              <Label className="text-[11px] text-muted-foreground">Sheet name</Label>
              <Input
                className="h-8 text-xs w-full"
                value={String(dataSheets?.[activeSheetId]?.name || "")}
                onChange={(e) => {
                  const next = e.target.value;
                  setDataSheets?.((prev) => {
                    const p = prev || {};
                    const sheet = p[activeSheetId] || { name: "Sheet", data: [] };
                    return { ...p, [activeSheetId]: { ...sheet, name: next } };
                  });
                }}
                placeholder="e.g. resolved_markets"
                spellCheck={false}
                disabled={!setDataSheets}
              />
            </div>
          ) : null}

          <div className="flex-1 space-y-1">
            <Label className="text-[11px] text-muted-foreground">Data source</Label>
            <div className="flex items-center gap-2 min-w-0">
              <Select
                value={sampleId || undefined}
                onValueChange={(v) => {
                  setSampleId(v);
                  void pingAthenaForSource(v);
                }}
                disabled={!canUseSamples || loading}
              >
                <SelectTrigger className="h-8 text-xs min-w-0 w-full max-w-full focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none">
                  <SelectValue placeholder="Select Data Source" />
                </SelectTrigger>
                <SelectContent>
                  {sampleOptions.map((s) => {
                    const state = athenaPingBySampleId?.[s.id] || "idle";
                    const isSel = s.id === sampleId;
                    const dot =
                      state === "loading" ? (
                        <span className="h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse" />
                      ) : state === "ok" ? (
                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                      ) : state === "error" ? (
                        <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
                      ) : isSel ? (
                        <span className="h-2.5 w-2.5 rounded-full bg-slate-400" />
                      ) : null;

                    return (
                      <SelectItem
                        key={s.id}
                        value={s.id}
                        className="text-xs"
                        left={<span className="inline-flex items-center">{dot}</span>}
                      >
                        {s.label}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>

              <span
                className={[
                  "h-2.5 w-2.5 rounded-full shrink-0",
                  pingState === "loading"
                    ? "bg-amber-500 animate-pulse"
                    : pingState === "ok"
                      ? "bg-emerald-500"
                      : pingState === "error"
                        ? "bg-red-500"
                        : "bg-slate-300 dark:bg-slate-700",
                ].join(" ")}
                aria-label="Athena connection status"
                title={
                  pingState === "loading"
                    ? "Checking connection…"
                    : pingState === "ok"
                      ? "Connected"
                      : pingState === "error"
                        ? "Connection issue"
                        : "Not checked"
                }
              />
            </div>
          </div>
        </div>
      </div>

      <div className="min-w-0 max-w-full px-2">
        <Tabs value={selectionTab} onValueChange={setSelectionTab} className="w-full">
            <div className="flex items-center gap-2 mb-2">
              <TabsList className="w-fit flex-wrap p-0.5 h-auto bg-slate-100 dark:bg-slate-800">
                <TabsTrigger value="columns" className="h-7 px-2 text-xs">
                  Columns
                </TabsTrigger>
                <TabsTrigger value="meta" className="h-7 px-2 text-xs">
                  Meta Table
                </TabsTrigger>
                <TabsTrigger value="recipes" className="h-7 px-2 text-xs">
                  Recipes
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="columns" className="space-y-4 min-w-0">
              {/* No empty-state tip here by request. */}
              {showRequestComposer ? (
                <div className="space-y-3">
                  {activeSheetId && activeSheetRequestCards.length > 0 ? (
                    <div className="flex items-center justify-between gap-2 rounded-lg bg-slate-100 dark:bg-slate-800/40 border border-border/60 p-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">
                          {`New request for Sheet ${String(activeSheetId).replace("sheet-", "")}: ${String(
                            dataSheets?.[activeSheetId]?.name || activeSheetId,
                          )}`}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          When you click <span className="font-medium text-foreground">Load</span>, you’ll be prompted to{" "}
                          <span className="font-medium text-foreground">Replace</span> or{" "}
                          <span className="font-medium text-foreground">Create new sheet</span>.
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs shrink-0"
                        onClick={() => setShowRequestComposer(false)}
                      >
                        Back to summary
                      </Button>
                    </div>
                  ) : null}
                  {selected?.table && availableColumns.length > 0 ? renderColumnsComposeSection() : null}
                </div>
              ) : null}

              {activeSheetId && activeSheetRequestCards.length > 0 ? (
                <div className="space-y-3">
                  {activeSheetRequestCards.map((card, idx) => {
                    const sheetLabel = `Sheet ${String(activeSheetId).replace("sheet-", "") || idx + 1}`;
                    const title = String(card?.sheetLabel || dataSheets?.[activeSheetId]?.name || sheetLabel || "Sheet").trim();
                    const tableLabel = String(card?.table || selected?.table || "").trim();
                    const cols = Array.isArray(card?.selectAliases) && card.selectAliases.length ? card.selectAliases : [];
                    const elapsed = fmtSeconds(card?.elapsedMs);
                    const expanded = expandedRequestCardId === card?.id;
                    return (
                      <div key={card?.id || idx} className="rounded-lg bg-slate-100 dark:bg-slate-800/40 border border-border/60 p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold truncate">
                              {sheetLabel}: {title}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              {tableLabel ? `table: ${tableLabel}` : "table: —"} ·{" "}
                              {cols.length ? `columns: ${cols.join(", ")}` : "columns: —"}
                            </p>
                            <p className="text-[11px] text-muted-foreground">created in {elapsed}</p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs"
                              onClick={() => setExpandedRequestCardId((prev) => (prev === card?.id ? null : card?.id))}
                            >
                              {expanded ? "Collapse" : "Expand"}
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => deleteRequestCardAndClearSheet(activeSheetId, card?.id)}
                              aria-label="Delete request"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        <div
                          className={[
                            "overflow-hidden transition-all duration-300 ease-in-out",
                            expanded ? "max-h-[2400px] opacity-100 mt-3" : "max-h-0 opacity-0",
                          ].join(" ")}
                        >
                          {expanded && selected?.table && availableColumns.length > 0 ? renderColumnsComposeSection() : null}
                        </div>
                      </div>
                    );
                  })}

                  <div>
                    <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={startNewRequestDraft}>
                      Create new request
                    </Button>
                  </div>
                </div>
              ) : null}

              {!showRequestComposer && (!activeSheetId || activeSheetRequestCards.length === 0) && selected?.table && availableColumns.length > 0 ? (
                <div className="space-y-3">
                  {renderColumnsComposeSection()}
                </div>
              ) : null}
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

            <TabsContent value="recipes" className="space-y-4 min-w-0">
              {dataset === "kalshi" && selected?.table === "markets" && (
                <div className="rounded-md border border-border/70 bg-muted/25 p-3 space-y-3 min-w-0">
                  <p className="text-xs font-medium">Kalshi · markets</p>
                  <label className="flex items-start gap-2 text-xs cursor-pointer select-none">
                    <Checkbox
                      className="mt-0.5"
                      checked={kalshiTaxonomyRollup}
                      onCheckedChange={(v) => setKalshiTaxonomyRollup(v === true)}
                    />
                    <span>
                      Roll up into taxonomy categories (Sports, Politics, Crypto, …) — matches{" "}
                    </span>
                  </label>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="h-8 text-xs w-full sm:w-auto"
                    onClick={runRecipeKalshiMarketsCategoryVolume}
                  >
                    Volume by category
                  </Button>
                </div>
              )}
              {dataset === "kalshi" && selected?.table === "trades" && (
                <div className="rounded-md border border-border/70 bg-muted/25 p-3 space-y-2 min-w-0">
                  <p className="text-xs font-medium">Kalshi · trades</p>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="h-8 text-xs w-full sm:w-auto block"
                    onClick={() => runRecipeKalshiTradesVolumeByBucket(KALSHI_TRADES_RESOLVED_MARKETS_JOIN_PRESET_CENT)}
                  >
                    Contract volume by price bucket
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs w-full sm:w-auto block"
                    onClick={() => runRecipeKalshiTradesVolumeByBucket(KALSHI_TRADES_RESOLVED_MARKETS_JOIN_PRESET)}
                  >
                    Contract volume by equal-width decile buckets
                  </Button>
                </div>
              )}
              {!(dataset === "kalshi" && (selected?.table === "markets" || selected?.table === "trades")) && (
                <p className="text-[11px] text-muted-foreground">
                  Select Kalshi <span className="font-mono">markets</span> or <span className="font-mono">trades</span>{" "}
                  above for available recipes.
                </p>
              )}
              <div className="border-t border-border/60 pt-4 space-y-4 min-w-0">
                <p className="text-xs font-medium text-foreground">Compose (same as Columns tab)</p>
                {renderColumnsComposeSection()}
              </div>
            </TabsContent>
          </Tabs>
      </div>

      {loading ? (
        <div className="px-2">
          <ConnectProgressWithLabel label={loadLabel} progress={loadProgress} className="pt-0.5" />
        </div>
      ) : (
        <div className="flex gap-2 items-end flex-wrap min-w-0 max-w-full px-2">
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
        <p className="text-destructive text-[10px] flex gap-1.5 items-start min-w-0 max-w-full px-2">
          <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span className="min-w-0 break-words">{error}</span>
        </p>
      )}

      {lastRowCount != null && !error && (
        <p className="text-[10px] text-muted-foreground px-2">
          Loaded <strong>{lastRowCount}</strong> rows into the sheet.
        </p>
      )}
    </div>
  );
}
