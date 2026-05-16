"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { toast } from "sonner";

import { ConnectComposeSumCaseEditor } from "@/components/connectData/ConnectComposeSumCaseEditor";
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
import { composeSourceColumnLabel } from "@/lib/dataLakeComposeHelpers";
import { getKalshiColumnDisplayLabel } from "@/lib/kalshiConnectColumns";

function columnLabel(col) {
  return getKalshiColumnDisplayLabel({ name: col }) || composeSourceColumnLabel(col);
}

function defaultSumCase(availableColumns, numericColumns) {
  const firstStr = availableColumns.find((c) => c) || "";
  const n0 = numericColumns[0] || "";
  const n1 = numericColumns[1] || n0;
  return {
    enabled: true,
    branches: [{ when: { column: firstStr, op: "eq", value: "" }, thenColumn: n0 }],
    elseColumn: n1,
  };
}

function ifElseModeForItem(item) {
  return item?.aggregate === "sum" ? "sum" : "case";
}

/**
 * Where-style if/else: pick output column, choose CASE vs conditional SUM, edit branches.
 */
export function ConnectComposeIfElseSection({
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

  const [ifElseColumns, setIfElseColumns] = useState([]);
  const hydrated = useRef(false);

  useEffect(() => {
    const pullCols = new Set((columnComposeItems || []).map((i) => i.column));
    setIfElseColumns((prev) => prev.filter((c) => pullCols.has(c)));
  }, [columnComposeItems]);

  useEffect(() => {
    if (hydrated.current) return;
    const active = (columnComposeItems || [])
      .filter((item) => item.sumCase?.enabled)
      .map((item) => item.column);
    if (active.length > 0) {
      setIfElseColumns((prev) => [...new Set([...prev, ...active])]);
      hydrated.current = true;
    }
  }, [columnComposeItems]);

  const clearIfElse = useCallback(
    (col) => {
      const item = itemByColumn[col];
      if (!item) return;
      updateComposeItem(item.id, {
        aggregate: null,
        sumCase: { enabled: false, branches: [], elseColumn: "" },
        equation: { enabled: false },
      });
    },
    [itemByColumn, updateComposeItem],
  );

  const addIfElseColumn = useCallback(
    (col) => {
      if (isDemo) {
        toast.info("Sign up to use If/else rules.");
        return;
      }
      const item = itemByColumn[col];
      if (!item) return;
      setIfElseColumns((prev) => (prev.includes(col) ? prev : [...prev, col]));
      updateComposeItem(item.id, {
        aggregate: null,
        sumCase: defaultSumCase(availableColumns, numericColumns),
        equation: { enabled: false },
      });
    },
    [isDemo, itemByColumn, updateComposeItem, availableColumns, numericColumns],
  );

  const removeIfElseColumn = useCallback(
    (col) => {
      setIfElseColumns((prev) => prev.filter((c) => c !== col));
      clearIfElse(col);
    },
    [clearIfElse],
  );

  const changeIfElseColumn = useCallback(
    (prevCol, nextCol) => {
      if (prevCol === nextCol) return;
      clearIfElse(prevCol);
      setIfElseColumns((rows) => rows.map((c) => (c === prevCol ? nextCol : c)));
      const item = itemByColumn[nextCol];
      if (item) {
        updateComposeItem(item.id, {
          aggregate: null,
          sumCase: defaultSumCase(availableColumns, numericColumns),
          equation: { enabled: false },
        });
      }
    },
    [clearIfElse, itemByColumn, updateComposeItem, availableColumns, numericColumns],
  );

  const setMode = useCallback(
    (col, mode) => {
      const item = itemByColumn[col];
      if (!item) return;
      const sumCase =
        item.sumCase?.enabled && item.sumCase?.branches?.length
          ? item.sumCase
          : defaultSumCase(availableColumns, numericColumns);
      updateComposeItem(item.id, {
        aggregate: mode === "sum" ? "sum" : null,
        sumCase,
        equation: { enabled: false },
      });
    },
    [itemByColumn, updateComposeItem, availableColumns, numericColumns],
  );

  const addableColumns = useMemo(
    () => availableColumns.filter((c) => !ifElseColumns.includes(c)),
    [availableColumns, ifElseColumns],
  );

  if (!availableColumns?.length) {
    return (
      <p className="text-[10px] leading-snug text-muted-foreground">
        Select at least one column in your pull to add if/else rules.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {ifElseColumns.map((col) => {
        const item = itemByColumn[col];
        if (!item?.sumCase?.enabled) return null;
        const mode = ifElseModeForItem(item);

        return (
          <div key={col} className="space-y-2">
            <div className="flex w-full flex-nowrap items-center gap-1.5">
              <Select value={col} onValueChange={(val) => changeIfElseColumn(col, val)}>
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
              <Select value={mode} onValueChange={(v) => setMode(col, v)}>
                <SelectTrigger className="h-7 min-w-[7.5rem] flex-1 text-[11px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="start">
                  <SelectItem value="case" className="text-xs">
                    CASE column (per row)
                  </SelectItem>
                  <SelectItem
                    value="sum"
                    className="text-xs"
                    disabled={kindForColumn(col) !== "number"}
                  >
                    Sum with if/else
                  </SelectItem>
                </SelectContent>
              </Select>
              <button
                type="button"
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted/60"
                onClick={() => removeIfElseColumn(col)}
                aria-label={`Remove if/else for ${col}`}
              >
                <Minus className="h-2.5 w-2.5" />
              </button>
            </div>
            <ConnectComposeSumCaseEditor
              item={item}
              updateComposeItem={updateComposeItem}
              availableColumns={availableColumns}
              numericColumns={numericColumns}
              kindForColumn={kindForColumn}
            />
          </div>
        );
      })}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="outline" size="sm" className="h-7 text-[11px] gap-1">
            <Plus className="h-3 w-3" />
            {ifElseColumns.length > 0
              ? "Add another if/else"
              : "Select column for if/else"}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56 max-h-[280px] overflow-y-auto">
          {addableColumns.length > 0 ? (
            addableColumns.map((col) => (
              <DropdownMenuItem key={col} onSelect={() => addIfElseColumn(col)}>
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
