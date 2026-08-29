"use client";

import { useCallback, useMemo } from "react";
import { Minus, Plus } from "lucide-react";
import { toast } from "sonner";

import EquationExprBuilder from "@/components/integrationsView/integrationPlayground/integrations/polymarketHistorical/EquationExprBuilder";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  buildSummarizeRollupPatch,
  composeRollUpSelectValue,
  defaultSummarizeRollupForKind,
  getSummarizeRollupOptions,
  isAutoSummarizeAlias,
  sanitizeComposeAlias,
  suggestSummarizeAlias,
} from "@/lib/dataLakeComposeSummarize";
import {
  formatAlsoSelectedColumnsLine,
  getUnsummarizedDimensionColumns,
} from "@/lib/composeColumnGrouping";
import { composeSourceColumnLabel, genComposeRowId } from "@/lib/dataLakeComposeHelpers";
import { getKalshiColumnDisplayLabel } from "@/lib/kalshiConnectColumns";

function columnLabel(col) {
  return getKalshiColumnDisplayLabel({ name: col }) || composeSourceColumnLabel(col);
}

function createSummarizeComposeRow(col, { aggregate, alias, kindForColumn, isDateLike }) {
  const kind = kindForColumn?.(col) || "string";
  const isDate = kind === "date" || !!isDateLike?.(col);
  return {
    id: genComposeRowId(),
    column: col,
    alias,
    aggregate: aggregate || null,
    dateBucket: null,
    dateFormat: null,
    stringBucket: null,
    numberBucket: null,
    numberScale: "none",
    decimals: null,
    treatAsDate: isDate,
    sumCase: { enabled: false, branches: [], elseColumn: "" },
    equation: { enabled: false },
    displayName: null,
  };
}

/**
 * Where-style summarize: pick columns (same column allowed multiple times),
 * choose an aggregate, and optionally name the output column.
 */
