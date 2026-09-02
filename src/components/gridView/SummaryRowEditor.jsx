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
  createEmptySummaryMetric,
  formatSummaryMetricPreview,
  normalizeSummaryConfig,
} from "@/lib/sheetOperations/computeSummaryRow";

const AGG_OPS = [
  { value: "sum", label: "Sum" },
  { value: "avg", label: "Average / mean" },
  { value: "min", label: "Min" },
  { value: "max", label: "Max" },
  { value: "count", label: "Count" },
  { value: "count_distinct", label: "Count distinct" },
  { value: "median", label: "Median" },
  { value: "stdev", label: "Standard deviation" },
  { value: "binary", label: "Binary of aggregates (A ±×÷ B)" },
  { value: "if_else", label: "If / else between aggregates" },
];

const SCOPES = [
  { value: "column", label: "Single column (over rows)" },
  { value: "columns", label: "Series of columns (row reduce → aggregate)" },
  { value: "row_series", label: "Row series (same as multi-column)" },
];

const BINARY_OPS = [
  { value: "add", label: "Add (+)" },
  { value: "subtract", label: "Subtract (−)" },
  { value: "multiply", label: "Multiply (×)" },
  { value: "divide", label: "Divide (÷)" },
];

function MetricColumnPicker({ columns, selected, onChange, multi }) {
  const selectedSet = useMemo(() => new Set(selected || []), [selected]);
  if (!multi) {
    return (
      <Select
        value={(selected && selected[0]) || "__"}
        onValueChange={(v) => onChange(v === "__" ? [] : [v])}
      >
        <SelectTrigger className="h-8 text-xs">
          <SelectValue placeholder="Column" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__">—</SelectItem>
          {(columns || []).map((c) => (
            <SelectItem key={`sum-col-${c}`} value={c} className="font-mono text-xs">
              {c}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }
  return (
    <div className="max-h-28 space-y-1 overflow-y-auto rounded-md border border-border/60 bg-muted/10 p-2">
      {(columns || []).length === 0 ? (
        <p className="text-[10px] text-muted-foreground">No columns</p>
      ) : (
        (columns || []).map((c) => (
          <label key={`sum-mcol-${c}`} className="flex items-center gap-2 text-xs font-mono">
            <Checkbox
              checked={selectedSet.has(c)}
              onCheckedChange={(checked) => {
                const next = new Set(selectedSet);
                if (checked) next.add(c);
                else next.delete(c);
                onChange(Array.from(next));
              }}
            />
            <span className="truncate">{c}</span>
          </label>
        ))
      )}
    </div>
  );
}

function WhereEditor({ where, columns, onChange }) {
  const enabled = !!where?.enabled;
  const clauses = Array.isArray(where?.clauses) ? where.clauses : [];
  const clause = clauses[0] || {
    condition: { leftColumn: "", operator: "=", rightKind: "raw", rightColumn: "", rightValue: "" },
  };
  const condition = clause.condition || {};

  return (
    <div className="space-y-2 rounded-md border border-border/50 bg-muted/10 p-2">
      <label className="flex items-center gap-2 text-xs">
        <Checkbox
          checked={enabled}
          onCheckedChange={(checked) =>
            onChange({
              enabled: !!checked,
              clauses: [
                {
                  condition: {
                    leftColumn: condition.leftColumn || columns[0] || "",
                    operator: condition.operator || "=",
                    rightKind: condition.rightKind || "raw",
                    rightColumn: condition.rightColumn || "",
                    rightValue: condition.rightValue || "",
                  },
                },
              ],
            })
          }
        />
        <span>Where condition (filter rows before aggregate)</span>
      </label>
      {enabled ? (
        <div className="grid gap-2 sm:grid-cols-[1.1fr_0.7fr_0.8fr_1.1fr]">
          <Select
            value={condition.leftColumn || "__"}
            onValueChange={(v) =>
              onChange({
                enabled: true,
                clauses: [{ condition: { ...condition, leftColumn: v === "__" ? "" : v } }],
              })
            }
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Column" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__">—</SelectItem>
              {columns.map((c) => (
                <SelectItem key={`where-l-${c}`} value={c} className="font-mono text-xs">
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={condition.operator || "="}
            onValueChange={(v) =>
              onChange({
                enabled: true,
                clauses: [{ condition: { ...condition, operator: v } }],
              })
            }
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="=">=</SelectItem>
              <SelectItem value="!=">≠</SelectItem>
              <SelectItem value=">">&gt;</SelectItem>
              <SelectItem value=">=">&gt;=</SelectItem>
              <SelectItem value="<">&lt;</SelectItem>
              <SelectItem value="<=">&lt;=</SelectItem>
              <SelectItem value="contains">contains</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={condition.rightKind || "raw"}
            onValueChange={(v) =>
              onChange({
                enabled: true,
                clauses: [{ condition: { ...condition, rightKind: v } }],
              })
            }
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="raw">Raw</SelectItem>
              <SelectItem value="column">Column</SelectItem>
            </SelectContent>
          </Select>
          {condition.rightKind === "column" ? (
            <Select
              value={condition.rightColumn || "__"}
              onValueChange={(v) =>
                onChange({
                  enabled: true,
                  clauses: [{ condition: { ...condition, rightColumn: v === "__" ? "" : v } }],
                })
              }
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Column" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__">—</SelectItem>
                {columns.map((c) => (
                  <SelectItem key={`where-r-${c}`} value={c} className="font-mono text-xs">
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              className="h-8 text-xs"
              value={condition.rightValue ?? ""}
              onChange={(e) =>
                onChange({
                  enabled: true,
                  clauses: [{ condition: { ...condition, rightValue: e.target.value } }],
                })
              }
              placeholder="Value"
            />
          )}
        </div>
      ) : null}
    </div>
  );
}

/**
 * @param {{
 *   draft: object;
 *   onChange: (next: object) => void;
 *   columnNames: string[];
 * }} props
 */
export function SummaryRowEditor({ draft, onChange, columnNames }) {
  const config = normalizeSummaryConfig(draft);
  const columns = Array.isArray(columnNames) ? columnNames : [];

  const update = (patch) => onChange({ ...config, ...patch });
  const updateMetric = (id, patch) => {
    update({
      metrics: config.metrics.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    });
  };
  const removeMetric = (id) => {
    update({ metrics: config.metrics.filter((m) => m.id !== id) });
  };
  const addMetric = () => {
    const m = createEmptySummaryMetric();
    if (columns[0]) m.columns = [columns[0]];
    m.outputName = columns[0] ? `Total ${columns[0]}` : "";
    update({ metrics: [...config.metrics, m] });
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label className="text-xs">Destination</Label>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            className="h-8 text-xs"
            variant={config.destination === "this_view" ? "default" : "outline"}
            onClick={() => update({ destination: "this_view" })}
          >
            Add to this view
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-8 text-xs"
            variant={config.destination === "new_sheet" ? "default" : "outline"}
            onClick={() => update({ destination: "new_sheet" })}
          >
            Create new sheet
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground">
          {config.destination === "this_view"
            ? "Shows a reactive summary row under the current sheet. Metrics are available as named values in later math."
            : "Writes a 1-row summary sheet that stays in sync when the source sheet changes."}
        </p>
      </div>

      <div className="flex items-center justify-between gap-2">
        <Label className="text-xs">Metrics</Label>
        <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={addMetric}>
          + Metric
        </Button>
      </div>

      {config.metrics.length === 0 ? (
        <p className="rounded-md border border-dashed border-border/70 px-3 py-4 text-center text-xs text-muted-foreground">
          Add metrics such as SUM(Market_count) → &quot;Total Market Count&quot;.
        </p>
      ) : null}

      {config.metrics.map((metric, idx) => {
        const multi = metric.scope === "columns" || metric.scope === "row_series";
        const showScope = metric.op !== "binary" && metric.op !== "if_else";
        return (
          <div key={metric.id} className="space-y-2 rounded-lg border border-border/70 p-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Metric {idx + 1}
              </span>
              <button
                type="button"
                className="inline-flex h-2 w-2 items-center justify-center rounded-full bg-red-500 hover:bg-red-600"
                aria-label={`Remove metric ${idx + 1}`}
                onClick={() => removeMetric(metric.id)}
              />
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Operation</Label>
                <Select value={metric.op} onValueChange={(v) => updateMetric(metric.id, { op: v })}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AGG_OPS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Output column name</Label>
                <Input
                  className="h-8 text-xs"
                  value={metric.outputName}
                  onChange={(e) => updateMetric(metric.id, { outputName: e.target.value })}
                  placeholder="Total Market Count"
                  spellCheck={false}
                />
              </div>
            </div>

            {showScope ? (
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Scope</Label>
                <Select value={metric.scope} onValueChange={(v) => updateMetric(metric.id, { scope: v })}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SCOPES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            {metric.op !== "if_else" && metric.op !== "binary" ? (
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">
                  {multi ? "Columns" : "Column"}
                </Label>
                <MetricColumnPicker
                  columns={columns}
                  selected={metric.columns}
                  multi={multi}
                  onChange={(cols) => updateMetric(metric.id, { columns: cols })}
                />
              </div>
            ) : null}

            {metric.op === "binary" ? (
              <div className="space-y-2 rounded-md border border-border/50 bg-muted/10 p-2">
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Combine with</Label>
                  <Select
                    value={metric.binary?.op || "add"}
                    onValueChange={(v) =>
                      updateMetric(metric.id, {
                        binary: {
                          op: v,
                          left: metric.binary?.left || {
                            op: "sum",
                            scope: "column",
                            columns: metric.columns.slice(0, 1),
                          },
                          right: metric.binary?.right || {
                            op: "sum",
                            scope: "column",
                            columns: metric.columns.slice(1, 2),
                          },
                        },
                      })
                    }
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BINARY_OPS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Left: SUM column</Label>
                    <MetricColumnPicker
                      columns={columns}
                      selected={metric.binary?.left?.columns || []}
                      multi={false}
                      onChange={(cols) =>
                        updateMetric(metric.id, {
                          columns: [...cols, ...(metric.binary?.right?.columns || [])],
                          binary: {
                            op: metric.binary?.op || "add",
                            left: { op: "sum", scope: "column", columns: cols },
                            right: metric.binary?.right || { op: "sum", scope: "column", columns: [] },
                          },
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Right: SUM column</Label>
                    <MetricColumnPicker
                      columns={columns}
                      selected={metric.binary?.right?.columns || []}
                      multi={false}
                      onChange={(cols) =>
                        updateMetric(metric.id, {
                          columns: [...(metric.binary?.left?.columns || []), ...cols],
                          binary: {
                            op: metric.binary?.op || "add",
                            left: metric.binary?.left || { op: "sum", scope: "column", columns: [] },
                            right: { op: "sum", scope: "column", columns: cols },
                          },
                        })
                      }
                    />
                  </div>
                </div>
              </div>
            ) : null}

            {metric.op === "if_else" ? (
              <div className="space-y-2 rounded-md border border-border/50 bg-muted/10 p-2 text-xs text-muted-foreground">
                <p>
                  If <span className="font-mono">SUM(left) &gt; raw</span> then{" "}
                  <span className="font-mono">SUM(thenCol)</span> else{" "}
                  <span className="font-mono">SUM(elseCol)</span>.
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-[10px]">If SUM(column)</Label>
                    <MetricColumnPicker
                      columns={columns}
                      selected={metric.ifElse?.clauses?.[0]?.condition?.leftExpr?.columns || []}
                      multi={false}
                      onChange={(cols) =>
                        updateMetric(metric.id, {
                          ifElse: {
                            clauses: [
                              {
                                condition: {
                                  operator: ">",
                                  leftExpr: { op: "sum", scope: "column", columns: cols },
                                  rightKind: "raw",
                                  rightValue: metric.ifElse?.clauses?.[0]?.condition?.rightValue ?? "0",
                                },
                                thenExpr: metric.ifElse?.clauses?.[0]?.thenExpr || {
                                  op: "sum",
                                  scope: "column",
                                  columns: cols,
                                },
                              },
                            ],
                            elseExpr: metric.ifElse?.elseExpr || {
                              op: "sum",
                              scope: "column",
                              columns: [],
                            },
                            elseValue: 0,
                          },
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px]">&gt; value</Label>
                    <Input
                      className="h-8 text-xs"
                      value={metric.ifElse?.clauses?.[0]?.condition?.rightValue ?? "0"}
                      onChange={(e) => {
                        const prev = metric.ifElse || { clauses: [{}], elseExpr: null };
                        const clause0 = prev.clauses?.[0] || {};
                        updateMetric(metric.id, {
                          ifElse: {
                            ...prev,
                            clauses: [
                              {
                                ...clause0,
                                condition: {
                                  ...(clause0.condition || {}),
                                  operator: ">",
                                  rightKind: "raw",
                                  rightValue: e.target.value,
                                },
                              },
                            ],
                          },
                        });
                      }}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px]">Then SUM(column)</Label>
                    <MetricColumnPicker
                      columns={columns}
                      selected={metric.ifElse?.clauses?.[0]?.thenExpr?.columns || []}
                      multi={false}
                      onChange={(cols) => {
                        const prev = metric.ifElse || { clauses: [{}] };
                        const clause0 = prev.clauses?.[0] || {};
                        updateMetric(metric.id, {
                          ifElse: {
                            ...prev,
                            clauses: [
                              {
                                ...clause0,
                                thenExpr: { op: "sum", scope: "column", columns: cols },
                              },
                            ],
                          },
                        });
                      }}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px]">Else SUM(column)</Label>
                    <MetricColumnPicker
                      columns={columns}
                      selected={metric.ifElse?.elseExpr?.columns || []}
                      multi={false}
                      onChange={(cols) => {
                        const prev = metric.ifElse || { clauses: [] };
                        updateMetric(metric.id, {
                          ifElse: {
                            ...prev,
                            elseExpr: { op: "sum", scope: "column", columns: cols },
                          },
                        });
                      }}
                    />
                  </div>
                </div>
              </div>
            ) : null}

            <WhereEditor
              where={metric.where}
              columns={columns}
              onChange={(where) => updateMetric(metric.id, { where })}
            />

            <div className="rounded-md border border-border/60 bg-muted/20 px-2 py-1.5 font-mono text-[11px] text-muted-foreground">
              {formatSummaryMetricPreview(metric)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function createInitialSummaryDraft(existingConfig, columnNames) {
  if (existingConfig?.metrics?.length) return normalizeSummaryConfig(existingConfig);
  const first = createEmptySummaryMetric();
  if (columnNames?.[0]) {
    first.columns = [columnNames[0]];
    first.outputName = `Total ${columnNames[0]}`;
  }
  return normalizeSummaryConfig({
    destination: "this_view",
    metrics: [first],
  });
}
