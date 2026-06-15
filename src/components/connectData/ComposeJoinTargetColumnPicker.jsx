"use client";

import { useCallback, useMemo } from "react";
import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  appendJoinTargetColumns,
  composeItemRefKey,
  getJoinTargetColumnsForPicker,
  joinTargetColumnDisplayLabel,
  removeJoinTargetColumns,
} from "@/lib/composeJoinColumns";
import { cn } from "@/lib/utils";

/**
 * Multi-select column picker for a joined Glue table (same interaction as Connect ColumnPicker).
 */
export function ComposeJoinTargetColumnPicker({
  lake,
  joinTable,
  columnComposeItems,
  setColumnComposeItems,
  setColumnComposeOrderBy,
}) {
  const table = String(joinTable || "").trim().toLowerCase();
  const columns = useMemo(() => getJoinTargetColumnsForPicker(lake, table), [lake, table]);

  const selectedNames = useMemo(() => {
    const st = table;
    return (columnComposeItems || [])
      .filter((i) => String(i?.sourceTable || "").trim().toLowerCase() === st)
      .map((i) => String(i?.column || "").trim())
      .filter(Boolean);
  }, [columnComposeItems, table]);

  const selectedSet = useMemo(() => new Set(selectedNames), [selectedNames]);
  const allSelected = columns.length > 0 && selectedNames.length === columns.length;
  const noneSelected = selectedNames.length === 0;

  const pruneOrderByAliases = useCallback(
    (aliases) => {
      if (!aliases?.length || !setColumnComposeOrderBy) return;
      const drop = new Set(aliases.filter(Boolean));
      setColumnComposeOrderBy((prev) => (prev || []).filter((o) => !drop.has(o.alias)));
    },
    [setColumnComposeOrderBy],
  );

  const selectColumn = useCallback(
    (columnName) => {
      if (!setColumnComposeItems || !table) return;
      setColumnComposeItems((prev) =>
        appendJoinTargetColumns(prev, { lake, joinTable: table, columnNames: [columnName] }),
      );
    },
    [lake, table, setColumnComposeItems],
  );

  const deselectColumn = useCallback(
    (columnName) => {
      if (!setColumnComposeItems || !table) return;
      const refKey = `${table}.${columnName}`;
      const victim = (columnComposeItems || []).find((i) => composeItemRefKey(i) === refKey);
      setColumnComposeItems((prev) =>
        removeJoinTargetColumns(prev, { joinTable: table, columnNames: [columnName] }),
      );
      if (victim?.alias) pruneOrderByAliases([victim.alias]);
    },
    [columnComposeItems, table, setColumnComposeItems, pruneOrderByAliases],
  );

  const selectAll = useCallback(() => {
    if (!setColumnComposeItems || !table) return;
    setColumnComposeItems((prev) => appendJoinTargetColumns(prev, { lake, joinTable: table }));
  }, [lake, table, setColumnComposeItems]);

  const deselectAll = useCallback(() => {
    if (!setColumnComposeItems || !table) return;
    const aliases = (columnComposeItems || [])
      .filter((i) => String(i?.sourceTable || "").trim().toLowerCase() === table)
      .map((i) => i.alias);
    setColumnComposeItems((prev) => removeJoinTargetColumns(prev, { joinTable: table }));
    pruneOrderByAliases(aliases);
  }, [columnComposeItems, table, setColumnComposeItems, pruneOrderByAliases]);

  if (!table || !columns.length) return null;

  return (
    <div className="mt-2 space-y-2 border-t border-border/40 pt-2">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <p className="text-[11px] font-medium text-foreground">
          Select columns from <span className="font-semibold">{table}</span>
        </p>
        <div className="flex shrink-0 items-center gap-0.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-[11px] font-normal"
            onClick={selectAll}
            disabled={allSelected}
          >
            Select all
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-[11px] font-normal"
            onClick={deselectAll}
            disabled={noneSelected}
          >
            Deselect all
          </Button>
        </div>
      </div>

      <ul role="list" className="grid grid-cols-1 items-stretch gap-1 sm:grid-cols-2">
        {columns.map((col) => {
          const isSelected = selectedSet.has(col.name);
          const displayLabel = joinTargetColumnDisplayLabel(col);
          return (
            <li key={col.name}>
              <div
                className={cn(
                  "flex w-full gap-1 rounded-md border px-2 py-1 transition-colors duration-150",
                  isSelected ? "min-h-[2.625rem] items-center border-primary/35 bg-primary/5" : "h-[2.625rem] items-start border-border/50 bg-card hover:border-border hover:bg-muted/15",
                )}
              >
                <button
                  type="button"
                  onClick={() => (isSelected ? deselectColumn(col.name) : selectColumn(col.name))}
                  aria-pressed={isSelected}
                  className={cn(
                    "flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border transition-colors",
                    isSelected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border/80 bg-background hover:border-border",
                  )}
                >
                  {isSelected ? <Check className="h-2.5 w-2.5" strokeWidth={2.5} /> : null}
                </button>
                <button
                  type="button"
                  onClick={() => !isSelected && selectColumn(col.name)}
                  title={!isSelected ? col.description || displayLabel : displayLabel}
                  className="min-w-0 flex-1 rounded-sm text-left"
                >
                  <span
                    className={cn(
                      "flex min-w-0 items-baseline gap-1.5",
                      !isSelected && "flex-col items-start gap-0",
                    )}
                  >
                    <span className="flex min-w-0 items-baseline gap-1">
                      <span className="truncate text-[11px] font-medium leading-tight text-foreground">
                        {displayLabel}
                      </span>
                      <span className="shrink-0 text-[9px] leading-tight text-muted-foreground">{col.type}</span>
                    </span>
                    {!isSelected && col.description ? (
                      <span className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-muted-foreground">
                        {col.description}
                      </span>
                    ) : null}
                  </span>
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
