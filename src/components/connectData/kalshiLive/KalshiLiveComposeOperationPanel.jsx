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
import { KALSHI_LIVE_CANDLESTICK_PERIOD_OPTIONS } from "@/lib/kalshiLive/candlesticksColumns";
import {
  getKalshiLiveAllColumnNames,
  getKalshiLiveColumnType,
  validateKalshiLiveWhereFilters,
} from "@/lib/kalshiLive/kalshiLiveCompose";
import { KALSHI_LIVE_MARKET_STATUS_OPTIONS } from "@/lib/kalshiLive/marketsColumns";
import { useDemoProGate } from "@/hooks/useDemoProGate";
import { cn } from "@/lib/utils";

function genId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

/** @param {string} endpointId @param {string} column */
function operatorsForColumn(endpointId, column) {
  if (endpointId === "candlesticks" && column === "period_interval") {
    return [{ id: "eq", label: "is equal to" }];
  }
  if (endpointId === "candlesticks" && column === "include_latest_before_start") {
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
  if (endpointId === "candlesticks") {
    const now = Math.floor(Date.now() / 1000);
    if (column === "start_ts") return now - 24 * 60 * 60;
    if (column === "end_ts") return now;
    if (column === "period_interval") return 60;
    if (column === "include_latest_before_start") return false;
  }
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
  } = ctx;

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
    setConnectKalshiLiveLimit?.(KALSHI_LIVE_DEFAULT_LIMIT);
    setConnectActiveComposeOps?.([]);
    setFilterError?.(null);
  }, [
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
    setFilterError,
    onRunPull,
  ]);

  const rowLimitMax = endpointId === "candlesticks" ? CANDLESTICK_ROW_LIMIT_MAX : 1000;

  const renderWhereValueInput = (f) => {
    if (endpointId === "candlesticks" && f.column === "period_interval") {
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
            {endpointId === "candlesticks"
              ? "start_ts, end_ts, and period_interval are sent to Kalshi. Other columns filter on our side after the pull."
              : "Filters on category, tags, and updated time use Kalshi API params when possible. Other columns are filtered on our side after the pull. Category → Other matches custom text or non-standard categories."}
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
                    : KALSHI_LIVE_DEFAULT_LIMIT,
                );
              }}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 text-[11px]"
              onClick={() => setConnectKalshiLiveLimit?.(KALSHI_LIVE_DEFAULT_LIMIT)}
            >
              Reset to {KALSHI_LIVE_DEFAULT_LIMIT}
            </Button>
          </div>
          <p className="text-[10px] leading-snug text-muted-foreground">
            {endpointId === "candlesticks"
              ? "Max 10,000 candle rows total across all tickers (Kalshi batch cap). Applied after fetch, filters, and sort."
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

      {!openComposeOps.length ? (
        <p className="text-[10px] leading-snug text-muted-foreground">
          {endpointId === "candlesticks"
            ? "Refine is optional — Run pull uses the last 24 hours and 1-hour candles unless you add Where filters."
            : "Refine is optional — open Where, Sort, or limit above, or run with your column selection."}
        </p>
      ) : null}

      {filterError ? (
        <p className="text-[11px] text-destructive" role="alert">
          {filterError}
        </p>
      ) : null}

      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.06, duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-wrap items-end gap-2"
      >
        <ConnectHomeSheetPullFields
          sheetNameInputId="connect-home-kalshi-live-sheet-name"
          className="flex-1 min-w-0"
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 shrink-0 border-border bg-card text-xs text-foreground"
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
