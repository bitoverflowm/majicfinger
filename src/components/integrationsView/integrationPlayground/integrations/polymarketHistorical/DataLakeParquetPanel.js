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
import { Play, AlertCircle, HelpCircle, ChevronDown, Minus, Plus } from "lucide-react";
import { getDataLakeDatasetConfig, ATHENA_SAMPLE_ROW_LIMIT } from "@/config/dataLakeParquetSamples";
import { fetchAthenaLakeSample } from "@/lib/dataLake/fetchAthenaSample";
import { ingestAthenaResultAsView, listBeckerParquetViews } from "@/lib/duckdb/duckdbWasmClient";
import { ConnectProgressWithLabel } from "./ConnectProgressWithLabel";
import { runParquetSheetLoadWithProgress, PARQUET_LOAD_PHASE_MESSAGES } from "./parquetSheetLoadProgress";
import { ReplaceOrNewSheetDialog } from "@/components/dataView/replaceOrNewSheetDialog";
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

/**
 * Becker / DuckDB-backed historical data: bounded Athena `SELECT <columns>` → JSON → DuckDB view → sheet.
 * Polymarket: markets, blocks, trades. Kalshi: markets, trades (no blocks in Glue).
 *
 * @param {{ setConnectedData: (rows: Record<string, unknown>[]) => void; dataset?: "polymarket" | "kalshi" }} props
 */
