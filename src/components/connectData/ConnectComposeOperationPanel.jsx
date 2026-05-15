"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Minus, Plus } from "lucide-react";

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
import { ATHENA_KALSHI_SAMPLE_OPTIONS, ATHENA_SAMPLE_ROW_LIMIT } from "@/config/dataLakeParquetSamples";
import { useMyStateV2 } from "@/context/stateContextV2";
import { useDataLakeComposeState } from "@/hooks/useDataLakeComposeState";
import {
  composeSourceColumnLabel,
  genComposeJoinId,
  kindForLakeColumn,
  operatorSymbol,
} from "@/lib/dataLakeComposeHelpers";
import { glueTableNamesForDataset } from "@/config/dataLakeParquetSamples";
import { getColumnMetaForLakeTable } from "@/lib/dataLake/lakeTableColumns";
import { CONNECT_COMPOSE_OPERATIONS } from "@/lib/connectComposeOperations";
import { cn } from "@/lib/utils";

const KALSHI_SAMPLE_BY_ID = Object.fromEntries(ATHENA_KALSHI_SAMPLE_OPTIONS.map((s) => [s.id, s]));

/**
 * Inline compose controls (mirrors integrations panel) for Connect home vertical flow.
 */
export function ConnectComposeOperationPanel({ className }) {
  const panelRef = useRef(null);
  const { connectActiveComposeOp, connectDataLakeSampleId, setRightPanelOpen, setRightPanelTab } =
    useMyStateV2() ?? {};

  const compose = useDataLakeComposeState(true);
  const {
    columnComposeItems,
    setColumnComposeItems,
    columnComposeOrderBy,
    setColumnComposeOrderBy,
    composeLimitRuleOpen,
    setComposeLimitRuleOpen,
    composeLimitRuleValue,
    setComposeLimitRuleValue,
    composeWhereFilters,
    setComposeWhereFilters,
    composeHavingFilters,
    setComposeHavingFilters,
    composeJoins,
    setComposeJoins,
  } = compose;

  const sample = KALSHI_SAMPLE_BY_ID[connectDataLakeSampleId];
  const table = sample?.table;

  const columnMeta = useMemo(
    () => (table ? getColumnMetaForLakeTable("kalshi", table) : []),
    [table],
  );
  const availableColumns = useMemo(() => columnMeta.map((c) => c.name), [columnMeta]);
  const typesByName = useMemo(
    () => Object.fromEntries(columnMeta.map((c) => [c.name, c.type])),
    [columnMeta],
  );
  const kindForColumn = useCallback((col) => kindForLakeColumn(col, typesByName), [typesByName]);

  const glueJoinTableOptions = useMemo(() => glueTableNamesForDataset("kalshi"), []);

  const composeSelectAliasChoices = useMemo(
    () =>
      columnComposeItems.map((i) => ({
        alias: i.alias,
        column: i.column,
        label: i.alias === i.column ? i.alias : `${i.alias} (${i.column})`,
      })),
    [columnComposeItems],
  );

  const composeAggregateAliasChoices = useMemo(
    () =>
      columnComposeItems
        .filter((i) => i.aggregate != null)
        .map((i) => ({
          alias: String(i.alias || i.column).trim(),
          label: i.aggregate ? `${String(i.alias)} = ${String(i.aggregate).toUpperCase()}` : String(i.alias),
        })),
    [columnComposeItems],
  );

  const activeMeta = CONNECT_COMPOSE_OPERATIONS.find((o) => o.id === connectActiveComposeOp);

  useEffect(() => {
    if (!connectActiveComposeOp) return;
    const t = window.setTimeout(() => {
      panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
    return () => window.clearTimeout(t);
  }, [connectActiveComposeOp]);

  const addWhereFilter = useCallback(
    (column, op) => {
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
      setComposeWhereFilters?.((prev) => [...(prev || []), { id, column, kind, op, value: defaultValue }]);
    },
    [kindForColumn, setComposeWhereFilters],
  );

  const updateWhereFilter = useCallback(
    (id, patch) => {
      setComposeWhereFilters?.((prev) => (prev || []).map((f) => (f.id === id ? { ...f, ...patch } : f)));
    },
    [setComposeWhereFilters],
  );

  const removeWhereFilter = useCallback(
    (id) => {
      setComposeWhereFilters?.((prev) => (prev || []).filter((f) => f.id !== id));
    },
    [setComposeWhereFilters],
  );

  const addJoinRule = useCallback(() => {
    const baseLeft = availableColumns[0] || "";
    const defaultTargetTable = table === "markets" ? "trades" : "markets";
    setComposeJoins?.((prev) => [
      ...(prev || []),
      {
        id: genComposeJoinId(),
        targetKind: "table",
        targetTable: defaultTargetTable,
        targetSheetId: "",
        joinType: "inner",
        leftColumn: baseLeft,
        rightColumn: "",
      },
    ]);
  }, [availableColumns, table, setComposeJoins]);

  const addSortClause = useCallback(() => {
    const first = composeSelectAliasChoices[0];
    if (!first) return;
    setColumnComposeOrderBy?.((prev) => [...(prev || []), { alias: first.alias, direction: "asc" }]);
  }, [composeSelectAliasChoices, setColumnComposeOrderBy]);

  const updateComposeItem = useCallback(
    (id, patch) => {
      setColumnComposeItems?.((prev) => (prev || []).map((row) => (row.id === id ? { ...row, ...patch } : row)));
    },
    [setColumnComposeItems],
  );

  if (!connectActiveComposeOp || !activeMeta) return null;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={connectActiveComposeOp}
        id={`connect-compose-${connectActiveComposeOp}`}
        ref={panelRef}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 4 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          "mt-4 scroll-mt-6 rounded-lg border border-border/60 bg-muted/15 p-4 space-y-4",
          className,
        )}
      >
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
        >
          <h3 className="text-xs font-semibold tracking-tight text-foreground">{activeMeta.title}</h3>
          <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{activeMeta.description}</p>
        </motion.div>

        {connectActiveComposeOp === "where" ? (
          <div className="space-y-2">
            {composeWhereFilters.map((f) => (
              <div key={f.id} className="flex flex-wrap items-center gap-1">
                <Select
                  value={f.column}
                  onValueChange={(val) => {
                    const kind = kindForColumn(val);
                    updateWhereFilter(f.id, { column: val, kind });
                  }}
                >
                  <SelectTrigger className="h-7 min-w-[7rem] text-[11px]">
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
                    {(f.kind === "string"
                      ? [
                          { id: "eq", label: "is equal to" },
                          { id: "neq", label: "not equal to" },
                          { id: "in", label: "in set" },
                        ]
                      : [
                          { id: "gt", label: "greater than" },
                          { id: "lt", label: "less than" },
                          { id: "eq", label: "is equal to" },
                          { id: "in", label: "in set" },
                        ]
                    ).map((op) => (
                      <DropdownMenuItem key={op.id} onSelect={() => updateWhereFilter(f.id, { op: op.id })}>
                        {op.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                <Input
                  className="h-7 min-w-0 flex-1 text-[11px]"
                  value={String(f.value ?? "")}
                  onChange={(e) => updateWhereFilter(f.id, { value: e.target.value })}
                />
                <button
                  type="button"
                  className="inline-flex h-4 w-4 items-center justify-center rounded text-muted-foreground hover:bg-muted/60"
                  onClick={() => removeWhereFilter(f.id)}
                  aria-label="Remove filter"
                >
                  <Minus className="h-2 w-2" />
                </button>
              </div>
            ))}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline" size="sm" className="h-7 text-[11px] gap-1">
                  <Plus className="h-3 w-3" />
                  Select column you want to filter
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56 max-h-[280px] overflow-y-auto">
                {availableColumns.map((col) => (
                  <DropdownMenuItem key={col} onSelect={() => addWhereFilter(col, "eq")}>
                    {composeSourceColumnLabel(col)}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : null}

        {connectActiveComposeOp === "join" ? (
          <div className="space-y-2">
            {composeJoins.map((jr) => {
              const rightCols = getColumnMetaForLakeTable("kalshi", jr.targetTable || "markets").map(
                (c) => c.name,
              );
              return (
                <div key={jr.id} className="flex flex-wrap items-center gap-2 rounded-md border border-border/50 p-2">
                  <Select
                    value={jr.targetTable || ""}
                    onValueChange={(v) =>
                      setComposeJoins?.((prev) =>
                        (prev || []).map((r) => (r.id === jr.id ? { ...r, targetTable: v, rightColumn: "" } : r)),
                      )
                    }
                  >
                    <SelectTrigger className="h-8 w-[6.5rem] text-xs">
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
                  <Select
                    value={jr.joinType}
                    onValueChange={(v) =>
                      setComposeJoins?.((prev) =>
                        (prev || []).map((r) => (r.id === jr.id ? { ...r, joinType: v } : r)),
                      )
                    }
                  >
                    <SelectTrigger className="h-8 w-[5.5rem] text-xs">
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
                  <Select
                    value={jr.leftColumn || ""}
                    onValueChange={(v) =>
                      setComposeJoins?.((prev) =>
                        (prev || []).map((r) => (r.id === jr.id ? { ...r, leftColumn: v } : r)),
                      )
                    }
                  >
                    <SelectTrigger className="h-8 min-w-[5rem] text-xs">
                      <SelectValue placeholder="Left col" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableColumns.map((c) => (
                        <SelectItem key={c} value={c} className="text-xs">
                          {composeSourceColumnLabel(c)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-[10px] text-muted-foreground">=</span>
                  <Select
                    value={jr.rightColumn || ""}
                    onValueChange={(v) =>
                      setComposeJoins?.((prev) =>
                        (prev || []).map((r) => (r.id === jr.id ? { ...r, rightColumn: v } : r)),
                      )
                    }
                  >
                    <SelectTrigger className="h-8 min-w-[5rem] text-xs">
                      <SelectValue placeholder="Right col" />
                    </SelectTrigger>
                    <SelectContent>
                      {rightCols.map((c) => (
                        <SelectItem key={c} value={c} className="text-xs">
                          {composeSourceColumnLabel(c)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <button
                    type="button"
                    className="inline-flex h-4 w-4 items-center justify-center rounded text-muted-foreground hover:bg-muted/60"
                    onClick={() => setComposeJoins?.((prev) => (prev || []).filter((r) => r.id !== jr.id))}
                  >
                    <Minus className="h-2 w-2" />
                  </button>
                </div>
              );
            })}
            <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={addJoinRule}>
              Add join
            </Button>
          </div>
        ) : null}

        {connectActiveComposeOp === "sort" ? (
          <div className="space-y-2">
            {columnComposeOrderBy.map((ob, idx) => (
              <div key={`${ob.alias}-${idx}`} className="flex flex-wrap items-center gap-2">
                <Select
                  value={ob.alias}
                  onValueChange={(v) =>
                    setColumnComposeOrderBy?.((prev) =>
                      (prev || []).map((r, j) => (j === idx ? { ...r, alias: v } : r)),
                    )
                  }
                >
                  <SelectTrigger className="h-8 min-w-[7rem] text-xs">
                    <SelectValue />
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
                  onValueChange={(v) =>
                    setColumnComposeOrderBy?.((prev) =>
                      (prev || []).map((r, j) => (j === idx ? { ...r, direction: v } : r)),
                    )
                  }
                >
                  <SelectTrigger className="h-8 w-[10rem] text-xs">
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
                  className="inline-flex h-4 w-4 items-center justify-center rounded text-muted-foreground hover:bg-muted/60"
                  onClick={() =>
                    setColumnComposeOrderBy?.((prev) => (prev || []).filter((_, j) => j !== idx))
                  }
                >
                  <Minus className="h-2 w-2" />
                </button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              disabled={!composeSelectAliasChoices.length}
              onClick={addSortClause}
            >
              Add sort
            </Button>
          </div>
        ) : null}

        {connectActiveComposeOp === "row_limit" ? (
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Maximum rows</Label>
            <motion.div className="flex items-center gap-2">
              <Input
                type="number"
                min={1}
                className="h-8 w-32 text-xs"
                value={composeLimitRuleValue}
                onChange={(e) => {
                  setComposeLimitRuleOpen?.(true);
                  setComposeLimitRuleValue?.(e.target.value);
                }}
                placeholder={`e.g. ${ATHENA_SAMPLE_ROW_LIMIT}`}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 text-[11px]"
                onClick={() => {
                  setComposeLimitRuleOpen?.(false);
                  setComposeLimitRuleValue?.("");
                }}
              >
                Clear limit
              </Button>
            </motion.div>
            {!composeLimitRuleOpen ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => {
                  setComposeLimitRuleOpen?.(true);
                  setComposeLimitRuleValue?.(String(ATHENA_SAMPLE_ROW_LIMIT));
                }}
              >
                Set row limit
              </Button>
            ) : null}
          </div>
        ) : null}

        {connectActiveComposeOp === "summarize" ? (
          <div className="space-y-2">
            {columnComposeItems.map((item) => {
              const k = kindForColumn(item.column);
              const isNumeric = k === "number";
              const aggVal = item.aggregate || "none";
              return (
                <div
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/50 px-2 py-1.5"
                >
                  <span className="text-[11px] font-medium">{composeSourceColumnLabel(item.column)}</span>
                  <Select
                    value={aggVal}
                    onValueChange={(v) =>
                      updateComposeItem(item.id, {
                        aggregate: v === "none" ? null : v,
                      })
                    }
                  >
                    <SelectTrigger className="h-7 w-[11rem] text-[11px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none" className="text-xs">
                        Show values
                      </SelectItem>
                      <SelectItem value="sum" className="text-xs" disabled={!isNumeric}>
                        Sum
                      </SelectItem>
                      <SelectItem value="count" className="text-xs">
                        Count
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              );
            })}
          </div>
        ) : null}

        {connectActiveComposeOp === "having" ? (
          <div className="space-y-2">
            {composeHavingFilters.map((f) => (
              <motion.div key={f.id} className="flex flex-wrap items-center gap-1">
                <Select
                  value={f.havingAlias}
                  onValueChange={(val) =>
                    setComposeHavingFilters?.((prev) =>
                      (prev || []).map((row) => (row.id === f.id ? { ...row, havingAlias: val } : row)),
                    )
                  }
                >
                  <SelectTrigger className="h-7 min-w-[6rem] text-[11px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {composeAggregateAliasChoices.map((a) => (
                      <SelectItem key={a.alias} value={a.alias} className="text-[13px]">
                        {a.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-7 px-2 text-[11px]">
                      {operatorSymbol(f.op)}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    {["gt", "lt", "eq", "neq"].map((op) => (
                      <DropdownMenuItem
                        key={op}
                        onSelect={() =>
                          setComposeHavingFilters?.((prev) =>
                            (prev || []).map((row) => (row.id === f.id ? { ...row, op } : row)),
                          )
                        }
                      >
                        {op}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                <Input
                  type="number"
                  className="h-7 w-24 text-[11px]"
                  value={f.value}
                  onChange={(e) =>
                    setComposeHavingFilters?.((prev) =>
                      (prev || []).map((row) =>
                        row.id === f.id ? { ...row, value: Number(e.target.value) } : row,
                      ),
                    )
                  }
                />
                <button
                  type="button"
                  onClick={() =>
                    setComposeHavingFilters?.((prev) => (prev || []).filter((row) => row.id !== f.id))
                  }
                  className="inline-flex h-4 w-4 items-center justify-center rounded text-muted-foreground hover:bg-muted/60"
                >
                  <Minus className="h-2 w-2" />
                </button>
              </motion.div>
            ))}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  disabled={!composeAggregateAliasChoices.length}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add having filter
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {composeAggregateAliasChoices.map((a) => (
                  <DropdownMenuItem
                    key={a.alias}
                    onSelect={() =>
                      setComposeHavingFilters?.((prev) => [
                        ...(prev || []),
                        {
                          id: `h-${Date.now()}`,
                          havingAlias: a.alias,
                          op: "gt",
                          value: 0,
                        },
                      ])
                    }
                  >
                    {a.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            {!composeAggregateAliasChoices.length ? (
              <p className="text-[10px] text-muted-foreground">
                Add a Sum or Count on at least one column under Summarize first.
              </p>
            ) : null}
          </div>
        ) : null}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.18 }}
          className="flex flex-wrap gap-2 border-t border-border/40 pt-3"
        >
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="h-8 text-xs"
            onClick={() => {
              setRightPanelOpen?.(true);
              setRightPanelTab?.("integrations");
            }}
          >
            Run pull in integrations panel
          </Button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
