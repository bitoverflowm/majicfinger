"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BUCKET_AGG_FILTER_OPERATORS } from "@/lib/sheetOperations/bucketAggFilterOperators";
import { BUCKET_TIME_INTERVALS } from "@/lib/sheetOperations/bucketTimeIntervals";
import { formatBucketNumber } from "@/lib/sheetOperations/aggregateBucketRows";
import { niceBucketSize } from "@/lib/sheetOperations/niceBucketSize";
import { cn } from "@/lib/utils";

const APPLY_FIELD_ERROR_CLASS = "border-destructive focus-visible:ring-destructive/40";

/** Explicit colors so labels stay readable when theme tokens under-contrast on dark surfaces. */
const FIELD_LABEL = "text-xs font-medium text-foreground";
const FIELD_HINT = "text-[10px] leading-snug text-muted-foreground dark:text-slate-400";
const FIELD_SUBLABEL = "text-[10px] font-medium text-foreground/80 dark:text-slate-300";
const CHECK_LABEL = "truncate font-mono text-xs text-foreground";

const EMPTY_PROFILE = {
  isNumeric: true,
  isTemporal: true,
  min: null,
  max: null,
  suggestedSize: 1,
};

/**
 * Controlled form for sheet/research-tool bucketing (same fields as Stats → Bucket).
 *
 * @param {{
 *   columnNames: string[];
 *   tab: object;
 *   onTabChange: (patch: Record<string, unknown>) => void;
 *   fieldErrors?: Record<string, string>;
 *   columnProfile?: {
 *     isNumeric?: boolean;
 *     isTemporal?: boolean;
 *     min?: number | null;
 *     max?: number | null;
 *     suggestedSize?: number;
 *   } | null;
 *   showCreatesSheetAlert?: boolean;
 *   showSheetName?: boolean;
 *   className?: string;
 * }} props
 */
