"use client";

import { BUCKET_TIME_INTERVALS } from "@/lib/sheetOperations/bucketTimeIntervals";
import { cn } from "@/lib/utils";

import { bucketModesForColumn } from "@/components/dashboardComposer/bucketSheet";

const MODE_LABEL = {
  category: "Exact values",
  number: "Numeric ranges",
  time: "Time intervals",
};

const METRICS = [
  { id: "count", title: "Count" },
  { id: "sum", title: "Sum" },
  { id: "average", title: "Average" },
  { id: "min", title: "Min" },
  { id: "max", title: "Max" },
];

function choiceClass(on) {
  return cn(
    "rounded-lg border px-2 py-1 text-[12px] font-semibold transition-colors",
    on ? "border-[#0d99ff]/40 bg-[#0d99ff]/10 text-[#0d99ff]" : "border-border/70 bg-background text-foreground hover:bg-muted/50",
  );
}

const fieldClass = "mt-1 h-8 w-full rounded-lg border border-border/70 bg-background px-2 text-[12px] text-foreground";

export function BucketEnrichPanel({
  columns,
  bucketColumnId,
  onBucketColumn,
  mode,
  onMode,
  timeInterval,
  onTimeInterval,
  numericSize,
  onNumericSize,
  groupByIds,
  onToggleGroupBy,
  metric,
  onMetric,
  valueColumnId,
  onValueColumn,
  onClear,
}) {
  const selected = columns.find((column) => column.id === bucketColumnId) || null;
  const modes = selected ? bucketModesForColumn(selected) : [];
  const groupBy = new Set(groupByIds || []);
  const numericColumns = columns.filter((column) => column.type === "number");
  return (
    <div className="mt-2 rounded-lg border border-border/70 px-2.5 py-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold text-foreground">Bucket sheet</p>
        <button type="button" onClick={onClear} className="text-[11px] font-medium text-muted-foreground hover:text-foreground">
          Clear
        </button>
      </div>
      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
        New sheet. Group the imported rows, then count or total a column inside each bucket.
      </p>
      <label className="mt-2 block text-[11px] font-semibold text-foreground">
        Bucket by
        <select className={fieldClass} value={bucketColumnId} onChange={(event) => onBucketColumn(event.target.value)}>
          <option value="">Choose a column</option>
          {columns.map((column) => (
            <option key={column.id} value={column.id}>
              {column.title}
            </option>
          ))}
        </select>
      </label>
      {selected ? (
        <>
          <div className="mt-2">
            <p className="text-[11px] font-semibold text-foreground">How</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {modes.map((item) => (
                <button key={item} type="button" className={choiceClass(mode === item)} onClick={() => onMode(item)}>
                  {MODE_LABEL[item]}
                </button>
              ))}
            </div>
            {mode === "time" ? (
              <label className="mt-2 block text-[11px] font-semibold text-foreground">
                Interval
                <select className={fieldClass} value={timeInterval} onChange={(event) => onTimeInterval(event.target.value)}>
                  {BUCKET_TIME_INTERVALS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            {mode === "number" ? (
              <label className="mt-2 block text-[11px] font-semibold text-foreground">
                Range width
                <input
                  className={fieldClass}
                  inputMode="decimal"
                  value={numericSize}
                  onChange={(event) => onNumericSize(event.target.value.replace(/[^0-9.]/g, ""))}
                />
              </label>
            ) : null}
            {mode === "category" ? (
              <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">One row for each distinct {selected.title}.</p>
            ) : null}
          </div>
          <div className="mt-2">
            <p className="text-[11px] font-semibold text-foreground">Also group by</p>
            <div className="mt-1 max-h-28 space-y-0.5 overflow-y-auto">
              {columns
                .filter((column) => column.id !== bucketColumnId)
                .map((column) => {
                  const on = groupBy.has(column.id);
                  return (
                    <button
                      key={column.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => onToggleGroupBy(column.id)}
                      className="flex w-full items-center gap-2 rounded-md px-1 py-1 text-left text-[12px] text-foreground hover:bg-muted/50"
                    >
                      <span className={cn("size-3.5 shrink-0 rounded border", on ? "border-[#0d99ff] bg-[#0d99ff]" : "border-border")} />
                      {column.title}
                    </button>
                  );
                })}
            </div>
          </div>
          <div className="mt-2">
            <p className="text-[11px] font-semibold text-foreground">Measure</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {METRICS.map((item) => (
                <button key={item.id} type="button" className={choiceClass(metric === item.id)} onClick={() => onMetric(item.id)}>
                  {item.title}
                </button>
              ))}
            </div>
            {metric !== "count" ? (
              <label className="mt-2 block text-[11px] font-semibold text-foreground">
                Of column
                <select className={fieldClass} value={valueColumnId} onChange={(event) => onValueColumn(event.target.value)}>
                  <option value="">Choose a column</option>
                  {numericColumns.map((column) => (
                    <option key={column.id} value={column.id}>
                      {column.title}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}

export function SampleEnrichPanel({ size, onSize, mode, onMode, error, onClear }) {
  return (
    <div className="mt-2 rounded-lg border border-border/70 px-2.5 py-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold text-foreground">Random sample</p>
        <button type="button" onClick={onClear} className="text-[11px] font-medium text-muted-foreground hover:text-foreground">
          Clear
        </button>
      </div>
      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
        Athena draws this many rows after your filters. Seeded keeps the same rows on the next pull. Unseeded draws a new set each time.
      </p>
      <label className="mt-2 block text-[11px] font-semibold text-foreground">
        Sample size
        <input className={fieldClass} inputMode="numeric" value={size} onChange={(event) => onSize(event.target.value.replace(/[^0-9]/g, ""))} />
      </label>
      <div className="mt-2 flex gap-1.5">
        <button type="button" className={choiceClass(mode === "seeded")} onClick={() => onMode("seeded")}>
          Seeded
        </button>
        <button type="button" className={choiceClass(mode === "unseeded")} onClick={() => onMode("unseeded")}>
          Unseeded
        </button>
      </div>
      {error ? <p className="mt-1.5 text-[11px] text-destructive">{error}</p> : null}
    </div>
  );
}
