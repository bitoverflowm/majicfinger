"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { toast } from "sonner";

import EquationExprBuilder from "@/components/integrationsView/integrationPlayground/integrations/polymarketHistorical/EquationExprBuilder";
import { Button } from "@/components/ui/button";
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
  getSummarizeRollupOptions,
} from "@/lib/dataLakeComposeSummarize";
import { composeSourceColumnLabel } from "@/lib/dataLakeComposeHelpers";
import { hasExplicitComposeGrouping } from "@/lib/composeColumnGrouping";
import { getKalshiColumnDisplayLabel } from "@/lib/kalshiConnectColumns";

function columnLabel(col) {
  return getKalshiColumnDisplayLabel({ name: col }) || composeSourceColumnLabel(col);
}

/**
 * Where-style summarize: pick a column, then choose an operation for its data type.
 */
export function ConnectComposeSummarizeSection({
  columnComposeItems,
  updateComposeItem,
  availableColumns,
  numericColumns,
  kindForColumn,
}) {
  const isDemo = !!useMyStateV2()?.isDemo;
  const itemByColumn = useMemo(
    () => Object.fromEntries((columnComposeItems || []).map((item) => [item.column, item])),
    [columnComposeItems],
  );

  const [summarizeColumns, setSummarizeColumns] = useState([]);
  const hydratedFromItems = useRef(false);

  useEffect(() => {
    const pullCols = new Set((columnComposeItems || []).map((i) => i.column));
    setSummarizeColumns((prev) => prev.filter((c) => pullCols.has(c)));
  }, [columnComposeItems]);

  useEffect(() => {
    if (hydratedFromItems.current) return;
    const active = (columnComposeItems || [])
      .filter((item) => {
        if (item.sumCase?.enabled) return false;
        const roll = composeRollUpSelectValue(item);
        return roll !== "none" && roll !== "if_else_case";
      })
      .map((item) => item.column);
    if (active.length > 0) {
      setSummarizeColumns((prev) => [...new Set([...prev, ...active])]);
      hydratedFromItems.current = true;
    }
  }, [columnComposeItems]);

  const addSummarizeColumn = useCallback((col) => {
    setSummarizeColumns((prev) => (prev.includes(col) ? prev : [...prev, col]));
  }, []);

  const removeSummarizeColumn = useCallback(
    (col) => {
      setSummarizeColumns((prev) => prev.filter((c) => c !== col));
      const item = itemByColumn[col];
      if (item) {
        updateComposeItem(
          item.id,
          buildSummarizeRollupPatch(item, "none", {
            availableColumns,
            numericColumns,
            kindForColumn,
          }),
        );
      }
    },
    [itemByColumn, updateComposeItem, availableColumns, numericColumns, kindForColumn],
  );

  const changeSummarizeColumn = useCallback(
    (prevCol, nextCol) => {
      if (prevCol === nextCol) return;
      const prevItem = itemByColumn[prevCol];
      if (prevItem) {
        updateComposeItem(
          prevItem.id,
          buildSummarizeRollupPatch(prevItem, "none", {
            availableColumns,
            numericColumns,
            kindForColumn,
          }),
        );
      }
      setSummarizeColumns((rows) => rows.map((c) => (c === prevCol ? nextCol : c)));
    },
    [itemByColumn, updateComposeItem, availableColumns, numericColumns, kindForColumn],
  );

  const addableColumns = useMemo(
    () =>
      availableColumns.filter(
        (c) => !summarizeColumns.includes(c) && !itemByColumn[c]?.sumCase?.enabled,
      ),
    [availableColumns, summarizeColumns, itemByColumn],
  );

  if (!availableColumns?.length) {
    return (
      <p className="text-[10px] leading-snug text-muted-foreground">
        Select at least one column in your pull to configure summarize options.
      </p>
    );
  }

  const explicitGrouping = hasExplicitComposeGrouping(columnComposeItems);
  const hasSummarizeAgg = (columnComposeItems || []).some((i) => i.aggregate != null);

  return (
    <div className="space-y-2">
      {explicitGrouping && hasSummarizeAgg ? (
        <p className="text-[10px] leading-snug text-muted-foreground">
          Only columns with a bucket (e.g. Unique values) appear in results and define GROUP BY. Other selected columns are dropped from the pull.
        </p>
      ) : null}
      {summarizeColumns.map((col) => {
        const item = itemByColumn[col];
        if (!item) return null;

        const kind = kindForColumn(col);
        const rollVal = composeRollUpSelectValue(item);
        const rollupOptions = getSummarizeRollupOptions(kind, { isDemo });

        const onRollupChange = (v) => {
          if (isDemo && v === "equation") {
            toast.info("Sign up to use Equation summarize options.");
            return;
          }
          updateComposeItem(
            item.id,
            buildSummarizeRollupPatch(item, v, {
              availableColumns,
              numericColumns,
              kindForColumn,
            }),
          );
        };

        return (
          <div key={col} className="space-y-2">
            <div className="flex w-full flex-nowrap items-center gap-1.5">
              <Select value={col} onValueChange={(val) => changeSummarizeColumn(col, val)}>
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
              <Select value={rollVal} onValueChange={onRollupChange}>
                <SelectTrigger className="h-7 min-w-[7.5rem] flex-1 text-[11px]">
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
              <button
                type="button"
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted/60"
                onClick={() => removeSummarizeColumn(col)}
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
              />
            ) : null}
          </div>
        );
      })}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="outline" size="sm" className="h-7 text-[11px] gap-1">
            <Plus className="h-3 w-3" />
            {summarizeColumns.length > 0
              ? "Add another summarize"
              : "Select column you want to summarize"}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56 max-h-[280px] overflow-y-auto">
          {addableColumns.length > 0 ? (
            addableColumns.map((col) => (
              <DropdownMenuItem key={col} onSelect={() => addSummarizeColumn(col)}>
                {columnLabel(col)}
              </DropdownMenuItem>
            ))
          ) : (
            <DropdownMenuItem disabled className="text-xs text-muted-foreground">
              All pull columns already added
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
