"use client";

import { useCallback, useEffect } from "react";

import { genComposeRowId } from "@/lib/dataLakeComposeHelpers";

/**
 * Mirror Connect home column checkboxes into shared dataLakeColumnComposeItems
 * (sort / summarize / where / pull) — same behavior as DataLakeParquetPanel.
 */
export function useSyncConnectKalshiComposeItems({
  connectDataLakeSampleId,
  connectKalshiColumnSelections,
  setColumnComposeItems,
  typesByName,
}) {
  const isDateLikeName = useCallback((name) => {
    return /(^timestamp$)|(_at$)|(_time$)|(^created_)|(_date$)|date|time/i.test(String(name || ""));
  }, []);

  useEffect(() => {
    if (!connectDataLakeSampleId || !setColumnComposeItems) return;
    const cols = connectKalshiColumnSelections?.[connectDataLakeSampleId];
    if (!Array.isArray(cols)) return;

    setColumnComposeItems((prev) => {
      const prevRows = prev || [];
      const prevCols = new Set(prevRows.map((i) => i.column));
      if (prevRows.length === cols.length && cols.every((c) => prevCols.has(c))) {
        return prevRows;
      }
      return cols.map((col) => {
        const existing = prevRows.find((i) => i.column === col);
        if (existing) return existing;
        const t = String(typesByName[col] || "").toLowerCase();
        const isDate = (t === "bigint" || t === "int") && isDateLikeName(col);
        return {
          id: genComposeRowId(),
          column: col,
          alias: col,
          aggregate: null,
          dateBucket: null,
          dateFormat: null,
          stringBucket: null,
          numberBucket: null,
          numberScale: "none",
          decimals: null,
          treatAsDate: isDate,
          sumCase: { enabled: false, branches: [], elseColumn: "" },
          equation: { enabled: false },
        };
      });
    });
  }, [
    connectDataLakeSampleId,
    connectKalshiColumnSelections,
    typesByName,
    isDateLikeName,
    setColumnComposeItems,
  ]);
}
