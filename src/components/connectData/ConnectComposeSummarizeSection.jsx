"use client";

import { Plus, X } from "lucide-react";
import { toast } from "sonner";

import EquationExprBuilder from "@/components/integrationsView/integrationPlayground/integrations/polymarketHistorical/EquationExprBuilder";
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
import { Toggle } from "@/components/ui/toggle";
import { useMyStateV2 } from "@/context/stateContextV2";
import {
  buildSummarizeRollupPatch,
  composeDateShapeSelectValue,
  composeRollUpSelectValue,
  patchesForDateShape,
} from "@/lib/dataLakeComposeSummarize";
import { composeSourceColumnLabel } from "@/lib/dataLakeComposeHelpers";

/**
 * Per-column summarize cards (mirrors integrations panel column compose cards).
 */
export function ConnectComposeSummarizeSection({
  columnComposeItems,
  updateComposeItem,
  onRemoveItem,
  availableColumns,
  numericColumns,
  kindForColumn,
}) {
  const isDemo = !!useMyStateV2()?.isDemo;

  if (!columnComposeItems?.length) {
    return (
      <p className="text-[10px] leading-snug text-muted-foreground">
        Select at least one column in your pull to configure summarize options.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {columnComposeItems.map((item) => {
        const k = kindForColumn(item.column);
        const isDateCol = k === "date";
        const isNumericCol = k === "number";
        const canNumberFormat =
          isNumericCol && !["count", "count_distinct"].includes(String(item.aggregate || ""));
        const rollVal = composeRollUpSelectValue(item);
        const dateShapeVal = composeDateShapeSelectValue(item);
        const scaleVal = item.numberScale || "none";
        const decVal = item.decimals == null ? "default" : String(item.decimals);

        const onRollupChange = (v) => {
          if (isDemo && (v === "if_else_case" || v === "equation")) {
            toast.info("Sign up to use IF/ELSE and Equation summarize options.");
            return;
          }
          updateComposeItem(item.id, buildSummarizeRollupPatch(item, v, {
            availableColumns,
            numericColumns,
            kindForColumn,
          }));
        };

        return (
          <div
            key={item.id}
            className="min-w-0 space-y-3 rounded-lg border border-border/80 bg-card p-3 shadow-sm"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="truncate font-mono text-sm font-semibold" title={item.column}>
                {composeSourceColumnLabel(item.column)}
              </p>
              {onRemoveItem ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="group h-3 w-3 shrink-0 rounded-full bg-red-300/35 text-red-900/70 hover:bg-red-400/80"
                  onClick={() => onRemoveItem(item.id)}
                  aria-label={`Remove ${item.column}`}
                />
              ) : null}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="min-w-0 space-y-1">
                <Label className="text-xs">Col Name</Label>
                <Input
                  className="h-8 text-xs"
                  value={item.alias}
                  onChange={(e) => updateComposeItem(item.id, { alias: e.target.value })}
                  spellCheck={false}
                />
              </div>
              <div className="min-w-0 space-y-1">
                <Label className="text-xs">Summarize</Label>
                <Select value={rollVal} onValueChange={onRollupChange}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" className="text-xs">
                      Show values (no total)
                    </SelectItem>
                    <SelectItem value="if_else_case" className="text-xs">
                      If / else (CASE column)
                    </SelectItem>
                    <SelectItem value="sum" className="text-xs" disabled={!isNumericCol}>
                      Sum numbers
                    </SelectItem>
                    <SelectItem value="equation" className="text-xs" disabled={!isNumericCol}>
                      Equation (SUM of expression)
                    </SelectItem>
                    <SelectItem value="avg" className="text-xs" disabled={!isNumericCol}>
                      Average
                    </SelectItem>
                    <SelectItem value="min" className="text-xs" disabled={!isNumericCol}>
                      Min
                    </SelectItem>
                    <SelectItem value="max" className="text-xs" disabled={!isNumericCol}>
                      Max
                    </SelectItem>
                    <SelectItem value="median" className="text-xs" disabled={!isNumericCol}>
                      Median (approx)
                    </SelectItem>
                    <SelectItem value="stddev" className="text-xs" disabled={!isNumericCol}>
                      Stddev (volatility)
                    </SelectItem>
                    <SelectItem value="variance" className="text-xs" disabled={!isNumericCol}>
                      Variance
                    </SelectItem>
                    <SelectItem value="count" className="text-xs">
                      Count (non-empty)
                    </SelectItem>
                    <SelectItem value="count_distinct" className="text-xs">
                      Count distinct
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {item.aggregate === "sum" || item.sumCase?.enabled ? (
              <div className="space-y-2">
                {item.aggregate === "sum" ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <Toggle
                      variant="outline"
                      size="sm"
                      pressed={!!item.sumCase?.enabled}
                      onPressedChange={(pressed) => {
                        const enabled = !!pressed;
                        const current =
                          item.sumCase && typeof item.sumCase === "object" ? item.sumCase : null;
                        const hasBranch =
                          Array.isArray(current?.branches) && current.branches.length > 0;
                        const defaultBranch = {
                          when: { column: availableColumns[0] || "", op: "eq", value: "" },
                          thenColumn: numericColumns[0] || "",
                        };
                        updateComposeItem(item.id, {
                          sumCase: enabled
                            ? {
                                enabled: true,
                                branches: hasBranch ? current.branches : [defaultBranch],
                                elseColumn:
                                  typeof current?.elseColumn === "string" ? current.elseColumn : "",
                              }
                            : { enabled: false, branches: [], elseColumn: "" },
                          equation: { enabled: false },
                        });
                      }}
                    >
                      if else
                    </Toggle>
                    <p className="text-[11px] text-muted-foreground">
                      Use <span className="font-medium">Equation</span> in Summarize for expressions;{" "}
                      <span className="font-medium">if else</span> for SUM×CASE.
                    </p>
                  </div>
                ) : null}

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

                {item.sumCase?.enabled ? (
                  <SumCaseEditor
                    item={item}
                    updateComposeItem={updateComposeItem}
                    availableColumns={availableColumns}
                    numericColumns={numericColumns}
                    kindForColumn={kindForColumn}
                  />
                ) : null}
              </div>
            ) : null}

            {isDateCol && !item.aggregate && !item.sumCase?.enabled ? (
              <div className="min-w-0 space-y-1">
                <Label className="text-xs">Date / time shape</Label>
                <Select
                  value={dateShapeVal}
                  onValueChange={(shape) => {
                    updateComposeItem(item.id, { aggregate: null, ...patchesForDateShape(shape) });
                  }}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="raw" className="text-xs">
                      Keep as stored (epoch number)
                    </SelectItem>
                    <SelectItem value="bucket:day" className="text-xs">
                      Bucket by day
                    </SelectItem>
                    <SelectItem value="bucket:week" className="text-xs">
                      Bucket by week
                    </SelectItem>
                    <SelectItem value="bucket:month" className="text-xs">
                      Bucket by month
                    </SelectItem>
                    <SelectItem value="bucket:quarter" className="text-xs">
                      Bucket by quarter
                    </SelectItem>
                    <SelectItem value="bucket:year" className="text-xs">
                      Bucket by year
                    </SelectItem>
                    <SelectItem value="fmt:dmy" className="text-xs">
                      Text: day-month-year
                    </SelectItem>
                    <SelectItem value="fmt:ym" className="text-xs">
                      Text: year-month
                    </SelectItem>
                    <SelectItem value="fmt:dm" className="text-xs">
                      Text: day-month
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            {canNumberFormat ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="min-w-0 space-y-1">
                  <Label className="text-xs">Number scale</Label>
                  <Select
                    value={scaleVal}
                    onValueChange={(v) => updateComposeItem(item.id, { numberScale: v })}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none" className="text-xs">
                        No scaling
                      </SelectItem>
                      <SelectItem value="ten" className="text-xs">
                        Divide by 10
                      </SelectItem>
                      <SelectItem value="hundred" className="text-xs">
                        Divide by 100
                      </SelectItem>
                      <SelectItem value="thousand" className="text-xs">
                        Divide by 1,000
                      </SelectItem>
                      <SelectItem value="million" className="text-xs">
                        Divide by 1,000,000
                      </SelectItem>
                      <SelectItem value="billion" className="text-xs">
                        Divide by 1,000,000,000
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="min-w-0 space-y-1">
                  <Label className="text-xs">Decimal places</Label>
                  <Select
                    value={decVal}
                    onValueChange={(v) =>
                      updateComposeItem(item.id, {
                        decimals: v === "default" ? null : Number(v),
                      })
                    }
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default" className="text-xs">
                        Default
                      </SelectItem>
                      {[0, 1, 2, 3, 4].map((d) => (
                        <SelectItem key={d} value={String(d)} className="text-xs">
                          {d} decimal{d === 1 ? "" : "s"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function SumCaseEditor({ item, updateComposeItem, availableColumns, numericColumns, kindForColumn }) {
  return (
    <div className="space-y-2 rounded-md border border-border/60 bg-muted/20 p-2">
      {(item.sumCase?.branches || []).map((b, idx) => {
        const whenCol = String(b?.when?.column || "");
        const whenKind = kindForColumn(whenCol);
        const whenOp = String(b?.when?.op || "eq");
        const whenVal = b?.when?.value ?? "";
        const thenCol = String(b?.thenColumn || "");
        const ops =
          whenKind === "string"
            ? [
                { id: "eq", label: "=" },
                { id: "neq", label: "!=" },
              ]
            : [
                { id: "gt", label: ">" },
                { id: "lt", label: "<" },
                { id: "eq", label: "=" },
                { id: "neq", label: "!=" },
              ];

        return (
          <div key={`sumcase-${item.id}-${idx}`} className="flex flex-wrap items-center gap-1">
            <span className="min-w-8 text-[11px] font-medium text-muted-foreground">
              {idx === 0 ? "if" : "else if"}
            </span>
            <Select
              value={whenCol}
              onValueChange={(v) => {
                const next = (item.sumCase?.branches || []).map((x, j) =>
                  j === idx ? { ...x, when: { ...(x.when || {}), column: v } } : x,
                );
                updateComposeItem(item.id, { sumCase: { ...item.sumCase, branches: next } });
              }}
            >
              <SelectTrigger className="h-7 w-28 text-[11px]">
                <SelectValue placeholder="Column" />
              </SelectTrigger>
              <SelectContent>
                {availableColumns.map((c) => (
                  <SelectItem key={`${idx}-${c}`} value={c} className="text-[13px]">
                    {composeSourceColumnLabel(c)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={whenOp}
              onValueChange={(v) => {
                const next = (item.sumCase?.branches || []).map((x, j) =>
                  j === idx ? { ...x, when: { ...(x.when || {}), op: v } } : x,
                );
                updateComposeItem(item.id, { sumCase: { ...item.sumCase, branches: next } });
              }}
            >
              <SelectTrigger className="h-7 w-16 text-[11px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ops.map((o) => (
                  <SelectItem key={o.id} value={o.id} className="text-[13px]">
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type={whenKind === "number" ? "number" : "text"}
              className="h-7 w-24 text-[11px]"
              value={String(whenVal)}
              onChange={(e) => {
                const raw = e.target.value;
                const nextVal = whenKind === "number" ? (raw === "" ? "" : Number(raw)) : raw;
                const next = (item.sumCase?.branches || []).map((x, j) =>
                  j === idx ? { ...x, when: { ...(x.when || {}), value: nextVal } } : x,
                );
                updateComposeItem(item.id, { sumCase: { ...item.sumCase, branches: next } });
              }}
              placeholder="value"
            />
            <span className="text-[11px] text-muted-foreground">then</span>
            <Select
              value={thenCol}
              onValueChange={(v) => {
                const next = (item.sumCase?.branches || []).map((x, j) =>
                  j === idx ? { ...x, thenColumn: v } : x,
                );
                updateComposeItem(item.id, { sumCase: { ...item.sumCase, branches: next } });
              }}
            >
              <SelectTrigger className="h-7 w-28 text-[11px]">
                <SelectValue placeholder="Column" />
              </SelectTrigger>
              <SelectContent>
                {numericColumns.map((c) => (
                  <SelectItem key={`then-${idx}-${c}`} value={c} className="text-[13px]">
                    {composeSourceColumnLabel(c)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {idx > 0 ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => {
                  const next = (item.sumCase?.branches || []).filter((_, j) => j !== idx);
                  updateComposeItem(item.id, { sumCase: { ...item.sumCase, branches: next } });
                }}
                aria-label="remove else if"
              >
                <X className="h-3 w-3" />
              </Button>
            ) : null}
          </div>
        );
      })}

      <div className="flex flex-wrap items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline" size="sm" className="h-7 text-[11px]">
              <Plus className="mr-1 h-3 w-3" />
              add else
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-44">
            <DropdownMenuItem
              className="text-[13px]"
              disabled={!!item.sumCase?.elseColumn}
              onSelect={() => {
                updateComposeItem(item.id, {
                  sumCase: { ...item.sumCase, elseColumn: numericColumns[0] || "" },
                });
              }}
            >
              else
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-[13px]"
              onSelect={() => {
                const next = [
                  ...(item.sumCase?.branches || []),
                  {
                    when: { column: availableColumns[0] || "", op: "eq", value: "" },
                    thenColumn: numericColumns[0] || "",
                  },
                ];
                updateComposeItem(item.id, { sumCase: { ...item.sumCase, branches: next } });
              }}
            >
              else if
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {item.sumCase?.elseColumn ? (
          <div className="flex items-center gap-1">
            <span className="min-w-8 text-[11px] font-medium text-muted-foreground">else</span>
            <Select
              value={String(item.sumCase.elseColumn || "")}
              onValueChange={(v) =>
                updateComposeItem(item.id, { sumCase: { ...item.sumCase, elseColumn: v } })
              }
            >
              <SelectTrigger className="h-7 w-28 text-[11px]">
                <SelectValue placeholder="Column" />
              </SelectTrigger>
              <SelectContent>
                {numericColumns.map((c) => (
                  <SelectItem key={`else-${c}`} value={c} className="text-[13px]">
                    {composeSourceColumnLabel(c)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => updateComposeItem(item.id, { sumCase: { ...item.sumCase, elseColumn: "" } })}
              aria-label="remove else"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <p className="text-[11px] text-muted-foreground">
            Add an <span className="font-medium">else</span> branch to avoid nulls.
          </p>
        )}
      </div>
    </div>
  );
}