export function ConnectComposeSummarizeSection({
  columnComposeItems,
  updateComposeItem,
  setColumnComposeItems,
  availableColumns,
  numericColumns,
  kindForColumn,
  onKeepOneSummaryRow,
}) {
  const isDemo = !!useMyStateV2()?.isDemo;

  const summarizeItems = useMemo(
    () =>
      (columnComposeItems || []).filter((item) => {
        if (item.sumCase?.enabled) return false;
        const roll = composeRollUpSelectValue(item);
        return roll !== "none" && roll !== "if_else_case";
      }),
    [columnComposeItems],
  );

  const unsummarizedColumns = useMemo(
    () => getUnsummarizedDimensionColumns(columnComposeItems),
    [columnComposeItems],
  );

  const alsoSelectedLine = useMemo(
    () => formatAlsoSelectedColumnsLine(unsummarizedColumns, columnLabel),
    [unsummarizedColumns],
  );

  const existingAliases = useMemo(
    () => (columnComposeItems || []).map((i) => String(i.alias || i.column || "").trim()),
    [columnComposeItems],
  );

  const addSummarizeMetric = useCallback(
    (col) => {
      if (!setColumnComposeItems) return;
      const kind = kindForColumn(col);
      const rollup = defaultSummarizeRollupForKind(kind);
      const patchCtx = { availableColumns, numericColumns, kindForColumn };

      setColumnComposeItems((prev) => {
        const rows = prev || [];
        const unusedBase = rows.find(
          (r) =>
            r.column === col &&
            !r.sumCase?.enabled &&
            composeRollUpSelectValue(r) === "none",
        );

        if (unusedBase) {
          const rollPatch = buildSummarizeRollupPatch(unusedBase, rollup, patchCtx);
          const nextAgg = rollPatch.aggregate || (rollup === "equation" ? "sum" : rollup);
          const alias = suggestSummarizeAlias(
            col,
            rollup === "equation" ? "equation" : nextAgg,
            rows.filter((r) => r.id !== unusedBase.id).map((r) => r.alias || r.column),
          );
          return rows.map((r) =>
            r.id === unusedBase.id
              ? { ...r, ...rollPatch, alias, displayName: null }
              : r,
          );
        }

        const alias = suggestSummarizeAlias(col, rollup, rows.map((r) => r.alias || r.column));
        const base = createSummarizeComposeRow(col, {
          aggregate: null,
          alias,
          kindForColumn,
        });
        const rollPatch = buildSummarizeRollupPatch(base, rollup, patchCtx);
        return [...rows, { ...base, ...rollPatch, alias }];
      });
    },
    [availableColumns, kindForColumn, numericColumns, setColumnComposeItems],
  );

  const removeSummarizeItem = useCallback(
    (item) => {
      if (!setColumnComposeItems) return;
      setColumnComposeItems((prev) => {
        const rows = prev || [];
        const sameColumnCount = rows.filter((r) => r.column === item.column).length;
        if (sameColumnCount <= 1) {
          return rows.map((r) =>
            r.id === item.id
              ? {
                  ...r,
                  ...buildSummarizeRollupPatch(r, "none", {
                    availableColumns,
                    numericColumns,
                    kindForColumn,
                  }),
                  alias: item.column,
                  displayName: null,
                }
              : r,
          );
        }
        return rows.filter((r) => r.id !== item.id);
      });
    },
    [availableColumns, kindForColumn, numericColumns, setColumnComposeItems],
  );

  const changeSummarizeSourceColumn = useCallback(
    (item, nextCol) => {
      if (!nextCol || nextCol === item.column) return;
      const roll = composeRollUpSelectValue(item);
      const aliases = existingAliases.filter((a) => a !== String(item.alias || "").trim());
      const nextAlias = isAutoSummarizeAlias(item.alias, item.column, roll)
        ? suggestSummarizeAlias(nextCol, roll === "none" ? null : roll, aliases)
        : item.alias;
      updateComposeItem(item.id, {
        column: nextCol,
        alias: nextAlias,
        ...(isAutoSummarizeAlias(item.alias, item.column, roll) ? { displayName: null } : {}),
      });
    },
    [existingAliases, updateComposeItem],
  );

  const onRollupChange = useCallback(
    (item, v) => {
      if (isDemo && v === "equation") {
        toast.info("Sign up to use Equation summarize options.");
        return;
      }
      const rollPatch = buildSummarizeRollupPatch(item, v, {
        availableColumns,
        numericColumns,
        kindForColumn,
      });
      const prevRoll = composeRollUpSelectValue(item);
      const nextAggKey = v === "equation" ? "equation" : v === "none" ? null : v;
      const aliases = existingAliases.filter((a) => a !== String(item.alias || "").trim());
      const shouldRetargetAlias =
        v !== "none" && isAutoSummarizeAlias(item.alias, item.column, prevRoll);
      const patch = { ...rollPatch };
      if (v === "none") {
        patch.alias = item.column;
        patch.displayName = null;
      } else if (shouldRetargetAlias) {
        patch.alias = suggestSummarizeAlias(item.column, nextAggKey, aliases);
        patch.displayName = null;
      }
      updateComposeItem(item.id, patch);
    },
    [
      availableColumns,
      existingAliases,
      isDemo,
      kindForColumn,
      numericColumns,
      updateComposeItem,
    ],
  );

  const onOutputNameChange = useCallback(
    (item, raw) => {
      const displayName = String(raw ?? "");
      const fallback = suggestSummarizeAlias(
        item.column,
        composeRollUpSelectValue(item),
        existingAliases.filter((a) => a !== String(item.alias || "").trim()),
      );
      const alias = sanitizeComposeAlias(displayName, fallback);
      // Keep alias unique.
      const taken = new Set(
        existingAliases.filter((a) => a !== String(item.alias || "").trim()),
      );
      let unique = alias;
      if (taken.has(unique)) {
        let i = 2;
        while (taken.has(`${alias}_${i}`)) i += 1;
        unique = `${alias}_${i}`;
      }
      updateComposeItem(item.id, {
        alias: unique,
        displayName: displayName.trim() ? displayName.trim() : null,
      });
    },
    [existingAliases, updateComposeItem],
  );

  if (!availableColumns?.length) {
    return (
      <p className="text-[10px] leading-snug text-muted-foreground">
        Select at least one column in your pull to configure summarize options.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {summarizeItems.map((item) => {
        const col = item.column;
        const kind = kindForColumn(col);
        const rollVal = composeRollUpSelectValue(item);
        const rollupOptions = getSummarizeRollupOptions(kind, { isDemo });
        const nameValue = item.displayName?.trim() || item.alias || "";

        return (
          <div key={item.id} className="space-y-2">
            <div className="flex w-full flex-nowrap items-center gap-1.5">
              <Select
                value={col}
                onValueChange={(val) => changeSummarizeSourceColumn(item, val)}
              >
                <SelectTrigger className="h-7 w-auto min-w-[5.5rem] max-w-[10rem] shrink-0 text-[11px]">
                  <SelectValue placeholder="Column" />
                </SelectTrigger>
                <SelectContent>
                  {availableColumns.map((c) => (
                    <SelectItem key={c} value={c} className="text-[13px]">
                      {columnLabel(c)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={rollVal} onValueChange={(v) => onRollupChange(item, v)}>
                <SelectTrigger className="h-7 min-w-[7rem] flex-1 text-[11px]">
                  <SelectValue placeholder="Summarize" />
                </SelectTrigger>
                <SelectContent align="start" className="max-h-[280px]">
                  {rollupOptions.map((opt) => (
                    <SelectItem
                      key={opt.value}
                      value={opt.value}
                      className="text-xs"
                      disabled={opt.disabled}
                    >
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                className="h-7 min-w-[5.5rem] flex-1 text-[11px]"
                value={nameValue}
                placeholder="Column name"
                aria-label={`Output name for ${col}`}
                title="Name for this summarized column in your sheet"
                onChange={(e) => onOutputNameChange(item, e.target.value)}
              />
              <button
                type="button"
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted/60"
                onClick={() => removeSummarizeItem(item)}
                aria-label={`Remove summarize for ${col}`}
              >
                <Minus className="h-2.5 w-2.5" />
              </button>
            </div>

            {item.aggregate === "sum" && item.equation?.enabled ? (
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
          </div>
        );
      })}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="outline" size="sm" className="h-7 text-[11px] gap-1">
            <Plus className="h-3 w-3" />
            {summarizeItems.length > 0
              ? "Add another summarize"
              : "Select column you want to summarize"}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56 max-h-[280px] overflow-y-auto">
          {availableColumns.length > 0 ? (
            availableColumns.map((col) => (
              <DropdownMenuItem key={col} onSelect={() => addSummarizeMetric(col)}>
                {columnLabel(col)}
              </DropdownMenuItem>
            ))
          ) : (
            <DropdownMenuItem disabled className="text-xs text-muted-foreground">
              No columns available
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {summarizeItems.length > 0 && unsummarizedColumns.length > 0 ? (
        <div className="rounded-md border border-border/50 bg-background/80 px-2.5 py-2 space-y-1.5">
          <p className="text-[11px] font-medium leading-snug text-foreground">{alsoSelectedLine}</p>
          <p className="text-[10px] leading-snug text-muted-foreground">
            They aren't summarized, so Lychee will group by them (many rows).
          </p>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-[11px]"
              onClick={() => onKeepOneSummaryRow?.()}
            >
              Keep one summary row
            </Button>
            <span className="text-[10px] leading-snug text-muted-foreground">
              Or add summarize rules for those columns too.
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
