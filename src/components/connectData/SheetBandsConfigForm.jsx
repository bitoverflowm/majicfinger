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
import {
  BAND_PREDICATE_KINDS,
  createEmptyBandDefinition,
  createVolumeBandPresets,
  formatBandPredicateLabel,
  normalizeBandsConfig,
} from "@/lib/sheetOperations/bandsConfig";
import { cn } from "@/lib/utils";

const FIELD_LABEL = "text-xs font-medium text-foreground";
const FIELD_HINT = "text-[10px] leading-snug text-muted-foreground dark:text-slate-400";
const FIELD_SUBLABEL = "text-[10px] font-medium text-foreground/80 dark:text-slate-300";
const CHECK_LABEL = "truncate font-mono text-xs text-foreground";
const APPLY_FIELD_ERROR_CLASS = "border-destructive focus-visible:ring-destructive/40";

/**
 * Custom mutually exclusive band ranges + aggregations (research-tool Bands tab).
 *
 * @param {{
 *   columnNames?: string[];
 *   config?: object | null;
 *   onConfigChange?: (next: object) => void;
 *   fieldErrors?: Record<string, string>;
 *   className?: string;
 * }} props
 */
export function SheetBandsConfigForm({
  columnNames = [],
  config = null,
  onConfigChange,
  fieldErrors = {},
  className,
}) {
  const tab = normalizeBandsConfig(config);
  const bandColumn = String(tab.bandColumn || "").trim();
  const bandOutputColumn = String(tab.bandOutputColumn || "band").trim();
  const aggregations = Array.isArray(tab.aggregations) ? tab.aggregations : [];
  const bands = Array.isArray(tab.bands) ? tab.bands : [];
  const rowFilters = Array.isArray(tab.rowFilters) ? tab.rowFilters : [];
  const groupByCols = new Set(tab.groupByColumns || []);
  const passthroughCols = new Set(tab.passthroughColumns || []);

  const patch = (next) => onConfigChange?.({ ...tab, ...next });

  const updateBand = (id, nextPatch) => {
    patch({
      bands: bands.map((b) => (b.id === id ? { ...b, ...nextPatch } : b)),
    });
  };

  const addBand = () => patch({ bands: [...bands, createEmptyBandDefinition()] });

  const removeBand = (id) => {
    if (bands.length <= 1) return;
    patch({ bands: bands.filter((b) => b.id !== id) });
  };

  const updateAggregation = (id, nextPatch) => {
    patch({
      aggregations: aggregations.map((agg) => (agg.id === id ? { ...agg, ...nextPatch } : agg)),
    });
  };

  const addAggregation = () => {
    const id = `band-agg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    patch({
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
    patch({ aggregations: aggregations.filter((agg) => agg.id !== id) });
  };

  const addRowFilter = () => {
    patch({
      rowFilters: [
        ...rowFilters,
        {
          id: `band-filter-${Date.now()}`,
          column: columnNames[0] || "",
          operator: "=",
          value: "",
        },
      ],
    });
  };

  const updateRowFilter = (id, nextPatch) => {
    patch({
      rowFilters: rowFilters.map((f) => (f.id === id ? { ...f, ...nextPatch } : f)),
    });
  };

  const removeRowFilter = (id) => {
    patch({ rowFilters: rowFilters.filter((f) => f.id !== id) });
  };

  const toggleGroupBy = (column) => {
    const next = new Set(groupByCols);
    if (next.has(column)) next.delete(column);
    else next.add(column);
    patch({ groupByColumns: Array.from(next) });
  };

  const togglePassthrough = (column) => {
    const next = new Set(passthroughCols);
    if (next.has(column)) next.delete(column);
    else next.add(column);
    patch({ passthroughColumns: Array.from(next) });
  };

  const loadVolumePresets = () => {
    const col = bandColumn || "volume";
    patch({
      bandColumn: col,
      bandOutputColumn: tab.bandOutputColumn || "band",
      bands: createVolumeBandPresets(col),
      aggregations: [
        {
          id: `band-agg-count-${Date.now()}`,
          type: "count",
          valueColumn: columnNames.includes("id") ? "id" : "",
          weightColumn: "",
          denominatorColumn: "",
          outputColumn: "market_count",
          filterEnabled: false,
          filterColumn: "",
          filterOperator: "=",
          filterValue: "",
        },
        {
          id: `band-agg-sum-${Date.now()}`,
          type: "sum",
          valueColumn: col,
          weightColumn: "",
          denominatorColumn: "",
          outputColumn: "total_volume",
          filterEnabled: false,
          filterColumn: "",
          filterOperator: "=",
          filterValue: "",
        },
      ],
      rowFilters: [
        ...(columnNames.includes("closed")
          ? [
              {
                id: `band-filter-closed-${Date.now()}`,
                column: "closed",
                operator: "=",
                value: "true",
              },
            ]
          : []),
        {
          id: `band-filter-vol-${Date.now()}`,
          column: col,
          operator: "is_not_empty",
          value: "",
        },
      ],
      sheetName: tab.sheetName || "Volume bands",
    });
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label className={FIELD_LABEL}>Column to band</Label>
          <Select
            value={bandColumn || "__"}
            onValueChange={(v) => {
              const next = v === "__" ? "" : v;
              patch({
                bandColumn: next,
                bandOutputColumn:
                  String(tab.bandOutputColumn || "").trim() && tab.bandOutputColumn !== "band"
                    ? tab.bandOutputColumn
                    : next || "band",
              });
            }}
          >
            <SelectTrigger
              className={cn("h-9 text-xs", fieldErrors.bandColumn && APPLY_FIELD_ERROR_CLASS)}
            >
              <SelectValue placeholder="Select column" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__">—</SelectItem>
              {columnNames.map((c) => (
                <SelectItem key={`band-col-${c}`} value={c} className="font-mono text-xs">
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className={FIELD_LABEL}>Band label column name</Label>
          <Input
            className="h-9 text-xs text-foreground"
            value={tab.bandOutputColumn ?? "band"}
            onChange={(e) => patch({ bandOutputColumn: e.target.value })}
            placeholder={bandColumn || "band"}
            spellCheck={false}
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <Label className={FIELD_LABEL}>Shared filters (optional)</Label>
            <p className={FIELD_HINT}>
              Applied to every row before band assignment (for example closed = true). Parent query
              WHERE still applies first.
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={addRowFilter}>
            + Filter
          </Button>
        </div>
        {rowFilters.length ? (
          <div className="space-y-2">
            {rowFilters.map((f) => (
              <div
                key={f.id}
                className="grid gap-2 rounded-md border border-border/70 p-2 dark:border-slate-700 sm:grid-cols-[1fr_0.7fr_1fr_auto]"
              >
                <Select
                  value={f.column || "__"}
                  onValueChange={(v) => updateRowFilter(f.id, { column: v === "__" ? "" : v })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Column" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__">—</SelectItem>
                    {columnNames.map((c) => (
                      <SelectItem key={`rf-col-${f.id}-${c}`} value={c} className="font-mono text-xs">
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={f.operator || "="}
                  onValueChange={(v) => updateRowFilter(f.id, { operator: v })}
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
                <Input
                  className="h-8 text-xs text-foreground"
                  value={f.value ?? ""}
                  onChange={(e) => updateRowFilter(f.id, { value: e.target.value })}
                  placeholder="Value"
                  disabled={["is_empty", "is_not_empty"].includes(f.operator)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs text-muted-foreground hover:text-destructive"
                  onClick={() => removeRowFilter(f.id)}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className={FIELD_HINT}>No shared filters — all result rows are eligible for banding.</p>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <Label className={FIELD_LABEL}>Bands</Label>
            <p className={FIELD_HINT}>
              Mutually exclusive predicates on the band column. Prefer non-overlapping ranges so each
              row matches one band.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={loadVolumePresets}
              title="Load the seven volume tiers from the product example"
            >
              Volume presets
            </Button>
            <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={addBand}>
              + Add band
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          {bands.map((band, idx) => {
            const preview = formatBandPredicateLabel(band, bandColumn || "value");
            return (
              <div
                key={band.id}
                className="space-y-2 rounded-lg border border-border/70 p-2 dark:border-slate-700"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-foreground/70 dark:text-slate-400">
                    Band {idx + 1}
                  </span>
                  {bands.length > 1 ? (
                    <button
                      type="button"
                      className="inline-flex h-2 w-2 rounded-full bg-red-500 hover:bg-red-600"
                      aria-label={`Remove band ${idx + 1}`}
                      onClick={() => removeBand(band.id)}
                    />
                  ) : null}
                </div>
                <div className="grid gap-2 sm:grid-cols-[1fr_0.8fr]">
                  <div className="space-y-1">
                    <Label className={FIELD_SUBLABEL}>Label (optional)</Label>
                    <Input
                      className="h-8 text-xs text-foreground"
                      value={band.label}
                      onChange={(e) => updateBand(band.id, { label: e.target.value })}
                      placeholder={preview || "Auto from predicate"}
                      spellCheck={false}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className={FIELD_SUBLABEL}>Predicate</Label>
                    <Select
                      value={band.kind}
                      onValueChange={(v) => updateBand(band.id, { kind: v })}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {BAND_PREDICATE_KINDS.map((k) => (
                          <SelectItem key={k.value} value={k.value}>
                            {k.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {band.kind === "between" ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label className={FIELD_SUBLABEL}>Min</Label>
                      <Input
                        className="h-8 text-xs text-foreground"
                        value={band.min}
                        onChange={(e) => updateBand(band.id, { min: e.target.value })}
                        placeholder="e.g. 10000"
                      />
                      <label className="flex items-center gap-2 text-[10px] text-foreground">
                        <Checkbox
                          checked={band.minInclusive !== false}
                          onCheckedChange={(c) => updateBand(band.id, { minInclusive: !!c })}
                        />
                        Inclusive (≥)
                      </label>
                    </div>
                    <div className="space-y-1">
                      <Label className={FIELD_SUBLABEL}>Max</Label>
                      <Input
                        className="h-8 text-xs text-foreground"
                        value={band.max}
                        onChange={(e) => updateBand(band.id, { max: e.target.value })}
                        placeholder="e.g. 100000"
                      />
                      <label className="flex items-center gap-2 text-[10px] text-foreground">
                        <Checkbox
                          checked={band.maxInclusive === true}
                          onCheckedChange={(c) => updateBand(band.id, { maxInclusive: !!c })}
                        />
                        Inclusive (≤)
                      </label>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <Label className={FIELD_SUBLABEL}>Value</Label>
                    <Input
                      className="h-8 text-xs text-foreground"
                      value={band.value}
                      onChange={(e) => updateBand(band.id, { value: e.target.value })}
                      placeholder="e.g. 0"
                    />
                  </div>
                )}
                <p className={FIELD_HINT}>Preview: {band.label?.trim() || preview}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <Label className={FIELD_LABEL}>Additional group by columns</Label>
        <p className={FIELD_HINT}>
          Group within each band by these columns as well. Each unique combination gets its own
          output rows.
        </p>
        <div className="grid max-h-32 gap-2 overflow-auto rounded-md border border-border/70 p-2 dark:border-slate-700 sm:grid-cols-2">
          {columnNames
            .filter((col) => col !== bandColumn && col !== bandOutputColumn)
            .map((col) => (
              <label key={`band-group-${col}`} className="flex min-w-0 items-center gap-2 text-xs">
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
              <div className="grid gap-2 sm:grid-cols-3">
                <div className="space-y-1">
                  <Label className={FIELD_SUBLABEL}>Type</Label>
                  <Select
                    value={agg.type}
                    onValueChange={(v) => {
                      const baseName =
                        v === "average"
                          ? "avg"
                          : v === "count_distinct"
                            ? "distinct_count"
                            : v === "median"
                              ? "median"
                              : v;
                      updateAggregation(agg.id, {
                        type: v,
                        outputColumn: agg.outputColumn || baseName,
                      });
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="count">Count rows</SelectItem>
                      <SelectItem value="count_distinct">Count distinct</SelectItem>
                      <SelectItem value="sum">Sum</SelectItem>
                      <SelectItem value="average">Mean</SelectItem>
                      <SelectItem value="median">Median</SelectItem>
                      <SelectItem value="min">Min</SelectItem>
                      <SelectItem value="max">Max</SelectItem>
                      <SelectItem value="std_dev">Standard deviation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className={FIELD_SUBLABEL}>
                    {agg.type === "count" ? "Count column (optional)" : "Value column"}
                  </Label>
                  <Select
                    value={
                      agg.type === "count" ? agg.valueColumn || "__rows__" : agg.valueColumn || "__"
                    }
                    onValueChange={(v) =>
                      updateAggregation(agg.id, {
                        valueColumn: v === "__rows__" || v === "__" ? "" : v,
                      })
                    }
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Column" />
                    </SelectTrigger>
                    <SelectContent>
                      {agg.type === "count" ? (
                        <SelectItem value="__rows__">Rows in band</SelectItem>
                      ) : (
                        <SelectItem value="__">—</SelectItem>
                      )}
                      {columnNames.map((c) => (
                        <SelectItem
                          key={`band-agg-val-${agg.id}-${c}`}
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
                  <Label className={FIELD_SUBLABEL}>Generated column</Label>
                  <Input
                    className="h-8 text-xs text-foreground"
                    value={agg.outputColumn}
                    onChange={(e) => updateAggregation(agg.id, { outputColumn: e.target.value })}
                    placeholder={agg.type}
                    spellCheck={false}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label className={FIELD_LABEL}>Transfer columns as-is</Label>
        <p className={FIELD_HINT}>
          Copied from the first row in each group. For labels stable inside a band — not the same as
          group by.
        </p>
        <div className="grid max-h-32 gap-2 overflow-auto rounded-md border border-border/70 p-2 dark:border-slate-700 sm:grid-cols-2">
          {columnNames
            .filter(
              (col) =>
                col !== bandColumn && col !== bandOutputColumn && !groupByCols.has(col),
            )
            .map((col) => (
              <label key={`band-pass-${col}`} className="flex min-w-0 items-center gap-2 text-xs">
                <Checkbox
                  checked={passthroughCols.has(col)}
                  onCheckedChange={() => togglePassthrough(col)}
                />
                <span className={CHECK_LABEL}>{col}</span>
              </label>
            ))}
        </div>
      </div>

      <div className="space-y-1">
        <Label className={FIELD_LABEL}>New sheet name</Label>
        <Input
          className={cn("h-9 text-xs text-foreground", fieldErrors.sheetName && APPLY_FIELD_ERROR_CLASS)}
          value={tab.sheetName ?? ""}
          onChange={(e) => patch({ sheetName: e.target.value })}
          placeholder="Banded sheet"
          spellCheck={false}
        />
      </div>
    </div>
  );
}