export default function DataLakeParquetPanel({ setConnectedData, dataset = "polymarket" }) {
  const ctx = useMyStateV2();
  const connectedData = ctx?.connectedData ?? [];
  const replaceCurrentSheetData = ctx?.replaceCurrentSheetData;
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
  const initialSelectedColumns = useMemo(() => {
    const first = sampleOptions[0];
    if (!first?.table) return [];
    return getColumnMetaForTable(dataset, first.table).map((c) => c.name);
  }, [dataset, sampleOptions]);

  const [selectedColumns, setSelectedColumns] = useState(initialSelectedColumns);
  const [selectionTab, setSelectionTab] = useState("columns"); // "columns" | "meta"
  const [metaQueryMode, setMetaQueryMode] = useState("all"); // "all" | "filter"
  const [metaCaseSensitive, setMetaCaseSensitive] = useState(false);
  const [metaAndFilters, setMetaAndFilters] = useState([]); // advanced tags (AND)
  const [metaOrFilters, setMetaOrFilters] = useState([]); // advanced tags (OR)
  const [metaAdvancedOpen, setMetaAdvancedOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadLabel, setLoadLabel] = useState(PARQUET_LOAD_PHASE_MESSAGES[0].text);
  const [loadProgress, setLoadProgress] = useState(0);
  const [error, setError] = useState(null);
  const [lastRowCount, setLastRowCount] = useState(null);
  const [sheetDialogOpen, setSheetDialogOpen] = useState(false);
  const [beckerViews, setBeckerViews] = useState(() => listBeckerParquetViews());

  /** @type {React.MutableRefObject<null | { mode: "columns" | "meta"; lake: string; table: string; sampleId: string; columns: string[] }>} */
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

  // Default behavior: when the table changes, populate all its columns.
  useEffect(() => {
    if (!selected?.table) return;
    setSelectedColumns(availableColumns);
    setMetaQueryMode("all");
    setMetaAndFilters([]);
    setMetaOrFilters([]);
    setMetaAdvancedOpen(false);
  }, [selected?.table, availableColumns]);

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
    async (lakeVal, table, sid, mode, cols, metaQueryMode, metaCaseSensitive, metaFilters) => {
      return runParquetSheetLoadWithProgress({
        onLabel: setLoadLabel,
        onProgress: setLoadProgress,
        loadFn: async () => {
          if (mode === "meta") {
            // Meta table (count): a single-cell COUNT(*) result (optionally with filters).
            const isFilterMode = metaQueryMode === "filter";
            const { columns: resultColumns, rows } = await fetchAthenaLakeSample({
              lake: lakeVal,
              table,
              limit: ATHENA_SAMPLE_ROW_LIMIT,
              queryType: "count",
              countAlias: "count",
              caseSensitive: metaCaseSensitive,
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

          // Data table: bounded Athena SELECT <columns> → JSON → DuckDB view → sheet.
          const { rows } = await fetchAthenaLakeSample({
            lake: lakeVal,
            table,
            limit: ATHENA_SAMPLE_ROW_LIMIT,
            columns: cols,
          });

          return ingestAthenaResultAsView({
            dataset,
            sampleId: sid,
            columns: cols,
            rows,
            limit: ATHENA_SAMPLE_ROW_LIMIT,
          });
        },
      });
    },
    [dataset],
  );

  const executeIngestReplace = useCallback(async () => {
    const pending = pendingIngestRef.current;
    if (!pending) return;
    const { mode, lake: lk, table, sampleId: sid, columns, metaQueryMode, metaCaseSensitive, metaFilters } = pending;
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
        columns,
        metaQueryMode,
        metaCaseSensitive,
        metaFilters,
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

  const executeIngestNewSheet = useCallback(async () => {
    const pending = pendingIngestRef.current;
    if (!pending) return;
    const { mode, lake: lk, table, sampleId: sid, columns, metaQueryMode, metaCaseSensitive, metaFilters } = pending;
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
        columns,
        metaQueryMode,
        metaCaseSensitive,
        metaFilters,
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
              name: `${prefix} · ${sampleLabel}${mode === "meta" ? " · Count" : ""}`.slice(0, 80),
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

  const anyStringFilterSelected = useMemo(() => {
    return [...metaAndFilters, ...metaOrFilters].some((f) => f.kind === "string");
  }, [metaAndFilters, metaOrFilters]);

  const hasIncompleteMetaFilters = useMemo(() => {
    const all = [...metaAndFilters, ...metaOrFilters];
    return all.some((f) => {
      if (!f?.column || !f?.op || !f?.kind) return true;
      if (f.kind === "string") return !String(f.value ?? "").trim();
      if (f.kind === "date") return !Number.isFinite(Number(f.value));
      return !Number.isFinite(Number(f.value));
    });
  }, [metaAndFilters, metaOrFilters]);

  const handleLoad = () => {
    setError(null);
    setLastRowCount(null);
    if (!selected?.table) {
      setError("Choose a table below.");
      return;
    }
    if (selectionTab === "columns" && selectedColumns.length === 0) {
      setError("Must select at least 1 column to pull.");
      return;
    }
    if (selectionTab === "meta" && metaQueryMode === "filter") {
      const total = metaAndFilters.length + metaOrFilters.length;
      if (total === 0) {
        setError("Must select at least 1 filter to pull.");
        return;
      }
      if (hasIncompleteMetaFilters) {
        setError("Complete all filter values before running request.");
        return;
      }
    }

    pendingIngestRef.current = {
      mode: selectionTab,
      lake,
      table: selected.table,
      sampleId: selected.id,
      columns: selectionTab === "columns" ? selectedColumns : [],
      metaQueryMode,
      metaCaseSensitive,
      metaFilters: {
        and: metaAndFilters,
        or: metaOrFilters,
      },
    };

    if (connectedData.length > 0) {
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
    if (selectionTab === "columns" && selectedColumns.length === 0) {
      reasons.push("Must select at least 1 column to pull.");
    }
    if (selectionTab === "meta" && metaQueryMode === "filter") {
      const total = metaAndFilters.length + metaOrFilters.length;
      if (total === 0) reasons.push("Must select at least 1 filter to pull.");
      if (hasIncompleteMetaFilters) reasons.push("Complete all filter values.");
    }
    return reasons;
  }, [selected?.table, selectionTab, selectedColumns, metaQueryMode, metaAndFilters.length, metaOrFilters.length, hasIncompleteMetaFilters]);

  const canRunRequest = runRequestReasons.length === 0;

  const toggleColumn = useCallback(
    (col, checked) => {
      setSelectedColumns((prev) => {
        const nextSet = new Set(prev);
        if (checked) nextSet.add(col);
        else nextSet.delete(col);
        // Preserve dropdown order (same order as Athena select list).
        return availableColumns.filter((c) => nextSet.has(c));
      });
    },
    [availableColumns],
  );

  const addMetaFilterPreset = useCallback(
    (column, op) => {
      setError(null);
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

      <div className="space-y-1 min-w-0 max-w-full">
        <Label className="text-xs">Table</Label>
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

            <TabsContent value="columns" className="space-y-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs min-w-0 w-full justify-between"
                    type="button"
                  >
                    <span className="truncate">
                      {selectedColumns.length === availableColumns.length
                        ? "All columns"
                        : selectedColumns.length > 0
                          ? `${selectedColumns.length} selected`
                          : "None selected"}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="max-h-[280px] w-64 overflow-y-auto" align="start">
                  <DropdownMenuLabel className="text-xs">Choose columns</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuCheckboxItem
                    onSelect={(e) => e.preventDefault()}
                    onCheckedChange={() => setSelectedColumns(availableColumns)}
                    checked={selectedColumns.length === availableColumns.length && availableColumns.length > 0}
                  >
                    All
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    onSelect={(e) => e.preventDefault()}
                    onCheckedChange={() => setSelectedColumns([])}
                    checked={selectedColumns.length === 0}
                  >
                    clear
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuSeparator />
                  {availableColumns.map((col) => (
                    <DropdownMenuCheckboxItem
                      key={col}
                      checked={selectedColumns.includes(col)}
                      onSelect={(e) => e.preventDefault()}
                      onCheckedChange={(checked) => toggleColumn(col, checked === true)}
                    >
                      <span className="truncate">{col}</span>
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </TabsContent>

            <TabsContent value="meta" className="space-y-2">
              <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">
                        {`Compose your summary for ${selected?.label || "selected"} data`}
                      </Label>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="h-8 text-xs min-w-0 w-full justify-between">
                            {metaAndFilters.length + metaOrFilters.length > 0 ? (
                              <span className="inline-flex items-center gap-1.5">
                                <Plus className="h-3 w-3" />
                                add another operation
                              </span>
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
                                      setMetaQueryMode("all");
                                      setMetaAndFilters([]);
                                      setMetaOrFilters([]);
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
                                                    key={op.id}
                                                    className="text-xs"
                                                    onSelect={() => {
                                                      setMetaQueryMode("filter");
                                                      addMetaFilterPreset(col, op.id);
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
                          </DropdownMenuGroup>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

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
                                <SelectTrigger className="h-7 text-[9px] min-w-0 w-16">
                                  <SelectValue placeholder="Column" />
                                </SelectTrigger>
                                <SelectContent>
                                  {availableColumns.map((col) => (
                                    <SelectItem key={col} value={col} className="text-[11px]">
                                      {col}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>

                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="outline" size="sm" className="h-7 px-2 text-[9px] min-w-8">
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
                                    <DropdownMenuItem key={op.id} className="text-[11px]" onSelect={() => updateMetaFilter(f.id, { op: op.id })}>
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
                                  className="h-7 text-[9px] min-w-0 flex-[2]"
                                  value={Number.isFinite(Number(f.value)) ? new Date(Number(f.value)).toISOString().slice(0, 16) : ""}
                                  onChange={(e) => {
                                    const ms = new Date(String(e.target.value)).getTime();
                                    updateMetaFilter(f.id, { value: Number.isFinite(ms) ? ms : "" });
                                  }}
                                />
                              ) : f.kind === "number" ? (
                                <Input
                                  type="number"
                                  step="1"
                                  className="h-7 text-[9px] min-w-0 flex-[2]"
                                  value={f.value}
                                  onChange={(e) => updateMetaFilter(f.id, { value: e.target.value === "" ? "" : Number(e.target.value) })}
                                />
                              ) : (
                                <Input
                                  type="text"
                                  className="h-7 text-[9px] min-w-0 flex-[2]"
                                  value={String(f.value ?? "")}
                                  onChange={(e) => updateMetaFilter(f.id, { value: e.target.value })}
                                  placeholder="Value"
                                />
                              )}

                              <TooltipProvider delayDuration={250}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => removeMetaFilter(f.id)}>
                                      <Minus className="h-1.5 w-1.5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="text-xs">
                                    remove operation
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          ))}
                        </div>

                        {anyStringFilterSelected && (
                          <div className="flex items-center gap-1.5">
                            <Checkbox
                              id="meta-case-sensitive"
                              checked={metaCaseSensitive}
                              onCheckedChange={(v) => setMetaCaseSensitive(v === true)}
                            />
                            <Label htmlFor="meta-case-sensitive" className="text-[10px] text-muted-foreground">
                              Case sensitive
                            </Label>
                          </div>
                        )}

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