export function SheetBucketConfigForm({
  columnNames = [],
  tab,
  onTabChange,
  fieldErrors = {},
  columnProfile = null,
  showCreatesSheetAlert = true,
  showSheetName = true,
  className,
}) {
  const profile = columnProfile || EMPTY_PROFILE;
  const bucketColumn = String(tab?.bucketColumn || "").trim();
  const bucketOutputColumn = String(tab?.bucketOutputColumn || "bucket").trim();
  const bucketMode = tab?.bucketMode || "category";
  const aggregations = Array.isArray(tab?.aggregations) ? tab.aggregations : [];
  const groupByCols = new Set(
    (Array.isArray(tab?.groupByColumns) ? tab.groupByColumns : []).map((c) => String(c || "").trim()).filter(Boolean),
  );
  const passthroughCols = new Set(
    (Array.isArray(tab?.passthroughColumns) ? tab.passthroughColumns : [])
      .map((c) => String(c || "").trim())
      .filter(Boolean),
  );

  const updateAggregation = (id, patch) => {
    onTabChange({
      aggregations: aggregations.map((agg) => (agg.id === id ? { ...agg, ...patch } : agg)),
    });
  };

  const addAggregation = () => {
    const id = `bucket-agg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    onTabChange({
      aggregations: [
        ...aggregations,
        {
          id,
          type: "count",
          valueColumn: "",
          weightColumn: "",
          denominatorColumn: "",
          outputColumn: "count",
          filterEnabled: false,
          filterColumn: "",
          filterOperator: "=",
          filterValue: "",
        },
      ],
    });
  };

  const removeAggregation = (id) => {
    if (aggregations.length <= 1) return;
    onTabChange({ aggregations: aggregations.filter((agg) => agg.id !== id) });
  };

  const toggleGroupBy = (column) => {
    const next = new Set(groupByCols);
    if (next.has(column)) next.delete(column);
    else next.add(column);
    onTabChange({ groupByColumns: Array.from(next) });
  };

  const togglePassthrough = (column) => {
    const next = new Set(passthroughCols);
    if (next.has(column)) next.delete(column);
    else next.add(column);
    onTabChange({ passthroughColumns: Array.from(next) });
  };

  return (
    <div className={cn("space-y-3", className)}>
      {showCreatesSheetAlert ? (
        <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 dark:border-slate-700 dark:bg-slate-900/80">
          <p className="text-xs font-medium text-foreground">Bucket creates a new sheet</p>
          <p className={cn(FIELD_HINT, "mt-1")}>
            This groups the query result into bucket rows after your pull. The original result sheet will not be changed.
          </p>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label className={FIELD_LABEL}>Column to bucket</Label>
          <Select
            value={bucketColumn || "__"}
            onValueChange={(v) => {
              const next = v === "__" ? "" : v;
              onTabChange({
                bucketColumn: next,
                bucketOutputColumn:
                  String(tab?.bucketOutputColumn || "").trim() && tab.bucketOutputColumn !== "bucket"
                    ? tab.bucketOutputColumn
                    : next || "bucket",
                numericBucketSize: "",
              });
            }}
          >
            <SelectTrigger
              className={cn("h-9 text-xs", fieldErrors.bucketColumn && APPLY_FIELD_ERROR_CLASS)}
            >
              <SelectValue placeholder="Select bucket column" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__">—</SelectItem>
              {columnNames.map((c) => (
                <SelectItem key={`bucket-col-${c}`} value={c} className="font-mono text-xs">
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {fieldErrors.bucketColumn ? (
            <p className="text-[10px] text-destructive">{fieldErrors.bucketColumn}</p>
          ) : null}
        </div>
        <div className="space-y-1">
          <Label className={FIELD_LABEL}>New bucket column name</Label>
          <Input
            className={cn("h-9 text-xs", fieldErrors.bucketOutputColumn && APPLY_FIELD_ERROR_CLASS)}
            value={tab?.bucketOutputColumn ?? "bucket"}
            onChange={(e) => onTabChange({ bucketOutputColumn: e.target.value })}
            placeholder={bucketColumn || "bucket"}
            spellCheck={false}
          />
        </div>
      </div>

      {bucketColumn ? (
        <div className="space-y-2 rounded-md border border-border/70 p-2 dark:border-slate-700">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className={FIELD_LABEL}>Bucket style</Label>
              <Select
                value={bucketMode}
                onValueChange={(v) => onTabChange({ bucketMode: v })}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="category">Exact values</SelectItem>
                  <SelectItem value="number" disabled={columnProfile ? !profile.isNumeric : false}>
                    Numeric ranges
                  </SelectItem>
                  <SelectItem value="time" disabled={columnProfile ? !profile.isTemporal : false}>
                    Time intervals
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className={FIELD_HINT}>
                {profile.isTemporal && columnProfile
                  ? "Detected as time-like. Choose the time window."
                  : profile.isNumeric && columnProfile
                    ? profile.min != null && profile.max != null
                      ? `Detected numeric range ${formatBucketNumber(profile.min)} to ${formatBucketNumber(profile.max)}.`
                      : "Detected as numeric. Choose a range size."
                    : "Buckets will use each distinct value."}
              </p>
            </div>
            {bucketMode === "time" ? (
              <div className="space-y-1">
                <Label className={FIELD_LABEL}>Time bucket</Label>
                <Select
                  value={tab?.timeInterval || "day"}
                  onValueChange={(v) => onTabChange({ timeInterval: v })}
                >
                  <SelectTrigger
                    className={cn("h-9 text-xs", fieldErrors.timeInterval && APPLY_FIELD_ERROR_CLASS)}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BUCKET_TIME_INTERVALS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : bucketMode === "number" ? (
              <div className="space-y-1">
                <Label className={FIELD_LABEL}>Range size</Label>
                <div className="flex gap-2">
                  <Input
                    className={cn(
                      "h-9 min-w-0 text-xs",
                      fieldErrors.numericBucketSize && APPLY_FIELD_ERROR_CLASS,
                    )}
                    inputMode="decimal"
                    value={tab?.numericBucketSize ?? ""}
                    onChange={(e) =>
                      onTabChange({ numericBucketSize: e.target.value.replace(/[^0-9.\-]/g, "") })
                    }
                    placeholder={String(profile.suggestedSize || 1)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 shrink-0 text-xs"
                    onClick={() => {
                      const curr = Number(tab?.numericBucketSize) || profile.suggestedSize || 1;
                      onTabChange({ numericBucketSize: String(niceBucketSize(curr / 2)) });
                    }}
                  >
                    More granular
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 shrink-0 text-xs"
                    onClick={() => {
                      const curr = Number(tab?.numericBucketSize) || profile.suggestedSize || 1;
                      onTabChange({ numericBucketSize: String(niceBucketSize(curr * 2)) });
                    }}
                  >
                    Wider
                  </Button>
                </div>
                <p className={FIELD_HINT}>
                  Suggested: {formatBucketNumber(profile.suggestedSize)} per bucket.
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                <Label className={FIELD_LABEL}>Exact value buckets</Label>
                <div className="rounded-md border border-border/60 bg-muted/20 px-2 py-2 text-xs text-foreground dark:border-slate-700 dark:text-slate-300">
                  One output row per distinct {bucketColumn} value.
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}

      <div className="space-y-2">
        <Label className={FIELD_LABEL}>Additional group by columns</Label>
        <p className={FIELD_HINT}>
          Group rows by these columns in addition to the bucket. Each unique combination gets its own
          output rows and aggregations.
        </p>
        <div className="grid max-h-32 gap-2 overflow-auto rounded-md border border-border/70 p-2 dark:border-slate-700 sm:grid-cols-2">
          {columnNames
            .filter((col) => col !== bucketColumn && col !== bucketOutputColumn)
            .map((col) => (
              <label key={`bucket-group-${col}`} className="flex min-w-0 items-center gap-2 text-xs">
                <Checkbox checked={groupByCols.has(col)} onCheckedChange={() => toggleGroupBy(col)} />
                <span className={CHECK_LABEL}>{col}</span>
              </label>
            ))}
          {!columnNames.length ? (
            <p className={FIELD_HINT}>Select columns in your query first.</p>
          ) : null}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Label className={FIELD_LABEL}>Aggregations</Label>
          <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={addAggregation}>
            + Add aggregation
          </Button>
        </div>
        <div className="space-y-2">
          {aggregations.map((agg, idx) => (
            <div key={agg.id} className="rounded-lg border border-border/70 p-2 dark:border-slate-700">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-foreground/70 dark:text-slate-400">
                  Aggregation {idx + 1}
                </span>
                {aggregations.length > 1 ? (
                  <button
                    type="button"
                    className="inline-flex h-2 w-2 rounded-full bg-red-500 hover:bg-red-600"
                    aria-label={`Remove aggregation ${idx + 1}`}
                    onClick={() => removeAggregation(agg.id)}
                  />
                ) : null}
              </div>
              <div className="grid gap-2 sm:grid-cols-4">
                <div className="space-y-1">
                  <Label className={FIELD_SUBLABEL}>Type</Label>
                  <Select
                    value={agg.type}
                    onValueChange={(v) => {
                      const baseName =
                        v === "subgroup_by"
                          ? agg.valueColumn || "subgroup"
                          : v === "weighted_average"
                            ? "weighted_avg"
                            : v === "product_ratio"
                              ? "VWAP_price"
                              : v === "average"
                                ? "avg"
                                : v === "count_distinct"
                                  ? "distinct_count"
                                  : v === "conditional_rate"
                                    ? "rate"
                                    : v === "conditional_count"
                                      ? "conditional_count"
                                      : v === "std_dev"
                                        ? "std_dev"
                                        : v;
                      updateAggregation(agg.id, {
                        type: v,
                        outputColumn: agg.outputColumn || baseName,
                        ...(["conditional_count", "conditional_rate"].includes(v)
                          ? {
                              filterEnabled: true,
                              filterColumn: agg.filterColumn || columnNames[0] || "",
                              filterOperator: agg.filterOperator || "=",
                            }
                          : null),
                      });
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="count">Count rows</SelectItem>
                      <SelectItem value="count_distinct">Count distinct</SelectItem>
                      <SelectItem value="average">Mean</SelectItem>
                      <SelectItem value="median">Median</SelectItem>
                      <SelectItem value="sum">Sum</SelectItem>
                      <SelectItem value="min">Min</SelectItem>
                      <SelectItem value="max">Max</SelectItem>
                      <SelectItem value="std_dev">Standard deviation</SelectItem>
                      <SelectItem value="conditional_count">Conditional count</SelectItem>
                      <SelectItem value="conditional_rate">Conditional rate</SelectItem>
                      <SelectItem value="weighted_average">Value weighted avg</SelectItem>
                      <SelectItem value="product_ratio">SUM(A * B) / aggregation</SelectItem>
                      <SelectItem value="subgroup_by">Sub-group by (legacy)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className={FIELD_SUBLABEL}>
                    {agg.type === "subgroup_by"
                      ? "Sub-group column"
                      : agg.type === "count"
                        ? "Count column (optional)"
                        : ["conditional_count", "conditional_rate"].includes(agg.type)
                          ? "Condition column"
                          : "Value column"}
                  </Label>
                  <Select
                    value={
                      agg.type === "count"
                        ? agg.valueColumn || "__rows__"
                        : ["conditional_count", "conditional_rate"].includes(agg.type)
                          ? agg.filterColumn || "__"
                          : agg.valueColumn || "__"
                    }
                    onValueChange={(v) => {
                      const col = v === "__rows__" || v === "__" ? "" : v;
                      if (["conditional_count", "conditional_rate"].includes(agg.type)) {
                        updateAggregation(agg.id, { filterColumn: col, filterEnabled: true });
                        return;
                      }
                      updateAggregation(agg.id, {
                        valueColumn: col,
                        ...(agg.type === "subgroup_by"
                          ? { outputColumn: agg.outputColumn || col || "subgroup" }
                          : null),
                      });
                    }}
                  >
                    <SelectTrigger
                      className={cn(
                        "h-8 text-xs",
                        fieldErrors[
                          ["conditional_count", "conditional_rate"].includes(agg.type)
                            ? `agg.${agg.id}.filterColumn`
                            : `agg.${agg.id}.valueColumn`
                        ] && APPLY_FIELD_ERROR_CLASS,
                      )}
                    >
                      <SelectValue placeholder="Column" />
                    </SelectTrigger>
                    <SelectContent>
                      {agg.type === "count" ? (
                        <SelectItem value="__rows__">Rows in bucket</SelectItem>
                      ) : null}
                      {agg.type !== "count" &&
                      !["conditional_count", "conditional_rate"].includes(agg.type) ? (
                        <SelectItem value="__">—</SelectItem>
                      ) : null}
                      {columnNames.map((c) => (
                        <SelectItem
                          key={`bucket-agg-val-${agg.id}-${c}`}
                          value={c}
                          className="font-mono text-xs"
                        >
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {agg.type === "weighted_average" || agg.type === "product_ratio" ? (
                  <div className="space-y-1">
                    <Label className={FIELD_SUBLABEL}>
                      {agg.type === "product_ratio" ? "Multiplier column" : "Weight column"}
                    </Label>
                    <Select
                      value={agg.weightColumn || "__"}
                      onValueChange={(v) =>
                        updateAggregation(agg.id, { weightColumn: v === "__" ? "" : v })
                      }
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Weight" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__">—</SelectItem>
                        {columnNames.map((c) => (
                          <SelectItem
                            key={`bucket-agg-weight-${agg.id}-${c}`}
                            value={c}
                            className="font-mono text-xs"
                          >
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="hidden sm:block" />
                )}
                <div className="space-y-1">
                  <Label className={FIELD_SUBLABEL}>Generated column</Label>
                  <Input
                    className={cn(
                      "h-8 text-xs",
                      fieldErrors[`agg.${agg.id}.outputColumn`] && APPLY_FIELD_ERROR_CLASS,
                    )}
                    value={agg.outputColumn}
                    onChange={(e) => updateAggregation(agg.id, { outputColumn: e.target.value })}
                    placeholder={agg.type === "weighted_average" ? "weighted_avg" : agg.type}
                    spellCheck={false}
                  />
                </div>
              </div>

              {agg.type === "product_ratio" ? (
                <div className="mt-2 space-y-1 rounded-md border border-border/50 bg-muted/10 p-2">
                  <Label className={FIELD_SUBLABEL}>
                    Divide by generated aggregation
                  </Label>
                  <Select
                    value={agg.denominatorColumn || "__"}
                    onValueChange={(v) =>
                      updateAggregation(agg.id, { denominatorColumn: v === "__" ? "" : v })
                    }
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Select denominator" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__">—</SelectItem>
                      {aggregations
                        .filter((other, otherIdx) => otherIdx < idx && other.outputColumn)
                        .map((other, otherIdx) => (
                          <SelectItem
                            key={`bucket-agg-denom-${agg.id}-${other.id}`}
                            value={other.outputColumn}
                          >
                            {`Aggregation ${otherIdx + 1}: ${other.outputColumn}`}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <p className={FIELD_HINT}>
                    Example: SUM(yes_price * volume) / total_volume = VWAP_price.
                  </p>
                </div>
              ) : null}

              {agg.type !== "subgroup_by" &&
              !["conditional_count", "conditional_rate"].includes(agg.type) ? (
                <div className="mt-2 space-y-2 rounded-md border border-border/50 bg-muted/10 p-2">
                  <label className="flex items-center gap-2 text-xs">
                    <Checkbox
                      checked={!!agg.filterEnabled}
                      onCheckedChange={(checked) =>
                        updateAggregation(agg.id, {
                          filterEnabled: !!checked,
                          filterColumn: agg.filterColumn || columnNames[0] || "",
                          filterOperator: agg.filterOperator || "=",
                        })
                      }
                    />
                    <span className="text-xs text-foreground">Where condition for this aggregation</span>
                  </label>
                  {agg.filterEnabled ? (
                    <div className="grid gap-2 sm:grid-cols-[1fr_0.7fr_1fr]">
                      <div className="space-y-1">
                        <Label className={FIELD_SUBLABEL}>Where column</Label>
                        <Select
                          value={agg.filterColumn || "__"}
                          onValueChange={(v) =>
                            updateAggregation(agg.id, { filterColumn: v === "__" ? "" : v })
                          }
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Column" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__">—</SelectItem>
                            {columnNames.map((c) => (
                              <SelectItem
                                key={`bucket-agg-filter-col-${agg.id}-${c}`}
                                value={c}
                                className="font-mono text-xs"
                              >
                                {c}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className={FIELD_SUBLABEL}>Op</Label>
                        <Select
                          value={agg.filterOperator || "="}
                          onValueChange={(v) => updateAggregation(agg.id, { filterOperator: v })}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {BUCKET_AGG_FILTER_OPERATORS.map((op) => (
                              <SelectItem key={op.value} value={op.value}>
                                {op.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className={FIELD_SUBLABEL}>Value</Label>
                        <Input
                          className="h-8 text-xs"
                          value={agg.filterValue ?? ""}
                          onChange={(e) => updateAggregation(agg.id, { filterValue: e.target.value })}
                          placeholder="e.g. 100"
                          disabled={["is_empty", "is_not_empty"].includes(agg.filterOperator)}
                        />
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : agg.type === "subgroup_by" ? (
                <p className="mt-2 text-[10px] text-muted-foreground">
                  Nests rows within each bucket by this column. Prefer &quot;Additional group by
                  columns&quot; above for new workflows.
                </p>
              ) : (
                <div className="mt-2 space-y-2 rounded-md border border-border/50 bg-muted/10 p-2">
                  <div className="grid gap-2 sm:grid-cols-[0.7fr_1fr]">
                    <div className="space-y-1">
                      <Label className={FIELD_SUBLABEL}>Op</Label>
                      <Select
                        value={agg.filterOperator || "="}
                        onValueChange={(v) =>
                          updateAggregation(agg.id, { filterOperator: v, filterEnabled: true })
                        }
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {BUCKET_AGG_FILTER_OPERATORS.map((op) => (
                            <SelectItem key={op.value} value={op.value}>
                              {op.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className={FIELD_SUBLABEL}>Value</Label>
                      <Input
                        className={cn(
                          "h-8 text-xs",
                          fieldErrors[`agg.${agg.id}.filterValue`] && APPLY_FIELD_ERROR_CLASS,
                        )}
                        value={agg.filterValue ?? ""}
                        onChange={(e) =>
                          updateAggregation(agg.id, {
                            filterValue: e.target.value,
                            filterEnabled: true,
                          })
                        }
                        placeholder="e.g. yes"
                        disabled={["is_empty", "is_not_empty"].includes(agg.filterOperator)}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label className={FIELD_LABEL}>Transfer columns as-is</Label>
        <p className={FIELD_HINT}>
          These values are copied from the first row in each group. Use this for labels that are
          stable inside a bucket. This is not the same as group by.
        </p>
        <div className="grid max-h-32 gap-2 overflow-auto rounded-md border border-border/70 p-2 dark:border-slate-700 sm:grid-cols-2">
          {columnNames
            .filter(
              (col) =>
                col !== bucketColumn && col !== bucketOutputColumn && !groupByCols.has(col),
            )
            .map((col) => (
              <label key={`bucket-pass-${col}`} className="flex min-w-0 items-center gap-2 text-xs">
                <Checkbox
                  checked={passthroughCols.has(col)}
                  onCheckedChange={() => togglePassthrough(col)}
                />
                <span className={CHECK_LABEL}>{col}</span>
              </label>
            ))}
        </div>
      </div>

      {showSheetName ? (
        <div className="space-y-1">
          <Label className={FIELD_LABEL}>New sheet name</Label>
          <Input
            className={cn("h-9 text-xs", fieldErrors.sheetName && APPLY_FIELD_ERROR_CLASS)}
            value={tab?.sheetName ?? ""}
            onChange={(e) => onTabChange({ sheetName: e.target.value })}
            placeholder="Bucketed sheet"
            spellCheck={false}
          />
          {fieldErrors.sheetName ? (
            <p className="text-[10px] text-destructive">{fieldErrors.sheetName}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
