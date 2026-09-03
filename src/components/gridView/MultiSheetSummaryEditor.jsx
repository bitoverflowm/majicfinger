"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  collectMultiSheetColumnUnion,
  createEmptyMultiSheetMetric,
  MULTI_SHEET_SUMMARY_OPS,
  normalizeMultiSheetSummaryConfig,
  sheetsMissingColumn,
} from "@/lib/sheetOperations/computeMultiSheetSummary";

const AGG_OPS = [
  { value: "count_rows", label: "Count rows (sheet)" },
  { value: "avg", label: "Average / mean" },
  { value: "stdev", label: "Standard deviation" },
  { value: "sum", label: "Sum" },
  { value: "min", label: "Min" },
  { value: "max", label: "Max" },
  { value: "count", label: "Count (non-empty cells)" },
  { value: "count_distinct", label: "Count distinct" },
  { value: "median", label: "Median" },
];

/**
 * @param {object | null | undefined} raw
 * @returns {object}
 */
export function createInitialMultiSheetSummaryDraft(raw) {
  const cfg = normalizeMultiSheetSummaryConfig(raw);
  return {
    sourceSheetIds: cfg.sourceSheetIds,
    metrics: cfg.metrics.length ? cfg.metrics : [],
    resultSheetId: cfg.resultSheetId,
  };
}

/**
 * @param {{
 *   draft: object;
 *   onChange: (next: object) => void;
 *   dataSheets: Record<string, object> | null | undefined;
 * }} props
 */
export function MultiSheetSummaryEditor({ draft, onChange, dataSheets }) {
  const sheets = dataSheets && typeof dataSheets === "object" ? dataSheets : {};
  const sheetEntries = useMemo(
    () =>
      Object.entries(sheets)
        .filter(([, s]) => Array.isArray(s?.data) && s.data.length > 0)
        .sort((a, b) => String(a[1]?.name || a[0]).localeCompare(String(b[1]?.name || b[0]))),
    [sheets],
  );

  const selectedIds = Array.isArray(draft?.sourceSheetIds) ? draft.sourceSheetIds : [];
  const selectedSet = useMemo(() => new Set(selectedIds.map(String)), [selectedIds]);
  const metrics = Array.isArray(draft?.metrics) ? draft.metrics : [];

  const columnUnion = useMemo(
    () => collectMultiSheetColumnUnion(sheets, selectedIds),
    [sheets, selectedIds],
  );

  const setDraft = (patch) => {
    onChange?.({
      sourceSheetIds: selectedIds,
      metrics,
      resultSheetId: draft?.resultSheetId ?? null,
      ...patch,
    });
  };

  const toggleSheet = (sid, checked) => {
    const next = new Set(selectedSet);
    if (checked) next.add(sid);
    else next.delete(sid);
    setDraft({ sourceSheetIds: [...next] });
  };

  const updateMetric = (idx, patch) => {
    const next = metrics.map((m, i) => (i === idx ? { ...m, ...patch } : m));
    setDraft({ metrics: next });
  };

  const removeMetric = (idx) => {
    setDraft({ metrics: metrics.filter((_, i) => i !== idx) });
  };

  const addMetric = () => {
    setDraft({ metrics: [...metrics, createEmptyMultiSheetMetric()] });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-xs">Sheets involved</Label>
        <p className="text-[10px] leading-snug text-muted-foreground">
          One output row is created per selected sheet. Metrics use the same column name on each sheet.
        </p>
        <div className="max-h-36 space-y-1 overflow-y-auto rounded-md border border-border/60 bg-muted/10 p-2">
          {sheetEntries.length === 0 ? (
            <p className="text-[10px] text-muted-foreground">No sheets with data</p>
          ) : (
            sheetEntries.map(([sid, sheet]) => {
              const n = Array.isArray(sheet?.data) ? sheet.data.length : 0;
              return (
                <label key={`mss-sheet-${sid}`} className="flex items-center gap-2 text-xs">
                  <Checkbox
                    checked={selectedSet.has(sid)}
                    onCheckedChange={(checked) => toggleSheet(sid, !!checked)}
                  />
                  <span className="min-w-0 flex-1 truncate font-medium">{sheet?.name || sid}</span>
                  <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                    {n.toLocaleString()} rows
                  </span>
                </label>
              );
            })
          )}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Label className="text-xs">Summary columns</Label>
          <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={addMetric}>
            + Add column
          </Button>
        </div>
        {metrics.length === 0 ? (
          <p className="text-[10px] text-muted-foreground">
            Add columns such as sample size (count rows), sample mean (average of volume), etc.
          </p>
        ) : null}
        <div className="space-y-2">
          {metrics.map((metric, idx) => {
            const needsColumn = metric.op !== "count_rows";
            const missing = needsColumn && metric.column
              ? sheetsMissingColumn(sheets, selectedIds, metric.column)
              : [];
            return (
              <div
                key={metric.id || `mss-m-${idx}`}
                className="space-y-2 rounded-md border border-border/60 bg-background/60 p-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Column {idx + 1}
                  </p>
                  <button
                    type="button"
                    className="text-[10px] text-muted-foreground hover:text-destructive"
                    onClick={() => removeMetric(idx)}
                  >
                    Remove
                  </button>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Label</Label>
                    <Input
                      className="h-8 text-xs"
                      value={metric.outputName || ""}
                      placeholder="e.g. sample mean"
                      onChange={(e) => updateMetric(idx, { outputName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Operation</Label>
                    <Select
                      value={MULTI_SHEET_SUMMARY_OPS.includes(metric.op) ? metric.op : "avg"}
                      onValueChange={(v) =>
                        updateMetric(idx, {
                          op: v,
                          column: v === "count_rows" ? null : metric.column,
                        })
                      }
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {AGG_OPS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value} className="text-xs">
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {needsColumn ? (
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Source column (on each sheet)</Label>
                    <Select
                      value={metric.column || "__"}
                      onValueChange={(v) => updateMetric(idx, { column: v === "__" ? null : v })}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Column" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__" className="text-xs">
                          —
                        </SelectItem>
                        {columnUnion.map((c) => (
                          <SelectItem key={`mss-col-${c}`} value={c} className="font-mono text-xs">
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {missing.length > 0 ? (
                      <p className="text-[10px] text-amber-700 dark:text-amber-300">
                        Missing on {missing.length} sheet
                        {missing.length === 1 ? "" : "s"} — those cells will be empty.
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <p className="text-[10px] text-muted-foreground">
                    Counts every data row on the sheet (no column needed).
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground">
        Preview: {selectedIds.length} sheet{selectedIds.length === 1 ? "" : "s"} × {metrics.length}{" "}
        metric{metrics.length === 1 ? "" : "s"} → {selectedIds.length} row
        {selectedIds.length === 1 ? "" : "s"} (plus sheet / source_sheet_id).
      </p>
    </div>
  );
}
